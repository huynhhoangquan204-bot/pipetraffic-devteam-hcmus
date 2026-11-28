/* ===== Giao diện chat kiểu Messenger (khung chat người dùng + hội thoại bên admin) =====
   - Tin của mình nằm bên phải, màu gradient xanh → tím → hồng chạy theo vị trí trong khung (như Messenger).
   - Tin của người kia nằm bên trái, nền xám, avatar nhỏ chỉ hiện ở tin cuối của mỗi cụm.
   - Các tin liền nhau được gom thành cụm (bo góc liền mạch), có mốc giờ ở giữa khi cách nhau lâu.
   - Emoji đứng một mình hiện to không nền; ảnh / video không có nền bong bóng; cảm xúc bám ở mép dưới bong bóng.
   - Trợ lý đang trả lời: hiện ba chấm nhấp nháy. Ô nhập: ＋ 🖼 🎤 | ô "Aa" + 😊 | 👍 (hoặc nút gửi khi đã gõ).
   Dùng: Chat.render(items) -> HTML; Chat.paint(logEl) sau khi gán innerHTML; Chat.header(tab, msgs). */
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GAP_GROUP = 5 * 60e3, GAP_SEP = 15 * 60e3;
  const day = ts => new Date(ts).toDateString();
  const hm = ts => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const sep = ts => {
    const d = new Date(ts), now = new Date(), y = new Date(now.getTime() - 864e5);
    if (d.toDateString() === now.toDateString()) return 'Hôm nay ' + hm(ts);
    if (d.toDateString() === y.toDateString()) return 'Hôm qua ' + hm(ts);
    return d.toLocaleDateString('vi-VN') + ' ' + hm(ts);
  };
  const rel = ts => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'vừa xong'; if (m < 60) return m + ' phút trước';
    const h = Math.floor(m / 60); if (h < 24) return h + ' giờ trước';
    return Math.floor(h / 24) + ' ngày trước';
  };
  let EMO = null; try { EMO = new RegExp('^(?:\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}|\\p{Emoji_Modifier})*\\s*){1,3}$', 'u'); } catch (x) { /* trình duyệt cũ: bỏ qua emoji to */ }
  const isBig = (text, media) => !!EMO && !(media && media.length) && EMO.test(String(text || '').trim());

  function row(m, pos, isNew) {
    const me = m.who === 'me', rc = !!m.recalled, big = !rc && isBig(m.text, m.media);
    const mo = !rc && !!(m.media && m.media.length) && Attach.isPh(m.text) && m.media.every(x => x && (x.t === 'img' || x.t === 'video'));
    const chips = rc || m.noact ? '' : Msgx.chips(m.id, m.list, m.uid);
    const lk = big && +m.lk > 1 ? Math.min(5.6, 2.4 + (Math.min(3, +m.lk) - 1) * 1.6) : 0;   // 👍 giữ lâu thì to hơn
    const cls = ['ms-b', big && 'ms-big', mo && 'ms-mo', rc && 'ms-rc'].filter(Boolean).join(' ');
    return `<div class="ms-row ${me ? 'me' : 'them'}${m.who === 'ai' ? ' ai' : ''} p-${pos}${isNew ? ' new' : ''}${chips ? ' has-rx' : ''}">`
      + (me ? '' : `<div class="ms-av">${pos === 'last' || pos === 'single' ? (m.av || '') : ''}</div>`)
      + `<div class="ms-col"><div class="${cls}"${lk ? ` style="font-size:${lk.toFixed(2)}rem"` : ''} title="${esc(m.ts ? new Date(m.ts).toLocaleString('vi-VN') : '')}">${Msgx.body(m.text, m.media, rc, m.edited)}${chips ? `<div class="ms-rx">${chips}</div>` : ''}</div></div>`
      + (rc || m.noact ? '' : `<div class="ms-act">${Msgx.actbtn(m.id, m.mine)}</div>`) + '</div>';
  }

  const Chat = window.Chat = {
    rel, sep,
    // items: [{ id, who:'me'|'them'|'ai', mine, ts, text, media, recalled, list (cảm xúc), uid, av (HTML avatar người kia) }]
    render(items) {
      let html = '', prev = null;
      (items || []).forEach((m, i) => {
        const nx = items[i + 1], t = m.ts || 0;
        const newSep = !!t && (!prev || !prev.ts || t - prev.ts > GAP_SEP || day(t) !== day(prev.ts));
        if (newSep) html += `<div class="ms-sep">${esc(sep(t))}</div>`;
        const near = (a, b) => !!a.ts && !!b.ts ? (b.ts - a.ts <= GAP_GROUP && day(a.ts) === day(b.ts)) : true;
        const sameP = !!prev && !newSep && prev.who === m.who && near(prev, m);
        const sameN = !!nx && nx.who === m.who && near(m, nx);
        html += row(m, !sameP && !sameN ? 'single' : !sameP ? 'first' : !sameN ? 'last' : 'mid', !sameP && !!prev);
        prev = m;
      });
      return html;
    },
    typing(av) { return `<div class="ms-row them p-single new ms-typing"><div class="ms-av">${av || ''}</div><div class="ms-col"><div class="ms-b"><i></i><i></i><i></i></div></div></div>`; },

    // Gradient của bong bóng mình gửi chạy theo vị trí trong khung nhìn
    paint(log) {
      if (!log) return;
      if (!log._w) { log._w = 1; let q = 0; log.addEventListener('scroll', () => { if (!q) q = requestAnimationFrame(() => { q = 0; Chat.paint(log); }); }, { passive: true }); }
      const h = log.clientHeight; if (!h) return;
      const top = log.getBoundingClientRect().top;
      log.querySelectorAll('.ms-row.me .ms-b').forEach(b => {
        if (b.classList.contains('ms-big') || b.classList.contains('ms-mo') || b.classList.contains('ms-rc')) return;
        b.style.backgroundSize = '100% ' + h + 'px'; b.style.backgroundPosition = '0 ' + Math.round(top - b.getBoundingClientRect().top) + 'px';
      });
    },

    // Tiêu đề khung chat: avatar + tên + dòng trạng thái theo tab
    header(tab, msgs) {
      const hav = document.getElementById('chatHav'), nm = document.getElementById('chatName'), sb = document.getElementById('chatSub');
      if (!hav || !nm || !sb) return;
      if (tab === 'ai') { hav.innerHTML = Avatar.ai('') + '<i class="dot"></i>'; nm.textContent = 'Trợ lý ảo Pipe Traffic'; sb.textContent = 'Luôn sẵn sàng trả lời'; return; }
      const last = [...(msgs || [])].reverse().find(m => m.from === 'admin' && !m.recalled);
      hav.innerHTML = Avatar.admin(''); nm.textContent = 'Admin Pipe Traffic';
      sb.textContent = last ? 'Admin trả lời ' + rel(last.ts) : 'Nhắn cho admin, bạn sẽ được phản hồi sớm nhất';
    }
  };
  addEventListener('resize', () => document.querySelectorAll('.ms-log').forEach(l => Chat.paint(l)));

  const css = document.createElement('style');
  css.textContent = `
/* ---------- khung chat (popup) ---------- */
#chatPop.pp-chat{border:0;border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.3)}
#chatPop .ms-head{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border-bottom:1px solid #eceef0}
.ms-hav{position:relative;flex:none;width:42px;height:42px}
.ms-hav .av{width:42px;height:42px;font-size:.9rem}
.ms-hav .dot{position:absolute;right:0;bottom:0;width:12px;height:12px;border-radius:50%;background:#31a24c;border:2px solid #fff}
.ms-htx{flex:1;min-width:0}
.ms-htx b{display:block;font-size:1rem;line-height:1.25;color:#050505;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ms-htx small{display:block;font-size:.78rem;color:#65676b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#chatPop .ms-hx{flex:none;width:34px;height:34px;border:0;border-radius:50%;background:#f0f2f5;color:#050505;font-size:1.3rem;line-height:1;cursor:pointer;padding:0}
#chatPop .ms-hx:hover{background:#e4e6eb}
#chatPop .pp-tabs{background:#fff;padding:8px 12px 4px;gap:8px}
#chatPop .pp-tabs button{flex:none;padding:6px 16px;border-radius:99px;background:#f0f2f5;color:#050505;font-size:.85rem;font-weight:600}
#chatPop .pp-tabs button.on{background:#e7f3ff;color:#0866ff;box-shadow:none}

/* ---------- vùng tin nhắn ---------- */
.ms-log{display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:thin}
#chatPop .ms-log{flex:1;gap:0;padding:8px 10px 6px;background:#fff}
.pt-app .ms-log,.adm .ms-log{gap:0;padding:12px 12px 8px;background:#fff;border:1px solid #e4e6eb;border-radius:12px;min-height:300px;max-height:60vh;margin:0 0 10px}
.ms-sep{align-self:center;margin:14px 0 6px;font-size:.72rem;font-weight:600;color:#8a8d91}
.ms-row{position:relative;display:flex;align-items:flex-end;gap:8px;margin-top:2px}
.ms-row.new{margin-top:10px}
.ms-row.me{flex-direction:row-reverse}
.ms-row.has-rx{margin-bottom:13px}
.ms-av{flex:none;width:28px;min-height:1px}
.ms-av .av{width:28px;height:28px;font-size:.7rem}
.ms-col{display:flex;flex-direction:column;min-width:0;max-width:72%}
.ms-row.me .ms-col{align-items:flex-end}
.ms-b{position:relative;max-width:100%;padding:8px 12px;border-radius:14px;background:#f0f0f0;color:#050505;font-size:.95rem;line-height:1.35;word-break:break-word}
.ms-b>span{white-space:pre-wrap}
.ms-row.me .ms-b{background-image:linear-gradient(180deg,#2f80ff 0%,#7a46f0 55%,#d6358f 100%);background-repeat:no-repeat;color:#fff}
.ms-row.them.p-first .ms-b{border-bottom-left-radius:4px}
.ms-row.them.p-mid .ms-b{border-top-left-radius:4px;border-bottom-left-radius:4px}
.ms-row.them.p-last .ms-b{border-top-left-radius:4px}
.ms-row.me.p-first .ms-b{border-bottom-right-radius:4px}
.ms-row.me.p-mid .ms-b{border-top-right-radius:4px;border-bottom-right-radius:4px}
.ms-row.me.p-last .ms-b{border-top-right-radius:4px}
.ms-b.ms-big,.ms-row.me .ms-b.ms-big{background:none;padding:0;font-size:2.4rem;line-height:1.15;color:inherit}
.ms-b.ms-mo,.ms-row.me .ms-b.ms-mo{background:none;padding:0;overflow:visible;border-radius:14px}
.ms-mo .at-media{margin:0}
.ms-mo .at-img,.ms-mo .at-vid{border-radius:14px;max-width:240px}
.ms-b.ms-rc,.ms-row.me .ms-b.ms-rc{background:none;border:1px solid #d0d3d8;color:#8a8d91;font-size:.85rem;font-style:italic}
.ms-b .rc{opacity:1}
.ms-b .at-media{margin-top:0}
.ms-b>span+.at-media{margin-top:6px}

/* cảm xúc + nút ☺ */
.ms-rx{position:absolute;bottom:-12px;display:flex;gap:3px;z-index:1}
.ms-row.me .ms-rx{left:-6px}
.ms-row.them .ms-rx{right:-6px}
.ms-rx .rx-chip{border:0;background:#fff;color:#444;box-shadow:0 1px 4px rgba(0,0,0,.28);border-radius:99px;padding:1px 6px;font-size:.78rem;line-height:1.5;cursor:pointer}
.ms-rx .rx-chip.on{box-shadow:0 0 0 2px #0866ff,0 1px 4px rgba(0,0,0,.2)}
.ms-act{flex:none;align-self:center;display:flex;align-items:center;opacity:0;transition:opacity .15s}
.ms-row:hover .ms-act,.ms-act:focus-within{opacity:1}
@media(hover:none){.ms-act{opacity:.55}}
.ms-act .rx-btn{opacity:1;margin:0;width:28px;height:28px;padding:0;border-radius:50%;background:none;color:#65676b;font-size:1.05rem;display:flex;align-items:center;justify-content:center}
.ms-act .rx-btn:hover{background:#f0f2f5}
.ms-typing .ms-b{display:flex;gap:4px;align-items:center;padding:12px 14px}
.ms-typing i{width:7px;height:7px;border-radius:50%;background:#8a8d91;animation:msd 1.2s infinite ease-in-out}
.ms-typing i:nth-child(2){animation-delay:.18s}.ms-typing i:nth-child(3){animation-delay:.36s}
@keyframes msd{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}
.ms-log .pp-empty{margin:auto}

/* ---------- ô nhập ---------- */
form.ms-form{display:flex;align-items:flex-end;gap:4px;padding:8px 10px 10px;border-top:0;background:#fff}
form.ms-form .ms-tools{display:flex;align-items:center;flex:none;align-self:flex-end;height:38px}
form.ms-form button.at-btn{flex:none;width:34px;height:34px;padding:0;margin:0;border:0;border-radius:50%;background:none;color:#0866ff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
form.ms-form button.at-btn:hover{background:#f0f2f5;border-color:transparent}
form.ms-form button.at-btn svg{width:24px;height:24px;fill:currentColor}
form.ms-form .ms-field{flex:1;min-width:0;display:flex;align-items:center;background:#f0f2f5;border-radius:16px;padding:0 4px 0 14px}
form.ms-form .ms-field input,form.ms-form .ms-field textarea{flex:1;min-width:0;width:auto;margin:0;border:0;border-radius:0;background:none;box-shadow:none;outline:0;padding:9px 0;font:inherit;font-size:16px;line-height:1.3;color:#050505;resize:none;max-height:120px;min-height:0;height:auto;overflow-y:auto}
form.ms-form .ms-field input:disabled,form.ms-form .ms-field textarea:disabled{background:none}
form.ms-form:has(input:disabled) .ms-tools,form.ms-form:has(input:disabled) .ms-field{opacity:.45;pointer-events:none}
form.ms-form button.ms-send{flex:none;align-self:flex-end;width:38px!important;height:38px!important;min-width:0!important;padding:0!important;border:0!important;border-radius:50%!important;background:none!important;box-shadow:none!important;color:#0866ff!important;font-size:1.55rem;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transform:none!important;margin:0!important;min-height:0!important}
form.ms-form button.ms-send:hover{background:#f0f2f5!important}
form.ms-form button.ms-send svg{width:24px;height:24px;fill:currentColor}
form.ms-form button.ms-send .ms-prog{font-size:.7rem;font-weight:700}
form.ms-form button.ms-send:disabled{opacity:.4}
.vc-bar{background:#fff}
/* ---------- MÀU SẮC (xanh dương → tím → hồng, đồng bộ với bong bóng của mình) ---------- */
#chatPop.pp-chat{background:#fbfdff}
#chatPop .ms-head{background:linear-gradient(115deg,#0ea5e9 0%,#6366f1 55%,#d946ef 100%);border-bottom:0}
#chatPop .ms-htx b{color:#fff}
#chatPop .ms-htx small{color:rgba(255,255,255,.88)}
.ms-hav .av{box-shadow:0 0 0 2px rgba(255,255,255,.95)}
.ms-hav .dot{background:#4ade80;border-color:#6366f1}
#chatPop .ms-hx{background:rgba(255,255,255,.22);color:#fff}
#chatPop .ms-hx:hover{background:rgba(255,255,255,.36)}
#chatPop .pp-tabs{background:#eef2ff;padding:8px 12px}
#chatPop .pp-tabs button{background:#fff;color:#4f46e5;box-shadow:0 1px 2px rgba(79,70,229,.18)}
#chatPop .pp-tabs button.on{background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;box-shadow:0 2px 8px rgba(99,102,241,.4)}
#chatPop .ms-log,.pt-app .ms-log,.adm .ms-log{background:radial-gradient(circle at 12% 0%,#e0f2fe 0,rgba(224,242,254,0) 46%),radial-gradient(circle at 100% 100%,#fae8ff 0,rgba(250,232,255,0) 46%),#fbfdff}
.pt-app .ms-log,.adm .ms-log{border-color:#dbeafe}
.ms-sep{padding:2px 10px;border-radius:99px;background:#e0e7ff;color:#4f46e5}
.ms-row.them .ms-b:not(.ms-mo):not(.ms-big):not(.ms-rc){background:linear-gradient(135deg,#eef2ff,#e0f2fe);color:#1e293b;box-shadow:0 1px 2px rgba(15,23,42,.08)}
.ms-row.them.ai .ms-b:not(.ms-mo):not(.ms-big):not(.ms-rc){background:linear-gradient(135deg,#ecfeff,#dcfce7)}
.ms-row.me .ms-b:not(.ms-mo):not(.ms-big):not(.ms-rc){box-shadow:0 2px 6px rgba(99,102,241,.28)}
.ms-typing i{background:#6366f1}
.ms-act .rx-btn:hover{background:#eef2ff}
.ms-rx .rx-chip{box-shadow:0 1px 4px rgba(99,102,241,.35)}
form.ms-form{border-top:1px solid #e0e7ff}
form.ms-form .ms-field{background:#eef2ff;transition:box-shadow .15s,background .15s}
form.ms-form .ms-field:focus-within{background:#e0e7ff;box-shadow:0 0 0 2px #a5b4fc}
form.ms-form .ms-tools button.at-btn:nth-child(1){color:#6366f1}
form.ms-form .ms-tools button.at-btn:nth-child(2){color:#f97316}
form.ms-form button.at-btn.at-emo{color:#f59e0b}
form.ms-form button.at-btn:hover{background:#eef2ff}
form.ms-form button.ms-send{color:#6366f1!important}
form.ms-form button.ms-send:hover{background:#eef2ff!important}
.vc-bar button.vc-send{background:linear-gradient(135deg,#0ea5e9,#6366f1)}
/* ---------- GIAO DIỆN TỐI: khung chat, bong bóng, ô nhập ---------- */
html[data-theme=dark] #chatPop.pp-chat{background:#0f1a2e;border:1px solid #26364f}
html[data-theme=dark] #chatPop .ms-log,html[data-theme=dark] .pt-app .ms-log,html[data-theme=dark] .adm .ms-log{background:radial-gradient(circle at 12% 0%,rgba(14,165,233,.14) 0,rgba(14,165,233,0) 46%),radial-gradient(circle at 100% 100%,rgba(217,70,239,.12) 0,rgba(217,70,239,0) 46%),#0b1424;border-color:#26364f}
html[data-theme=dark] #chatPop .pp-tabs{background:#0f1a2e}
html[data-theme=dark] #chatPop .pp-tabs button{background:#16233b;color:#a5b4fc;box-shadow:none}
html[data-theme=dark] #chatPop .pp-tabs button.on{background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff}
html[data-theme=dark] .ms-sep{background:#1e293b;color:#a5b4fc}
html[data-theme=dark] .ms-row.them .ms-b:not(.ms-mo):not(.ms-big):not(.ms-rc){background:#1e293b;color:#e2e8f0;box-shadow:none}
html[data-theme=dark] .ms-row.them.ai .ms-b:not(.ms-mo):not(.ms-big):not(.ms-rc){background:#10303a}
html[data-theme=dark] .ms-b.ms-rc,html[data-theme=dark] .ms-row.me .ms-b.ms-rc{border-color:#334155;color:#94a3b8}
html[data-theme=dark] .ms-b.ms-big{color:#e2e8f0}
html[data-theme=dark] .ms-rx .rx-chip{background:#1e293b;color:#e2e8f0}
html[data-theme=dark] .ms-act .rx-btn{color:#94a3b8}
html[data-theme=dark] .ms-act .rx-btn:hover{background:#1e293b}
html[data-theme=dark] .ms-typing i{background:#a5b4fc}
html[data-theme=dark] form.ms-form{background:#0f1a2e;border-color:#26364f}
html[data-theme=dark] form.ms-form .ms-field{background:#16233b}
html[data-theme=dark] form.ms-form .ms-field:focus-within{background:#1c2c48;box-shadow:0 0 0 2px #4f46e5}
html[data-theme=dark] form.ms-form .ms-field input,html[data-theme=dark] form.ms-form .ms-field textarea{background:none;color:#e2e8f0;border:0}
html[data-theme=dark] form.ms-form .ms-field input::placeholder,html[data-theme=dark] form.ms-form .ms-field textarea::placeholder{color:#64748b}
html[data-theme=dark] form.ms-form button.at-btn:hover,html[data-theme=dark] form.ms-form button.ms-send:hover{background:#1e293b!important}
html[data-theme=dark] .ms-hav .dot{border-color:#6366f1}`;
  document.head.appendChild(css);
})();
