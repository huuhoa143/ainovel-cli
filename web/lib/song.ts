import type { Snapshot } from './types';

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
  return snapshot?.book.activity === 'running';
}
