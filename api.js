// ── CrackerVoid API Client ────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : ''; // aynı domain'de çalışınca boş bırak

async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  return res.json();
}

// ── AUTH ──────────────────────────────────────────────
const Auth = {
  _user: null,
  async init() {
    const d = await apiFetch('/api/me');
    this._user = d.ok ? d.user : null;
    return this._user;
  },
  current() { return this._user; },
  async login(username, password) {
    const d = await apiFetch('/api/login', { method:'POST', body:{username,password} });
    if (d.ok) this._user = d.user;
    return d;
  },
  async register(username, email, password) {
    const d = await apiFetch('/api/register', { method:'POST', body:{username,email,password} });
    if (d.ok) this._user = d.user;
    return d;
  },
  async logout() {
    await apiFetch('/api/logout', { method:'POST' });
    this._user = null;
    window.location.href = 'index.html';
  },
  require() {
    if (!this._user) { window.location.href = 'login.html?r=' + encodeURIComponent(location.href); return false; }
    return true;
  }
};

// ── MONEY ─────────────────────────────────────────────
const Money = {
  async get(username) {
    const d = await apiFetch('/api/money/' + username);
    return d.amount || 0;
  }
};

// ── FORUM ─────────────────────────────────────────────
const Forum = {
  async getThreads(cat) {
    const url = cat ? '/api/threads?cat=' + cat : '/api/threads';
    return apiFetch(url);
  },
  async getThread(id) {
    const d = await apiFetch('/api/threads/' + id);
    return d.ok ? d.thread : null;
  },
  async addThread(cat, title, content, hidden) {
    const d = await apiFetch('/api/threads', { method:'POST', body:{cat,title,content,hidden} });
    return d.ok ? d.id : false;
  },
  async editThread(id, title, content) {
    const d = await apiFetch('/api/threads/'+id+'/edit', { method:'POST', body:{title,content} });
    return d.ok;
  },
  async deleteThread(id) {
    const d = await apiFetch('/api/threads/'+id+'/delete', { method:'POST' });
    return d.ok;
  },
  async incViews(id) { apiFetch('/api/threads/'+id+'/view', { method:'POST' }); },
  async togglePin(id) { return apiFetch('/api/threads/'+id+'/pin', { method:'POST' }); },
  async toggleLock(id) { return apiFetch('/api/threads/'+id+'/lock', { method:'POST' }); },
  async getRepliesFor(id) { return apiFetch('/api/threads/'+id+'/replies'); },
  async addReply(threadId, content, quoteOf) {
    const d = await apiFetch('/api/threads/'+threadId+'/replies', { method:'POST', body:{content,quoteOf} });
    return d.ok;
  },
  async editReply(id, content) {
    const d = await apiFetch('/api/replies/'+id+'/edit', { method:'POST', body:{content} });
    return d.ok;
  },
  async deleteReply(id) {
    const d = await apiFetch('/api/replies/'+id+'/delete', { method:'POST' });
    return d.ok;
  },
  async getLikes(threadId) {
    const d = await apiFetch('/api/threads/'+threadId+'/likes');
    return d.likers || [];
  },
  async hasLiked(threadId) {
    const d = await apiFetch('/api/threads/'+threadId+'/likes');
    return d.liked || false;
  },
  async toggleLike(threadId) {
    const d = await apiFetch('/api/threads/'+threadId+'/like', { method:'POST' });
    return d;
  },
  async stats() { return apiFetch('/api/stats'); },
  _isAdmin(username) {
    const u = Auth.current();
    return u && (u.role === 'founder' || u.role === 'admin' || u.role === 'moderator');
  }
};

// ── REACTIONS ─────────────────────────────────────────
const Reactions = {
  async get(postId) { return apiFetch('/api/reactions/' + postId); },
  async toggle(postId, emoji) { return apiFetch('/api/reactions/'+postId+'/toggle', { method:'POST', body:{emoji} }); },
  async hasReacted(postId, emoji) {
    const d = await this.get(postId);
    const u = Auth.current();
    return u && (d[emoji] || []).includes(u.username);
  }
};

// ── FOLLOW ────────────────────────────────────────────
const Follow = {
  async toggle(target) { return apiFetch('/api/follow/'+target, { method:'POST' }); },
  async stats(username) { return apiFetch('/api/follow/'+username+'/stats'); }
};

