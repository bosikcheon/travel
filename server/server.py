"""Static site + local visitor statistics. Run: py server/server.py"""
import argparse
import json
import secrets
from datetime import datetime, timezone, timedelta
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent



from visit_store import record_visit


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Local development must not keep an older HTML/JS/CSS screen in cache.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        # Do not serve local data, tooling, source config or directory listings.
        if path == '/api/visits':
            self.send_error(405, 'Use POST')
            return
        if path != '/' and not (path == '/index.html' or path.startswith(('/css/', '/js/', '/html/'))):
            self.send_error(404)
            return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def translate_path(self, path):
        resolved = Path(super().translate_path(path)).resolve()
        if not resolved.is_relative_to(ROOT) or any(part.startswith('.') for part in resolved.relative_to(ROOT).parts):
            return str(ROOT / '__not_found__')
        return str(resolved)

    def do_POST(self):
        if urlsplit(self.path).path != '/api/visits':
            self.send_error(404)
            return
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            self.send_error(403)
            return
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
        except Exception:
            pass
        visitor = cookie['travel_visitor'].value if 'travel_visitor' in cookie else ''
        if len(visitor) != 64 or any(c not in '0123456789abcdef' for c in visitor):
            visitor = secrets.token_hex(32)
        day = datetime.now(timezone(timedelta(hours=9))).date().isoformat()
        try:
            authorization = self.headers.get('Authorization', '')
            token = authorization[7:] if authorization.startswith('Bearer ') else None
            payload = json.dumps(record_visit(visitor, token)).encode()
        except Exception:
            # Never include credential paths, tokens or SDK errors in responses.
            self.send_error(503, 'Firebase statistics server configuration or authentication unavailable')
            return
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Set-Cookie', f'travel_visitor={visitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--migrate-local-stats', action='store_true')
    args = parser.parse_args()
    if args.migrate_local_stats:
        from visit_store import migrate_local_stats
        count = migrate_local_stats(ROOT / '.local-data' / 'visitors.sqlite3')
        print(f'Imported {count} legacy day/browser records (safe to rerun)', flush=True)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Travel site: http://127.0.0.1:{args.port} (Ctrl+C to stop)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
