import type { StreamEvent } from './types';

/**
 * Cổng vào của đường sự kiện ui.
 *
 * # Vì sao một hàm riêng cho hai phép so sánh
 *
 * Vì đã có một lỗi ĐO ĐƯỢC ở đúng chỗ này. `LOAI_SU_KIEN` chứa cả `stream_delta`, và
 * `useStudio` từng gắn cùng một handler cho mọi loại. Payload của delta là `{"text":"…"}`,
 * không có `seq`, và `undefined <= 0` trong JavaScript là `false` — nên không có early
 * return. Ba hệ quả, nặng dần:
 *
 *   1. `seqRef.current` bị gán `undefined`, tức mốc nối lại của stream mất nghĩa;
 *   2. mẩu chữ bị đẩy vào danh sách sự kiện như một sự kiện;
 *   3. hẹn làm mới snapshot bị đặt lại ở MỖI mẩu. Nhịp delta đã đo là trung vị 2ms, nên hẹn
 *      1500ms KHÔNG BAO GIỜ tới hạn — bảng chương và transport đứng im đúng lúc engine đang
 *      viết, tức đúng lúc buồng lái phải sống.
 *
 * Đòi `typeof === 'number'` chứ không chỉ `!= null`: một `seq: "13"` lọt qua `>` nhờ ép kiểu
 * rồi được gán vào mốc dưới dạng chuỗi, và phép so sánh của mẩu sau đó so chuỗi với chuỗi
 * theo thứ tự từ điển ("9" > "13").
 */
export function nhanSuKienUi(vao: unknown, mocSeq: number): StreamEvent | undefined {
  if (!vao || typeof vao !== 'object') return undefined;
  const ev = vao as Partial<StreamEvent>;
  if (typeof ev.seq !== 'number') return undefined;
  if (ev.seq <= mocSeq) return undefined;
  return ev as StreamEvent;
}
