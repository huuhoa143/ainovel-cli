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
  LOAI_SU_KIEN,
  duongSuKien,
  layHoSo,
  laySnapshot,
  layWorkshop,
} from './api';
import type { Profile, Snapshot, StreamEvent, Workshop } from './types';

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
  song: CongDoanSong | undefined;
  suKien: StreamEvent[];
  ketNoi: TinhTrangKetNoi;
  dangTai: boolean;
  loi: string | undefined;
  chonTacPham: (id: string) => void;
  chonChuong: (n: number) => void;
  taiLai: () => void;
}

/** Đọc/ghi tác phẩm đang xem vào query string, để tải lại trang không mất chỗ. */
function tacPhamTuUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search).get('tp') ?? undefined;
}

function ghiUrl(tp: string, chuong: number | undefined) {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams();
  q.set('tp', tp);
  if (chuong) q.set('ch', String(chuong));
  window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
}

function chuongTuUrl(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const v = new URLSearchParams(window.location.search).get('ch');
  const n = v ? Number.parseInt(v, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function useStudio(): Studio {
  const [workshop, setWorkshop] = useState<Workshop>();
  const [tacPham, setTacPham] = useState<string>();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [hoSo, setHoSo] = useState<Profile>();
  const [chuongChon, setChuongChon] = useState<number>();
  const [song, setSong] = useState<CongDoanSong>();
  const [suKien, setSuKien] = useState<StreamEvent[]>([]);
  const [ketNoi, setKetNoi] = useState<TinhTrangKetNoi>('dang-mo');
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string>();
  const [lanTai, setLanTai] = useState(0);

  /** Seq lớn nhất đã thấy — điểm nối lại của stream. */
  const seqRef = useRef(0);
  const henRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tacPhamRef = useRef<string>(undefined);
  const chuongRef = useRef<number | undefined>(undefined);

  tacPhamRef.current = tacPham;
  chuongRef.current = chuongChon;

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
      let ev: StreamEvent;
      try {
        ev = JSON.parse(raw.data as string) as StreamEvent;
      } catch {
        return; // một mục hỏng không được giết cả dòng
      }
      if (ev.seq <= seqRef.current) return; // trùng do kết nối lại
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

    for (const loai of LOAI_SU_KIEN) nguon.addEventListener(loai, nhan);

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
    ghiUrl(id, undefined);
  }, []);

  const chonChuong = useCallback(
    (n: number) => {
      setChuongChon(n);
      const id = tacPhamRef.current;
      if (!id) return;
      ghiUrl(id, n);
      void napSnapshot(id, n).catch((e: unknown) => {
        setLoi(e instanceof Error ? e.message : String(e));
      });
    },
    [napSnapshot],
  );

  const taiLai = useCallback(() => setLanTai((n) => n + 1), []);

  return useMemo(
    () => ({
      workshop,
      tacPham,
      snapshot,
      hoSo,
      chuongChon: chuongChon ?? snapshot?.selected?.chapter,
      song,
      suKien,
      ketNoi,
      dangTai,
      loi,
      chonTacPham,
      chonChuong,
      taiLai,
    }),
    [
      workshop,
      tacPham,
      snapshot,
      hoSo,
      chuongChon,
      song,
      suKien,
      ketNoi,
      dangTai,
      loi,
      chonTacPham,
      chonChuong,
      taiLai,
    ],
  );
}
