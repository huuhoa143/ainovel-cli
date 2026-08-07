'use client';

import { Fragment } from 'react';

import { layDanY } from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { ArcOutline, OutlineEntry, Snapshot, VolumeOutline } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HopGap, HoSoKhung, MucRong, tinhTrangHoSo } from './HoSoKhung';

/**
 * Dàn ý phân tầng: Tập → Cung → Chương.
 *
 * Cấp bậc phải hiện ra là cấp bậc (Design Principle 1), nên đây là ba mức thụt
 * lồng nhau chứ không phải ba danh sách phẳng cạnh nhau.
 *
 * Điểm dễ nói dối nhất của bề mặt này là **bộ khung**: `arcs === null` nghĩa là
 * tập chưa được Architect mở, `chapters === null` nghĩa là cung chưa mở. Cả hai
 * KHÔNG phải "tập rỗng"/"cung rỗng" — chúng là trạng thái *chưa quy hoạch*,
 * khác về bản chất với *đã quy hoạch mà chưa chạy* trong mô hình cuốn-vòng-cung
 * hai tầng. Trục sản xuất đã phân biệt hai thứ đó bằng vân sọc chéo; ở đây phân
 * biệt bằng chữ và bằng vân trên viền khối.
 */
export function DanY({
  snapshot,
  tacPham,
}: {
  snapshot: Snapshot;
  tacPham: string | undefined;
}) {
  const tai = useHoSo(tacPham, layDanY);
  const tt = tinhTrangHoSo(tai);

  // Bóc MỘT lần ở đây: dòng tóm của khối gập cần số mục, và phần thân cần chính
  // kết quả ấy. Bóc hai lần là hai chỗ có thể lệch nhau.
  const bocPremise = bocTienDe(tai.du?.premise ?? '');
  const soMucTienDe = bocPremise.khoi.filter((k) => k.than.length > 0).length;

  return (
    <HoSoKhung tieuDe={CHU.danYPhanTang} motTa={motTa(snapshot, tai.du?.volumes ?? null)}>
      {tt ?? (
        <>
          {/* TIỀN ĐỀ GẬP LẠI, và mặc định là ĐÓNG.
              Màn này tên là "Dàn ý phân tầng", nhưng tiền đề chiếm trọn hai màn
              hình đầu — thứ người dùng mở khu này để xem (cây Tập → Cung →
              Chương) nằm dưới đáy cuộn. Tiền đề là NỀN, đọc một lần lúc dựng
              sách rồi hiếm khi đọc lại; cây dàn ý là thứ đổi mỗi cung.
              Dòng tóm vẫn nói ra nó có bao nhiêu mục, nên đóng không phải là
              giấu — nó là xếp lại theo tần suất dùng. */}
          <section className="sect">
            <HopGap tieuDe={CHU.tienDe} phu={soMucTienDe > 0 ? CHU.demMucTienDe(soMucTienDe) : undefined}>
              <TienDe boc={bocPremise} />
            </HopGap>
          </section>

          <section className="sect">
            <h2>
              {CHU.tap} → {CHU.cung} → {CHU.chuong}
            </h2>
            {tai.du!.volumes && tai.du!.volumes.length > 0 ? (
              <ol className="cayDanY">
                {tai.du!.volumes.map((v) => (
                  <Tap key={v.index} v={v} />
                ))}
              </ol>
            ) : (
              <MucRong mang={tai.du!.volumes} muc="dàn ý phân tầng" />
            )}
          </section>

          {/* Dàn ý phẳng là CÙNG một sự thật xếp khác cách, nên nó không được
              trình bày như một nguồn thứ hai. Chỉ hiện con số và nói rõ quan hệ. */}
          <section className="sect">
            <h2>{CHU.danYPhang}</h2>
            <p className="trongSect">
              {tai.du!.flat && tai.du!.flat.length > 0
                ? `${tai.du!.flat.length} chương đã mở chi tiết. ${GIAI_THICH.danYPhangGiai}`
                : GIAI_THICH.chuaCoDanY}
            </p>
          </section>
        </>
      )}
    </HoSoKhung>
  );
}

/** Một phần thân: đoạn văn, hoặc một chùm gạch đầu dòng. */
type PhanTienDe = { loai: 'doan'; chu: string } | { loai: 'gach'; muc: string[] };

