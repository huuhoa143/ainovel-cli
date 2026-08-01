'use client';

/**
 * Toàn bộ trạng thái của bề mặt studio nằm trong một hook.
 *
 * Không dùng thư viện quản lý state: bề mặt này có đúng một nguồn dữ liệu
 * (store, qua HTTP) và một dòng cập nhật (SSE). Thêm một store phía client chỉ
 * tạo ra bản sao thứ hai của sự thật — đúng thứ PRODUCT.md cấm ("studio không
 * nhân bản logic engine").
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DongGia,
  LA_MOCK,
  LOAI_SU_KIEN_UI,
  LOAI_VAN_SONG,
  duongSuKien,
  layHoSo,
  laySnapshot,
  layWorkshop,
} from './api';
import { nhanSuKienUi } from './dongSuKien';
import { KHU_MAC_DINH, laKhu, type Khu } from './khu';
import type { Profile, Snapshot, StreamEvent, Workshop } from './types';
import { BO_DEM_RONG, moLuot, nhanVach, themChu, type BoDemVan } from './vanSong';

/** Số sự kiện giữ lại trong dòng. Nhật ký là cửa sổ, không phải log đầy đủ. */
const GIU_SU_KIEN = 40;

/**
 * Sự kiện đến thì bảng chương và trục cũng cũ theo, nhưng gọi lại snapshot mỗi
 * sự kiện sẽ nghiền store khi engine đang phát liên tục. Gộp lại một nhịp.
 */
const NHIP_LAM_MOI_MS = 1500;

/**
 * 'khong' = KHÔNG có dòng nào để mở, khác hẳn 'dang-mo'.
 *
 * Xưởng rỗng thì useStudio không bao giờ mở EventSource (cần có tác phẩm), nên
 * để huy hiệu ở 'dang-mo' là một câu vĩnh viễn sai: nó nói máy đang kết nối
 * trong khi không có gì để kết nối tới.
 */
export type TinhTrangKetNoi = 'dang-mo' | 'song' | 'mat' | 'khong';

/**
 * Công đoạn suy từ dòng sự kiện.
 *
 * `dangChay` KHÔNG phải mặc định true. observer chỉ ghi vào runtime queue các
 * sự kiện đã kết thúc (xem internal/host/observer.go:191 — sự kiện "bắt đầu"
 * cố ý không ghi để replay không bị nhân đôi), nên phần lớn sự kiện đến là
 * bước VỪA XONG chứ không phải bước đang chạy. Chỉ khi payload có ID và
 * FinishedAt còn là zero value của Go thì bước đó thật sự đang chạy.
 */
export interface CongDoanSong {
  buoc: string;
  vai?: string;
  loai?: string;
  dangChay: boolean;
  luc: string;
  loi: boolean;
}

interface PayloadEvent {
  ID?: string;
  Category?: string;
  Agent?: string;
  Summary?: string;
  Level?: string;
  Failed?: boolean;
  FinishedAt?: string;
}

/** Zero value của time.Time khi marshal sang JSON. */
const THOI_GIAN_RONG = '0001-01-01';

function docPayload(p: unknown): PayloadEvent {
  if (!p || typeof p !== 'object') return {};
  return p as PayloadEvent;
}

function congDoanTu(ev: StreamEvent): CongDoanSong | undefined {
  const buoc = ev.summary?.trim();
  if (!buoc) return undefined;

  const pl = docPayload(ev.payload);
  const chuaXong = !!pl.FinishedAt && pl.FinishedAt.startsWith(THOI_GIAN_RONG);
  return {
    buoc,
    vai: ev.agent || pl.Agent || undefined,
    loai: ev.category || pl.Category || undefined,
    dangChay: !!pl.ID && chuaXong,
    luc: ev.time,
    loi: pl.Failed === true || pl.Level === 'error' || ev.category === 'ERROR',
  };
}

export interface Studio {
  workshop: Workshop | undefined;
  tacPham: string | undefined;
  snapshot: Snapshot | undefined;
  hoSo: Profile | undefined;
  chuongChon: number | undefined;
  khu: Khu;
  song: CongDoanSong | undefined;
  suKien: StreamEvent[];
  /** Chữ model đang sinh ra. Đường riêng, không đi qua `suKien` — xem lib/dongSuKien.ts. */
  vanSong: BoDemVan;
  ketNoi: TinhTrangKetNoi;
  dangTai: boolean;
  loi: string | undefined;
  chonTacPham: (id: string) => void;
  chonChuong: (n: number) => void;
  chonKhu: (k: Khu) => void;
  /** Mở tác phẩm vừa tạo: đổi tác phẩm + về bề mặt mặc định, một lần ghi URL. */
  moTacPhamVuaTao: (id: string) => void;
  /** Mở một chương để đọc: chọn chương + sang bề mặt đọc, một lần ghi URL. */
  docChuong: (n: number) => void;
  taiLai: () => void;
}

