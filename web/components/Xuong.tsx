'use client';

import { donGia, nangSuat, ngayGio, so, soTu, tienDo, tongTien } from '@/lib/dinhdang';
import type { Khu } from '@/lib/khu';
import { CHU, GIAI_THICH, nhanPhase } from '@/lib/nhan';
import type { Book } from '@/lib/types';
import { tongXuong } from '@/lib/xuong';
import { useDauDoi } from '@/lib/dauDoi';

/**
 * Xưởng: mọi tác phẩm trong thư mục gốc, và tổng của cả xưởng.
 *
 * Bề mặt này trả lời đúng một câu — *"tôi đang có những gì, và đã tiêu bao nhiêu"* — và câu
 * đó trước nay không có chỗ nào trả lời: tổng tiền của cả xưởng không hiện ở đâu cả.
 *
 * # Vì sao KHÔNG có nút chạy ở đây (quyết định 4, spec §4)
 *
 * Chạy và dừng chỉ có ở transport, trên cuốn đang mở — **một đường tiêu tiền duy nhất**. Hai
 * nút cùng gọi `POST /run` thì trạng thái khóa-lúc-đang-gửi của chúng không thấy nhau, nên
 * bấm cả hai là hai lượt chạy và trả tiền hai lần. Tệ hơn cái đó: đây là bề mặt người ta QUÉT
 * MẮT — mở ra để đếm lại xưởng, không phải để quyết định chạy cái gì — và đặt một nút tiêu
 * tiền vào giữa một màn hình đang được quét là mời một cú bấm không có chủ ý.
 *
 * # Vì sao KHÔNG có xóa và đổi tên (quyết định 8, spec §4)
 *
 * Xóa một cuốn là xóa hàng giờ chạy và hàng chục đô. Việc đó để ở hệ tệp, nơi thấy rõ mình
 * đang phá cái gì.
 *
 * # `0` KHÔNG phải "chưa đo được", và đó là luật chính của bảng này
 *
 * `chapters_per_hour` và `cost_per_chapter` về `0` cho cuốn CHƯA CHẠY lần nào — server không
 * có gì để chia. In `0 ch/giờ` ra thì bảng nói cuốn đó có chạy mà chạy chậm tới mức không
 * xong nổi một chương trong một giờ, và người vận hành sẽ đọc nó thành một cuốn đang hỏng.
 * Cùng luật `null` khác `0` mà cả hợp đồng `/studio` giữ (spec §6.1), chỉ khác là ở
 * `/workshop` nó đến dưới dạng `0`.
 *
 * `cost_usd === 0` thì NGƯỢC LẠI: đó là một phép đo có thật (chưa tốn gì) nên nó in ra
 * `$0,00`. Gộp hai ca lại là vứt đi một câu trả lời.
 */
