import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { CHU } from '@/lib/nhan';
import type { CastDoc, OutlineDoc, Snapshot } from '@/lib/types';

import { Inspector } from './Inspector';
import { snap } from './mau.test-helper';

/**
 * HAI CHẾ ĐỘ CỦA CỘT PHẢI (spec §7.2).
 *
 * `@/lib/api` bị thay vì chế độ ngữ cảnh truyện đọc hai endpoint hồ sơ (`/outline`,
 * `/cast`). Để nó gọi thật thì bài kiểm đo khả năng giả lập `fetch` của jsdom chứ không đo
 * hai chế độ — và tệ hơn: mọi lời gọi đều hỏng như nhau, nên bài kiểm sẽ xanh ở ca "tải
 * lỗi" mà tưởng mình đang đo ca "có dữ liệu".
 */
const DAN_Y: OutlineDoc = {
  premise: 'Một thiếu niên nhặt được chuông đồng ở đáy giếng cạn.',
  volumes: null,
  flat: null,
};
const NHAN_VAT: CastDoc = {
  characters: [
    { name: 'Lâm Thanh', role: 'chủ giác', description: '', arc: '', traits: null, tier: 'core' },
    { name: 'Sư huynh', role: 'phụ', description: '', arc: '', traits: null },
  ],
  snapshots: null,
};

vi.mock('@/lib/api', () => ({
  layDanY: () => Promise.resolve(DAN_Y),
  layNhanVat: () => Promise.resolve(NHAN_VAT),
  layChuong: () => Promise.resolve({ chapter: 1, words: 0, text: '' }),
}));

const CHUONG: Snapshot['chapters'] = [
  { chapter: 1, stage: 'done', words: 2100 },
  { chapter: 2, stage: 'drafting' },
  { chapter: 3, stage: 'pending' },
];

function ve(chuongChon: number | undefined, p: Partial<Snapshot> = {}) {
  const chon = vi.fn();
  const r = render(
    <Inspector
      snapshot={snap({ chapters: CHUONG, ...p })}
      tacPham="b"
      chuongChon={chuongChon}
      onChonChuong={chon}
    />,
  );
  return { ...r, chon };
}

/** `useHoSo` nạp trong effect nên hai lời gọi đã hẹn phải được nhả trước khi hỏi DOM. */
const xong = () => new Promise((r) => setTimeout(r, 0));

/* ── (a) chưa chọn chương → ngữ cảnh truyện ───────────────────────────── */

test('chưa chọn chương → thấy tiền đề, KHÔNG thấy tab', async () => {
  const { container } = ve(undefined);
  await xong();

  expect(screen.getByText(/nhặt được chuông đồng/)).toBeDefined();
  // Không phải "tab bị vô hiệu" mà là KHÔNG CÓ tab: ba nút bấm nào cũng ra cùng một câu là
  // một lời hứa hụt lặp ba lần, và ở chế độ này chúng không có chương nào để mở.
  expect(container.querySelector('[role="tablist"]')).toBeNull();
});

test('chưa chọn chương → thấy dải chương ●▶○ và danh sách nhân vật', async () => {
  const { container } = ve(undefined);
  await xong();

  expect(container.querySelectorAll('.dsvach button')).toHaveLength(3);
  expect(screen.getByText('Lâm Thanh')).toBeDefined();
});

test('chưa chọn chương → KHÔNG có nút quay lại (đang ở chính chỗ nó dẫn tới)', async () => {
  ve(undefined);
  await xong();
  expect(screen.queryByRole('button', { name: CHU.veDanhSachChuong })).toBeNull();
});

test('mỗi vạch chương mang CẢ ký hiệu lẫn chữ, không chỉ màu', async () => {
  // Luật 5 của PRODUCT.md: màu không bao giờ là kênh thông tin duy nhất. Một dải chấm chỉ
  // khác nhau về màu là một dải chỉ đọc được bằng mắt đã quen — và không đọc được trên ảnh
  // chụp đen trắng lẫn bằng trình đọc màn hình.
  const { container } = ve(undefined);
  await xong();

  const vach = container.querySelectorAll('.dsvach button');
  expect(vach[0]!.getAttribute('title')).toBe(CHU.chuongVaCongDoan(1, 'đã nghiệm thu'));
  expect(vach[0]!.textContent).toContain('●');
  expect(vach[1]!.textContent).toContain('▶');
  expect(vach[2]!.textContent).toContain('○');
});

