'use client';

import { useRef, type RefObject } from 'react';

import { SAN_BAN_PX, kepCot, kepHang, kepTruc, type CoBan } from '@/lib/keoBan';
import { CHU, GIAI_THICH } from '@/lib/nhan';

/** Bước của một lần bấm phím mũi tên, tính bằng pixel. */
const BUOC_PX = 16;

/** Bước khi giữ Shift — kéo nhanh qua cả bàn mà không phải giữ mũi tên. */
const BUOC_NHANH_PX = 64;

/**
 * MỘT THANH CHIA — khuôn chung của cả ba ranh giới kéo được của buồng lái.
 *
 * # Vì sao một khuôn cho cả ba, dù chúng lưu ba đơn vị khác nhau
 *
 * Ba ranh giới lưu `%` (cột), `fr` (hàng) và `px` (trục) — ba đơn vị, vì ba thứ chúng chia
 * khác nhau về bản chất (xem `lib/keoBan.ts`). Nhưng phần KÉO thì giống hệt: bắt con trỏ,
 * nghe trên `window`, khoá con trỏ trang, ghi thẳng lên DOM, chốt lúc thả tay, cộng bàn phím
 * và đường về. Chép ba bản của phần đó là ba chỗ để quên `removeEventListener`.
 *
 * Nên khuôn này giữ CÁCH KÉO, còn người gọi giữ Ý NGHĨA: `doTuConTro` đo ra giá trị, `ghi`
 * ghi lên DOM, `chot` cất vào state. Khuôn không biết mình đang chia cái gì.
 *
 * # Vì sao `role="separator"` có `tabIndex`
 *
 * `PRODUCT.md` xếp bàn phím là hạng nhất, và một bộ chia chỉ kéo được bằng chuột là một điều
 * khiển mà người dùng bàn phím không có đường nào tới. Đây là khuôn "window splitter" chuẩn:
 * trình đọc màn hình đọc ra đây là một thanh chia, `aria-valuenow` cho biết nó đang ở đâu.
 *
 * # Vì sao lúc kéo KHÔNG đi qua state React
 *
 * Một `setState` cho mỗi `pointermove` là ~120 lần render một giây của bề mặt đắt nhất
 * studio, và mỗi lần render đó kéo theo cả bốn ô — trong đó có khu văn sống đang nhận delta
 * nhịp 2ms. Nên lúc kéo, giá trị được ghi THẲNG vào biến CSS; state chỉ đặt một lần lúc thả.
 *
 * Việc đó an toàn với React chứ không phải một mẹo bẩn: React chỉ chạm những thuộc tính
 * `style` mà nó thấy ĐỔI giữa hai lần render. Trong lúc kéo không có lần render nào, và lúc
 * thả tay thì state được đặt đúng bằng giá trị đang nằm trên DOM.
 *
 * # Vì sao nghe trên `window` chứ không `setPointerCapture`
 *
 * Capture là đường quen hơn, và nó đã bị BỎ sau khi thử: capture hỏng được vì những lý do
 * ngoài tầm của mã này (con trỏ không còn hoạt động, phần tử bị thay giữa chừng), và lúc nó
 * hỏng thì thanh chia chết IM LẶNG — không lỗi nào, chỉ là kéo mà không gì nhúc nhích.
 * `window` không có ca đó, và giải luôn bài toán capture sinh ra để giải: con trỏ đi ra ngoài
 * dải 9px vẫn kéo tiếp.
 */
