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

function NguoiMot({ c, anh }: { c: Character; anh: CharacterSnapshot | undefined }) {
  const nets = c.traits ?? [];

  return (
    <li className="nguoi">
      <div className="nguoidau">
        <h3>{c.name}</h3>
        <span className={`hang h-${(c.tier ?? 'important').toLowerCase()}`}>
          {nhanHang(c.tier)}
        </span>
        {c.role ? <span className="vai">{c.role}</span> : null}
      </div>

      {c.aliases && c.aliases.length > 0 ? (
        <p className="phu">
          {CHU.biDanh}: {c.aliases.join(' · ')}
        </p>
      ) : null}

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
                <dt>hiện trạng</dt>
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
    </li>
  );
}
