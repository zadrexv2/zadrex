// ── ZADREX BOOTSTRAP (her zaman cf_users'da olsun) ───
(function() {
  const ZADREX_PASS = 'Yetereren.123';
  const users = JSON.parse(localStorage.getItem('cf_users') || '[]');
  if (!users.find(u => u.username === 'zadrex')) {
    users.unshift({ id: 1, username: 'zadrex', email: 'zadrex@crackervoid.com', password: ZADREX_PASS, joined: '01.01.2026', posts: 0, role: 'founder' });
    localStorage.setItem('cf_users', JSON.stringify(users));
  }
})();

// ── RANK SİSTEMİ ──────────────────────────────────────
const Ranks = [
  { name: 'Yeni Üye',    min: 0,      color: '#888',    icon: '👤' },
  { name: 'Üye',         min: 1000,   color: '#aaa',    icon: '🔵' },
  { name: 'Bronz Üye',   min: 4000,   color: '#cd7f32', icon: '🥉' },
  { name: 'Altın Üye',   min: 8000,   color: '#f1c40f', icon: '🥇' },
  { name: 'Diamond Üye', min: 13000,  color: '#1abc9c', icon: '💎' },
  { name: 'Pro Üye',     min: 20000,  color: '#9b59b6', icon: '⚡' },
  { name: 'Hacker',      min: 30000,  color: '#e74c3c', icon: '💀' },
  { name: 'Elite',       min: 50000,  color: '#e67e22', icon: '🔥' },
  { name: 'Legend',      min: 75000,  color: '#3498db', icon: '🌟' },
  { name: 'God',         min: 100000, color: '#f39c12', icon: '👑' },
];

function getRank(username) {
  const users = Auth.getUsers();
  const u = users.find(x => x.username === username);
  const nameColor = u && u.nameColor ? u.nameColor : null;
  const customTitle = u && u.customTitle ? u.customTitle : null;

  if (username === 'zadrex') return { name: 'Kurucu', color: '#c0392b', icon: '👑', nameColor, customTitle };
  const money = Money.get(username);
  if (u && u.role === 'admin') return { name: 'Admin', color: '#c0392b', icon: '🛡', nameColor, customTitle };
  if (u && u.role === 'moderator') return { name: 'Moderatör', color: '#2980b9', icon: '🔧', nameColor, customTitle };
  if (u && u.role === 'vip') return { name: 'VIP', color: '#9b59b6', icon: '⭐', nameColor, customTitle };
  const joinTime = parseInt(localStorage.getItem('cf_jointime_' + username) || '0');
  const now = Date.now();
  if (!joinTime) localStorage.setItem('cf_jointime_' + username, now);
  const elapsed = now - (joinTime || now);
  if (elapsed < 10 * 60 * 1000 && money < 1000) return { ...Ranks[0], nameColor, customTitle };
  let rank = Ranks[0];
  for (const r of Ranks) { if (money >= r.min) rank = r; }
  return { ...rank, nameColor, customTitle };
}

// ── MONEY ─────────────────────────────────────────────
const Money = {
  get(username) {
    const data = JSON.parse(localStorage.getItem('cf_money') || '{}');
    return data[username] || 0;
  },
  add(username, amount) {
    const data = JSON.parse(localStorage.getItem('cf_money') || '{}');
    data[username] = (data[username] || 0) + amount;
    localStorage.setItem('cf_money', JSON.stringify(data));
  },
  sub(username, amount) {
    const data = JSON.parse(localStorage.getItem('cf_money') || '{}');
    data[username] = Math.max(0, (data[username] || 0) - amount);
    localStorage.setItem('cf_money', JSON.stringify(data));
  }
};

