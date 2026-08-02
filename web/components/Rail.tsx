'use client';

import { useEffect, useRef, useState } from 'react';

import type { Khu } from '@/lib/khu';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { Profile, Snapshot, TinhTrangNguon } from '@/lib/types';
import { useDauDoi, useDauToi } from '@/lib/dauDoi';
import { useTruot } from '@/lib/truot';

/**
 * Rail trái: các khu vực sản xuất, kèm số đếm việc tồn.
 *
 * Số đếm là điểm mấu chốt — nó trả lời "còn tồn gì" mà không cần vào từng khu.
 * Mọi số ở đây phải suy được từ dữ liệu đã có; không có nguồn thì KHÔNG hiện
 * số. Rail trống số còn tốt hơn rail có số bịa, vì người vận hành sẽ tin nó và
 * bỏ qua một hàng chờ thật.
 *
 * Ba loại mục, và sự khác nhau giữa chúng phải THẤY ĐƯỢC, không chỉ cảm được:
 *
 *   1. có bề mặt thật  → nút điều hướng, `aria-current` khi đang mở
 *   2. nằm trong khu khác → nút điều hướng tới khu đó, chú giải nói rõ
 *   3. chưa dựng bề mặt → KHÔNG phải nút: chữ mờ + nhãn "chưa dựng"
 *
 * Loại 3 là chỗ dễ nói dối nhất. Một mục trông bấm được mà bấm vào không đi đâu
 * là một lời hứa hụt; tệ hơn là bấm vào rồi ra một bề mặt trống trơn, vì lúc đó
 * người vận hành kết luận tác phẩm không có dữ liệu chứ không phải studio chưa
 * dựng bề mặt.
 *
 * Ba mục Văn phong / Chi phí / Cài đặt TỪNG ở loại 3 vì API không có endpoint.
 * Giờ chúng đã có bề mặt và có endpoint (`/style`, `/cost`, `/settings`), nên
 * chúng không còn là loại 3 một cách cố định — chúng đổi loại theo BẢN ENGINE
 * ĐANG CHẠY, và đó là loại thứ tư:
 *
 *   4. có bề mặt, nhưng nguồn của nó chưa chắc có → xem `TinhTrangNguon`
 *
 * Ba trạng thái, ba cách vẽ khác nhau, và sự khác nhau phải THẤY ĐƯỢC:
 *
 *   'thieu-endpoint' → bản engine đang chạy không có route (404). Vẫn là loại 3:
 *                      chữ mờ, nhãn "chưa dựng". Bấm vào thì bề mặt chỉ hiện được
 *                      một câu lỗi HTTP, và đó là một lời hứa hụt.
 *   'co-route'       → route có, store chưa có dữ liệu. LÀ NÚT, kèm nhãn báo
 *                      trước là sẽ rỗng. Bề mặt tự nói rõ rỗng vì sao — chưa chạy
 *                      gì / tệp có mà rỗng / schema lệch — nên vào đó KHÔNG phải
 *                      một bề mặt trống trơn, mà là một câu trả lời.
 *   'co-nguon'       → nút thường.
 *
 * Vì sao không gate bằng ba cờ trong `capabilities`: cờ trả lời "store có dữ liệu
 * không", không trả lời "engine này có route không". Với một binary engine cũ hơn
 * bản web, cờ vắng mặt và mọi phép kiểm falsy trên nó sẽ dán nhãn sai lên cả ba
 * mục. `Profile` hỏi thăm endpoint thật nên nó phân biệt được hai câu đó.
 *
 * Và khi CHƯA BIẾT (`hoSo` chưa về, hoặc lời hỏi thăm lỗi mạng) thì mục vẫn là
 * NÚT. Chỉ hạ xuống "chưa dựng" khi biết chắc là thiếu endpoint: đoán theo hướng
 * kia sẽ nháy một nhãn "chưa dựng" lên một bề mặt đã dựng, mỗi lần đổi tác phẩm.
 */
