'use client';

import { useEffect, useState } from 'react';

import { LoiApi, layCauHinh, luuCauHinh } from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { CauHinhDoc } from '@/lib/types';

import { HoSoKhung } from './HoSoKhung';

/**
 * Model theo vai — MẶC ĐỊNH cho mọi tác phẩm.
 *
 * # Vì sao bề mặt này phải tồn tại
 *
 * `KenhVai` (trong Phiên chạy) đổi model của một engine ĐANG MỞ, qua `Host.SwitchModel`, và
 * hiệu lực của nó hết khi engine đóng. Nên trước bản này, câu "tôi muốn Writer luôn dùng
 * model X" không có chỗ nào trả lời được: bề mặt duy nhất có ô chọn vai đòi một engine mở,
 * và nó ghi vào một lượt chạy chứ không vào mặc định.
 *
 * Chính `Phiên chạy` đã phải in ra câu chỉ đường: *"Muốn đổi mặc định cho mọi lượt sau thì
 * sửa ở Cấu hình máy"* — trong khi Cấu hình máy KHÔNG có ô nào cho vai. Câu đó chỉ tới một
 * chỗ không có thứ nó hứa. Đây là chỗ đó.
 *
 * # Ba khác biệt với `KenhVai`, và cả ba đều là khác biệt về BẢN CHẤT
 *
 *   1. Không đòi engine mở. Nó ghi `cfg.Roles` trong tệp cấu hình, không dựng lại model set
 *      của bất kỳ lượt chạy nào.
 *   2. Không có ô "độ suy luận" theo vai. `RoleConfig` ở tầng Go nhận `provider` + `model`
 *      (cộng `fallbacks`), còn `reasoning_effort` theo vai không đi qua đường ghi này — vẽ
 *      một ô cho nó là vẽ một ô lưu xong không có tác dụng.
 *   3. GỠ được một vai. Đây là điều `KenhVai` không làm được và cũng không cần: ở đó mọi
 *      kênh luôn có một giá trị đang chạy. Ở đây "không đặt riêng" là một trạng thái thật và
 *      phải quay về được, nếu không thì mỗi ô đặt một lần là dính vĩnh viễn.
 *
 * `arbiter` cố ý KHÔNG có kênh, giữ nguyên lý do của `KenhVai`: `host.arbiterModel` luôn
 * dùng model mặc định, nên một ô chọn cho nó là ô người dùng đổi mà không có tác dụng.
 */
export function KenhVaiChung({ onDoiCauHinh }: { onDoiCauHinh: () => void }) {
  const [du, datDu] = useState<CauHinhDoc | null>(null);
  const [loi, datLoi] = useState<string | null>(null);

  const tai = () => {
    layCauHinh()
      .then((d) => {
        datDu(d);
        datLoi(null);
      })
      .catch((e: unknown) => {
        datLoi(e instanceof Error ? e.message : String(e));
        datDu(null);
      });
  };
  useEffect(tai, []);

  if (loi) {
    return (
      <HoSoKhung tieuDe={CHU.kenhVaiChung}>
        <section className="sect">
          <p className="loiDoc">{loi}</p>
        </section>
      </HoSoKhung>
    );
  }
  if (!du) {
    return (
      <HoSoKhung tieuDe={CHU.kenhVaiChung}>
        <section className="sect">
          <p className="trongSect">{CHU.dangTai}</p>
        </section>
      </HoSoKhung>
    );
  }

  const roles = du.roles ?? {};
  // `role_names` từ server gồm cả `default`; nó không phải một vai trong `cfg.Roles` mà là
  // `cfg.Provider` + `cfg.ModelName`. Tách ra ở đây chứ không ở server: server đang nói đúng
  // "bốn kênh đổi được", và việc kênh đầu ghi vào một trường khác là chuyện của tầng ghi.
  const vaiRieng = du.role_names.filter((v) => v !== 'default');

  return (
    <HoSoKhung tieuDe={CHU.kenhVaiChung} motTa={`${du.provider} · ${du.model}`}>
      <section className="sect">
        <p className="steerhint">{GIAI_THICH.kenhVaiChungGiaiThich}</p>
        <p className="steerhint">{GIAI_THICH.kenhVaiChungThuaHuong}</p>

        {/* Cuốn đang mở engine KHÔNG nhận cấu hình mới cho tới lần mở lại — engine giữ bản
            `cfg` từ lúc `host.New`. Nói ra ở đây, cạnh chỗ bấm lưu, chứ không ở đầu trang:
            người dùng đọc dòng gần nút nhất trước khi bấm. */}
        {du.engine_open.length > 0 ? (
          <p className="vphacap">
            <span className="ky" aria-hidden="true">
              ■
            </span>
            <span>{GIAI_THICH.cauHinhCuonDangMo(du.engine_open.join(', '))}</span>
          </p>
        ) : null}

        <div className="kenhDai">
          {/* Kênh mặc định đứng đầu và ghi vào một chỗ KHÁC ba kênh sau. Nó ở cùng dải vì
              người vận hành so chúng theo cột — vai này dùng model gì so với vai kia — và
              tách nó ra thành một khối riêng là mất đúng phép so sánh đó. */}
          <MotKenhChung
            vai="default"
            provider={du.provider}
            model={du.model}
            rieng
            /* Mặc định không "gỡ" được: gỡ mặc định là để engine không có model nào. */
            goDuoc={false}
            du={du}
            onXong={() => {
              tai();
              onDoiCauHinh();
            }}
          />
          {vaiRieng.map((v) => {
            const dat = roles[v];
            return (
              <MotKenhChung
                key={v}
                vai={v}
                // Vai chưa đặt riêng thì hiện GIÁ TRỊ THỪA HƯỞNG trong ô, không hiện ô rỗng:
                // một ô rỗng nói "chưa có model", còn sự thật là "đang dùng model mặc định".
                provider={dat?.provider ?? du.provider}
                model={dat?.model ?? du.model}
                rieng={!!dat}
                goDuoc={!!dat}
                du={du}
                onXong={() => {
                  tai();
                  onDoiCauHinh();
                }}
              />
            );
          })}
        </div>
      </section>
    </HoSoKhung>
  );
}

