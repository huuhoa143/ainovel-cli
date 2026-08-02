'use client';

import { useEffect, useRef, useState } from 'react';

import type { ChapterMark } from './types';

/** Tập rỗng dùng chung — tránh dựng `new Set()` mới ở mỗi lần render không có chốt. */
const RONG: ReadonlySet<number> = new Set();

/**
 * Giữ tập `vua` bao lâu trước khi dọn — 2.000ms, và con số này là một PHÉP ĐO chứ không
 * phải một số tròn cho đẹp.
 *
 * Hoạt ảnh họ 09 kết thúc ở **1.850ms**: `chotDay 0,42s` rồi `chotNhap` (`--a-lau × 1,1`
 * = 1,43s) khởi động sau 0,42s. Còn snapshot nạp lại mỗi **1.500ms** khi máy chạy.
 *
 * Nên bản đầu của hàm này — dọn tập ở lượt nạp kế — CẮT hoạt ảnh ở khoảng 80% đường: vạch
 * đổ đầy xong rồi tắt phụt giữa nhịp nhấp. Đúng cái nó tồn tại để đánh dấu thì lại là cái
 * người dùng không kịp thấy. Bộ đếm 2.000ms cho hoạt ảnh chạy hết rồi mới dọn, và nó độc
 * lập với nhịp nạp nên đổi nhịp nạp không âm thầm làm hỏng chuyển động.
 *
 * NẾU đổi `--a-lau` hoặc thời lượng họ 09 thì phải đổi số này theo — bài kiểm
 * `chotChuong.test.tsx` canh quan hệ ấy, không canh riêng con số.
 */
export const GIU_MS = 2000;

export interface DauChot {
  /**
   * Chỉ số các chương VỪA chuyển sang `done` ở lượt nạp này. Rỗng ở phần lớn lượt nạp.
   *
   * Lái họ 09 (chương chốt): mỗi vạch trong tập được thêm lớp `vuaChot`.
   */
  vua: ReadonlySet<number>;
  /**
   * Bộ đếm sự kiện chốt. `0` = chưa có lần nào kể từ lúc mở trang.
   *
   * Lái họ 10 (đồng thanh): ba bề mặt dùng nó làm `key` nên chúng dựng lại — tức nhấp —
   * đúng cùng một nhịp. Tăng MỘT cho mỗi lượt nạp có chốt, không tăng theo số chương: hai
   * chương chốt cùng lượt là một sự kiện nhìn từ ba góc, không phải hai sự kiện.
   */
  dau: number;
}

/**
 * "Chương nào VỪA chốt" — nguyên thủy của hai họ chuyển động cuối.
 *
 * # Câu khó không phải "chương nào đang done"
 *
 * Lane chương là một CỬA SỔ trượt trên cả truyện: bề mặt tự ghi ra điều đó
 * (`Chương 1–16 / 111 · 95 chương ngoài cửa sổ`). Nên `timeline.chapters` liên tục đổi
 * THÀNH PHẦN chứ không chỉ đổi trạng thái — trượt cửa sổ, đổi mức xem Tập/Cung/Chương, hay
 * chỉ là engine sang cung mới, đều làm hàng chục chương đã chốt từ hôm qua vừa xuất hiện
 * trong danh sách.
 *
 * Một bộ so sánh chỉ hỏi "state có phải done không" sẽ cho cả đám ấy nhấp cùng lúc. Đó là
 * pháo hoa, không phải tin — và người dùng học ngay rằng cái nhấp đó không có nghĩa gì, tức
 * mất luôn cả họ chuyển động quan trọng nhất của sản phẩm.
 *
 * Nên điều kiện là hai vế, và vế thứ hai mới là vế làm việc:
 *   1. bây giờ là `done`, VÀ
 *   2. lần trước ta ĐÃ THẤY chương này ở một trạng thái KHÁC `done`.
 *
 * Chưa từng thấy ≠ vừa đổi. Đó là lý do bộ nhớ dưới đây không bao giờ xoá mục nào: một
 * chương ra khỏi cửa sổ rồi quay lại vẫn là chương ta đã biết là `done`, nên nó im lặng.
 * Bộ nhớ lớn nhất bằng số chương của truyện — vài trăm mục, không đáng dọn.
 *
 * # Vì sao `done → rewrite → done` nhấp lần thứ hai
 *
 * Vì nó là một sự kiện thật: Arbiter trả chương về viết lại rồi nó được chốt lại, và người
 * vận hành đang chờ đúng lần chốt thứ hai đó. Bộ nhớ ghi trạng thái ĐANG THẤY chứ không ghi
 * một cờ "đã từng chốt", nên ca này tự đúng.
 */
export function useVuaChot(marks: readonly ChapterMark[]): DauChot {
  /** Trạng thái lần trước của MỌI chương từng thấy — kể cả chương đã rời cửa sổ. */
  const daThay = useRef<Map<number, string>>(new Map());
  const [kq, datKq] = useState<DauChot>({ vua: RONG, dau: 0 });

  useEffect(() => {
    const vua = new Set<number>();
    for (const m of marks) {
      const truoc = daThay.current.get(m.chapter);
      // `truoc === undefined` = chưa từng thấy → KHÔNG nhấp. Xem vế 2 ở chú thích trên.
      if (m.state === 'done' && truoc !== undefined && truoc !== 'done') {
        vua.add(m.chapter);
      }
      daThay.current.set(m.chapter, m.state);
    }

    // Lượt không có chốt KHÔNG dọn gì cả — việc dọn là của bộ đếm giờ dưới đây.
    // Dọn ở đây là cắt hoạt ảnh giữa chừng: xem `GIU_MS`.
    if (vua.size === 0) return;
    datKq((cu) => ({ vua, dau: cu.dau + 1 }));
  }, [marks]);

  // Dọn theo GIỜ, không theo nhịp nạp. Chạy lại mỗi lần `dau` tăng, nên hai lượt chốt liên
  // tiếp thì lượt sau đặt lại đồng hồ thay vì bị lượt trước dọn mất.
  useEffect(() => {
    if (kq.vua.size === 0) return;
    const h = setTimeout(() => datKq((cu) => ({ ...cu, vua: RONG })), GIU_MS);
    return () => clearTimeout(h);
  }, [kq.dau, kq.vua.size]);

  return kq;
}
