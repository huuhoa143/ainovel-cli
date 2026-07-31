'use client';

import { useState } from 'react';

import { LoiApi, taoSach } from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';

/**
 * Tạo tác phẩm mới — một câu yêu cầu là đủ.
 *
 * # Vì sao có ô tên thư mục, và vì sao nó KHÔNG phải tên tác phẩm
 *
 * `bootstrap.Config.OutputDir` là trường lúc chạy, mặc định `output/novel` theo thư mục
 * làm việc — tức engine gốc chỉ biết MỘT cuốn cho mỗi CWD. Studio phục vụ nhiều cuốn dưới
 * một gốc nên nó phải tự đặt tên thư mục, và người dùng là người biết mình muốn tên gì.
 *
 * Tên HIỂN THỊ của tác phẩm thì do chính truyện quyết định: Architect đặt nó khi dựng nền.
 * Nên ô này nói rõ nó là tên thư mục, nếu không người dùng gõ tên truyện có dấu vào đây rồi
 * bị từ chối mà không hiểu tại sao.
 *
 * # Vì sao nút nói ra giá trước khi bấm
 *
 * Câu cảnh của brief thiết kế: "sắp bấm một nút sẽ chạy 6 giờ và tiêu 35 đô; cần thấy rõ
 * mình đang đặt cược gì trước khi bấm". Nên nút không chỉ ghi "Bắt đầu" — dòng ngay trên nó
 * nói ra rằng đây là gọi model thật và dây chuyền sẽ chạy liên tục.
 *
 * Không hiện SỐ tiền dự kiến ở đây: số chương do Arbiter quyết sau khi đọc câu yêu cầu, nên
 * mọi con số đưa ra trước lúc đó là số bịa. Bề mặt Chi phí có số thật sau chương đầu.
 */
export function TacPhamMoi({
  onXong,
  nhapSan = '',
}: {
  onXong: (book: string) => void;
  /**
   * Bản yêu cầu chuyển sang từ Cùng dựng.
   *
   * Đổ vào ô nhập chứ không tự tạo tác phẩm luôn: người dùng còn phải đặt tên thư mục, và
   * một cú tạo ngầm sẽ tiêu tiền thật mà họ chưa xác nhận.
   */
  nhapSan?: string;
}) {
  const [ten, datTen] = useState('');
  const [yeuCau, datYeuCau] = useState(nhapSan);
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);

  // Gợi tên thư mục từ câu yêu cầu để người dùng không phải tự nghĩ: bỏ dấu, hạ chữ, thay
  // mọi thứ còn lại bằng gạch ngang. Chỉ GỢI Ý — họ sửa được, vì tên thư mục là thứ họ sẽ
  // thấy trên đĩa lâu hơn cả câu yêu cầu này.
  const goiTen = () => {
    if (ten.trim() !== '') return;
    const t = yeuCau
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .slice(0, 5)
      .join('-');
    if (t) datTen(t.slice(0, 64));
  };

  const gui = () => {
    datDangGui(true);
    datLoi(null);
    taoSach(ten.trim(), yeuCau.trim())
      .then((r) => onXong(r.book))
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  return (
    <main className="canvas" id="tac-pham-moi">
      <div className="head">
        <h1>{CHU.taoTacPham}</h1>
      </div>

      <p className="steerhint">{GIAI_THICH.taoSachGiaiThich}</p>

      <section className="sect">
        <form
          className="bieuMau"
          onSubmit={(e) => {
            e.preventDefault();
            gui();
          }}
        >
          <label className="oNhap oNhapCao">
            <span>{CHU.yeuCauTruyen}</span>
            <textarea
              value={yeuCau}
              onChange={(e) => datYeuCau(e.target.value)}
              onBlur={goiTen}
              rows={6}
              required
              placeholder="Viết truyện trinh thám điều tra dài, nhịp chậm. Nhân vật chính là một chấp pháp trẻ điều tra chuỗi mất tích ở một trấn ven sông. Giọng tiết chế, mỗi chương khép bằng một hình ảnh cụ thể."
            />
          </label>

          <label className="oNhap">
            <span>{CHU.tenThuMuc}</span>
            <input
              value={ten}
              onChange={(e) => datTen(e.target.value)}
              placeholder="tran-tham-ven-song"
              pattern="[a-z0-9][a-z0-9_\-]{0,63}"
              required
            />
          </label>
          <p className="steerhint">{GIAI_THICH.taoSachTenThuMuc}</p>

          {loi ? <p className="loiDoc">{loi}</p> : null}

          {/* Câu cam kết đứng NGAY TRÊN nút, không nằm ở đầu trang: người dùng đọc dòng
              gần nút nhất trước khi bấm, và đây là dòng phải được đọc. */}
          <p className="vphacap">
            <span className="ky" aria-hidden="true">
              ■
            </span>
            <span>{GIAI_THICH.taoSachSeTieuTien}</span>
          </p>

          <div className="nccNut">
            <button
              type="submit"
              className="nutChinh"
              disabled={dangGui || !ten.trim() || !yeuCau.trim()}
            >
              {dangGui ? CHU.dangGui : CHU.batDauViet}
            </button>
          </div>
        </form>
      </section>

      <div style={{ height: 8 }} />
    </main>
  );
}
