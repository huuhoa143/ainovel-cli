'use client';

import { useEffect, useRef, useState } from 'react';

import { layChuong } from '@/lib/api';
import { soTu } from '@/lib/dinhdang';
import type { Tone } from '@/lib/nhan';
import { CHU, GIAI_THICH, TRANG_THAI_CHUONG, nhanKetLuan } from '@/lib/nhan';

import { BanDuyet } from './BanDuyet';
import type { ChapterDetail, ChapterRow, Contract, Review, Snapshot } from '@/lib/types';

/**
 * Bề mặt ĐỌC BẢN THẢO.
 *
 * Đây là câu hỏi thứ ba của người vận hành trong PRODUCT.md — "thành quả đọc ra
 * sao" — và là câu duy nhất mà một thanh tiến độ không trả lời được.
 *
 * Ba quyết định về hình, tất cả đều có lý do bằng chữ:
 *
 *  1. **Khổ đọc 70ch, line-height 1.80, serif.** Serif là dấu hiệu ngữ nghĩa
 *     (DESIGN.md § Typography): thấy serif là thấy văn của tác phẩm, không phải
 *     chữ của công cụ. 1.80 vì dấu tiếng Việt xếp hai tầng — `ế ộ ữ ỗ` ăn khoảng
 *     trên, dấu nặng ăn khoảng dưới, và ở 1.5 thì dấu huyền dòng dưới chạm dấu
 *     nặng dòng trên. DESIGN.md đặt sàn 1.72 cho văn bản và ≥ 1.78 riêng cho khổ
 *     đọc dài; đây là khổ đọc dài.
 *
 *  2. **Cỡ chữ 14.5px, lớn hơn 13px của trích đoạn trong inspector.** Trích đoạn
 *     là số liệu để tra; đây là chỗ đọc liền mấy nghìn từ. Bước cỡ chữ chính là
 *     chỗ nói ra sự khác nhau đó.
 *
 *  3. **Bản duyệt của Editor nằm BÊN LỀ văn, không nằm ở trang khác.** Đây là
 *     thứ phân biệt studio với một trình đọc truyện: người vận hành đọc để kiểm,
 *     nên dẫn chứng của Editor phải ở ngay cạnh câu bị nêu. Khu lề dùng lại đúng
 *     các lớp của D (`.qcrow`, `.vande`, `.kv`) chứ không bê bố cục sáng của
 *     hướng B/C sang.
 */
