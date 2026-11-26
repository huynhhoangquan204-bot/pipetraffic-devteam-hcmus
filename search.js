/* ===== Tìm kiếm toàn trang =====
   - Nút kính lúp trên menu (hoặc phím "/" , Ctrl+K) mở thanh tìm kiếm. Nhấn Enter -> trang kết quả #/search/<từ khoá>.
   - Chỉ mục gồm: mọi trang trong index.html (kể cả phần admin đã sửa: Journey, Team, Review, FAQ, Video),
     các dự án + cập nhật theo tuần, và bình luận đã duyệt. KHÔNG tìm trong tin nhắn / hồ sơ người dùng.
   - Gõ không dấu vẫn tìm được ("hanh trinh" -> "Hành trình"). Nhiều từ = trang chứa đủ các từ.
   - Bấm một kết quả: mở đúng trang, tự cuộn tới đoạn đó và tô sáng từ khoá.
   File này tự chèn CSS của nó (không cần sửa style.css). */
(function () {
  'use strict';

  /* ---------- Tiện ích ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  function foldMap(s) {                       // bản bỏ dấu + bảng ánh xạ vị trí về chuỗi gốc
    let out = '', map = [];
    for (let i = 0; i < s.length; i++) { const f = fold(s[i]); for (let k = 0; k < f.length; k++) { out += f[k]; map.push(i); } }
    return { out, map };
  }
  const termsOf = q => [...new Set(fold(q).split(/\s+/).filter(Boolean))].slice(0, 8);
  const maskEmail = s => String(s ?? '').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '•••');
  const $id = id => document.getElementById(id);
  const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();

  function ranges(text, terms) {              // các đoạn [a,b) trong text gốc khớp từ khoá (không phân biệt dấu/hoa thường)
    const { out, map } = foldMap(text), r = [];
    terms.forEach(t => { let i = out.indexOf(t); while (i !== -1) { r.push([map[i], map[i + t.length - 1] + 1]); i = out.indexOf(t, i + t.length); } });
    r.sort((a, b) => a[0] - b[0]);
    const m = [];
    r.forEach(x => { const l = m[m.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else m.push(x.slice()); });
    return m;
  }
  function markHtml(text, terms) {
    let h = '', p = 0;
    ranges(text, terms).forEach(([a, b]) => { h += esc(text.slice(p, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>'; p = b; });
    return h + esc(text.slice(p));
  }

  /* ---------- Danh sách trang ---------- */
  const PAGES = [
    { key: 'home',     label: 'Trang chủ',            href: '#/',         icon: 'fa-house',           tpls: ['tpl-hero', 'tpl-cta'] },
    { key: 'projects', label: 'Dự án',                href: '#/',         icon: 'fa-folder-open' },
    { key: 'specs',    label: 'Kỹ thuật & hạ tầng',   href: '#/specs',    icon: 'fa-gears',           tpls: ['tpl-specs'] },
    { key: 'journey',  label: 'Hành trình',           href: '#/journey',  icon: 'fa-timeline',        tpls: ['tpl-journey'] },
    { key: 'team',     label: 'Thành viên & quy tắc', href: '#/team',     icon: 'fa-users',           tpls: ['tpl-team'] },
    { key: 'problems', label: 'Bài toán & giải pháp', href: '#/problems', icon: 'fa-microchip',       tpls: ['tpl-problems'] },
    { key: 'video',    label: 'Video demo',           href: '#/video',    icon: 'fa-circle-play',     tpls: ['tpl-video'] },
    { key: 'faq',      label: 'Đánh giá & FAQ',       href: '#/faq',      icon: 'fa-circle-question', tpls: ['tpl-faq'] },
    { key: 'comments', label: 'Bình luận',            href: '#/video', icon: 'fa-message',         tpls: ['tpl-comments'] }
  ];
  const BY_KEY = Object.fromEntries(PAGES.map(p => [p.key, p]));

  /* ---------- Tách một vùng HTML thành các đoạn chữ ---------- */
  const SKIP = new Set(['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'TEMPLATE', 'BUTTON', 'SELECT', 'OPTION', 'INPUT', 'TEXTAREA', 'IMG']);
  const INLINE = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'SPAN', 'BR', 'SMALL', 'CODE', 'MARK', 'U', 'SUB', 'SUP', 'ABBR', 'LABEL', 'TIME']);
  const HEAD = /^H[1-4]$/;
  function member(btn) {                      // nút "Chi tiết" của thành viên: tên / vai trò / mô tả nằm trong thuộc tính
    if (btn.dataset && btn.dataset.name) return [btn.dataset.name, btn.dataset.role || '', btn.dataset.desc || ''];
    const m = /openMemberModal\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/.exec(btn.getAttribute('onclick') || '');
    return m ? m.slice(1, 4).map(x => x.replace(/\\'/g, "'")) : null;
  }
  function extract(root) {                    // -> [{ el, text, title }] theo thứ tự trên trang
    const res = [], leafSet = new Set(); let head = '';
    const push = (el, text, title) => { text = clean(text); if (text.length >= 2) res.push({ el, text, title: title || head }); };
    root.querySelectorAll('*').forEach(el => {
      if (SKIP.has(el.tagName.toUpperCase())) {
        if (el.tagName === 'BUTTON') { const mb = member(el); if (mb) { head = clean(mb[0]); push(el.parentElement || el, [mb[1], mb[2]].join(' — '), head); } }
        return;
      }
      if (el.closest('svg, script, style, template')) return;
      if (leafSet.has(el.parentElement)) { leafSet.add(el); return; }   // con của một khối đã lấy rồi: bỏ qua, tránh trùng
      const leaf = ![...el.children].some(c => !INLINE.has(c.tagName.toUpperCase()) && !SKIP.has(c.tagName.toUpperCase()));
      if (leaf) {
        leafSet.add(el);
        const t = clean(el.textContent);
        if (HEAD.test(el.tagName) && t) head = t;
        push(el, t);
      } else {                                 // phần chữ nằm trực tiếp trong khối có con là khối khác
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join(' ');
        if (clean(own).length >= 2) push(el, own);
      }
    });
    return res;
  }

  /* ---------- Xây chỉ mục ---------- */
  let cache = null;
  const timeout = (p, ms = 2500) => Promise.race([p, new Promise(ok => setTimeout(() => ok(null), ms))]);
  async function applyAdminContent(key, root) {   // giống fillContent trong app.js: ưu tiên nội dung admin đã nhập
    const jobs = { journey: [['journey', '#journeyList', 'journey']], team: [['team', '#teamGrid', 'team']], faq: [['reviews', '#reviewList', 'reviews'], ['faq', '#faqList', 'faq']] }[key] || [];
    await Promise.all(jobs.map(async ([col, sel, fn]) => {
      const box = root.querySelector(sel); if (!box || typeof contentList !== 'function') return;
      try { const list = await timeout(contentList(col)); if (list && list.length) box.innerHTML = Content[fn](list); } catch (e) { /* giữ nội dung mẫu */ }
    }));
    if (key === 'video' && typeof siteDoc === 'function') {
      const box = root.querySelector('#video');
      try { const d = await timeout(siteDoc('video')); if (d && box) box.innerHTML = Content.video(d); } catch (e) { /* giữ nội dung mẫu */ }
    }
  }
  async function buildIndex() {
    if (cache && Date.now() - cache.t < 60000) return cache.v;
    const v = [], add = (page, href, title, text) => { text = clean(text); if (text) v.push({ page, href, title: clean(title), text, f: fold(text), ft: fold(title) }); };

    await Promise.all(PAGES.filter(p => p.tpls).map(async p => {
      const html = p.tpls.map(id => { const t = $id(id); return t ? t.innerHTML : ''; }).join('');
      const root = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html').body.firstChild;
      await applyAdminContent(p.key, root);
      extract(root).forEach(b => add(p.key, p.href, b.title, b.text));
    }));

    try {   // dự án + cập nhật theo tuần
      const [ps, us] = await timeout(Promise.all([Store.list('projects'), Store.list('updates')]), 4000) || [[], []];
      ps.forEach(p => add('projects', '#/p/' + p.id, p.name, [p.name, p.desc, p.owner ? 'Chủ dự án: ' + p.owner : '', p.status].filter(Boolean).join(' · ')));
      us.forEach(u => { const p = ps.find(x => x.id === u.projectId); add('projects', '#/p/' + u.projectId, (p ? p.name + ' · ' : '') + [u.week, u.title].filter(Boolean).join(': '), [u.title, u.content].filter(Boolean).join(' — ')); });
    } catch (e) { /* bỏ qua nếu chưa tải được dự án */ }

    try {   // bình luận đã duyệt (email luôn bị ẩn)
      const cs = await timeout(Store.list('comments', { where: ['approved', '==', true] }), 4000) || [];
      cs.forEach(c => add('comments', '#/comments', maskEmail(c.name || 'Ẩn danh'), maskEmail(c.text)));
    } catch (e) { /* bỏ qua */ }

    cache = { t: Date.now(), v }; return v;
  }

  /* ---------- Tìm ---------- */
  function run(index, q) {
    const terms = termsOf(q), phrase = fold(q).trim(), out = [];
    if (!terms.length) return { terms, hits: out };
    index.forEach(e => {
      let n = 0;
      for (const t of terms) { const c = e.f.split(t).length - 1, ct = e.ft.includes(t); if (!c && !ct) return; n += c + (ct ? 3 : 0); }
      if (terms.length > 1 && e.f.includes(phrase)) n += 5;
      if (e.ft.startsWith(terms[0])) n += 4;
      if (e.ft === phrase) n += 8;
      out.push({ e, score: n });
    });
    out.sort((a, b) => b.score - a.score);
    return { terms, hits: out };
  }
  function snippet(text, terms) {
    const r = ranges(text, terms), at = r.length ? r[0][0] : 0, a = Math.max(0, at - 70), b = Math.min(text.length, at + 150);
    const piece = text.slice(a, b);
    return (a > 0 ? '…' : '') + markHtml(piece, terms) + (b < text.length ? '…' : '');
  }

  /* ---------- Trang kết quả: #/search/<q> ---------- */
  let state = { q: '', hits: [], terms: [], filter: '', open: {} };
  const form = (q, id) => `<form class="sr-pform" data-srform role="search"><i class="fa-solid fa-magnifying-glass"></i><input id="${id}" type="search" name="q" value="${esc(q)}" placeholder="Nhập từ cần tìm rồi nhấn Enter…" autocomplete="off" enterkeyhint="search"><button type="submit">Tìm</button></form>`;
  const quickLinks = () => `<div class="sr-quick">${PAGES.filter(p => p.key !== 'projects').map(p => `<a href="${p.href}"><i class="fa-solid ${p.icon}"></i> ${esc(p.label)}</a>`).join('')}<a href="#/"><i class="fa-solid fa-folder-open"></i> Dự án</a></div>`;
  const shell = (q, body) => { const app = $id('app'); app.innerHTML = `<div class="sr-page">${form(q, 'srPageInput')}${body}</div>`; };

  function draw() {
    const { q, hits, terms } = state, box = $id('srResults'); if (!box) return;
    const groups = PAGES.map(p => ({ p, list: hits.filter(h => h.e.page === p.key) })).filter(g => g.list.length)
      .sort((a, b) => b.list[0].score - a.list[0].score);
    const shown = state.filter ? groups.filter(g => g.p.key === state.filter) : groups;
    const chips = `<div class="sr-chips"><button type="button" data-f="" class="${state.filter ? '' : 'on'}">Tất cả <b>${hits.length}</b></button>${groups.map(g => `<button type="button" data-f="${g.p.key}" class="${state.filter === g.p.key ? 'on' : ''}">${esc(g.p.label)} <b>${g.list.length}</b></button>`).join('')}</div>`;
    box.innerHTML = `<p class="sr-sum">Tìm thấy <b>${hits.length}</b> kết quả trong <b>${groups.length}</b> trang cho “${esc(q)}”.</p>${chips}` + shown.map(g => {
      const lim = state.open[g.p.key] ? 200 : 8, more = g.list.length - lim;
      return `<section class="sr-group"><div class="sr-gh"><a href="${g.p.href}" data-t="${esc(terms.join(' '))}"><i class="fa-solid ${g.p.icon}"></i> ${esc(g.p.label)}</a><span>${g.list.length} kết quả</span></div>
      ${g.list.slice(0, lim).map(h => `<a class="sr-item" href="${esc(h.e.href)}" data-t="${esc(terms.join(' '))}" data-a="${esc(h.e.f.slice(0, 40))}">
        <b>${markHtml(h.e.title || g.p.label, terms)}</b>${h.e.f === h.e.ft ? '' : `<span>${snippet(h.e.text, terms)}</span>`}<i class="fa-solid fa-arrow-right sr-go"></i></a>`).join('')}
      ${more > 0 ? `<button type="button" class="sr-more" data-more="${g.p.key}">Xem thêm ${more} kết quả</button>` : ''}</section>`;
    }).join('');
  }
  async function page(raw) {
    let q; try { q = decodeURIComponent(raw || ''); } catch (e) { q = String(raw || ''); }
    q = q.trim().slice(0, 100);
    const nv = $id('srNavInput'); if (nv && document.activeElement !== nv) nv.value = q;
    if (!q) { shell('', `<p class="sr-sum">Nhập từ khoá để tìm trong toàn bộ website.</p>${quickLinks()}`); const i = $id('srPageInput'); if (i) i.focus(); return; }
    shell(q, '<div id="srResults"><div class="loading">Đang tìm…</div></div>');
    const index = await buildIndex();
    if (!$id('srResults')) return;
    const { terms, hits } = run(index, q);
    state = { q, hits, terms, filter: '', open: {} };
    if (!hits.length) {
      $id('srResults').innerHTML = `<div class="sr-none"><i class="fa-regular fa-face-frown"></i><p>Không có kết quả nào cho “<b>${esc(q)}</b>”.</p><small>Thử từ ngắn hơn hoặc đổi cách viết. Bạn cũng có thể vào thẳng một trang:</small></div>${quickLinks()}`;
      return;
    }
    draw();
  }

  /* ---------- Sau khi mở trang đích: tô từ khoá, cuộn tới đoạn được chọn ---------- */
  let pending = null;
  function highlight(root, terms) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && !n.parentElement.closest('script,style,textarea,mark,.sr-page') && n.data.trim() ? 1 : 2 });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    let count = 0;
    for (const n of nodes) {
      if (count > 300) break;
      const r = ranges(n.data, terms); if (!r.length) continue;
      const frag = document.createDocumentFragment(); let p = 0;
      r.forEach(([a, b]) => { frag.append(n.data.slice(p, a)); const m = document.createElement('mark'); m.className = 'sr-mark'; m.textContent = n.data.slice(a, b); frag.append(m); p = b; count++; });
      frag.append(n.data.slice(p)); n.replaceWith(frag);
    }
  }
  function reveal(el) {                        // mở tab / mục đang ẩn chứa đoạn cần xem
    for (let a = el; a && a.id !== 'app'; a = a.parentElement) {
      if (a.tagName === 'DETAILS') a.open = true;
      if (a.id && a.id.indexOf('tab-') === 0 && a.classList.contains('hidden') && typeof window.switchTab === 'function') window.switchTab(a.id.slice(4));
    }
  }
  function applyFind() {
    const f = pending; pending = null;
    if (!f || Date.now() - f.t > 20000) return;
    const root = $id('app'); if (!root) return;
    const blocks = extract(root), has = (b, ts) => ts.every(t => fold(b.text).includes(t));
    let hit = (f.anchor && blocks.find(b => fold(b.text).includes(f.anchor))) || blocks.find(b => has(b, f.terms)) || blocks.find(b => f.terms.some(t => fold(b.text).includes(t)));
    highlight(root, f.terms);
    if (!hit) return;
    reveal(hit.el);
    const mk = hit.el.querySelector('mark.sr-mark') || hit.el;
    setTimeout(() => {
      const y = mk.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      hit.el.classList.add('sr-flash'); setTimeout(() => hit.el.classList.remove('sr-flash'), 2600);
    }, 60);
  }


  /* ---------- Gợi ý khi gõ (giống Google): kết quả liên quan nhất lên đầu ---------- */
  const sug = { items: [], i: -1, tok: 0, input: null, timer: 0 };
  const sugBox = () => { let b = $id('srSug'); if (!b) { b = document.createElement('div'); b.id = 'srSug'; b.className = 'sr-sug'; b.hidden = true; b.setAttribute('role', 'listbox'); document.body.appendChild(b); } return b; };
  function closeSug() { const b = $id('srSug'); if (b) { b.hidden = true; b.innerHTML = ''; } sug.i = -1; sug.tok++; }
  function placeSug() {
    const inp = sug.input; if (!inp) return;
    const r = (inp.closest('.sr-nav, .sr-pform') || inp).getBoundingClientRect(), b = sugBox();
    b.style.left = r.left + 'px'; b.style.top = (r.bottom + 6) + 'px'; b.style.width = r.width + 'px';
  }
  async function updateSug(inp) {
    const q = inp.value.trim(); sug.input = inp;
    if (!q) { closeSug(); return; }
    const tok = ++sug.tok, index = await buildIndex();
    if (tok !== sug.tok) return;                       // đã gõ tiếp hoặc đã đóng
    const { terms, hits } = run(index, q), seen = new Set(), items = [];
    for (const h of hits) { const k = h.e.page + '|' + (h.e.title || h.e.f.slice(0, 30)); if (seen.has(k)) continue; seen.add(k); items.push(h); if (items.length >= 7) break; }
    const b = sugBox(); sug.i = -1; placeSug();
    b.innerHTML = (items.length ? items.map(h => { const p = BY_KEY[h.e.page];
        return `<a class="sr-sg" role="option" href="${esc(h.e.href)}" data-t="${esc(terms.join(' '))}" data-a="${esc(h.e.f.slice(0, 40))}"><i class="fa-solid ${p.icon}"></i><span><b>${markHtml(h.e.title || p.label, terms)}</b><small>${esc(p.label)}${h.e.f === h.e.ft ? '' : ' · ' + snippet(h.e.text, terms)}</small></span></a>`; }).join('')
      + `<a class="sr-sg sr-sg-all" href="#/search/${encodeURIComponent(q.slice(0, 100))}"><i class="fa-solid fa-magnifying-glass"></i><span><b>Xem tất cả ${hits.length} kết quả cho “${esc(q)}”</b></span></a>`
      : `<div class="sr-sg-none">Không có gợi ý cho “${esc(q)}”. Nhấn Enter để tìm trên toàn trang.</div>`);
    b.hidden = false;
  }
  function moveSug(d) {
    const rows = [...document.querySelectorAll('#srSug .sr-sg')]; if (!rows.length) return;
    sug.i = (sug.i + d + rows.length + 1) % (rows.length + 1);          // thêm 1 nấc "không chọn gì"
    if (sug.i === rows.length) sug.i = -1;
    rows.forEach((r, n) => r.classList.toggle('on', n === sug.i));
    if (sug.i >= 0) rows[sug.i].scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Thanh tìm kiếm trên menu ---------- */
  function go(q) {
    q = String(q || '').trim(); if (!q) return;
    const h = '#/search/' + encodeURIComponent(q.slice(0, 100));
    closeBar(); closeSug();
    const n = $id('srNavInput'); if (n) { n.value = q; n.blur(); }
    if (location.hash === h && typeof window.route === 'function') window.route(); else location.hash = h;
  }
  function openBar() {
    const nav = $id('srNavInput');
    if (nav && nav.offsetParent) { nav.focus(); nav.select(); return; }   // màn hình rộng: dùng ô tìm kiếm ngay trên menu
    const bar = $id('srBar'); if (!bar) return;
    if (typeof window.toggleMobileMenu === 'function') window.toggleMobileMenu(true);
    const inp = $id('srInput'); if (state.q && !inp.value) inp.value = state.q;
    bar.hidden = false; requestAnimationFrame(() => { bar.classList.add('on'); inp.focus(); inp.select(); });
  }
  function closeBar() { const bar = $id('srBar'); if (!bar) return; bar.classList.remove('on'); bar.hidden = true; }

  function init() {
    const css = document.createElement('style');
    css.textContent = `
.sr-btn{flex:none;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;border-radius:10px;background:#fff;color:#0284c7;font-size:.9rem;cursor:pointer;transition:.15s}
.sr-btn:hover{background:#f0f9ff;border-color:#bae6fd}
.sr-bar{position:fixed;z-index:45;left:0;right:0;top:80px;padding:12px 16px;background:rgba(255,255,255,.97);border-bottom:1px solid #e2e8f0;box-shadow:0 12px 30px rgba(15,23,42,.12);transform:translateY(-8px);opacity:0;transition:.18s}
.sr-bar[hidden]{display:none}.sr-bar.on{transform:none;opacity:1}
.sr-bar form{max-width:720px;margin:0 auto;display:flex;align-items:center;gap:8px}
.sr-pform{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 16px;background:#fff;border:2px solid #bae6fd;border-radius:99px;box-shadow:0 4px 18px rgba(2,132,199,.10)}
.sr-pform:focus-within,.sr-bar .sr-pform:focus-within{border-color:#0284c7}
.sr-bar .sr-pform{flex:1}
.sr-pform>i{color:#0284c7}
.sr-pform input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:16px;color:#0f172a;padding:8px 0;-webkit-appearance:none;appearance:none}
.sr-pform input::-webkit-search-cancel-button{display:none}
.sr-pform button{flex:none;border:0;border-radius:99px;background:#0284c7;color:#fff;font:inherit;font-weight:700;padding:9px 20px;cursor:pointer}
.sr-pform button:hover{background:#0369a1}
.sr-x{flex:none;width:38px;height:38px;border:0;border-radius:50%;background:#f1f5f9;color:#475569;font-size:1.3rem;line-height:1;cursor:pointer}
.sr-hint{max-width:720px;margin:6px auto 0;font-size:.75rem;color:#94a3b8;padding-left:16px}
.sr-page{max-width:880px;margin:0 auto;padding:112px 16px 80px;min-height:70vh;color:#1e293b}
.sr-page .sr-pform{margin-bottom:18px}
.sr-sum{margin:6px 0 14px;color:#475569}
.sr-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}
.sr-chips button{border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:99px;padding:6px 14px;font:inherit;font-size:.85rem;font-weight:600;cursor:pointer}
.sr-chips button b{margin-left:4px;color:#0284c7}
.sr-chips button.on{background:#0284c7;border-color:#0284c7;color:#fff}.sr-chips button.on b{color:#e0f2fe}
.sr-group{margin-bottom:26px}
.sr-gh{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 4px 8px;margin-bottom:8px;border-bottom:2px solid #e0f2fe}
.sr-gh a{font-weight:800;color:#0369a1;text-decoration:none;display:inline-flex;align-items:center;gap:8px}.sr-gh a:hover{text-decoration:underline}
.sr-gh span{font-size:.8rem;color:#94a3b8}
.sr-item{position:relative;display:block;padding:12px 44px 12px 16px;margin-bottom:8px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;color:inherit;text-decoration:none;transition:.15s}
.sr-item:hover{border-color:#7dd3fc;box-shadow:0 6px 18px rgba(2,132,199,.12);transform:translateY(-1px)}
.sr-item b{display:block;font-size:.98rem;color:#0f172a;margin-bottom:3px}
.sr-item span{display:block;font-size:.88rem;line-height:1.5;color:#475569;word-break:break-word}
.sr-go{position:absolute;right:16px;top:50%;margin-top:-6px;font-size:.8rem;color:#38bdf8}
.sr-page mark,.sr-mark{background:#fde68a;color:inherit;border-radius:3px;padding:0 1px}
.sr-more{width:100%;border:1px dashed #94a3b8;background:none;border-radius:12px;padding:9px;font:inherit;font-size:.88rem;font-weight:600;color:#0284c7;cursor:pointer}
.sr-none{text-align:center;padding:36px 12px;color:#64748b}.sr-none i{font-size:2rem;color:#94a3b8}.sr-none p{margin:10px 0 4px;color:#1e293b}
.sr-quick{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:18px}
.sr-quick a{padding:9px 16px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:99px;color:#0369a1;font-weight:600;font-size:.9rem;text-decoration:none}
.sr-quick a:hover{background:#e0f2fe}
.sr-flash{outline:3px solid #38bdf8;outline-offset:6px;border-radius:12px;animation:srf 2.6s ease-out}
@keyframes srf{0%,60%{outline-color:#38bdf8}100%{outline-color:transparent}}
@media(max-width:640px){.sr-page{padding-top:100px}.sr-pform button{padding:9px 14px}}
/* --- Menu luôn dạng hamburger: ô tìm kiếm kiểu Google ở giữa, Chat + hamburger bên phải --- */
.sr-logo{margin-right:20px}.sr-right{margin-left:20px}
.sr-nav{flex:1 1 auto;min-width:0;max-width:640px;margin-left:auto;margin-right:auto;height:46px;display:flex;align-items:center;gap:10px;padding:0 18px;background:#f1f5f9;border:1px solid transparent;border-radius:99px;transition:.15s}
.sr-nav:hover{background:#fff;border-color:#e2e8f0;box-shadow:0 2px 10px rgba(15,23,42,.10)}
.sr-nav:focus-within{background:#fff;border-color:#bae6fd;box-shadow:0 4px 18px rgba(2,132,199,.22)}
.sr-nav>i{color:#64748b;font-size:.95rem}.sr-nav:focus-within>i{color:#0284c7}
.sr-nav input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:16px;color:#0f172a;height:100%;-webkit-appearance:none;appearance:none}
.sr-nav input::-webkit-search-cancel-button{-webkit-appearance:none;display:none}
.sr-nav kbd{font:inherit;font-size:.72rem;font-weight:700;color:#94a3b8;border:1px solid #cbd5e1;border-radius:6px;padding:1px 7px;background:#fff}
.sr-nav:focus-within kbd{display:none}
#mobile-menu{position:absolute;right:16px;top:80px;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 100px);overflow:auto;border:1px solid #e2e8f0;border-radius:16px}
/* Nút Chat: đứng yên (đã bỏ hiệu ứng nhấp nháy cho giao diện gọn, chuyên nghiệp) */
.nav-chat{position:relative;width:auto!important;padding:0 14px;gap:8px;font-weight:700;font-size:.9rem}
.nav-chat .nav-chat-t{display:none}
@media(min-width:640px){.sr-btn{display:none}.nav-chat .nav-chat-t{display:inline}}
@media(max-width:639px){.sr-nav{display:none}.sr-right{margin-left:auto}}
@media(max-width:420px){.sr-logo>div{display:none}.sr-logo{margin-right:0}}
.sr-sug{position:fixed;z-index:60;background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 18px 40px rgba(15,23,42,.18);padding:6px;max-height:min(70vh,520px);overflow-y:auto}
.sr-sug[hidden]{display:none}
.sr-sg{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:12px;color:inherit;text-decoration:none}
.sr-sg:hover,.sr-sg.on{background:#f0f9ff}
.sr-sg>i{flex:none;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#e0f2fe;color:#0284c7;font-size:.8rem}
.sr-sg>span{min-width:0;flex:1}
.sr-sg b{display:block;font-size:.92rem;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sr-sg small{display:block;font-size:.78rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sr-sug mark{background:#fde68a;color:inherit;border-radius:3px;padding:0 1px}
.sr-sg-all{margin-top:4px;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px}.sr-sg-all b{color:#0284c7}
.sr-sg-none{padding:14px;color:#64748b;font-size:.88rem}`;
    document.head.appendChild(css);

    const bar = document.createElement('div');
    bar.id = 'srBar'; bar.className = 'sr-bar'; bar.hidden = true;
    bar.innerHTML = `<form data-srform role="search"><div class="sr-pform"><i class="fa-solid fa-magnifying-glass"></i><input id="srInput" type="search" placeholder="Tìm trong website… (nhấn Enter)" autocomplete="off" enterkeyhint="search" maxlength="100" aria-label="Tìm kiếm"><button type="submit">Tìm</button></div><button type="button" class="sr-x" data-search-close aria-label="Đóng">&times;</button></form><div class="sr-hint">Gõ không dấu cũng được · Esc để đóng · phím tắt: / hoặc Ctrl+K</div>`;
    document.body.appendChild(bar); sugBox();

    document.addEventListener('submit', e => {
      const f = e.target.closest && e.target.closest('[data-srform]'); if (!f) return;
      e.preventDefault(); const i = f.querySelector('input'); go(i && i.value);
    });
    const isSrInput = el => el && (el.id === 'srNavInput' || el.id === 'srInput');
    document.addEventListener('input', e => { if (!isSrInput(e.target)) return; clearTimeout(sug.timer); sug.timer = setTimeout(() => updateSug(e.target), 90); });
    document.addEventListener('focusin', e => { if (!isSrInput(e.target)) return; buildIndex(); if (e.target.value.trim()) updateSug(e.target); });   // nạp sẵn chỉ mục
    addEventListener('resize', placeSug); addEventListener('hashchange', closeSug);
    document.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('#srSug')) setTimeout(closeSug, 0);
      else if (!t.closest('.sr-nav, #srBar')) closeSug();
      if (t.closest('[data-search-open]')) { e.preventDefault(); const b = $id('srBar'); b && !b.hidden ? closeBar() : openBar(); return; }
      if (t.closest('[data-search-close]')) { closeBar(); return; }
      const a = t.closest('a[data-t]');
      if (a) { pending = { terms: a.dataset.t.split(' ').filter(Boolean), anchor: a.dataset.a || '', t: Date.now() }; closeBar(); return; }
      const fb = t.closest('.sr-chips [data-f]'); if (fb) { state.filter = fb.dataset.f; draw(); return; }
      const mb = t.closest('[data-more]'); if (mb) { state.open[mb.dataset.more] = true; draw(); return; }
      const b = $id('srBar'); if (b && !b.hidden && !t.closest('#srBar')) closeBar();
    });
    document.addEventListener('keydown', e => {
      if (isSrInput(e.target) && !$id('srSug').hidden) {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveSug(1); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); moveSug(-1); return; }
        if (e.key === 'Enter' && sug.i >= 0) { const r = document.querySelectorAll('#srSug .sr-sg')[sug.i]; if (r) { e.preventDefault(); r.click(); return; } }
      }
      if (e.key === 'Escape') { closeSug(); closeBar(); const n = $id('srNavInput'); if (n && document.activeElement === n) n.blur(); return; }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
      if ((e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); openBar(); }
    });
  }

  window.Search = { page, applyFind, close() { closeBar(); closeSug(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
