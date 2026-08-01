'use client';

import { so } from '@/lib/dinhdang';
import {
  CHU,
  GIAI_THICH,
  kyTheoTone,
  nhanChieu,
  nhanKheUoc,
  nhanKetLuan,
  nhanMuc,
  nhanPhamViDuyet,
} from '@/lib/nhan';
import type { Issue, Review } from '@/lib/types';

/**
 * Bản duyệt của Editor. MỘT hiện thực, BỐN bề mặt dùng: tab Kiểm định của
 * inspector (292px), khu Kiểm định (rộng cả canvas), hàng chờ Viết lại, và khu
 * lề của bề mặt Đọc (296px).
 *
 * Chép hai lần thì lần đổi thuật ngữ đầu tiên là hai bề mặt nói khác nhau về
 * cùng một chương — và đó không phải giả thuyết: bản chép ở `DocTruyen` đã trôi
 * lệch thật, mang ba lỗi mà bản này không có (điểm 0 bị coi là vắng, con số
 * trần không có thang đo, nhãn `<dt>` viết cứng không qua CHU) đồng thời lại
 * đúng hơn ở một chỗ (dịch `Issue.Type`). Gộp về một chỗ là lấy phần đúng của
 * cả hai, không phải xóa một bên.
 *
 * # Vì sao hai cờ rời chứ không một cờ "dạng hẹp"
 *
 * Cột hẹp và tự vẽ tiêu đề trông như luôn đi cùng nhau, nhưng inspector chứng
 * minh là không: nó hẹp 292px MÀ vẫn cần tiêu đề riêng (tab không có tiêu đề
 * nào bên ngoài). Còn khu lề của Đọc thì hẹp mà KHÔNG cần, vì `BenLe` đã vẽ
 * "Bản duyệt Editor" ngay trên. Nhập hai thứ thành một cờ là ép một trong hai
 * bề mặt sai.
 *
 * Nguyên tắc trình bày, theo DESIGN.md: kiểm định là **hàng mảnh có kết luận
 * kèm dẫn chứng, không phải thẻ điểm**. Nên kết luận đứng trước, điểm số đứng
 * sau và nhỏ hơn — và không có thanh đo tỉ lệ nào. Điểm để so giữa các lần
 * chạy, không để chấm bài.
 */
