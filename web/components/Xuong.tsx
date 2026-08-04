'use client';

import { donGia, nangSuat, ngayGio, so, soTu, tienDo, tongTien } from '@/lib/dinhdang';
import type { Khu } from '@/lib/khu';
import { CHU, GIAI_THICH, nhanPhase } from '@/lib/nhan';
import type { Book } from '@/lib/types';
import { tienCuaXuong, vieccanBanCuaXuong, type TaiTongXuong, type ViecCanBan } from '@/lib/tongXuong';
import { tongXuong } from '@/lib/xuong';
import { useDauDoi } from '@/lib/dauDoi';

/**
 * Màn QUẢN LÝ: mọi tác phẩm trong xưởng, và cái gì đang cần người vận hành.
 *
 * # Bề mặt này đã đổi vai, không chỉ đổi hình
 *
 * Trước bản ba màn nó là một KHU tên "Xưởng" nằm trong studio của một cuốn: rail bên trái
 * liệt kê 14 khu của cuốn đó, thanh trên là bộ chọn của cuốn đó, transport dưới đáy mời
 * `▶ Chạy` cho cuốn đó. Ba trong bốn vùng của khung nói về một cuốn trong khi canvas nói về
 * cả xưởng. Giờ nó là MÀN, và cả khung nói cùng một phạm vi với nó.
 *
 * # Vì sao có dải "cần bạn", và vì sao nó ở TRÊN dải tổng
 *
 * Thứ tự này là thứ tự ba câu hỏi trong PRODUCT.md, và câu đầu tiên không phải "tôi có bao
 * nhiêu" mà "dây chuyền còn chạy đúng không, hay đã kẹt". Một dải tổng đứng trước sẽ trả lời
 * câu thứ ba trước tiên.
 *
 * Dải này KHÔNG mang dữ liệu mới — mọi thứ trong nó đã có trong bảng ngay dưới. Nó mang THỨ
 * TỰ ƯU TIÊN, đúng luật đã ghi cho dải việc-tiếp-theo ở buồng lái.
 *
 * # Vì sao KHÔNG có nút chạy ở đây (giữ nguyên quyết định 4, spec §4)
 *
 * Chạy và dừng chỉ có ở transport, trên cuốn đang mở — một đường tiêu tiền duy nhất. Hai nút
 * cùng gọi `POST /run` thì trạng thái khóa-lúc-đang-gửi của chúng không thấy nhau, nên bấm
 * cả hai là hai lượt chạy và trả tiền hai lần. Và đây là bề mặt người ta QUÉT MẮT.
 *
 * Bản trước in nguyên hai đoạn văn dài nói điều đó ra giữa màn hình. Đo được ở 1512×900:
 * bảng cao 182px, hai đoạn biện giải cao 110px — lời giải thích nặng bằng hơn nửa thứ nó
 * giải thích. Lý do vẫn còn, nhưng nó về `title` của đúng chỗ người dùng sẽ hỏi.
 *
 * # Vì sao KHÔNG có xóa và đổi tên (quyết định 8, giữ nguyên)
 *
 * Xóa một cuốn là xóa hàng giờ chạy và hàng chục đô. Việc đó để ở hệ tệp, nơi thấy rõ mình
 * đang phá cái gì.
 *
 * # `0` KHÔNG phải "chưa đo được", và đó vẫn là luật chính của bảng này
 *
 * `chapters_per_hour` và `cost_per_chapter` về `0` cho cuốn CHƯA CHẠY lần nào — server không
 * có gì để chia. In `0 ch/giờ` ra thì bảng nói cuốn đó chạy chậm tới mức không xong nổi một
 * chương trong một giờ. `cost_usd === 0` thì NGƯỢC LẠI: đó là một phép đo có thật.
 */
