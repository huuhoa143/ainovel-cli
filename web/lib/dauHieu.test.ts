import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import {
  DAU_BO_GOC,
  DAU_CAO,
  DAU_LANE,
  DAU_MAU,
  DAU_NEN_BO_GOC,
  DAU_VIEWBOX,
  DAU_X,
} from './dauHieu';

/**
 * Logo và favicon phải là MỘT dấu hiệu.
 *
 * Chúng không thể dùng chung mã: logo là SVG nội tuyến đọc được biến CSS, favicon là tệp
 * tĩnh mà trình duyệt tải như ảnh riêng nên buộc phải viết hex. Hai bản của một hình thì có
 * ngày lệch, và ở đây nó đã lệch thật trước bản này — `icon.svg` ghi `#221d17 / #4f9d8b /
 * #e0a53a` kèm chú thích khẳng định đó là token đã chuyển sang sRGB, trong khi token thật
 * cho `#0e0c09 / #71c1ad / #eab656`. Cả ba màu sai, và không có gì đối chiếu nên không ai
 * thấy.
 *
 * Bài kiểm này là cái đối chiếu đó: nó ĐỌC tệp trên đĩa, không đọc một bản sao trong mã.
 */

const svg = readFileSync(
  fileURLToPath(new URL('../app/icon.svg', import.meta.url)),
  'utf8',
);

/** Các `<rect>` trong tệp, theo đúng thứ tự xuất hiện. */
function docRect(): Record<string, string>[] {
  return [...svg.matchAll(/<rect\b([^>]*)\/>/g)].map((m) =>
    Object.fromEntries(
      [...m[1]!.matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1]!, a[2]!]),
    ),
  );
}

test('favicon có đúng một tấm nền cộng ba lane — không thừa, không thiếu', () => {
  expect(docRect()).toHaveLength(1 + DAU_LANE.length);
});

test('tấm nền favicon khớp viewBox và màu --bg', () => {
  const nen = docRect()[0]!;
  expect(nen.width).toBe(String(DAU_VIEWBOX));
  expect(nen.height).toBe(String(DAU_VIEWBOX));
  expect(nen.rx).toBe(String(DAU_NEN_BO_GOC));
  expect(nen.fill).toBe(DAU_MAU.nen);
});

test('ba lane của favicon khớp TỪNG con số với lib/dauHieu.ts', () => {
  const lanes = docRect().slice(1);
  expect(lanes).toHaveLength(DAU_LANE.length);

  DAU_LANE.forEach((muon, i) => {
    const co = lanes[i]!;
    expect(co.x, `lane ${i} · x`).toBe(String(DAU_X));
    expect(co.y, `lane ${i} · y`).toBe(String(muon.y));
    expect(co.width, `lane ${i} · width`).toBe(String(muon.w));
    expect(co.height, `lane ${i} · height`).toBe(String(DAU_CAO));
    expect(co.rx, `lane ${i} · rx`).toBe(String(DAU_BO_GOC));
    expect(co.fill, `lane ${i} · fill`).toBe(DAU_MAU[muon.token]);
  });
});

test('viewBox của tệp khớp hằng số', () => {
  expect(svg).toContain(`viewBox="0 0 ${DAU_VIEWBOX} ${DAU_VIEWBOX}"`);
});

/**
 * Ba lane phải TÁCH được ở 16px — cỡ favicon thật trên thanh tab.
 *
 * Đây là bài kiểm về HÌNH, không về mã: bước 6px (khe 2px) co lại còn khe 1px ở nửa tỉ lệ,
 * và ba dải dính thành một khối xám không đọc ra là ba tầng. Chốt khe ≥ 3px ở hệ 32 để nó
 * còn ≥ 1,5px ở 16.
 */
test('khe giữa hai lane đủ rộng để còn tách được ở cỡ favicon 16px', () => {
  for (let i = 1; i < DAU_LANE.length; i++) {
    const khe = DAU_LANE[i]!.y - (DAU_LANE[i - 1]!.y + DAU_CAO);
    expect(khe, `khe giữa lane ${i - 1} và ${i}`).toBeGreaterThanOrEqual(3);
  }
});

