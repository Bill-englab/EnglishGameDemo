"""Private display profiles; independent of authentication and lesson media."""
import io
import json
import logging
import os
import re
import time
import unicodedata
import uuid
import warnings
import threading
from contextlib import contextmanager
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

IMAGE_LIMIT = 5 * 1024 * 1024
PIXEL_LIMIT = 16_000_000
_AVATAR = re.compile(r'[0-9a-f]{32}\.jpg\Z')
_USERNAME = re.compile(r'[A-Za-z0-9_-]+\Z')
_LOG = logging.getLogger(__name__)
_LOCAL = threading.local()
_THREAD_LOCKS = [threading.RLock() for _ in range(64)]


def normalize_nickname(value):
    if not isinstance(value, str) or any(unicodedata.category(c).startswith('C') for c in value):
        raise ValueError('Please use a nickname without control characters.')
    value = value.strip()
    if len(value) > 24:
        raise ValueError('Please use 24 characters or fewer.')
    return value


def _directory(root, username):
    if not isinstance(username, str) or not _USERNAME.fullmatch(username):
        raise ValueError('Invalid account.')
    root = Path(root).resolve()
    # Windows is case-insensitive and reserves names such as CON. Encoding
    # preserves exact account identity without changing login or media paths.
    directory = root / ('u-' + username.encode('ascii').hex())
    if directory.is_symlink() or directory.resolve() != directory:
        raise ValueError('Invalid profile location.')
    return directory


def _child(directory, name):
    child = directory / name
    if child.is_symlink() or child.resolve().parent != directory.resolve():
        raise ValueError('Invalid profile location.')
    return child


@contextmanager
def profile_lock(root, username):
    """Reentrant per-thread guard plus cross-process lock for account actions."""
    directory = _directory(root, username)
    key = str(directory)
    with _THREAD_LOCKS[hash(key) % len(_THREAD_LOCKS)]:
        active = getattr(_LOCAL, 'active', set())
        if key in active:
            yield directory
            return
        with _process_lock(root, username) as locked:
            _LOCAL.active = active | {key}
            try:
                yield locked
            finally:
                _LOCAL.active = active


@contextmanager
def _process_lock(root, username):
    """OS locks survive multiple server workers and release on process exit."""
    directory = _directory(root, username)
    directory.mkdir(parents=True, exist_ok=True)
    lock = _child(directory, '.lock')
    with lock.open('a+b') as handle:
        # Keep the lock inode/file permanently: unlinking it breaks other waiters.
        if os.name == 'nt':
            import msvcrt
            if handle.seek(0, 2) == 0:
                handle.write(b'0')
                handle.flush()
            deadline = time.monotonic() + 5
            while True:
                handle.seek(0)
                try:
                    msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                    break
                except OSError:
                    if time.monotonic() >= deadline:
                        raise OSError('Profile busy; try again.')
                    time.sleep(.05)
            try:
                yield directory
            finally:
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle, fcntl.LOCK_EX)
            try:
                yield directory
            finally:
                fcntl.flock(handle, fcntl.LOCK_UN)


def _read(directory):
    try:
        path = _child(directory, 'profile.json')
        if not path.exists():
            return {'nickname': '', 'avatar': None}
        data = json.loads(path.read_text(encoding='utf-8'))
        nickname = normalize_nickname(data['nickname'])
        avatar = data.get('avatar')
        if avatar is not None and (not isinstance(avatar, str) or not _AVATAR.fullmatch(avatar)):
            raise ValueError('Invalid avatar reference.')
        if avatar and not _child(directory, avatar).is_file():
            avatar = None
        return {'nickname': nickname, 'avatar': avatar}
    except (OSError, ValueError, KeyError, TypeError):
        _LOG.warning('Unreadable profile; using default display.')
        return {'nickname': '', 'avatar': None}


def _public(data, username):
    return {'nickname': data['nickname'], 'displayName': data['nickname'] or username,
            'avatarUrl': '/api/profile/avatar' if data['avatar'] else None}


def read_profile(root, username):
    if not _directory(root, username).exists():
        return _public({'nickname': '', 'avatar': None}, username)
    with profile_lock(root, username) as directory:
        return _public(_read(directory), username)


def _convert_image(data):
    if len(data) > IMAGE_LIMIT:
        raise ValueError('Choose a photo smaller than 5 MB.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in ('JPEG', 'PNG', 'WEBP'):
                    raise ValueError('Choose a JPEG, PNG or static WebP photo. Export HEIC as JPEG first.')
                if getattr(source, 'n_frames', 1) != 1:
                    raise ValueError('Choose a still photo, not an animation.')
                if source.width * source.height > PIXEL_LIMIT:
                    raise ValueError('Choose a photo with 16 million pixels or fewer.')
                source.load()
                oriented = ImageOps.exif_transpose(source)
                square = ImageOps.fit(oriented.convert('RGBA'), (256, 256), Image.Resampling.LANCZOS)
                fresh = Image.new('RGB', (256, 256), '#fffcf6')
                fresh.paste(square, mask=square.getchannel('A'))
                output = io.BytesIO()
                fresh.save(output, format='JPEG', quality=85, optimize=True)
                return output.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ValueError('This photo cannot be read. Choose a smaller JPEG, PNG or static WebP.') from exc


def save_profile(root, username, nickname, image=None, reset=False):
    nickname = normalize_nickname(nickname)
    if reset and image is not None:
        raise ValueError('Choose a photo or use the default, not both.')
    converted = _convert_image(image) if image is not None else None
    with profile_lock(root, username) as directory:
        old = _read(directory)
        avatar = None if reset else old['avatar']
        new_file = None
        temporary = _child(directory, f'{uuid.uuid4().hex}.tmp')
        try:
            if converted is not None:
                avatar = f'{uuid.uuid4().hex}.jpg'
                new_file = _child(directory, avatar)
                new_file.write_bytes(converted)
            data = {'nickname': nickname, 'avatar': avatar}
            temporary.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
            temporary.replace(_child(directory, 'profile.json'))
        except (OSError, ValueError):
            if new_file:
                new_file.unlink(missing_ok=True)
            raise
        finally:
            temporary.unlink(missing_ok=True)
        if old['avatar'] and old['avatar'] != avatar:
            try:
                _child(directory, old['avatar']).unlink(missing_ok=True)
            except OSError:
                _LOG.warning('Could not clean a replaced avatar.')
        return _public(data, username)


def read_avatar(root, username):
    if not _directory(root, username).exists():
        return None
    with profile_lock(root, username) as directory:
        avatar = _read(directory)['avatar']
        return _child(directory, avatar).read_bytes() if avatar else None


def delete_profile(root, username):
    if not _directory(root, username).exists():
        return
    with profile_lock(root, username) as directory:
        # Only our metadata and generated avatars; never recurse into user media.
        for path in directory.iterdir():
            if path.name == 'profile.json' or _AVATAR.fullmatch(path.name):
                _child(directory, path.name).unlink(missing_ok=True)
