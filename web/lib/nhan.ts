/**
 * MỘT chỗ duy nhất chứa chữ tiếng Việt của giao diện.
 *
 * API trả mã enum tiếng Anh (`done`/`running`/`rewrite`/...). Không component
 * nào được tự viết chuỗi hiển thị: đổi từ ngữ phải là sửa một tệp, không phải
 * đi lùng khắp cây component. Đây cũng là chỗ chốt thuật ngữ:
 *
 *   tập · cung · chương · phục bút · dàn ý · tiền đề · luật thế giới ·
 *   nhân vật · tóm tắt · duyệt · viết lại · gia công · móc · nhịp ·
 *   văn phong · nhất quán · phán quyết · can thiệp · số từ
 *
 * Mỗi trạng thái mang BA kênh: `nhan` (chữ), `ky` (ký hiệu), `mau` (lớp màu).
 * Ký hiệu không phải trang trí — nó là kênh thứ hai để ảnh đen trắng và người
 * mù màu vẫn đọc được trạng thái, theo yêu cầu của PRODUCT.md.
 *
 * Ký hiệu chỉ lấy trong khối Geometric Shapes cơ bản (● ○ ▶ ◆ ◇ ■ □) vì Inter
 * có sẵn các glyph này. Ký hiệu lạ hơn (⟲, ⋯) rơi sang font hệ thống và lệch
 * đường chân chữ so với nhãn bên cạnh — lỗi chỉ thấy khi chụp ảnh.
 */

import type { MucXem } from './phamVi';
import type {
  Activity,
  BlockState,
  MarkState,
  Stage,
} from './types';

/** Tông màu ngữ nghĩa, khớp token trong DESIGN.md. */
export type Tone = 'teal' | 'gold' | 'amber' | 'red' | 'violet' | 'muted';

export interface NhanTrangThai {
  nhan: string;
  /** Ký hiệu hình học, khác nhau giữa các trạng thái. */
  ky: string;
  mau: Tone;
}

/**
 * Ký hiệu đi kèm một kết luận, suy từ tông màu.
 *
 * Kết luận của Editor là chuỗi tự do nên không có bảng ký hiệu cố định cho từng
 * giá trị; tông màu là thứ duy nhất đã chuẩn hóa. Ba hình khác nhau đủ để phân
 * biệt đạt / cần chú ý / không đạt khi mất màu.
 *
 * Ở đây chứ không ở component vì hai bề mặt cùng vẽ bản duyệt (tab Kiểm định
 * trong inspector và khu Kiểm định), và một bảng ký hiệu chép hai lần sẽ lệch
 * nhau ngay lần đổi đầu tiên.
 */
export function kyTheoTone(mau: Tone): string {
  switch (mau) {
    case 'teal':
      return '●';
    case 'red':
      return '◆';
    case 'muted':
      return '○';
    default:
      return '■';
  }
}

/* ── công đoạn của một chương (bảng chương, inspector) ─────────────────── */

export const TRANG_THAI_CHUONG: Record<Stage, NhanTrangThai> = {
  done: { nhan: 'đã nghiệm thu', ky: '●', mau: 'teal' },
  drafting: { nhan: 'đang soạn bản thảo', ky: '▶', mau: 'gold' },
  rewrite: { nhan: 'trả về viết lại', ky: '■', mau: 'amber' },
  pending: { nhan: 'chờ trong hàng', ky: '○', mau: 'muted' },
};

/* ── khối trên trục sản xuất (tập, cung) ──────────────────────────────── */

export const TRANG_THAI_KHOI: Record<BlockState, NhanTrangThai> = {
  done: { nhan: 'xong', ky: '●', mau: 'teal' },
  running: { nhan: 'đang chạy', ky: '▶', mau: 'gold' },
  planned: { nhan: 'đã quy hoạch', ky: '◇', mau: 'muted' },
  unplanned: { nhan: 'chờ mở', ky: '□', mau: 'muted' },
};

/* ── vạch trên lane chương (1 vạch = 1 chương) ────────────────────────── */

export const TRANG_THAI_VACH: Record<MarkState, NhanTrangThai> = {
  done: { nhan: 'đã nghiệm thu', ky: '●', mau: 'teal' },
  running: { nhan: 'đang sản xuất', ky: '▶', mau: 'gold' },
  rewrite: { nhan: 'chờ viết lại', ky: '■', mau: 'amber' },
  gate: { nhan: 'cửa kiểm định', ky: '◆', mau: 'violet' },
  pending: { nhan: 'chưa tới', ky: '○', mau: 'muted' },
};

/* ── trạng thái máy (thanh transport, slate ở thanh trên) ─────────────── */

export const TRANG_THAI_MAY: Record<Activity, NhanTrangThai> = {
  running: { nhan: 'đang chạy', ky: '▶', mau: 'gold' },
  idle: { nhan: 'đang nghỉ', ky: '○', mau: 'muted' },
  complete: { nhan: 'đã xong', ky: '●', mau: 'teal' },
};

/* ── vai trong tổ sản xuất ────────────────────────────────────────────── */

