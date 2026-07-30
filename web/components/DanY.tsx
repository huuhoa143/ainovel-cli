'use client';

import { layDanY } from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { ArcOutline, OutlineEntry, Snapshot, VolumeOutline } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HoSoKhung, MucRong, tinhTrangHoSo } from './HoSoKhung';

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

  return (
    <HoSoKhung tieuDe={CHU.danYPhanTang} motTa={motTa(snapshot, tai.du?.volumes ?? null)}>
      {tt ?? (
        <>
          <section className="sect">
            <h2>{CHU.tienDe}</h2>
            {tai.du!.premise.trim() ? (
              <p className="tiende">{tai.du!.premise.trim()}</p>
            ) : (
              <p className="trongSect">{GIAI_THICH.chuaCoTienDe}</p>
            )}
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

function motTa(snap: Snapshot, volumes: VolumeOutline[] | null): string | undefined {
  if (!snap.capabilities.layered_outline) {
    return 'Tác phẩm phẳng — không có tầng tập/cung';
  }
  if (!volumes) return undefined;
  const moRa = volumes.filter((v) => v.arcs && v.arcs.length > 0).length;
  return `${volumes.length} tập · ${moRa} tập đã mở cung`;
}

function Tap({ v }: { v: VolumeOutline }) {
  const cung = v.arcs ?? [];
  const daMo = cung.length > 0;

  return (
    <li className={`ntap${daMo ? '' : ' chuamo'}`}>
      <div className="nhanhdau">
        <span className="ma">T{v.index}</span>
        <span className="ten">{v.title}</span>
        {v.final ? <span className="cot">{CHU.tapChot}</span> : null}
      </div>
      {v.theme ? (
        <p className="phu">
          {CHU.chuDe}: {v.theme}
        </p>
      ) : null}

      {daMo ? (
        <ol className="cayCung">
          {cung.map((a) => (
            <Cung key={a.index} a={a} tap={v.index} />
          ))}
        </ol>
      ) : (
        <p className="chuamoNoi">{GIAI_THICH.tapChuaMo}</p>
      )}
    </li>
  );
}

function Cung({ a, tap }: { a: ArcOutline; tap: number }) {
  const chuong = a.chapters ?? [];
  const daMo = chuong.length > 0;

  return (
    <li className={`ncung${daMo ? '' : ' chuamo'}`}>
      <div className="nhanhdau">
        <span className="ma">
          T{tap}·C{a.index}
        </span>
        <span className="ten">{a.title}</span>
        <span className="dem">
          {daMo
            ? CHU.soChuongDaMo(chuong.length)
            : a.estimated_chapters
              ? CHU.soChuongDuKien(a.estimated_chapters)
              : GIAI_THICH.chuaBietPhamVi}
        </span>
      </div>
      {a.goal ? (
        <p className="phu">
          {CHU.mucTieuCung}: {a.goal}
        </p>
      ) : null}

      {daMo ? (
        <ol className="cayChuong">
          {chuong.map((c) => (
            <ChuongDanY key={c.chapter} c={c} />
          ))}
        </ol>
      ) : (
        <p className="chuamoNoi">{GIAI_THICH.cungChuaMo}</p>
      )}
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
