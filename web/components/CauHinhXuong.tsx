'use client';

import { useEffect, useState } from 'react';

import { LoiApi, layCauHinh, luuCauHinh, type SuaCauHinh } from '@/lib/api';
import { useModelNapVe, type ModelNapVe } from '@/lib/modelNapVe';
import { CHU, GIAI_THICH, nhanKenhVai } from '@/lib/nhan';
import type { CauHinhDoc, NhaCungCap } from '@/lib/types';

import { ChuyenNhaCungCap } from './ChuyenNhaCungCap';
import { KenhVaiChung } from './KenhVaiChung';

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

  /**
   * MỘT bộ nạp cho cả màn, dùng chung giữa thẻ nhà cung cấp và khối Mặc định.
   *
   * Hai khối hỏi CÙNG một câu tới cùng một nhà cung cấp. Để mỗi khối một bộ state riêng thì
   * bấm "Kiểm tra" trên thẻ `kiraai` xong, khối Mặc định vẫn phải gọi lại lần nữa mới có
   * danh sách gợi ý — hai lượt gọi ra ngoài cho một câu trả lời, và người dùng không hiểu
   * vì sao vừa kiểm xong mà ô Model vẫn trống gợi ý.
   */
  const napVe = useModelNapVe();

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
          <NhaCungCapList du={du} lanDau={lanDau} napVe={napVe} onXong={daLuu} />
          {/* Chưa có nhà cung cấp nào thì không có gì để phân vai: ô chọn sẽ rỗng và nút Lưu
              vô hiệu. Hiện một khối như thế ở đúng bước đầu tiên là thêm nhiễu vào lúc người
              dùng cần ít lựa chọn nhất. Biểu mẫu nhà cung cấp tự đặt mặc định khi đây là cái
              đầu tiên (xem `!du.provider` trong FormNhaCungCap). */}
          {du.providers.length > 0 ? (
            <>
              {/* Dải kênh vai đứng NGAY DƯỚI danh sách nhà cung cấp, cùng một bề mặt.
                  Trước bản này nó là một khu riêng (`kenh-vai-chung`), và cái giá đo được là:
                  hai màn cùng có một ô "Mặc định · nhà cung cấp + model" ghi vào cùng
                  `cfg.Provider`, hai nút nạp model, và không màn nào cho thấy vai nào đang
                  dùng nhà cung cấp nào. Thêm một nhà cung cấp xong phải tự đoán ra rằng còn
                  một màn khác nữa mới dùng được nó. */}
              <KenhVaiChung du={du} napVe={napVe} onXong={daLuu} />
              <MacDinhKhac du={du} onXong={daLuu} />
            </>
          ) : null}
        </>
      ) : null}

      <div style={{ height: 8 }} />
    </main>
  );
}

/* ── nhà cung cấp ──────────────────────────────────────────────────────── */

/**
 * Những vai đang thật sự gọi tới một nhà cung cấp.
 *
 * # Vì sao tính cả vai THỪA HƯỞNG, không chỉ vai đặt riêng
 *
 * Một vai không có trong `cfg.Roles` vẫn đang gọi tới nhà cung cấp mặc định — nó chỉ không nói
 * ra. Đếm mỗi vai đặt riêng sẽ cho ra câu "chưa vai nào dùng" trên đúng nhà cung cấp đang gánh
 * cả dây chuyền, và người dùng bấm Xóa nó mà không thấy gì cản.
 *
 * Đây là câu trả lời cho một lỗ hổng đo được: màn này có nút Xóa và nút Sửa cho mỗi nhà cung
 * cấp, nhưng không chỗ nào cho biết đụng vào thì gãy ai.
 */
function vaiDungNhaCungCap(du: CauHinhDoc, ten: string): string[] {
  const roles = du.roles ?? {};
  return du.role_names.filter((vai) =>
    vai === 'default' ? du.provider === ten : (roles[vai]?.provider ?? du.provider) === ten,
  );
}

