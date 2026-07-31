'use client';

import { layVanPhong } from '@/lib/api';
import { CHU, GIAI_THICH, nhanTinhTrangLuat } from '@/lib/nhan';
import type { ArcStyle, CharacterVoice, UserRules } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HoSoKhung, tinhTrangHoSo } from './HoSoKhung';

/**
 * Văn phong: engine đang viết theo luật gì.
 *
 * # Bề mặt này có HAI NGUỒN, và trộn chúng lại là lỗi nặng nhất có thể mắc ở đây
 *
 * `meta/style_rules.json` — Editor CHẮT RA từ chương đã viết, ở biên cung
 * (internal/tools/save_arc_summary.go). Nó là MÔ TẢ: "văn của cuốn này hoá ra
 * đang như thế này".
 *
 * `meta/user_rules.json` — người dùng KHAI, có ngay từ lúc mở sách
 * (internal/userrules/service.go). Nó là CHỈ THỊ: "hãy viết như thế này".
 *
 * Hai thứ đối nhau về chiều nhân quả, và người vận hành mở bề mặt này thường là
 * để đối chiếu đúng hai chiều đó — "tôi dặn thế, nó viết ra thế, lệch ở đâu".
 * Gộp thành một danh sách luật thì câu hỏi đó không còn đặt được. Nên hai nguồn
 * là hai khối, mỗi khối nói rõ mình là loại nào.
 *
 * # Vì sao không bọc thẳng `WritingStyleRules` như thiết kế đầu
 *
 * Vì `style_rules.json` chỉ tồn tại SAU biên cung đầu tiên. Một bề mặt chỉ đọc
 * tệp đó sẽ rỗng trơn suốt cả cung đầu của mọi tác phẩm — tức rỗng đúng lúc
 * người vận hành cần nhất, khi họ vừa dặn xong và muốn biết engine có nghe không.
 * Nguồn thứ hai lấp đúng khoảng đó.
 */
