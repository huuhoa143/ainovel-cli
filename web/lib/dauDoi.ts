'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dấu "giá trị này VỪA ĐỔI" — nguyên thủy dùng chung cho bốn họ chuyển động.
 *
 * # Nó giải bài toán gì
 *
 * Bốn họ cần biết một điều mà React không tự cho: con số đang render có KHÁC lần render trước
 * không. Snapshot được nạp lại mỗi 1,5s trong lúc engine chạy, và phần lớn lần nạp không đổi
 * con số nào — nên "vừa render" và "vừa đổi" là hai chuyện hoàn toàn khác.
 *
 * # Vì sao trả về một SỐ chứ không phải boolean
 *
 * Chuyển động là animation CSS một-lần. Một `boolean` bật rồi tắt không làm animation chạy
 * lại: CSS chỉ chạy keyframes khi phần tử được dựng, hoặc khi animation-name đổi. Con số này
 * dùng làm `key`, nên mỗi lần đổi là React dựng lại phần tử đó và animation chạy lại từ đầu.
 * Hai lần đổi liên tiếp mà cùng một dấu thì lần thứ hai không có chuyển động nào.
 *
 * # `0` nghĩa là CHƯA ĐỔI LẦN NÀO, và nó là ca quan trọng nhất
 *
 * Nếu lần render đầu cũng tính là đổi thì mở trang là cả bề mặt nhấp một lượt — hàng chục ô
 * cùng lúc — và người dùng học ngay rằng cái nhấp đó không có nghĩa gì. Một chuyển động mang
 * thông tin chỉ mang được thông tin khi nó KHÔNG chạy lúc không có gì xảy ra.
 *
 * # Vì sao `Object.is` chứ không `!==`
 *
 * `NaN !== NaN` là true, nên một bộ so sánh dùng `!==` sẽ thấy NaN đổi ở MỌI lần render và
 * nhấp vô hạn. `chapters_per_hour` là một phép chia cho thời lượng, nên NaN là ca đến được.
 */
export function useDauDoi<T>(giaTri: T): number {
  const truoc = useRef<T>(giaTri);
  const [dau, datDau] = useState(0);

  useEffect(() => {
    if (Object.is(truoc.current, giaTri)) return;
    truoc.current = giaTri;
    datDau((n) => n + 1);
  }, [giaTri]);

  return dau;
}

/**
 * Cửa sổ GIỮ mặc định của `useVuaCoTin`, tính bằng ms.
 *
 * 1.400ms là một vòng viền chạy (1,2s) cộng một khoảng thừa nhỏ, nên một ô nhận đúng MỘT tin
 * rời rạc vẫn chạy trọn một vòng thay vì tắt giữa cạnh — cùng lý lẽ mà `GIU_MS` của
 * `chotChuong.ts` đã ghi cho họ 09. Đổi thời lượng `vienChay` trong `globals.css` thì phải
 * đổi số này theo.
 */
export const GIU_TIN_MS = 1400;

/**
 * "Ô này VỪA có tin, và còn đang có" — cờ bật/tắt cho viền chạy của bàn buồng lái.
 *
 * # Vì sao KHÔNG dùng `useDauDoi` cho việc này
 *
 * `useDauDoi` trả một bộ đếm để làm `key`, tức mỗi lần đổi là React DỰNG LẠI phần tử và
 * animation chạy lại từ đầu. Đúng cho một cú nhấp một-lần trên một con số đổi vài giây một
 * lần. Sai hoàn toàn ở đây, và sai theo hai đường cùng lúc:
 *
 *   1. Khu văn sống nhận delta với nhịp trung vị **2ms** (phép đo ở `useStudio`). Một bộ đếm
 *      bump theo từng delta là một `setState` nữa cho mỗi mẩu chữ — nhân đôi số lần render
 *      của bề mặt đắt nhất màn hình.
 *   2. Dựng lại phần tử ở mỗi delta làm animation khởi động lại 500 lần một giây, tức viền
 *      đứng im ở khung hình đầu. Chuyển động chết đúng lúc nó cần nói "chỗ này đang sống".
 *
 * Nên cái cần ở đây là một CỬA SỔ, không phải một xung: bật khi có tin, và tự tắt sau
 * `giuMs` kể từ tin CUỐI CÙNG. Bộ hẹn được đặt lại bằng ref nên một tràng delta chỉ tốn
 * đúng hai lần render (bật, rồi tắt) chứ không phải hai lần cho mỗi mẩu.
 *
 * Hệ quả đọc được trên màn hình, và nó đúng là thứ cần nói: ô văn sống chạy viền LIÊN TỤC
 * suốt lúc máy đang viết, còn ô dòng sự kiện chạy một vòng rồi tắt cho mỗi sự kiện rời rạc.
 * Hai nhịp khác nhau vì hai loại dữ liệu khác nhau, không phải vì hai luật khác nhau.
 *
 * # `false` ở lần render đầu, và đó là ca quan trọng nhất
 *
 * Cùng luật với `useDauDoi`: `truoc` khởi tạo BẰNG giá trị đầu, nên mở trang không làm bốn ô
 * cùng chạy viền một lượt. Một chuyển động mang thông tin chỉ mang được thông tin khi nó
 * KHÔNG chạy lúc không có gì xảy ra.
 */
export function useVuaCoTin<T>(giaTri: T, giuMs: number = GIU_TIN_MS): boolean {
  const truoc = useRef<T>(giaTri);
  const henRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [song, datSong] = useState(false);

  useEffect(() => {
    if (Object.is(truoc.current, giaTri)) return;
    truoc.current = giaTri;
    // `datSong(true)` khi đã true là một no-op của React (bail out), nên tràng delta không
    // đẻ thêm lần render nào. Chỉ bộ hẹn được đặt lại, và nó là ref.
    datSong(true);
    if (henRef.current) clearTimeout(henRef.current);
    henRef.current = setTimeout(() => datSong(false), giuMs);
  }, [giaTri, giuMs]);

  // Dọn bộ hẹn lúc gỡ: không có nó thì một `setState` bay tới sau khi component đã đi.
  useEffect(
    () => () => {
      if (henRef.current) clearTimeout(henRef.current);
    },
    [],
  );

  return song;
}

/**
 * Dấu "thứ này VỪA XUẤT HIỆN" — chỉ tăng khi `co` đi từ false sang true.
 *
 * Khác `useDauDoi` ở đúng chỗ làm nên thông tin: `useDauDoi` nói "giá trị đổi", còn cái này
 * nói "từ KHÔNG CÓ sang CÓ". Với chip việc tồn ở rail, hai chuyện đó khác nhau về hệ quả —
 * `1 → 2` là có thêm một việc, còn `0 → 1` là từ "không có gì cần bạn" sang "có việc cần
 * bạn". Cái thứ hai đáng một cử chỉ khác (tới, bằng scale) chứ không phải cùng một cú nhấp
 * mạnh hơn.
 *
 * Không tăng khi `co` tắt: biến mất không phải một sự kiện cần lấy mắt người dùng.
 */
export function useDauToi(co: boolean): number {
  const truoc = useRef(co);
  const [dau, datDau] = useState(0);

  useEffect(() => {
    const cu = truoc.current;
    truoc.current = co;
    if (!cu && co) datDau((n) => n + 1);
  }, [co]);

  return dau;
}
