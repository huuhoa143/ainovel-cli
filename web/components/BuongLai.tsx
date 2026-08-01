'use client';

import type { Khu } from '@/lib/khu';
import type { Snapshot } from '@/lib/types';
import type { CongDoanSong } from '@/lib/useStudio';

import { DaiTrangThai } from './DaiTrangThai';
import { ViecTiepTheo } from './ViecTiepTheo';

/**
 * BUỒNG LÁI — bề mặt `?khu=dong-san-xuat`.
 *
 * Hiện tại đây mới là KHUNG: nó giữ đúng một luật, luật đổi dải. Lưới ba cột, trục, khu văn
 * sống, dòng sự kiện và ô can thiệp chuyển vào đây ở Task 13; dựng chúng sớm là va vào một
 * phiên khác đang sửa cùng những tệp đó.
 *
 * # Vì sao ĐỔI dải chứ không hiện cả hai
 *
 * Lúc máy nghỉ KHÔNG CÓ GÌ đang chảy để xem, và câu người dùng mang theo lúc đó là "giờ tôi
 * làm gì" — đúng câu `ViecTiepTheo` trả lời. Lúc máy chạy thì ngược lại: câu là "nó đang làm
 * gì", và một dải "việc tiếp theo" lúc đó là mời người dùng bấm một nút thứ hai trong khi một
 * lượt đang tiêu tiền.
 *
 * Hai nút cùng gọi `POST /run` không thấy trạng thái khóa-lúc-đang-gửi của nhau, nên bấm cả
 * hai là hai lượt chạy — tiền đôi vì một chi tiết giao diện. Đó là lý do `ViecTiepTheo` chỉ
 * điều hướng chứ không chạy engine, và là lý do nó biến mất hẳn khi máy đang chạy.
 */
export function BuongLai({
  snapshot,
  dangChay,
  song,
  onChonKhu,
  onDocChuong,
}: {
  snapshot: Snapshot;
  dangChay: boolean;
  /**
   * Công đoạn suy từ dòng SSE.
   *
   * ĐI XUYÊN, và hôm nay không ai đọc: `ViecTiepTheo` chỉ dùng `song` bên trong khối
   * `DangLam`, mà khối đó chỉ vẽ khi `dangChay` — tức đúng ca dải này KHÔNG hiện. Luật đổi
   * dải vừa làm `DangLam` thành không tới được, và việc của nó ("ai · bước nào · chương
   * nào") giờ do `DaiTrangThai` làm, đầy đủ hơn.
   *
   * Giữ tham số vì Task 13 chuyển cả thân `Canvas` vào đây và luồng dữ liệu đó có `song`;
   * không có bài kiểm nào canh được nó lúc này, và đó là sự thật chứ không phải một lỗ hổng
   * bịt được — một giá trị không quan sát được thì không bài kiểm nào phân biệt nổi.
   */
  song: CongDoanSong | undefined;
  onChonKhu: (k: Khu) => void;
  onDocChuong: (n: number) => void;
}) {
  return (
    <div className="buonglai">
      {dangChay ? (
        <DaiTrangThai snapshot={snapshot} />
      ) : (
        <ViecTiepTheo
          snapshot={snapshot}
          dangChay={dangChay}
          song={song}
          onChonKhu={onChonKhu}
          onDocChuong={onDocChuong}
        />
      )}
    </div>
  );
}
