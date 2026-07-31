/**
 * Bản đối chiếu TypeScript của hợp đồng JSON trong internal/serve/model.go.
 *
 * Quy ước dịch: trường Go có `omitempty` và là con trỏ (`*int64`) thì ở đây là
 * `?: number` — vắng mặt, KHÔNG phải 0. Trường Go `omitempty` trên slice thì ở
 * đây là `?: T[]` vì server bỏ khóa khi mảng rỗng. Giao diện không được coi
 * `undefined` là 0 hay mảng rỗng ở nơi hai thứ đó khác nghĩa; chỗ nào khác
 * nghĩa đều có ghi chú tại đúng trường.
 *
 * Mã enum để nguyên tiếng Anh vì đó là dữ liệu. Chữ hiển thị nằm ở lib/nhan.ts.
 */

/** Dữ liệu nào thật sự có trong store của bản engine này. */
export interface Capabilities {
  /** false → không đo được thời lượng theo chương, ẩn cả cột. */
  per_chapter_duration: boolean;
  /** false → store chỉ cộng chi phí theo agent/model, KHÔNG theo chương. */
  per_chapter_cost: boolean;
  /** false → truyện phẳng, không có tập/cung. */
  layered_outline: boolean;
  /** false → engine chưa hợp tác nhận can thiệp qua web; ô nhập phải vô hiệu. */
  steer: boolean;

  /*
   * Ba cờ dưới đây phục vụ ba bề mặt Văn phong / Chi phí / Cài đặt.
   *
   * Chúng là `?:` chứ không phải `boolean` vì bản engine cũ hơn không có khóa
   * này trong JSON, và `undefined` ở đây KHÁC `false`: một cái nghĩa là bản
   * engine không biết câu hỏi, cái kia nghĩa là nó biết và trả lời không.
   *
   * Ba cờ này chỉ dùng để chọn CÂU cho trạng thái rỗng — phân biệt "store chưa
   * có tệp đó" với "tệp có mà rỗng". Chúng KHÔNG dùng để quyết định có vẽ bề mặt
   * hay không: dữ liệu thật thắng cờ, theo đúng bài học LayeredOutline ghi ở
   * internal/serve/model.go — hai đường suy luận song song về cùng một dữ liệu
   * sẽ có lúc lệch, và khi lệch thì ẩn một bề mặt còn đủ dữ liệu để vẽ là hướng
   * sai tệ hơn.
   */
  /** false → store chưa có meta/style_rules.json. */
  style_rules?: boolean;
  /** false → store chưa có meta/usage.json. */
  cost_breakdown?: boolean;
  /** false → store chưa có cấu hình phiên chạy. */
  run_settings?: boolean;
}

export type Activity = 'running' | 'idle' | 'complete';

export interface Book {
  id: string;
  /** Rỗng khi chưa đặt tên. */
  name: string;
  phase: string;
  flow?: string;
  completed_chapters: number;
  total_chapters: number;
  total_words: number;
  activity: Activity;
  updated_at?: string;
}

export interface Workshop {
  root: string;
  /** Server luôn trả mảng; rỗng = xưởng chưa có tác phẩm nào. */
  books: Book[];
}

/**
 * done | running | planned | unplanned
 *  planned   = đã có cấu trúc chi tiết, chưa chạy tới
 *  unplanned = mới là bộ khung, Architect sẽ mở khi tới lượt
 */
export type BlockState = 'done' | 'running' | 'planned' | 'unplanned';

export interface LaneBlock {
  index: number;
  title?: string;
  state: BlockState;
  /**
   * Số chương thật khi đã mở, hoặc số dự kiến khi còn là bộ khung.
   * 0 nghĩa là CHƯA BIẾT — không phải "không có chương nào". Xem
   * lib/truc.ts:trongSoKhoi để biết chỗ này biến thành độ rộng ra sao.
   */
  chapters: number;
  /** true khi `chapters` là số dự kiến, không phải số đã mở. */
  estimated?: boolean;
  final?: boolean;
  /** Chương đầu/cuối, chỉ có khi khối đã mở. */
  from?: number;
  to?: number;
}

export type MarkState = 'done' | 'running' | 'rewrite' | 'gate' | 'pending';

export interface ChapterMark {
  chapter: number;
  state: MarkState;
}