export function Xuong({
  sach,
  tong,
  onChonKhu,
  onMoTacPham,
}: {
  sach: Book[];
  /** Tờ `/api/workshop/cost`, nạp ở `Trang`. `du === undefined` = chưa có, không phải rỗng. */
  tong: TaiTongXuong;
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
  /**
   * Đi tới một khu mức MÁY (Tác phẩm mới / Cùng dựng) — không kèm tác phẩm nào.
   *
   * Khác `onMoTacPham` ở đúng chỗ đáng khác: hai khu đó không đọc `tacPham`, nên truyền một
   * cuốn vào chúng là mời người sau dùng nó rồi biến một bề mặt toàn cục thành
   * nửa-theo-tác-phẩm — cùng lý lẽ đã ghi cho `laKhuMucMay`.
   */
  onChonKhu: (khu: Khu) => void;
}) {
  const t = tongXuong(sach);
  const tien = tienCuaXuong(tong.du);
  const viec = vieccanBanCuaXuong(tong.du, sach);
  const dangChay = sach.find((b) => b.activity === 'running');
  const engineMo = sach.find((b) => b.engine_open);

  return (
    <main className="canvas khuxuong" id="xuong">
      <div className="head">
        <h1>{CHU.manQuanLy}</h1>
      </div>

      <DaiCanBan
        viec={viec}
        dangChay={dangChay}
        engineMo={engineMo}
        onMoTacPham={onMoTacPham}
      />

      {/* Dải tổng: câu trả lời cho "đã tiêu bao nhiêu", đặt TRÊN bảng vì đó là câu người ta
          mở bề mặt này để hỏi. Bắt cuộn qua một bảng mười dòng rồi mới thấy tổng là bắt họ
          tự cộng trong lúc cuộn. */}
      <div className="xtong">
        <OTong so={t.soTacPham} chu={so(t.soTacPham)} nhan={CHU.donViTacPham} loai="chot" />
        <OTong so={t.chuongDaChot} chu={so(t.chuongDaChot)} nhan={CHU.donViChuongDaChot} loai="chot" />
        <OTong so={t.soTu} chu={so(t.soTu)} nhan={CHU.donViTu} loai="tu" />
        {/* Ô tiền mang MẪU SỐ của chính nó. Đo trên xưởng thật: $7,37 với `counted: 1` trên
            ba cuốn — hai cuốn kia chưa có meta/usage.json. Một con số tiền không kèm mẫu số
            sẽ được đọc thành "cả xưởng tốn có thế". */}
        <OTong
          so={t.chiPhi}
          chu={tongTien(t.chiPhi)}
          nhan={CHU.donViDaTieu}
          loai="tien"
          phu={
            tien && tien.tongSach > 0 && tien.demDuoc < tien.tongSach
              ? tien.demDuoc === 0
                ? CHU.chuaDoDuocCuonNao
                : CHU.doDuocO(tien.demDuoc, tien.tongSach)
              : undefined
          }
          viSaoPhu={GIAI_THICH.tongTienMauSo}
        />
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
              <th scope="col">{CHU.colCanBan}</th>
              <th scope="col">{CHU.colSuaLanCuoi}</th>
              <th scope="col">{CHU.colHanhDong}</th>
            </tr>
          </thead>
          <tbody>
            {sach.map((b) => (
              <Dong
                key={b.id}
                b={b}
                viec={viec.find((v) => v.sach.id === b.id)}
                onMoTacPham={onMoTacPham}
              />
            ))}
          </tbody>
        </table>
      </div>

      <DaiTaoMoi onChonKhu={onChonKhu} />
    </main>
  );
}

/**
 * Dải tạo tác phẩm, ở CUỐI màn Quản lý.
 *
 * # Vì sao nó tồn tại, và vì sao ở cuối
 *
 * ĐO ĐƯỢC ở 1512×900 với ba cuốn: bảng kết thúc ở 377px trong một khung 722px, tức 345px
 * (48%) cuối màn là khoảng trống. Một màn mở đầu bỏ trống nửa dưới đọc ra là "hết rồi", và
 * câu mà người vận hành mang tới đúng lúc đó — sau khi đã quét xong bảng — là "tạo cuốn nữa
 * ở đâu". Nên chỗ trống ấy nhận đúng câu trả lời đó.
 *
 * Ở CUỐI chứ không ở đầu: hai nút này là việc làm MỘT LẦN cho mỗi tác phẩm, còn bảng phía
 * trên là thứ được đọc mỗi lần mở studio. Đặt chúng trên bảng là để một hành động hiếm chắn
 * trước một phép đọc thường xuyên.
 *
 * # Vì sao KHÔNG phải hai thẻ
 *
 * Hai thẻ cùng cỡ mang biểu tượng + tiêu đề + mô tả là mẫu mặc định của landing page, và
 * PRODUCT.md cấm thẳng lưới thẻ giống nhau lặp lại. Đây là hai HÀNG: nút bên trái, câu giải
 * thích bên phải — cùng ngữ pháp với dải kênh vai và các danh sách khóa-giá trị khác của
 * studio.
 */
