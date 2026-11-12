/* ===== Tương tác của trang gốc (menu, tab, popup thành viên, bình luận Google Sheet) ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); };

/* --- Menu điện thoại --- */
function toggleMobileMenu(force) {
  const m = $('#mobile-menu'), i = $('#mobile-menu-icon');
  const closed = typeof force === 'boolean' ? (m.classList.toggle('hidden', force), force) : m.classList.toggle('hidden');
  i.className = closed ? 'fa-solid fa-bars text-xl' : 'fa-solid fa-xmark text-xl';
}

/* --- Tab 4.1 – 4.4 (mục Problems) --- */
function switchTab(name) {
  const on = ['bg-sky-600', 'text-white', 'shadow-lg', 'shadow-sky-600/30'];
  const off = ['bg-white', 'text-slate-600', 'hover:text-sky-600', 'border', 'border-slate-200'];
  ['abstract', 'solution', 'methods', 'conclusions'].forEach(k => {
    const b = $('#tab-btn-' + k), c = $('#tab-' + k), a = k === name;
    if (!b || !c) return;
    c.classList.toggle('hidden', !a);
    b.classList.remove(...(a ? off : on)); b.classList.add(...(a ? on : off));
  });
}

/* --- Popup thành viên --- */
function openMemberModal(name, role, desc) {
  $('#modal-name').textContent = name; $('#modal-role').textContent = role; $('#modal-desc').textContent = desc;
  $('#member-modal').classList.remove('hidden');
}
function closeMemberModal() { $('#member-modal').classList.add('hidden'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMemberModal(); });
document.addEventListener('click', e => { if (e.target.id === 'member-modal') closeMemberModal(); });

/* --- Bình luận: lưu & đọc từ Google Sheet --- */
let rating = 5, commentList = [];
const AVATAR = ['bg-sky-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500'];

function setRating(n) {
  rating = n;
  document.querySelectorAll('.star-btn').forEach((s, i) => { s.style.opacity = i < n ? 1 : .25; });
  const t = $('#ratingValueText'); if (t) t.textContent = n + '/5 Sao';
}
function toggleIdentityFields() {
  const anon = document.querySelector('input[name="identityMode"]:checked').value === 'anonymous';
  $('#realNameInputs').classList.toggle('hidden', anon);
}
function updateCharCount() { $('#charCount').textContent = $('#commentText').value.length + '/500'; }
function addEmoji(e) {
  const t = $('#commentText'); if (t.value.length + e.length > 500) return;
  t.value += (t.value && !t.value.endsWith(' ') ? ' ' : '') + e + ' '; updateCharCount(); t.focus();
}

