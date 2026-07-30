import type { NhanTrangThai } from '@/lib/nhan';

/**
 * Một trạng thái công đoạn: ký hiệu + chữ, tô theo tông ngữ nghĩa.
 *
 * Ký hiệu đứng trước chữ và khác nhau giữa các trạng thái, nên ảnh đen trắng
 * và người mù màu vẫn phân biệt được — màu không bao giờ là kênh duy nhất.
 * Ký hiệu mang `aria-hidden` vì chữ ngay bên cạnh đã nói cùng một điều; đọc cả
 * hai là lặp.
 */
export function TrangThai({ tt, title }: { tt: NhanTrangThai; title?: string }) {
  return (
    <span className={`st ${tt.mau}`} title={title}>
      <span className="ky" aria-hidden="true">
        {tt.ky}
      </span>
      {tt.nhan}
    </span>
  );
}
