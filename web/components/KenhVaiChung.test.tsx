import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { CauHinhDoc } from '@/lib/types';

/**
 * Bề mặt "Model theo vai" phải VẼ ĐƯỢC sau khi dữ liệu về.
 *
 * # Vì sao một bài kiểm chỉ để "nó vẽ ra"
 *
 * ĐO ĐƯỢC trên máy thật: bề mặt này chết trắng với `Uncaught Error: Minified React error #310`
 * — "Rendered more hooks than during the previous render". Nguyên nhân là `useModelNapVe()` bị
 * đặt SAU hai nhánh `return` sớm, nên lần vẽ đầu (`du` còn null, thoát sớm) gọi ít hook hơn lần
 * vẽ sau.
 *
 * Đây là loại hỏng mà `tsc` không thấy, `eslint` không chạy trong dự án này, và mọi bài kiểm
 * khác không chạm tới — nó chỉ lộ ra ở lần vẽ THỨ HAI, tức phải có một bài kiểm dựng thật rồi
 * chờ dữ liệu về. Hư hại: cả một bề mặt biến mất, và đó lại là bề mặt DUY NHẤT gỡ được ghim
 * model theo vai.
 */

const CAU_HINH: CauHinhDoc = {
  needs_setup: false,
  path: '/tmp/x/.ainovel/config.json',
  provider: 'kiraai',
  model: 'kira-mini-1.0',
  style: 'default',
  styles: ['default'],
  role_names: ['default', 'architect', 'writer', 'editor'],
  roles: { writer: { provider: 'openai', model: 'cx/gpt-5.5' } },
  providers: [
    { name: 'kiraai', api_key_set: true, models: [{ name: 'kira-mini-1.0' }] },
    { name: 'openai', api_key_set: true, models: [{ name: 'cx/gpt-5.5' }] },
  ],
  presets: [],
  engine_open: [],
};

vi.mock('@/lib/api', async (goc) => ({
  ...(await goc<typeof import('@/lib/api')>()),
  layCauHinh: () => Promise.resolve(CAU_HINH),
}));

// Dựng qua CHỦ SỞ HỮU dữ liệu, không dựng dải kênh trần: từ bản gộp, `KenhVaiChung` nhận `du`
// sẵn nên tự nó không còn lần vẽ "chưa có dữ liệu" — tức không còn tái tạo được lỗi #310. Bề
// mặt thật mới là chỗ có hai lần vẽ, và đó là chỗ phải canh.
const { CauHinhXuong } = await import('./CauHinhXuong');

test('vẽ được bốn kênh sau khi cấu hình về — không ném lỗi thứ tự hook', async () => {
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);

  // Lần vẽ đầu là trạng thái "đang tải"; lần vẽ thứ hai mới là lần lỗi #310 nổ.
  await waitFor(() => expect(document.querySelector('.kenhDai')).not.toBeNull());

  // Soi trong DẢI KÊNH, không soi cả màn: tên vai giờ còn xuất hiện ở dòng "Đang dùng bởi"
  // của thẻ nhà cung cấp, nên một truy vấn phẳng khớp nhiều phần tử và ngã.
  const dai = document.querySelector('.kenhDai')!;
  const ten = Array.from(dai.querySelectorAll('.kenhTen')).map((e) => e.textContent);
  expect(ten).toEqual(['Mặc định', 'Kiến trúc', 'Chấp bút', 'Biên tập']);
  // `writer` có ghim riêng → phải gỡ được; ba vai kia đang thừa hưởng → không có nút gỡ.
  expect(screen.getAllByRole('button', { name: 'Gỡ, dùng mặc định' })).toHaveLength(1);
});

test('thẻ nhà cung cấp nói ĐÚNG vai nào đang gọi tới nó, kể cả vai thừa hưởng', async () => {
  // Không có dòng này thì nút Xóa trên thẻ bấm trong mù — và xóa một nhà cung cấp còn vai ghim
  // vào nó làm `NewModelSet` lỗi, tức KHÔNG MỞ ĐƯỢC MÁY cho bất kỳ cuốn nào.
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  await waitFor(() => expect(document.querySelectorAll('li.nccMuc').length).toBe(2));

  const the = (ten: string) =>
    Array.from(document.querySelectorAll<HTMLElement>('li.nccMuc')).find(
      (li) => li.querySelector('.nccTen')?.textContent === ten,
    )!;

  // `kiraai` là mặc định; `writer` ghim sang `openai`, ba vai còn lại thừa hưởng kiraai.
  expect(the('kiraai').textContent).toMatch(/Mặc định, Kiến trúc, Biên tập/);
  expect(the('kiraai').textContent).not.toMatch(/Chấp bút/);
  expect(the('openai').textContent).toMatch(/Chấp bút/);
});
