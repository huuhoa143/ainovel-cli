/**
 * DẤU HIỆU của ainovel studio — nguồn hình học DUY NHẤT cho cả logo lẫn favicon.
 *
 * # Vì sao dấu hiệu là ba lane, không phải một chữ cái
 *
 * Hình đặc trưng nhất của sản phẩm này đã có sẵn trên buồng lái: trục sản xuất ba tầng
 * Tập → Cung → Chương, ba dải ngang cùng một trục, độ rộng tỉ lệ với phạm vi thật. Nó cũng
 * đúng là ẩn dụ mà DESIGN.md chốt (bàn dựng phim / DAW: lane, transport, inspector). Một chữ
 * "a" cách điệu thì thương hiệu nào cũng dùng được; ba lane thì chỉ sản phẩm này dùng được.
 *
 * Ba lane mang ba TRẠNG THÁI của bảng ngữ nghĩa, không phải ba sắc độ trang trí:
 *
 *   teal   — đã nghiệm thu   (dài nhất: phần đã xong của tập)
 *   gold   — đang chạy       (màu tín hiệu duy nhất, nằm giữa nên bắt mắt nhất)
 *   ink-3  — chưa tới        (ngắn nhất, tông trung tính)
 *
 * Độ rộng GIẢM DẦN vì Tập ⊃ Cung ⊃ Chương. Ba dải bằng nhau sẽ đọc thành nút hamburger;
 * bậc thang giảm dần cộng ba tông khác nhau thì không.
 *
 * # Vì sao hằng số nằm ở đây thay vì viết thẳng vào SVG
 *
 * Dấu hiệu tồn tại ở HAI nơi không thể dùng chung mã: `components/DauHieu.tsx` (SVG nội
 * tuyến, đọc được biến CSS) và `app/icon.svg` (tệp tĩnh, trình duyệt tải như một ảnh riêng
 * nên KHÔNG thấy `:root`, buộc phải viết hex). Hai bản của một hình thì có ngày lệch — và
 * bản trước đã lệch thật: `icon.svg` ghi `#221d17 / #4f9d8b / #e0a53a` kèm chú thích khẳng
 * định đó là token đã chuyển sang sRGB, trong khi token thật cho `#0e0c09 / #71c1ad /
 * #eab656`. Không ai thấy vì không có gì đối chiếu hai bên.
 *
 * Nên hình học và màu nằm ở đây, và `lib/dauHieu.test.ts` ĐỌC `app/icon.svg` trên đĩa rồi
 * đối chiếu từng con số. Lệch là đỏ.
 */

/** Một lane của dấu hiệu. Toạ độ trong hệ viewBox 32×32. */
export interface LaneDau {
  /** Mã token màu, để bản nội tuyến dựng `var(--…)`. */
  token: 'teal' | 'gold' | 'ink-3';
  y: number;
  w: number;
}

export const DAU_VIEWBOX = 32;
export const DAU_X = 6;
export const DAU_CAO = 4;
export const DAU_BO_GOC = 1.5;
/** Bán kính của tấm nền favicon. Bản nội tuyến không có nền — xem `DauHieu.tsx`. */
export const DAU_NEN_BO_GOC = 6;

/**
 * Ba lane, từ trên xuống. Bước 7px (`y` 7 → 14 → 21) cho khoảng hở 3px giữa hai dải cao 4px:
 * ở 16px — cỡ favicon thật trên tab — dải còn 2px và khe còn 1,5px, tức vẫn tách được.
 * Bước 6px (khe 2px) làm ba dải dính thành một khối xám ở cỡ đó.
 */
export const DAU_LANE: readonly LaneDau[] = [
  { token: 'teal', y: 7, w: 20 },
  { token: 'gold', y: 14, w: 14 },
  { token: 'ink-3', y: 21, w: 9 },
] as const;

/**
 * Token → sRGB, cho bản KHÔNG đọc được biến CSS (`app/icon.svg`).
 *
 * Giá trị lấy từ chính trình duyệt: đặt `color: var(--token)` lên một phần tử, đọc màu đã
 * tính, rồi tô lên canvas 1×1 và đọc pixel. Đó là con số mà người dùng thật sự nhìn thấy —
 * khác hẳn việc tự chuyển OKLCH bằng tay, vốn là cách bản trước đã sai.
 */
export const DAU_MAU: Record<LaneDau['token'] | 'nen', string> = {
  nen: '#0e0c09', // --bg
  teal: '#71c1ad', // --teal
  gold: '#eab656', // --gold
  'ink-3': '#8b8780', // --ink-3
};
