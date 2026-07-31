'use client';

import { layChiPhi } from '@/lib/api';
import { donGia, phanTram, so, tongTien } from '@/lib/dinhdang';
import { CHU, GIAI_THICH, nhanVai } from '@/lib/nhan';
import type { CostDoc, Snapshot, UsageTotals } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HoSoKhung, tinhTrangHoSo } from './HoSoKhung';

/**
 * Chi phí: tiền đi đâu, và số đó đáng tin tới mức nào.
 *
 * # Vì sao KHÔNG có một con số lớn ở giữa
 *
 * Đó là hero-metric, thứ PRODUCT.md:43 cấm thẳng, và bề mặt này là chỗ dễ sa vào
 * nhất trong cả studio — một bề mặt tên là "Chi phí" thì phản xạ đầu tiên là in
 * `$12,40` cỡ 48px ở giữa.
 *
 * Nhưng lý do bỏ nó không chỉ là một luật cấm trong tài liệu: tổng chi phí ĐÃ
 * hiện ở thanh transport, luôn hiện, không cuộn mất. In lại nó ở đây tạo ra bản
 * thứ hai của cùng một sự thật, và hai bản của một con số là cách chúng lệch nhau
 * — đúng thứ PRODUCT.md gọi là "studio nhân bản logic engine".
 *
 * `overall` vẫn được dùng, nhưng dùng làm MẪU SỐ: nó là thứ biến "Writer tốn
 * $7,20" thành "Writer chiếm 62% chi phí", và nó là nơi duy nhất trong cả API có
 * tổng TOKEN và `saved_usd`. Nên nó nằm ở hàng cuối bảng, cạnh những con số nó
 * chia — không phải trên đầu trang.
 *
 * # Câu hỏi thật của bề mặt này là câu thứ hai
 *
 * "Tốn bao nhiêu" là câu dễ và thanh dưới đã trả lời. Câu đắt hơn là "con số đó
 * có đủ không" — và store biết câu trả lời: `missing_assistant_usage` đếm số lượt
 * gọi model KHÔNG báo lại usage. Lớn hơn 0 nghĩa là mọi con số ở đây là SÀN, chưa
 * phải số thật. Một bề mặt chi phí in tổng mà không nói điều đó là một bề mặt để
 * người vận hành tin sai.
 */
