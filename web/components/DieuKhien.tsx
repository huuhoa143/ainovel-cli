'use client';

import { useEffect, useState } from 'react';

import {
  LoiApi,
  choDiTiep,
  chaySach,
  doiCheDoTien,
  dongMay,
  dungSach,
  moMay,
} from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { Snapshot } from '@/lib/types';

/**
 * Điều khiển dây chuyền — Chạy / Dừng / Cho đi tiếp / chế độ nghiệm thu.
 *
 * # Vì sao ở thanh transport chứ không phải trong một bề mặt
 *
 * `PRODUCT.md` chốt điểm neo là bàn transport của DAW, và ở DAW thì transport là chỗ bấm
 * play–stop. Thanh này đã luôn hiện và đã trả lời "dây chuyền còn sống không"; nút bấm
 * thuộc về cùng chỗ với câu trả lời đó. Đặt chúng trong một bề mặt riêng sẽ buộc người
 * vận hành đổi khu để dừng một dây chuyền mà họ đang nhìn thấy đang chạy.
 *
 * # Vì sao đọc chế độ đi tiếp từ snapshot — và câu này TỪNG nói ngược lại
 *
 * Bản trước ghi: *"`Snapshot.transport` không mang `advance_mode`; nó nằm ở `/settings` (đọc
 * `meta/run.json`). Suy nó từ chỗ khác sẽ là bịa."* Cả ba câu đều đúng với tiền đề của
 * chúng, và **tiền đề đã đổi**: kế hoạch 1/4 đưa `advance` vào `/studio`, nên chế độ giờ có
 * mặt trong chính snapshot mà thanh này đã nhận. Vế "suy từ chỗ khác là bịa" vẫn đúng nguyên
 * văn — nó chỉ thôi trỏ vào `/settings`.
 *
 * Giữ nguyên `/settings` sau khi có `advance` mới là chỗ hỏng, và hỏng theo đúng lớp lỗi
 * "hai sự thật" mà quyết định 6 của spec đã tránh khi từ chối tách endpoint riêng cho các
 * trường sống: nút `Cho đi tiếp` ở dải nghiệm thu đọc `snapshot.advance`, còn nhãn chế độ ở
 * đây đọc `/settings`, nên hai chỗ trên CÙNG một màn hình có thể nói khác nhau về cùng một
 * chế độ. Hai endpoint đọc cùng một engine ở hai thời điểm lệch nhau thì có ngày lệch.
 *
 * Và hai nguồn đó không tương đương như vẻ ngoài: `/settings` đọc `meta/run.json` — một TỆP
 * còn lại từ lượt trước — còn `snapshot.advance` đến thẳng từ engine đang mở
 * (`serve.go:325` chỉ gán nó khi `may.dangMo(id)` thành công). Đường mới mất thông tin ở ca
 * engine đóng, và đó là điều ĐÚNG: xem chú thích của `bietCheDo` dưới đây.
 *
 * Không còn lượt đọc mạng nào cho chế độ, nên câu "chỉ đọc một lần khi mở và sau mỗi lượt
 * đổi — không dò liên tục" cũng hết việc: sau một lượt đổi, `onDoi()` nạp lại snapshot theo
 * đúng đường mà mọi lệnh khác trên trang đã dùng.
 */