function DaiTaoMoi({ onChonKhu }: { onChonKhu: (khu: Khu) => void }) {
  return (
    <div className="taomoi">
      <h2>{CHU.batDauCuonMoi}</h2>
      <div className="hang">
        <button type="button" className="nutChiTiet" onClick={() => onChonKhu('tac-pham-moi')}>
          {CHU.taoTacPham}
        </button>
        <span className="mo">{GIAI_THICH.taoSachGiaiThich}</span>
      </div>
      <div className="hang">
        <button type="button" className="nutPhu" onClick={() => onChonKhu('cung-dung')}>
          {CHU.cungDung}
        </button>
        <span className="mo">{GIAI_THICH.cungDungGiaiThich}</span>
      </div>
    </div>
  );
}

/**
 * Dải "cần bạn" — hàng đầu của màn Quản lý.
 *
 * Ba trạng thái, và chúng KHÔNG cùng một loại sự thật. Sự khác nhau đó phải đọc được, nếu
 * không dải này sẽ dạy người dùng rằng một dòng trên đĩa và một engine đang đứng chờ là cùng
 * một thứ:
 *
 *   1. `activity === 'running'` — engine đang chạy MỘT cuốn. `/api/workshop` chứng minh
 *      được, và vì `boMay.soToiDa === 1` thì nhiều nhất một cuốn ở trạng thái này.
 *   2. có ý định đã ký — đọc từ `meta/run.json`. Đây là sự thật trên ĐĨA, không phải lời
 *      engine khẳng định nó đang đứng ở cửa. Câu chữ ("đã ký") mang đúng nghĩa đó.
 *   3. không có gì — nói thẳng ra. Một dải trống ở vị trí đầu tiên đọc thành "đang tải".
 *
 * Nút ở đây chỉ ĐIỀU HƯỚNG. Việc chạy engine để nguyên ở transport của màn sản xuất, vì hai
 * nút cùng gọi một API tiêu tiền thì trạng thái khóa của chúng không thấy nhau.
 */
