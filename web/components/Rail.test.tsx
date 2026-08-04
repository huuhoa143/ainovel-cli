import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { Khu } from '@/lib/khu';
import { manCuaKhu } from '@/lib/man';
import { CHU } from '@/lib/nhan';

import { Rail } from './Rail';
import { snap } from './mau.test-helper';

/**
 * Đường VÀO màn Xưởng.
 *
 * Kế hoạch không đòi tệp này, và đó chính là lý do nó phải có: mục rail là đường duy nhất tới
 * bề mặt Xưởng ngoài việc gõ tay `?khu=xuong`. Bộ kiểm của `Xuong.tsx` dựng component đó
 * THẲNG, nên xóa hẳn mục rail vẫn xanh cả bộ — đúng lớp "mắt cuối của sợi dây không ai chạm
 * tới" mà cụm D đã đo được một lần với `vanSong={s.vanSong}`.
 */

/**
 * jsdom KHÔNG hiện thực `scrollIntoView`; `Rail` gọi nó trong effect để kéo khu đang mở vào
 * tầm nhìn. Vá tại đây chứ không ở `vitest.setup.giaodien.ts` — cùng lý do đã ghi ở
 * `app/page.test.tsx`: tệp setup vá một lỗi làm MỌI bài kiểm nói dối, còn cái này chỉ chạm
 * tới bài kiểm nào dựng `Rail`.
 */
Element.prototype.scrollIntoView = function () {
  /* jsdom không bố cục */
};

function ve(khu: Khu = 'dong-san-xuat', dauChot = 0) {
  const chon = vi.fn();
  const doiMan = vi.fn();
  const r = render(
    <Rail
      snapshot={snap({})}
      hoSo={undefined}
      khu={khu}
      man={manCuaKhu(khu)}
      onChonKhu={chon}
      onChonMan={doiMan}
      canBan={false}
      tenCuonNgan="Trấn Yêu Ký"
      dauChot={dauChot}
    />,
  );
  return { ...r, chon, doiMan };
}

/* ── họ 10 · đồng thanh ──────────────────────────────────────────────────
 *
 * Một chương chốt thì ba chỗ nhấp CÙNG màu, CÙNG lúc: vạch trên lane, chip này, và tiến độ
 * ở thanh trên. Chỉ chip "Bản thảo" được nhận dấu — nó đếm đúng con số mà sự kiện làm đổi.
 */

test('dauChot=0 (mở trang) thì KHÔNG chip nào mang lớp đồng thanh', () => {
  // Cùng luật với mọi họ khác: mở trang thấy chín chương đã chốt từ hôm qua, và nếu chúng
  // làm chip nhấp thì cái nhấp đó không còn nghĩa gì.
  const { container } = ve();
  expect(container.querySelectorAll('.dongThanh')).toHaveLength(0);
});

test('chốt một chương → ĐÚNG MỘT chip nhấp, và là chip Bản thảo', () => {
  const { container } = ve('dong-san-xuat', 1);
  const nhap = [...container.querySelectorAll('.dongThanh')];
  expect(nhap).toHaveLength(1);

  // Rải ra các mục khác sẽ biến một tin thành một đợt nhấp toàn rail — đúng thứ họ 10 tồn
  // tại để KHÔNG làm.
  const muc = nhap[0]!.closest('.mucdi');
  expect(muc?.querySelector('.nhan')?.textContent).toBe(CHU.banThao);
});

test('dấu về 0 sau khi hết nhấp thì lớp được DỌN, không dính lại', () => {
  // ĐO ĐƯỢC trên app thật: bản trước truyền thẳng bộ đếm `chot.dau`, và vì nó chỉ tăng nên
  // lớp `dongThanh` dính vĩnh viễn sau lần chốt đầu (t=3.200ms: vạch trên lane đã sạch, hai
  // chỗ kia vẫn còn lớp). Hôm nay vô hại, nhưng nó phá đúng lời hứa "cùng thời lượng" của
  // họ 10 — và là mìn hẹn giờ cho ngày ai đó thêm một `key` mới.
  const { container } = ve('dong-san-xuat', 0);
  expect(container.querySelectorAll('.dongThanh')).toHaveLength(0);
});