/**
 * Tên vai giữ nguyên dạng Latin: đây là tên riêng của bốn tác tử trong
 * PRODUCT.md (Architect / Writer / Editor / Arbiter), không phải từ cần dịch.
 * Vai lạ thì trả về nguyên văn thay vì bỏ đi — dữ liệu không rõ vẫn phải hiện.
 */
const VAI: Record<string, string> = {
  architect: 'Architect',
  writer: 'Writer',
  editor: 'Editor',
  arbiter: 'Arbiter',
  engine: 'Engine',
};

export function nhanVai(ma: string): string {
  return VAI[ma] ?? ma;
}

export function nhanToVai(owners: string[] | undefined): string {
  if (!owners || owners.length === 0) return '';
  return owners.map(nhanVai).join(' · ');
}

/* ── loại phán quyết của Arbiter ──────────────────────────────────────── */

/**
 * Mã loại giữ nguyên trong giao diện (mono) vì nó là sự thật của máy và tra
 * được trong log; chữ tiếng Việt đi kèm để giải nghĩa. Danh sách này là các
 * loại engine thật sự ghi: plan_start (host.go, engine.go), intervention
 * (host.go), deadlock + worker_failure (engine.go:recordFailureDecision),
 * decision_stale (engine.go), volume_end (tools/save_foundation.go).
 */
const LOAI_PHAN_QUYET: Record<string, { giai: string; mau: Tone }> = {
  plan_start: { giai: 'mở quy hoạch', mau: 'violet' },
  volume_end: { giai: 'chốt cuối tập', mau: 'violet' },
  intervention: { giai: 'xử lý can thiệp', mau: 'teal' },
  deadlock: { giai: 'gỡ tắc dây chuyền', mau: 'red' },
  worker_failure: { giai: 'tác tử thất bại', mau: 'red' },
  decision_stale: { giai: 'phán quyết đã cũ', mau: 'amber' },
};

export function nhanPhanQuyet(kind: string): { giai: string; mau: Tone } {
  return LOAI_PHAN_QUYET[kind] ?? { giai: '', mau: 'muted' };
}

/* ── công đoạn (mã step của checkpoint) ───────────────────────────────── */

/**
 * Chỉ dùng làm chú giải (`title`), không thay thế mã: transport hiện mã thật
 * bằng mono theo DESIGN.md. Danh sách khớp ownersFromSteps trong
 * internal/serve/snapshot.go; mã ngoài danh sách thì không chú giải, thà
 * không nói gì hơn là đoán sai một công đoạn.
 */
const CONG_DOAN: Record<string, string> = {
  plan: 'lập hợp đồng chương',
  draft: 'soạn bản thảo',
  consistency_check: 'soát nhất quán',
  commit: 'chốt bản thảo',
  edit: 'gia công lại',
  review: 'duyệt chương',
  arc_summary: 'tóm tắt cung',
  volume_summary: 'tóm tắt tập',
};

export function giaiCongDoan(step: string | undefined): string | undefined {
  if (!step) return undefined;
  return CONG_DOAN[step];
}

/* ── mức xem của bảng chương ───────────────────────────────────────────── */

/**
 * Nhãn ba mức của bộ chọn phạm vi. Giữ ở đây thay vì trong lib/phamVi.ts để
 * lib đó chỉ chứa hình học và phép lọc, không chứa chữ hiển thị.
 */
const MUC_XEM_NHAN: Record<MucXem, string> = {
  tap: 'Tập',
  cung: 'Cung',
  chuong: 'Chương',
};

export function nhanMucXem(muc: MucXem): string {
  return MUC_XEM_NHAN[muc];
}

/** "tập 3" / "cung 2" — phạm vi đang lọc, viết thường để ghép vào câu. */
export function nhanPhamViXem(muc: MucXem, index: number): string {
  return `${MUC_XEM_NHAN[muc].toLowerCase()} ${index}`;
}

/* ── phase / flow của tác phẩm ────────────────────────────────────────── */

const PHASE: Record<string, string> = {
  init: 'khởi tạo',
  foundation: 'dựng nền',
  planning: 'quy hoạch',
  writing: 'đang viết',
  reviewing: 'đang duyệt',
  complete: 'hoàn thành',
};

export function nhanPhase(phase: string): string {
  return PHASE[phase] ?? phase;
}

/* ── kết luận của Editor trong bản duyệt ──────────────────────────────── */

/**
 * Ba giá trị ĐẦU là enum kín, server tự kiểm: `save_review` khai báo
 * `schema.Enum("审阅结论", "accept", "polish", "rewrite")`
 * (internal/tools/save_review.go:62) nên mọi bản duyệt thật chỉ mang một trong
 * ba. Chuẩn phán quyết ở assets/prompts/editor.md:137–139:
 *
 *   rewrite = có vấn đề critical → buộc viết lại
 *   polish  = không critical nhưng có error ảnh hưởng trải nghiệm đọc
 *   accept  = chỉ có warning hoặc không có vấn đề (ca thường gặp nhất)
 *
 * Vì `accept` là ca THƯỜNG GẶP NHẤT, thiếu nó trong bảng này nghĩa là phần lớn
 * bản duyệt hiện chữ "accept" giữa một bề mặt tiếng Việt — đúng cái mà quy tắc
 * "enum tiếng Anh → nhãn tiếng Việt ở MỘT chỗ" tồn tại để chặn.
 *
 * Các giá trị dưới là bản duyệt cũ hoặc chuỗi tự do; giữ lại để không mất chữ.
 * Giá trị lạ hiện nguyên văn với tông trung tính, KHÔNG đoán "đạt".
 */
