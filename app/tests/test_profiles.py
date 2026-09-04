import io
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from PIL import Image
from werkzeug.security import generate_password_hash

import app as app_module


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, 'PROFILES_ROOT', tmp_path / 'profiles', raising=False)
    users = tmp_path / 'users.json'
    users.write_text(json.dumps({'alice': generate_password_hash('password'),
                                'bob': generate_password_hash('password')}))
    monkeypatch.setattr(app_module, 'USERS_FILE', users)
    app_module.app.config['TESTING'] = True
    with app_module.app.test_client() as c:
        c.post('/login', data={'username': 'alice', 'password': 'password'})
        yield c


def picture(fmt='PNG', size=(420, 300), **kwargs):
    output = io.BytesIO()
    Image.new('RGBA', size, (240, 100, 20, 128)).convert(
        'RGB' if fmt == 'JPEG' else 'RGBA').save(output, format=fmt, **kwargs)
    return output.getvalue()


def save(client, nickname='Tiger', image=None, **fields):
    response = client.get('/api/profile')
    assert response.status_code == 200
    data = {'nickname': nickname, **fields}
    if image is not None:
        data['avatar'] = (io.BytesIO(image), 'untrusted.name')
    return client.post('/api/profile', data=data,
                       headers={'X-CSRF-Token': response.json['csrfToken']})


def test_default_profile(client):
    response = client.get('/api/profile')
    assert response.status_code == 200
    assert response.json['displayName'] == 'alice'
    assert response.json['avatarUrl'] is None
    assert 'no-store' in response.headers['Cache-Control']


@pytest.mark.parametrize('fmt', ['PNG', 'JPEG', 'WEBP'])
def test_save_converts_image_and_persists_nickname(client, fmt):
    response = save(client, '  小虎  ', picture(fmt))
    assert response.status_code == 200
    assert client.get('/api/me').json['displayName'] == '小虎'
    avatar = client.get('/api/profile/avatar')
    assert avatar.status_code == 200
    assert avatar.mimetype == 'image/jpeg'
    assert 'no-store' in avatar.headers['Cache-Control']
    decoded = Image.open(io.BytesIO(avatar.data))
    assert decoded.size == (256, 256)
    assert decoded.mode == 'RGB'
    assert not decoded.getexif()


def test_default_and_blank_nickname_do_not_change_username(client):
    assert save(client, image=picture()).status_code == 200
    assert save(client, nickname=' ', resetAvatar='true').status_code == 200
    assert client.get('/api/me').json['username'] == 'alice'
    assert client.get('/api/me').json['displayName'] == 'alice'
    assert client.get('/api/profile/avatar').status_code == 404


@pytest.mark.parametrize('nickname', ['x' * 25, 'a\x00b', 'a\nb'])
def test_invalid_nickname_keeps_old_profile(client, nickname):
    assert save(client, 'Before').status_code == 200
    assert save(client, nickname).status_code == 400
    assert client.get('/api/me').json['displayName'] == 'Before'


def test_unicode_limit_counts_codepoints(client):
    assert save(client, '🐯' * 24).status_code == 200
    assert save(client, '🐯' * 25).status_code == 400


@pytest.mark.parametrize('payload', [b'not an image', b'<svg></svg>', b'0' * (5 * 1024 * 1024 + 1)], ids=['corrupt', 'svg', 'oversize'])
def test_bad_image_preserves_old_nickname_and_avatar(client, payload):
    assert save(client, 'Before', picture()).status_code == 200
    before = client.get('/api/profile/avatar').data
    assert save(client, 'After', payload).status_code in (400, 413)
    assert client.get('/api/profile/avatar').data == before
    assert client.get('/api/me').json['displayName'] == 'Before'


def test_rejects_gif_animation_and_large_pixel_image(client):
    assert save(client, image=picture('GIF')).status_code == 400
    output = io.BytesIO()
    Image.new('RGB', (16, 16), 'red').save(output, format='WEBP', save_all=True,
        append_images=[Image.new('RGB', (16, 16), 'blue')], duration=200, loop=0)
    assert save(client, image=output.getvalue()).status_code == 400
    assert save(client, image=picture(size=(4001, 4000))).status_code == 400


def test_orientation_and_metadata_are_normalized(client):
    original = Image.new('RGB', (256, 256), 'red')
    original.paste('blue', (0, 128, 256, 256))
    exif = Image.Exif()
    exif[274] = 6
    exif[270] = 'private description'
    data = io.BytesIO()
    original.save(data, 'JPEG', exif=exif)
    assert save(client, image=data.getvalue()).status_code == 200
    decoded = Image.open(io.BytesIO(client.get('/api/profile/avatar').data))
    assert decoded.getpixel((30, 128))[2] > 200
    assert decoded.getpixel((220, 128))[0] > 200
    assert not decoded.getexif()


def test_auth_csrf_and_other_user_fields(client):
    assert client.post('/api/profile', data={'nickname': 'oops'}).status_code == 403
    assert save(client, username='bob').status_code == 400
    assert save(client, image=picture(), resetAvatar='true').status_code == 400
    with client.session_transaction() as session:
        session.clear()
    for url in ['/api/profile', '/api/profile/avatar']:
        assert client.get(url).status_code == 401


def test_avatar_isolation_and_deleted_session(client):
    assert save(client, image=picture()).status_code == 200
    client.post('/login', data={'username': 'bob', 'password': 'password'})
    assert client.get('/api/profile/avatar').status_code == 404
    assert client.get('/api/me').json['displayName'] == 'bob'
    with client.session_transaction() as session:
        session['username'] = 'deleted_user'
    assert client.get('/api/profile').status_code == 401


