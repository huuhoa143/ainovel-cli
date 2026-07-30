'use client';

import { useEffect, useState } from 'react';

import { layChuong } from '@/lib/api';
import { soTu } from '@/lib/dinhdang';
import { CHU, GIAI_THICH, TRANG_THAI_CHUONG } from '@/lib/nhan';
import type { ChapterDetail, Contract, Review, Selection, Snapshot } from '@/lib/types';

import { BanDuyet } from './BanDuyet';
import { TrangThai } from './TrangThai';

type Tab = 'hopdong' | 'kiemdinh' | 'banthao';

/**
 * Inspector: chi tiết chương đang chọn, ba tab Hợp đồng / Kiểm định / Bản thảo.
 *
 * Nội dung KHÔNG bị gate sau animation và tab không dùng transition ẩn/hiện:
 * panel bị treo transition trên tab ẩn sẽ làm mất trắng cả khối khi render
 * headless hoặc khi tab nền bị trình duyệt hoãn. Ở đây tab nào không được chọn
 * thì không render, tab được chọn hiện ngay.
 */
export function Inspector({
  snapshot,
  tacPham,
  chuongChon,
}: {
  snapshot: Snapshot | undefined;
  tacPham: string | undefined;
  chuongChon: number | undefined;
}) {
  const [tab, setTab] = useState<Tab>('hopdong');
  const sel = snapshot?.selected;

  return (
    <aside className="insp" aria-label="Chi tiết chương">
      {/* Tiêu đề panel và thân panel phải nói CÙNG MỘT điều.
          Bản trước hiện "Chương / chưa đặt tiêu đề" ở tiêu đề trong khi thân nói
          "Chưa chọn chương" — và câu ở tiêu đề là câu sai: nó khẳng định có một
          chương đang mở, chỉ là chương đó chưa được đặt tên. Giờ ca chưa chọn có
          đúng một câu trạng thái (ở tiêu đề) và đúng một câu hướng dẫn (ở thân). */}
      <div className="ihead">
        {chuongChon ? (
          <>
            <div className="no">{viTri(snapshot, chuongChon)}</div>
            <h2>
              {sel?.title ? sel.title : <span className="draft">{CHU.chuaDatTieuDe}</span>}
            </h2>
            <TrangThaiChuong snapshot={snapshot} chuong={chuongChon} />
          </>
        ) : (
          <h2 className="chuachon">{GIAI_THICH.chuaChonChuongTieuDe}</h2>
        )}
      </div>

      {/* Tab bị vô hiệu khi chưa chọn chương: ba tab trông bấm được mà bấm nào
          cũng ra cùng một câu là một lời hứa hụt nhỏ, lặp ba lần. */}
      <div className="tabs" role="tablist" aria-label="Mặt của chương">
        <TabNut
          tab="hopdong"
          hienTai={tab}
          onChon={setTab}
          nhan={CHU.tabHopDong}
          tat={!chuongChon}
        />
        <TabNut
          tab="kiemdinh"
          hienTai={tab}
          onChon={setTab}
          nhan={CHU.tabKiemDinh}
          tat={!chuongChon}
        />
        <TabNut
          tab="banthao"
          hienTai={tab}
          onChon={setTab}
          nhan={CHU.tabBanThao}
          tat={!chuongChon}
        />
      </div>

      {!chuongChon ? (
        <div className="ibody">
          <p className="trong">{GIAI_THICH.chuaChonChuong}</p>
        </div>
      ) : tab === 'hopdong' ? (
        <TabHopDong contract={sel?.contract} sel={sel} />
      ) : tab === 'kiemdinh' ? (
        <TabKiemDinh review={sel?.review} />
      ) : (
        <TabBanThao tacPham={tacPham} chuong={chuongChon} excerpt={sel?.excerpt} />
      )}
    </aside>
  );
}

function TabNut({
  tab,
  hienTai,
  onChon,
  nhan,
  tat,
}: {
  tab: Tab;
  hienTai: Tab;
  onChon: (t: Tab) => void;
  nhan: string;
  tat?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={!tat && tab === hienTai}
      disabled={tat}
      title={tat ? GIAI_THICH.tabChuaChonChuong : undefined}
      onClick={() => onChon(tab)}
    >
      {nhan}
    </button>
  );
}

/** "Chương 47 · tập 3 · cung 2" — suy từ trục, không bịa khi chưa biết. */
function viTri(snapshot: Snapshot | undefined, chuong: number): string {
  const phan = [`${CHU.chuong} ${chuong}`];
  if (snapshot?.capabilities.layered_outline) {
    const tap = snapshot.timeline.volumes.find(
      (v) => v.from && v.to && chuong >= v.from && chuong <= v.to,
    );
    if (tap) phan.push(`tập ${tap.index}`);
    const cung = snapshot.timeline.arcs.find(
      (a) => a.from && a.to && chuong >= a.from && chuong <= a.to,
    );
    if (cung) phan.push(`cung ${cung.index}`);
  }
  return phan.join(' · ');
}

function TrangThaiChuong({
  snapshot,
  chuong,
}: {
  snapshot: Snapshot | undefined;
  chuong: number;
}) {
  const row = snapshot?.chapters.find((r) => r.chapter === chuong);
  if (!row) return null;
  return <TrangThai tt={TRANG_THAI_CHUONG[row.stage]} />;
}

