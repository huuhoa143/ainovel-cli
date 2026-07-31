'use client';

import { layChiPhi } from '@/lib/api';
import { donGia, ngayGio, phanTram, so, tongTien } from '@/lib/dinhdang';
import { CHU, GIAI_THICH, nhanVai } from '@/lib/nhan';
import type { CostDoc, Snapshot, UsageTotals } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HoSoKhung, tinhTrangNguon } from './HoSoKhung';

/**
 * Chi phí: tiền đi đâu, và số đó đáng tin tới mức nào.
 *
 * # Vì sao KHÔNG có một con số lớn ở giữa
 *
 * Đó là hero-metric, thứ PRODUCT.md:43 cấm thẳng, và bề mặt này là chỗ dễ sa vào
 * nhất trong cả studio — một bề mặt tên là "Chi phí" thì phản xạ đầu tiên là in
 * `$12,44` cỡ 48px ở giữa.
 *
 * Nhưng lý do bỏ nó không chỉ là một luật trong tài liệu: tổng chi phí và giá
 * thành mỗi chương ĐÃ hiện ở thanh transport, luôn hiện, không cuộn mất. In lại
 * chúng ở đây tạo ra bản thứ hai của cùng một sự thật, và hai bản của một con số
 * là cách chúng lệch nhau.
 *
 * `overall` vẫn được dùng, nhưng dùng làm MẪU SỐ: nó biến "Writer tốn $7,86"
 * thành "Writer chiếm 63% chi phí", và nó là nơi duy nhất trong cả API có tổng
 * TOKEN và `saved_usd`. Nên nó nằm ở hàng cuối bảng, cạnh những con số nó chia —
 * không phải trên đầu trang.
 *
 * # Câu hỏi thật của bề mặt này là câu thứ hai
 *
 * "Tốn bao nhiêu" là câu dễ và thanh dưới đã trả lời. Câu đắt hơn là "con số đó có
 * đủ không" — và store biết câu trả lời: `missing_assistant_usage` đếm số lượt gọi
 * model KHÔNG báo lại usage. Lớn hơn 0 nghĩa là mọi con số ở đây là SÀN. Một bề
 * mặt chi phí in tổng mà không nói điều đó là một bề mặt để người vận hành tin sai
 * rồi đi quy khoảng lệch với hoá đơn cho chỗ khác.
 */
export function ChiPhi({
  tacPham,
  snapshot,
}: {
  tacPham: string | undefined;
  snapshot: Snapshot;
}) {
  const tai = useHoSo(tacPham, layChiPhi);
  const tt = tinhTrangNguon(tai);
  const du = tai.du;

  return (
    <HoSoKhung tieuDe={CHU.chiPhi} motTa={tt || !du ? undefined : motTa(du, snapshot)}>
      {tt ??
        (du ? (
          du.state === 'ready' ? (
            <>
              <section className="sect">
                <p className="trongSect">{GIAI_THICH.chiPhiViSaoBang}</p>
              </section>
              <BangGop
                tieuDe={CHU.theoTacTu}
                o={du.per_agent}
                overall={du.overall}
                nhanO={nhanVai}
                cotDau={CHU.colVai}
                tepNguon={GIAI_THICH.chiPhiTepNguon}
                muc="vai"
              />
              <BangGop
                tieuDe={CHU.theoModel}
                o={du.per_model}
                overall={du.overall}
                cotDau={CHU.model}
                maCotDau
                tepNguon={GIAI_THICH.chiPhiTepNguon}
                muc="model"
              />
              <DoTin du={du} snapshot={snapshot} />
            </>
          ) : (
            <ThieuNguon du={du} />
          )
        ) : null)}
    </HoSoKhung>
  );
}

/**
 * Ba trạng thái "không có bảng để vẽ", ba câu khác nhau.
 *
 * `stale_schema` là câu thứ tư và nó tồn tại vì `UsageStore.Load()` trả
 * `(nil, nil)` cho HAI ca khác nhau: thiếu tệp, và tệp có mà `Schema` không khớp
 * bản engine đang chạy. Gộp lại thì một tác phẩm CÓ số liệu cũ bị báo là "chưa
 * chạy gì" — sai theo đúng hướng nguy hiểm nhất, vì nó làm người vận hành tưởng
 * mình chưa tốn tiền.
 */
function ThieuNguon({ du }: { du: CostDoc }) {
  const cau =
    du.state === 'no_file'
      ? GIAI_THICH.nguonChuaGhi(GIAI_THICH.chiPhiTepNguon, GIAI_THICH.chiPhiKhiNao)
      : du.state === 'empty'
        ? GIAI_THICH.nguonCoMaRong(GIAI_THICH.chiPhiTepNguon, 'lượt gọi')
        : GIAI_THICH.chiPhiSchemaCu;

  return (
    <section className="sect">
      <p className="trongSect">{cau}</p>
      {/* Số liệu schema cũ vẫn có `updated_at` đọc được, và mốc đó là bằng chứng
          duy nhất cho câu "có chạy, chỉ không đọc được". Bỏ nó đi thì câu trên
          thành một khẳng định không có gì đỡ. */}
      {du.state === 'stale_schema' && du.updated_at ? (
        <dl className="kv kvcp">
          <dt>{CHU.capNhat}</dt>
          <dd className="m">{ngayGio(du.updated_at) ?? du.updated_at}</dd>
        </dl>
      ) : null}
    </section>
  );
}