export function ChiPhi({
  tacPham,
  snapshot,
}: {
  tacPham: string | undefined;
  snapshot: Snapshot;
}) {
  const tai = useHoSo(tacPham, layChiPhi);
  const tt = tinhTrangHoSo(tai);
  const du = tai.du;

  return (
    <HoSoKhung tieuDe={CHU.chiPhi} motTa={tt || !du ? undefined : motTa(du)}>
      {tt ??
        (du ? (
          <>
            <ThieuNguon du={du} />
            {du.state === 'ready' ? (
              <>
                <BangGop
                  tieuDe={CHU.cpTheoTacTu}
                  giai={GIAI_THICH.cpTheoTacTuGiai}
                  o={du.per_agent}
                  overall={du.overall}
                  nhanO={nhanVai}
                  cotDau={CHU.colVai}
                  rongVi={GIAI_THICH.cpChuaChiaTheoVai}
                />
                <BangGop
                  tieuDe={CHU.cpTheoModel}
                  giai={GIAI_THICH.cpTheoModelGiai}
                  o={du.per_model}
                  overall={du.overall}
                  cotDau={CHU.colModel}
                  maCotDau
                  rongVi={GIAI_THICH.cpChuaChiaTheoModel}
                />
                <DoTin du={du} snapshot={snapshot} />
              </>
            ) : null}
          </>
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
  if (du.state === 'ready') return null;

  const cau =
    du.state === 'no_file'
      ? GIAI_THICH.cpChuaChay
      : du.state === 'empty'
        ? GIAI_THICH.cpTepCoMaRong
        : GIAI_THICH.cpSchemaCu;

  return (
    <section className="sect">
      <p className="trongSect">{cau}</p>
      {/* Số liệu schema cũ vẫn có `updated_at` đọc được, và mốc đó là bằng chứng
          duy nhất cho câu "có chạy, chỉ không đọc được". Bỏ nó đi thì câu trên
          thành một lời khẳng định không có gì đỡ. */}
      {du.state === 'stale_schema' && du.updated_at ? (
        <dl className="kv kvcp">
          <dt>{CHU.cpCapNhatLuc}</dt>
          <dd className="m">{du.updated_at}</dd>
        </dl>
      ) : null}
    </section>
  );
}

/**
 * Một bảng cộng dồn — dùng chung cho theo-tác-tử và theo-model.
 *
 * `o === null` (chưa có phần chia nhỏ) KHÁC `{}` (có mà chưa cộng vai nào), nên
 * hai ca đó không dùng chung câu. Ở đây cả hai đều dẫn tới `rongVi`, nhưng chúng
 * đi qua hai nhánh riêng để lần sau ai muốn tách câu thì có chỗ tách.
 */
function BangGop({
  tieuDe,
  giai,
  o,
  overall,
  nhanO,
  cotDau,
  maCotDau,
  rongVi,
}: {
  tieuDe: string;
  giai: string;
  o: Record<string, UsageTotals> | null;
  overall: UsageTotals;
  nhanO?: (ma: string) => string;
  cotDau: string;
  maCotDau?: boolean;
  rongVi: string;
}) {
  const hang = o ? Object.entries(o) : [];

  return (
    <section className="sect">
      <h2>{tieuDe}</h2>
      <p className="steerhint">{giai}</p>

      {hang.length === 0 ? (
        <p className="trongSect">{rongVi}</p>
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
                    {CHU.colTokenVao}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colTokenRa}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colCacheDoc}
                  </th>
                  <th scope="col" className="num">
                    {CHU.colCacheGhi}
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
              {/* Tổng ở CHÂN bảng, không ở đầu trang: đây là mẫu số của cột
                  "Tỉ trọng" ngay bên trên nó, nên chỗ của nó là cạnh những con số
                  nó chia. Đặt lên đầu là biến nó thành hero-metric. */}
              <tfoot>
                <tr>
                  <td>{CHU.cpTongCong}</td>
                  <O t={overall} overall={overall} laTong />
                </tr>
              </tfoot>
            </table>
          </div>
          <ChiaKhongDuTong hang={hang} overall={overall} />
        </>
      )}
    </section>
  );
}

/**
 * Các ô số của một hàng.
 *
 * Mọi con số kiểm bằng `!= null`, KHÔNG bằng falsy — `$0` là một sự thật (đã gọi
 * model mà chưa tốn tiền, hoặc model miễn phí) còn "chưa có số liệu" là sự thật
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
  // Tỉ trọng cần mẫu số khác 0. `0/0` cho NaN và `phanTram` sẽ trả undefined,
  // nhưng chặn ở đây để ý đồ đọc được: không có tổng thì không có tỉ trọng nào
  // để nói, và "0%" là một câu sai chứ không phải một câu trống.
  const ti =
    overall.cost_usd > 0 && t.cost_usd != null ? t.cost_usd / overall.cost_usd : undefined;

  return (
    <>
      <td className="num">{tongTien(t.cost_usd) ?? CHU.khongCo}</td>
      <td className="num">
        {laTong ? <span className="trong">{CHU.khongCo}</span> : (phanTram(ti) ?? CHU.khongCo)}
      </td>
      <td className="num">{so(t.input) ?? CHU.khongCo}</td>
      <td className="num">{so(t.output) ?? CHU.khongCo}</td>
      {/* `cache_capable === false` nghĩa là KHÔNG ÁP DỤNG, không phải 0. In "0"
          ở đây nói "model có đệm mà không dùng được lần nào" — một chẩn đoán sai
          về một model đơn giản là không có tính năng đó. */}
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
        <span className="trong" title={GIAI_THICH.cpKhongHoTroDem}>
          {CHU.khongApDung}
        </span>
      </td>
    );
  }
  return <td className="num">{so(n) ?? CHU.khongCo}</td>;
}

/**
 * Phần chia nhỏ không cộng đủ tổng — nói ra, đừng nuốt.
 *
 * `overall` và tổng các ô con là hai phép cộng riêng ở tầng dưới, nên chúng có
 * thể lệch: một lượt gọi không gán được cho vai nào vẫn vào `overall`. Khi lệch,
 * một người đọc bảng sẽ tự cộng cột và thấy con số không khớp chân bảng, rồi kết
 * luận bảng sai. Nói trước thì cùng dữ liệu đó thành một tin vận hành.
 *
 * Ngưỡng theo xu, không theo `!==`: đây là số thực cộng dồn nên lệch ở chữ số
 * thứ mười lăm là chuyện của dấu phẩy động, không phải của dữ liệu.
 */
