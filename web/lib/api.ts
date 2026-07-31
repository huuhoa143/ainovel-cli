/**
 * Tầng gọi API. Một chỗ duy nhất biết địa chỉ và biết chế độ mock.
 *
 * Hai cách chạy:
 *
 *   1. Sau `npm run build`, thư mục `out/` được engine phục vụ:
 *        ainovel-cli serve --root <gốc> --web web/out
 *      Cùng gốc (origin) nên `/api/...` chạy trực tiếp, không cần CORS.
 *
 *   2. `npm run dev` proxy `/api` sang engine qua rewrites trong
 *      next.config.mjs — cũng thành cùng gốc, vì server Go không gửi header
 *      CORS và EventSource không thể tự vượt qua điều đó.
 *
 *   3. `npm run dev:mock` không cần engine: đọc fixtures trong web/fixtures.
 */

import type {
  CastDoc,
  ChapterDetail,
  CostDoc,
  OutlineDoc,
  Profile,
  SettingsDoc,
  Snapshot,
  StreamEvent,
  StyleDoc,
  TinhTrangNguon,
  Workshop,
  WorldDoc,
} from './types';

/** '1' = fixture đầy đủ; 'empty' = xưởng rỗng; rỗng/undefined = gọi engine thật. */
const MOCK = process.env.NEXT_PUBLIC_MOCK ?? '';
export const LA_MOCK = MOCK !== '';

const GOC = process.env.NEXT_PUBLIC_API_BASE ?? '';

/** Các `event:` mà server có thể gửi (internal/domain/runtime_events.go). */
export const LOAI_SU_KIEN = ['ui_event', 'stream_delta', 'stream_clear', 'control'] as const;

export class LoiApi extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'LoiApi';
    this.status = status;
  }
}

async function doc<T>(duong: string): Promise<T> {
  const res = await fetch(`${GOC}${duong}`, { cache: 'no-store' });
  if (!res.ok) {
    // writeErr trả {"error": "..."} — dùng câu của server, nó nói tiếng Việt
    // và biết rõ hơn giao diện chuyện gì đã xảy ra.
    let thongDiep = `HTTP ${res.status}`;
    try {
      const than = (await res.json()) as { error?: string };
      if (than?.error) thongDiep = than.error;
    } catch {
      /* thân không phải JSON — giữ mã trạng thái */
    }
    throw new LoiApi(thongDiep, res.status);
  }
  return (await res.json()) as T;
}

/* ── mock ──────────────────────────────────────────────────────────────── */

async function mockWorkshop(): Promise<Workshop> {
  if (MOCK === 'empty') {
    return (await import('../fixtures/workshop-empty.json')).default as Workshop;
  }
  return (await import('../fixtures/workshop.json')).default as Workshop;
}

async function mockStudio(book: string): Promise<Snapshot> {
  switch (book) {
    case 'mot-dem-khong-ten':
      return (await import('../fixtures/studio-mot-dem.json')).default as unknown as Snapshot;
    case 'bien-ky':
      return (await import('../fixtures/studio-bien-ky.json')).default as unknown as Snapshot;
    default:
      return (await import('../fixtures/studio-tran-yeu-ky.json')).default as unknown as Snapshot;
  }
}

/* ── endpoint ──────────────────────────────────────────────────────────── */

export function layWorkshop(): Promise<Workshop> {
  if (LA_MOCK) return mockWorkshop();
  return doc<Workshop>('/api/workshop');
}

export async function laySnapshot(book: string, chuong?: number): Promise<Snapshot> {
  if (LA_MOCK) {
    const snap = await mockStudio(book);
    // Fixture chứa `selected` cố định; mô phỏng ?chapter= bằng cách bỏ selection
    // khi người dùng chọn chương khác, để giao diện phải xử lý ca "chưa có dữ
    // liệu cho chương này" thật chứ không luôn được cho sẵn.
    if (chuong && snap.selected && snap.selected.chapter !== chuong) {
      return { ...snap, selected: { chapter: chuong } };
    }
    return snap;
  }
  const q = chuong ? `?chapter=${chuong}` : '';
  return doc<Snapshot>(`/api/books/${encodeURIComponent(book)}/studio${q}`);
}

export async function layChuong(book: string, n: number): Promise<ChapterDetail> {
  if (LA_MOCK) {
    const mau = (await import('../fixtures/chapter.json')).default as unknown as ChapterDetail;
    return { ...mau, chapter: n };
  }
  return doc<ChapterDetail>(`/api/books/${encodeURIComponent(book)}/chapters/${n}`);
}

