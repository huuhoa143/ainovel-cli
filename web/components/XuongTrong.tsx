'use client';

import { CHU, GIAI_THICH } from '@/lib/nhan';

/**
 * Xưởng chưa có tác phẩm nào.
 *
 * Đây là trạng thái người vận hành gặp ĐẦU TIÊN, nên nó phải làm được ba việc:
 * nói rõ studio đã tìm ở đâu, nói rõ vì sao trống, và cho đúng một lệnh để
 * thoát khỏi trạng thái này.
 *
 * Giọng theo PRODUCT.md: điềm tĩnh, kỹ thuật, không chúc mừng và không xin lỗi.
 * Không có "Chào mừng!", không có "Rất tiếc", không có minh họa. Một cái máy
 * chưa có việc thì báo là chưa có việc.
 */
export function XuongTrong({ root }: { root: string | undefined }) {
  return (
    <main className="trangtrong">
      <h1>{GIAI_THICH.xuongTrongTieuDe}</h1>
      <p>{GIAI_THICH.xuongTrongThan}</p>
      {root ? (
        <dl className="goc">
          <dt>{GIAI_THICH.xuongTrongGoc}</dt>
          <dd>{root}</dd>
        </dl>
      ) : null}
      <code className="lenh">{GIAI_THICH.xuongTrongLenh}</code>
    </main>
  );
}

/**
 * Không đọc được store.
 *
 * Câu lỗi lấy từ server (`writeErr` trả `{"error": "..."}`) chứ không phải câu
 * chung của giao diện: server biết rõ hơn — thiếu meta/progress.json, tên tác
 * phẩm không hợp lệ, hay đường dẫn ra ngoài thư mục gốc.
 */
export function KhongTaiDuoc({ loi, onThuLai }: { loi: string; onThuLai: () => void }) {
  return (
    <main className="trangtrong">
      <h1>{GIAI_THICH.khongTaiDuoc}</h1>
      <p className="loi">{loi}</p>
      <p>
        Engine và studio là hai tiến trình rời nhau. Nếu engine chưa chạy hoặc thư mục gốc
        sai thì bề mặt này không có gì để đọc.
      </p>
      <button type="button" onClick={onThuLai}>
        Đọc lại store
      </button>
    </main>
  );
}

/** Khoảng chờ đầu tiên. Một dòng, không có khối xám nhấp nháy. */
export function DangTai() {
  return (
    <main className="trangtrong">
      <p>{CHU.dangTai}</p>
    </main>
  );
}
