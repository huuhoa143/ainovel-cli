import { render } from '@testing-library/react';
import { expect, test } from 'vitest';

import { CHU } from '@/lib/nhan';

import { BuongLai } from './BuongLai';
import { snap } from './mau.test-helper';

/**
 * Hai bài của Task này chỉ canh LUẬT ĐỔI DẢI. Lưới ba cột thuộc Task 13.
 *
 * `.vtt` chứ không phải `.viectieptheo` như kế hoạch ghi: `ViecTiepTheo` đã tồn tại từ trước
 * và lớp của nó là `vtt` (`app/globals.css` bám theo tên đó). Đổi tên lớp cho khớp kế hoạch
 * là sửa CSS của một dải đang chạy được, chỉ để một bài kiểm đọc đẹp hơn.
 */
function ve(dangChay: boolean) {
  return render(
    <BuongLai
      snapshot={snap({ agents: [], idle_agents: [] })}
      dangChay={dangChay}
      song={undefined}
      onChonKhu={() => {}}
      onDocChuong={() => {}}
    />,
  );
}

test('đang chạy → hiện dải trạng thái, KHÔNG hiện dải việc tiếp theo', () => {
  const { container } = ve(true);

  // Khung mang lớp `buonglai`. Hôm nay lớp này chưa làm gì — nhưng lưới ba cột của Task 13
  // và CSS của Task 14 đều bám vào đúng tên đó, nên đổi tên nó là để cả buồng lái rơi về một
  // chồng khối dọc mà không bài kiểm nào lên tiếng (đã thử đột biến: bỏ lớp vẫn xanh).
  expect(container.querySelector('.buonglai')).not.toBeNull();
  expect(container.querySelector('.daitrangthai')).not.toBeNull();
  // Hiện CẢ HAI cũng là sai, không chỉ hiện nhầm: một dải "việc tiếp theo" lúc máy đang chạy
  // là mời người dùng bấm một nút thứ hai trong khi một lượt đang tiêu tiền.
  expect(container.querySelector('.vtt')).toBeNull();
});

test('máy nghỉ → hiện dải việc tiếp theo, KHÔNG hiện dải trạng thái', () => {
  const { container } = ve(false);

  expect(container.querySelector('.vtt')).not.toBeNull();
  expect(container.querySelector('.daitrangthai')).toBeNull();
});

test('dải việc tiếp theo được cho biết máy đang NGHỈ, không phải đang chạy', () => {
  // Hai bài trên chỉ hỏi dải nào có mặt, nên chúng vẫn xanh nếu `dangChay` bị nhét cứng
  // thành `true` lúc truyền xuống. Dải đó suy CẢ câu trạng thái lẫn nút từ cờ này: nhét cứng
  // là để nó nói "Máy đang viết" ngay dưới một thanh transport đang đứng im.
  const { container } = ve(false);

  expect(container.querySelector('.vtt')!.textContent).toContain(CHU.ttNghi(1, 3));
});
