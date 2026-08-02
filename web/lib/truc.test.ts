import { expect, test } from 'vitest';

import type { ChapterMark, MarkState } from './types';

import { nhomVach } from './truc';

/**
 * `nhomVach` gộp các chương liền nhau cùng trạng thái thành một dải, để một dãy 40 chương đã
 * nghiệm thu là một khối liền chứ không phải vạch sọc do làm mờ dưới điểm ảnh.
 *
 * Tệp này canh phần MỚI: tách chương vừa chốt ra khỏi dải của nó. Hoạt ảnh họ 09 đổ đầy cả
 * PHẦN TỬ từ trái, nên chạy nó trên một dải gộp 40 chương là nói "cả bốn mươi chương vừa
 * chốt" — sai gấp bốn mươi lần, và sai đúng lúc người vận hành đang tin nhất.
 */

function ms(...cap: [number, MarkState][]): ChapterMark[] {
  return cap.map(([chapter, state]) => ({ chapter, state }));
}

test('không truyền tập vừa chốt thì gộp y như cũ', () => {
  const d = nhomVach(ms([1, 'done'], [2, 'done'], [3, 'done']));
  expect(d).toHaveLength(1);
  expect(d[0]).toMatchObject({ from: 1, to: 3, len: 3 });
});

test('chương vừa chốt được TÁCH thành dải một chương', () => {
  const d = nhomVach(ms([1, 'done'], [2, 'done'], [3, 'done']), new Set([3]));
  expect(d.map((x) => [x.from, x.to, x.len])).toEqual([
    [1, 2, 2],
    [3, 3, 1],
  ]);
  expect(d[1]!.vuaChot).toBe(true);
  expect(d[0]!.vuaChot).toBe(false);
});

test('chương vừa chốt ở GIỮA cắt dải làm ba', () => {
  // Ca thật khi một chương bị trả về viết lại rồi chốt lại: nó nằm giữa hai đoạn đã xong.
  const d = nhomVach(ms([1, 'done'], [2, 'done'], [3, 'done'], [4, 'done']), new Set([2]));
  expect(d.map((x) => [x.from, x.to])).toEqual([
    [1, 1],
    [2, 2],
    [3, 4],
  ]);
});

test('TỔNG trọng số không đổi khi tách — đây là điều kiện để không xê dịch gì', () => {
  // Độ rộng dải là `flexGrow: len`. Nếu tổng đổi thì cả lane co giãn ngay giữa lúc hoạt ảnh
  // chạy, tức chuyển động mang thông tin biến thành chuyển động gây nhiễu.
  const marks = ms([1, 'done'], [2, 'done'], [3, 'done'], [4, 'running'], [5, 'pending']);
  const truoc = nhomVach(marks).reduce((s, d) => s + d.len, 0);
  const sau = nhomVach(marks, new Set([2, 3])).reduce((s, d) => s + d.len, 0);
  expect(sau).toBe(truoc);
  expect(sau).toBe(marks.length);
});

test('hai chương chốt LIỀN nhau vẫn là hai dải, không bị nuốt vào nhau', () => {
  // Đây là ca mà vế thứ hai của điều kiện gộp tồn tại để chặn. Thiếu nó thì chương 3 gộp vào
  // dải một-chương của chương 2 và một trong hai mất hoạt ảnh.
  const d = nhomVach(ms([1, 'done'], [2, 'done'], [3, 'done']), new Set([2, 3]));
  expect(d.map((x) => [x.from, x.len])).toEqual([
    [1, 1],
    [2, 1],
    [3, 1],
  ]);
  expect(d.filter((x) => x.vuaChot)).toHaveLength(2);
});

test('chương chốt KHÔNG nuốt chương sau nó vào dải của mình', () => {
  const d = nhomVach(ms([1, 'done'], [2, 'done'], [3, 'done']), new Set([1]));
  expect(d.map((x) => [x.from, x.to, x.len])).toEqual([
    [1, 1, 1],
    [2, 3, 2],
  ]);
});

test('chương trong tập nhưng KHÔNG có trong marks thì không tạo dải ma', () => {
  // Tập `vua` giữ theo GIỜ (2s) còn lane là một cửa sổ trượt, nên chương vừa chốt có thể đã
  // ra khỏi cửa sổ trước khi đồng hồ chạy hết. Nó chỉ đơn giản là không được vẽ.
  const d = nhomVach(ms([10, 'pending'], [11, 'pending']), new Set([3]));
  expect(d).toHaveLength(1);
  expect(d[0]).toMatchObject({ from: 10, to: 11, len: 2 });
});

test('đứt quãng số chương vẫn cắt dải, kể cả khi cùng trạng thái', () => {
  // Luật cũ và nó phải sống sót: `m.chapter === cuoi.to + 1`. Cửa sổ trượt cho ra danh sách
  // không liền số, và gộp 5 với 9 thành một dải "5–9" là vẽ ra bốn chương không tồn tại.
  const d = nhomVach(ms([5, 'done'], [9, 'done']));
  expect(d.map((x) => [x.from, x.to])).toEqual([
    [5, 5],
    [9, 9],
  ]);
});
