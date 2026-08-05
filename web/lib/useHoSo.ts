'use client';

/**
 * Nạp một hồ sơ tác phẩm (dàn ý / nhân vật / luật thế giới / phục bút / văn
 * phong / chi phí / phiên chạy) khi bề mặt của nó thật sự được mở.
 *
 * Vì sao lười nạp thay vì gộp vào `useStudio`: mỗi endpoint đọc trọn một tệp hồ
 * sơ, và chúng KHÔNG đổi theo từng sự kiện của dây chuyền. Gộp vào snapshot thì
 * mỗi nhịp làm mới (1,5s khi engine đang chạy) sẽ kéo lại cả bộ — nghiền store
 * để hiện lại đúng dữ liệu cũ.
 *
 * # Vì sao GIỜ CÓ nhịp nạp lại (đảo điều khoản cũ)
 *
 * Bản trước ghi: *"hook này KHÔNG tự nạp lại theo dòng sự kiện: dàn ý đổi ở ranh
 * giới cung, không đổi ở từng chương. Đổi tác phẩm thì nạp lại, đó là tất cả."*
 *
 * Vế đầu vẫn đúng và vẫn được giữ — nhịp ở đây KHÔNG bám dòng sự kiện. Vế cuối
 * mới là chỗ sai, và cái giá của nó đo được: rail hiện số đếm của chính những hồ
 * sơ này (`Nhân vật 18`, `Phục bút 4`, `Luật thế giới 31`) và `useStudio` nạp
 * lại số đếm ấy MỖI 1,5 GIÂY trong lúc engine chạy (`napLaiHoSo` trong bộ ba
 * `napBaTo`). Nên rail và bề mặt đọc cùng một tệp qua hai đường có nhịp khác
 * nhau: rail nói "Phục bút 40" trong khi bề mặt Phục bút đang mở vẫn liệt kê 37
 * mục, và không có gì trên màn hình nói vì sao. Người dùng chỉ còn cách F5 —
 * đúng lớp lỗi mà nhịp nền của `useStudio` đã tồn tại để xoá bỏ.
 *
 * # Vì sao 20 giây, và vì sao còn nghe cả lúc quay lại tab
 *
 * 20s chứ không 1,5s: các tệp này đổi ở RANH GIỚI CUNG, tức hàng chục phút một
 * lần. Nhịp chỉ cần đủ nhanh để không ai kịp nghĩ tới F5, không cần đuổi kịp
 * engine. Và chỉ chạy khi tab đang hiện — làm mới một bề mặt không ai nhìn là
 * tiêu I/O đổi lấy không gì. Cùng cặp lý do, cùng cặp cơ chế (nhịp + quay lại
 * tab) mà `useStudio` đã ghi cho `NHIP_NEN_MS`: nhịp bắt thay đổi xảy ra TRONG
 * LÚC đang nhìn, `visibilitychange`/`focus` bắt thay đổi xảy ra lúc tab bị ẩn —
 * và khoảnh khắc quay lại tab đúng là khoảnh khắc người ta bấm F5.
 *
 * # Vì sao lần nạp lại KHÔNG xoá dữ liệu đang hiện
 *
 * Lần nạp ĐẦU đặt `du` về `undefined` để bề mặt vẽ trạng thái "đang đọc"; lần
 * nạp LẠI thì không. Xoá ở lần sau là để cả bề mặt nháy về "đang đọc…" mỗi 20
 * giây trong lúc người dùng đang đọc dở một mô tả nhân vật. Cùng lý do
 * `napLaiXuong` và `napLaiHoSo` của `useStudio` nuốt lỗi: đường ĐỌC LẠI không
 * được phép xoá một bề mặt đang đúng.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Nhịp nạp lại hồ sơ. Chậm hơn nhịp xưởng (8s) và chậm hơn nhiều nhịp snapshot
 * (1,5s) vì hồ sơ đổi ở ranh giới cung — xem chú thích đầu tệp.
 */
const NHIP_HO_SO_MS = 20_000;

export interface TaiVe<T> {
  du: T | undefined;
  dangTai: boolean;
  /** Câu lỗi của server. KHÔNG bị biến thành "chưa có dữ liệu" — hai chuyện khác nhau. */
  loi: string | undefined;
}

export function useHoSo<T>(
  tacPham: string | undefined,
  nap: (book: string) => Promise<T>,
): TaiVe<T> {
  const [du, setDu] = useState<T>();
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string>();

  /**
   * Cờ "đã có lần nạp nào cho cuốn này chưa".
   *
   * Ref chứ không state: nó chỉ điều khiển CÁCH nạp (có xoá dữ liệu cũ hay
   * không), không có mặt trong bất kỳ phép vẽ nào, nên để nó vào state là mời
   * một lượt render thừa ở mỗi nhịp 20 giây.
   */
  const daNapRef = useRef(false);

  const doc = useCallback(
    (id: string, lanDau: boolean) => {
      let huy = false;
      if (lanDau) {
        setDu(undefined);
        setLoi(undefined);
        setDangTai(true);
      }
      nap(id)
        .then((d) => {
          if (!huy) {
            setDu(d);
            // Lỗi cũ phải được XOÁ khi lần đọc sau thành công: một câu lỗi ở lại
            // bên trên dữ liệu đúng là một bề mặt tự mâu thuẫn.
            setLoi(undefined);
          }
        })
        .catch((e: unknown) => {
          // Chỉ lần ĐẦU được phép biến lỗi thành bề mặt lỗi. Một lần đọc lại
          // hỏng (mạng chớp, engine đang ghi tệp) không được xoá hồ sơ đang hiện
          // đúng — cùng luật mà `napLaiHoSo` của `useStudio` dùng khi nuốt lỗi.
          if (!huy && lanDau) setLoi(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (!huy && lanDau) setDangTai(false);
        });
      return () => {
        huy = true;
      };
    },
    [nap],
  );

  useEffect(() => {
    daNapRef.current = false;
    if (!tacPham) {
      setDu(undefined);
      return;
    }
    const thoi = doc(tacPham, true);
    daNapRef.current = true;
    return thoi;
  }, [tacPham, doc]);

  useEffect(() => {
    if (!tacPham || typeof document === 'undefined') return;

    const dangHien = () => document.visibilityState === 'visible';
    const napLai = () => {
      // `daNapRef` chặn một ca thật: tab được focus lại TRONG LÚC lần nạp đầu
      // còn đang bay. Không có nó thì hai lượt đọc chồng nhau và lượt về sau
      // thắng — mà lượt về sau không đặt `dangTai`, nên bề mặt kẹt ở "đang đọc".
      if (dangHien() && daNapRef.current) doc(tacPham, false);
    };

    const nhip = setInterval(napLai, NHIP_HO_SO_MS);
    document.addEventListener('visibilitychange', napLai);
    window.addEventListener('focus', napLai);
    return () => {
      clearInterval(nhip);
      document.removeEventListener('visibilitychange', napLai);
      window.removeEventListener('focus', napLai);
    };
  }, [tacPham, doc]);

  return { du, dangTai, loi };
}