test('đồng thanh THẮNG nhấp-số-đổi: một phần tử không mang hai hoạt ảnh', () => {
  // Chốt chương làm `completed_chapters` đổi, nên họ 08 (`vuaDoi`) cũng muốn nhấp cùng lúc.
  // Hai hoạt ảnh trên một phần tử thì cái nào thắng tuỳ thứ tự khai trong CSS — một hành vi
  // không ai đọc ra được từ mã component.
  const { container } = ve('dong-san-xuat', 3);
  const chip = container.querySelector('.dongThanh');
  expect(chip?.className).not.toContain('vuaDoi');
});

/* ── bộ chuyển màn ───────────────────────────────────────────────────────
 *
 * Ba bài dưới đây thay cho hai bài cũ về "nhóm chung". Nhóm đó không còn: bốn khu mức máy
 * của nó đã lên thành hai MÀN riêng, nên đường vào chúng cũng đổi chỗ. Điều đáng canh thì
 * không đổi — vẫn là "có đường tới đó không, và người dùng có thấy đường ấy không".
 */

test('cả BA màn luôn hiện, kể cả khi đang đứng trong xưởng sản xuất', () => {
  // Đây là bài quan trọng nhất của tệp. Câu người dùng đã hỏi nguyên văn là "các màn khác
  // đâu rồi ta", và nguyên nhân là điều hướng cấp một bị giấu sau một cú bấm mở nhóm. Ba
  // hàng màn KHÔNG được nằm sau bất cứ lớp thu gọn nào.
  ve('dong-san-xuat');
  for (const ten of [CHU.manQuanLy, CHU.manCaiDatChung, CHU.manXuongSanXuat]) {
    expect(screen.getByRole('button', { name: new RegExp(ten) })).toBeTruthy();
  }
});

test('bấm một màn thì đi tới khu ĐẦU của màn đó, không phải một khu tuỳ ý', () => {
  const { doiMan } = ve('dong-san-xuat');
  fireEvent.click(screen.getByRole('button', { name: new RegExp(CHU.manQuanLy) }));
  expect(doiMan).toHaveBeenCalledWith('quan-ly');
});

test('rail chỉ vẽ khu của MÀN đang mở — không trộn hai cấp vào một cột', () => {
  // Cả điểm của tầng màn: đứng trong xưởng sản xuất thì không thấy khu của màn Quản lý, và
  // ngược lại. Trộn lại là quay về đúng cái rail mười tám mục đã bị gọi là "quá ngợp".
  const sx = ve('dong-san-xuat');
  const nhanSX = [...sx.container.querySelectorAll('.mucdi .nhan')].map((e) => e.textContent);
  expect(nhanSX).toContain(CHU.banThao);
  expect(nhanSX).not.toContain(CHU.xuong);
  expect(nhanSX).not.toContain(CHU.cauHinh);
  sx.unmount();

  const ql = ve('xuong');
  const nhanQL = [...ql.container.querySelectorAll('.mucdi .nhan')].map((e) => e.textContent);
  expect(nhanQL).toContain(CHU.xuong);
  expect(nhanQL).toContain(CHU.taoTacPham);
  expect(nhanQL).not.toContain(CHU.banThao);
  // Xưởng đứng ĐẦU, trên Tác phẩm mới: thứ tự này là thứ tự câu hỏi — "tôi đang có gì" đi
  // trước "thêm một cái nữa".
  expect(nhanQL.indexOf(CHU.xuong)).toBeLessThan(nhanQL.indexOf(CHU.taoTacPham));
});

test('mục Xưởng của màn Quản lý đi tới khu `xuong`', () => {
  const { chon, container } = ve('xuong');
  const muc = [...container.querySelectorAll('.mucdi')].find(
    (e) => e.querySelector('.nhan')?.textContent === CHU.xuong,
  );
  fireEvent.click(muc!);
  expect(chon).toHaveBeenCalledWith('xuong');
});

test('đang ở khu Xưởng thì mục đó sáng lên — người dùng biết mình đang đứng đâu', () => {
  // `aria-current` là thứ duy nhất nói ra chỗ đang đứng, và nó chỉ đúng nếu mã khu của mục
  // khớp mã khu đang mở. Một mục trỏ nhầm khu vẫn điều hướng được nhưng không bao giờ sáng.
  const { container } = ve('xuong');
  const dangMo = container.querySelector('[aria-current="page"] .nhan');
  expect(dangMo?.textContent).toBe(CHU.xuong);
});
