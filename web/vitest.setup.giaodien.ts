import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Dọn DOM sau mỗi bài kiểm của project `giaodien`.
 *
 * # Vì sao phải khai tay, trong khi Testing Library nói nó tự dọn
 *
 * `@testing-library/react` CÓ tự đăng ký `afterEach(cleanup)` — nhưng chỉ khi `afterEach` là
 * biến TOÀN CỤC, tức chỉ khi bộ chạy bật `globals: true`. Cấu hình ở đây cố ý không bật: mọi
 * tệp kiểm trong repo này `import { expect, test } from 'vitest'` tường minh. Hai lựa chọn
 * đó gặp nhau ở một chỗ im lặng: không có globals thì không có auto-cleanup, và không ai
 * được báo.
 *
 * ĐO ĐƯỢC (dựng hai bài cùng vẽ một `<p>dấu vết</p>` rồi đếm):
 * bài thứ hai thấy **2** phần tử. DOM của bài trước còn nguyên trong `document`.
 *
 * Hệ quả không phải là "test chạy chậm" mà là test NÓI DỐI theo cả hai chiều. Mọi truy vấn
 * qua `screen` chạy trên cả `document`:
 *   - `getByText` gặp hai bản của cùng một chữ và ĐỎ với câu "Found multiple elements" —
 *     một cái đỏ trỏ vào bài kiểm vô can;
 *   - tệ hơn: `getByRole('button', …)` XANH nhờ cái nút bài trước để lại, tức bài kiểm
 *     khẳng định một nút tồn tại trong khi lần render này không hề vẽ nó.
 *
 * Ca thứ hai là ca đắt: nó làm chính bộ kiểm của tự cuộn (nút "về cuối" hiện/biến) mất giá
 * trị mà vẫn xanh. Bắt được là nhờ nó tình cờ nổ ở ca thứ nhất trước.
 *
 * Đặt ở `setupFiles` chứ không lặp `afterEach(cleanup)` trong từng tệp: quên một tệp là im
 * lặng trở lại, và cái quên đó không có bộ canh nào bắt.
 */
afterEach(cleanup);

/**
 * `ResizeObserver` — jsdom không hiện thực, và `useTruot` dùng nó để đo lại dấu chỉ khi khung
 * đổi bề rộng.
 *
 * Vá ở ĐÂY chứ không ở từng tệp, và đây là một ĐẢO CHIỀU có lý do. Luật của repo là "vá tại
 * tệp kiểm nếu chỉ tệp đó chạm tới" — đúng cho `scrollIntoView` (chỉ bài nào dựng `Rail`) và
 * `EventSource` (chỉ bài nào dựng `useStudio`). Nhưng dấu trượt nằm trong `MucXem`,
 * `Inspector` và `Rail`, tức trong hầu hết cây component; đo được ngay khi lắp: thiếu bản vá
 * này thì `Inspector.test.tsx` và `BuongLai.test.tsx` đỏ cùng lúc với một `ReferenceError`
 * không nói gì về nguyên nhân.
 *
 * Tiêu chí phân biệt vẫn là tiêu chí cũ: vá chung khi thiếu nó làm MỌI bài kiểm nói dối hoặc
 * gãy vì lý do không liên quan. `ResizeObserver` đã bước qua ngưỡng đó.
 *
 * Bản vá KHÔNG gọi callback: jsdom không có bố cục để đổi, nên một bản vá "trung thực hơn"
 * cũng không đo được gì thêm. Vị trí thật là việc của phép kiểm trên trình duyệt.
 */
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
