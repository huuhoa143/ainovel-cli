import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { LoiApi } from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';

import { CuaNghiemThu } from './CuaNghiemThu';

/**
 * Hai hành động của cửa nghiệm thu, tách khỏi bài kiểm hình ở `CuaNghiemThu.test.tsx`.
 *
 * Tách tệp vì tệp này thay `@/lib/api` cho CẢ tệp (`vi.mock` là hoisted, không có phạm vi
 * theo bài kiểm), và bài kiểm hình không được chạy trên một tầng API giả: chúng canh hai
 * chuyện khác nhau, và gộp lại thì một ngày ai đó sửa mock sẽ làm đỏ những bài không liên
 * quan tới mạng.
 */
const CHO_DI_TIEP = vi.fn();
const CAN_THIEP = vi.fn();

vi.mock('@/lib/api', async (goc) => ({
  ...(await goc<typeof import('@/lib/api')>()),
  choDiTiep: (...a: unknown[]) => CHO_DI_TIEP(...a),
  canThiep: (...a: unknown[]) => CAN_THIEP(...a),
}));

const LY_DO = 'nhịp tụt ở đoạn giữa; ba cảnh liên tiếp cùng một nhịp';

function cho(p: Partial<Parameters<typeof CuaNghiemThu>[0]> = {}) {
  return render(
    <CuaNghiemThu
      advance={{ mode: 'review', hold: true, permit_chapter: 8, hold_reason: LY_DO }}
      runtime=""
      tacPham="tran-yeu-ky"
      choGhi
      dangChay={false}
      onDoi={() => {}}
      {...p}
    />,
  );
}

const nutTiep = () => screen.getByRole('button', { name: CHU.choDiTiep });
const nutTra = () => screen.getByRole('button', { name: CHU.traChuongVeVietLai(8) });

beforeEach(() => {
  CHO_DI_TIEP.mockReset().mockResolvedValue({ permit_chapter: 9, running: true });
  CAN_THIEP.mockReset().mockResolvedValue({ applied: 'continue' });
});

test('Cho đi tiếp gọi POST /advance trên ĐÚNG cuốn đang mở', () => {
  cho();
  fireEvent.click(nutTiep());
  expect(CHO_DI_TIEP).toHaveBeenCalledWith('tran-yeu-ky');
});

test('bấm Cho đi tiếp hai lần liên tiếp chỉ gọi API MỘT lần', () => {
  // Bấm đôi ở đây là hai lượt chạy, tức tiền đôi — cùng lớp rủi ro đã khiến màn Xưởng bị cấm
  // có nút chạy (quyết định 4 của spec).
  //
  // Lời hứa KHÔNG BAO GIỜ giải quyết là điều kiện để bài này đo đúng thứ nó nói: một lời hứa
  // đã resolve sẽ nhả khóa trước cú bấm thứ hai, và lúc đó bài kiểm xanh nhờ nhịp của mock
  // chứ không nhờ cái khóa.
  CHO_DI_TIEP.mockReturnValue(new Promise(() => {}));
  cho();

  // Giữ CÙNG một nút qua hai cú bấm, không tra lại theo nhãn: nhãn đổi thành "Đang gửi…"
  // ngay sau cú đầu, nên một lần tra lại sẽ không tìm thấy gì và bài kiểm xanh vì lỗi tra
  // cứu chứ không vì cái khóa. Người dùng bấm đôi cũng bấm vào đúng một nút đó.
  const nut = nutTiep();
  fireEvent.click(nut);
  // Khóa phải là `disabled`, không phải mỗi cái nhãn: một nút đổi chữ mà vẫn bấm được thì
  // cú thứ hai vẫn đi, và ở đây cú thứ hai là một lượt chạy nữa.
  expect((nut as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(nut);

  expect(CHO_DI_TIEP).toHaveBeenCalledTimes(1);
});

test('Trả chương về viết lại mở ô nhập, mang sẵn NGUYÊN VĂN kết luận Editor', () => {
  // Gửi nguyên văn mô tả lỗi của Editor làm giá trị mặc định, để người vận hành SỬA chứ
  // không phải gõ lại — và cũng để câu đi tới engine là câu Editor đã viết, không phải một
  // bản tóm tắt của người đang vội.
  cho();
  expect(screen.queryByRole('textbox')).toBeNull();

  fireEvent.click(nutTra());

  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(LY_DO);
});

test('kết luận Editor vắng thì ô nhập RỖNG — không bịa một lý do', () => {
  cho({ advance: { mode: 'review', hold: true, permit_chapter: 8 } });
  fireEvent.click(screen.getByRole('button', { name: CHU.traChuongVeVietLai(8) }));

  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
});

test('gửi ô nhập gọi POST /steer với chữ ĐÃ SỬA, rồi nạp lại snapshot', async () => {
  // `onDoi()` chứ không tự đoán trạng thái mới: sau `/steer` engine đổi cả hàng chờ viết lại
  // lẫn cửa, và giao diện không biết trước nó đổi thành gì.
  const doi = vi.fn();
  cho({ onDoi: doi });

  fireEvent.click(nutTra());
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'viết lại đoạn giữa, giữ nguyên cảnh mở' },
  });
  fireEvent.click(screen.getByRole('button', { name: CHU.danhThucLuotMoi }));

  expect(CAN_THIEP).toHaveBeenCalledWith(
    'tran-yeu-ky',
    'viết lại đoạn giữa, giữ nguyên cảnh mở',
  );
  await waitFor(() => expect(doi).toHaveBeenCalledTimes(1));
});