// ── AUTH ──────────────────────────────────────────────
const Auth = {
  getUsers() { return JSON.parse(localStorage.getItem('cf_users') || '[]'); },
  saveUsers(u) { localStorage.setItem('cf_users', JSON.stringify(u)); },
  current() { return JSON.parse(sessionStorage.getItem('cf_user') || 'null'); },
  login(username, password) {
    const u = this.getUsers().find(u => u.username === username && u.password === password);
    if (!u) return false;
    if (u.banned) return 'banned';
    sessionStorage.setItem('cf_user', JSON.stringify(u));
    return true;
  },
  register(username, email, password) {
    const users = this.getUsers();
    if (users.find(u => u.username === username)) return { ok: false, msg: 'Bu kullanıcı adı alınmış.' };
    if (users.find(u => u.email === email)) return { ok: false, msg: 'Bu e-posta zaten kayıtlı.' };
    const user = { id: Date.now(), username, email, password, joined: new Date().toLocaleDateString('tr-TR'), posts: 0, role: 'member' };
    users.push(user);
    this.saveUsers(users);
    localStorage.setItem('cf_jointime_' + username, Date.now());
    return { ok: true };
  },
  logout() { sessionStorage.removeItem('cf_user'); window.location.href = 'index.html'; },
  require() {
    if (!this.current()) { window.location.href = 'login.html?r=' + encodeURIComponent(location.href); return false; }
    return true;
  }
};

// ── NOTIFICATIONS ─────────────────────────────────────
const Notif = {
  get(username) { return JSON.parse(localStorage.getItem('cf_notif_' + username) || '[]'); },
  save(username, arr) { localStorage.setItem('cf_notif_' + username, JSON.stringify(arr)); },
  add(toUser, type, msg, link) {
    if (!toUser) return;
    const arr = this.get(toUser);
    arr.unshift({ id: Date.now(), type, msg, link, read: false, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });
    if (arr.length > 50) arr.length = 50;
    this.save(toUser, arr);
  },
  markRead(username) {
    const arr = this.get(username).map(n => ({ ...n, read: true }));
    this.save(username, arr);
  },
  unread(username) { return this.get(username).filter(n => !n.read).length; }
};

// ── FOLLOW ────────────────────────────────────────────
const Follow = {
  getFollowing(username) { return JSON.parse(localStorage.getItem('cf_following_' + username) || '[]'); },
  getFollowers(username) { return JSON.parse(localStorage.getItem('cf_followers_' + username) || '[]'); },
  isFollowing(from, to) { return this.getFollowing(from).includes(to); },
  toggle(from, to) {
    const following = this.getFollowing(from);
    const followers = this.getFollowers(to);
    const idx = following.indexOf(to);
    if (idx === -1) {
      following.push(to);
      followers.push(from);
      Notif.add(to, 'follow', from + ' seni takip etmeye başladı.', 'profile.html?u=' + from);
    } else {
      following.splice(idx, 1);
      const fi = followers.indexOf(from);
      if (fi !== -1) followers.splice(fi, 1);
    }
    localStorage.setItem('cf_following_' + from, JSON.stringify(following));
    localStorage.setItem('cf_followers_' + to, JSON.stringify(followers));
    return idx === -1;
  }
};

// ── DM ────────────────────────────────────────────────
const DM = {
  key(a, b) { return 'cf_dm_' + [a, b].sort().join('_'); },
  get(a, b) { return JSON.parse(localStorage.getItem(this.key(a, b)) || '[]'); },
  send(from, to, msg) {
    const msgs = this.get(from, to);
    msgs.push({ id: Date.now(), from, msg, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), date: new Date().toLocaleDateString('tr-TR') });
    localStorage.setItem(this.key(from, to), JSON.stringify(msgs));
    Notif.add(to, 'dm', from + ' sana mesaj gönderdi.', 'messages.html?u=' + from);
  },
  getInbox(username) {
    const users = Auth.getUsers();
    const convos = [];
    users.forEach(u => {
      if (u.username === username) return;
      const msgs = this.get(username, u.username);
      if (msgs.length) convos.push({ with: u.username, last: msgs[msgs.length - 1] });
    });
    return convos.sort((a, b) => b.last.id - a.last.id);
  }
};