/**
 * Đếm cho rail: nhân vật, luật thế giới, phục bút.
 *
 * Ba endpoint này trả `null` khi store chưa có mục nào — và null KHÁC 0 ở đây:
 * null nghĩa là chưa dựng nền tác phẩm, 0 nghĩa là đã dựng mà rỗng. Rail hiện
 * số khi có mảng, không hiện gì khi null. Lỗi mạng ở đây không được làm sập
 * bề mặt chính nên mỗi lời gọi tự nuốt lỗi thành null.
 */
export async function layHoSo(book: string): Promise<Profile> {
  if (LA_MOCK) {
    const nguon = nguonMock(book);
    if (MOCK === 'empty' || book === 'bien-ky') {
      return { characters: null, rules: null, foreshadow: null, ...nguon };
    }
    return { characters: 18, rules: 31, foreshadow: 4, ...nguon };
  }

  const dem = (v: unknown): number | null => (Array.isArray(v) ? v.length : null);
  const goi = async <T>(duong: string): Promise<T | null> => {
    try {
      return await doc<T>(duong);
    } catch {
      return null;
    }
  };

  const b = encodeURIComponent(book);
  const [cast, world, vanPhong, chiPhi, caiDat] = await Promise.all([
    goi<{ characters: unknown }>(`/api/books/${b}/cast`),
    goi<{ rules: unknown; foreshadow: unknown }>(`/api/books/${b}/world`),
    hoiTham<StyleDoc>(`/api/books/${b}/style`, coVanPhong),
    hoiTham<CostDoc>(`/api/books/${b}/cost`, coChiPhi),
    hoiTham<SettingsDoc>(`/api/books/${b}/settings`, coCaiDat),
  ]);

  return {
    characters: cast ? dem(cast.characters) : null,
    rules: world ? dem(world.rules) : null,
    foreshadow: world ? dem(world.foreshadow) : null,
    vanPhong,
    chiPhi,
    caiDat,
  };
}

/**
 * Hỏi thăm một endpoint để rail biết vẽ nút hay vẽ nhãn "chưa dựng".
 *
 * # Vì sao hỏi thăm chứ không đọc `capabilities`
 *
 * Ba cờ trong `capabilities` trả lời "store CÓ dữ liệu không", không trả lời
 * "engine này CÓ endpoint không". Hai câu đó khác nhau ở đúng ca hay gặp nhất:
 * tác phẩm mới chưa có meta/usage.json thì cờ là false trong khi bề mặt Chi phí
 * đã dựng và có câu tử tế để nói về chuyện đó. Gate rail theo cờ sẽ ẩn bề mặt
 * đúng lúc nó cần lên tiếng.
 *
 * # Vì sao 404 là "thiếu endpoint"
 *
 * Ba endpoint hồ sơ sẵn có (`/outline`, `/cast`, `/world`) LUÔN trả 200 kèm
 * `null` khi tệp không tồn tại — xem handleCast/handleWorld trong
 * internal/serve/serve.go, chúng bỏ qua lỗi đọc và ghi thẳng nil vào JSON. Ba
 * endpoint mới theo cùng quy ước đó, nên 404 chỉ còn một nghĩa: bản engine đang
 * chạy không có route này.
 *
 * Nếu quy ước đó đổi (endpoint 404 khi thiếu tệp) thì hàm này sẽ báo "chưa dựng"
 * cho một bề mặt đã dựng — hướng sai an toàn hơn hướng ngược lại, nhưng vẫn sai,
 * nên nó được ghi ra đây thay vì để người sau tự tìm.
 *
 * Lỗi KHÁC 404 (500, store đọc lỗi, mạng đứt) không kết luận gì về endpoint, nên
 * rail vẫn vẽ nút và bề mặt tự hiện câu lỗi của server. Nuốt nó thành "chưa
 * dựng" là biến một lỗi tầng đọc thành một sự thật về engine.
 */
async function hoiTham<T>(
  duong: string,
  coDuLieu: (d: T) => boolean,
): Promise<TinhTrangNguon> {
  try {
    const d = await doc<T>(duong);
    return coDuLieu(d) ? 'co-nguon' : 'co-route';
  } catch (e) {
    if (e instanceof LoiApi && e.status === 404) return 'thieu-endpoint';
    return 'co-route';
  }
}

const coVanPhong = (d: StyleDoc): boolean =>
  (d.prose?.length ?? 0) > 0 ||
  (d.dialogue?.length ?? 0) > 0 ||
  (d.taboos?.length ?? 0) > 0;