const KET_LUAN: Record<string, { nhan: string; mau: Tone }> = {
  accept: { nhan: 'nghiệm thu', mau: 'teal' },
  polish: { nhan: 'gia công', mau: 'amber' },
  rewrite: { nhan: 'viết lại', mau: 'red' },

  pass: { nhan: 'đạt', mau: 'teal' },
  passed: { nhan: 'đạt', mau: 'teal' },
  approve: { nhan: 'duyệt', mau: 'teal' },
  approved: { nhan: 'đã duyệt', mau: 'teal' },
  ok: { nhan: 'đạt', mau: 'teal' },
  warn: { nhan: 'cần chú ý', mau: 'amber' },
  minor: { nhan: 'lỗi nhẹ', mau: 'amber' },
  revise: { nhan: 'cần sửa', mau: 'amber' },
  fail: { nhan: 'không đạt', mau: 'red' },
  failed: { nhan: 'không đạt', mau: 'red' },
  reject: { nhan: 'trả về', mau: 'red' },
};

export function nhanKetLuan(verdict: string | undefined): { nhan: string; mau: Tone } | undefined {
  if (!verdict) return undefined;
  return KET_LUAN[verdict.toLowerCase().trim()] ?? { nhan: verdict, mau: 'muted' };
}

/* ── độ hoàn thành hợp đồng chương ────────────────────────────────────── */

/**
 * Enum kín, server tự kiểm (internal/tools/save_review.go:148 chỉ nhận met /
 * partial / missed), nên ba giá trị này dịch được chắc chắn. Giá trị lạ hiện
 * nguyên văn thay vì đoán.
 */
const HOP_DONG: Record<string, { nhan: string; mau: Tone }> = {
  met: { nhan: 'đạt', mau: 'teal' },
  partial: { nhan: 'đạt một phần', mau: 'amber' },
  missed: { nhan: 'không đạt', mau: 'red' },
};

export function nhanHopDong(
  status: string | undefined,
): { nhan: string; mau: Tone } | undefined {
  if (!status) return undefined;
  return HOP_DONG[status.toLowerCase().trim()] ?? { nhan: status, mau: 'muted' };
}

/* ── mức nghiêm trọng của vấn đề Editor nêu ───────────────────────────── */

/**
 * Ba giá trị đầu là enum kín của server:
 * `schema.Enum("严重程度", "critical", "error", "warning")`
 * (internal/tools/save_review.go:42, lọc lại ở dòng 179). Định nghĩa lấy từ
 * bảng phân cấp trong assets/prompts/editor.md:127–131:
 *
 *   critical = lỗi logic nặng, buộc phải sửa (nhân vật đã chết lại xuất hiện)
 *   error    = mâu thuẫn rõ hoặc vấn đề phẩm chất (hành xử lệch tính cách)
 *   warning  = khuyết điểm nhẹ (chi tiết chưa chính xác, câu cần gia công)
 *
 * `error` và `warning` từng không có trong bảng này, nên hai mức HAY GẶP NHẤT
 * hiện ra dưới dạng chữ Anh trần giữa bề mặt tiếng Việt.
 *
 * Phần dưới là các mức của bản duyệt cũ, giữ để không mất chữ.
 */
const MUC: Record<string, { nhan: string; mau: Tone }> = {
  critical: { nhan: 'nghiêm trọng', mau: 'red' },
  error: { nhan: 'mâu thuẫn rõ', mau: 'amber' },
  warning: { nhan: 'khuyết điểm nhẹ', mau: 'muted' },

  low: { nhan: 'nhẹ', mau: 'muted' },
  minor: { nhan: 'nhẹ', mau: 'muted' },
  medium: { nhan: 'vừa', mau: 'amber' },
  major: { nhan: 'nặng', mau: 'amber' },
  high: { nhan: 'nặng', mau: 'red' },
};

export function nhanMuc(severity: string | undefined): { nhan: string; mau: Tone } | undefined {
  if (!severity) return undefined;
  return MUC[severity.toLowerCase().trim()] ?? { nhan: severity, mau: 'muted' };
}

/* ── bảy chiều kiểm định của Editor ───────────────────────────────────── */

