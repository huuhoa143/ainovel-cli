'use client';

import { CHU } from '@/lib/nhan';
import type { Profile, Snapshot } from '@/lib/types';

/**
 * Rail trái: các khu vực sản xuất, kèm số đếm việc tồn.
 *
 * Số đếm là điểm mấu chốt — nó trả lời "còn tồn gì" mà không cần vào từng khu.
 * Mọi số ở đây phải suy được từ dữ liệu đã có; không có nguồn thì KHÔNG hiện
 * số. Rail trống số còn tốt hơn rail có số bịa, vì người vận hành sẽ tin nó và
 * bỏ qua một hàng chờ thật.
 *
 * Các khu chưa dựng được bề mặt riêng thì để dạng liên kết trơ chứ không giả vờ
 * điều hướng: bấm vào một trang chưa có là một lời hứa hụt.
 */
export function Rail({ snapshot, hoSo }: { snapshot: Snapshot | undefined; hoSo: Profile | undefined }) {
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
    <nav className="rail" aria-label="Khu vực sản xuất">
      <div className="grp">{CHU.nhomSanXuat}</div>
      <a href="#dong-san-xuat" aria-current="page">
        <span className="g" aria-hidden="true">
          ▤
        </span>
        <span className="nhan">{CHU.dongSanXuat}</span>
      </a>
      <Muc
        nhan={CHU.banThao}
        ky="✎"
        dem={banThao}
        chuGiai={
          dangSoan > 0
            ? `${banThao ?? 0} chương đã chốt · ${dangSoan} đang soạn`
            : undefined
        }
      />
      <Muc nhan={CHU.kiemDinh} ky="◆" dem={cuaKiemDinh} canhBao={cuaKiemDinh > 0} />
      <Muc nhan={CHU.hangChoVietLai} ky="■" dem={vietLai} canhBao={vietLai > 0} />

      <div className="grp">{CHU.nhomHoSo}</div>
      <Muc nhan={CHU.danYPhanTang} ky="☰" dem={soKhoiDanY(snapshot)} />
      <Muc nhan={CHU.nhanVat} ky="●" dem={hoSo?.characters ?? undefined} />
      <Muc nhan={CHU.luatTheGioi} ky="⬢" dem={hoSo?.rules ?? undefined} />
      <Muc
        nhan={CHU.phucBut}
        ky="◇"
        dem={hoSo?.foreshadow ?? undefined}
        canhBao={(hoSo?.foreshadow ?? 0) > 0}
      />
      {/* Văn phong không có số đếm: store giữ nó là một bản mô tả, không phải
          danh sách đếm được. Không có nguồn thì không hiện ô số. */}
      <Muc nhan={CHU.vanPhong} ky="✒" />

      <div className="grp">{CHU.nhomXuong}</div>
      <Muc nhan={CHU.nhatKyPhanQuyet} ky="⌗" dem={phanQuyet} />
      <Muc nhan={CHU.chiPhi} ky="$" />
      <Muc nhan={CHU.toSanXuat} ky="☗" />
      <Muc nhan={CHU.caiDat} ky="⚙" />
    </nav>
  );
}

/**
 * Một khu vực. `dem === undefined` thì không có ô số — khác hẳn với `dem === 0`,
 * nghĩa là đã đếm và không còn việc tồn.
 */
function Muc({
  nhan,
  ky,
  dem,
  chuGiai,
  canhBao,
}: {
  nhan: string;
  ky: string;
  dem?: number;
  chuGiai?: string;
  canhBao?: boolean;
}) {
  return (
    <div className="muc" title={chuGiai}>
      <span className="g" aria-hidden="true">
        {ky}
      </span>
      <span className="nhan">{nhan}</span>
      {dem !== undefined ? (
        <span className={`n${canhBao ? ' warn' : ''}`}>{dem}</span>
      ) : null}
    </div>
  );
}

/** Số khối dàn ý đã biết: tập + cung của tập hiện tại. */
function soKhoiDanY(snapshot: Snapshot | undefined): number | undefined {
  if (!snapshot) return undefined;
  if (!snapshot.capabilities.layered_outline) return undefined;
  return snapshot.timeline.volumes.length;
}
