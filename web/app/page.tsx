'use client';

import { useState } from 'react';

import { BangChuong, GhiChuChiPhi } from '@/components/BangChuong';
import { DanY } from '@/components/DanY';
import { DocTruyen } from '@/components/DocTruyen';
import { Inspector } from '@/components/Inspector';
import { MucXem } from '@/components/MucXem';
import { NhanVat } from '@/components/NhanVat';
import { DongSuKien, NhatKy } from '@/components/NhatKy';
import { OCanThiep } from '@/components/OCanThiep';
import { Rail } from '@/components/Rail';
import { LuatTheGioi, PhucBut } from '@/components/TheGioi';
import { ThanhTren } from '@/components/ThanhTren';
import { Transport } from '@/components/Transport';
import { DangTai, KhongTaiDuoc, XuongTrong } from '@/components/XuongTrong';
import { Truc } from '@/components/Truc';
import { so } from '@/lib/dinhdang';
import { dungInspector, type Khu as KhuMa } from '@/lib/khu';
import { CHU, GIAI_THICH, nhanPhamViXem, nhanPhase } from '@/lib/nhan';
import {
  type MucXem as Muc,
  type PhamVi,
  locHang,
  phamViCua,
  soHangAn,
  vieccTonBiAn,
} from '@/lib/phamVi';
import type { Snapshot } from '@/lib/types';
import { useStudio } from '@/lib/useStudio';

export default function Trang() {
  const s = useStudio();

  const sachDangXem = s.workshop?.books.find((b) => b.id === s.tacPham);
  const xuongTrong = s.workshop && s.workshop.books.length === 0;

  // Cột inspector chỉ tồn tại ở khu dùng nó. Các bề mặt khác tự mang chi tiết
  // của mình, nên giữ lại 292px trống ở đó là lấy mất 1/5 bề rộng để hiện một
  // panel không nói gì.
  const coInsp = !!s.snapshot && !xuongTrong && dungInspector(s.khu);

  // Thanh trên và transport luôn hiện, kể cả khi canvas chưa có gì: chúng là
  // câu trả lời cho "dây chuyền còn sống không", câu hỏi đầu tiên khi mở studio.
  return (
    <div className={`khung${coInsp ? '' : ' rong'}`}>
      <ThanhTren
        workshop={s.workshop}
        dangXem={sachDangXem}
        ketNoi={s.ketNoi}
        onChon={s.chonTacPham}
      />

      {xuongTrong ? (
        <XuongTrong root={s.workshop?.root} />
      ) : s.loi && !s.snapshot ? (
        <KhongTaiDuoc loi={s.loi} onThuLai={s.taiLai} />
      ) : !s.snapshot ? (
        <DangTai />
      ) : (
        <>
          <Rail
            snapshot={s.snapshot}
            hoSo={s.hoSo}
            khu={s.khu}
            onChonKhu={s.chonKhu}
          />
          <Khu
            khu={s.khu}
            snapshot={s.snapshot}
            tacPham={s.tacPham}
            chuongChon={s.chuongChon}
            onChonChuong={s.chonChuong}
            suKien={s.suKien}
          />
          {coInsp ? (
            <Inspector
              snapshot={s.snapshot}
              tacPham={s.tacPham}
              chuongChon={s.chuongChon}
            />
          ) : null}
        </>
      )}

      <Transport
        transport={s.snapshot?.transport}
        song={s.song}
        suKien={s.suKien}
        trong={xuongTrong}
      />
    </div>
  );
}

/**
 * Bề mặt của khu đang mở.
 *
 * Chỉ khu được chọn được render — không phải ẩn bằng CSS. Panel bị treo
 * transition trên tab ẩn từng làm mất trắng cả khối khi render headless, và một
 * bề mặt bị ẩn vẫn giữ nguyên hiệu ứng cuộn của nó.
 */
function Khu({
  khu,
  snapshot,
  tacPham,
  chuongChon,
  onChonChuong,
  suKien,
}: {
  khu: KhuMa;
  snapshot: Snapshot;
  tacPham: string | undefined;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
  suKien: Parameters<typeof DongSuKien>[0]['suKien'];
}) {
  switch (khu) {
    case 'ban-thao':
      return (
        <DocTruyen
          snapshot={snapshot}
          tacPham={tacPham}
          chuongChon={chuongChon}
          onChonChuong={onChonChuong}
        />
      );
    case 'dan-y':
      return <DanY snapshot={snapshot} tacPham={tacPham} />;
    case 'nhan-vat':
      return <NhanVat tacPham={tacPham} />;
    case 'luat-the-gioi':
      return <LuatTheGioi tacPham={tacPham} />;
    case 'phuc-but':
      return <PhucBut tacPham={tacPham} />;
    default:
      return (
        <Canvas
          snapshot={snapshot}
          chuongChon={chuongChon}
          onChonChuong={onChonChuong}
          suKien={suKien}
        />
      );
  }
}

