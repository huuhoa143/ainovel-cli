'use client';

import { useState } from 'react';

import { BangChuong, GhiChuChiPhi } from '@/components/BangChuong';
import { CaiDat } from '@/components/CaiDat';
import { CauHinhXuong } from '@/components/CauHinhXuong';
import { CungDung } from '@/components/CungDung';
import { DieuKhien } from '@/components/DieuKhien';
import { HoiChan } from '@/components/HoiChan';
import { NhapXuat } from '@/components/NhapXuat';
import { TacPhamMoi } from '@/components/TacPhamMoi';
import { ChiPhi } from '@/components/ChiPhi';
import { DanY } from '@/components/DanY';
import { DocTruyen } from '@/components/DocTruyen';
import { HangChoVietLai } from '@/components/HangChoVietLai';
import { Inspector } from '@/components/Inspector';
import { KiemDinh } from '@/components/KiemDinh';
import { MucXem } from '@/components/MucXem';
import { NhanVat } from '@/components/NhanVat';
import { DongSuKien, NhatKy } from '@/components/NhatKy';
import { OCanThiep } from '@/components/OCanThiep';
import { Rail } from '@/components/Rail';
import { LuatTheGioi, PhucBut } from '@/components/TheGioi';
import { ThanhTren } from '@/components/ThanhTren';
import { ToSanXuat } from '@/components/ToSanXuat';
import { Transport } from '@/components/Transport';
import { VanPhong } from '@/components/VanPhong';
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
import { mayDangChay } from '@/lib/song';
import { useMay } from '@/lib/useMay';
import type { Snapshot } from '@/lib/types';
import { useStudio } from '@/lib/useStudio';