def test_whole_request_limit_does_not_lower_video_limit(client):
    token = client.get('/api/profile').json['csrfToken']
    response = client.post('/api/profile', data={'nickname': 'x' * (6 * 1024 * 1024)},
                           headers={'X-CSRF-Token': token})
    assert response.status_code == 413
    assert response.json['error']
    assert app_module.app.config['MAX_CONTENT_LENGTH'] == 500 * 1024 * 1024


def test_corrupt_profile_falls_back_without_breaking_me(client):
    assert save(client).status_code == 200
    path = app_module.PROFILES_ROOT / 'u-616c696365' / 'profile.json'
    path.write_text('{broken')
    assert client.get('/api/me').json['displayName'] == 'alice'


def test_storage_failure_keeps_previous_profile(client, monkeypatch):
    assert save(client, 'Before', picture()).status_code == 200
    old_avatar = client.get('/api/profile/avatar').data
    original = Path.replace
    def fail_metadata(self, target):
        if Path(target).name == 'profile.json':
            raise OSError('simulated disk failure')
        return original(self, target)
    monkeypatch.setattr(Path, 'replace', fail_metadata)
    assert save(client, 'After', picture()).status_code == 503
    assert client.get('/api/me').json['displayName'] == 'Before'
    assert client.get('/api/profile/avatar').data == old_avatar


@pytest.mark.parametrize('url,json_body', [('/api/admin/users', True), ('/admin', False)])
def test_account_deletion_cleans_profile_not_recordings(client, url, json_body):
    assert save(client, image=picture()).status_code == 200
    with client.session_transaction() as session:
        session['username'] = 'admin'
    data = {'action': 'delete', 'username': 'alice'}
    response = client.post(url, **({'json': data} if json_body else {'data': data}))
    assert response.status_code == 200
    assert not (app_module.PROFILES_ROOT / 'u-616c696365' / 'profile.json').exists()


def test_concurrent_updates_leave_one_valid_avatar(client):
    assert save(client).status_code == 200
    from profile_store import save_profile, read_avatar
    root = app_module.PROFILES_ROOT
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda i: save_profile(root, 'alice', f'Tiger{i}', picture()), range(8)))
    assert len(results) == 8
    assert Image.open(io.BytesIO(read_avatar(root, 'alice'))).size == (256, 256)
    assert len(list((root / 'u-616c696365').glob('*.jpg'))) == 1


def test_path_escape_and_tampered_avatar_pointer_are_rejected(client, tmp_path):
    with client.session_transaction() as session:
        session['username'] = '../outside'
    assert client.get('/api/profile').status_code == 401
    with client.session_transaction() as session:
        session['username'] = 'alice'
    assert save(client).status_code == 200
    path = app_module.PROFILES_ROOT / 'u-616c696365' / 'profile.json'
    path.write_text(json.dumps({'nickname': 'Tiger', 'avatar': '../../private.jpg'}))
    assert client.get('/api/profile/avatar').status_code == 404


def test_non_ascii_csrf_is_rejected_not_server_error(client):
    client.get('/api/profile')
    assert client.post('/api/profile', data={'nickname': 'Tiger'},
                       headers={'X-CSRF-Token': 'é'}).status_code == 403


def test_transparency_is_composited_on_warm_background(client):
    data = io.BytesIO()
    Image.new('RGBA', (10, 10), (0, 0, 0, 0)).save(data, 'PNG')
    assert save(client, image=data.getvalue()).status_code == 200
    image = Image.open(io.BytesIO(client.get('/api/profile/avatar').data))
    red, green, blue = image.getpixel((128, 128))
    assert red > 250 and green > 245 and blue > 240


def test_case_distinct_accounts_have_separate_profiles(client):
    assert save(client, 'lowercase', picture()).status_code == 200
    users = json.loads(app_module.USERS_FILE.read_text())
    users['Alice'] = generate_password_hash('another-password')
    app_module.USERS_FILE.write_text(json.dumps(users))
    client.post('/login', data={'username': 'Alice', 'password': 'another-password'})
    assert client.get('/api/profile').json['displayName'] == 'Alice'
    assert client.get('/api/profile/avatar').status_code == 404


def test_recreated_account_does_not_authorize_old_profile_session(client):
    assert save(client, 'Before', picture()).status_code == 200
    users = json.loads(app_module.USERS_FILE.read_text())
    users['alice'] = generate_password_hash('new-account-password')
    app_module.USERS_FILE.write_text(json.dumps(users))
    assert client.get('/api/profile').status_code == 401
    assert client.get('/api/profile/avatar').status_code == 401
    assert client.get('/api/me').json['username'] is None


def test_recreated_account_rejects_session_that_never_opened_profile(client):
    users = json.loads(app_module.USERS_FILE.read_text())
    users['alice'] = generate_password_hash('new-password')
    app_module.USERS_FILE.write_text(json.dumps(users))
    assert client.get('/api/me').json['username'] is None
    assert client.get('/api/profile').status_code == 401
    assert client.get('/api/profile/avatar').status_code == 401


def test_legacy_session_must_login_before_accessing_private_profile(client):
    with client.session_transaction() as session:
        session.clear()
        session['username'] = 'alice'
    assert client.get('/api/profile').status_code == 401
