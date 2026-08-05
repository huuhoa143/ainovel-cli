'use client';

/**
 * Cỡ do NGƯỜI DÙNG kéo cho bàn chia ô của buồng lái.
 *
 * # Vì sao lưu, và vì sao lưu ở localStorage chứ không ở URL
 *
 * Một bộ chia kéo được mà quên cỡ sau mỗi lần tải lại là một bộ chia không dùng được: người
 * vận hành kéo lại từ đầu ở mỗi lần mở studio, và đó đúng lớp phiền toái "phải làm lại tay"
 * mà cả cụm F5 vừa rồi tồn tại để xoá.
 *
 * KHÔNG vào URL, và đó là một ranh giới có nghĩa chứ không phải chuyện tiện: `?tp=`, `?ch=`,
 * `?khu=` là VỊ TRÍ ĐANG XEM — chia sẻ đường dẫn cho người khác thì họ tới đúng chỗ đó. Cỡ
 * bàn là THÓI QUEN CỦA MỘT NGƯỜI trên một màn hình; nhét nó vào URL là bắt người nhận link
 * nhận luôn bố cục của máy người gửi.
 *
 * Cũng KHÔNG theo tác phẩm: bàn có bốn ô như nhau ở mọi cuốn, nên một cỡ cho mỗi cuốn là
 * bắt người dùng kéo lại ở mỗi lần đổi cuốn để được đúng cái họ vừa kéo.
 *
 * # Đơn vị: phần trăm và fr, KHÔNG phải pixel
 *
 * Cột phải lưu bằng `%` và hàng trên lưu bằng `fr` để cỡ đã kéo còn đúng khi khung đổi —
 * mở/đóng cột ngữ cảnh, đổi cỡ cửa sổ, hay cắm màn hình ngoài. Lưu pixel thì một cỡ kéo ở
 * màn 27" thành một khe vô nghĩa trên laptop, và người dùng phải kéo lại đúng cái họ vừa
 * lưu để tránh phải kéo lại.
 */

import { useCallback, useEffect, useState } from 'react';

const KHOA = 'ainovel.buonglai.ban';

/**
 * Sàn của cột phải, tính bằng pixel.
 *
 * 300px là phép đo chứ không phải số tròn: dưới ~300px thì mỗi `summary` của dòng sự kiện
 * xuống ba dòng ("check_consiste / ncy(chương / 49)"), tức cột hẹp đi thì khối chữ CAO LÊN và
 * ô hiển thị được ÍT tin hơn. Cùng con số đã chặn `clamp()` của bố cục mặc định.
 */
export const SAN_COT_PX = 300;

/**
 * Trần của cột phải, theo tỉ lệ bề rộng bàn.
 *
 * Cột trái mang văn xuôi và bảng sáu cột, nên nó phải giữ được phần lớn hơn. 0,62 để cột
 * trái không bao giờ xuống dưới 38% — dưới mức đó bảng chương mất hai cột cuối, đúng ca đã
 * loại phương án ba cột.
 */
export const TRAN_COT_TI = 0.62;

/**
 * Sàn của MỖI hàng, tính bằng pixel. 88px = đầu ô 27px cộng ba dòng chữ — cùng con số làm
 * sàn cho `min-height` của cả bàn, chia đôi.
 */
export const SAN_HANG_PX = 88;

/**
 * Sàn của trục sản xuất, tính bằng pixel. Cùng con số với `min-height` của nó trong CSS:
 * 76px là một lane rưỡi — đủ để còn thấy mình đang ở tập nào và còn cuộn tới hai lane kia.
 */
export const SAN_TRUC_PX = 76;

/**
 * Sàn của cả bàn, tính bằng pixel — bản TS của `min-height` mà `.blsan` khai trong CSS.
 *
 * Hai bản của một con số là một chỗ để lệch, và ở đây nó không tránh được: CSS cần nó để bàn
 * không bị bóp, còn thanh chia của trục cần nó để biết mình được kéo tới đâu. `keoBan.test.ts`
 * canh quan hệ ấy bằng cách đọc `globals.css` trên đĩa, nên hai bên lệch là bộ kiểm đỏ.
 */
export const SAN_BAN_PX = 176;

export interface CoBan {
  /** Bề rộng cột phải, `%`. `undefined` = chưa kéo bao giờ, dùng mặc định của CSS. */
  cot?: number;
  /** Hệ số `fr` của hàng trên; hàng dưới luôn là `1fr`. `undefined` = chưa kéo. */
  hang?: number;
  /**
   * Chiều cao trục sản xuất, `px`.
   *
   * PIXEL chứ không tỉ lệ, và đây là chỗ trục khác hẳn hai ranh giới kia. Bàn chia một
   * khoảng trống theo tỉ lệ — hai ô cạnh nhau, ai rộng hơn là một lựa chọn. Trục thì có
   * CHIỀU CAO ĐÚNG của nó: ba lane cộng thước cộng chú giải là một con số cụ thể, và điều
   * người dùng kéo ở đây là "cho tôi thấy hết ba lane" hay "tôi không cần trục, trả chỗ cho
   * bàn". Một tỉ lệ không diễn đạt được câu đó; nó chỉ diễn đạt được "khoảng bao nhiêu phần".
   */
  truc?: number;
}