export default function Trang() {
  const s = useStudio();
  const may = useMay();

  // Chốt bản nháp từ cùng dựng: chuyển sang khu Tác phẩm mới với bản nháp đã có. Không tự
  // tạo luôn — người dùng còn phải đặt tên thư mục, và một cú tạo ngầm sẽ tiêu tiền mà họ
  // chưa xác nhận.
  const [nhapTuCungDung, datNhapTuCungDung] = useState('');
  const chotCungDung = (banNhap: string) => {
    datNhapTuCungDung(banNhap);
    s.chonKhu('tac-pham-moi');
  };

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

      {/* Chưa có tệp cấu hình thì dẫn THẲNG vào cài đặt, không hiện studio trống.
          Một studio không có khóa API không làm được gì cả, nên hiện nó ra rồi để người
          dùng tự đi tìm chỗ nhập khóa là bắt họ đoán. Đây là trạng thái "rỗng lần đầu"
          của brief thiết kế, và nó đứng TRƯỚC mọi nhánh khác vì nó chặn tất cả. */
      may.canCaiDat ? (
        <CauHinhXuong lanDau />
      ) : xuongTrong && may.choGhi ? (
        // Xưởng rỗng + ghi được → dẫn thẳng vào tạo tác phẩm. Hiện một trang trống kèm
        // một lệnh CLI là câu trả lời của bản chỉ-đọc; giờ studio tạo được nên để người
        // dùng tự đi tìm chỗ tạo là bắt họ đoán.
        <TacPhamMoi onXong={s.chonTacPham} />
      ) : xuongTrong ? (
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
            onChonTacPham={s.chonTacPham}
            onChotCungDung={chotCungDung}
            nhapSan={nhapTuCungDung}
            suKien={s.suKien}
            dangChay={mayDangChay(s.snapshot)}
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

      {/* Modal chặn: engine đang ĐỨNG chờ trả lời. Đặt ở tầng Trang chứ không trong một khu
          vì nó phải hiện bất kể người dùng đang xem bề mặt nào — một dây chuyền đứng chờ
          không được ẩn sau một lựa chọn điều hướng. */}
      <HoiChan tacPham={s.tacPham} choGhi={may.choGhi} />

      <Transport
        transport={s.snapshot?.transport}
        song={s.song}
        suKien={s.suKien}
        trong={xuongTrong}
      >
        {/* Điều khiển sống TRONG transport: đó là chỗ trả lời "dây chuyền còn sống không",
            nên nút bấm phải ở cùng chỗ với câu trả lời. Đặt nó trong một bề mặt riêng sẽ
            buộc người vận hành đổi khu để dừng một dây chuyền họ đang nhìn thấy đang chạy. */}
        <DieuKhien
          snapshot={s.snapshot}
          tacPham={s.tacPham}
          choGhi={may.choGhi}
          dangChay={s.snapshot ? mayDangChay(s.snapshot) : false}
          onDoi={s.taiLai}
        />
      </Transport>
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
  onChonTacPham,
  onChotCungDung,
  nhapSan,
  suKien,
  dangChay,
}: {
  khu: KhuMa;
  snapshot: Snapshot;
  tacPham: string | undefined;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
  onChonTacPham: (id: string) => void;
  onChotCungDung: (banNhap: string) => void;
  nhapSan: string;
  suKien: Parameters<typeof DongSuKien>[0]['suKien'];
  dangChay: boolean;
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
    case 'kiem-dinh':
      return (
        <KiemDinh
          snapshot={snapshot}
          chuongChon={chuongChon}
          onChonChuong={onChonChuong}
        />
      );
    case 'hang-cho-viet-lai':
      return (
        <HangChoVietLai
          snapshot={snapshot}
          chuongChon={chuongChon}
          onChonChuong={onChonChuong}
        />
      );
    case 'to-san-xuat':
      return <ToSanXuat snapshot={snapshot} />;
    case 'van-phong':
      return <VanPhong tacPham={tacPham} />;
    // Chi phí là bề mặt duy nhất trong ba bề mặt mới cần `snapshot`, và nó cần
    // đúng hai thứ: `capabilities.per_chapter_cost` để nói ra chi phí theo chương
    // không có nguồn, và `transport.cost_per_chapter` — con số CÓ nguồn thật —
    // để đặt cạnh cửa sổ của nó (tổng chia số chương đã nghiệm thu).
    case 'chi-phi':
      return <ChiPhi tacPham={tacPham} snapshot={snapshot} />;
    case 'cai-dat':
      return <CaiDat tacPham={tacPham} />;
    // Khu mức MÁY: cố ý KHÔNG nhận `tacPham`. Truyền vào sẽ mời người sau dùng nó rồi
    // biến một bề mặt toàn cục thành nửa-theo-tác-phẩm.
    case 'nhap-xuat':
      return <NhapXuat tacPham={tacPham} />;
    case 'cau-hinh':
      return <CauHinhXuong />;
    case 'tac-pham-moi':
      return <TacPhamMoi onXong={onChonTacPham} nhapSan={nhapSan} />;
    // Cùng dựng giai đoạn cần tác phẩm; cùng dựng mở sách thì không. Một khu cho cả hai,
    // chế độ suy từ việc có tác phẩm đang xem hay không.
    case 'cung-dung':
      return (
        <CungDung
          cheDo={tacPham ? 'giai-doan' : 'mo-sach'}
          tacPham={tacPham}
          onXong={onChotCungDung}
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
          tacPham={tacPham}
          chuongChon={chuongChon}
          onChonChuong={onChonChuong}
          suKien={suKien}
          dangChay={dangChay}
        />
      );
  }
}

function Canvas({
  snapshot,
  tacPham,
  chuongChon,
  onChonChuong,
  suKien,
  dangChay,
}: {
  snapshot: Snapshot;
  tacPham: string | undefined;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
  suKien: Parameters<typeof DongSuKien>[0]['suKien'];
  dangChay: boolean;
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
          dangChay={mayDangChay(snapshot)}
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
        <OCanThiep
          capabilities={snapshot.capabilities}
          tacPham={tacPham}
          dangChay={dangChay}
        />
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