/**
 * Chi phí "có nguồn" khi store đã cộng được một lượt gọi nào.
 *
 * KHÔNG kiểm `cost_usd > 0`: một phiên chạy trên model miễn phí có usage thật mà
 * chi phí đúng bằng 0, và đó là dữ liệu, không phải trống. Nên phép kiểm nhìn vào
 * số token — thứ luôn tăng khi có một lượt gọi thật.
 */
const coChiPhi = (d: CostDoc): boolean =>
  Object.keys(d.per_agent ?? {}).length > 0 ||
  Object.keys(d.per_model ?? {}).length > 0 ||
  (d.overall?.input ?? 0) > 0 ||
  (d.overall?.output ?? 0) > 0;

const coCaiDat = (d: SettingsDoc): boolean =>
  !!(d.started_at || d.model || d.provider || d.style);

/**
 * Ba tác phẩm mẫu được chia đúng ba trạng thái nguồn, để chế độ mock dựng được
 * cả ba mà không cần engine:
 *
 *   tran-yeu-ky       → có dữ liệu
 *   mot-dem-khong-ten → endpoint có, tệp có mà rỗng
 *   bien-ky           → endpoint có, store chưa ghi tệp nào
 *
 * Không có tác phẩm mẫu nào cho ca "endpoint thiếu": ca đó dựng được bằng chính
 * bản thật (bản engine chưa có route sẽ trả 404), nên bịa thêm một tác phẩm giả
 * cho nó là dựng một ca đã có thật.
 */
function nguonMock(book: string): Pick<Profile, 'vanPhong' | 'chiPhi' | 'caiDat'> {
  const tt: TinhTrangNguon = book === 'tran-yeu-ky' ? 'co-nguon' : 'co-route';
  return { vanPhong: tt, chiPhi: tt, caiDat: tt };
}

/* ── hồ sơ tác phẩm ────────────────────────────────────────────────────── */

/**
 * Ba endpoint hồ sơ. KHÔNG nuốt lỗi ở đây, khác với `layHoSo`.
 *
 * `layHoSo` nuốt lỗi vì nó chỉ tô số đếm cho rail và một lỗi mạng ở đó không
 * được làm sập bề mặt chính. Còn ba hàm này là nguồn duy nhất của cả một bề
 * mặt: nuốt lỗi thành `null` sẽ biến "không đọc được store" thành "tác phẩm
 * chưa có nhân vật nào" — hai câu khác nhau, và câu sau là nói dối.
 */
export function layDanY(book: string): Promise<OutlineDoc> {
  if (LA_MOCK) return mockJson<OutlineDoc>('outline');
  return doc<OutlineDoc>(`/api/books/${encodeURIComponent(book)}/outline`);
}

export function layNhanVat(book: string): Promise<CastDoc> {
  if (LA_MOCK) return mockJson<CastDoc>('cast');
  return doc<CastDoc>(`/api/books/${encodeURIComponent(book)}/cast`);
}

export function layTheGioi(book: string): Promise<WorldDoc> {
  if (LA_MOCK) return mockJson<WorldDoc>('world');
  return doc<WorldDoc>(`/api/books/${encodeURIComponent(book)}/world`);
}

/* ── ba bề mặt xưởng: văn phong · chi phí · cài đặt ─────────────────────── */

/**
 * Cùng luật với ba hàm hồ sơ ngay trên: KHÔNG nuốt lỗi.
 *
 * Ba bề mặt này phải phân biệt được ba ca — store chưa ghi tệp / tệp có mà rỗng /
 * không đọc được — và nuốt lỗi thành hồ sơ rỗng sẽ gộp ca thứ ba vào ca thứ nhất.
 * Đó là biến một lỗi của tầng đọc thành một sự thật về tác phẩm, và không ai đi
 * kiểm lại một câu như thế.
 */
export function layVanPhong(book: string): Promise<StyleDoc> {
  if (LA_MOCK) return mockXuong<StyleDoc>('style', book);
  return doc<StyleDoc>(`/api/books/${encodeURIComponent(book)}/style`);
}

export function layChiPhi(book: string): Promise<CostDoc> {
  if (LA_MOCK) return mockXuong<CostDoc>('cost', book);
  return doc<CostDoc>(`/api/books/${encodeURIComponent(book)}/cost`);
}

export function layCaiDat(book: string): Promise<SettingsDoc> {
  if (LA_MOCK) return mockXuong<SettingsDoc>('settings', book);
  return doc<SettingsDoc>(`/api/books/${encodeURIComponent(book)}/settings`);
}

