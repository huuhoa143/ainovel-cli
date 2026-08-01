import { expect, test } from 'vitest';

import { BO_DEM_RONG, themChu } from './vanSong';

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
