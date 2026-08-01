import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { CHU } from '@/lib/nhan';

import { Xuong } from './Xuong';
import { sach } from './mau.test-helper';

/**
 * Bề mặt Xưởng: dải tổng và bảng một dòng một cuốn.
 *
 * # Mỗi khẳng định "chưa đo được" đi kèm khẳng định NGƯỢC LẠI
 *
 * Bốn bài dưới đây hỏi "cuốn chưa chạy thì ô này để trống". Một bề mặt vẽ dấu `—` cho MỌI
 * cuốn cũng thỏa cả bốn — và lúc đó nó giấu đúng những con số mà cả màn hình này tồn tại để
 * hiện. Nên mỗi bài đều dựng HAI cuốn: một cuốn chưa đo được và một cuốn có số thật, rồi đòi
 * cả hai điều cùng lúc. Đây là bài học "bảng đột biến chỉ canh chiều nghịch là bảng nói dối"
 * của cụm B, dịch sang bộ kiểm.
 */
function ve(...s: Parameters<typeof sach>[0][]) {
  return render(<Xuong sach={s.map((p) => sach(p))} onMoTacPham={() => {}} />);
}

/** Chữ của từng ô trong dải tổng, theo đúng thứ tự vẽ. */
function oTong(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll('.xtong .o')].map((e) => e.textContent);
}

/** Một dòng của bảng, tra theo mã cuốn. */
function dong(container: HTMLElement, ma: string): HTMLElement {
  const tr = container.querySelector<HTMLElement>(`tbody tr[data-ma="${ma}"]`);
  if (!tr) throw new Error(`không có dòng nào cho cuốn ${ma}`);
  return tr;
}

test('dải tổng hiện năm con số của cả xưởng', () => {
  const { container } = ve(
    { id: 'a', completed_chapters: 3, total_words: 5305, cost_usd: 1.67, engine_open: true },
    { id: 'b', completed_chapters: 2, total_words: 3000, cost_usd: 0.9 },
  );

  // Viết THẲNG chuỗi mong đợi, không dựng lại bằng `tongXuong` hay `so()`: một bài kiểm gọi
  // đúng hàm mà bề mặt gọi thì nó chỉ chứng minh hai lời gọi giống nhau, kể cả khi cả hai
  // cùng sai. Con số ở đây tính tay: 3+2 chương, 5305+3000 từ, 167+90 xu.
  expect(oTong(container)).toEqual([
    '2 tác phẩm',
    '5 chương đã chốt',
    '8.305 từ',
    '$2,57 đã tiêu',
    '1 engine đang mở',
  ]);
});

test('mỗi cuốn đúng MỘT dòng, và mã cuốn hiện ra kể cả khi hai cuốn trùng tên', () => {
  // `id` là tên thư mục và cũng là khóa trong URL (`?tp=`), nên nó là thứ duy nhất phân biệt
  // được hai dòng. Bỏ nó đi thì hai cuốn ở hai thư mục khác nhau hiện y hệt nhau và người
  // vận hành mở sai cuốn mà không có cách nào biết — cùng lý do đã ghi ở `ThanhTren.tsx`.
  const { container } = ve({ id: 'mac-the', name: 'Mặc Thế' }, { id: 'mac-the-2', name: 'Mặc Thế' });

  expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  expect(screen.getAllByText('Mặc Thế')).toHaveLength(2);
  expect(screen.getByText('mac-the')).toBeDefined();
  expect(screen.getByText('mac-the-2')).toBeDefined();
});

test('cuốn chưa đặt tên hiện MÃ thay cho tên, không hiện một ô trống', () => {
  const { container } = ve({ id: 'chua-dat-ten', name: '' });
  expect(dong(container, 'chua-dat-ten').querySelector('.ten')?.textContent).toBe(
    'chua-dat-ten',
  );
});

