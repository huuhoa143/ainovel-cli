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

/** Đếm hồ sơ tác phẩm cho rail. null = endpoint trả null, tức store chưa có. */
export interface Profile {
  characters: number | null;
  rules: number | null;
  foreshadow: number | null;
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
