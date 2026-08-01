'use client';

import { useEffect } from 'react';

import { CHU, GIAI_THICH, TRANG_THAI_CHUONG } from '@/lib/nhan';
import type { ChapterRow, Snapshot } from '@/lib/types';

import { BanDuyet } from './BanDuyet';
import { CuaNghiemThu } from './CuaNghiemThu';

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
 *
 * Câu trên vẫn đúng sau khi dải quyết định vào đây, và nó là lý do dải nhận `onDoi` từ NGOÀI
 * chứ không tự nạp lại: hai nút của dải đổi trạng thái phía engine, nên snapshot phải về lại
 * — nhưng đường về đó là `useStudio.taiLai`, cùng đường mà mọi lệnh khác trên trang đã dùng.
 *
 * # Vì sao dải quyết định đứng ở đây, TRÊN bản duyệt
 *
 * Đây là chỗ người vận hành đọc bằng chứng để quyết định (spec §7.3), nên nút quyết định phải
 * ở cùng chỗ với bằng chứng. Bắt họ đổi khu để bấm là bắt họ rời mắt khỏi đúng thứ họ vừa đọc.
 * Cùng một component với dải trên buồng lái — hai bản chép tay của một quyết định sẽ trôi lệch
 * ngay lần đổi đầu tiên, và lúc đó hai chỗ trên cùng một ứng dụng nói khác nhau về cùng một
 * cửa. Xem `CuaNghiemThu.tsx`.
 */
export function KiemDinh({
  snapshot,
  tacPham,
  choGhi,
  dangChay,
  chuongChon,
  onChonChuong,
  onDoi,
}: {
  snapshot: Snapshot;
  /**
   * Cuốn đang mở — CHỈ dải quyết định đọc nó, và nó bắt buộc phải có đường vào đây.
   *
   * Bề mặt này trước Task 5 không nhận `tacPham` vì nó chỉ đọc `snapshot`. Để trống nó bây giờ
   * cho ra một dải amber với hai nút xám: chốt `!!tacPham` trong `CuaNghiemThu` biến ca đó
   * thành hai nút vô hiệu thay vì một lời gọi `POST /books/undefined/advance` — nên hỏng ở đây
   * hỏng IM LẶNG, trên đúng bề mặt tồn tại để quyết định.
   */
  tacPham: string | undefined;
  /** undefined = chưa biết (đang hỏi `/api/config`) — xem `useMay`. */
  choGhi: boolean | undefined;
  /** Engine có đang viết dở không — quyết định NHÃN nút gửi của dải. Xem `CuaNghiemThu`. */
  dangChay: boolean;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
  /** Gọi sau mỗi lệnh của dải để snapshot được nạp lại — đừng tự đoán trạng thái mới. */
  onDoi: () => void;
}) {
  const hang = snapshot.chapters;
  const sel = snapshot.selected;

  // Cùng luật với bề mặt đọc (xem DocTruyen.tsx): vào mà chưa chọn chương thì tự chọn chương
  // đầu tiên có dấu vết sản xuất, thay vì hiện một bề mặt hai cột với cột phải rỗng. Ở đây
  // KHÔNG lọc theo `done`: bản duyệt tồn tại cho cả chương bị trả về viết lại, và đó chính
  // là chương đáng đọc bản duyệt nhất.
  useEffect(() => {
    if (chuongChon !== undefined) return;
    const dau = hang[0];
    if (dau) onChonChuong(dau.chapter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chuongChon]);
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

      {/* Trên bản duyệt, không dưới: một dải nhét vào cuối `<main>` vẫn "có mặt" trong khi
          người dùng phải cuộn qua hết bảy chiều mới thấy hai cái nút. */}
      <CuaNghiemThu
        advance={snapshot.advance}
          runtime={snapshot.runtime}
        tacPham={tacPham}
        choGhi={choGhi}
        dangChay={dangChay}
        onDoi={onDoi}
      />

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
