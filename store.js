// Lớp dữ liệu cho tài khoản + tin nhắn: Firebase nếu có cấu hình, nếu không thì localStorage (demo).
(function () {
  const cfg = window.APP_CONFIG || {};
  const wantFb = !!(cfg.firebase && cfg.firebase.apiKey);
  let useFb = false, fdb, fauth;
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  // Chỉ tải Firebase khi đã điền cấu hình => trang nhẹ hơn ở chế độ demo
  const ready = (async () => {
    if (!wantFb) return;
    try {
      const b = 'https://www.gstatic.com/firebasejs/10.12.2/';
      await load(b + 'firebase-app-compat.js');
      await Promise.all([load(b + 'firebase-auth-compat.js'), load(b + 'firebase-firestore-compat.js')]);
      firebase.initializeApp(cfg.firebase); fdb = firebase.firestore(); fauth = firebase.auth(); useFb = true;
    } catch (e) { console.warn('Không tải được Firebase, dùng chế độ demo.', e); }
  })();

  function seed() {
    const d = {
      projects: [{ id: 'p1', name: 'Pipe Traffic Core', desc: 'Hệ thống giao thông đường ống từ trường: lõi điều phối và mô phỏng.', status: 'Đang làm', progress: 40, owner: 'Admin', ts: 1 }],
      updates: [{ id: 'u1', projectId: 'p1', week: 'Tuần 1', title: 'Khởi động dự án', content: 'Chốt phạm vi, dựng khung repo và quy trình làm việc.', ts: 2 }],
      users: [], messages: []
    };
    localStorage.setItem('pt_db', JSON.stringify(d));
    return d;
  }
  const db = () => { try { return JSON.parse(localStorage.getItem('pt_db')) || seed(); } catch (e) { return seed(); } };
  const save = d => localStorage.setItem('pt_db', JSON.stringify(d));

  window.Store = {
    get mode() { return useFb ? 'firebase' : 'demo'; },
    sha,
    // Link -> {kind:'iframe'|'video'|'link', src, url, label, tall}; null nếu không phải https://
    embed(u) {
      u = String(u || '').trim(); let m;
      if (!/^https:\/\/[^\s]+$/i.test(u)) return null;
      const R = (kind, src, label, tall) => ({ kind, src, url: u, label, tall: !!tall });
      if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/))) return R('iframe', 'https://www.youtube.com/embed/' + m[1], 'YouTube');
      if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return R('iframe', 'https://player.vimeo.com/video/' + m[1], 'Vimeo');
      if ((m = u.match(/docs\.google\.com\/presentation\/d\/e\/([\w-]+)/))) return R('iframe', 'https://docs.google.com/presentation/d/e/' + m[1] + '/embed', 'Google Slides');
      if ((m = u.match(/docs\.google\.com\/presentation\/d\/([\w-]+)/))) return R('iframe', 'https://docs.google.com/presentation/d/' + m[1] + '/embed?start=false&loop=false&delayms=3000', 'Google Slides');
      if ((m = u.match(/docs\.google\.com\/document\/d\/e\/([\w-]+)/))) return R('iframe', 'https://docs.google.com/document/d/e/' + m[1] + '/pub?embedded=true', 'Google Docs', 1);
      if ((m = u.match(/docs\.google\.com\/document\/d\/([\w-]+)/))) return R('iframe', 'https://docs.google.com/document/d/' + m[1] + '/preview', 'Google Docs', 1);
      if ((m = u.match(/docs\.google\.com\/spreadsheets\/d\/e\/([\w-]+)/))) return R('iframe', 'https://docs.google.com/spreadsheets/d/e/' + m[1] + '/pubhtml?widget=true&headers=false', 'Google Sheets', 1);
      if ((m = u.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/))) return R('iframe', 'https://docs.google.com/spreadsheets/d/' + m[1] + '/preview', 'Google Sheets', 1);
      if ((m = u.match(/docs\.google\.com\/forms\/d\/e\/([\w-]+)/))) return R('iframe', 'https://docs.google.com/forms/d/e/' + m[1] + '/viewform?embedded=true', 'Google Forms', 1);
      if ((m = u.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/))) return R('iframe', 'https://drive.google.com/embeddedfolderview?id=' + m[1] + '#list', 'Thư mục Drive', 1);
      if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/)) || (m = u.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/))) return R('iframe', 'https://drive.google.com/file/d/' + m[1] + '/preview', 'Google Drive', 1);
      if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return R('video', u, 'Video');
      if (/\.pdf(\?.*)?$/i.test(u)) return R('iframe', 'https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(u), 'PDF', 1);
      if (/\.(pptx?|docx?|xlsx?)(\?.*)?$/i.test(u)) return R('iframe', 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(u), 'Office', 1);
      let h = 'Liên kết'; try { h = new URL(u).hostname.replace(/^www\./, ''); } catch (e) {}
      return R('link', u, h);
    },
    async list(col) {
      await ready;
      const a = useFb ? (await fdb.collection(col).get()).docs.map(x => x.data()) : (db()[col] || []);
      return a.sort((x, y) => x.ts - y.ts);
    },
    async put(col, o) {
      await ready;
      if (!o.id) o.id = uid();
      if (!o.ts) o.ts = Date.now();
      if (useFb) await fdb.collection(col).doc(o.id).set(o);
      else { const d = db(); const i = d[col].findIndex(x => x.id === o.id); i < 0 ? d[col].push(o) : d[col][i] = o; save(d); }
      return o;
    },
    async del(col, id) {
      await ready;
      if (useFb) await fdb.collection(col).doc(id).delete();
      else { const d = db(); d[col] = d[col].filter(x => x.id !== id); save(d); }
    },
    // Người dùng: bắt buộc Google trước, sau đó tên / giới tính / mật khẩu
    async google() {
      await ready;
      if (useFb) {
        const r = await fauth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        return r.user.email.toLowerCase();
      }
      const e = (prompt('CHẾ ĐỘ THỬ: nhập email Google của bạn') || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('Email không hợp lệ');
      return e;
    },
    async findUser(email) { return (await this.list('users')).find(u => u.email === email); },
    async register(email, name, gender, pw) { return this.put('users', { email, name, gender, hash: await sha(pw) }); },
    async checkPw(user, pw) { return user.hash === await sha(pw); },
    me() { try { return JSON.parse(localStorage.getItem('pt_user')); } catch (e) { return null; } },
    setMe(u) {
      u ? localStorage.setItem('pt_user', JSON.stringify({ id: u.id, name: u.name, gender: u.gender, email: u.email })) : localStorage.removeItem('pt_user');
      if (!u && useFb) fauth.signOut();
    },
    // Admin (trang riêng)
    async adminLogin(u, p) {
      if (u === cfg.adminUser && await sha(p) === cfg.adminHash) { sessionStorage.setItem('pt_admin', '1'); return true; }
      return false;
    },
    isAdmin() { return sessionStorage.getItem('pt_admin') === '1'; },
    adminLogout() { sessionStorage.removeItem('pt_admin'); }
  };
})();
