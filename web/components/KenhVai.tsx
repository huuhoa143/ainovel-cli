'use client';

import { useEffect, useState } from 'react';

import { LoiApi, doiVaiModel, layVaiModel, moMay } from '@/lib/api';
import { CHU, GIAI_THICH, nhanKenhVai } from '@/lib/nhan';
import type { KenhVaiMuc, VaiModelDoc } from '@/lib/types';

/**
 * Bốn kênh model — bản web của `/model` trong TUI.
 *
 * # Vì sao dựng như channel strip của bàn trộn
 *
 * `default / architect / writer / editor` không phải một danh sách cài đặt: chúng là
 * bốn đường song song của CÙNG một dây chuyền, và người vận hành so chúng theo cột
 * (vai này đang dùng model nào so với vai kia). Đó đúng là việc mà channel strip làm.
 * Dựng thành bốn khối `<dl>` xếp dọc sẽ mất phép so sánh theo cột — thứ duy nhất đáng
 * xem ở đây.
 *
 * # Vì sao đòi engine ĐANG MỞ
 *
 * `Host.SwitchModel` dựng lại model set của engine đang chạy RỒI mới ghi cấu hình.
 * Không có engine thì không có gì để dựng lại, và tự ghi `cfg.Roles` sẽ tạo ra cảnh
 * tệp nói model mới trong khi dây chuyền chạy model cũ. Đổi mặc định cho lượt sau là
 * việc của bề mặt Cấu hình máy.
 *
 * `arbiter` cố ý KHÔNG có kênh: `host.arbiterModel` luôn dùng model mặc định, nên một
 * ô chọn cho nó là ô người dùng đổi mà không có tác dụng.
 */
export function KenhVai({
  tacPham,
  khoiDong,
}: {
  tacPham: string | undefined;
  /** `provider · model` mà engine ĐÃ khởi động, để nói ra khi nó đã lệch so với hiện tại. */
  khoiDong?: string;
}) {
  const [du, datDu] = useState<VaiModelDoc | null>(null);
  const [loi, datLoi] = useState<{ thongDiep: string; chuaMoMay: boolean } | null>(null);

  const tai = () => {
    if (!tacPham) return;
    layVaiModel(tacPham)
      .then((d) => {
        datDu(d);
        datLoi(null);
      })
      .catch((e: unknown) => {
        // 409 = chưa mở engine. Đó KHÔNG phải lỗi cần báo đỏ: nó là trạng thái bình
        // thường của mọi cuốn không chạy, và câu trả lời đúng là một dòng giải thích.
        const chuaMo = e instanceof LoiApi && e.status === 409;
        datLoi({ thongDiep: e instanceof Error ? e.message : String(e), chuaMoMay: chuaMo });
        datDu(null);
      });
  };
  useEffect(tai, [tacPham]);

  if (loi?.chuaMoMay) {
    return (
      <section className="sect">
        {/* KHÔNG dùng "Đang chạy với" ở đây: chưa có gì chạy. Xem `CHU.mayDangDong`. */}
        <h2>{CHU.mayDangDong}</h2>
        <p className="trongSect">{GIAI_THICH.kenhVaiCanMayMo}</p>
        {/* Nút MỞ, không phải nút Chạy. Mở engine không gọi LLM lần nào; gộp hai việc
            lại sẽ khiến người dùng phải tiêu tiền để đổi một ô cấu hình. */}
        <MoMayNut tacPham={tacPham} onXong={tai} />
      </section>
    );
  }
  if (loi) {
    return (
      <section className="sect">
        <h2>{CHU.kenhVai}</h2>
        <p className="loiDoc">{loi.thongDiep}</p>
      </section>
    );
  }
  if (!du || !tacPham) return null;

  const coThuaHuong = du.channels.some((k) => !k.explicit);
  // Kênh mặc định là thứ so được với `run.json`: `host.arbiterModel` và mọi vai thừa hưởng
  // đều theo nó.
  const macDinh = du.channels.find((k) => k.role === 'default');
  const dangChay = macDinh ? `${macDinh.provider} · ${macDinh.model}` : undefined;
  const daDoi = !!khoiDong && !!dangChay && khoiDong !== dangChay;

  return (
    <section className="sect">
      <h2>{CHU.kenhVai}</h2>
      {/* Hai hệ quả của một cú Lưu ở đây, và cái thứ hai là thứ người dùng không đoán được:
          `Host.SwitchModel` ghi luôn `cfg.Roles` xuống tệp, nên "đổi cho lượt này" dính vĩnh
          viễn. Ba dòng ghim lạ trong tệp cấu hình ra đời đúng theo đường đó. */}
      <p className="steerhint">{GIAI_THICH.kenhVaiAnNgayVaGhi}</p>
      {/* Khối trên in giá trị LÚC KHỞI ĐỘNG. Khi nó đã khác giá trị đang chạy, màn hình có hai
          con số cho cùng một câu hỏi — nên nói thẳng ra thay vì để người đọc tự phát hiện. */}
      {daDoi ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>{GIAI_THICH.kenhVaiDaDoiSoVoiKhoiDong(khoiDong!, dangChay!)}</span>
        </p>
      ) : null}
      {coThuaHuong ? <p className="steerhint">{GIAI_THICH.kenhVaiThuaHuong}</p> : null}
      <div className="kenhDai">
        {du.channels.map((k) => (
          <MotKenh key={k.role} tacPham={tacPham} k={k} du={du} onXong={tai} />
        ))}
      </div>
    </section>
  );
}

