'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Dấu chỉ TRƯỢT giữa các vị trí trong một tập hữu hạn (tab, bộ chọn mức xem, khu ở rail).
 *
 * # Chuyển động này mang thông tin gì
 *
 * Quan hệ KHÔNG GIAN — bạn vừa đi từ đâu tới đâu. Một cú nhảy tức thời xoá mất chính điều đó:
 * sau khi nhảy, không còn gì nói bạn vừa ở tab nào.
 *
 * # Vì sao đo vị trí THẬT chứ không tính theo chỉ số
 *
 * Bề rộng các nút khác nhau — "Tập" ngắn hơn "Chương", và nhãn tiếng Việt dài không đều
 * (DESIGN.md: nhãn tiếng Việt dài hơn tiếng Anh 20–30%). Tính `chỉ số × bề rộng` sẽ lệch ở
 * mọi bộ chọn có nhãn không bằng nhau, tức gần như mọi bộ chọn của bề mặt này.
 *
 * # NÂNG CẤP TIỆM TIẾN, và đây là điều kiện để nó được phép tồn tại
 *
 * `aria-selected` / `aria-pressed` VẪN giữ nền và viền như trước. Lớp `truot` chỉ được thêm
 * sau khi hook đã đo được, nên nếu JS chết hoặc chưa kịp chạy thì bề mặt đọc được y như cũ —
 * không có trạng thái nào biến mất. Đây là họ duy nhất trong mười họ cần JS, nên nó phải là
 * họ chịu được việc JS không có.
 *
 * # Đo lại khi nào
 *
 * Ba lúc, và thiếu lúc nào cũng để lại dấu chỉ sai chỗ:
 *   1. khi phần tử được chọn đổi — hiển nhiên;
 *   2. khi khung đổi bề rộng (`ResizeObserver`) — đổi khổ màn hình, mở/đóng inspector;
 *   3. khi font vừa tải xong (`document.fonts.ready`) — trước đó chữ đo bằng font dự phòng và
 *      bề rộng nút lệch. Đo được ở preview: thiếu bước này thì dấu chỉ sai vài pixel ở lần
 *      render đầu rồi không bao giờ tự sửa.
 */
export function useTruot<T extends HTMLElement>(
  chonSel: string,
  doc: 'ngang' | 'doc',
  phuThuoc: unknown,
): React.RefObject<T | null> {
  const hop = useRef<T>(null);

  const ve = useCallback(() => {
    const h = hop.current;
    if (!h) return;
    const a = h.querySelector<HTMLElement>(chonSel);
    if (!a) return;
    if (doc === 'ngang') {
      h.style.setProperty('--x', `${a.offsetLeft}px`);
      h.style.setProperty('--w', `${a.offsetWidth}px`);
    } else {
      h.style.setProperty('--y', `${a.offsetTop}px`);
      h.style.setProperty('--h', `${a.offsetHeight}px`);
    }
    // Chỉ bật lớp SAU khi đã đo: trước đó nền/viền tĩnh của `aria-*` là thứ đang nói đúng.
    h.classList.add('truot');
  }, [chonSel, doc]);

  useEffect(ve, [ve, phuThuoc]);

  useEffect(() => {
    const h = hop.current;
    if (!h) return;
    const qs = new ResizeObserver(ve);
    qs.observe(h);
    let huy = false;
    void document.fonts?.ready.then(() => {
      if (!huy) ve();
    });
    return () => {
      huy = true;
      qs.disconnect();
    };
  }, [ve]);

  return hop;
}
