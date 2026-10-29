/* =====================================================================
   APP CHI TIÊU
   Toàn bộ code bọc trong một hàm tự chạy (IIFE) để các biến không lọt ra
   phạm vi toàn cục (window).
   Cấu trúc dữ liệu lưu trong localStorage (biến S):
   S = {
     current: '2026-10',            // tháng đang xem
     initialBalance, bigGoal, lastBackup, seeded, mig2,
     months: {
       '2026-10': {
         income,                    // lương (thu nhập cố định)
         goal,                      // mục tiêu tiết kiệm của tháng
         note,                      // ghi chú tháng
         extras: [ { id, name, amount, date, note, received } ],      // tiền thêm
         sections: [ { id, name, budget, fixed, collapsed,             // đề mục
           cats: [ { id, name, budget,                                 // mục
             items: [ { id, name, amount, paid, note, prev } ] } ] } ] // khoản chi
       }
     }
   }
   ===================================================================== */
(function(){
'use strict';

/* Khóa lưu dữ liệu trong localStorage */
const KEY = 'chitieu_v1';
/* Toàn bộ dữ liệu app. Dùng let vì khi khôi phục sao lưu sẽ gán lại cả object */
let S = load();

/* =============================== LƯU TRỮ =============================== */

/* Đọc dữ liệu từ localStorage; lỗi hoặc chưa có thì trả về dữ liệu rỗng */
function load(){
  try {
    const r = localStorage.getItem(KEY);
    if (r) { const d = JSON.parse(r); if (d && d.months) return d; }
  } catch(e){}
  return { current: null, months: {} };
}
/* Ghi toàn bộ S xuống localStorage */
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }

/* =============================== TIỆN ÍCH ============================== */

/* Tạo id ngẫu nhiên ngắn cho đề mục / mục / khoản chi */
function uid(){ return Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-3); }

/* Chọn biểu tượng emoji cho mục dựa theo từ khóa trong tên */
function iconFor(n){
  const s = String(n || '').toLowerCase();
  const map = [[/ăn|cơm|phở|bún|quán|cafe|cà phê/, '🍜'], [/\bai\b|claude|gpt/, '🤖'], [/gym|thể thao/, '🏋️'], [/nợ|vay|trả góp/, '💸'],
    [/shopee|lazada|tiki|mua sắm/, '🛍️'], [/quà|người yêu|đi chơi|hẹn hò/, '🎁'], [/nhà|trọ|điện|nước|internet|wifi|hóa đơn/, '🏠'],
    [/xăng|xe|dầu|grab|đi lại/, '🛵'], [/học|sách|khóa/, '📚'], [/tiết kiệm|để dành/, '🐷'], [/sức khỏe|thuốc|khám/, '💊'], [/phát sinh|khác/, '🧾']];
  for (let i = 0; i < map.length; i++) if (map[i][0].test(s)) return map[i][1];
  return '💳';
}

/* Dòng chữ nhỏ dưới tên khoản chi: ghi chú + "tháng trước X" nếu chưa nhập tiền */
function subText(it){
  const p = [];
  if (it.note) p.push(it.note);
  if (!it.amount && it.prev) p.push('tháng trước ' + fmt(it.prev));
  return p.join(' · ');
}

/* Thoát ký tự HTML để chống chèn mã khi hiển thị chữ người dùng nhập */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

/* Định dạng số tiền: 1500000 -> "1.500.000đ" */
function fmt(n){
  n = Math.round(n || 0);
  const neg = n < 0;
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + s + 'đ';
}

/* Đọc số tiền người dùng gõ: "50k", "1.5tr", "150000", "1.500.000đ" -> số.
   Trả về NaN nếu không hợp lệ */
function parseMoney(v){
  const s = String(v || '').toLowerCase().replace(/\s+/g, '').replace(/đ|vnd|d$/g, '');
  if (!s) return 0;
  const m = s.match(/^([\d.,]+)(k|tr|m|nghin|ngan|trieu)?$/);
  if (!m) return NaN;
  if (m[2]) {
    // Có đơn vị (k / tr): dấu phẩy hoặc chấm là phần thập phân
    const num = parseFloat(m[1].replace(',', '.'));
    if (isNaN(num)) return NaN;
    const mul = (m[2] === 'k' || m[2] === 'nghin' || m[2] === 'ngan') ? 1000 : 1000000;
    return Math.round(num * mul);
  }
  // Không có đơn vị: dấu chấm/phẩy là dấu ngăn nghìn, bỏ đi
  const digits = m[1].replace(/[.,]/g, '');
  return parseInt(digits, 10) || 0;
}

