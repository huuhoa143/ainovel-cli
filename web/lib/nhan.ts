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
  plan: 'lập khế ước chương',
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

/* ── cấu hình phiên chạy (bề mặt Cài đặt) ─────────────────────────────── */

/**
 * `domain.ChapterAdvanceMode`: enum kín hai giá trị, và server tự kiểm
 * (`ChapterAdvanceMode.Valid()` ở internal/domain/runtime.go:237 chỉ nhận auto /
 * review, và một mã lạ làm engine DỪNG chứ không đoán xuống mức thấp hơn).
 *
 * Nhãn nói ra hệ quả, không dịch chữ: "review" dịch trần thành "duyệt" thì
 * không phân biệt được với việc Editor duyệt chương — hai chuyện khác nhau, và
 * chuyện ở đây là ai bấm cho chương sau được bắt đầu.
 */
const CHE_DO_TIEN: Record<string, string> = {
  auto: 'tự động đi tiếp',
  review: 'chờ cấp phép từng chương',
};

export function nhanCheDoTien(mode: string | undefined): string | undefined {
  if (!mode) return undefined;
  return CHE_DO_TIEN[mode.toLowerCase().trim()] ?? mode;
}

/**
 * `domain.PlanningTier`: short / mid / long (internal/domain/runtime.go:35–37).
 * Không kèm số chương vào nhãn — ngưỡng chương của mỗi mức nằm ở tầng quy hoạch
 * và không đọc được từ đây, nên viết ra là bịa. Số chương thật đã có ở thanh
 * trên và ở dòng mô tả của Dòng sản xuất.
 */
const MUC_QUY_HOACH: Record<string, string> = {
  short: 'truyện ngắn',
  mid: 'truyện vừa',
  long: 'truyện dài',
};

export function nhanMucQuyHoach(tier: string | undefined): string | undefined {
  if (!tier) return undefined;
  return MUC_QUY_HOACH[tier.toLowerCase().trim()] ?? tier;
}

/**
 * `domain.AdvanceHoldAfter`: boundary / rewrites_drained
 * (internal/domain/runtime.go:257–260).
 *
 * Nhãn nói MỐC, không dịch chữ: "boundary" trần trụi không cho biết ranh giới của
 * cái gì, và ở mô hình cuốn-vòng-cung hai tầng thì đó là câu hỏi thật.
 */
const MOC_TAM_DUNG: Record<string, string> = {
  boundary: 'ở ranh giới cung hoặc tập kế tiếp',
  rewrites_drained: 'khi hàng chờ viết lại rút hết',
};

export function nhanMocTamDung(after: string | undefined): string | undefined {
  if (!after) return undefined;
  return MOC_TAM_DUNG[after.toLowerCase().trim()] ?? after;
}

/**
 * `rules.Status`: ready / degraded.
 *
 * `degraded` KHÔNG dịch thành "lỗi": nguồn vẫn tới được mô hình, chỉ mất phần
 * máy-cưỡng-chế-được. Gọi nó là lỗi thì người vận hành đi sửa tệp; gọi đúng thì
 * họ biết luật vẫn có hiệu lực mềm.
 */
const TINH_TRANG_LUAT: Record<string, string> = {
  ready: 'đã chuẩn hoá',
  degraded: 'đã hạ cấp thành văn thô',
};