/**
 * Tên chiều là chuỗi tự do trong hợp đồng (`schema.Property("dimension", ...)`
 * không phải Enum), nhưng bảy chiều NỀN được prompt chốt tên:
 *
 *   "Duyệt nền thường bao trọn consistency / character / pacing / continuity /
 *    foreshadow / hook / aesthetic"  — assets/prompts/editor.md:118
 *
 * Bảng cũ ở đây dịch một bộ tên khác (`setting_consistency`,
 * `character_behavior`, `foreshadowing`, `prose`) nên năm trong bảy chiều thật
 * rơi xuống nhánh "hiện nguyên văn": bản duyệt hiện ra "consistency",
 * "character", "continuity", "foreshadow", "aesthetic" bằng chữ Anh.
 *
 * Cả hai bộ tên đều giữ: Editor được phép bổ sung chiều cụ thể hơn và bản duyệt
 * cũ vẫn nằm trong store. Tên ngoài bảng hiện nguyên văn — thà không dịch hơn
 * là đoán sai một chiều.
 */
const CHIEU: Record<string, string> = {
  consistency: 'nhất quán',
  character: 'nhân vật',
  pacing: 'nhịp',
  continuity: 'mạch tự sự',
  foreshadow: 'phục bút',
  hook: 'móc chương',
  aesthetic: 'chất văn',

  setting_consistency: 'nhất quán thiết lập',
  character_behavior: 'hành vi nhân vật',
  narrative: 'mạch tự sự',
  foreshadowing: 'phục bút',
  prose: 'chất văn',
  style: 'văn phong',
};

export function nhanChieu(name: string): string {
  return CHIEU[name.toLowerCase().trim().replace(/[\s-]+/g, '_')] ?? name;
}

/* ── trạng thái một phục bút ───────────────────────────────────────────── */

/**
 * Enum kín: `ForeshadowEntry.Status` chỉ nhận planted / advanced / resolved
 * (internal/domain/review.go:16, và `ForeshadowUpdate.Action` là plant /
 * advance / resolve).
 *
 * Tông màu ở đây KHÔNG theo trực giác "xong là tốt": phục bút đã thu là
 * chuyện đã đóng nên trung tính, còn phục bút mới gieo là VIỆC TỒN — nó là món
 * nợ tự sự chưa trả, và đó mới là thứ người vận hành cần thấy.
 */
const PHUC_BUT: Record<string, NhanTrangThai> = {
  planted: { nhan: 'mới gieo', ky: '◇', mau: 'amber' },
  advanced: { nhan: 'đã đẩy thêm', ky: '◆', mau: 'gold' },
  resolved: { nhan: 'đã thu', ky: '●', mau: 'teal' },
};

export function nhanPhucBut(status: string): NhanTrangThai {
  return (
    PHUC_BUT[status.toLowerCase().trim()] ?? { nhan: status, ky: '○', mau: 'muted' }
  );
}

/* ── hạng nhân vật ─────────────────────────────────────────────────────── */

/**
 * `Character.Tier`: core / important / secondary / decorative, mặc định
 * important khi vắng (internal/domain/story.go:26). Chỗ gọi truyền chuỗi rỗng
 * cho ca vắng và nhận về 'quan trọng' — đúng mặc định của server, không đoán.
 */
const HANG: Record<string, string> = {
  core: 'cốt lõi',
  important: 'quan trọng',
  secondary: 'phụ',
  decorative: 'điểm xuyết',
};

export function nhanHang(tier: string | undefined): string {
  return HANG[(tier ?? 'important').toLowerCase().trim()] ?? (tier as string);
}

/* ── nhóm luật thế giới ────────────────────────────────────────────────── */

/**
 * `WorldRule.Category`: magic / technology / geography / society / other
 * (internal/domain/story.go:116). Nhóm lạ hiện nguyên văn.
 */
const NHOM_LUAT: Record<string, string> = {
  magic: 'phép thuật',
  technology: 'kỹ thuật',
  geography: 'địa lý',
  society: 'xã hội',
  other: 'khác',
};

export function nhanNhomLuat(category: string): string {
  return NHOM_LUAT[category.toLowerCase().trim()] ?? category;
}

/** Thứ tự nhóm luật khi hiện: đi từ luật cứng nhất tới luật mềm nhất. */
export const THU_TU_NHOM_LUAT = [
  'magic',
  'technology',
  'geography',
  'society',
  'other',
] as const;

/* ── phạm vi một bản duyệt ─────────────────────────────────────────────── */

/** `ReviewEntry.Scope`: chapter / global / arc (internal/domain/review.go:57). */
const PHAM_VI_DUYET: Record<string, string> = {
  chapter: 'chương',
  arc: 'cung',
  volume: 'tập',
  global: 'toàn bộ',
};

export function nhanPhamViDuyet(scope: string): string {
  return PHAM_VI_DUYET[scope.toLowerCase().trim()] ?? scope;
}

/* ── chữ dùng nhiều lần trong bố cục ──────────────────────────────────── */