const RONG: CoBan = {};

function doc(): CoBan {
  if (typeof window === 'undefined') return RONG;
  try {
    const tho = window.localStorage.getItem(KHOA);
    if (!tho) return RONG;
    const v = JSON.parse(tho) as CoBan;
    // Chỉ nhận số HỮU HẠN. Một `null`, `NaN` hay chuỗi lọt vào đây sẽ thành
    // `grid-template-columns: NaN%` — cả bàn sập về một cột và không có gì nói vì sao.
    return {
      cot: Number.isFinite(v?.cot) ? v.cot : undefined,
      hang: Number.isFinite(v?.hang) ? v.hang : undefined,
      truc: Number.isFinite(v?.truc) ? v.truc : undefined,
    };
  } catch {
    // Quota, chế độ riêng tư, hay JSON hỏng. Cỡ bàn không đáng để một bề mặt không mở được.
    return RONG;
  }
}

function ghi(co: CoBan) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KHOA, JSON.stringify(co));
  } catch {
    /* mất cỡ đã kéo còn hơn mất bề mặt */
  }
}

/**
 * Cỡ bàn hiện tại, cộng hai đường ghi.
 *
 * Đọc localStorage trong `useEffect` chứ KHÔNG trong `useState(() => doc())`: `next export`
 * dựng sẵn HTML trên máy chủ, nơi không có `localStorage`. Đọc lúc dựng state làm lần render
 * đầu của máy khách khác lần dựng của máy chủ, và React 19 sẽ vứt cả cây rồi dựng lại. Một
 * nhịp bàn nhảy về mặc định rồi mới về cỡ đã lưu.
 */
export function useCoBan() {
  const [co, datCoState] = useState<CoBan>(RONG);

  useEffect(() => {
    const d = doc();
    if (d.cot !== undefined || d.hang !== undefined || d.truc !== undefined) datCoState(d);
  }, []);

  const datCo = useCallback((moi: CoBan) => {
    datCoState((cu) => {
      const gop = { ...cu, ...moi };
      ghi(gop);
      return gop;
    });
  }, []);

  /** Trả một trục về mặc định. Đây là đường THOÁT của bộ chia — xem `KeoBan.tsx`. */
  const datLai = useCallback((truc: keyof CoBan) => {
    datCoState((cu) => {
      const gop = { ...cu, [truc]: undefined };
      ghi(gop);
      return gop;
    });
  }, []);

  return { co, datCo, datLai };
}

/** Kẹp bề rộng cột phải về khoảng đọc được, rồi đổi sang `%` của bàn. */
export function kepCot(pxPhai: number, rongBan: number): number {
  if (!(rongBan > 0)) return 50;
  const tran = rongBan * TRAN_COT_TI;
  const kep = Math.min(Math.max(pxPhai, SAN_COT_PX), Math.max(tran, SAN_COT_PX));
  return Math.round((kep / rongBan) * 1000) / 10;
}

/**
 * Kẹp chiều cao trục sản xuất.
 *
 * `tran` do người gọi ĐO chứ không phải một hằng, vì nó là hai ràng buộc khác nhau cùng lúc:
 * chỗ còn lại sau khi bàn giữ đủ sàn của nó, VÀ chiều cao nội dung thật của trục. Kéo quá
 * chiều cao nội dung chỉ đẻ ra khoảng trắng — một khe rỗng giữa hai vùng dày đặc, đúng thứ
 * mà bàn chia ô vừa dọn đi.
 *
 * `Math.max(tran, SAN_TRUC_PX)` ở mẫu số: khi khung quá thấp thì trần tụt xuống DƯỚI sàn, và
 * một phép kẹp viết thẳng sẽ trả về trần — tức nhỏ hơn sàn. Cùng cái bẫy đã có bài kiểm ở
 * `kepCot`.
 */
export function kepTruc(px: number, tran: number): number {
  if (!Number.isFinite(px)) return SAN_TRUC_PX;
  return Math.round(Math.min(Math.max(px, SAN_TRUC_PX), Math.max(tran, SAN_TRUC_PX)));
}

/**
 * Kẹp chiều cao hàng trên rồi đổi sang hệ số `fr`.
 *
 * `fr` chứ không `%`: hai hàng chia nhau chiều cao CÒN LẠI của bàn, và bàn tự co giãn theo
 * `.blgiua`. Với `%` thì tổng hai hàng không bao giờ khớp chiều cao thật, và phần lệch rơi
 * vào hàng cuối — hàng bảng chương — dưới dạng một khe trống hoặc một phần bị cắt.
 */
export function kepHang(pxTren: number, caoBan: number): number {
  const san = SAN_HANG_PX;
  if (!(caoBan > san * 2)) return 1;
  const kep = Math.min(Math.max(pxTren, san), caoBan - san);
  const duoi = caoBan - kep;
  return Math.round((kep / duoi) * 1000) / 1000;
}