export function DocTruyen({
  snapshot,
  tacPham,
  chuongChon,
  onChonChuong,
}: {
  snapshot: Snapshot;
  tacPham: string | undefined;
  chuongChon: number | undefined;
  onChonChuong: (n: number) => void;
}) {
  const hang = snapshot.chapters;

  /**
   * Vào bề mặt đọc mà chưa chọn chương thì TỰ chọn chương đọc được đầu tiên.
   *
   * Bản trước hiện "chưa chọn chương" cộng hai nút điều hướng bị vô hiệu — tức bấm "Bản
   * thảo" trong rail xong không thấy truyện, và hai nút duy nhất trên bề mặt thì bấm không
   * ra gì. Người dùng đọc đó là "nút chết", và họ đúng theo nghĩa họ thấy.
   *
   * Ưu tiên `done` rồi `rewrite`: đó là hai công đoạn chắc chắn có tệp bản thảo. Nếu không
   * có chương nào như thế thì KHÔNG chọn gì — lúc đó câu "chưa có chương nào" là sự thật,
   * và tự mở một chương chưa viết ra là dựng một khổ đọc trống.
   */
  useEffect(() => {
    if (chuongChon !== undefined) return;
    const doc =
      hang.find((r) => r.stage === 'done') ?? hang.find((r) => r.stage === 'rewrite');
    if (doc) onChonChuong(doc.chapter);
    // `hang` đổi mỗi nhịp làm mới snapshot; chỉ `chuongChon` mới là điều kiện thật ở đây.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chuongChon]);

  return (
    <main className="canvas khudoc" id="doc-ban-thao">
      <div className="head">
        <h1>{CHU.docBanThao}</h1>
        <span className="sub">{motTa(snapshot)}</span>
        <DieuHuong hang={hang} chuongChon={chuongChon} onChon={onChonChuong} />
      </div>

      <div className="doclayout">
        <DanhSachChuong hang={hang} chuongChon={chuongChon} onChon={onChonChuong} />
        {chuongChon ? (
          <ThanChuong tacPham={tacPham} chuong={chuongChon} />
        ) : (
          <div className="khoDocWrap">
            <p className="trongSect">{GIAI_THICH.docChuaChonChuong}</p>
          </div>
        )}
      </div>
    </main>
  );
}

/** "Trấn Yêu Ký · 2 chương đã chốt · 5.803 từ" — chỉ nói điều biết được. */
function motTa(snap: Snapshot): string {
  const b = snap.book;
  const phan: string[] = [b.name || b.id];
  if (b.completed_chapters > 0) phan.push(`${b.completed_chapters} chương đã chốt`);
  const tu = soTu(b.total_words);
  if (tu) phan.push(`${tu} từ`);
  return phan.join(' · ');
}

/* ── điều hướng chương trước / chương sau ─────────────────────────────── */

/**
 * Chương trước/sau đi theo DANH SÁCH có dấu vết sản xuất, không phải `n ± 1`.
 *
 * Bảng chương của store là hợp của chương đã xong, chương bị trả về và chu kỳ
 * hiện tại — nó có lỗ. Nút "chương sau" nhảy sang `n + 1` sẽ rơi vào một chương
 * chưa tồn tại và bề mặt trả về "chưa có bản thảo", biến một nút điều hướng
 * thành một cái bẫy.
 */
function DieuHuong({
  hang,
  chuongChon,
  onChon,
}: {
  hang: ChapterRow[];
  chuongChon: number | undefined;
  onChon: (n: number) => void;
}) {
  if (hang.length === 0) return null;
  const i = hang.findIndex((r) => r.chapter === chuongChon);
  const truoc = i > 0 ? hang[i - 1] : undefined;
  const sau = i >= 0 && i < hang.length - 1 ? hang[i + 1] : undefined;

  return (
    <div className="docnav">
      <button
        type="button"
        disabled={!truoc}
        title={truoc ? `${CHU.chuong} ${truoc.chapter}` : undefined}
        onClick={() => truoc && onChon(truoc.chapter)}
      >
        <span aria-hidden="true">←</span> {CHU.chuongTruoc}
      </button>
      <button
        type="button"
        disabled={!sau}
        title={sau ? `${CHU.chuong} ${sau.chapter}` : undefined}
        onClick={() => sau && onChon(sau.chapter)}
      >
        {CHU.chuongSau} <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

/* ── danh sách chương đọc được ────────────────────────────────────────── */

function DanhSachChuong({
  hang,
  chuongChon,
  onChon,
}: {
  hang: ChapterRow[];
  chuongChon: number | undefined;
  onChon: (n: number) => void;
}) {
  const oDs = useRef<HTMLElement>(null);

  // Danh sách này cuộn riêng và có thể dài bằng số chương đã sản xuất.
  // ĐO ĐƯỢC với tác phẩm 280/300: mở thẳng chương 270 bằng URL thì danh sách vẫn
  // đứng ở chương 1–23 và chương đang đọc không có trong tầm nhìn — người vận
  // hành không thấy mình đang ở đâu trong danh sách.
  // `block: 'nearest'` để nó cuộn khung danh sách, không kéo cả canvas.
  useEffect(() => {
    const el = oDs.current?.querySelector('[aria-current="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [chuongChon]);

  return (
    <nav className="dsChuong" aria-label={CHU.chonChuongDeDoc} ref={oDs}>
      <h2>{CHU.chonChuongDeDoc}</h2>
      {hang.length === 0 ? (
        <p className="trong">{GIAI_THICH.chuaCoChuong}</p>
      ) : (
        <ul>
          {hang.map((r) => {
            const tt = TRANG_THAI_CHUONG[r.stage];
            return (
              <li key={r.chapter}>
                <button
                  type="button"
                  aria-current={r.chapter === chuongChon}
                  onClick={() => onChon(r.chapter)}
                  title={`${CHU.chuong} ${r.chapter} · ${tt.nhan}`}
                >
                  <span className={`ky ${tt.mau}`} aria-hidden="true">
                    {tt.ky}
                  </span>
                  <span className="so">{r.chapter}</span>
                  <span className="ten">
                    {r.title ? r.title : <em>{CHU.chuaDatTieuDe}</em>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

/* ── thân chương: văn + bản duyệt bên lề ──────────────────────────────── */

function ThanChuong({
  tacPham,
  chuong,
}: {
  tacPham: string | undefined;
  chuong: number;
}) {
  const [ct, setCt] = useState<ChapterDetail>();
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string>();

  useEffect(() => {
    if (!tacPham) return;
    let huy = false;
    setCt(undefined);
    setLoi(undefined);
    setDangTai(true);
    layChuong(tacPham, chuong)
      .then((d) => {
        if (!huy) setCt(d);
      })
      .catch((e: unknown) => {
        if (!huy) setLoi(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, [tacPham, chuong]);

  if (loi) {
    return (
      <div className="khoDocWrap">
        <p className="loiDoc">{loi}</p>
      </div>
    );
  }
  if (dangTai || !ct) {
    return (
      <div className="khoDocWrap">
        <p className="trongSect">{CHU.dangTai}</p>
      </div>
    );
  }

  const doan = ct.text
    .split(/\n{2,}/)
    .map((d) => d.replace(/\n/g, ' ').trim())
    .filter(Boolean);

  return (
    <>
      <div className="khoDocWrap">
        <article className="khoDoc">
          <header className="chuongdau">
            <div className="no">
              {CHU.chuong} {ct.chapter}
            </div>
            <h2>
              {ct.title ? ct.title : <span className="draft">{CHU.chuaDatTieuDe}</span>}
            </h2>
            <ChiSoChuong words={ct.words} review={ct.review} />
          </header>

          {doan.length === 0 ? (
            <p className="trongSect">{GIAI_THICH.chuongTrongStore}</p>
          ) : (
            doan.map((d, i) => (
              // `mocua` là lớp ĐẶT TAY cho đúng một đoạn, không bao giờ là bộ
              // chọn vị trí: `:first-of-type` khớp theo từng phần tử cha nên nó
              // trúng cả dòng thông tin và từng biến "2.980 từ" thành chữ "2."
              // khổng lồ.
              <p key={i} className={i === 0 && moBangChuCai(d) ? 'doan mocua' : 'doan'}>
                {d}
              </p>
            ))
          )}
        </article>
      </div>

      <BenLe contract={ct.contract} review={ct.review} />
    </>
  );
}

/**
 * Drop cap CHỈ khi đoạn mở đầu bằng một chữ cái.
 *
 * Văn tiếng Việt mở đầu bằng gạch đầu dòng thoại (`— Có người dưới đó`) là
 * chuyện thường, và `::first-letter` lúc đó phóng to dấu gạch ngang thành một
 * vệt đen cao ba dòng. Lỗi này ẩn với mọi chương mở bằng chữ, nên phải chặn từ
 * đầu chứ không chờ gặp.
 */
function moBangChuCai(d: string): boolean {
  return /^\p{L}/u.test(d);
}

function ChiSoChuong({ words, review }: { words: number; review: Review | undefined }) {
  const tu = soTu(words);
  const kl = nhanKetLuan(review?.verdict);
  if (!tu && !kl) return null;
  return (
    <div className="chiso">
      {/* "251 từ", không phải "251 số từ": `colSoTu` là nhãn cột của bảng
          chương ("Số từ"), ghép vào câu thì thành một từ dư. */}
      {tu ? <span className="m">{tu} từ</span> : null}
      {kl ? (
        <span className={`st ${kl.mau}`} title={CHU.banDuyetEditor}>
          <span className="ky" aria-hidden="true">
            {kyTheoTone(kl.mau)}
          </span>
          {kl.nhan}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Khu lề: khế ước chương rồi tới bản duyệt.
 *
 * Thứ tự đó không tùy tiện — bản duyệt là phán xét việc chương có làm đúng
 * khế ước hay không, nên đọc khế ước trước thì bản duyệt mới có nghĩa.
 */
function BenLe({
  contract,
  review,
}: {
  contract: Contract | undefined;
  review: Review | undefined;
}) {
  return (
    <aside className="benle" aria-label={CHU.banDuyetEditor}>
      {contract ? <KheUoc contract={contract} /> : null}

      <h3>{CHU.banDuyetEditor}</h3>
      {/* `tieuDe={false}`: tiêu đề đã có ngay trên. `le`: cột này 296px, đúng
          bề rộng mà biến thể `.kvle` được đo cho. */}
      {review ? (
        <BanDuyet review={review} le tieuDe={false} />
      ) : (
        <p className="trong">{GIAI_THICH.banDuyetChuaCo}</p>
      )}
    </aside>
  );
}

function KheUoc({ contract }: { contract: Contract }) {
  return (
    <>
      <h3>{CHU.kheUocChuong}</h3>
      <dl className="kv kvle">
        {contract.core_event ? (
          <>
            <dt title={CHU.sukienTrongTamDay}>{CHU.sukienTrongTam}</dt>
            <dd>{contract.core_event}</dd>
          </>
        ) : null}
        {contract.hook ? (
          <>
            <dt>{CHU.kieuMocCuoi}</dt>
            <dd>{contract.hook}</dd>
          </>
        ) : null}
      </dl>
      {/* Danh sách cảnh PHẢI có nhãn riêng: không có nhãn thì nó nằm ngay dưới
          "Kiểu móc cuối" và đọc như thể bốn cảnh đó là bốn kiểu móc. */}
      {contract.scenes && contract.scenes.length > 0 ? (
        <>
          <h4>{CHU.canhTrongChuong}</h4>
          <ol className="canh canhle">
            {contract.scenes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </>
      ) : null}
    </>
  );
}


/**
 * Ký hiệu đi kèm một kết luận, suy từ tông màu — cùng công thức với Inspector
 * để hai bề mặt không dùng hai bộ ký hiệu cho cùng một kết luận.
 */
function kyTheoTone(mau: Tone): string {
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
