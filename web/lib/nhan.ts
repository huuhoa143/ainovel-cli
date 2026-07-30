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
 * Verdict là chuỗi tự do từ mô hình, không phải enum kín. Chỉ các giá trị hay
 * gặp được dịch; còn lại hiện nguyên văn. `mau` suy từ nghĩa để tô cột kết
 * luận, mặc định là trung tính chứ không đoán "đạt".
 */
const KET_LUAN: Record<string, { nhan: string; mau: Tone }> = {
  pass: { nhan: 'đạt', mau: 'teal' },
  passed: { nhan: 'đạt', mau: 'teal' },
  approve: { nhan: 'duyệt', mau: 'teal' },
  approved: { nhan: 'đã duyệt', mau: 'teal' },
  ok: { nhan: 'đạt', mau: 'teal' },
  warn: { nhan: 'cần chú ý', mau: 'amber' },
  minor: { nhan: 'lỗi nhẹ', mau: 'amber' },
  revise: { nhan: 'cần sửa', mau: 'amber' },
  rewrite: { nhan: 'viết lại', mau: 'amber' },
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

const MUC: Record<string, { nhan: string; mau: Tone }> = {
  low: { nhan: 'nhẹ', mau: 'muted' },
  minor: { nhan: 'nhẹ', mau: 'muted' },
  medium: { nhan: 'vừa', mau: 'amber' },
  major: { nhan: 'nặng', mau: 'amber' },
  high: { nhan: 'nặng', mau: 'red' },
  critical: { nhan: 'nghiêm trọng', mau: 'red' },
};

export function nhanMuc(severity: string | undefined): { nhan: string; mau: Tone } | undefined {
  if (!severity) return undefined;
  return MUC[severity.toLowerCase().trim()] ?? { nhan: severity, mau: 'muted' };
}

/* ── bảy chiều kiểm định của Editor ───────────────────────────────────── */

/**
 * Tên chiều do Editor sinh ra nên là chuỗi tự do; bảng này dịch các chiều
 * chuẩn, còn lại hiện nguyên văn.
 */
const CHIEU: Record<string, string> = {
  setting_consistency: 'nhất quán thiết lập',
  character_behavior: 'hành vi nhân vật',
  pacing: 'nhịp',
  narrative: 'mạch tự sự',
  foreshadowing: 'phục bút',
  hook: 'móc chương',
  prose: 'chất văn',
  style: 'văn phong',
};

export function nhanChieu(name: string): string {
  return CHIEU[name.toLowerCase().trim().replace(/[\s-]+/g, '_')] ?? name;
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
  chuaChonChuong: 'Chưa chọn chương — bấm một hàng trong bảng chương.',
  chuongChuaCoDuLieu: 'Chương này chưa có dữ liệu trong store.',
  chuaCoHopDong: 'Chương này chưa có hợp đồng — Writer lập hợp đồng ở bước plan.',
  chuaCoDuyet: 'Chưa có bản duyệt cho chương này.',
  chuaCoBanThao: 'Chưa có bản thảo cho chương này.',
  chuaCoPhanQuyet: 'Chưa có phán quyết nào được ghi.',
  chuaCoChuong: 'Chưa có chương nào có dấu vết sản xuất.',
  duLieuLech: 'Dữ liệu store lệch',
} as const;