function ThanhChia({
  ma,
  huong,
  nhan,
  valueNow,
  doTuConTro,
  tuPx,
  pxHienTai,
  ghi,
  chot,
  datLai,
}: {
  /** Hậu tố lớp: `doc` · `ngang` · `truc`. */
  ma: string;
  huong: 'doc' | 'ngang';
  nhan: string;
  valueNow?: number;
  /** Toạ độ con trỏ → giá trị đã kẹp, hoặc `undefined` khi chưa đo được. */
  doTuConTro: (toaDo: number) => number | undefined;
  /** Chiều dài mới tính bằng PIXEL → giá trị đã kẹp. Đường của bàn phím. */
  tuPx: (px: number) => number | undefined;
  /** Chiều dài HIỆN TẠI tính bằng pixel, để bàn phím biết cộng vào đâu. */
  pxHienTai: () => number | undefined;
  ghi: (v: number) => void;
  chot: (v: number) => void;
  datLai: () => void;
}) {
  /** Giá trị mới nhất đã ghi lên DOM giữa lúc kéo. `undefined` = chưa dịch lần nào. */
  const dangKeo = useRef<number | undefined>(undefined);

  const batDau = (e: React.PointerEvent<HTMLDivElement>) => {
    // Nhấp đúp = về mặc định. Bắt ở đây thay vì `onDoubleClick` vì một cú nhấp đúp cũng phát
    // `pointerdown`, và nếu để nó vào chế độ kéo thì lần nhả thứ hai chốt lại đúng cỡ vừa
    // được đặt lại.
    if (e.detail >= 2) {
      datLai();
      dangKeo.current = undefined;
      return;
    }
    e.preventDefault();
    // `undefined` = CHƯA dịch. Một cú bấm rồi nhả không dịch chuột phải không đổi gì cả;
    // khởi tạo bằng một con số thì cú bấm đó tự chốt một cỡ.
    dangKeo.current = undefined;
    const lop = huong === 'doc' ? 'dangKeoDoc' : 'dangKeoNgang';
    document.body.classList.add(lop);
    // Lớp trên `body` lo CON TRỎ (theo trục); dấu sáng thì bám chính thanh đang kéo, vì hai
    // thanh ngang dùng chung con trỏ `row-resize` nên chung cả lớp.
    const el = e.currentTarget;
    el.dataset.dangKeo = '';

    const di = (ev: PointerEvent) => {
      const v = doTuConTro(huong === 'doc' ? ev.clientX : ev.clientY);
      if (v === undefined) return;
      ghi(v);
      dangKeo.current = v;
    };
    const len = () => {
      window.removeEventListener('pointermove', di);
      window.removeEventListener('pointerup', len);
      window.removeEventListener('pointercancel', len);
      document.body.classList.remove('dangKeoDoc', 'dangKeoNgang');
      delete el.dataset.dangKeo;
      const v = dangKeo.current;
      dangKeo.current = undefined;
      if (v !== undefined) chot(v);
    };
    window.addEventListener('pointermove', di);
    window.addEventListener('pointerup', len);
    window.addEventListener('pointercancel', len);
  };

  const banPhim = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      datLai();
      return;
    }
    // Mũi tên "tiến" là hướng làm vùng TRƯỚC thanh chia nhỏ đi, ở cả hai trục.
    const tien = huong === 'doc' ? e.key === 'ArrowLeft' : e.key === 'ArrowUp';
    const lui = huong === 'doc' ? e.key === 'ArrowRight' : e.key === 'ArrowDown';
    if (!tien && !lui) return;
    e.preventDefault();

    const px = pxHienTai();
    if (px === undefined) return;
    // Đi qua PIXEL rồi mới đổi lại đơn vị lưu, để một bước phím là một khoảng cách như nhau ở
    // mọi cỡ màn hình. Cộng thẳng vào `%` hay `fr` thì cùng một phím dịch 4px ở laptop và
    // 11px ở màn 27".
    const buoc = (e.shiftKey ? BUOC_NHANH_PX : BUOC_PX) * (tien ? -1 : 1);
    const v = tuPx(px + buoc);
    if (v === undefined) return;
    ghi(v);
    chot(v);
  };

  return (
    <div
      className={`blkeo blkeo-${ma}`}
      role="separator"
      tabIndex={0}
      aria-orientation={huong === 'doc' ? 'vertical' : 'horizontal'}
      aria-label={nhan}
      aria-valuenow={valueNow}
      title={GIAI_THICH.keoBanHuongDan}
      onPointerDown={batDau}
      onKeyDown={banPhim}
    />
  );
}