export function Rail({
  snapshot,
  hoSo,
  khu,
  onChonKhu,
  dauChot,
}: {
  snapshot: Snapshot | undefined;
  hoSo: Profile | undefined;
  khu: Khu;
  onChonKhu: (k: Khu) => void;
  /**
   * Họ 10 (đồng thanh) — bộ đếm sự kiện chốt chương, dùng chung với lane và thanh trên.
   *
   * Chip "Bản thảo" ĐÃ tự nhấp khi số đổi (họ 08, `useDauDoi`), nên câu hỏi hợp lý là vì
   * sao cần thêm một đường nữa. Vì hai lý do đo được:
   *
   *   · Họ 08 nhấp theo `completed_chapters` từ `book`, còn lane nhấp theo `timeline`.
   *     Hai trường đó đến từ hai phép tính ở server và không đổi cùng một nhịp, nên hai
   *     chỗ nhấp LỆCH nhau — mà "cùng thời điểm" chính là thứ làm nên họ 10.
   *   · Họ 08 dùng `nhapDem` (vàng, "một con số vừa đổi"), họ 10 dùng `dongThanh` (teal,
   *     "một chương vừa chốt"). Cùng màu với vạch trên lane là thứ dạy người dùng rằng ba
   *     chỗ đó là MỘT sự thật nhìn từ ba góc.
   */
  dauChot: number;
}) {
  const oRail = useRef<HTMLElement>(null);

  /* Dấu chỉ khu đang mở TRƯỢT theo trục DỌC. Nâng cấp tiệm tiến: nền của `[aria-current]` vẫn
     là thứ nói đúng cho tới khi hook đo được — xem lib/truot.ts. */
  const hopTruot = useTruot<HTMLElement>('.mucdi[aria-current="page"]', 'doc', khu);
  /** Neo cần cuộn tới sau khi khu đích đã render. */
  const neoCho = useRef<string>(undefined);

  useEffect(() => {
    // Dưới 860px rail là một DẢI NGANG cuộn được, và khu đang mở có thể nằm ngoài
    // mép phải: người vận hành đổi khu bằng URL hoặc tải lại trang rồi không thấy
    // mục nào sáng lên, tức không biết mình đang ở đâu.
    // `block: 'nearest'` để ở màn hình rộng (rail là cột) nó không kéo trang dọc.
    oRail.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });

    // Cuộn tới neo Ở ĐÂY, trong effect, chứ không trong lúc bấm.
    // Bản trước dùng `requestAnimationFrame` ngay trong onClick và nó KHÔNG chạy:
    // ĐO ĐƯỢC — bấm "Nhật ký phán quyết" từ bề mặt đọc thì ở nhịp vẽ đó khu Dòng
    // sản xuất chưa mount, `getElementById` trả null, và bề mặt mở ra ở đầu trang.
    // Effect thì chạy SAU khi React commit cả cây, nên lúc này neo đã có trong DOM.
    if (neoCho.current) {
      document.getElementById(neoCho.current)?.scrollIntoView({ block: 'start' });
      neoCho.current = undefined;
    }
  }, [khu]);

  const rows = snapshot?.chapters ?? [];

  // Bản thảo = số chương đã có bản thảo chốt. Lấy từ book, là số store ghi.
  const banThao = snapshot?.book.completed_chapters;
  // Kiểm định đếm từ BẢNG CHƯƠNG, không từ vạch `gate` trên trục — cùng cái bẫy
  // như `vietLai` ngay dưới, nhưng ca này tệ hơn vì hai con số lệch tới mức trái
  // dấu nhau.
  // ĐO ĐƯỢC ở bản trước: trục có 0 vạch `gate` (vạch đó chỉ tồn tại khi một
  // chương đang đứng đúng ở cửa, tức một cửa sổ hẹp trong đời chương) trong khi
  // bề mặt Kiểm định ghi "3 chương có dấu vết sản xuất · 1 đã nghiệm thu" và mở
  // ra bản duyệt 7 chiều của chương 1 với một vấn đề severity `error`. Rail ghi
  // `Kiểm định 0`, người vận hành đọc "không có gì để kiểm" rồi đi qua — mất câu
  // hỏi số 2 của PRODUCT.md ("chất lượng có tuột không").
  // Một nhãn thì một mẫu số: bề mặt liệt kê `snapshot.chapters` (KiemDinh.tsx:43)
  // nên rail đếm đúng cái đó.
  //
  // Và con số này KHÔNG mang `canhBao`. Amber nghĩa là "cần chú ý", còn "có chương
  // để kiểm" là trạng thái thường trực của mọi tác phẩm đang chạy. Bản trước bật
  // amber theo `cuaKiemDinh > 0` — một điều kiện gần như không bao giờ đúng, nên
  // chưa ai thấy nó sai. Báo động chất lượng thật nằm ở Hàng chờ viết lại ngay
  // dưới, và mục đó có amber.
  const kiemDinh = rows.length;
  // Hàng chờ viết lại đếm từ BẢNG CHƯƠNG, không từ vạch trên trục — vì bề mặt
  // hàng chờ cũng đọc từ đó. Lane chương chỉ trải từ 1 tới `total_chapters` nên
  // một chương chờ viết lại ngoài khoảng đó không có vạch: rail sẽ báo 2 rồi bề
  // mặt liệt kê 3, và con số nhỏ hơn là con số người vận hành tin.
  const vietLai = rows.filter((r) => r.stage === 'rewrite').length;
  const phanQuyet = snapshot?.decisions?.length;

  // Chương đang chạy: hiện ở khu bản thảo để thấy dây chuyền còn động.
  const dangSoan = rows.filter((r) => r.stage === 'drafting').length;

  return (
    <nav
      className="rail"
      aria-label="Khu vực sản xuất"
      /* HAI ref trên một thẻ: `oRail` cho effect tự-mở-nhóm (đọc `[aria-current]` từ DOM),
         `hopTruot` cho dấu chỉ trượt. Gộp bằng callback ref vì React chỉ nhận một `ref`. */
      ref={(el) => {
        oRail.current = el;
        hopTruot.current = el;
      }}
    >
      {/* Nhóm 1 mở sẵn và không thu được: đây là nhóm chứa bề mặt đang mở ở mọi lần vào
          đầu tiên, nên thu nó lại là để người dùng đối diện một rail rỗng. */}
      <Nhom ma="truyen" ten={CHU.nhomTruyen} luonMo>
        {/* Bản thảo lên ĐẦU, trước Dòng sản xuất.
            Thứ tự cũ đặt bảng giám sát trước thành quả, và đó là thứ tự của người dựng hệ
            thống chứ không của người viết truyện: cửa đầu tiên nên là thứ người dùng muốn
            nhất. Bề mặt mặc định vẫn là Dòng sản xuất — đổi cả cửa đó là đổi sản phẩm,
            không phải sửa rail. */}
        {/* Bản thảo là mục DUY NHẤT nhận `dauChot`: nó đếm chương đã chốt, tức đúng con số
            mà sự kiện ấy làm đổi. Rải nó ra các mục khác sẽ biến một tin thành một đợt
            nhấp toàn rail — đúng thứ họ 10 tồn tại để KHÔNG làm. */}
        <MucDi
          nhan={CHU.banThao}
          ky="✎"
          di="ban-thao"
          khu={khu}
          onChonKhu={onChonKhu}
          dem={banThao}
          dauChot={dauChot}
          chuGiai={
            dangSoan > 0
              ? `${banThao ?? 0} chương đã chốt · ${dangSoan} đang soạn`
              : undefined
          }
        />
        <MucDi
          nhan={CHU.dongSanXuat}
          ky="▤"
          di="dong-san-xuat"
          khu={khu}
          onChonKhu={onChonKhu}
        />
        <MucDi
          nhan={CHU.kiemDinh}
          ky="◆"
          di="kiem-dinh"
          khu={khu}
          onChonKhu={onChonKhu}
          dem={kiemDinh}
          chuGiai={GIAI_THICH.railKiemDinhDem}
        />
        <MucDi
          nhan={CHU.hangChoVietLai}
          ky="■"
          di="hang-cho-viet-lai"
          khu={khu}
          onChonKhu={onChonKhu}
          dem={vietLai}
          canhBao={vietLai > 0}
        />
        {/* Nhập & Xuất về nhóm này, không ở nhóm vận hành.
            Xuất bản là hợp nhất BẢN THẢO thành một tệp mang về máy — nó tác động lên chính
            thứ nhóm này chứa. Ở nhóm vận hành nó nằm giữa chi phí và cấu hình, tức giữa các
            mục nói về cái máy, nên không ai tìm "xuất truyện ra tệp" ở đó. */}
        <MucDi
          nhan={CHU.nhapXuat}
          ky="⇄"
          di="nhap-xuat"
          khu={khu}
          onChonKhu={onChonKhu}
          chuGiai={GIAI_THICH.xuatBanGiaiThich}
        />
      </Nhom>

      <Nhom
        ma="the-gioi"
        ten={CHU.nhomTheGioi}
        khu={khu}
        // Phục bút chưa thu là việc TỒN — nhóm thu lại vẫn phải mang dấu đó ra ngoài, nếu
        // không thu nhóm biến thành ẩn một hàng chờ thật.
        canhBao={(hoSo?.foreshadow ?? 0) > 0}
      >
        <MucDi
          nhan={CHU.danYPhanTang}
          ky="☰"
          di="dan-y"
          khu={khu}
          onChonKhu={onChonKhu}
          dem={soKhoiDanY(snapshot)}
        />
        <MucDi
          nhan={CHU.nhanVat}
          ky="●"
          di="nhan-vat"
          khu={khu}
          onChonKhu={onChonKhu}
          dem={hoSo?.characters ?? undefined}
        />
        <MucDi
          nhan={CHU.luatTheGioi}
          ky="⬢"
          di="luat-the-gioi"
          khu={khu}
          onChonKhu={onChonKhu}
          dem={hoSo?.rules ?? undefined}
        />
        <MucDi
          nhan={CHU.phucBut}
          ky="◇"
          di="phuc-but"
          khu={khu}
          onChonKhu={onChonKhu}
          dem={hoSo?.foreshadow ?? undefined}
          canhBao={(hoSo?.foreshadow ?? 0) > 0}
        />
        {/* Văn phong không có số đếm: store giữ nó là một bản mô tả, không phải
            danh sách đếm được. Không có nguồn thì không hiện ô số. */}
        <MucNguon
          nhan={CHU.vanPhong}
          ky="✒"
          di="van-phong"
          khu={khu}
          onChonKhu={onChonKhu}
          nguon={hoSo?.vanPhong}
          chuGiai={GIAI_THICH.railVanPhong}
          viSaoThieu={GIAI_THICH.thieuEndpointVanPhong}
        />
      </Nhom>

      <Nhom ma="van-hanh" ten={CHU.nhomVanHanh} khu={khu}>
        {/* Nhật ký phán quyết CÓ bề mặt — nó là một mục trong Dòng sản xuất. Nên
            đây là điều hướng thật, không phải mục chưa dựng. */}
        <MucDi
          nhan={CHU.nhatKyPhanQuyet}
          ky="⌗"
          di="dong-san-xuat"
          khu={khu}
          onChonKhu={onChonKhu}
          dem={phanQuyet}
          chuGiai={GIAI_THICH.namTrongDongSanXuat}
          neo="nhat-ky-phan-quyet"
          phu
        />
        <MucNguon
          nhan={CHU.chiPhi}
          ky="$"
          di="chi-phi"
          khu={khu}
          onChonKhu={onChonKhu}
          nguon={hoSo?.chiPhi}
          chuGiai={GIAI_THICH.railChiPhi}
          viSaoThieu={GIAI_THICH.thieuEndpointChiPhi}
        />
        <MucDi
          nhan={CHU.toSanXuat}
          ky="☗"
          di="to-san-xuat"
          khu={khu}
          onChonKhu={onChonKhu}
        />
        <MucNguon
          nhan={CHU.caiDat}
          ky="⚙"
          di="cai-dat"
          khu={khu}
          onChonKhu={onChonKhu}
          nguon={hoSo?.caiDat}
          chuGiai={GIAI_THICH.railCaiDat}
          viSaoThieu={GIAI_THICH.thieuEndpointCaiDat}
        />
      </Nhom>

      {/* Nhóm mức MÁY, tách khỏi ba nhóm trên có chủ ý.
          Cấu hình máy sửa ~/.ainovel/config.json — nó áp cho mọi tác phẩm và mọi lượt
          chạy sau, không thuộc cuốn đang mở. Để nó lẫn vào nhóm vận hành là mời đúng cái
          nhầm mà bề mặt Cài đặt đã phải tách ra để tránh: người vận hành đọc nó thành
          "cấu hình của cuốn này". Tên nhóm nói thẳng ranh giới đó ra. */}
      <Nhom ma="chung" ten={CHU.nhomChung} khu={khu}>
        {/* Xưởng đứng ĐẦU nhóm, trên cả Tác phẩm mới: thứ tự này là thứ tự câu hỏi. "Tôi
            đang có gì" đi trước "thêm một cái nữa", và người vào nhóm này để đếm lại xưởng
            thì không phải quét qua một nút tạo trước đã. */}
        <MucDi
          nhan={CHU.xuong}
          ky="▦"
          di="xuong"
          khu={khu}
          onChonKhu={onChonKhu}
          chuGiai={GIAI_THICH.xuongRailGiaiThich}
        />
        <MucDi
          nhan={CHU.cungDung}
          ky="⁂"
          di="cung-dung"
          khu={khu}
          onChonKhu={onChonKhu}
          chuGiai={GIAI_THICH.cungDungGiaiThich}
        />
        {/* Vẫn còn ở đây dù thanh trên đã có nút tạo tác phẩm: nút trên thanh vắng mặt khi
            máy không ghi được, và bỏ mục này đi thì lúc đó không còn đường nào tới bề mặt.
            Hai đường tới cùng một bề mặt ĐIỀU HƯỚNG là chuyện lành — khác hẳn hai nút cùng
            gọi một API tiêu tiền. */}
        <MucDi
          nhan={CHU.taoTacPham}
          ky="+"
          di="tac-pham-moi"
          khu={khu}
          onChonKhu={onChonKhu}
          chuGiai={GIAI_THICH.taoSachGiaiThich}
        />
        <MucDi
          nhan={CHU.cauHinh}
          ky="⌸"
          di="cau-hinh"
          khu={khu}
          onChonKhu={onChonKhu}
          chuGiai={GIAI_THICH.cauHinhLaMucMay}
        />
      </Nhom>
    </nav>
  );
}

