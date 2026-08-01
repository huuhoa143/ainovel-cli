'use client';

import { useState } from 'react';

import { BuongLai } from '@/components/BuongLai';
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
import { NhanVat } from '@/components/NhanVat';
import type { DongSuKien } from '@/components/NhatKy';
import { Rail } from '@/components/Rail';
import { LuatTheGioi, PhucBut } from '@/components/TheGioi';
import { ThanhTren } from '@/components/ThanhTren';
import { ToSanXuat } from '@/components/ToSanXuat';
import { Transport } from '@/components/Transport';
import { VanPhong } from '@/components/VanPhong';
import { DangTai, KhongTaiDuoc, XuongTrong } from '@/components/XuongTrong';
import { dungInspector, type Khu as KhuMa } from '@/lib/khu';
import { mayDangChay } from '@/lib/song';
import { useMay } from '@/lib/useMay';
import type { CongDoanSong } from '@/lib/useStudio';
import type { Snapshot } from '@/lib/types';
import type { BoDemVan } from '@/lib/vanSong';
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

  /**
   * Tạo xong thì ĐI THẲNG tới bề mặt sản xuất.
   *
   * `chonTacPham` giữ nguyên khu đang xem (`khuRef.current`), nên bản trước đứng lại ở
   * chính biểu mẫu Tác phẩm mới — với một biểu mẫu trắng. Người dùng nói nguyên văn: "tôi
   * bấm bắt đầu viết xong chả biết làm gì nữa luôn". Đúng: dấu hiệu duy nhất cho biết đã
   * có gì xảy ra là tên tác phẩm trên thanh trên đổi.
   *
   * Đây là chỗ TUI gốc không thể sai được, vì nó không có điều hướng: xong phần cài đặt là
   * bạn đang ở màn hình sống, thấy dòng sự kiện chạy. Web có điều hướng nên nó phải TỰ đi.
   */
  const xongTaoSach = s.moTacPhamVuaTao;

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
        // Đường vào "Tác phẩm mới" đặt ở thanh trên, cạnh bộ chọn tác phẩm.
        //
        // Nó VẪN còn trong rail, nhóm Máy — bỏ đi là bỏ một đường đi. Nhưng ở đó nó là mục
        // thứ mười lăm trong mười sáu mục cùng sức nặng, và người dùng nói nguyên văn: "bắt
        // đầu tác phẩm mới thì như thế nào và ở đâu". Thanh trên là chỗ trả lời câu đó:
        // câu hỏi "cuốn nào" và câu hỏi "cuốn mới" là cùng một loại câu hỏi, nên chúng
        // thuộc cùng một chỗ.
        //
        // Ba điều kiện, ba lý do khác nhau:
        //  - `choGhi`: ngoài loopback thì `POST /books` bị từ chối, nên một nút dẫn tới
        //    biểu mẫu chắc chắn thất bại là lời hứa hụt.
        //  - `!canCaiDat`: chưa có khóa API thì bề mặt duy nhất được vẽ là Cấu hình máy,
        //    nên bấm nút này sẽ KHÔNG đổi được gì — một nút không phản ứng.
        //  - `!xuongTrong`: xưởng rỗng thì Tác phẩm mới đã là bề mặt đang mở sẵn.
        onTaoTacPham={
          may.choGhi && !may.canCaiDat && !xuongTrong
            ? () => s.chonKhu('tac-pham-moi')
            : undefined
        }
        dangOTaoTacPham={s.khu === 'tac-pham-moi'}
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
        <TacPhamMoi onXong={xongTaoSach} />
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
            onChonKhu={s.chonKhu}
            onDocChuong={s.docChuong}
            onChonTacPham={s.chonTacPham}
            onXongTaoSach={xongTaoSach}
            onChotCungDung={chotCungDung}
            nhapSan={nhapTuCungDung}
            suKien={s.suKien}
            song={s.song}
            vanSong={s.vanSong}
            dangChay={mayDangChay(s.snapshot)}
          />
          {coInsp ? (
            <Inspector
              snapshot={s.snapshot}
              tacPham={s.tacPham}
              chuongChon={s.chuongChon}
              onChonChuong={s.chonChuong}
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
 *
 * Export để bài kiểm gọi thẳng được LUẬT ĐỊNH TUYẾN mà không phải dựng cả `Trang` (tức cả
 * `useStudio`, tức cả mạng). `Trang` vẫn là cửa duy nhất của ứng dụng; đây là cửa của bộ kiểm.
 */
export function Khu({
  khu,
  snapshot,
  tacPham,
  chuongChon,
  onChonChuong,
  onChonKhu,
  onDocChuong,
  onChonTacPham,
  onXongTaoSach,
  onChotCungDung,
  nhapSan,
  suKien,
  song,
  vanSong,
  dangChay,
}: {
  khu: KhuMa;
  snapshot: Snapshot;
  tacPham: string | undefined;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
  onChonKhu: (k: KhuMa) => void;
  onDocChuong: (n: number) => void;
  onChonTacPham: (id: string) => void;
  /** Tạo tác phẩm xong: đổi tác phẩm VÀ đổi khu — xem lý do ở `xongTaoSach`. */
  onXongTaoSach: (id: string) => void;
  onChotCungDung: (banNhap: string) => void;
  nhapSan: string;
  suKien: Parameters<typeof DongSuKien>[0]['suKien'];
  song: CongDoanSong | undefined;
  vanSong: BoDemVan;
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
      return <TacPhamMoi onXong={onXongTaoSach} nhapSan={nhapSan} />;
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
    // Buồng lái là bề mặt MẶC ĐỊNH, và nó nằm ở `default` chứ không ở một `case` riêng cho
    // `'dong-san-xuat'`: `KHU_MAC_DINH` là khu được chọn khi URL không nói gì và khi giá trị
    // trong URL không đọc được, nên một khu mới thêm vào mà quên viết `case` phải rơi về đây
    // chứ không rơi vào một màn hình trắng.
    default:
      return (
        <BuongLai
          snapshot={snapshot}
          tacPham={tacPham}
          chuongChon={chuongChon}
          onChonChuong={onChonChuong}
          onChonKhu={onChonKhu}
          onDocChuong={onDocChuong}
          suKien={suKien}
          song={song}
          vanSong={vanSong}
          dangChay={dangChay}
        />
      );
  }
}
