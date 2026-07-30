'use client';

/**
 * Nạp một hồ sơ tác phẩm (dàn ý / nhân vật / luật thế giới) khi bề mặt của nó
 * thật sự được mở.
 *
 * Vì sao lười nạp thay vì gộp vào `useStudio`: ba endpoint này đọc toàn bộ tệp
 * dàn ý, danh sách nhân vật và sổ phục bút, và chúng KHÔNG đổi theo từng sự
 * kiện của dây chuyền. Gộp vào snapshot thì mỗi nhịp làm mới (1,5s khi engine
 * đang chạy) sẽ kéo lại cả ba — nghiền store để hiện lại đúng dữ liệu cũ.
 *
 * Cũng vì thế hook này KHÔNG tự nạp lại theo dòng sự kiện: dàn ý đổi ở ranh giới
 * cung, không đổi ở từng chương. Đổi tác phẩm thì nạp lại, đó là tất cả.
 */

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (!tacPham) {
      setDu(undefined);
      return;
    }
    let huy = false;
    setDu(undefined);
    setLoi(undefined);
    setDangTai(true);
    nap(tacPham)
      .then((d) => {
        if (!huy) setDu(d);
      })
      .catch((e: unknown) => {
        if (!huy) setLoi(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, [tacPham, nap]);

  return { du, dangTai, loi };
}
