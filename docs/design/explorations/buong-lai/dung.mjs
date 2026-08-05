/* Ghép bản dựng thử từ ba mảnh: CSS thật của ứng dụng, markup thật đã chụp,
 * và lớp phủ bố cục mới.
 *
 * Chạy: `node docs/design/explorations/buong-lai/dung.mjs`
 *
 * Markup được chụp bằng `document.querySelector('.khung').outerHTML` trên
 * ứng dụng đang chạy ở 1512×900. CSS lấy nguyên tệp mà Next đã dựng, không
 * chép lại: một bản chép sẽ trôi khỏi bản thật ngay lần sửa token đầu tiên,
 * và lúc đó bản dựng thử nói về một hệ màu không còn tồn tại.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const day = dirname(fileURLToPath(import.meta.url));
const goc = join(day, '../../../..');

const css = readFileSync(join(goc, '.omc/anh/app.css'), 'utf8');
const khung = readFileSync(join(goc, '.omc/anh/khung.html'), 'utf8');
const lop = readFileSync(join(day, 'bo-cuc-moi.css'), 'utf8');
const js = readFileSync(join(day, 'dung-ban.js'), 'utf8');

const vo = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buồng lái · bàn chia ô — bản dựng thử</title>
<style>
${css}
</style>
<style>
${lop}
</style>
<style>
/* ── vỏ của bản dựng thử ──
   Thanh điều khiển này KHÔNG thuộc sản phẩm. Nó ngồi NGOÀI khung ứng dụng và
   đẩy khung xuống, chứ không đè lên — một thanh nổi che mất một góc bề mặt
   đang được đánh giá là đúng thứ làm phép đánh giá sai. */
html, body { height: 100%; margin: 0; }
body {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: var(--bg);
}
.bang-thu {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 9px 16px;
  background: oklch(0.135 0.006 74);
  border-bottom: 1px solid var(--line);
  font: 400 12px/1.5 var(--ui);
  color: var(--ink-2);
}
.bang-thu .de {
  font-weight: 600;
  color: var(--ink);
  margin-right: 4px;
}
.bang-thu .de em { font-style: normal; color: var(--ink-3); font-weight: 400; }
.chon-bocuc { display: flex; gap: 0; }
.chon-bocuc button,
.chon-insp {
  font: 400 12px var(--ui);
  color: var(--ink-2);
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 4px 11px;
  cursor: pointer;
  transition: background .16s var(--ease), color .16s var(--ease), border-color .16s var(--ease);
}
.chon-bocuc button + button { border-left: 0; }
.chon-bocuc button:first-child { border-radius: var(--r) 0 0 var(--r); }
.chon-bocuc button:last-child { border-radius: 0 var(--r) var(--r) 0; }
.chon-insp { border-radius: var(--r); }
.chon-bocuc button:hover, .chon-insp:hover { background: var(--raised); color: var(--ink); }
.chon-bocuc button[aria-pressed="true"] {
  background: var(--gold);
  border-color: var(--gold);
  color: oklch(0.19 0.02 74);
}
.chon-bocuc button:focus-visible,
.chon-insp:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }

/* Thước đo: bao nhiêu phần trăm mỗi vùng đọc được mà không phải cuộn.
   Một hàng ngang, không phải một bảng — thanh này ăn chiều cao của chính bề
   mặt nó đang đo, nên mỗi dòng nó thêm là một dòng nó làm sai phép đo. */
.thuocdo { margin-left: auto; display: flex; align-items: center; gap: 14px; min-width: 0; }
.thuocdo .khungco { font: 400 11px var(--mono); color: var(--ink-3); white-space: nowrap; }
.thuocdo .ds { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.thuocdo .muc { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }
.thuocdo .nh { font: 400 11px var(--ui); color: var(--ink-3); }
.thuocdo .so { font: 400 11px var(--mono); color: var(--teal); }
.thuocdo .kem .so { color: var(--red); }

.khung { min-height: 0; }
</style>
</head>
<body>

<div class="bang-thu">
  <span class="de">Buồng lái · bàn chia ô <em>— bản dựng thử, dữ liệu chụp lúc engine đang chạy</em></span>

  <div class="chon-bocuc" role="group" aria-label="Bố cục">
    <button type="button" data-ma="hientai" aria-pressed="false">Hiện tại</button>
    <button type="button" data-ma="a" aria-pressed="true">A · bàn 2×2</button>
    <button type="button" data-ma="b" aria-pressed="false">B · ba cột</button>
  </div>

  <button type="button" class="chon-insp">Bật/tắt cột ngữ cảnh</button>

  <div class="thuocdo">
    <span class="khungco"></span>
    <span class="ds" title="phần trăm nội dung đọc được mà không phải cuộn"></span>
  </div>
</div>

${khung}

<script>
${js}
</script>
</body>
</html>
`;

const ra = join(day, 'index.html');
writeFileSync(ra, vo);
console.log(`đã dựng ${ra} · ${(vo.length / 1024).toFixed(0)}KB`);