/**
 * Fixture ba bề mặt xưởng, chia theo tác phẩm để mock dựng được cả ba trạng thái
 * rỗng. Xem `nguonMock` để biết tác phẩm nào mang trạng thái nào.
 *
 * Hai hình dạng rỗng ở đây KHÔNG giống nhau, và đó là điểm chính:
 *   - `bien-ky` trả mọi mảng `null` — store chưa ghi tệp nào
 *   - `mot-dem-khong-ten` trả mảng `[]` và số `0` — tệp có, trong đó rỗng
 */
async function mockXuong<T>(
  ten: 'style' | 'cost' | 'settings',
  book: string,
): Promise<T> {
  if (book === 'tran-yeu-ky') {
    switch (ten) {
      case 'style':
        return (await import('../fixtures/style.json')).default as unknown as T;
      case 'cost':
        return (await import('../fixtures/cost.json')).default as unknown as T;
      default:
        return (await import('../fixtures/settings.json')).default as unknown as T;
    }
  }

  const chuaGhi = MOCK === 'empty' || book === 'bien-ky';
  switch (ten) {
    case 'style':
      return (chuaGhi
        ? { volume: 0, arc: 0, prose: null, dialogue: null, taboos: null }
        : { volume: 1, arc: 1, prose: [], dialogue: [], taboos: [], updated_at: '2026-07-29T20:14:52Z' }) as T;
    case 'cost': {
      const khong = {
        input: 0,
        output: 0,
        cache_read: 0,
        cache_write: 0,
        cost_usd: 0,
        saved_usd: 0,
        cache_capable: false,
      };
      return (chuaGhi
        ? { overall: khong, per_agent: null, per_model: null, missing_assistant_usage: 0 }
        : {
            overall: khong,
            per_agent: {},
            per_model: {},
            missing_assistant_usage: 0,
            updated_at: '2026-07-29T20:14:52Z',
          }) as T;
    }
    default:
      return (chuaGhi
        ? {}
        : { started_at: '2026-07-29T18:02:11Z', advance_mode: 'auto' }) as T;
  }
}

/**
 * Fixture cho chế độ mock. Thiếu tệp thì trả về hồ sơ TRỐNG đúng hình dạng
 * server (mọi mảng `null`) thay vì ném lỗi: mock là để thử bố cục, và ca "store
 * chưa có gì" cũng là một bố cục cần thử.
 */
async function mockJson<T>(ten: 'outline' | 'cast' | 'world'): Promise<T> {
  switch (ten) {
    case 'outline':
      return (await import('../fixtures/outline.json')).default as unknown as T;
    case 'cast':
      return (await import('../fixtures/cast.json')).default as unknown as T;
    default:
      return (await import('../fixtures/world.json')).default as unknown as T;
  }
}

/* ── dòng sự kiện ──────────────────────────────────────────────────────── */

export function duongSuKien(book: string, sau: number): string {
  return `${GOC}/api/books/${encodeURIComponent(book)}/events?after=${sau}`;
}

/**
 * Dòng sự kiện giả cho chế độ mock: phát lại fixtures/events.json theo nhịp,
 * đủ để thấy transport đổi và nhật ký chạy mà không cần engine.
 *
 * Chỉ hiện thực phần EventSource mà useStudio dùng.
 */
export class DongGia {
  private hen: ReturnType<typeof setTimeout> | undefined;
  private nghe = new Map<string, (ev: MessageEvent) => void>();
  private dong = false;

  constructor(private readonly nhipMs = 2600) {
    void this.batDau();
  }

  private async batDau() {
    const mau = (await import('../fixtures/events.json')).default as StreamEvent[];
    if (this.dong) return;
    let i = 0;
    const day = () => {
      if (this.dong) return;
      const goc = mau[i % mau.length]!;
      // Seq và thời gian phải tiến lên, nếu không giao diện sẽ coi là trùng.
      const ev: StreamEvent = {
        ...goc,
        seq: goc.seq + Math.floor(i / mau.length) * mau.length,
        time: new Date().toISOString(),
      };
      i += 1;
      this.nghe.get(ev.kind)?.(
        new MessageEvent(ev.kind, { data: JSON.stringify(ev), lastEventId: String(ev.seq) }),
      );
      this.hen = setTimeout(day, this.nhipMs);
    };
    this.hen = setTimeout(day, 900);
  }

  addEventListener(loai: string, fn: (ev: MessageEvent) => void) {
    this.nghe.set(loai, fn);
  }

  close() {
    this.dong = true;
    if (this.hen) clearTimeout(this.hen);
  }
}