export function Xuong({
  sach,
  onMoTacPham,
}: {
  sach: Book[];
  /**
   * Mở một cuốn ở một bề mặt, trong MỘT hành động.
   *
   * Ba tham số đi cùng nhau chứ không phải ba lời gọi nối tiếp, và đó là điều kiện đúng-sai
   * chứ không phải chuyện gọn gàng: `useStudio` ghi cả ba mảnh vị trí vào URL trong một lần,
   * và mọi hành động của nó đọc `tacPhamRef.current` — một ref chỉ được đặt lại lúc RENDER.
   * Gọi "chọn tác phẩm" rồi "chọn khu" liền nhau trong một handler thì React gộp hai lần đặt
   * state và không render ở giữa, nên lời gọi thứ hai ghi URL bằng cuốn CŨ. Lỗi đó đã đo được
   * hai lần trong dự án này.
   */
  onMoTacPham: (id: string, khu: Khu, chuong?: number) => void;
}) {
  const t = tongXuong(sach);

  return (
    <main className="canvas khuxuong" id="xuong">
      <div className="head">
        <h1>{CHU.xuong}</h1>
      </div>

      {/* Dải tổng: câu trả lời cho "đã tiêu bao nhiêu", đặt TRÊN bảng vì đó là câu người ta
          mở bề mặt này để hỏi. Bắt cuộn qua một bảng mười dòng rồi mới thấy tổng là bắt họ
          tự cộng trong lúc cuộn. */}
      <div className="xtong">
        <OTong so={t.soTacPham} chu={so(t.soTacPham)} nhan={CHU.donViTacPham} loai="chot" />
        <OTong so={t.chuongDaChot} chu={so(t.chuongDaChot)} nhan={CHU.donViChuongDaChot} loai="chot" />
        <OTong so={t.soTu} chu={so(t.soTu)} nhan={CHU.donViTu} loai="chot" />
        <OTong so={t.chiPhi} chu={tongTien(t.chiPhi)} nhan={CHU.donViDaTieu} loai="tien" />
        <OTong so={t.engineDangMo} chu={so(t.engineDangMo)} nhan={CHU.engineDangMo} loai="chot" />
      </div>

      <div className="bangwrap">
        <table className="bang bangxuong">
          <thead>
            <tr>
              <th scope="col">{CHU.colTacPham}</th>
              <th scope="col">{CHU.colGiaiDoan}</th>
              <th scope="col">{CHU.colTienDo}</th>
              <th scope="col" className="num">
                {CHU.colSoTu}
              </th>
              <th scope="col" className="num">
                {CHU.colChiPhi}
              </th>
              <th scope="col" className="num">
                {CHU.colNhip}
              </th>
              <th scope="col">{CHU.colSuaLanCuoi}</th>
              <th scope="col">{CHU.colHanhDong}</th>
            </tr>
          </thead>
          <tbody>
            {sach.map((b) => (
              <Dong key={b.id} b={b} onMoTacPham={onMoTacPham} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="steerhint">{GIAI_THICH.xuongKhongCoNutChay}</p>
      <p className="steerhint">{GIAI_THICH.xuongKhongXoaDoiTen}</p>
    </main>
  );
}

function Dong({
  b,
  onMoTacPham,
}: {
  b: Book;
  onMoTacPham: (id: string, khu: Khu, chuong?: number) => void;
}) {
  const nhip = b.chapters_per_hour ? nangSuat(b.chapters_per_hour) : undefined;
  const gia = b.cost_per_chapter ? donGia(b.cost_per_chapter) : undefined;
  const sua = ngayGio(b.updated_at);

  return (
    // `data-ma` để bài kiểm tra đúng dòng của một cuốn: `nth-child` sẽ trôi ngay lần thứ tự
    // bảng đổi, và lúc đó bài kiểm đo nhầm dòng mà vẫn xanh.
    <tr data-ma={b.id} className={b.engine_open ? 'engmo' : undefined}>
      <td className="ten">
        {/* Mã hiện LUÔN, kể cả khi cuốn đã có tên — hai cuốn ở hai thư mục khác nhau có thể
            trùng tên, và `id` (tên thư mục, cũng là khóa `?tp=` trong URL) là thứ duy nhất
            phân biệt được chúng. Cùng lý do đã ghi ở `ThanhTren.tsx`. */}
        {b.name ? (
          <>
            <span className="nb">{b.name}</span>
            <span className="ma">{b.id}</span>
          </>
        ) : (
          <em>{b.id}</em>
        )}
        {b.engine_open ? (
          <span className="engnhan" title={GIAI_THICH.xuongEngineDangMo}>
            {CHU.engineDangMo}
          </span>
        ) : null}
      </td>

      {/* `data-nhan` là NHÃN CỘT đi theo từng ô, và nó chỉ hiện ra dưới 860px — chỗ bảng đổi
          sang thẻ xếp dọc và `thead` biến mất. Không có nó thì một thẻ là một chồng số không
          tên ("$7,91 · $0,172" chẳng nói gì). Chữ vẫn lấy từ `CHU` như mọi nhãn khác; CSS chỉ
          đọc lại nó bằng `attr()`, không tự bịa chuỗi nào. */}
      <td className="phase" data-nhan={CHU.colGiaiDoan}>
        {nhanPhase(b.phase)}
      </td>

      <td className="tiendo" data-nhan={CHU.colTienDo}>
        <span className="sl">{tienDo(b.completed_chapters, b.total_chapters)}</span>
        {/* Thanh chỉ vẽ khi BIẾT tổng. `total_chapters === 0` là "chưa biết tổng", không phải
            "tổng bằng không": một thanh rỗng ở đó nói cuốn chưa đi được đoạn nào, một thanh
            đầy nói đã xong — cả hai đều là khẳng định mà dữ liệu không đưa ra. */}
        {b.total_chapters ? (
          <span className="thanh" aria-hidden="true">
            <span
              className="day"
              style={{
                width: `${Math.min(100, Math.round((b.completed_chapters / b.total_chapters) * 100))}%`,
              }}
            />
          </span>
        ) : null}
      </td>

      <td className="num tu" data-nhan={CHU.colSoTu}>
        {soTu(b.total_words) ?? <Trong />}
      </td>

      <td className="num tien" data-nhan={CHU.colChiPhi}>
        {/* Hai con số, hai nghĩa: tổng đã tiêu cho cuốn này, và giá thành mỗi chương đã
            nghiệm thu. Cái đầu luôn đo được (kể cả bằng 0), cái sau cần ít nhất một chương. */}
        <span className="tong">{tongTien(b.cost_usd)}</span>
        <span className="donGia">{gia ?? <Trong viSao={GIAI_THICH.xuongChuaDoDuocGiaThanh} />}</span>
      </td>

      <td className="num nhip" data-nhan={CHU.colNhip}>
        {nhip ? (
          <>
            {nhip} <em>{CHU.chuongMoiGio}</em>
          </>
        ) : (
          <Trong viSao={GIAI_THICH.xuongChuaDoDuocNhip} />
        )}
      </td>

      <td className="sua" data-nhan={CHU.colSuaLanCuoi}>
        {sua ?? <Trong viSao={GIAI_THICH.xuongChuaBietSuaLucNao} />}
      </td>

      {/* Hành động: ĐIỀU HƯỚNG, và chỉ điều hướng. Không nút nào ở đây gọi một route ghi.
          Dùng `.nutPhu` sẵn có chứ không khai một lớp nút mới: ba nút này không khác gì nút
          phụ ở bề mặt khác, và một lớp mới là một bộ token thứ hai phải giữ cho khớp.
          `Đọc` và `Xuất bản` chỉ có ở cuốn đã hoàn thành vì trước đó chúng dẫn tới hai bề mặt
          nói "chưa có gì": bản thảo dở chừng và một tệp xuất thiếu chương. */}
      <td className="lam">
        <button type="button" className="nutPhu" onClick={() => onMoTacPham(b.id, 'dong-san-xuat')}>
          {CHU.moTacPham}
        </button>
        {b.phase === 'complete' ? (
          <>
            {/* Chương 1 đi CÙNG lời gọi. Tách ra thành "chọn chương" rồi "đổi khu" là mất
                `?ch=` khỏi URL — đã đo được, và hư hại bị che vì bề mặt đọc tự chọn chương 1
                khi vào mà chưa có. */}
            <button type="button" className="nutPhu" onClick={() => onMoTacPham(b.id, 'ban-thao', 1)}>
              {CHU.docTacPham}
            </button>
            <button type="button" className="nutPhu" onClick={() => onMoTacPham(b.id, 'nhap-xuat')}>
              {CHU.xuatBan}
            </button>
          </>
        ) : null}
      </td>
    </tr>
  );
}

/**
 * Ô không có số.
 *
 * `viSao` bắt buộc phải nói ra được ở những ô mà `0` và "chưa đo được" khác nghĩa: một dấu
 * `—` trần để người vận hành tự đoán đó là chưa chạy hay studio hỏng. Ô số từ không cần vì
 * "chưa viết chữ nào" đọc thẳng ra được từ cột tiến độ ngay cạnh.
 */
function Trong({ viSao }: { viSao?: string }) {
  return (
    <span className="trong" title={viSao}>
      {CHU.khongCo}
    </span>
  );
}


/**
 * Một ô của dải tổng, nhấp MỘT lần khi con số của nó đổi.
 *
 * Đây là câu trả lời cho tiêu chí thành công ở PRODUCT.md — "mở studio sau 6 giờ đi vắng và
 * trong vòng 5 giây biết dây chuyền khỏe hay bệnh". Trước bản này, một chương chốt và một đô
 * tiêu thêm đều là cú thay giá trị tức thời: không nhìn đúng ô đó thì không biết nó vừa đổi.
 *
 * Nhấp theo `so` (giá trị THẬT) chứ không theo `chu` (chuỗi đã định dạng): `tongTien` làm tròn
 * hai chữ số, nên hai giá trị khác nhau có thể cho cùng một chuỗi và cú nhấp sẽ mất đúng những
 * lần đổi nhỏ — mà tiền thì đổi từng xu.
 *
 * `key` là thứ làm animation chạy lại; xem lib/dauDoi.ts.
 */
function OTong({
  so: giaTri,
  chu,
  nhan,
  loai,
}: {
  so: number;
  /**
   * Chuỗi đã định dạng. `undefined` là ca THẬT: `so()` trả undefined cho giá trị vắng hoặc
   * không hữu hạn — giữ đúng kiểu đó thay vì ép, vì bề mặt phải vẽ được ca không có số.
   */
  chu: string | undefined;
  nhan: string;
  /** `chot` = tiến độ (teal) · `tien` = tiền (gold). Hai nghĩa, theo bảng ngữ nghĩa đã chốt. */
  loai: 'chot' | 'tien';
}) {
  const dau = useDauDoi(giaTri);
  return (
    <span key={dau} className={`o${dau > 0 ? ` vuaDoi-${loai}` : ''}`}>
      {chu} <em>{nhan}</em>
    </span>
  );
}
