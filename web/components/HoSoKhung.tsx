'use client';

import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { TaiVe } from '@/lib/useHoSo';

/**
 * Vỏ chung của ba bề mặt hồ sơ tác phẩm.
 *
 * Gộp vào một chỗ vì cả ba chịu đúng cùng một bộ trạng thái, và chính bộ trạng
 * thái đó là phần dễ nói dối nhất:
 *
 *   - đang tải        → nói là đang đọc store
 *   - lỗi             → hiện câu của server, KHÔNG hạ thành "chưa có dữ liệu"
 *   - mảng `null`     → engine chưa ghi tệp đó lần nào
 *   - mảng `[]`       → đã ghi mà rỗng
 *
 * Hai ca cuối là hai sự thật khác nhau. Gộp chúng lại thành một câu "chưa có gì"
 * là nói dối một trong hai, và người vận hành sẽ đọc câu đó rồi tin rằng nền tác
 * phẩm chưa dựng trong khi nó đã dựng và đang rỗng — hai kết luận dẫn tới hai
 * hành động khác nhau.
 */
export function HoSoKhung({
  tieuDe,
  motTa,
  children,
}: {
  tieuDe: string;
  motTa?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="canvas khuhoso">
      <div className="head">
        <h1>{tieuDe}</h1>
        {motTa ? <span className="sub">{motTa}</span> : null}
      </div>
      {children}
    </main>
  );
}

/**
 * Trạng thái tải/lỗi dùng chung. Trả về `null` khi dữ liệu đã sẵn sàng, để chỗ
 * gọi vẽ nội dung thật.
 *
 * Đây là một HÀM, không phải component, và điều đó là cố ý. Bản trước viết nó
 * thành `<TinhTrangHoSo tai={tai} />` rồi chỗ gọi dùng `tt ?? <nội dung>` — mà
 * một phần tử React thì luôn khác `null`, nên nhánh nội dung KHÔNG BAO GIỜ chạy:
 * ba bề mặt hồ sơ hiện đúng dòng tiêu đề (có số liệu thật, chứng tỏ đã tải xong)
 * rồi để trống toàn bộ thân trang. Lỗi chỉ thấy được bằng ảnh chụp — build sạch,
 * tsc sạch, không có cảnh báo nào.
 *
 * Gọi là hàm thì `tinhTrang(tai) ?? <nội dung>` so `null` thật với `null`.
 */
export function tinhTrangHoSo<T>(tai: TaiVe<T>): React.ReactNode | null {
  if (tai.loi) {
    return (
      <section className="sect">
        <p className="loiDoc">{tai.loi}</p>
      </section>
    );
  }
  if (tai.dangTai || !tai.du) {
    return (
      <section className="sect">
        <p className="trongSect">{CHU.dangTai}</p>
      </section>
    );
  }
  return null;
}

/**
 * Câu cho một mục rỗng, phân biệt `null` với `[]`.
 *
 * `muc` là danh từ ghép vào câu: "nhân vật nào", "luật thế giới nào".
 */
export function MucRong({
  mang,
  muc,
}: {
  mang: unknown[] | null | undefined;
  muc: string;
}) {
  if (mang === null || mang === undefined) {
    return <p className="trongSect">{GIAI_THICH.chuaDungNen(muc)}</p>;
  }
  return <p className="trongSect">{GIAI_THICH.dungNenMaRong(muc)}</p>;
}
