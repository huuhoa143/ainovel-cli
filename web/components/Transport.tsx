'use client';

import { daChay, donGia, nangSuat, phanTram, so, tongTien } from '@/lib/dinhdang';
import { CHU, GIAI_THICH, TRANG_THAI_MAY, giaiCongDoan, nhanVai } from '@/lib/nhan';
import { nguCanhMoiNhat } from '@/lib/nguCanh';
import type { StreamEvent, Transport as TransportData } from '@/lib/types';
import type { CongDoanSong } from '@/lib/useStudio';

/**
 * Thanh transport — trạng thái máy luôn hiện, không cuộn mất.
 *
 * Điểm dễ sai nhất: `transport.last_step` là công đoạn VỪA HOÀN THÀNH, không
 * phải công đoạn đang chạy. Store chỉ ghi checkpoint khi một bước thành công,
 * nên gọi nó là "đang chạy" từng làm giao diện hiện "commit" trong khi engine
 * đang draft chương kế tiếp.
 *
 * Dòng sự kiện ghi đè khi có dữ liệu mới, nhưng nhãn cũng phải theo sự thật của
 * chính sự kiện đó: observer cố ý KHÔNG ghi sự kiện "bắt đầu" vào runtime queue
 * (internal/host/observer.go:191 — để replay không bị nhân đôi), nên phần lớn
 * sự kiện đến cũng là bước vừa xong. Chỉ khi payload còn dở (có ID, FinishedAt
 * là zero value) thì mới được gọi là đang chạy.
 */
