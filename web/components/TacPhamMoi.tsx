'use client';

import { useEffect, useState } from 'react';

import { LoiApi, layCauHinh, taoSach } from '@/lib/api';
import { CHU, GIAI_THICH, nhanKenhVai } from '@/lib/nhan';
import type { CauHinhDoc } from '@/lib/types';

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
  onChonKhu,
}: {
  onXong: (book: string) => void;
  /** Đưa người dùng sang Cấu hình máy khi model sắp dùng không phải cái họ muốn. */
  onChonKhu?: (khu: 'cau-hinh') => void;
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

  /**
   * Cấu hình máy — CHỈ để nói trước bản này sẽ viết bằng model nào.
   *
   * # Vì sao bề mặt tạo sách phải biết điều đó
   *
   * Đây là chỗ quyết định ở Cấu hình máy được TIÊU: cuốn mới nhận `cfg.Provider` và `cfg.Roles`
   * lúc engine mở, và từ đó không đổi được nữa trừ khi đóng máy. Nhưng màn này im lặng hoàn
   * toàn về model — nên người dùng vừa đổi nhà cung cấp ở màn kia xong, sang đây bấm Bắt đầu,
   * và không có gì xác nhận cái vừa đổi đã ăn hay chưa.
   *
   * Hỏng thì im lặng, không chặn: một dòng thông tin không đáng để chặn cả luồng tạo sách.
   */
  const [cauHinh, datCauHinh] = useState<CauHinhDoc | null>(null);
  useEffect(() => {
    let huy = false;
    layCauHinh()
      .then((d) => {
        if (!huy) datCauHinh(d);
      })
      .catch(() => undefined);
    return () => {
      huy = true;
    };
  }, []);

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

      {/* Ba bước nói TRƯỚC, không phải sau. Người dùng bấm "Bắt đầu viết" rồi không biết làm
          gì tiếp; một phần vì họ chưa bao giờ được cho biết cái gì sẽ xảy ra. */}
      <section className="sect">
        <h2>{CHU.sauKhiBamGi}</h2>
        <ol className="baBuoc">
          <li>
            <span className="vai">Arbiter</span>
            {CHU.buocArbiter}
          </li>
          <li>
            <span className="vai">Architect</span>
            {CHU.buocArchitect}
          </li>
          <li>
            <span className="vai">Writer</span>
            {CHU.buocWriter}
          </li>
        </ol>
        <p className="steerhint">{GIAI_THICH.batDauRoiKhongPhaiLamGi}</p>
      </section>

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
              disabled={dangGui}
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
              disabled={dangGui}
            />
          </label>
          <p className="steerhint">{GIAI_THICH.taoSachTenThuMuc}</p>

          {loi ? <p className="loiDoc">{loi}</p> : null}

          {/* Model sẽ viết cuốn này, đặt TRƯỚC câu cam kết tiêu tiền.
              Thứ tự có lý do: câu cam kết phải là dòng SÁT NÚT nhất — đó là chủ đích đã ghi
              ngay dưới đây, và bản đầu của khối này chen vào giữa nó với nút, tức phá đúng
              điều nó tồn tại để giữ. Đọc xuôi thành: sẽ viết bằng gì → tốn tiền thật → bấm. */}
          {cauHinh ? <SeVietBang du={cauHinh} onChonKhu={onChonKhu} /> : null}

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

          {/* Lượt chờ này DÀI: `POST /books` gọi `startup.PrepareQuick` ngay trong request,
              tức một lượt Arbiter thật — nhật ký phán quyết của hai cuốn đã tạo ghi 10,6s và
              14,5s. Một nút đổi chữ thành "Đang gửi…" trong mười lăm giây là bề mặt im lặng
              đúng vào lúc người dùng cần biết nhất, và họ đọc nó thành treo.
              Nói ra ai đang làm, làm gì, và mất khoảng bao lâu. */}
          {dangGui ? (
            <p className="dangCho" role="status">
              <span className="q" aria-hidden="true" />
              <span>
                <b>{CHU.arbiterDangDoc}</b> {GIAI_THICH.arbiterDangDocLau}
              </span>
            </p>
          ) : null}
        </form>
      </section>

      <div style={{ height: 8 }} />
    </main>
  );
}


/**
 * "Sẽ viết bằng" — vai Chấp bút và vai Kiến trúc, hai vai tiêu gần hết token của một cuốn.
 *
 * Không liệt kê cả bốn vai: đây là một dòng xác nhận trước khi bấm, không phải một bảng cấu
 * hình. Bảng đầy đủ ở Cấu hình máy, và liên kết ngay đây dẫn tới đó.
 */
function SeVietBang({
  du,
  onChonKhu,
}: {
  du: CauHinhDoc;
  onChonKhu?: (khu: 'cau-hinh') => void;
}) {
  const cua = (vai: string) => {
    const r = du.roles?.[vai];
    return `${r?.provider ?? du.provider} · ${r?.model ?? du.model}`;
  };
  return (
    <>
      {/* Khối này PHẢI có nhãn. Không có nó, hai dòng khóa-giá trị treo giữa câu cảnh báo tiêu
          tiền và nút Bắt đầu mà không nói chúng là gì — người dùng thấy hai tên model không rõ
          để làm gì. Đo được khi rà lại bề mặt: đúng loại "thiếu và không mượt". */}
      <h3 className="deNho">{CHU.seVietBang}</h3>
      <dl className="kv kvcd">
        <dt>{nhanKenhVai('writer')}</dt>
        <dd className="m">{cua('writer')}</dd>
        <dt>{nhanKenhVai('architect')}</dt>
        <dd className="m">{cua('architect')}</dd>
      </dl>
      {/* Nút đứng NGOÀI `<dl>`: nhét nó vào một cặp `<dt/><dd>` với thẻ `<dt>` rỗng để lại một
          hàng thuật ngữ trống trong danh sách định nghĩa — vô nghĩa cho cả mắt lẫn trình đọc
          màn hình. */}
      {onChonKhu ? (
        <button type="button" className="nutPhu" onClick={() => onChonKhu('cau-hinh')}>
          {CHU.doiOCauHinh}
        </button>
      ) : null}
    </>
  );
}
