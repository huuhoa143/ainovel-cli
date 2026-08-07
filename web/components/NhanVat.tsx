'use client';

import { layNhanVat } from '@/lib/api';
import { CHU, GIAI_THICH, nhanHang } from '@/lib/nhan';
import type { Character, CharacterSnapshot } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HoSoKhung, MucRong, tinhTrangHoSo } from './HoSoKhung';

/**
 * Nhân vật: hồ sơ tĩnh + ảnh chụp trạng thái ở cuối cung gần nhất.
 *
 * Hai nguồn này KHÔNG được trộn thành một khối: hồ sơ là điều Architect đặt ra
 * từ đầu (vai, nét tính cách, đường dây), còn ảnh chụp là điều đã XẢY RA với
 * nhân vật đó tính tới cuối cung gần nhất (`CharacterSnapshot`, engine ghi ở
 * ranh giới cung). Trộn lại thì không còn phân biệt được "dự định" với "hiện
 * trạng" — đúng thứ người vận hành cần đối chiếu khi Editor báo hành vi nhân vật
 * lệch khỏi tính cách.
 *
 * Không có lưới thẻ giống nhau lặp lại: mỗi nhân vật là một hàng có cấp bậc rõ,
 * xếp theo hạng, vì hạng là thứ quyết định nhân vật nào đáng đọc trước.
 */
export function NhanVat({ tacPham }: { tacPham: string | undefined }) {
  const tai = useHoSo(tacPham, layNhanVat);
  const tt = tinhTrangHoSo(tai);

  const ds = tai.du?.characters ?? null;
  const anh = tai.du?.snapshots ?? null;

  return (
    <HoSoKhung tieuDe={CHU.nhanVat} motTa={ds && ds.length > 0 ? `${ds.length} nhân vật` : undefined}>
      {tt ?? (
        <>
          <section className="sect">
            {ds && ds.length > 0 ? (
              <ul className="dsHoSo">
                {xepTheoHang(ds).map((c) => (
                  <NguoiMot key={c.name} c={c} anh={anhCua(anh, c.name)} />
                ))}
              </ul>
            ) : (
              <MucRong mang={ds} muc="nhân vật" />
            )}
          </section>

          {/* Ảnh chụp là dữ liệu riêng và có thể vắng dù danh sách nhân vật đã
              có: engine chỉ ghi ảnh chụp khi dây chuyền đi qua ranh giới cung. */}
          {ds && ds.length > 0 && (!anh || anh.length === 0) ? (
            <section className="sect">
              <h2>{CHU.trangThaiCuoiCung}</h2>
              <p className="trongSect">{GIAI_THICH.khongCoAnhChup}</p>
            </section>
          ) : null}
        </>
      )}
    </HoSoKhung>
  );
}

/**
 * Thứ tự đọc: cốt lõi trước, điểm xuyết sau.
 *
 * `tier` vắng nghĩa là `important` theo mặc định của server
 * (internal/domain/story.go:26) nên nó xếp cùng nhóm quan trọng, không rơi
 * xuống cuối như một hạng không rõ.
 */
const THU_TU_HANG = ['core', 'important', 'secondary', 'decorative'];

function xepTheoHang(ds: Character[]): Character[] {
  const bac = (c: Character) => {
    const i = THU_TU_HANG.indexOf((c.tier ?? 'important').toLowerCase().trim());
    return i < 0 ? THU_TU_HANG.length : i;
  };
  return [...ds].sort((a, b) => bac(a) - bac(b));
}

function anhCua(
  anh: CharacterSnapshot[] | null,
  ten: string,
): CharacterSnapshot | undefined {
  return anh?.find((s) => s.name === ten);
}