/**
 * Hai thanh chia CỦA BÀN — một dọc giữa hai cột, một ngang giữa hai hàng.
 *
 * Cả hai đều là con của `.blsan` và đè lên đúng đường lưới của nó, nên chúng không chiếm
 * track nào: một track riêng cho thanh chia sẽ làm mọi phép đo tỉ lệ trong `globals.css`
 * lệch đi đúng bề rộng track đó.
 */
export function KeoBan({
  banRef,
  co,
  datCo,
  datLai,
}: {
  /** Phần tử `.blsan` — hai thanh chia đo và ghi thẳng lên nó. */
  banRef: RefObject<HTMLDivElement | null>;
  co: CoBan;
  datCo: (moi: CoBan) => void;
  datLai: (truc: keyof CoBan) => void;
}) {
  const o = () => banRef.current?.getBoundingClientRect();
  const ghiVar = (ten: string, v: string) =>
    banRef.current?.style.setProperty(ten, v);

  return (
    <>
      <ThanhChia
        ma="doc"
        huong="doc"
        nhan={CHU.keoCot}
        valueNow={co.cot !== undefined ? Math.round(co.cot) : undefined}
        doTuConTro={(x) => {
          const r = o();
          return r && kepCot(r.right - x, r.width);
        }}
        tuPx={(px) => {
          const r = o();
          return r && kepCot(px, r.width);
        }}
        pxHienTai={() => {
          const r = o();
          if (!r) return undefined;
          return co.cot !== undefined ? (co.cot / 100) * r.width : docCotThat(banRef.current!, r.width);
        }}
        ghi={(v) => ghiVar('--bl-phai', `${v}%`)}
        chot={(v) => datCo({ cot: v })}
        datLai={() => datLai('cot')}
      />
      <ThanhChia
        ma="ngang"
        huong="ngang"
        nhan={CHU.keoHang}
        valueNow={
          co.hang !== undefined ? Math.round((co.hang / (co.hang + 1)) * 100) : undefined
        }
        doTuConTro={(y) => {
          const r = o();
          return r && kepHang(y - r.top, r.height);
        }}
        tuPx={(px) => {
          const r = o();
          return r && kepHang(px, r.height);
        }}
        // Bàn phím trên trục dọc dịch chiều cao HÀNG TRÊN, nên px hiện tại là chiều cao đó.
        pxHienTai={() => {
          const r = o();
          if (!r) return undefined;
          return co.hang !== undefined ? (co.hang / (co.hang + 1)) * r.height : r.height / 2;
        }}
        ghi={(v) => ghiVar('--bl-tren', `${v}fr`)}
        chot={(v) => datCo({ hang: v })}
        datLai={() => datLai('hang')}
      />
    </>
  );
}

/**
 * Thanh chia THỨ BA — giữa trục sản xuất và bàn.
 *
 * Nó là con của `.blgiua` (một flex cột), không của bàn, nên nó không dùng chung cách đặt
 * chỗ với hai thanh kia: nó là một flex item cao 9px với margin âm hai đầu, tức nó đè lên
 * ranh giới mà tổng chiều cao nó thêm vào bằng 0.
 *
 * Trần của nó được ĐO chứ không phải một hằng, và đó là hai ràng buộc cùng lúc:
 *
 *   · chỗ còn lại sau khi bàn giữ đủ sàn 176px và ô can thiệp giữ đủ chiều cao của nó —
 *     không có vế này thì kéo trục xuống là bóp bàn về bốn cái đầu ô;
 *   · chiều cao NỘI DUNG thật của trục — kéo quá mức đó chỉ đẻ ra khoảng trắng giữa hai vùng
 *     dày đặc, đúng thứ bàn chia ô vừa dọn đi.
 */
