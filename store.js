// Lớp dữ liệu: Firebase (Auth + Firestore) nếu có cấu hình, nếu không thì localStorage (chế độ thử).
(function () {
  const cfg = window.APP_CONFIG || {};
  const wantFb = !!(cfg.firebase && cfg.firebase.apiKey);
  let useFb = false, fdb, fauth;
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  // Chỉ tải Firebase khi đã điền cấu hình => trang nhẹ hơn ở chế độ thử
  const ready = (async () => {
    if (!wantFb) return;
    try {
      const b = 'https://www.gstatic.com/firebasejs/10.12.2/';
      await load(b + 'firebase-app-compat.js');
      await Promise.all([load(b + 'firebase-auth-compat.js'), load(b + 'firebase-firestore-compat.js')]);
      firebase.initializeApp(cfg.firebase); fdb = firebase.firestore(); fauth = firebase.auth(); useFb = true;
    } catch (e) { console.warn('Không tải được Firebase, dùng chế độ thử.', e); }
  })();
  const authUser = () => new Promise(res => { const un = fauth.onAuthStateChanged(u => { un(); res(u); }); });
  const hasPw = u => !!u && u.providerData.some(p => p.providerId === 'password');
  const lc = s => String(s || '').toLowerCase();
  const fbErr = e => {
    const c = e.code || '';
    if (c === 'auth/operation-not-allowed') return new Error('Chưa bật đăng nhập Email/Password trong Firebase Authentication (xem README, bước 2).');
    if (c === 'auth/weak-password') return new Error('Mật khẩu cần ít nhất 6 ký tự.');
    if (c === 'permission-denied' || c === 'firestore/permission-denied') return new Error('Rules Firestore từ chối thao tác này (xem README, bước 5).');
    return e;
  };
  const BAD_PW = /wrong-password|invalid-credential|invalid-login/;

  function seed() {
    const d = {
      projects: [{ id: 'p1', name: 'Pipe Traffic Core', desc: 'Hệ thống giao thông đường ống từ trường: lõi điều phối và mô phỏng.', status: 'Đang làm', progress: 40, owner: 'Admin', ts: 1 }],
      updates: [{ id: 'u1', projectId: 'p1', week: 'Tuần 1', title: 'Khởi động dự án', content: 'Chốt phạm vi, dựng khung repo và quy trình làm việc.', ts: 2 }],
      users: [], messages: [], comments: []
    };
    localStorage.setItem('pt_db', JSON.stringify(d));
    return d;
  }
  const db = () => { let d; try { d = JSON.parse(localStorage.getItem('pt_db')); } catch (e) {} d = d || seed(); d.comments = d.comments || []; return d; };
  const save = d => localStorage.setItem('pt_db', JSON.stringify(d));

  window.Store = {
    get mode() { return useFb ? 'firebase' : 'demo'; },
    sha,
    // Gọi một lần khi mở web: nếu phiên Google đã hết/đổi người thì xoá phiên đăng nhập cũ
    async init() {
      await ready;
      const m = this.me();
      if (useFb && m) { const u = await authUser(); if (!u || u.uid !== m.id) this.setMe(null, true); }
    },
    // ----- Dữ liệu chung (opt.where = [trường, '==', giá trị])
    async list(col, opt = {}) {
      await ready;
      let a;
      try {
        if (useFb) {
          let q = fdb.collection(col); if (opt.where) q = q.where(...opt.where);
          a = (await q.get()).docs.map(x => ({ ...x.data(), id: x.id }));
        } else {
          a = db()[col] || [];
          if (opt.where) { const [f, , v] = opt.where; a = a.filter(x => x[f] === v); }
        }
      } catch (e) { throw fbErr(e); }
      return a.sort((x, y) => x.ts - y.ts);
    },
    async get(col, id) {
      await ready;
      try {
        if (useFb) { const s = await fdb.collection(col).doc(id).get(); return s.exists ? { ...s.data(), id: s.id } : null; }
      } catch (e) { throw fbErr(e); }
      return (db()[col] || []).find(x => x.id === id) || null;
    },
    async put(col, o) {
      await ready;
      o = { ...o }; if (!o.ts) o.ts = Date.now();
      const id = o.id || uid(); o.id = id;
      try {
        if (useFb) { const data = { ...o }; if (col === 'comments') delete data.id; await fdb.collection(col).doc(id).set(data); }
        else { const d = db(); d[col] = d[col] || []; const i = d[col].findIndex(x => x.id === id); i < 0 ? d[col].push(o) : d[col][i] = o; save(d); }
      } catch (e) { throw fbErr(e); }
      return o;
    },
    async del(col, id) {
      await ready;
      try {
        if (useFb) await fdb.collection(col).doc(id).delete();
        else { const d = db(); d[col] = (d[col] || []).filter(x => x.id !== id); save(d); }
      } catch (e) { throw fbErr(e); }
    },
    // ----- Người dùng: bắt buộc Google trước, sau đó tên / giới tính / mật khẩu
    async google() {
      await ready;
      if (useFb) {
        const u = (await fauth.signInWithPopup(new firebase.auth.GoogleAuthProvider())).user;
        return { uid: u.uid, email: lc(u.email), hasPassword: hasPw(u) };
      }
      const e = lc((prompt('CHẾ ĐỘ THỬ: nhập email Google của bạn') || '').trim());
      if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('Email không hợp lệ');
      return { uid: 'demo_' + (await sha(e)).slice(0, 16), email: e, hasPassword: true };
    },
    profile(uid) { return this.get('users', uid); },
    async linkPw(pw) {
      const u = fauth.currentUser;
      try { await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, pw)); } catch (e) { throw fbErr(e); }
    },
    async register(g, name, gender, pw) {
      await ready;
      const o = { id: g.uid, name, gender, email: g.email, ts: Date.now() };
      if (useFb) { if (!g.hasPassword) await this.linkPw(pw); } else o.hash = await sha(pw);
      return this.put('users', o);
    },
    // Kiểm tra mật khẩu: Firebase tự xác thực (reauthenticate), không lưu hash ở Firestore
    async checkPw(g, pw, p) {
      await ready;
      if (!useFb) return p.hash === await sha(pw);
      if (!g.hasPassword) { await this.linkPw(pw); return true; }
      const u = fauth.currentUser;
      try { await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, pw)); return true; }
      catch (e) { if (BAD_PW.test(e.code || '')) return false; throw fbErr(e); }
    },
    async resetPw(email) {
      await ready;
      if (!useFb) throw new Error('Chế độ thử không gửi được email.');
      await fauth.sendPasswordResetEmail(email);
    },
    me() { try { return JSON.parse(localStorage.getItem('pt_user')); } catch (e) { return null; } },
    setMe(u, keepAuth) {
      u ? localStorage.setItem('pt_user', JSON.stringify({ id: u.id, name: u.name, gender: u.gender, email: u.email })) : localStorage.removeItem('pt_user');
      if (!u && !keepAuth && useFb) fauth.signOut();
    },
    // ----- Admin (trang admin.html riêng). Firebase: đăng nhập bằng tài khoản Email/Password do bạn tạo.
    async adminLogin(user, pw) {
      await ready;
      if (user !== cfg.adminUser) return false;
      if (useFb) {
        if (!cfg.adminEmail) throw new Error('Chưa điền adminEmail trong config.js (xem README, bước 4).');
        try {
          const r = await fauth.signInWithEmailAndPassword(cfg.adminEmail, pw);
          if (lc(r.user.email) !== lc(cfg.adminEmail)) return false;
          sessionStorage.setItem('pt_admin', '1'); return true;
        } catch (e) { if (BAD_PW.test(e.code || '') || /user-not-found|invalid-email/.test(e.code || '')) return false; throw fbErr(e); }
      }
      if (await sha(pw) === cfg.adminHash) { sessionStorage.setItem('pt_admin', '1'); return true; }
      return false;
    },
    async isAdmin() {
      await ready;
      if (useFb) { const u = await authUser(); return !!u && !!cfg.adminEmail && lc(u.email) === lc(cfg.adminEmail) && hasPw(u); }
      return sessionStorage.getItem('pt_admin') === '1';
    },
    async adminLogout() {
      await ready; sessionStorage.removeItem('pt_admin');
      if (useFb) await fauth.signOut();
    }
  };
})();
