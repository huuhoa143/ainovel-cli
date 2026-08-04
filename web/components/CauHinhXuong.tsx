'use client';

import { useEffect, useState } from 'react';

import { LoiApi, layCauHinh, lietKeModel, luuCauHinh, type SuaCauHinh } from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { CauHinhDoc, NhaCungCap } from '@/lib/types';

/**
 * Cấu hình máy — nhà cung cấp, khóa API, model và kiểu văn mặc định.
 *
 * # Vì sao đây là bề mặt RIÊNG, không phải `Cài đặt` cho sửa được
 *
 * `Cài đặt` (mỗi tác phẩm) ghi lại phiên chạy này ĐÃ khởi động với gì — nó đọc
 * `meta/run.json`, một bản ghi lịch sử. Không đổi được quá khứ của một cuốn đang
 * chạy, nên biến nó thành biểu mẫu là nói dối về việc bấm Lưu sẽ làm gì. Chú thích
 * của chính component đó đã cảnh báo: "một biểu mẫu sửa cấu hình phiên đang chạy gần
 * như chắc chắn không phải mười ô này".
 *
 * Bề mặt này thì ở mức MÁY: nó sửa `~/.ainovel/config.json`, áp cho mọi lượt chạy
 * sau. Hai thứ khác cấp, nên hai bề mặt — và rail đặt cái này trong nhóm
 * "Chung cho mọi tác phẩm" để sự khác cấp đó nhìn thấy được.
 *
 * # Vì sao ô khóa luôn trống
 *
 * Server không bao giờ trả khóa (`cheKhoa` chỉ trả `sk-4…802`). Nên biểu mẫu KHÔNG
 * có khóa để điền lại, và để trống lúc lưu phải nghĩa là "giữ khóa cũ" — đó là lý do
 * `api_key` chỉ được gửi khi người dùng thật sự gõ gì vào.
 */
export function CauHinhXuong({
  lanDau = false,
  onDoiCauHinh,
}: {
  lanDau?: boolean;
  /**
   * Gọi sau MỖI lần lưu thành công. Vắng = không ai ở trên quan tâm.
   *
   * Tách khỏi `tai`: `tai` chạy cả lúc mount, còn cái này chỉ nói "cấu hình vừa ĐỔI". Gộp
   * hai việc sẽ bắt tầng trên hỏi lại `/api/config` một lần thừa ở mỗi lần mở bề mặt.
   */
  onDoiCauHinh?: () => void;
}) {
  const [du, datDu] = useState<CauHinhDoc | null>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [dangTai, datDangTai] = useState(true);

  const tai = () => {
    datDangTai(true);
    layCauHinh()
      .then((d) => {
        datDu(d);
        datLoi(null);
      })
      .catch((e: unknown) => datLoi(e instanceof Error ? e.message : String(e)))
      .finally(() => datDangTai(false));
  };
  /** Sau khi lưu: nạp lại chính mình VÀ báo lên trên. Mọi đường lưu đều đi qua đây. */
  const daLuu = () => {
    tai();
    onDoiCauHinh?.();
  };

  useEffect(tai, []);

  return (
    <main className="canvas" id="cau-hinh">
      <div className="head">
        <h1>{lanDau ? CHU.caiLanDau : CHU.cauHinh}</h1>
        <span className="sub">{du?.path}</span>
      </div>

      <p className="steerhint">
        {lanDau ? GIAI_THICH.cauHinhLanDau : GIAI_THICH.cauHinhLaMucMay}
      </p>

      {loi ? <p className="loiDoc">{loi}</p> : null}
      {dangTai && !du ? <p className="trongSect">{CHU.dangTai}</p> : null}

      {du ? (
        <>
          <NhaCungCapList du={du} lanDau={lanDau} onXong={daLuu} />
          {/* Chưa có nhà cung cấp nào thì không có mặc định nào để đặt: ô chọn sẽ rỗng và
              nút Lưu vô hiệu. Hiện một khối như thế ở đúng bước đầu tiên là thêm nhiễu vào
              lúc người dùng cần ít lựa chọn nhất. Biểu mẫu nhà cung cấp tự đặt mặc định
              khi đây là cái đầu tiên (xem `!du.provider` trong FormNhaCungCap). */}
          {du.providers.length > 0 ? <MacDinh du={du} onXong={daLuu} /> : null}
        </>
      ) : null}

      <div style={{ height: 8 }} />
    </main>
  );
}