/** Một mục của tiền đề: tiêu đề markdown + phần thân thuộc về nó. */
interface KhoiTienDe {
  nhan: string;
  than: PhanTienDe[];
}

const DAU_MUC = /^\s*#{1,6}\s+(.*\S)\s*$/;
/* Gạch đầu dòng markdown. `-`, `*`, `+` cho danh sách không thứ tự; `1.`/`1)` cho
   có thứ tự. Cả hai đều xuất hiện trong `premise.md` thật. */
const DAU_GACH = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/;

/**
 * Bóc `premise.md` thành mục có nhãn.
 *
 * # Vì sao phải đọc TỪNG DÒNG, không tách đoạn rồi mới nối
 *
 * Bản trước tách theo dòng trống rồi nối mọi xuống dòng đơn thành dấu cách. Cách
 * đó đúng cho văn xuôi, nhưng `premise.md` không phải văn xuôi — nó là một bản
 * đặc tả có tiêu đề:
 *
 *	## Thể loại và tông điệu
 *	Mạt thế zombie, đô thị thương chiến, dị năng giao dịch hai thế giới…
 *
 * Hai dòng ấy cách nhau đúng MỘT xuống dòng, nên phép nối dán chúng làm một câu
 * và ký tự `##` ở lại giữa đoạn văn. ĐO ĐƯỢC trên tác phẩm thật: **15/15 đoạn**
 * của bề mặt này bắt đầu bằng `#` hoặc `##`, tức toàn bộ cấu trúc của tiền đề
 * biến mất và người đọc nhận một khối chữ có rác markdown rải đều.
 *
 * Tiêu đề là RANH GIỚI, mạnh hơn cả dòng trống. Nên phép bóc chạy theo dòng: gặp
 * `#{1,6}` thì chốt đoạn đang gom và mở mục mới.
 *
 * # Gạch đầu dòng cũng là ranh giới
 *
 * Cùng một lỗi ở cấp thấp hơn, và nó chỉ lộ ra sau khi tiêu đề đã được bóc: mục
 * "Điểm bán khác biệt" viết bằng gạch đầu dòng, nên phép nối dán cả chùm thành
 * một câu chạy dài có dấu `-` rải giữa — "…theo từng giai đoạn. - Hậu cung không
 * chỉ là tình cảm; …". Một danh sách bị đọc thành một câu thì mất luôn phần tin
 * mà việc tách dòng mang: đây là những mục NGANG HÀNG nhau.
 */
function bocTienDe(raw: string): { mo: PhanTienDe[]; ten: string[]; khoi: KhoiTienDe[] } {
  const mo: PhanTienDe[] = [];
  const khoi: KhoiTienDe[] = [];
  let dem: string[] = [];
  let gach: string[] | null = null;
  let trong = false;
  let hien: KhoiTienDe | null = null;

  const day = (p: PhanTienDe) => (hien ? hien.than : mo).push(p);
  const xaDoan = () => {
    const d = dem.join(' ').replace(/\s+/g, ' ').trim();
    dem = [];
    if (d) day({ loai: 'doan', chu: d });
  };
  const xaGach = () => {
    if (gach && gach.length > 0) day({ loai: 'gach', muc: gach });
    gach = null;
  };

  for (const dong of raw.split('\n')) {
    const dauMuc = dong.match(DAU_MUC);
    if (dauMuc) {
      xaDoan();
      xaGach();
      hien = { nhan: dauMuc[1]!, than: [] };
      khoi.push(hien);
      trong = false;
      continue;
    }
    if (dong.trim() === '') {
      // Dòng trống chốt ĐOẠN nhưng KHÔNG chốt danh sách: markdown cho phép gạch
      // đầu dòng cách nhau một dòng trống mà vẫn là một danh sách.
      xaDoan();
      trong = true;
      continue;
    }
    const dauGach = dong.match(DAU_GACH);
    if (dauGach) {
      xaDoan();
      if (!gach) gach = [];
      gach.push(dauGach[1]!);
      trong = false;
      continue;
    }
    // Dòng thường ngay dưới một gạch đầu dòng là phần GÓI TIẾP của chính mục đó,
    // không phải một đoạn mới — trừ khi có dòng trống chen vào giữa.
    if (gach && gach.length > 0 && !trong) {
      gach[gach.length - 1] += ' ' + dong.trim();
      continue;
    }
    xaGach();
    dem.push(dong.trim());
    trong = false;
  }
  xaDoan();
  xaGach();

  // Tiêu đề KHÔNG có thân là tên của chính bản đặc tả (`# Ông Trùm Hai Cõi`), không
  // phải một mục rỗng. Nó đứng riêng ở trên chứ không thành một hàng nhãn trống.
  return { mo, ten: khoi.filter((k) => k.than.length === 0).map((k) => k.nhan), khoi };
}