test('nhịp: cuốn chưa chạy để TRỐNG, cuốn đã chạy hiện số — không phải `0 ch/giờ`', () => {
  // `0 ch/giờ` nói cuốn đó CÓ chạy mà chưa xong nổi một chương trong một giờ. Cuốn chưa chạy
  // lần nào thì không có nhịp để nói.
  const { container } = ve(
    { id: 'im', chapters_per_hour: 0 },
    { id: 'chay', chapters_per_hour: 4.4 },
  );

  const o = dong(container, 'im').querySelector('.nhip');
  expect(o?.textContent).toBe(CHU.khongCo);
  // Dấu trống phải nói ra VÌ SAO trống; không thì người vận hành không biết đó là chưa chạy
  // hay studio hỏng.
  expect(o?.querySelector('[title]')).not.toBeNull();
  expect(dong(container, 'im').textContent).not.toContain('0 chương/giờ');

  expect(dong(container, 'chay').querySelector('.nhip')?.textContent).toContain('4,4');
});

test('giá thành mỗi chương: cùng luật đó — 0 là chưa đo được, không phải $0,000', () => {
  const { container } = ve(
    { id: 'im', cost_usd: 1.2, cost_per_chapter: 0 },
    { id: 'chay', cost_usd: 1.2, cost_per_chapter: 0.835 },
  );

  const o = dong(container, 'im').querySelector('.donGia');
  expect(o?.textContent).toBe(CHU.khongCo);
  expect(o?.querySelector('[title]')).not.toBeNull();

  expect(dong(container, 'chay').querySelector('.donGia')?.textContent).toContain('$0,835');
});

test('chi phí TỔNG bằng 0 vẫn in ra $0,00 — đó là một phép đo, không phải chỗ trống', () => {
  // Ranh giới với hai bài trên, và nó là ranh giới thật: xưởng ĐÃ đo được là cuốn này chưa
  // tốn gì. Gộp nó vào "chưa đo được" là vứt đi một câu trả lời có thật.
  const { container } = ve({ id: 'moi', cost_usd: 0 });
  expect(dong(container, 'moi').querySelector('.tong')?.textContent).toBe('$0,00');
});

test('sửa lần cuối: vắng thì để trống, có thì hiện ngày — không bao giờ hiện Invalid Date', () => {
  const { container } = ve(
    { id: 'khong' },
    { id: 'co', updated_at: '2026-07-31T16:11:20Z' },
    // Một mốc hỏng ở dữ liệu không được biến thành chữ "Invalid Date" trên màn hình.
    { id: 'hong', updated_at: 'khong-phai-ngay' },
  );

  expect(dong(container, 'khong').querySelector('.sua')?.textContent).toBe(CHU.khongCo);
  expect(dong(container, 'hong').querySelector('.sua')?.textContent).toBe(CHU.khongCo);

  const co = dong(container, 'co').querySelector('.sua')?.textContent ?? '';
  expect(co).not.toBe(CHU.khongCo);
  expect(co).not.toContain('Invalid');
  expect(co).toContain('2026');
});

test('dòng của cuốn đang mở engine mang chữ và lớp riêng; dòng khác KHÔNG mang', () => {
  const { container } = ve({ id: 'mo', engine_open: true }, { id: 'dong', engine_open: false });

  const mo = dong(container, 'mo');
  expect(mo.className).toContain('engmo');
  expect(mo.textContent).toContain(CHU.engineDangMo);

  const d = dong(container, 'dong');
  expect(d.className).not.toContain('engmo');
  expect(d.textContent).not.toContain(CHU.engineDangMo);
});

test('tiến độ: số đi kèm thanh, và thanh KHÔNG vẽ khi chưa biết tổng số chương', () => {
  // `total_chapters === 0` nghĩa là chưa biết tổng, không phải "tổng bằng không" — vẽ một
  // thanh đầy hay rỗng ở đó đều là khẳng định một tỉ lệ mà dữ liệu không nói.
  const { container } = ve(
    { id: 'biet', completed_chapters: 3, total_chapters: 12 },
    { id: 'chua', completed_chapters: 3, total_chapters: 0 },
  );

  const biet = dong(container, 'biet').querySelector('.tiendo');
  expect(biet?.textContent).toContain('3/12');
  expect(biet?.querySelector('.thanh .day')).not.toBeNull();

  const chua = dong(container, 'chua').querySelector('.tiendo');
  expect(chua?.textContent).toContain('3');
  expect(chua?.querySelector('.thanh .day')).toBeNull();
});

