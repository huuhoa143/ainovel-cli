import type { Activity, Runtime, Snapshot } from './types';

/** Tập đóng của `Runtime`, để canh cửa cho một chuỗi đến từ dây. Cùng vai với `laKhu`. */
const RUNTIME: readonly string[] = ['idle', 'running', 'pausing', 'paused', 'completed'];

/**
 * Trạng thái máy đã hợp nhất — MỘT khoá cho cả nhãn, nhịp đập, lẫn bộ nút.
 *
 * # Vì sao một khoá thay vì để mỗi bề mặt tự suy
 *
 * ĐO ĐƯỢC trên app thật (2026-08-02, cuốn `viet-truyen-dang-trung-sinh`): API trả
 * `runtime: "paused"` cùng lúc với `transport.state: "running"`, và thanh dưới in ra CẢ HAI —
 * vạch đầu đọc tắt (đọc `mayDangChay`, đúng) trong khi ký hiệu ▶ đang đập và chữ ghi "đang
 * chạy" (tra `TRANG_THAI_MAY[transport.state]`, sai), ngay cạnh một nút mời bấm "▶ Chạy".
 *
 * Nguyên nhân không phải ai cẩu thả. `mayDangChay` ra đời sau transport, và transport được
 * đấu dây một nửa: nhận `mayChay` cho chuyển động, còn câu chữ ở lại nguồn cũ. Một bản vá
 * kiểu "nhớ dùng đúng trường" sẽ hỏng lại y hệt ở bề mặt thứ ba. Nên chỗ suy ra trạng thái
 * chỉ còn ĐÚNG MỘT, và `mayDangChay` cũng chỉ là một câu hỏi đặt cho nó.
 *
 * # Ba luật, ba lý do khác nhau
 *
 * 1. `runtime` hợp lệ thì THẮNG — nó là engine tự khai; `activity` suy từ mốc checkpoint nên
 *    trễ ở CẢ HAI chiều (xem `mayDangChay` dưới).
 * 2. `runtime` vắng (`''`, engine đóng) thì rơi về `activity` — sự thật mạnh nhất còn lại.
 * 3. `runtime` LẠ cũng rơi về `activity`, không trả nguyên chuỗi ra ngoài. Ca đến được: một
 *    bản engine mới hơn web thêm trạng thái thứ sáu. Trả nguyên chuỗi thì tra bảng ra
 *    `undefined` và thanh dưới TRẮNG đúng ô trả lời câu hỏi số một. Rơi về `activity` là mất
 *    độ chính xác; trắng ô là mất câu trả lời.
 */
export function mayNaoDo(runtime: string | undefined, activity: Activity): Runtime {
  if (runtime && RUNTIME.includes(runtime)) return runtime as Runtime;
  // `Activity` dùng `complete`, `Runtime` dùng `completed`. Ánh xạ ở ĐÂY, một lần, thay vì
  // để mỗi bề mặt tự đoán xem hai chữ đó có phải một không.
  return activity === 'complete' ? 'completed' : activity;
}

/**
 * Máy còn đang chạy hay không — sự thật DUY NHẤT được phép bật nhịp đập.
 *
 * # Vì sao cần một hàm riêng cho một phép so sánh một dòng
 *
 * Nhịp đập là chuyển động duy nhất mang thông tin trong cả giao diện
 * (DESIGN.md:130): nó phân biệt *đang chạy* với *đã dừng ở trạng thái này*. Bản
 * trước gắn nó vào TÔNG MÀU của công đoạn, và tông màu suy từ `stage` — một giá
 * trị ĐÃ GHI VÀO STORE. Chương chết dở giữa lúc soạn giữ `stage: drafting` mãi
 * mãi, nên nó đập mãi mãi.
 *
 * ĐO ĐƯỢC ở bản trước, cùng một khung hình: transport `○ đang nghỉ`, thanh trên
 * `2 tác phẩm · 0 đang chạy`, hàng chương 3 `▶ đang soạn bản thảo` mang
 * `dapnhip:running`. Ba chỗ nói ba điều, và cái đang động là cái nói sai. Đó là
 * hỏng đúng tiêu chí thành công của PRODUCT.md:27 — "mở studio sau 6 giờ đi vắng
 * và trong vòng 5 giây biết được dây chuyền khỏe hay bệnh": engine chết mà hàng
 * đang đập thì đọc ra là khỏe.
 *
 * Một hàm dùng chung thay vì `snapshot.book.activity === 'running'` rải rác vì
 * ba bề mặt cùng cần nó (bảng chương, inspector, và transport đã tự có). Ba bản
 * chép tay của cùng một điều kiện sẽ lệch nhau ngay lần đổi đầu tiên, và lúc đó
 * hai chỗ trên cùng một màn hình lại nói khác nhau — đúng lỗi vừa sửa.
 *
 * # Vì sao `book.activity` chứ không `transport.state`
 *
 * Hai trường này là CÙNG MỘT giá trị, không phải hai nguồn có thể lệch: server
 * tính cả hai bằng `activityOf(p, cps)` trên cùng một `progress` và cùng một
 * danh sách checkpoint (`internal/serve/snapshot.go:70` và `:361`). Nên bảng
 * chương không thể đập trong lúc thanh transport ghi "đang nghỉ".
 * Chọn `book.activity` vì `Book` luôn có trong snapshot, còn `Transport` là một
 * bề mặt trình bày — nếu sau này nó thành optional thì chỗ này không phải đổi.
 *
 * Lưu ý về ngữ nghĩa của "running": `activityOf` trả `idle` khi checkpoint mới
 * nhất đã cũ hơn `activityIdleAfter`. Nghĩa là đây là "vừa có dấu hiệu sống",
 * không phải "process còn tồn tại" — store không biết chuyện đó. Đó là sự thật
 * mạnh nhất có được, và nó đúng là sự thật mà thanh transport đang dùng.
 */
export function mayDangChay(snapshot: Snapshot | undefined): boolean {
  if (!snapshot) return false;
  // `runtime` THẮNG khi có, và đó là một lỗi ĐO ĐƯỢC chứ không phải sở thích kiến trúc.
  //
  // Bấm "Cho đi tiếp 1 chương" trên cuốn `mac-the-bien-di-vo`: engine nhận giấy phép và Writer
  // bắt đầu chương 5 (`runtime: "running"`, `agents: [writer]`), nhưng checkpoint mới chưa kịp
  // ghi nên `activity` vẫn `idle` — và khu văn sống ghi "Máy đang nghỉ" ngay TRÊN chữ nó đang
  // nhận về. Chiều ngược cũng vậy: engine dừng ở cửa nghiệm thu mà checkpoint vừa ghi xong thì
  // `activity` còn `running` vài phút, tức nhịp đập chạy trên một dây chuyền đã đứng.
  //
  // Lúc viết hàm này, `activity` là sự thật mạnh nhất có được — hợp đồng chưa mang `runtime`.
  // Kế hoạch 4/4 thêm nó, nên phần "store không biết chuyện đó" trong chú thích ở trên chỉ còn
  // đúng cho ca engine ĐÓNG.
  //
  // Phép suy ấy giờ nằm ở `mayNaoDo`, không còn viết lại ở đây: hàm này TỪNG là bản thứ hai
  // của cùng một luật, và bản thứ hai chính là thứ để thanh transport trôi mất một nửa.
  return mayNaoDo(snapshot.runtime, snapshot.book.activity) === 'running';
}
