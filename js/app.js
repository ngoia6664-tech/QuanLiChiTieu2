/* =====================================================================
   APP CHI TIÊU PRO - MODERN FINTECH EDITION
   Toàn bộ mã nguồn chạy trong hàm tự gọi (IIFE).
   Đầy đủ 5 hiệu ứng đỉnh cao:
   1. Nền cực quang đổi màu mè liên tục theo trục cuộn chuột (Scroll Color Morph)
   2. Thẻ 3D Holographic Card với viền LED Conic Border Beam quay quang học
   3. Dynamic Island ghim số dư khi cuộn qua thẻ tổng quan
   4. Lưới Bento Grid với Spotlight rọi viền theo ngón tay / con trỏ chuột
   5. Canvas Confetti ăn mừng & Rung phản hồi Haptic khi tick hoàn thành
   ===================================================================== */
(function(){
'use strict';

/* Khóa lưu dữ liệu trong localStorage */
const KEY = 'chitieu_v1';
let S = load();

/* =============================== LƯU TRỮ =============================== */
function load(){
  try {
    const r = localStorage.getItem(KEY);
    if (r) { const d = JSON.parse(r); if (d && d.months) return d; }
  } catch(e){}
  return { current: null, months: {} };
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }

/* =============================== TIỆN ÍCH ============================== */
function uid(){ return Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-3); }

function iconFor(n){
  const s = String(n || '').toLowerCase();
  const map = [
    [/ăn|cơm|phở|bún|quán|cafe|cà phê/, '🍜'],
    [/\bai\b|claude|gpt|tool/, '🤖'],
    [/gym|thể thao|chạy/, '🏋️'],
    [/nợ|vay|trả góp|tín dụng/, '💸'],
    [/shopee|lazada|tiki|mua sắm/, '🛍️'],
    [/quà|người yêu|đi chơi|hẹn hò/, '🎁'],
    [/nhà|trọ|điện|nước|internet|wifi|hóa đơn/, '🏠'],
    [/xăng|xe|dầu|grab|đi lại/, '🛵'],
    [/học|sách|khóa/, '📚'],
    [/tiết kiệm|để dành|đầu tư/, '🐷'],
    [/sức khỏe|thuốc|khám/, '💊'],
    [/phát sinh|khác/, '🧾']
  ];
  for (let i = 0; i < map.length; i++) if (map[i][0].test(s)) return map[i][1];
  return '💳';
}

function subText(it){
  const p = [];
  if (it.note) p.push(it.note);
  if (!it.amount && it.prev) p.push('tháng trước ' + fmt(it.prev));
  return p.join(' · ');
}

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function fmt(n){
  n = Math.round(n || 0);
  const neg = n < 0;
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + s + 'đ';
}

function parseMoney(v){
  const s = String(v || '').toLowerCase().replace(/\s+/g, '').replace(/đ|vnd|d$/g, '');
  if (!s) return 0;
  const m = s.match(/^([\d.,]+)(k|tr|m|nghin|ngan|trieu)?$/);
  if (!m) return NaN;
  if (m[2]) {
    const num = parseFloat(m[1].replace(',', '.'));
    if (isNaN(num)) return NaN;
    const mul = (m[2] === 'k' || m[2] === 'nghin' || m[2] === 'ngan') ? 1000 : 1000000;
    return Math.round(num * mul);
  }
  const digits = m[1].replace(/[.,]/g, '');
  return parseInt(digits, 10) || 0;
}

function monthKeyNow(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function monthLabel(k){ const p = k.split('-'); return 'Tháng ' + parseInt(p[1], 10) + '/' + p[0]; }
function sortedKeys(){ return Object.keys(S.months).sort(); }

function newMonthData(){
  return { income: 0, goal: 0, extras: [], sections: [
    { id: uid(), name: 'Chi phí cố định', budget: 0, fixed: true, collapsed: false, cats: [
      { id: uid(), name: 'Nhà & hóa đơn', budget: 0, items: [] },
      { id: uid(), name: 'Tiền AI', budget: 0, items: [] }
    ]},
    { id: uid(), name: 'Chi phí bất định', budget: 0, fixed: false, collapsed: false, cats: [
      { id: uid(), name: 'Ăn uống', budget: 0, items: [] },
      { id: uid(), name: 'Phát sinh', budget: 0, items: [] }
    ]}
  ]};
}

function cloneForNext(src){
  const d = JSON.parse(JSON.stringify(src));
  d.note = '';
  d.extras = [];
  if (d.incomeSrc === 'giasu') { d.income = 0; d.incomeSrc = 'manual'; } /* lương gia sư tháng cũ không áp cho tháng mới */
  d.sections.forEach(function(sec){
    sec.id = uid();
    sec.cats.forEach(function(c){
      c.id = uid();
      if (sec.fixed) {
        c.items.forEach(function(it){ it.id = uid(); it.prev = it.amount || it.prev || 0; it.amount = 0; it.paid = false; });
      } else { c.items = []; }
    });
  });
  return d;
}

/* ============================ KHỞI ĐỘNG APP ============================ */
if (!S.seeded) { S.seeded = true; save(); }
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e){}
const IN_APP = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Zalo|Line\/|MicroMessenger|TikTok/i.test(navigator.userAgent || '');

function hasData(){
  return Object.keys(S.months).some(function(k){
    const m = S.months[k];
    return m.income > 0 || (m.extras || []).length || m.sections.some(function(sc){ return sc.cats.some(function(c){ return c.items.length; }); });
  });
}
function todayStr(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

if (!S.mig2) {
  Object.keys(S.months).forEach(function(k){ S.months[k].sections.forEach(function(sc){ if (/cố định/i.test(sc.name)) sc.fixed = true; }); });
  S.mig2 = true; save();
}
if (!sortedKeys().length) { const k0 = monthKeyNow(); S.months[k0] = newMonthData(); S.current = k0; save(); }
if (!S.current || !S.months[S.current]) { const ks = sortedKeys(); S.current = ks.indexOf(monthKeyNow()) >= 0 ? monthKeyNow() : ks[ks.length - 1]; save(); }

/* ========================== TRUY XUẤT DỮ LIỆU ========================== */
function M(){ return S.months[S.current]; }
function findSec(id){ return M().sections.filter(function(s){ return s.id === id; })[0]; }
function findCat(sid, cid){ const s = findSec(sid); return s ? s.cats.filter(function(c){ return c.id === cid; })[0] : null; }
function extrasOf(m){ if (!m.extras) m.extras = []; return m.extras; }
function findExtra(id){ return extrasOf(M()).filter(function(x){ return x.id === id; })[0]; }

/* =============================== TÍNH TOÁN ============================== */
function catTotal(c){ return c.items.reduce(function(a, i){ return a + (i.amount || 0); }, 0); }
function catPaid(c){ return c.items.reduce(function(a, i){ return a + (i.paid ? (i.amount || 0) : 0); }, 0); }
function secTotal(s){ return s.cats.reduce(function(a, c){ return a + catTotal(c); }, 0); }
function secPaid(s){ return s.cats.reduce(function(a, c){ return a + catPaid(c); }, 0); }
function secBudget(s){
  if (s.budget > 0) return s.budget;
  if (!s.cats.length || !s.cats.every(function(c){ return c.budget > 0; })) return 0;
  return s.cats.reduce(function(a, c){ return a + c.budget; }, 0);
}
/* Kế hoạch chi nếu dùng hết ngân sách: mỗi mục lấy max(ngân sách, đã dùng); đề mục lấy max(ngân sách đề mục, tổng các mục) để không tính trùng */
function catPlan(c){ return Math.max(c.budget || 0, catTotal(c)); }
function secPlan(s){ return Math.max(s.budget || 0, s.cats.reduce(function(a, c){ return a + catPlan(c); }, 0)); }
function extraTotal(m){ return extrasOf(m).reduce(function(a, x){ return a + (x.amount || 0); }, 0); }
function extraRecv(m){ return extrasOf(m).reduce(function(a, x){ return a + (x.received ? (x.amount || 0) : 0); }, 0); }

function totals(){
  const m = M();
  let t = 0, p = 0, pl = 0;
  m.sections.forEach(function(s){ t += secTotal(s); p += secPaid(s); pl += secPlan(s); });
  const inc = m.income || 0, ex = extraTotal(m);
  return { total: t, paid: p, unpaid: t - p, plan: pl, income: inc, extra: ex, inflow: inc + ex, goal: m.goal || 0 };
}

function dateLabel(d){ if (!d) return ''; const p = d.split('-'); return p[2] + '/' + p[1]; }
function defaultDate(){
  const now = todayStr();
  return (S.current && now.indexOf(S.current) === 0) ? now : (S.current + '-01');
}
function daysLeft(){
  const d = new Date(), nowM = monthKeyNow();
  if (S.current !== nowM) return 0;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.max(0, last - d.getDate());
}

/* =============================== HỘP THOẠI =============================== */
let modalEl = null;
function openModal(o){
  if (modalEl) modalEl.remove();
  let h = '<div class="ov"><div class="sheet"><h2>' + esc(o.title) + '</h2>';
  o.fields.forEach(function(f, idx){
    h += '<div class="fld' + (f.type === 'checkbox' ? ' cb' : '') + '">';
    if (f.label && f.type !== 'checkbox') h += '<label>' + esc(f.label) + '</label>';
    if (f.type === 'text' || f.type === 'money') {
      h += '<input type="text" data-f="' + idx + '" value="' + esc(f.value != null ? (f.type === 'money' && f.value ? fmt(f.value).replace(/đ$/, '') : f.value) : '') + '" placeholder="' + esc(f.placeholder || '') + '">';
    } else if (f.type === 'month') {
      h += '<input type="month" data-f="' + idx + '" value="' + esc(f.value || '') + '">';
    } else if (f.type === 'date') {
      h += '<input type="date" data-f="' + idx + '" value="' + esc(f.value || '') + '">';
    } else if (f.type === 'textarea') {
      h += '<textarea class="' + (f.plain ? 'plain' : '') + '" data-f="' + idx + '">' + esc(f.value || '') + '</textarea>';
    } else if (f.type === 'select') {
      h += '<select data-f="' + idx + '">' + f.options.map(function(op){ return '<option value="' + esc(op.v) + '"' + (op.v === f.value ? ' selected' : '') + '>' + esc(op.l) + '</option>'; }).join('') + '</select>';
    } else if (f.type === 'checkbox') {
      h += '<input type="checkbox" id="f_' + idx + '" data-f="' + idx + '"' + (f.value ? ' checked' : '') + '><label for="f_' + idx + '">' + esc(f.label) + '</label>';
    }
    if (f.hint) h += '<div class="hint">' + esc(f.hint) + '</div>';
    h += '</div>';
  });
  h += '<div class="btns"><button data-m="cancel">Hủy</button>';
  if (o.onDelete) h += '<button class="del" data-m="del">Xóa</button>';
  h += '<button class="save" data-m="save">' + esc(o.saveLabel || 'Lưu') + '</button></div></div></div>';

  const d = document.createElement('div'); d.innerHTML = h;
  const ov = d.firstChild; document.body.appendChild(ov); modalEl = ov;

  function close(){ ov.classList.add('out'); setTimeout(function(){ if (ov.parentNode) ov.parentNode.removeChild(ov); modalEl = null; }, 180); }
  function values(){
    return o.fields.map(function(f, idx){
      const el = ov.querySelector('[data-f="' + idx + '"]');
      return f.type === 'checkbox' ? el.checked : el.value;
    });
  }
  ov.addEventListener('click', function(e){
    if (e.target === ov) return close();
    const a = e.target.getAttribute && e.target.getAttribute('data-m');
    if (a === 'cancel') close();
    else if (a === 'save') { const r = o.onSave(values()); if (r !== false) close(); }
    else if (a === 'del') { ask('Xóa mục này?', function(){ o.onDelete(); close(); }); }
  });
  const first = ov.querySelector('input[type=text]');
  if (first && !(o.fields[0] && o.fields[0].value)) setTimeout(function(){ first.focus(); }, 50);
}

function ask(msg, yes){
  openModal({ title: msg, saveLabel: 'Đồng ý', fields: [], onSave: function(){ yes(); } });
}
function toast(msg){
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
}
function moneyOrWarn(v){
  const n = parseMoney(v);
  if (isNaN(n) || n < 0) { toast('Số tiền chưa hợp lệ. Ví dụ: 50000, 50k, 1.5tr'); return null; }
  return n;
}

function pct(a, b){ return b > 0 ? Math.min(100, a / b * 100) : 0; }

let popId = null;
let page = 'month';
let ovSel = null;

/* Thanh Dock nổi ở đáy màn hình */
function dockHtml(){
  return '<nav class="dock">' +
    '<button class="' + (page === 'month' ? 'on' : '') + '" data-act="page" data-p="month"><span>📅</span> Theo tháng</button>' +
    '<button class="' + (page === 'overview' ? 'on' : '') + '" data-act="page" data-p="overview"><span>💰</span> Tiết kiệm</button>' +
  '</nav>';
}

/* ========================== VẼ GIAO DIỆN CHÍNH ========================== */
function render(anim){
  document.getElementById('app').classList.toggle('enter', !!anim);
  if (page === 'overview') { document.getElementById('app').innerHTML = renderOverview(); bindDynamicEvents(); return; }

  const m = M(), t = totals();
  const keys = sortedKeys();
  const left = t.inflow - t.total;
  const leftMax = t.inflow - t.plan;
  const free = t.inflow - t.goal - t.total;
  const percentSaved = t.inflow > 0 ? Math.min(100, Math.max(0, Math.round((left / t.inflow) * 100))) : 0;

  // Cập nhật Dynamic Island
  updateDynamicIsland(left, percentSaved);

  let h = '';

  /* ---------------- [KHỐI 1] HEADER & MONTH CAPSULE ---------------- */
  h += '<header class="top-header">';
  h += '<div class="brand-title"><span class="logo-gem"></span>Chi Tiêu Pro</div>';
  h += '<div class="header-controls">';
  h += '<select class="sel-capsule" data-act="month">' + keys.map(function(k){ return '<option value="' + k + '"' + (k === S.current ? ' selected' : '') + '>' + monthLabel(k) + '</option>'; }).join('') + '</select>';
  h += '<button class="btn-icon" data-act="theme" aria-label="Đổi sáng tối" title="Đổi sáng/tối">🌓</button>';
  h += '<button class="btn-icon primary" data-act="new-month" aria-label="Thêm tháng">+</button>';
  h += '</div></header>';

  if (IN_APP) h += '<div class="insight-box bad" style="margin-bottom:12px">Bạn đang mở trong ứng dụng Zalo/Facebook. Hãy chọn mở bằng trình duyệt Chrome hoặc Safari để dữ liệu được lưu an toàn lâu dài.</div>';

  /* ---------------- [KHỐI 2] 3D HOLOGRAPHIC CARD (VÍ TIỀN TRUNG TÂM) ---------------- */
  h += '<div class="card-3d-scene">';
  h += '<div class="card-3d-wrapper">';
  h += '<div class="card-border-beam"></div>';
  h += '<div class="card-3d" id="tiltCard">';
  h += '<div class="card-sparkle-stars"></div>';
  h += '<div class="card-3d-glare" id="cardGlare"></div>';
  h += '<div class="card-inner">';

  h += '<div class="card-top"><div class="card-chip"></div><div class="card-tag"><span class="dot"></span> CHI TIÊU CYBER</div></div>';

  h += '<div class="card-balance-block">';
  h += '<div class="card-balance-lbl">' + (t.inflow > 0 ? 'Dự kiến để dành' : 'Chưa nhập thu nhập') + ' · ' + esc(monthLabel(S.current)) + '</div>';
  h += '<div class="card-balance-val num' + (left < 0 ? ' neg' : '') + '" id="bigNum">' + (t.inflow > 0 ? fmt(left) : '—') + '</div>';
  if (t.inflow > 0 && t.plan > t.total) h += '<div class="num" style="font-size:12px;opacity:.9">Nếu chi hết ngân sách: <b' + (leftMax < 0 ? ' style="color:#FFB4AB"' : '') + '>' + fmt(leftMax) + '</b></div>';
  h += '<div class="card-progress-bar"><div class="card-progress-fill" style="width:' + percentSaved + '%"></div></div>';
  h += '</div>';

  h += '<div class="card-bot">';
  h += '<div><div style="font-size:11px;opacity:.8">TỔNG THU</div><b>' + (t.inflow > 0 ? fmt(t.inflow) : '0đ') + '</b></div>';
  h += '<div style="text-align:right"><div style="font-size:11px;opacity:.8">TỶ LỆ TIẾT KIỆM</div><b>' + percentSaved + '%</b></div>';
  h += '</div>';

  h += '</div></div></div></div>';

  h += '<div class="tilt-instruction">';
  h += '<span>🖥️ Rê chuột hoặc 📱 chạm vuốt để xoay 3D</span>';
  h += '<button class="tilt-control-btn" id="gyroToggleBtn">Bật lắc điện thoại 📳</button>';
  h += '</div>';

  /* 3 Thẻ chỉ số nhanh (Quick-Metrics) */
  h += '<div class="metrics-grid">';
  h += '<button class="metric-box" data-act="edit-income"><div class="lbl">Thu nhập (Lương)' + (m.incomeSrc === 'giasu' ? ' · Sổ gia sư' : '') + '</div><div class="v num">' + (t.income > 0 ? fmt(t.income) : '+ Nhập') + '</div></button>';
  h += '<button class="metric-box" data-act="add-extra"><div class="lbl">Tiền thêm</div><div class="v num" style="color:var(--ok)">' + (t.extra > 0 ? '+' + fmt(t.extra) : '+ Thêm') + '</div></button>';
  h += '<button class="metric-box" data-act="edit-goal"><div class="lbl">Mục tiêu tháng</div><div class="v num">' + (t.goal > 0 ? fmt(t.goal) : '+ Đặt') + '</div></button>';
  h += '</div>';

  /* ---------------- [KHỐI 3] SMART CASHFLOW & GỢI Ý CHI TIÊU ---------------- */
  h += '<div class="cashflow-card">';
  h += '<div class="h"><span>Dòng tiền tháng này</span><span class="num">' + fmt(t.total) + ' đã chi</span></div>';
  if (t.inflow > 0) {
    const base = Math.max(t.inflow, t.total) || 1;
    const wPaid = t.paid / base * 100, wUn = t.unpaid / base * 100, wSave = Math.max(0, left) / base * 100;
    h += '<div class="flow"><i style="width:' + wPaid + '%;background:#10B981"></i><i style="width:' + wUn + '%;background:#F59E0B"></i><i style="width:' + wSave + '%;background:rgba(255,255,255,0.4)"></i></div>';
    h += '<div class="legend num"><span><span class="dot" style="background:#10B981"></span>Đã trả <b>' + fmt(t.paid) + '</b></span><span><span class="dot" style="background:#F59E0B"></span>Chưa trả <b>' + fmt(t.unpaid) + '</b></span><span><span class="dot" style="background:rgba(255,255,255,0.7)"></span>Còn lại <b>' + fmt(Math.max(0, left)) + '</b></span></div>';
  }

  // Lời khuyên thông minh
  if (t.inflow > 0) {
    if (left < 0) h += '<div class="insight-box bad num">Chi vượt thu nhập ' + fmt(-left) + '. Cần cắt giảm khoản không cấp thiết.</div>';
    else if (t.goal > 0 && left < t.goal) h += '<div class="insight-box warn num">Đang thiếu ' + fmt(t.goal - left) + ' để đạt mục tiêu tiết kiệm ' + fmt(t.goal) + '.</div>';
    else if (t.goal > 0) h += '<div class="insight-box ok num">Xuất sắc! Đã đạt mục tiêu tiết kiệm, dư thêm ' + fmt(left - t.goal) + '.</div>';

    if (t.plan > t.total) {
      const cls = leftMax < 0 ? ' bad' : (t.goal > 0 && leftMax < t.goal ? ' warn' : '');
      h += '<div class="insight-box num' + cls + '" style="margin-top:8px">Nếu chi hết 100% ngân sách (' + fmt(t.plan) + '), để dành được ' + fmt(leftMax) + (leftMax < 0 ? ' — vượt thu nhập' : '') + '.</div>';
    }
    if (t.goal > 0 && free > 0) {
      const dl = daysLeft();
      h += '<div class="insight-box" style="margin-top:8px">💡 Còn chi thêm được tối đa <b class="num">' + fmt(free) + '</b>' + (dl > 0 ? ' (khoảng <b class="num">' + fmt(free / dl) + '/ngày</b> trong ' + dl + ' ngày còn lại)' : '') + '.</div>';
    }
  }
  h += '<button class="link" style="margin-top:10px;display:block" data-act="edit-note">📝 ' + (m.note ? esc(m.note) : 'Thêm ghi chú tài chính cho tháng') + '</button>';
  h += '</div>';

  /* ---------------- [KHỐI 4] BENTO GRID PHÂN BỔ NGÂN SÁCH ---------------- */
  h += '<div class="section-head"><span>Cơ cấu ngân sách (Bento Grid)</span><small>Rê chuột có rọi đèn viền</small></div>';
  h += '<div class="bento-grid" id="bentoContainer">';

  m.sections.forEach(function(s, idx){
    const st = secTotal(s), sb = secBudget(s);
    h += '<div class="bento-card' + (idx === 0 && m.sections.length % 2 !== 0 ? ' span-2' : '') + '">';
    h += '<div class="bento-inner">';
    h += '<div class="b-top"><div class="b-title">' + esc(s.name) + '</div><div class="b-icon">' + (s.fixed ? '🔒' : '⚡') + '</div></div>';
    h += '<div class="b-val num">' + fmt(st) + '</div>';
    h += '<div class="b-sub num">' + (sb > 0 ? 'Hạn mức: ' + fmt(sb) : s.cats.length + ' nhóm chi phí') + '</div>';
    h += '</div></div>';
  });

  h += '</div>';

  /* ---------------- [KHỐI 5] INTERACTIVE CHECKLIST ---------------- */
  h += '<div class="section-head" style="margin-top:32px"><span>Khoản chi & Chi tiết</span><small>Tick ✓ để bắn pháo hoa 🎉</small></div>';

  // Thẻ tiền thêm
  const ex = extrasOf(m), exRecv = extraRecv(m);
  h += '<div class="cat extra"><div class="cat-h"><div class="name"><span class="ico">💰</span><span>Tiền thêm tháng này</span></div>';
  h += '<div class="amt num" style="color:var(--ok)">+' + fmt(t.extra) + (exRecv < t.extra ? '<br><small>đã nhận ' + fmt(exRecv) + '</small>' : '') + '</div></div>';
  if (!ex.length) h += '<div style="padding:4px 14px 10px;color:var(--muted);font-size:12.5px">Thưởng, làm thêm, bán đồ cũ… Được cộng vào quỹ tiết kiệm.</div>';
  ex.forEach(function(x){
    const sub = [dateLabel(x.date), x.note].filter(Boolean).join(' · ') + (x.received ? '' : (x.date || x.note ? ' · ' : '') + 'chưa nhận');
    h += '<div class="item">';
    h += '<button class="chk' + (x.received ? ' on' : '') + (x.id === popId ? ' pop' : '') + '" data-act="extra-recv" data-i="' + x.id + '" aria-label="Đã nhận">✓</button>';
    h += '<button class="nm" data-act="edit-extra" data-i="' + x.id + '">' + esc(x.name) + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</button>';
    h += '<div class="pr num plus' + (x.received ? '' : ' wait') + '">+' + fmt(x.amount) + '</div></div>';
  });
  h += '<div class="addrow"><button class="link" data-act="add-extra">+ Thêm khoản tiền thêm</button></div></div>';

  // Từng đề mục và khoản chi
  m.sections.forEach(function(s){
    const st = secTotal(s), sb = secBudget(s), over = sb > 0 && st > sb;
    h += '<div class="cat" style="margin-top:14px">';
    h += '<div class="cat-h"><div class="name"><span>' + (s.fixed ? '🔒' : '🏷️') + '</span><span>' + esc(s.name) + '</span></div>';
    h += '<div class="amt num">' + fmt(st) + (sb > 0 ? '<br><small>/ ' + fmt(sb) + '</small>' : '') + '</div>';
    h += '<button class="btn-icon" style="width:30px;height:30px;font-size:12px;margin-left:6px" data-act="edit-sec" data-s="' + s.id + '">⋯</button></div>';

    if (sb > 0) h += '<div style="padding:0 14px 8px"><div class="bar ' + (over ? 'bad' : '') + '"><i style="width:' + pct(st, sb) + '%"></i></div></div>';

    s.cats.forEach(function(c){
      const ct = catTotal(c), cb = c.budget || 0, cover = cb > 0 && ct > cb;
      h += '<div style="padding:8px 14px 4px;display:flex;justify-content:space-between;align-items:center;border-top:1px dashed var(--line);background:rgba(255,255,255,0.015)">';
      h += '<div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px"><span>' + iconFor(c.name) + '</span><span>' + esc(c.name) + '</span></div>';
      h += '<div style="display:flex;align-items:center;gap:6px"><span class="num" style="font-size:13px;font-weight:700' + (cover ? ';color:var(--bad)' : '') + '">' + fmt(ct) + (cb > 0 ? '<span style="color:var(--muted);font-weight:500"> / ' + fmt(cb) + '</span>' : '') + '</span><button class="link" style="padding:2px 6px;font-size:12px" data-act="edit-cat" data-s="' + s.id + '" data-c="' + c.id + '">Sửa</button></div></div>';
      if (cb > 0) h += '<div style="padding:2px 14px 6px"><div class="bar ' + (cover ? 'bad' : '') + '"><i style="width:' + pct(ct, cb) + '%"></i></div></div>';

      c.items.forEach(function(it){
        h += '<div class="item">';
        h += '<button class="chk' + (it.paid ? ' on' : '') + (it.id === popId ? ' pop' : '') + '" data-act="paid" data-s="' + s.id + '" data-c="' + c.id + '" data-i="' + it.id + '" aria-label="Đã trả">✓</button>';
        h += '<button class="nm' + (it.paid ? ' done' : '') + '" data-act="edit-item" data-s="' + s.id + '" data-c="' + c.id + '" data-i="' + it.id + '">' + esc(it.name) + (subText(it) ? '<span class="sub">' + esc(subText(it)) + '</span>' : '') + '</button>';
        h += '<div class="pr num' + (it.paid ? ' done' : '') + '">' + (!it.amount && it.prev ? '<span style="color:var(--aur-c1)">Nhập tiền</span>' : fmt(it.amount)) + '</div></div>';
      });
      h += '<div class="addrow"><button class="link" data-act="add-item" data-s="' + s.id + '" data-c="' + c.id + '">+ Thêm khoản vào "' + esc(c.name) + '"</button></div>';
    });

    h += '<div style="padding:6px 14px 10px;border-top:1px solid var(--line)"><button class="link" data-act="add-cat" data-s="' + s.id + '">+ Thêm mục trong "' + esc(s.name) + '"</button></div>';
    h += '</div>';
  });

  h += '<button class="addsec" data-act="add-sec">+ Thêm đề mục ngân sách</button>';

  /* Cuối trang: Sao lưu & Xóa tháng */
  h += '<div style="display:flex;gap:8px;margin-top:24px"><button class="btn-icon" style="flex:1;border-radius:14px;height:42px;font-weight:700;font-size:13px" data-act="export-file">⬇️ Tải sao lưu</button><button class="btn-icon" style="flex:1;border-radius:14px;height:42px;font-weight:700;font-size:13px" data-act="import-file">⬆️ Khôi phục</button></div>';
  h += '<button class="link" style="width:100%;margin-top:12px;color:var(--bad);font-size:12.5px;text-align:center" data-act="del-month">Xóa dữ liệu ' + esc(monthLabel(S.current).toLowerCase()) + '</button>';

  /* Thanh Dock nổi ở đáy màn hình */
  h += dockHtml();

  document.getElementById('app').innerHTML = h;
  popId = null;

  // Hiệu ứng nhảy số lớn
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (anim && !reduce && t.inflow > 0) countUp(document.getElementById('bigNum'), left);

  bindDynamicEvents();
}

/* ========================== TRANG TIẾT KIỆM ========================== */
function savingsSummary(){
  const nowK = monthKeyNow(), list = [];
  let total = 0, extra = 0, counted = 0;
  sortedKeys().forEach(function(k){
    const x = monthTotalsOf(k), m = S.months[k], save = x.income + x.extra - x.total, future = k > nowK;
    list.push({ k: k, income: x.income, extra: x.extra, spent: x.total, save: save, goal: m.goal || 0, future: future });
    if (!future) { total += save; extra += x.extra; counted++; }
  });
  return { list: list, total: total, extra: extra, counted: counted, avg: counted ? total / counted : 0, avgSalary: counted ? (total - extra) / counted : 0 };
}
function addMonths(k, n){ const p = k.split('-'); const d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

function renderOverview(){
  const sm = savingsSummary();
  updateDynamicIsland(sm.total, 100);

  let h = '<header class="top-header"><div class="brand-title"><span class="logo-gem"></span>Chi Tiêu Pro</div><div class="header-controls"><button class="btn-icon" data-act="theme">🌓</button></div></header>';

  /* Thẻ 3D Tổng tiết kiệm */
  h += '<div class="card-3d-scene"><div class="card-3d-wrapper"><div class="card-border-beam"></div><div class="card-3d" id="tiltCard"><div class="card-sparkle-stars"></div><div class="card-3d-glare" id="cardGlare"></div><div class="card-inner">';
  h += '<div class="card-top"><div class="card-chip"></div><div class="card-tag"><span class="dot"></span> TỔNG TÍCH LŨY</div></div>';
  h += '<div class="card-balance-block"><div class="card-balance-lbl">Tổng tiết kiệm đến nay</div><div class="card-balance-val num' + (sm.total < 0 ? ' neg' : '') + '">' + fmt(sm.total) + '</div>';
  h += '<div class="card-progress-bar"><div class="card-progress-fill" style="width:100%"></div></div></div>';
  h += '<div class="card-bot"><div><div style="font-size:11px;opacity:.8">TÍNH TRÊN</div><b>' + sm.counted + ' tháng</b></div><div style="text-align:right"><div style="font-size:11px;opacity:.8">TRUNG BÌNH</div><b>' + fmt(sm.avg) + '/tháng</b></div></div>';
  h += '</div></div></div></div>';

  /* Số dư hiện tại */
  const b = balanceNow();
  h += '<div class="cashflow-card" style="margin-top:14px"><b>💵 Số dư hiện tại</b>';
  h += '<div class="num" style="font-size:26px;font-weight:900;margin:4px 0 8px' + (b.balance < 0 ? ';color:var(--bad)' : '') + '">' + fmt(b.balance) + '</div>';
  h += '<button class="link" style="width:100%;text-align:left;display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)" data-act="init-bal"><span>Số dư ban đầu <small>(sửa)</small></span><b class="num">' + fmt(b.initial) + '</b></button>';
  h += '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13.5px"><span>Chưa tiêu tháng này</span><b class="num">' + fmt(b.curLeft) + '</b></div>';
  h += '</div>';

  /* Mục tiêu lớn */
  const g = S.bigGoal;
  if (!g || !g.amount) {
    h += '<button class="addsec" style="margin-top:14px" data-act="big-goal">🎯 Đặt mục tiêu tích lũy lớn (Mua xe, mua nhà, laptop...)</button>';
  } else {
    const have = Math.max(0, sm.total), percent = Math.min(100, have / g.amount * 100);
    h += '<div class="cat" style="padding:16px;margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center"><b>🎯 ' + esc(g.name) + '</b><button class="link" data-act="big-goal">Sửa</button></div>';
    h += '<div class="num" style="font-size:22px;font-weight:800;margin:6px 0">' + fmt(have) + ' <small style="font-size:13px;color:var(--muted)">/ ' + fmt(g.amount) + ' · ' + Math.floor(percent) + '%</small></div>';
    h += '<div class="bar" style="height:10px"><i style="width:' + percent + '%"></i></div></div>';
  }

  /* Danh sách từng tháng */
  h += '<div class="section-head" style="margin-top:24px"><span>Lịch sử từng tháng</span></div>';
  sm.list.slice().reverse().forEach(function(r){
    h += '<button class="item" style="width:100%;border-radius:14px;background:var(--card);border:1px solid var(--line);margin-bottom:8px;padding:12px 14px" data-act="open-month" data-k="' + r.k + '">';
    h += '<div style="flex:1;text-align:left"><b style="font-size:14.5px">' + monthLabel(r.k) + '</b><div style="font-size:12px;color:var(--muted)">Thu ' + fmt(r.income + r.extra) + ' − Chi ' + fmt(r.spent) + '</div></div>';
    h += '<div class="num" style="font-weight:800;font-size:15px;' + (r.save >= 0 ? 'color:var(--ok)' : 'color:var(--bad)') + '">' + (r.save > 0 ? '+' : '') + fmt(r.save) + '</div>';
    h += '</button>';
  });

  h += dockHtml();
  return h;
}

function updateDynamicIsland(amount, percent){
  const el = document.getElementById('dynamicIsland');
  const t = document.getElementById('islandTitle');
  const b = document.getElementById('islandBadge');
  if (t) t.innerHTML = 'Còn lại: <b>' + fmt(amount) + '</b>';
  if (b) b.textContent = 'Tiết kiệm ' + percent + '% ↑';
  if (el) el.onclick = function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); };
}

function countUp(el, to){
  if (!el) return;
  const dur = 700;
  let t0 = null;
  function step(ts){
    if (t0 === null) t0 = ts;
    const k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(to * e);
    if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
  }
  requestAnimationFrame(step);
}

function monthTotalsOf(k){
  const m = S.months[k];
  let t = 0, p = 0;
  m.sections.forEach(function(sc){ t += secTotal(sc); p += secPaid(sc); });
  return { total: t, paid: p, unpaid: t - p, income: m.income || 0, extra: extraTotal(m), extraRecv: extraRecv(m) };
}

function balanceNow(){
  const nowK = monthKeyNow();
  const r = { initial: S.initialBalance || 0, past: 0, pastCount: 0, curIncome: 0, curExtra: 0, curPaid: 0, curUnpaid: 0 };
  sortedKeys().forEach(function(k){
    const x = monthTotalsOf(k);
    if (k < nowK) { r.past += x.income + x.extra - x.total; r.pastCount++; }
    else if (k === nowK) { r.curIncome = x.income; r.curExtra = x.extraRecv; r.curPaid = x.paid; r.curUnpaid = x.unpaid; }
  });
  r.curLeft = r.curIncome + r.curExtra - r.curPaid;
  r.balance = r.initial + r.past + r.curLeft;
  r.after = r.balance - r.curUnpaid;
  return r;
}

/* ============================== HÀNH ĐỘNG ============================== */
function commit(anim){ save(); render(anim); }

const actions = {
  'toggle-sec': function(d){ const s = findSec(d.s); s.collapsed = !s.collapsed; commit(); },
  'paid': function(d){
    const c = findCat(d.s, d.c); const it = c.items.filter(function(x){ return x.id === d.i; })[0];
    it.paid = !it.paid; popId = it.paid ? it.id : null;
    if (it.paid) {
      triggerConfettiAtClick();
      if (navigator.vibrate) navigator.vibrate([18, 30, 25]);
    }
    commit();
  },
  'extra-recv': function(d){
    const x = findExtra(d.i); x.received = !x.received; popId = x.received ? x.id : null;
    if (x.received) {
      triggerConfettiAtClick();
      if (navigator.vibrate) navigator.vibrate([18, 30, 25]);
    }
    commit();
  },
  'edit-income': function(){
    openModal({ title: 'Thu nhập ' + monthLabel(S.current).toLowerCase(), saveLabel: 'Lưu',
      fields: [
        { label: 'Tổng thu nhập tháng này', type: 'money', value: M().income || '', placeholder: 'Ví dụ 15tr hoặc 15000000', hint: M().incomeSrc === 'giasu' ? 'Đang lấy từ Sổ gia sư (chỉ tính tiền đã thu).' : 'Gõ nhanh: 500k, 1.5tr, 15tr' },
        { label: 'Hoặc dán mã từ Sổ gia sư', type: 'text', placeholder: 'GS|2026-11|3000000', hint: 'Vào Sổ gia sư › Lương › Sao chép mã. Có mã thì ưu tiên mã.' }],
      onSave: function(v){
        const code = v[1].trim();
        if (code) {
          const g = code.match(/^GS\|(\d{4}-\d{2})\|(\d+)$/);
          if (!g) { toast('Mã không đúng định dạng'); return false; }
          if (g[1] !== S.current) { toast('Mã của ' + monthLabel(g[1]) + ', đang xem ' + monthLabel(S.current)); return false; }
          M().income = parseInt(g[2], 10); M().incomeSrc = 'giasu'; commit(); return;
        }
        const n = moneyOrWarn(v[0]); if (n === null) return false;
        if (n !== (M().income || 0)) { M().income = n; M().incomeSrc = 'manual'; }
        commit();
      } });
  },
  'add-extra': function(){
    openModal({ title: 'Thêm tiền thêm ' + monthLabel(S.current).toLowerCase(), fields: [
      { label: 'Khoản gì?', type: 'text', placeholder: 'Ví dụ: Thưởng dự án, bán đồ cũ' },
      { label: 'Số tiền', type: 'money', placeholder: 'Ví dụ 500k', hint: 'Gõ nhanh: 500k, 1.5tr' },
      { label: 'Ngày nhận', type: 'date', value: defaultDate() },
      { label: 'Ghi chú (không bắt buộc)', type: 'text' },
      { label: 'Đã nhận tiền rồi', type: 'checkbox', value: true }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên khoản'); return false; }
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        if (!n) { toast('Nhập số tiền'); return false; }
        extrasOf(M()).push({ id: uid(), name: v[0].trim(), amount: n, date: v[2], note: v[3].trim(), received: v[4] }); commit();
      } });
  },
  'edit-extra': function(d){
    const x = findExtra(d.i);
    openModal({ title: 'Sửa tiền thêm', fields: [
      { label: 'Khoản gì?', type: 'text', value: x.name },
      { label: 'Số tiền', type: 'money', value: x.amount || '' },
      { label: 'Ngày nhận', type: 'date', value: x.date || '' },
      { label: 'Ghi chú', type: 'text', value: x.note || '' },
      { label: 'Đã nhận tiền rồi', type: 'checkbox', value: x.received }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên khoản'); return false; }
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        if (!n) { toast('Nhập số tiền'); return false; }
        x.name = v[0].trim(); x.amount = n; x.date = v[2]; x.note = v[3].trim(); x.received = v[4]; commit();
      },
      onDelete: function(){ const m = M(); m.extras = extrasOf(m).filter(function(y){ return y.id !== x.id; }); commit(); } });
  },
  'edit-goal': function(){
    openModal({ title: 'Mục tiêu tiết kiệm tháng', saveLabel: 'Lưu',
      fields: [{ label: 'Muốn để dành bao nhiêu trong tháng này?', type: 'money', value: M().goal || '', placeholder: 'Ví dụ 5tr' }],
      onSave: function(v){ const n = moneyOrWarn(v[0]); if (n === null) return false; M().goal = n; commit(); } });
  },
  'edit-note': function(){
    openModal({ title: 'Ghi chú ' + monthLabel(S.current).toLowerCase(), fields: [{ label: 'Ghi chú tài chính tháng này', type: 'textarea', plain: true, value: M().note || '' }],
      onSave: function(v){ M().note = v[0].trim(); commit(); } });
  },
  'add-sec': function(){
    openModal({ title: 'Thêm đề mục ngân sách', fields: [
      { label: 'Tên đề mục', type: 'text', placeholder: 'Ví dụ: Chi phí cố định' },
      { label: 'Ngân sách đề mục (không bắt buộc)', type: 'money', placeholder: '0 = cộng từ các mục con' },
      { label: 'Đề mục cố định (sang tháng mới giữ tên các khoản)', type: 'checkbox', value: false }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên đề mục'); return false; }
        const b = moneyOrWarn(v[1]); if (b === null) return false;
        M().sections.push({ id: uid(), name: v[0].trim(), budget: b, fixed: v[2], collapsed: false, cats: [] }); commit();
      } });
  },
  'edit-sec': function(d){
    const s = findSec(d.s);
    openModal({ title: 'Sửa đề mục', fields: [
      { label: 'Tên đề mục', type: 'text', value: s.name },
      { label: 'Ngân sách đề mục', type: 'money', value: s.budget || '' },
      { label: 'Đề mục cố định', type: 'checkbox', value: s.fixed }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên đề mục'); return false; }
        const b = moneyOrWarn(v[1]); if (b === null) return false;
        s.name = v[0].trim(); s.budget = b; s.fixed = v[2]; commit();
      },
      onDelete: function(){ const m = M(); m.sections = m.sections.filter(function(x){ return x.id !== s.id; }); commit(); } });
  },
  'add-cat': function(d){
    openModal({ title: 'Thêm mục', fields: [
      { label: 'Tên mục', type: 'text', placeholder: 'Ví dụ: Ăn uống' },
      { label: 'Ngân sách của mục (không bắt buộc)', type: 'money', placeholder: 'Vượt số này sẽ có cảnh báo' }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên mục'); return false; }
        const b = moneyOrWarn(v[1]); if (b === null) return false;
        findSec(d.s).cats.push({ id: uid(), name: v[0].trim(), budget: b, items: [] }); commit();
      } });
  },
  'edit-cat': function(d){
    const c = findCat(d.s, d.c), s = findSec(d.s);
    openModal({ title: 'Sửa mục', fields: [
      { label: 'Tên mục', type: 'text', value: c.name },
      { label: 'Ngân sách của mục', type: 'money', value: c.budget || '' },
      { label: 'Thuộc đề mục', type: 'select', value: s.id, options: M().sections.map(function(x){ return { v: x.id, l: x.name }; }) }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên mục'); return false; }
        const b = moneyOrWarn(v[1]); if (b === null) return false;
        c.name = v[0].trim(); c.budget = b;
        if (v[2] && v[2] !== s.id) { s.cats = s.cats.filter(function(x){ return x.id !== c.id; }); findSec(v[2]).cats.push(c); }
        commit();
      },
      onDelete: function(){ s.cats = s.cats.filter(function(x){ return x.id !== c.id; }); commit(); } });
  },
  'add-item': function(d){
    const c = findCat(d.s, d.c);
    openModal({ title: 'Thêm khoản chi vào "' + c.name + '"', fields: [
      { label: 'Tên khoản chi', type: 'text', placeholder: 'Ví dụ: Cơm trưa' },
      { label: 'Số tiền', type: 'money', placeholder: 'Ví dụ 35k, 1.2tr' },
      { label: 'Ghi chú', type: 'text' },
      { label: 'Đã trả rồi', type: 'checkbox', value: false }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên khoản chi'); return false; }
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        c.items.push({ id: uid(), name: v[0].trim(), amount: n, note: v[2].trim(), paid: v[3] }); commit();
      } });
  },
  'edit-item': function(d){
    const c = findCat(d.s, d.c); const it = c.items.filter(function(x){ return x.id === d.i; })[0];
    openModal({ title: 'Sửa khoản chi', fields: [
      { label: 'Tên khoản chi', type: 'text', value: it.name },
      { label: 'Số tiền', type: 'money', value: it.amount || '' },
      { label: 'Ghi chú', type: 'text', value: it.note || '' },
      { label: 'Đã trả rồi', type: 'checkbox', value: it.paid }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên khoản chi'); return false; }
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        it.name = v[0].trim(); it.amount = n; it.note = v[2].trim(); it.paid = v[3]; commit();
      },
      onDelete: function(){ c.items = c.items.filter(function(x){ return x.id !== it.id; }); commit(); } });
  },
  'new-month': function(){
    const keys = sortedKeys(), last = keys[keys.length - 1];
    const p = last.split('-');
    let y = parseInt(p[0], 10), mo = parseInt(p[1], 10) + 1;
    if (mo > 12) { mo = 1; y++; }
    const def = y + '-' + String(mo).padStart(2, '0');
    openModal({ title: 'Thêm tháng mới', saveLabel: 'Tạo tháng', fields: [
      { label: 'Chọn tháng', type: 'month', value: def },
      { label: 'Sao chép cấu trúc từ ' + monthLabel(S.current).toLowerCase(), type: 'checkbox', value: true }],
      onSave: function(v){
        const k = v[0];
        if (!/^\d{4}-\d{2}$/.test(k)) { toast('Chọn tháng hợp lệ'); return false; }
        if (S.months[k]) { S.current = k; commit(true); toast('Tháng đã có, đã chuyển sang'); return; }
        S.months[k] = v[1] ? cloneForNext(M()) : newMonthData();
        S.current = k; commit(true);
      } });
  },
  'del-month': function(){
    ask('Xóa toàn bộ dữ liệu ' + monthLabel(S.current).toLowerCase() + '? Không thể hoàn tác.', function(){
      const i = sortedKeys().indexOf(S.current);
      delete S.months[S.current];
      const rest = sortedKeys();
      if (!rest.length) { const k = monthKeyNow(); S.months[k] = newMonthData(); S.current = k; }
      else S.current = rest[Math.min(Math.max(0, i - 1), rest.length - 1)];
      commit(true); toast('Đã xóa tháng');
    });
  },
  'export-file': function(){
    try {
      const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chi-tieu-sao-luu-' + todayStr() + '.json';
      document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      S.lastBackup = todayStr(); commit(); toast('Đã tải file sao lưu về máy');
    } catch(e){ toast('Lỗi xuất file'); }
  },
  'import-file': function(){
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function(){
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = function(){
        try {
          const d = JSON.parse(rd.result);
          if (!d || !d.months || !Object.keys(d.months).length) throw 0;
          ask('Thay toàn bộ dữ liệu bằng file "' + f.name + '"?', function(){
            S = d; S.seeded = true;
            const ks = sortedKeys(); if (!S.current || !S.months[S.current]) S.current = ks[ks.length - 1];
            commit(true); toast('Đã khôi phục dữ liệu');
          });
        } catch(e){ toast('File không đúng định dạng sao lưu'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  },
  'page': function(d){ page = d.p; ovSel = S.current; commit(true); window.scrollTo(0, 0); },
  'open-month': function(d){ S.current = d.k; page = 'month'; commit(true); window.scrollTo(0, 0); },
  'big-goal': function(){
    const g = S.bigGoal || {};
    openModal({ title: 'Mục tiêu tích lũy lớn', fields: [
      { label: 'Tên mục tiêu', type: 'text', value: g.name || '', placeholder: 'Ví dụ: Mua laptop' },
      { label: 'Số tiền cần', type: 'money', value: g.amount || '', placeholder: 'Ví dụ 20tr' }],
      onSave: function(v){
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        if (!n) { toast('Nhập số tiền'); return false; }
        S.bigGoal = { name: v[0].trim() || 'Mục tiêu', amount: n }; commit();
      },
      onDelete: g.amount ? function(){ delete S.bigGoal; commit(); } : null });
  },
  'init-bal': function(){
    const ib = S.initialBalance || 0;
    openModal({ title: 'Số dư ban đầu', fields: [
      { label: 'Tiền bạn có trước tháng đầu tiên ghi app', type: 'money', value: Math.abs(ib) || '', placeholder: 'Ví dụ 5tr' },
      { label: 'Đây là số âm (đang nợ)', type: 'checkbox', value: ib < 0 }],
      onSave: function(v){ const n = moneyOrWarn(v[0]); if (n === null) return false; S.initialBalance = v[1] ? -n : n; commit(); } });
  },
  /* Đổi giao diện Sáng / Tối */
  'theme': function(){
    const r = document.documentElement;
    const cur = r.getAttribute('data-mode') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-mode', next);
    toast(next === 'dark' ? '🌙 Chế độ Tối' : '☀️ Chế độ Sáng');
    if (navigator.vibrate) navigator.vibrate(15);
  }
};

/* ============================ GẮN SỰ KIỆN CLICK ============================ */
document.getElementById('app').addEventListener('click', function(e){
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.getAttribute('data-act');
  if (act === 'month') return;
  const d = { s: el.getAttribute('data-s'), c: el.getAttribute('data-c'), i: el.getAttribute('data-i'), k: el.getAttribute('data-k'), p: el.getAttribute('data-p') };
  if (actions[act]) actions[act](d);
});
document.getElementById('app').addEventListener('change', function(e){
  if (e.target.getAttribute('data-act') === 'month') { S.current = e.target.value; commit(true); }
});

/* Ripple effect */
document.addEventListener('pointerdown', function(e){
  const b = e.target.closest && e.target.closest('button:not(.chk)');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2, s = document.createElement('span');
  s.className = 'rip';
  s.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
  b.appendChild(s); setTimeout(function(){ s.remove(); }, 650);
});

/* =====================================================================
   ENGINE 1: CUỘN CHUỘT BIẾN ĐỔI MÀU MÈ LIÊN TỤC (COLOR MORPH ENGINE)
   ===================================================================== */
const nebulaMesh = document.getElementById('nebulaMesh');
const scrollTracker = document.getElementById('scrollTracker');
const dynamicIsland = document.getElementById('dynamicIsland');
const hudBall = document.getElementById('hudBall');
const hudText = document.getElementById('hudText');

const colorPhases = [
  { p: 0.0, c1: '#0EA5E9', c2: '#38BDF8', c3: '#0284C7', name: 'Cyber Electric Cyan' },
  { p: 0.35, c1: '#06B6D4', c2: '#10B981', c3: '#0EA5E9', name: 'Cyber Emerald Matrix' },
  { p: 0.65, c1: '#6366F1', c2: '#A855F7', c3: '#EC4899', name: 'Cyberpunk Neon Violet' },
  { p: 1.0, c1: '#EC4899', c2: '#F43F5E', c3: '#0EA5E9', name: 'Cyberpunk Tokyo Pink' }
];

function interpolateColor(color1, color2, factor) {
  const c1 = parseInt(color1.slice(1), 16), c2 = parseInt(color2.slice(1), 16);
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollMax > 0 ? Math.min(Math.max(scrollY / scrollMax, 0), 1) : 0;

      if (scrollTracker) scrollTracker.style.setProperty('--scroll-percent', (progress * 100) + '%');

      if (nebulaMesh) {
        nebulaMesh.style.setProperty('--scroll-y', (progress * 65) + '%');
        nebulaMesh.style.setProperty('--scroll-x', (Math.sin(progress * Math.PI) * 30) + '%');
        nebulaMesh.style.setProperty('--scroll-hue', (progress * 70) + 'deg');
      }

      // Nội suy màu sắc mượt mà
      let phaseIndex = 0;
      for (let i = 0; i < colorPhases.length - 1; i++) {
        if (progress >= colorPhases[i].p && progress <= colorPhases[i + 1].p) {
          phaseIndex = i;
          break;
        }
      }
      const p1 = colorPhases[phaseIndex], p2 = colorPhases[phaseIndex + 1] || p1;
      const factor = (progress - p1.p) / (p2.p - p1.p || 1);

      const dC1 = interpolateColor(p1.c1, p2.c1, factor);
      const dC2 = interpolateColor(p1.c2, p2.c2, factor);
      const dC3 = interpolateColor(p1.c3, p2.c3, factor);

      document.documentElement.style.setProperty('--aur-c1', dC1);
      document.documentElement.style.setProperty('--aur-c2', dC2);
      document.documentElement.style.setProperty('--aur-c3', dC3);

      if (hudBall) { hudBall.style.background = dC1; hudBall.style.boxShadow = `0 0 8px ${dC1}`; }
      if (hudText) hudText.textContent = `🌈 Nền: ${progress < 0.35 ? p1.name : p2.name}`;

      // Dynamic Island
      if (dynamicIsland) {
        if (scrollY > 220) dynamicIsland.classList.add('active');
        else dynamicIsland.classList.remove('active');
      }

      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

/* =====================================================================
   ENGINE 2: CANVAS SAO NHẤP NHÁY 60FPS & BỤI SAO STARDUST
   ===================================================================== */
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
let stars = [], mouseTrail = [];

function resizeBgCanvas() {
  if (!bgCanvas) return;
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  initStars();
}
window.addEventListener('resize', resizeBgCanvas);

function initStars() {
  if (!bgCanvas) return;
  stars = [];
  const count = Math.floor((bgCanvas.width * bgCanvas.height) / 8000);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      radius: Math.random() * 1.5 + 0.4,
      alpha: Math.random(),
      speed: Math.random() * 0.02 + 0.006,
      direction: Math.random() > 0.5 ? 1 : -1
    });
  }
}

window.addEventListener('mousemove', (e) => addTrail(e.clientX, e.clientY));
window.addEventListener('touchmove', (e) => {
  if (e.touches && e.touches[0]) addTrail(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

function addTrail(x, y) {
  if (Math.random() > 0.35) return;
  const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--aur-c1').trim() || '#A855F7';
  mouseTrail.push({
    x: x + (Math.random() - 0.5) * 16,
    y: y + (Math.random() - 0.5) * 16,
    radius: Math.random() * 2 + 1,
    alpha: 0.85,
    decay: Math.random() * 0.03 + 0.02,
    color: brandColor
  });
}

function animateBg() {
  if (!bgCtx || !bgCanvas) return;
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    s.alpha += s.speed * s.direction;
    if (s.alpha >= 1) { s.alpha = 1; s.direction = -1; }
    else if (s.alpha <= 0.15) { s.alpha = 0.15; s.direction = 1; }

    bgCtx.beginPath();
    bgCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.8})`;
    bgCtx.fill();
  }

  for (let i = mouseTrail.length - 1; i >= 0; i--) {
    const p = mouseTrail[i];
    p.alpha -= p.decay;
    if (p.alpha <= 0) { mouseTrail.splice(i, 1); continue; }
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    bgCtx.fillStyle = p.color;
    bgCtx.globalAlpha = p.alpha;
    bgCtx.shadowBlur = 8;
    bgCtx.shadowColor = p.color;
    bgCtx.fill();
    bgCtx.shadowBlur = 0;
    bgCtx.globalAlpha = 1;
  }
  requestAnimationFrame(animateBg);
}
resizeBgCanvas();
animateBg();

/* =====================================================================
   ENGINE 3: THẺ 3D TILT (CHUỘT + CHẠM MOBILE + GYROSCOPE)
   ===================================================================== */
let gyroEnabled = false;
function bindDynamicEvents(){
  const card = document.getElementById('tiltCard');
  const glare = document.getElementById('cardGlare');
  if (!card) return;

  let isTouching = false;

  card.onmousemove = function(e){
    if (isTouching) return;
    const rect = card.getBoundingClientRect();
    applyTilt(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  };
  card.onmouseleave = function(){ resetTilt(); };

  card.ontouchstart = function(e){
    isTouching = true;
    card.classList.remove('returning');
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();
    applyTilt(touch.clientX - rect.left, touch.clientY - rect.top, rect.width, rect.height);
  };
  card.ontouchmove = function(e){
    if (!isTouching) return;
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();
    applyTilt(touch.clientX - rect.left, touch.clientY - rect.top, rect.width, rect.height);
  };
  card.ontouchend = function(){ isTouching = false; resetTilt(); };

  function applyTilt(x, y, width, height){
    card.classList.remove('returning');
    const px = (x / width) * 2 - 1, py = (y / height) * 2 - 1;
    card.style.setProperty('--rx', (-py * 14).toFixed(2) + 'deg');
    card.style.setProperty('--ry', (px * 14).toFixed(2) + 'deg');
    if (glare) {
      glare.style.setProperty('--glare-x', ((x / width) * 100).toFixed(1) + '%');
      glare.style.setProperty('--glare-y', ((y / height) * 100).toFixed(1) + '%');
      glare.style.setProperty('--glare-opacity', '0.55');
    }
  }

  function resetTilt(){
    card.classList.add('returning');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    if (glare) glare.style.setProperty('--glare-opacity', '0.2');
  }

  const gyroBtn = document.getElementById('gyroToggleBtn');
  if (gyroBtn) {
    gyroBtn.onclick = function(){
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(state => {
          if (state === 'granted') activateGyro(gyroBtn);
        }).catch(console.error);
      } else {
        activateGyro(gyroBtn);
      }
    };
  }

  function activateGyro(btn){
    gyroEnabled = !gyroEnabled;
    if (gyroEnabled) {
      window.addEventListener('deviceorientation', handleOrientation);
      btn.textContent = 'Đang bật lắc 3D ✓';
      btn.style.color = 'var(--aur-c1)';
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
      resetTilt();
      btn.textContent = 'Bật lắc điện thoại 📳';
      btn.style.removeProperty('color');
    }
  }

  function handleOrientation(e){
    if (!gyroEnabled || !card) return;
    const gamma = Math.min(Math.max(e.gamma || 0, -30), 30);
    const beta = Math.min(Math.max((e.beta || 0) - 45, -30), 30);
    card.style.setProperty('--rx', (-beta * 0.45).toFixed(2) + 'deg');
    card.style.setProperty('--ry', (gamma * 0.45).toFixed(2) + 'deg');
  }

  // Bento Spotlight
  const bento = document.getElementById('bentoContainer');
  if (bento) {
    bento.onmousemove = function(e){
      const cards = bento.querySelectorAll('.bento-card');
      cards.forEach(c => {
        const rect = c.getBoundingClientRect();
        c.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
        c.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
      });
    };
  }
}

/* =====================================================================
   ENGINE 4: CANVAS CONFETTI ĂN MỪNG
   ===================================================================== */
const confettiCanvas = document.getElementById('confettiCanvas');
const cCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
let confettiParticles = [];
let confettiAnimating = false;

function resizeConfetti() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

function createConfetti(x, y, count = 35) {
  const colors = ['#A855F7', '#C084FC', '#38BDF8', '#10B981', '#F43F5E', '#F59E0B'];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 3;
    confettiParticles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      decay: Math.random() * 0.02 + 0.012
    });
  }
  if (!confettiAnimating) {
    confettiAnimating = true;
    requestAnimationFrame(renderConfetti);
  }
}

function renderConfetti() {
  if (!cCtx || !confettiCanvas) return;
  cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.22;
    p.rotation += p.rotationSpeed;
    p.opacity -= p.decay;

    if (p.opacity <= 0) { confettiParticles.splice(i, 1); continue; }

    cCtx.save();
    cCtx.translate(p.x, p.y);
    cCtx.rotate((p.rotation * Math.PI) / 180);
    cCtx.fillStyle = p.color;
    cCtx.globalAlpha = p.opacity;
    cCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    cCtx.restore();
  }
  if (confettiParticles.length > 0) requestAnimationFrame(renderConfetti);
  else confettiAnimating = false;
}

let lastClickX = window.innerWidth / 2, lastClickY = window.innerHeight / 2;
window.addEventListener('click', (e) => {
  lastClickX = e.clientX; lastClickY = e.clientY;
}, true);

function triggerConfettiAtClick(){
  createConfetti(lastClickX, lastClickY, 30);
}

/* =====================================================================
   KHỞI ĐỘNG TRANG
   ===================================================================== */
render(true);

})();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}
