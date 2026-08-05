import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useHoSo } from './useHoSo';

/**
 * Hồ sơ tác phẩm phải TỰ nạp lại.
 *
 * # Vì sao cụm bài này đáng có
 *
 * Lỗi mà nó canh là một lỗi IM LẶNG, và nó đã sống trong sản phẩm: rail hiện số
 * đếm của chính các hồ sơ này (`Nhân vật 18`, `Phục bút 4`) và `useStudio` nạp
 * lại số đếm ấy mỗi 1,5 giây trong lúc engine chạy, trong khi bề mặt đang mở đọc
 * cùng tệp đó qua `useHoSo` — vốn chỉ chạy một lần cho mỗi tác phẩm. Hai đường,
 * hai nhịp, một nguồn: rail nói 40 còn bề mặt liệt kê 37, và không có gì trên
 * màn hình nói vì sao. Người dùng chỉ còn cách F5.
 *
 * Không lỗi nào nổ ra ở ca đó, và trước cụm bài này không phép đo nào chạm tới.
 */

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function Thu({ tacPham, nap }: { tacPham: string | undefined; nap: (b: string) => Promise<string> }) {
  const { du, dangTai, loi } = useHoSo(tacPham, nap);
  return (
    <div>
      <span data-thu="du">{du ?? '—'}</span>
      <span data-thu="tai">{dangTai ? 'đang tải' : 'xong'}</span>
      <span data-thu="loi">{loi ?? ''}</span>
    </div>
  );
}

const doc = (ma: string) => screen.getByText((_, e) => e?.getAttribute('data-thu') === ma);

test('nạp lại theo nhịp nền, không đứng im cả phiên', async () => {
  let lan = 0;
  const nap = vi.fn(() => Promise.resolve(`lần ${++lan}`));

  render(<Thu tacPham="b" nap={nap} />);
  await waitFor(() => expect(doc('du').textContent).toBe('lần 1'));

  await vi.advanceTimersByTimeAsync(20_000);
  await waitFor(() => expect(doc('du').textContent).toBe('lần 2'));
});

test('nạp lại KHÔNG xoá dữ liệu đang hiện, và không nháy về "đang tải"', async () => {
  // Đây là điều làm lần-nạp-lại khác lần-nạp-đầu. Xoá ở lần sau là để cả bề mặt
  // nháy về "đang đọc…" mỗi 20 giây trong lúc người dùng đang đọc dở một mô tả
  // nhân vật — tức phép sửa lỗi F5 tự đẻ ra một phiền toái khác.
  let cho: ((v: string) => void) | undefined;
  const nap = vi
    .fn<(b: string) => Promise<string>>()
    .mockResolvedValueOnce('đang đọc dở')
    .mockImplementationOnce(() => new Promise<string>((res) => (cho = res)));

  render(<Thu tacPham="b" nap={nap} />);
  await waitFor(() => expect(doc('du').textContent).toBe('đang đọc dở'));

  await vi.advanceTimersByTimeAsync(20_000);
  await waitFor(() => expect(nap).toHaveBeenCalledTimes(2));

  // Lượt hai còn ĐANG BAY: dữ liệu cũ phải còn nguyên trên màn hình.
  expect(doc('du').textContent).toBe('đang đọc dở');
  expect(doc('tai').textContent).toBe('xong');

  cho?.('bản mới');
  await waitFor(() => expect(doc('du').textContent).toBe('bản mới'));
});

test('một lần nạp lại HỎNG không xoá hồ sơ đang hiện đúng', async () => {
  // Mạng chớp một nhịp, hay engine đang ghi dở tệp. Biến chuyện đó thành một bề
  // mặt lỗi là để một sự cố 200ms xoá mất thứ người dùng đang đọc — cùng luật mà
  // `napLaiXuong`/`napLaiHoSo` của `useStudio` dùng khi nuốt lỗi.
  const nap = vi
    .fn<(b: string) => Promise<string>>()
    .mockResolvedValueOnce('hồ sơ tốt')
    .mockRejectedValueOnce(new Error('mạng hỏng'));

  render(<Thu tacPham="b" nap={nap} />);
  await waitFor(() => expect(doc('du').textContent).toBe('hồ sơ tốt'));

  await vi.advanceTimersByTimeAsync(20_000);
  await waitFor(() => expect(nap).toHaveBeenCalledTimes(2));

  expect(doc('du').textContent).toBe('hồ sơ tốt');
  expect(doc('loi').textContent).toBe('');
});

