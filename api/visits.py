"""Vercel Python Function: /api/visits. Credentials live only in server env."""
import json
import secrets
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlsplit
from server.visit_store import record_visit


class handler(BaseHTTPRequestHandler):
    def respond(self, code, data, cookie=None):
        payload = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        if cookie:
            self.send_header('Set-Cookie', f'travel_visitor={cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000')
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        self.respond(200, {'service': 'visitor-statistics', 'method': 'POST', 'status': 'available'})

    def do_POST(self):
        origin = self.headers.get('Origin')
        host = self.headers.get('X-Forwarded-Host') or self.headers.get('Host')
        if origin and urlsplit(origin).netloc != host:
            self.respond(403, {'error': 'origin_not_allowed'})
            return
        cookies = SimpleCookie()
        try:
            cookies.load(self.headers.get('Cookie', ''))
        except Exception:
            pass
        visitor = cookies['travel_visitor'].value if 'travel_visitor' in cookies else ''
        if len(visitor) != 64 or any(char not in '0123456789abcdef' for char in visitor):
            visitor = secrets.token_hex(32)
        authorization = self.headers.get('Authorization', '')
        token = authorization[7:] if authorization.startswith('Bearer ') else None
        try:
            stats = record_visit(visitor, token)
        except Exception:
            # Do not disclose tokens, keys, credential paths or SDK exception details.
            self.respond(503, {'error': 'statistics_unavailable', 'message': 'Vercel Firebase 서버 인증 환경변수를 확인하세요.'})
            return
        self.respond(200, stats, visitor)
