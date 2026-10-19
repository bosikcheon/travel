"""Server-only Firebase visitor aggregation. No browser writes are allowed."""
import copy
import hashlib
import json
import os
import re
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path

_app = None
_lock = threading.Lock()


def firebase_app():
    global _app
    with _lock:
        if _app is not None:
            return _app
        try:
            import firebase_admin
            from firebase_admin import credentials
        except ImportError as error:
            raise RuntimeError('Run py -m pip install -r server/requirements.txt') from error
        root = Path(__file__).resolve().parent.parent
        url = os.environ.get('FIREBASE_DATABASE_URL')
        if not url:
            source = (root / 'js/firebase-config.js').read_text(encoding='utf-8')
            match = re.search(r'''["']?databaseURL["']?\s*:\s*["']([^"']+)''', source)
            url = match.group(1) if match else None
        if not url:
            raise RuntimeError('FIREBASE_DATABASE_URL is required')
        secret = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
        credential = credentials.Certificate(json.loads(secret)) if secret else credentials.ApplicationDefault()
        _app = firebase_admin.initialize_app(credential, {'databaseURL': url}, name='travel-statistics')
        return _app


def aggregate(current, browser_hash, day, now, uid=None):
    data = copy.deepcopy(current or {})
    daily = data.setdefault('daily', {}).setdefault(day, {'visitCount': 0, 'browsers': {}})
    if browser_hash not in daily.setdefault('browsers', {}):
        daily['browsers'][browser_hash] = True
        daily['visitCount'] += 1
        data['totalVisitCount'] = int(data.get('totalVisitCount', 0)) + 1
    if uid:
        member = data.setdefault('members', {}).setdefault(uid, {'visitCount': 0, 'lastVisitedAt': 0, 'days': {}})
        if not member.setdefault('days', {}).get(day):
            member['days'][day] = True
            member['visitCount'] += 1
        member['lastVisitedAt'] = max(member.get('lastVisitedAt', 0), now)
    return data


def record_visit(visitor, token=None):
    app = firebase_app()
    from firebase_admin import auth, db
    uid = None
    if token:
        # Never trust a UID supplied by the browser.
        decoded = auth.verify_id_token(token, app=app, check_revoked=True)
        uid = decoded['uid']
        profile = db.reference(f'members/{uid}', app=app).get()
        if not profile or profile.get('withdrawn') is True or profile.get('status') != 'active':
            uid = None
    moment = datetime.now(timezone(timedelta(hours=9)))
    day = moment.date().isoformat()
    now = int(moment.timestamp() * 1000)
    fingerprint = hashlib.sha256(visitor.encode()).hexdigest()
    stored = db.reference('visitStatistics', app=app).transaction(lambda current: aggregate(current, fingerprint, day, now, uid))
    # Publish aggregate counts only. UID/browser history stays private.
    def publish(current):
        result = current or {}
        result['totalVisitCount'] = max(result.get('totalVisitCount', 0), stored.get('totalVisitCount', 0))
        days = result.setdefault('dailyCounts', {})
        days[day] = max(days.get(day, 0), stored['daily'][day]['visitCount'])
        return result
    public = db.reference('visitSummary', app=app).transaction(publish)
    if uid:
        counters = stored['members'][uid]
        def mirror(current):
            if not current or current.get('withdrawn') is True or current.get('status') != 'active':
                return current
            current['visitCount'] = max(current.get('visitCount', 0), counters['visitCount'])
            current['lastVisitedAt'] = max(current.get('lastVisitedAt', 0), counters['lastVisitedAt'])
            return current
        db.reference(f'members/{uid}', app=app).transaction(mirror)
    return {'today': public['dailyCounts'].get(day, 0), 'total': public['totalVisitCount'], 'date': day}


def migrate_local_stats(store):
    """Idempotently import old hashed browser/day records; keep original SQLite file."""
    if not store.exists():
        return 0
    import sqlite3
    from contextlib import closing
    from firebase_admin import db
    app = firebase_app()
    with closing(sqlite3.connect(store)) as connection:
        rows = connection.execute('SELECT day, visitor FROM visits').fetchall()
    def merge(current):
        result = current
        for day, browser_hash in rows:
            result = aggregate(result, browser_hash, day, 0)
        return result or {}
    stored = db.reference('visitStatistics', app=app).transaction(merge)
    def publish(current):
        value = current or {}
        value['totalVisitCount'] = max(value.get('totalVisitCount', 0), stored.get('totalVisitCount', 0))
        days = value.setdefault('dailyCounts', {})
        for day, info in stored.get('daily', {}).items():
            days[day] = max(days.get(day, 0), info['visitCount'])
        return value
    db.reference('visitSummary', app=app).transaction(publish)
    return len(rows)
