'use client';

import { useEffect, useState } from 'react';

import { LoiApi, luuCauHinh } from '@/lib/api';
import { CHU, GIAI_THICH, nhanKenhVai } from '@/lib/nhan';
import { hieuLucCua } from '@/lib/chuyenNhaCungCap';
import { type ModelNapVe } from '@/lib/modelNapVe';
import type { CauHinhDoc } from '@/lib/types';

import { ChuyenNhaCungCap } from './ChuyenNhaCungCap';

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
export function KenhVaiChung({
  du,
  napVe,
  onXong,
}: {
  du: CauHinhDoc;
  napVe: ModelNapVe;
  /** Gọi sau mỗi lượt lưu — chủ sở hữu dữ liệu nạp lại và báo lên trên. */
  onXong: () => void;
}) {
  const roles = du.roles ?? {};
  // `role_names` từ server gồm cả `default`; nó không phải một vai trong `cfg.Roles` mà là
  // `cfg.Provider` + `cfg.ModelName`. Tách ra ở đây chứ không ở server: server đang nói đúng
  // "bốn kênh đổi được", và việc kênh đầu ghi vào một trường khác là chuyện của tầng ghi.
  const vaiRieng = du.role_names.filter((v) => v !== 'default');

  /**
   * Vai đang trỏ vào model mà nhà cung cấp CỦA NÓ không khai.
   *
   * Ca thật: người dùng sửa ô "Danh sách model" trên thẻ `9Router` từ `cx/gpt-5.5` sang
   * `cx/gpt-5.6-luna`, và cả bốn vai đứng im — vì danh mục chỉ nạp gợi ý, còn model có hiệu
   * lực nằm ở đây. Bốn ô cảnh báo giống hệt nhau hiện lên, không ô nào làm được gì.
   *
   * Cảnh báo mà không có lối ra thì chỉ là nhiễu. Nút dưới đây mở CHÍNH bảng đối chiếu đã
   * dùng cho lượt đổi nhà cung cấp — một hộp, giờ là ba đường vào, vẫn một lượt ghi.
   */
  const khaiCua = (p: string) =>
    (du.providers.find((x) => x.name === p)?.models ?? []).map((m) => m.name);
  const vaiLac = du.role_names.filter((v) => {
    const { provider, model } = hieuLucCua(du, v);
    const khai = khaiCua(provider);
    return khai.length > 0 && !!model && !khai.includes(model);
  });
  const nccLac = vaiLac.length > 0 ? hieuLucCua(du, vaiLac[0]!).provider : '';
  const [hoiSua, datHoiSua] = useState(false);
  const [dangGhi, datDangGhi] = useState(false);
  const [loiSua, datLoiSua] = useState<string | null>(null);

  return (
    <section className="sect">
      <h2>{CHU.kenhVaiChung}</h2>
      <p className="steerhint">{GIAI_THICH.kenhVaiChungThuaHuong}</p>

      {vaiLac.length > 0 ? (
        <div className="hangBo">
          <button type="button" className="nutPhu" onClick={() => datHoiSua(true)}>
            {CHU.suaCaBonVai(nccLac)}
          </button>
        </div>
      ) : null}

      {hoiSua ? (
        <ChuyenNhaCungCap
          du={du}
          den={{ provider: nccLac, model: khaiCua(nccLac)[0] ?? '' }}
          dangGui={dangGhi}
          loi={loiSua}
          onHuy={() => {
            datLoiSua(null);
            datHoiSua(false);
          }}
          /* KHÔNG truyền `onChiDoiMacDinh`: ở lối vào này người dùng bấm "Sửa các vai theo X",
             tức họ xin sửa VAI. "Chỉ đổi mặc định" không phải một đáp án của câu hỏi đó. */
          onChuyenCaDay={(than) => {
            datDangGhi(true);
            datLoiSua(null);
            luuCauHinh(than)
              .then(() => {
                datHoiSua(false);
                onXong();
              })
              /* Nuốt lỗi ở đây là ca hỏng đã đo được: `PUT /api/config` hoàn nguyên tệp rồi
                 trả 400 kèm lý do, hộp đóng, cảnh báo "vai lạc" VẪN CÒN, và không một chữ
                 nào trên màn hình. Người dùng bấm lại, lại thấy y hệt. Giữ hộp mở và in
                 nguyên văn lý do — mọi đường ghi khác trên bề mặt này đều đã làm thế. */
              .catch((e: unknown) => datLoiSua(e instanceof LoiApi ? e.message : String(e)))
              .finally(() => datDangGhi(false));
          }}
        />
      ) : null}

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
          napVe={napVe}
          onXong={onXong}
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
              napVe={napVe}
              onXong={onXong}
            />
          );
        })}
      </div>
    </section>
  );
}

