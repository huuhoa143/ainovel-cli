import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { GIAI_THICH } from '@/lib/nhan';

import { DongSuKien } from './NhatKy';

/**
 * Ca rỗng của dòng sự kiện phải nói đúng lý do nó rỗng, và có HAI lý do khác nhau.
 *
 * ĐO ĐƯỢC lúc E2E kế hoạch 2/4 trên cuốn `mac-the-bien-di-vo`: engine đang viết chương 3,
 * khu văn sống đang chảy 9.943 ký tự, dải trạng thái ghi `Writer → draft_chapter` — và ngay
 * dưới đó dòng sự kiện ghi "Engine đang nghỉ hoặc chưa phát".
 *
 * Rỗng lúc máy chạy là chuyện BÌNH THƯỜNG, không phải sự cố: observer chỉ ghi vào hàng những
 * bước ĐÃ KẾT THÚC (internal/host/observer.go:191), nên suốt một lượt `draft_chapter` dài
 * không có sự kiện nào. Phép đo trên `sample.gif` nói đúng thế: dòng sự kiện nhảy 5 lần rồi
 * im 15 giây. Cái sai không phải chỗ rỗng — mà là câu giải thích khẳng định một điều mà ba
 * chỗ khác trên cùng màn hình đang phủ nhận.
 */
test('máy ĐANG CHẠY mà chưa có sự kiện thì KHÔNG được nói engine đang nghỉ', () => {
  render(<DongSuKien suKien={[]} dangChay />);

  const p = screen.getByText(/./, { selector: '.trongSect' });
  expect(p.textContent).not.toMatch(/đang nghỉ/i);
  expect(p.textContent).toBe(GIAI_THICH.chuaCoSuKienDangChay);
});

test('máy NGHỈ mà chưa có sự kiện thì được phép nói engine đang nghỉ', () => {
  render(<DongSuKien suKien={[]} dangChay={false} />);
  expect(screen.getByText(GIAI_THICH.chuaCoSuKienDangNghi)).toBeDefined();
});

test('hai câu là hai câu KHÁC nhau — gộp lại là mất đúng phân biệt này', () => {
  expect(GIAI_THICH.chuaCoSuKienDangChay).not.toBe(GIAI_THICH.chuaCoSuKienDangNghi);
});

test('có sự kiện thì vẽ sự kiện, không vẽ câu rỗng nào', () => {
  render(
    <DongSuKien
      suKien={[{ seq: 1, time: '2026-08-01T20:11:00Z', kind: 'ui_event', summary: 'viết chương 3' }]}
      dangChay
    />,
  );
  expect(screen.getByText('viết chương 3')).toBeDefined();
  expect(document.querySelector('.trongSect')).toBeNull();
});