function parseCsv(txt) {
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; r.push(f); f = ''; rows.push(r); r = []; }
    else f += c;
  }
  if (f || r.length) { r.push(f); rows.push(r); }
  return rows;
}
async function fetchComments() {
  const c = window.APP_CONFIG || {};
  // appsScriptUrl (JSON) được thử trước; sheetCsvUrl chỉ là phương án dự phòng
  const urls = [c.appsScriptUrl, c.sheetCsvUrl].filter((u, k, a) => u && a.indexOf(u) === k);
  if (!urls.length) { try { return JSON.parse(localStorage.getItem('pt_comments') || '[]'); } catch (e) { return []; } }
  let lastErr;
  for (const u of urls) {
    try {
      const r = await fetch(u + (u.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (Array.isArray(j)) return j;
      if (j && j.status === 'error') throw new Error(j.message || 'Lỗi từ Apps Script');
      if (/^\s*</.test(txt)) throw new Error('Link trả về trang HTML: Apps Script chưa có doGet, chưa Deploy bản mới, hoặc chưa để quyền "Anyone"');
      return parseCsv(txt).filter(x => x[2] && /\d/.test(x[0])).map(x => ({ time: x[0], name: x[1], comment: x[2] }));
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Không đọc được bình luận');
}
function renderComments() {
  const box = $('#commentsContainer'); if (!box) return;
  const cfg = window.APP_CONFIG || {};
  const note = cfg.appsScriptUrl ? '' : '<div class="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">Chưa nối Google Sheet: bình luận đang chỉ lưu trên trình duyệt này. Dán link Apps Script vào <b>config.js</b> để lưu vào Sheet.</div>';
  const list = [...commentList].reverse();
  $('#commentBadgeCount').textContent = list.length;
  box.innerHTML = note + (list.map(m => {
    const p = /^⭐([1-5]) \| (.*?) \| ([\s\S]*)$/.exec(m.comment || ''), star = p ? +p[1] : 0, role = p ? p[2] : '', text = p ? p[3] : m.comment;
    const d = new Date(m.time), when = String(m.time).includes('T') && !isNaN(d) ? d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : String(m.time || '');
    const name = m.name || 'Ẩn danh', col = AVATAR[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
    return `<div class="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5"><div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-full ${col} text-white font-extrabold flex items-center justify-center shrink-0">${esc(name.trim().charAt(0).toUpperCase() || '?')}</div>
      <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-x-2 gap-y-1"><b class="text-white text-sm">${esc(name)}</b>
      ${role ? `<span class="text-[11px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full">${esc(role)}</span>` : ''}
      <span class="text-[11px] text-slate-500 sm:ml-auto">${esc(when)}</span></div>
      ${star ? `<div class="text-amber-400 text-xs my-1">${'★'.repeat(star)}${'☆'.repeat(5 - star)}</div>` : ''}
      <p class="text-slate-300 text-sm mt-1 whitespace-pre-wrap break-words">${esc(text)}</p></div></div></div>`;
  }).join('') || '<p class="text-slate-500 text-sm text-center py-8">Chưa có bình luận nào. Hãy là người đầu tiên!</p>');
}
async function loadCommentsFromSheet() {
  const box = $('#commentsContainer'); if (!box) return;
  if (!commentList.length) box.innerHTML = '<p class="text-slate-500 text-sm text-center py-8">Đang tải bình luận…</p>';
  try { commentList = await fetchComments(); }
  catch (e) { box.innerHTML = '<p class="text-red-300 text-sm text-center py-8">Không tải được bình luận: ' + esc(e.message) + '</p>'; return; }
  renderComments();
}
async function handleCommentSubmit(ev) {
  ev.preventDefault();
  const cfg = window.APP_CONFIG || {}, btn = $('#submitBtn');
  const anon = document.querySelector('input[name="identityMode"]:checked').value === 'anonymous';
  const name = anon ? 'Ẩn danh' : $('#commenterName').value.trim();
  const role = anon ? '' : $('#commenterRole').value.trim().replace(/\|/g, '/');
  const text = $('#commentText').value.trim();
  if (!name) return toast('Vui lòng nhập họ tên hoặc chọn Ẩn danh');
  if (text.length < 2) return toast('Hãy nhập nội dung bình luận');
  if (Date.now() - (+localStorage.getItem('pt_last_comment') || 0) < 15000) return toast('Bạn gửi hơi nhanh, đợi vài giây nhé');
  const payload = { name, comment: `⭐${rating} | ${role} | ${text}` };
  const html = btn.innerHTML; btn.disabled = true; btn.style.opacity = .6; btn.textContent = 'Đang gửi…';
  try {
    if (cfg.appsScriptUrl) {
      let unread = false;
      try { // text/plain để trình duyệt không gửi preflight (Apps Script không hỗ trợ)
        const r = await fetch(cfg.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const txt = await r.text(); let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Apps Script trả về trang HTML (chưa Deploy với quyền "Anyone", hoặc sai link /exec)'); }
        if (j.status !== 'success') throw new Error(j.message || 'Lỗi từ Apps Script');
      } catch (e) { if (!(e instanceof TypeError)) throw e; unread = true; /* trình duyệt chặn đọc phản hồi: phải kiểm tra lại bên dưới */ }
      if (unread) { // chưa biết đã lưu chưa -> đọc lại Sheet để xác nhận
        await new Promise(ok => setTimeout(ok, 1500));
        let l; try { l = await fetchComments(); } catch (e) { throw new Error('Không xác nhận được bình luận đã lưu: ' + e.message); }
        if (!l.some(x => String(x.comment) === payload.comment)) throw new Error('Chưa lưu được vào Google Sheet. Kiểm tra Deploy (Who has access = Anyone) và link /exec trong config.js');
      }
    } else {
      const l = JSON.parse(localStorage.getItem('pt_comments') || '[]'); l.push({ time: new Date().toISOString(), ...payload });
      localStorage.setItem('pt_comments', JSON.stringify(l));
    }
    localStorage.setItem('pt_last_comment', Date.now());
    const mine = { time: new Date().toISOString(), ...payload };
    try { const l = await fetchComments(); commentList = l.some(x => String(x.comment) === payload.comment) ? l : [...l, mine]; } catch (e) { commentList.push(mine); }
    $('#commentText').value = ''; updateCharCount(); renderComments(); toast('Đã gửi bình luận. Cảm ơn bạn!');
  } catch (e) { toast('Gửi chưa được: ' + e.message); }
  btn.disabled = false; btn.style.opacity = 1; btn.innerHTML = html;
}
