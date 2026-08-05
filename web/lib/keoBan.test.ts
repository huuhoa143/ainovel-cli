import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import {
  SAN_BAN_PX,
  SAN_COT_PX,
  SAN_HANG_PX,
  SAN_TRUC_PX,
  TRAN_COT_TI,
  kepCot,
  kepHang,
  kepTruc,
} from './keoBan';

/**
 * Sàn và trần của hai thanh chia.
 *
 * Đây là lớp phòng thứ nhất cho ca "kéo mất hẳn một ô": nếu phép kẹp sai thì người dùng kéo
 * được một ô về 0px, và bốn ô của bàn thành ba. Nhấp đúp vẫn cứu được, nhưng chỉ khi họ đoán
 * ra là có đường cứu — nên đúng hơn là đừng bao giờ tới được trạng thái đó.
 */

const RONG_BAN = 1026;

test('cột phải không kéo hẹp hơn sàn đọc được', () => {
  // Dưới ~300px thì mỗi summary của dòng sự kiện xuống ba dòng — cột hẹp đi thì khối chữ CAO
  // LÊN, tức ô hiển thị được ÍT tin hơn. Hẹp không đổi lấy gọn.
  const pt = kepCot(40, RONG_BAN);
  expect((pt / 100) * RONG_BAN).toBeGreaterThanOrEqual(SAN_COT_PX - 1);
});

test('cột phải không kéo rộng quá trần — cột trái còn giữ được bảng sáu cột', () => {
  const pt = kepCot(RONG_BAN, RONG_BAN);
  expect(pt).toBeLessThanOrEqual(TRAN_COT_TI * 100 + 0.1);
});

test('giữa hai mốc thì kéo tự do, không dính nấc', () => {
  const pt = kepCot(420, RONG_BAN);
  expect((pt / 100) * RONG_BAN).toBeCloseTo(420, 0);
});

test('bàn HẸP hơn cả sàn thì sàn vẫn thắng trần — không trả ra khoảng rỗng', () => {
  // Ca này tới được thật: cột giữa 420px ở một cửa sổ hẹp còn cột ngữ cảnh. Sàn 300px lớn
  // hơn trần 0,62×420 = 260px, nên một phép kẹp viết ẩu (`Math.min(max(v, san), tran)`) sẽ
  // trả về TRẦN — tức nhỏ hơn sàn, và cột phải teo lại đúng cái mà sàn tồn tại để chặn.
  const hep = 420;
  const pt = kepCot(999, hep);
  expect((pt / 100) * hep).toBeGreaterThanOrEqual(SAN_COT_PX - 1);
});

test('hàng trên không kéo mất hàng dưới, và ngược lại', () => {
  const cao = 375;
  const tren = kepHang(9999, cao);
  // `fr` của hàng trên; hàng dưới luôn 1fr. Chiều cao thật = fr/(fr+1) × cao.
  const caoTren = (tren / (tren + 1)) * cao;
  expect(cao - caoTren).toBeGreaterThanOrEqual(SAN_HANG_PX - 1);

  const duoi = kepHang(-9999, cao);
  expect((duoi / (duoi + 1)) * cao).toBeGreaterThanOrEqual(SAN_HANG_PX - 1);
});

test('bàn thấp hơn hai sàn cộng lại thì trả 1fr — chia đôi, không chia âm', () => {
  // `.blsan` có `min-height: 176px` nên ca này không tới được từ bố cục, nhưng phép kẹp
  // không được phép phụ thuộc điều đó: một `fr` âm làm cả lưới sập, và nó sập ở đúng những
  // khung hình giữa lúc đổi cỡ cửa sổ — chỗ không ai nhìn thấy để mà sửa.
  expect(kepHang(50, 100)).toBe(1);
  expect(kepHang(50, 0)).toBe(1);
});

test('bàn bề rộng 0 thì không đẻ ra NaN', () => {
  // `getBoundingClientRect()` trả 0 cho một phần tử đang `display: none` — ca thật ở nhánh
  // một cột. `NaN%` trong `grid-template-columns` làm cả bàn sập về một cột, im lặng.
  const pt = kepCot(300, 0);
  expect(Number.isFinite(pt)).toBe(true);
});

/* ── trục sản xuất ────────────────────────────────────────────────────── */

test('trục không kéo hụt xuống dưới một lane rưỡi', () => {
  expect(kepTruc(10, 400)).toBe(SAN_TRUC_PX);
});

test('trục không kéo quá trần do người gọi đo', () => {
  // Trần là hai ràng buộc cùng lúc — chỗ còn lại sau khi bàn giữ đủ sàn, VÀ chiều cao nội
  // dung thật của trục. Kéo quá nội dung chỉ đẻ ra khoảng trắng giữa hai vùng dày đặc.
  expect(kepTruc(9999, 240)).toBe(240);
});

test('khung quá thấp thì SÀN thắng trần — trục không teo về một khe', () => {
  // Ca thật: cuốn có cả dải quyết định lẫn cảnh báo trên một màn hình 900px. Chỗ còn lại cho
  // trục tụt xuống dưới sàn, và một phép kẹp viết thẳng sẽ trả về trần — tức nhỏ hơn sàn.
  expect(kepTruc(200, 20)).toBe(SAN_TRUC_PX);
});

test('trục nhận giá trị rác thì về sàn, không đẻ ra NaN', () => {
  expect(kepTruc(Number.NaN, 300)).toBe(SAN_TRUC_PX);
});

/* ── hai bản của cùng một con số ──────────────────────────────────────── */

test('sàn trong CSS và sàn trong TS không được lệch nhau', () => {
  // `SAN_TRUC_PX` và `SAN_BAN_PX` tồn tại HAI bản: CSS cần chúng để bố cục không bị bóp, còn
  // thanh chia cần chúng để biết được kéo tới đâu. Hai bản của một con số là một chỗ để lệch,
  // và lúc lệch thì thanh chia cho kéo qua giới hạn mà CSS vẫn chặn — người dùng kéo được mà
  // không có gì nhúc nhích, không lỗi nào.
  const css = readFileSync(join(import.meta.dirname, '../app/globals.css'), 'utf8');

  const truc = css.match(/\.bltruc\s*\{[^}]*?min-height:\s*(\d+)px/s);
  expect(truc, 'không tìm thấy min-height của .bltruc').not.toBeNull();
  expect(Number(truc![1])).toBe(SAN_TRUC_PX);

  const ban = css.match(/\.blsan\s*\{[^}]*?min-height:\s*(\d+)px/s);
  expect(ban, 'không tìm thấy min-height của .blsan').not.toBeNull();
  expect(Number(ban![1])).toBe(SAN_BAN_PX);
});
