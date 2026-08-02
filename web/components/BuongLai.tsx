'use client';

import { useState } from 'react';

import { BangChuong, GhiChuChiPhi } from '@/components/BangChuong';
import { MucXem } from '@/components/MucXem';
import { DongSuKien, NhatKy } from '@/components/NhatKy';
import { OCanThiep } from '@/components/OCanThiep';
import { Truc } from '@/components/Truc';
import { so } from '@/lib/dinhdang';
import type { Khu } from '@/lib/khu';
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
import type { Snapshot } from '@/lib/types';
import type { CongDoanSong } from '@/lib/useStudio';
import type { BoDemVan } from '@/lib/vanSong';

import { CuaNghiemThu } from './CuaNghiemThu';
import { DaiTrangThai } from './DaiTrangThai';
import { VanSong } from './VanSong';
import { ViecTiepTheo } from './ViecTiepTheo';

/**
 * BUỒNG LÁI — bề mặt `?khu=dong-san-xuat`.
 *
 * # Vì sao ĐỔI dải chứ không hiện cả hai
 *
 * Lúc máy nghỉ KHÔNG CÓ GÌ đang chảy để xem, và câu người dùng mang theo lúc đó là "giờ tôi
 * làm gì" — đúng câu `ViecTiepTheo` trả lời. Lúc máy chạy thì ngược lại: câu là "nó đang làm
 * gì", và một dải "việc tiếp theo" lúc đó là mời người dùng bấm một nút thứ hai trong khi một
 * lượt đang tiêu tiền.
 *
 * Hai nút cùng gọi `POST /run` không thấy trạng thái khóa-lúc-đang-gửi của nhau, nên bấm cả
 * hai là hai lượt chạy — tiền đôi vì một chi tiết giao diện. Đó là lý do `ViecTiepTheo` chỉ
 * điều hướng chứ không chạy engine, và là lý do nó biến mất hẳn khi máy đang chạy.
 *
 * # Vì sao cả thân `Canvas` chuyển vào đây
 *
 * `page.tsx` đã 509 dòng và giữ hai việc khác hẳn nhau: định tuyến mười sáu khu, và dựng bề
 * mặt của MỘT khu. Bề mặt đó là bề mặt lớn nhất và là bề mặt đang được dựng lại, nên nó tiếp
 * tục phình trong khi mười lăm khu kia đứng yên. Sau bước này `page.tsx` chỉ còn định tuyến.
 *
 * # Cấu trúc: hai khối, và khối dưới là lưới bốn hàng
 *
 * `.bltren` (đầu trang · dải · cảnh báo) cao theo nội dung; `.blgiua` nhận phần cao còn lại
 * và chia làm bốn hàng theo tỉ lệ ĐO ĐƯỢC — xem chú thích cạnh `grid-template-rows` của
 * `.blgiua` trong `app/globals.css`.
 *
 * Bọc ba khối trên vào `.bltren` chứ không để chúng làm ba hàng của lưới: khối cảnh báo là
 * CÓ ĐIỀU KIỆN, nên với một lưới khai cứng số hàng thì cuốn có cảnh báo và cuốn không có
 * cảnh báo sẽ đọc lệch nhau một hàng — hàng `1fr` rơi vào khối cảnh báo và cột giữa bị đẩy
 * xuống một hàng ngầm định. Dải quyết định của cửa nghiệm thu là khối CÓ ĐIỀU KIỆN thứ hai
 * của `.bltren`, và nó vào được đúng nhờ luật đó.
 *
 * # Vì sao dải quyết định đứng TRÊN dải trạng thái
 *
 * Thứ tự ở đây là nội dung, không phải trang trí: "dây chuyền đang chờ BẠN" là một VIỆC PHẢI
 * LÀM, còn "dây chuyền đang làm gì" là tin để ngó. Một dải nói việc phải làm mà đứng dưới một
 * dải nói tình hình là đảo đúng thứ tự người vận hành cần đọc.
 *
 * Nó ăn thêm chiều cao của `.bltren`, và mọi khối `auto` ở đây đã bị nén để nhường chỗ cho khu
 * văn sống (xem chú thích cạnh `grid-template-rows` của `.blgiua`). Đổi đó chấp nhận được vì
 * dải chỉ hiện khi engine ĐANG ĐỨNG CHỜ — tức đúng lúc không có chữ nào chảy để mà xem.
 *
 * # Chỗ lệch khỏi spec §7.2, ghi ra để người sau khỏi tưởng là quên
 *
 * Spec vẽ dải trạng thái trải qua CẢ cột phải (`areas: 'rail band band'`), tức nó là một ô
 * của lưới ứng dụng chứ không của bề mặt. Ở đây dải nằm TRONG buồng lái nên nó chỉ trải hết
 * bề rộng cột giữa. Đưa nó lên tầng `.khung` đòi `page.tsx` phải tự biết bề mặt nào có dải —
 * tức trả lại cho `page.tsx` đúng việc bước này vừa lấy đi, và tách luật đổi dải ra khỏi
 * component mang luật đó.
 */