export function KeoTruc({
  giuaRef,
  co,
  datCo,
  datLai,
}: {
  /** Phần tử `.blgiua`. Biến `--bl-truc` đặt ở đây rồi thừa kế xuống `.bltruc`. */
  giuaRef: RefObject<HTMLDivElement | null>;
  co: CoBan;
  datCo: (moi: CoBan) => void;
  datLai: (truc: keyof CoBan) => void;
}) {
  /** `querySelector` TRONG `giuaRef`, không toàn cục: bộ kiểm dựng nhiều bản trong một DOM. */
  const doTran = () => {
    const giua = giuaRef.current;
    const truc = giua?.querySelector<HTMLElement>('.bltruc');
    if (!giua || !truc) return undefined;
    const canThiep = giua.querySelector<HTMLElement>('.blcanthiep');
    const conLai =
      giua.clientHeight - SAN_BAN_PX - (canThiep?.getBoundingClientRect().height ?? 0);
    return { tran: Math.min(conLai, caoNoiDung(truc)), truc };
  };

  return (
    <ThanhChia
      ma="truc"
      huong="ngang"
      nhan={CHU.keoTruc}
      valueNow={co.truc}
      doTuConTro={(y) => {
        const d = doTran();
        return d && kepTruc(y - d.truc.getBoundingClientRect().top, d.tran);
      }}
      tuPx={(px) => {
        const d = doTran();
        return d && kepTruc(px, d.tran);
      }}
      pxHienTai={() => doTran()?.truc.getBoundingClientRect().height}
      ghi={(v) => giuaRef.current?.style.setProperty('--bl-truc', `${v}px`)}
      chot={(v) => datCo({ truc: v })}
      datLai={() => datLai('truc')}
    />
  );
}

/**
 * Chiều cao border-box mà một khối CẦN để hiện hết nội dung của nó.
 *
 * Không phải `scrollHeight` trần, và chênh lệch là một QUIRK của trình duyệt chứ không phải
 * một phép làm tròn. ĐO ĐƯỢC trên chính `.bltruc` (đệm `8px 18px 9px`, viền dưới 1px):
 *
 *   · lúc KHÔNG cuộn   — `scrollHeight` 143 = nội dung + đệm trên 8 + đệm dưới 9
 *   · lúc ĐANG cuộn    — `scrollHeight` 134 = nội dung + đệm trên 8, ĐỆM DƯỚI RƠI MẤT
 *
 * Cả hai ca đều thiếu viền dưới, vì `scrollHeight` là kích thước padding-box.
 *
 * Hư hại nếu bỏ qua: thanh chia của trục đo trần TRONG LÚC KÉO, tức đúng lúc trục đang cuộn.
 * Trần khi đó hụt 10px so với chiều cao thật (144), nên kéo xuống hết cỡ vẫn dừng ở 134 và
 * lane cuối vẫn bị cắt — người dùng kéo hết tay mà vẫn không thấy đủ ba lane, và không có gì
 * trên màn hình nói vì sao. Đây đúng là lỗi đã đo được ở lần thử đầu.
 */
function caoNoiDung(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const vien = Number.parseFloat(cs.borderBottomWidth) || 0;
  const demDuoi = Number.parseFloat(cs.paddingBottom) || 0;
  const dangCuon = el.scrollHeight > el.clientHeight;
  return el.scrollHeight + vien + (dangCuon ? demDuoi : 0);
}

/**
 * Bề rộng THẬT của cột phải khi chưa ai kéo — đọc từ bố cục đã tính, không đoán.
 *
 * Mặc định của CSS là `clamp(320px, 43%, 460px)`, tức một biểu thức mà giá trị của nó phụ
 * thuộc bề rộng bàn theo ba nhánh. Nhân 43% ở đây là chép lại một trong ba nhánh và sẽ lệch
 * ở hai nhánh kia — bước phím đầu tiên khi đó nhảy một quãng thay vì dịch 16px.
 */
function docCotThat(el: HTMLElement, rongBan: number): number {
  const cot = getComputedStyle(el).gridTemplateColumns.split(' ');
  const phai = Number.parseFloat(cot[cot.length - 1] ?? '');
  return Number.isFinite(phai) ? phai : rongBan * 0.43;
}
