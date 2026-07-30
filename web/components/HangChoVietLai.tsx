'use client';

import { soTu } from '@/lib/dinhdang';
import { CHU, GIAI_THICH, TRANG_THAI_CHUONG } from '@/lib/nhan';
import type { ChapterRow, Review, Snapshot } from '@/lib/types';

import { BanDuyet } from './BanDuyet';

/**
 * Hàng chờ viết lại: chương Editor đã trả về, kèm lý do trả về.
 *
 * # Vì sao là một bề mặt riêng chứ không phải một phép lọc của bảng chương
 *
 * Đây là hàng đợi VIỆC, không phải một mức xem. Người vận hành mở nó để biết
 * "còn nợ gì" — và nợ đó có thứ tự ưu tiên riêng, không theo số chương. Bảng
 * chương xếp theo số chương vì nó là bản đồ tiến độ; hàng chờ xếp theo số chương
 * nhỏ trước vì chương cũ bị treo lâu hơn chặn nhiều chương sau nó hơn.
 *
 * # Nguồn
 *
 * `snapshot.chapters` với `stage === 'rewrite'`. Đây là danh sách ĐẦY ĐỦ, không
 * phải phần lọc: `buildChapterRows` đưa mọi chương trong `progress.PendingRewrites`
 * vào bảng (snapshot.go:277), và `rowStage` xét `rewrite` trước `done` nên chương
 * đã nghiệm thu rồi bị trả về vẫn hiện ở đây.
 *
 * Không dùng `timeline.chapters` làm nguồn dù nó cũng có vạch `rewrite`: lane
 * chương chỉ trải từ 1 tới `total_chapters`, nên một chương chờ viết lại nằm
 * ngoài khoảng đó sẽ không có vạch — và một hàng chờ thiếu người là hàng chờ
 * nói dối.
 */
export function HangChoVietLai({
  snapshot,
  chuongChon,
  onChonChuong,
}: {
  snapshot: Snapshot;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
}) {
  const hangCho = snapshot.chapters
    .filter((r) => r.stage === 'rewrite')
    .sort((a, b) => a.chapter - b.chapter);

  const sel = snapshot.selected;
  const duyet = sel && sel.chapter === chuongChon ? sel.review : undefined;

  return (
    <main className="canvas khuhang" id="hang-cho-viet-lai">
      <div className="head">
        <h1>{CHU.hangChoVietLai}</h1>
        <span className="sub">{CHU.demHangCho(hangCho.length)}</span>
      </div>

      <section className="sect">
        {hangCho.length === 0 ? (
          <p className="trongSect">{GIAI_THICH.hangChoRong}</p>
        ) : (
          <>
            <ul className="dsHangCho">
              {hangCho.map((r) => (
                <MotChuong
                  key={r.chapter}
                  r={r}
                  moRa={r.chapter === chuongChon}
                  duyet={r.chapter === chuongChon ? duyet : undefined}
                  onChon={() => onChonChuong(r.chapter)}
                />
              ))}
            </ul>
            <p className="steerhint">{GIAI_THICH.hangChoNguon}</p>
          </>
        )}
      </section>
    </main>
  );
}

/**
 * Một chương trong hàng chờ. Bản duyệt mở ra TẠI CHỖ, không ở panel bên cạnh.
 *
 * Lý do trả về nằm trong bản duyệt, và bản duyệt chỉ có cho chương đang chọn
 * (`selected.review`). Nên mỗi hàng là một nút mở: bấm vào thì snapshot nạp lại
 * với `?chapter=n` và phần lý do hiện ra dưới đúng hàng đó.
 */
function MotChuong({
  r,
  moRa,
  duyet,
  onChon,
}: {
  r: ChapterRow;
  moRa: boolean;
  duyet: Review | undefined;
  onChon: () => void;
}) {
  const tt = TRANG_THAI_CHUONG[r.stage];
  const tu = soTu(r.words);

  return (
    <li className={moRa ? 'mo' : undefined}>
      <button type="button" className="hangdau" aria-expanded={moRa} onClick={onChon}>
        <span className={`st ${tt.mau}`}>
          <span className="ky" aria-hidden="true">
            {tt.ky}
          </span>
          {tt.nhan}
        </span>
        <span className="ch">
          {CHU.chuong} {r.chapter}
        </span>
        <span className="ten">
          {r.title ? r.title : <em className="draft">{CHU.chuaDatTieuDe}</em>}
        </span>
        {/* Số từ của bản thảo CŨ. Nó có nghĩa ở đây: một chương 2.837 từ bị trả
            về là công đã bỏ ra sẽ phải bỏ lại, khác với chương chưa viết dòng
            nào. Chú giải nói rõ để không ai đọc nó là số từ của bản mới. */}
        {tu ? (
          <span className="tu" title={GIAI_THICH.vietLaiConSoTu}>
            {CHU.daCoSoTu} {tu}
          </span>
        ) : null}
        <span className="mocua" aria-hidden="true">
          {moRa ? '−' : '+'}
        </span>
      </button>

      {moRa ? (
        <div className="hangthan">
          {duyet ? (
            <BanDuyet review={duyet} />
          ) : (
            <p className="trongSect">{GIAI_THICH.chuaCoDuyet}</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
