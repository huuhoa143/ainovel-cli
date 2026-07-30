'use client';

import { useEffect, useRef } from 'react';

import type { Khu } from '@/lib/khu';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { Profile, Snapshot } from '@/lib/types';

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

  const marks = snapshot?.timeline.chapters ?? [];
  const rows = snapshot?.chapters ?? [];

  // Bản thảo = số chương đã có bản thảo chốt. Lấy từ book, là số store ghi.
  const banThao = snapshot?.book.completed_chapters;
  // Kiểm định = số cửa kiểm định trên trục; hàng chờ viết lại = số chương rewrite.
  const cuaKiemDinh = marks.filter((m) => m.state === 'gate').length;
  const vietLai = marks.filter((m) => m.state === 'rewrite').length;
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
      <MucChuaDung nhan={CHU.kiemDinh} ky="◆" dem={cuaKiemDinh} canhBao={cuaKiemDinh > 0} />
      <MucChuaDung
        nhan={CHU.hangChoVietLai}
        ky="■"
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
      <MucChuaDung nhan={CHU.vanPhong} ky="✒" />

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
      <MucChuaDung nhan={CHU.chiPhi} ky="$" />
      <MucChuaDung nhan={CHU.toSanXuat} ky="☗" />
      <MucChuaDung nhan={CHU.caiDat} ky="⚙" />
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
    </button>
  );
}

/**
 * Mục chưa có bề mặt riêng.
 *
 * Vẫn hiện số đếm khi có nguồn — con số là tin vận hành và nó đúng dù bề mặt
 * chưa dựng. Nhưng mục này không phải nút và mang nhãn "chưa dựng", để không ai
 * bấm rồi chờ.
 */
function MucChuaDung({
  nhan,
  ky,
  dem,
  canhBao,
}: {
  nhan: string;
  ky: string;
  dem?: number;
  canhBao?: boolean;
}) {
  return (
    <div className="muc chuadung" title={GIAI_THICH.chuaDungBeMat} aria-disabled="true">
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
