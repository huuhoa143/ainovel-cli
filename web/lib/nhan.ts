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
import type { TinhTrangKetNoi } from './useStudio';
import type {
  Activity,
  BlockState,
  MarkState,
  Runtime,
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

/**
 * `running` ở đây là "đang mở", KHÔNG phải "đang chạy" — và khoảng cách giữa hai chữ đó là
 * cả một lỗi ĐO ĐƯỢC.
 *
 * Khối trên trục là một CON TRỎ: nó trả lời "công trình đang ở tập nào, cung nào". Nguồn là
 * `timeline.volumes[].status` trong store, và store vẫn giữ `running` sau khi engine đã tắt
 * — nên chữ "đang chạy" ở đây là một khẳng định về MÁY mà nguồn của nó không bảo đảm nổi.
 *
 * ĐO ĐƯỢC 2026-08-02: trục ghi "T1 · đang chạy" và "C1 · đang chạy" trong khi hero ngay trên
 * nó ghi "Máy đang nghỉ" và `runtime` thật là `paused`. Ba câu, một màn hình, cùng một giây.
 */
export const TRANG_THAI_KHOI: Record<BlockState, NhanTrangThai> = {
  done: { nhan: 'xong', ky: '●', mau: 'teal' },
  running: { nhan: 'đang mở', ky: '▶', mau: 'gold' },
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

/* ── trạng thái máy ───────────────────────────────────────────────────── */

/**
 * Bảng theo `Activity` — dành cho những chỗ CHỈ có `activity`, tức slate thanh trên và
 * danh sách chọn tác phẩm, nơi mỗi dòng là một cuốn KHÁC cuốn đang mở nên không có
 * `runtime` nào để hỏi.
 *
 * Thanh transport thì KHÔNG dùng bảng này nữa — xem `TRANG_THAI_MAY_RUNTIME` ngay dưới.
 */
export const TRANG_THAI_MAY: Record<Activity, NhanTrangThai> = {
  running: { nhan: 'đang chạy', ky: '▶', mau: 'gold' },
  idle: { nhan: 'đang nghỉ', ky: '○', mau: 'muted' },
  complete: { nhan: 'đã xong', ky: '●', mau: 'teal' },
};

/**
 * Bảng theo `Runtime` — cho thanh transport, chỗ DUY NHẤT nói máy còn sống hay không.
 *
 * # Vì sao cần bảng thứ hai thay vì dùng lại bảng trên
 *
 * `Activity` có ba giá trị, `Runtime` có năm. Hai giá trị dôi ra không phải chi tiết kỹ
 * thuật — chúng là hai câu người vận hành cần đọc được:
 *
 *   `paused`  — còn một lượt DỞ đang treo. Bấm Chạy là ĐI TIẾP, không phải bắt đầu lại.
 *   `pausing` — lệnh Dừng đã nhận, engine đang thu dọn. Bấm nữa không nhanh hơn.
 *
 * Ép năm vào ba là mất cả hai câu, và ĐO ĐƯỢC là nó mất theo hướng tệ nhất: `paused` rơi
 * vào "đang chạy" (2026-08-02, xem `mayNaoDo`), tức thanh dưới khẳng định máy đang tiêu
 * tiền trong khi nó đang đứng im.
 *
 * `‖` cho cả hai trạng thái dừng, và `--amber` chứ không `--red`: chép nguyên luật đã ghi
 * ở `.dkNut.dkDung` trong globals.css — đỏ trong hệ này nghĩa là LỖI, mà dừng có chủ ý
 * không phải lỗi.
 */
/**
 * Bảng chip KẾT NỐI — bốn ca, mỗi ca đủ ba chuỗi.
 *
 * # Vì sao là một bảng chứ không tám khoá rời
 *
 * Chip cần ba chuỗi cho mỗi ca (nhãn rộng · nhãn hẹp · chú giải). Khai rời thì thêm một ca
 * mới mà quên một chuỗi là một lỗi im lặng; `Record<TinhTrangKetNoi, …>` bắt TypeScript đỏ
 * ngay. Chép mẫu của `TRANG_THAI_MAY` ở trên, cùng lý do.
 *
 * # Vì sao nhãn là "trực tiếp", không phải "đã nối"
 *
 * Người dùng hỏi thẳng: *"đã nối là gì ấy nhỉ"*. "Đã nối" nói một sự thật KỸ THUẬT — có một
 * socket đang mở — mà người vận hành không dùng được vào việc gì. Điều họ cần biết là hệ quả
 * của nó: **những con số trên màn có tự cập nhật không, hay là ảnh chụp lúc tải trang.**
 *
 * "trực tiếp" là chữ của chính sản phẩm — buồng lái đã ghi "Dòng sự kiện · trực tiếp từ
 * engine" từ trước. Dùng lại nó thì chip và buồng lái nói cùng một thứ tiếng thay vì hai.
 *
 * Ca `mat` là ca đáng giá nhất và cũng là ca dễ nói nhẹ nhất: dòng đứt nghĩa là mọi con số
 * đang hiện ĐÃ DỪNG cập nhật và có thể đã cũ. Chú giải nói thẳng điều đó, vì một người tin
 * vào một con số cũ sẽ ra quyết định sai — đúng loại lỗi mà cả hợp đồng `/studio` giữ.
 *
 * Cả bốn chú giải đều nhắc: chip này KHÔNG nói engine đang chạy hay đang nghỉ. Hai câu đó
 * hay bị gộp, và câu kia nằm ở transport.
 */
export const TRANG_THAI_KET_NOI: Record<
  TinhTrangKetNoi,
  { nhan: string; nhanNgan: string; giaiThich: string }
> = {
  song: {
    nhan: 'engine · trực tiếp',
    nhanNgan: 'trực tiếp',
    giaiThich:
      'Dòng sự kiện từ engine đang thông: các con số trên màn tự cập nhật khi engine chạy. ' +
      'Nó KHÔNG nói engine đang chạy hay đang nghỉ — câu đó ở thanh dưới cùng.',
  },
  'dang-mo': {
    nhan: 'engine · đang nối',
    nhanNgan: 'đang nối',
    giaiThich:
      'Đang mở dòng sự kiện tới engine. Cho tới khi nối xong, số trên màn là số của lúc tải trang.',
  },
  mat: {
    nhan: 'engine · mất dòng',
    nhanNgan: 'mất dòng',
    giaiThich:
      'Dòng sự kiện đã đứt: số trên màn ĐÃ DỪNG cập nhật và có thể đã cũ. Studio tự thử nối ' +
      'lại. Đây là lỗi đường truyền, không phải kết luận rằng engine đã dừng.',
  },
  khong: {
    nhan: 'engine · chưa mở dòng',
    nhanNgan: 'chưa mở',
    giaiThich:
      'Chưa mở dòng nào vì chưa có tác phẩm nào để theo dõi. Khác với "đang nối": ở đây không ' +
      'có gì đang được nối cả.',
  },
};

export const TRANG_THAI_MAY_RUNTIME: Record<Runtime, NhanTrangThai> = {
  running: { nhan: 'đang chạy', ky: '▶', mau: 'gold' },
  pausing: { nhan: 'đang dừng…', ky: '‖', mau: 'amber' },
  paused: { nhan: 'tạm dừng', ky: '‖', mau: 'amber' },
  idle: { nhan: 'đang nghỉ', ky: '○', mau: 'muted' },
  completed: { nhan: 'đã xong', ky: '●', mau: 'teal' },
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

/**
 * Năm giá trị của `domain.Phase` — và đúng năm cái đó.
 *
 * Bản trước khai `foundation`, `planning`, `reviewing`: ba mã KHÔNG tồn tại trong engine
 * (`internal/domain/runtime.go:13-17` chỉ có init / premise / outline / writing / complete).
 * Ba dòng đó không bao giờ khớp, nên chúng vô hại — nhưng cái giá thật là chỗ chúng che:
 * `premise` và `outline` VẮNG khỏi bảng, và `nhanPhase` trả nguyên mã khi tra không thấy.
 *
 * Hệ quả đo được: một cuốn đang dựng nền hiện "premise" trần trên đầu bề mặt và trong dải
 * việc tiếp theo — chữ tiếng Anh, giữa một bề mặt tiếng Việt, đúng ở giai đoạn người dùng
 * mới tạo truyện và đang chờ chương đầu. Tức lỗi này chỉ lộ ra ở người dùng LẦN ĐẦU.
 *
 * Hai mã đầu dịch theo VIỆC đang làm, không theo tên trường: người đọc cần biết máy đang
 * làm gì, và "tiền đề" là thuật ngữ nội bộ của engine.
 */
const PHASE: Record<string, string> = {
  init: 'khởi tạo',
  premise: 'dựng nền',
  outline: 'dựng dàn ý',
  writing: 'đang viết',
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
 * Nhãn tiếng Việt của một KÊNH MODEL.
 *
 * Một bảng, ba nơi dùng: dải kênh vai ở Cấu hình máy, dải kênh ở Phiên chạy, và dòng "đang
 * dùng bởi" trên thẻ nhà cung cấp. Ba bản chép sẽ trôi khỏi nhau, và lúc đó cùng một vai mang
 * hai cái tên trên cùng một màn hình.
 *
 * KHÁC `nhanVai` ở trên: cái đó là tên hiển thị của một TÁC TỬ trong dòng sự kiện và bảng tổ
 * sản xuất (`Architect`, `Writer` — giữ nguyên tiếng Anh vì engine phát ra đúng chuỗi đó).
 * Cái này là nhãn của một ô chọn model, và nó có thêm `default` — thứ không phải tác tử nào.
 */
export function nhanKenhVai(vai: string): string {
  switch (vai) {
    case 'default':
      return CHU.vaiMacDinh;
    case 'architect':
      return CHU.vaiArchitect;
    case 'writer':
      return CHU.vaiWriter;
    case 'editor':
      return CHU.vaiEditor;
    default:
      return vai;
  }
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
  /**
   * "N tác phẩm · M cuốn có việc" — cố ý KHÔNG dùng chữ "đang chạy".
   *
   * Slate đếm theo `book.activity` của TỪNG cuốn, tức "có dấu vết sản xuất gần đây" suy từ
   * mốc checkpoint. Với cuốn đang mở, con số đó mâu thuẫn được với thanh dưới — ĐO ĐƯỢC
   * 2026-08-02: slate ghi "1 đang chạy" trong khi `runtime` của chính cuốn ấy là `paused`.
   * Hai bên đọc hai trường khác nhau nên chúng LỆCH được, và đó là đúng: chúng nói hai
   * chuyện. Dùng chung một bộ từ mới là chỗ sai.
   *
   * Bỏ hẳn vế sau khi không có cuốn nào: "0 cuốn có việc" là một câu thừa chiếm chỗ trên
   * một thanh đã chật (ĐO ĐƯỢC ở 390px: thanh trên chỉ còn 12px dư).
   */
  demTacPham: (tong: number, coViec: number) =>
    coViec > 0 ? `${tong} tác phẩm · ${coViec} cuốn có việc` : `${tong} tác phẩm`,

  /* ── chip kết nối (góc trên phải) ──────────────────────────────────────────
   *
   * Bốn trạng thái, và cả bốn phải cùng một DẠNG CÂU. Bản trước là
   * `dòng sự kiện · đang mở dòng · mất kết nối · chưa mở dòng`: ba cái sau là câu trạng
   * thái, cái đầu là một danh từ — mà đó lại là trạng thái khoẻ, tức trạng thái người dùng
   * thấy 99% thời gian. Người dùng nói nguyên văn: "có chữ Dòng sự kiện ở trên không biết
   * như thế nào". Đúng vậy: ở trạng thái tốt nhất, chip là chỗ duy nhất không nói trạng
   * thái gì — nó đọc thành một cái nhãn, hoặc một cái nút.
   *
   * Và cả bốn nói về TRÌNH DUYỆT (kênh SSE có nối được không), không về engine. Nên không
   * câu nào được mượn chữ của trạng thái máy — xem `TRANG_THAI_MAY_RUNTIME`. Phạm vi ấy đi
   * vào chú giải, vì bản thân chữ "đã nối" không tự nói ra nối cái gì. */

  // rail
  xuong: 'Xưởng',
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

  /* ── ba MÀN ────────────────────────────────────────────────────────────────
   *
   * Ba tên này là chữ của chính người dùng, gần như nguyên văn: "lúc đầu vào là trang quản
   * lý", "bấm vào chi tiết mới tới xưởng sản xuất", "cài đặt chung cho mọi sản xuất". Dùng
   * đúng chữ họ đã dùng để gọi thứ họ đang tìm là cách rẻ nhất để họ tìm thấy nó.
   *
   * "Cài đặt chung" mang chữ "chung" chứ không chỉ "Cài đặt", và đó là phần mang nghĩa: cả
   * lỗi mà màn này tồn tại để xoá là người vận hành đọc một bề mặt toàn cục thành "cấu hình
   * của cuốn đang mở".
   */
  manQuanLy: 'Quản lý',
  manCaiDatChung: 'Cài đặt chung',
  manXuongSanXuat: 'Xưởng sản xuất',
  manQuanLyPhu: 'cả xưởng',
  manCaiDatChungPhu: 'mọi tác phẩm',
  manXuongSanXuatPhu: 'một tác phẩm',
  /** Chú giải của bộ chuyển màn — nói PHẠM VI, thứ không đọc được từ tên màn. */
  doiMan: (ten: string, pham: string) => `Sang màn ${ten} — ${pham}`,


  /* Bản ghi phiên chạy của MỘT cuốn — tên cũ là "Cài đặt", và tên cũ sai.
     Xem chú thích đổi tên ở đầu lib/khu.ts: bề mặt này chỉ đọc, nói về quá khứ của một
     cuốn, và đã phải tự in ra một câu chỉ đường sang Cấu hình máy. */
  phienChayKhu: 'Phiên chạy',

  /* cấu hình máy — mức MÁY, không phải mức tác phẩm */
  /**
   * Tên bề mặt, KHÔNG còn là 'Nhà cung cấp & khóa'.
   *
   * Từ bản gộp, màn này giữ ba khối: nhà cung cấp & khóa, model theo vai, và các mặc định
   * khác. Giữ tên cũ là để tiêu đề chỉ nói về khối ĐẦU TIÊN — người dùng đọc H1 rồi thấy hai
   * khối họ không được báo trước, và mục rail cũng hứa hụt như vậy.
   */
  cauHinh: 'Cấu hình máy',
  kenhVaiChung: 'Model theo vai',
  /** Những mặc định KHÔNG thuộc về vai nào — sau khi model đã dọn hết sang dải kênh vai. */
  macDinhKhac: 'Mặc định khác',
  doiOCauHinh: 'Đổi ở Cấu hình máy',
  chuyenCaDay: 'Chuyển cả dây chuyền',
  doiMacDinh: 'Đổi mặc định',
  chiDoiMacDinh: 'Chỉ đổi mặc định',
  capNhatModel: 'Cập nhật model',
  dangChuyen: 'Đang chuyển…',
  // `vai: 'Vai'` đã có sẵn ở khối nhân vật và mang đúng nghĩa cần ở đây — khai lại là hai
  // chuỗi cho một nhãn, và `tsc` bắt ngay vì object literal không cho trùng khóa.
  dangDung: 'Đang dùng',
  seThanh: 'Sẽ thành',
  phaiChonLai: '· chọn lại',
  modelMoiCua: (vai: string) => `Model mới của ${vai}`,
  seVietBang: 'Sẽ viết bằng',
  /** Nhãn dòng "vai nào đang dùng nhà cung cấp này" trên thẻ nhà cung cấp. */
  dungBoi: 'Đang dùng bởi',
  khongVaiNaoDung: 'chưa vai nào dùng',
  /* "Gỡ" chứ không "Xóa": không có gì bị mất, vai chỉ quay về thừa hưởng mặc định. */
  goDatRieng: 'Gỡ, dùng mặc định',
  chiPhiXuong: 'Chi phí toàn xưởng',
  cacheTietKiem: 'bộ đệm tiết kiệm',
  cuonDaDo: 'cuốn đã đo được',
  boTheoVai: 'Bổ theo vai',
  boTheoModel: 'Bổ theo model',
  nhaCungCapVaKhoa: 'Nhà cung cấp và khóa',
  macDinh: 'Mặc định',
  kieuVanMacDinh: 'Kiểu văn mặc định',
  doSuyLuan: 'Độ suy luận',
  themNhaCungCap: 'Thêm nhà cung cấp',
  ten: 'Tên',
  loaiGiaoThuc: 'Giao thức',
  diaChiGoc: 'Địa chỉ gốc',
  khoaApi: 'Khóa API',
  /**
   * Nhãn của `providers[].models` — DANH MỤC, không phải lựa chọn đang có hiệu lực.
   *
   * Chuỗi cũ là 'Model' (số ít), và nó nói dối đúng kiểu "khóa còn dùng được": người dùng đọc
   * "Model: cx/gpt-5.6-luna" trên thẻ thành "nhà cung cấp này ĐANG dùng model này", sửa nó,
   * rồi hỏi vì sao bốn vai không đổi theo. Sự thật là trường này chỉ nạp gợi ý vào ô chọn;
   * model có hiệu lực nằm ở dải kênh vai bên dưới.
   */
  danhSachModel: 'Danh sách model',
  /** Nhãn hành động khi các vai đang trỏ vào model mà nhà cung cấp của chúng không khai. */
  suaCaBonVai: (ncc: string) => `Sửa các vai theo ${ncc}`,
  ghiLaiCuaSo: 'Ghi lại cửa sổ',
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
  /**
   * Tiêu đề dải kênh trong Phiên chạy.
   *
   * KHÔNG còn trùng tên với dải ở Cấu hình máy ("Model theo vai"), và đó là sửa một chỗ nói
   * dối: hai dải cùng tên nhưng một cái ăn NGAY vào engine đang chạy, cái kia chỉ ăn từ lượt
   * mở sau. Trên chính màn này, khối ngay trên lại in model LÚC KHỞI ĐỘNG — cũng nhãn "Model".
   * Ba thứ khác nghĩa mang hai cái tên.
   */
  kenhVai: 'Đang chạy với',
  /** Khối đọc từ `run.json` — giá trị LÚC KHỞI ĐỘNG, không phải giá trị đang có hiệu lực. */
  khoiDongVoi: 'Khởi động với',
  /**
   * Tiêu đề của chính khối đó khi engine ĐÓNG.
   *
   * "Đang chạy với" trên một máy đã đóng là một khẳng định không đo được — cùng lớp lỗi mà
   * `DieuKhien` đã tránh khi từ chối in "Tự chạy liên tục" lúc `advance === null`. Nói đúng
   * trạng thái, và nút ngay dưới ("Mở máy") khớp với nó.
   */
  mayDangDong: 'Máy đang đóng',
  vaiMacDinh: 'Mặc định',
  vaiArchitect: 'Kiến trúc',
  vaiWriter: 'Chấp bút',
  vaiEditor: 'Biên tập',
  thuaHuong: 'thừa hưởng mặc định',
  datRieng: 'đặt riêng',
  caiLanDau: 'Cài đặt lần đầu',
  batDauDung: 'Bắt đầu dùng',
  /* "(không chạy)" nằm trong NHÃN, không chỉ trong chú giải.
     Nút này giờ đứng cạnh nút Chạy, và điều duy nhất phân biệt chúng — cái này không gọi
     model, không tiêu tiền — là điều người dùng phải biết TRƯỚC khi bấm. Một chú giải chỉ
     hiện khi trỏ chuột thì trên cảm ứng nó không tồn tại. */
  moMay: 'Mở máy (không chạy)',
  viDuCanThiep: 'ví dụ: Lâm Thanh nên do dự lâu hơn trước khi rút kiếm',
  dangGui: 'Đang gửi…',
  tiemVaoLuotDangChay: 'Tiêm vào lượt đang chạy',
  danhThucLuotMoi: 'Đánh thức lượt mới',
  chay: 'Chạy',
  /**
   * Nhãn riêng cho ca `runtime === 'paused'`, tức còn một lượt DỞ đang treo.
   *
   * Không dùng chung với `chay`: "Chạy" đọc ra là bắt đầu một lượt mới, còn thực tế engine
   * sẽ đi tiếp từ chỗ đang dở. Trên một nút tiêu tiền, khoảng cách giữa hai câu đó là
   * khoảng cách người vận hành cần biết trước khi bấm.
   */
  chayTiep: 'Chạy tiếp',
  dung: 'Dừng',
  choDiTiep: 'Cho đi tiếp 1 chương',
  cheDoNghiemThu: 'Nghiệm thu từng chương',
  cheDoDiTiep: 'Chế độ đi tiếp',
  cheDoTuChay: 'Tự chạy',
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

  /* ── tên nhóm rail: nói RA CÁI BÊN TRONG, không phải bộ phận của nhà máy ──
   *
   * Bốn tên cũ — "Sản xuất / Hồ sơ tác phẩm / Xưởng / Máy" — mô tả cách hệ thống được
   * dựng, không mô tả cái nằm trong nhóm. Người dùng nói thẳng: "các section sản xuất, hồ
   * sơ tác phẩm… là gì, quá ngợp". Bốn danh từ trừu tượng cạnh nhau không cho biết mục nào
   * chứa gì, nên 16 mục thành 16 cánh cửa không cái nào được ưu tiên.
   *
   * Tên nhóm cuối dài hẳn ra là có chủ ý. `laKhuMucMay` (lib/khu.ts) tồn tại vì ba khu đó
   * ở mức MÁY chứ không mức tác phẩm — sửa Cấu hình máy là sửa cho MỌI cuốn — và cái nhầm
   * mà nó đề phòng là người dùng đọc chúng thành "cấu hình của cuốn đang mở". Một chữ
   * "Máy" không ngăn được cái nhầm đó; "Chung cho mọi tác phẩm" thì nói thẳng ra.
   */
  nhomTruyen: 'Truyện của bạn',
  nhomTheGioi: 'Thế giới truyện',
  nhomVanHanh: 'Chi phí & vận hành',
  moNhom: (ten: string) => `Mở nhóm ${ten}`,
  dongNhom: (ten: string) => `Thu nhóm ${ten}`,

  /* ── dải "việc tiếp theo" trên bề mặt mặc định ─────────────────────────────
   *
   * Câu trạng thái là HÀM chứ không phải chuỗi: mỗi câu phải mang số thật của cuốn đang
   * mở. Một câu chung ("Đang chạy") đúng ở mọi lúc nên không nói gì ở lúc nào.
   */
  /*
   * Tên vùng của dải là một nhãn ĐỨNG YÊN, không phải câu trạng thái.
   *
   * Bản đầu đặt `aria-label` bằng chính câu trạng thái, và cây trợ năng cho thấy hệ quả:
   * trình đọc đọc tên vùng rồi đọc lại y nguyên câu đó ở nội dung. Tên vùng để ĐIỀU HƯỚNG
   * tới, nên nó phải giữ nguyên khi trạng thái đổi.
   */
  vttVung: 'Việc tiếp theo',

  /* ── luồng tạo tác phẩm: nói ra ba bước TRƯỚC khi bấm ─────────────────────
   *
   * Người dùng: "thật sự không biết luồng chạy như nào… tôi bấm bắt đầu viết xong chả biết
   * làm gì nữa luôn". Ba bước này là chính cái mà TUI gốc không cần nói vì nó CHO THẤY:
   * cột trái của TUI liệt kê vai đang chạy, cột giữa chảy sự kiện. Web thì bấm xong là
   * đứng lại ở một biểu mẫu, nên nó phải nói bằng chữ.
   */
  sauKhiBamGi: 'Bấm xong thì máy làm gì',
  buocArbiter: ' đọc câu yêu cầu, chọn số chương và mức quy hoạch — khoảng 10–20 giây.',
  buocArchitect: ' dựng nền: nhân vật, luật thế giới, dàn ý — thường một hai phút.',
  buocWriter: ' viết chương 1, rồi tự đi tiếp từng chương cho tới khi xong hoặc bạn dừng.',
  arbiterDangDoc: 'Arbiter đang đọc câu yêu cầu…',
  /* `đang chạy` dùng ở CẢ transport và dải việc tiếp theo. Một khóa cho cả hai chỗ vì hai
     chỗ đó nói về cùng một công đoạn của cùng một engine: để mỗi nơi một chuỗi viết cứng là
     mời chúng trôi lệch nhau, và lúc đó không có cách nào biết chỗ nào đúng. */
  buocDangChayNgan: 'đang chạy',
  xemDongSuKien: 'Xem dòng sự kiện',
  ttDangDungNen: 'Máy đang dựng nền tác phẩm',
  ttDangViet: (xong: number, tong: number) =>
    tong > 0
      ? `Máy đang viết · ${xong}/${tong} chương đã chốt`
      : `Máy đang viết · ${xong} chương đã chốt`,
  /**
   * Dải "việc tiếp theo" KHÔNG khai lại trạng thái máy — nó nói TIẾN ĐỘ.
   *
   * Bản trước mở đầu bằng "Máy đang nghỉ", và ĐO ĐƯỢC 2026-08-02 nó sai theo hai lớp cùng
   * lúc: `runtime` thật là `paused` (tức "tạm dừng", còn một lượt treo — khác hẳn "nghỉ"),
   * và thanh dưới cách đó 750px lại đang nói một câu khác về cùng cỗ máy.
   *
   * Dải này không đọc `runtime` và không nên giả vờ đọc. Nó biết một điều mà thanh dưới
   * không biết — đã chốt bao nhiêu chương và việc kế là gì — nên đó là điều nó nói. Câu
   * trạng thái có đúng MỘT chỗ giữ: thanh dưới cùng.
   */
  ttNghi: (xong: number, tong: number) =>
    tong > 0 ? `${xong}/${tong} chương đã chốt` : `${xong} chương đã chốt`,
  ttXong: (chuong: number, tu: string) => `Truyện đã viết xong · ${chuong} chương · ${tu} từ`,
  ttChuaCoChuong: 'Chưa có chương nào',
  docTuChuongDau: 'Đọc từ chương 1',
  docChuongMoiNhat: 'Đọc chương mới nhất',
  xemChoVietLai: (n: number) => `${n} chương chờ viết lại`,
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

  /* ── số đếm ở đầu bốn ô của bàn buồng lái ──────────────────────────────────
   *
   * Mỗi ô của bàn cao vài trăm pixel và chứa nhiều hơn thế, nên đầu ô phải mang MẪU SỐ của
   * thứ đang cuộn bên dưới — cùng luật đã ghi cho dải tổng của màn Quản lý ("một con số
   * không kèm mẫu số sẽ được đọc thành cả xưởng tốn có thế").
   *
   * Mang ĐƠN VỊ chứ không chỉ con số: bốn ô đứng cạnh nhau, và bốn số trần ở bốn góc đọc
   * thành một bảng điểm. "49 chương" và "3 phán quyết" thì không lẫn được.
   */
  soDongSuKien: (n: number) => `${n} dòng`,
  soChuongTrongBang: (n: number) => `${n} chương`,
  soPhanQuyet: (n: number) => `${n} phán quyết`,

  /* Hai thanh chia kéo được của bàn. Nhãn nói CÁI NÓ CHIA, không nói "kéo để đổi cỡ": trình
     đọc màn hình đã đọc ra vai trò `separator` rồi, nên nhắc lại động từ là nói hai lần. */
  keoCot: 'Chia cột trái và cột phải',
  keoHang: 'Chia hàng trên và hàng dưới',
  keoTruc: 'Chia trục sản xuất và bàn',

  /* ── khu văn sống của buồng lái ────────────────────────────────────────────
   *
   * Tiêu đề khu ĐỔI theo trạng thái máy, nhưng tên VÙNG thì không — và hai thứ đó là hai
   * khóa khác nhau ở đây vì đúng lý do đã ghi ở `vttVung`: tên vùng để trình đọc màn hình
   * điều hướng TỚI, nên đặt nó bằng câu trạng thái thì cây trợ năng đọc tên vùng rồi đọc
   * lại y nguyên câu đó ở nội dung, và tên vùng còn thành sai khi máy chuyển sang nghỉ.
   */
  vanSongVung: 'Văn sống',
  mayDangNoi: 'Máy đang nói',
  /**
   * Khu văn sống nói về BỘ ĐỆM của phiên xem này, không nói về máy.
   *
   * Bản trước ghi "Máy đang nghỉ" — một câu về liveness, đặt ngay dưới một hero cũng ghi
   * "Máy đang nghỉ", tức cùng một câu hai lần cách nhau 200px. Và khu này không đo được
   * liveness: nó chỉ biết bộ đệm phía trình duyệt có giữ được lượt nào không. Một bề mặt
   * khẳng định điều nó không đo được là một bề mặt sẽ nói sai, và ĐO ĐƯỢC là nó đã nói sai
   * (2026-08-02: câu này hiện trong khi thanh dưới ghi ngược lại).
   */
  mayNghi: 'Chưa có văn nào trong phiên này',
  /**
   * Máy nghỉ nhưng bộ đệm CÒN chữ — ca thứ ba, và nó ra đời vì một bài kiểm cũ bắt được.
   *
   * Bản sửa đầu của tôi để mọi ca "nghỉ" dùng chung câu "Chưa có văn nào trong phiên này",
   * và `VanSong.test.tsx` đỏ ngay: nó dựng đúng ca bộ đệm còn giữ báo cáo của lượt vừa xong.
   * Một tiêu đề "chưa có văn nào" đứng ngay trên đống chữ nó vừa phủ nhận là đổi một câu sai
   * lấy một câu sai khác.
   */
  vanLuotGanNhat: 'Văn của lượt gần nhất',
  /* Chữ thường: đây là nút hành động nhỏ nổi trong khu chữ, không phải nhãn của một vùng. */
  veCuoi: 'về cuối',

  /* ── dải trạng thái của buồng lái ──────────────────────────────────────────
   *
   * `daiTrangThaiVung` là tên VÙNG, đứng yên — cùng lý do đã ghi ở `vttVung` và
   * `vanSongVung`: tên vùng là thứ trình đọc màn hình điều hướng tới, nên nó không được đổi
   * theo trạng thái máy.
   *
   * Hai nhãn của dải này DÙNG LẠI khóa đã có ở dưới thay vì khai mới, vì cùng chủ ngữ:
   *   - `vaiDangChay` (khối "tổ sản xuất") — một VAI đang chạy;
   *   - `nguCanh` (khối transport) — cùng cửa sổ ngữ cảnh, cùng con số.
   * Bản đầu của khối này khai lại cả hai, và thứ bắt được là `tsc` chứ KHÔNG phải bộ kiểm:
   * khai trùng khóa trong một object literal là JavaScript hợp lệ (bản sau thắng), nên
   * `npm test` xanh suốt trong khi hai nhãn cùng tên sống song song.
   *
   * `vaiDangChay` cũng không dùng lại `buocDangChayNgan` dù hai chuỗi giống hệt nhau lúc
   * này: khóa kia nói về một CÔNG ĐOẠN của engine, ở đây chủ ngữ là VAI. Ngày ai đó đổi nhãn
   * công đoạn thành "đang xử lý", nhãn của nhóm vai không được đi theo.
   */
  daiTrangThaiVung: 'Trạng thái máy',
  vaiCho: 'chờ',
  vieccTon: 'việc tồn',
  /* TUI gốc viết `writer turn 7`. Đây là lượt của VAI trong chu kỳ hiện tại, không phải lượt
     nói của khu văn sống — hai thứ trùng từ nhưng khác chủ ngữ, nên có chú giải đi kèm. */
  luotVai: (n: number) => `lượt ${n}`,
  lyDoVietLai: 'Lý do viết lại',
  /* Chữ thường: nó đứng SAU dấu hai chấm của nhãn trường, không mở đầu một câu. */
  khongDoDuoc: 'không đo được',

  /* ── cửa nghiệm thu ────────────────────────────────────────────────────────
   *
   * `cuaNghiemThuVung` là tên VÙNG, đứng yên — cùng luật đã ghi ở `vttVung`,
   * `vanSongVung`, `daiTrangThaiVung` và `cotPhaiVung`. Ở đây nó còn nặng hơn một chút:
   * CÙNG một component vẽ ra ở HAI bề mặt (dải trên buồng lái và bề mặt Kiểm định), nên
   * tên vùng cũng là thứ duy nhất nói cho trình đọc màn hình biết hai chỗ đó là một việc.
   *
   * `choDiTiep` KHÔNG khai lại ở đây: nút này gọi đúng route mà nút cùng tên ở transport
   * gọi (`POST /advance`), nên hai chỗ phải nói cùng một câu. Khai lại là mở đường cho
   * chúng trôi lệch — và thứ bắt được sẽ là `tsc` chứ không phải bộ kiểm, vì khai trùng
   * khóa trong một object literal là JavaScript hợp lệ (bản sau thắng).
   *
   * Hai hàm nhận `n?: number` chứ không nhận `number`, và đó là hợp đồng chứ không phải
   * phòng thủ: `TienDo.PermitChapter` khai `omitempty` (internal/serve/model.go:243) nên
   * số 0 — "chưa cấp phép chương nào", đúng ca mà chế độ nghiệm thu tồn tại để tạo ra —
   * rụng khỏi JSON và tới web thành vắng mặt. Nhãn phải đọc được ở ca đó.
   */
  cuaNghiemThuVung: 'Cửa nghiệm thu',
  dangChoNghiemThu: (n?: number) =>
    n === undefined ? 'Đang chờ bạn nghiệm thu' : `Đang chờ bạn nghiệm thu chương ${n}`,
  ketLuanEditor: 'Kết luận của Editor',
  traChuongVeVietLai: (n?: number) =>
    n === undefined ? 'Trả chương đang chờ về viết lại' : `Trả chương ${n} về viết lại`,
  /* Huy hiệu ở thanh trên. Dấu `·` chứ không phải dấu gạch: nó là cùng một dấu nối mà
     `demTacPham` và các nhãn trạng thái khác của thanh trên đang dùng.

     Bản NGẮN cho dưới 700px, và nó là một phép đo chứ một sở thích. ĐO ĐƯỢC ở 390px: thanh
     trên còn 330px dùng được (390 trừ đệm 24 và ba khe 36), trong đó bộ chọn tác phẩm đòi
     76px, nút `+` 27px và huy hiệu kết nối 104px — còn đúng **123px** cho huy hiệu này. Bản
     đầy đủ cần 194px, và hệ quả đo được là bộ chọn tác phẩm bị nén còn **5px**: tên cuốn
     đang mở biến mất khỏi màn hình. Đúng cái hỏng mà chú thích của `.slate` đã ghi một lần
     ("bị nén về bề rộng 0 mà các đốm bên trong vẫn vẽ ra ngoài").

     Giữ vế "chờ bạn" chứ vế "nghiệm thu": vế thứ hai nói CHỦ ĐỀ, còn vế thứ nhất nói cái
     phải làm — và huy hiệu này tồn tại để nói điều thứ hai đó. Tên đầy đủ vẫn nằm ở
     `aria-label` và `title`, nên phần mất là hình chứ không phải nghĩa — chép nguyên cách
     `.nutMoi` đã xử khi nó rút về một dấu `+`. */
  nghiemThuChoBan: 'Nghiệm thu · đang chờ bạn',
  nghiemThuChoBanNgan: 'Chờ bạn',

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

  /* ── inspector ─────────────────────────────────────────────────────────────
   *
   * `cotPhaiVung` là tên VÙNG, và nó đứng yên qua CẢ HAI chế độ của cột phải —
   * cùng luật đã ghi ở `vttVung`, `vanSongVung`, `daiTrangThaiVung`.
   * Trước khi cột này có hai chế độ, tên vùng viết thẳng trong component là
   * "Chi tiết chương". Câu đó thành SAI ở chế độ ngữ cảnh truyện: trình đọc màn
   * hình điều hướng tới một vùng tên "Chi tiết chương" rồi gặp tiền đề và danh
   * sách nhân vật. Tên vùng phải nói cột này LÀ GÌ, không nói nó đang hiện gì.
   */
  cotPhaiVung: 'Ngữ cảnh và chi tiết',
  nguCanhTruyen: 'Ngữ cảnh truyện',
  /* Chữ thường: nút đường lui nhỏ trong đầu panel, không phải nhãn một vùng —
     cùng lý do đã ghi ở `veCuoi`. Mũi tên `←` là trang trí và nằm ngoài chuỗi
     này: chữ đã nói đủ, nên trình đọc màn hình không cần đọc "mũi tên trái". */
  veDanhSachChuong: 'danh sách chương',
  /* Nhãn cho một vạch chương trong dải `●▶○`: số hiệu VÀ công đoạn, vì một dải
     chỉ có ký hiệu là một dải chỉ đọc được bằng mắt đã quen. */
  chuongVaCongDoan: (n: number, congDoan: string) => `Chương ${n} · ${congDoan}`,
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
  napModel: 'Nạp danh sách model',
  dangNapModel: 'Đang hỏi nhà cung cấp…',
  /**
   * Nhãn trên THẺ nhà cung cấp — cùng một lượt gọi với `napModel`, khác tên vì khác câu hỏi.
   *
   * Ở khối Mặc định, người dùng hỏi "cho tôi tên model để chọn". Ở thẻ nhà cung cấp, người
   * dùng vừa gõ xong địa chỉ gốc với khóa và hỏi "cái này có sống không". Cùng một câu trả
   * lời phục vụ cả hai, nhưng gọi nó là "Nạp danh sách model" ở đây thì không ai bấm —
   * không ai đang tìm danh sách model.
   */
  kiemTraNcc: 'Kiểm tra',
  dangKiemTraNcc: 'Đang kiểm tra…',
  xoaTacPham: 'Xóa',
  /** Tiêu đề hộp xác nhận. Câu hỏi ở đây, phần MẤT GÌ ở thân — không lặp lại nhau. */
  xacNhanXoaDe: (ten: string) => `Xóa "${ten}"?`,
  dangXoa: 'Đang xóa…',
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

  /* ── màn Xưởng ─────────────────────────────────────────────────────────
   *
   * Nhãn dải tổng viết THƯỜNG và đứng SAU con số: chúng là đơn vị của một con số, không phải
   * tiêu đề của một ô. "12 tác phẩm · 47 chương đã chốt" đọc thành một câu; "Tác phẩm 12"
   * thì phải dừng lại một nhịp để biết 12 là gì.
   */
  donViTacPham: 'tác phẩm',
  donViChuongDaChot: 'chương đã chốt',
  donViTu: 'từ',
  donViDaTieu: 'đã tiêu',
  /** Dùng ở CẢ dải tổng ("3 engine đang mở") lẫn huy hiệu trên dòng. Một câu, một khóa. */
  engineDangMo: 'engine đang mở',

  colTacPham: 'Tác phẩm',
  colGiaiDoan: 'Giai đoạn',
  colTienDo: 'Tiến độ',
  colNhip: 'Nhịp',
  colSuaLanCuoi: 'Sửa lần cuối',
  colHanhDong: 'Hành động',
  /** Cột mới của màn Quản lý: dấu việc tồn đã ký trên đĩa, xem `WorkshopCostBook`. */
  colCanBan: 'Cần bạn',

  docTacPham: 'Đọc',
  /* Chữ của chính người dùng: "bấm vào chi tiết mới tới xưởng sản xuất". Nhãn cũ là "Mở",
     và "Mở" mơ hồ đúng chỗ đắt nhất — studio còn có `Mở máy`, một nút KHỞI ĐỘNG ENGINE.
     Hai nút cùng chữ "Mở" mà một cái điều hướng còn một cái dựng engine là chỗ để bấm nhầm. */
  chiTiet: 'Chi tiết',
  batDauCuonMoi: 'Bắt đầu một cuốn mới',

  /* ── dải việc cần bạn, đầu màn Quản lý ───────────────────────────────────
   *
   * Dải này KHÔNG mang dữ liệu mới — mọi thứ trong nó đã có ở bảng ngay dưới. Nó mang THỨ
   * TỰ ƯU TIÊN, đúng luật đã ghi cho dải việc-tiếp-theo ở buồng lái (DESIGN.md › Components).
   *
   * Và nó chỉ nói được điều nó CHỨNG MINH được. `/api/workshop` mang `activity` và
   * `engine_open`; `/api/workshop/cost` mang ý định đã ký trong `meta/run.json`. Không tờ
   * nào nói được "engine đang đứng ở cửa nghiệm thu" cho một cuốn đã đóng máy — câu đó chỉ
   * tồn tại trong `/studio` của cuốn đang mở. Nên hai loại tin ở đây mang HAI câu khác nhau,
   * và không câu nào được mượn giọng của câu kia.
   */
  canBanTieuDe: 'Cần bạn',
  mayDangChay: (ten: string) => `Máy đang chạy ${ten}`,
  mayDangRoi: 'Máy đang rỗi',
  engineConMoO: (ten: string) => `engine còn mở ở ${ten}`,
  /** Ý định trên ĐĨA. Cố tình không nói "đang chờ bạn" — xem chú thích ngay trên. */
  daKyTamDung: 'có một mốc tạm dừng đã ký',
  /* Bản NGẮN cho ô bảng 12%: câu đầy đủ ngắt bốn dòng ở đó và đẩy cao cả hàng. */
  daKyTamDungNgan: 'mốc tạm dừng',
  daKyCanThiep: 'có một ý kiến can thiệp chưa xử lý',
  daKyCanThiepNgan: 'ý kiến chờ xử lý',
  cheDoNghiemThuBat: 'đang ở chế độ nghiệm thu từng chương',
  khongCoViecTon: 'Không có việc nào đang chờ bạn',
  vaoXuong: (ten: string) => `Vào xưởng · ${ten}`,

  /* ── dải tổng: nói ra MẪU SỐ của con số tiền ────────────────────────────
   *
   * `$7,37` trên một xưởng ba cuốn nói hai điều rất khác nhau tuỳ vào việc nó cộng từ ba
   * cuốn hay từ một. Đo trên xưởng thật: `counted: 1`, hai cuốn còn lại chưa có
   * `meta/usage.json`. Không nói ra thì người vận hành đọc nó thành "cả xưởng tốn có thế".
   */
  doDuocO: (dem: number, tong: number) => `đo được ở ${dem}/${tong} cuốn`,
  chuaDoDuocCuonNao: 'chưa cuốn nào có số liệu',

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
  /* ── màn Xưởng ───────────────────────────────────────────────────────────
   *
   * Ba câu đầu đều nói cùng một điều theo ba ô khác nhau: `0` là một PHÉP ĐO cho kết quả
   * không, còn ô trống là "chưa đo được". Cùng luật `null` khác `0` mà cả hợp đồng
   * `/studio` giữ (spec §6.1) — ở đây nó rơi vào `chapters_per_hour` và `cost_per_chapter`,
   * hai trường mà server trả `0` cho cuốn chưa chạy lần nào. Hiện `0 ch/giờ` là nói cuốn đó
   * CÓ chạy mà chạy chậm tới mức không viết nổi một chương trong một giờ.
   */
  xuongChuaDoDuocNhip:
    'Chưa đo được nhịp: cuốn này chưa có lượt chạy nào trong dữ liệu đã ghi. Khác với ' +
    '0 chương/giờ — con số đó nói máy có chạy mà chưa xong chương nào.',
  xuongChuaDoDuocGiaThanh:
    'Chưa đo được giá thành mỗi chương: chưa có chương nào được nghiệm thu để chia. Khác ' +
    'với $0,000 — con số đó nói đã có chương mà không tốn gì.',
  xuongChuaBietSuaLucNao:
    'Store không ghi mốc sửa cho cuốn này. Không có nguồn thì để trống, vì một ngày giờ bịa ' +
    'ra sẽ được dùng để quyết định cuốn nào đáng mở trước.',
  xuongEngineDangMo:
    'Engine của cuốn này đang mở, nên số của nó có thể đổi ngay trong lúc bạn đọc bảng. ' +
    'Mở cuốn đó ra để xem dây chuyền đang chạy tới đâu.',
  /**
   * Vì sao Xưởng KHÔNG có nút chạy — quyết định 4 của spec §4, chép nguyên lý do.
   *
   * Câu này hiện ra dưới bảng chứ không nằm trong một chú thích mã: người vận hành nhìn một
   * bảng liệt kê mọi cuốn sẽ đi tìm nút chạy ở đó, và không tìm thấy mà không có lời giải
   * thích là một khoảng lặng họ phải tự lấp bằng phỏng đoán.
   */
  xuongKhongCoNutChay:
    'Chạy và dừng chỉ có ở thanh dưới, trên cuốn đang mở — một đường tiêu tiền duy nhất. ' +
    'Hai nút cùng gọi một lượt chạy thì trạng thái khóa-lúc-đang-gửi của chúng không thấy ' +
    'nhau, nên bấm cả hai là trả tiền hai lần. Bảng này để quét mắt, không để tiêu tiền.',
  /** Vì sao không xóa/đổi tên ở đây — quyết định 8 của spec §4. */
  xuongKhongXoaDoiTen:
    'Xoá hay đổi tên một tác phẩm làm ở thư mục gốc của xưởng, không làm ở đây: xoá một ' +
    'cuốn là xoá hàng giờ chạy và hàng chục đô, nên nó nên xảy ra ở nơi thấy rõ mình đang ' +
    'phá cái gì.',
  xuongRailGiaiThich:
    'Mọi tác phẩm trong xưởng, kèm tổng chi phí đã tiêu. Đây là bề mặt mức MÁY — nội dung ' +
    'của nó không đổi theo cuốn đang mở.',

  /* ── ba màn ─────────────────────────────────────────────────────────────── */
  thanhTrenGocXuong:
    'Thư mục gốc của xưởng. Màn này nói về MỌI tác phẩm dưới nó, nên thanh trên không có ' +
    'bộ chọn cuốn — không có cuốn nào đang được mở ở đây.',
  /**
   * Vì sao màn Quản lý KHÔNG có nút chạy, và vì sao câu này ngắn hơn hẳn bản cũ.
   *
   * Bản cũ in hai đoạn văn dài ngay dưới bảng — đo được ở 1512×900: bảng cao 182px, hai
   * đoạn biện giải cao 110px, tức lời giải thích chiếm hơn nửa chiều cao của thứ nó giải
   * thích. Một màn quản lý mà phần biện giải nặng ngang phần dữ liệu là một màn đang xin
   * lỗi vì chính nó.
   *
   * Lý do vẫn phải nói ra, nên nó về `title` của chỗ người dùng sẽ hỏi (nút Chi tiết) thay
   * vì nằm giữa màn hình.
   */
  quanLyKhongCoNutChay:
    'Chạy và dừng chỉ có trong xưởng sản xuất của từng cuốn — một đường tiêu tiền duy nhất.',
  quanLyMotEngineMotLuc:
    'Engine chỉ mở được MỘT cuốn mỗi lần. Đây là danh sách để chọn cuốn nào chạy tiếp, ' +
    'không phải bảng điều phối chạy song song.',
  canBanTuDia:
    'Đọc từ meta/run.json của từng cuốn — đây là ý định đã ký trên đĩa, không phải lời ' +
    'engine khẳng định nó đang đứng chờ. Chỉ cuốn đang mở engine mới nói được câu đó.',
  xoaKhongHoanTac:
    'Xóa hẳn tác phẩm này khỏi đĩa — bản thảo và nhật ký phán quyết mất theo, không hoàn tác được.',

  /**
   * Kết quả của nút Kiểm tra — nói ĐÚNG phạm vi đã chứng minh, không hơn.
   *
   * # "khóa còn dùng được" là một lời hứa quá rộng, và nó đã lừa người dùng
   *
   * Nút này gọi `GET /v1/models`. ĐO ĐƯỢC trên gateway của người dùng, cùng một khóa:
   *
   *     GET  /v1/models           → 200, liệt kê đủ model
   *     POST /v1/chat/completions → 429 "token quota exceeded for this API key"
   *
   * Liệt kê là đường METADATA; nó vẫn chạy ngon khi hạn mức sinh chữ đã cạn. Người dùng bấm
   * Kiểm tra, đọc "khóa còn dùng được", bấm Chạy, và engine chết ở lượt Writer đầu tiên.
   *
   * Ba điều lượt gọi này thật sự chứng minh: địa chỉ gốc đúng, mạng thông, khóa được nhận
   * diện (401/403 thì không), và tên model có thật. HẠN MỨC không nằm trong đó — nên nhãn
   * phải nói ra chỗ nó không với tới, thay vì để người đọc tự suy ra một bảo đảm không có.
   */
  napModelXong: (n: number) =>
    n === 0
      ? 'Gọi được nhà cung cấp, nhưng nó không trả model nào — gõ tay tên model.'
      : `Gọi được nhà cung cấp · ${n} model · khóa hợp lệ — chưa kiểm hạn mức`,

  /**
   * Chưa lưu khóa thì chưa kiểm được — nói TRƯỚC thay vì để người dùng bấm rồi nhận lỗi.
   *
   * `handleLietKeModel` chặn ca này ở server với đúng câu ấy, nên nút vẫn an toàn nếu bật.
   * Nhưng một nút bấm được rồi luôn báo lỗi là một nút nói dối; tắt nó kèm lý do thì không.
   */
  nccChuaCoKhoaDeKiem: 'Lưu khóa API cho nhà cung cấp này rồi mới kiểm tra được.',

  /**
   * Nhà cung cấp khai một cửa sổ ngữ cảnh khác thứ đang ghi trong thẻ.
   *
   * Không ghi thì `ResolveContextWindow` rơi xuống registry toàn cục — thứ mô tả model GỐC
   * của hãng, không phải trần của gateway đang gọi. ĐO ĐƯỢC: 9Router khai 272.000 cho
   * `cx/gpt-5.6-luna`, registry trả 1.050.000, và engine in `ngữ cảnh 0% (5/1050000)`. Bộ nén
   * khi ấy chờ một ngưỡng không bao giờ tới, còn gateway chặn từ lâu trước đó.
   */
  cuaSoLech: (ncc: string, ds: string[]) =>
    `${ncc} khai cửa sổ ngữ cảnh khác thứ đang ghi: ${ds.join(', ')}. Chưa ghi lại thì engine ` +
    `dùng con số của registry chung — có thể lớn hơn trần thật, và bộ nén sẽ không kịp nén.`,

  /**
   * Thêm một nhà cung cấp TRÙNG TÊN với thẻ đã có.
   *
   * ĐO ĐƯỢC trên máy người dùng, và đây là hỏng câm nguy hiểm nhất của bề mặt này: tên nhà
   * cung cấp là KHÓA trong `cfg.Providers`, nên lưu một tên đã tồn tại ghi đè thẳng lên thẻ cũ
   * — mất địa chỉ gốc, mất khóa API, mất cả danh sách model. Trên màn hình thì không có thẻ
   * mới nào hiện ra, nên nó đọc ra là "bấm Lưu chả thấy gì".
   *
   * Hư hại còn kéo dài: các vai vẫn ghim vào tên model của nhà cung cấp CŨ, mà model đó không
   * còn trong danh sách nữa — lượt chạy tới chết ở Arbiter với một thông báo nói về khóa API.
   *
   * Chỉ đường sang nút Sửa thay vì chỉ nói "trùng": người dùng gõ trùng tên hầu như luôn vì họ
   * ĐANG MUỐN đổi cái cũ (gateway riêng nói giao thức openai nên họ đặt luôn tên `openai`).
   */
  /**
   * Tiêu đề và thân của hộp chuyển nhà cung cấp.
   *
   * Nói ra vì sao phải NHÌN bảng: tên model chỉ có nghĩa bên trong một nhà cung cấp, nên sang
   * nơi mới có vai giữ được tên và có vai không. Đây đúng là chỗ đã đẻ ra ca hỏng đo được —
   * ba vai trỏ `openai · cx/gpt-5.5` trong khi `openai` chỉ khai `claude-opus-5`.
   */
  chuyenDe: (ten: string) => `Chuyển sang ${ten}?`,
  /**
   * Cùng hộp, nhưng khi MỌI vai đã ở đúng nhà cung cấp rồi thì đây không phải một lượt
   * "chuyển" — chỉ là cập nhật tên model cho khớp danh mục vừa sửa. Gọi đúng tên việc.
   */
  capNhatModelDe: (ten: string) => `Cập nhật model theo ${ten}?`,
  capNhatModelThan: (ten: string) =>
    `Các vai dưới đây đang trỏ vào model mà ${ten} không khai. Chọn tên đúng rồi xác nhận — ` +
    `một lượt ghi cho tất cả.`,
  chuyenThan: (ten: string) =>
    `Tên model chỉ có nghĩa bên trong một nhà cung cấp, nên không phải vai nào cũng mang được ` +
    `tên cũ sang ${ten}. Dòng ghi "chọn lại" là dòng cần mắt bạn — sửa ngay trong bảng.`,

  nccTrungTen: (ten: string) =>
    `Đã có nhà cung cấp tên "${ten}". Muốn đổi nó thì bấm Sửa trên thẻ đó — lưu đè ở đây sẽ ` +
    `xóa mất khóa và danh sách model của nó. Muốn thêm một cái riêng thì đặt tên khác.`,

  /**
   * Xóa nhà cung cấp còn vai ghim vào nó.
   *
   * Nói ra HỆ QUẢ đã được xử lý, không hỏi "bạn có chắc không": lượt xóa tự gỡ những vai đó về
   * mặc định, vì để lại một vai trỏ vào nhà cung cấp không còn sẽ làm `NewModelSet` lỗi và
   * KHÔNG MỞ ĐƯỢC MÁY cho bất kỳ cuốn nào.
   */
  xoaNccGoLuonGhim: (vai: string[]) =>
    `Xóa cả phần đặt riêng của ${vai.join(', ')} — những vai đó quay về dùng model mặc định.`,

  /**
   * Tên model KHAI trong thẻ mà nhà cung cấp không có.
   *
   * Đây đúng là lỗi đã xảy ra trên máy thật (`cx/gpt-5.5` khai đúng, ô mặc định gõ `gpt-5.5`),
   * chỉ khác chỗ phát hiện: bắt được ngay trên thẻ thì sửa được lúc còn đang gõ, thay vì đợi
   * tới lượt chạy đầu tiên và nhận một thông báo nói về khóa API.
   *
   * Nói "không thấy" chứ không nói "sai": có gateway không liệt kê hết model qua `/v1/models`,
   * nên đây là nghi vấn đáng kiểm, không phải một phán quyết.
   */
  nccKhaiModelLa: (thieu: string[], ncc: string) =>
    `${ncc} không liệt kê: ${thieu.join(', ')}. Kiểm lại chính tả — hoặc bỏ qua nếu bạn ` +
    `biết gateway này không trả hết model qua danh sách.`,

  /**
   * Model đang đặt không nằm trong danh sách nhà cung cấp vừa trả về.
   *
   * Câu này nói ra HẬU QUẢ chứ không chỉ nói "sai", vì hậu quả là thứ đã xảy ra thật và
   * người dùng đã không nối được nó với nguyên nhân: lỗi engine in ra là
   * `No active credentials for provider` — một câu về KHÓA, trong khi khóa hoàn toàn đúng
   * và thứ sai là tên model.
   */
  /**
   * Model của một vai không nằm trong danh sách mà nhà cung cấp của nó KHAI.
   *
   * Yếu hơn `modelKhongCoThat` một bậc và đó là chủ ý: nguồn ở đây là danh sách người dùng tự
   * gõ, không phải câu trả lời của nhà cung cấp. Nhưng nó KHÔNG cần mạng, nên nó bật ngay —
   * và ca hỏng đo được lộ ra đúng ở phép so này, nhiều giờ trước khi ai đó bấm nạp.
   */
  modelChuaKhai: (model: string, ncc: string) =>
    `${ncc} chưa khai model "${model}". Bấm Kiểm tra trên thẻ ${ncc} để hỏi thẳng nó, hoặc ` +
    `thêm tên này vào danh sách model của thẻ nếu bạn chắc nó có.`,

  modelKhongCoThat: (model: string, ncc: string) =>
    `${ncc} không có model tên "${model}". Lượt chạy tới sẽ dừng ngay ở Arbiter, và ` +
    `thông báo lúc đó sẽ nói về khóa API chứ không nói về tên model. Chọn một tên trong ô trên.`,

  /**
   * Xác nhận xóa. Nói ra CÁI MẤT, không hỏi chung chung "bạn có chắc không".
   *
   * "Bạn có chắc không" là câu người ta bấm Đồng ý theo phản xạ. Liệt kê số chương và số
   * tiền đã tiêu thì không — đó là những con số buộc phải đọc.
   */
  xacNhanXoa: (_ten: string, chuong: number, tien: string) =>
    chuong > 0
      ? `Mất ${chuong} chương đã chốt và toàn bộ nhật ký phán quyết — ${tien} đã tiêu. ` +
        `Bản thảo trên đĩa bị xóa theo, không hoàn tác được.`
      : `Cuốn này chưa có chương nào, nên chỉ mất phần nền đã dựng. Không hoàn tác được.`,

  tongTienMauSo:
    'Tổng chỉ cộng những cuốn đã có meta/usage.json. Cuốn chưa chạy lần nào không có số ' +
    'liệu để cộng, nên nó không nằm trong con số này.',

  /* ── cài đặt chung ──────────────────────────────────────────────────────── */
  cauHinhCuonDangMo: (ten: string) =>
    `${ten} đang mở engine — engine giữ cấu hình từ lúc nó được mở, nên thay đổi ở đây chỉ ` +
    'ăn vào lượt sau. Đóng rồi mở lại cuốn đó để áp ngay.',
  kenhVaiChungThuaHuong:
    'Vai không đặt riêng thì thừa hưởng model mặc định ở trên. Gỡ một vai là cho nó ' +
    'thừa hưởng lại.',
  chiPhiXuongChuaCoGi:
    'Chưa cuốn nào có meta/usage.json, nên chưa có gì để cộng. Đây là trạng thái bình ' +
    'thường của một xưởng chưa chạy lượt nào.',
  chiPhiXuongGiaiThich:
    'Cộng từ meta/usage.json của mọi tác phẩm. Phần bổ theo vai cộng lại đúng bằng con số ' +
    'tổng — cùng một phép cộng, không phải hai.',
  chiPhiXuongThieuUsage: (soLuot: number) =>
    `${soLuot} lượt mô hình không trả số liệu dùng, nên mọi con số trên đây đều thiếu một phần.`,

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
  /**
   * Dải kênh ở Phiên chạy ăn ngay VÀ ghi vĩnh viễn — hai hệ quả, và cái thứ hai hay bị bỏ sót.
   *
   * `Host.SwitchModel` dựng lại model set của engine đang chạy RỒI ghi `cfg.Roles` xuống tệp
   * (`host.go:1352-1360`). Nên một lần đổi "cho lượt này thôi" thật ra dính vĩnh viễn — đúng
   * cách ba dòng ghim trong tệp của người dùng ra đời mà họ không nhớ đã đặt bao giờ.
   */
  kenhVaiAnNgayVaGhi:
    'Đổi ở đây ăn ngay từ lượt gọi model kế tiếp — không cần mở lại máy. Nó cũng được ghi ' +
    'thành mặc định cho mọi lượt sau; muốn bỏ thì gỡ ở Cấu hình máy.',

  /** Model lúc khởi động đã KHÁC model đang chạy — nói ra thay vì để hai con số cãi nhau. */
  kenhVaiDaDoiSoVoiKhoiDong: (cu: string, moi: string) =>
    `Đã đổi giữa chừng: khởi động với ${cu}, hiện đang chạy ${moi}.`,

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
  /* ── dải "việc tiếp theo" ──────────────────────────────────────────────────
   *
   * Câu chỉ đường tới thanh transport là CHỮ, không phải nút thứ hai.
   *
   * Chạy tiếp là hành vi TIÊU TIỀN, và `DieuKhien` trong thanh dưới đã là chỗ bấm nó —
   * `PRODUCT.md` chốt điểm neo bàn transport của DAW chính vì lý do đó. Đặt thêm một nút
   * Chạy ở đây là dựng đường tiêu tiền thứ hai, mà hai nút cùng gọi một API thì trạng
   * thái khóa-lúc-đang-gửi của chúng không thấy nhau: bấm cả hai là hai lượt chạy.
   */
  dangDungNenChoMotChut:
    'Máy đang dựng nền tác phẩm — nhân vật, thế giới, dàn ý. Chưa có chương nào để đọc; việc này thường mất một hai phút.',
  /*
   * Câu này KHÔNG dùng lại `luongCoTheLau`.
   *
   * Chuỗi đó viết cho các luồng tệp (nhập truyện, mô phỏng văn phong) và nó nói "bản này chỉ
   * hiện nhật ký sau khi xong, nên trang im lặng KHÔNG có nghĩa là treo" — đúng ở ĐÓ, sai ở
   * ĐÂY: bề mặt này có dòng sự kiện chạy trực tiếp ngay bên dưới. Dùng lại là dạy người dùng
   * đừng tin một thứ đang hoạt động, tức tệ hơn không nói gì.
   */
  dangVietTuDiTiep:
    'Máy tự đi tiếp từng chương, không cần bạn bấm gì. Dòng sự kiện ở dưới chạy trực tiếp và chương vừa chốt hiện ngay trong bảng — không phải tải lại trang.',
  chayTiepOThanhDuoi:
    'Bấm ▶ Chạy ở thanh dưới cùng để máy viết tiếp — nếu thanh đó ghi "Mở máy cho tác phẩm này" thì bấm nút ấy trước, việc mở máy không gọi model lần nào.',
  chuaChayLanNao:
    'Tác phẩm đã tạo nhưng chưa viết chương nào. Bấm ▶ Chạy ở thanh dưới cùng để máy bắt đầu — nếu thanh đó ghi "Mở máy cho tác phẩm này" thì bấm nút ấy trước.',
  /* ── dòng sự kiện, hai ca RỖNG ────────────────────────────────────────────
   *
   * Rỗng lúc máy ĐANG CHẠY là chuyện bình thường, không phải sự cố: observer chỉ ghi vào
   * hàng những bước ĐÃ KẾT THÚC (internal/host/observer.go:191), nên suốt một lượt
   * `draft_chapter` dài không có sự kiện nào. Phép đo trên `sample.gif` nói đúng thế: dòng
   * này nhảy 5 lần trong 18 giây rồi im 15 giây.
   *
   * Nên phải có HAI câu. ĐO ĐƯỢC lúc E2E kế hoạch 2/4: một câu duy nhất khẳng định "Engine
   * đang nghỉ" hiện ra trong lúc engine đang viết chương 3, ngay dưới một khu văn sống đang
   * chảy và một dải ghi `Writer → draft_chapter`. Ba chỗ trên cùng màn hình, một chỗ nói
   * ngược — và chỗ nói ngược là chỗ người vận hành nhìn để biết dây chuyền còn sống không. */
  chuaCoSuKienDangChay:
    'Máy đang chạy nhưng chưa có bước nào kết thúc để ghi vào đây. Bước đang chạy hiện ở dải trạng thái phía trên, và chữ nó đang sinh ra chảy ở khu Máy đang nói.',
  /* Không khai lại trạng thái máy. Bản trước ghi "Máy đang nghỉ hoặc chưa phát bước nào" —
     một câu hedge, và cái hedge đó chính là dấu hiệu nó đang đoán: khu này chỉ biết hàng sự
     kiện rỗng, không biết engine đang làm gì. ĐO ĐƯỢC 2026-08-02 nó đoán sai (`runtime` thật
     là `paused`, không phải `idle`) trong khi thanh dưới nói đúng. Nên nó nói đúng điều nó
     biết, và trỏ sang chỗ giữ câu kia. */
  chuaCoSuKienDangNghi:
    'Chưa nhận sự kiện nào từ engine kể từ lúc mở dòng. Trạng thái máy ở thanh dưới cùng.',
  /* ── khu văn sống, hai ca RỖNG ────────────────────────────────────────────
   *
   * Chỉ dùng khi bộ đệm KHÔNG còn lượt nào. Lúc bộ đệm còn chữ thì khu vẽ chính chữ đó, kể
   * cả khi máy đã nghỉ — báo cáo của lượt vừa xong là chữ thật, và bỏ nó đi để lấy một câu
   * giải thích là đổi thứ đang nói được điều gì đó lấy thứ không.
   *
   * Vì vậy câu cho ca nghỉ KHÔNG được nói "đây là báo cáo của lượt vừa xong": ở đúng ca nó
   * hiện ra thì không có báo cáo nào cả, và một câu chỉ vào chỗ trống là câu nói dối.
   */
  vanSongTrong:
    'Chưa có lượt nào trong phiên xem này. Khi máy bắt đầu viết, chữ sẽ chảy ở đây.',
  vanSongNghi:
    'Phiên xem này chưa giữ được lượt nào để hiện lại. Bấm ▶ Chạy ở thanh dưới để máy viết tiếp — nếu thanh đó ghi "Mở máy cho tác phẩm này" thì bấm nút ấy trước.',
  /* ── dải trạng thái: hai câu cho HAI ca không được lẫn ─────────────────────
   *
   * `null` (engine đóng, KHÔNG đo được) và `[]`/`0` (đo được, bằng không) là hai sự thật khác
   * nhau, và dự án này đã trả giá một lần cho việc gộp chúng: một kiểu TS khai không-null cho
   * một trường server trả `null` (`Timeline.volumes`) làm `tsc` xanh trong khi renderer SẬP ở
   * bề mặt mặc định. Ở dải này hệ quả nhẹ hơn nhưng cùng lớp: một cây thước ngữ cảnh 0% vẽ
   * cho một thứ không có nguồn nói rằng model đang dùng 0% cửa sổ — một con số sai, không
   * phải một chỗ trống.
   */
  truongSongNull:
    'Engine đang đóng nên studio không đo được giá trị này. Đây KHÁC với "đo được, bằng không".',
  chuaCoVaiNaoChay:
    'Engine đang mở và đo được: lúc này không có vai nào đang chạy.',
  soLuotVaiLaGi:
    'Số lượt của vai trong chu kỳ hiện tại. Đây là dấu hiệu duy nhất phân biệt "đang chạy lâu" với "treo".',
  /* ── luồng tạo tác phẩm ──────────────────────────────────────────────── */
  batDauRoiKhongPhaiLamGi:
    'Sau khi bấm, bạn KHÔNG phải làm gì thêm: máy tự đi tiếp từng chương. Việc của bạn là xem nó chạy và nói vào ô can thiệp nếu muốn đổi hướng.',
  arbiterDangDocLau:
    'Lượt này gọi model thật nên thường mất 10–20 giây, và trang đứng im trong lúc đó là bình thường. Xong là nó tự chuyển sang bề mặt sản xuất, chỗ thấy dòng sự kiện chạy.',
  xongCoTheXuat:
    'Truyện đã viết hết số chương đã quy hoạch. Đọc lại được, và xuất thành một tệp mang về máy được.',
  cungDungGiaiDoanTamDung:
    'Vào cùng dựng giai đoạn sẽ TẠM DỪNG dây chuyền: bàn về chặng tiếp thì không để nó viết tiếp trong lúc bàn.',
  /* vòng đời sáng tác */
  vongDoiCanMoMay:
    'Các nút điều khiển cần engine đang mở. Mở máy không gọi model lần nào — nó chỉ gắn engine vào tác phẩm.',
  dangThuDon:
    'Lệnh dừng đã nhận. Engine đang kết thúc lượt hiện tại và ghi checkpoint — bấm thêm không làm nó nhanh hơn.',
  chipKetNoi:
    'Kênh sự kiện trực tiếp từ engine tới trình duyệt này: nó cho biết những con số trên màn là số SỐNG hay là ảnh chụp lúc mở trang. Nó KHÔNG nói engine đang chạy hay đang nghỉ; câu đó ở thanh dưới cùng.',
  cheDoReviewLaGi:
    'Chế độ nghiệm thu: engine dừng trước MỖI chương mới và chờ bạn cho đi tiếp từng chương một. Dùng khi muốn đọc soát trước khi nó viết thêm.',
  /* ── cửa nghiệm thu ────────────────────────────────────────────────────────
   *
   * Câu "chưa có kết luận" hiện RA MÀN HÌNH, không nằm trong chú thích mã: chỗ dành cho
   * kết luận của Editor mà để trống thì người vận hành đọc ra là "Editor thấy không sao"
   * — một câu chưa ai nói. Và nó không được lấp bằng một lý do do giao diện nghĩ ra: cửa
   * này tồn tại để người dùng quyết định dựa trên câu của Editor, nên một câu bịa ở đây
   * làm hỏng đúng việc nó phục vụ.
   *
   * `nghiemThuChoDay` chép khuôn của `canThiepChoDay`, và câu giải thích dài thì DÙNG LẠI
   * thẳng `canThiepTat`: cùng một chế độ chỉ-đọc, cùng một cách chữa (`--addr 127.0.0.1`).
   * Hai bản của cùng một lời giải thích thì có ngày lệch, và lúc đó không có cách nào
   * biết bản nào đúng.
   */
  nghiemThuChuaCoKetLuan:
    'Editor chưa ghi kết luận nào cho chương này. Cửa vẫn đang chờ bạn: engine dừng ở biên trước, Editor kết luận sau.',
  nghiemThuChoDay: 'Hai nút vô hiệu — studio đang ở chế độ chỉ đọc',
  nghiemThuHuyHieuDanToi:
    'Dây chuyền đã dừng ở biên chương và đang chờ bạn duyệt. Bấm để tới bề mặt Kiểm định: bản duyệt và hai nút quyết định ở cùng một chỗ.',
  /**
   * Vì sao "trả về viết lại" đi qua `/steer` — quyết định 7 của kế hoạch 4/4.
   *
   * Câu này hiện RA MÀN HÌNH khi ô nhập mở: "trả chương về viết lại" nghe như một lệnh xóa
   * chương, nhưng thứ thật sự xảy ra là một chỉ thị can thiệp, và PHẠM VI ẢNH HƯỞNG do
   * Arbiter quyết định — có thể nhiều hơn một chương. Người bấm phải biết điều đó trước khi
   * gửi, không phải sau khi thấy hàng chờ dài ra.
   *
   * Một route riêng cho việc này là đưa quyết định phạm vi ảnh hưởng vào `serve`, tức nhân
   * bản logic Arbiter — thứ `PRODUCT.md` cấm.
   */
  traVeVietLaiQuaSteer:
    'Câu này đi vào dây chuyền như một chỉ thị can thiệp: Arbiter đọc nó, phân loại phạm vi ảnh hưởng rồi xếp các chương bị tác động vào hàng chờ viết lại. Có thể nhiều hơn một chương.',
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
  /*
   * BA NHÃN "chưa chọn chương" của inspector đã ĐƯỢC BỎ ở cụm dựng buồng lái —
   * `chuaChonChuongTieuDe`, `chuaChonChuong`, `tabChuaChonChuong`.
   *
   * Ghi lại vì bài học sinh ra chúng vẫn còn giá trị: bản trước nữa hiện
   * "Chương / *chưa đặt tiêu đề*" ở tiêu đề panel trong khi thân panel nói "Chưa
   * chọn chương" — hai câu nói hai chuyện, và câu ở tiêu đề là câu SAI (nó khẳng
   * định có một chương đang mở, chỉ là chưa được đặt tên). Ba nhãn này là câu trả
   * lời cho ca đó: đúng một câu trạng thái và đúng một câu hướng dẫn.
   *
   * Chúng hết việc vì cột phải giờ có HAI CHẾ ĐỘ (spec §7.2): ca "chưa chọn
   * chương" không còn là một panel thiếu dữ liệu để xin lỗi, nó là chế độ ngữ
   * cảnh truyện với nội dung riêng. Ràng buộc gốc — tiêu đề và thân phải nói cùng
   * một điều — giờ được giữ bằng cấu trúc chứ bằng chữ, và nó ghi ở đầu
   * `Inspector.tsx`.
   */

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
  /* Chú giải của hai thanh chia. Nói cả ĐƯỜNG VỀ, không chỉ nói cách kéo: một bộ chia không
     có đường về là một bề mặt tự khoá, và đường về ấy không đoán ra được từ hình dạng. */
  keoBanHuongDan: 'Kéo để đổi cỡ · mũi tên để chỉnh từng bước (giữ Shift để nhanh) · nhấp đúp để về mặc định',

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
  railPhienChay: 'Cuốn này đã khởi động với cấu hình gì. Bản ghi, chỉ đọc.',

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
  thieuEndpointPhienChay:
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
