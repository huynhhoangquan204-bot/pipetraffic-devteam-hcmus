/* ===== Đính kèm ảnh / video trong chat (khung chat người dùng + trang admin) =====
   Cách gửi: nút 📎 (chọn từ thiết bị) · kéo thả vào khung chat · dán bằng Ctrl+V.
   Lưu trữ (không cần Firebase Storage):
   - Ảnh: nén còn ~260KB rồi lưu thẳng trong tin nhắn (trường "media").
   - Video: tối đa 6MB (chế độ thử: 1,2MB), cắt thành mảnh ~700KB lưu ở bộ sưu tập "chunks"; chỉ tải về xem khi bấm "Xem video".
   - Chat với AI: tệp chỉ hiện tại máy này, không lưu lên máy chủ, và AI CHƯA xem được ảnh/video. */
(function () {
  'use strict';
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ATT_TXT = '📎 Tệp đính kèm';                 // nội dung chữ khi gửi tệp mà không gõ gì
  const MAX_FILES = 4, CHUNK = 700000, MAX_INLINE = 880000;
  const maxVideo = () => (window.Store && Store.mode === 'demo') ? 1200000 : 6 * 1024 * 1024;
  const IMG_OK = /^data:image\/(jpeg|png|webp|gif);base64,/i;
  const MIME_OK = /^video\/(mp4|webm|ogg|quicktime|x-m4v|3gpp)$/i;
  const cache = {};                                    // mid -> blob URL (video đã tải)
  const size = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const say = m => { try { if (typeof toast === 'function') return toast(m); } catch (x) { /* dùng alert */ } alert(m); };

  async function upload(it, uid, prog) {
    const dataUrl = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('Không đọc được video')); r.readAsDataURL(it.file); });
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1), n = Math.ceil(b64.length / CHUNK);
    const mid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), done = [];
    try {
      for (let i = 0; i < n; i++) {
        const id = mid + '_' + i;
        await Store.put('chunks', { id, mid, i, uid, data: b64.slice(i * CHUNK, (i + 1) * CHUNK), ts: Date.now() + i });
        done.push(id); if (prog) prog(i + 1, n);
      }
    } catch (x) { for (const id of done) { try { await Store.del('chunks', id); } catch (_) { /* không xoá được thì bỏ qua */ } } throw x; }
    return { t: 'video', mid, n, mime: it.mime, size: it.size, name: String(it.name || '').slice(0, 60) };
  }

  const Attach = window.Attach = {
    ATT_TXT,

    // HTML hiển thị danh sách tệp của một tin nhắn (đã kiểm tra dữ liệu, an toàn khi hiện tin của người khác)
    html(list) {
      if (!Array.isArray(list) || !list.length) return '';
      return '<div class="at-media">' + list.slice(0, 6).map(m => {
        if (!m) return '';
        if (m.t === 'img' && IMG_OK.test(m.src || '')) return `<img class="at-img" src="${e(m.src)}" alt="Ảnh đính kèm" loading="lazy" onclick="Media.open(this.src)">`;
        if (m.t === 'video') {
          if (m.mid && /^[\w-]{6,40}$/.test(m.mid)) {
            if (cache[m.mid]) return `<video class="at-vid" controls playsinline preload="metadata" src="${e(cache[m.mid])}"></video>`;
            const mime = MIME_OK.test(m.mime || '') ? m.mime : 'video/mp4';
            return `<button type="button" class="at-load" data-at-mid="${e(m.mid)}" data-n="${Math.min(16, Math.max(1, +m.n || 1))}" data-mime="${e(mime)}">▶ Xem video${m.size ? ' · ' + size(+m.size) : ''}</button>`;
          }
          if (/^blob:/.test(m.src || '')) return `<video class="at-vid" controls playsinline preload="metadata" src="${e(m.src)}"></video>`;
        }
        return '';
      }).join('') + '</div>';
    },

    // Tải các mảnh video về, ghép lại thành blob URL
    async load(mid, n, mime) {
      if (cache[mid]) return cache[mid];
      const parts = await Promise.all(Array.from({ length: n }, (_, i) => Store.get('chunks', mid + '_' + i)));
      if (parts.some(p => !p || typeof p.data !== 'string')) throw new Error('Video chưa tải đủ hoặc đã bị xoá.');
      const bufs = parts.map(p => { const bin = atob(p.data), a = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k); return a; });
      return cache[mid] = URL.createObjectURL(new Blob(bufs, { type: mime }));
    },

    // Gắn bộ soạn tệp vào một form chat. opts: { form, text (ô nhập, có thể null), zone (vùng kéo thả), label }
    composer(opts) {
      const form = opts.form, text = opts.text || null;
      if (!form) return null;
      if (form._at) return form._at;
      const items = [];
      const tray = document.createElement('div'); tray.className = 'at-tray'; tray.hidden = true;
      form.parentNode.insertBefore(tray, form);
      const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*,video/*'; file.multiple = true; file.hidden = true;
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'at-btn' + (opts.label ? ' at-lbl' : '');
      btn.title = 'Đính kèm ảnh / video (cũng có thể kéo thả hoặc dán bằng Ctrl+V)'; btn.setAttribute('aria-label', 'Đính kèm ảnh hoặc video');
      btn.textContent = '📎' + (opts.label ? ' ' + opts.label : '');
      const submit = form.querySelector('button[type=submit], button:not([type])');
      form.insertBefore(btn, submit); form.appendChild(file);

      const draw = () => {
        tray.hidden = !items.length;
        tray.innerHTML = items.map((it, i) => `<div class="at-th">${it.t === 'img' ? `<img src="${e(it.src)}" alt="">` : `<video src="${e(it.url)}" muted preload="metadata"></video><span class="at-play">▶</span><small>${size(it.size)}</small>`}<button type="button" class="at-rm" data-rm="${i}" aria-label="Bỏ tệp này">×</button></div>`).join('');
      };
      async function add(fs) {
        if (text && text.disabled) return;
        for (const f of [...fs]) {
          if (items.length >= MAX_FILES) { say('Tối đa ' + MAX_FILES + ' tệp mỗi tin nhắn'); break; }
          try {
            const type = String(f.type || '').split(';')[0];
            if (/^image\//.test(type)) items.push({ t: 'img', src: await Media.image(f), name: f.name });
            else if (/^video\//.test(type)) {
              if (!MIME_OK.test(type)) throw new Error('Định dạng video chưa hỗ trợ (hãy dùng MP4 hoặc WebM)');
              if (f.size > maxVideo()) throw new Error('Video "' + f.name + '" nặng ' + size(f.size) + ', tối đa ' + size(maxVideo()) + '. Video dài hơn hãy đưa lên YouTube/Drive rồi dán link.');
              items.push({ t: 'video', file: f, url: URL.createObjectURL(f), name: f.name, size: f.size, mime: type });
            } else throw new Error('Chỉ gửi được ảnh hoặc video');
          } catch (x) { say(x.message || 'Không thêm được tệp'); }
        }
        draw();
      }
      const ctl = form._at = {
        add, has: () => items.length > 0, count: () => items.length,
        clear() { items.splice(0).forEach(it => { if (it.t === 'video' && !it.keep) URL.revokeObjectURL(it.url); }); draw(); },
        // Trả về mảng media để lưu vào tin nhắn. local:true = chat AI, không tải lên máy chủ
        async build(o = {}) {
          const inline = items.filter(i => i.t === 'img').reduce((s, i) => s + i.src.length, 0);
          if (inline > MAX_INLINE) throw new Error('Ảnh quá nặng cho một tin nhắn, hãy gửi ít ảnh hơn.');
          const out = [];
          for (const it of items) {
            if (it.t === 'img') out.push({ t: 'img', src: it.src });
            else if (o.local) { it.keep = true; out.push({ t: 'video', src: it.url }); }
            else out.push(await upload(it, o.uid, o.progress));
          }
          return out;
        }
      };

      btn.onclick = () => { if (!(text && text.disabled)) file.click(); };
      file.onchange = () => { add(file.files); file.value = ''; };
      tray.addEventListener('click', ev => { const r = ev.target.closest('[data-rm]'); if (!r) return; const it = items.splice(+r.dataset.rm, 1)[0]; if (it && it.t === 'video') URL.revokeObjectURL(it.url); draw(); });

      const z = opts.zone || form;
      if (getComputedStyle(z).position === 'static') z.style.position = 'relative';
      z.dataset.drop = 'Thả ảnh / video vào đây';
      z.addEventListener('paste', ev => {                                   // Ctrl+V: ảnh chụp màn hình, ảnh/video copy từ nơi khác
        const fs = [...((ev.clipboardData && ev.clipboardData.files) || [])].filter(f => /^(image|video)\//.test(f.type));
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

  // Bấm "Xem video": tải các mảnh về rồi phát
  document.addEventListener('click', async ev => {
    const b = ev.target.closest && ev.target.closest('[data-at-mid]'); if (!b || b.disabled) return;
    const label = b.textContent; b.disabled = true; b.textContent = 'Đang tải video…';
    try {
      const url = await Attach.load(b.dataset.atMid, Math.min(16, +b.dataset.n || 1), b.dataset.mime);
      const v = document.createElement('video'); v.className = 'at-vid'; v.controls = true; v.playsInline = true; v.src = url;
      if (b.isConnected) { b.replaceWith(v); v.play().catch(() => {}); }
    } catch (x) { b.disabled = false; b.textContent = label; say(x.message || 'Không tải được video'); }
  });

  const css = document.createElement('style');
  css.textContent = `
.at-tray{display:flex;flex-wrap:wrap;gap:8px;padding:8px 10px;background:#f8fafc;border-top:1px solid #e2e8f0}
.at-tray[hidden]{display:none}
.at-th{position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid #cbd5e1;background:#0f172a}
.at-th img,.at-th video{width:100%;height:100%;object-fit:cover;display:block}
.at-th .at-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#fff;font-size:1.1rem;text-shadow:0 1px 4px #000;pointer-events:none}
.at-th small{position:absolute;left:0;right:0;bottom:0;background:rgba(15,23,42,.65);color:#fff;font-size:.6rem;text-align:center;padding:1px 0}
button.at-rm{position:absolute;top:2px;right:2px;width:20px;height:20px;padding:0;border:0;border-radius:50%;background:rgba(15,23,42,.75);color:#fff;font-size:.95rem;line-height:1;cursor:pointer}
button.at-btn.at-btn{flex:none;width:40px;padding:0;border:1px solid #cbd5e1;border-radius:99px;background:#fff;color:#475569;font-size:1.05rem;font-weight:400;cursor:pointer}
button.at-btn.at-lbl{width:auto;padding:8px 14px;margin:8px 8px 0 0;border-radius:10px;font-size:.9rem;font-weight:600}
button.at-btn:hover{background:#f0f9ff;border-color:#7dd3fc}
.pp-form input:disabled + .at-btn{opacity:.4;pointer-events:none}
.at-media{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.at-img{max-width:240px;width:100%;max-height:220px;border-radius:12px;cursor:zoom-in;display:block;object-fit:cover}
.at-vid{max-width:260px;width:100%;max-height:260px;border-radius:12px;background:#000;display:block}
button.at-load{border:0;border-radius:12px;background:rgba(15,23,42,.08);padding:10px 14px;font:inherit;font-weight:700;color:inherit;cursor:pointer;text-align:left}
.me button.at-load{background:rgba(255,255,255,.22)}
.at-drag::after{content:attr(data-drop);position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(2,132,199,.9);color:#fff;font-weight:800;font-size:1.1rem;border:3px dashed #fff;border-radius:inherit;pointer-events:none}`;
  document.head.appendChild(css);
})();
