// Lớp dữ liệu: Firebase nếu có cấu hình, nếu không thì localStorage (demo).
(function () {
  const cfg = window.APP_CONFIG || {};
  const useFb = !!(cfg.firebase && cfg.firebase.apiKey && window.firebase);
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  let fdb, fauth;
  if (useFb) { firebase.initializeApp(cfg.firebase); fdb = firebase.firestore(); fauth = firebase.auth(); }

  function seed() {
    const d = {
      projects: [{ id: 'p1', name: 'Pipe Traffic Core', desc: 'Lõi điều phối lưu lượng giữa các đường ống dữ liệu.', status: 'Đang làm', progress: 40, owner: 'Admin', ts: 1 }],
      updates: [{ id: 'u1', projectId: 'p1', week: 'Tuần 1', title: 'Khởi động dự án', content: 'Chốt phạm vi, dựng khung repo và quy trình làm việc.', ts: 2 }],
      users: [], messages: []
    };
    localStorage.setItem('pt_db', JSON.stringify(d));
    return d;
  }
  const db = () => { try { return JSON.parse(localStorage.getItem('pt_db')) || seed(); } catch (e) { return seed(); } };
  const save = d => localStorage.setItem('pt_db', JSON.stringify(d));

  const Store = {
    mode: useFb ? 'firebase' : 'demo',
    sha,
    async list(col) {
      let a;
      if (useFb) a = (await fdb.collection(col).get()).docs.map(x => x.data());
      else a = db()[col] || [];
      return a.sort((x, y) => x.ts - y.ts);
    },
    async put(col, o) {
      if (!o.id) o.id = uid();
      if (!o.ts) o.ts = Date.now();
      if (useFb) await fdb.collection(col).doc(o.id).set(o);
      else { const d = db(); const i = d[col].findIndex(x => x.id === o.id); i < 0 ? d[col].push(o) : d[col][i] = o; save(d); }
      return o;
    },
    async del(col, id) {
      if (useFb) await fdb.collection(col).doc(id).delete();
      else { const d = db(); d[col] = d[col].filter(x => x.id !== id); save(d); }
    },
    // --- Người dùng: bắt buộc Google trước, sau đó tên/giới tính/mật khẩu
    async google() {
      if (useFb) {
        const r = await fauth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        return r.user.email.toLowerCase();
      }
      const e = (prompt('CHẾ ĐỘ DEMO: nhập email Google của bạn') || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('Email không hợp lệ');
      return e;
    },
    async findUser(email) { return (await this.list('users')).find(u => u.email === email); },
    async register(email, name, gender, pw) {
      return this.put('users', { email, name, gender, hash: await sha(pw) });
    },
    async checkPw(user, pw) { return user.hash === await sha(pw); },
    me() { try { return JSON.parse(localStorage.getItem('pt_user')); } catch (e) { return null; } },
    setMe(u) { u ? localStorage.setItem('pt_user', JSON.stringify({ id: u.id, name: u.name, gender: u.gender, email: u.email })) : localStorage.removeItem('pt_user'); if (!u && useFb) fauth.signOut(); },
    // --- Admin (trang riêng)
    async adminLogin(u, p) {
      if (u === cfg.adminUser && await sha(p) === cfg.adminHash) { sessionStorage.setItem('pt_admin', '1'); return true; }
      return false;
    },
    isAdmin() { return sessionStorage.getItem('pt_admin') === '1'; },
    adminLogout() { sessionStorage.removeItem('pt_admin'); }
  };
  window.Store = Store;
})();
