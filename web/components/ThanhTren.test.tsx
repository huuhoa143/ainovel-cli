import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { trangThaiCua } from '@/lib/nghiemThu';
import { CHU, GIAI_THICH, TRANG_THAI_KET_NOI, kyTheoTone } from '@/lib/nhan';

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
      theoTacPham
      dauChot={0}
      onChon={() => {}}
      onChonKhu={() => {}}
      cuaNghiemThu={undefined}
      {...p}
    />,
  );
}

test('đang chờ nghiệm thu thì thanh trên mang huy hiệu, kèm ký hiệu hình học', () => {
  ve({ cuaNghiemThu: trangThaiCua({ mode: 'review', hold: true, permit_chapter: 8 }, '') });

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

test('huy hiệu mang CẢ HAI bản nhãn, và tên vùng là bản đầy đủ', () => {
  // Task 7 rút phần chữ về "Chờ bạn" dưới 700px, và đó là một phép đo: ĐO ĐƯỢC ở 390px, bản
  // đầy đủ (194px) nén bộ chọn tác phẩm còn 5px — tên cuốn đang mở biến mất khỏi thanh trên.
  // Ngân sách thật ở đó là 123px; bản ngắn cho 83px và bộ chọn về 116px.
  //
  // jsdom KHÔNG bố cục nên nó không có điểm ngắt, không có bề rộng, và bài này KHÔNG chứng
  // minh được điều gì về hình. Nó canh đúng hai thứ mà DOM giữ được, và cả hai đều đã hỏng
  // được trong thực tế:
  //  - cả hai bản nhãn CÓ MẶT (xóa bản ngắn thì dưới 700px huy hiệu chỉ còn một hình vuông
  //    amber vô danh, và không phép đo nào ngoài bài này chạm tới);
  //  - `aria-label` là bản ĐẦY ĐỦ, nên tên vùng KHÔNG đổi theo bề rộng màn hình — cùng luật
  //    đã ghi cho `vttVung`/`vanSongVung`, và cùng cách `.nutMoi` giữ nghĩa khi rút về `+`.
  ve({ cuaNghiemThu: trangThaiCua({ mode: 'review', hold: true, permit_chapter: 8 }, '') });

  const hh = screen.getByRole('button', { name: CHU.nghiemThuChoBan });
  expect(hh.getAttribute('aria-label')).toBe(CHU.nghiemThuChoBan);
  expect(hh.querySelector('.nhan')!.textContent).toBe(CHU.nghiemThuChoBan);
  expect(hh.querySelector('.nhanNgan')!.textContent).toBe(CHU.nghiemThuChoBanNgan);
  // Bản ngắn phải là một câu KHÁC, không phải cùng chuỗi đặt hai lần: hai bản giống nhau thì
  // điểm ngắt không tiết kiệm được pixel nào, và bài kiểm vẫn xanh.
  expect(CHU.nghiemThuChoBanNgan).not.toBe(CHU.nghiemThuChoBan);
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
      theoTacPham
      dauChot={0}
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
        theoTacPham
        dauChot={0}
      onChon={() => {}}
        onChonKhu={() => {}}
        cuaNghiemThu={trangThaiCua(a, '')}
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
    cuaNghiemThu: trangThaiCua({ mode: 'review', hold: true, permit_chapter: 8 }, ''),
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
    cuaNghiemThu: trangThaiCua({ mode: 'review', hold: true }, ''),
  });
  expect(screen.getByRole('button', { name: CHU.nghiemThuChoBan })).toBeDefined();
});

/* ── họ 10 · đồng thanh, chỗ thứ ba ─────────────────────────────────────
 *
 * Ô tiến độ `9/111` là chỗ mang con số THÔ của sự kiện chốt chương. Ba chỗ nhấp cùng màu,
 * cùng lúc, cùng thời lượng — đó là bài dạy rằng vạch trên lane, chip ở rail và con số này
 * là MỘT sự thật nhìn từ ba góc.
 */

