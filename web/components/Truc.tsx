'use client';

import { CHU, GIAI_THICH, TRANG_THAI_KHOI, TRANG_THAI_VACH } from '@/lib/nhan';
import {
  chuongTaiDiem,
  doTruc,
  hoVach,
  mocThuoc,
  nhanPhamVi,
  nhomVach,
  phamViGon,
} from '@/lib/truc';
import type { Capabilities, ChapterMark, LaneBlock, MarkState, Timeline } from '@/lib/types';

/**
 * Trục sản xuất ba lane: Tập → Cung → Chương.
 *
 * Sản xuất là cấp bậc, không phải danh sách — ba lane nằm trên cùng một trục
 * ngang, độ rộng khối tỉ lệ với phạm vi thật, nên nhìn vào thấy được "đang ở
 * đâu trong toàn bộ công trình".
 */
export function Truc({
  timeline,
  capabilities,
  chuongChon,
  onChonChuong,
}: {
  timeline: Timeline;
  capabilities: Capabilities;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
}) {
  const marks = timeline.chapters ?? [];
  const tong = marks.length;

  // layered_outline === false → truyện ngắn/vừa, không có tập/cung. Ẩn hai lane
  // trên thay vì vẽ lane rỗng: lane rỗng trông như dữ liệu bị mất.
  const phanTang = capabilities.layered_outline;

  if (tong === 0 && !phanTang) {
    return <p className="trongSect">{GIAI_THICH.chuongChuaCoDuLieu}</p>;
  }

  return (
    <>
      <div className="lanes">
        {phanTang ? (
          <>
            <div className="lane-lbl" id="lane-tap">
              {CHU.tap}
            </div>
            <Lane blocks={timeline.volumes} tien="T" nhanLane="tập" />

            <div className="lane-lbl" id="lane-cung">
              {nhanLaneCung(timeline.volumes)}
            </div>
            <Lane blocks={timeline.arcs} tien="C" nhanLane="cung" />
          </>
        ) : null}

        <div className="lane-lbl">{CHU.chuong}</div>
        <div>
          <LaneChuong marks={marks} chuongChon={chuongChon} onChonChuong={onChonChuong} />
          <div className="ruler" aria-hidden="true">
            {mocThuoc(tong).map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      <ChuGiai marks={marks} />
    </>
  );
}

/** Nhãn lane cung nói rõ nó là cung của TẬP NÀO, không phải mọi cung. */
function nhanLaneCung(volumes: LaneBlock[]): string {
  const dangChay = volumes.find((v) => v.state === 'running');
  return dangChay ? `${CHU.cung}, tập ${dangChay.index}` : CHU.cung;
}

function Lane({
  blocks,
  tien,
  nhanLane,
}: {
  blocks: LaneBlock[];
  tien: string;
  nhanLane: string;
}) {
  if (blocks.length === 0) {
    return (
      <div className="lane">
        <span className="blk planned" style={{ flex: '1 1 0' }}>
          <span className="txt">chưa có {nhanLane} nào được quy hoạch</span>
        </span>
      </div>
    );
  }

  const daDo = doTruc(blocks);

  return (
    <div className="lane" role="group" aria-label={`Trục ${nhanLane}`}>
      {daDo.map((b) => {
        const tt = TRANG_THAI_KHOI[b.state];
        const phamVi = nhanPhamVi(b);
        const soChuong = b.chuaBietPhamVi
          ? undefined
          : `${b.chapters} chương${b.estimated ? ' (dự kiến)' : ''}`;

        // Chú giải gộp mọi điều biết được về khối, kể cả điều KHÔNG biết.
        const chuGiai = [
          b.title,
          tt.nhan,
          phamVi,
          soChuong,
          b.chuaBietPhamVi ? GIAI_THICH.chuaBietPhamVi : undefined,
          b.estimated && !b.chuaBietPhamVi ? GIAI_THICH.soDuKien : undefined,
          b.final ? 'tập chốt' : undefined,
        ]
          .filter(Boolean)
          .join(' · ');

        return (
          <span
            key={`${tien}${b.index}`}
            className={`blk ${b.state}${b.chuaBietPhamVi ? ' chuabiet' : ''}`}
            // Trọng số, KHÔNG phải `chapters` trực tiếp: `chapters === 0` nghĩa
            // là chưa biết, nhân với 0 thì khối biến mất khỏi trục.
            // Bề rộng tối thiểu để ở CSS (--khoi-min) vì nó đổi theo điểm ngắt.
            style={{ flexGrow: b.trongSo, flexShrink: 1, flexBasis: 0 }}
            title={chuGiai}
          >
            <span className="ky" aria-hidden="true">
              {tt.ky}
            </span>
            <span className="idx">
              {tien}
              {b.index}
            </span>
            <span className="txt">· {phamViGon(b) ?? tt.nhan}</span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Lane chương: một vạch một chương.
 *
 * `role="img"` với `aria-label` tổng hợp: 300 phần tử rỗng là tiếng ồn cho
 * trình đọc màn hình, còn một câu tóm tắt thì dùng được. Bảng chương ngay dưới
 * mới là chỗ điều hướng bằng bàn phím.
 */
function LaneChuong({
  marks,
  chuongChon,
  onChonChuong,
}: {
  marks: ChapterMark[];
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
}) {
  const ho = hoVach(marks.length);
  const dem = demTrangThai(marks);
  const nhan = tomTatTruc(marks.length, dem);

  // Lane thưa: vẽ từng chương, có khoảng hở, đếm được bằng mắt.
  if (ho > 0) {
    return (
      <div className="chlane" role="img" aria-label={nhan} style={{ gap: `${ho}px` }}>
        {marks.map((m) => (
          <i
            key={m.chapter}
            className={m.state}
            onClick={() => onChonChuong(m.chapter)}
            title={`chương ${m.chapter} · ${TRANG_THAI_VACH[m.state].nhan}`}
            style={{
              borderRadius: 1.5,
              outline: m.chapter === chuongChon ? '1px solid var(--ink)' : undefined,
              outlineOffset: 1,
            }}
          />
        ))}
      </div>
    );
  }

  // Lane dày: gộp dải để một dãy chương cùng trạng thái là một khối liền, không
  // phải vạch sọc do làm mờ dưới điểm ảnh.
  return (
    <div className="chlane" role="img" aria-label={nhan}>
      {nhomVach(marks).map((d) => (
        <i
          key={d.from}
          className={d.state}
          style={{
            flexGrow: d.len,
            flexShrink: 1,
            flexBasis: 0,
            // Chương đang chọn nằm trong dải này: đánh dấu bằng vạch sáng để
            // thấy được vị trí trên một trục 300 chương.
            boxShadow:
              chuongChon !== undefined && chuongChon >= d.from && chuongChon <= d.to
                ? 'inset 0 0 0 1px var(--ink)'
                : undefined,
          }}
          title={
            d.len === 1
              ? `chương ${d.from} · ${TRANG_THAI_VACH[d.state].nhan}`
              : `chương ${d.from}–${d.to} (${d.len}) · ${TRANG_THAI_VACH[d.state].nhan}`
          }
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onChonChuong(chuongTaiDiem(d, (e.clientX - r.left) / r.width));
          }}
        />
      ))}
    </div>
  );
}

function demTrangThai(marks: Pick<ChapterMark, 'state'>[]): Record<MarkState, number> {
  const d: Record<MarkState, number> = {
    done: 0,
    running: 0,
    rewrite: 0,
    gate: 0,
    pending: 0,
  };
  for (const m of marks) d[m.state] += 1;
  return d;
}

function tomTatTruc(tong: number, dem: Record<MarkState, number>): string {
  const phan: string[] = [`${tong} chương`];
  for (const [ma, n] of Object.entries(dem) as [MarkState, number][]) {
    if (n > 0) phan.push(`${n} ${TRANG_THAI_VACH[ma].nhan}`);
  }
  return phan.join(', ');
}

/**
 * Chú giải chỉ liệt kê trạng thái CÓ MẶT trên trục. Chú giải đầy đủ cho một
 * tác phẩm không có chương nào bị trả về chỉ dạy người đọc một trạng thái họ
 * không cần tìm.
 */
function ChuGiai({ marks }: { marks: Pick<ChapterMark, 'state'>[] }) {
  const co = new Set(marks.map((m) => m.state));
  const thuTu: MarkState[] = ['done', 'running', 'rewrite', 'gate', 'pending'];
  const hien = thuTu.filter((s) => co.has(s));
  if (hien.length === 0) return null;

  return (
    <div className="keys">
      {hien.map((s) => {
        const tt = TRANG_THAI_VACH[s];
        return (
          <span key={s}>
            <b className={`swatch-${s}`} style={{ background: mauVach(s) }} />
            <span className="ky" aria-hidden="true">
              {tt.ky}
            </span>
            {tt.nhan}
          </span>
        );
      })}
    </div>
  );
}

/** Cùng công thức màu với `.chlane i` để chú giải không lệch khỏi trục. */
function mauVach(s: MarkState): string {
  switch (s) {
    case 'done':
      return 'color-mix(in oklch, var(--teal) 62%, var(--panel))';
    case 'running':
      return 'var(--gold)';
    case 'rewrite':
      return 'color-mix(in oklch, var(--amber) 68%, var(--panel))';
    case 'gate':
      return 'var(--violet)';
    default:
      return 'var(--panel-2)';
  }
}