export const CHU = {
  sanPham: 'ainovel',
  beMat: 'studio',

  // thanh trên
  chonTacPham: 'Chọn tác phẩm',
  tacPhamKhac: 'Các tác phẩm khác trong xưởng',
  demTacPham: (tong: number, dangChay: number) =>
    `${tong} tác phẩm · ${dangChay} đang chạy`,

  // rail
  nhomSanXuat: 'Sản xuất',
  nhomHoSo: 'Hồ sơ tác phẩm',
  nhomXuong: 'Xưởng',
  dongSanXuat: 'Dòng sản xuất',
  banThao: 'Bản thảo',
  kiemDinh: 'Kiểm định',
  hangChoVietLai: 'Hàng chờ viết lại',
  danYPhanTang: 'Dàn ý phân tầng',
  nhanVat: 'Nhân vật',
  luatTheGioi: 'Luật thế giới',
  phucBut: 'Phục bút',
  vanPhong: 'Văn phong',
  toSanXuat: 'Tổ sản xuất',
  chiPhi: 'Chi phí',
  nhatKyPhanQuyet: 'Nhật ký phán quyết',
  caiDat: 'Cài đặt',

  // canvas
  trucSanXuat: 'Trục sản xuất',
  mucXem: 'Mức xem',
  tap: 'Tập',
  cung: 'Cung',
  chuong: 'Chương',
  canThiep: 'Can thiệp',

  // bảng chương
  // "n chương ngoài tập 3" — phép lọc phải nói ra mình đã ẩn bao nhiêu.
  ngoaiPhamVi: (n: number, phamVi: string) => `${n} chương ngoài ${phamVi}`,
  conTonNgoaiPhamVi: (n: number) =>
    `${n} trong đó còn việc tồn (chờ viết lại hoặc đang soạn)`,
  hienTatCa: 'Hiện tất cả',
  colChuong: 'Ch.',
  colTieuDe: 'Tiêu đề',
  colCongDoan: 'Công đoạn',
  colPhuTrach: 'Phụ trách',
  colSoTu: 'Số từ',
  colThoiLuong: 'Thời lượng',
  chuaDatTieuDe: 'chưa đặt tiêu đề',

  // inspector
  tabHopDong: 'Hợp đồng',
  tabKiemDinh: 'Kiểm định',
  tabBanThao: 'Bản thảo',
  yeuCauChuong: 'Yêu cầu chương',
  // "Sự kiện trọng tâm" ngắt hai dòng trong cột nhãn 104px của inspector rộng
  // 292px. Lane đã ở trong nhóm "Yêu cầu chương" nên "Trọng tâm" không mất nghĩa;
  // thuật ngữ đầy đủ vẫn nằm ở chú giải.
  sukienTrongTam: 'Trọng tâm',
  sukienTrongTamDay: 'Sự kiện trọng tâm',
  kieuMocCuoi: 'Kiểu móc cuối',
  canhTrongChuong: 'Cảnh trong chương',
  ketLuanDuyet: 'Kết luận duyệt',
  tomTat: 'Tóm tắt',
  cacChieu: 'Các chiều',
  vanDeNeuRa: 'Vấn đề nêu ra',
  danChung: 'Dẫn chứng',
  deXuat: 'Đề xuất',
  hopDongThieu: 'Hợp đồng còn thiếu',
  trichDoan: 'Trích đoạn',

  // trục sản xuất — cửa sổ của lane chương
  cuaSo: (from: number, to: number, tong: number) => `${from}–${to} / ${tong}`,
  vungDangLam: 'Về vùng đang làm',
  hienToanBo: (tong: number) => `Hiện toàn bộ ${tong} chương`,
  ngoaiCuaSo: (n: number) => `${n} chương ngoài cửa sổ`,
  conTonNgoaiCuaSo: (n: number) => `${n} trong đó còn việc tồn`,

  // bề mặt đọc truyện
  docBanThao: 'Đọc bản thảo',
  chuongTruoc: 'Chương trước',
  chuongSau: 'Chương sau',
  banDuyetEditor: 'Bản duyệt của Editor',
  hopDongChuong: 'Hợp đồng chương',
  chonChuongDeDoc: 'Chọn chương để đọc',

  // dàn ý phân tầng
  tienDe: 'Tiền đề',
  chuDe: 'Chủ đề',
  mucTieuCung: 'Mục tiêu cung',
  tapChot: 'tập chốt',
  soChuongDuKien: (n: number) => `${n} chương dự kiến`,
  soChuongDaMo: (n: number) => `${n} chương đã mở`,
  danYPhang: 'Dàn ý phẳng',

  // nhân vật
  hang: 'Hạng',
  vai: 'Vai',
  biDanh: 'Bí danh',
  netTinhCach: 'Nét tính cách',
  // ĐO ĐƯỢC ở 1440px: "Đường dây nhân vật" cần ~130px và ngắt thành hai dòng
  // ("Đường dây nhân" / "vật") trong cột nhãn 116px. Nới cột lên 140px cho một
  // nhãn là cách làm sai ở đây: khối này ĐÃ là hồ sơ của một nhân vật, nên chữ
  // "nhân vật" trong nhãn là dư. Thuật ngữ đầy đủ nằm ở chú giải.
  duongDay: 'Đường dây',
  duongDayDay: 'Đường dây nhân vật',
  trangThaiCuoiCung: 'Trạng thái ở cuối cung gần nhất',
  quanHe: 'Quan hệ',
  dongLuc: 'Động lực',
  nangLuc: 'Năng lực',

  // luật thế giới & phục bút
  ranhGioi: 'Ranh giới',
  gieoOChuong: (n: number) => `gieo ở chương ${n}`,
  thuOChuong: (n: number) => `thu ở chương ${n}`,
  luoiQuanHe: 'Lưới quan hệ',

  // kiểm định (bề mặt riêng, rộng hơn tab cùng tên trong inspector)
  chonChuongDeDuyet: 'Chọn chương để xem bản duyệt',
  chuongCoDauVet: 'Chương có dấu vết sản xuất',
  banDuyet: 'Bản duyệt',
  ketLuan: 'Kết luận',
  phamVi: 'Phạm vi',
  hopDong: 'Hợp đồng',
  // Thang điểm là 0–100, do save_review.go:271 chặn (`score < 0 || score > 100`).
  // In kèm mẫu số vì một con số trơ ("68") không nói được nó trên thang nào, và
  // người vận hành sẽ đọc 68 như 68% hoặc như 6,8/10 tùy phản xạ.
  diemTren100: (n: number) => `${n}/100`,
  demChieu: (n: number) => `${n} chiều`,

  // hàng chờ viết lại
  daCoSoTu: 'Đã viết',
  colTinhTrangDuyet: 'Bản duyệt',
  moBanDuyet: 'Xem bản duyệt',
  demHangCho: (n: number) => `${n} chương chờ viết lại`,

  // tổ sản xuất
  colVai: 'Vai',
  colChuongThamGia: 'Chương tham gia',
  colPhanQuyetDaGhi: 'Phán quyết',
  colModelDaDung: 'Model',
  colThatBai: 'Thất bại',
  vaiDangChay: 'đang chạy',
  chuaChayLuotNao: 'chưa có lượt nào',
  demPhanQuyetDaTai: (n: number) => `${n} phán quyết đã tải`,

  // transport
  congDoan: 'công đoạn',
  congDoanVuaXong: 'vừa xong',
  to: 'tổ',
  nguCanh: 'ngữ cảnh',
  nangSuat: 'năng suất',
  giaThanh: 'giá thành',
  tong: 'tổng',
  daChay: 'đã chạy',
  chuongMoiGio: 'chương/giờ',
  moiChuong: '/ chương',

  // trạng thái chung
  khongCo: '—',
  dangTai: 'đang đọc store…',
  // Xưởng rỗng: transport không có gì để báo, và "đang đọc store…" đứng mãi ở
  // đó là nói dối — không có store nào đang được đọc.
  khongCoGiTheoDoi: 'chưa có tác phẩm nào để theo dõi',
  matKetNoi: 'mất kết nối tới engine',
  thuLaiSau: (giay: number) => `thử lại sau ${giay}s`,
} as const;