function DaiCanBan({
  viec,
  dangChay,
  engineMo,
  onMoTacPham,
}: {
  viec: ViecCanBan[];
  dangChay: Book | undefined;
  engineMo: Book | undefined;
  onMoTacPham: (id: string, khu: Khu, chuong?: number) => void;
}) {
  if (dangChay) {
    return (
      <div className="daicanban dangchay">
        <span className="ky dap" aria-hidden="true">
          ▶
        </span>
        <span className="cau">{CHU.mayDangChay(tenSach(dangChay))}</span>
        <span className="day" />
        <button
          type="button"
          className="nutPhu"
          onClick={() => onMoTacPham(dangChay.id, 'dong-san-xuat')}
        >
          {CHU.vaoXuong(tenSach(dangChay))}
        </button>
      </div>
    );
  }

  if (viec.length === 0) {
    return (
      <div className="daicanban rong">
        <span className="ky" aria-hidden="true">
          ○
        </span>
        <span className="cau">{CHU.khongCoViecTon}</span>
        {/* Engine còn mở mà không chạy là tin vận hành thật: nó đang giữ khóa tệp của cuốn
            đó, nên không mở được cuốn khác. Nói ra ở đây thay vì để người dùng phát hiện
            bằng một lỗi 409 lúc bấm chạy cuốn thứ hai. */}
        {engineMo ? (
          <>
            <span className="phu">· {CHU.engineConMoO(tenSach(engineMo))}</span>
            <span className="day" />
            <button
              type="button"
              className="nutPhu"
              onClick={() => onMoTacPham(engineMo.id, 'dong-san-xuat')}
            >
              {CHU.vaoXuong(tenSach(engineMo))}
            </button>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="daicanban cocho" title={GIAI_THICH.canBanTuDia}>
      {viec.map((v) => (
        <div className="hangcanban" key={v.sach.id}>
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span className="ten">{tenSach(v.sach)}</span>
          <span className="cau">
            {v.tamDung ? CHU.daKyTamDung : null}
            {v.tamDung && v.canThiep ? ' · ' : null}
            {v.canThiep ? CHU.daKyCanThiep : null}
          </span>
          {/* Lý do là chữ của chính người vận hành viết lúc ký mốc tạm dừng. Nó ở đây chứ
              không trong `title` vì một việc tồn không nói lý do thì không hành động được —
              phải vào tận nơi mới biết mình đã dặn gì. */}
          {v.lyDo ? <span className="ly">{v.lyDo}</span> : null}
          <span className="day" />
          <button
            type="button"
            className="nutPhu"
            onClick={() => onMoTacPham(v.sach.id, 'dong-san-xuat')}
          >
            {CHU.chiTiet}
          </button>
        </div>
      ))}
    </div>
  );
}

function Dong({
  b,
  viec,
  onMoTacPham,
}: {
  b: Book;
  viec: ViecCanBan | undefined;
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
            phân biệt được chúng. Đo được trên xưởng thật: cả BA cuốn đều tên "Trấn Yêu Ký". */}
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

      {/* Cột "Cần bạn": dấu amber + chữ, không chỉ dấu. Màu không bao giờ là kênh thông tin
          duy nhất — luật của PRODUCT.md, và ở đây nó còn quan trọng hơn thường lệ vì hai
          loại việc (mốc tạm dừng / ý kiến can thiệp) cần phân biệt được với nhau. */}
      <td className="canban" data-nhan={CHU.colCanBan}>
        {viec ? (
          <span className="dau" title={v_title(viec)}>
            <span className="ky" aria-hidden="true">
              ■
            </span>
            {viec.tamDung && viec.canThiep
              ? `${CHU.daKyTamDungNgan} · ${CHU.daKyCanThiepNgan}`
              : viec.tamDung
                ? CHU.daKyTamDungNgan
                : CHU.daKyCanThiepNgan}
          </span>
        ) : (
          <span className="trong">{CHU.khongCo}</span>
        )}
      </td>

      <td className="sua" data-nhan={CHU.colSuaLanCuoi}>
        {sua ?? <Trong viSao={GIAI_THICH.xuongChuaBietSuaLucNao} />}
      </td>

      {/* Hành động: ĐIỀU HƯỚNG, và chỉ điều hướng. Không nút nào ở đây gọi một route ghi.
          `Chi tiết` là nhãn của chính người dùng ("bấm vào chi tiết mới tới xưởng sản xuất"),
          và nó thay cho `Mở` cũ vì "Mở" mơ hồ đúng chỗ đắt nhất: studio còn có `Mở máy`, một
          nút KHỞI ĐỘNG ENGINE. `Đọc` và `Xuất bản` chỉ có ở cuốn đã hoàn thành vì trước đó
          chúng dẫn tới hai bề mặt nói "chưa có gì". */}
      <td className="lam">
        <button
          type="button"
          className="nutChiTiet"
          title={GIAI_THICH.quanLyKhongCoNutChay}
          onClick={() => onMoTacPham(b.id, 'dong-san-xuat')}
        >
          {CHU.chiTiet}
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

/** Chú giải của ô "Cần bạn": lý do đã ký, hoặc câu nói rõ đây là sự thật trên đĩa. */
function v_title(v: ViecCanBan): string {
  return v.lyDo ? `${v.lyDo} — ${GIAI_THICH.canBanTuDia}` : GIAI_THICH.canBanTuDia;
}

function tenSach(b: Book): string {
  return b.name || b.id;
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
  phu,
  viSaoPhu,
}: {
  so: number;
  /**
   * Chuỗi đã định dạng. `undefined` là ca THẬT: `so()` trả undefined cho giá trị vắng hoặc
   * không hữu hạn — giữ đúng kiểu đó thay vì ép, vì bề mặt phải vẽ được ca không có số.
   */
  chu: string | undefined;
  nhan: string;
  /** `chot` = tiến độ (teal) · `tien` = tiền (gold) · `tu` = số từ, không tô. */
  loai: 'chot' | 'tien' | 'tu';
  /** Mẫu số của con số, khi nó không phủ hết xưởng. */
  phu?: string;
  viSaoPhu?: string;
}) {
  const dau = useDauDoi(giaTri);
  return (
    <span key={dau} className={`o${dau > 0 ? ` vuaDoi-${loai}` : ''}`}>
      {chu} <em>{nhan}</em>
      {phu ? (
        <span className="mauSo" title={viSaoPhu}>
          {phu}
        </span>
      ) : null}
    </span>
  );
}
