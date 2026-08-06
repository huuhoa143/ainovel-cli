import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import type { CauHinhDoc } from '@/lib/types';

/**
 * Nút "Kiểm tra" trên từng thẻ nhà cung cấp.
 *
 * # Vì sao ba bài kiểm này, không phải một
 *
 * Chức năng có ba chỗ hỏng mà `tsc` không thấy, và cả ba đều hỏng ÂM THẦM — nút vẫn bấm
 * được, vẫn hiện một câu trả lời, chỉ là câu trả lời nói về chuyện khác:
 *
 *   1. Hỏi nhầm nhà cung cấp. Truyền `du.provider` thay cho `n.name` là mọi thẻ đều đi kiểm
 *      cái đang làm mặc định. Thẻ `kiraai` sẽ báo xanh nhờ khóa của `openai` — đúng ngược
 *      mục đích của cả nút, và trên màn hình không có gì tố cáo.
 *   2. Lỗi tràn sang thẻ khác. Đây là lý do `useModelNapVe` phải nhớ lỗi THEO nhà cung cấp:
 *      bản trước giữ một `loi` cho cả hook, đủ dùng khi màn chỉ hỏi một chỗ, nhưng ở đây nó
 *      dán 401 của `kiraai` lên thẻ `openai` đang khỏe.
 *   3. Nút bấm được khi chưa có khóa. Server từ chối đúng ca này, nên hậu quả chỉ là một nút
 *      luôn trả lỗi — mà một nút luôn trả lỗi thì người dùng đọc thành "nhà cung cấp hỏng".
 */

const LIET_KE = vi.fn<(p: string) => Promise<{ provider: string; models: string[]; count: number }>>();

vi.mock('@/lib/api', async (goc) => ({
  ...(await goc<typeof import('@/lib/api')>()),
  layCauHinh: () => Promise.resolve(CAU_HINH),
  lietKeModel: (p: string) => LIET_KE(p),
}));

const CAU_HINH: CauHinhDoc = {
  needs_setup: false,
  path: '/tmp/x/.ainovel/config.json',
  provider: 'openai',
  model: 'cx/gpt-5.5',
  style: '',
  styles: [],
  role_names: ['default', 'writer'],
  providers: [
    {
      name: 'openai',
      type: 'openai',
      base_url: 'https://9router.example/v1',
      api_key_set: true,
      api_key_masked: 'sk-4…802',
      models: [{ name: 'cx/gpt-5.5' }],
    },
    {
      name: 'kiraai',
      type: 'openai',
      base_url: 'https://kiraai.example/api/v1',
      api_key_set: true,
      api_key_masked: 'kira…e42',
      // HAI tên, và chỉ một trong hai có thật ở phía nhà cung cấp (xem `LIET_KE` của bài
      // kiểm "khai lạ"). Khai một tên là dữ liệu mẫu quá nghèo để phân biệt "lọc đúng" với
      // "nêu tất": đo bằng đột biến, gỡ sạch `.filter` vẫn xanh khi chỉ có một tên.
      models: [{ name: 'kira-mini-1.0' }, { name: 'kira-1.0' }],
    },
    {
      name: 'chuaCoKhoa',
      type: 'openai',
      base_url: 'https://x.example/v1',
      api_key_set: false,
      models: [],
    },
  ],
  presets: [],
  engine_open: [],
};

const { CauHinhXuong } = await import('./CauHinhXuong');

/**
 * Thẻ của một nhà cung cấp, tìm theo tên IN TRÊN THẺ.
 *
 * Không dùng `getByText(ten)`: tên nhà cung cấp còn xuất hiện trong ô chọn của khối Mặc
 * định, nên truy vấn phẳng khớp nhiều phần tử và ngã ngay ở bước tìm.
 */
function theCua(ten: string): HTMLElement {
  const the = Array.from(document.querySelectorAll<HTMLElement>('li.nccMuc')).find(
    (li) => li.querySelector('.nccTen')?.textContent === ten,
  );
  expect(the, `không thấy thẻ nhà cung cấp ${ten}`).toBeDefined();
  return the!;
}