function Canvas({
  snapshot,
  chuongChon,
  onChonChuong,
  suKien,
}: {
  snapshot: Snapshot;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
  suKien: Parameters<typeof DongSuKien>[0]['suKien'];
}) {
  const canhBao = snapshot.warnings ?? [];

  // Mặc định "Tập" như bản mockup. `layered_outline === false` thì không có
  // tập/cung nào để lọc, và mức người dùng chọn có thể mất phạm vi khi engine
  // sang tập mới — cả hai ca đều rơi về "Chương", tức không lọc gì.
  const [mucMuon, setMucMuon] = useState<Muc>('tap');
  const phanTang = snapshot.capabilities.layered_outline;
  const pvMuon = phamViCua(snapshot.timeline, mucMuon);
  const muc: Muc = !phanTang || pvMuon.khongRo ? 'chuong' : mucMuon;
  const pv = phamViCua(snapshot.timeline, muc);

  const hang = locHang(snapshot.chapters, pv);
  const an = soHangAn(snapshot.chapters, pv);
  const ton = vieccTonBiAn(snapshot.chapters, pv);

  return (
    <main className="canvas" id="dong-san-xuat">
      <div className="head">
        <h1>{CHU.dongSanXuat}</h1>
        <span className="sub">{motTa(snapshot)}</span>
        {phanTang ? (
          <MucXem timeline={snapshot.timeline} hienTai={muc} onChon={setMucMuon} />
        ) : null}
      </div>

      {/* Dữ liệu lệch là tin vận hành, không phải chi tiết nội bộ — hiện ngay
          dưới đầu trang thay vì nuốt đi. */}
      {canhBao.length > 0 ? (
        <section className="canhbao" aria-label={GIAI_THICH.duLieuLech}>
          <h2>
            <span aria-hidden="true">■</span>
            {GIAI_THICH.duLieuLech} · {canhBao.length}
          </h2>
          <ul>
            {canhBao.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="sect">
        <h2>{CHU.trucSanXuat}</h2>
        <Truc
          timeline={snapshot.timeline}
          capabilities={snapshot.capabilities}
          chuongChon={chuongChon}
          onChonChuong={onChonChuong}
        />
      </section>

      <section className="sect">
        <h2>{tieuDeBang(pv)}</h2>
        <BangChuong
          rows={hang}
          capabilities={snapshot.capabilities}
          chuongChon={chuongChon}
          onChon={onChonChuong}
          khiTrong={
            snapshot.chapters.length > 0 ? GIAI_THICH.bangTrongPhamVi : undefined
          }
        />
        <NgoaiPhamVi pv={pv} an={an} ton={ton} onBoLoc={() => setMucMuon('chuong')} />
        <GhiChuChiPhi capabilities={snapshot.capabilities} />
      </section>

      <section className="sect" id="nhat-ky-phan-quyet">
        <h2>
          {CHU.nhatKyPhanQuyet} · <span className="phu">Arbiter</span>
        </h2>
        <NhatKy decisions={snapshot.decisions} />
      </section>

      <section className="sect">
        <h2>
          Dòng sự kiện · <span className="phu">trực tiếp từ engine</span>
        </h2>
        <DongSuKien suKien={suKien} />
      </section>

      <section className="sect">
        <h2>
          {CHU.canThiep} · <span className="phu">nói vào dây chuyền đang chạy</span>
        </h2>
        <OCanThiep capabilities={snapshot.capabilities} />
      </section>

      {/* Chỗ trống cuối để hàng cuối bảng không dính vào transport. */}
      <div style={{ height: 8 }} />
    </main>
  );
}

/** "Trấn Yêu Ký · đang viết · 300 chương · 6 tập" — chỉ nói điều biết được. */
function motTa(snap: Snapshot): string {
  const b = snap.book;
  const phan: string[] = [b.name || b.id, nhanPhase(b.phase)];
  if (b.total_chapters > 0) phan.push(`${so(b.total_chapters)} chương`);
  if (snap.capabilities.layered_outline && snap.timeline.volumes.length > 0) {
    phan.push(`${snap.timeline.volumes.length} tập`);
  }
  if (b.total_words > 0) phan.push(`${so(b.total_words)} từ`);
  return phan.join(' · ');
}

/**
 * Tiêu đề bảng chương — nói đúng phần ĐANG HIỆN, không phải phần mong là đang
 * hiện.
 *
 * Bản trước suy tiêu đề từ khối đang chạy ("Chương trong cung 2 · tập 3") trong
 * khi bảng vẫn liệt kê mọi chương có dấu vết sản xuất trên toàn tác phẩm. Với
 * fixture, cung 2 là chương 45–50 mà bảng chứa cả chương 41 và 44 — tiêu đề
 * khẳng định một phạm vi mà dữ liệu không có. Giờ tiêu đề đi theo phép lọc thật.
 */
function tieuDeBang(pv: PhamVi): string {
  if (pv.index === undefined || pv.from === undefined || pv.to === undefined) {
    return `${CHU.chuong} · mọi chương có dấu vết sản xuất`;
  }
  return `${CHU.chuong} trong ${nhanPhamViXem(pv.muc, pv.index)} · ${pv.from}–${pv.to}`;
}

/**
 * Dòng nói ra những gì phép lọc đã ẩn.
 *
 * Bắt buộc phải có: ẩn im lặng một chương chờ viết lại là đúng cái lỗi mà Rail
 * đã tránh — người vận hành bỏ qua một hàng chờ thật vì bề mặt không nói. Số
 * việc tồn được tách riêng vì nó là loại tin khác: chương đã nghiệm thu ở tập
 * trước nằm ngoài phạm vi là chuyện bình thường, chương chờ viết lại thì không.
 */
function NgoaiPhamVi({
  pv,
  an,
  ton,
  onBoLoc,
}: {
  pv: PhamVi;
  an: number;
  ton: number;
  onBoLoc: () => void;
}) {
  if (an <= 0 || pv.index === undefined) return null;
  return (
    <p className={`phamvihint${ton > 0 ? ' con-ton' : ''}`}>
      {ton > 0 ? (
        <span className="ky" aria-hidden="true">
          ■
        </span>
      ) : null}
      {CHU.ngoaiPhamVi(an, nhanPhamViXem(pv.muc, pv.index))}
      {ton > 0 ? ` — ${CHU.conTonNgoaiPhamVi(ton)}` : ''}.{' '}
      <button type="button" onClick={onBoLoc}>
        {CHU.hienTatCa}
      </button>
    </p>
  );
}