function MotKenhChung({
  vai,
  provider,
  model,
  rieng,
  goDuoc,
  du,
  napVe,
  onXong,
}: {
  vai: string;
  provider: string;
  model: string;
  /** Đã đặt riêng (hoặc là kênh mặc định) — khác với đang thừa hưởng. */
  rieng: boolean;
  goDuoc: boolean;
  du: CauHinhDoc;
  napVe: ModelNapVe;
  onXong: () => void;
}) {
  const [p, datP] = useState(provider);
  const [m, datM] = useState(model);
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  // Kênh NÀY có tự bấm nạp không — cùng luật với thẻ nhà cung cấp: một điều khiển chỉ đổi
  // trạng thái theo cú bấm của chính nó. Bốn kênh thường trỏ cùng một nhà cung cấp, nên gắn
  // nhãn "đang hỏi" theo `dangNapCua(p)` sẽ làm cả bốn cùng đổi chữ cho một cú bấm ở nơi khác.
  const [daBamNap, datDaBamNap] = useState(false);

  // Đồng bộ lại khi server đổi — kể cả vì một kênh KHÁC vừa lưu: đổi mặc định làm mọi vai
  // đang thừa hưởng đổi theo, và không có effect này thì ba ô kia vẫn hiện model cũ.
  useEffect(() => {
    datP(provider);
    datM(model);
  }, [provider, model]);

  const doi = p !== provider || m !== model;
  // Chỉ dám nói "không có thật" khi ĐÃ hỏi được nhà cung cấp và nó trả về một danh sách khác
  // rỗng: rỗng nghĩa gateway không liệt kê, không phải mọi tên đều sai.
  const modelLa =
    napVe.daHoi(p) && napVe.modelCua(p).length > 0 && !napVe.modelCua(p).includes(m);

  /**
   * Lưới an toàn LUÔN BẬT: model không nằm trong danh sách mà chính nhà cung cấp đó KHAI.
   *
   * Khác `modelLa` ở nguồn và ở lúc: `modelLa` hỏi nhà cung cấp qua mạng nên chỉ bật sau khi
   * người dùng bấm nạp. Cái này so hai vế đều đã nằm sẵn trong tệp cấu hình, nên nó nói được
   * NGAY — và ca hỏng đo được của người dùng lộ ra đúng ở phép so này.
   *
   * Nói "chưa khai" chứ không nói "không có": danh sách khai là do người dùng gõ và thường
   * không đầy đủ. Và chỉ bật khi có ít nhất một tên để mà mâu thuẫn — nhà cung cấp không khai
   * model nào thì không có cơ sở nói gì.
   */
  const khaiCuaP = (du.providers.find((x) => x.name === p)?.models ?? []).map((x) => x.name);
  const chuaKhai = khaiCuaP.length > 0 && !!m && !khaiCuaP.includes(m);
  const dsModel = Array.from(
    new Set([
      ...(du.providers.find((x) => x.name === p)?.models ?? []).map((x) => x.name),
      ...napVe.modelCua(p),
    ]),
  );

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
        <span className="kenhTen">{nhanKenhVai(vai)}</span>
        <span className="kenhNguon">{rieng ? CHU.datRieng : CHU.thuaHuong}</span>
      </div>

      <label className="oNhap">
        <span>{CHU.nhaCungCap}</span>
        {/* Đổi nhà cung cấp thì ô Model ĐỔI THEO — hai ô này không độc lập.
            Một tên model chỉ có nghĩa BÊN TRONG một nhà cung cấp: `cx/gpt-5.5` là model của
            9Router, ở `gateway.dichvuright.ai` nó không mang nghĩa gì. Giữ nguyên ô Model khi
            đổi ô này là cho phép dựng ra một cặp KHÔNG TỒN TẠI, và đó chính là ca hỏng đo
            được trên máy người dùng — ba vai trỏ `openai · cx/gpt-5.5` trong khi `openai` chỉ
            khai `claude-opus-5`, rồi lượt chạy chết ở Arbiter với một thông báo về khóa API.

            Giữ tên khi nhà cung cấp mới CÓ khai đúng tên đó: nhiều gateway phục vụ chung một
            danh mục, nên ép về model đầu tiên trong mọi ca sẽ xóa mất lựa chọn đang đúng. */}
        <select
          value={p}
          onChange={(e) => {
            const ncc = e.target.value;
            datP(ncc);
            const khai = (du.providers.find((x) => x.name === ncc)?.models ?? []).map((x) => x.name);
            if (!khai.includes(m)) datM(khai[0] ?? '');
          }}
        >
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
            <option key={x} value={x} />
          ))}
        </datalist>
      </label>

      {/* Chưa hỏi nhà cung cấp CỦA KÊNH NÀY thì ô Model gần như không có gợi ý — và sau khi
          gộp bề mặt, nút nạp chung đã biến mất nên không còn đường nào rõ ràng để lấy danh
          sách. Đo được khi rà lại: bốn ô Model với datalist một mục và không nút nào cạnh.
          Nút chỉ hiện khi CHƯA hỏi, và hỏi theo đúng nhà cung cấp của kênh — bốn kênh trỏ
          cùng một nơi thì lượt đầu đã trả lời cho cả bốn. */}
      {!napVe.daHoi(p) ? (
        <div className="hangBo">
          <button
            type="button"
            className="nutPhu"
            onClick={() => {
              datDaBamNap(true);
              napVe.nap(p);
            }}
            disabled={daBamNap && napVe.dangNapCua(p)}
          >
            {daBamNap && napVe.dangNapCua(p) ? CHU.dangNapModel : CHU.napModel}
          </button>
          {napVe.loiCua(p) ? <span className="mo">{napVe.loiCua(p)}</span> : null}
        </div>
      ) : null}

      {/* Model đang đặt KHÔNG nằm trong danh sách nhà cung cấp vừa trả về.
          Cảnh báo này trước đây chỉ có ở khối "Mặc định" của màn Cấu hình; nó theo model
          sang đây vì đây mới là chỗ model được chọn, và giờ nó canh được CẢ BỐN vai chứ
          không riêng vai mặc định. Ca thật: provider khai `cx/gpt-5.5`, ô này gõ `gpt-5.5`,
          engine chết ở Arbiter với một thông báo nói về KHÓA API. */}
      {modelLa ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>{GIAI_THICH.modelKhongCoThat(m, p)}</span>
        </p>
      ) : chuaKhai ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>{GIAI_THICH.modelChuaKhai(m, p)}</span>
        </p>
      ) : null}

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