/**
 * Nút "Kiểm tra" của một thẻ, tìm qua chính thẻ đó chứ không qua thứ tự trong màn.
 *
 * Khớp CẢ nhãn lúc đang bay: nút đổi chữ thành "Đang kiểm tra…" trong lúc gọi, nên một biểu
 * thức chỉ khớp nhãn nghỉ sẽ "không tìm thấy nút" đúng vào lúc bài kiểm cần soi nó nhất.
 */
function nutKiemCua(ten: string): HTMLButtonElement {
  const nut = Array.from(theCua(ten).querySelectorAll('button')).find((b) =>
    /^(Kiểm tra|Đang kiểm tra…)$/.test(b.textContent ?? ''),
  );
  expect(nut, `thẻ ${ten} không có nút Kiểm tra`).toBeDefined();
  return nut as HTMLButtonElement;
}

beforeEach(async () => {
  LIET_KE.mockReset();
  render(<CauHinhXuong />);
  await waitFor(() => expect(document.querySelectorAll('li.nccMuc').length).toBe(3));
});

test('mỗi thẻ hỏi ĐÚNG nhà cung cấp của nó, không hỏi cái đang làm mặc định', async () => {
  LIET_KE.mockResolvedValue({ provider: 'kiraai', models: ['kira-mini-1.0'], count: 1 });

  fireEvent.click(nutKiemCua('kiraai'));

  await waitFor(() => expect(LIET_KE).toHaveBeenCalled());
  expect(
    LIET_KE.mock.calls[0]?.[0],
    'thẻ kiraai đi hỏi nhà cung cấp khác — nút này sẽ báo xanh bằng khóa của người ta',
  ).toBe('kiraai');
});

test('lỗi của một thẻ KHÔNG dán lên thẻ khác', async () => {
  LIET_KE.mockRejectedValue(new Error('401 khóa sai'));

  fireEvent.click(nutKiemCua('kiraai'));
  await waitFor(() => expect(theCua('kiraai').textContent).toMatch(/401 khóa sai/));

  const theKhoe = theCua('openai');
  expect(
    theKhoe.textContent,
    'lỗi của kiraai hiện cả trên thẻ openai — một bộ lỗi dùng chung cho mọi thẻ',
  ).not.toMatch(/401 khóa sai/);
});

test('kiểm xong thì nói số model, và chỉ tên KHAI mà nhà cung cấp không có mới bị nêu', async () => {
  // Nhà cung cấp trả một danh sách KHÔNG chứa `kira-mini-1.0` đang khai trong thẻ — đúng ca
  // đã làm ba lượt tạo tác phẩm chết (`cx/gpt-5.5` khai đúng, ô mặc định gõ `gpt-5.5`).
  LIET_KE.mockResolvedValue({ provider: 'kiraai', models: ['kira-1.0', 'kira-pro'], count: 2 });

  fireEvent.click(nutKiemCua('kiraai'));

  await waitFor(() => expect(theCua('kiraai').textContent).toMatch(/2 model/));

  // Nhắm đúng Ô CẢNH BÁO, không phải cả thẻ. Đo bằng đột biến: `kira-mini-1.0` đã có sẵn ở
  // dòng "Danh sách model" của thẻ, nên một phép khớp trên `the.textContent` vẫn xanh sau khi
  // gỡ sạch phần cảnh báo — tức bài kiểm không canh gì cả.
  const canhBao = theCua('kiraai').querySelector('.vphacap');
  expect(canhBao, 'không có ô cảnh báo nào cho tên model khai mà nhà cung cấp không có').not.toBeNull();
  expect(canhBao!.textContent).toMatch(/kira-mini-1\.0/);
  // Và CHỈ tên khai lạ. `kira-1.0` cũng được khai trong thẻ nhưng nhà cung cấp CÓ nó, nên
  // lôi nó vào là biến cảnh báo thành nhiễu — người dùng sẽ đi sửa một dòng vốn đúng.
  expect(canhBao!.textContent).not.toMatch(/kira-1\.0/);
  expect(canhBao!.textContent).not.toMatch(/kira-pro/);
});

