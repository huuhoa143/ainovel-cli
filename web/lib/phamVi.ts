/**
 * Phạm vi của bảng chương — bộ chọn "Mức xem" trong bản mockup đã duyệt.
 *
 * Vì sao cần: server trả MỌI chương có dấu vết sản xuất trên toàn tác phẩm
 * (internal/serve/snapshot.go:buildChapterRows gộp done + rewrite + cycle +
 * chương kế tiếp), KHÔNG lọc theo tập hay cung. Tiêu đề bảng từng ghi "Chương
 * trong cung 2 · tập 3" cho đúng danh sách đó, và đó là một lời nói dối cụ thể:
 * trong fixture, cung 2 là chương 45–50 nhưng bảng chứa cả chương 41 (chờ viết
 * lại, thuộc cung 1) và chương 44. Người vận hành đọc tiêu đề rồi tin rằng
 * chương 41 nằm trong cung đang chạy.
 *
 * Bộ chọn mức xem biến lời nói dối đó thành một phép lọc THẬT do người vận hành
 * bấm, nên tiêu đề nói đúng những gì đang hiện.
 *
 * Ràng buộc đi kèm: lọc KHÔNG được im lặng ẩn việc tồn. Một chương chờ viết lại
 * nằm ngoài tập đang chạy vẫn phải đếm được, nếu không bề mặt này lại rơi vào
 * đúng lỗi mà Rail đã tránh — người vận hành bỏ qua một hàng chờ thật. Vì thế
 * `soHangAn` tồn tại và chỗ gọi phải hiện con số đó.
 */

import type { ChapterRow, LaneBlock, Timeline } from './types';

export type MucXem = 'tap' | 'cung' | 'chuong';

export const MUC_XEM: readonly MucXem[] = ['tap', 'cung', 'chuong'] as const;

export interface PhamVi {
  muc: MucXem;
  /** Chương đầu/cuối của phạm vi. Vắng ở mức chương (không lọc gì). */
  from?: number;
  to?: number;
  /** Số hiệu tập/cung, để chỗ gọi dựng nhãn tiếng Việt. */
  index?: number;
  /**
   * true khi mức này chưa có phạm vi để lọc: khối chưa mở nên chưa có from/to.
   * Chỗ gọi phải vô hiệu hóa nút đó thay vì lọc ra bảng rỗng.
   */
  khongRo: boolean;
}

/**
 * Khối dùng làm phạm vi cho một mức.
 *
 * Ưu tiên khối đang chạy. Khi không có khối nào đang chạy (tác phẩm đã xong,
 * hoặc engine đang nghỉ giữa hai cung) thì lấy khối ĐÃ MỞ cuối cùng: đó là chỗ
 * dây chuyền dừng lại, tức phạm vi người vận hành đang quan tâm. Khối chưa mở
 * không bao giờ được chọn vì nó không có from/to.
 */
function khoiPhamVi(blocks: LaneBlock[] | null): LaneBlock | undefined {
  // null = truyện không phân tầng (server gửi slice nil thành `null`). Đây là chỗ ĐÃ NỔ:
  // `Canvas` khởi tạo mức xem là 'tap' rồi gọi `phamViCua` để BIẾT phạm vi có rõ không —
  // tức lời gọi xảy ra TRƯỚC phép kiểm `capabilities.layered_outline`, nên nó không được
  // dựa vào phép kiểm đó. Trả undefined thì `phamViCua` báo `khongRo` và Canvas rơi về
  // mức 'chuong', đúng cái nó vẫn định làm.
  if (!blocks) return undefined;
  const chay = blocks.find((b) => b.state === 'running' && b.from && b.to);
  if (chay) return chay;
  const daMo = blocks.filter((b) => b.from && b.to);
  return daMo[daMo.length - 1];
}

export function phamViCua(timeline: Timeline, muc: MucXem): PhamVi {
  if (muc === 'chuong') return { muc, khongRo: false };

  const khoi = khoiPhamVi(muc === 'tap' ? timeline.volumes : timeline.arcs);
  if (!khoi?.from || !khoi.to) return { muc, khongRo: true };

  return { muc, from: khoi.from, to: khoi.to, index: khoi.index, khongRo: false };
}

/** Hàng trong phạm vi. Phạm vi không rõ thì KHÔNG lọc — thà hiện thừa hơn ẩn việc. */
export function locHang(rows: ChapterRow[], pv: PhamVi): ChapterRow[] {
  const { from, to } = pv;
  if (from === undefined || to === undefined) return rows;
  return rows.filter((r) => r.chapter >= from && r.chapter <= to);
}

/** Số hàng bị phép lọc ẩn đi. Chỗ gọi PHẢI hiện con số này khi nó > 0. */
export function soHangAn(rows: ChapterRow[], pv: PhamVi): number {
  return rows.length - locHang(rows, pv).length;
}

/**
 * Việc tồn bị ẩn, tách theo công đoạn.
 *
 * Không phải mọi hàng bị ẩn đều đáng báo: một chương đã nghiệm thu ở tập trước
 * nằm ngoài phạm vi là chuyện bình thường. Chương chờ viết lại hoặc đang soạn
 * thì khác — đó là việc đang tồn, và ẩn nó đi mà không nói là lỗi.
 */
export function vieccTonBiAn(rows: ChapterRow[], pv: PhamVi): number {
  const trong = new Set(locHang(rows, pv).map((r) => r.chapter));
  return rows.filter(
    (r) => !trong.has(r.chapter) && (r.stage === 'rewrite' || r.stage === 'drafting'),
  ).length;
}

