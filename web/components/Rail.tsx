'use client';

import { useEffect, useRef } from 'react';

import type { Khu } from '@/lib/khu';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { Profile, Snapshot, TinhTrangNguon } from '@/lib/types';

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
}: {
  snapshot: Snapshot | undefined;
  hoSo: Profile | undefined;
  khu: Khu;
  onChonKhu: (k: Khu) => void;
}) {
  const oRail = useRef<HTMLElement>(null);
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
    <nav className="rail" aria-label="Khu vực sản xuất" ref={oRail}>
      <div className="grp">{CHU.nhomSanXuat}</div>
      <MucDi
        nhan={CHU.dongSanXuat}
        ky="▤"
        di="dong-san-xuat"
        khu={khu}
        onChonKhu={onChonKhu}
      />
      <MucDi
        nhan={CHU.banThao}
        ky="✎"
        di="ban-thao"
        khu={khu}
        onChonKhu={onChonKhu}
        dem={banThao}
        chuGiai={
          dangSoan > 0
            ? `${banThao ?? 0} chương đã chốt · ${dangSoan} đang soạn`
            : undefined
        }
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

      <div className="grp">{CHU.nhomHoSo}</div>
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

      <div className="grp">{CHU.nhomXuong}</div>
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
      <MucDi
        nhan={CHU.nhapXuat}
        ky="⇄"
        di="nhap-xuat"
        khu={khu}
        onChonKhu={onChonKhu}
        chuGiai={GIAI_THICH.xuatBanGiaiThich}
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

      {/* Nhóm MÁY, tách khỏi nhóm Xưởng có chủ ý.
          Cấu hình máy sửa ~/.ainovel/config.json — nó áp cho mọi tác phẩm và mọi lượt
          chạy sau, không thuộc cuốn đang mở. Để nó lẫn trong nhóm Xưởng là mời đúng cái
          nhầm mà bề mặt Cài đặt đã phải tách ra để tránh: người vận hành đọc nó thành
          "cấu hình của cuốn này". */}
      <div className="grp">{CHU.may}</div>
      <MucDi
        nhan={CHU.cungDung}
        ky="⁂"
        di="cung-dung"
        khu={khu}
        onChonKhu={onChonKhu}
        chuGiai={GIAI_THICH.cungDungGiaiThich}
      />
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
    </nav>
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
        <span className={`n${canhBao ? ' warn' : ''}`}>{dem}</span>
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
  return snapshot.timeline.volumes.length;
}
