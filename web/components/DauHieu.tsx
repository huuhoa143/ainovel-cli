import { DAU_BO_GOC, DAU_CAO, DAU_LANE, DAU_VIEWBOX, DAU_X } from '@/lib/dauHieu';

/**
 * Dấu hiệu ainovel — bản NỘI TUYẾN, dùng ở thanh trên.
 *
 * Cùng hình học với `app/icon.svg` (favicon); hằng số nằm ở `lib/dauHieu.ts` và có bài kiểm
 * đối chiếu hai bên. Xem chú thích ở đó cho lý do chọn ba lane.
 *
 * # Hai khác biệt CÓ CHỦ Ý so với bản favicon
 *
 *  1. **Không có tấm nền.** Favicon phải tự mang nền vì nó đứng trên thanh tab của trình
 *     duyệt — một nền sáng, tối, hay bất kỳ màu nào. Ở đây nó đứng trên `--panel`, đã là nền
 *     của hệ, nên một tấm nền `--bg` sẽ thành một ô vuông sẫm vô cớ giữa thanh.
 *  2. **Màu bằng biến CSS**, không phải hex. Bản nội tuyến thấy `:root`, nên nó đi theo token
 *     nếu token đổi. Favicon không có lối đó và phải chép hex — đó chính là chỗ hai bản từng
 *     lệch nhau, và là lý do bài kiểm tồn tại.
 *
 * `aria-hidden` vì chữ "ainovel studio" ngay cạnh đã nói đủ; một `<title>` ở đây làm trình
 * đọc màn hình đọc tên sản phẩm hai lần.
 */
export function DauHieu({ cao = 20 }: { cao?: number }) {
  return (
    <svg
      className="dauhieu"
      width={cao}
      height={cao}
      viewBox={`0 0 ${DAU_VIEWBOX} ${DAU_VIEWBOX}`}
      aria-hidden="true"
      focusable="false"
    >
      {DAU_LANE.map((l) => (
        <rect
          key={l.token}
          x={DAU_X}
          y={l.y}
          width={l.w}
          height={DAU_CAO}
          rx={DAU_BO_GOC}
          fill={`var(--${l.token})`}
        />
      ))}
    </svg>
  );
}