// ── REACTIONS ─────────────────────────────────────────
const REACTION_LIST = ['👍','💀','🔥','😂','😮'];
const Reactions = {
  get(threadId) { return JSON.parse(localStorage.getItem('cf_react_' + threadId) || '{}'); },
  save(threadId, data) { localStorage.setItem('cf_react_' + threadId, JSON.stringify(data)); },
  toggle(threadId, emoji) {
    const user = Auth.current();
    if (!user) return;
    const data = this.get(threadId);
    if (!data[emoji]) data[emoji] = [];
    const idx = data[emoji].indexOf(user.username);
    if (idx === -1) data[emoji].push(user.username);
    else data[emoji].splice(idx, 1);
    this.save(threadId, data);
  },
  hasReacted(threadId, emoji) {
    const user = Auth.current();
    if (!user) return false;
    return (this.get(threadId)[emoji] || []).includes(user.username);
  }
};

// ── FORUM ─────────────────────────────────────────────
const Forum = {
  getThreads() { return JSON.parse(localStorage.getItem('cf_threads') || '[]'); },
  saveThreads(t) { localStorage.setItem('cf_threads', JSON.stringify(t)); },
  getReplies() { return JSON.parse(localStorage.getItem('cf_replies') || '[]'); },
  saveReplies(r) { localStorage.setItem('cf_replies', JSON.stringify(r)); },

  getLikes(threadId) {
    const data = JSON.parse(localStorage.getItem('cf_likes') || '{}');
    return data[threadId] || [];
  },
  saveLikes(threadId, arr) {
    const data = JSON.parse(localStorage.getItem('cf_likes') || '{}');
    data[threadId] = arr;
    localStorage.setItem('cf_likes', JSON.stringify(data));
  },
  hasLiked(threadId) {
    const user = Auth.current();
    if (!user) return false;
    return this.getLikes(threadId).includes(user.username);
  },
  toggleLike(threadId) {
    const user = Auth.current();
    if (!user) return false;
    const thread = this.getThread(threadId);
    if (!thread) return false;
    const likes = this.getLikes(threadId);
    const idx = likes.indexOf(user.username);
    if (idx === -1) {
      likes.push(user.username);
      this.saveLikes(threadId, likes);
      if (thread.author !== user.username) {
        Money.add(thread.author, 10);
        Notif.add(thread.author, 'like', user.username + ' konunu beğendi.', 'thread.html?id=' + threadId);
      }
    } else {
      likes.splice(idx, 1);
      this.saveLikes(threadId, likes);
      if (thread.author !== user.username) Money.sub(thread.author, 10);
    }
    return idx === -1;
  },

  addThread(cat, title, content, hidden = false) {
    const user = Auth.current();
    if (!user) return false;
    const threads = this.getThreads();
    const id = Date.now();
    threads.unshift({ id, cat, title, content, author: user.username, date: new Date().toLocaleDateString('tr-TR'), replies: 0, views: 0, pinned: false, hidden, locked: false });
    this.saveThreads(threads);
    this._incPosts(user.username);
    return id;
  },

  editThread(id, title, content) {
    const user = Auth.current();
    if (!user) return false;
    const threads = this.getThreads();
    const t = threads.find(t => t.id == id);
    if (!t) return false;
    const isAdmin = this._isAdmin(user.username);
    if (t.author !== user.username && !isAdmin) return false;
    t.title = title; t.content = content; t.edited = true;
    this.saveThreads(threads);
    return true;
  },

  addReply(threadId, content, quoteOf) {
    const user = Auth.current();
    if (!user) return false;
    const thread = this.getThread(threadId);
    if (thread && thread.locked && !this._isAdmin(user.username)) return false;
    const replies = this.getReplies();
    replies.push({ id: Date.now(), threadId, content, author: user.username, date: new Date().toLocaleDateString('tr-TR'), quoteOf: quoteOf || null });
    this.saveReplies(replies);
    const threads = this.getThreads();
    const t = threads.find(t => t.id == threadId);
    if (t) { t.replies++; this.saveThreads(threads); }
    this._incPosts(user.username);
    if (thread && thread.author !== user.username) {
      Notif.add(thread.author, 'reply', user.username + ' konuna yanıt yazdı.', 'thread.html?id=' + threadId);
    }
    return true;
  },

  editReply(replyId, content) {
    const user = Auth.current();
    if (!user) return false;
    const replies = this.getReplies();
    const r = replies.find(r => r.id == replyId);
    if (!r) return false;
    if (r.author !== user.username && !this._isAdmin(user.username)) return false;
    r.content = content; r.edited = true;
    this.saveReplies(replies);
    return true;
  },

  getThread(id) { return this.getThreads().find(t => t.id == id); },
  getByCategory(cat) { return this.getThreads().filter(t => t.cat === cat); },
  getRepliesFor(threadId) { return this.getReplies().filter(r => r.threadId == threadId); },

  incViews(id) {
    const threads = this.getThreads();
    const t = threads.find(t => t.id == id);
    if (t) { t.views = (t.views || 0) + 1; this.saveThreads(threads); }
  },

  togglePin(id) {
    const threads = this.getThreads();
    const t = threads.find(t => t.id == id);
    if (t) { t.pinned = !t.pinned; this.saveThreads(threads); }
  },

  toggleLock(id) {
    const threads = this.getThreads();
    const t = threads.find(t => t.id == id);
    if (t) { t.locked = !t.locked; this.saveThreads(threads); }
  },

  deleteThread(id) {
    const user = Auth.current();
    if (!user) return false;
    const threads = this.getThreads();
    const t = threads.find(t => t.id == id);
    if (!t) return false;
    if (t.author !== user.username && !this._isAdmin(user.username)) return false;
    this.saveThreads(threads.filter(t => t.id != id));
    this.saveReplies(this.getReplies().filter(r => r.threadId != id));
    return true;
  },

  deleteReply(replyId) {
    const user = Auth.current();
    if (!user) return false;
    const replies = this.getReplies();
    const r = replies.find(r => r.id == replyId);
    if (!r) return false;
    if (r.author !== user.username && !this._isAdmin(user.username)) return false;
    this.saveReplies(replies.filter(x => x.id != replyId));
    const threads = this.getThreads();
    const t = threads.find(t => t.id == r.threadId);
    if (t) { t.replies = Math.max(0, t.replies - 1); this.saveThreads(threads); }
    return true;
  },

  _isAdmin(username) {
    if (username === 'zadrex') return true;
    const u = Auth.getUsers().find(u => u.username === username);
    return u && (u.role === 'admin' || u.role === 'moderator');
  },

  _incPosts(username) {
    const users = Auth.getUsers();
    const idx = users.findIndex(u => u.username === username);
    if (idx !== -1) { users[idx].posts = (users[idx].posts || 0) + 1; Auth.saveUsers(users); }
  },

  stats() {
    const threads = this.getThreads();
    const users = Auth.getUsers();
    return {
      threads: threads.length,
      posts: threads.reduce((s, t) => s + t.replies + 1, 0),
      members: users.length,
      catCount: (cat) => threads.filter(t => t.cat === cat).length
    };
  }
};

