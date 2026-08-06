import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { LoiApi } from '@/lib/api';
import type { CauHinhDoc } from '@/lib/types';

/**
 * Một lượt ghi chỉ được đổi ĐÚNG thứ nó nói là đổi.
 *
 * # Vì sao tệp này tồn tại
 *
 * Ô "Danh sách model" là một ô chữ, nên nó chỉ mang TÊN. Nhưng `ModelConfig` còn mang
 * `context_window` và `json_schema`, và `PUT /api/config` thay NGUYÊN mảng models. Biểu mẫu
 * dựng lại mục từ mỗi cái tên ⇒ mọi lượt Sửa xóa sạch hai trường kia.
 *
 * Vòng tự hủy đo được, và nó hoàn tác đúng tính năng vừa thêm:
 *
 *	bấm Kiểm tra → cảnh báo lệch cửa sổ → "Ghi lại cửa sổ" → ghi 272.000, cảnh báo tắt
 *	vài hôm sau → bấm Sửa để chữa một ký tự trong base_url → Lưu → CỬA SỔ BIẾN MẤT
 *	engine quay lại đọc 1.050.000 từ registry toàn cục, `writer ngữ cảnh 0% (5/1050000)`
 *
 * Không dấu hiệu nào trên màn hình. Luật mà tệp này canh: KHÔNG dựng lại một mục cấu hình từ
 * mảnh — giữ bản gốc rồi chỉ đè phần đổi.
 */

const LIET_KE =
  vi.fn<
    (p: string) => Promise<{
      provider: string;
      models: string[];
      count: number;
      windows?: Record<string, number>;
    }>
  >();

const LUU_CAU_HINH = vi.fn((_than?: Record<string, unknown>) =>
  Promise.resolve({ saved: true, path: '', reopen_to_apply: [] }),
);

let DU_HIEN: CauHinhDoc;

vi.mock('@/lib/api', async (goc) => ({
  ...(await goc<typeof import('@/lib/api')>()),
  layCauHinh: () => Promise.resolve(DU_HIEN),
  lietKeModel: (p: string) => LIET_KE(p),
  luuCauHinh: (...a: unknown[]) => LUU_CAU_HINH(...(a as [])),
}));

const { CauHinhXuong } = await import('./CauHinhXuong');

/** Một nhà cung cấp DUY NHẤT, và model của nó đã có cả hai trường dễ rơi. */
const GIU: CauHinhDoc = {
  needs_setup: false,
  path: '/tmp/x/.ainovel/config.json',
  provider: '9Router',
  model: 'cx/gpt-5.6-luna',
  style: '',
  styles: [],
  role_names: ['default', 'architect', 'writer', 'editor'],
  roles: undefined,
  providers: [
    {
      name: '9Router',
      type: 'openai',
      base_url: 'https://9router.example/v1',
      api_key_set: true,
      api_key_masked: 'sk-4…802',
      models: [{ name: 'cx/gpt-5.6-luna', context_window: 272000, json_schema: true }],
    },
  ],
  presets: [],
  engine_open: [],
};

beforeEach(() => {
  cleanup();
  LUU_CAU_HINH.mockClear();
  LUU_CAU_HINH.mockImplementation(() => Promise.resolve({ saved: true, path: '', reopen_to_apply: [] }));
  LIET_KE.mockReset();
  DU_HIEN = GIU;
});

/** Mảng `models` của lượt ghi gần nhất. */
function modelDaGhi() {
  const than = LUU_CAU_HINH.mock.calls.at(-1)?.[0] as
    | { provider_config?: { models?: unknown[] } }
    | undefined;
  return than?.provider_config?.models;
}

/**
 * Mở biểu mẫu Sửa của thẻ nhà cung cấp và trả về phạm vi truy vấn TRONG thẻ đó.
 *
 * Soi trong thẻ chứ không soi cả màn: khối "Mặc định khác" ở cuối trang cũng có một nút "Lưu",
 * nên một truy vấn phẳng khớp hai phần tử và ngã trước khi kiểm được điều đang cần kiểm.
 */