/* ── nhà cung cấp ──────────────────────────────────────────────────────── */

function NhaCungCapList({
  du,
  lanDau,
  onXong,
}: {
  du: CauHinhDoc;
  lanDau: boolean;
  onXong: () => void;
}) {
  const [dangSua, datDangSua] = useState<string | null>(null);
  const [themMoi, datThemMoi] = useState(du.providers.length === 0);

  return (
    <section className="sect">
      <h2>{CHU.nhaCungCapVaKhoa}</h2>
      <p className="steerhint">
        {lanDau ? GIAI_THICH.cauHinhKhoaLanDau : GIAI_THICH.cauHinhKhoaMotChieu}
      </p>

      {du.providers.length === 0 && !themMoi ? (
        <p className="trongSect">{GIAI_THICH.cauHinhLanDau}</p>
      ) : null}

      <ul className="nccList">
        {du.providers.map((n) =>
          dangSua === n.name ? (
            <li key={n.name} className="nccMuc dangSua">
              <FormNhaCungCap
                du={du}
                cu={n}
                onXong={() => {
                  datDangSua(null);
                  onXong();
                }}
                onHuy={() => datDangSua(null)}
              />
            </li>
          ) : (
            <li key={n.name} className="nccMuc">
              <MotNhaCungCap
                n={n}
                laMacDinh={n.name === du.provider}
                onSua={() => datDangSua(n.name)}
                onXong={onXong}
              />
            </li>
          ),
        )}
      </ul>

      {themMoi ? (
        <div className="nccMuc dangSua">
          <FormNhaCungCap
            du={du}
            onXong={() => {
              datThemMoi(false);
              onXong();
            }}
            onHuy={() => datThemMoi(false)}
          />
        </div>
      ) : (
        <button type="button" className="nutPhu" onClick={() => datThemMoi(true)}>
          + {CHU.themNhaCungCap}
        </button>
      )}
    </section>
  );
}

function MotNhaCungCap({
  n,
  laMacDinh,
  onSua,
  onXong,
}: {
  n: NhaCungCap;
  laMacDinh: boolean;
  onSua: () => void;
  onXong: () => void;
}) {
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);

  const goi = (sua: SuaCauHinh) => {
    datDangGui(true);
    datLoi(null);
    luuCauHinh(sua)
      .then(onXong)
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  return (
    <>
      <div className="nccDau">
        <span className="nccTen">{n.name}</span>
        {laMacDinh ? <span className="nccMd">{CHU.macDinh}</span> : null}
        <span className={`nccKhoa${n.api_key_set ? '' : ' thieu'}`}>
          {n.api_key_set ? `${CHU.daDatKhoa} · ${n.api_key_masked}` : CHU.chuaDatKhoa}
        </span>
      </div>
      <dl className="kv kvcd">
        {n.type ? (
          <>
            <dt>{CHU.loaiGiaoThuc}</dt>
            <dd className="m">{n.type}</dd>
          </>
        ) : null}
        {n.base_url ? (
          <>
            <dt>{CHU.diaChiGoc}</dt>
            <dd className="m">{n.base_url}</dd>
          </>
        ) : null}
        {n.models && n.models.length > 0 ? (
          <>
            <dt>{CHU.danhSachModel}</dt>
            <dd className="m">{n.models.map((m) => m.name).join(', ')}</dd>
          </>
        ) : null}
      </dl>
      {loi ? <p className="loiDoc">{loi}</p> : null}
      <div className="nccNut">
        <button type="button" className="nutPhu" onClick={onSua} disabled={dangGui}>
          {CHU.sua}
        </button>
        {!laMacDinh ? (
          <button
            type="button"
            className="nutPhu"
            disabled={dangGui}
            onClick={() =>
              goi({
                provider: n.name,
                model: n.models?.[0]?.name ?? '',
              })
            }
          >
            {CHU.dungLamMacDinh}
          </button>
        ) : null}
        {/* Không cho xóa nhà cung cấp đang là mặc định: cấu hình còn lại sẽ trỏ vào một
            provider không tồn tại, và `ValidateBase` chặn — tức người dùng bấm một nút
            rồi nhận lỗi mà không hiểu vì sao. Chuyển mặc định trước, rồi mới xóa. */}
        {!laMacDinh ? (
          <button
            type="button"
            className="nutPhu nguyHiem"
            disabled={dangGui}
            onClick={() => goi({ remove_provider: n.name })}
          >
            {CHU.xoa}
          </button>
        ) : null}
      </div>
    </>
  );
}

