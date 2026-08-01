import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { CHU } from '@/lib/nhan';
import { BO_DEM_RONG, SO_LUOT_GIU, moLuot, themChu } from '@/lib/vanSong';

import { VanSong } from './VanSong';

/** Bộ đệm đã CHẠM trần lượt: mọi lượt còn lại đều mang nhãn, kể cả lượt đầu. */
function boDemDaCat() {
  let bd = BO_DEM_RONG;
  for (let i = 0; i <= SO_LUOT_GIU; i += 1) {
    bd = moLuot(bd, `v${i}`);
    bd = themChu(bd, `chữ ${i}`);
  }
  return bd;
}

test('vẽ chữ của mọi lượt đang giữ', () => {
  let bd = themChu(BO_DEM_RONG, 'lượt một');
  bd = moLuot(bd, 'chương 2 · 23:11');
  bd = themChu(bd, 'lượt hai');

  render(<VanSong boDem={bd} dangChay />);

  expect(screen.getByText('lượt một')).toBeDefined();
  expect(screen.getByText('lượt hai')).toBeDefined();
});

test('vạch ngăn hiện nhãn của lượt, và lượt đầu KHÔNG có vạch', () => {
  let bd = themChu(BO_DEM_RONG, 'lượt một');
  bd = moLuot(bd, 'chương 2 · 23:11');
  bd = themChu(bd, 'lượt hai');

  const { container } = render(<VanSong boDem={bd} dangChay />);

  expect(screen.getByText('chương 2 · 23:11')).toBeDefined();
  // Hai lượt nhưng chỉ MỘT vạch: vạch là thứ ngăn giữa, không phải nhãn của mỗi khối.
  expect(container.querySelectorAll('.vach')).toHaveLength(1);
});

test('bộ đệm rỗng nói ra là chưa có gì, không để khung trắng', () => {
  render(<VanSong boDem={BO_DEM_RONG} dangChay />);
  expect(screen.getByText(/chưa có lượt nào/i)).toBeDefined();
});

test('lượt đầu của bộ đệm ĐÃ BỊ CẮT vẫn không có vạch, dù nó mang nhãn', () => {
  // Bài "lượt đầu KHÔNG có vạch" ở trên KHÔNG canh được điều nó nói: bộ đệm của nó có lượt
  // đầu `nhan === undefined`, nên bỏ hẳn chốt `i > 0` vẫn cho đúng một vạch và vẫn xanh (đã
  // thử đột biến). Chốt đó chỉ làm việc ở ca này — bộ đệm đã chạm trần, lượt cũ nhất bị bỏ,
  // và lượt đứng đầu bây giờ MANG nhãn của chính nó.
  //
  // Vẽ vạch trên cùng ở đây là khẳng định có một lượt phía trên nó. Lượt đó vừa bị trần cắt
  // mất, nên vạch ấy trỏ vào một thứ người đọc không bao giờ cuộn tới được.
  const bd = boDemDaCat();
  expect(bd.luot[0]!.nhan).toBeDefined(); // nếu không thì bài này lại đo nhầm ca

  const { container } = render(<VanSong boDem={bd} dangChay />);

  expect(container.querySelectorAll('.luot')).toHaveLength(SO_LUOT_GIU);
  expect(container.querySelectorAll('.vach')).toHaveLength(SO_LUOT_GIU - 1);
});

test('lượt không có nhãn thì không vẽ vạch RỖNG', () => {
  // `moLuot` nhận nhãn là tùy chọn, nên ca này tới được. Một vạch không chữ là một đường kẻ
  // ngang không nói gì — nó chia đôi khu chữ mà không cho biết chia theo cái gì.
  let bd = themChu(BO_DEM_RONG, 'lượt một');
  bd = moLuot(bd);
  bd = themChu(bd, 'lượt hai');

  const { container } = render(<VanSong boDem={bd} dangChay />);

  expect(container.querySelectorAll('.luot')).toHaveLength(2);
  expect(container.querySelectorAll('.vach')).toHaveLength(0);
});

test('lượt bị trần cắt KHÔNG nhường nút DOM của nó cho lượt sau', () => {
  // Đây là điều mà chú thích của `LuotVan.id` khẳng định, và cho tới bài này thì không có gì
  // giữ nó: đổi `key={l.id}` thành `key={i}` vẫn xanh cả bộ (đã thử đột biến).
  //
  // Với key theo id, lượt bị bỏ mang nút DOM của nó đi theo và các lượt còn lại GIỮ nút cũ.
  // Với key theo chỉ số, mọi chỉ số dịch xuống một bậc: React coi đó là "nội dung phần tử 0
  // vừa đổi", giữ nguyên nút và thay chữ bên trong — trong một khu đang tự cuộn thì đó là
  // một cú nhảy vị trí ngay giữa lúc đọc.
  let bd = boDemDaCat();
  const { container, rerender } = render(<VanSong boDem={bd} dangChay />);
  const cu = [...container.querySelectorAll('.chu')];

  bd = moLuot(bd, 'lượt kế');
  bd = themChu(bd, 'chữ kế');
  rerender(<VanSong boDem={bd} dangChay />);
  const moi = [...container.querySelectorAll('.chu')];

  // Lượt cũ nhất bị bỏ, nên lượt đứng đầu bây giờ phải là lượt thứ HAI của lần vẽ trước —
  // đúng nút DOM đó, không phải một nút được dùng lại và thay ruột.
  expect(moi[0]).toBe(cu[1]);
  expect(moi[0]).not.toBe(cu[0]);
});

test('tên vùng KHÔNG đổi theo trạng thái máy, tiêu đề thì có', () => {
  // Tên vùng là thứ trình đọc màn hình điều hướng TỚI. Đặt nó bằng câu trạng thái thì nó
  // vừa lặp lại nội dung ngay bên dưới, vừa thành SAI khi máy chuyển sang nghỉ — cùng lớp
  // lỗi đã trả giá một lần ở dải "việc tiếp theo" (xem `CHU.vttVung`).
  const bd = themChu(BO_DEM_RONG, 'x');
  const { rerender } = render(<VanSong boDem={bd} dangChay />);

  expect(screen.getByRole('region', { name: CHU.vanSongVung })).toBeDefined();
  expect(screen.getByRole('heading', { name: CHU.mayDangNoi })).toBeDefined();

  rerender(<VanSong boDem={bd} dangChay={false} />);

  expect(screen.getByRole('region', { name: CHU.vanSongVung })).toBeDefined();
  expect(screen.getByRole('heading', { name: CHU.mayNghi })).toBeDefined();
});