test('nhân vật null (chưa dựng nền) nói khác nhân vật [] (đã dựng mà rỗng)', async () => {
  // Cùng lớp lỗi mà `MucRong` và cả ba bề mặt hồ sơ tồn tại để chặn: gộp hai ca lại là nói
  // dối một trong hai, và hai kết luận đó dẫn tới hai hành động khác nhau.
  const goc = { ...NHAN_VAT };

  (NHAN_VAT as CastDoc).characters = null;
  const a = ve(undefined);
  await xong();
  const oNull = a.container.querySelector('.nvtom')!.textContent!;
  a.unmount();

  (NHAN_VAT as CastDoc).characters = [];
  const b = ve(undefined);
  await xong();
  const oRong = b.container.querySelector('.nvtom')!.textContent!;
  b.unmount();

  (NHAN_VAT as CastDoc).characters = goc.characters;
  expect(oNull).not.toBe(oRong);
});

/* ── (b) đã chọn chương → chi tiết chương ─────────────────────────────── */

test('đã chọn chương → thấy tab và thấy nút quay lại', async () => {
  const { container } = ve(2);
  await xong();

  expect(container.querySelector('[role="tablist"]')).not.toBeNull();
  expect(screen.getByRole('button', { name: CHU.veDanhSachChuong })).toBeDefined();
});

test('đã chọn chương → KHÔNG còn ngữ cảnh truyện; cột phải vẫn là MỘT cột', async () => {
  // "Không mở cột thứ tư" (spec §7.2) đọc ở DOM là: đúng một `<aside>`, và hai chế độ không
  // bao giờ cùng có mặt.
  const { container } = ve(2);
  await xong();

  expect(screen.queryByText(/nhặt được chuông đồng/)).toBeNull();
  expect(container.querySelectorAll('aside')).toHaveLength(1);
});

/* ── (c) nút quay lại → về chế độ ngữ cảnh ────────────────────────────── */

test('bấm nút quay lại → về chế độ ngữ cảnh truyện', async () => {
  const { container } = ve(2);
  await xong();

  fireEvent.click(screen.getByRole('button', { name: CHU.veDanhSachChuong }));
  await xong();

  expect(screen.getByText(/nhặt được chuông đồng/)).toBeDefined();
  expect(container.querySelector('[role="tablist"]')).toBeNull();
});

test('quay lại rồi bấm ĐÚNG chương đang chọn thì vào lại chi tiết, không thành ngõ cụt', async () => {
  // Đường lui không được là đường cụt. `chuongChon` do URL giữ, nên bấm lại đúng chương đó
  // KHÔNG làm prop đổi — nếu chế độ chỉ suy từ prop thì nút trông bấm được mà không phản
  // ứng. Đây là ca duy nhất phân biệt "quay lại" làm đúng với "quay lại" làm hỏng.
  const { container, chon } = ve(2);
  await xong();
  fireEvent.click(screen.getByRole('button', { name: CHU.veDanhSachChuong }));
  await xong();

  const vach = within(container.querySelector('.dsvach')!).getByTitle(
    CHU.chuongVaCongDoan(2, 'đang soạn bản thảo'),
  );
  fireEvent.click(vach);
  await xong();

  expect(chon).toHaveBeenCalledWith(2);
  expect(container.querySelector('[role="tablist"]')).not.toBeNull();
});

test('đổi sang chương KHÁC ở nơi khác cũng mở lại chi tiết', async () => {
  // Bảng chương ở cột giữa vẫn chọn được chương trong lúc cột phải đang ở chế độ ngữ cảnh.
  const { container, rerender } = ve(2);
  await xong();
  fireEvent.click(screen.getByRole('button', { name: CHU.veDanhSachChuong }));
  await xong();

  rerender(
    <Inspector
      snapshot={snap({ chapters: CHUONG })}
      tacPham="b"
      chuongChon={3}
      onChonChuong={() => {}}
    />,
  );
  await xong();

  expect(container.querySelector('[role="tablist"]')).not.toBeNull();
});

/* ── tên vùng đứng yên qua cả hai chế độ ──────────────────────────────── */

test('tên vùng của cột phải KHÔNG đổi theo chế độ', async () => {
  // Cùng luật đã trả giá ở `vttVung`: tên vùng là thứ trình đọc màn hình điều hướng TỚI.
  // Đặt nó là "Chi tiết chương" thì ở chế độ ngữ cảnh nó dẫn người dùng tới một cái tên sai.
  const a = ve(undefined);
  await xong();
  expect(a.container.querySelector('aside')!.getAttribute('aria-label')).toBe(CHU.cotPhaiVung);
  a.unmount();

  const b = ve(2);
  await xong();
  expect(b.container.querySelector('aside')!.getAttribute('aria-label')).toBe(CHU.cotPhaiVung);
});