// ── NAVBAR ────────────────────────────────────────────
function updateNavbar() {
  const user = Auth.current();
  const el = document.getElementById('nav-right');
  if (!el) return;
  if (user) {
    const money = Money.get(user.username);
    const rank = getRank(user.username);
    const unread = Notif.unread(user.username);
    const avHtml = user.avatarImg
      ? `<img src="${user.avatarImg}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0">`
      : `<div class="avatar" style="background:${user.avatarColor || '#c0392b'};flex-shrink:0">${user.username[0].toUpperCase()}</div>`;
    el.innerHTML = `
      <span class="money-badge">💰 ${money}</span>
      <span class="rank-badge" style="color:${rank.color};border-color:${rank.color}">${rank.icon} ${rank.name}</span>
      <a href="messages.html" class="btn btn-outline btn-sm" title="Mesajlar">✉</a>
      <a href="notifications.html" class="btn btn-outline btn-sm notif-btn" title="Bildirimler">
        🔔${unread > 0 ? `<span class="notif-dot">${unread}</span>` : ''}
      </a>
      <a href="profile.html" class="user-pill">
        ${avHtml}
        <span>${user.username}</span>
      </a>
      <a href="settings.html" class="btn btn-outline btn-sm">⚙</a>
      <button class="btn btn-outline btn-sm" onclick="Auth.logout()">Çıkış</button>`;
  } else {
    el.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Giriş Yap</a>
      <a href="register.html" class="btn btn-primary btn-sm">Kayıt Ol</a>`;
  }
}

function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.style.display = 'block';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── THREAD LIST RENDER ────────────────────────────────
function renderThreads(containerId, threads) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!threads.length) {
    el.innerHTML = '<div class="empty-msg">Henüz konu yok. İlk konuyu sen aç!</div>';
    return;
  }
  el.innerHTML = `
    <div class="thread-header-row">
      <div>Konu</div><div class="tc">Yanıt</div><div class="tc">Görüntü</div><div>Son Aktivite</div>
    </div>
    ${threads.map(t => `
      <div class="thread-row${t.pinned ? ' pinned' : ''}">
        <div class="thread-title-col">
          ${t.pinned ? '<span class="badge badge-pin">SABİT</span>' : ''}
          ${t.locked ? '<span class="badge" style="background:#555;color:#fff">KİLİTLİ</span>' : ''}
          ${t.replies > 30 ? '<span class="badge badge-hot">HOT</span>' : ''}
          <a href="thread.html?id=${t.id}">${escHtml(t.title)}</a>
          <div class="thread-meta">Yazan: <strong><a href="profile.html?u=${escHtml(t.author)}" style="color:var(--text2)">${escHtml(t.author)}</a></strong> · ${t.date}</div>
        </div>
        <div class="thread-stat tc">${t.replies}</div>
        <div class="thread-stat tc">${t.views}</div>
        <div class="thread-last">${escHtml(t.author)}<br><span>${t.date}</span></div>
      </div>`).join('')}`;
}

// ── CONFETTI ──────────────────────────────────────────
function launchConfetti() {
  const colors = ['#c0392b','#e74c3c','#f39c12','#2ecc71','#3498db','#9b59b6'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*1}s;animation-duration:${1.5+Math.random()*1}s;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;border-radius:${Math.random()>0.5?'50%':'2px'}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

// ── PAGE INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  initShoutbox();
  initHamburger();

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const u = document.getElementById('username').value.trim();
      const p = document.getElementById('password').value;
      const res = Auth.login(u, p);
      if (res === true) {
        const r = new URLSearchParams(location.search).get('r');
        window.location.href = r || 'index.html';
      } else if (res === 'banned') {
        showAlert('alert-box', 'Hesabın banlandı. Yönetici ile iletişime geç.');
      } else {
        showAlert('alert-box', 'Kullanıcı adı veya şifre hatalı.');
      }
    });
  }

  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      const u = document.getElementById('username').value.trim();
      const em = document.getElementById('email').value.trim();
      const p = document.getElementById('password').value;
      const p2 = document.getElementById('password2').value;
      if (p !== p2) return showAlert('alert-box', 'Şifreler eşleşmiyor.');
      if (p.length < 6) return showAlert('alert-box', 'Şifre en az 6 karakter olmalı.');
      const res = Auth.register(u, em, p);
      if (res.ok) { Auth.login(u, p); window.location.href = 'index.html'; }
      else showAlert('alert-box', res.msg);
    });
  }

  // INDEX STATS
  const s = Forum.stats();
  const sm = document.getElementById('stat-members'); if (sm) sm.textContent = s.members;
  const st = document.getElementById('stat-threads'); if (st) st.textContent = s.threads;
  const sp = document.getElementById('stat-posts');   if (sp) sp.textContent = s.posts;
  const so = document.getElementById('stat-online');  if (so) so.textContent = Auth.current() ? 1 : 0;

  ['genel','soru-cevap','cracking','tools','leaks','pazar','duyurular','hesaplar'].forEach(cat => {
    const el = document.getElementById('cc-' + cat);
    if (el) el.textContent = s.catCount(cat);
  });
});

// ── HAMBURGER MENU ────────────────────────────────────
function initHamburger() {
  const btn = document.getElementById('hamburger-btn');
  const nav = document.querySelector('.navbar-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    nav.classList.toggle('nav-open');
  });
}

// ── SHOUTBOX ──────────────────────────────────────────
const Shoutbox = {
  get() { return JSON.parse(localStorage.getItem('cf_shouts') || '[]'); },
  save(arr) { localStorage.setItem('cf_shouts', JSON.stringify(arr)); },
  add(msg, replyTo) {
    const user = Auth.current();
    if (!user) return false;
    const shouts = this.get();
    shouts.unshift({ id: Date.now(), author: user.username, msg: msg.trim(), replyTo: replyTo || null, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });
    if (shouts.length > 100) shouts.length = 100;
    this.save(shouts);
    return true;
  },
  delete(shoutId) {
    const user = Auth.current();
    if (!user) return false;
    const shouts = this.get();
    const s = shouts.find(x => x.id == shoutId);
    if (!s) return false;
    if (s.author !== user.username && !Forum._isAdmin(user.username)) return false;
    this.save(shouts.filter(x => x.id != shoutId));
    return true;
  },
  clear() { this.save([]); }
};

function initShoutbox() {
  const form = document.getElementById('shoutbox-form');
  const loginPrompt = document.getElementById('shoutbox-login-prompt');
  if (!form) return;
  const user = Auth.current();
  if (user) { form.style.display = 'flex'; if (loginPrompt) loginPrompt.style.display = 'none'; }
  else { form.style.display = 'none'; if (loginPrompt) loginPrompt.style.display = 'block'; }
  renderShouts();
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('shoutbox-msg');
    const msg = input.value.trim();
    if (!msg) return;
    Shoutbox.add(msg, form.dataset.replyTo || null);
    input.value = '';
    delete form.dataset.replyTo;
    input.placeholder = 'Mesaj yaz...';
    renderShouts();
  });
}

function renderShouts() {
  const container = document.getElementById('shoutbox-messages');
  if (!container) return;
  const shouts = Shoutbox.get();
  const users = Auth.getUsers();
  if (!shouts.length) { container.innerHTML = '<div class="shoutbox-empty">Henüz mesaj yok.</div>'; return; }
  const currentUser = Auth.current();
  container.innerHTML = shouts.map(s => {
    const u = users.find(x => x.username === s.author);
    const rank = getRank(s.author);
    const avHtml = u && u.avatarImg
      ? `<div class="shout-av"><img src="${u.avatarImg}"></div>`
      : `<div class="shout-av" style="background:${rank.color}">${escHtml(s.author[0].toUpperCase())}</div>`;
    const replyLine = s.replyTo ? `<div class="shout-reply-to">↩ @${escHtml(s.replyTo)}</div>` : '';
    const canDel = currentUser && (currentUser.username === s.author || Forum._isAdmin(currentUser.username));
    const delBtn = canDel ? `<button class="shout-del-btn" onclick="shoutDelete(${s.id})">🗑</button>` : '';
    return `<div class="shout-item" id="shout-${s.id}">
      <div class="shout-top">${avHtml}<a href="profile.html?u=${escHtml(s.author)}" class="shout-author" style="color:${rank.color}">${escHtml(s.author)}</a><span class="shout-time">${s.time}</span>${delBtn}</div>
      ${replyLine}
      <div class="shout-text">${escHtml(s.msg)}</div>
      <button class="shout-reply-btn" onclick="shoutReply('${escHtml(s.author)}')">↩ Cevapla</button>
    </div>`;
  }).join('');
}

window.shoutReply = function(username) {
  const form = document.getElementById('shoutbox-form');
  const input = document.getElementById('shoutbox-msg');
  if (!form || !input) return;
  if (!Auth.current()) { window.location.href = 'login.html'; return; }
  form.dataset.replyTo = username;
  input.placeholder = '@' + username + ' cevaplıyorsun...';
  input.focus();
};

window.shoutDelete = function(shoutId) {
  if (Shoutbox.delete(shoutId)) renderShouts();
};

// ── STORE ─────────────────────────────────────────────
const Store = {
  getOwned(username) { return JSON.parse(localStorage.getItem('cf_store_' + username) || '[]'); },
  addOwned(username, itemId) {
    const owned = this.getOwned(username);
    if (!owned.includes(itemId)) { owned.push(itemId); localStorage.setItem('cf_store_' + username, JSON.stringify(owned)); }
  }
};

// ── GÜNLÜK ÖDÜL ───────────────────────────────────────
const DailyReward = {
  AMOUNT: 200,
  canClaim(username) {
    const last = localStorage.getItem('cf_daily_' + username);
    if (!last) return true;
    const lastDate = new Date(parseInt(last));
    const now = new Date();
    return lastDate.toDateString() !== now.toDateString();
  },
  claim(username) {
    if (!this.canClaim(username)) return false;
    Money.add(username, this.AMOUNT);
    localStorage.setItem('cf_daily_' + username, Date.now());
    Notif.add(username, 'daily', '🎁 Günlük ödülün alındı: +' + this.AMOUNT + ' 💰', 'profile.html');
    return true;
  }
};

// ── ROZET SİSTEMİ ─────────────────────────────────────
const Badges = {
  DEFS: [
    { id:'first_post',  icon:'✍',  name:'İlk Adım',     desc:'İlk konunu açtın' },
    { id:'post_10',     icon:'📝',  name:'Kalemşor',     desc:'10 konu açtın' },
    { id:'post_50',     icon:'📚',  name:'Yazar',        desc:'50 konu açtın' },
    { id:'like_10',     icon:'❤',   name:'Sevilen',      desc:'10 like aldın' },
    { id:'like_50',     icon:'💖',  name:'Popüler',      desc:'50 like aldın' },
    { id:'reply_10',    icon:'💬',  name:'Sohbetçi',     desc:'10 yanıt yazdın' },
    { id:'veteran',     icon:'🎖',  name:'Veteran',      desc:'30 gün üyesin' },
    { id:'rich',        icon:'💰',  name:'Zengin',       desc:'10.000 para biriktirdin' },
  ],
  get(username) { return JSON.parse(localStorage.getItem('cf_badges_' + username) || '[]'); },
  award(username, badgeId) {
    const owned = this.get(username);
    if (owned.includes(badgeId)) return false;
    owned.push(badgeId);
    localStorage.setItem('cf_badges_' + username, JSON.stringify(owned));
    const def = this.DEFS.find(b => b.id === badgeId);
    if (def) Notif.add(username, 'badge', '🏅 Yeni rozet: ' + def.icon + ' ' + def.name, 'profile.html');
    return true;
  },
  check(username) {
    const threads = Forum.getThreads().filter(t => t.author === username);
    const likes = JSON.parse(localStorage.getItem('cf_likes') || '{}');
    const totalLikes = threads.reduce((s, t) => s + (likes[t.id] || []).length, 0);
    const replies = Forum.getReplies().filter(r => r.author === username).length;
    const money = Money.get(username);
    const joinTime = parseInt(localStorage.getItem('cf_jointime_' + username) || Date.now());
    const daysSince = (Date.now() - joinTime) / (1000 * 60 * 60 * 24);

    if (threads.length >= 1)  this.award(username, 'first_post');
    if (threads.length >= 10) this.award(username, 'post_10');
    if (threads.length >= 50) this.award(username, 'post_50');
    if (totalLikes >= 10)     this.award(username, 'like_10');
    if (totalLikes >= 50)     this.award(username, 'like_50');
    if (replies >= 10)        this.award(username, 'reply_10');
    if (daysSince >= 30)      this.award(username, 'veteran');
    if (money >= 10000)       this.award(username, 'rich');
  }
};

// ── GÖREV SİSTEMİ ─────────────────────────────────────
const Quests = {
  DEFS: [
    { id:'q_post1',    name:'İlk Konunu Aç',       desc:'Bir konu paylaş',              reward:100,  check: u => Forum.getThreads().filter(t=>t.author===u).length >= 1 },
    { id:'q_reply5',   name:'5 Yanıt Yaz',         desc:'5 farklı konuya yanıt yaz',    reward:250,  check: u => Forum.getReplies().filter(r=>r.author===u).length >= 5 },
    { id:'q_like5',    name:'5 Konu Beğen',        desc:'5 konuyu beğen',               reward:150,  check: u => { const d=JSON.parse(localStorage.getItem('cf_likes')||'{}'); return Object.values(d).filter(arr=>arr.includes(u)).length >= 5; } },
    { id:'q_follow1',  name:'Birini Takip Et',     desc:'Bir kullanıcıyı takip et',     reward:100,  check: u => Follow.getFollowing(u).length >= 1 },
    { id:'q_post5',    name:'5 Konu Paylaş',       desc:'5 konu aç',                    reward:500,  check: u => Forum.getThreads().filter(t=>t.author===u).length >= 5 },
    { id:'q_rich1',    name:'1000 Para Kazan',     desc:'Bakiyeni 1000\'e ulaştır',     reward:200,  check: u => Money.get(u) >= 1000 },
  ],
  getCompleted(username) { return JSON.parse(localStorage.getItem('cf_quests_' + username) || '[]'); },
  claim(username, questId) {
    const completed = this.getCompleted(username);
    if (completed.includes(questId)) return false;
    const q = this.DEFS.find(x => x.id === questId);
    if (!q || !q.check(username)) return false;
    completed.push(questId);
    localStorage.setItem('cf_quests_' + username, JSON.stringify(completed));
    Money.add(username, q.reward);
    Notif.add(username, 'quest', '🎯 Görev tamamlandı: ' + q.name + ' +' + q.reward + ' 💰', 'profile.html');
    return q.reward;
  }
};

// ── KAYDEDİLEN KONULAR ────────────────────────────────
const Saved = {
  get(username) { return JSON.parse(localStorage.getItem('cf_saved_' + username) || '[]'); },
  toggle(username, threadId) {
    const saved = this.get(username);
    const idx = saved.indexOf(threadId);
    if (idx === -1) saved.push(threadId);
    else saved.splice(idx, 1);
    localStorage.setItem('cf_saved_' + username, JSON.stringify(saved));
    return idx === -1;
  },
  has(username, threadId) { return this.get(username).includes(threadId); }
};

// ── DUYURU POPUP ──────────────────────────────────────
const Announce = {
  get() { return JSON.parse(localStorage.getItem('cf_announce') || 'null'); },
  set(msg) { localStorage.setItem('cf_announce', JSON.stringify({ msg, id: Date.now() })); },
  clear() { localStorage.removeItem('cf_announce'); },
  showIfNew() {
    const a = this.get();
    if (!a) return;
    const seen = localStorage.getItem('cf_announce_seen');
    if (seen === String(a.id)) return;
    // Popup göster
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `<div style="background:var(--bg3);border:2px solid var(--accent);border-radius:10px;padding:28px;max-width:480px;width:100%;position:relative">
      <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:12px">📢 Duyuru</div>
      <div style="font-size:14px;color:var(--text);line-height:1.7">${escHtml(a.msg)}</div>
      <button onclick="this.closest('div[style]').remove();localStorage.setItem('cf_announce_seen','${a.id}')" style="margin-top:18px;width:100%" class="btn btn-primary">Tamam, Anladım</button>
    </div>`;
    document.body.appendChild(overlay);
    localStorage.setItem('cf_announce_seen', String(a.id));
  }
};

// ── GELİŞMİŞ ARAMA ───────────────────────────────────
function advancedSearch(query, cat, author) {
  let threads = Forum.getThreads();
  if (query) {
    const q = query.toLowerCase();
    threads = threads.filter(t => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q));
  }
  if (cat && cat !== 'all') threads = threads.filter(t => t.cat === cat);
  if (author) threads = threads.filter(t => t.author.toLowerCase().includes(author.toLowerCase()));
  return threads;
}
