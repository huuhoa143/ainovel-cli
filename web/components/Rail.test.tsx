import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { Khu } from '@/lib/khu';
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
  const r = render(
    <Rail
      snapshot={snap({})}
      hoSo={undefined}
      khu={khu}
      onChonKhu={chon}
      dauChot={dauChot}
    />,
  );
  return { ...r, chon };
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

test('rail có mục Xưởng, và bấm vào nó đi tới khu `xuong`', () => {
  const { chon } = ve();
  fireEvent.click(screen.getByRole('button', { name: new RegExp(CHU.xuong) }));
  expect(chon).toHaveBeenCalledWith('xuong');
});

test('Xưởng đứng ĐẦU nhóm chung, trên Tác phẩm mới — thứ tự đó là thứ tự câu hỏi', () => {
  // "Tôi đang có gì" đi trước "thêm một cái nữa". Bài này canh thứ tự chứ không chỉ canh sự
  // có mặt: một mục Xưởng nằm cuối nhóm vẫn thỏa bài trên, trong khi người vào nhóm để đếm
  // lại xưởng phải quét qua ba mục khác trước.
  const { container } = ve();
  const nhom = container.querySelector('#nhom-chung');
  expect(nhom).not.toBeNull();

  const nhan = [...nhom!.querySelectorAll('.mucdi .nhan')].map((e) => e.textContent);
  expect(nhan[0]).toBe(CHU.xuong);
  expect(nhan).toContain(CHU.taoTacPham);
  expect(nhan.indexOf(CHU.xuong)).toBeLessThan(nhan.indexOf(CHU.taoTacPham));
});

test('đang ở khu Xưởng thì mục đó sáng lên — người dùng biết mình đang đứng đâu', () => {
  // `aria-current` là thứ duy nhất nói ra chỗ đang đứng, và nó chỉ đúng nếu mã khu của mục
  // khớp mã khu đang mở. Một mục trỏ nhầm khu vẫn điều hướng được nhưng không bao giờ sáng.
  const { container } = ve('xuong');
  const dangMo = container.querySelector('[aria-current="page"] .nhan');
  expect(dangMo?.textContent).toBe(CHU.xuong);
});