export interface Timeline {
  volumes: LaneBlock[];
  /** Các cung trong tập hiện tại, không phải mọi cung của tác phẩm. */
  arcs: LaneBlock[];
  chapters: ChapterMark[];
}

export type Stage = 'done' | 'drafting' | 'rewrite' | 'pending';

export interface ChapterRow {
  chapter: number;
  title?: string;
  stage: Stage;
  words?: number;
  /**
   * Vắng = không đo được (chương chỉ có một checkpoint, hoặc chưa chạy).
   * KHÔNG hiển thị 0: 0 nghĩa là xong tức thời, đó là một lời nói dối cụ thể.
   */
  duration_ms?: number;
  /** Các vai đã tham gia chu kỳ gần nhất. */
  owner?: string[];
}

export interface Dimension {
  name: string;
  score?: number;
  verdict?: string;
  comment?: string;
}

export interface Issue {
  type: string;
  severity: string;
  description: string;
  evidence?: string;
  suggestion?: string;
  chapters?: number[];
  needs_change: boolean;
}

export interface Review {
  chapter: number;
  scope: string;
  verdict: string;
  summary?: string;
  dimensions?: Dimension[];
  issues?: Issue[];
  contract_status?: string;
  contract_misses?: string[];
}

export interface Contract {
  chapter: number;
  title?: string;
  core_event?: string;
  hook?: string;
  scenes?: string[];
}

export interface Decision {
  id: string;
  at: string;
  kind: string;
  decider: string;
  reason?: string;
  input?: string;
  model?: string;
  /** Ở đây 0 = vắng (Go dùng omitempty trên int64, không phải con trỏ). */
  duration_ms?: number;
  error?: string;
  /** Quyết định thô, giữ nguyên để xem lại được. */
  decision?: unknown;
}

export interface Transport {
  state: Activity;
  /**
   * Công đoạn vừa HOÀN THÀNH, không phải công đoạn đang chạy. Store chỉ ghi
   * checkpoint khi một bước thành công. Công đoạn đang chạy chỉ có trong SSE.
   */
  last_step?: string;
  agent?: string;
  model?: string;
  cost_usd: number;
  /** Tổng chi phí / số chương đã xong — có nguồn thật, khác chi phí từng chương. */
  cost_per_chapter?: number;
  /** Vắng khi phiên quá ngắn để con số có nghĩa. */
  chapters_per_hour?: number;
  elapsed_ms?: number;
}

export interface Selection {
  chapter: number;
  title?: string;
  contract?: Contract;
  review?: Review;
  excerpt?: string;
  words?: number;
}

export interface Snapshot {
  book: Book;
  capabilities: Capabilities;
  timeline: Timeline;
  chapters: ChapterRow[];
  transport: Transport;
  decisions?: Decision[];
  selected?: Selection;
  /** Kiểm tra nhất quán nông của store. Hiện ra, không nuốt đi. */
  warnings?: string[];
  /** Điểm bắt đầu cho SSE (?after=) để không bỏ sót và không nhận trùng. */
  queue_seq: number;
}

/** Toàn văn một chương — GET /api/books/{book}/chapters/{n}. */
export interface ChapterDetail {
  chapter: number;
  title?: string;
  words: number;
  text: string;
  contract?: Contract;
  review?: Review;
}

/**
 * Bề mặt có tồn tại ở bản engine đang chạy hay không.
 *
 * Ba giá trị này là ba câu trả lời KHÁC NHAU cho rail, và trộn chúng lại là
 * đúng lỗi mà `MucChuaDung` tồn tại để tránh:
 *
 *   'thieu-endpoint' → bản engine này không có route đó (404). Rail phải vẽ mục
 *                      dưới dạng "chưa dựng": bấm vào sẽ không có gì.
 *   'co-nguon'       → route có và trả về dữ liệu. Rail vẽ nút thật.
 *   'co-route'       → route có nhưng chưa đọc được / chưa có dữ liệu. Rail vẫn
 *                      vẽ nút thật, vì bề mặt đã dựng và nó có câu để nói về
 *                      chuyện store rỗng. Ẩn nút ở đây sẽ biến "tác phẩm mới"
 *                      thành "studio thiếu bề mặt" — hai kết luận khác nhau.
 */
export type TinhTrangNguon = 'thieu-endpoint' | 'co-route' | 'co-nguon';

