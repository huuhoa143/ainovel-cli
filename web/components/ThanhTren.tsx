'use client';

import { useEffect, useRef, useState } from 'react';

import { DauHieu } from './DauHieu';
import { tienDo } from '@/lib/dinhdang';
import type { Khu } from '@/lib/khu';
import type { TrangThaiCua } from '@/lib/nghiemThu';
import { CHU, GIAI_THICH, TRANG_THAI_KET_NOI, TRANG_THAI_MAY, kyTheoTone } from '@/lib/nhan';
import type { Book, Workshop } from '@/lib/types';
import type { TinhTrangKetNoi } from '@/lib/useStudio';

/**
 * Thanh trên: bộ chọn tác phẩm + slate tình trạng cả xưởng.
 *
 * Slate tồn tại để hàm ý xưởng có nhiều đầu việc — người vận hành theo dõi
 * nhiều tác phẩm cùng lúc, và câu hỏi đầu tiên khi mở studio sau 6 giờ đi vắng
 * là "còn cái nào đang chạy không".
 *
 * # Vì sao huy hiệu nghiệm thu ở ĐÂY chứ không trong một bề mặt
 *
 * Cửa nghiệm thu là một dây chuyền đang đứng chờ NGƯỜI DÙNG, và nó không được ẩn sau một
 * lựa chọn điều hướng — cùng lý lẽ đã ghi cho `HoiChan` ở `page.tsx`. Thanh trên là bề mặt
 * duy nhất hiện ở mọi khu, nên nó là chỗ duy nhất nói được câu đó từ mọi chỗ đang đứng.
 */