const NHAN_VAI: Record<string, string> = {
  default: CHU.vaiMacDinh,
  architect: CHU.vaiArchitect,
  writer: CHU.vaiWriter,
  editor: CHU.vaiEditor,
};

function MotKenhChung({
  vai,
  provider,
  model,
  rieng,
  goDuoc,
  du,
  onXong,
}: {
  vai: string;
  provider: string;
  model: string;
  /** Đã đặt riêng (hoặc là kênh mặc định) — khác với đang thừa hưởng. */
  rieng: boolean;
  goDuoc: boolean;
  du: CauHinhDoc;
  onXong: () => void;
}) {
  const [p, datP] = useState(provider);
  const [m, datM] = useState(model);
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);

  // Đồng bộ lại khi server đổi — kể cả vì một kênh KHÁC vừa lưu: đổi mặc định làm mọi vai
  // đang thừa hưởng đổi theo, và không có effect này thì ba ô kia vẫn hiện model cũ.
  useEffect(() => {
    datP(provider);
    datM(model);
  }, [provider, model]);

  const doi = p !== provider || m !== model;
  const dsModel = du.providers.find((x) => x.name === p)?.models ?? [];

  /**
   * Danh sách nhà cung cấp, LUÔN chứa cái đang được chọn.
   *
   * ĐO ĐƯỢC trên một cấu hình thật: một tệp khai `provider` + `model` ở tầng trên mà KHÔNG có
   * mục `providers` nào (hình dạng hợp lệ — `LoadConfig` không đòi nó) làm `du.providers` rỗng,
   * nên ô chọn không có một `<option>` nào và hiện ra TRỐNG. Một ô chọn rỗng là một điều khiển
   * chết: nó không nói được nhà cung cấp đang dùng là gì, và lượt lưu đầu tiên sẽ gửi chuỗi
   * rỗng rồi nhận lỗi từ tầng dưới.
   *
   * Ghép thêm giá trị đang chọn chữa cả hai: ô nói đúng sự thật hiện tại, và người dùng vẫn
   * đổi được sang bất kỳ nhà cung cấp nào đã khai.
   */
  const dsProvider = du.providers.some((x) => x.name === p)
    ? du.providers.map((x) => x.name)
    : [p, ...du.providers.map((x) => x.name)].filter(Boolean);

  const gui = (than: Parameters<typeof luuCauHinh>[0]) => {
    datDangGui(true);
    datLoi(null);
    luuCauHinh(than)
      .then(onXong)
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  /**
   * Ghi map roles ĐẦY ĐỦ, không chỉ vai đang sửa.
   *
   * `PUT /api/config` thay CẢ map (`thanCauHinh.Roles`), và đó là thiết kế: một vai vắng mặt
   * nghĩa là "thừa hưởng mặc định", nên trộn từng khóa thì thêm được mà không gỡ được. Hệ quả
   * ở đây là mọi lượt lưu phải mang theo các vai khác — gửi thiếu là lặng lẽ gỡ chúng.
   */
  const roleMoi = (
    doiVai: string,
    giaTri: { provider: string; model: string } | undefined,
  ): Record<string, { provider: string; model: string }> => {
    const ra: Record<string, { provider: string; model: string }> = {};
    for (const [k, v] of Object.entries(du.roles ?? {})) {
      if (k !== doiVai) ra[k] = { provider: v.provider, model: v.model };
    }
    if (giaTri) ra[doiVai] = giaTri;
    return ra;
  };

  return (
    <form
      className={`kenh${rieng ? ' rieng' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        gui(vai === 'default' ? { provider: p, model: m } : { roles: roleMoi(vai, { provider: p, model: m }) });
      }}
    >
      <div className="kenhDau">
        <span className="kenhTen">{NHAN_VAI[vai] ?? vai}</span>
        <span className="kenhNguon">{rieng ? CHU.datRieng : CHU.thuaHuong}</span>
      </div>

      <label className="oNhap">
        <span>{CHU.nhaCungCap}</span>
        <select value={p} onChange={(e) => datP(e.target.value)}>
          {dsProvider.map((ten) => (
            <option key={ten} value={ten}>
              {ten}
            </option>
          ))}
        </select>
      </label>

      <label className="oNhap">
        <span>{CHU.model}</span>
        <input value={m} onChange={(e) => datM(e.target.value)} list={`dsc-${vai}`} required />
        <datalist id={`dsc-${vai}`}>
          {dsModel.map((x) => (
            <option key={x.name} value={x.name} />
          ))}
        </datalist>
      </label>

      {loi ? <p className="loiDoc">{loi}</p> : null}

      <div className="kenhNut">
        {/* Nút chỉ bật khi có gì ĐỔI THẬT — chép nguyên luật của `KenhVai`: bốn nút Lưu luôn
            bật cạnh nhau mời người dùng bấm bừa. */}
        <button type="submit" className="nutChinh" disabled={dangGui || !doi}>
          {dangGui ? CHU.dangLuu : CHU.luu}
        </button>
        {goDuoc ? (
          <button
            type="button"
            className="nutPhu"
            disabled={dangGui}
            title={GIAI_THICH.kenhVaiChungThuaHuong}
            onClick={() => gui({ roles: roleMoi(vai, undefined) })}
          >
            {CHU.goDatRieng}
          </button>
        ) : null}
      </div>
    </form>
  );
}