async function moFormSua() {
  await waitFor(() => expect(document.querySelector('li.nccMuc')).not.toBeNull());
  const the = within(document.querySelector<HTMLElement>('li.nccMuc')!);
  fireEvent.click(the.getByRole('button', { name: 'Sửa' }));
  return the;
}

test('sửa Địa chỉ gốc KHÔNG được làm rơi context_window và json_schema', async () => {
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  const the = await moFormSua();

  // Đúng thao tác của ca thật: chữa một ký tự trong địa chỉ gốc, không đụng danh sách model.
  fireEvent.change(the.getByLabelText('Địa chỉ gốc'), {
    target: { value: 'https://9router.example/v2' },
  });
  fireEvent.click(the.getByRole('button', { name: 'Lưu' }));

  await waitFor(() => expect(LUU_CAU_HINH).toHaveBeenCalledTimes(1));
  expect(modelDaGhi(), 'một lượt sửa base_url đã xóa cửa sổ ngữ cảnh và khai json_schema').toEqual([
    { name: 'cx/gpt-5.6-luna', context_window: 272000, json_schema: true },
  ]);
});

test('gõ THÊM một tên model mới thì tên cũ vẫn giữ nguyên vẹn', async () => {
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  const the = await moFormSua();

  fireEvent.change(the.getByLabelText('Danh sách model'), {
    target: { value: 'cx/gpt-5.6-luna, cx/gpt-5.6-terra' },
  });
  fireEvent.click(the.getByRole('button', { name: 'Lưu' }));

  await waitFor(() => expect(LUU_CAU_HINH).toHaveBeenCalledTimes(1));
  // Tên mới sinh ra mục TRẦN — nó chưa có gì để giữ. Tên cũ phải nguyên vẹn.
  expect(modelDaGhi()).toEqual([
    { name: 'cx/gpt-5.6-luna', context_window: 272000, json_schema: true },
    { name: 'cx/gpt-5.6-terra' },
  ]);
});

test('"Ghi lại cửa sổ" chỉ đổi cửa sổ, không đụng khai json_schema', async () => {
  // Nhà cung cấp khai 400.000, thẻ đang ghi 272.000 → lệch → cảnh báo có lối ra.
  LIET_KE.mockResolvedValue({
    provider: '9Router',
    models: ['cx/gpt-5.6-luna'],
    count: 1,
    windows: { 'cx/gpt-5.6-luna': 400000 },
  });

  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  await waitFor(() => expect(document.querySelector('li.nccMuc')).not.toBeNull());

  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }));
  const nut = await screen.findByRole('button', { name: 'Ghi lại cửa sổ' });
  fireEvent.click(nut);

  await waitFor(() => expect(LUU_CAU_HINH).toHaveBeenCalledTimes(1));
  expect(modelDaGhi(), 'lượt ghi cửa sổ đã cuốn theo khai json_schema').toEqual([
    { name: 'cx/gpt-5.6-luna', context_window: 400000, json_schema: true },
  ]);
});

// Cảnh báo chỉ được hiện khi THẬT SỰ lệch — một cảnh báo thừa dạy người dùng bỏ qua nó.
test('cửa sổ khớp thì không có cảnh báo lệch', async () => {
  LIET_KE.mockResolvedValue({
    provider: '9Router',
    models: ['cx/gpt-5.6-luna'],
    count: 1,
    windows: { 'cx/gpt-5.6-luna': 272000 },
  });

  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  await waitFor(() => expect(document.querySelector('li.nccMuc')).not.toBeNull());

  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }));
  // Chờ ĐÚNG dòng kết quả của lượt kiểm, không chờ một khuôn mẫu mơ hồ: chờ hụt ở đây làm
  // bài kiểm xanh vì cảnh báo CHƯA KỊP vẽ, chứ không vì nó đúng.
  await screen.findByText(/Gọi được nhà cung cấp · 1 model/);
  expect(screen.queryByRole('button', { name: 'Ghi lại cửa sổ' })).toBeNull();
});