test('lần nạp ĐẦU vẫn nói ra lỗi — nó không có dữ liệu cũ nào để giữ', async () => {
  // Vế ngược của bài trên. Nuốt lỗi ở lần đầu là hiện một bề mặt trống không nói
  // vì sao, đúng thứ `TaiVe.loi` tồn tại để tránh.
  const nap = vi.fn<(b: string) => Promise<string>>().mockRejectedValue(new Error('404 không có tệp'));

  render(<Thu tacPham="b" nap={nap} />);

  await waitFor(() => expect(doc('loi').textContent).toBe('404 không có tệp'));
});

test('lỗi cũ được XOÁ khi lần đọc sau thành công', async () => {
  // Một câu lỗi ở lại bên trên dữ liệu đúng là một bề mặt tự mâu thuẫn: người
  // vận hành không biết nên tin dòng nào.
  const nap = vi
    .fn<(b: string) => Promise<string>>()
    .mockRejectedValueOnce(new Error('engine đang ghi'))
    .mockResolvedValueOnce('hồ sơ đã về');

  render(<Thu tacPham="b" nap={nap} />);
  await waitFor(() => expect(doc('loi').textContent).toBe('engine đang ghi'));

  await vi.advanceTimersByTimeAsync(20_000);
  await waitFor(() => expect(doc('du').textContent).toBe('hồ sơ đã về'));
  expect(doc('loi').textContent).toBe('');
});

test('quay lại tab thì nạp lại ngay, không đợi hết chu kỳ', async () => {
  // Nhịp không chạy khi tab bị ẩn, nên nếu chỉ có nhịp thì lúc quay lại vẫn phải
  // đợi hết 20 giây mới thấy — và đó đúng là khoảnh khắc người ta bấm F5.
  let lan = 0;
  const nap = vi.fn(() => Promise.resolve(`lần ${++lan}`));

  render(<Thu tacPham="b" nap={nap} />);
  await waitFor(() => expect(doc('du').textContent).toBe('lần 1'));

  window.dispatchEvent(new Event('focus'));
  await waitFor(() => expect(doc('du').textContent).toBe('lần 2'));
});

test('tab đang ẩn thì KHÔNG nạp — làm mới bề mặt không ai nhìn là tiêu I/O đổi lấy không gì', async () => {
  const nap = vi.fn(() => Promise.resolve('x'));
  const goc = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  try {
    render(<Thu tacPham="b" nap={nap} />);
    await waitFor(() => expect(nap).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(20_000);
    expect(nap).toHaveBeenCalledTimes(1);
  } finally {
    if (goc) Object.defineProperty(document, 'visibilityState', goc);
    else delete (document as unknown as Record<string, unknown>).visibilityState;
  }
});

test('đổi tác phẩm thì XOÁ dữ liệu cũ — hồ sơ cuốn trước dưới tên cuốn sau là nói dối', async () => {
  const nap = vi.fn((b: string) => Promise.resolve(`hồ sơ của ${b}`));

  const { rerender } = render(<Thu tacPham="a" nap={nap} />);
  await waitFor(() => expect(doc('du').textContent).toBe('hồ sơ của a'));

  rerender(<Thu tacPham="c" nap={nap} />);
  // Ngay lập tức, TRƯỚC khi lời hứa của cuốn mới về.
  expect(doc('du').textContent).toBe('—');
  await waitFor(() => expect(doc('du').textContent).toBe('hồ sơ của c'));
});
