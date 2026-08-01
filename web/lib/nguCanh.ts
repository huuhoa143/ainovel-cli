/**
 * Thước ngữ cảnh có nguồn thật, nhưng là một nguồn hẹp — và chỗ này là ví dụ
 * rõ nhất về việc "không bịa" tốn công hơn bịa.
 *
 * Snapshot KHÔNG có trường ngữ cảnh: `Transport` chỉ mang state, last_step,
 * agent, model, chi phí, năng suất, thời gian chạy (internal/serve/model.go).
 * Tỉ lệ ngữ cảnh chỉ tồn tại trong CÂU MÔ TẢ của một sự kiện, và chỉ khi engine
 * đã kích hoạt nén — báo cáo mức dùng thông thường chỉ đi vào slog, không vào
 * runtime queue (internal/host/observer_events.go: nhánh `payload.Strategy ==
 * ""` chỉ gọi slog.Log).
 *
 * Nên thước này hiện ra khi và chỉ khi có sự kiện nén đi qua. Vẽ một cây thước
 * luôn có kim là bịa; vẽ "—" khi chưa biết là sự thật, và người vận hành biết
 * ngữ cảnh chưa tới ngưỡng đáng báo.
 */

import type { StreamEvent } from './types';

export interface NguCanh {
  /** Tỉ lệ 0..1 */
  ti: number;
  /** Token đang dùng / cửa sổ, khi câu mô tả có. */
  dung?: number;
  cua?: number;
  /** Câu gốc, để đặt vào `title` — người vận hành thấy được nguồn. */
  goc: string;
}

const CAP_TOKEN = /\((\d+)\s*\/\s*(\d+)\)/;
const TI_LE = /(\d+(?:[.,]\d+)?)\s*%/;

/**
 * Tách tỉ lệ ngữ cảnh từ câu mô tả của sự kiện nén.
 *
 * Chỉ nhận câu có CẢ tỉ lệ phần trăm VÀ cặp token dạng `(79000/128000)`. Ràng
 * buộc kép này để không nhặt bừa một con số phần trăm nào khác trong dòng sự
 * kiện (ví dụ "đã xong 62%"), vì nhặt sai còn tệ hơn không nhặt.
 */
export function docNguCanh(ev: StreamEvent): NguCanh | undefined {
  const s = ev.summary;
  if (!s) return undefined;

  const cap = s.match(CAP_TOKEN);
  if (!cap) return undefined;

  const pt = s.match(TI_LE);
  if (!pt) return undefined;

  const ti = Number.parseFloat(pt[1]!.replace(',', '.')) / 100;
  if (!Number.isFinite(ti) || ti < 0 || ti > 1) return undefined;

  const dung = Number.parseInt(cap[1]!, 10);
  const cua = Number.parseInt(cap[2]!, 10);

  return {
    ti,
    dung: Number.isFinite(dung) ? dung : undefined,
    cua: Number.isFinite(cua) ? cua : undefined,
    goc: s,
  };
}

/** Ngữ cảnh mới nhất đọc được trong dòng sự kiện (mảng mới nhất ở đầu). */
export function nguCanhMoiNhat(suKien: StreamEvent[]): NguCanh | undefined {
  for (const ev of suKien) {
    const nc = docNguCanh(ev);
    if (nc) return nc;
  }
  return undefined;
}
