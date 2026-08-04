'use client';

import { useCallback, useState } from 'react';

import { LoiApi, lietKeModel } from './api';

/**
 * Danh sách model hỏi thẳng nhà cung cấp, dùng chung cho cả một màn.
 *
 * # Vì sao là hook chung chứ không phải state trong từng ô
 *
 * Màn Model theo vai có bốn kênh, và cả bốn thường trỏ về cùng một nhà cung cấp. Mỗi ô tự
 * nạp là bốn lần gọi ra ngoài cho đúng một câu trả lời — chậm hơn, và với nhà cung cấp có
 * giới hạn tần suất thì ba lần sau lãnh 429 rồi hiện lỗi ở ba ô đang không sai gì.
 *
 * # Vì sao nhớ theo TỪNG nhà cung cấp
 *
 * Model của gateway này không nói gì về gateway kia. Một `string[]` phẳng sẽ đem danh sách
 * của `openrouter` ra gợi ý cho `anthropic`, tức gợi ý toàn tên chắc chắn sai.
 */
export function useModelNapVe() {
  const [theoNcc, datTheoNcc] = useState<Record<string, string[]>>({});
  const [dangNap, datDangNap] = useState<string | null>(null);
  const [loi, datLoi] = useState<string | null>(null);

  const nap = useCallback((provider: string) => {
    if (!provider) return;
    datDangNap(provider);
    datLoi(null);
    lietKeModel(provider)
      .then((r) => datTheoNcc((cu) => ({ ...cu, [provider]: r.models })))
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangNap(null));
  }, []);

  return {
    nap,
    dangNap,
    loi,
    /** Model đã nạp cho một nhà cung cấp. `[]` khi chưa hỏi — KHÔNG phải "không có model". */
    modelCua: useCallback((provider: string) => theoNcc[provider] ?? [], [theoNcc]),
    /** Đã hỏi được nhà cung cấp này chưa — điều kiện để dám nói "model không có thật". */
    daHoi: useCallback((provider: string) => theoNcc[provider] !== undefined, [theoNcc]),
  };
}

export type ModelNapVe = ReturnType<typeof useModelNapVe>;