/** Đếm hồ sơ tác phẩm cho rail. null = endpoint trả null, tức store chưa có. */
export interface Profile {
  characters: number | null;
  rules: number | null;
  foreshadow: number | null;
  /**
   * Ba bề mặt mới chỉ có ở bản engine đã dựng endpoint cho chúng. Rail hỏi thăm
   * một lượt khi đổi tác phẩm — cùng nhịp với ba số đếm trên, không nằm trong
   * vòng làm mới 1,5s.
   */
  vanPhong: TinhTrangNguon;
  chiPhi: TinhTrangNguon;
  caiDat: TinhTrangNguon;
}

/* ── hồ sơ tác phẩm: dàn ý / nhân vật / luật thế giới ───────────────────── */

/**
 * Ba endpoint hồ sơ (`/outline`, `/cast`, `/world`) trả `null` cho từng mảng
 * khi tệp tương ứng không tồn tại (store.ReadJSON + os.IsNotExist → nil, nil).
 *
 * `null` KHÁC `[]` ở đây và cả hai đều phải hiện khác nhau:
 *   null = chưa dựng nền tác phẩm, engine chưa ghi tệp đó lần nào
 *   []   = đã dựng nền mà mục này rỗng — một sự thật khác hẳn
 * Gộp hai ca lại thành "chưa có gì" là nói dối một trong hai.
 */

/** Một chương trong dàn ý — cũng là khế ước chương khi đã mở. */
export interface OutlineEntry {
  chapter: number;
  title: string;
  core_event: string;
  hook: string;
  /** null khi Architect chưa chia cảnh cho chương này. */
  scenes: string[] | null;
}

/** Cung trong một tập. `chapters === null` = còn là bộ khung, chưa mở. */
export interface ArcOutline {
  index: number;
  title: string;
  goal: string;
  /** Số chương dự kiến của cung còn là bộ khung; mở rồi thì server bỏ khóa. */
  estimated_chapters?: number;
  chapters: OutlineEntry[] | null;
}

/** Tập. `arcs === null` = tập mới là bộ khung, Architect chưa mở cung nào. */
export interface VolumeOutline {
  index: number;
  title: string;
  /** Xung đột/chủ đề cốt lõi của tập. */
  theme: string;
  /** true = tập chốt: cả bộ thu về trong tập này. */
  final?: boolean;
  arcs: ArcOutline[] | null;
}

/** GET /api/books/{book}/outline */
export interface OutlineDoc {
  /** Tiền đề, dạng markdown thô. Rỗng khi chưa có premise.md. */
  premise: string;
  volumes: VolumeOutline[] | null;
  /** Dàn ý phẳng — với truyện phân tầng thì đây là bản dàn trải của volumes. */
  flat: OutlineEntry[] | null;
}

export interface Character {
  name: string;
  aliases?: string[];
  role: string;
  description: string;
  arc: string;
  traits: string[] | null;
  /** core / important / secondary / decorative. Vắng = important. */
  tier?: string;
}

/** Trạng thái một nhân vật ở cuối cung gần nhất. */
export interface CharacterSnapshot {
  volume: number;
  arc: number;
  name: string;
  status: string;
  power?: string;
  motivation: string;
  relations?: string;
}

/** GET /api/books/{book}/cast */
export interface CastDoc {
  characters: Character[] | null;
  snapshots: CharacterSnapshot[] | null;
}

export interface WorldRule {
  /** magic / technology / geography / society / other */
  category: string;
  rule: string;
  /** Ranh giới không được vi phạm. */
  boundary: string;
}

export interface ForeshadowEntry {
  id: string;
  description: string;
  planted_at: number;
  /** planted / advanced / resolved */
  status: string;
  /** Chỉ có khi status = resolved. */
  resolved_at?: number;
}

export interface RelationshipEntry {
  character_a: string;
  character_b: string;
  relation: string;
  chapter: number;
}

/** GET /api/books/{book}/world */
export interface WorldDoc {
  rules: WorldRule[] | null;
  foreshadow: ForeshadowEntry[] | null;
  relations: RelationshipEntry[] | null;
}

/* ── văn phong: quy tắc viết Editor chưng ra ở ranh giới cung ───────────── */

/** Quy tắc giọng của một nhân vật. */
export interface CharacterVoice {
  name: string;
  /** null khi tệp có mục nhân vật đó mà chưa có quy tắc nào. */
  rules: string[] | null;
}