export function ThanhTren({
  workshop,
  dangXem,
  ketNoi,
  cuaNghiemThu,
  theoTacPham,
  onChon,
  onChonKhu,
  onTaoTacPham,
  dangOTaoTacPham,
  dauChot,
}: {
  workshop: Workshop | undefined;
  dangXem: Book | undefined;
  ketNoi: TinhTrangKetNoi;
  /**
   * Cửa nghiệm thu của cuốn ĐANG XEM. `undefined` = chưa có snapshot nào để đo.
   *
   * Nhận trạng thái đã suy chứ không nhận `snapshot`: thanh trên không đọc gì khác của
   * snapshot, và cho nó cả cục là mời người sau lấy thêm thứ khác từ đó rồi biến một thanh
   * mức MÁY thành nửa-theo-tác-phẩm.
   */
  cuaNghiemThu: TrangThaiCua | undefined;
  /**
   * Màn đang mở có phải màn theo tác phẩm không — `manTheoTacPham(man)`.
   *
   * Nhận một BOOLEAN đã suy chứ không nhận `Man`: thanh trên không cần biết ba màn là những
   * màn nào, nó chỉ cần biết "canvas dưới kia đang nói về một cuốn hay về cả xưởng". Cho nó
   * cả enum là mời người sau thêm nhánh thứ ba rồi thứ tư ở đây, và lúc đó ranh giới bị chép
   * làm hai bản.
   */
  theoTacPham: boolean;
  onChon: (id: string) => void;
  onChonKhu: (k: Khu) => void;
  /** Vắng = máy này không tạo được tác phẩm; nút KHÔNG được vẽ. Xem lý do ở page.tsx. */
  onTaoTacPham?: () => void;
  dangOTaoTacPham?: boolean;
  /**
   * Họ 10 (đồng thanh) — chỗ thứ ba, và là chỗ mang con số THÔ của sự kiện: `9/111`.
   *
   * Ba chỗ nhấp CÙNG màu, CÙNG lúc, CÙNG thời lượng. Đó không phải trang trí mà là một bài
   * dạy: vạch trên lane, chip đếm ở rail và tiến độ ở đây là MỘT sự thật nhìn từ ba góc.
   * Học một lần rồi từ đó chỉ cần liếc một trong ba. Ba chỗ nhấp lệch nhịp thì thành màn
   * trình diễn đèn — cùng nhịp mới đọc ra là một sự kiện.
   */
  dauChot: number;
}) {
  const [mo, setMo] = useState(false);
  const boc = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài hoặc Esc thì đóng — danh sách này che canvas.
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (!boc.current?.contains(e.target as Node)) setMo(false);
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMo(false);
    };
    document.addEventListener('mousedown', ngoai);
    document.addEventListener('keydown', phim);
    return () => {
      document.removeEventListener('mousedown', ngoai);
      document.removeEventListener('keydown', phim);
    };
  }, [mo]);

  const sach = workshop?.books ?? [];
  const dangChay = sach.filter((b) => b.activity === 'running').length;
  const nhieuHon1 = sach.length > 1;

  return (
    <header className="bar">
      {/* Ổ KHOÁ: dấu hiệu + chữ. Dấu hiệu dùng chung hình học với favicon — xem
          lib/dauHieu.ts. Dưới 700px phần CHỮ ẩn đi còn dấu hiệu ở lại: chữ tốn 88px trong
          khi dấu hiệu chỉ tốn 20px, và một thanh trên không có gì của thương hiệu thì cũng
          không còn là thanh của sản phẩm nào. */}
      <div className="logo">
        <DauHieu />
        <span className="ten">
          {CHU.sanPham} <em>{CHU.beMat}</em>
        </span>
      </div>

      {/* Bộ chọn tác phẩm chỉ ở màn XƯỞNG SẢN XUẤT.
          Ở màn Quản lý và Cài đặt chung, canvas nói về CẢ xưởng; một bộ chọn cuốn đứng trên
          nó là một điều khiển không nói về thứ đang hiện. Đo được ở bản trước: đứng ở bảng
          liệt kê ba cuốn, thanh trên vẫn ghi "Trấn Yêu Ký · 5/300" — người đọc phải tự đoán
          con số đó nói về dòng nào trong bảng. Nó không nói về dòng nào cả.

          Thay vào đó hai màn kia hiện GỐC XƯỞNG: đó là phạm vi thật của chúng, và nó cũng
          là thứ người vận hành cần đối chiếu khi có nhiều thư mục output trên một máy. */}
      {!theoTacPham ? (
        <div className="gocxuong" title={GIAI_THICH.thanhTrenGocXuong}>
          <span className="ky" aria-hidden="true">
            ▦
          </span>
          <span className="duong">{workshop?.root ?? CHU.khongCo}</span>
        </div>
      ) : dangXem ? (
        <div className="pickwrap" ref={boc}>
          <button
            type="button"
            className="picker"
            aria-haspopup={nhieuHon1 ? 'listbox' : undefined}
            aria-expanded={nhieuHon1 ? mo : undefined}
            aria-label={CHU.chonTacPham}
            disabled={!nhieuHon1}
            onClick={() => setMo((v) => !v)}
          >
            {/* `id` đi kèm tên cả ở NÚT ĐÃ ĐÓNG, không chỉ trong danh sách mở ra.
                Danh sách chỉ giúp lúc đang chọn; thanh trên là chỗ người vận hành
                ngó vào để biết "tôi đang ở tác phẩm nào", và đó là lúc họ KHÔNG mở
                danh sách.
                ĐO ĐƯỢC trên store mẫu: cả ba tác phẩm (`tran-yeu-ky`, `chay-thu`,
                `thanh-van-lo`) đều mang `name` = "Trấn Yêu Ký", nên nút đóng hiện y
                hệt nhau ở cả ba và không có cách nào biết mình đang mở cái nào. */}
            <b>{tenSach(dangXem)}</b>
            {dangXem.name ? <span className="ma">{dangXem.id}</span> : null}
            {/* `key` là thứ làm hoạt ảnh chạy LẠI: CSS chỉ phát keyframes khi phần tử được
                dựng. Dấu 0 = chưa chốt lần nào → không lớp nào, tức mở trang không nhấp. */}
            <span
              key={dauChot}
              className={`meta${dauChot > 0 ? ' dongThanh' : ''}`}
            >
              {tienDo(dangXem.completed_chapters, dangXem.total_chapters)}
            </span>
            {nhieuHon1 ? (
              <span className="chev" aria-hidden="true">
                ▼
              </span>
            ) : null}
          </button>

          {mo && nhieuHon1 ? (
            <ul className="picklist" role="listbox" aria-label={CHU.chonTacPham}>
              {sach.map((b) => {
                const tt = TRANG_THAI_MAY[b.activity];
                return (
                  <li key={b.id} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={b.id === dangXem.id}
                      aria-current={b.id === dangXem.id}
                      onClick={() => {
                        setMo(false);
                        if (b.id !== dangXem.id) onChon(b.id);
                      }}
                    >
                      {/* `dap` theo activity của TỪNG tác phẩm, không theo tác
                          phẩm đang xem: danh sách này tồn tại để trả lời "còn
                          cái nào đang chạy không", nên nhịp đập phải nằm đúng ở
                          dòng của tác phẩm còn chạy. `activity` là sự thật
                          liveness thật (server tính từ checkpoint mới nhất),
                          khác với công đoạn đã ghi của một chương. */}
                      <span
                        className={`st ${tt.mau}${b.activity === 'running' ? ' dap' : ''}`}
                        title={tt.nhan}
                      >
                        <span className="ky" aria-hidden="true">
                          {tt.ky}
                        </span>
                      </span>
                      {/* `id` hiện LUÔN, kể cả khi tác phẩm đã có tên.
                          Bản trước là `b.name ? b.name : <em>{b.id}</em>` — bỏ hẳn
                          id khi có tên. Hai tác phẩm ở hai thư mục khác nhau mà
                          trùng tên khi đó hiện y hệt nhau, và người vận hành mở sai
                          tác phẩm mà không có cách nào biết.
                          `id` là tên thư mục và cũng là khoá trong URL (`?tp=`),
                          nên nó là thứ duy nhất phân biệt được hai dòng — đây là
                          lỗi về DỮ LIỆU, không phải về hình. */}
                      <span className="ten">
                        {b.name ? (
                          <>
                            <span className="nb">{b.name}</span>
                            <span className="ma">{b.id}</span>
                          </>
                        ) : (
                          <em>{b.id}</em>
                        )}
                      </span>
                      <span className="sl">
                        {tienDo(b.completed_chapters, b.total_chapters)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Nút tạo tác phẩm đứng NGAY SAU bộ chọn, không ở nhóm bên phải.
          Bên phải là chỗ của tình trạng máy (dòng sự kiện) — tin để ngó, không phải việc để
          làm. Còn "cuốn nào" và "cuốn mới" là cùng một câu hỏi, nên chúng đứng cạnh nhau.

          Nhãn xuống chỉ còn dấu `+` dưới 700px, và `aria-label` giữ nguyên tên đầy đủ:
          ĐO ĐƯỢC ở 390px thanh trên chỉ còn 12px dư sau khi đã ẩn slate, nên một nút mang
          chữ sẽ đẩy huy hiệu kết nối ra ngoài mép. */}
      {onTaoTacPham ? (
        <button
          type="button"
          className="nutMoi"
          aria-current={dangOTaoTacPham ? 'page' : undefined}
          aria-label={CHU.taoTacPham}
          title={GIAI_THICH.taoSachGiaiThich}
          onClick={onTaoTacPham}
        >
          <span className="ky" aria-hidden="true">
            +
          </span>
          <span className="nhan">{CHU.taoTacPham}</span>
        </button>
      ) : null}

      {/* Huy hiệu nghiệm thu đứng NGAY SAU nhóm "cuốn nào / cuốn mới", không ở nhóm bên
          phải — chép nguyên luật đã ghi ngay trên cho nút tạo tác phẩm: bên phải là chỗ của
          tin để NGÓ (dòng sự kiện), còn đây là một VIỆC PHẢI LÀM, và nó nói về đúng cuốn mà
          bộ chọn ngay bên trái đang hiện.

          Nó nằm NGOÀI khối `dangXem` một cách có chủ ý: khối đó biến mất khi chưa có tác
          phẩm nào được chọn, và một dây chuyền đang đứng chờ không được biến mất cùng với
          một bộ chọn. */}
      {cuaNghiemThu?.dangCho ? (
        <button
          type="button"
          className="hieunghiemthu"
          // `aria-label` giữ tên ĐẦY ĐỦ, vì dưới 700px phần chữ hiện ra rút lại thành "Chờ
          // bạn" để bộ chọn tác phẩm không bị nén mất (xem phép đo ở `nghiemThuChoBanNgan`).
          // Chép nguyên cách `.nutMoi` xử khi nó rút về một dấu `+`: phần mất là hình, không
          // phải nghĩa — và tên vùng không đổi theo bề rộng màn hình.
          aria-label={CHU.nghiemThuChoBan}
          title={GIAI_THICH.nghiemThuHuyHieuDanToi}
          onClick={() => onChonKhu('kiem-dinh')}
        >
          <span className="ky" aria-hidden="true">
            {kyTheoTone('amber')}
          </span>
          {/* Hai bản nhãn nằm CẢ HAI trong DOM, CSS chọn bản nào hiện — không có điểm ngắt
              nào trong JS. Một `matchMedia` ở đây sẽ là bản thứ hai của một con số mà
              `globals.css` đã giữ, và hai bản của cùng một điểm ngắt thì có ngày lệch. */}
          <span className="nhan">{CHU.nghiemThuChoBan}</span>
          <span className="nhanNgan">{CHU.nghiemThuChoBanNgan}</span>
        </button>
      ) : null}

      {sach.length > 0 ? (
        <div className="slate" title={CHU.tacPhamKhac}>
          {sach.slice(0, 8).map((b) => (
            <span
              key={b.id}
              className={`dot ${b.activity}`}
              title={`${b.name || b.id} · ${TRANG_THAI_MAY[b.activity].nhan}`}
            />
          ))}
          <span className="chu">{CHU.demTacPham(sach.length, dangChay)}</span>
        </div>
      ) : null}

      <div className="right">
        {/* Chú giải nói PHẠM VI, không lặp lại nhãn. Bản trước để `title` bằng đúng chữ đang
            hiện — một chú giải không thêm gì. Chữ "đã nối" tự nó không nói nối cái gì, và
            đó chính là câu người dùng hỏi. */}
        {/* Hai bản nhãn nằm CẢ HAI trong DOM, CSS chọn bản nào hiện — chép nguyên cách huy
            hiệu nghiệm thu xử, và cùng lý do: một `matchMedia` ở đây là bản thứ hai của một
            điểm ngắt mà `globals.css` đã giữ, và hai bản của cùng một con số thì có ngày lệch.
            `aria-label` giữ bản ĐẦY ĐỦ ở mọi bề rộng: phần mất đi khi hẹp là hình, không phải
            nghĩa. */}
        <span
          className="kbd live"
          data-tt={ketNoi}
          title={TRANG_THAI_KET_NOI[ketNoi].giaiThich}
          aria-label={TRANG_THAI_KET_NOI[ketNoi].nhan}
        >
          <span className="dot" aria-hidden="true" />
          <span className="nhan">{TRANG_THAI_KET_NOI[ketNoi].nhan}</span>
          <span className="nhanNgan">{TRANG_THAI_KET_NOI[ketNoi].nhanNgan}</span>
        </span>
      </div>
    </header>
  );
}

function tenSach(b: Book): string {
  return b.name ? b.name : b.id;
}

