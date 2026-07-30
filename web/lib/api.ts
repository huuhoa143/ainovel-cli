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
  ChapterDetail,
  Profile,
  Snapshot,
  StreamEvent,
  Workshop,
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
    if (MOCK === 'empty' || book === 'bien-ky') {
      return { characters: null, rules: null, foreshadow: null };
    }
    return { characters: 18, rules: 31, foreshadow: 4 };
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
  const [cast, world] = await Promise.all([
    goi<{ characters: unknown }>(`/api/books/${b}/cast`),
    goi<{ rules: unknown; foreshadow: unknown }>(`/api/books/${b}/world`),
  ]);

  return {
    characters: cast ? dem(cast.characters) : null,
    rules: world ? dem(world.rules) : null,
    foreshadow: world ? dem(world.foreshadow) : null,
  };
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
