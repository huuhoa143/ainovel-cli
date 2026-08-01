import type { TienDo } from './types';

/** Trạng thái của cửa nghiệm thu, đủ để cả ba chỗ dùng vẽ ra. */
export interface TrangThaiCua {
  /** Engine ĐANG đứng chờ người duyệt. Đây là thứ bật huy hiệu ở thanh trên. */
  dangCho: boolean;
  /** Chế độ nghiệm thu có bật không — khác với "đang chờ ngay lúc này". */
  cheDoDuyet: boolean;
  /**
   * Chương đang chờ nghiệm thu.
   *
   * Đây là `permit_chapter`, tức chương ĐÃ ĐƯỢC CHO ĐI TIẾP — TUI in đúng trường này thành
   * "已放行第 N 章" (`internal/entry/tui/panels_sidebar.go:34`). Ở một cửa đang treo thì
   * chương đó cũng chính là chương vừa viết xong và đang chờ người duyệt.
   *
   * `undefined` là ca THẬT và không hiếm: `TienDo.PermitChapter` khai `omitempty`
   * (`internal/serve/model.go:243`), nên số 0 — "chưa cấp phép chương nào" — rụng khỏi JSON
   * và tới đây thành vắng mặt. Nơi nào vẽ số này phải có câu cho ca không có số.
   */
  chuong?: number;
  lyDo?: string;
}

/**
 * Suy trạng thái cửa từ `snapshot.advance`.
 *
 * Ba điều tách bạch, và lẫn chúng là nguồn của những giao diện nói dối:
 *
 *   - `advance === null` → engine ĐÓNG, không đo được. KHÔNG phải "không chờ vì mọi thứ ổn".
 *     Vẽ cửa lúc này là mời người dùng bấm một nút chắc chắn trả 409.
 *   - `mode !== 'review'` → chế độ tự chạy; `hold` có bật cũng không có ai phải duyệt.
 *   - `mode === 'review' && hold` → ĐANG CHỜ. Đây là ca duy nhất bật huy hiệu.
 *
 * `hold_reason` là TÙY. Engine dừng ở biên trước, Editor kết luận sau; đòi có lý do mới vẽ
 * cửa sẽ giấu mất một dây chuyền đang đứng im trong khoảng giữa hai việc đó.
 *
 * # Chốt `!advance` giữ cái gì, và KHÔNG giữ cái gì
 *
 * Đo bằng đột biến (xem nhật ký thi hành của kế hoạch 4/4): thay chốt này bằng
 * `advance ?? {mode:'auto', hold:false}` thì cả bộ kiểm vẫn XANH — và đó không phải lỗ hổng
 * của bộ kiểm mà là một sự thật về hàm này: với CÂU HỎI "có cửa nào đang chờ không", engine
 * đóng và chế độ tự chạy có cùng một câu trả lời đúng, nên không phép đo nào tách được chúng
 * ở đây. Ai cần tách hai ca đó (nhãn chế độ ở transport — Task 6) phải đọc thẳng
 * `snapshot.advance === null`, đừng hỏi hàm này.
 *
 * Chốt vẫn là hàng rào thật cho hai ca khác, cả hai đều có bài kiểm đỏ:
 *   - bỏ hẳn chốt (`advance!.mode`) → ném TypeError ngay ở ca engine đóng;
 *   - `??` một mặc định DUYỆT (`{mode:'review', hold:true}`) → vẽ cửa cho một engine đã
 *     đóng, tức đúng lớp lỗi `null`-đọc-thành-một-phép-đo mà cả hợp đồng `/studio` giữ.
 */
/**
 * Trạng thái engine mà ở đó nó KHÔNG còn tự đi tiếp — tức nếu đang ở chế độ nghiệm thu thì
 * nó đang chờ người duyệt.
 *
 * `completed` KHÔNG nằm trong đây: truyện viết xong thì không còn chương nào để duyệt, và một
 * dải "đang chờ bạn cho đi tiếp" trên một cuốn đã hoàn thành là một việc phải làm không tồn
 * tại. `pausing` cũng không: engine đang trên đường dừng, chưa dừng.
 *
 * `''` (engine đóng) không nằm trong đây, và đó là cả một quyết định: suy nó thành "đã dừng"
 * sẽ vẽ cửa cho một engine không tồn tại — đúng lớp lỗi `null`-đọc-thành-một-phép-đo mà cả
 * hợp đồng `/studio` sinh ra để chặn.
 */
const DA_DUNG = new Set(['paused', 'idle']);

export function trangThaiCua(advance: TienDo | null, runtime: string | null): TrangThaiCua {
  if (!advance) return { dangCho: false, cheDoDuyet: false };
  const cheDoDuyet = advance.mode === 'review';
  return {
    // HAI đường vào cùng một cửa, và chúng là hai chuyện khác nhau:
    //
    //   - `advance.hold` — một lần tạm dừng DO CAN THIỆP KÝ. Xảy ra được cả lúc engine đang
    //     chạy, nên nó không cần điều kiện runtime nào.
    //   - `runtime` đã dừng — cửa nghiệm thu ở luồng THƯỜNG: engine viết xong một chương và
    //     đứng lại vì chưa có giấy phép cho chương sau.
    //
    // Bản đầu chỉ có đường thứ nhất, và đó là một lỗi ĐO ĐƯỢC: engine viết xong chương 4 rồi
    // dừng với `hold: false`, nên dải nghiệm thu không bao giờ hiện ở luồng thường.
    dangCho: cheDoDuyet && (advance.hold || DA_DUNG.has(runtime ?? '')),
    cheDoDuyet,
    chuong: advance.permit_chapter,
    lyDo: advance.hold_reason,
  };
}