/** Khóa localStorage giữ nhóm nào đang mở. Một khóa cho cả rail, không phải một khóa mỗi nhóm. */
const KHOA_NHOM_MO = 'ainovel.rail.nhomMo';

/**
 * Nhóm rail thu gọn được.
 *
 * # Vì sao thu gọn, và vì sao mặc định là ĐÓNG
 *
 * Mười sáu mục cùng sức nặng là mười sáu cánh cửa không cái nào được ưu tiên — người dùng
 * nói nguyên văn "quá ngợp". Thu ba nhóm dưới lại còn năm mục thấy được, tức đúng số cửa
 * mà mọi công cụ viết truyện khác dừng ở (không tool nào vượt 5 khu mức một).
 *
 * Mặc định đóng là quyết định về LẦN ĐẦU: người quay lại chỉ trả giá một cú bấm và trạng
 * thái đó được ghi nhớ, còn người lần đầu thì cái giá của một rail dày là họ không bắt đầu.
 *
 * # Vì sao thu bằng CSS chứ không bằng cách thôi render
 *
 * Dưới 860px rail là DẢI NGANG và nhãn nhóm bị ẩn (`.rail .grp { display: none }`) vì nó
 * không còn đứng trên nhóm nào. Nếu trạng thái đóng làm các mục thôi tồn tại thì ở bề rộng
 * đó chúng biến mất mà không còn cái nút nào để mở lại — tức khóa người dùng ra khỏi mười
 * một khu. Giữ chúng trong DOM và để một `@media` bật lại là cách duy nhất khiến hai chế độ
 * không đánh nhau.
 *
 * # Vì sao đọc localStorage trong effect
 *
 * `web/` là static export: HTML được dựng lúc build, nên đọc localStorage trong lượt render
 * đầu là hydration mismatch. Effect chạy sau khi React đã gắn cây, nên nó chỉ sửa trạng
 * thái — cái giá là một nhịp nhóm hiện theo mặc định trước khi về trạng thái đã lưu.
 */