/**
 * Biểu mẫu một nhà cung cấp.
 *
 * `cu` vắng = thêm mới. Ô khóa luôn khởi tạo RỖNG kể cả khi sửa, vì server không trả
 * khóa — và dòng gợi ý nói rõ để trống nghĩa là giữ nguyên, nếu không người dùng sẽ
 * tưởng mình vừa xóa khóa.
 */
function FormNhaCungCap({
  du,
  cu,
  onXong,
  onHuy,
}: {
  du: CauHinhDoc;
  cu?: NhaCungCap;
  onXong: () => void;
  onHuy: () => void;
}) {
  const [ten, datTen] = useState(cu?.name ?? '');
  const [loai, datLoai] = useState(cu?.type ?? 'openai');
  const [baseURL, datBaseURL] = useState(cu?.base_url ?? '');
  const [khoa, datKhoa] = useState('');
  const [models, datModels] = useState((cu?.models ?? []).map((m) => m.name).join(', '));
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);

  const dungMau = (tenMau: string) => {
    const m = du.presets.find((p) => p.label === tenMau);
    if (!m) return;
    if (m.name) datTen(m.name);
    if (m.type) datLoai(m.type);
    datBaseURL(m.base_url ?? '');
  };

  const gui = () => {
    const dsModel = models
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const sua: SuaCauHinh = {
      provider_config: {
        name: ten.trim(),
        type: loai,
        base_url: baseURL.trim(),
        models: dsModel,
      },
    };
    // Chỉ gửi khóa khi người dùng THẬT SỰ gõ. Gửi chuỗi rỗng là lệnh XÓA khóa ở phía
    // server (nil ≠ ""), nên gửi bừa sẽ xóa khóa mỗi lần người dùng chỉ sửa base_url.
    if (khoa !== '') sua.provider_config!.api_key = khoa;
    // Chưa có mặc định nào (lần đầu) thì đặt luôn, nếu không cấu hình vừa lưu vẫn
    // không dùng được và người dùng phải bấm thêm một nút mới hiểu là còn thiếu.
    if (!du.provider) {
      sua.provider = ten.trim();
      if (dsModel.length > 0) sua.model = dsModel[0]!.name;
    }

    datDangGui(true);
    datLoi(null);
    luuCauHinh(sua)
      .then(onXong)
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  return (
    <form
      className="bieuMau"
      onSubmit={(e) => {
        e.preventDefault();
        gui();
      }}
    >
      {!cu ? (
        <label className="oNhap">
          <span>Mẫu sẵn</span>
          <select
            defaultValue=""
            onChange={(e) => {
              dungMau(e.target.value);
              e.currentTarget.selectedIndex = 0;
            }}
          >
            <option value="">— chọn để điền nhanh —</option>
            {du.presets.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="oNhap">
        <span>{CHU.ten}</span>
        <input
          value={ten}
          onChange={(e) => datTen(e.target.value)}
          readOnly={!!cu}
          placeholder="openrouter"
          required
        />
      </label>

      <label className="oNhap">
        <span>{CHU.loaiGiaoThuc}</span>
        <select value={loai} onChange={(e) => datLoai(e.target.value)}>
          <option value="openai">openai</option>
          <option value="anthropic">anthropic</option>
          <option value="gemini">gemini</option>
        </select>
      </label>

      <label className="oNhap">
        <span>{CHU.diaChiGoc}</span>
        <input
          value={baseURL}
          onChange={(e) => datBaseURL(e.target.value)}
          placeholder="https://openrouter.ai/api/v1"
        />
      </label>

      <label className="oNhap">
        <span>{CHU.khoaApi}</span>
        <input
          type="password"
          value={khoa}
          onChange={(e) => datKhoa(e.target.value)}
          autoComplete="off"
          placeholder={cu?.api_key_set ? CHU.giuKhoaCu : 'sk-…'}
        />
      </label>

      <label className="oNhap">
        <span>{CHU.danhSachModel}</span>
        <input
          value={models}
          onChange={(e) => datModels(e.target.value)}
          placeholder="gemini-2.5-pro, claude-sonnet-4"
        />
      </label>

      {loi ? <p className="loiDoc">{loi}</p> : null}

      <div className="nccNut">
        {/* `disabled` khi đang gửi là bắt buộc, không phải trang trí: bấm hai lần ở đây
            là hai lượt ghi cấu hình chồng nhau. */}
        <button type="submit" className="nutChinh" disabled={dangGui || !ten.trim()}>
          {dangGui ? CHU.dangLuu : CHU.luu}
        </button>
        <button type="button" className="nutPhu" onClick={onHuy} disabled={dangGui}>
          {CHU.huy}
        </button>
      </div>
    </form>
  );
}

/* ── mặc định của máy ──────────────────────────────────────────────────── */

function MacDinh({ du, onXong }: { du: CauHinhDoc; onXong: () => void }) {
  const [provider, datProvider] = useState(du.provider);
  const [model, datModel] = useState(du.model);
  const [style, datStyle] = useState(du.style);
  const [effort, datEffort] = useState(du.reasoning_effort ?? '');
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [xong, datXong] = useState<string[] | null>(null);

  // Danh sách model HỎI THẲNG nhà cung cấp.
  //
  // `null` = chưa hỏi lần nào. Phân biệt với `[]` (hỏi rồi, nhà cung cấp không có model
  // nào) là cần thiết: chỉ được cảnh báo "model này không có thật" khi ĐÃ hỏi được.
  const [dsNapVe, datDsNapVe] = useState<string[] | null>(null);
  const [dangNap, datDangNap] = useState(false);
  const [loiNap, datLoiNap] = useState<string | null>(null);

  const nccChon = du.providers.find((n) => n.name === provider);

  // Đổi nhà cung cấp là danh sách cũ hết giá trị — model của gateway này không nói gì về
  // gateway kia. Giữ lại là mời người dùng chọn một cái tên chắc chắn sai.
  useEffect(() => {
    datDsNapVe(null);
    datLoiNap(null);
  }, [provider]);

  const nap = () => {
    datDangNap(true);
    datLoiNap(null);
    lietKeModel(provider)
      .then((r) => datDsNapVe(r.models))
      .catch((e: unknown) => datLoiNap(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangNap(false));
  };

  // Gộp danh sách gõ tay trong cấu hình với danh sách vừa hỏi được. Giữ cả hai vì chúng
  // trả lời hai câu khác nhau: cái gõ tay là "tôi hay dùng mấy con này", cái hỏi được là
  // "nhà cung cấp thật sự có mấy con này".
  const dsGoiY = Array.from(
    new Set([...(nccChon?.models ?? []).map((m) => m.name), ...(dsNapVe ?? [])]),
  );

  // Đã hỏi được danh sách mà model đang đặt không nằm trong đó → lượt chạy tới sẽ 404.
  //
  // Đây chính là lỗi đã xảy ra trên máy thật: provider đặt `cx/gpt-5.5` còn ô này để
  // `gpt-5.5`, và ba lượt tạo tác phẩm chết liên tiếp với một thông báo nói về credentials
  // chứ không nói về tên model. Nói ra ở ĐÂY, lúc còn sửa được bằng một cú chọn.
  const modelLa = dsNapVe !== null && dsNapVe.length > 0 && !dsNapVe.includes(model);
  // Kiểu văn đang đặt mà KHÔNG có thật: engine bỏ qua âm thầm. Nói ra, vì đây đúng là
  // ca đã xảy ra thật (một cuốn 8 chương chạy với `tien_hiep` và không nhận được tham
  // chiếu thể loại nào).
  const kieuVanLa = !!du.style && !du.styles.includes(du.style);

  const gui = () => {
    datDangGui(true);
    datLoi(null);
    datXong(null);
    luuCauHinh({
      provider,
      model,
      style,
      reasoning_effort: effort,
    })
      .then((r) => {
        datXong(r.reopen_to_apply);
        onXong();
      })
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  return (
    <section className="sect">
      <h2>{CHU.macDinh}</h2>

      {kieuVanLa ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>{GIAI_THICH.cauHinhKieuVanLa(du.style, du.styles)}</span>
        </p>
      ) : null}

      <form
        className="bieuMau"
        onSubmit={(e) => {
          e.preventDefault();
          gui();
        }}
      >
        <label className="oNhap">
          <span>{CHU.nhaCungCap}</span>
          <select value={provider} onChange={(e) => datProvider(e.target.value)}>
            {du.providers.map((n) => (
              <option key={n.name} value={n.name}>
                {n.name}
              </option>
            ))}
          </select>
        </label>

        <label className="oNhap">
          <span>{CHU.model}</span>
          {/* Ô nhập tự do CÓ danh sách gợi ý: model của một gateway riêng không nằm
              trong bất kỳ danh sách nào, nên khóa cứng vào `select` sẽ chặn đúng nhóm
              người dùng mà bản fork này phục vụ. */}
          <input
            value={model}
            onChange={(e) => datModel(e.target.value)}
            list="ds-model"
            required
          />
          <datalist id="ds-model">
            {dsGoiY.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>

        {/* Nạp danh sách CŨNG LÀ kiểm tra kết nối, nên nút chỉ có một.
            Gọi được nghĩa là địa chỉ gốc đúng và khóa còn sống; đó là toàn bộ những gì
            một nút "kiểm tra" riêng kiểm được, mà lại không tiêu một đồng nào. */}
        <div className="oNhap">
          <span />
          <div className="hangBo">
            <button type="button" onClick={nap} disabled={dangNap || !provider}>
              {dangNap ? CHU.dangNapModel : CHU.napModel}
            </button>
            {dsNapVe !== null && !loiNap ? (
              <span className="mo">{GIAI_THICH.napModelXong(dsNapVe.length)}</span>
            ) : null}
          </div>
        </div>

        {loiNap ? <p className="loiDoc">{loiNap}</p> : null}

        {modelLa ? (
          <p className="vphacap">
            <span className="ky" aria-hidden="true">
              ■
            </span>
            <span>{GIAI_THICH.modelKhongCoThat(model, provider)}</span>
          </p>
        ) : null}

        <label className="oNhap">
          <span>{CHU.kieuVanMacDinh}</span>
          {/* Danh sách ĐÓNG, và đó là quyết định có bằng chứng: giá trị lạ bị engine bỏ
              qua không lỗi không cảnh báo, nên một ô nhập tự do ở đây là mời người dùng
              tin mình đã chọn thể loại trong khi không có gì được áp. */}
          <select value={style} onChange={(e) => datStyle(e.target.value)}>
            {kieuVanLa ? <option value={du.style}>{du.style} — không có thật</option> : null}
            {du.styles.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label className="oNhap">
          <span>{CHU.doSuyLuan}</span>
          <select value={effort} onChange={(e) => datEffort(e.target.value)}>
            <option value="">— theo mặc định của model —</option>
            {['off', 'low', 'medium', 'high', 'xhigh', 'max'].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        {loi ? <p className="loiDoc">{loi}</p> : null}
        {xong && xong.length > 0 ? (
          <p className="vphacap">
            <span className="ky" aria-hidden="true">
              ■
            </span>
            <span>{GIAI_THICH.cauHinhCanMoLai(xong)}</span>
          </p>
        ) : xong ? (
          <p className="steerhint">{CHU.daLuu}</p>
        ) : null}

        <div className="nccNut">
          <button
            type="submit"
            className="nutChinh"
            disabled={dangGui || !provider || !model}
          >
            {dangGui ? CHU.dangLuu : CHU.luu}
          </button>
        </div>
      </form>
    </section>
  );
}