/* ── câu giải thích dài, giọng điềm tĩnh của PRODUCT.md ───────────────── */

export const GIAI_THICH = {
  /** capabilities.steer === false */
  canThiepTat:
    'Engine sở hữu quyền ghi vào store. Nếu studio cũng ghi thì hai process cùng sửa một tệp và ý kiến can thiệp sẽ mất trắng — không lỗi, không dấu vết. Can thiệp qua web cần engine hợp tác trước; hiện tại dùng TUI.',
  canThiepChoDay: 'Ô nhập vô hiệu — engine bản này chưa nhận can thiệp qua web',

  /** capabilities.per_chapter_cost === false */
  khongCoChiPhiTheoChuong:
    'Store cộng chi phí theo tác tử và theo model, không theo từng chương, nên không có cột chi phí ở đây. Giá thành trung bình mỗi chương ở thanh dưới có nguồn thật.',

  /** duration_ms vắng */
  khongDoDuocThoiLuong: 'không đo được — chương chỉ có một checkpoint',

  /** LaneBlock.chapters === 0 */
  chuaBietPhamVi: 'chưa biết phạm vi — tập chưa mở nên chưa có cả số dự kiến',

  /** bộ chọn mức xem */
  mucXemGiai:
    'Store trả mọi chương có dấu vết sản xuất trên toàn tác phẩm, không lọc theo tập hay cung. Mức xem là phép lọc ở giao diện, nên tiêu đề bảng nói đúng phần đang hiện.',
  mucChuaMo: 'chưa mở nên chưa có phạm vi để lọc',
  bangTrongPhamVi: 'Không có chương nào trong phạm vi này.',

  /** LaneBlock.estimated */
  soDuKien: 'số dự kiến, chưa phải chương đã mở',

  /** transport.last_step */
  buocVuaXong:
    'Công đoạn vừa hoàn thành. Store chỉ ghi checkpoint khi một bước thành công, nên đây là tất cả những gì suy được khi engine không phát sự kiện.',
  buocDangChay: 'Công đoạn đang chạy, theo dòng sự kiện của engine.',

  nguongNen: 'vạch đỏ ở mốc 85% là ngưỡng nén ngữ cảnh',

  /** không có tác phẩm nào */
  xuongTrongTieuDe: 'Xưởng chưa có tác phẩm',
  xuongTrongThan:
    'Thư mục gốc không chứa tác phẩm nào có meta/progress.json. Studio chỉ đọc store — tác phẩm được tạo bằng engine.',
  xuongTrongLenh: 'ainovel-cli run --root <thư mục gốc>',
  xuongTrongGoc: 'thư mục gốc',

  khongTaiDuoc: 'Không đọc được store',

  /**
   * Inspector khi chưa chọn chương.
   *
   * Trước đây tiêu đề panel hiện "Chương / *chưa đặt tiêu đề*" trong khi thân
   * panel nói "Chưa chọn chương" — hai câu nói hai chuyện khác nhau, và câu ở
   * tiêu đề là câu sai: nó khẳng định có một chương đang mở mà chương đó chưa
   * được đặt tiêu đề. Giờ tiêu đề và thân nói cùng một điều, và câu duy nhất
   * còn lại là câu HƯỚNG DẪN, không phải câu lặp lại trạng thái.
   */
  chuaChonChuongTieuDe: 'Chưa chọn chương',
  chuaChonChuong:
    'Bấm một hàng trong bảng chương để xem hợp đồng, bản duyệt và bản thảo của chương đó.',
  tabChuaChonChuong: 'chưa chọn chương nên chưa có gì để mở',

  chuongChuaCoDuLieu: 'Chương này chưa có dữ liệu trong store.',
  chuaCoHopDong: 'Chương này chưa có hợp đồng — Writer lập hợp đồng ở bước plan.',
  chuaCoDuyet: 'Chưa có bản duyệt cho chương này.',
  chuaCoBanThao: 'Chưa có bản thảo cho chương này.',
  chuaCoPhanQuyet: 'Chưa có phán quyết nào được ghi.',
  chuaCoChuong: 'Chưa có chương nào có dấu vết sản xuất.',
  duLieuLech: 'Dữ liệu store lệch',

  /* ── cửa sổ của lane chương ─────────────────────────────────────────── */

  /**
   * Vì sao lane chương thu phóng.
   *
   * Với 2/300 chương xong, phần "đã nghiệm thu" chiếm 0,67% bề rộng lane — đúng
   * toán học và vô dụng thị giác. Và người vận hành sẽ ở tình trạng đó trong
   * phần lớn thời gian đầu của một cuốn 300 chương.
   */
  cuaSoGiai:
    'Lane chương thu phóng vào vùng đang sản xuất để một vạch đủ rộng mà đếm được. Bề rộng cửa sổ suy từ bề rộng lane thật, không phải số cố định. Vị trí trong toàn bộ công trình vẫn đọc ở lane Tập/Cung phía trên và ở dãy số dưới lane.',
  cuaSoDayDu: 'Đang hiện toàn bộ trục — mỗi vạch mỏng hơn nhưng tỉ lệ là tỉ lệ thật.',

  /* ── các bề mặt hồ sơ tác phẩm ──────────────────────────────────────── */

  /**
   * `null` KHÁC `[]`. Hai câu dưới đây là hai sự thật khác nhau và không được
   * gộp: một cái nói engine chưa ghi tệp đó lần nào, một cái nói đã ghi mà rỗng.
   */
  chuaDungNen: (muc: string) =>
    `Store chưa có ${muc}. Engine ghi mục này ở bước dựng nền; tác phẩm chưa qua bước đó thì chưa có tệp nào để đọc.`,
  dungNenMaRong: (muc: string) => `Đã dựng nền nhưng chưa có ${muc} nào được ghi.`,

  chuaCoTienDe: 'Chưa có tiền đề — premise.md chưa được ghi.',
  chuaCoDanY: 'Chưa có dàn ý nào trong store.',
  cungChuaMo:
    'Cung còn là bộ khung: Architect sẽ mở chi tiết chương khi dây chuyền tới lượt.',
  tapChuaMo: 'Tập còn là bộ khung — chưa có cung nào được quy hoạch.',
  danYPhangGiai:
    'Bản dàn trải của dàn ý phân tầng, do engine ghi lại để tra theo số chương. Cùng một sự thật, khác cách xếp.',

  khongCoAnhChup:
    'Chưa có ảnh chụp trạng thái nhân vật. Editor ghi ảnh chụp ở cuối mỗi cung, nên tác phẩm chưa qua ranh giới cung nào thì chưa có.',

  /** Bề mặt đọc truyện */
  docChuaChonChuong:
    'Chọn một chương trong danh sách bên trái để đọc bản thảo của nó.',
  chuongTrongStore:
    'Chương có dấu vết sản xuất nhưng store trả về bản thảo rỗng. Nội dung chương chỉ được đọc từ bản nháp (drafts/); chương đã chốt mà không còn bản nháp thì không có gì để đọc ở đây.',
  banDuyetChuaCo:
    'Chương này chưa có bản duyệt. Editor duyệt sau khi bản thảo được chốt.',

  /* ── bề mặt Kiểm định ───────────────────────────────────────────────── */

  /**
   * Vì sao Kiểm định đọc MỘT chương một lúc.
   *
   * API trả bản duyệt trong `selected.review`, tức của đúng chương đang chọn
   * (`?chapter=`). Không có endpoint nào trả danh sách kết luận duyệt cho cả
   * sách, nên bề mặt này KHÔNG thể xếp hạng chương theo chất lượng, và cột trong
   * danh sách bên trái là CÔNG ĐOẠN của chương chứ không phải kết luận duyệt.
   * Vẽ một cột "kết luận" rồi điền công đoạn vào là đổi tên một sự thật khác.
   */
  kiemDinhMotChuong:
    'Store ghi bản duyệt theo từng chương, và API trả bản duyệt của đúng chương đang chọn. Chưa có danh sách kết luận duyệt cho cả sách, nên danh sách bên trái hiện công đoạn của chương — không phải kết luận duyệt của nó.',
  chuaChonChuongDuyet:
    'Chọn một chương trong danh sách để xem kết luận, các chiều đã chấm và dẫn chứng Editor nêu.',
  diemThang100: 'điểm trên thang 0–100 do Editor chấm',

  /* ── bề mặt Hàng chờ viết lại ───────────────────────────────────────── */

  /**
   * Hàng chờ là danh sách ĐẦY ĐỦ, không phải phần lọc.
   *
   * `buildChapterRows` đưa mọi chương trong `progress.PendingRewrites` vào bảng
   * (snapshot.go:277), và `rowStage` xét `rewrite` TRƯỚC `done` — nên một chương
   * đã nghiệm thu rồi bị trả về vẫn mang công đoạn `rewrite` và vẫn có số từ của
   * bản thảo cũ. Bề mặt này đọc từ đó, nên nó không bỏ sót chương nào.
   */
  hangChoNguon:
    'Hàng chờ lấy từ danh sách chờ viết lại của store, không phải phần lọc của bảng chương — nên đây là danh sách đầy đủ.',
  hangChoRong:
    'Không có chương nào trong hàng chờ viết lại. Editor trả chương về khi bản duyệt có vấn đề buộc phải sửa.',
  vietLaiConSoTu:
    'Số từ là của bản thảo cũ — chương đã viết rồi mới bị trả về, và bản thảo đó vẫn nằm trong store cho tới lượt viết lại.',

  /* ── bề mặt Tổ sản xuất ─────────────────────────────────────────────── */

  /**
   * Hai con số ở đây có HAI cửa sổ khác nhau, và nói gộp là nói dối.
   *
   * `snapshot.chapters[].owner` phủ mọi chương có dấu vết sản xuất, còn
   * `snapshot.decisions` chỉ là 20 phán quyết gần nhất (snapshot.go:393). Gọi cả
   * hai là "tổng" thì cột phán quyết sẽ đứng yên ở 20 khi tác phẩm chạy tới
   * chương thứ ba trăm, và người vận hành kết luận Arbiter đã ngừng làm việc.
   */
  toCuaSoPhanQuyet: (n: number) => `trong ${n} phán quyết gần nhất`,
  toCuaSoChuong: 'theo chu kỳ gần nhất của mỗi chương có dấu vết sản xuất',
  toKhongDoDuocVai:
    'Không suy được vai nào đã tham gia: vai được đọc từ bước checkpoint, và store chưa ghi checkpoint nào cho các chương này.',
  toKhongCoChiPhiTheoVai:
    'Store CÓ cộng chi phí theo tác tử và theo model, nhưng API chưa trả phần đó — nên không có cột chi phí ở đây. Tổng chi phí và giá thành mỗi chương ở thanh dưới có nguồn thật.',
  toChuaCoVaiNao:
    'Chưa có vai nào để lượt: store chưa ghi checkpoint và chưa ghi phán quyết nào cho tác phẩm này.',

  namTrongDongSanXuat: 'Khu này nằm trong bề mặt Dòng sản xuất.',

  /**
   * Ba mục còn lại chưa dựng vì THIẾU NGUỒN, không vì chưa kịp làm — và lý do
   * cụ thể phải nói ra ở chú giải của từng mục.
   *
   * Một chú giải chung ("chưa dựng bề mặt") để người vận hành tưởng đây là việc
   * còn tồn của giao diện. Thực tế cả ba đều chờ một endpoint ở tầng Go: dữ liệu
   * nằm trong store nhưng không có đường ra. Nói đúng chỗ tắc thì người đọc biết
   * phải sửa ở đâu.
   */
  chuaDungVanPhong:
    'Chưa dựng vì thiếu nguồn: store giữ văn phong ở meta/style_rules.json (lối kể, giọng từng nhân vật, danh sách cấm) nhưng API chưa có endpoint trả nó.',
  chuaDungChiPhi:
    'Chưa dựng vì thiếu nguồn: API chỉ trả tổng chi phí và giá thành trung bình mỗi chương, cả hai đã có ở thanh dưới. Phân tích theo tác tử và theo model nằm trong meta/usage.json, chưa có endpoint trả.',
  chuaDungCaiDat:
    'Chưa dựng vì thiếu nguồn: API chưa trả cấu hình phiên chạy. Và studio chỉ đọc store, nên cài đặt sẽ là bề mặt chỉ-đọc cho tới khi engine hợp tác nhận lệnh ghi.',
} as const;
