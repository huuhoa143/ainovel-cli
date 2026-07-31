'use client';

import { layTheGioi } from '@/lib/api';
import {
  CHU,
  THU_TU_NHOM_LUAT,
  nhanNhomLuat,
  nhanPhucBut,
} from '@/lib/nhan';
import type { ForeshadowEntry, RelationshipEntry, WorldRule } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HoSoKhung, MucRong, tinhTrangHoSo } from './HoSoKhung';

/**
 * Luật thế giới: mỗi luật đi kèm RANH GIỚI của nó.
 *
 * Ranh giới không phải chú thích phụ mà là nửa quan trọng hơn của luật:
 * `WorldRule.Boundary` là điều không được vi phạm, và Editor bắt lỗi
 * `critical` dựa trên chính nó ("phá vỡ ranh giới cốt lõi của luật thế giới" —
 * assets/prompts/editor.md:129). Nên hai phần đứng cùng cỡ chữ, khác tông, chứ
 * không phải luật to và ranh giới bé.
 */
export function LuatTheGioi({ tacPham }: { tacPham: string | undefined }) {
  const tai = useHoSo(tacPham, layTheGioi);
  const tt = tinhTrangHoSo(tai);

  const luat = tai.du?.rules ?? null;
  const quanHe = tai.du?.relations ?? null;

  return (
    <HoSoKhung
      tieuDe={CHU.luatTheGioi}
      motTa={luat && luat.length > 0 ? `${luat.length} luật` : undefined}
    >
      {tt ?? (
        <>
          {luat && luat.length > 0 ? (
            xepNhom(luat).map(([nhom, ds]) => (
              <section className="sect" key={nhom}>
                <h2>
                  {nhanNhomLuat(nhom)} · {ds.length}
                </h2>
                <ul className="dsLuat">
                  {ds.map((r, i) => (
                    <li key={i}>
                      <p className="luat">{r.rule}</p>
                      {r.boundary ? (
                        <p className="ranh">
                          <span className="ky" aria-hidden="true">
                            ■
                          </span>
                          <span>
                            <span className="dx">{CHU.ranhGioi}: </span>
                            {r.boundary}
                          </span>
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <section className="sect">
              <MucRong mang={luat} muc="luật thế giới" />
            </section>
          )}

          {quanHe && quanHe.length > 0 ? (
            <section className="sect">
              <h2>
                {CHU.luoiQuanHe} · {quanHe.length}
              </h2>
              <ul className="dsQuanHe">
                {quanHe.map((q, i) => (
                  <QuanHe key={i} q={q} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </HoSoKhung>
  );
}

/**
 * Nhóm luật theo thứ tự đã chốt, và nhóm lạ xếp cuối THEO NGUYÊN VĂN.
 *
 * Nhóm là chuỗi tự do trong dữ liệu (`WorldRule.Category` không phải Enum ở tầng
 * schema), nên bỏ qua nhóm lạ sẽ làm mất luật — mà mất một luật thế giới thì
 * người vận hành không biết Editor đang chấm theo cái gì.
 */
function xepNhom(luat: WorldRule[]): [string, WorldRule[]][] {
  const theoNhom = new Map<string, WorldRule[]>();
  for (const r of luat) {
    const k = r.category.toLowerCase().trim() || 'other';
    const co = theoNhom.get(k);
    if (co) co.push(r);
    else theoNhom.set(k, [r]);
  }
  const bac = (k: string) => {
    const i = (THU_TU_NHOM_LUAT as readonly string[]).indexOf(k);
    return i < 0 ? THU_TU_NHOM_LUAT.length : i;
  };
  return [...theoNhom.entries()].sort((a, b) => bac(a[0]) - bac(b[0]));
}

function QuanHe({ q }: { q: RelationshipEntry }) {
  return (
    <li>
      <div className="cap">
        <span className="ten">{q.character_a}</span>
        <span className="noi" aria-hidden="true">
          ↔
        </span>
        <span className="ten">{q.character_b}</span>
        <span className="ch">ch. {q.chapter}</span>
      </div>
      <p className="phu">{q.relation}</p>
    </li>
  );
}

/**
 * Phục bút: sổ nợ tự sự.
 *
 * Sắp xếp theo VIỆC TỒN, không theo số chương: phục bút mới gieo và chưa thu là
 * món nợ chưa trả, và đó là thứ người vận hành cần thấy trước. Phục bút đã thu
 * xếp cuối vì nó là chuyện đã đóng.
 */
export function PhucBut({ tacPham }: { tacPham: string | undefined }) {
  const tai = useHoSo(tacPham, layTheGioi);
  const tt = tinhTrangHoSo(tai);

  const ds = tai.du?.foreshadow ?? null;
  const conNo = ds ? ds.filter((f) => f.status !== 'resolved').length : 0;

  return (
    <HoSoKhung
      tieuDe={CHU.phucBut}
      motTa={ds && ds.length > 0 ? `${ds.length} phục bút · ${conNo} chưa thu` : undefined}
    >
      {tt ?? (
        <section className="sect">
          {ds && ds.length > 0 ? (
            <ul className="dsPhucBut">
              {xepPhucBut(ds).map((f) => (
                <MotPhucBut key={f.id} f={f} />
              ))}
            </ul>
          ) : (
            <MucRong mang={ds} muc="phục bút" />
          )}
        </section>
      )}
    </HoSoKhung>
  );
}

const THU_TU_PHUC_BUT = ['planted', 'advanced', 'resolved'];

function xepPhucBut(ds: ForeshadowEntry[]): ForeshadowEntry[] {
  const bac = (f: ForeshadowEntry) => {
    const i = THU_TU_PHUC_BUT.indexOf(f.status.toLowerCase().trim());
    return i < 0 ? THU_TU_PHUC_BUT.length : i;
  };
  return [...ds].sort((a, b) => bac(a) - bac(b) || a.planted_at - b.planted_at);
}

function MotPhucBut({ f }: { f: ForeshadowEntry }) {
  const tt = nhanPhucBut(f.status);
  return (
    <li>
      <div className="pbdau">
        {/* KHÔNG `dap` ở đây, và đó là chủ ý cần ghi lại. `advanced` → "đã đẩy
            thêm" mang tông `gold` (nhan.ts:353), nên bản trước — khi nhịp đập
            bám vào tông màu — làm mọi phục bút đang đẩy dở đập 2.2s vô hạn. ĐO
            ĐƯỢC: bề mặt này có một `.st.gold` với `dapnhip:running` trong khi
            transport ghi "đang nghỉ".
            Trạng thái phục bút là một mục trong sổ, không phải liveness: nó
            không đổi khi engine tắt. Không có sự thật nào ở đây bật được nhịp
            đập, nên không có `dap`. */}
        <span className={`st ${tt.mau}`}>
          <span className="ky" aria-hidden="true">
            {tt.ky}
          </span>
          {tt.nhan}
        </span>
        {/* Hai mốc là HAI span riêng, không phải một chuỗi ghép.
            ĐO ĐƯỢC ở 400px: chuỗi "gieo ở chương 1 · thu ở chương 2" ngắt ở giữa
            một mốc ("gieo ở chương 1 · thu ở" / "chương 2") — đọc ra như thể
            "thu ở" thuộc mốc trước. Tách span thì chỗ ngắt luôn nằm GIỮA hai
            mốc, còn mỗi mốc thì không bao giờ bị xé. */}
        <span className="moc">{CHU.gieoOChuong(f.planted_at)}</span>
        {f.resolved_at ? (
          <span className="moc">{CHU.thuOChuong(f.resolved_at)}</span>
        ) : null}
        <span className="ma">{f.id}</span>
      </div>
      <p className="tavan">{f.description}</p>
    </li>
  );
}
