import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { GIU_TIN_MS, useVuaCoTin } from './dauDoi';

/**
 * Đẩy đồng hồ TRONG `act`.
 *
 * Bộ hẹn của hook gọi `setState` từ ngoài cây React, nên `advanceTimersByTimeAsync` trần để
 * lại một cập nhật chưa flush — bài kiểm khi đó đọc lần render CŨ và thấy cờ vẫn bật. Hai
 * bài dưới đây đã đỏ đúng vì lý do đó trước khi có hàm này.
 */
const doiGio = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

/**
 * `useVuaCoTin` — cờ lái viền chạy của bàn buồng lái.
 *
 * Bốn bài dưới đây canh bốn tính chất mà một bộ đếm kiểu `useDauDoi` KHÔNG có, và mỗi tính
 * chất tương ứng một cách hỏng đã lường trước ở chú thích của hàm.
 */

let soLanVe = 0;

function Thu({ v }: { v: unknown }) {
  const song = useVuaCoTin(v);
  soLanVe += 1;
  return <span data-thu="song">{song ? 'sống' : 'im'}</span>;
}

const doc = () => screen.getByText((_, e) => e?.getAttribute('data-thu') === 'song').textContent;

beforeEach(() => {
  soLanVe = 0;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

test('lần render ĐẦU không bật — mở trang không làm bốn ô cùng chạy viền', () => {
  // Ca quan trọng nhất, cùng luật với `useDauDoi`: một chuyển động mang thông tin chỉ mang
  // được thông tin khi nó KHÔNG chạy lúc không có gì xảy ra.
  render(<Thu v={{ x: 1 }} />);
  expect(doc()).toBe('im');
});

test('bật khi giá trị đổi, rồi TỰ TẮT sau cửa sổ giữ', async () => {
  const { rerender } = render(<Thu v={1} />);
  expect(doc()).toBe('im');

  rerender(<Thu v={2} />);
  await doiGio(0);
  expect(doc()).toBe('sống');

  await doiGio(GIU_TIN_MS + 50);
  expect(doc()).toBe('im');
});

test('một TRÀNG đổi liên tiếp giữ cờ bật liền mạch, không nhấp tắt giữa chừng', async () => {
  // Đây là ca của khu văn sống: nhịp delta trung vị 2ms. Cờ phải ở nguyên `true` suốt lúc
  // máy viết, chứ không tắt–bật theo từng mẩu chữ.
  const { rerender } = render(<Thu v={0} />);

  for (let i = 1; i <= 20; i++) {
    rerender(<Thu v={i} />);
    await doiGio(2);
    expect(doc(), `mẩu ${i}`).toBe('sống');
  }

  // Chỉ tắt sau khi mẩu CUỐI đã im đủ lâu — bộ hẹn được đặt lại ở mỗi mẩu.
  await doiGio(GIU_TIN_MS - 100);
  expect(doc()).toBe('sống');
  await doiGio(200);
  expect(doc()).toBe('im');
});

test('tràng delta KHÔNG đẻ thêm lần render nào cho mỗi mẩu', async () => {
  // Lý do hàm này tồn tại thay vì dùng `useDauDoi`. Một bộ đếm bump theo từng delta là một
  // `setState` nữa cho MỖI mẩu chữ, trên bề mặt đắt nhất màn hình. Ở đây cả tràng chỉ được
  // phép tốn đúng một lần render (lúc bật) — `datSong(true)` khi đã true là no-op của React.
  const { rerender } = render(<Thu v={0} />);
  rerender(<Thu v={1} />);
  await doiGio(2);

  const sauKhiBat = soLanVe;
  for (let i = 2; i <= 30; i++) {
    rerender(<Thu v={i} />);
    await doiGio(2);
  }
  // 29 lần `rerender` là 29 lần render do CHA gây ra — không sao. Điều phải canh là hook
  // không cộng thêm lần nào của riêng nó, tức không có `setState` nào trong tràng.
  expect(soLanVe - sauKhiBat).toBe(29);
});

test('`Object.is` — NaN không làm cờ bật vĩnh viễn', async () => {
  // Cùng cái bẫy mà `useDauDoi` đã ghi: `NaN !== NaN` là true, nên một bộ so sánh dùng `!==`
  // sẽ thấy đổi ở MỌI lần render và viền chạy mãi không tắt.
  const { rerender } = render(<Thu v={Number.NaN} />);
  rerender(<Thu v={Number.NaN} />);
  await doiGio(0);
  expect(doc()).toBe('im');
});