/* ── tab Hợp đồng ─────────────────────────────────────────────────────── */

function TabHopDong({
  contract,
  sel,
}: {
  contract: Contract | undefined;
  sel: Selection | undefined;
}) {
  if (!contract) {
    return (
      <div className="ibody">
        <p className="trong">{GIAI_THICH.chuaCoHopDong}</p>
        {sel?.words ? <SoTuDaViet words={sel.words} /> : null}
      </div>
    );
  }

  return (
    <div className="ibody">
      <h3>{CHU.yeuCauChuong}</h3>
      <dl className="kv">
        {contract.core_event ? (
          <>
            <dt title={CHU.sukienTrongTamDay}>{CHU.sukienTrongTam}</dt>
            <dd>{contract.core_event}</dd>
          </>
        ) : null}
        {contract.hook ? (
          <>
            <dt>{CHU.kieuMocCuoi}</dt>
            <dd>{contract.hook}</dd>
          </>
        ) : null}
        {sel?.words ? (
          <>
            <dt>{CHU.colSoTu}</dt>
            <dd className="m">{soTu(sel.words)}</dd>
          </>
        ) : null}
      </dl>

      {contract.scenes && contract.scenes.length > 0 ? (
        <>
          <h3>{CHU.canhTrongChuong}</h3>
          <ol className="canh">
            {contract.scenes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}

function SoTuDaViet({ words }: { words: number }) {
  return (
    <dl className="kv" style={{ marginTop: 14 }}>
      <dt>{CHU.colSoTu}</dt>
      <dd className="m">{soTu(words)}</dd>
    </dl>
  );
}

/* ── tab Kiểm định ────────────────────────────────────────────────────── */

/**
 * Kiểm định là hàng mảnh có kết luận kèm dẫn chứng, KHÔNG phải thẻ điểm.
 * Điểm số đứng sau kết luận và ở cỡ nhỏ hơn: kết luận là thứ người vận hành
 * cần, con số chỉ để so sánh giữa các lần chạy.
 *
 * Thân bản duyệt nằm ở `BanDuyet` vì khu Kiểm định vẽ cùng một thứ ở bề rộng
 * khác. Ở đây chỉ còn ca "chưa có bản duyệt" và cái vỏ `.ibody`.
 */
function TabKiemDinh({ review }: { review: Review | undefined }) {
  if (!review) {
    return (
      <div className="ibody">
        <p className="trong">{GIAI_THICH.chuaCoDuyet}</p>
      </div>
    );
  }

  return (
    <div className="ibody">
      <BanDuyet review={review} />
    </div>
  );
}

/* ── tab Bản thảo ─────────────────────────────────────────────────────── */

/**
 * Trích đoạn có sẵn trong snapshot; toàn văn phải gọi riêng
 * /api/books/{book}/chapters/{n}, nên chỉ gọi khi người dùng thật sự mở tab
 * này. Trích đoạn hiện ngay để không có khoảng trống chờ mạng.
 */
function TabBanThao({
  tacPham,
  chuong,
  excerpt,
}: {
  tacPham: string | undefined;
  chuong: number;
  excerpt: string | undefined;
}) {
  const [toanVan, setToanVan] = useState<ChapterDetail>();
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string>();

  useEffect(() => {
    setToanVan(undefined);
    setLoi(undefined);
  }, [tacPham, chuong]);

  const doc = () => {
    if (!tacPham) return;
    setDangTai(true);
    setLoi(undefined);
    layChuong(tacPham, chuong)
      .then(setToanVan)
      .catch((e: unknown) => setLoi(e instanceof Error ? e.message : String(e)))
      .finally(() => setDangTai(false));
  };

  if (toanVan) {
    const doan = toanVan.text
      .split(/\n{2,}/)
      .map((d) => d.trim())
      .filter(Boolean);

    if (doan.length === 0) {
      return (
        <div className="ibody">
          <p className="trong">{GIAI_THICH.chuaCoBanThao}</p>
        </div>
      );
    }

    return (
      <div className="banthao">
        {doan.map((d, i) => (
          // `mocua` là lớp đặt tay cho đúng một đoạn: bộ chọn vị trí từng khớp
          // nhiều phần tử và biến số liệu thành drop cap khổng lồ.
          <p key={i} className={i === 0 ? 'doan mocua' : 'doan'}>
            {d}
          </p>
        ))}
        {toanVan.words ? (
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>{CHU.colSoTu}</dt>
            <dd className="m">{soTu(toanVan.words)}</dd>
          </dl>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ibody">
      <h3>{CHU.trichDoan}</h3>
      {excerpt ? (
        <p className="excerpt">{excerpt}</p>
      ) : (
        <p className="trong">{GIAI_THICH.chuaCoBanThao}</p>
      )}
      {loi ? <p className="trong">{loi}</p> : null}
      <button type="button" className="docthem" onClick={doc} disabled={dangTai}>
        {dangTai ? 'đang đọc…' : 'Đọc toàn văn chương'}
      </button>
    </div>
  );
}