export function VanPhong({ tacPham }: { tacPham: string | undefined }) {
  const tai = useHoSo(tacPham, layVanPhong);
  const tt = tinhTrangHoSo(tai);

  const arc = tai.du?.arc_style ?? null;
  const khai = tai.du?.user_rules ?? null;
  const canhBao = tai.du?.warnings ?? null;

  return (
    <HoSoKhung tieuDe={CHU.vanPhong} motTa={tt ? undefined : motTa(arc, khai)}>
      {tt ?? (
        <>
          {/* Một nguồn hỏng mà nguồn kia còn đọc được thì server trả 200 kèm
              `warnings` — nên ca "đọc được mà hỏng" KHÔNG đi qua nhánh lỗi fetch,
              và nếu chỉ bắt lỗi fetch thì nó biến mất không dấu vết. */}
          {canhBao && canhBao.length > 0 ? (
            <section className="canhbao" aria-label={GIAI_THICH.vpNguonHong}>
              <h2>
                <span aria-hidden="true">■</span>
                {GIAI_THICH.vpNguonHong} · {canhBao.length}
              </h2>
              <ul>
                {canhBao.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {arc === null && khai === null ? (
            <section className="sect">
              <p className="trongSect">{GIAI_THICH.vpChuaCoNguonNao}</p>
            </section>
          ) : (
            <>
              <KhoiKhai khai={khai} />
              <KhoiArc arc={arc} />
            </>
          )}
        </>
      )}
    </HoSoKhung>
  );
}

/**
 * Luật người dùng khai — CHỈ THỊ.
 *
 * Đặt TRƯỚC khối Editor chắt ra, và thứ tự đó có lý: chỉ thị có trước theo thời
 * gian, tồn tại ở mọi tác phẩm kể cả tác phẩm chưa viết chương nào, và nó là mặt
 * mà người vận hành sửa được. Khối mô tả đứng sau để đọc như một câu trả lời.
 */
function KhoiKhai({ khai }: { khai: UserRules | null }) {
  if (khai === null) {
    return (
      <section className="sect">
        <h2>{CHU.vpLuatKhai}</h2>
        <p className="trongSect">{GIAI_THICH.vpChuaMoQuaHost}</p>
      </section>
    );
  }

  const cumCam = khai.forbidden_phrases ?? [];
  const kyCam = khai.forbidden_chars ?? [];
  const tuMoi = khai.fatigue_words ? Object.entries(khai.fatigue_words) : [];
  const khaiTu = khai.declared_by ?? [];
  const chuaChac = khai.uncertain ?? [];

  return (
    <section className="sect">
      <h2>
        {CHU.vpLuatKhai} · <span className="phu">{CHU.vpChiThi}</span>
      </h2>
      <p className="steerhint">{GIAI_THICH.vpNguonKhai}</p>

      {/* `degraded` là tin vận hành thật, không phải chi tiết nội bộ: một nguồn
          chuẩn hoá thất bại và đã bị hạ thành `preferences` thô, nên phần luật
          máy-kiểm-được của nó KHÔNG còn được máy kiểm — chỉ mô hình đọc. Người
          vận hành đọc "đã khai cụm từ cấm" mà engine không cưỡng chế nó nữa thì
          họ cần biết. */}
      {khai.status === 'degraded' ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>
            <strong>{nhanTinhTrangLuat(khai.status)}.</strong> {GIAI_THICH.vpHaCap}
          </span>
        </p>
      ) : null}

      <dl className="kv kvvp">
        {khai.genre ? (
          <>
            <dt>{CHU.vpTheLoai}</dt>
            <dd>{khai.genre}</dd>
          </>
        ) : null}
        {khaiTu.length > 0 ? (
          <>
            <dt title={GIAI_THICH.vpKhaiTuDay}>{CHU.vpKhaiTu}</dt>
            <dd className="m">{khaiTu.join(' · ')}</dd>
          </>
        ) : null}
      </dl>

      {cumCam.length > 0 ? (
        <div className="vpnhom">
          <h3>{CHU.vpCumTuCam}</h3>
          <ul className="vpthe">
            {cumCam.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Ký tự cấm hiện dưới dạng mono và tách rời nhau: phần lớn là dấu câu
          (`—`, `…`, `"`) và một danh sách nối bằng `·` sẽ không phân biệt được
          đâu là ký tự bị cấm, đâu là dấu nối của giao diện. */}
      {kyCam.length > 0 ? (
        <div className="vpnhom">
          <h3>{CHU.vpKyTuCam}</h3>
          <ul className="vpthe vpky">
            {kyCam.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Từ mỏi KHÔNG phải danh sách cấm, và nhãn phải nói ra điều đó: nó là
          hạn mức "tối đa mấy lần MỖI CHƯƠNG". Xếp chung với cụm từ cấm rồi để
          người đọc tự suy là cách một hạn mức bị đọc thành một lệnh cấm. */}
      {tuMoi.length > 0 ? (
        <div className="vpnhom">
          <h3>{CHU.vpTuMoi}</h3>
          <p className="steerhint">{GIAI_THICH.vpTuMoiGiai}</p>
          <ul className="vpmoi">
            {tuMoi.map(([tu, hanMuc]) => (
              <li key={tu}>
                <span className="tu">{tu}</span>
                <span className="han">{CHU.vpToiDaMoiChuong(hanMuc)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* `--ui`, không serif: đây là chữ người vận hành viết cho engine, không
          phải văn nằm trong bộ truyện xuất bản. Phép thử ở DESIGN.md:64. */}
      {khai.preferences ? (
        <div className="vpnhom">
          <h3>{CHU.vpUaThich}</h3>
          <p className="vpvan">{khai.preferences}</p>
        </div>
      ) : null}

      {chuaChac.length > 0 ? (
        <div className="vpnhom">
          <h3>{CHU.vpChuaChacChan}</h3>
          <p className="steerhint">{GIAI_THICH.vpChuaChacGiai}</p>
          <ul className="vpthe vpngo">
            {chuaChac.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Luật Editor chắt ra ở biên cung — MÔ TẢ.
 *
 * `volume`/`arc` không phải nhãn trang trí mà là CỬA SỔ của cả khối: bộ luật này
 * mô tả cung vừa ĐÓNG. Dây chuyền đã sang cung sau thì nó vẫn là bộ mới nhất
 * nhưng không phải bộ của chương đang viết, và câu đó phải đọc được ngay trên bề
 * mặt — không nhét vào `title`, vì một cửa sổ mà phải hover mới biết thì phần lớn
 * người đọc sẽ không biết.
 */
function KhoiArc({ arc }: { arc: ArcStyle | null }) {
  if (arc === null) {
    return (
      <section className="sect">
        <h2>{CHU.vpEditorChatRa}</h2>
        <p className="trongSect">{GIAI_THICH.vpChuaQuaBienCung}</p>
      </section>
    );
  }

  const loiKe = arc.prose ?? [];
  const giong = arc.dialogue ?? [];
  const cam = arc.taboos ?? [];
  const rong = loiKe.length === 0 && giong.length === 0 && cam.length === 0;

  return (
    <section className="sect">
      <h2>
        {CHU.vpEditorChatRa} · <span className="phu">{CHU.vpMoTa}</span>
      </h2>
      <p className="steerhint">{GIAI_THICH.vpNguonArc}</p>
      <p className="vpcuaso">
        <span className="ky" aria-hidden="true">
          ◆
        </span>
        <span>{GIAI_THICH.vpCuaSoArc(arc.volume, arc.arc)}</span>
      </p>

      {/* Tệp có mà chưa chắt được luật nào KHÁC với chưa có tệp — và ở đây ta
          BIẾT là có tệp, vì `arc_style` không null. Nói đúng ca đó. */}
      {rong ? (
        <p className="trongSect">{GIAI_THICH.vpDaGhiMaRong}</p>
      ) : (
        <>
          {loiKe.length > 0 ? (
            <div className="vpnhom">
              <h3>{CHU.vpLoiKe}</h3>
              <ol className="vpluat">
                {loiKe.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {giong.length > 0 ? (
            <div className="vpnhom">
              <h3>{CHU.vpGiongNhanVat}</h3>
              <ul className="vpgiong">
                {giong.map((g) => (
                  <MotGiong key={g.name} g={g} />
                ))}
              </ul>
            </div>
          ) : null}

          {/* Điều cấm mang `--amber` chứ không `--red`: đỏ trong hệ này là LỖI
              đã xảy ra (DESIGN.md:48), còn đây là một ràng buộc đang có hiệu lực.
              Tô đỏ một danh sách luật bình thường làm màu lỗi mất nghĩa. */}
          {cam.length > 0 ? (
            <div className="vpnhom">
              <h3>{CHU.vpDieuCam}</h3>
              <ul className="vpcam">
                {cam.map((c, i) => (
                  <li key={i}>
                    <span className="ky" aria-hidden="true">
                      ■
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function MotGiong({ g }: { g: CharacterVoice }) {
  const luat = g.rules ?? [];
  return (
    <li>
      <h4>{g.name}</h4>
      {luat.length > 0 ? (
        <ul>
          {luat.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : (
        <p className="trongSect">{GIAI_THICH.vpGiongRong}</p>
      )}
    </li>
  );
}

/**
 * Dòng mô tả — chỉ đếm điều đếm được, và nói rõ số nào thuộc nguồn nào.
 *
 * Không gộp thành một tổng "12 luật": hai nguồn khác bản chất nên một tổng chung
 * là một con số không trả lời câu hỏi nào.
 */
function motTa(arc: ArcStyle | null, khai: UserRules | null): string | undefined {
  const phan: string[] = [];
  if (khai) {
    const n =
      (khai.forbidden_phrases?.length ?? 0) +
      (khai.forbidden_chars?.length ?? 0) +
      Object.keys(khai.fatigue_words ?? {}).length;
    phan.push(CHU.vpDemKhai(n));
  }
  if (arc) {
    phan.push(CHU.vpDemChatRa(arc.prose?.length ?? 0, arc.dialogue?.length ?? 0));
  }
  return phan.length > 0 ? phan.join(' · ') : undefined;
}
