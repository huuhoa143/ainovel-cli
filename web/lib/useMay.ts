'use client';

import { useCallback, useEffect, useState } from 'react';

import { LA_MOCK, LoiApi, layCauHinh } from './api';

/**
 * Máy này có ghi được không, và có cần cài lần đầu không.
 *
 * # Vì sao hỏi `/api/config` chứ không hỏi một cờ trong snapshot
 *
 * Đường ghi bị tắt ở tầng ROUTE khi địa chỉ lắng nghe không phải loopback: cả nhóm
 * không được mắc vào mux, nên nó trả 404. Đó là thiết kế có chủ ý (route không tồn tại
 * thì không có gì để dò), và hệ quả là giao diện phát hiện khả năng ghi bằng cách THỬ,
 * không bằng cách đọc một trường.
 *
 * Cùng lối với `hoiTham` trong api.ts, và cùng lý lẽ: 404 nói về bản engine đang chạy,
 * không nói về dữ liệu.
 *
 * # Vì sao lỗi khác 404 KHÔNG bị coi là không ghi được
 *
 * Mạng đứt hay server 500 không kết luận gì về việc engine có đường ghi. Coi chúng là
 * "chỉ đọc" sẽ ẩn mọi nút ghi vì một lần đọc hỏng, và người dùng không có cách nào biết
 * vì sao studio bỗng mất một nửa tính năng.
 */
export interface TinhTrangMay {
  /** undefined = chưa biết (đang hỏi). Tránh nhấp nháy nút ở lần render đầu. */
  choGhi: boolean | undefined;
  /** true = chưa có tệp cấu hình nào; studio không làm được gì tới khi có khóa. */
  canCaiDat: boolean;
  daHoi: boolean;
  /**
   * Hỏi lại `/api/config`. Gọi sau khi người dùng LƯU một thay đổi cấu hình.
   *
   * # Vì sao bắt buộc phải có
   *
   * `page.tsx` chặn TOÀN BỘ studio sau `canCaiDat`. Không có đường hỏi lại thì người dùng
   * mới nhập khóa API xong vẫn kẹt ở màn "Cài đặt lần đầu" — và không gì trên màn hình nói
   * cho họ biết phải tải lại trang.
   *
   * ĐO ĐƯỢC trên một máy sạch (HOME rỗng): lưu nhà cung cấp qua đúng API mà biểu mẫu dùng,
   * server trả `saved: true` và `/api/config` đổi sang `needs_setup: false`, mà trang vẫn là
   * "Cài đặt lần đầu" sau 5 giây. F5 mới mở ra.
   *
   * `hoiLai` KHÔNG đặt `daHoi` về false: làm thế thì bề mặt nháy qua trạng thái "đang hỏi"
   * mỗi lần lưu, tức tự chớp dưới tay người đang dùng. Câu trả lời cũ còn dùng được cho tới
   * khi có câu mới.
   */
  hoiLai: () => void;
}

export function useMay(): TinhTrangMay {
  const [tt, datTt] = useState({
    choGhi: undefined as boolean | undefined,
    canCaiDat: false,
    daHoi: false,
  });
  /** Bơm để chạy lại phép hỏi. Một con số, vì nội dung câu hỏi không đổi. */
  const [lanHoi, datLanHoi] = useState(0);
  const hoiLai = useCallback(() => datLanHoi((n) => n + 1), []);

  useEffect(() => {
    if (LA_MOCK) {
      datTt({ choGhi: true, canCaiDat: false, daHoi: true });
      return;
    }
    let huy = false;
    layCauHinh()
      .then((d) => {
        if (!huy) datTt({ choGhi: true, canCaiDat: d.needs_setup, daHoi: true });
      })
      .catch((e: unknown) => {
        if (huy) return;
        const khongCo = e instanceof LoiApi && e.status === 404;
        datTt({ choGhi: !khongCo, canCaiDat: false, daHoi: true });
      });
    return () => {
      huy = true;
    };
  }, [lanHoi]);

  return { ...tt, hoiLai };
}