function ChiaKhongDuTong({
  hang,
  overall,
}: {
  hang: [string, UsageTotals][];
  overall: UsageTotals;
}) {
  const tong = hang.reduce((s, [, t]) => s + (t.cost_usd ?? 0), 0);
  const lech = overall.cost_usd - tong;
  if (Math.abs(lech) < 0.005) return null;
  return <p className="steerhint">{GIAI_THICH.cpChiaKhongDuTong(tongTien(lech) ?? '')}</p>;
}

/**
 * Độ tin của số liệu — phần khiến bề mặt này khác một bảng kế toán.
 *
 * Ba sự thật ở đây đều nói về giới hạn của những con số phía trên, và cả ba đều
 * không có ở bất cứ đâu khác trong giao diện.
 */
function DoTin({ du, snapshot }: { du: CostDoc; snapshot: Snapshot }) {
  const thieu = du.missing_assistant_usage;
  const dut = du.overall.cache_breaks;
  const xong = snapshot.book.completed_chapters;

  return (
    <section className="sect">
      <h2>{CHU.cpDoTin}</h2>

      {/* Cảnh báo trước, số liệu sau: nếu có lượt thiếu thì mọi con số phía trên
          là SÀN, và người đọc cần biết điều đó trước khi đọc tiếp. */}
      {thieu > 0 ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>
            <strong>{CHU.cpLuotThieu(thieu)}.</strong> {GIAI_THICH.cpThieuSoLieu}
          </span>
        </p>
      ) : null}

      <dl className="kv kvcp">
        <dt>{CHU.cpLuotThieuNhan}</dt>
        {/* `0` in ra là `0`, không phải `—`: "đã kiểm, không lượt nào thiếu" là
            một sự thật đáng đọc, và nó chính là câu bảo đảm cho các con số trên. */}
        <dd className="m">{so(thieu) ?? CHU.khongCo}</dd>

        <dt title={GIAI_THICH.cpChuoiDutDay}>{CHU.cpChuoiCacheDut}</dt>
        <dd className="m">
          {dut != null ? (
            so(dut)
          ) : (
            <span className="trong" title={GIAI_THICH.cpChuoiDutKhongDo}>
              {CHU.khongCo}
            </span>
          )}
        </dd>

        {du.updated_at ? (
          <>
            <dt>{CHU.cpCapNhatLuc}</dt>
            <dd className="m">{du.updated_at}</dd>
          </>
        ) : null}

        {/* Giá thành mỗi chương CÓ nguồn thật — nó là tổng chia số chương đã
            nghiệm thu — nhưng cửa sổ của nó phải viết ra cạnh nó, nếu không nó bị
            đọc thành "chương kế tiếp sẽ tốn chừng này". */}
        <dt>{CHU.cpGiaThanhChuong}</dt>
        <dd className="m">
          {snapshot.transport.cost_per_chapter != null ? (
            <>
              {donGia(snapshot.transport.cost_per_chapter)}{' '}
              <span className="cua">{CHU.cpCuaSoGiaThanh(xong)}</span>
            </>
          ) : (
            <span className="trong" title={GIAI_THICH.cpChuaDuChuongDeChia}>
              {CHU.khongCo}
            </span>
          )}
        </dd>
      </dl>

      {/* Chi phí theo TỪNG chương không có nguồn, và cờ capability nói đúng điều
          đó. Đây là cùng một câu mà bảng chương đã nói ở `GhiChuChiPhi` — nhắc
          lại ở đây vì đây là bề mặt người vận hành tới để tìm nó. */}
      {snapshot.capabilities.per_chapter_cost === false ? (
        <p className="steerhint">{GIAI_THICH.cpKhongTheoChuong}</p>
      ) : null}
    </section>
  );
}

/** Tốn nhiều nhất lên đầu: bề mặt này để tìm chỗ tiền đi, không để tra bảng chữ cái. */
function xepTheoChiPhi(hang: [string, UsageTotals][]): [string, UsageTotals][] {
  return [...hang].sort((a, b) => (b[1].cost_usd ?? 0) - (a[1].cost_usd ?? 0));
}

/** Chỉ nói điều đếm được, và nói kèm phạm vi của nó. */
function motTa(du: CostDoc): string | undefined {
  if (du.state !== 'ready') return undefined;
  const vai = du.per_agent ? Object.keys(du.per_agent).length : 0;
  const model = du.per_model ? Object.keys(du.per_model).length : 0;
  return CHU.cpMotTa(vai, model);
}
