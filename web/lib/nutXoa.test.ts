import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

/**
 * Canh cách trình bày nút `Xóa` trong bảng Quản lý.
 *
 * # Vì sao bài kiểm này ĐỌC CSS trên đĩa
 *
 * jsdom không tính style từ stylesheet ngoài, nên một bài kiểm render sẽ thấy mọi thuộc tính
 * là rỗng và xanh bất kể CSS viết gì. Cùng kỹ thuật `lib/dauHieu.test.ts` đã dùng cho
 * `app/icon.svg`: đọc tệp thật rồi đối chiếu luật.
 *
 * # Vì sao cần canh
 *
 * Bản đầu của nút này dùng `.nutPhu.nguyHiem`, và nó sai ở hai tầng cùng lúc vì `.nutPhu` mang
 * sẵn `background: var(--raised)` + viền — thêm `color: --red` vào ra một CHIP ĐỎ CÓ NỀN trên
 * mỗi hàng. Hai điều khoản của DESIGN.md bị phá một lượt:
 *
 *   "đỏ nghĩa là lỗi, còn dừng có chủ ý không phải lỗi"  → xóa có chủ ý cũng không phải lỗi
 *   "khác màu chữ, không phải nền cả dòng"               → một khối màu làm mắt nhảy tới nó
 *
 * Không bài kiểm nào đỏ lúc đó, vì lỗi nằm ở chỗ hai lớp CSS GẶP NHAU — không ở lớp nào cả.
 */

const css = readFileSync(
  fileURLToPath(new URL('../app/globals.css', import.meta.url)),
  'utf8',
);

/** Thân của một luật CSS theo selector chính xác. */
function than(selector: string): string {
  const i = css.indexOf(selector + ' {');
  expect(i, `không thấy luật ${selector}`).toBeGreaterThan(-1);
  return css.slice(i + selector.length + 2, css.indexOf('}', i));
}

/** Giá trị của một thuộc tính trong thân luật. */
function thuocTinh(thanLuat: string, ten: string): string | undefined {
  return thanLuat.match(new RegExp(`(?:^|[;{\\s])${ten}:\\s*([^;]+);`))?.[1]?.trim();
}

const NGHI = '.bangxuong td.lam .nutXoa';
const CHI_VAO =
  '.bangxuong td.lam .nutXoa:hover:not(:disabled),\n.bangxuong td.lam .nutXoa:focus-visible';

test('lúc NGHỈ không mang màu lỗi — đỏ là màu của lỗi, xóa có chủ ý thì không', () => {
  expect(than(NGHI)).not.toContain('--red');
});

test('lúc nghỉ không tô nền và không viền màu — một khối màu mỗi hàng làm mắt nhảy', () => {
  expect(thuocTinh(than(NGHI), 'background')).toBe('none');
  expect(thuocTinh(than(NGHI), 'border')).toBe('1px solid transparent');
});

/**
 * Đỏ phải xuất hiện ở ĐÚNG một chỗ: khoảnh khắc người dùng chỉ vào nút.
 *
 * `:focus-visible` đi CÙNG `:hover` chứ không phải thêm cho đủ bộ: bàn phím là đường duy nhất
 * tới nút này của người không dùng chuột, và một nút phá hủy không được im lặng khi nó đang
 * là thứ sắp bị Enter.
 */
test('đỏ chỉ hiện ở hover và focus-visible, và vẫn không tô nền', () => {
  expect(than(CHI_VAO)).toContain('--red');
  expect(thuocTinh(than(CHI_VAO), 'background')).toBeUndefined();
});

/**
 * Hai nút cùng một hàng phải cùng hệ chữ.
 *
 * Bản đầu lệch `Chi tiết` ở bốn thuộc tính một lúc (11px/500 vs 12px/400, bo 3px vs 5px, đệm
 * 4px vs 3px, có nền vs không). Bốn chỗ lệch thì không đọc ra hai cấp bậc — nó đọc ra là hỏng.
 */
test('khớp Chi tiết từng con số: cỡ chữ, độ đậm, bo góc, đệm', () => {
  const xoa = than(NGHI);
  const chiTiet = than('.nutChiTiet');
  for (const ten of ['font', 'border-radius', 'padding']) {
    expect(thuocTinh(xoa, ten), `${ten} của Xóa phải khớp Chi tiết`).toBe(
      thuocTinh(chiTiet, ten),
    );
  }
});

/**
 * Khoảng cách NGOÀI nhóm phải rộng hơn khoảng cách TRONG nhóm.
 *
 * `Chi tiết` (điều hướng) và `Xóa` (phá hủy) là hai nhóm khác nhau. Cùng khe với các nút điều
 * hướng thì chúng đọc thành một cặp cùng loại, và tay đi theo thói quen vị trí.
 */
test('Xóa tách khỏi nhóm điều hướng bằng khe rộng hơn', () => {
  const kheTrongNhom = Number(
    thuocTinh(than('.bangxuong td.lam .nutPhu'), 'margin')?.split(/\s+/)[1]?.replace('px', ''),
  );
  const leXoa = Number(
    thuocTinh(than(NGHI), 'margin')?.split(/\s+/)[3]?.replace('px', ''),
  );
  expect(Number.isFinite(kheTrongNhom), 'không đọc được khe của nhóm điều hướng').toBe(true);
  expect(Number.isFinite(leXoa), 'Xóa phải khai lề trái').toBe(true);
  expect(leXoa).toBeGreaterThan(kheTrongNhom);
});
