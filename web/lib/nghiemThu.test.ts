import { expect, test } from 'vitest';

import type { TienDo } from './types';
import { trangThaiCua } from './nghiemThu';

test('advance null (engine đóng) thì KHÔNG có cửa nào chờ', () => {
  // `null` = engine đóng nên không đo được. Vẽ một cửa nghiệm thu lúc đó là mời người dùng
  // bấm một nút chắc chắn trả 409.
  expect(trangThaiCua(null)).toEqual({ dangCho: false, cheDoDuyet: false });
});

test('chế độ auto thì không bao giờ chờ, kể cả hold bật', () => {
  const a: TienDo = { mode: 'auto', hold: true };
  expect(trangThaiCua(a).dangCho).toBe(false);
});

test('chế độ review + hold thì cửa đang chờ, kèm chương và lý do', () => {
  const a: TienDo = {
    mode: 'review', hold: true, permit_chapter: 8, hold_reason: 'nhịp tụt ở đoạn giữa',
  };
  const t = trangThaiCua(a);
  expect(t.dangCho).toBe(true);
  expect(t.cheDoDuyet).toBe(true);
  expect(t.chuong).toBe(8);
  expect(t.lyDo).toBe('nhịp tụt ở đoạn giữa');
});

test('chế độ review mà chưa tới biên thì chưa chờ', () => {
  expect(trangThaiCua({ mode: 'review', hold: false }).dangCho).toBe(false);
  expect(trangThaiCua({ mode: 'review', hold: false }).cheDoDuyet).toBe(true);
});

test('hold bật mà KHÔNG có lý do vẫn là đang chờ — lý do là tùy, cửa thì không', () => {
  // Engine có thể dừng ở biên mà Editor chưa kịp kết luận. Đòi lý do mới vẽ cửa sẽ giấu mất
  // một dây chuyền đang đứng im.
  expect(trangThaiCua({ mode: 'review', hold: true }).dangCho).toBe(true);
});