function Nhom({
  ma,
  ten,
  khu,
  luonMo,
  canhBao,
  children,
}: {
  ma: string;
  ten: string;
  /** Khu đang mở — chỉ dùng làm nhịp cho effect tự mở nhóm, không để so trực tiếp. */
  khu?: Khu;
  /** Nhóm không thu được: dùng cho nhóm chứa bề mặt mặc định. */
  luonMo?: boolean;
  /** Có việc tồn bên trong — dấu phải ra ngoài kể cả khi nhóm đang đóng. */
  canhBao?: boolean;
  children: React.ReactNode;
}) {
  const [mo, datMo] = useState(!!luonMo);
  const oNhom = useRef<HTMLDivElement>(null);

  // MỘT effect cho cả hai luật, không phải hai — thứ tự giữa chúng là một luật thật:
  // "nhóm chứa khu đang mở phải mở" ĐÈ trạng thái đã lưu. Tách ra hai effect thì thứ tự
  // đó chỉ còn là thứ tự khai báo, và người sửa sau đảo hai khối là mất luật mà không có
  // gì báo.
  //
  // Vì sao luật đó phải thắng: mở `?khu=cai-dat` bằng URL hay tải lại trang trong khu đó,
  // với nhóm đã lưu là đóng, thì rail KHÔNG có mục nào sáng lên — người dùng không biết
  // mình đang ở đâu, đúng cái mà `aria-current` tồn tại để nói.
  //
  // Phép kiểm đọc từ DOM chứ không từ một bảng "khu nào thuộc nhóm nào". Bảng đó là bản
  // sao thứ hai của thứ mà chính children đã nói, và hai bản sao thì lệch — thêm một khu
  // vào nhóm mà quên cập nhật bảng là một lỗi im lặng. Đọc được nhờ các mục ĐANG nằm
  // trong DOM kể cả khi nhóm đóng, tức nhờ đúng lựa chọn thu-bằng-CSS ở trên.
  useEffect(() => {
    if (luonMo) return;
    if (oNhom.current?.querySelector('[aria-current="page"]')) {
      datMo(true);
      return;
    }
    try {
      const luu = window.localStorage.getItem(KHOA_NHOM_MO);
      if (!luu) return;
      const d = JSON.parse(luu) as Record<string, boolean>;
      if (typeof d?.[ma] === 'boolean') datMo(d[ma]);
    } catch {
      // localStorage bị chặn hoặc JSON hỏng: giữ mặc định. Một rail không nhớ được trạng
      // thái vẫn dùng được; một rail sập thì không.
    }
  }, [ma, luonMo, khu]);

  const doi = () => {
    const moi = !mo;
    datMo(moi);
    try {
      const luu = window.localStorage.getItem(KHOA_NHOM_MO);
      const d = luu ? (JSON.parse(luu) as Record<string, boolean>) : {};
      window.localStorage.setItem(KHOA_NHOM_MO, JSON.stringify({ ...d, [ma]: moi }));
    } catch {
      // Ghi không được thì thôi — trạng thái trong lượt xem này vẫn đúng.
    }
  };

  if (luonMo) {
    return (
      <div className="nhomrail" data-mo="1" ref={oNhom}>
        <div className="grp">{ten}</div>
        <div className="mucnhom">{children}</div>
      </div>
    );
  }

  return (
    <div className="nhomrail" data-mo={mo ? '1' : '0'} ref={oNhom}>
      <button
        type="button"
        className="grp grpnut"
        aria-expanded={mo}
        aria-controls={`nhom-${ma}`}
        title={mo ? CHU.dongNhom(ten) : CHU.moNhom(ten)}
        onClick={doi}
      >
        <span className="chev" aria-hidden="true">
          {mo ? '▾' : '▸'}
        </span>
        <span className="tenNhom">{ten}</span>
        {/* Dấu việc tồn chỉ hiện khi nhóm ĐANG ĐÓNG: mở ra thì con số amber của chính mục
            đó đã nói, và hai dấu cho một việc là một việc bị đếm hai lần. */}
        {canhBao && !mo ? (
          <span className="dauton" aria-hidden="true">
            ■
          </span>
        ) : null}
      </button>
      <div className="mucnhom" id={`nhom-${ma}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Mục có bề mặt thật.
 *
 * `neo` là id của một section trong khu đích: mục đó nằm bên trong một bề mặt
 * lớn hơn nên sau khi đổi khu còn phải cuộn tới đúng chỗ, nếu không người dùng
 * bấm "Nhật ký phán quyết" và nhận về đầu trang Dòng sản xuất.
 */
function MucDi({
  nhan,
  ky,
  di,
  khu,
  onChonKhu,
  dem,
  chuGiai,
  canhBao,
  neo,
  phu,
  nhanPhu,
  dauChot,
}: {
  nhan: string;
  ky: string;
  di: Khu;
  khu: Khu;
  onChonKhu: (k: Khu) => void;
  dem?: number;
  chuGiai?: string;
  canhBao?: boolean;
  neo?: string;
  phu?: boolean;
  /** Họ 10 — chỉ mục "Bản thảo" truyền vào. Xem chú thích ở `Rail`. */
  dauChot?: number;
  /**
   * Nhãn báo trước, cho mục VẪN BẤM ĐƯỢC mà biết trước là sẽ rỗng.
   *
   * Khác `MucChuaDung.tag` ở chỗ mục này là nút thật: nhãn ở đây nói "vào được,
   * nhưng chưa có số liệu", không nói "chưa dựng". Trộn hai câu đó là đúng lỗi mà
   * cả tệp này tồn tại để tránh.
   */
  nhanPhu?: string;
}) {
  // `phu` = mục trỏ vào một phần của khu khác, nên nó KHÔNG sáng lên như mục
  // chính của khu đó; nếu không thì hai mục cùng sáng và không biết đang ở đâu.
  const dangMo = !phu && khu === di;
  /* Hai dấu, hai nghĩa: `vuaDoi` = số đổi (có thêm việc đã xong), `vuaToi` = chip cảnh báo
     xuất hiện từ không có gì (từ "không có gì cần bạn" sang "có việc cần bạn"). Ưu tiên
     `vuaToi` vì nó là loại tin mạnh hơn. */
  const dauDem = useDauDoi(dem);
  const dauToi = useDauToi(!!canhBao);
  /* Ba loại tin, và thứ tự ưu tiên là thứ tự sức nặng:
       vuaToi   — việc tồn xuất hiện từ không có gì (mạnh nhất: từ "không cần bạn" sang "cần bạn")
       dongThanh— một chương vừa chốt (họ 10: cùng màu, cùng nhịp với vạch trên lane)
       vuaDoi   — con số đổi vì một lý do khác
     Không cộng dồn hai lớp: hai hoạt ảnh trên một phần tử là một cái nuốt cái kia, và cái
     thắng lại tuỳ thứ tự khai trong CSS — tức một hành vi không ai đọc ra được từ chỗ này. */
  const nhanDem =
    dauToi > 0 ? ' vuaToi' : (dauChot ?? 0) > 0 ? ' dongThanh' : dauDem > 0 ? ' vuaDoi' : '';


  return (
    <button
      type="button"
      className="mucdi"
      aria-current={dangMo ? 'page' : undefined}
      title={chuGiai}
      onClick={() => {
        onChonKhu(di);
        if (neo) {
          // Cuộn sau khi khu đích đã render. requestAnimationFrame đủ vì React
          // đã dựng DOM xong ở nhịp vẽ kế tiếp.
          requestAnimationFrame(() => {
            document.getElementById(neo)?.scrollIntoView({ block: 'start' });
          });
        }
      }}
    >
      <span className="g" aria-hidden="true">
        {ky}
      </span>
      <span className="nhan">{nhan}</span>
      {dem !== undefined ? (
        /* `key` là thứ làm animation chạy LẠI: CSS chỉ phát keyframes khi phần tử được dựng,
           nên một lớp bật-rồi-tắt không đủ. Dấu 0 = chưa đổi lần nào → không lớp nào, tức mở
           trang không nhấp. Xem lib/dauDoi.ts. */
        <span
          key={`${dauToi}-${dauDem}-${dauChot ?? 0}`}
          className={`n${canhBao ? ' warn' : ''}${nhanDem}`}
        >
          {dem}
        </span>
      ) : null}
      {nhanPhu ? <span className="tag mo">{nhanPhu}</span> : null}
    </button>
  );
}

/**
 * Mục có bề mặt ở tầng web, nhưng nguồn của nó tuỳ bản engine đang chạy.
 *
 * Chỉ `'thieu-endpoint'` hạ mục xuống dạng "chưa dựng". Mọi giá trị khác — kể cả
 * `undefined`, tức chưa hỏi thăm xong hoặc hỏi thăm lỗi — đều cho ra NÚT.
 *
 * Hướng mặc định đó là có chủ ý: hai hướng sai không tương đương. Vẽ nút cho một
 * endpoint thiếu thì người vận hành bấm vào và đọc được câu lỗi thật của server —
 * bất tiện, nhưng vẫn là sự thật. Vẽ "chưa dựng" cho một bề mặt đã dựng thì họ
 * không bao giờ bấm, và câu sai đó không có cách nào tự lộ ra.
 */
function MucNguon({
  nhan,
  ky,
  di,
  khu,
  onChonKhu,
  nguon,
  chuGiai,
  viSaoThieu,
}: {
  nhan: string;
  ky: string;
  di: Khu;
  khu: Khu;
  onChonKhu: (k: Khu) => void;
  nguon: TinhTrangNguon | undefined;
  /** Phạm vi của bề mặt — điều không đọc được từ tên mục. */
  chuGiai: string;
  viSaoThieu: string;
}) {
  if (nguon === 'thieu-endpoint') {
    return <MucChuaDung nhan={nhan} ky={ky} viSao={viSaoThieu} />;
  }
  const trong = nguon === 'co-route';
  return (
    <MucDi
      nhan={nhan}
      ky={ky}
      di={di}
      khu={khu}
      onChonKhu={onChonKhu}
      // Ca rỗng ghép HAI câu: phạm vi bề mặt vẫn cần đọc được, và lời báo trước
      // thêm vào chứ không thay thế. Thay thế thì người vận hành mất cách biết khu
      // này để làm gì, đúng lúc họ đang cân nhắc có nên vào hay không.
      chuGiai={trong ? `${chuGiai} — ${GIAI_THICH.coRouteChuaCoNguon}` : chuGiai}
      nhanPhu={trong ? CHU.chuaCoSoLieu : undefined}
    />
  );
}

/**
 * Mục chưa có bề mặt riêng.
 *
 * Vẫn hiện số đếm khi có nguồn — con số là tin vận hành và nó đúng dù bề mặt
 * chưa dựng. Nhưng mục này không phải nút và mang nhãn "chưa dựng", để không ai
 * bấm rồi chờ.
 *
 * `viSao` là lý do CỤ THỂ của từng mục, và nó bắt buộc phải có. Ba mục còn lại
 * đều chưa dựng vì cùng một loại nguyên nhân — dữ liệu nằm trong store nhưng
 * chưa có endpoint trả ra — chứ không vì giao diện chưa kịp làm. Một chú giải
 * chung ("chưa dựng bề mặt") để người đọc tưởng đây là việc tồn của tầng web và
 * đi chờ sai chỗ.
 */
function MucChuaDung({
  nhan,
  ky,
  dem,
  canhBao,
  viSao,
}: {
  nhan: string;
  ky: string;
  dem?: number;
  canhBao?: boolean;
  viSao: string;
}) {
  return (
    <div className="muc chuadung" title={viSao} aria-disabled="true">
      <span className="g" aria-hidden="true">
        {ky}
      </span>
      <span className="nhan">{nhan}</span>
      {dem !== undefined ? (
        <span className={`n${canhBao ? ' warn' : ''}`}>{dem}</span>
      ) : null}
      <span className="tag">chưa dựng</span>
    </div>
  );
}

/** Số khối dàn ý đã biết: tập + cung của tập hiện tại. */
function soKhoiDanY(snapshot: Snapshot | undefined): number | undefined {
  if (!snapshot) return undefined;
  if (!snapshot.capabilities.layered_outline) return undefined;
  // volumes null với cờ true là ca hợp lệ: khung tập đã có mà chưa mở tập nào. Trả
  // undefined (không hiện số) chứ không trả 0 — 0 nói "đã dựng mà rỗng", khác "chưa dựng".
  return snapshot.timeline.volumes?.length;
}