export function DieuKhien({
  snapshot,
  tacPham,
  choGhi,
  dangChay,
  onDoi,
}: {
  snapshot: Snapshot | undefined;
  tacPham: string | undefined;
  choGhi: boolean | undefined;
  dangChay: boolean;
  /** Gọi sau mỗi lệnh để bề mặt chính nạp lại — trạng thái vừa đổi ở phía engine. */
  onDoi: () => void;
}) {
  const [dangGui, datDangGui] = useState<string | null>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [maMoy, datMoMay] = useState<boolean | null>(null);

  // Engine có đang mở hay không: suy từ việc `/settings` có `advance_mode` thì KHÔNG đủ
  // (tệp run.json còn lại từ lượt trước). Hỏi thẳng `/api/engine` là câu trả lời thật.
  //
  // GHI CHO NGƯỜI SAU: `snapshot.advance !== null` bây giờ TRẢ LỜI ĐƯỢC chính câu này —
  // `serve.go:325` chỉ gán trường đó khi `may.dangMo(id)` thành công, tức đúng điều kiện mà
  // `/api/engine` đang được hỏi để biết. Nên `maMoy` là nguồn thứ hai của "engine có mở
  // không", cùng lớp với nguồn thứ hai của `advance_mode` mà Task 6 vừa bỏ. KHÔNG gộp ở đây:
  // nhánh `maMoy === false` mang một sửa lỗi vòng đời có lời người dùng kèm theo ("không biết
  // luồng chạy như nào… rời rạc"), và gộp nó là đổi luồng Chạy/Mở máy — việc mà cụm này không
  // sở hữu và Task 8 không có E2E cho. Ghi ra để ai sở hữu luồng đó nhặt.
  useEffect(() => {
    if (!tacPham || !choGhi) return;
    let huy = false;
    fetch('/api/engine', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { open?: { book: string }[] } | null) => {
        if (huy || !d) return;
        datMoMay((d.open ?? []).some((m) => m.book === tacPham));
      })
      .catch(() => {});
    return () => {
      huy = true;
    };
  }, [tacPham, choGhi, dangChay]);

  if (!choGhi || !tacPham || !snapshot) return null;

  const goi = (ten: string, fn: () => Promise<unknown>) => {
    datDangGui(ten);
    datLoi(null);
    fn()
      .then(() => onDoi())
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(null));
  };

  const khoa = dangGui !== null;

  /**
   * Chế độ có ĐO ĐƯỢC hay không — khác hẳn với "chế độ là auto".
   *
   * `advance === null` nghĩa engine ĐÓNG cho cuốn này, nên không có chế độ nào để nói. Nhãn
   * chế độ vì thế KHÔNG được vẽ ở ca đó: in "Tự chạy liên tục" lên một engine đã đóng là
   * khẳng định một điều chưa ai đo, và người vận hành đọc nó thành "nó sẽ viết liên tục".
   *
   * Cái nút ấy còn không bấm được ở ca đó: `PUT /advance-mode` tự đòi `may.dangMo(book)`
   * (`vongdoi.go:41`), nên trên engine đóng nó chắc chắn trả lỗi. Ẩn nó là nói thật hai lần.
   *
   * Ẩn chứ không vẽ một dấu "không đo được": nhánh `maMoy === false` ngay dưới đã là bề mặt
   * cho ca engine đóng, và nó nói ra bằng nút `Mở máy` — một câu rõ hơn một dấu gạch.
   */
  const bietCheDo = snapshot.advance !== null;
  const choNghiemThu = snapshot.advance?.mode === 'review';

  return (
    <div className="dieukhien" role="group" aria-label={CHU.dieuKhien}>
      {loi ? (
        <span className="dkLoi" title={loi}>
          {loi}
        </span>
      ) : null}

      {maMoy === false ? (
        // Chưa mở máy: CHẠY vẫn là nút hạng nhất, và "Mở máy" hạ xuống hàng phụ.
        //
        // Bản trước chỉ hiện đúng một nút "Mở máy cho tác phẩm này", và đó là một ngõ chết
        // đọc bằng tiếng của người dựng máy: người dùng muốn viết tiếp thì phải học rằng có
        // một bước tên "mở máy" đứng trước. Người dùng nói nguyên văn: "không biết luồng
        // chạy như nào… rời rạc".
        //
        // Điều làm nó thành ngõ chết KHÔNG cần thiết: `boMay.chay` (engine.go:242) tự gọi
        // `mo(id)` trước khi Resume, nên `POST /run` trên một engine đang đóng vẫn chạy
        // được. Bức tường hai bước là do giao diện tự dựng, không do server đòi.
        //
        // "Mở máy" vẫn còn vì lý do nó ra đời: gắn engine KHÔNG gọi model lần nào, nên đó là
        // đường sửa model theo vai mà không tiêu tiền. Nó chỉ thôi làm nút duy nhất.
        <>
          <button
            type="button"
            className="dkNut dkChay"
            disabled={khoa}
            title={GIAI_THICH.taoSachSeTieuTien}
            onClick={() =>
              goi('chay', () => chaySach(tacPham).then(() => datMoMay(true)))
            }
          >
            {dangGui === 'chay' ? CHU.dangGui : `▶ ${CHU.chay}`}
          </button>
          <button
            type="button"
            className="dkNut dkPhu"
            disabled={khoa}
            title={GIAI_THICH.vongDoiCanMoMay}
            onClick={() => goi('mo', () => moMay(tacPham).then(() => datMoMay(true)))}
          >
            {dangGui === 'mo' ? CHU.dangGui : CHU.moMay}
          </button>
        </>
      ) : (
        <>
          {/* Chạy và Dừng loại trừ nhau theo trạng thái thật, không phải hai nút luôn
              hiện: một nút Dừng bấm được khi không có gì chạy là một nút nói dối. */}
          {dangChay ? (
            <button
              type="button"
              className="dkNut dkDung"
              disabled={khoa}
              onClick={() => goi('dung', () => dungSach(tacPham))}
            >
              {dangGui === 'dung' ? CHU.dangGui : `■ ${CHU.dung}`}
            </button>
          ) : (
            <button
              type="button"
              className="dkNut dkChay"
              disabled={khoa}
              title={GIAI_THICH.taoSachSeTieuTien}
              onClick={() => goi('chay', () => chaySach(tacPham))}
            >
              {dangGui === 'chay' ? CHU.dangGui : `▶ ${CHU.chay}`}
            </button>
          )}

          {/* Cho đi tiếp CHỈ có nghĩa ở chế độ nghiệm thu. Ở chế độ tự chạy engine không
              chờ giấy phép nào, nên một nút cấp phép ở đó không làm gì cả. */}
          {choNghiemThu ? (
            <button
              type="button"
              className="dkNut"
              disabled={khoa}
              onClick={() => goi('tiep', () => choDiTiep(tacPham))}
            >
              {dangGui === 'tiep' ? CHU.dangGui : CHU.choDiTiep}
            </button>
          ) : null}

          {/* Nhãn chế độ chỉ hiện khi đo được — xem `bietCheDo`. KHÔNG `datCheDo(r.mode)` sau
              khi đổi: `SetAdvanceMode` chạm engine THẬT và `snapshot.advance.mode` đọc từ cùng
              `p.eng.Snapshot()` đó, nên `onDoi()` của `goi` đã mang về đúng giá trị mới. Giữ
              một bản thứ hai trong state là dựng lại đúng cái nguồn thứ hai vừa bỏ. */}
          {bietCheDo ? (
            <button
              type="button"
              className={`dkNut${choNghiemThu ? ' dkBat' : ''}`}
              disabled={khoa}
              title={choNghiemThu ? GIAI_THICH.cheDoReviewLaGi : GIAI_THICH.cheDoAutoLaGi}
              onClick={() =>
                goi('chedo', () =>
                  doiCheDoTien(tacPham, choNghiemThu ? 'auto' : 'review'),
                )
              }
            >
              {dangGui === 'chedo'
                ? CHU.dangGui
                : choNghiemThu
                  ? CHU.cheDoNghiemThu
                  : CHU.cheDoTuChay}
            </button>
          ) : null}

          {/* Đóng máy nhả khóa tệp và nhả suất engine cho cuốn khác. Không có nó thì mở
              cuốn A rồi không bao giờ mở được cuốn B mà không tắt cả studio. */}
          <button
            type="button"
            className="dkNut dkPhu"
            disabled={khoa || dangChay}
            title={dangChay ? GIAI_THICH.vongDoiCanMoMay : undefined}
            onClick={() => goi('dong', () => dongMay(tacPham).then(() => datMoMay(false)))}
          >
            {dangGui === 'dong' ? CHU.dangGui : CHU.dongMay}
          </button>
        </>
      )}
    </div>
  );
}