/**
 * Một nhân vật — GẬP ĐƯỢC, và mặc định chỉ hạng cốt lõi mở sẵn.
 *
 * # Vì sao gập, đo được trên tác phẩm thật
 *
 * Tám nhân vật, trung bình **501px mỗi hồ sơ**, tổng **4.083px — 6,3 màn hình**.
 * Muốn nhìn nhân vật thứ năm phải cuộn 2.403px, và không có mục lục nào. Nên câu
 * hỏi rẻ nhất mà bề mặt này phải trả lời — *"cuốn này có những ai"* — lại là câu
 * đắt nhất: phải cuộn hết sáu màn rồi tự nhớ.
 *
 * Gập lại thì tám dòng tên vừa MỘT màn. Người vận hành thấy cả dàn trước, rồi mở
 * đúng người họ cần. Đó là thứ tự đúng của việc: biết có ai, rồi mới đọc về ai.
 *
 * # Vì sao ĐÓNG HẾT, kể cả nhân vật cốt lõi
 *
 * Bản đầu mở sẵn hạng `core`, và đo lại thì nó vẫn hỏng: riêng Lâm Kỳ đã chiếm
 * trọn một màn hình, nên bảy người kia vẫn nằm dưới mép — tức câu hỏi "cuốn này
 * có những ai" vẫn phải cuộn mới trả lời được, chỉ là cuộn ít hơn.
 *
 * Đóng hết thì DANH SÁCH chính là câu trả lời: tám dòng mang tên, hạng, vai và bí
 * danh — đủ dày để tự nó là một bề mặt có tin, không phải một hàng nút chờ bấm.
 * Đọc kỹ một người là việc thứ hai, và nó tốn đúng một cú bấm.
 *
 * # `<details>` chứ không phải state React
 *
 * Nó cho sẵn bàn phím (Enter/Space), `aria-expanded`, và tìm-trong-trang của
 * trình duyệt mở được khối đang đóng. Dựng lại bằng `useState` là dựng lại ba thứ
 * đó, và thường là dựng thiếu.
 */
function NguoiMot({ c, anh }: { c: Character; anh: CharacterSnapshot | undefined }) {
  const nets = c.traits ?? [];
  const hang = (c.tier ?? 'important').toLowerCase();

  return (
    <li className="nguoi">
      <details className="nguoiHop">
        <summary className="nguoidau">
          <h3>{c.name}</h3>
          <span className={`hang h-${hang}`}>{nhanHang(c.tier)}</span>
          {c.role ? <span className="vai">{c.role}</span> : null}
          {/* Bí danh lên DÒNG TÓM: đó là tên mà người vận hành hay gõ tìm, và một
              cái tên chỉ tra được sau khi bấm mở thì không tra được. */}
          {c.aliases && c.aliases.length > 0 ? (
            <span className="biDanh">{c.aliases.join(' · ')}</span>
          ) : null}
        </summary>

        <div className="nguoiThan">
          {c.description ? <p className="tavan">{c.description}</p> : null}

          <dl className="kv kvnguoi">
            {c.arc ? (
              <>
                <dt title={CHU.duongDayDay}>{CHU.duongDay}</dt>
                <dd>{c.arc}</dd>
              </>
            ) : null}
            {nets.length > 0 ? (
              <>
                <dt>{CHU.netTinhCach}</dt>
                <dd>{nets.join(' · ')}</dd>
              </>
            ) : null}
          </dl>

          {anh ? (
            <div className="anhchup">
              <h4>
                {CHU.trangThaiCuoiCung} · <span className="m">T{anh.volume}·C{anh.arc}</span>
              </h4>
              <dl className="kv kvnguoi">
                {anh.status ? (
                  <>
                    <dt>{CHU.hienTrang}</dt>
                    <dd>{anh.status}</dd>
                  </>
                ) : null}
                {anh.motivation ? (
                  <>
                    <dt>{CHU.dongLuc}</dt>
                    <dd>{anh.motivation}</dd>
                  </>
                ) : null}
                {anh.power ? (
                  <>
                    <dt>{CHU.nangLuc}</dt>
                    <dd>{anh.power}</dd>
                  </>
                ) : null}
                {anh.relations ? (
                  <>
                    <dt>{CHU.quanHe}</dt>
                    <dd>{anh.relations}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}