/**
 * Độ rộng GIẢM DẦN, vì Tập ⊃ Cung ⊃ Chương.
 *
 * Ba dải bằng nhau đọc thành nút hamburger; bậc thang giảm dần thì không. Bài này chặn một
 * lần "chỉnh cho cân" trong tương lai làm mất luôn ý nghĩa của hình.
 */
test('ba lane giảm dần độ rộng — bậc thang, không phải hamburger', () => {
  const w = DAU_LANE.map((l) => l.w);
  expect(w).toEqual([...w].sort((a, b) => b - a));
  expect(new Set(w).size).toBe(w.length);
});

/**
 * Đúng MỘT lane mang màu tín hiệu.
 *
 * DESIGN.md: vàng là màu tín hiệu DUY NHẤT. Hai lane vàng thì dấu hiệu không còn tiêu điểm,
 * và nó phá chính điều khoản mà cả hệ màu dựa vào.
 */
test('chỉ MỘT lane dùng vàng — màu tín hiệu duy nhất', () => {
  expect(DAU_LANE.filter((l) => l.token === 'gold')).toHaveLength(1);
});

/** Không lane nào lòi ra khỏi khung. */
test('mọi lane nằm trong viewBox', () => {
  for (const l of DAU_LANE) {
    expect(DAU_X + l.w).toBeLessThanOrEqual(DAU_VIEWBOX);
    expect(l.y + DAU_CAO).toBeLessThanOrEqual(DAU_VIEWBOX);
  }
});

/**
 * Favicon phải khai `width`/`height`, không chỉ `viewBox`.
 *
 * Một SVG chỉ có `viewBox` không có kích thước NỘI TẠI, và không phải consumer nào cũng suy
 * ra được: đo được ngay trong lượt dựng này — `new Image()` trong Chrome bắn `onerror` khi
 * nạp tệp thiếu hai thuộc tính đó, tức không rasterise được. Trình duyệt vẫn vẽ nó trên
 * thanh tab, nhưng mọi công cụ khác đọc favicon (bookmark, PWA, trình đọc RSS, ảnh xem
 * trước) thì không chắc.
 */
test('favicon khai kích thước nội tại, không chỉ viewBox', () => {
  expect(svg).toMatch(/<svg[^>]*\bwidth="32"/);
  expect(svg).toMatch(/<svg[^>]*\bheight="32"/);
});

/**
 * Favicon phải là XML HỢP LỆ, và đây không phải bài kiểm lý thuyết.
 *
 * SVG được phân tích như XML nghiêm ngặt. XML CẤM chuỗi hai dấu gạch nối bên trong comment,
 * nên một lần viết tên biến CSS đầy đủ trong khối chú thích đã làm cả tệp hỏng: `new Image()`
 * bắn `onerror`, favicon không rasterise được, và trình duyệt KHÔNG báo gì — nó chỉ im lặng
 * không vẽ. Lỗi đó xảy ra thật trong chính lượt dựng này và chỉ lộ ra vì có người thử nạp
 * tệp vào canvas.
 *
 * `DOMParser` không có trong project `logic` (môi trường Node), nên bài này kiểm bằng luật
 * chữ — đúng thứ đã hỏng — thay vì giả vờ phân tích XML.
 */
test('khối chú thích không chứa chuỗi cấm của XML', () => {
  const comment = /<!--([\s\S]*?)-->/.exec(svg)?.[1] ?? '';
  expect(comment).not.toBe('');
  expect(comment.includes('--'), 'comment XML không được chứa hai dấu gạch nối liền nhau').toBe(
    false,
  );
});

test('tệp chỉ có ĐÚNG một khối chú thích và đóng đúng cách', () => {
  // Nhiều khối, hoặc một khối không đóng, đều làm phần còn lại của tệp bị nuốt.
  expect([...svg.matchAll(/<!--/g)]).toHaveLength(1);
  expect([...svg.matchAll(/-->/g)]).toHaveLength(1);
});
