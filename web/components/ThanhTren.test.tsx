import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { trangThaiCua } from '@/lib/nghiemThu';
import { CHU, GIAI_THICH, kyTheoTone } from '@/lib/nhan';

import { ThanhTren } from './ThanhTren';
import { sach } from './mau.test-helper';

/**
 * Repo chưa từng có bộ kiểm cho `ThanhTren`, và huy hiệu nghiệm thu là lý do phải có một cái.
 *
 * Huy hiệu ở đây chứ không trong một bề mặt vì nó phải hiện ở MỌI khu — cùng lý lẽ đã ghi cho
 * `HoiChan` ở `page.tsx`: một dây chuyền đang đứng chờ không được ẩn sau một lựa chọn điều
 * hướng. Luật đó chỉ đo được ở hai chỗ: tại component này (huy hiệu có/không đúng lúc) và tại
 * tầng `Trang` (nó có được nối, và nó có nằm ngoài `Khu` không) — xem `app/page.test.tsx`.
 */
function ve(p: Partial<Parameters<typeof ThanhTren>[0]> = {}) {
  const b = sach();
  return render(
    <ThanhTren
      workshop={{ root: '/w', books: [b] }}
      dangXem={b}
      ketNoi="song"
      onChon={() => {}}
      onChonKhu={() => {}}
      cuaNghiemThu={undefined}
      {...p}
    />,
  );
}

test('đang chờ nghiệm thu thì thanh trên mang huy hiệu, kèm ký hiệu hình học', () => {
  ve({ cuaNghiemThu: trangThaiCua({ mode: 'review', hold: true, permit_chapter: 8 }) });

  const hh = screen.getByRole('button', { name: CHU.nghiemThuChoBan });
  expect(hh).toBeDefined();
  // Ký hiệu là kênh thứ hai: huy hiệu này là thứ DUY NHẤT màu amber trên thanh trên sau
  // Task 7, nên mất màu là mất tin — luật của `PRODUCT.md`, khuôn ở `TrangThai.tsx`.
  expect(hh.querySelector('.ky')!.textContent).toBe(kyTheoTone('amber'));
  // Kênh thứ BA: chú giải nói huy hiệu dẫn tới đâu và sẽ thấy gì ở đó. Nhãn nói CÓ việc,
  // chú giải nói việc đó làm ở đâu — bỏ nó vẫn xanh 4/4 nếu không có dòng này (đã thử đột
  // biến). Nó là bổ sung chứ không thay được nhãn: `moMay` đã ghi lý do — trên cảm ứng chú
  // giải không tồn tại.
  expect(hh.getAttribute('title')).toBe(GIAI_THICH.nghiemThuHuyHieuDanToi);
});

test('KHÔNG chờ thì không có huy hiệu — cả ba ca không-chờ', () => {
  // Một huy hiệu amber thường trực trên thanh trên là một cảnh báo giả ở chỗ đắt nhất màn
  // hình: thanh trên là thứ người vận hành ngó vào để biết "còn cái nào đang chạy không".
  //
  // Ca `undefined` (chưa có snapshot) đứng cùng hai ca kia vì hệ quả giống nhau, nhưng nó có
  // nguồn khác: `Trang` chưa tải xong thì chưa ai đo được cửa nào cả.
  const { container, rerender } = render(
    <ThanhTren
      workshop={{ root: '/w', books: [sach()] }}
      dangXem={sach()}
      ketNoi="song"
      onChon={() => {}}
      onChonKhu={() => {}}
      cuaNghiemThu={undefined}
    />,
  );
  expect(container.querySelector('.hieunghiemthu')).toBeNull();

  for (const a of [
    { mode: 'auto', hold: true },
    { mode: 'review', hold: false },
  ] as const) {
    rerender(
      <ThanhTren
        workshop={{ root: '/w', books: [sach()] }}
        dangXem={sach()}
        ketNoi="song"
        onChon={() => {}}
        onChonKhu={() => {}}
        cuaNghiemThu={trangThaiCua(a)}
      />,
    );
    expect(container.querySelector('.hieunghiemthu')).toBeNull();
  }
});

test('bấm huy hiệu đi tới khu Kiểm định', () => {
  // Bề mặt Kiểm định là chỗ người dùng đọc bằng chứng để quyết định, nên huy hiệu phải dẫn
  // tới ĐÓ chứ không tới buồng lái: một huy hiệu chỉ nói "có việc" mà không đưa tới chỗ làm
  // việc đó là bắt người vận hành tự đi tìm.
  const di = vi.fn();
  ve({
    onChonKhu: di,
    cuaNghiemThu: trangThaiCua({ mode: 'review', hold: true, permit_chapter: 8 }),
  });

  fireEvent.click(screen.getByRole('button', { name: CHU.nghiemThuChoBan }));

  expect(di).toHaveBeenCalledWith('kiem-dinh');
});

test('huy hiệu KHÔNG phụ thuộc việc có tác phẩm nào đang xem hay không', () => {
  // `dangXem` vắng làm cả bộ chọn tác phẩm biến mất. Nếu huy hiệu bị đặt bên trong khối đó
  // thì nó cũng biến mất cùng — và ca này không hiếm: nó là đúng cái mà một lần tải lại trang
  // đi qua. Giữ nó ở ngoài để chốt rằng nó là tin của MÁY, không phải một phần của bộ chọn.
  ve({
    dangXem: undefined,
    cuaNghiemThu: trangThaiCua({ mode: 'review', hold: true }),
  });
  expect(screen.getByRole('button', { name: CHU.nghiemThuChoBan })).toBeDefined();
});