/*
 * Hai bài dưới đây canh cùng MỘT khiếu nại đo được từ người dùng: "bấm nút Kiểm tra nó kiểm
 * tra tất cả nhà cung cấp". Mạng lúc đó chỉ có đúng một lượt gọi — sai nằm ở chỗ giao diện
 * để một cú bấm nói thay cho những điều khiển người dùng chưa đụng tới.
 */

test('đang kiểm một thẻ thì KHÔNG điều khiển nào khác đổi trạng thái', async () => {
  let thaRa: (v: { provider: string; models: string[]; count: number }) => void = () => {};
  LIET_KE.mockReturnValue(
    new Promise((res) => {
      thaRa = res;
    }),
  );

  // Bấm ở thẻ `openai` — cũng chính là nhà cung cấp MẶC ĐỊNH trong dữ liệu mẫu. Đó là hình
  // dạng đã sinh ra khiếu nại: trùng nhà cung cấp thì hai điều khiển cùng đổi chữ.
  fireEvent.click(nutKiemCua('openai'));
  await waitFor(() => expect(nutKiemCua('openai').disabled).toBe(true));

  expect(
    nutKiemCua('kiraai').disabled,
    'thẻ kiraai tắt theo — cả màn xám đi cho một lượt gọi duy nhất',
  ).toBe(false);

  // Và ĐÚNG MỘT điều khiển trên cả màn được nói "đang…". Đếm trên toàn bộ trang chứ không
  // liệt kê từng nút: bề mặt này đã gộp thêm dải kênh vai, nên một phép đếm bao hết mọi thứ
  // sẽ có mặt sau này mà không phải sửa bài kiểm.
  const dangBan = Array.from(document.querySelectorAll('button')).filter((b) =>
    /^Đang /.test(b.textContent ?? ''),
  );
  expect(
    dangBan.map((b) => b.textContent),
    'nhiều hơn một điều khiển đổi sang trạng thái "đang…" cho một cú bấm',
  ).toEqual(['Đang kiểm tra…']);

  thaRa({ provider: 'openai', models: [], count: 0 });
  await waitFor(() => expect(nutKiemCua('openai').disabled).toBe(false));
});

test('một cú bấm chỉ sinh ĐÚNG MỘT dòng báo cáo trên cả màn', async () => {
  LIET_KE.mockResolvedValue({ provider: 'openai', models: ['cx/gpt-5.5'], count: 1 });

  // `openai` vừa là thẻ, vừa là nhà cung cấp mặc định — đúng hình dạng đã sinh ra khiếu nại
  // "bấm nút Kiểm tra nó kiểm tra tất cả nhà cung cấp".
  fireEvent.click(nutKiemCua('openai'));
  await waitFor(() => expect(theCua('openai').textContent).toMatch(/1 model/));

  const baoCao = Array.from(document.querySelectorAll('p')).filter((p) =>
    /Gọi được nhà cung cấp/.test(p.textContent ?? ''),
  );
  expect(
    baoCao.length,
    'một cú bấm làm nhiều chỗ cùng báo "gọi được" — người dùng đọc ra là nó vừa kiểm tất cả',
  ).toBe(1);
  expect(theCua('openai').contains(baoCao[0]!), 'dòng báo cáo không nằm trên thẻ vừa bấm').toBe(true);
});

test('chưa lưu khóa thì nút tắt — không mời bấm để nhận một lỗi báo trước được', () => {
  expect(
    nutKiemCua('chuaCoKhoa').disabled,
    'nút Kiểm tra bật khi chưa có khóa; server sẽ từ chối và người dùng đọc thành "nhà cung cấp hỏng"',
  ).toBe(true);
  expect(nutKiemCua('kiraai').disabled).toBe(false);
});
