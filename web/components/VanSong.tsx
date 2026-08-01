'use client';

import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { BoDemVan } from '@/lib/vanSong';

/**
 * Khu VĂN SỐNG — chữ model đang sinh ra.
 *
 * # Vì sao chữ UI/mono chứ không phải serif
 *
 * ĐO ĐƯỢC trên `scripts/sample.gif` (255 khung): khu này KHÔNG phải văn truyện. Nó là đối số
 * JSON của lời gọi tool, danh mục khế ước tự đối chiếu có ✓, bảng kiểm chất lượng, và báo cáo
 * chương theo mục. Văn truyện đọc ở bề mặt Bản thảo — đó là chỗ DUY NHẤT nó xuất hiện, và ở
 * đó nó mới là serif khổ 70ch.
 *
 * Bản preview đầu tiên vẽ khu này thành khổ serif đang chảy văn. Sai, và sai theo kiểu tốn
 * kém: nó làm cả bố cục cột giữa được cân theo một thứ không tồn tại.
 *
 * # Vì sao vạch ngăn thay vì xóa
 *
 * TUI XÓA sạch khu này ở mỗi lượt vì terminal không cuộn lại được. Trình duyệt giỏi đúng chỗ
 * đó, nên vứt đi phần vừa đọc là bỏ phí. Trần giữ 3 lượt nằm ở `lib/vanSong.ts` cùng lý do.
 *
 * # Tên vùng đứng yên, tiêu đề thì đổi
 *
 * `aria-label` của section KHÔNG phải câu trạng thái, dù tiêu đề nhìn thấy được thì là. Lý do
 * đã trả giá một lần rồi và ghi ở `CHU.vttVung`: tên vùng là thứ trình đọc màn hình điều
 * hướng TỚI, nên đặt nó bằng câu trạng thái thì cây trợ năng đọc tên vùng rồi đọc lại y
 * nguyên câu ấy ở nội dung — và ở đây nó còn thành SAI hẳn khi máy chuyển sang nghỉ.
 */
export function VanSong({ boDem, dangChay }: { boDem: BoDemVan; dangChay: boolean }) {
  return (
    <section className="vansong" aria-label={CHU.vanSongVung}>
      <div className="vshead">
        <h2>{dangChay ? CHU.mayDangNoi : CHU.mayNghi}</h2>
      </div>
      <div className="vsthan">
        {boDem.luot.length === 0 ? (
          <p className="vstrong">{dangChay ? GIAI_THICH.vanSongTrong : GIAI_THICH.vanSongNghi}</p>
        ) : (
          boDem.luot.map((l, i) => (
            <div className="luot" key={l.id}>
              {/* Lượt ĐẦU trong bộ đệm không có vạch kể cả khi nó mang nhãn: vạch là thứ
                  NGĂN GIỮA hai lượt. Vẽ một vạch trên cùng là khẳng định có một lượt phía
                  trên nó — mà lượt đó đã bị trần cắt mất, hoặc chưa từng có. */}
              {i > 0 && l.nhan ? (
                <div className="vach" role="separator">
                  <span>{l.nhan}</span>
                </div>
              ) : null}
              <pre className="chu">{l.chu}</pre>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
