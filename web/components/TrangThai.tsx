import type { NhanTrangThai } from '@/lib/nhan';

/**
 * Một trạng thái công đoạn: ký hiệu + chữ, tô theo tông ngữ nghĩa.
 *
 * Ký hiệu đứng trước chữ và khác nhau giữa các trạng thái, nên ảnh đen trắng
 * và người mù màu vẫn phân biệt được — màu không bao giờ là kênh duy nhất.
 * Ký hiệu mang `aria-hidden` vì chữ ngay bên cạnh đã nói cùng một điều; đọc cả
 * hai là lặp.
 *
 * `dap` là NHỊP ĐẬP, và nó phải do phía gọi truyền vào — component này không tự
 * suy được. Trạng thái nó nhận (`tt`) đến từ `stage`/`activity` đã ghi vào store,
 * tức một công đoạn, không phải một sự thật về liveness; tự bật nhịp đập theo
 * tông `gold` là đúng cái lỗi làm engine đã chết đọc ra thành đang chạy. Chỉ
 * truyền `dap` khi có sự thật liveness thật — xem lib/song.ts.
 */
export function TrangThai({
  tt,
  title,
  dap,
}: {
  tt: NhanTrangThai;
  title?: string;
  dap?: boolean;
}) {
  return (
    <span className={`st ${tt.mau}${dap ? ' dap' : ''}`} title={title}>
      <span className="ky" aria-hidden="true">
        {tt.ky}
      </span>
      {tt.nhan}
    </span>
  );
}