function NhaCungCapList({
  du,
  lanDau,
  napVe,
  onXong,
}: {
  du: CauHinhDoc;
  lanDau: boolean;
  napVe: ModelNapVe;
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
                du={du}
                laMacDinh={n.name === du.provider}
                dungBoi={vaiDungNhaCungCap(du, n.name)}
                napVe={napVe}
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

/**
 * Một thẻ nhà cung cấp.
 *
 * # Vì sao nút "Kiểm tra" nằm ở ĐÂY, chứ không chỉ ở khối Mặc định
 *
 * Khối Mặc định đã có một nút cùng cơ chế, nhưng nó chỉ kiểm được nhà cung cấp ĐANG LÀ mặc
 * định. Người dùng vừa thêm một nhà cung cấp thứ hai không có đường nào hỏi "cái vừa gõ có
 * sống không" — phải đặt nó làm mặc định trước, tức đổi cấu hình thật chỉ để thử một khóa.
 * Với người đang gõ base_url của một gateway riêng, đó đúng là lúc cần câu trả lời nhất.
 *
 * # Vì sao vẫn là `/api/models` chứ không phải một lượt chat thử
 *
 * Giữ nguyên lý lẽ của `handleLietKeModel`: một lượt chat thử tiêu tiền thật và không kiểm
 * thêm được gì. Gọi được = địa chỉ gốc đúng và mạng thông; 200 = khóa còn sống; có tên trong
 * danh sách = model khai đúng. Ba câu hỏi ấy là toàn bộ thứ hỏng ở bước này, và trả lời
 * chúng miễn phí.
 */
function MotNhaCungCap({
  n,
  du,
  laMacDinh,
  dungBoi,
  napVe,
  onSua,
  onXong,
}: {
  n: NhaCungCap;
  du: CauHinhDoc;
  laMacDinh: boolean;
  /** Vai đang gọi tới nhà cung cấp này, kể cả vai thừa hưởng mặc định. */
  dungBoi: string[];
  napVe: ModelNapVe;
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

  // `daBam` — thẻ NÀY đã được bấm Kiểm tra chưa.
  //
  // Cần một cờ riêng dù bộ nạp đã nhớ theo nhà cung cấp, vì hai câu hỏi khác nhau:
  // `napVe.daHoi(n.name)` là "ai đó đã hỏi nhà cung cấp này" — đúng cả khi người hỏi là khối
  // Mặc định. ĐO ĐƯỢC: `kiraai` vừa là mặc định, nên bấm Kiểm tra ở thẻ nó làm khối Mặc định
  // cũng hiện dòng "Gọi được…", và một cú bấm sáng lên hai chỗ. Bộ nhớ dùng chung là để KHỎI
  // GỌI LẠI, không phải để thay lời cho một điều khiển người dùng chưa đụng tới.
  const [daBam, datDaBam] = useState(false);

  // Cả trạng thái ĐANG BAY cũng phải theo cú bấm, không chỉ kết quả: hai nhà cung cấp có thể
  // trùng tên với nhà cung cấp mặc định, và khi đó một cú bấm làm hai nút cùng đổi chữ.
  //
  // Bấm chồng lên một lượt đang bay vẫn đúng: `nap` bỏ qua lượt gọi trùng, nhưng `daBam` được
  // đặt nên nút này vẫn hiện "đang…" và vẫn nhận kết quả chung lúc nó về.
  /**
   * Xóa nhà cung cấp phải GỠ LUÔN những vai ghim vào nó.
   *
   * Không phải để gọn: `NewModelSet` trả lỗi `role %s references unknown provider` khi một vai
   * trỏ vào nhà cung cấp không còn, và lỗi đó làm `host.New` hỏng — tức KHÔNG MỞ ĐƯỢC MÁY cho
   * bất kỳ cuốn nào, cho tới khi ai đó sửa tay tệp cấu hình. Một cú bấm Xóa không được phép
   * dẫn tới đó, và một dòng cảnh báo cũng không đủ: nó vẫn để lại cái bẫy cho người bấm tiếp.
   *
   * Một lượt ghi làm cả hai việc: `PUT /api/config` xử lý `remove_provider` TRƯỚC rồi mới thay
   * cả map `roles`, nên gửi kèm map đã lọc là đủ.
   */
  const vaiGhim = Object.entries(du.roles ?? {})
    .filter(([, v]) => v.provider === n.name)
    .map(([k]) => k);
  const roleConLai = Object.fromEntries(
    Object.entries(du.roles ?? {}).filter(([, v]) => v.provider !== n.name),
  );

  // Hộp chuyển dây chuyền. Mở khi bấm "Dùng làm mặc định" mà còn vai đặt riêng ở nơi khác —
  // đó là lúc câu hỏi thật sự có ba đáp án chứ không một.
  const [hoiChuyen, datHoiChuyen] = useState(false);

  const dangKiem = daBam && napVe.dangNapCua(n.name);
  const loiKiem = daBam ? napVe.loiCua(n.name) : null;
  const daKiem = daBam && napVe.daHoi(n.name);
  const dsThat = napVe.modelCua(n.name);
  // Tên model KHAI trong thẻ mà nhà cung cấp không trả về. Chỉ tính khi nhà cung cấp có trả
  // một danh sách khác rỗng: rỗng nghĩa là gateway không liệt kê, không phải mọi tên đều sai.
  const khaiLa =
    daKiem && dsThat.length > 0
      ? (n.models ?? []).map((m) => m.name).filter((ten) => !dsThat.includes(ten))
      : [];

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
        {/* Dòng NỐI thẻ này với dải kênh vai ngay dưới. Không có nó thì hai khối trên cùng một
            bề mặt vẫn là hai danh sách rời — và nút Xóa vẫn bấm trong mù. */}
        <dt>{CHU.dungBoi}</dt>
        <dd>
          {dungBoi.length > 0 ? (
            dungBoi.map(nhanKenhVai).join(', ')
          ) : (
            <span className="chuacap">{CHU.khongVaiNaoDung}</span>
          )}
        </dd>
      </dl>
      {loi ? <p className="loiDoc">{loi}</p> : null}

      {/* Kết quả kiểm tra đứng NGAY TRÊN hàng nút, không ở cuối thẻ: người dùng vừa bấm ở
          hàng nút và mắt còn ở đó. Đặt xa hơn là bắt họ đi tìm câu trả lời của chính cú bấm
          vừa rồi. */}
      {loiKiem ? <p className="loiDoc">{loiKiem}</p> : null}
      {daKiem ? <p className="steerhint">{GIAI_THICH.napModelXong(dsThat.length)}</p> : null}
      {khaiLa.length > 0 ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>{GIAI_THICH.nccKhaiModelLa(khaiLa, n.name)}</span>
        </p>
      ) : null}

      <div className="nccNut">
        {/* Chưa lưu khóa thì server từ chối — tắt nút kèm lý do thay vì để nó bấm được rồi
            luôn trả lỗi. Ngoài ca đó, nút chỉ tắt khi CHÍNH NÓ đang bay: tắt theo một cờ
            chung làm cả màn xám đi cho một lượt gọi duy nhất. */}
        <button
          type="button"
          className="nutPhu"
          onClick={() => {
            datDaBam(true);
            napVe.nap(n.name);
          }}
          disabled={dangGui || dangKiem || !n.api_key_set}
          title={n.api_key_set ? undefined : GIAI_THICH.nccChuaCoKhoaDeKiem}
        >
          {dangKiem ? CHU.dangKiemTraNcc : CHU.kiemTraNcc}
        </button>
        <button type="button" className="nutPhu" onClick={onSua} disabled={dangGui}>
          {CHU.sua}
        </button>
        {!laMacDinh ? (
          <button
            type="button"
            className="nutPhu"
            disabled={dangGui}
            /* MỌI lần đổi mặc định đều mở bảng, không chỉ khi có vai đặt riêng.
               Bản đầu chỉ hỏi ở ca có vai lạc chỗ, và ĐO ĐƯỢC là nó im lặng đúng lúc hệ quả
               lớn nhất: khi mọi vai đang thừa hưởng, một cú bấm dời CẢ BỐN vai sang một nhà
               cung cấp khác với một model khác hẳn về giá. Người dùng bấm rồi hỏi "sao không
               thấy có hỏi gì nhỉ, vẫn không có gì xảy ra". */
            onClick={() => datHoiChuyen(true)}
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
            title={vaiGhim.length > 0 ? GIAI_THICH.xoaNccGoLuonGhim(vaiGhim.map(nhanKenhVai)) : undefined}
            onClick={() => goi({ remove_provider: n.name, roles: roleConLai })}
          >
            {CHU.xoa}
          </button>
        ) : null}
      </div>

      {hoiChuyen ? (
        <ChuyenNhaCungCap
          du={du}
          den={{ provider: n.name, model: n.models?.[0]?.name ?? '' }}
          dangGui={dangGui}
          onHuy={() => datHoiChuyen(false)}
          onChiDoiMacDinh={() => {
            datHoiChuyen(false);
            goi({ provider: n.name, model: n.models?.[0]?.name ?? '' });
          }}
          onChuyenCaDay={(than) => {
            datHoiChuyen(false);
            goi(than);
          }}
        />
      ) : null}
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

  /**
   * Tên đã có thẻ khác chiếm — CHỈ xét ở chế độ thêm mới.
   *
   * Ở chế độ sửa, `ten` chính là tên thẻ đang sửa nên nó luôn "trùng" với chính nó; ô tên cũng
   * `readOnly` ở đó, nên không có gì để chặn.
   */
  const trungTen = !cu && du.providers.some((x) => x.name === ten.trim());

  const dungMau = (tenMau: string) => {
    const m = du.presets.find((p) => p.label === tenMau);
    if (!m) return;
    if (m.name) datTen(m.name);
    if (m.type) datLoai(m.type);
    datBaseURL(m.base_url ?? '');
  };

  const gui = () => {
    // Hàng rào thứ hai, sau `disabled` của nút: biểu mẫu còn submit được bằng phím Enter.
    if (trungTen) return;
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

      {trungTen ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>{GIAI_THICH.nccTrungTen(ten.trim())}</span>
        </p>
      ) : null}
      {loi ? <p className="loiDoc">{loi}</p> : null}

      <div className="nccNut">
        {/* `disabled` khi đang gửi là bắt buộc, không phải trang trí: bấm hai lần ở đây
            là hai lượt ghi cấu hình chồng nhau. */}
        <button type="submit" className="nutChinh" disabled={dangGui || !ten.trim() || trungTen}>
          {dangGui ? CHU.dangLuu : CHU.luu}
        </button>
        <button type="button" className="nutPhu" onClick={onHuy} disabled={dangGui}>
          {CHU.huy}
        </button>
      </div>
    </form>
  );
}

/* ── mặc định khác của máy ─────────────────────────────────────────────── */

/**
 * Kiểu văn và độ suy luận mặc định.
 *
 * # Vì sao khối này KHÔNG còn ô nhà cung cấp và ô model
 *
 * Chúng chuyển hết sang dải kênh vai phía trên, và đó là bỏ một bản SAO chứ không phải dời
 * một tính năng: ô "Mặc định" ở đây và kênh "Mặc định" của dải vai ghi vào cùng một chỗ
 * (`cfg.Provider` + `cfg.ModelName`), nên hai ô luôn phải nói cùng một điều — và bất cứ lúc
 * nào một trong hai được lưu, ô kia phải tự đổi theo hoặc nó nói dối.
 *
 * Giữ lại hai ô này ở đây thì người dùng còn phải trả lời một câu không có câu trả lời đúng:
 * "đặt model mặc định ở ô nào?". Bỏ đi thì dải vai là chỗ DUY NHẤT chọn model, và khối này
 * chỉ còn đúng những thứ không thuộc về vai nào.
 */
function MacDinhKhac({ du, onXong }: { du: CauHinhDoc; onXong: () => void }) {
  const [style, datStyle] = useState(du.style);
  const [effort, datEffort] = useState(du.reasoning_effort ?? '');
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [xong, datXong] = useState<string[] | null>(null);

  // Kiểu văn đang đặt mà KHÔNG có thật: engine bỏ qua âm thầm. Nói ra, vì đây đúng là ca đã
  // xảy ra thật (một cuốn 8 chương chạy với `tien_hiep` và không nhận được tham chiếu thể
  // loại nào).
  const kieuVanLa = !!du.style && !du.styles.includes(du.style);
  const doi = style !== du.style || effort !== (du.reasoning_effort ?? '');

  const gui = () => {
    datDangGui(true);
    datLoi(null);
    datXong(null);
    // CHỈ gửi hai trường của khối này. `thanCauHinh` ở server dùng con trỏ, nên trường vắng
    // mặt nghĩa là "giữ nguyên" — gửi kèm provider/model ở đây sẽ ghi đè thứ mà dải kênh vai
    // vừa lưu.
    luuCauHinh({ style, reasoning_effort: effort })
      .then((r) => {
        datXong(r.reopen_to_apply);
        onXong();
      })
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  return (
    <section className="sect">
      <h2>{CHU.macDinhKhac}</h2>

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
          <span>{CHU.kieuVanMacDinh}</span>
          {/* Danh sách ĐÓNG, và đó là quyết định có bằng chứng: giá trị lạ bị engine bỏ qua
              không lỗi không cảnh báo, nên một ô nhập tự do ở đây là mời người dùng tin mình
              đã chọn thể loại trong khi không có gì được áp. */}
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
          {/* Nút chỉ bật khi có gì ĐỔI THẬT — cùng luật với dải kênh vai ngay trên. */}
          <button type="submit" className="nutChinh" disabled={dangGui || !doi}>
            {dangGui ? CHU.dangLuu : CHU.luu}
          </button>
        </div>
      </form>
    </section>
  );
}
