import { expect, test } from 'vitest';

import { nhanSuKienUi } from './dongSuKien';

test('mẩu văn sống lọt vào đường ui bị bỏ, KHÔNG làm hỏng mốc seq', () => {
  // Đây đúng payload của `stream_delta`. Nó không có `seq`.
  expect(nhanSuKienUi({ text: 'nàng quay đầu lại' }, 12)).toBeUndefined();
});

test('sự kiện cũ hoặc trùng bị bỏ', () => {
  expect(nhanSuKienUi({ seq: 12, kind: 'ui_event' }, 12)).toBeUndefined();
  expect(nhanSuKienUi({ seq: 5, kind: 'ui_event' }, 12)).toBeUndefined();
});

test('sự kiện mới được nhận nguyên vẹn', () => {
  const ev = { seq: 13, kind: 'ui_event', summary: 'viết chương 2' };
  expect(nhanSuKienUi(ev, 12)).toEqual(ev);
});

test('seq không phải số bị bỏ — kể cả chuỗi số', () => {
  // Một `seq: "13"` lọt qua `>` sẽ so sánh kiểu ép, rồi được gán vào mốc dưới dạng chuỗi;
  // phép so sánh kế tiếp sẽ so chuỗi với số và cho kết quả không đoán được.
  expect(nhanSuKienUi({ seq: '13', kind: 'ui_event' }, 12)).toBeUndefined();
});
