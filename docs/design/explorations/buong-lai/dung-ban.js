/* Dựng lại cột giữa của buồng lái thành BÀN CHIA Ô, từ chính markup thật.
 *
 * Bản dựng thử này cố ý KHÔNG viết lại markup bằng tay: nó nhận nguyên cây DOM
 * mà ứng dụng thật đã render (chụp ở 1512×900, cuốn `viet-truyen-mat-the-2`,
 * engine đang chạy) và chỉ sắp xếp lại. Chép tay ra một bản HTML riêng là dựng
 * một bản thứ hai của sự thật — bản đó sẽ đẹp hơn bản thật và giấu đi đúng
 * những chỗ mà bố cục mới phải chịu được.
 *
 * Mọi thao tác DOM ở đây dùng `createElement`/`textContent`/`cloneNode`, không
 * `innerHTML`: bản dựng thử này nhận markup đến từ một trang khác, nên nó
 * không được là chỗ dạy người sau rằng nối chuỗi HTML là bình thường.
 */

const khung = document.querySelector('.khung');
const giua = document.querySelector('.blgiua');

/** Bản gốc của cột giữa, giữ nguyên để bố cục "Hiện tại" dựng lại đúng nó. */
const GOC = document.createDocumentFragment();
for (const n of [...giua.childNodes]) GOC.appendChild(n);

function tra(el, ma) {
  const e = document.createElement(el);
  if (ma) e.className = ma;
  return e;
}

/** Dựng một ô của bàn từ một `<section class="sect">` có sẵn. */
function oTuSect(sect, ma, demChu) {
  const o = tra('div', `blo blo-${ma}`);

  const dau = tra('div', 'blodau');
  const h2 = sect.querySelector(':scope > h2');
  if (h2) dau.appendChild(h2);
  if (demChu) {
    const dem = tra('span', 'dem');
    dem.textContent = demChu;
    dau.appendChild(dem);
  }

  const than = tra('div', 'blothan');
  while (sect.firstChild) than.appendChild(sect.firstChild);

  o.append(dau, than);
  return o;
}

function dungBan() {
  const cuon = giua.querySelector('.blcuon');
  if (!cuon) return;

  const sects = [...cuon.querySelectorAll(':scope > .sect')];
  const sSuKien = sects.find((s) => s.id === 'dong-su-kien');
  const sNhatKy = sects.find((s) => s.id === 'nhat-ky-phan-quyet');
  const sChuong = sects.find((s) => s !== sSuKien && s !== sNhatKy);

  const soHang = sChuong ? sChuong.querySelectorAll('tbody tr').length : 0;
  const soSk = sSuKien ? sSuKien.querySelectorAll('.dong .sk').length : 0;
  const soPq = sNhatKy ? sNhatKy.querySelectorAll('.log .entry').length : 0;

  const san = tra('div', 'blsan');

  // Ô văn sống: `.vansong` đã mang sẵn đầu ô và thân ô, nên nó chỉ cần một vỏ.
  const oSong = tra('div', 'blo blo-song');
  oSong.appendChild(giua.querySelector('.vansong'));

  san.appendChild(oSong);
  if (sSuKien) san.appendChild(oTuSect(sSuKien, 'sukien', `${soSk} dòng`));
  if (sChuong) san.appendChild(oTuSect(sChuong, 'chuong', `${soHang} chương`));
  if (sNhatKy) san.appendChild(oTuSect(sNhatKy, 'nhatky', `${soPq} phán quyết`));

  giua.insertBefore(san, cuon);
  cuon.remove();
}

/* ── bộ chuyển bố cục ─────────────────────────────────────────────────── */

const BO_CUC = ['hientai', 'a', 'b'];

function datBoCuc(ma) {
  for (const m of BO_CUC) khung.classList.remove(`bocuc-${m}`);
  giua.replaceChildren(GOC.cloneNode(true));
  if (ma !== 'hientai') {
    khung.classList.add(`bocuc-${ma}`);
    dungBan();
  }
  for (const nut of document.querySelectorAll('.chon-bocuc button')) {
    nut.setAttribute('aria-pressed', String(nut.dataset.ma === ma));
  }
  requestAnimationFrame(doLai);
}

/* ── thước đo ─────────────────────────────────────────────────────────────
 * Con số, không phải cảm giác: mỗi vùng báo bao nhiêu phần trăm nội dung của
 * nó đang đọc được mà không phải cuộn. Đây là đúng phép đo đã kết tội bố cục
 * cũ, nên nó phải chạy được trên cả ba bố cục. */

function doVung(nhan, el) {
  if (!el) return null;
  const h = el.clientHeight;
  const s = el.scrollHeight;
  return {
    nhan,
    cao: Math.round(h),
    can: Math.round(s),
    pt: s > 0 ? Math.round((h / s) * 100) : 100,
  };
}

function doLai() {
  const co = (sel) => document.querySelector(sel);
  const vung = [
    doVung('Trục sản xuất', co('.bltruc')),
    doVung('Máy đang nói', co('.vsthan')),
    co('.blsan') ? null : doVung('Khu cuộn · 3 mục nối đuôi', co('.blcuon')),
    doVung('Dòng sự kiện', co('.blo-sukien .blothan')),
    doVung('Chương', co('.blo-chuong .blothan')),
    doVung('Nhật ký phán quyết', co('.blo-nhatky .blothan')),
  ].filter(Boolean);

  const ds = document.querySelector('.thuocdo .ds');
  ds.replaceChildren();
  for (const v of vung) {
    const muc = tra('span', v.pt < 25 ? 'muc kem' : 'muc');
    const nhan = tra('span', 'nh');
    nhan.textContent = v.nhan;
    const so = tra('span', 'so');
    so.textContent = `${v.pt}%`;
    so.title = `${v.cao}px đọc được / ${v.can}px nội dung`;
    muc.append(nhan, so);
    ds.appendChild(muc);
  }

  const canvas = co('.canvas.buonglai');
  document.querySelector('.thuocdo .khungco').textContent =
    `canvas ${Math.round(canvas.clientWidth)}×${Math.round(canvas.clientHeight)}` +
    ` · cửa sổ ${window.innerWidth}×${window.innerHeight}`;
}

document.querySelector('.chon-bocuc').addEventListener('click', (e) => {
  const nut = e.target.closest('button[data-ma]');
  if (nut) datBoCuc(nut.dataset.ma);
});

document.querySelector('.chon-insp').addEventListener('click', () => {
  khung.classList.toggle('rong');
  requestAnimationFrame(doLai);
});

window.addEventListener('resize', () => requestAnimationFrame(doLai));

datBoCuc('a');