/* Khóa tháng hiện tại dạng "YYYY-MM" */
function monthKeyNow(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
/* "2026-10" -> "Tháng 10/2026" */
function monthLabel(k){ const p = k.split('-'); return 'Tháng ' + parseInt(p[1], 10) + '/' + p[0]; }
/* Danh sách các tháng đã có, sắp xếp tăng dần */
function sortedKeys(){ return Object.keys(S.months).sort(); }

/* Dữ liệu mặc định cho một tháng mới tạo trống */
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

/* Sao chép một tháng sang tháng mới:
   - Đề mục cố định: giữ tên các khoản, xóa số tiền (lưu lại "prev" để gợi ý)
   - Đề mục bất định: xóa hết khoản chi
   - Ghi chú và tiền thêm: không chép */
function cloneForNext(src){
  const d = JSON.parse(JSON.stringify(src));
  d.note = '';
  d.extras = [];
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

/* ---- Dữ liệu mẫu tháng 10 (chỉ dùng qua action 'seed-oct', hiện không có nút gọi) ---- */
/* Tạo nhanh một khoản chi */
function mk(name, amount, paid, note){ return { id: uid(), name: name, amount: amount, paid: !!paid, note: note || '' }; }
/* Tạo nhanh một mục */
function cat(name, budget, items){ return { id: uid(), name: name, budget: budget, items: items }; }
/* Bảng chi tiêu tháng 10/2026 soạn sẵn */
function seedOct(){
  return {
    income: 12000000, goal: 2510000,
    note: 'Tháng này có khoản chi lớn bất thường: trả nợ người yêu 4,5tr + gym 4 tháng 1,05tr.\n1tr phát sinh là quỹ đệm; cuối tháng còn bao nhiêu thì nhập thêm vào tiết kiệm.\nMục tiêu: khóa cứng 2,51tr tiết kiệm, không đụng tới nếu không cần thiết.',
    sections: [
      { id: uid(), name: 'Tiền bất định cho tháng', budget: 0, fixed: false, collapsed: false, cats: [
        cat('Shopee', 0, [ mk('Shopee', 740000, true) ]),
        cat('Trả nợ người yêu', 0, [ mk('Trả nợ người yêu', 4500000, false) ]),
        cat('Gym (4 tháng)', 0, [ mk('Gym (4 tháng)', 1050000, false) ]),
        cat('Quà + đi chơi với người yêu', 700000, [
          mk('Tuần 1: mỳ trộn', 70000), mk('Tuần 2: bún chả', 70000), mk('Tuần 3: gà rán nguyên xon', 210000),
          mk('Tuần 4: chưa biết', 150000), mk('Quà', 200000) ])
      ]},
      { id: uid(), name: 'Tiền cố định cho tháng', budget: 0, fixed: true, collapsed: false, cats: [
        cat('AI', 1100000, [ mk('Claude', 600000, true), mk('Chat GPT', 500000, false) ]),
        cat('Ăn ngoài', 300000, [ mk('Tuần 1', 75000), mk('Tuần 2', 75000), mk('Tuần 3', 75000), mk('Tuần 4', 75000) ]),
        cat('Chi phí phát sinh', 1100000, [
          mk('ShoppeVip', 30000), mk('Tiền gạo', 100000), mk('Tiền thay dầu', 100000), mk('Nợ Long dù', 40000),
          mk('Xem phim Avevger', 300000), mk('Nồi chiên không dầu', 350000), mk('… (phần còn lại của 1,1tr)', 180000) ])
      ]}
    ]
  };
}
/* Kiểm tra dữ liệu còn trống hoàn toàn (hiện không dùng) */
// function isUntouched(st){
//   const ks = Object.keys(st.months);
//   return ks.every(function(k){
//     const m = st.months[k];
//     return !m.income && !m.goal && !(m.extras || []).length && m.sections.every(function(sc){ return sc.cats.every(function(c){ return !c.items.length; }); });
//   });
// }

/* ============================ KHỞI ĐỘNG APP ============================ */

if (!S.seeded) { S.seeded = true; save(); }
/* Xin trình duyệt giữ dữ liệu lâu dài, hạn chế bị tự xóa khi máy đầy bộ nhớ */
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e){}
/* true nếu đang mở trong trình duyệt nội bộ của Zalo/Facebook/... (dữ liệu dễ mất) */
const IN_APP = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Zalo|Line\/|MicroMessenger|TikTok/i.test(navigator.userAgent || '');

/* Có dữ liệu nào đáng sao lưu chưa (để hiện nhắc sao lưu) */
function hasData(){
  return Object.keys(S.months).some(function(k){
    const m = S.months[k];
    return m.income > 0 || (m.extras || []).length || m.sections.some(function(sc){ return sc.cats.some(function(c){ return c.items.length; }); });
  });
}
/* Ngày hôm nay dạng "YYYY-MM-DD" */
function todayStr(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

/* Nâng cấp dữ liệu cũ: đề mục có chữ "cố định" thì đánh dấu fixed (chỉ chạy 1 lần) */
if (!S.mig2) {
  Object.keys(S.months).forEach(function(k){ S.months[k].sections.forEach(function(sc){ if (/cố định/i.test(sc.name)) sc.fixed = true; }); });
  S.mig2 = true; save();
}
/* Chưa có tháng nào: tạo tháng hiện tại */
if (!sortedKeys().length) { const k0 = monthKeyNow(); S.months[k0] = newMonthData(); S.current = k0; save(); }
/* Tháng đang chọn không tồn tại: chuyển về tháng hiện tại hoặc tháng mới nhất */
if (!S.current || !S.months[S.current]) { const ks = sortedKeys(); S.current = ks.indexOf(monthKeyNow()) >= 0 ? monthKeyNow() : ks[ks.length - 1]; save(); }

/* ========================== TRUY XUẤT DỮ LIỆU ========================== */

/* Dữ liệu tháng đang xem */
function M(){ return S.months[S.current]; }
/* Tìm đề mục theo id trong tháng đang xem */
function findSec(id){ return M().sections.filter(function(s){ return s.id === id; })[0]; }
/* Tìm mục theo id đề mục + id mục */
function findCat(sid, cid){ const s = findSec(sid); return s ? s.cats.filter(function(c){ return c.id === cid; })[0] : null; }
/* Danh sách tiền thêm của một tháng (tự tạo mảng rỗng cho dữ liệu cũ chưa có) */
function extrasOf(m){ if (!m.extras) m.extras = []; return m.extras; }
/* Tìm một khoản tiền thêm theo id trong tháng đang xem */
function findExtra(id){ return extrasOf(M()).filter(function(x){ return x.id === id; })[0]; }

/* =============================== TÍNH TOÁN ============================== */

/* Tổng tiền các khoản trong một mục */
function catTotal(c){ return c.items.reduce(function(a, i){ return a + (i.amount || 0); }, 0); }
/* Tổng tiền đã trả trong một mục */
function catPaid(c){ return c.items.reduce(function(a, i){ return a + (i.paid ? (i.amount || 0) : 0); }, 0); }
/* Tổng tiền của cả đề mục */
function secTotal(s){ return s.cats.reduce(function(a, c){ return a + catTotal(c); }, 0); }
/* Tổng tiền đã trả của cả đề mục */
function secPaid(s){ return s.cats.reduce(function(a, c){ return a + catPaid(c); }, 0); }
/* Ngân sách đề mục: dùng số nhập riêng; nếu không có thì cộng ngân sách các mục
   (chỉ khi mục nào cũng có ngân sách), ngược lại là 0 = không giới hạn */
function secBudget(s){
  if (s.budget > 0) return s.budget;
  if (!s.cats.length || !s.cats.every(function(c){ return c.budget > 0; })) return 0;
  return s.cats.reduce(function(a, c){ return a + c.budget; }, 0);
}

/* Tiền thêm: khoản nhận ngoài lương, không cố định. Tách riêng khỏi "Thu nhập" (lương)
   nhưng cộng vào để dành / tiết kiệm. Số dư hiện tại chỉ tính khoản đã nhận. */
/* Tổng tiền thêm của tháng (cả đã nhận và chưa nhận) */
function extraTotal(m){ return extrasOf(m).reduce(function(a, x){ return a + (x.amount || 0); }, 0); }
/* Tổng tiền thêm ĐÃ NHẬN của tháng */
function extraRecv(m){ return extrasOf(m).reduce(function(a, x){ return a + (x.received ? (x.amount || 0) : 0); }, 0); }

/* Số liệu tổng hợp của tháng đang xem.
   inflow = lương + tiền thêm (tổng tiền vào) */
function totals(){
  const m = M();
  let t = 0, p = 0;
  m.sections.forEach(function(s){ t += secTotal(s); p += secPaid(s); });
  const inc = m.income || 0, ex = extraTotal(m);
  return { total: t, paid: p, unpaid: t - p, income: inc, extra: ex, inflow: inc + ex, goal: m.goal || 0 };
}
/* "2026-10-20" -> "20/10" */
function dateLabel(s){ const p = String(s || '').split('-'); return p.length === 3 ? parseInt(p[2], 10) + '/' + parseInt(p[1], 10) : ''; }
/* Ngày mặc định khi thêm tiền thêm: hôm nay nếu đang xem tháng này, không thì ngày 1 của tháng đó */
function defaultDate(){ return S.current === monthKeyNow() ? todayStr() : S.current + '-01'; }
/* Số ngày còn lại trong tháng (tính cả hôm nay); 0 nếu không phải tháng hiện tại */
function daysLeft(){
  if (S.current !== monthKeyNow()) return 0;
  const d = new Date(), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return last - d.getDate() + 1;
}

/* ============================ HỘP THOẠI / THÔNG BÁO ============================ */

/* Mở hộp thoại nhập liệu trượt từ dưới lên.
   o = { title, fields: [{ label, type, value, placeholder, hint, options }], onSave, onDelete, saveLabel }
   type: 'text' | 'money' | 'month' | 'date' | 'checkbox' | 'select' | 'textarea'
   onSave(values) nhận mảng giá trị theo thứ tự fields; trả về false để giữ hộp thoại mở */
function openModal(o){
  const ov = document.createElement('div'); ov.className = 'ov';
  let h = '<div class="sheet"><h2>' + esc(o.title) + '</h2>';
  // Dựng HTML cho từng ô nhập
  (o.fields || []).forEach(function(f, i){
    const id = 'f' + i;
    if (f.type === 'checkbox') {
      h += '<div class="fld cb"><input type="checkbox" id="' + id + '"' + (f.value ? ' checked' : '') + '><label for="' + id + '">' + esc(f.label) + '</label></div>';
    } else if (f.type === 'select') {
      h += '<div class="fld"><label for="' + id + '">' + esc(f.label) + '</label><select id="' + id + '">' + f.options.map(function(o2){ return '<option value="' + esc(o2.v) + '"' + (o2.v === f.value ? ' selected' : '') + '>' + esc(o2.l) + '</option>'; }).join('') + '</select></div>';
    } else if (f.type === 'textarea') {
      h += '<div class="fld"><label for="' + id + '">' + esc(f.label) + '</label><textarea id="' + id + '"' + (f.plain ? ' class="plain"' : ' spellcheck="false"') + '>' + esc(f.value || '') + '</textarea>' + (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>';
    } else {
      const type = f.type === 'month' || f.type === 'date' ? f.type : 'text';
      const im = f.type === 'money' ? ' inputmode="text" autocomplete="off"' : ' autocomplete="off"';
      h += '<div class="fld"><label for="' + id + '">' + esc(f.label) + '</label><input type="' + type + '" id="' + id + '"' + im + ' placeholder="' + esc(f.placeholder || '') + '" value="' + esc(f.value == null ? '' : f.value) + '">' + (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>';
    }
  });
  // Hàng nút: Xóa (nếu có) / Đóng / Lưu
  h += '<div class="btns">';
  if (o.onDelete) h += '<button class="del" data-m="del">Xóa</button>';
  h += '<button data-m="cancel">Đóng</button>';
  if (o.onSave) h += '<button class="save" data-m="save">' + esc(o.saveLabel || 'Lưu') + '</button>';
  h += '</div></div>';
  ov.innerHTML = h;
  document.body.appendChild(ov);

  /* Đóng hộp thoại */
  function close(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }
  /* Lấy giá trị các ô nhập theo thứ tự fields */
  function values(){
    return (o.fields || []).map(function(f, i){
      const el = ov.querySelector('#f' + i);
      return f.type === 'checkbox' ? el.checked : el.value;
    });
  }
  // Bấm nền tối để đóng; bấm nút thì xử lý theo data-m
  ov.addEventListener('click', function(e){
    if (e.target === ov) return close();
    const a = e.target.getAttribute && e.target.getAttribute('data-m');
    if (a === 'cancel') close();
    else if (a === 'save') { const r = o.onSave(values()); if (r !== false) close(); }
    else if (a === 'del') { ask('Xóa mục này?', function(){ o.onDelete(); close(); }); }
  });
  // Tự đặt con trỏ vào ô chữ đầu tiên nếu ô đầu đang trống
  const first = ov.querySelector('input[type=text]');
  if (first && !(o.fields[0] && o.fields[0].value)) setTimeout(function(){ first.focus(); }, 50);
}
/* Hộp thoại hỏi xác nhận Đồng ý / Đóng */
function ask(msg, yes){
  openModal({ title: msg, saveLabel: 'Đồng ý', fields: [], onSave: function(){ yes(); } });
}
/* Thông báo nhỏ ở cuối màn hình, tự ẩn sau 2,2 giây */
function toast(msg){
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
}
/* Đọc số tiền; không hợp lệ thì báo lỗi và trả về null */
function moneyOrWarn(v){
  const n = parseMoney(v);
  if (isNaN(n) || n < 0) { toast('Số tiền chưa hợp lệ. Ví dụ: 50000, 50k, 1.5tr'); return null; }
  return n;
}

/* ========================== VẼ GIAO DIỆN ========================== */

/* Phần trăm a/b, tối đa 100 (dùng cho độ dài thanh tiến độ) */
function pct(a, b){ return b > 0 ? Math.min(100, a / b * 100) : 0; }

/* id của ô tick vừa bấm, để chạy hiệu ứng "nảy" một lần */
let popId = null;
/* Trang đang xem: 'month' (Theo tháng) hoặc 'overview' (Tiết kiệm) */
let page = 'month';
/* Tháng đang chọn ở trang tổng quan (hiện không dùng để vẽ) */
let ovSel = null;

/* Thanh chuyển trang "Theo tháng / Tiết kiệm" */
function segHtml(){
  return '<div class="seg"><button class="' + (page === 'month' ? 'on' : '') + '" data-act="page" data-p="month">📅 Theo tháng</button><button class="' + (page === 'overview' ? 'on' : '') + '" data-act="page" data-p="overview">💰 Tiết kiệm</button></div>';
}

/* Vẽ lại toàn bộ trang. anim = true thì chạy hiệu ứng thanh tiến độ và đếm số */
function render(anim){
  if (page === 'overview') { document.getElementById('app').innerHTML = renderOverview(); return; }
  const m = M(), t = totals();
  const keys = sortedKeys();
  let h = '';

  /* --- Thanh trên cùng: tiêu đề, chọn tháng, nút thêm tháng --- */
  h += '<div class="top"><h1>Chi tiêu ' + esc(monthLabel(S.current).toLowerCase()) + '</h1>';
  h += '<select class="sel" data-act="month">' + keys.map(function(k){ return '<option value="' + k + '"' + (k === S.current ? ' selected' : '') + '>' + monthLabel(k) + '</option>'; }).join('') + '</select>';
  h += '<button class="ibtn primary" data-act="new-month" aria-label="Thêm tháng">+</button></div>';
  h += segHtml();

  /* --- Khung tím tổng quan tháng --- */
  const left = t.inflow - t.total;            // dự kiến để dành = lương + tiền thêm − tổng chi
  const free = t.inflow - t.goal - t.total;   // còn được tiêu thêm mà vẫn đạt mục tiêu
  // Cảnh báo mở trong Zalo/Facebook, nhắc sao lưu sau 14 ngày
  if (IN_APP) h += '<div class="banner bad">Bạn đang mở trong Zalo/Facebook/Messenger. Dữ liệu ở đây được lưu riêng và dễ mất. Hãy bấm ⋮ hoặc nút chia sẻ và chọn mở bằng Chrome hoặc Safari.</div>';
  if (hasData() && (!S.lastBackup || (new Date(todayStr()) - new Date(S.lastBackup)) / 86400000 > 14)) h += '<div class="banner warn">📦 ' + (S.lastBackup ? 'Đã hơn 2 tuần' : 'Bạn chưa') + ' sao lưu dữ liệu. Cuộn xuống cuối trang, bấm "Tải file sao lưu" để giữ một bản trong máy.</div>';
  h += '<div class="sum">';
  h += '<div class="lbl">' + (t.inflow > 0 ? 'Dự kiến để dành' : 'Chưa nhập thu nhập tháng này') + '</div>';
  h += '<div class="big num' + (left < 0 ? ' neg' : '') + '" id="bigNum">' + (t.inflow > 0 ? fmt(left) : '—') + '</div>';
  if (t.inflow > 0 && left > 0) h += '<div class="lbl num">Tỷ lệ tiết kiệm ' + (left / t.inflow * 100).toFixed(1).replace('.', ',') + '% tổng thu' + (t.extra > 0 ? ' (lương + tiền thêm)' : '') + '</div>';
  if (t.inflow > 0) {
    // Thanh màu chia 3 phần: đã trả / chưa trả / còn lại
    const base = Math.max(t.inflow, t.total) || 1;
    const wPaid = t.paid / base * 100, wUn = t.unpaid / base * 100, wSave = Math.max(0, left) / base * 100;
    h += '<div class="flow' + (anim ? ' grow' : '') + '"><i style="width:' + wPaid + '%;background:var(--paid)"></i><i style="width:' + wUn + '%;background:var(--unpaid)"></i><i style="width:' + wSave + '%;background:var(--save)"></i></div>';
    h += '<div class="legend num"><span><span class="dot" style="background:var(--paid)"></span>Đã trả <b>' + fmt(t.paid) + '</b></span><span><span class="dot" style="background:var(--unpaid)"></span>Chưa trả <b>' + fmt(t.unpaid) + '</b></span><span><span class="dot" style="background:var(--save)"></span>Còn lại <b>' + fmt(Math.max(0, left)) + '</b></span></div>';
  } else {
    h += '<div class="legend num" style="margin-top:10px"><span>Tổng chi dự kiến <b>' + fmt(t.total) + '</b></span><span>Đã trả <b>' + fmt(t.paid) + '</b></span></div>';
  }
  // 3 ô bấm: Thu nhập (lương) / Tiền thêm / Mục tiêu tiết kiệm
  h += '<div class="grid2">';
  h += '<button class="mini" data-act="edit-income"><div class="lbl">Thu nhập</div><div class="v num">' + (t.income > 0 ? fmt(t.income) : 'Nhập') + '</div></button>';
  h += '<button class="mini" data-act="add-extra"><div class="lbl">Tiền thêm</div><div class="v num">' + (t.extra > 0 ? '+' + fmt(t.extra) : '+ Thêm') + '</div></button>';
  h += '<button class="mini span" data-act="edit-goal"><div class="lbl">Mục tiêu tiết kiệm</div><div class="v num">' + (t.goal > 0 ? fmt(t.goal) : 'Đặt mục tiêu') + '</div></button>';
  h += '</div>';

  // Nhận xét: chi vượt thu / thiếu mục tiêu / đạt mục tiêu / còn tiêu được bao nhiêu mỗi ngày
  if (t.inflow > 0) {
    if (left < 0) h += '<div class="note bad num">Chi vượt thu nhập ' + fmt(-left) + '. Cần cắt bớt hoặc tăng thu nhập.</div>';
    else if (t.goal > 0 && left < t.goal) h += '<div class="note warn num">Chưa đạt mục tiêu tiết kiệm, đang thiếu ' + fmt(t.goal - left) + '.</div>';
    else if (t.goal > 0) h += '<div class="note ok num">Đạt mục tiêu tiết kiệm, dư thêm ' + fmt(left - t.goal) + '.</div>';
    if (t.goal > 0 && free > 0) {
      const dl = daysLeft();
      h += '<div class="note info num">Còn chi thêm được tối đa ' + fmt(free) + ' mà vẫn đạt mục tiêu' + (dl > 0 ? ' (khoảng ' + fmt(free / dl) + '/ngày trong ' + dl + ' ngày còn lại)' : '') + '.</div>';
    }
  }
  h += '</div>';

  /* --- Ghi chú tháng --- */
  h += '<button class="mini" style="margin-top:10px;background:var(--card);border-color:var(--line);white-space:pre-wrap" data-act="edit-note"><div class="lbl">Ghi chú tháng</div><div style="font-size:14px;margin-top:2px">' + (m.note ? esc(m.note) : '<span style="color:var(--muted)">Nhấn để thêm ghi chú</span>') + '</div></button>';

  /* --- Thẻ tiền thêm: danh sách khoản + ô tick đã nhận --- */
  const ex = extrasOf(m), exRecv = extraRecv(m);
  h += '<div class="cat extra"><div class="cat-h"><div class="name"><span class="ico">💰</span><span>Tiền thêm tháng này</span></div>';
  h += '<div class="amt num">+' + fmt(t.extra) + (exRecv < t.extra ? '<br><small>đã nhận ' + fmt(exRecv) + '</small>' : '') + '</div></div>';
  if (!ex.length) h += '<div class="empty">Thưởng, làm thêm, bán đồ cũ… Không tính vào lương nhưng được cộng vào để dành và số dư.</div>';
  ex.forEach(function(x){
    // Dòng phụ: ngày · ghi chú · "chưa nhận"
    const sub = [dateLabel(x.date), x.note].filter(Boolean).join(' · ') + (x.received ? '' : (x.date || x.note ? ' · ' : '') + 'chưa nhận');
    h += '<div class="item">';
    h += '<button class="chk' + (x.received ? ' on' : '') + (x.id === popId ? ' pop' : '') + '" data-act="extra-recv" data-i="' + x.id + '" aria-label="Đã nhận">✓</button>';
    h += '<button class="nm" data-act="edit-extra" data-i="' + x.id + '">' + esc(x.name) + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</button>';
    h += '<div class="pr num plus' + (x.received ? '' : ' wait') + '">+' + fmt(x.amount) + '</div></div>';
  });
  h += '<div class="addrow"><button class="link" data-act="add-extra">+ Thêm khoản tiền thêm</button></div></div>';

  /* --- Các đề mục chi tiêu --- */
  m.sections.forEach(function(s){
    const st = secTotal(s), sb = secBudget(s), over = sb > 0 && st > sb;
    const ratio = sb > 0 ? st / sb : 0;
    // Tiêu đề đề mục: nút thu gọn, tên, tổng / ngân sách, nút sửa
    h += '<div class="sec">';
    h += '<div class="sec-h"><button class="chev' + (s.collapsed ? '' : ' open') + '" data-act="toggle-sec" data-s="' + s.id + '" aria-label="Thu gọn">▶</button>';
    h += '<div class="name">' + esc(s.name) + (s.fixed ? '<span class="tag">lặp lại</span>' : '') + '</div>';
    h += '<div class="tot num">' + fmt(st) + (sb > 0 ? '<br><small>/ ' + fmt(sb) + '</small>' : '') + '</div>';
    h += '<button class="ibtn" data-act="edit-sec" data-s="' + s.id + '" aria-label="Sửa đề mục">⋯</button></div>';
    // Thanh ngân sách đề mục: vàng khi > 85%, đỏ khi vượt
    if (sb > 0) h += '<div class="bar ' + (over ? 'bad' : ratio > .85 ? 'warn' : '') + (anim ? ' grow' : '') + '"><i style="width:' + pct(st, sb) + '%"></i></div>';
    if (over) h += '<div class="alert num" style="margin:6px 0 0">Đề mục này vượt ngân sách ' + fmt(st - sb) + '</div>';

    if (!s.collapsed) {
      // Từng mục trong đề mục
      s.cats.forEach(function(c){
        const ct = catTotal(c), cb = c.budget || 0, cover = cb > 0 && ct > cb;
        const cr = cb > 0 ? ct / cb : 0;
        h += '<div class="cat' + (cover ? ' over' : '') + '">';
        h += '<div class="cat-h"><div class="name"><span class="ico">' + iconFor(c.name) + '</span><span>' + esc(c.name) + '</span></div>';
        h += '<div class="amt num' + (cover ? ' bad' : '') + '">' + fmt(ct) + (cb > 0 ? ' <small>/ ' + fmt(cb) + '</small>' : '') + '</div>';
        h += '<button class="ibtn" style="padding:4px 9px" data-act="edit-cat" data-s="' + s.id + '" data-c="' + c.id + '" aria-label="Sửa mục">⋯</button></div>';
        if (cb > 0) h += '<div class="cat-bar"><div class="bar ' + (cover ? 'bad' : cr > .85 ? 'warn' : '') + (anim ? ' grow' : '') + '"><i style="width:' + pct(ct, cb) + '%"></i></div></div>';
        if (cover) h += '<div class="alert num">Vượt ngân sách ' + fmt(ct - cb) + '</div>';
        else if (cb > 0 && cr > .85 && ct < cb) h += '<div class="alert w num">Gần chạm ngân sách, còn ' + fmt(cb - ct) + '</div>';
        if (!c.items.length) h += '<div class="empty">Chưa có khoản chi nào.</div>';
        // Từng khoản chi: ô tick đã trả, tên (bấm để sửa), số tiền
        c.items.forEach(function(it){
          h += '<div class="item">';
          h += '<button class="chk' + (it.paid ? ' on' : '') + (it.id === popId ? ' pop' : '') + '" data-act="paid" data-s="' + s.id + '" data-c="' + c.id + '" data-i="' + it.id + '" aria-label="Đã trả">✓</button>';
          h += '<button class="nm' + (it.paid ? ' done' : '') + '" data-act="edit-item" data-s="' + s.id + '" data-c="' + c.id + '" data-i="' + it.id + '">' + esc(it.name) + (subText(it) ? '<span class="sub">' + esc(subText(it)) + '</span>' : '') + '</button>';
          h += '<div class="pr num' + (it.paid ? ' done' : '') + '">' + (!it.amount && it.prev ? '<span class="need">Nhập tiền</span>' : fmt(it.amount)) + '</div></div>';
        });
        h += '<div class="addrow"><button class="link" data-act="add-item" data-s="' + s.id + '" data-c="' + c.id + '">+ Thêm khoản chi</button></div>';
        h += '</div>';
      });
      h += '<button class="link" style="margin-top:8px" data-act="add-cat" data-s="' + s.id + '">+ Thêm mục trong "' + esc(s.name) + '"</button>';
    }
    h += '</div>';
  });

  /* --- Cuối trang: thêm đề mục, sao lưu, giao diện, xóa tháng --- */
  h += '<button class="addsec" data-act="add-sec">+ Thêm đề mục</button>';
  h += '<div style="display:flex;gap:8px;margin-top:18px"><button class="ibtn" style="flex:1" data-act="export-file">⬇️ Tải file sao lưu</button><button class="ibtn" style="flex:1" data-act="import-file">⬆️ Khôi phục từ file</button></div>';
  h += '<div style="display:flex;gap:8px;margin-top:10px"><button class="ibtn" style="flex:1" data-act="backup">Sao lưu bằng chữ</button><button class="ibtn" data-act="theme">Giao diện</button></div>';
  h += '<button class="ibtn danger" style="width:100%;margin-top:10px" data-act="del-month">Xóa dữ liệu ' + esc(monthLabel(S.current).toLowerCase()) + '</button>';

  document.getElementById('app').innerHTML = h;
  popId = null;
  // Hiệu ứng đếm số lớn, bỏ qua nếu máy bật "giảm chuyển động"
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (anim && !reduce && t.inflow > 0) countUp(document.getElementById('bigNum'), left);
}

/* Số liệu tổng hợp của một tháng bất kỳ theo khóa "YYYY-MM" */
function monthTotalsOf(k){
  const m = S.months[k];
  let t = 0, p = 0;
  m.sections.forEach(function(sc){ t += secTotal(sc); p += secPaid(sc); });
  return { total: t, paid: p, unpaid: t - p, income: m.income || 0, extra: extraTotal(m), extraRecv: extraRecv(m) };
}

/* ===== SỐ DƯ HIỆN TẠI =====
   Số dư = Số dư ban đầu + Tiết kiệm các tháng TRƯỚC (thu − tổng chi)
         + Tiền chưa tiêu tháng này (thu nhập tháng này − các khoản ĐÃ TRẢ).
   Tháng hiện tại tính theo "đã trả" chứ không theo "dự kiến để dành",
   nếu không sẽ bị cộng trùng thu nhập tháng này.
   Sau khi trả hết khoản chưa trả: Số dư − chưa trả = Số dư ban đầu + Tổng tiết kiệm.
   Tiền thêm: tháng trước cộng hết, tháng này chỉ cộng khoản ĐÃ NHẬN. */
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

/* Rút gọn số tiền: 1500000 -> "1,5tr", 50000 -> "50k" (hiện không dùng) */
function compact(n){
  if (n >= 1000000) return (Math.round(n / 100000) / 10).toString().replace('.', ',') + 'tr';
  if (n >= 1000) return Math.round(n / 1000) + 'k';
  return String(Math.round(n));
}

/* ===== TRANG TIẾT KIỆM =====
   Tiết kiệm mỗi tháng = Lương + Tiền thêm − Tổng chi đã ghi (đúng số "Dự kiến để dành" ở trang tháng).
   Tổng tiết kiệm = cộng các tháng ĐÃ TỚI (đến tháng hiện tại). Tháng sau chỉ hiện dự kiến.
   Tiền thêm cộng vào tiết kiệm, nhưng ước tính thời gian đạt mục tiêu lớn chỉ dùng
   trung bình tiết kiệm từ lương (avgSalary), vì tiền thêm không đều. */
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
/* Cộng n tháng vào khóa tháng: addMonths('2026-11', 3) -> '2027-02' */
function addMonths(k, n){ const p = k.split('-'); const d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

/* Dựng HTML trang Tiết kiệm */
function renderOverview(){
  const sm = savingsSummary();
  let h = '<div class="top"><h1>Tiết kiệm</h1></div>' + segHtml();

  /* --- Khung tím: tổng tiết kiệm --- */
  h += '<div class="sum"><div class="lbl">Tổng tiết kiệm đến nay</div><div class="big num' + (sm.total < 0 ? ' neg' : '') + '">' + fmt(sm.total) + '</div>';
  h += '<div class="legend num"><span>Tính <b>' + sm.counted + ' tháng</b></span><span>Trung bình <b>' + fmt(sm.avg) + '/tháng</b></span>' + (sm.extra > 0 ? '<span>Trong đó tiền thêm <b>' + fmt(sm.extra) + '</b></span>' : '') + '</div></div>';

  /* --- Số dư hiện tại --- */
  const b = balanceNow();
  h += '<div class="card"><b>💵 Số dư hiện tại</b>';
  h += '<div class="num" style="font-size:26px;font-weight:800;margin:4px 0 8px' + (b.balance < 0 ? ';color:var(--bad)' : '') + '">' + fmt(b.balance) + '</div>';
  h += '<button class="drow" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);padding:7px 0;text-align:left" data-act="init-bal"><span>Số dư ban đầu <small style="color:var(--brand)">(sửa)</small></span><b class="num' + (b.initial < 0 ? ' neg' : '') + '">' + fmt(b.initial) + '</b></button>';
  h += '<div class="drow"><span>Tiết kiệm ' + b.pastCount + ' tháng trước</span><b class="num' + (b.past < 0 ? ' neg' : '') + '">' + fmt(b.past) + '</b></div>';
  h += '<div class="drow"><span>Chưa tiêu tháng này<br><small style="color:var(--muted)">thu ' + fmt(b.curIncome) + (b.curExtra ? ' + thêm đã nhận ' + fmt(b.curExtra) : '') + ' − đã trả ' + fmt(b.curPaid) + '</small></span><b class="num' + (b.curLeft < 0 ? ' neg' : '') + '">' + fmt(b.curLeft) + '</b></div>';
  if (b.curUnpaid > 0) h += '<div class="cnt num" style="margin-top:8px;font-size:13px;color:var(--muted)">Trong đó ' + fmt(b.curUnpaid) + ' đã lên kế hoạch nhưng chưa trả. Trả hết thì còn <b style="color:var(--ink)">' + fmt(b.after) + '</b>.</div>';
  h += '</div>';

  /* --- Mục tiêu lớn: tiến độ + ước tính số tháng còn lại --- */
  const g = S.bigGoal;
  if (!g || !g.amount) {
    h += '<button class="goalc" style="width:100%;text-align:center;font-weight:700;color:var(--brand)" data-act="big-goal">🎯 Đặt mục tiêu tiết kiệm lớn<div class="cnt" style="font-weight:500;font-size:13px;color:var(--muted);margin-top:4px">Ví dụ: quỹ 20 triệu mua laptop. App sẽ ước tính mấy tháng nữa đạt.</div></button>';
  } else {
    const have = Math.max(0, sm.total), percent = Math.min(100, have / g.amount * 100), remain = g.amount - have;
    h += '<div class="goalc"><div class="h"><b>🎯 ' + esc(g.name || 'Mục tiêu') + '</b><button class="ibtn" style="padding:6px 10px" data-act="big-goal">Sửa</button></div>';
    h += '<div class="amt num">' + fmt(have) + ' <small>/ ' + fmt(g.amount) + ' · ' + Math.floor(percent) + '%</small></div><div class="gb"><i style="width:' + percent + '%"></i></div>';
    if (remain <= 0) h += '<div class="eta">🎉 <b>Đã đạt mục tiêu!</b> Dư ' + fmt(-remain) + '.</div>';
    else if (sm.avgSalary > 0) {
      const n = Math.ceil(remain / sm.avgSalary);
      h += '<div class="eta">Còn thiếu <b>' + fmt(remain) + '</b>. Nếu mỗi tháng để dành từ lương như trung bình (' + fmt(sm.avgSalary) + ', chưa tính tiền thêm), khoảng <b>' + n + ' tháng nữa</b> sẽ đạt (≈ <b>' + monthLabel(addMonths(monthKeyNow(), n)).toLowerCase() + '</b>).</div>';
    } else h += '<div class="eta">Còn thiếu <b>' + fmt(remain) + '</b>. Với mức để dành hiện tại chưa ước tính được thời gian đạt.</div>';
    h += '</div>';
  }

  /* --- Danh sách từng tháng (mới nhất ở trên) --- */
  h += '<div style="margin:20px 4px 0;font-weight:700">Từng tháng</div>';
  sm.list.slice().reverse().forEach(function(r){
    const rate = r.income + r.extra > 0 ? Math.round(r.save / (r.income + r.extra) * 100) : null;
    // Nhãn trạng thái so với mục tiêu tháng
    let tag;
    if (r.future) tag = '<span class="gtag mute">Dự kiến, chưa cộng vào tổng</span>';
    else if (!r.goal) tag = '<span class="gtag mute">Chưa đặt mục tiêu tháng</span>';
    else if (r.save >= r.goal) tag = '<span class="gtag ok">✅ Đạt mục tiêu ' + fmt(r.goal) + (r.save > r.goal ? ', dư ' + fmt(r.save - r.goal) : '') + '</span>';
    else tag = '<span class="gtag bad">⚠️ Thiếu ' + fmt(r.goal - r.save) + ' so với mục tiêu ' + fmt(r.goal) + '</span>';
    h += '<button class="srow' + (r.future ? ' future' : '') + '" data-act="open-month" data-k="' + r.k + '"><span class="m"><b>' + monthLabel(r.k) + (r.future ? ' · chưa tới' : '') + '</b><small class="num">' + (r.extra > 0 ? 'Lương ' + fmt(r.income) + ' + Thêm ' + fmt(r.extra) : 'Thu ' + fmt(r.income)) + ' − Chi ' + fmt(r.spent) + '</small>' + tag + '</span>' +
      '<span class="v num ' + (r.save < 0 ? 'neg' : 'pos') + '">' + (r.save > 0 ? '+' : '') + fmt(r.save) + (rate !== null ? '<small>' + rate + '% thu nhập</small>' : '') + '</span></button>';
  });
  h += '<div class="cnt" style="margin:12px 4px;font-size:12.5px;color:var(--muted)">Tiết kiệm mỗi tháng = lương + tiền thêm − tổng chi đã ghi (đúng số "Dự kiến để dành" ở trang tháng). Tổng chỉ cộng các tháng đã tới; tháng sau hiện mờ và chưa được tính. Bấm vào một tháng để mở.</div>';
  return h;
}

/* Hiệu ứng số chạy từ 0 lên giá trị "to" trong 0,7 giây */
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

/* ============================== HÀNH ĐỘNG ============================== */

/* Lưu dữ liệu rồi vẽ lại trang (gọi sau mỗi thay đổi) */
function commit(anim){ save(); render(anim); }

/* Bảng hành động: mỗi nút trong HTML có data-act="tên" sẽ gọi actions[tên](d).
   d chứa các id lấy từ thuộc tính data-s (đề mục), data-c (mục), data-i (khoản),
   data-k (tháng), data-p (trang) */
const actions = {
  /* Thu gọn / mở rộng một đề mục */
  'toggle-sec': function(d){ const s = findSec(d.s); s.collapsed = !s.collapsed; commit(); },

  /* Tick / bỏ tick "đã trả" cho một khoản chi */
  'paid': function(d){
    const c = findCat(d.s, d.c); const it = c.items.filter(function(x){ return x.id === d.i; })[0];
    it.paid = !it.paid; popId = it.paid ? it.id : null; commit();
  },

  /* Sửa thu nhập (lương) của tháng */
  'edit-income': function(){
    openModal({ title: 'Thu nhập ' + monthLabel(S.current).toLowerCase(), saveLabel: 'Lưu',
      fields: [{ label: 'Tổng thu nhập tháng này', type: 'money', value: M().income || '', placeholder: 'Ví dụ 8tr hoặc 8000000', hint: 'Gõ nhanh: 500k = 500.000đ, 1.5tr = 1.500.000đ' }],
      onSave: function(v){ const n = moneyOrWarn(v[0]); if (n === null) return false; M().income = n; commit(); } });
  },

  /* Tick / bỏ tick "đã nhận" cho một khoản tiền thêm */
  'extra-recv': function(d){
    const x = findExtra(d.i); x.received = !x.received; popId = x.received ? x.id : null; commit();
  },

  /* Thêm một khoản tiền thêm */
  'add-extra': function(){
    openModal({ title: 'Thêm tiền thêm ' + monthLabel(S.current).toLowerCase(), fields: [
      { label: 'Khoản gì?', type: 'text', placeholder: 'Ví dụ: Thưởng dự án, bán đồ cũ' },
      { label: 'Số tiền', type: 'money', placeholder: 'Ví dụ 500k', hint: 'Gõ nhanh: 500k, 1.5tr' },
      { label: 'Ngày nhận', type: 'date', value: defaultDate() },
      { label: 'Ghi chú (không bắt buộc)', type: 'text' },
      { label: 'Đã nhận tiền rồi (chỉ khoản đã nhận mới cộng vào số dư hiện tại)', type: 'checkbox', value: true }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên khoản'); return false; }
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        if (!n) { toast('Nhập số tiền'); return false; }
        extrasOf(M()).push({ id: uid(), name: v[0].trim(), amount: n, date: v[2], note: v[3].trim(), received: v[4] }); commit();
      } });
  },

  /* Sửa / xóa một khoản tiền thêm */
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

  /* Sửa mục tiêu tiết kiệm của tháng */
  'edit-goal': function(){
    openModal({ title: 'Mục tiêu tiết kiệm', saveLabel: 'Lưu',
      fields: [{ label: 'Muốn để dành bao nhiêu trong tháng này?', type: 'money', value: M().goal || '', placeholder: 'Ví dụ 2tr' }],
      onSave: function(v){ const n = moneyOrWarn(v[0]); if (n === null) return false; M().goal = n; commit(); } });
  },

  /* Nạp dữ liệu mẫu tháng 10 (hiện không có nút gọi) */
  'seed-oct': function(){
    ask('Thay toàn bộ dữ liệu tháng 10/2026 bằng bảng chi tiêu đã soạn (thu 12tr, chi 9,49tr)?', function(){
      S.months['2026-10'] = seedOct(); S.current = '2026-10'; commit(true); toast('Đã nạp dữ liệu tháng 10');
    });
  },

  /* Sửa ghi chú tháng */
  'edit-note': function(){
    openModal({ title: 'Ghi chú ' + monthLabel(S.current).toLowerCase(), fields: [{ label: 'Ghi chú', type: 'textarea', plain: true, value: M().note || '' }],
      onSave: function(v){ M().note = v[0].trim(); commit(); } });
  },

  /* Thêm đề mục mới */
  'add-sec': function(){
    openModal({ title: 'Thêm đề mục', fields: [
      { label: 'Tên đề mục', type: 'text', placeholder: 'Ví dụ: Chi phí cố định' },
      { label: 'Ngân sách cả đề mục (không bắt buộc)', type: 'money', placeholder: 'Để trống = cộng từ các mục con' },
      { label: 'Đề mục cố định (sang tháng mới giữ tên các khoản, chỉ nhập lại tiền)', type: 'checkbox', value: false }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên đề mục'); return false; }
        const b = moneyOrWarn(v[1]); if (b === null) return false;
        M().sections.push({ id: uid(), name: v[0].trim(), budget: b, fixed: v[2], collapsed: false, cats: [] }); commit();
      } });
  },

  /* Sửa / xóa đề mục */
  'edit-sec': function(d){
    const s = findSec(d.s);
    openModal({ title: 'Sửa đề mục', fields: [
      { label: 'Tên đề mục', type: 'text', value: s.name },
      { label: 'Ngân sách cả đề mục (0 = cộng từ mục con)', type: 'money', value: s.budget || '' },
      { label: 'Đề mục cố định (sang tháng mới giữ tên các khoản, chỉ nhập lại tiền)', type: 'checkbox', value: s.fixed }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên đề mục'); return false; }
        const b = moneyOrWarn(v[1]); if (b === null) return false;
        s.name = v[0].trim(); s.budget = b; s.fixed = v[2]; commit();
      },
      onDelete: function(){ const m = M(); m.sections = m.sections.filter(function(x){ return x.id !== s.id; }); commit(); } });
  },

  /* Thêm mục vào một đề mục */
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

  /* Sửa / xóa / chuyển mục sang đề mục khác */
  'edit-cat': function(d){
    const c = findCat(d.s, d.c), s = findSec(d.s);
    openModal({ title: 'Sửa mục', fields: [
      { label: 'Tên mục', type: 'text', value: c.name },
      { label: 'Ngân sách của mục (0 = không giới hạn)', type: 'money', value: c.budget || '' },
      { label: 'Thuộc đề mục', type: 'select', value: s.id, options: M().sections.map(function(x){ return { v: x.id, l: x.name }; }) }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên mục'); return false; }
        const b = moneyOrWarn(v[1]); if (b === null) return false;
        c.name = v[0].trim(); c.budget = b;
        // Đổi đề mục: gỡ khỏi đề mục cũ, gắn vào đề mục mới
        if (v[2] && v[2] !== s.id) { s.cats = s.cats.filter(function(x){ return x.id !== c.id; }); findSec(v[2]).cats.push(c); }
        commit();
      },
      onDelete: function(){ s.cats = s.cats.filter(function(x){ return x.id !== c.id; }); commit(); } });
  },

  /* Thêm khoản chi vào một mục */
  'add-item': function(d){
    const c = findCat(d.s, d.c);
    openModal({ title: 'Thêm khoản chi vào "' + c.name + '"', fields: [
      { label: 'Tên khoản chi', type: 'text', placeholder: 'Ví dụ: Cơm trưa' },
      { label: 'Số tiền', type: 'money', placeholder: 'Ví dụ 35k', hint: 'Gõ nhanh: 35k, 1.2tr, 150000' },
      { label: 'Ghi chú (không bắt buộc)', type: 'text', placeholder: '' },
      { label: 'Đã trả rồi', type: 'checkbox', value: false }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên khoản chi'); return false; }
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        c.items.push({ id: uid(), name: v[0].trim(), amount: n, note: v[2].trim(), paid: v[3] }); commit();
      } });
  },

  /* Sửa / xóa một khoản chi */
  'edit-item': function(d){
    const c = findCat(d.s, d.c); const it = c.items.filter(function(x){ return x.id === d.i; })[0];
    openModal({ title: 'Sửa khoản chi', fields: [
      { label: 'Tên khoản chi', type: 'text', value: it.name },
      { label: 'Số tiền', type: 'money', value: it.amount || '', hint: it.prev ? 'Tháng trước: ' + fmt(it.prev) : '' },
      { label: 'Ghi chú', type: 'text', value: it.note || '' },
      { label: 'Đã trả rồi', type: 'checkbox', value: it.paid }],
      onSave: function(v){
        if (!v[0].trim()) { toast('Nhập tên khoản chi'); return false; }
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        it.name = v[0].trim(); it.amount = n; it.note = v[2].trim(); it.paid = v[3]; commit();
      },
      onDelete: function(){ c.items = c.items.filter(function(x){ return x.id !== it.id; }); commit(); } });
  },

  /* Tạo tháng mới (mặc định là tháng kế tiếp tháng mới nhất), có thể sao chép từ tháng đang xem */
  'new-month': function(){
    const keys = sortedKeys(), last = keys[keys.length - 1];
    const p = last.split('-');
    let y = parseInt(p[0], 10), mo = parseInt(p[1], 10) + 1;
    if (mo > 12) { mo = 1; y++; }
    const def = y + '-' + String(mo).padStart(2, '0');
    openModal({ title: 'Thêm tháng mới', saveLabel: 'Tạo tháng', fields: [
      { label: 'Chọn tháng', type: 'month', value: def },
      { label: 'Sao chép từ ' + monthLabel(S.current).toLowerCase() + ' (giữ đề mục, mục, ngân sách. Đề mục cố định giữ tên khoản để nhập lại tiền, đề mục bất định để trống)', type: 'checkbox', value: true }],
      onSave: function(v){
        const k = v[0];
        if (!/^\d{4}-\d{2}$/.test(k)) { toast('Chọn tháng hợp lệ'); return false; }
        if (S.months[k]) { S.current = k; commit(true); toast('Tháng này đã có, đã chuyển sang'); return; }
        S.months[k] = v[1] ? cloneForNext(M()) : newMonthData();
        S.current = k; commit(true);
      } });
  },

  /* Xóa tháng đang xem, chuyển sang tháng liền trước */
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

  /* Tải toàn bộ dữ liệu về máy thành file .json */
  'export-file': function(){
    try {
      const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chi-tieu-sao-luu-' + todayStr() + '.json';
      document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      S.lastBackup = todayStr(); commit(); toast('Đã tải file sao lưu vào máy');
    } catch(e){ toast('Không tải được file. Hãy dùng "Sao lưu bằng chữ".'); }
  },

  /* Chọn file .json đã sao lưu để khôi phục (thay toàn bộ dữ liệu) */
  'import-file': function(){
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function(){
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = function(){
        try {
          const d = JSON.parse(rd.result);
          if (!d || !d.months || !Object.keys(d.months).length) throw 0;
          ask('Thay toàn bộ dữ liệu hiện tại bằng file "' + f.name + '"?', function(){
            S = d; S.seeded = true;
            const ks = sortedKeys(); if (!S.current || !S.months[S.current]) S.current = ks[ks.length - 1];
            commit(true); toast('Đã khôi phục từ file');
          });
        } catch(e){ toast('File không đúng định dạng sao lưu'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  },

  /* Chuyển trang Theo tháng / Tiết kiệm */
  'page': function(d){ page = d.p; ovSel = S.current; commit(); window.scrollTo(0, 0); },
  /* Chọn tháng ở trang tổng quan (hiện không có nút gọi) */
  'ov-month': function(d){ ovSel = d.k; render(); },
  /* Bấm một tháng ở trang Tiết kiệm: mở tháng đó ở trang Theo tháng */
  'open-month': function(d){ S.current = d.k; page = 'month'; commit(true); window.scrollTo(0, 0); },

  /* Đặt / sửa / xóa mục tiêu tiết kiệm lớn */
  'big-goal': function(){
    const g = S.bigGoal || {};
    openModal({ title: 'Mục tiêu tiết kiệm lớn', fields: [
      { label: 'Tên mục tiêu', type: 'text', value: g.name || '', placeholder: 'Ví dụ: Mua laptop' },
      { label: 'Số tiền cần', type: 'money', value: g.amount || '', placeholder: 'Ví dụ 20tr', hint: 'Gõ nhanh: 500k, 20tr' }],
      onSave: function(v){
        const n = moneyOrWarn(v[1]); if (n === null) return false;
        if (!n) { toast('Nhập số tiền mục tiêu'); return false; }
        S.bigGoal = { name: v[0].trim() || 'Mục tiêu', amount: n }; commit();
      },
      onDelete: g.amount ? function(){ delete S.bigGoal; commit(); } : null });
  },

  /* Sửa số dư ban đầu (tiền có sẵn trước tháng đầu tiên ghi trong app; có thể âm nếu đang nợ) */
  'init-bal': function(){
    const ib = S.initialBalance || 0;
    openModal({ title: 'Số dư ban đầu', fields: [
      { label: 'Tiền bạn đang có trước tháng đầu tiên ghi trong app', type: 'money', value: Math.abs(ib) || '', placeholder: 'Ví dụ 2tr', hint: 'Gõ nhanh: 500k, 2.5tr' },
      { label: 'Đây là số âm (đang nợ)', type: 'checkbox', value: ib < 0 }],
      onSave: function(v){ const n = moneyOrWarn(v[0]); if (n === null) return false; S.initialBalance = v[1] ? -n : n; commit(); } });
  },

  /* Sao lưu / khôi phục bằng cách chép-dán chuỗi JSON */
  'backup': function(){
    const json = JSON.stringify(S);
    openModal({ title: 'Sao lưu / khôi phục', saveLabel: 'Khôi phục (thay dữ liệu hiện tại)', fields: [
      { label: 'Dữ liệu của bạn', type: 'textarea', value: json, hint: 'Để sao lưu: chọn hết, sao chép rồi dán vào Ghi chú. Để khôi phục: dán dữ liệu cũ vào đây rồi nhấn nút bên dưới.' }],
      onSave: function(v){
        try {
          const d = JSON.parse(v[0]);
          if (!d || !d.months || typeof d.months !== 'object') throw 0;
          S = d;
          const ks = sortedKeys(); if (!ks.length) throw 0;
          if (!S.current || !S.months[S.current]) S.current = ks[ks.length - 1];
          commit(); toast('Đã khôi phục');
        } catch(e){ toast('Dữ liệu không hợp lệ'); return false; }
      } });
  },

  /* Đổi giao diện sáng / tối */
  'theme': function(){
    const r = document.documentElement, cur = r.getAttribute('data-theme');
    const dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    r.setAttribute('data-theme', dark ? 'light' : 'dark');
  }
};

/* ============================ GẮN SỰ KIỆN ============================ */

/* Một bộ nghe click duy nhất cho cả trang: tìm phần tử gần nhất có data-act
   rồi gọi hành động tương ứng (vì HTML được vẽ lại liên tục bằng innerHTML) */
document.getElementById('app').addEventListener('click', function(e){
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.getAttribute('data-act');
  if (act === 'month') return; // ô chọn tháng xử lý ở sự kiện 'change' bên dưới
  const d = { s: el.getAttribute('data-s'), c: el.getAttribute('data-c'), i: el.getAttribute('data-i'), k: el.getAttribute('data-k'), p: el.getAttribute('data-p') };
  if (actions[act]) actions[act](d);
});
/* Đổi tháng ở ô chọn tháng */
document.getElementById('app').addEventListener('change', function(e){
  if (e.target.getAttribute('data-act') === 'month') { S.current = e.target.value; commit(true); }
});

/* Vẽ trang lần đầu */
render(true);
})();

/* Đăng ký service worker để app chạy offline (chỉ khi chạy qua https) */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}