/** Đọc/ghi tác phẩm đang xem vào query string, để tải lại trang không mất chỗ. */
function tacPhamTuUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search).get('tp') ?? undefined;
}

/**
 * Ghi cả ba mảnh vị trí vào URL trong MỘT lần.
 *
 * `replaceState` với một URLSearchParams mới thay thế toàn bộ query string, nên
 * mọi chỗ ghi phải đi qua đây. Có hai chỗ ghi thì chỗ nào chạy sau sẽ xóa tham
 * số của chỗ kia — chọn chương xong là mất khu đang xem.
 */
function ghiUrl(tp: string, chuong: number | undefined, khu: Khu) {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams();
  q.set('tp', tp);
  if (chuong) q.set('ch', String(chuong));
  if (khu !== KHU_MAC_DINH) q.set('khu', khu);
  window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
}

function chuongTuUrl(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const v = new URLSearchParams(window.location.search).get('ch');
  const n = v ? Number.parseInt(v, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function khuTuUrl(): Khu {
  if (typeof window === 'undefined') return KHU_MAC_DINH;
  const v = new URLSearchParams(window.location.search).get('khu');
  return laKhu(v) ? v : KHU_MAC_DINH;
}

export function useStudio(): Studio {
  const [workshop, setWorkshop] = useState<Workshop>();
  const [tacPham, setTacPham] = useState<string>();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [hoSo, setHoSo] = useState<Profile>();
  const [chuongChon, setChuongChon] = useState<number>();
  // Khu đọc từ URL ngay lúc dựng state: `next export` không render trước gì nên
  // không có nguy cơ lệch giữa máy chủ và máy khách, và đọc trong useEffect sẽ
  // làm bề mặt nháy qua Dòng sản xuất một nhịp trước khi về đúng khu.
  const [khu, setKhu] = useState<Khu>(khuTuUrl);
  const [song, setSong] = useState<CongDoanSong>();
  const [suKien, setSuKien] = useState<StreamEvent[]>([]);
  const [vanSong, setVanSong] = useState<BoDemVan>(BO_DEM_RONG);
  const [ketNoi, setKetNoi] = useState<TinhTrangKetNoi>('dang-mo');
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string>();
  const [lanTai, setLanTai] = useState(0);

  /** Seq lớn nhất đã thấy — điểm nối lại của stream. */
  const seqRef = useRef(0);
  const henRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tacPhamRef = useRef<string>(undefined);
  const chuongRef = useRef<number | undefined>(undefined);
  const khuRef = useRef<Khu>(KHU_MAC_DINH);
  /**
   * Chương đang soạn, để đặt tên cho vạch ngăn lúc lệnh xóa tới.
   *
   * Ref chứ không phải giá trị đóng trong handler: effect dòng sự kiện cố ý KHÔNG có
   * `snapshot` trong deps (mỗi lần làm mới snapshot sẽ đóng/mở lại stream và mất sự kiện
   * trong khoảng đó), nên một handler đọc `snapshot` trực tiếp sẽ đóng băng ở snapshot đầu
   * tiên và dán số chương CŨ lên mọi vạch ngăn về sau.
   */
  const chuongDangSoanRef = useRef<number | undefined>(undefined);

  tacPhamRef.current = tacPham;
  chuongRef.current = chuongChon;
  khuRef.current = khu;
  chuongDangSoanRef.current = snapshot?.in_progress_chapter ?? undefined;

  /* ── 1. danh sách tác phẩm ─────────────────────────────────────────── */
  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi(undefined);

    layWorkshop()
      .then((ws) => {
        if (huy) return;
        setWorkshop(ws);
        const muon = tacPhamTuUrl();
        const co = ws.books.find((b) => b.id === muon);
        const chon = co?.id ?? ws.books[0]?.id;
        setTacPham(chon);
        if (!chon) {
          setDangTai(false);
          // Không có tác phẩm thì không có dòng sự kiện nào được mở.
          setKetNoi('khong');
        }
        // Chương từ URL chỉ có nghĩa khi đúng tác phẩm đó.
        if (co) setChuongChon(chuongTuUrl());
      })
      .catch((e: unknown) => {
        if (huy) return;
        setLoi(e instanceof Error ? e.message : String(e));
        setDangTai(false);
      });

    return () => {
      huy = true;
    };
  }, [lanTai]);

  /* ── 2. snapshot của tác phẩm đang xem ─────────────────────────────── */
  const napSnapshot = useCallback(async (id: string, chuong: number | undefined) => {
    const snap = await laySnapshot(id, chuong);
    setSnapshot(snap);
    // Chỉ nhảy về mốc của snapshot khi chưa nhận sự kiện nào; nếu stream đã
    // đi xa hơn thì lùi lại sẽ phát lại những sự kiện vừa xử lý.
    if (snap.queue_seq > seqRef.current) seqRef.current = snap.queue_seq;
    return snap;
  }, []);

  useEffect(() => {
    if (!tacPham) return;
    let huy = false;
    setDangTai(true);
    setLoi(undefined);
    seqRef.current = 0;
    setSuKien([]);
    setSong(undefined);
    // Bộ đệm văn sống thuộc về MỘT tác phẩm. Giữ lại khi đổi cuốn là trưng chữ của cuốn
    // trước dưới tiêu đề của cuốn sau — và không có gì trên màn hình nói ra chuyện đó.
    setVanSong(BO_DEM_RONG);

    napSnapshot(tacPham, chuongTuUrl())
      .catch((e: unknown) => {
        if (!huy) setLoi(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });

    layHoSo(tacPham)
      .then((p) => {
        if (!huy) setHoSo(p);
      })
      .catch(() => {
        if (!huy) setHoSo(undefined);
      });

    return () => {
      huy = true;
    };
  }, [tacPham, lanTai, napSnapshot]);

  /* ── 3. dòng sự kiện ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!tacPham || !snapshot) return;

    // Mở stream một lần cho mỗi tác phẩm, từ mốc của snapshot đầu tiên. Không
    // đưa `snapshot` vào deps: mỗi lần làm mới snapshot sẽ đóng/mở lại stream
    // và mất các sự kiện đến trong khoảng đó.
    const batDauTu = seqRef.current;
    setKetNoi('dang-mo');

    const nguon: EventSource | DongGia = LA_MOCK
      ? new DongGia()
      : new EventSource(duongSuKien(tacPham, batDauTu));

    const nhan = (raw: MessageEvent) => {
      let tho: unknown;
      try {
        tho = JSON.parse(raw.data as string);
      } catch {
        return; // một mục hỏng không được giết cả dòng
      }
      // Trùng do kết nối lại, hoặc một payload không mang `seq` — xem lib/dongSuKien.ts.
      const ev = nhanSuKienUi(tho, seqRef.current);
      if (!ev) return;
      seqRef.current = ev.seq;
      setKetNoi('song');

      setSuKien((truoc) => [ev, ...truoc].slice(0, GIU_SU_KIEN));
      const cd = congDoanTu(ev);
      if (cd) setSong(cd);

      // Gộp một nhịp rồi mới đọc lại snapshot: bảng chương, trục và transport
      // phải theo kịp mà không tải lại trang.
      if (henRef.current) clearTimeout(henRef.current);
      henRef.current = setTimeout(() => {
        const id = tacPhamRef.current;
        if (id) void napSnapshot(id, chuongRef.current).catch(() => undefined);
      }, NHIP_LAM_MOI_MS);
    };

    /**
     * Văn sống đi ĐƯỜNG RIÊNG, và ba điểm khác biệt dưới đây đều là lý do nó phải riêng:
     *
     *   1. payload không có `seq`, nên nó không được chạm vào mốc nối lại của stream;
     *   2. nó không phải một sự kiện, nên không vào danh sách `suKien`;
     *   3. nó KHÔNG được đặt lại hẹn làm mới snapshot. Nhịp delta đã đo là trung vị 2ms, mà
     *      hẹn là 1500ms — mỗi mẩu đặt lại hẹn một lần thì hẹn không bao giờ tới hạn, và
     *      bảng chương, trục, transport đứng im suốt lúc engine đang viết.
     */
    const nhanDelta = (raw: MessageEvent) => {
      let d: { text?: unknown };
      try {
        d = JSON.parse(raw.data as string) as { text?: unknown };
      } catch {
        return;
      }
      if (typeof d.text !== 'string' || !d.text) return;
      setKetNoi('song');
      setVanSong((b) => themChu(b, d.text as string));
    };

    const nhanXoa = () => {
      setKetNoi('song');
      setVanSong((b) => moLuot(b, nhanVach(chuongDangSoanRef.current, new Date())));
    };

    for (const loai of LOAI_SU_KIEN_UI) nguon.addEventListener(loai, nhan);
    nguon.addEventListener(LOAI_VAN_SONG[0], nhanDelta);
    nguon.addEventListener(LOAI_VAN_SONG[1], nhanXoa);

    if (nguon instanceof EventSource) {
      nguon.onopen = () => setKetNoi('song');
      // EventSource tự kết nối lại và tự gửi Last-Event-ID; chỉ cần báo cho
      // người dùng biết đang mất kết nối, không tự dựng lại vòng thử.
      nguon.onerror = () => {
        setKetNoi(nguon.readyState === EventSource.CLOSED ? 'mat' : 'dang-mo');
      };
    } else {
      setKetNoi('song');
    }

    return () => {
      if (henRef.current) clearTimeout(henRef.current);
      nguon.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tacPham, lanTai, !!snapshot, napSnapshot]);

  /* ── hành động ─────────────────────────────────────────────────────── */

  const chonTacPham = useCallback((id: string) => {
    setChuongChon(undefined);
    setSnapshot(undefined);
    setHoSo(undefined);
    setTacPham(id);
    ghiUrl(id, undefined, khuRef.current);
  }, []);

  const chonChuong = useCallback(
    (n: number) => {
      setChuongChon(n);
      const id = tacPhamRef.current;
      if (!id) return;
      ghiUrl(id, n, khuRef.current);
      void napSnapshot(id, n).catch((e: unknown) => {
        setLoi(e instanceof Error ? e.message : String(e));
      });
    },
    [napSnapshot],
  );

  const chonKhu = useCallback((k: Khu) => {
    setKhu(k);
    const id = tacPhamRef.current;
    if (id) ghiUrl(id, chuongRef.current, k);
  }, []);

  /**
   * Mở một tác phẩm VỪA TẠO: đổi tác phẩm và đổi khu trong MỘT hành động.
   *
   * # Vì sao không gọi `chonTacPham` rồi `chonKhu`
   *
   * Ba dòng `xxxRef.current = xxx` ở trên chạy trong lúc RENDER. Gọi hai hành động liền nhau
   * trong cùng một event handler thì React gộp hai lần đặt state và KHÔNG render ở giữa, nên
   * `tacPhamRef.current` bên trong `chonKhu` vẫn là cuốn CŨ. Hệ quả đo được: `ghiUrl` ghi
   * `?tp=<cuốn cũ>` đè lên cuốn mới, và `?ch=` mang theo số chương của cuốn cũ — tải lại
   * trang là quay về cuốn trước, đọc một chương không thuộc cuốn đang xem.
   *
   * Đây đúng cái bẫy mà chú thích của `ghiUrl` đã cảnh báo ("có hai chỗ ghi thì chỗ nào chạy
   * sau sẽ xóa tham số của chỗ kia"), chỉ là lần này hai chỗ ghi nằm trong hai hành động
   * chạy trong cùng một nhịp. Nên hành động này ghi URL đúng một lần, với cả ba mảnh.
   */
  /**
   * Mở một chương ĐỂ ĐỌC: chọn chương và sang bề mặt đọc trong một hành động.
   *
   * Cùng lý do như `moTacPhamVuaTao` — và lần này lỗi đã ĐO ĐƯỢC: dải việc tiếp theo gọi
   * `chonChuong(1)` rồi `chonKhu('ban-thao')`, và URL kết quả là `?tp=…&khu=ban-thao`,
   * MẤT `ch=1`. Vì `chonKhu` đọc `chuongRef.current` mà ref đó chỉ được đặt lại lúc render,
   * nên nó vẫn thấy "chưa chọn chương" và ghi URL không có chương.
   *
   * Hư hại không thấy ngay vì bề mặt đọc tự chọn chương khi vào mà chưa có (DocTruyen.tsx):
   * mở chương 7 rồi tải lại trang thì nó im lặng đưa về chương 1. Tức URL — thứ được thiết
   * kế để giữ đúng chỗ đang xem — nói sai, và cơ chế cứu ở tầng trên che mất chuyện đó.
   */
  const docChuong = useCallback(
    (n: number) => {
      setChuongChon(n);
      setKhu('ban-thao');
      const id = tacPhamRef.current;
      if (!id) return;
      ghiUrl(id, n, 'ban-thao');
      void napSnapshot(id, n).catch((e: unknown) => {
        setLoi(e instanceof Error ? e.message : String(e));
      });
    },
    [napSnapshot],
  );

  const moTacPhamVuaTao = useCallback((id: string) => {
    setChuongChon(undefined);
    setSnapshot(undefined);
    setHoSo(undefined);
    setTacPham(id);
    setKhu(KHU_MAC_DINH);
    ghiUrl(id, undefined, KHU_MAC_DINH);
  }, []);

  const taiLai = useCallback(() => setLanTai((n) => n + 1), []);

  return useMemo(
    () => ({
      workshop,
      tacPham,
      snapshot,
      hoSo,
      chuongChon: chuongChon ?? snapshot?.selected?.chapter,
      khu,
      song,
      suKien,
      vanSong,
      ketNoi,
      dangTai,
      loi,
      chonTacPham,
      chonChuong,
      chonKhu,
      moTacPhamVuaTao,
      docChuong,
      taiLai,
    }),
    [
      workshop,
      tacPham,
      snapshot,
      hoSo,
      chuongChon,
      khu,
      song,
      suKien,
      vanSong,
      ketNoi,
      dangTai,
      loi,
      chonTacPham,
      chonChuong,
      chonKhu,
      moTacPhamVuaTao,
      docChuong,
      taiLai,
    ],
  );
}
