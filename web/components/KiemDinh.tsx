'use client';

import { CHU, GIAI_THICH, TRANG_THAI_CHUONG } from '@/lib/nhan';
import type { ChapterRow, Snapshot } from '@/lib/types';

import { BanDuyet } from './BanDuyet';

/**
 * Kiểm định: bản duyệt 7 chiều của Editor, ở bề rộng đọc được.
 *
 * # Vì sao có bề mặt này khi inspector đã có tab cùng tên
 *
 * Tab Kiểm định sống trong panel 292px và panel đó BIẾN MẤT dưới 1240px
 * (`dungInspector` + điểm ngắt của khung). Bản duyệt là câu trả lời cho câu hỏi
 * thứ hai trong PRODUCT.md — "chất lượng có tuột không, Editor bắt lỗi gì" — nên
 * để nó chỉ tồn tại ở màn hình rộng là bỏ mất một trong ba câu hỏi chính trên
 * máy hẹp. Ở đây dẫn chứng được đứng cùng dòng với đề xuất thay vì gói trong một
 * cột hẹp.
 *
 * # Vì sao không có bảng xếp hạng chất lượng toàn sách
 *
 * `selected.review` là bản duyệt của ĐÚNG chương đang chọn. Không có endpoint
 * nào trả danh sách kết luận duyệt cho cả sách, nên bề mặt này không thể sắp
 * chương theo điểm hay lọc theo kết luận. Danh sách bên trái hiện CÔNG ĐOẠN của
 * chương — một sự thật khác, và nó được gọi đúng tên trong tiêu đề cột.
 *
 * # Vì sao không tự gọi thêm mạng
 *
 * Chọn chương đi qua `onChonChuong`, tức đúng cơ chế mà bảng chương đã dùng:
 * useStudio nạp lại snapshot với `?chapter=n` và bản duyệt về trong cùng payload.
 * Gọi `/chapters/{n}` ở đây sẽ kéo về cả toàn văn chương — vài nghìn từ — để hiện
 * một bản duyệt.
 */
export function KiemDinh({
  snapshot,
  chuongChon,
  onChonChuong,
}: {
  snapshot: Snapshot;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
}) {
  const hang = snapshot.chapters;
  const sel = snapshot.selected;
  // Bản duyệt phải thuộc ĐÚNG chương đang chọn. Trong lúc snapshot mới còn trên
  // đường về, `selected` vẫn là của chương trước — hiện nó dưới tiêu đề chương
  // mới là gán bản duyệt của chương này cho chương khác.
  const duyet = sel && sel.chapter === chuongChon ? sel.review : undefined;

  return (
    <main className="canvas khukiem" id="kiem-dinh">
      <div className="head">
        <h1>{CHU.kiemDinh}</h1>
        <span className="sub">{motTa(hang)}</span>
      </div>

      <div className="kiemlayout">
        <ChonChuong hang={hang} chuongChon={chuongChon} onChonChuong={onChonChuong} />

        <div className="duyetwrap">
          {!chuongChon ? (
            <p className="trongSect">{GIAI_THICH.chuaChonChuongDuyet}</p>
          ) : (
            <>
              <div className="chuongdau">
                <div className="no">
                  {CHU.chuong} {chuongChon}
                </div>
                <h2>
                  {tieuDeChuong(hang, chuongChon) ?? (
                    <span className="draft">{CHU.chuaDatTieuDe}</span>
                  )}
                </h2>
              </div>
              {duyet ? (
                <div className="duyetthan">
                  <BanDuyet review={duyet} />
                </div>
              ) : (
                <p className="trongSect">{GIAI_THICH.chuaCoDuyet}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Nói ra giới hạn của nguồn, ở cuối bề mặt chứ không ở đầu: người vận hành
          tới đây để đọc một bản duyệt, không để đọc chú thích về API. */}
      <p className="steerhint kiemnguon">{GIAI_THICH.kiemDinhMotChuong}</p>
    </main>
  );
}

/**
 * Danh sách chọn chương. Cột trạng thái là CÔNG ĐOẠN, và tiêu đề cột nói đúng
 * thế — không phải kết luận duyệt, vì kết luận duyệt của các chương chưa chọn
 * không có trong payload.
 */
function ChonChuong({
  hang,
  chuongChon,
  onChonChuong,
}: {
  hang: ChapterRow[];
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
}) {
  return (
    <nav className="dsChuong" aria-label={CHU.chonChuongDeDuyet}>
      <h2>{CHU.chuongCoDauVet}</h2>
      {hang.length === 0 ? (
        <p className="trong">{GIAI_THICH.chuaCoChuong}</p>
      ) : (
        <ul>
          {hang.map((r) => {
            const tt = TRANG_THAI_CHUONG[r.stage];
            return (
              <li key={r.chapter}>
                <button
                  type="button"
                  aria-current={r.chapter === chuongChon}
                  title={tt.nhan}
                  onClick={() => onChonChuong(r.chapter)}
                >
                  <span className={`ky ${tt.mau}`} aria-hidden="true">
                    {tt.ky}
                  </span>
                  <span className="so">{r.chapter}</span>
                  <span className="ten">
                    {r.title ? r.title : <em>{CHU.chuaDatTieuDe}</em>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

/** Chỉ đếm những gì đếm được từ payload: số chương có dấu vết sản xuất. */
function motTa(hang: ChapterRow[]): string {
  const daNghiemThu = hang.filter((r) => r.stage === 'done').length;
  return `${hang.length} chương có dấu vết sản xuất · ${daNghiemThu} đã nghiệm thu`;
}

function tieuDeChuong(hang: ChapterRow[], chuong: number): string | undefined {
  return hang.find((r) => r.chapter === chuong)?.title || undefined;
}