export function Transport({
  transport,
  song,
  suKien,
  trong,
  children,
}: {
  /**
   * Điều khiển dây chuyền, chèn từ ngoài.
   *
   * Nhận qua `children` chứ không tự dựng: transport là bề mặt CHỈ ĐỌC về trạng thái máy
   * và nó không nên biết gì về các route ghi. Giữ nó không phụ thuộc `api.ts` cũng là giữ
   * cho nó dựng được ở chế độ mock, nơi không có engine nào để bấm.
   */
  children?: React.ReactNode;
  transport: TransportData | undefined;
  song: CongDoanSong | undefined;
  suKien: StreamEvent[];
  /**
   * true khi xưởng đã đọc xong và KHÔNG có tác phẩm nào. Cần tách khỏi ca "chưa
   * đọc xong": để "đang đọc store…" đứng mãi ở thanh dưới là nói dối, vì lúc đó
   * không có store nào đang được đọc và câu đó sẽ không bao giờ đổi.
   */
  trong?: boolean;
}) {
  if (!transport) {
    return (
      <footer className="trans">
        <div className="cell">
          <span className="lbl">{trong ? CHU.khongCoGiTheoDoi : CHU.dangTai}</span>
        </div>
        {children}
      </footer>
    );
  }

  const may = TRANG_THAI_MAY[transport.state];
  const buoc = song?.buoc ?? transport.last_step;
  const dangChay = song?.dangChay ?? false;
  const nhanBuoc = dangChay ? 'đang chạy' : CHU.congDoanVuaXong;
  const chuGiaiBuoc = dangChay ? GIAI_THICH.buocDangChay : GIAI_THICH.buocVuaXong;
  const giai = song ? undefined : giaiCongDoan(transport.last_step);

  const vai = song?.vai ?? transport.agent;
  /* Câu đầy đủ của ô `tổ` cho `title` — ô bị chặn bề rộng nên tên model dài sẽ
     bị cắt trên màn hình, và đây là chỗ tra lại được. */
  const toDayDu = [vai ? nhanVai(vai) : null, transport.model].filter(Boolean).join(' · ');
  const nc = nguCanhMoiNhat(suKien);
  const nangSuatSo = nangSuat(transport.chapters_per_hour);
  const donGiaSo = donGia(transport.cost_per_chapter);
  const tong = tongTien(transport.cost_usd);
  const chay = daChay(transport.elapsed_ms);

  return (
    <footer className="trans" aria-label="Trạng thái dây chuyền">
      <div className="cell">
        <span
          className={`ky ${may.mau}${transport.state === 'running' ? ' dap' : ''}`}
          aria-hidden="true"
        >
          {may.ky}
        </span>
        <span className="m">{may.nhan}</span>
      </div>

      <div className="cell buoc" title={`${buoc ? `${buoc} — ` : ''}${chuGiaiBuoc}`}>
        <span className="lbl">{CHU.congDoan}</span>
        {buoc ? (
          <>
            <span className="m" title={giai}>
              {buoc}
            </span>
            <span className="lbl">{nhanBuoc}</span>
          </>
        ) : (
          <span className="m trong">{CHU.khongCo}</span>
        )}
      </div>

      {/* Tên model không có giới hạn trên — `gemini-2.5-pro` ăn 122px nhưng
          `Writer · gemini-2.5-flash-thinking` ăn 229px. Ô này vì thế bị chặn bề
          rộng giống `.cell.buoc`, và câu đầy đủ vào `title`. Chỉ tên MODEL bị
          cắt bằng ellipsis, không phải tên vai: vai là tập đóng (Architect /
          Writer / Editor / Arbiter / Engine) nên nó không bao giờ là thứ làm
          tràn, và cắt nó đi là mất phần mang tin mà không cần thiết. */}
      <div className="cell to" title={toDayDu || undefined}>
        <span className="lbl">{CHU.to}</span>
        {vai ? <span>{nhanVai(vai)}</span> : null}
        {vai && transport.model ? <span className="lbl">·</span> : null}
        {transport.model ? <span className="model">{transport.model}</span> : null}
        {!vai && !transport.model ? <span className="trong">{CHU.khongCo}</span> : null}
      </div>

      {/* Thước ngữ cảnh chỉ có kim khi engine đã báo một lần nén. */}
      <div
        className="cell"
        title={nc ? `${nc.goc} — ${GIAI_THICH.nguongNen}` : GIAI_THICH.nguongNen}
      >
        <span className="lbl">{CHU.nguCanh}</span>
        <span className="ctxbar">
          {nc ? <i style={{ width: `${Math.round(nc.ti * 100)}%` }} /> : null}
        </span>
        {nc ? (
          <span className={`m${nc.ti >= 0.85 ? ' warn' : ''}`}>{phanTram(nc.ti)}</span>
        ) : (
          <span className="m trong">{CHU.khongCo}</span>
        )}
        {/* Cặp token là số liệu PHỤ của thước này: tỉ lệ phần trăm mới là thứ trả
            lời "sắp nén chưa". Dưới 1240px nó bị ẩn để transport không tràn và
            cắt mất "đã chạy" ở cuối — câu đầy đủ vẫn nằm trong chú giải của ô. */}
        {nc?.dung && nc.cua ? (
          <span className="lbl token">
            {so(nc.dung)}/{so(nc.cua)}
          </span>
        ) : null}
      </div>

      <div className="cell push">
        <span className="lbl">{CHU.nangSuat}</span>
        {nangSuatSo ? (
          <span className="m">
            {nangSuatSo} {CHU.chuongMoiGio}
          </span>
        ) : (
          <span className="m trong" title="phiên quá ngắn để con số có nghĩa">
            {CHU.khongCo}
          </span>
        )}
      </div>

      <div className="cell">
        <span className="lbl">{CHU.giaThanh}</span>
        {donGiaSo ? (
          <span className="m">
            {donGiaSo} {CHU.moiChuong}
          </span>
        ) : (
          <span className="m trong">{CHU.khongCo}</span>
        )}
      </div>

      <div className="cell">
        <span className="lbl">{CHU.tong}</span>
        <span className="m">{tong ?? CHU.khongCo}</span>
      </div>

      <div className="cell">
        <span className="lbl">{CHU.daChay}</span>
        <span className="m">{chay ?? CHU.khongCo}</span>
      </div>

      {children}
    </footer>
  );
}
