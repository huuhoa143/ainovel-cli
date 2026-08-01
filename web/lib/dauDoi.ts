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
