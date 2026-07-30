'use client';

import { so } from '@/lib/dinhdang';
import {
  CHU,
  GIAI_THICH,
  kyTheoTone,
  nhanChieu,
  nhanHopDong,
  nhanKetLuan,
  nhanMuc,
  nhanPhamViDuyet,
} from '@/lib/nhan';
import type { Issue, Review } from '@/lib/types';

/**
 * Bản duyệt của Editor. MỘT hiện thực, hai bề mặt dùng.
 *
 * Tab Kiểm định trong inspector (292px) và khu Kiểm định (rộng cả canvas) vẽ
 * cùng một thứ; chép hai lần thì lần đổi thuật ngữ đầu tiên là hai bề mặt nói
 * khác nhau về cùng một chương. Bố cục khác nhau nằm ở CSS của khối cha, không
 * ở đây — component này không biết mình rộng bao nhiêu.
 *
 * Nguyên tắc trình bày, theo DESIGN.md: kiểm định là **hàng mảnh có kết luận
 * kèm dẫn chứng, không phải thẻ điểm**. Nên kết luận đứng trước, điểm số đứng
 * sau và nhỏ hơn — và không có thanh đo tỉ lệ nào. Điểm để so giữa các lần
 * chạy, không để chấm bài.
 */
export function BanDuyet({ review }: { review: Review }) {
  const kl = nhanKetLuan(review.verdict);
  const hopDong = nhanHopDong(review.contract_status);

  return (
    <>
      <h3>{CHU.ketLuanDuyet}</h3>
      <dl className="kv">
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
        {hopDong ? (
          <>
            <dt>{CHU.hopDong.toLowerCase()}</dt>
            <dd>
              <span className={`st ${hopDong.mau}`}>
                <span className="ky" aria-hidden="true">
                  {kyTheoTone(hopDong.mau)}
                </span>
                {hopDong.nhan}
              </span>
            </dd>
          </>
        ) : null}
      </dl>

      {review.summary ? <p className="qcnote">{review.summary}</p> : null}

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

      {review.contract_misses && review.contract_misses.length > 0 ? (
        <>
          <h3>{CHU.hopDongThieu}</h3>
          <ul className="canh">
            {review.contract_misses.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
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

/** Một vấn đề Editor nêu, kèm dẫn chứng và đề xuất. */
function VanDe({ v }: { v: Issue }) {
  const m = nhanMuc(v.severity);
  return (
    <div className="vande">
      <div className="dau">
        <span className="loai">{v.type}</span>
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
