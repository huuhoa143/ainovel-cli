import { expect, test } from 'vitest';

import { BO_DEM_RONG, moLuot, themChu } from './vanSong';

test('mẩu đầu tiên tạo lượt mở, không có nhãn vạch', () => {
  const bd = themChu(BO_DEM_RONG, 'nàng ');
  expect(bd.luot).toHaveLength(1);
  expect(bd.luot[0]!.chu).toBe('nàng ');
  expect(bd.luot[0]!.nhan).toBeUndefined();
});

test('mẩu kế tiếp nối vào lượt hiện tại, không mở lượt mới', () => {
  const bd = themChu(themChu(BO_DEM_RONG, 'nàng '), 'quay đầu lại');
  expect(bd.luot).toHaveLength(1);
  expect(bd.luot[0]!.chu).toBe('nàng quay đầu lại');
});

test('bộ đệm cũ không bị sửa tại chỗ', () => {
  const truoc = themChu(BO_DEM_RONG, 'a');
  themChu(truoc, 'b');
  expect(truoc.luot[0]!.chu).toBe('a');
});

test('lệnh xóa mở lượt mới, chữ lượt trước KHÔNG mất', () => {
  let bd = themChu(BO_DEM_RONG, 'lượt một');
  bd = moLuot(bd, '— chương 2 · 23:11 —');
  bd = themChu(bd, 'lượt hai');

  expect(bd.luot).toHaveLength(2);
  expect(bd.luot[0]!.chu).toBe('lượt một');
  expect(bd.luot[1]!.chu).toBe('lượt hai');
  expect(bd.luot[1]!.nhan).toBe('— chương 2 · 23:11 —');
});

test('mỗi lượt có id riêng, không dùng lại', () => {
  let bd = themChu(BO_DEM_RONG, 'a');
  bd = moLuot(bd, 'v1');
  bd = moLuot(bd, 'v2');
  const id = bd.luot.map((l) => l.id);
  expect(new Set(id).size).toBe(id.length);
});

test('hai lệnh xóa liền nhau không để lại lượt rỗng', () => {
  // Engine phát sentinel hai lần liên tiếp là ca hợp lệ (lượt bị hủy trước khi phát chữ).
  // Một lượt rỗng vẽ ra là một vạch ngăn không ngăn gì cả.
  let bd = themChu(BO_DEM_RONG, 'a');
  bd = moLuot(bd, 'v1');
  bd = moLuot(bd, 'v2');
  expect(bd.luot).toHaveLength(2);
  expect(bd.luot[1]!.nhan).toBe('v2');
});