test('bề mặt nói ra vì sao KHÔNG có nút chạy ở đây', () => {
  // Không tìm thấy nút chạy mà không có lời giải thích là một khoảng lặng người vận hành
  // phải tự lấp bằng phỏng đoán. Khẳng định "không có nút chạy" nằm ở Task 5.
  const { container } = ve({ id: 'a' });
  expect(container.textContent).toContain('một đường tiêu tiền duy nhất');
});

/* ── hành động trên mỗi dòng ──────────────────────────────────────────── */

test('cuốn chưa xong chỉ có `Mở`, và `Mở` đi tới buồng lái của ĐÚNG cuốn đó', () => {
  const mo = vi.fn();
  const { container } = render(
    <Xuong sach={[sach({ id: 'a' }), sach({ id: 'b', phase: 'writing' })]} onMoTacPham={mo} />,
  );

  const nut = [...dong(container, 'b').querySelectorAll('button')].map((n) => n.textContent);
  expect(nut).toEqual([CHU.moTacPham]);

  fireEvent.click(dong(container, 'b').querySelector('button')!);
  // Mã cuốn phải là mã của DÒNG, không phải cuốn đang xem. Đây là chỗ lỗi ref-trễ đã đo được
  // hai lần trong dự án này rơi vào.
  expect(mo).toHaveBeenCalledWith('b', 'dong-san-xuat');
});

test('cuốn đã hoàn thành có đủ ba: Mở · Đọc · Xuất bản', () => {
  const mo = vi.fn();
  const { container } = render(
    <Xuong sach={[sach({ id: 'xong', phase: 'complete' })]} onMoTacPham={mo} />,
  );

  const nut = [...dong(container, 'xong').querySelectorAll('button')];
  expect(nut.map((n) => n.textContent)).toEqual([CHU.moTacPham, CHU.docTacPham, CHU.xuatBan]);

  fireEvent.click(nut[1]!);
  // Chương 1 đi CÙNG lời gọi, không phải một lời gọi thứ hai: hai lần ghi URL thì lần sau
  // xóa tham số của lần trước, và `?ch=` là thứ bị mất.
  expect(mo).toHaveBeenLastCalledWith('xong', 'ban-thao', 1);

  fireEvent.click(nut[2]!);
  expect(mo).toHaveBeenLastCalledWith('xong', 'nhap-xuat');
});

test('KHÔNG có nút Chạy, Dừng, Xóa hay Đổi tên trên bề mặt này', () => {
  // Hàng rào chống một lần "tiện tay thêm nút" trong tương lai, và nó canh HAI quyết định đã
  // chốt của spec §4:
  //
  //   4 — chạy chỉ có ở transport, một đường tiêu tiền duy nhất. Hai nút cùng gọi POST /run
  //       thì trạng thái khóa-lúc-đang-gửi của chúng không thấy nhau, nên bấm cả hai là trả
  //       tiền hai lần. Và đây là bề mặt người ta QUÉT MẮT, không phải bề mặt để quyết định.
  //   8 — xóa một cuốn là xóa hàng giờ chạy và hàng chục đô; việc đó để ở hệ tệp, nơi thấy
  //       rõ mình đang phá cái gì.
  //
  // Dựng đủ cả cuốn đang chạy lẫn cuốn đã xong: nút chạy, nếu ai đó thêm, nhiều khả năng chỉ
  // hiện ở một trong hai ca.
  render(
    <Xuong
      sach={[
        sach({ id: 'a', phase: 'writing', engine_open: true }),
        sach({ id: 'b', phase: 'complete' }),
      ]}
      onMoTacPham={() => {}}
    />,
  );

  const nhan = screen.getAllByRole('button').map((n) => n.textContent ?? '');
  expect(nhan.length).toBeGreaterThan(0);
  for (const t of nhan) {
    expect(t).not.toMatch(/chạy|dừng|xoá|xóa|đổi tên/i);
  }
});