/* ── hộp "Sửa các vai theo X" ───────────────────────────────────────────── */

/**
 * Trạng thái tới được, và nó làm lộ hai lỗi cùng lúc.
 *
 * Mặc định `a · ma` khớp danh mục của `a`, nên vai `default` KHÔNG lạc. Chỉ `writer` ghim ở
 * `b · mX` trong khi `b` chỉ khai `mb` — nên `nccLac` là `b`, tức MẶC ĐỊNH CÓ dời chỗ.
 */
const LAC_O_VAI_GHIM: CauHinhDoc = {
  ...GIU,
  provider: 'a',
  model: 'ma',
  roles: { writer: { provider: 'b', model: 'mX' } },
  providers: [
    { name: 'a', api_key_set: true, models: [{ name: 'ma' }] },
    { name: 'b', api_key_set: true, models: [{ name: 'mb' }] },
  ],
};

test('ghi hỏng thì hộp Ở LẠI và nói ra lý do', async () => {
  DU_HIEN = LAC_O_VAI_GHIM;
  LUU_CAU_HINH.mockImplementation(() =>
    Promise.reject(new LoiApi('model "mb" không có trong danh sách của b', 400)),
  );

  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sửa các vai theo b' }));

  const hop = document.querySelector('dialog')!;
  fireEvent.click(screen.getByRole('button', { name: 'Chuyển cả dây chuyền' }));

  // Nuốt lỗi ở đây là ca hỏng thật: hộp đóng, cảnh báo vẫn còn, không một chữ nào.
  await waitFor(() =>
    expect(hop.textContent, 'lượt ghi hỏng mà không báo gì').toContain('không có trong danh sách'),
  );
  expect(document.querySelector('dialog'), 'hộp đóng mất chỗ đọc lý do').not.toBeNull();
});

test('lối vào "Sửa các vai" KHÔNG bày nút "Chỉ đổi mặc định"', async () => {
  DU_HIEN = LAC_O_VAI_GHIM;
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sửa các vai theo b' }));

  const hop = document.querySelector('dialog')!;
  // Nút này từng hiện ở đây và chỉ đóng hộp — trong khi CÙNG cái nhãn ấy mở từ thẻ nhà cung
  // cấp thì CÓ ghi. Một nhãn hai nghĩa tùy cửa nào mở nó.
  expect(Array.from(hop.querySelectorAll('.hopxnNut button')).map((b) => b.textContent)).toEqual([
    'Hủy',
    'Chuyển cả dây chuyền',
  ]);
});

test('tiêu đề theo việc MẶC ĐỊNH có dời chỗ không, chứ không theo vai nào lạc', async () => {
  DU_HIEN = LAC_O_VAI_GHIM;
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sửa các vai theo b' }));

  // Mặc định đang ở `a`, đích là `b` ⇒ đây THẬT SỰ là một lượt chuyển.
  expect(document.querySelector('dialog h2')?.textContent).toBe('Chuyển sang b?');
});

test('mặc định ĐÃ ở đích thì gọi đúng tên việc, dù còn vai ghim nơi khác', async () => {
  // `default` lạc (a khai `ma2`, mặc định đang `ma`), nên `nccLac` = `a` = mặc định.
  DU_HIEN = {
    ...LAC_O_VAI_GHIM,
    providers: [
      { name: 'a', api_key_set: true, models: [{ name: 'ma2' }] },
      { name: 'b', api_key_set: true, models: [{ name: 'mb' }] },
    ],
  };
  render(<CauHinhXuong onDoiCauHinh={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sửa các vai theo a' }));

  // Một vai ghim ở `b` từng lật cả hộp sang giọng "Chuyển sang a?" — trong khi `a` VỐN ĐÃ là
  // mặc định. Tiêu đề khi ấy hỏi một câu mà biến trả lời một câu khác.
  expect(document.querySelector('dialog h2')?.textContent).toBe('Cập nhật model theo a?');
});
