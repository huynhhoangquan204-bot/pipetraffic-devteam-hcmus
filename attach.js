/* ===== Chat: đính kèm (hình ảnh / tệp / video), tin nhắn thoại, emoji, thả cảm xúc, thu hồi =====
   Dùng chung cho khung chat người dùng và trang admin.
   Lưu trữ (không cần Firebase Storage):
   - Hình ảnh: nén còn ~260KB, lưu thẳng trong tin nhắn (trường "media").
   - Video (25MB), tệp (4MB), tin nhắn thoại (3MB / 2 phút): cắt thành mảnh ~500KB lưu ở bộ sưu tập "chunks",
     chỉ tải về khi người nhận bấm xem / nghe / tải.
   - Cảm xúc: bộ sưu tập "reacts" (mỗi người 1 cảm xúc / tin nhắn). Thu hồi: tin nhắn bị xoá nội dung, đánh dấu recalled.
   - Chat với AI: mọi thứ chỉ hiện tại máy này; AI CHƯA xem / nghe được tệp. */
(function () {
  'use strict';
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ATT_TXT = '📎 Tệp đính kèm';
  const PH_TXT = { img: '🖼️ Hình ảnh', video: '🎬 Video', audio: '🎤 Tin nhắn thoại', file: '📄 Tệp đính kèm' };
  const PH = new Set([ATT_TXT, ...Object.values(PH_TXT)]);
  const MAX_FILES = 4, CHUNK = 500000, MAX_INLINE = 880000, MAX_REC = 120;
  const MAX_CHUNKS = 80;                               // 80 mảnh x 500KB (base64) ≈ 29MB dữ liệu gốc (đủ cho video 25MB); muốn tăng video thì tăng cả maxVideo() lẫn số này
  const demo = () => !!(window.Store && Store.mode === 'demo');
  const maxVideo = () => demo() ? 1200000 : 25 * 1024 * 1024;   // chế độ thật: 25MB (trước là 6MB)
  const maxFile = () => demo() ? 1200000 : 4 * 1024 * 1024;
  const maxAudio = () => demo() ? 1200000 : 3 * 1024 * 1024;
  const IMG_OK = /^data:image\/(jpeg|png|webp|gif);base64,/i;
  const VID_OK = /^video\/(mp4|webm|ogg|quicktime|x-m4v|3gpp)$/i;
  const AUD_OK = /^audio\/(webm|ogg|mp4|mpeg|aac|x-m4a|wav)$/i;
  const BAD_EXT = /\.(exe|msi|bat|cmd|com|scr|pif|js|jse|vbs|vbe|wsf|ps1|jar|apk|sh|dll|lnk|hta|html?|svg)$/i;   // loại có thể chạy mã khi mở
  const MID = /^[\w-]{6,40}$/;
  const cache = {};                                    // mid -> blob URL đã tải
  const size = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const mmss = s => { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const safeName = n => String(n || 'tep').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80);
  const say = m => { try { if (typeof toast === 'function') return toast(m); } catch (x) { /* dùng alert */ } alert(m); };
  const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '😉', '😊', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳', '🤔', '😐', '😴', '😢', '😭', '😤', '😡', '🥺', '😱', '🤗', '👍', '👎', '👏', '🙏', '💪', '👌', '✌️', '🤝', '👋', '🔥', '✨', '💯', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '🎉', '🎁', '🚀', '⭐', '🌈', '☀️', '🌙', '⚡', '🚇', '🚆', '🛠️', '💡', '📌', '📷', '🎬', '🎵', '✅', '❌', '⚠️', '❓'];


  const ICON = {   // biểu tượng kiểu Messenger (SVG, tô theo màu chữ)
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="16" rx="3.5"/><circle cx="8.5" cy="9.5" r="1.8" fill="#fff"/><path d="M4 18l5-5 3 3 3-3.5 5 5.5z" fill="#fff"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5M8.5 21.5h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="8.8" cy="10" r="1.4" fill="#fff"/><circle cx="15.2" cy="10" r="1.4" fill="#fff"/><path d="M7.6 14c1 2.2 2.8 3.2 4.4 3.2s3.4-1 4.4-3.2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.6 20.6 21.4 12 2.6 3.4l-.1 6.7L15 12 2.5 13.9z"/></svg>'
  };

  /* ---------- Bảng nổi dùng chung (menu 📎, emoji, cảm xúc): chỉ mở một cái một lúc ---------- */
  let floatEl = null;
  function closeFloat() { if (floatEl) { floatEl.remove(); floatEl = null; } }
  function openFloat(el, anchor) {
    closeFloat(); el._for = anchor; el.style.visibility = 'hidden'; document.body.appendChild(el); floatEl = el;
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, innerWidth - w - 8));
    let top = r.top - h - 8; if (top < 8) top = Math.min(r.bottom + 8, Math.max(8, innerHeight - h - 8));
    el.style.left = left + 'px'; el.style.top = top + 'px'; el.style.visibility = '';
  }
  const toggled = anchor => floatEl && floatEl._for === anchor && (closeFloat(), true);

  async function upload(it, uid, by, prog) {
    const dataUrl = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('Không đọc được tệp')); r.readAsDataURL(it.file); });
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1), n = Math.ceil(b64.length / CHUNK);
    if (n > MAX_CHUNKS) throw new Error('Tệp quá lớn để gửi trong chat. Hãy đưa lên YouTube/Drive rồi dán link.');
    const mid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), done = [];
    let next = 0, fin = 0, fail = null;
    const worker = async () => {                      // 2 mảnh ghi song song (mạng yếu không bị nghẽn); mỗi mảnh đã được Store.put thử lại 3 lần
      while (!fail && next < n) {
        const i = next++, id = mid + '_' + i;
        try { await Store.put('chunks', { id, mid, i, uid, by, data: b64.slice(i * CHUNK, (i + 1) * CHUNK), ts: Date.now() + i }); done.push(id); if (prog) prog(++fin, n); }
        catch (x) { fail = fail || x; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, n) }, worker));
    if (fail) { for (const id of done) { try { await Store.del('chunks', id); } catch (_) { /* không xoá được thì bỏ qua */ } } throw fail; }
    if (it.t === 'video') return { t: 'video', mid, n, mime: it.mime, size: it.size, name: safeName(it.name) };
    if (it.t === 'audio') return { t: 'audio', mid, n, mime: it.mime, size: it.size, dur: it.dur };
    return { t: 'file', mid, n, size: it.size, name: safeName(it.name) };
  }

  const Attach = window.Attach = {
    ATT_TXT,
    isPh: t => PH.has(t),                              // nội dung chữ tự sinh khi chỉ gửi tệp
    txt(media) { const k = [...new Set((media || []).map(m => m.t))]; return k.length === 1 && PH_TXT[k[0]] || ATT_TXT; },

    // HTML hiển thị tệp của một tin nhắn (đã kiểm tra dữ liệu, an toàn khi hiện tin của người khác)
    html(list) {
      if (!Array.isArray(list) || !list.length) return '';
      return '<div class="at-media">' + list.slice(0, 6).map(m => {
        if (!m) return '';
        const mid = m.mid && MID.test(m.mid) ? m.mid : '', n = Math.min(MAX_CHUNKS, Math.max(1, +m.n || 1)), blob = /^blob:/.test(m.src || '') ? m.src : '';
        if (m.t === 'img' && IMG_OK.test(m.src || '')) return `<img class="at-img" src="${e(m.src)}" alt="Ảnh đính kèm" loading="lazy" onclick="Media.open(this.src)">`;
        if (m.t === 'video') {
          if (mid && cache[mid]) return `<video class="at-vid" controls playsinline preload="metadata" src="${e(cache[mid])}"></video>`;
          if (mid) return `<button type="button" class="at-load" data-at-mid="${mid}" data-kind="video" data-n="${n}" data-mime="${VID_OK.test(m.mime || '') ? m.mime : 'video/mp4'}">▶ Xem video${m.size ? ' · ' + size(+m.size) : ''}</button>`;
          if (blob) return `<video class="at-vid" controls playsinline preload="metadata" src="${e(blob)}"></video>`;
        }
        if (m.t === 'audio') {
          if (mid && cache[mid]) return `<audio class="at-aud" controls preload="metadata" src="${e(cache[mid])}"></audio>`;
          if (mid) return `<button type="button" class="at-load" data-at-mid="${mid}" data-kind="audio" data-n="${n}" data-mime="${AUD_OK.test(m.mime || '') ? m.mime : 'audio/webm'}">🎤 Nghe · ${mmss(m.dur)}</button>`;
          if (blob) return `<audio class="at-aud" controls preload="metadata" src="${e(blob)}"></audio>`;
        }
        if (m.t === 'file') {
          const nm = safeName(m.name), label = '📄 ' + e(nm) + (m.size ? ' · ' + size(+m.size) : '');
          if (mid && cache[mid]) return `<a class="at-load" href="${e(cache[mid])}" download="${e(nm)}">${label}</a>`;
          if (mid) return `<button type="button" class="at-load" data-at-mid="${mid}" data-kind="file" data-n="${n}" data-name="${e(nm)}">${label}</button>`;
          if (blob) return `<a class="at-load" href="${e(blob)}" download="${e(nm)}">${label}</a>`;
        }
        return '';
      }).join('') + '</div>';
    },

    // Tải các mảnh về, ghép lại thành blob URL
    async load(mid, n, mime) {
      if (cache[mid]) return cache[mid];
      const parts = new Array(n); let next = 0;
      const worker = async () => { while (next < n) { const i = next++; parts[i] = await Store.get('chunks', mid + '_' + i); } };
      try { await Promise.all(Array.from({ length: Math.min(6, n) }, worker)); }
      catch (x) {
        if (/Rules Firestore|permission/i.test((x && (x.message + x.code)) || '')) throw new Error('Chưa có quyền tải tệp này. Cần cho phép tài khoản đã đăng nhập ĐỌC bộ sưu tập "chunks" trong Firestore Rules.');
        throw x;
      }
      if (parts.some(p => !p || typeof p.data !== 'string')) throw new Error('Tệp chưa tải đủ hoặc đã bị xoá.');
      const bufs = parts.map(p => { const bin = atob(p.data), a = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k); return a; });
      return cache[mid] = URL.createObjectURL(new Blob(bufs, { type: mime }));
    },

    // Gắn bộ soạn vào form chat. opts: { form, text (ô nhập), zone (vùng kéo thả), label (chữ nút, dùng ở admin) }
    composer(opts) {
      const form = opts.form, text = opts.text || null;
      if (!form) return null;
      if (form._at) return form._at;
      const items = [], adm = !!opts.label;
      if (getComputedStyle(form).position === 'static') form.style.position = 'relative';
      const tray = document.createElement('div'); tray.className = 'at-tray'; tray.hidden = true;
      form.parentNode.insertBefore(tray, form);
      const file = document.createElement('input'); file.type = 'file'; file.multiple = true; file.hidden = true;
      const mk = (svg, title, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'at-btn' + (cls ? ' ' + cls : ''); b.title = title; b.setAttribute('aria-label', title); b.innerHTML = svg; return b; };
      const emoBtn = text ? mk(ICON.smile, 'Chèn emoji', 'at-emo') : null;
      const canRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
      const micBtn = canRec ? mk(ICON.mic, 'Ghi âm tin nhắn thoại') : null;
      const clipBtn = mk(ICON.plus, 'Đính kèm hình ảnh, tệp hoặc video (cũng có thể kéo thả hoặc Ctrl+V)');
      const submit = form.querySelector('button[type=submit], button:not([type])');
      // Bố cục: [＋ 🎤] [ ô nhập + 😊 ] [👍 / gửi]  (＋ mở menu Hình ảnh / Tệp / Video)
      form.classList.add('ms-form'); if (submit) submit.classList.add('ms-send');
      const tools = document.createElement('div'); tools.className = 'ms-tools';
      [clipBtn, micBtn].forEach(b => { if (b) tools.appendChild(b); });
      const field = document.createElement('div'); field.className = 'ms-field';
      if (text) { text.parentNode.insertBefore(field, text); field.appendChild(text); if (emoBtn) field.appendChild(emoBtn); }
      form.insertBefore(tools, text ? field : submit);
      form.appendChild(file);
      // Nút bên phải: 👍 khi chưa gõ gì, mũi tên gửi khi đã có chữ / tệp
      function sync() {
        if (!submit) return;
        const empty0 = !items.length && !(text && text.value.trim());
        submit.classList.toggle('ms-like', empty0); submit.innerHTML = empty0 ? '👍' : ICON.send;
        submit.setAttribute('aria-label', empty0 ? 'Gửi lượt thích' : 'Gửi');
        if (text && text.tagName === 'TEXTAREA' && !text.value) text.style.height = '';
      }

      const draw = () => {
        tray.hidden = !items.length; sync();
        tray.innerHTML = items.map((it, i) => `<div class="at-th${it.t === 'file' || it.t === 'audio' ? ' at-fl' : ''}">${
          it.t === 'img' ? `<img src="${e(it.src)}" alt="">`
          : it.t === 'video' ? `<video src="${e(it.url)}" muted preload="metadata"></video><span class="at-play">▶</span><small>${size(it.size)}</small>`
          : it.t === 'audio' ? `<span class="at-ico">🎤</span><small>${mmss(it.dur)}</small>`
          : `<span class="at-ico">📄</span><small>${e(String(it.name).slice(0, 14))}</small>`
        }<button type="button" class="at-rm" data-rm="${i}" aria-label="Bỏ tệp này">×</button></div>`).join('');
      };
      async function add(fs) {
        if (text && text.disabled) return;
        for (const f of [...fs]) {
          if (items.length >= MAX_FILES) { say('Tối đa ' + MAX_FILES + ' tệp mỗi tin nhắn'); break; }
          try {
            const type = String(f.type || '').split(';')[0];
            if (/^image\//.test(type)) items.push({ t: 'img', src: await Media.image(f), name: f.name });
            else if (/^video\//.test(type)) {
              if (!VID_OK.test(type)) throw new Error('Định dạng video chưa hỗ trợ (hãy dùng MP4 hoặc WebM)');
              if (f.size > maxVideo()) throw new Error('Video "' + f.name + '" nặng ' + size(f.size) + ', tối đa ' + size(maxVideo()) + '. Video dài hơn hãy đưa lên YouTube/Drive rồi dán link.');
              items.push({ t: 'video', file: f, url: URL.createObjectURL(f), name: f.name, size: f.size, mime: type });
            } else {
              if (BAD_EXT.test(f.name || '')) throw new Error('Không gửi loại tệp "' + f.name + '" vì lý do an toàn.');
              if (f.size > maxFile()) throw new Error('Tệp "' + f.name + '" nặng ' + size(f.size) + ', tối đa ' + size(maxFile()) + '. Tệp lớn hơn hãy đưa lên Google Drive rồi dán link.');
              items.push({ t: 'file', file: f, name: f.name || 'tep', size: f.size, mime: 'application/octet-stream' });
            }
          } catch (x) { say(x.message || 'Không thêm được tệp'); }
        }
        draw();
      }
      const submitForm = () => { if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
      const ctl = form._at = {
        add, sync, has: () => items.length > 0, count: () => items.length,
        clear() { items.splice(0).forEach(it => { if (it.url && !it.keep) URL.revokeObjectURL(it.url); }); draw(); setTimeout(sync, 0); },
        // Trả về mảng media để lưu vào tin nhắn. local:true = chat AI (không tải lên máy chủ). by: 'user' | 'admin'
        async build(o = {}) {
          const inline = items.filter(i => i.t === 'img').reduce((s, i) => s + i.src.length, 0);
          if (inline > MAX_INLINE) throw new Error('Ảnh quá nặng cho một tin nhắn, hãy gửi ít ảnh hơn.');
          const out = [];
          for (const it of items) {
            if (it.t === 'img') out.push({ t: 'img', src: it.src });
            else if (o.local) { it.keep = true; out.push({ t: it.t, src: it.url, name: it.name, size: it.size, dur: it.dur }); }
            else out.push(await upload(it, o.uid, o.by || 'user', o.progress));
          }
          return out;
        }
      };

      /* --- nút 📎: chọn Hình ảnh / Tệp / Video --- */
      clipBtn.onclick = () => {
        if (text && text.disabled) return; if (toggled(clipBtn)) return;
        const m = document.createElement('div'); m.className = 'at-menu'; m.setAttribute('role', 'menu');
        m.innerHTML = '<button type="button" data-pick="image/*">🖼️ Gửi hình ảnh</button><button type="button" data-pick="">📄 Gửi tệp</button><button type="button" data-pick="video/*">🎬 Gửi video</button>';
        m.onclick = ev => { const b = ev.target.closest('[data-pick]'); if (!b) return; file.accept = b.dataset.pick; closeFloat(); file.click(); };
        openFloat(m, clipBtn);
      };
      file.onchange = () => { add(file.files); file.value = ''; };
      tray.addEventListener('click', ev => { const r = ev.target.closest('[data-rm]'); if (!r) return; const it = items.splice(+r.dataset.rm, 1)[0]; if (it && it.url) URL.revokeObjectURL(it.url); draw(); });

      if (text) {                                           // Enter gửi (Shift+Enter xuống dòng); ô trống thì Enter không gửi 👍
        text.addEventListener('input', () => { sync(); if (text.tagName === 'TEXTAREA') { text.style.height = 'auto'; text.style.height = Math.min(120, text.scrollHeight) + 'px'; } });
        text.addEventListener('keydown', ev => {
          if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing) return;
          if (!items.length && !text.value.trim()) { ev.preventDefault(); return; }
          if (text.tagName === 'TEXTAREA') { ev.preventDefault(); submitForm(); }
        });
        if (text.tagName === 'TEXTAREA') text.rows = 1;
      }
      sync();

      /* --- nút 😊: chèn emoji vào ô nhập --- */
      if (emoBtn) emoBtn.onclick = () => {
        if (text.disabled) return; if (toggled(emoBtn)) return;
        const p = document.createElement('div'); p.className = 'emo-panel';
        p.innerHTML = EMOJIS.map(x => `<button type="button" data-emo="${x}">${x}</button>`).join('');
        p.onclick = ev => {
          const b = ev.target.closest('[data-emo]'); if (!b) return;
          const s = b.dataset.emo; if (text.maxLength > 0 && text.value.length + s.length > text.maxLength) return;
          const a = text.selectionStart == null ? text.value.length : text.selectionStart, z = text.selectionEnd == null ? a : text.selectionEnd;
          text.value = text.value.slice(0, a) + s + text.value.slice(z); text.selectionStart = text.selectionEnd = a + s.length; if (!window.matchMedia || matchMedia('(hover:hover)').matches) text.focus();
          text.dispatchEvent(new Event('input', { bubbles: true }));
        };
        openFloat(p, emoBtn);
      };

      /* --- nút 🎤: ghi âm, bấm Gửi là gửi luôn --- */
      let rec = null;
      const bar = document.createElement('div'); bar.className = 'vc-bar'; bar.hidden = true;
      bar.innerHTML = '<button type="button" class="vc-x" data-vc="cancel" aria-label="Huỷ ghi âm" title="Huỷ">🗑</button><span class="vc-dot"></span><b class="vc-t">0:00</b><span class="vc-hint">Đang ghi âm…</span><button type="button" class="vc-send" data-vc="send">Gửi</button>';
      form.appendChild(bar);
      async function finish(send) {
        if (!rec) return; const r = rec; rec = null; clearInterval(r.iv); bar.hidden = true;
        const stopped = new Promise(ok => { r.mr.onstop = ok; }); try { r.mr.stop(); } catch (_) { /* đã dừng */ }
        await Promise.race([stopped, new Promise(ok => setTimeout(ok, 1500))]); r.stream.getTracks().forEach(t => t.stop());
        if (!send) return;
        const dur = Math.round((Date.now() - r.t0) / 1000); if (dur < 1) return say('Tin nhắn thoại quá ngắn');
        const mime = String(r.mr.mimeType || r.mime || 'audio/webm').split(';')[0], blob = new Blob(r.parts, { type: mime });
        if (blob.size > maxAudio()) return say('Tin nhắn thoại nặng ' + size(blob.size) + ', tối đa ' + size(maxAudio()));
        items.push({ t: 'audio', file: blob, url: URL.createObjectURL(blob), size: blob.size, mime, dur, name: 'voice' }); draw(); submitForm();
      }
      if (micBtn) micBtn.onclick = async () => {
        if (text && text.disabled) return; if (rec) return;
        if (items.length >= MAX_FILES) return say('Tối đa ' + MAX_FILES + ' tệp mỗi tin nhắn');
        let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (x) { return say('Không bật được micro. Hãy cho phép trang dùng micro (cần mở bằng HTTPS).'); }
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
        let mr; try { mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); } catch (x) { stream.getTracks().forEach(t => t.stop()); return say('Trình duyệt chưa hỗ trợ ghi âm'); }
        const parts = [], t0 = Date.now(); mr.ondataavailable = ev => { if (ev.data && ev.data.size) parts.push(ev.data); };
        const tm = bar.querySelector('.vc-t'); tm.textContent = '0:00';
        rec = { mr, stream, parts, t0, mime, iv: setInterval(() => { const s = (Date.now() - t0) / 1000; tm.textContent = mmss(s); if (s >= MAX_REC) finish(true); }, 250) };
        mr.start(1000); bar.hidden = false;
      };
      bar.addEventListener('click', ev => { const b = ev.target.closest('[data-vc]'); if (b) finish(b.dataset.vc === 'send'); });

      /* --- Ctrl+V và kéo thả --- */
      const z = opts.zone || form;
      if (getComputedStyle(z).position === 'static') z.style.position = 'relative';
      z.dataset.drop = 'Thả ảnh / video / tệp vào đây';
      z.addEventListener('paste', ev => {
        const fs = [...((ev.clipboardData && ev.clipboardData.files) || [])];
        if (!fs.length) return; ev.preventDefault(); add(fs);
      });
      let dc = 0;
      const has = ev => ev.dataTransfer && [...ev.dataTransfer.types].includes('Files');
      z.addEventListener('dragenter', ev => { if (!has(ev)) return; ev.preventDefault(); dc++; z.classList.add('at-drag'); });
      z.addEventListener('dragover', ev => { if (!has(ev)) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
      z.addEventListener('dragleave', ev => { if (!has(ev)) return; if (--dc <= 0) { dc = 0; z.classList.remove('at-drag'); } });
      z.addEventListener('drop', ev => { if (!has(ev)) return; ev.preventDefault(); dc = 0; z.classList.remove('at-drag'); add(ev.dataTransfer.files); });
      return ctl;
    }
  };

  /* ---------- Cảm xúc + thu hồi tin nhắn ---------- */
  const KINDS = { haha: '😂', heart: '❤️', sad: '😢' }, KLABEL = { haha: 'Haha', heart: 'Yêu thích', sad: 'Buồn' };
  const isAi = id => String(id).indexOf('ai:') === 0;
  const Msgx = window.Msgx = {
    ctx: null,                                          // { uid(), th(mid), find(mid), redraw(), ai:{react(i,k), recall(i)} } do trang đặt
    reacts: {},                                         // mid -> [{uid,k}]
    setReacts(list) {
      const m = {}; (list || []).forEach(r => { if (r && r.mid && KINDS[r.k]) (m[r.mid] = m[r.mid] || []).push({ uid: r.uid, k: r.k }); });
      this.reacts = m;
    },
    get: mid => Msgx.reacts[mid] || [],
    // Phần nội dung trong bong bóng: chữ + tệp, hoặc dòng "đã thu hồi"
    body(text, media, recalled, edited) {
      if (recalled) return '<span class="rc">Tin nhắn đã được thu hồi</span>';
      return (media && media.length && Attach.isPh(text) ? '' : `<span>${e(text)}</span>`) + Attach.html(media) + (edited ? '<small class="ed-tag">đã chỉnh sửa</small>' : '');
    },
    // Hàng cảm xúc + nút ☺ dưới bong bóng
    foot(id, list, uid, mine, recalled) {
      if (recalled) return '';
      const chips = Object.keys(KINDS).map(k => {
        const c = (list || []).filter(r => r.k === k); if (!c.length) return '';
        return `<button type="button" class="rx-chip${c.some(r => r.uid === uid) ? ' on' : ''}" data-react="${k}" data-mid="${e(id)}" title="${KLABEL[k]}">${KINDS[k]} ${c.length}</button>`;
      }).join('');
      return `<div class="rx-foot">${chips}<button type="button" class="rx-btn" data-rx="${e(id)}" data-mine="${mine ? 1 : 0}" aria-label="Thả cảm xúc${mine ? ' hoặc thu hồi' : ''}" title="Thả cảm xúc${mine ? ' / thu hồi' : ''}">☺</button></div>`;
    },
    chips(id, list, uid) {                              // cảm xúc bám mép bong bóng
      return Object.keys(KINDS).map(k => {
        const c = (list || []).filter(r => r.k === k); if (!c.length) return '';
        return `<button type="button" class="rx-chip${c.some(r => r.uid === uid) ? ' on' : ''}" data-react="${k}" data-mid="${e(id)}" title="${KLABEL[k]}">${KINDS[k]}${c.length > 1 ? ' ' + c.length : ''}</button>`;
      }).join('');
    },
    actbtn(id, mine) {                                  // nút ☺ (thả cảm xúc) + ⋮ (chỉnh sửa / thu hồi, chỉ tin của mình) cạnh bong bóng
      return `<button type="button" class="rx-btn" data-rx="${e(id)}" data-mine="0" aria-label="Thả cảm xúc" title="Thả cảm xúc">☺</button>`
        + (mine ? `<button type="button" class="rx-btn rx-more" data-more="${e(id)}" aria-label="Tuỳ chọn tin nhắn" title="Chỉnh sửa / thu hồi"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg></button>` : '');
    },
    more(btn) {                                         // menu ⋮: Chỉnh sửa / Thu hồi
      if (toggled(btn)) return;
      const mid = btn.dataset.more, c = this.ctx || {}, m = !isAi(mid) && c.find && c.find(mid);
      const canEdit = !!m && !m.recalled && !(m.media && m.media.length && Attach.isPh(m.text));
      const p = document.createElement('div'); p.id = 'msgMenu'; p.setAttribute('role', 'menu');
      p.innerHTML = (canEdit ? `<button type="button" data-edit="${e(mid)}" role="menuitem">✏️ Chỉnh sửa</button>` : '') + `<button type="button" class="mm-del" data-recall="${e(mid)}" role="menuitem">↩ Thu hồi</button>`;
      openFloat(p, btn);
    },
    edit(mid) {
      const c = this.ctx || {}; if (isAi(mid)) return say('Tin nhắn gửi trợ lý chưa chỉnh sửa được, bạn có thể thu hồi.');
      const m = c.find && c.find(mid); if (!m || m.recalled) return;
      const old = document.getElementById('msgEdit'); if (old) old.remove();
      const ov = document.createElement('div'); ov.id = 'msgEdit'; ov.className = 'me-ov';
      ov.innerHTML = '<div class="me-card" role="dialog" aria-label="Chỉnh sửa tin nhắn"><h4>Chỉnh sửa tin nhắn</h4><textarea maxlength="1000" rows="4"></textarea><div class="me-act"><button type="button" class="me-no">Huỷ</button><button type="button" class="me-ok">Lưu</button></div></div>';
      document.body.appendChild(ov);
      const ta = ov.querySelector('textarea'), ok = ov.querySelector('.me-ok'), close = () => ov.remove();
      ta.value = Attach.isPh(m.text) ? '' : (m.text || ''); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
      ov.addEventListener('click', ev => { if (ev.target === ov || ev.target.closest('.me-no')) close(); });
      ta.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) ok.click(); });
      ok.onclick = async () => {
        const txt = ta.value.trim();
        if (!txt) return say('Nội dung không được để trống. Muốn xoá tin hãy chọn Thu hồi.');
        if (txt === m.text) return close();
        ok.disabled = true; ok.textContent = 'Đang lưu…';
        try { await Store.put('messages', { id: m.id, uid: m.uid, userName: m.userName || '', from: m.from, ts: m.ts, text: txt, edited: true, ...(m.media && m.media.length ? { media: m.media } : {}), projectId: m.projectId || '', projectName: m.projectName || '' }); close(); }
        catch (x) { ok.disabled = false; ok.textContent = 'Lưu'; say(x.message || 'Chưa lưu được'); }
      };
    },
    pop(btn) {
      if (toggled(btn)) return;
      const mid = btn.dataset.rx, p = document.createElement('div'); p.id = 'rxPop'; p.setAttribute('role', 'menu');
      p.innerHTML = Object.keys(KINDS).map(k => `<button type="button" data-react="${k}" data-mid="${e(mid)}" title="${KLABEL[k]}">${KINDS[k]}</button>`).join('')
;
      openFloat(p, btn);
    },
    async react(mid, k) {
      const c = this.ctx || {}; if (!KINDS[k]) return;
      if (isAi(mid)) return c.ai && c.ai.react(+String(mid).slice(3), k);
      const uid = c.uid && c.uid(); if (!uid) return say('Hãy đăng nhập để thả cảm xúc');
      const th = c.th && c.th(mid); if (!th) return;
      const prev = this.get(mid), list = prev.slice(), i = list.findIndex(r => r.uid === uid), old = i >= 0 ? list[i] : null, id = mid + '_' + uid, same = !!old && old.k === k;
      if (same) list.splice(i, 1); else if (old) list[i] = { uid, k }; else list.push({ uid, k });
      this.reacts[mid] = list; if (c.redraw) c.redraw();                       // hiện ngay, ghi lên máy chủ sau
      try { if (same) await Store.del('reacts', id); else await Store.put('reacts', { id, mid, uid, th, k, ts: Date.now() }); }
      catch (x) { this.reacts[mid] = prev; if (c.redraw) c.redraw(); say(x.message || 'Chưa thả được cảm xúc'); }
    },
    async recall(mid) {
      const c = this.ctx || {};
      if (isAi(mid)) return c.ai && c.ai.recall(+String(mid).slice(3));
      const m = c.find && c.find(mid); if (!m) return;
      if (!confirm('Thu hồi tin nhắn này? Nội dung sẽ bị xoá khỏi cuộc trò chuyện.')) return;
      try {
        await Store.put('messages', { id: m.id, uid: m.uid, userName: m.userName || '', from: m.from, ts: m.ts, text: '', recalled: true, projectId: m.projectId || '', projectName: m.projectName || '' });
        for (const x of (m.media || [])) if (x && x.mid && MID.test(x.mid)) for (let i = 0; i < Math.min(MAX_CHUNKS, +x.n || 1); i++) { try { await Store.del('chunks', x.mid + '_' + i); } catch (_) { /* không xoá được thì bỏ qua */ } }
      } catch (x) { say(x.message || 'Chưa thu hồi được'); }
    }
  };

  /* ---------- Sự kiện chung ---------- */
  document.addEventListener('click', async ev => {
    const t = ev.target; if (!t.closest) return;
    const rxb = t.closest('[data-rx]'); if (rxb) { Msgx.pop(rxb); return; }
    const mb = t.closest('[data-more]'); if (mb) { Msgx.more(mb); return; }
    const ed = t.closest('[data-edit]'); if (ed) { closeFloat(); Msgx.edit(ed.dataset.edit); return; }
    const rk = t.closest('[data-react]'); if (rk) { closeFloat(); Msgx.react(rk.dataset.mid, rk.dataset.react); return; }
    const rc = t.closest('[data-recall]'); if (rc) { closeFloat(); Msgx.recall(rc.dataset.recall); return; }
    if (floatEl && !floatEl.contains(t) && !t.closest('.at-btn')) closeFloat();

    const b = t.closest('[data-at-mid]'); if (!b || b.disabled) return;           // bấm xem video / nghe thoại / tải tệp
    const kind = b.dataset.kind || 'video', label = b.innerHTML; b.disabled = true; b.textContent = 'Đang tải…';
    try {
      const url = await Attach.load(b.dataset.atMid, Math.min(MAX_CHUNKS, +b.dataset.n || 1), kind === 'file' ? 'application/octet-stream' : b.dataset.mime);
      if (kind === 'file') {
        const nm = b.dataset.name || 'tep', dl = document.createElement('a'); dl.href = url; dl.download = nm; document.body.appendChild(dl); dl.click(); dl.remove();
        if (b.isConnected) { const a = document.createElement('a'); a.className = 'at-load'; a.href = url; a.download = nm; a.innerHTML = label; b.replaceWith(a); }
      } else {
        const v = document.createElement(kind === 'audio' ? 'audio' : 'video'); v.className = kind === 'audio' ? 'at-aud' : 'at-vid'; v.controls = true; if (kind === 'video') v.playsInline = true; v.src = url;
        if (b.isConnected) { b.replaceWith(v); v.play().catch(() => {}); }
      }
    } catch (x) { b.disabled = false; b.innerHTML = label; say(x.message || 'Không tải được'); }
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeFloat(); });
  addEventListener('resize', closeFloat); addEventListener('scroll', ev => { if (floatEl && !floatEl.contains(ev.target)) closeFloat(); }, true);

  const css = document.createElement('style');
  css.textContent = `
.at-tray{display:flex;flex-wrap:wrap;gap:8px;padding:8px 10px;background:#f8fafc;border-top:1px solid #e2e8f0}
.at-tray[hidden]{display:none}
.at-th{position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid #cbd5e1;background:#0f172a}
.at-th.at-fl{background:#e0f2fe;border-color:#bae6fd}
.at-th img,.at-th video{width:100%;height:100%;object-fit:cover;display:block}
.at-th .at-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#fff;font-size:1.1rem;text-shadow:0 1px 4px #000;pointer-events:none}
.at-th .at-ico{position:absolute;left:0;right:0;top:10px;text-align:center;font-size:1.5rem}
.at-th small{position:absolute;left:0;right:0;bottom:0;background:rgba(15,23,42,.65);color:#fff;font-size:.6rem;text-align:center;padding:1px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button.at-rm{position:absolute;top:2px;right:2px;width:20px;height:20px;padding:0;border:0;border-radius:50%;background:rgba(15,23,42,.75);color:#fff;font-size:.95rem;line-height:1;cursor:pointer}
.at-menu,.emo-panel,#rxPop{position:fixed;z-index:90;background:#fff;border:1px solid #e2e8f0;box-shadow:0 14px 34px rgba(15,23,42,.22)}
.at-menu{display:flex;flex-direction:column;padding:6px;border-radius:14px;min-width:170px}
.at-menu button{border:0;background:none;text-align:left;padding:9px 12px;border-radius:9px;font:inherit;font-size:.9rem;color:#0f172a;cursor:pointer}
.at-menu button:hover{background:#f0f9ff}
.emo-panel{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:8px;border-radius:14px;width:min(320px,calc(100vw - 16px));max-height:230px;overflow-y:auto}
.emo-panel button{border:0;background:none;font-size:1.3rem;padding:4px 0;border-radius:8px;cursor:pointer}
.emo-panel button:hover{background:#f0f9ff}
#rxPop{display:flex;align-items:center;gap:2px;border-radius:99px;padding:5px 8px}
#rxPop button{border:0;background:none;font-size:1.5rem;line-height:1;cursor:pointer;padding:3px 6px;border-radius:50%;transition:transform .12s}
#rxPop button:hover{transform:scale(1.25)}
#rxPop button.rx-rc{font-size:.8rem;font-weight:700;color:#be123c;padding:6px 10px;border-radius:99px;margin-left:4px;background:#fff1f2}
.rx-foot{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-top:4px}
.rx-chip{border:1px solid rgba(15,23,42,.14);background:rgba(255,255,255,.9);color:#334155;border-radius:99px;padding:1px 8px;font-size:.78rem;line-height:1.5;cursor:pointer}
.rx-chip.on{border-color:#0284c7;background:#e0f2fe;color:#075985}
.rx-btn{margin-left:auto;border:0;background:none;font-size:.95rem;line-height:1;opacity:0;cursor:pointer;padding:2px 4px;color:inherit;transition:opacity .15s}
.pp-msg:hover .rx-btn,.msg:hover .rx-btn,.rx-btn:focus{opacity:.7}
@media(hover:none){.rx-btn{opacity:.55}}
.rc{font-style:italic;opacity:.65}
.at-media{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.at-img{max-width:240px;width:100%;max-height:220px;border-radius:12px;cursor:zoom-in;display:block;object-fit:cover}
.at-vid{width:260px;max-width:100%;max-height:300px;border-radius:12px;background:#000;display:block}
.at-aud{width:230px;max-width:100%;height:38px;display:block}
.at-load{display:inline-block;border:0;border-radius:12px;background:rgba(15,23,42,.08);padding:10px 14px;font:inherit;font-weight:700;color:inherit;cursor:pointer;text-align:left;text-decoration:none;word-break:break-all}
.me .at-load{background:rgba(255,255,255,.22)}
.at-load[data-kind=video]{background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;box-shadow:0 2px 8px rgba(99,102,241,.35)}   /* luôn nhìn thấy, kể cả khi bong bóng không có nền (tin chỉ có video) */
.at-load[data-kind=video]:hover{filter:brightness(1.08)}
.rx-btn.rx-undo:hover{color:#be123c}
.rx-btn.rx-more{display:inline-flex;align-items:center;justify-content:center}
#msgMenu{position:fixed;z-index:90;display:flex;flex-direction:column;min-width:160px;padding:6px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 14px 34px rgba(15,23,42,.22)}
#msgMenu button{border:0;background:none;text-align:left;padding:9px 12px;border-radius:9px;font:inherit;font-size:.9rem;color:#0f172a;cursor:pointer}
#msgMenu button:hover{background:#f0f9ff}
#msgMenu button.mm-del{color:#be123c}#msgMenu button.mm-del:hover{background:#fff1f2}
.ed-tag{display:block;margin-top:2px;font-size:.68rem;opacity:.7}
.me-ov{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55)}
.me-card{width:100%;max-width:420px;padding:18px;border-radius:16px;background:#fff;color:#0f172a;box-shadow:0 24px 60px rgba(2,6,23,.4)}
.me-card h4{margin:0 0 10px;font-size:1.02rem;font-weight:800}
.me-card textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:12px;resize:vertical;min-height:90px;background:#fff;color:#0f172a;outline:0}
.me-card textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2)}
.me-act{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.me-act button{border:0;border-radius:99px;padding:9px 20px;font:inherit;font-weight:700;cursor:pointer;background:#f1f5f9;color:#334155}
.me-act .me-ok{background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff}
.me-act button:disabled{opacity:.6;cursor:default}
/* --- giao diện tối cho các menu nổi / khay đính kèm --- */
html[data-theme=dark] .at-menu,html[data-theme=dark] .emo-panel,html[data-theme=dark] #rxPop,html[data-theme=dark] #msgMenu{background:#111c31;border-color:#26364f;box-shadow:0 14px 34px rgba(0,0,0,.55)}
html[data-theme=dark] .at-menu button,html[data-theme=dark] #msgMenu button{color:#e2e8f0}
html[data-theme=dark] .at-menu button:hover,html[data-theme=dark] .emo-panel button:hover,html[data-theme=dark] #msgMenu button:hover{background:#1e293b}
html[data-theme=dark] #msgMenu button.mm-del{color:#fca5a5}
html[data-theme=dark] #rxPop button.rx-rc{background:#3b1220;color:#fda4af}
html[data-theme=dark] .at-tray{background:#0f1a2e;border-color:#26364f}
html[data-theme=dark] .at-th{border-color:#334155}
html[data-theme=dark] .at-th.at-fl{background:#0c3a4a;border-color:#155e75}
html[data-theme=dark] .rx-chip{background:#1e293b;border-color:#334155;color:#e2e8f0}
html[data-theme=dark] .rx-chip.on{background:#0c4a6e;border-color:#38bdf8;color:#e0f2fe}
html[data-theme=dark] .vc-bar{background:#0f1a2e}
html[data-theme=dark] .vc-t{color:#e2e8f0}
html[data-theme=dark] .vc-hint{color:#94a3b8}
html[data-theme=dark] .vc-bar button.vc-x{background:#1e293b;color:#e2e8f0}
html[data-theme=dark] .at-load{background:rgba(255,255,255,.1);color:#e2e8f0}
html[data-theme=dark] .me-card{background:#111c31;color:#e2e8f0}
html[data-theme=dark] .me-card textarea{background:#0b1220;color:#e2e8f0;border-color:#334155}
html[data-theme=dark] .me-act button{background:#1e293b;color:#e2e8f0}
html[data-theme=dark] .me-act .me-ok{background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff}
.vc-bar{position:absolute;inset:0;z-index:6;display:flex;align-items:center;gap:10px;padding:6px 12px;background:#fff;border-radius:inherit}
.vc-bar[hidden]{display:none}
.vc-dot{flex:none;width:10px;height:10px;border-radius:50%;background:#ef4444;animation:vcp 1s ease-in-out infinite}
@keyframes vcp{50%{opacity:.25}}
.vc-t{font-variant-numeric:tabular-nums;color:#0f172a}
.vc-hint{flex:1;font-size:.8rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vc-bar button.vc-x{flex:none;border:0;background:#f1f5f9;border-radius:50%;width:34px;height:34px;font-size:1rem;cursor:pointer;padding:0}
.vc-bar button.vc-send{flex:none;border:0;border-radius:99px;background:#0284c7;color:#fff;font:inherit;font-weight:700;padding:8px 18px;cursor:pointer}
.at-drag::after{content:attr(data-drop);position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(2,132,199,.9);color:#fff;font-weight:800;font-size:1.1rem;border:3px dashed #fff;border-radius:inherit;pointer-events:none}`;
  document.head.appendChild(css);
})();