test('bấm gửi hai lần liên tiếp chỉ gọi /steer MỘT lần', () => {
  CAN_THIEP.mockReturnValue(new Promise(() => {}));
  cho();

  fireEvent.click(nutTra());
  const gui = screen.getByRole('button', { name: CHU.danhThucLuotMoi });
  fireEvent.click(gui);
  expect((gui as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(gui);

  expect(CAN_THIEP).toHaveBeenCalledTimes(1);
});

test('Cho đi tiếp cũng nạp lại snapshot sau khi xong', async () => {
  const doi = vi.fn();
  cho({ onDoi: doi });
  fireEvent.click(nutTiep());
  await waitFor(() => expect(doi).toHaveBeenCalledTimes(1));
});

test('lỗi từ server hiện NGUYÊN VĂN, không làm dịu', async () => {
  // Câu của server biết rõ hơn giao diện chuyện gì đã xảy ra: 409 ở đây có thể là "engine đã
  // đóng", "chương đã được cấp phép rồi" hay "chế độ auto còn sót giấy phép" — ba việc phải
  // xử khác nhau. Một câu chung ("không cho đi tiếp được") xóa sạch khác biệt đó.
  CHO_DI_TIEP.mockRejectedValue(
    new LoiApi('第 8 章派发与第 9 章许可不一致', 409),
  );
  const { container } = cho();

  fireEvent.click(nutTiep());

  await waitFor(() =>
    expect(container.querySelector('.loiDoc')!.textContent).toBe(
      '第 8 章派发与第 9 章许可不一致',
    ),
  );
});

test('lỗi của /steer cũng hiện nguyên văn, và ô nhập GIỮ chữ đã gõ', async () => {
  // Nuốt lỗi ở đây đắt gấp đôi: người vận hành vừa không biết vì sao, vừa mất câu vừa gõ.
  CAN_THIEP.mockRejectedValue(new LoiApi('engine chưa mở cho tác phẩm này', 409));
  const { container } = cho();

  fireEvent.click(nutTra());
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'sửa đoạn giữa' } });
  fireEvent.click(screen.getByRole('button', { name: CHU.danhThucLuotMoi }));

  await waitFor(() =>
    expect(container.querySelector('.loiDoc')!.textContent).toBe(
      'engine chưa mở cho tác phẩm này',
    ),
  );
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('sửa đoạn giữa');
});

test('nhãn nút gửi nói TRƯỚC câu này sẽ thành gì, theo engine đang chạy hay đứng', async () => {
  // Cùng luật đã ghi trong `OCanThiep.tsx`, và cùng hai khóa nhãn: một câu tiêm vào lượt đang
  // chạy có thể làm chương đang viết bị xếp lại vào hàng chờ, còn đánh thức là bắt đầu một
  // lượt mới và TIÊU TIỀN.
  //
  // Kế hoạch (quyết định 7) nói ở cửa nghiệm thu engine "đang đứng" nên server luôn chọn
  // `Continue`. Điều đó KHÔNG chắc: `AdvanceHold` là một ý định tạm dừng được đặt trước và
  // chỉ được tiêu ở biên chương kế tiếp (`internal/host/imp/runner.go:729`), nên cửa có thể
  // đang treo trong lúc engine vẫn viết dở. Nhãn vì vậy đi theo `dangChay` chứ không theo
  // một giả định.
  const { rerender } = cho({ dangChay: false });
  fireEvent.click(nutTra());
  expect(screen.getByRole('button', { name: CHU.danhThucLuotMoi })).toBeDefined();

  rerender(
    <CuaNghiemThu
      advance={{ mode: 'review', hold: true, permit_chapter: 8, hold_reason: LY_DO }}
      runtime=""
      tacPham="tran-yeu-ky"
      choGhi
      dangChay
      onDoi={() => {}}
    />,
  );
  expect(screen.getByRole('button', { name: CHU.tiemVaoLuotDangChay })).toBeDefined();
});

test('ô nhập nói ra hệ quả: Arbiter phân loại rồi xếp chương vào hàng chờ viết lại', () => {
  // "Trả chương về viết lại" không phải một lệnh xóa chương: nó là một chỉ thị can thiệp, và
  // phạm vi ảnh hưởng do Arbiter quyết định — người bấm phải biết điều đó TRƯỚC khi gửi.
  const { container } = cho();
  fireEvent.click(nutTra());
  expect(container.textContent).toContain(GIAI_THICH.traVeVietLaiQuaSteer);
});
