import { expect, test } from 'vitest';

import { snap } from '@/components/mau.test-helper';
import { TRANG_THAI_MAY_RUNTIME } from './nhan';

import { mayDangChay, mayNaoDo } from './song';

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

/* ── mayNaoDo: KHOÁ trạng thái, dùng chung cho cả nhãn lẫn nhịp đập ───────
 *
 * # Vì sao phải có một khoá thay vì hai phép suy song song
 *
 * Đây là bản sửa cho một lỗi ĐO ĐƯỢC trên app thật (2026-08-02, cuốn
 * `viet-truyen-dang-trung-sinh`): API trả `runtime: "paused"` và
 * `transport.state: "running"`, và thanh dưới in ra CẢ HAI cùng lúc — vạch đầu đọc
 * tắt (đọc `mayDangChay`, đúng) trong khi ký hiệu ▶ đang đập và chữ ghi "đang
 * chạy" (tra `TRANG_THAI_MAY[transport.state]`, sai), ngay cạnh một nút mời bấm
 * "▶ Chạy". Một thanh tự cãi mình trong vòng 200 pixel.
 *
 * Nguyên nhân KHÔNG phải ai đó cẩu thả: `mayDangChay` được thêm sau, và transport
 * chỉ được đấu dây một nửa — nhận `mayChay` cho chuyển động, còn câu chữ vẫn ở
 * nguồn cũ. Nên bản sửa không thể là "nhớ dùng đúng trường"; nó phải làm cho việc
 * dùng sai trường KHÔNG CÒN ĐƯỜNG xảy ra. `mayNaoDo` là chỗ duy nhất suy ra trạng
 * thái, và `mayDangChay` giờ cũng chỉ là một câu hỏi đặt cho nó.
 */

test('runtime hợp lệ thì THẮNG, kể cả khi activity nói ngược', () => {
  expect(mayNaoDo('paused', 'running')).toBe('paused');
  expect(mayNaoDo('running', 'idle')).toBe('running');
});

test('runtime vắng → rơi về activity, và complete đổi tên thành completed', () => {
  // Hai bảng dùng hai chữ cho cùng một ý (`Activity.complete` vs `runtime.completed`).
  // Ánh xạ ở đây, một lần, thay vì để mỗi bề mặt tự đoán.
  expect(mayNaoDo(undefined, 'running')).toBe('running');
  expect(mayNaoDo('', 'idle')).toBe('idle');
  expect(mayNaoDo('', 'complete')).toBe('completed');
});

test('runtime LẠ cũng rơi về activity, không trả về chính chuỗi lạ đó', () => {
  // Ca thật và đến được: một bản engine mới hơn web thêm một trạng thái. Trả nguyên chuỗi
  // ra ngoài thì `TRANG_THAI_MAY_RUNTIME[...]` là `undefined` và thanh dưới trắng đúng ô
  // trả lời câu hỏi số một. Rơi về activity là mất độ chính xác; trắng ô là mất câu trả lời.
  expect(mayNaoDo('draining', 'running')).toBe('running');
  expect(mayNaoDo('RUNNING', 'idle')).toBe('idle');
});

test('mọi khoá mayNaoDo trả về đều có nhãn trong từ điển — không ca nào ra ô trắng', () => {
  // Canh đúng cái mà bài trên vừa nói là hậu quả. Không lặp danh sách bằng tay: lặp bằng
  // tay thì thêm một trạng thái mới mà quên thêm nhãn vẫn xanh.
  const moiCa: [string | undefined, 'running' | 'idle' | 'complete'][] = [
    ['running', 'idle'], ['pausing', 'idle'], ['paused', 'idle'],
    ['idle', 'running'], ['completed', 'idle'],
    [undefined, 'running'], ['', 'idle'], ['', 'complete'], ['la-hoac', 'running'],
  ];
  for (const [rt, act] of moiCa) {
    const nhan = TRANG_THAI_MAY_RUNTIME[mayNaoDo(rt, act)];
    expect(nhan, `${rt} / ${act}`).toBeTruthy();
    expect(nhan.nhan.length, `${rt} / ${act}`).toBeGreaterThan(0);
  }
});

test('paused và idle KHÔNG dùng chung nhãn — đó là cả điểm của bản sửa', () => {
  // "Tạm dừng" nói còn một lượt treo, bấm Chạy là ĐI TIẾP. "Đang nghỉ" nói engine rỗng việc.
  // Gộp hai câu đó lại là quay về đúng chỗ vừa sửa, chỉ bằng một con đường khác.
  expect(TRANG_THAI_MAY_RUNTIME.paused.nhan).not.toBe(TRANG_THAI_MAY_RUNTIME.idle.nhan);
  expect(TRANG_THAI_MAY_RUNTIME.paused.nhan).not.toBe(TRANG_THAI_MAY_RUNTIME.running.nhan);
});

test('mayDangChay chỉ còn là một câu hỏi đặt cho mayNaoDo', () => {
  // Canh việc hai đường không tách ra lại. Nếu ai đó sửa `mayDangChay` mà không sửa
  // `mayNaoDo` (hoặc ngược lại), bài này đỏ.
  const ca: [string, 'running' | 'idle'][] = [
    ['running', 'idle'], ['paused', 'running'], ['pausing', 'running'],
    ['idle', 'running'], ['completed', 'running'], ['', 'running'], ['', 'idle'],
  ];
  for (const [rt, act] of ca) {
    const s = snap({ runtime: rt, book: { ...snap({}).book, activity: act } });
    expect(mayDangChay(s), `${rt} / ${act}`).toBe(mayNaoDo(rt, act) === 'running');
  }
});
