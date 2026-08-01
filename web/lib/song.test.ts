import { expect, test } from 'vitest';

import { snap } from '@/components/mau.test-helper';

import { mayDangChay } from './song';

/**
 * `runtime` phải THẮNG `book.activity`, và đây là một lỗi ĐO ĐƯỢC.
 *
 * `activity` suy từ mốc checkpoint gần nhất trong store (`activityOf`), nên nó là "vừa có dấu
 * hiệu sống", không phải "engine còn tồn tại" — chú thích của chính hàm này đã ghi điều đó.
 * Hệ quả đo được trên cuốn `mac-the-bien-di-vo`: bấm "Cho đi tiếp 1 chương", engine nhận giấy
 * phép và Writer bắt đầu chương 5 (`runtime: "running"`, `agents: [writer]`), nhưng checkpoint
 * mới chưa kịp ghi nên `activity` vẫn `idle` — và khu văn sống ghi "Máy đang nghỉ" ngay trên
 * chữ nó đang nhận về.
 *
 * Đó đúng lớp lỗi mà `song.ts` được tách ra để chặn ("ba chỗ nói ba điều, và cái đang động là
 * cái nói sai"), chỉ là lần này nguồn tốt hơn mới có: kế hoạch 1/4 chưa mang `runtime`, nên
 * lúc viết hàm này `activity` là sự thật mạnh nhất có được. Giờ không còn thế.
 */
test('engine tự khẳng định running thì máy ĐANG CHẠY, dù activity còn trễ ở idle', () => {
  expect(mayDangChay(snap({ runtime: 'running', book: { ...snap({}).book, activity: 'idle' } }))).toBe(true);
});

test('engine tự khẳng định paused thì máy NGHỈ, dù activity còn trễ ở running', () => {
  // Chiều ngược cũng đo được: engine dừng ở cửa nghiệm thu mà checkpoint vừa ghi xong, nên
  // `activity` còn `running` vài phút. Nhịp đập chạy trên một dây chuyền đã đứng là đúng thứ
  // PRODUCT.md:27 gọi là hỏng tiêu chí thành công.
  expect(mayDangChay(snap({ runtime: 'paused', book: { ...snap({}).book, activity: 'running' } }))).toBe(false);
});

test('engine ĐÓNG (runtime rỗng) thì rơi về activity — sự thật mạnh nhất còn lại', () => {
  expect(mayDangChay(snap({ runtime: '', book: { ...snap({}).book, activity: 'running' } }))).toBe(true);
  expect(mayDangChay(snap({ runtime: '', book: { ...snap({}).book, activity: 'idle' } }))).toBe(false);
});

test('không có snapshot thì không chạy, và không ném', () => {
  expect(mayDangChay(undefined)).toBe(false);
});