/**
 * Tiền đề — bản đặc tả tác phẩm, trình bày như một bảng nhãn → giá trị.
 *
 * Đây là cùng ngôn ngữ mà `.kv` đã dùng khắp studio, và nó đúng với bản chất của
 * dữ liệu: tiền đề là một tập câu trả lời có nhãn (thể loại, xung đột cốt lõi,
 * hướng kết cục, vùng cấm), không phải một áng văn. Đọc dọc cột nhãn là quét
 * được cả bản đặc tả mà không phải đọc hết.
 *
 * Vẫn có đường lui: tiền đề viết bằng văn xuôi thuần — không tiêu đề nào — rơi về
 * cách vẽ đoạn như cũ. Ép một bản không có nhãn vào lưới nhãn là bịa ra cấu trúc.
 */
function VeThan({ than, lop }: { than: PhanTienDe[]; lop?: string }) {
  return (
    <>
      {than.map((p, i) =>
        p.loai === 'gach' ? (
          <ul className="tiendeGach" key={i}>
            {p.muc.map((m, j) => (
              <li key={j}>{m}</li>
            ))}
          </ul>
        ) : (
          <p className={lop} key={i}>
            {p.chu}
          </p>
        ),
      )}
    </>
  );
}

function TienDe({ boc }: { boc: ReturnType<typeof bocTienDe> }) {
  const { mo, ten, khoi } = boc;
  const muc = khoi.filter((k) => k.than.length > 0);

  if (mo.length === 0 && khoi.length === 0) {
    return <p className="trongSect">{GIAI_THICH.chuaCoTienDe}</p>;
  }

  if (muc.length === 0) {
    return (
      <>
        {ten.map((t, i) => (
          <p className="tiende" key={`t${i}`}>
            {t}
          </p>
        ))}
        <VeThan than={mo} lop="tiende" />
      </>
    );
  }

  return (
    <>
      {ten.map((t, i) => (
        <p className="tiendeTen" key={`t${i}`}>
          {t}
        </p>
      ))}
      <VeThan than={mo} lop="tiende" />
      <dl className="kv kvtiende">
        {muc.map((k, i) => (
          <Fragment key={i}>
            <dt>{k.nhan}</dt>
            <dd>
              <VeThan than={k.than} />
            </dd>
          </Fragment>
        ))}
      </dl>
    </>
  );
}

function motTa(snap: Snapshot, volumes: VolumeOutline[] | null): string | undefined {
  if (!snap.capabilities.layered_outline) {
    return 'Tác phẩm phẳng — không có tầng tập/cung';
  }
  if (!volumes) return undefined;
  const moRa = volumes.filter((v) => v.arcs && v.arcs.length > 0).length;
  return `${volumes.length} tập · ${moRa} tập đã mở cung`;
}

/**
 * TẬP MỞ SẴN, CUNG ĐÓNG — và tỉ lệ giữa hai mức là lý do.
 *
 * ĐO ĐƯỢC trên tác phẩm thật: mở toàn bộ thì cây này cao **52.589px — 81,2 màn
 * hình** (4 tập, 16 cung, 216 chương, mỗi chương còn kèm trọng tâm, móc cuối và
 * danh sách cảnh). Câu hỏi rẻ nhất của khu — *"Tập 3 có những cung nào"* — trả
 * lời được bằng cách cuộn qua hơn ba mươi màn hình chương của Tập 1 và 2.
 *
 * Gập ở mức CUNG cắt đúng chỗ tốn: 4 dòng tập + 16 dòng cung vừa một màn rưỡi, và
 * đó chính là bản đồ sản xuất mà `PRODUCT.md` đòi ("nhìn vào phải thấy được đang ở
 * đâu trong toàn bộ công trình"). Chương là mức chi tiết, và nó tốn một cú bấm.
 *
 * Tập KHÔNG đóng theo: bốn dòng tập rỗng không nói gì hơn con số đã có ở đầu khu,
 * còn dòng chủ đề và danh sách cung mới là thứ phân biệt tập này với tập kia.
 */