/**
 * Một bảng cộng dồn — dùng chung cho theo-tác-tử và theo-model.
 *
 * `o === null` (chưa có tệp) và `{}` (có tệp mà chưa mục nào) đi qua hai câu khác
 * nhau, vì hai ca đó dẫn tới hai chỗ khác nhau để đi xem.
 */
function BangGop({
  tieuDe,
  o,
  overall,
  nhanO,
  cotDau,
  maCotDau,
  tepNguon,
  muc,
}: {
  tieuDe: string;
  o: Record<string, UsageTotals> | null;
  overall: UsageTotals;
  nhanO?: (ma: string) => string;
  cotDau: string;
  maCotDau?: boolean;
  tepNguon: string;
  muc: string;
}) {
  const hang = o ? Object.entries(o) : [];

  return (
    <section className="sect">
      <h2>{tieuDe}</h2>

      {hang.length === 0 ? (
        <p className="trongSect">
          {o === null
            ? GIAI_THICH.nguonChuaGhi(tepNguon, GIAI_THICH.chiPhiKhiNao)
            : GIAI_THICH.nguonCoMaRong(tepNguon, muc)}
        </p>
      ) : (
        <>
          <div className="bangwrap">
            <table className="bang bangcp">
              <thead>
                <tr>
                  <th scope="col">{cotDau}</th>
                  <th scope="col" className="num">
                    {CHU.colChiPhi}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colTiTrong}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colNhap}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colXuat}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colDocDem}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colGhiDem}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colTietKiem}
                  </th>
                </tr>
              </thead>
              <tbody>
                {xepTheoChiPhi(hang).map(([ma, t]) => (
                  <tr key={ma}>
                    <td className={maCotDau ? 'model' : 'vai'}>
                      {maCotDau ? <span className="ma">{ma}</span> : (nhanO?.(ma) ?? ma)}
                    </td>
                    <O t={t} overall={overall} />
                  </tr>
                ))}
              </tbody>
              {/* Tổng ở CHÂN bảng, không ở đầu trang: đây là mẫu số của cột "Tỉ
                  trọng" ngay bên trên, nên chỗ của nó là cạnh những con số nó
                  chia. Đặt lên đầu là biến nó thành hero-metric. */}
              <tfoot>
                <tr>
                  <td>{CHU.tongChung}</td>
                  <O t={overall} overall={overall} laTong />
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Tổng chung KHÔNG phải tổng các hàng trên, và giao diện cố ý không tự
              cộng lại để kiểm: một lượt gọi không gắn với vai nào vẫn vào tổng
              chung, nên hai con số lệch nhau là chuyện bình thường. Nói ra điều đó
              rẻ hơn và thật hơn việc khẳng định một nguyên nhân. */}
          <p className="steerhint">{GIAI_THICH.chiPhiTongChung}</p>
        </>
      )}
    </section>
  );
}

/**
 * Các ô số của một hàng.
 *
 * Mọi con số kiểm bằng `!= null`, KHÔNG bằng falsy — `$0` là một sự thật (model
 * miễn phí, hoặc nhà cung cấp không tính giá) còn "chưa có số liệu" là sự thật
 * khác. Lỗi thật đã gặp trong repo này: điểm 0/100 biến mất khỏi giao diện vì một
 * phép kiểm falsy (xem `Dimension.Score`, internal/serve/model.go:95).
 */
function O({
  t,
  overall,
  laTong,
}: {
  t: UsageTotals;
  overall: UsageTotals;
  laTong?: boolean;
}) {
  // Tỉ trọng cần mẫu số khác 0. `0/0` cho NaN, và "0%" ở đó là một câu SAI chứ
  // không phải một câu trống — nên chặn ở đây để ý đồ đọc được.
  const ti =
    overall.cost_usd > 0 && t.cost_usd != null ? t.cost_usd / overall.cost_usd : undefined;

  return (
    <>
      <td className="num">{tongTien(t.cost_usd) ?? CHU.khongCo}</td>
      <td className="num">
        {/* Hàng tổng không có tỉ trọng của chính nó: "100%" là một con số vô nghĩa
            ở đây, và tệ hơn, nó ngụ ý các hàng trên cộng đủ thành nó. */}
        {laTong ? (
          <span className="trong">{CHU.khongCo}</span>
        ) : (
          (phanTram(ti) ?? CHU.khongCo)
        )}
      </td>
      <td className="num">{so(t.input) ?? CHU.khongCo}</td>
      <td className="num">{so(t.output) ?? CHU.khongCo}</td>
      {/* `cache_capable === false` nghĩa là KHÔNG ÁP DỤNG, không phải 0. In "0" ở
          đây nói "model có đệm mà không trúng lần nào" — một chẩn đoán sai về một
          model đơn giản là không có tính năng đó. */}
      <OCache co={t.cache_capable} n={t.cache_read} />
      <OCache co={t.cache_capable} n={t.cache_write} />
      <td className="num">{tongTien(t.saved_usd) ?? CHU.khongCo}</td>
    </>
  );
}