export function BanDuyet({
  review,
  le = false,
  tieuDe = true,
}: {
  review: Review;
  /** Dạng cột hẹp (≤296px): nhãn 92px, cỡ chữ 12px. Xem `.kvle` trong CSS. */
  le?: boolean;
  /** Tự vẽ tiêu đề. Tắt khi khối cha đã có tiêu đề cho bản duyệt. */
  tieuDe?: boolean;
}) {
  const kl = nhanKetLuan(review.verdict);
  const kheUoc = nhanKheUoc(review.contract_status);
  const lopKv = le ? 'kv kvle' : 'kv';
  const lopCanh = le ? 'canh canhle' : 'canh';

  return (
    <>
      {tieuDe ? <h3>{CHU.ketLuanDuyet}</h3> : null}
      <dl className={lopKv}>
        <dt>{CHU.ketLuan.toLowerCase()}</dt>
        <dd>
          {kl ? (
            <span className={`st ${kl.mau}`}>
              <span className="ky" aria-hidden="true">
                {kyTheoTone(kl.mau)}
              </span>
              {kl.nhan}
            </span>
          ) : (
            <span className="trong">{CHU.khongCo}</span>
          )}
        </dd>
        <dt>{CHU.phamVi.toLowerCase()}</dt>
        <dd>{nhanPhamViDuyet(review.scope)}</dd>
        {kheUoc ? (
          <>
            <dt>{CHU.kheUoc.toLowerCase()}</dt>
            <dd>
              <span className={`st ${kheUoc.mau}`}>
                <span className="ky" aria-hidden="true">
                  {kyTheoTone(kheUoc.mau)}
                </span>
                {kheUoc.nhan}
              </span>
            </dd>
          </>
        ) : null}
      </dl>

      {review.summary ? <p className="qcnote">{review.summary}</p> : null}

      {/* Khế ước thiếu đứng TRƯỚC các chiều, không phải sau.
          Nó là câu trả lời cho "chương này có làm đúng việc đã hứa không" —
          cụ thể và làm được ngay. Điểm từng chiều là chẩn đoán, đọc sau. Cùng
          một lý lẽ với việc `BenLe` đặt khế ước trên bản duyệt: khế ước là
          thước, phán xét chỉ có nghĩa khi đã biết thước. */}
      {review.contract_misses && review.contract_misses.length > 0 ? (
        <>
          <h3>{CHU.kheUocThieu}</h3>
          <ul className={lopCanh}>
            {review.contract_misses.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </>
      ) : null}

      {review.dimensions && review.dimensions.length > 0 ? (
        <>
          <h3>
            {CHU.cacChieu} · {CHU.demChieu(review.dimensions.length)}
          </h3>
          {review.dimensions.map((d, i) => {
            const v = nhanKetLuan(d.verdict);
            // `d.score` vắng và 0 phải khác nhau: 0/100 là điểm Editor thật sự
            // chấm, còn vắng là chiều không được chấm. `!= null` giữ được 0.
            const diem = d.score != null ? so(d.score) : undefined;
            return (
              <div key={`${d.name}-${i}`}>
                <div className="qcrow">
                  <span className="ten">{nhanChieu(d.name)}</span>
                  <span className={`v ${v?.mau ?? 'muted'}`}>
                    {v ? (
                      <>
                        <span className="ky" aria-hidden="true">
                          {kyTheoTone(v.mau)}
                        </span>
                        {v.nhan}
                      </>
                    ) : (
                      <span className="trong">{CHU.khongCo}</span>
                    )}
                    {diem !== undefined ? (
                      <span className="diem" title={GIAI_THICH.diemThang100}>
                        {CHU.diemTren100(d.score!)}
                      </span>
                    ) : null}
                  </span>
                </div>
                {d.comment ? <p className="qcnote">{d.comment}</p> : null}
              </div>
            );
          })}
        </>
      ) : null}

      {review.issues && review.issues.length > 0 ? (
        <>
          <h3>
            {CHU.vanDeNeuRa} · {review.issues.length}
          </h3>
          {review.issues.map((v, i) => (
            <VanDe key={i} v={v} />
          ))}
        </>
      ) : null}
    </>
  );
}

/**
 * Một vấn đề Editor nêu, kèm dẫn chứng và đề xuất.
 *
 * `v.type` đi qua `nhanChieu` chứ không hiện trần: nguồn Go ghi rõ nó là
 * "问题维度" (internal/domain/review.go:37) — cùng bộ từ vựng với
 * `Dimension.Name`, tức `consistency`, `pacing`, `foreshadow`. Hiện trần thì
 * người dùng đọc bản duyệt tiếng Việt mà loại vấn đề lại là chữ tiếng Anh, và
 * đúng những chữ ấy đã có bản dịch ngay trong CHIEU ở bảng bên trên.
 */
function VanDe({ v }: { v: Issue }) {
  const m = nhanMuc(v.severity);
  return (
    <div className="vande">
      <div className="dau">
        <span className="loai">{nhanChieu(v.type)}</span>
        {m ? <span className={`muc ${m.mau}`}>{m.nhan}</span> : null}
        {v.chapters && v.chapters.length > 0 ? (
          <span className="ch">ch. {v.chapters.join(', ')}</span>
        ) : null}
      </div>
      <p>{v.description}</p>
      {v.evidence ? (
        <p>
          <span className="dx">{CHU.danChung}: </span>
          <q className="dc">{v.evidence}</q>
        </p>
      ) : null}
      {v.suggestion ? (
        <p className="dx">
          {CHU.deXuat}: {v.suggestion}
        </p>
      ) : null}
    </div>
  );
}
