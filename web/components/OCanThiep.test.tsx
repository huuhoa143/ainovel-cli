import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { GIAI_THICH } from '@/lib/nhan';
import type { Capabilities } from '@/lib/types';

import { OCanThiep } from './OCanThiep';

vi.mock('@/lib/api', async (goc) => ({
  ...(await goc<typeof import('@/lib/api')>()),
  canThiep: vi.fn(),
}));

const KHA_NANG = (steer: boolean) => ({ steer }) as unknown as Capabilities;

function ve(steer: boolean) {
  return render(
    <OCanThiep capabilities={KHA_NANG(steer)} tacPham="b" dangChay onDoi={() => {}} />,
  );
}

/**
 * Câu giải thích của ô can thiệp — thứ ĐO ĐƯỢC là nó có chiếm chỗ hay không.
 *
 * Khối này cao 43px trong một ô can thiệp 98px, và ô can thiệp ăn thẳng vào bốn ô của bàn
 * ngay trên nó. Người dùng nói nguyên văn: *"phần này chiếm quá nhiều diện tích làm 4
 * session ở trên bé quá"*.
 */

test('studio GHI ĐƯỢC → câu giải thích không chiếm chỗ, nhưng vẫn còn cho trình đọc màn hình', () => {
  const { container } = ve(true);
  const cau = container.querySelector('#vi-sao-can-thiep')!;

  // Còn trong DOM: `aria-describedby` của ô nhập trỏ vào đúng id này, và một `describedby`
  // trỏ vào phần tử không tồn tại là ô nhập mất mô tả.
  expect(cau).not.toBeNull();
  expect(cau.textContent).toContain(GIAI_THICH.canThiepArbiterXuLy);
  // Nhưng KHÔNG chiếm pixel nào.
  expect(cau.hasAttribute('hidden')).toBe(true);

  // Và chuột vẫn tra được qua chú giải của ô nhập.
  expect(screen.getByRole('textbox').getAttribute('title')).toBe(
    GIAI_THICH.canThiepArbiterXuLy,
  );
});

test('studio CHỈ ĐỌC → câu giải thích HIỆN RA, vì nó là chỗ duy nhất nói vì sao ô chết', () => {
  // Vế ngược, và là vế đắt hơn nếu hỏng: ẩn câu này ở ca ô bị vô hiệu là để lại một ô nhập
  // không gõ được mà không lời giải thích nào — đúng thứ PRODUCT.md cấm.
  const { container } = ve(false);
  const cau = container.querySelector('#vi-sao-can-thiep')!;

  expect(cau.hasAttribute('hidden')).toBe(false);
  expect(cau.textContent).toContain(GIAI_THICH.canThiepChoDay);
  expect(cau.textContent).toContain(GIAI_THICH.canThiepTat);

  // `title` KHÔNG lặp lại câu đang hiện: một chú giải nói lại thứ đọc được là nhiễu.
  expect(screen.getByRole('textbox').getAttribute('title')).toBeNull();
});
