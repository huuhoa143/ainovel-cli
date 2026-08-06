import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

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

/** Bộ dữ liệu cho lần dựng kế tiếp — mặc định là cấu hình lành. */
let DU_HIEN: CauHinhDoc;

vi.mock('@/lib/api', async (goc) => ({
  ...(await goc<typeof import('@/lib/api')>()),
  layCauHinh: () => Promise.resolve(DU_HIEN ?? CAU_HINH),
}));

// Dựng qua CHỦ SỞ HỮU dữ liệu, không dựng dải kênh trần: từ bản gộp, `KenhVaiChung` nhận `du`
// sẵn nên tự nó không còn lần vẽ "chưa có dữ liệu" — tức không còn tái tạo được lỗi #310. Bề
// mặt thật mới là chỗ có hai lần vẽ, và đó là chỗ phải canh.
const { CauHinhXuong } = await import('./CauHinhXuong');

beforeEach(() => {
  cleanup();
  DU_HIEN = CAU_HINH;
});

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

/* ── vai trỏ vào model nhà cung cấp không khai ──────────────────────────── */

/**
 * Ca thật: người dùng sửa ô "Danh sách model" trên thẻ `9Router` từ `cx/gpt-5.5` sang
 * `cx/gpt-5.6-luna`, rồi hỏi *"Model theo vai cũng thay đổi theo chứ nhỉ"*.
 *
 * Danh mục chỉ nạp GỢI Ý; model có hiệu lực nằm ở dải kênh. Nên bốn vai đứng im và bốn ô cảnh
 * báo giống hệt nhau hiện lên — không ô nào làm được gì. Cảnh báo không có lối ra là nhiễu.
 */
const LAC: CauHinhDoc = {
  ...CAU_HINH,
  provider: '9Router',
  model: 'cx/gpt-5.5',
  roles: undefined,
  providers: [
    // Thẻ khai `luna`, trong khi mọi vai đang trỏ `cx/gpt-5.5`.
    { name: '9Router', api_key_set: true, models: [{ name: 'cx/gpt-5.6-luna' }] },
  ],
};

test('có vai lạc model thì hiện LỐI RA, không chỉ báo động', async () => {
  DU_HIEN = LAC;
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  await waitFor(() => expect(document.querySelector('.kenhDai')).not.toBeNull());

  const nut = screen.getByRole('button', { name: 'Sửa các vai theo 9Router' });
  expect(nut, 'bốn ô cảnh báo mà không nút nào sửa được').toBeDefined();

  nut.click();
  await waitFor(() => expect(document.querySelector('dialog')).not.toBeNull());
  const hop = document.querySelector('dialog')!;

  // Cùng nhà cung cấp thì đây KHÔNG phải lượt "chuyển" — gọi đúng tên việc.
  expect(hop.querySelector('h2')?.textContent).toBe('Cập nhật model theo 9Router?');
  expect(
    Array.from(hop.querySelectorAll('.hopxnNut button')).map((b) => b.textContent),
    'bày nút "chỉ đổi mặc định" trong khi không có nhà cung cấp nào để đổi',
  ).toEqual(['Hủy', 'Cập nhật model']);
  // Và bảng đề xuất đúng tên model mà thẻ đang khai.
  expect(Array.from(hop.querySelectorAll('tbody input')).map((i) => (i as HTMLInputElement).value)).toEqual(
    ['cx/gpt-5.6-luna', 'cx/gpt-5.6-luna', 'cx/gpt-5.6-luna', 'cx/gpt-5.6-luna'],
  );
});

test('mọi vai khớp danh mục thì KHÔNG hiện nút — một lối ra thừa là nhiễu', async () => {
  DU_HIEN = { ...LAC, model: 'cx/gpt-5.6-luna' };
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  await waitFor(() => expect(document.querySelector('.kenhDai')).not.toBeNull());
  expect(screen.queryByRole('button', { name: /^Sửa các vai theo/ })).toBeNull();
});