// ── NOTIFICATIONS ─────────────────────────────────────
const Notif = {
  async get() { return apiFetch('/api/notifications'); },
  async markRead() { return apiFetch('/api/notifications/read', { method:'POST' }); },
  async unread() {
    const arr = await this.get();
    return Array.isArray(arr) ? arr.filter(n => !n.read).length : 0;
  }
};

// ── DM ────────────────────────────────────────────────
const DM = {
  async get(other) { return apiFetch('/api/messages/' + other); },
  async send(other, msg) { return apiFetch('/api/messages/'+other, { method:'POST', body:{msg} }); },
  async getInbox() { return apiFetch('/api/messages/inbox'); }
};

// ── SHOUTBOX ──────────────────────────────────────────
const Shoutbox = {
  async get() { return apiFetch('/api/shouts'); },
  async add(msg, replyTo) { return apiFetch('/api/shouts', { method:'POST', body:{msg,replyTo} }); },
  async delete(id) { return apiFetch('/api/shouts/'+id+'/delete', { method:'POST' }); }
};

// ── SAVED ─────────────────────────────────────────────
const Saved = {
  async get() { return apiFetch('/api/saved'); },
  async toggle(threadId) { return apiFetch('/api/saved/'+threadId+'/toggle', { method:'POST' }); },
  async has(threadId) {
    const arr = await this.get();
    return arr.includes(threadId);
  }
};

// ── ANNOUNCE ──────────────────────────────────────────
const Announce = {
  async showIfNew() {
    const a = await apiFetch('/api/announce');
    if (!a.msg) return;
    const seen = localStorage.getItem('cv_announce_seen');
    if (seen === String(a.id)) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `<div style="background:var(--bg3);border:2px solid var(--accent);border-radius:10px;padding:28px;max-width:480px;width:100%;position:relative">
      <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:12px">📢 Duyuru</div>
      <div style="font-size:14px;color:var(--text);line-height:1.7">${escHtml(a.msg)}</div>
      <button onclick="this.closest('div[style]').remove();localStorage.setItem('cv_announce_seen','${a.id}')" style="margin-top:18px;width:100%" class="btn btn-primary">Tamam</button>
    </div>`;
    document.body.appendChild(overlay);
    localStorage.setItem('cv_announce_seen', String(a.id));
  }
};

// ── RANK (client-side hesap) ──────────────────────────
const Ranks = [
  { name:'Yeni Üye', min:0, color:'#888', icon:'👤' },
  { name:'Üye', min:1000, color:'#aaa', icon:'🔵' },
  { name:'Bronz Üye', min:4000, color:'#cd7f32', icon:'🥉' },
  { name:'Altın Üye', min:8000, color:'#f1c40f', icon:'🥇' },
  { name:'Diamond Üye', min:13000, color:'#1abc9c', icon:'💎' },
  { name:'Pro Üye', min:20000, color:'#9b59b6', icon:'⚡' },
  { name:'Hacker', min:30000, color:'#e74c3c', icon:'💀' },
  { name:'Elite', min:50000, color:'#e67e22', icon:'🔥' },
  { name:'Legend', min:75000, color:'#3498db', icon:'🌟' },
  { name:'God', min:100000, color:'#f39c12', icon:'👑' },
];

function getRankFromUser(u, money) {
  const nc = u.nameColor || null;
  const ct = u.customTitle || null;
  if (u.username === 'zadrex') return { name:'Kurucu', color:'#c0392b', icon:'👑', nameColor:nc, customTitle:ct };
  if (u.role === 'admin') return { name:'Admin', color:'#c0392b', icon:'🛡', nameColor:nc, customTitle:ct };
  if (u.role === 'moderator') return { name:'Moderatör', color:'#2980b9', icon:'🔧', nameColor:nc, customTitle:ct };
  if (u.role === 'vip') return { name:'VIP', color:'#9b59b6', icon:'⭐', nameColor:nc, customTitle:ct };
  let rank = Ranks[0];
  for (const r of Ranks) { if ((money||0) >= r.min) rank = r; }
  return { ...rank, nameColor:nc, customTitle:ct };
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showAlert(id, msg, type='error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

function launchConfetti() {
  const colors = ['#c0392b','#e74c3c','#f39c12','#2ecc71','#3498db','#9b59b6'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()}s;animation-duration:${1.5+Math.random()}s;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;border-radius:${Math.random()>.5?'50%':'2px'}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}
