/**
 * Ba số của một khu cuộn. Nhận dưới dạng dữ liệu chứ không nhận `HTMLElement` để bài kiểm
 * không phải dựng DOM cho một phép trừ.
 */
export interface ViTriCuon {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Ngưỡng (px) còn coi là "đang ở đáy".
 *
 * Không so bằng đúng: trình duyệt trả số lẻ do devicePixelRatio và bố cục sub-pixel, nên
 * `scrollHeight - scrollTop - clientHeight` hiếm khi tròn 0 kể cả khi đã cuộn hết. So bằng
 * đúng sẽ làm khu rớt khỏi chế độ tự cuộn ngay nhịp đầu tiên.
 */
export const LE_DAY = 24;

/** Người dùng có đang ở đáy khu cuộn không — tức tự cuộn có được phép chạy không. */
export function dangODay(v: ViTriCuon): boolean {
  return v.scrollHeight - v.scrollTop - v.clientHeight <= LE_DAY;
}