export function BuongLai({
  snapshot,
  tacPham,
  choGhi,
  chuongChon,
  onChonChuong,
  onChonKhu,
  onDocChuong,
  onDoi,
  suKien,
  song,
  vanSong,
  dangChay,
  vuaChot,
}: {
  snapshot: Snapshot;
  tacPham: string | undefined;
  /** undefined = chưa biết (đang hỏi `/api/config`) — xem `useMay`. Dải quyết định đọc nó. */
  choGhi: boolean | undefined;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
  onChonKhu: (k: Khu) => void;
  onDocChuong: (n: number) => void;
  /**
   * Gọi sau mỗi lệnh của dải quyết định để snapshot được nạp lại.
   *
   * `OCanThiep` ở hàng 4 KHÔNG cần nó và đó không phải bất đối xứng vô cớ: can thiệp xếp một ý
   * kiến vào hàng chờ mà không đổi trạng thái cửa nào, còn `Cho đi tiếp` mở đúng cái cửa mà dải
   * đang vẽ. Không nạp lại thì dải amber ở lại cho một cửa đã mở, và cú bấm thứ hai cấp phép
   * thêm một chương — tiền đôi vì một sợi dây thiếu.
   */
  onDoi: () => void;
  suKien: Parameters<typeof DongSuKien>[0]['suKien'];
  /**
   * Công đoạn suy từ dòng SSE.
   *
   * Hôm nay không ai đọc nó trên đường này: `ViecTiepTheo` chỉ dùng `song` bên trong khối
   * `DangLam`, mà khối đó chỉ vẽ khi `dangChay` — tức đúng ca dải này KHÔNG hiện. Luật đổi
   * dải làm `DangLam` không tới được TỪ ĐÂY, và việc của nó ("ai · bước nào · chương nào")
   * giờ do `DaiTrangThai` làm, đầy đủ hơn.
   *
   * Vẫn giữ, và đây là quyết định có lý do chứ không phải quán tính: `ViecTiepTheo` đổi
   * CẢ câu trạng thái lẫn khối `DangLam` theo `dangChay`, nên bỏ riêng `DangLam` để lại một
   * component phản ứng nửa vời với chính cờ của nó. Thay vì thế, hợp đồng của `ViecTiepTheo`
   * được canh ở ranh giới CỦA NÓ (`ViecTiepTheo.test.tsx`) — nhánh đó có bài kiểm, chỉ là
   * hôm nay không có người gọi nào đi vào.
   */
  song: CongDoanSong | undefined;
  /** Chữ model đang sinh ra. Đường riêng, không đi qua `suKien` — xem lib/dongSuKien.ts. */
  vanSong: BoDemVan;
  dangChay: boolean;
  /** Họ 09 — chỉ đi thẳng xuống `Truc`; buồng lái không đọc nó. Xem `lib/chotChuong.ts`. */
  vuaChot: ReadonlySet<number>;
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
    <main className="canvas buonglai" id="dong-san-xuat">
      <div className="bltren">
        <div className="head">
          <h1>{CHU.dongSanXuat}</h1>
          <span className="sub">{motTa(snapshot)}</span>
          {phanTang ? (
            <MucXem timeline={snapshot.timeline} hienTai={muc} onChon={setMucMuon} />
          ) : null}
        </div>

        {/* Dải quyết định đứng TRƯỚC cả hai dải kia: nó là tin cấp cao hơn — "dây chuyền đang
            chờ BẠN" đứng trước "dây chuyền đang làm gì". Nó tự trả `null` khi không có cửa nào
            chờ, nên ở đây không có điều kiện nào: luật "cửa nào là cửa đang chờ" chỉ có MỘT chỗ
            giữ (`lib/nghiemThu.ts`), và người nối dây không có cơ hội tính sai nó. */}
        <CuaNghiemThu
          advance={snapshot.advance}
          runtime={snapshot.runtime}
          tacPham={tacPham}
          choGhi={choGhi}
          dangChay={dangChay}
          onDoi={onDoi}
        />

        {/* Dải đứng NGAY dưới đầu trang, trên cả cảnh báo dữ liệu lệch.
            Hai loại tin khác nhau: dải này trả lời "máy đang làm gì" (lúc chạy) hoặc "giờ
            tôi làm gì" (lúc nghỉ), còn cảnh báo trả lời "cái gì đang không ổn". Câu thứ
            nhất là câu người dùng mang theo lúc mở trang, nên nó đứng trước — và một cuốn
            có cảnh báo thì dải vẫn nói được việc tiếp theo. */}
        {dangChay ? (
          <DaiTrangThai snapshot={snapshot} />
        ) : (
          <ViecTiepTheo
            snapshot={snapshot}
            dangChay={dangChay}
            song={song}
            onChonKhu={onChonKhu}
            onDocChuong={onDocChuong}
          />
        )}

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
      </div>

      <div className="blgiua">
        {/* Hàng 1 — dải trục mảnh. TUI không có nó; giữ vì một cuốn 113 chương cần thấy
            hình dạng cả cuốn trong một cái nhìn (spec §7.2). Tiêu đề đứng CẠNH trục chứ
            không trên nó: hàng này cao ~30px, không đủ chỗ cho hai dòng. */}
        <div className="bltruc">
          <h2>{CHU.trucSanXuat}</h2>
          <Truc
            timeline={snapshot.timeline}
            capabilities={snapshot.capabilities}
            chuongChon={chuongChon}
            onChonChuong={onChonChuong}
            vuaChot={vuaChot}
          />
        </div>

        {/* Hàng 2 — khu văn sống, hàng cao nhất của cột giữa. Nó là thứ DUY NHẤT chạy liên
            tục (spec §2), nên nó nhận phần lớn nhất. */}
        <VanSong boDem={vanSong} dangChay={dangChay} />

        {/* Hàng 3 — khu cuộn: dòng sự kiện trước, hai khối tra cứu sau.
            Bảng chương và nhật ký phán quyết ở TRONG khu cuộn này chứ không ở dưới cột
            giữa: cột giữa cao có hạn (ô can thiệp ghim đáy), nên bất kỳ thứ gì đặt ngoài
            khu cuộn đều không bao giờ tới được. */}
        <div className="blcuon">
          {/* `id` để dải việc tiếp theo cuộn tới được — xem `DangLam` trong ViecTiepTheo.tsx. */}
          <section className="sect" id="dong-su-kien">
            <h2>
              Dòng sự kiện · <span className="phu">trực tiếp từ engine</span>
            </h2>
            <DongSuKien suKien={suKien} dangChay={dangChay} />
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
        </div>

        {/* Hàng 4 — ô can thiệp ghim đáy, đúng chỗ dòng nhập của TUI. Nó KHÔNG cuộn đi mất:
            can thiệp là việc người vận hành làm giữa lúc đang đọc chữ chảy, và bắt họ cuộn
            đi tìm ô nhập là bắt họ rời mắt khỏi thứ họ đang can thiệp vào. */}
        <div className="blcanthiep">
          <h2>
            {CHU.canThiep} · <span className="phu">nói vào dây chuyền đang chạy</span>
          </h2>
          <OCanThiep
            capabilities={snapshot.capabilities}
            tacPham={tacPham}
            dangChay={dangChay}
          />
        </div>
      </div>
    </main>
  );
}

/** "Trấn Yêu Ký · đang viết · 300 chương · 6 tập" — chỉ nói điều biết được. */
function motTa(snap: Snapshot): string {
  const b = snap.book;
  const phan: string[] = [b.name || b.id, nhanPhase(b.phase)];
  if (b.total_chapters > 0) phan.push(`${so(b.total_chapters)} chương`);
  // `?? []` chứ không tin `layered_outline`: hai trường đến từ hai nhánh khác nhau phía
  // server, nên một cuốn có cờ true mà volumes null là ca hợp lệ (dàn ý phân tầng đã có
  // khung mà chưa mở tập nào).
  const soTap = snap.timeline.volumes?.length ?? 0;
  if (snap.capabilities.layered_outline && soTap > 0) {
    phan.push(`${soTap} tập`);
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