function OCache({ co, n }: { co: boolean; n: number }) {
  if (!co) {
    return (
      <td className="num">
        <span className="trong" title={GIAI_THICH.chiPhiDemKhongApDung}>
          {CHU.khongApDung}
        </span>
      </td>
    );
  }
  return <td className="num">{so(n) ?? CHU.khongCo}</td>;
}

/**
 * Độ tin của số liệu — phần khiến bề mặt này khác một bảng kế toán.
 *
 * Ba sự thật ở đây đều nói về GIỚI HẠN của những con số phía trên, và không có ở
 * bất cứ đâu khác trong giao diện.
 */
function DoTin({ du, snapshot }: { du: CostDoc; snapshot: Snapshot }) {
  const thieu = du.missing_assistant_usage;
  const dut = du.overall.cache_breaks;
  const xong = snapshot.book.completed_chapters;

  return (
    <section className="sect">
      <h2>{CHU.doTinSoLieu}</h2>

      {/* Cảnh báo trước, số liệu sau: nếu có lượt thiếu thì mọi con số phía trên
          là SÀN, và người đọc cần biết trước khi đọc tiếp. */}
      {thieu > 0 ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>{GIAI_THICH.chiPhiThieuUsage(thieu)}</span>
        </p>
      ) : null}

      <dl className="kv kvcp">
        <dt>{CHU.luotThieuUsage}</dt>
        {/* `0` in ra là `0`, không phải `—`: "đã đo, không lượt nào thiếu" là một
            sự thật đáng đọc, và nó chính là câu bảo đảm cho các con số trên. */}
        <dd className="m">{so(thieu) ?? CHU.khongCo}</dd>

        <dt>{CHU.dutDem}</dt>
        <dd className="m">
          {dut > 0 ? (
            <span title={GIAI_THICH.chiPhiDutDem(CHU.demDutDem(dut))}>
              {CHU.demDutDem(dut)}
            </span>
          ) : (
            so(dut)
          )}
        </dd>

        {du.updated_at ? (
          <>
            <dt>{CHU.capNhat}</dt>
            <dd className="m">{ngayGio(du.updated_at) ?? du.updated_at}</dd>
          </>
        ) : null}

        {/* Giá thành mỗi chương CÓ nguồn thật — tổng chia số chương đã nghiệm thu —
            nhưng cửa sổ của nó phải viết cạnh nó, nếu không nó bị đọc thành
            "chương kế tiếp sẽ tốn chừng này". */}
        <dt>{CHU.giaThanhChuong}</dt>
        <dd className="m">
          {snapshot.transport.cost_per_chapter != null ? (
            <>
              {donGia(snapshot.transport.cost_per_chapter)}{' '}
              <span className="cua">{CHU.cuaSoGiaThanh(xong)}</span>
            </>
          ) : (
            <span className="trong">{CHU.khongCo}</span>
          )}
        </dd>
      </dl>

      {/* Chi phí theo TỪNG chương không có nguồn, và cờ capability nói đúng điều
          đó. Cùng câu mà bảng chương đã nói — nhắc lại ở đây vì đây là bề mặt
          người vận hành tới để tìm nó. */}
      {snapshot.capabilities.per_chapter_cost === false ? (
        <p className="steerhint">{GIAI_THICH.chiPhiKhongTheoChuong}</p>
      ) : null}
    </section>
  );
}

/** Tốn nhiều nhất lên đầu: bề mặt này để tìm chỗ tiền đi, không để tra bảng chữ cái. */
function xepTheoChiPhi(hang: [string, UsageTotals][]): [string, UsageTotals][] {
  return [...hang].sort((a, b) => (b[1].cost_usd ?? 0) - (a[1].cost_usd ?? 0));
}

/**
 * Dòng mô tả: tổng kèm MẪU SỐ của nó.
 *
 * Một con số tiền trơ không nói được nó cộng trên bao nhiêu chương, và người vận
 * hành sẽ so nó với con số của một tác phẩm khác có độ dài khác.
 */
function motTa(du: CostDoc, snapshot: Snapshot): string | undefined {
  if (du.state !== 'ready') return undefined;
  const tien = tongTien(du.overall.cost_usd);
  if (!tien) return undefined;
  return CHU.tongTrenChuong(tien, snapshot.book.completed_chapters);
}
