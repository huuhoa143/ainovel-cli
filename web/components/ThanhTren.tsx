'use client';

import { useEffect, useRef, useState } from 'react';

import { tienDo } from '@/lib/dinhdang';
import { CHU, TRANG_THAI_MAY } from '@/lib/nhan';
import type { Book, Workshop } from '@/lib/types';
import type { TinhTrangKetNoi } from '@/lib/useStudio';

/**
 * Thanh trên: bộ chọn tác phẩm + slate tình trạng cả xưởng.
 *
 * Slate tồn tại để hàm ý xưởng có nhiều đầu việc — người vận hành theo dõi
 * nhiều tác phẩm cùng lúc, và câu hỏi đầu tiên khi mở studio sau 6 giờ đi vắng
 * là "còn cái nào đang chạy không".
 */
export function ThanhTren({
  workshop,
  dangXem,
  ketNoi,
  onChon,
}: {
  workshop: Workshop | undefined;
  dangXem: Book | undefined;
  ketNoi: TinhTrangKetNoi;
  onChon: (id: string) => void;
}) {
  const [mo, setMo] = useState(false);
  const boc = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài hoặc Esc thì đóng — danh sách này che canvas.
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (!boc.current?.contains(e.target as Node)) setMo(false);
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMo(false);
    };
    document.addEventListener('mousedown', ngoai);
    document.addEventListener('keydown', phim);
    return () => {
      document.removeEventListener('mousedown', ngoai);
      document.removeEventListener('keydown', phim);
    };
  }, [mo]);

  const sach = workshop?.books ?? [];
  const dangChay = sach.filter((b) => b.activity === 'running').length;
  const nhieuHon1 = sach.length > 1;

  return (
    <header className="bar">
      <div className="logo">
        {CHU.sanPham} <em>{CHU.beMat}</em>
      </div>

      {dangXem ? (
        <div className="pickwrap" ref={boc}>
          <button
            type="button"
            className="picker"
            aria-haspopup={nhieuHon1 ? 'listbox' : undefined}
            aria-expanded={nhieuHon1 ? mo : undefined}
            aria-label={CHU.chonTacPham}
            disabled={!nhieuHon1}
            onClick={() => setMo((v) => !v)}
          >
            <b>{tenSach(dangXem)}</b>
            <span className="meta">
              {tienDo(dangXem.completed_chapters, dangXem.total_chapters)}
            </span>
            {nhieuHon1 ? (
              <span className="chev" aria-hidden="true">
                ▼
              </span>
            ) : null}
          </button>

          {mo && nhieuHon1 ? (
            <ul className="picklist" role="listbox" aria-label={CHU.chonTacPham}>
              {sach.map((b) => {
                const tt = TRANG_THAI_MAY[b.activity];
                return (
                  <li key={b.id} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={b.id === dangXem.id}
                      aria-current={b.id === dangXem.id}
                      onClick={() => {
                        setMo(false);
                        if (b.id !== dangXem.id) onChon(b.id);
                      }}
                    >
                      <span className={`st ${tt.mau}`} title={tt.nhan}>
                        <span className="ky" aria-hidden="true">
                          {tt.ky}
                        </span>
                      </span>
                      <span className="ten">
                        {b.name ? b.name : <em>{b.id}</em>}
                      </span>
                      <span className="sl">
                        {tienDo(b.completed_chapters, b.total_chapters)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {sach.length > 0 ? (
        <div className="slate" title={CHU.tacPhamKhac}>
          {sach.slice(0, 8).map((b) => (
            <span
              key={b.id}
              className={`dot ${b.activity}`}
              title={`${b.name || b.id} · ${TRANG_THAI_MAY[b.activity].nhan}`}
            />
          ))}
          <span className="chu">{CHU.demTacPham(sach.length, dangChay)}</span>
        </div>
      ) : null}

      <div className="right">
        <span className="kbd live" data-tt={ketNoi} title={tenKetNoi(ketNoi)}>
          <span className="dot" aria-hidden="true" />
          {tenKetNoi(ketNoi)}
        </span>
      </div>
    </header>
  );
}

function tenSach(b: Book): string {
  return b.name ? b.name : b.id;
}

/** Nhãn của tình trạng stream — chữ, không chỉ màu đốm. */
function tenKetNoi(t: TinhTrangKetNoi): string {
  switch (t) {
    case 'song':
      return 'dòng sự kiện';
    case 'mat':
      return 'mất kết nối';
    // Xưởng rỗng: không có tác phẩm nên không mở dòng nào. Nói "đang mở dòng" ở
    // đây là một câu không bao giờ thành sự thật.
    case 'khong':
      return 'chưa mở dòng';
    default:
      return 'đang mở dòng';
  }
}