export function nhanTinhTrangLuat(status: string | undefined): string | undefined {
  if (!status) return undefined;
  return TINH_TRANG_LUAT[status.toLowerCase().trim()] ?? status;
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

/* ── độ hoàn thành khế ước chương ─────────────────────────────────────── */

/**
 * Enum kín, server tự kiểm (internal/tools/save_review.go:148 chỉ nhận met /
 * partial / missed), nên ba giá trị này dịch được chắc chắn. Giá trị lạ hiện
 * nguyên văn thay vì đoán.
 */
const KHE_UOC: Record<string, { nhan: string; mau: Tone }> = {
  met: { nhan: 'đạt', mau: 'teal' },
  partial: { nhan: 'đạt một phần', mau: 'amber' },
  missed: { nhan: 'không đạt', mau: 'red' },
};

export function nhanKheUoc(
  status: string | undefined,
): { nhan: string; mau: Tone } | undefined {
  if (!status) return undefined;
  return KHE_UOC[status.toLowerCase().trim()] ?? { nhan: status, mau: 'muted' };
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
 * Tên chiều là chuỗi tự do trong khế ước (`schema.Property("dimension", ...)`
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

  // Chiều "khế ước chương" do MÔ HÌNH tự đặt tên, nên store thật mang cả hai
  // cách gọi: bản duyệt viết trước lượt đổi thuật ngữ ghi "hợp đồng chương"
  // (kiểm chứng trong output/*/reviews/01.json), bản sau ghi "khế ước chương".
  // Giữ NGUYÊN giá trị đã xuống đĩa và chỉ ánh xạ ở tầng hiển thị — đổi giá trị
  // đã lưu là bỏ mồ côi bản ghi cũ, cùng lý lẽ với việc giữ tên rule
  // `non_cjk_fragments`. Khóa buộc phải dùng `_`: nhanChieu chuẩn hoá khoảng
  // trắng thành `_` trước khi tra, nên khóa có dấu cách sẽ không bao giờ khớp.
  'hợp_đồng_chương': 'khế ước chương',
  'khế_ước_chương': 'khế ước chương',
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

  /* cấu hình máy — mức MÁY, không phải mức tác phẩm */
  cauHinh: 'Cấu hình máy',
  may: 'Máy',
  nhaCungCapVaKhoa: 'Nhà cung cấp và khóa',
  macDinh: 'Mặc định',
  kieuVanMacDinh: 'Kiểu văn mặc định',
  doSuyLuan: 'Độ suy luận',
  themNhaCungCap: 'Thêm nhà cung cấp',
  ten: 'Tên',
  loaiGiaoThuc: 'Giao thức',
  diaChiGoc: 'Địa chỉ gốc',
  khoaApi: 'Khóa API',
  danhSachModel: 'Model',
  luu: 'Lưu',
  dangLuu: 'Đang lưu…',
  daLuu: 'Đã lưu',
  huy: 'Hủy',
  xoa: 'Xóa',
  sua: 'Sửa',
  dungLamMacDinh: 'Dùng làm mặc định',
  daDatKhoa: 'đã đặt khóa',
  chuaDatKhoa: 'chưa có khóa',
  giuKhoaCu: 'để trống = giữ khóa hiện tại',
  tepCauHinh: 'Tệp cấu hình',
  kenhVai: 'Model theo vai',
  vaiMacDinh: 'Mặc định',
  vaiArchitect: 'Kiến trúc',
  vaiWriter: 'Chấp bút',
  vaiEditor: 'Biên tập',
  thuaHuong: 'thừa hưởng mặc định',
  datRieng: 'đặt riêng',
  caiLanDau: 'Cài đặt lần đầu',
  batDauDung: 'Bắt đầu dùng',
  moMay: 'Mở máy cho tác phẩm này',
  viDuCanThiep: 'ví dụ: Lâm Thanh nên do dự lâu hơn trước khi rút kiếm',
  dangGui: 'Đang gửi…',
  tiemVaoLuotDangChay: 'Tiêm vào lượt đang chạy',
  danhThucLuotMoi: 'Đánh thức lượt mới',
  chay: 'Chạy',
  dung: 'Dừng',
  choDiTiep: 'Cho đi tiếp 1 chương',
  cheDoNghiemThu: 'Nghiệm thu từng chương',
  cheDoTuChay: 'Tự chạy liên tục',
  taoTacPham: 'Tác phẩm mới',
  batDauViet: 'Bắt đầu viết',
  yeuCauTruyen: 'Yêu cầu truyện',
  tenThuMuc: 'Tên thư mục',
  moLai: 'Mở lại để viết tiếp',
  huongVietTiep: 'Hướng viết tiếp (có thể để trống)',
  dongMay: 'Đóng máy',
  dieuKhien: 'Điều khiển dây chuyền',
  engineDangHoi: 'Dây chuyền đang hỏi bạn',
  tuNhap: 'Tự nhập',
  nhapCauTraLoi: 'nhập câu trả lời của bạn',
  themGhiChuTuyChon: 'thêm ghi chú (tùy chọn)',
  traLoiVaTiepTuc: 'Trả lời và cho đi tiếp',
  cungDung: 'Cùng dựng',
  guiLuot: 'Gửi',
  chotBanNhap: 'Chốt và chạy theo bản này',
  banNhapHienTai: 'Bản yêu cầu đang có',
  goiYTiepTheo: 'Có thể nói tiếp',
  ban: 'Bạn',
  nhapXuat: 'Nhập & Xuất',
  xuatBan: 'Xuất bản',
  dinhDang: 'Định dạng',
  tuChuong: 'Từ chương',
  denChuong: 'Đến chương',
  chuongCuoi: 'chương cuối',
  taiVe: 'Xuất và tải về',
  nhapTruyenNgoai: 'Nhập truyện từ ngoài',
  tepNguon: 'Tệp nguồn',
  huongDanChia: 'Hướng dẫn chia',
  tuDongChotChia: 'Tự động chốt cách chia',
  batDauNhap: 'Bắt đầu nhập',
  dangChayLuong: 'Đang chạy…',
  moPhongVanPhong: 'Mô phỏng văn phong',
  nguLieu: 'Ngữ liệu',
  hoSoSan: 'Hồ sơ sẵn',
  dungHoSoTuNguLieu: 'Dựng hồ sơ từ ngữ liệu',
  nhapHoSoSan: 'Nhập hồ sơ sẵn',
  daTaiVe: (ten: string, so: number) => `Đã tải về ${ten} — ${so} chương`,
  boQuaChuong: (n: number[]) =>
    `bỏ qua ${n.length} chương chưa hoàn thành (${n.slice(0, 8).join(', ')}${n.length > 8 ? '…' : ''})`,

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
  tabKheUoc: 'Khế ước',
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
  kheUocThieu: 'Khế ước còn thiếu',
  trichDoan: 'Trích đoạn',
  /**
   * Nhãn của nút đọc toàn văn, ba trạng thái.
   *
   * Ở đây chứ không viết thẳng trong component vì nút này được vẽ ở HAI nhánh
   * của cùng một tab (có trích đoạn, và đã tải về rỗng). Hai bản chép tay của
   * cùng một nhãn sẽ lệch nhau ngay lần đổi đầu tiên, và lúc đó cùng một nút mang
   * hai tên tùy theo chuyện gì vừa xảy ra.
   */
  docToanVan: 'Đọc toàn văn chương',
  docLai: 'Đọc lại',
  dangDoc: 'đang đọc…',

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
  kheUocChuong: 'Khế ước chương',
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
  // "Hiện trạng", không "Trạng thái": nhãn này nằm dưới tiêu đề đã chứa chữ
  // "Trạng thái ở cuối cung gần nhất", nên lặp lại từ đó làm người đọc tưởng
  // là hai thứ khác nhau. Và nó viết hoa như mọi nhãn trong cùng <dl> — trước
  // đây chỗ này viết cứng "hiện trạng" chữ thường, đứng ngay cạnh "Động lực"
  // và "Năng lực", lệch cách viết ngay trong một nhóm.
  hienTrang: 'Hiện trạng',
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
  kheUoc: 'Khế ước',
  // Thang điểm là 0–100, do save_review.go:271 chặn (`score < 0 || score > 100`).
  // In kèm mẫu số vì một con số trơ ("68") không nói được nó trên thang nào, và
  // người vận hành sẽ đọc 68 như 68% hoặc như 6,8/10 tùy phản xạ.
  diemTren100: (n: number) => `${n}/100`,
  demChieu: (n: number) => `${n} chiều`,

  // hàng chờ viết lại
  /**
   * Dạng gọn của số chương, dùng khi nó đứng CẠNH tiêu đề chương.
   *
   * ĐO ĐƯỢC trên tác phẩm `gan-xong`: dàn ý ở đó đặt tiêu đề chương đúng bằng
   * "Chương 37", nên "Chương 37" + tiêu đề ra thành "Chương 37  Chương 37" —
   * đọc như một lỗi lặp của giao diện trong khi cả hai đều là dữ liệu thật. Dạng
   * "ch. 37" là dạng đã dùng cho số chương nội dòng ở khối vấn đề, và nó không
   * bao giờ trùng chữ với tiêu đề.
   */
  chuongNgan: (n: number) => `ch. ${n}`,
  daCoSoTu: 'Đã viết',
  colTinhTrangDuyet: 'Bản duyệt',
  moBanDuyet: 'Xem bản duyệt',
  demHangCho: (n: number) => `${n} chương chờ viết lại`,

  // tổ sản xuất
  // Tiêu đề section KHÁC nhãn cột, dù cùng nói về vai: đặt cả hai là "Vai" thì
  // hai dòng "Vai" xếp ngay trên nhau và trông như một lỗi lặp.
  vaiTrongTo: 'Vai trong tổ',
  colVai: 'Vai',
  colChuongThamGia: 'Chương tham gia',
  colPhanQuyetDaGhi: 'Phán quyết',
  colModelDaDung: 'Model',
  colThatBai: 'Thất bại',
  vaiDangChay: 'đang chạy',
  chuaChayLuotNao: 'chưa có lượt nào',
  demPhanQuyetDaTai: (n: number) => `${n} phán quyết đã tải`,

  // văn phong
  loiKe: 'Lối kể',
  giongNhanVat: 'Giọng nhân vật',
  danhSachCam: 'Danh sách cấm',
  /**
   * Hai nguồn của bề mặt Văn phong, và hai nhãn phân loại chúng.
   *
   * `mô tả` / `chỉ thị` là chỗ nhãn làm việc nặng nhất trên cả bề mặt: hai khối
   * trông giống nhau (đều là danh sách luật) nhưng ngược chiều nhân quả. Không
   * gọi tên chiều đó thì người vận hành không đối chiếu được "tôi dặn thế, nó
   * viết ra thế".
   */
  luatDaKhai: 'Luật đã khai',
  editorChungRa: 'Editor chưng ra',
  moTa: 'mô tả',
  chiThi: 'chỉ thị',
  theLoai: 'Thể loại',
  cumTuCam: 'Cụm từ cấm',
  kyTuCam: 'Ký tự cấm',
  tuMoi: 'Từ mỏi',
  uaThich: 'Ưa thích',
  khaiTu: 'Khai từ',
  chuaChacChan: 'Chưa chắc chắn',
  /** Hạn mức mỗi chương, KHÔNG phải lệnh cấm — dấu ≤ nói ra điều đó. */
  toiDaMoiChuong: (n: number) => `≤ ${n}/chương`,
  demLuatKhai: (n: number) => `${n} luật đã khai`,
  luatHaCap: 'đã hạ cấp',
  // "chốt ở" chứ không "của": bộ quy tắc được chưng ra ở RANH GIỚI cung đó, và
  // nó vẫn là bộ mới nhất sau khi dây chuyền đi sang cung sau.
  chotOCung: (tap: number, cung: number) => `chốt ở tập ${tap} · cung ${cung}`,
  chotOCungPhang: (cung: number) => `chốt ở cung ${cung}`,
  demQuyTac: (n: number) => `${n} quy tắc`,
  demNhanVatCoGiong: (n: number) => `${n} nhân vật có quy tắc giọng`,

  // chi phí
  theoTacTu: 'Theo tác tử',
  theoModel: 'Theo model',
  colNhap: 'Nhập',
  colXuat: 'Xuất',
  colDocDem: 'Đọc đệm',
  colGhiDem: 'Ghi đệm',
  colTietKiem: 'Tiết kiệm',
  colChiPhi: 'Chi phí',
  tongChung: 'Tổng chung',
  colTiTrong: 'Tỉ trọng',
  doTinSoLieu: 'Độ tin của số liệu',
  luotThieuUsage: 'Lượt thiếu usage',
  dutDem: 'Đứt đệm',
  giaThanhChuong: 'Giá thành mỗi chương',
  capNhat: 'Cập nhật',
  /** Mẫu số của giá thành, đứng cạnh nó — không phải một chú thích rời. */
  cuaSoGiaThanh: (chuong: number) => `trên ${chuong} chương đã xong`,
  // Tổng in kèm MẪU SỐ. Một con số tiền trơ không nói được nó cộng trên bao
  // nhiêu chương, và người vận hành sẽ so nó với con số của một tác phẩm khác.
  tongTrenChuong: (tien: string, chuong: number) =>
    `tổng ${tien} · ${chuong} chương đã xong`,
  capNhatLuc: (luc: string) => `cập nhật ${luc}`,
  khongApDung: 'n/a',
  demDutDem: (n: number) => `${n} lần đứt đệm`,

  // cài đặt
  phienChay: 'Phiên chạy',
  tienChuong: 'Đi tiếp chương',
  batDauLuc: 'Bắt đầu',
  nhaCungCap: 'Nhà cung cấp',
  model: 'Model',
  kieuVan: 'Kiểu văn',
  mucQuyHoach: 'Mức quy hoạch',
  cheDoTien: 'Chế độ',
  chuongDuocCapPhep: 'Đã cấp phép',
  chuaCapPhepChuongNao: 'chưa cấp phép chương nào',
  chiDoc: 'chỉ đọc',
  /** Nhãn báo trước ở rail: mục vào được, chỉ là chưa có gì bên trong. */
  chuaCoSoLieu: 'chưa có số liệu',
  yeuCauKhoiTao: 'Yêu cầu khởi tạo',
  canThiepConTon: 'Can thiệp còn tồn',
  phanQuyetKhoiDong: 'Phán quyết khởi động',
  nguoiQuyHoach: 'Người quy hoạch',
  viecQuyHoach: 'Việc quy hoạch',
  maPhanQuyet: 'Mã phán quyết',
  /** Mốc engine sẽ dừng, không phải "đã dừng" — ý định này còn chưa tiêu thụ. */
  tamDungSauKhi: (moc: string) => `Sẽ tạm dừng ${moc}`,
  khoiDongLuc: (luc: string) => `khởi động ${luc}`,

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
  /* cấu hình máy */
  cauHinhLaMucMay:
    'Đây là cấu hình của MÁY, không phải của một tác phẩm. Nó áp cho mọi lượt chạy sau — ' +
    'tác phẩm đang chạy vẫn giữ cấu hình từ lúc nó được mở.',
  cauHinhKhoaMotChieu:
    'Studio không bao giờ đọc lại khóa đã lưu, nên ô khóa luôn trống. Để trống khi lưu ' +
    'nghĩa là giữ nguyên khóa hiện tại.',
  /**
   * Câu riêng cho lần đầu: lúc đó CHƯA có khóa nào, nên "để trống = giữ khóa hiện tại"
   * nói về một thứ không tồn tại và người dùng sẽ đọc nó thành "có thể bỏ trống".
   */
  cauHinhKhoaLanDau:
    'Khóa được ghi vào tệp cấu hình và không bao giờ được trả về giao diện — sau khi lưu, ' +
    'ô này sẽ luôn trống và chỗ nào cần hiện thì chỉ hiện dạng che.',
  cauHinhKieuVanLa: (k: string, cothat: string[]) =>
    `Cấu hình đang đặt kiểu văn "${k}", nhưng engine chỉ nhận ${cothat.join(', ')} — ` +
    'giá trị lạ bị bỏ qua âm thầm, tức tác phẩm chạy không có tham chiếu thể loại nào.',
  cauHinhCanMoLai: (sach: string[]) =>
    `Đã lưu. ${sach.join(', ')} đang mở engine nên vẫn dùng cấu hình cũ; đóng rồi mở lại để áp.`,
  cauHinhLanDau:
    'Chưa có tệp cấu hình. Nhập nhà cung cấp và khóa API để bắt đầu — không cần mở terminal.',
  kenhVaiCanMayMo:
    'Đổi model theo vai tác động lên engine ĐANG MỞ, nên nó chỉ hiện khi tác phẩm này ' +
    'đang mở máy. Muốn đổi mặc định cho mọi lượt sau thì sửa ở Cấu hình máy.',
  kenhVaiThuaHuong:
    'Vai chưa đặt riêng thì dùng model mặc định. Đổi mặc định sẽ đổi luôn các vai này.',
  /** capabilities.steer === false */
  /**
   * Hai câu này nói về ca đường ghi BỊ TẮT, và lý do đã đổi.
   *
   * Câu cũ nói "engine sở hữu quyền ghi, studio ghi vào là hai process cùng sửa một tệp".
   * Tiền đề đó hết hiệu lực: engine chạy trong process studio. Giờ ô chỉ vô hiệu khi
   * studio lắng nghe ngoài loopback — lúc đó nhóm route ghi cố ý không được mắc, vì một
   * bề mặt giữ khóa API và khởi động được engine không được phơi ra mạng.
   */
  canThiepTat:
    'Studio đang lắng nghe ngoài loopback nên đường ghi bị tắt: bề mặt này giữ khóa API và khởi động được engine, nên nó không được nhận lệnh ghi từ mạng. Chạy lại với --addr 127.0.0.1:8420 để dùng đầy đủ.',
  canThiepChoDay: 'Ô nhập vô hiệu — studio đang ở chế độ chỉ đọc',
  canThiepArbiterXuLy:
    'Arbiter phân loại phạm vi ảnh hưởng rồi xếp các chương bị tác động vào hàng chờ viết lại. Phán quyết được ghi vào nhật ký ở trên.',
  daTiemVaoLuot:
    'Đã tiêm vào lượt đang chạy. Arbiter đang phán quyết; chương bị ảnh hưởng có thể vào hàng chờ viết lại.',
  daDanhThuc: 'Đã đánh thức một lượt chạy mới với câu vừa gửi.',
  engineDangChanCho:
    'Dây chuyền đã DỪNG LẠI ở đây và không tiến thêm bước nào cho tới khi bạn trả lời. Nó hỏi vì thiếu thông tin ảnh hưởng rõ tới hướng quy hoạch.',
  muonThoatThiDung: 'Không muốn trả lời thì dừng dây chuyền ở thanh dưới.',
  cungDungGiaiThich:
    'Nói qua vài lượt để làm rõ ý trước khi engine bắt đầu. Mỗi lượt là một lời gọi model thật, nhưng rẻ hơn nhiều so với việc để nó viết sai hướng rồi phải viết lại.',
  cungDungCanMayMo:
    'Cùng dựng cần một engine đang mở để gọi model. Mở một tác phẩm bất kỳ rồi quay lại — hoặc nếu đã biết mình muốn gì thì gõ thẳng vào ô yêu cầu ở Tác phẩm mới.',
  nhapXuatCanTacPham: 'Chọn một tác phẩm trước — cả ba luồng đều tác động lên store của một tác phẩm cụ thể.',
  xuatBanGiaiThich:
    'Hợp nhất các chương đã hoàn thành thành một tệp và tải về máy bạn. Chương chưa viết xong bị bỏ qua, và số chương bỏ qua được nói ra sau khi tải.',
  nhapTruyenGiaiThich:
    'Đọc một cuốn có sẵn, chia chương theo nghĩa rồi dựng dàn ý, nhân vật và tóm tắt từ nó. Luồng này GIỮ khóa độc quyền của engine nên nó không chạy song song với việc viết.',
  tuDongChotLaUyQuyenMu:
    'Tự động chốt là uỷ quyền MÙ: nó nhận cách chia chương mà bạn chưa xem. Để tắt thì luồng dừng lại ở bước xem trước, và nhật ký nói rõ nó đang chờ gì.',
  moPhongGiaiThich:
    'Dựng hồ sơ văn phong từ ngữ liệu bạn tải lên, để Writer viết theo giọng đó. Hoặc nhập một hồ sơ đã dựng sẵn — đường đó bỏ qua cả bước phân tích.',
  luongCoTheLau:
    'Đang chạy. Luồng này gọi model nhiều lượt nên có thể mất vài phút — bản này chỉ hiện nhật ký sau khi xong, nên trang im lặng KHÔNG có nghĩa là treo.',
  cungDungGiaiDoanTamDung:
    'Vào cùng dựng giai đoạn sẽ TẠM DỪNG dây chuyền: bàn về chặng tiếp thì không để nó viết tiếp trong lúc bàn.',
  /* vòng đời sáng tác */
  vongDoiCanMoMay:
    'Các nút điều khiển cần engine đang mở. Mở máy không gọi model lần nào — nó chỉ gắn engine vào tác phẩm.',
  cheDoReviewLaGi:
    'Chế độ nghiệm thu: engine dừng trước MỖI chương mới và chờ bạn cho đi tiếp từng chương một. Dùng khi muốn đọc soát trước khi nó viết thêm.',
  cheDoAutoLaGi:
    'Chế độ tự chạy: engine viết liên tục tới khi xong hoặc hết ngân sách. Không dừng chờ ai.',
  taoSachGiaiThich:
    'Một câu yêu cầu là đủ. Arbiter sẽ đọc nó để chọn mức quy hoạch và số chương, rồi bắt đầu dựng nền tác phẩm.',
  taoSachTenThuMuc:
    'Tên này thành thư mục trên đĩa nên chỉ nhận chữ thường không dấu, số, gạch ngang và gạch dưới. Tên hiển thị của tác phẩm do chính truyện quyết định, không phải tên này.',
  taoSachSeTieuTien:
    'Bấm Bắt đầu là gọi model thật và tiêu tiền thật. Dây chuyền sẽ chạy liên tục tới khi bạn dừng.',

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
  /**
   * Câu cũ: "Studio chỉ đọc store — tác phẩm được tạo bằng engine", kèm một lệnh CLI.
   * Cả hai giờ sai: studio TẠO được tác phẩm. Câu này chỉ còn dùng ở chế độ chỉ đọc
   * (studio chạy ngoài loopback), nên nó nói đúng ca đó.
   */
  xuongTrongThan:
    'Thư mục gốc không chứa tác phẩm nào có meta/progress.json. Studio đang ở chế độ chỉ đọc nên không tạo được tác phẩm từ đây — chạy lại với --addr 127.0.0.1:8420 để tạo trên web.',
  xuongTrongLenh: 'ainovel-cli run --root <thư mục gốc>',
  xuongTrongGoc: 'thư mục gốc',

  khongTaiDuoc: 'Không đọc được store',
  /** Bản trước nói "engine và studio là hai tiến trình rời nhau" — hết đúng từ đợt 1. */
  khongTaiDuocViSao:
    'Studio đọc trực tiếp thư mục gốc. Nếu thư mục gốc sai, hoặc tác phẩm này chưa có meta/progress.json, thì không có gì để đọc.',

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
    'Bấm một hàng trong bảng chương để xem khế ước, bản duyệt và bản thảo của chương đó.',
  tabChuaChonChuong: 'chưa chọn chương nên chưa có gì để mở',

  chuongChuaCoDuLieu: 'Chương này chưa có dữ liệu trong store.',
  chuaCoKheUoc:
    'Chương này chưa có khế ước — Writer lập khế ước ở bước plan. Khế ước chương là định nghĩa hoàn thành của chương này.',
  chuaCoDuyet: 'Chưa có bản duyệt cho chương này.',
  chuaCoBanThao: 'Chưa có bản thảo cho chương này.',
  /**
   * Đã gọi /chapters/{n} và nhận về rỗng — KHÁC với `chuaCoBanThao`, là câu nói
   * lúc chưa gọi (chỉ dựa vào `excerpt` vắng trong snapshot).
   *
   * Phải là hai câu vì trạng thái sau khi bấm nút và trạng thái chưa bấm bao giờ
   * trông y hệt nhau nếu dùng cùng một câu, và người vận hành mất tín hiệu duy
   * nhất cho biết yêu cầu đã đi và đã về.
   *
   * Câu này KHÔNG nêu tên tệp nào. Nó phải còn đúng sau khi tầng Go ngã về bản
   * chốt (`chapters/{NN}.md`) chứ không chỉ đọc bản nháp: lúc đó "chưa có bản
   * nháp" thôi không còn là lý do, mà "chương chưa được viết" thì vẫn là.
   */
  docVeRong:
    'Đã đọc từ store và nhận về rỗng — chương này chưa có nội dung nào được ghi.',
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
  /**
   * KHÔNG nêu tên tệp trong câu này.
   *
   * Bản trước viết "nội dung chương chỉ được đọc từ bản nháp (drafts/); chương đã
   * chốt mà không còn bản nháp thì không có gì để đọc ở đây" — câu đó chẩn đoán
   * đúng một KHUYẾT ĐIỂM của tầng đọc, không phải một sự thật của thiết kế. Khi
   * tầng Go ngã về bản chốt thì nó thành một câu sai đứng sẵn trong giao diện,
   * và loại sai đó không ai đi kiểm lại.
   * Ca rỗng vẫn còn thật sau bản sửa đó (chương chưa được viết), nên câu ở đây
   * nói đúng phần còn đúng: bề mặt đã hỏi store, store không có gì để trả.
   */
  chuongTrongStore:
    'Chương có dấu vết sản xuất nhưng store trả về bản thảo rỗng — chương chưa được viết, hoặc nội dung của nó chưa được ghi vào store.',
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
  /**
   * Chú giải của số đếm ở rail. Nói ra MẪU SỐ, không chỉ con số.
   *
   * Bản trước rail đếm vạch `gate` trên trục còn bề mặt liệt kê chương có dấu vết
   * sản xuất: cùng một nhãn, hai mẫu số, và chúng lệch tới mức rail ghi 0 trong
   * khi bề mặt có đủ bản duyệt 7 chiều. Giờ hai bên đếm cùng một thứ, và câu này
   * để người vận hành đọc được nó là thứ gì mà không phải mở bề mặt ra đối chiếu.
   */
  railKiemDinhDem:
    'Số chương có dấu vết sản xuất, tức số chương mở được bản duyệt. Bản duyệt của từng chương đọc ở bề mặt Kiểm định.',

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
  // ĐO ĐƯỢC ở 1440px: bản dài ("…của mỗi chương có dấu vết sản xuất") ngắt ba
  // dòng trong đầu cột và bỏ lại đúng một chữ "xuất" ở dòng cuối. Phần bị cắt
  // không mất nghĩa — dòng mô tả ngay trên bảng đã nói corpus là chương có dấu
  // vết sản xuất; phần KHÔNG được cắt là "chu kỳ gần nhất", vì đó mới là cửa sổ.
  toCuaSoChuong: 'theo chu kỳ gần nhất của mỗi chương',
  toKhongDoDuocVai:
    'Không suy được vai nào đã tham gia: vai được đọc từ bước checkpoint, và store chưa ghi checkpoint nào cho các chương này.',
  toKhongCoChiPhiTheoVai:
    'Store CÓ cộng chi phí theo tác tử và theo model, nhưng API chưa trả phần đó — nên không có cột chi phí ở đây. Tổng chi phí và giá thành mỗi chương ở thanh dưới có nguồn thật.',
  toChuaCoVaiNao:
    'Chưa có vai nào để lượt: store chưa ghi checkpoint và chưa ghi phán quyết nào cho tác phẩm này.',

  namTrongDongSanXuat: 'Khu này nằm trong bề mặt Dòng sản xuất.',

  /**
   * Chú giải ba mục rail mới. Mỗi câu nói ra PHẠM VI của bề mặt, không nhắc lại
   * tên nó: mục nào cũng đã có tên ngay bên cạnh, còn phạm vi thì không đọc được
   * từ tên. Không mục nào mang số đếm — xem ghi chú tại chỗ trong Rail.tsx.
   */
  railVanPhong:
    'Quy tắc lối kể, giọng từng nhân vật và danh sách cấm mà Editor chưng ra ở ranh giới cung.',
  railChiPhi:
    'Chi phí theo tác tử và theo model. Tổng và giá thành mỗi chương ở thanh dưới.',
  railCaiDat: 'Cấu hình phiên chạy, chỉ đọc.',

  /**
   * Ba mục còn lại chưa dựng vì THIẾU NGUỒN, không vì chưa kịp làm — và lý do
   * cụ thể phải nói ra ở chú giải của từng mục.
   *
   * Một chú giải chung ("chưa dựng bề mặt") để người vận hành tưởng đây là việc
   * còn tồn của giao diện. Thực tế cả ba đều chờ một endpoint ở tầng Go: dữ liệu
   * nằm trong store nhưng không có đường ra. Nói đúng chỗ tắc thì người đọc biết
   * phải sửa ở đâu.
   */
  /* ── ba trạng thái rỗng của ba bề mặt đọc-một-tệp ───────────────────── */

  /**
   * BA ca, BA câu — và cả ba đều là trạng thái BÌNH THƯỜNG của một tác phẩm, trừ
   * ca thứ ba.
   *
   *   1. chưa chạy gì            → engine chưa ghi tệp đó lần nào
   *   2. đã chạy mà chưa có số   → tệp có, trong đó rỗng
   *   3. API không trả được      → chưa biết store có gì
   *
   * Gộp 1 với 2 là nói dối một trong hai: ca 1 nói "chờ dây chuyền chạy tới đó",
   * ca 2 nói "dây chuyền đã qua đó mà không ghi được gì" — câu sau là chuyện đáng
   * đi xem, câu trước thì không. Gộp 3 vào một trong hai còn tệ hơn: nó biến một
   * lỗi của tầng đọc thành một sự thật về tác phẩm, và loại sai đó không ai đi
   * kiểm lại.
   *
   * Ba câu này viết theo tham số vì cả ba bề mặt chịu đúng cùng bộ trạng thái;
   * ba bản chép tay sẽ lệch nhau ngay lần đổi từ ngữ đầu tiên, đúng lý do
   * `CHU.docToanVan` được đưa về đây thay vì viết trong component.
   */
  nguonChuaGhi: (tep: string, khiNao: string) =>
    `Store chưa có ${tep}. Engine ghi tệp này ${khiNao}, nên tác phẩm chưa qua bước đó thì chưa có gì để đọc. Bề mặt đã dựng — chưa có việc nào đã xảy ra để nó kể.`,
  nguonCoMaRong: (tep: string, muc: string) =>
    `Đã có ${tep} nhưng trong đó chưa có ${muc} nào. Tệp được ghi rồi mà rỗng là một sự thật khác với chưa ghi lần nào, và hai ca đó dẫn tới hai chỗ khác nhau để đi xem.`,
  /**
   * Ca thứ tư, và nó là một LỖI của giao diện nếu người dùng thấy nó lâu.
   *
   * "Đang tải" mãi mãi là một lời nói dối kiên nhẫn: nó hứa dữ liệu đang trên
   * đường trong khi không có lời gọi nào đang bay. Ca này chỉ tới được khi chưa
   * có tác phẩm nào được chọn, nên nó phải nói đúng điều đó thay vì quay vòng.
   */
  chuaChonTacPham:
    'Chưa chọn tác phẩm nào, nên chưa có gì để đọc. Chọn một tác phẩm ở thanh trên.',
  nguonKhongDocDuocTieuDe: 'Không đọc được nguồn của bề mặt này',
  nguonKhongDocDuoc:
    'Câu dưới đây là của server, không phải của giao diện. Engine và studio là hai tiến trình rời nhau: endpoint có thể không có ở bản engine đang chạy, hoặc store đọc lỗi. Đây KHÔNG phải "tác phẩm chưa có dữ liệu" — điều đó chưa biết được.',

  /* ── bề mặt Văn phong ───────────────────────────────────────────────── */

  vanPhongTepNguon: 'meta/style_rules.json',
  vanPhongKhiNao: 'ở ranh giới cung, sau khi Editor tóm tắt cung vừa đóng',
  /**
   * Cửa sổ của cả bề mặt, viết ngay dưới đầu trang chứ không nhét vào chú giải.
   *
   * Cùng lớp với hai cửa sổ của Tổ sản xuất: một con số mà phải trỏ chuột mới
   * biết phạm vi thì phần lớn người đọc sẽ không biết. Ở đây phạm vi là THỜI
   * ĐIỂM — quy tắc chưng ở cuối một cung, không phải quy tắc của chương đang
   * viết, và Writer nhận chính bộ này cho tới ranh giới cung sau.
   */
  vanPhongCuaSo:
    'Editor chưng quy tắc ở ranh giới cung, nên đây là bộ mới nhất chứ không phải bộ của chương đang viết: nó mô tả cung vừa đóng và Writer dùng nó cho tới ranh giới cung sau.',
  /** Quy tắc chốt ở một cung, dây chuyền đã sang cung khác. */
  vanPhongLechCung: (cungQuyTac: string, cungHienTai: string) =>
    `Quy tắc chốt ở ${cungQuyTac}, dây chuyền hiện ở ${cungHienTai} — bộ này vẫn là bộ đang có hiệu lực, nhưng nó chưa thấy cung đang chạy.`,
  /* Nguồn thứ hai của bề mặt Văn phong — người dùng KHAI, không phải Editor chưng. */
  vanPhongKhaiTepNguon: 'meta/user_rules.json',
  vanPhongKhaiKhiNao: 'khi sách được mở qua Host',
  /**
   * CẢ HAI nguồn đều chưa có — câu riêng, không dùng `nguonChuaGhi` của một nguồn.
   *
   * Bề mặt có hai nguồn ghi ở hai thời điểm khác nhau, nên một câu chỉ nêu
   * `style_rules.json` sẽ để người đọc tưởng nguồn kia đã có mà rỗng. Hai tệp thì
   * kể tên hai tệp, và kể luôn hai mốc — vì hai mốc đó nói cho người vận hành biết
   * phải chờ điều gì: một cái chờ mở sách, một cái chờ hết cung đầu.
   */
  vanPhongChuaCoNguonNao:
    'Store chưa có nguồn nào cho bề mặt này. meta/user_rules.json được ghi khi sách được mở qua Host, còn meta/style_rules.json chỉ có sau khi Editor tóm tắt cung đầu tiên — tác phẩm này chưa qua bước nào trong hai bước đó. Bề mặt đã dựng; chưa có việc nào đã xảy ra để nó kể.',
  /**
   * Hai nguồn ngược chiều nhân quả, và câu này là lý do bề mặt tách chúng.
   *
   * Người vận hành mở Văn phong thường để đối chiếu đúng hai chiều đó — "tôi dặn
   * thế, nó viết ra thế, lệch ở đâu". Gộp thành một danh sách luật thì câu hỏi ấy
   * không còn đặt được, và đó là câu hỏi duy nhất mà chỉ bề mặt này trả lời được.
   */
  vanPhongHaiNguon:
    'Hai nguồn ngược chiều nhau: luật đã khai là chỉ thị người vận hành đặt ra trước khi có chữ nào, còn quy tắc Editor chưng ra là mô tả rút từ các chương đã viết. Đọc cạnh nhau để thấy chỗ engine đi lệch khỏi điều đã dặn.',
  vanPhongNguonKhai:
    'Người vận hành khai, đã chuẩn hoá. Có ngay từ lúc mở sách, không chờ dây chuyền chạy.',
  vanPhongNguonChung:
    'Editor rút ra từ chương đã viết. Chỉ có sau khi dây chuyền đi qua ranh giới cung đầu tiên.',
  /**
   * `degraded` không phải chi tiết nội bộ.
   *
   * Nó nghĩa là một nguồn chuẩn hoá thất bại và đã bị hạ thành `preferences` thô,
   * nên phần luật máy-kiểm-được của nguồn đó KHÔNG còn được cưỡng chế — chỉ mô
   * hình đọc. Người vận hành thấy "đã khai cụm từ cấm" mà engine không chặn nữa
   * thì họ cần biết vì sao.
   */
  vanPhongHaCap:
    'Một nguồn khai không chuẩn hoá được và đã bị hạ thành văn thô. Phần luật ở nguồn đó không còn được máy cưỡng chế nữa — chỉ mô hình đọc và tự tuân, nên đừng tin nó chặn được như cụm từ cấm bên trên.',
  /** Hạn mức, KHÔNG phải danh sách cấm — hai thứ khác nhau về hệ quả. */
  vanPhongTuMoi:
    'Hạn mức số lần mỗi từ được dùng trong MỘT chương, không phải lệnh cấm. Vượt hạn mức là một vi phạm bị bộ kiểm bắt, còn dùng trong hạn mức thì hợp lệ.',
  vanPhongChuaChac:
    'Điều người vận hành dặn mà không quy được thành luật máy kiểm. Chúng vẫn tới mô hình dưới dạng văn, nhưng không có bộ kiểm nào bắt được nếu bị bỏ qua.',
  vanPhongKhaiTuDay:
    'Các nguồn đã góp vào bản chuẩn hoá này, theo thứ tự ghi đè: mặc định hệ thống, tệp toàn cục, tệp của dự án, rồi yêu cầu lúc khởi động.',
  vanPhongLoiKe: 'Quy tắc lối kể áp cho toàn bộ văn thuật, không riêng nhân vật nào.',
  vanPhongCam:
    'Những gì Writer không được dùng lại. Editor nêu danh sách này từ chính chỗ đã lặp trong các chương đã viết.',
  vanPhongGiongRong: 'Có mục cho nhân vật này nhưng chưa có quy tắc giọng nào.',

  /* ── bề mặt Chi phí ─────────────────────────────────────────────────── */

  chiPhiTepNguon: 'meta/usage.json',
  chiPhiKhiNao: 'sau lượt gọi model đầu tiên',
  /**
   * Trạng thái thứ TƯ, và nó là trạng thái duy nhất trong bốn cái không được đọc
   * thành "chưa tốn tiền".
   *
   * `UsageStore.Load()` trả `(nil, nil)` cho cả thiếu tệp lẫn schema lệch, nên nếu
   * server không stat tệp thì hai ca này đọc ra y hệt nhau. Ca này có số liệu THẬT
   * trên đĩa — chỉ là bản engine đang chạy không đọc được nó — và báo nó thành
   * "chưa chạy gì" là sai theo đúng hướng nguy hiểm: người vận hành tưởng mình
   * chưa tốn gì.
   */
  chiPhiSchemaCu:
    'Có số liệu trên đĩa nhưng nó thuộc bản schema cũ, nên bản engine đang chạy bỏ qua và cộng lại từ đầu. Đây KHÔNG phải "chưa tốn tiền" — tiền đã tốn, chỉ là con số cũ không đọc được ở bản này.',
  /**
   * Bảng rộng hơn màn hình — nói bằng CHỮ, không phó cho thanh cuộn.
   *
   * `.bangwrap` đã có thanh cuộn mảnh "thấy được" kèm lý lẽ đúng (globals.css:803),
   * nhưng nó bị vô hiệu ở đúng ca cần nhất: Chrome trên thiết bị cảm ứng dùng thanh
   * cuộn OVERLAY, tức vô hình cho tới khi người dùng đã cuộn. ĐO ĐƯỢC ở 390px với
   * device emulation: bảng chi phí hiện 4 trong 8 cột, cắt gọn ở mép phải, không có
   * dấu hiệu nào cho biết còn cột — người đọc kết luận đệm và tiết kiệm không tồn
   * tại. Đúng lớp lỗi mà ghi chú ở transport đã cảnh báo ("tưởng con số bị mất").
   *
   * Một dòng chữ thì không phụ thuộc vào cách trình duyệt vẽ thanh cuộn, và nó còn
   * đọc được cho cả trình đọc màn hình.
   */
  bangConCotBenPhai:
    'Bảng rộng hơn màn hình: kéo ngang trong bảng để xem các cột đệm và tiết kiệm.',
  /** Cùng câu mà bảng chương đã nói, nhắc lại ở đây vì đây là chỗ người ta tới tìm. */
  chiPhiKhongTheoChuong:
    'Store cộng chi phí theo tác tử và theo model, không theo chương — nên không có cột chi phí cho từng chương ở bất cứ bề mặt nào. Con số duy nhất theo chương là giá thành trung bình, tức tổng chia số chương đã xong.',
  /**
   * Vì sao bề mặt này KHÔNG có một con số lớn ở giữa.
   *
   * Tổng và giá thành mỗi chương đã ở thanh transport, luôn hiện, không cuộn
   * mất. In lại chúng thật to ở đây là thêm một khu không trả lời câu hỏi nào.
   * Câu hỏi mà chỉ bề mặt này trả lời được là "tiền đi đâu" — tức phân tích theo
   * tác tử và theo model, và đó là hai bảng.
   */
  chiPhiViSaoBang:
    'Tổng chi phí và giá thành mỗi chương ở thanh dưới, luôn hiện. Bề mặt này trả lời câu khác: tiền đi vào tác tử nào và model nào.',
  /**
   * `missing_assistant_usage > 0` làm MỌI con số trên bề mặt thành sàn.
   *
   * Đây là loại tin phải hiện ra chứ không nuốt đi, cùng lý lẽ với `warnings`
   * của snapshot: người vận hành so tổng chi phí với hóa đơn của nhà cung cấp,
   * và một khoảng lệch không có lời giải sẽ bị quy cho chỗ khác.
   */
  chiPhiThieuUsage: (n: number) =>
    `${n} lượt gọi model không báo lại usage, nên mọi con số ở đây là SÀN chứ không phải số đúng. Khoảng lệch với hóa đơn nhà cung cấp có ít nhất một phần đến từ đây.`,
  chiPhiDemKhongApDung:
    'Model này không hỗ trợ đệm ngữ cảnh, nên hai cột đệm là không áp dụng — khác với đệm bật mà chưa lần nào trúng, ca đó ghi 0.',
  chiPhiDutDem: (chiTiet: string) =>
    `Chuỗi đệm bị đứt: ${chiTiet}. Đứt đệm nghĩa là tiền lượt đó trả theo giá nhập đầy đủ. Con số này chỉ đếm ở đường chạy trực tiếp, không đếm lại khi phát lại phiên, nên nó cũng là sàn.`,
  chiPhiTongChung:
    'Hàng này là tổng store tự cộng, không phải tổng các hàng trên. Hai con số có thể lệch: một lượt gọi không gắn với vai nào vẫn vào tổng chung. Giao diện không tự cộng lại để không khẳng định một nguyên nhân mà nó không biết.',

  /* ── bề mặt Cài đặt ─────────────────────────────────────────────────── */

  caiDatTepNguon: 'cấu hình phiên chạy',
  caiDatKhiNao: 'khi một phiên bắt đầu',
  /**
   * Bề mặt này chỉ đọc, và lý do KHÔNG phải "chưa kịp làm".
   *
   * Cùng một lý do của ô can thiệp: engine sở hữu quyền ghi. Nói ra ở đây vì đây
   * là bề mặt mà người vận hành sẽ thử sửa trước tiên — nó tên là Cài đặt.
   */
  /**
   * Vì sao BẢN GHI này chỉ đọc — lý do đã ĐỔI, và câu cũ giờ sai.
   *
   * Câu cũ nói "engine sở hữu quyền ghi, studio ghi vào là hai tiến trình cùng sửa một
   * chỗ". Tiền đề đó không còn: engine giờ chạy TRONG process studio, nên studio là
   * người ghi duy nhất. Nhưng kết luận vẫn đúng vì một lý do KHÁC hẳn: những gì hiện ở
   * đây là bản ghi phiên chạy đã khởi động với gì. Không sửa được quá khứ của một cuốn
   * đang chạy — muốn đổi thì đóng máy, sửa Cấu hình máy, rồi mở lại.
   */
  caiDatChiDoc:
    'Bản ghi này chỉ đọc: nó ghi lại tác phẩm được KHỞI ĐỘNG với cấu hình gì, nên nó là quá khứ chứ không phải một ô cài đặt. Muốn đổi cho lượt sau thì sửa ở Cấu hình máy rồi đóng và mở lại máy của tác phẩm này.',
  /** `RunMeta.Style` KHÁC `meta/style_rules.json`. */
  caiDatKieuVanKhac:
    'Kiểu văn chọn lúc khởi động phiên. Khác với quy tắc ở bề mặt Văn phong: quy tắc đó do Editor chưng ra từ các chương đã viết, còn đây là lựa chọn ban đầu của người vận hành.',
  caiDatCapPhepReview:
    'Ở chế độ chờ cấp phép, engine dừng trước mỗi chương mới cho tới khi được cấp phép đúng một chương. Số 0 nghĩa là chưa cấp phép chương nào — dây chuyền đang đứng chờ, không phải đang chạy.',
  caiDatCapPhepAuto:
    'Ở chế độ tự động, engine không cần cấp phép từng chương, nên trường này không mang tin gì.',
  /**
   * Ý định tạm dừng CHƯA tiêu thụ — tin sắp-xảy-ra, không phải tin đã-xảy-ra.
   *
   * Nên câu dùng thể tương lai ("sẽ dừng"). Viết ở thể quá khứ thì người vận hành
   * đọc thành "dây chuyền đã dừng rồi" và đi tìm nguyên nhân sai chỗ.
   */
  caiDatTamDung:
    'Một ý định tạm dừng đã được ký và engine chưa tiêu thụ. Nó sẽ dừng dây chuyền ở mốc ghi bên dưới, đúng một lần.',
  caiDatCanThiepConTon:
    'Ý kiến can thiệp đã ký mà engine chưa xử lý. Nó còn nằm trong store, nên nó sẽ được nạp lại nếu phiên bị ngắt và khởi động lại.',
  caiDatYeuCau:
    'Câu người vận hành dặn lúc mở sách. Arbiter dựa vào chính nó để ra phán quyết khởi động, nên đây là sự thật gốc của cả tác phẩm — không phải một ghi chú.',
  /** Nói ra điều CỐ Ý không có, để không ai đi tìm. */
  /**
   * Câu cũ ở đây nói khóa API "sẽ không được thêm vào" vì đưa khóa vào payload HTTP là
   * biến rò rỉ tiềm năng thành rò rỉ có sẵn. Nó đã bị chính việc dựng Cấu hình máy phản
   * chứng — nhưng lo ngại của nó thì đúng, nên nó được GIẢI QUYẾT chứ không bị bỏ qua:
   * khóa đi vào được, không bao giờ đi ra.
   */
  caiDatKhongCoKhoa:
    'Khóa API không nằm trong store nên không có ở bản ghi này. Nó đặt được ở Cấu hình máy, và đi MỘT CHIỀU: studio nhận khóa để ghi vào tệp cấu hình, nhưng không bao giờ trả nó về giao diện — chỗ nào cần hiện thì chỉ hiện dạng che.',

  /* ── ba mục rail khi bản engine đang chạy KHÔNG có endpoint ─────────── */

  /**
   * Ba câu này thay ba câu `chuaDung*` cũ, và chúng nói một điều KHÁC.
   *
   * Câu cũ đúng vào lúc nó được viết: bề mặt chưa dựng vì API chưa có endpoint.
   * Giờ cả ba bề mặt đã dựng và cả ba endpoint đã có, nên chỗ tắc duy nhất còn lại
   * là BẢN ENGINE ĐANG CHẠY cũ hơn bản web — route trả 404. Giữ câu cũ ở đây sẽ
   * dạy người vận hành đi chờ tầng web, tức đúng lớp sai mà `MucChuaDung` tồn tại
   * để tránh, chỉ là lệch sang hướng khác.
   *
   * Nên mỗi câu nói cùng ba việc: bề mặt ĐÃ dựng, chỗ tắc nằm ở binary engine, và
   * việc phải làm là cập nhật engine — không phải chờ ai làm giao diện.
   */
  thieuEndpointVanPhong:
    'Bề mặt đã dựng, nhưng bản engine đang chạy không có endpoint /style (trả 404). Dữ liệu vẫn nằm trong store ở meta/style_rules.json và meta/user_rules.json — cần bản engine mới hơn để đọc ra.',
  thieuEndpointChiPhi:
    'Bề mặt đã dựng, nhưng bản engine đang chạy không có endpoint /cost (trả 404). Phân tích theo tác tử và theo model vẫn nằm trong meta/usage.json; tổng và giá thành mỗi chương thì thanh dưới vẫn đọc được.',
  thieuEndpointCaiDat:
    'Bề mặt đã dựng, nhưng bản engine đang chạy không có endpoint /settings (trả 404). Cấu hình phiên vẫn nằm trong meta/run.json — cần bản engine mới hơn để đọc ra.',

  /**
   * Chú giải cho mục VẪN BẤM ĐƯỢC mà biết trước là rỗng.
   *
   * Phải nói rõ "vào được", vì nhãn đi kèm nó ("chưa có số liệu") một mình rất dễ
   * bị đọc thành "đừng bấm". Vào được là điểm chính: bề mặt biết nó rỗng vì sao và
   * nói ra ba ca khác nhau, còn rail thì không phân biệt được ba ca đó.
   */
  coRouteChuaCoNguon:
    'Endpoint có, nhưng store chưa có dữ liệu cho bề mặt này. Vẫn vào được — bề mặt nói rõ rỗng vì chưa chạy tới đó, vì tệp có mà rỗng, hay vì số liệu thuộc bản cũ.',
} as const;