function Tap({ v }: { v: VolumeOutline }) {
  const cung = v.arcs ?? [];
  const daMo = cung.length > 0;
  const dau = (
    <>
      <span className="ma">T{v.index}</span>
      <span className="ten">{v.title}</span>
      {v.final ? <span className="cot">{CHU.tapChot}</span> : null}
    </>
  );

  // Tập chưa mở cung thì KHÔNG có gì để bung — không vẽ nút gập ở đó. Một mũi tên
  // bấm vào chẳng mở ra gì là một lời hứa suông.
  if (!daMo) {
    return (
      <li className="ntap chuamo">
        <div className="nhanhdau">{dau}</div>
        {v.theme ? (
          <p className="phu">
            {CHU.chuDe}: {v.theme}
          </p>
        ) : null}
        <p className="chuamoNoi">{GIAI_THICH.tapChuaMo}</p>
      </li>
    );
  }

  return (
    <li className="ntap">
      <details className="capGap" open>
        <summary className="nhanhdau">{dau}</summary>
        {v.theme ? (
          <p className="phu">
            {CHU.chuDe}: {v.theme}
          </p>
        ) : null}
        <ol className="cayCung">
          {cung.map((a) => (
            <Cung key={a.index} a={a} tap={v.index} />
          ))}
        </ol>
      </details>
    </li>
  );
}

function Cung({ a, tap }: { a: ArcOutline; tap: number }) {
  const chuong = a.chapters ?? [];
  const daMo = chuong.length > 0;
  const dau = (
    <>
      <span className="ma">
        T{tap}·C{a.index}
      </span>
      <span className="ten">{a.title}</span>
      {/* Số chương ở lại DÒNG TÓM: khi cung đóng, đây là thứ duy nhất nói cung này
          đã chạy tới đâu — tức chính lý do để mở nó hay bỏ qua. */}
      <span className="dem">
        {daMo
          ? CHU.soChuongDaMo(chuong.length)
          : a.estimated_chapters
            ? CHU.soChuongDuKien(a.estimated_chapters)
            : GIAI_THICH.chuaBietPhamVi}
      </span>
    </>
  );

  if (!daMo) {
    return (
      <li className="ncung chuamo">
        <div className="nhanhdau">{dau}</div>
        {a.goal ? (
          <p className="phu">
            {CHU.mucTieuCung}: {a.goal}
          </p>
        ) : null}
        <p className="chuamoNoi">{GIAI_THICH.cungChuaMo}</p>
      </li>
    );
  }

  return (
    <li className="ncung">
      <details className="capGap">
        <summary className="nhanhdau">{dau}</summary>
        {a.goal ? (
          <p className="phu">
            {CHU.mucTieuCung}: {a.goal}
          </p>
        ) : null}
        <ol className="cayChuong">
          {chuong.map((c) => (
            <ChuongDanY key={c.chapter} c={c} />
          ))}
        </ol>
      </details>
    </li>
  );
}

function ChuongDanY({ c }: { c: OutlineEntry }) {
  return (
    <li>
      <div className="nhanhdau">
        <span className="ma">{c.chapter}</span>
        <span className="ten">{c.title || <em>{CHU.chuaDatTieuDe}</em>}</span>
      </div>
      <dl className="kv kvcay">
        {c.core_event ? (
          <>
            <dt title={CHU.sukienTrongTamDay}>{CHU.sukienTrongTam}</dt>
            <dd>{c.core_event}</dd>
          </>
        ) : null}
        {c.hook ? (
          <>
            <dt>{CHU.kieuMocCuoi}</dt>
            <dd>{c.hook}</dd>
          </>
        ) : null}
      </dl>
      {c.scenes && c.scenes.length > 0 ? (
        <ol className="canh canhcay">
          {c.scenes.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : null}
    </li>
  );
}