/**
 * GET /api/books/{book}/style — `domain.WritingStyleRules`.
 *
 * `volume`/`arc` là CỬA SỔ của cả tệp, không phải nhãn trang trí: Editor chưng
 * quy tắc ở ranh giới cung, nên bộ quy tắc này mô tả cung VỪA ĐÓNG. Dây chuyền
 * đã đi sang cung sau thì nó vẫn là bộ quy tắc mới nhất, nhưng không phải bộ
 * quy tắc của chương đang viết — và người vận hành phải đọc được điều đó.
 */
export interface StyleDoc {
  volume: number;
  arc: number;
  /** 3–5 quy tắc lối kể. null = chưa có tệp / chưa chưng lần nào. */
  prose: string[] | null;
  dialogue: CharacterVoice[] | null;
  /** Danh sách cấm. */
  taboos: string[] | null;
  updated_at?: string;
}

/* ── chi phí: cộng dồn theo tác tử và theo model ────────────────────────── */

/**
 * Một ô cộng dồn — `domain.AgentUsageTotals`.
 *
 * Mọi trường số ở đây là `number`, KHÔNG `?: number`, và đó là điều kiện để bề
 * mặt Chi phí nói thật: `$0` (đã gọi model mà chưa tốn tiền, hoặc model miễn
 * phí) và "chưa có số liệu" là hai chuyện khác nhau. Nếu server đặt `omitempty`
 * lên các trường này thì khóa `0` bị rụng khỏi JSON và hai ca đó gộp lại —
 * đúng lớp lỗi đã ghi ở `Dimension.Score` trong internal/serve/model.go.
 *
 * Vì thế giao diện kiểm bằng `!= null`, không bằng falsy.
 */
export interface UsageTotals {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  cost_usd: number;
  saved_usd: number;
  /** false → model không hỗ trợ đệm, nên hai cột đệm là "không áp dụng", không phải 0. */
  cache_capable: boolean;
  /** Số lần chuỗi đệm bị đứt. Chỉ đếm ở đường chạy trực tiếp, không phát lại. */
  cache_breaks?: number;
}

/** GET /api/books/{book}/cost — `domain.UsageState`. */
export interface CostDoc {
  updated_at?: string;
  overall: UsageTotals;
  /** null = chưa có tệp. `{}` = có tệp mà chưa vai nào được cộng. */
  per_agent: Record<string, UsageTotals> | null;
  per_model: Record<string, UsageTotals> | null;
  /**
   * Số lượt gọi model KHÔNG báo lại usage. Lớn hơn 0 nghĩa là mọi con số trên
   * bề mặt này là SÀN, không phải số đúng — và đó là tin vận hành, không phải
   * chi tiết nội bộ.
   */
  missing_assistant_usage: number;
}

/* ── cài đặt phiên chạy ─────────────────────────────────────────────────── */

/**
 * GET /api/books/{book}/settings — phần công khai được của `domain.RunMeta`.
 *
 * KHÔNG có `start_prompt`, `pending_steer`, `plan_start`: yêu cầu gốc của người
 * dùng và ý kiến can thiệp chưa xử lý không phải cấu hình, và bề mặt này là bề
 * mặt cấu hình.
 */
export interface SettingsDoc {
  started_at?: string;
  provider?: string;
  /** Kiểu văn chọn lúc khởi động — KHÁC quy tắc văn phong Editor chưng ra sau. */
  style?: string;
  model?: string;
  /** short / mid / long */
  planning_tier?: string;
  /** auto / review */
  advance_mode?: string;
  /**
   * Chương được cấp phép đi tiếp ở chế độ `review`.
   *
   * `0` là giá trị THẬT ("chưa cấp phép chương nào"), không phải vắng — nên nếu
   * server đặt `omitempty` lên nó thì ca đáng quan tâm nhất của chế độ review
   * biến mất khỏi JSON. Giao diện kiểm `!= null`.
   */
  advance_permit_chapter?: number;
}

/** Một sự kiện SSE — khung ở internal/serve/events.go:sseEvent. */
export interface StreamEvent {
  seq: number;
  time: string;
  kind: string;
  category?: string;
  agent?: string;
  summary?: string;
  payload?: unknown;
}

/** Lỗi có thân JSON {"error": "..."} do writeErr sinh ra. */
export interface ApiError {
  error: string;
}