test('mở trang (dauChot=0) thì ô tiến độ KHÔNG nhấp', () => {
  const { container } = ve();
  expect(container.querySelector('.meta')?.className).not.toContain('dongThanh');
});

test('chốt một chương thì ô tiến độ nhấp', () => {
  const { container } = ve({ dauChot: 1 });
  expect(container.querySelector('.meta')?.className).toContain('dongThanh');
});

test('dấu về 0 thì lớp được DỌN — cùng thời lượng với hai chỗ kia', () => {
  // Xem lý do đầy đủ (và phép đo trên app thật) ở `dauDongThanh` trong app/page.tsx.
  const { container } = ve({ dauChot: 0 });
  expect(container.querySelectorAll('.dongThanh')).toHaveLength(0);
});

/* ── chip kết nối ────────────────────────────────────────────────────────
 *
 * Người dùng hỏi thẳng: *"đã nối là gì ấy nhỉ"*. Nhãn cũ không nêu TÂN NGỮ, và một nhãn mà
 * người dùng phải hỏi là một nhãn đã hỏng — chú giải có sẵn nhưng nó chỉ tồn tại khi có
 * chuột và khi người ta nghĩ tới việc rê lên đó.
 */

test('chip kết nối nói NỐI CÁI GÌ, không chỉ nói trạng thái', () => {
  const { container } = ve();
  const chip = container.querySelector('.kbd.live');
  expect(chip?.querySelector('.nhan')?.textContent).toBe(TRANG_THAI_KET_NOI.song.nhan);
  expect(TRANG_THAI_KET_NOI.song.nhan).toContain('engine');
  // Và nhãn phải nói HỆ QUẢ, không chỉ nói có một socket đang mở: điều người vận hành dùng
  // được là "số trên màn có tự cập nhật không".
  expect(TRANG_THAI_KET_NOI.song.nhan).toContain('trực tiếp');
});

test('hai bản nhãn cùng ở trong DOM, và chúng KHÔNG lặp chữ', () => {
  // Bản ngắn ẩn bằng CSS chứ không bằng cách thôi render — chép cơ chế của huy hiệu nghiệm
  // thu, để không có điểm ngắt nào sống trong JS.
  //
  // Bài này canh một lỗi ĐÃ XẢY RA THẬT ở bản dựng đầu: thêm `.nhanNgan` vào DOM mà quên
  // khối `display: none` trong CSS, nên chip đọc thành "engine · đã nối đã nối" trên màn
  // rộng. jsdom không áp stylesheet nên không đo được cái ẩn; thứ đo được — và là thứ đủ để
  // chặn lỗi đó tái diễn — là hai bản phải KHÁC nhau và bản ngắn phải thật sự ngắn hơn.
  const { container } = ve();
  const chip = container.querySelector('.kbd.live');
  const dai = chip?.querySelector('.nhan')?.textContent ?? '';
  const ngan = chip?.querySelector('.nhanNgan')?.textContent ?? '';
  expect(dai).not.toBe('');
  expect(ngan).not.toBe('');
  expect(ngan).not.toBe(dai);
  expect(ngan.length).toBeLessThan(dai.length);
  // `aria-label` giữ bản ĐẦY ĐỦ ở mọi bề rộng: phần mất khi hẹp là hình, không phải nghĩa.
  expect(chip?.getAttribute('aria-label')).toBe(dai);
});

test('bốn trạng thái kết nối, bốn câu khác nhau', () => {
  // "chưa mở dòng" (xưởng rỗng) KHÔNG được gộp với "đang nối": một xưởng không có tác phẩm
  // nào thì không có dòng nào để mà nối, và "đang nối" ở đó là câu không bao giờ thành thật.
  const chu = new Set<string>();
  for (const tt of ['song', 'dang-mo', 'mat', 'khong'] as const) {
    const { container, unmount } = ve({ ketNoi: tt });
    chu.add(container.querySelector('.kbd.live .nhan')?.textContent ?? '');
    unmount();
  }
  expect(chu.size).toBe(4);
});
