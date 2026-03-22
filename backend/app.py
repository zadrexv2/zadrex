from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3, hashlib, os, time

app = Flask(__name__)
app.secret_key = 'crackervoid_secret_2026'
CORS(app, supports_credentials=True, origins='*')
DB = os.path.join(os.path.dirname(__file__), 'cv.db')

def get_db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    con = get_db()
    c = con.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            joined TEXT,
            posts INTEGER DEFAULT 0,
            avatar_color TEXT DEFAULT '#c0392b',
            avatar_img TEXT,
            bio TEXT,
            location TEXT,
            discord TEXT,
            website TEXT,
            name_color TEXT,
            custom_title TEXT,
            badges TEXT DEFAULT '[]',
            banned INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cat TEXT, title TEXT, content TEXT,
            author TEXT, date TEXT,
            replies INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0,
            pinned INTEGER DEFAULT 0,
            locked INTEGER DEFAULT 0,
            hidden INTEGER DEFAULT 0,
            edited INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id INTEGER, content TEXT,
            author TEXT, date TEXT,
            quote_of INTEGER,
            edited INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS likes (
            thread_id INTEGER, username TEXT,
            PRIMARY KEY(thread_id, username)
        );
        CREATE TABLE IF NOT EXISTS money (
            username TEXT PRIMARY KEY,
            amount INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS follows (
            follower TEXT, following TEXT,
            PRIMARY KEY(follower, following)
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            to_user TEXT, type TEXT, msg TEXT,
            link TEXT, read INTEGER DEFAULT 0,
            time TEXT
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user TEXT, to_user TEXT,
            msg TEXT, time TEXT, date TEXT
        );
        CREATE TABLE IF NOT EXISTS shouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT, msg TEXT,
            reply_to TEXT, time TEXT
        );
        CREATE TABLE IF NOT EXISTS reactions (
            post_id TEXT, emoji TEXT, username TEXT,
            PRIMARY KEY(post_id, emoji, username)
        );
        CREATE TABLE IF NOT EXISTS saved (
            username TEXT, thread_id INTEGER,
            PRIMARY KEY(username, thread_id)
        );
        CREATE TABLE IF NOT EXISTS daily_reward (
            username TEXT PRIMARY KEY, last_claim TEXT
        );
        CREATE TABLE IF NOT EXISTS store_owned (
            username TEXT, item_id TEXT,
            PRIMARY KEY(username, item_id)
        );
        CREATE TABLE IF NOT EXISTS warns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT, reason TEXT, by_admin TEXT, date TEXT
        );
        CREATE TABLE IF NOT EXISTS announce (
            id INTEGER PRIMARY KEY, msg TEXT
        );
    ''')
    # zadrex bootstrap
    pw = hashlib.sha256('Yetereren.123'.encode()).hexdigest()
    c.execute("INSERT OR IGNORE INTO users (username,email,password,role,joined) VALUES (?,?,?,?,?)",
              ('zadrex','zadrex@crackervoid.com',pw,'founder','01.01.2026'))
    con.commit(); con.close()

init_db()

def hash_pw(p): return hashlib.sha256(p.encode()).hexdigest()
def is_admin(username):
    con = get_db(); c = con.cursor()
    c.execute("SELECT role FROM users WHERE username=?", (username,))
    r = c.fetchone(); con.close()
    return r and r['role'] in ('founder','admin','moderator')

def get_rank(username):
    con = get_db(); c = con.cursor()
    c.execute("SELECT role,name_color,custom_title FROM users WHERE username=?", (username,))
    u = c.fetchone()
    c.execute("SELECT amount FROM money WHERE username=?", (username,))
    m = c.fetchone(); con.close()
    money = m['amount'] if m else 0
    nc = u['name_color'] if u else None
    ct = u['custom_title'] if u else None
    if username == 'zadrex': return {'name':'Kurucu','color':'#c0392b','icon':'👑','nameColor':nc,'customTitle':ct}
    if u:
        if u['role']=='admin': return {'name':'Admin','color':'#c0392b','icon':'🛡','nameColor':nc,'customTitle':ct}
        if u['role']=='moderator': return {'name':'Moderatör','color':'#2980b9','icon':'🔧','nameColor':nc,'customTitle':ct}
        if u['role']=='vip': return {'name':'VIP','color':'#9b59b6','icon':'⭐','nameColor':nc,'customTitle':ct}
    ranks = [
        {'name':'Yeni Üye','min':0,'color':'#888','icon':'👤'},
        {'name':'Üye','min':1000,'color':'#aaa','icon':'🔵'},
        {'name':'Bronz Üye','min':4000,'color':'#cd7f32','icon':'🥉'},
        {'name':'Altın Üye','min':8000,'color':'#f1c40f','icon':'🥇'},
        {'name':'Diamond Üye','min':13000,'color':'#1abc9c','icon':'💎'},
        {'name':'Pro Üye','min':20000,'color':'#9b59b6','icon':'⚡'},
        {'name':'Hacker','min':30000,'color':'#e74c3c','icon':'💀'},
        {'name':'Elite','min':50000,'color':'#e67e22','icon':'🔥'},
        {'name':'Legend','min':75000,'color':'#3498db','icon':'🌟'},
        {'name':'God','min':100000,'color':'#f39c12','icon':'👑'},
    ]
    rank = ranks[0]
    for r in ranks:
        if money >= r['min']: rank = r
    return {**rank,'nameColor':nc,'customTitle':ct}

# ── AUTH ──────────────────────────────────────────────
@app.route('/api/register', methods=['POST'])
def register():
    d = request.json
    u,e,p = d.get('username','').strip(), d.get('email','').strip(), d.get('password','')
    if not u or not e or not p: return jsonify({'ok':False,'msg':'Eksik alan.'})
    if len(p) < 6: return jsonify({'ok':False,'msg':'Şifre en az 6 karakter.'})
    con = get_db(); c = con.cursor()
    if c.execute("SELECT 1 FROM users WHERE username=?", (u,)).fetchone():
        con.close(); return jsonify({'ok':False,'msg':'Bu kullanıcı adı alınmış.'})
    if c.execute("SELECT 1 FROM users WHERE email=?", (e,)).fetchone():
        con.close(); return jsonify({'ok':False,'msg':'Bu e-posta zaten kayıtlı.'})
    from datetime import date
    c.execute("INSERT INTO users (username,email,password,joined) VALUES (?,?,?,?)",
              (u,e,hash_pw(p),date.today().strftime('%d.%m.%Y')))
    con.commit(); con.close()
    session['username'] = u
    return jsonify({'ok':True,'user':_user_obj(u)})

@app.route('/api/login', methods=['POST'])
def login():
    d = request.json
    u,p = d.get('username','').strip(), d.get('password','')
    con = get_db(); c = con.cursor()
    row = c.execute("SELECT * FROM users WHERE username=?", (u,)).fetchone()
    con.close()
    if not row or row['password'] != hash_pw(p): return jsonify({'ok':False,'msg':'Kullanıcı adı veya şifre hatalı.'})
    if row['banned']: return jsonify({'ok':False,'msg':'banned'})
    session['username'] = u
    return jsonify({'ok':True,'user':_user_obj(u)})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear(); return jsonify({'ok':True})

@app.route('/api/me')
def me():
    u = session.get('username')
    if not u: return jsonify({'ok':False})
    return jsonify({'ok':True,'user':_user_obj(u)})

def _user_obj(username):
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    con.close()
    if not r: return None
    import json
    return {'id':r['id'],'username':r['username'],'email':r['email'],'role':r['role'],
            'joined':r['joined'],'posts':r['posts'],'avatarColor':r['avatar_color'],
            'avatarImg':r['avatar_img'],'bio':r['bio'],'location':r['location'],
            'discord':r['discord'],'website':r['website'],'nameColor':r['name_color'],
            'customTitle':r['custom_title'],'badges':json.loads(r['badges'] or '[]')}

# ── USERS ─────────────────────────────────────────────
@app.route('/api/users')
def users_list():
    con = get_db(); c = con.cursor()
    rows = c.execute("SELECT username FROM users").fetchall(); con.close()
    return jsonify([_user_obj(r['username']) for r in rows])

@app.route('/api/users/<username>')
def user_profile(username):
    obj = _user_obj(username)
    if not obj: return jsonify({'ok':False}), 404
    obj['rank'] = get_rank(username)
    obj['money'] = _get_money(username)
    return jsonify({'ok':True,'user':obj})

@app.route('/api/users/<username>/update', methods=['POST'])
def update_profile(username):
    if session.get('username') != username: return jsonify({'ok':False}), 403
    d = request.json
    con = get_db(); c = con.cursor()
    fields = ['bio','location','discord','website','avatar_color','avatar_img']
    for f in fields:
        if f in d:
            col = f.replace('avatar_color','avatar_color').replace('avatar_img','avatar_img')
            c.execute(f"UPDATE users SET {col}=? WHERE username=?", (d[f], username))
    con.commit(); con.close()
    return jsonify({'ok':True,'user':_user_obj(username)})

# ── MONEY ─────────────────────────────────────────────
def _get_money(username):
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT amount FROM money WHERE username=?", (username,)).fetchone()
    con.close(); return r['amount'] if r else 0

def _add_money(username, amount):
    con = get_db(); c = con.cursor()
    c.execute("INSERT INTO money (username,amount) VALUES (?,?) ON CONFLICT(username) DO UPDATE SET amount=amount+?",
              (username, amount, amount))
    con.commit(); con.close()

def _sub_money(username, amount):
    con = get_db(); c = con.cursor()
    cur = _get_money(username)
    new = max(0, cur - amount)
    c.execute("INSERT INTO money (username,amount) VALUES (?,?) ON CONFLICT(username) DO UPDATE SET amount=?",
              (username, new, new))
    con.commit(); con.close()

@app.route('/api/money/<username>')
def money_get(username):
    return jsonify({'amount': _get_money(username)})

# ── THREADS ───────────────────────────────────────────
@app.route('/api/threads')
def threads_list():
    cat = request.args.get('cat')
    con = get_db(); c = con.cursor()
    if cat: rows = c.execute("SELECT * FROM threads WHERE cat=? ORDER BY pinned DESC, id DESC", (cat,)).fetchall()
    else: rows = c.execute("SELECT * FROM threads ORDER BY pinned DESC, id DESC").fetchall()
    con.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/threads/<int:tid>')
def thread_get(tid):
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT * FROM threads WHERE id=?", (tid,)).fetchone()
    con.close()
    if not r: return jsonify({'ok':False}), 404
    return jsonify({'ok':True,'thread':dict(r)})

@app.route('/api/threads', methods=['POST'])
def thread_create():
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    d = request.json
    from datetime import date
    con = get_db(); c = con.cursor()
    c.execute("INSERT INTO threads (cat,title,content,author,date,hidden) VALUES (?,?,?,?,?,?)",
              (d['cat'],d['title'],d['content'],u,date.today().strftime('%d.%m.%Y'),int(d.get('hidden',False))))
    tid = c.lastrowid
    c.execute("UPDATE users SET posts=posts+1 WHERE username=?", (u,))
    con.commit(); con.close()
    _add_money(u, 50)
    return jsonify({'ok':True,'id':tid})

@app.route('/api/threads/<int:tid>/view', methods=['POST'])
def thread_view(tid):
    con = get_db(); c = con.cursor()
    c.execute("UPDATE threads SET views=views+1 WHERE id=?", (tid,))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/threads/<int:tid>/delete', methods=['POST'])
def thread_delete(tid):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT author FROM threads WHERE id=?", (tid,)).fetchone()
    if not r: con.close(); return jsonify({'ok':False}), 404
    if r['author'] != u and not is_admin(u): con.close(); return jsonify({'ok':False}), 403
    c.execute("DELETE FROM threads WHERE id=?", (tid,))
    c.execute("DELETE FROM replies WHERE thread_id=?", (tid,))
    c.execute("DELETE FROM likes WHERE thread_id=?", (tid,))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/threads/<int:tid>/edit', methods=['POST'])
def thread_edit(tid):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    d = request.json
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT author FROM threads WHERE id=?", (tid,)).fetchone()
    if not r or (r['author'] != u and not is_admin(u)): con.close(); return jsonify({'ok':False}), 403
    c.execute("UPDATE threads SET title=?,content=?,edited=1 WHERE id=?", (d['title'],d['content'],tid))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/threads/<int:tid>/pin', methods=['POST'])
def thread_pin(tid):
    u = session.get('username')
    if not u or not is_admin(u): return jsonify({'ok':False}), 403
    con = get_db(); c = con.cursor()
    c.execute("UPDATE threads SET pinned=1-pinned WHERE id=?", (tid,))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/threads/<int:tid>/lock', methods=['POST'])
def thread_lock(tid):
    u = session.get('username')
    if not u or not is_admin(u): return jsonify({'ok':False}), 403
    con = get_db(); c = con.cursor()
    c.execute("UPDATE threads SET locked=1-locked WHERE id=?", (tid,))
    con.commit(); con.close(); return jsonify({'ok':True})

# ── LIKES ─────────────────────────────────────────────
@app.route('/api/threads/<int:tid>/like', methods=['POST'])
def thread_like(tid):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    con = get_db(); c = con.cursor()
    existing = c.execute("SELECT 1 FROM likes WHERE thread_id=? AND username=?", (tid,u)).fetchone()
    t = c.execute("SELECT author FROM threads WHERE id=?", (tid,)).fetchone()
    if existing:
        c.execute("DELETE FROM likes WHERE thread_id=? AND username=?", (tid,u))
        if t and t['author'] != u: _sub_money(t['author'], 10)
        liked = False
    else:
        c.execute("INSERT INTO likes (thread_id,username) VALUES (?,?)", (tid,u))
        if t and t['author'] != u:
            _add_money(t['author'], 10)
            _add_notif(t['author'],'like',u+' konunu beğendi.','/thread.html?id='+str(tid))
        liked = True
    count = c.execute("SELECT COUNT(*) as n FROM likes WHERE thread_id=?", (tid,)).fetchone()['n']
    likers = [r['username'] for r in c.execute("SELECT username FROM likes WHERE thread_id=?", (tid,)).fetchall()]
    con.commit(); con.close()
    return jsonify({'ok':True,'liked':liked,'count':count,'likers':likers})

@app.route('/api/threads/<int:tid>/likes')
def thread_likes(tid):
    con = get_db(); c = con.cursor()
    u = session.get('username')
    likers = [r['username'] for r in c.execute("SELECT username FROM likes WHERE thread_id=?", (tid,)).fetchall()]
    con.close()
    return jsonify({'likers':likers,'liked': u in likers if u else False})

# ── REPLIES ───────────────────────────────────────────
@app.route('/api/threads/<int:tid>/replies')
def replies_list(tid):
    con = get_db(); c = con.cursor()
    rows = c.execute("SELECT * FROM replies WHERE thread_id=? ORDER BY id ASC", (tid,)).fetchall()
    con.close(); return jsonify([dict(r) for r in rows])

@app.route('/api/threads/<int:tid>/replies', methods=['POST'])
def reply_create(tid):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    d = request.json
    con = get_db(); c = con.cursor()
    t = c.execute("SELECT * FROM threads WHERE id=?", (tid,)).fetchone()
    if not t: con.close(); return jsonify({'ok':False}), 404
    if t['locked'] and not is_admin(u): con.close(); return jsonify({'ok':False,'msg':'Konu kilitli.'})
    from datetime import date
    c.execute("INSERT INTO replies (thread_id,content,author,date,quote_of) VALUES (?,?,?,?,?)",
              (tid, d['content'], u, date.today().strftime('%d.%m.%Y'), d.get('quoteOf')))
    rid = c.lastrowid
    c.execute("UPDATE threads SET replies=replies+1 WHERE id=?", (tid,))
    c.execute("UPDATE users SET posts=posts+1 WHERE username=?", (u,))
    con.commit(); con.close()
    _add_money(u, 20)
    if t['author'] != u:
        _add_notif(t['author'],'reply',u+' konuna yanıt yazdı.','/thread.html?id='+str(tid))
    return jsonify({'ok':True,'id':rid})

@app.route('/api/replies/<int:rid>/delete', methods=['POST'])
def reply_delete(rid):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT * FROM replies WHERE id=?", (rid,)).fetchone()
    if not r or (r['author'] != u and not is_admin(u)): con.close(); return jsonify({'ok':False}), 403
    c.execute("DELETE FROM replies WHERE id=?", (rid,))
    c.execute("UPDATE threads SET replies=MAX(0,replies-1) WHERE id=?", (r['thread_id'],))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/replies/<int:rid>/edit', methods=['POST'])
def reply_edit(rid):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    d = request.json
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT author FROM replies WHERE id=?", (rid,)).fetchone()
    if not r or (r['author'] != u and not is_admin(u)): con.close(); return jsonify({'ok':False}), 403
    c.execute("UPDATE replies SET content=?,edited=1 WHERE id=?", (d['content'],rid))
    con.commit(); con.close(); return jsonify({'ok':True})

# ── REACTIONS ─────────────────────────────────────────
@app.route('/api/reactions/<post_id>')
def reactions_get(post_id):
    con = get_db(); c = con.cursor()
    rows = c.execute("SELECT emoji,username FROM reactions WHERE post_id=?", (post_id,)).fetchall()
    con.close()
    data = {}
    for r in rows:
        data.setdefault(r['emoji'],[]).append(r['username'])
    return jsonify(data)

@app.route('/api/reactions/<post_id>/toggle', methods=['POST'])
def reactions_toggle(post_id):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    emoji = request.json.get('emoji')
    con = get_db(); c = con.cursor()
    ex = c.execute("SELECT 1 FROM reactions WHERE post_id=? AND emoji=? AND username=?", (post_id,emoji,u)).fetchone()
    if ex: c.execute("DELETE FROM reactions WHERE post_id=? AND emoji=? AND username=?", (post_id,emoji,u))
    else: c.execute("INSERT INTO reactions (post_id,emoji,username) VALUES (?,?,?)", (post_id,emoji,u))
    con.commit(); con.close(); return jsonify({'ok':True})

# ── FOLLOW ────────────────────────────────────────────
@app.route('/api/follow/<target>', methods=['POST'])
def follow_toggle(target):
    u = session.get('username')
    if not u or u == target: return jsonify({'ok':False}), 401
    con = get_db(); c = con.cursor()
    ex = c.execute("SELECT 1 FROM follows WHERE follower=? AND following=?", (u,target)).fetchone()
    if ex:
        c.execute("DELETE FROM follows WHERE follower=? AND following=?", (u,target))
        following = False
    else:
        c.execute("INSERT INTO follows (follower,following) VALUES (?,?)", (u,target))
        _add_notif(target,'follow',u+' seni takip etmeye başladı.','/profile.html?u='+u)
        following = True
    con.commit(); con.close()
    return jsonify({'ok':True,'following':following})

@app.route('/api/follow/<username>/stats')
def follow_stats(username):
    con = get_db(); c = con.cursor()
    u = session.get('username')
    followers = c.execute("SELECT COUNT(*) as n FROM follows WHERE following=?", (username,)).fetchone()['n']
    following = c.execute("SELECT COUNT(*) as n FROM follows WHERE follower=?", (username,)).fetchone()['n']
    is_following = bool(c.execute("SELECT 1 FROM follows WHERE follower=? AND following=?", (u,username)).fetchone()) if u else False
    con.close()
    return jsonify({'followers':followers,'following':following,'isFollowing':is_following})

# ── NOTIFICATIONS ─────────────────────────────────────
def _add_notif(to_user, ntype, msg, link):
    from datetime import datetime
    con = get_db(); c = con.cursor()
    c.execute("INSERT INTO notifications (to_user,type,msg,link,time) VALUES (?,?,?,?,?)",
              (to_user, ntype, msg, link, datetime.now().strftime('%H:%M')))
    # max 50 tut
    c.execute("DELETE FROM notifications WHERE to_user=? AND id NOT IN (SELECT id FROM notifications WHERE to_user=? ORDER BY id DESC LIMIT 50)", (to_user,to_user))
    con.commit(); con.close()

@app.route('/api/notifications')
def notifs_get():
    u = session.get('username')
    if not u: return jsonify([])
    con = get_db(); c = con.cursor()
    rows = c.execute("SELECT * FROM notifications WHERE to_user=? ORDER BY id DESC", (u,)).fetchall()
    con.close(); return jsonify([dict(r) for r in rows])

@app.route('/api/notifications/read', methods=['POST'])
def notifs_read():
    u = session.get('username')
    if not u: return jsonify({'ok':False})
    con = get_db(); c = con.cursor()
    c.execute("UPDATE notifications SET read=1 WHERE to_user=?", (u,))
    con.commit(); con.close(); return jsonify({'ok':True})

# ── MESSAGES ──────────────────────────────────────────
@app.route('/api/messages/<other>')
def messages_get(other):
    u = session.get('username')
    if not u: return jsonify([])
    con = get_db(); c = con.cursor()
    rows = c.execute("SELECT * FROM messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?) ORDER BY id ASC",
                     (u,other,other,u)).fetchall()
    con.close(); return jsonify([dict(r) for r in rows])

@app.route('/api/messages/<other>', methods=['POST'])
def messages_send(other):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    msg = request.json.get('msg','').strip()
    if not msg: return jsonify({'ok':False})
    from datetime import datetime, date
    con = get_db(); c = con.cursor()
    c.execute("INSERT INTO messages (from_user,to_user,msg,time,date) VALUES (?,?,?,?,?)",
              (u, other, msg, datetime.now().strftime('%H:%M'), date.today().strftime('%d.%m.%Y')))
    con.commit(); con.close()
    _add_notif(other,'dm',u+' sana mesaj gönderdi.','/messages.html?u='+u)
    return jsonify({'ok':True})

@app.route('/api/messages/inbox')
def messages_inbox():
    u = session.get('username')
    if not u: return jsonify([])
    con = get_db(); c = con.cursor()
    users = [r['username'] for r in c.execute("SELECT username FROM users WHERE username!=?", (u,)).fetchall()]
    inbox = []
    for other in users:
        last = c.execute("SELECT * FROM messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?) ORDER BY id DESC LIMIT 1",
                         (u,other,other,u)).fetchone()
        if last: inbox.append({'with':other,'last':dict(last)})
    con.close()
    inbox.sort(key=lambda x: x['last']['id'], reverse=True)
    return jsonify(inbox)

# ── SHOUTBOX ──────────────────────────────────────────
@app.route('/api/shouts')
def shouts_get():
    con = get_db(); c = con.cursor()
    rows = c.execute("SELECT * FROM shouts ORDER BY id DESC LIMIT 100").fetchall()
    con.close(); return jsonify([dict(r) for r in rows])

@app.route('/api/shouts', methods=['POST'])
def shouts_add():
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    d = request.json
    from datetime import datetime
    con = get_db(); c = con.cursor()
    c.execute("INSERT INTO shouts (author,msg,reply_to,time) VALUES (?,?,?,?)",
              (u, d.get('msg','').strip(), d.get('replyTo'), datetime.now().strftime('%H:%M')))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/shouts/<int:sid>/delete', methods=['POST'])
def shouts_delete(sid):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT author FROM shouts WHERE id=?", (sid,)).fetchone()
    if not r or (r['author'] != u and not is_admin(u)): con.close(); return jsonify({'ok':False}), 403
    c.execute("DELETE FROM shouts WHERE id=?", (sid,))
    con.commit(); con.close(); return jsonify({'ok':True})

# ── SAVED ─────────────────────────────────────────────
@app.route('/api/saved')
def saved_get():
    u = session.get('username')
    if not u: return jsonify([])
    con = get_db(); c = con.cursor()
    rows = c.execute("SELECT thread_id FROM saved WHERE username=?", (u,)).fetchall()
    con.close(); return jsonify([r['thread_id'] for r in rows])

@app.route('/api/saved/<int:tid>/toggle', methods=['POST'])
def saved_toggle(tid):
    u = session.get('username')
    if not u: return jsonify({'ok':False}), 401
    con = get_db(); c = con.cursor()
    ex = c.execute("SELECT 1 FROM saved WHERE username=? AND thread_id=?", (u,tid)).fetchone()
    if ex: c.execute("DELETE FROM saved WHERE username=? AND thread_id=?", (u,tid)); saved=False
    else: c.execute("INSERT INTO saved (username,thread_id) VALUES (?,?)", (u,tid)); saved=True
    con.commit(); con.close(); return jsonify({'ok':True,'saved':saved})

# ── ADMIN ─────────────────────────────────────────────
@app.route('/api/admin/users')
def admin_users():
    u = session.get('username')
    if not u or not is_admin(u): return jsonify({'ok':False}), 403
    con = get_db(); c = con.cursor()
    rows = c.execute("SELECT * FROM users").fetchall(); con.close()
    return jsonify([_user_obj(r['username']) for r in rows])

@app.route('/api/admin/ban/<target>', methods=['POST'])
def admin_ban(target):
    u = session.get('username')
    if not u or not is_admin(u): return jsonify({'ok':False}), 403
    if target == 'zadrex': return jsonify({'ok':False,'msg':'Bu kullanıcı banlanamaz.'})
    con = get_db(); c = con.cursor()
    c.execute("UPDATE users SET banned=1-banned WHERE username=?", (target,))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/admin/role/<target>', methods=['POST'])
def admin_role(target):
    u = session.get('username')
    if not u or not is_admin(u): return jsonify({'ok':False}), 403
    if target == 'zadrex': return jsonify({'ok':False})
    role = request.json.get('role','member')
    con = get_db(); c = con.cursor()
    c.execute("UPDATE users SET role=? WHERE username=?", (role,target))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/admin/announce', methods=['POST'])
def admin_announce():
    u = session.get('username')
    if not u or not is_admin(u): return jsonify({'ok':False}), 403
    msg = request.json.get('msg','')
    con = get_db(); c = con.cursor()
    c.execute("DELETE FROM announce"); c.execute("INSERT INTO announce (id,msg) VALUES (1,?)", (msg,))
    con.commit(); con.close(); return jsonify({'ok':True})

@app.route('/api/announce')
def announce_get():
    con = get_db(); c = con.cursor()
    r = c.execute("SELECT * FROM announce WHERE id=1").fetchone()
    con.close(); return jsonify(dict(r) if r else {})

# ── STATS ─────────────────────────────────────────────
@app.route('/api/stats')
def stats():
    con = get_db(); c = con.cursor()
    threads = c.execute("SELECT COUNT(*) as n FROM threads").fetchone()['n']
    posts = c.execute("SELECT COUNT(*) as n FROM replies").fetchone()['n'] + threads
    members = c.execute("SELECT COUNT(*) as n FROM users").fetchone()['n']
    con.close()
    return jsonify({'threads':threads,'posts':posts,'members':members})

@app.route('/api/search')
def search():
    q = request.args.get('q','').lower()
    cat = request.args.get('cat','')
    author = request.args.get('author','').lower()
    con = get_db(); c = con.cursor()
    sql = "SELECT * FROM threads WHERE 1=1"
    params = []
    if q: sql += " AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)"; params += ['%'+q+'%','%'+q+'%']
    if cat and cat != 'all': sql += " AND cat=?"; params.append(cat)
    if author: sql += " AND LOWER(author) LIKE ?"; params.append('%'+author+'%')
    sql += " ORDER BY id DESC LIMIT 50"
    rows = c.execute(sql, params).fetchall(); con.close()
    return jsonify([dict(r) for r in rows])

if __name__ == '__main__':
    app.run(debug=True, port=5000)
