"""Run the full stone map with isolated, fictional, read-only preview data.

Usage: app/.venv/Scripts/python tools/preview_stone_map.py [--port 0]
This imports Flask without executing app.py's production media scan.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile
from unittest.mock import patch


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--login', action='store_true', help='Exercise login with the temporary preview / preview-only account')
    args = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    app_dir = project / 'app'
    sys.path.insert(0, str(app_dir))
    from werkzeug.security import generate_password_hash
    from werkzeug.serving import make_server
    from flask import request, session, jsonify

    with tempfile.TemporaryDirectory(prefix='english-stone-preview-') as temporary:
        root = Path(temporary)
        shutil.copytree(project / 'curriculum', root / 'curriculum')
        shutil.copytree(project / 'prompts' / '04', root / 'prompts' / '04')
        for name in ('CURRICULUM', 'DEMO', 'RECORDINGS', 'PROMPTS', 'PROFILES'):
            os.environ[name + '_ROOT'] = str(root / name.lower())
        os.environ['CURRICULUM_STAGE'] = '04'
        # Never even read real config or real account data.
        original_exists = Path.exists
        config = app_dir / 'config.json'
        with patch.object(Path, 'exists', lambda p: False if p == config else original_exists(p)):
            import app as application
        # Cookies are scoped by host, not port: never replace the family's login.
        application.app.config['SESSION_COOKIE_NAME'] = 'stone_map_preview_session'
        application.app.config['TEMPLATES_AUTO_RELOAD'] = True
        account_hash = generate_password_hash('preview-only' if args.login else secrets.token_urlsafe(24))
        application.USERS_FILE = root / 'users.json'
        application.USERS_FILE.write_text(json.dumps({'preview': account_hash}), encoding='utf-8')
        stamp = application._account_stamp('preview', account_hash)

        @application.app.before_request
        def preview_session():
            # This hook exists ONLY on this separate loopback preview process.
            if args.login and request.path == '/login' and request.method == 'POST':
                return None
            if request.method not in ('GET', 'HEAD', 'OPTIONS'):
                return jsonify(error='This visual preview is read-only.'), 403
            if not args.login:
                session['username'] = 'preview'
                session['profile_account_stamp'] = stamp

        chapter = sorted((root / 'curriculum' / '04').glob('*/chapter.json'))[0].parent
        lessons = sorted(chapter.glob('*/lesson.json'))[:3]
        assets = app_dir / 'static' / 'stone-map' / 'sample'
        ffmpeg = application._ffmpeg_path()

        def make_video(image, destination):
            destination.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
                            '-loop', '1', '-i', str(image), '-t', '3', '-r', '12',
                            '-vf', 'scale=640:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                            '-movflags', '+faststart', str(destination)],
                           check=True, timeout=30, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))

        for lesson, image in zip(lessons, ('choice.png', 'choice.png', 'water.png')):
            demo = root / 'demo' / '04' / chapter.name / lesson.parent.name / 'demo.mp4'
            make_video(assets / image, demo)
            application._generate_thumb(demo)
        make_video(assets / 'performance.png', root / 'recordings' / 'preview' / '04' /
                   chapter.name / lessons[0].parent.name / 'performance.mp4')
        server = make_server('127.0.0.1', args.port, application.app, threaded=True)
        print(f'PREVIEW_URL=http://127.0.0.1:{server.server_port}/', flush=True)
        print(f'SAMPLE_URL=http://127.0.0.1:{server.server_port}/?map-sample=1', flush=True)
        print('Fictional sample media. Temporary accounts and progress. Read-only.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


if __name__ == '__main__':
    main()
