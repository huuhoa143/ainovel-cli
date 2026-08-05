'use client';

import { useRef, useState } from 'react';

import { BangChuong, GhiChuChiPhi } from '@/components/BangChuong';
import { KeoBan, KeoTruc } from '@/components/KeoBan';
import { MucXem } from '@/components/MucXem';
import { DongSuKien, NhatKy } from '@/components/NhatKy';
import { OCanThiep } from '@/components/OCanThiep';
import { Truc } from '@/components/Truc';
import { useVuaCoTin } from '@/lib/dauDoi';
import { useCoBan } from '@/lib/keoBan';
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
 * # Cấu trúc: hai khối, và khối dưới là BÀN CHIA Ô
 *
 * `.bltren` (đầu trang · dải · cảnh báo) cao theo nội dung; `.blgiua` nhận phần cao còn lại
 * và chia làm ba hàng: trục sản xuất · bàn · ô can thiệp.
 *
 * Bọc ba khối trên vào `.bltren` chứ không để chúng làm ba hàng của lưới: khối cảnh báo là
 * CÓ ĐIỀU KIỆN, nên với một lưới khai cứng số hàng thì cuốn có cảnh báo và cuốn không có
 * cảnh báo sẽ đọc lệch nhau một hàng — hàng `1fr` rơi vào khối cảnh báo và cột giữa bị đẩy
 * xuống một hàng ngầm định. Dải quyết định của cửa nghiệm thu là khối CÓ ĐIỀU KIỆN thứ hai
 * của `.bltren`, và nó vào được đúng nhờ luật đó.
 *
 * # Vì sao BÀN CHIA Ô thay cho lưới bốn hàng
 *
 * Bản trước xếp BỐN vùng lên MỘT trục dọc: trục · văn sống · một khu cuộn chứa ba mục nối
 * đuôi · ô can thiệp. ĐO ĐƯỢC ở 1512×900 (canvas 1026×709, cột giữa 574px):
 *
 *   trục sản xuất  120px, cần 169px  → 71%, ba lane bị cắt và phải cuộn trong khe của nó
 *   văn sống       250px, cần ∞
 *   khu cuộn       125px, cần 2.666px → 4,7%
 *   ô can thiệp     79px, cần  79px  → vừa
 *
 * Trong khe 125px ấy: dòng sự kiện cao 98px, bảng chương bắt đầu ở offset 98 và cao 1.951px
 * nên hiện ĐÚNG 0 hàng, nhật ký phán quyết bắt đầu ở offset 2.049 nên không bao giờ tới.
 * Người dùng nói nguyên văn: *"Dòng sự kiện và Chương đang bị ở dưới dẫn đến rất ít khi
 * scroll xuống"*.
 *
 * Đây KHÔNG phải lỗi tỉ lệ, và đó là điều quan trọng nhất ở đây: chia lại bốn hàng theo cách
 * nào cũng vẫn là bốn vùng trên một trục dọc. Cột giữa là một hình CHỮ NHẬT NẰM NGANG
 * (1026×574) đang bị dùng như một cột dọc — và 1026px cho một cột chữ mono 12px là 120 ký tự
 * một dòng, rộng hơn khổ đọc 74ch mà chính DESIGN.md đặt ra. Bề rộng thừa là thứ trả tiền
 * cho chiều cao thiếu.
 *
 * Nên hai hàng giữa gộp lại thành một bàn 2×2, và CẢ HAI trục của bàn đều mang nghĩa:
 *
 *      trục ngang = HÌNH DẠNG nội dung        trục dọc = THỜI GIAN
 *      ┌────────────────────────┬──────────────────────┐
 *      │ Máy đang nói           │ Dòng sự kiện         │  đang xảy ra
 *      ├────────────────────────┼──────────────────────┤
 *      │ Chương                 │ Nhật ký phán quyết   │  đã ghi vào store
 *      └────────────────────────┴──────────────────────┘
 *        văn xuôi + bảng          dòng có mốc giờ
 *        (cần bề rộng)            (hẹp tự nhiên)
 *
 * Thứ tự quét mắt trùng thứ tự ba câu hỏi của PRODUCT.md: trên-trái trả lời "dây chuyền còn
 * chạy đúng không", dưới-trái trả lời "chất lượng có tuột không", cột phải là bằng chứng của
 * cả hai. Đo lại sau khi đổi: 100% · 2% · 54% · 6% · 8% — bốn vùng đọc được cùng lúc thay vì
 * hai vùng và hai con số không.
 *
 * Một phương án ba cột đã được dựng và LOẠI (`docs/design/explorations/buong-lai/`): ở 1026px
 * nó cho ba khe 380/265/380, và cả ba đều dưới sàn — mỗi `summary` của dòng sự kiện xuống ba
 * dòng, bảng chương mất hai cột cuối. Cột hẹp đi thì khối chữ CAO LÊN, nên hẹp không đổi lấy
 * gọn, nó đổi lấy tệ hơn.
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
   * Gọi sau mỗi lệnh ghi để snapshot được nạp lại. Hai người đọc: dải quyết định của cửa
   * nghiệm thu, và ô can thiệp ở hàng cuối.
   *
   * Với dải quyết định, hệ quả nếu thiếu là tiền: `Cho đi tiếp` mở đúng cái cửa mà dải đang
   * vẽ, nên không nạp lại thì dải amber ở lại cho một cửa đã mở và cú bấm thứ hai cấp phép
   * thêm một chương nữa.
   *
   * Với ô can thiệp, hệ quả là im lặng. Điều khoản cũ nói ô này KHÔNG cần nạp lại vì "can
   * thiệp xếp một ý kiến vào hàng chờ mà không đổi trạng thái cửa nào" — đúng về CỬA và sai
   * về màn hình: câu vừa gửi đi vào `snapshot.pending_steer`, tức ô "việc tồn" của dải trạng
   * thái. Xem chú thích của `onDoi` trong `OCanThiep.tsx` cho phép đo đầy đủ.
   *
   * Người gọi phải rót `lamMoi` chứ không `taiLai` — `taiLai` xóa trắng `vanSong` và `suKien`,
   * tức xóa đúng bằng chứng mà cả hai nút này được bấm để phản ứng lại.
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

  /**
   * Bốn cờ "ô này đang có tin", lái viền chạy của bàn.
   *
   * Mỗi ô đọc một NGUỒN KHÁC nhau, và đó là cả điểm của cụm này: một cờ chung suy từ
   * `dangChay` sẽ cho bốn ô cùng chạy viền suốt lúc engine bật, tức bốn viền chạy nói đúng
   * một điều mà thanh transport đã nói rồi. Cái người vận hành cần biết là ô NÀO vừa động —
   * để mắt đi thẳng tới đó thay vì quét cả bốn.
   *
   * Giá trị truyền vào phải đổi ĐÚNG lúc có tin thật, không đổi theo nhịp nạp:
   *
   *   · văn sống  — `vanSong` là object mới ở mỗi mẩu chữ (`themChu` trả bản sao), nên
   *                 chính nó là tín hiệu. Nhịp delta trung vị 2ms; `useVuaCoTin` gom cả
   *                 tràng thành một cửa sổ, xem chú thích của nó.
   *   · sự kiện   — `seq` của mục MỚI NHẤT, không phải `suKien.length`: danh sách bị kẹp ở
   *                 `GIU_SU_KIEN = 40`, nên khi đã đầy thì độ dài đứng im mãi mãi trong
   *                 khi sự kiện vẫn về. Một cờ đọc độ dài sẽ chết đúng lúc dây chuyền bận
   *                 nhất.
   *   · chương    — `vuaChot` của họ 09, tập chương VỪA chuyển sang `done`. Không đọc
   *                 `snapshot.chapters`: mảng đó được thay nguyên cụm mỗi 1,5s dù không ô
   *                 nào đổi, nên nó là nhịp NẠP chứ không phải tin. Dùng `vuaChot` còn cho
   *                 ô bảng nhập vào đúng dàn đồng thanh của họ 10 — vạch trên lane, chip ở
   *                 rail, tiến độ ở thanh trên, và giờ là viền của ô bảng, cùng một sự kiện.
   *   · phán quyết — chữ ký hai đầu cộng độ dài. Hai đầu chứ không một, vì hợp đồng không
   *                 hứa thứ tự: log mọc ở đầu hay ở cuối đều làm chữ ký này đổi.
   */
  /**
   * Cỡ bàn do người dùng kéo, cộng phần tử bàn để hai thanh chia đo lên nó.
   *
   * `ref` chứ không truy vấn DOM bằng selector: buồng lái có ĐÚNG một `.blsan`, nhưng bộ kiểm
   * dựng nhiều bản cùng lúc trong một `document`, và `querySelector` ở đó bắt phải bản của
   * bài trước.
   */
  const banRef = useRef<HTMLDivElement>(null);
  const giuaRef = useRef<HTMLDivElement>(null);
  const { co, datCo, datLai } = useCoBan();

  const dsPhanQuyet = snapshot.decisions ?? [];
  const oSongVanSong = useVuaCoTin(vanSong);
  const oSongSuKien = useVuaCoTin(suKien[0]?.seq ?? 0);
  const oSongChuong = vuaChot.size > 0;
  const oSongNhatKy = useVuaCoTin(
    `${dsPhanQuyet.length}·${dsPhanQuyet[0]?.id ?? ''}·${dsPhanQuyet.at(-1)?.id ?? ''}`,
  );

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

      <div
        className="blgiua"
        ref={giuaRef}
        style={
          (co.truc !== undefined ? { '--bl-truc': `${co.truc}px` } : undefined) as
            | React.CSSProperties
            | undefined
        }
      >
        {/* Hàng 1 — dải trục mảnh, TRẢI hết bề rộng bàn. TUI không có nó; giữ vì một cuốn 113
            chương cần thấy hình dạng cả cuốn trong một cái nhìn (spec §7.2). Trải hết bề rộng
            chứ không vào một ô của bàn: nó là thứ DUY NHẤT ở đây nói về cả tác phẩm, và một
            trục bị bó vào nửa bề rộng thì mất chính cái nó vẽ ra. Tiêu đề đứng CẠNH trục chứ
            không trên nó: hàng này cao có hạn, không đủ chỗ cho hai dòng. */}
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

        {/* Thanh chia thứ ba, giữa trục và bàn. Đứng ngay sau trục trong DOM vì đó đúng là
            ranh giới nó chia — thứ tự Tab đi qua nó ở đúng chỗ mắt thấy nó. */}
        <KeoTruc giuaRef={giuaRef} co={co} datCo={datCo} datLai={datLai} />

        {/* Hàng 2 — BÀN CHIA Ô. Bốn ô cùng một khuôn `.blo`: đầu ô cố định, thân ô tự cuộn.
            Xem sơ đồ và phép đo ở chú thích đầu tệp.

            Thứ tự DOM là thứ tự ĐỌC, không phải thứ tự vẽ: trên-trái → trên-phải → dưới-trái
            → dưới-phải. Lưới đặt chúng đúng chỗ bằng `grid-area`, nên thứ tự Tab và thứ tự
            trình đọc màn hình trùng thứ tự mắt — và khi bàn gập về một cột ở canvas hẹp thì
            không có gì phải sắp lại. */}
        <div
          className="blsan"
          ref={banRef}
          // Hai biến này là cỡ NGƯỜI DÙNG đã kéo. Vắng mặt (chưa kéo bao giờ) thì `var()`
          // trong `globals.css` rơi về mặc định của bố cục — nên bàn chưa-kéo và bàn
          // đã-đặt-lại đi qua đúng một đường, không có nhánh nào riêng.
          style={
            {
              ...(co.cot !== undefined ? { '--bl-phai': `${co.cot}%` } : null),
              ...(co.hang !== undefined ? { '--bl-tren': `${co.hang}fr` } : null),
            } as React.CSSProperties
          }
        >
          <KeoBan banRef={banRef} co={co} datCo={datCo} datLai={datLai} />
          {/* Ô 1 · trên-trái — khu văn sống. `.vansong` tự mang đầu ô (`.vshead`) và thân ô
              (`.vsthan`) từ trước, nên nó KHÔNG được bọc thêm một `.blodau` nữa; CSS cho nó
              `display: contents` để hai khối ấy làm hai hàng của chính ô. */}
          <div className={`blo blo-song${oSongVanSong ? ' dangSong' : ''}`}>
            <VanSong boDem={vanSong} dangChay={dangChay} />
          </div>

          {/* Ô 2 · trên-phải — dòng sự kiện.
              `id` để dải việc tiếp theo cuộn tới được — xem `DangLam` trong ViecTiepTheo.tsx. */}
          <section
            className={`blo blo-sukien${oSongSuKien ? ' dangSong' : ''}`}
            id="dong-su-kien"
          >
            <div className="blodau">
              <h2>
                Dòng sự kiện · <span className="phu">trực tiếp từ engine</span>
              </h2>
              {/* Số đếm là MẪU SỐ của thứ đang cuộn bên dưới, cùng luật với dải tổng của màn
                  Quản lý: một ô cao 174px chứa nhiều hơn thế phải nói ra còn bao nhiêu nữa.
                  `GIU_SU_KIEN` là 40, nên con số này có trần và không bao giờ là cả lịch sử. */}
              <span className="dem">{CHU.soDongSuKien(suKien.length)}</span>
            </div>
            <div className="blothan">
              <DongSuKien suKien={suKien} dangChay={dangChay} />
            </div>
          </section>

          {/* Ô 3 · dưới-trái — bảng chương. Ô rộng vì bảng có sáu cột và cột "Tiêu đề" mang
              tên chương tiếng Việt; ở dưới ~450px nó ngắt hai dòng ở mọi hàng. */}
          <section className={`blo blo-chuong${oSongChuong ? ' dangSong' : ''}`}>
            <div className="blodau">
              <h2>{tieuDeBang(pv)}</h2>
              <span className="dem">{CHU.soChuongTrongBang(hang.length)}</span>
            </div>
            <div className="blothan">
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
            </div>
          </section>

          {/* Ô 4 · dưới-phải — nhật ký phán quyết. */}
          <section
            className={`blo blo-nhatky${oSongNhatKy ? ' dangSong' : ''}`}
            id="nhat-ky-phan-quyet"
          >
            <div className="blodau">
              <h2>
                {CHU.nhatKyPhanQuyet} · <span className="phu">Arbiter</span>
              </h2>
              <span className="dem">
                {CHU.soPhanQuyet(snapshot.decisions?.length ?? 0)}
              </span>
            </div>
            <div className="blothan">
              <NhatKy decisions={snapshot.decisions} />
            </div>
          </section>
        </div>

        {/* Hàng 3 — ô can thiệp ghim đáy, đúng chỗ dòng nhập của TUI. Nó KHÔNG cuộn đi mất:
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
            onDoi={onDoi}
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