/** Mở engine để dải kênh dùng được, không kèm một lượt chạy nào. */
function MoMayNut({ tacPham, onXong }: { tacPham: string | undefined; onXong: () => void }) {
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  if (!tacPham) return null;
  return (
    <>
      {loi ? <p className="loiDoc">{loi}</p> : null}
      <button
        type="button"
        className="nutPhu"
        disabled={dangGui}
        onClick={() => {
          datDangGui(true);
          datLoi(null);
          moMay(tacPham)
            .then(onXong)
            .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
            .finally(() => datDangGui(false));
        }}
      >
        {dangGui ? CHU.dangLuu : CHU.moMay}
      </button>
    </>
  );
}

function MotKenh({
  tacPham,
  k,
  du,
  onXong,
}: {
  tacPham: string;
  k: KenhVaiMuc;
  du: VaiModelDoc;
  onXong: () => void;
}) {
  const [provider, datProvider] = useState(k.provider);
  const [model, datModel] = useState(k.model);
  const [thinking, datThinking] = useState(k.thinking);
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);

  // Đồng bộ lại khi dữ liệu server đổi (sau một lượt lưu, hoặc sau khi đổi mặc định làm
  // các vai thừa hưởng đổi theo). Không có cái này thì ô vẫn hiện giá trị cũ và người
  // dùng tưởng lượt lưu không ăn.
  useEffect(() => {
    datProvider(k.provider);
    datModel(k.model);
    datThinking(k.thinking);
  }, [k.provider, k.model, k.thinking]);

  const doi = kiemDoi(k, provider, model, thinking);

  const gui = () => {
    datDangGui(true);
    datLoi(null);
    doiVaiModel(tacPham, {
      role: k.role,
      ...(doi.model ? { provider, model } : {}),
      ...(doi.thinking ? { thinking } : {}),
    })
      .then(onXong)
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  const dsModel = du.models_by_provider[provider] ?? [];

  return (
    <form
      className={`kenh${k.explicit ? ' rieng' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        gui();
      }}
    >
      <div className="kenhDau">
        <span className="kenhTen">{nhanKenhVai(k.role)}</span>
        <span className="kenhNguon">{k.explicit ? CHU.datRieng : CHU.thuaHuong}</span>
      </div>

      <label className="oNhap">
        <span>{CHU.nhaCungCap}</span>
        <select value={provider} onChange={(e) => datProvider(e.target.value)}>
          {du.providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label className="oNhap">
        <span>{CHU.model}</span>
        <input
          value={model}
          onChange={(e) => datModel(e.target.value)}
          list={`ds-${k.role}`}
          required
        />
        <datalist id={`ds-${k.role}`}>
          {dsModel.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>

      {/* Chỉ hiện ô độ suy luận khi model này CÓ mức nào để chọn. Model không hỗ trợ thì
          một ô rỗng là ô người dùng thử đổi rồi nhận lỗi từ tầng dưới. */}
      {k.thinking_options.length > 0 ? (
        <label className="oNhap">
          <span>{CHU.doSuyLuan}</span>
          <select value={thinking} onChange={(e) => datThinking(e.target.value)}>
            {k.thinking_options.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {loi ? <p className="loiDoc">{loi}</p> : null}

      {/* Nút chỉ bật khi có gì ĐỔI THẬT. Một nút Lưu luôn bật ở bốn kênh cạnh nhau mời
          người dùng bấm bừa, và mỗi cú bấm là một lượt dựng lại model set của engine
          đang chạy. */}
      <button
        type="submit"
        className="nutChinh"
        disabled={dangGui || (!doi.model && !doi.thinking)}
      >
        {dangGui ? CHU.dangLuu : CHU.luu}
      </button>
    </form>
  );
}

/**
 * Cái gì đã đổi so với server.
 *
 * Tách thành hàm vì `PUT` đòi CẢ provider và model khi đổi model (gửi lẻ một nửa bị
 * server từ chối), nên phép so phải nhóm hai trường đó lại thành MỘT thay đổi.
 */
function kiemDoi(
  k: KenhVaiMuc,
  provider: string,
  model: string,
  thinking: string,
): { model: boolean; thinking: boolean } {
  return {
    model: provider !== k.provider || model !== k.model,
    thinking: thinking !== k.thinking,
  };
}
