'use client';

import { so } from '@/lib/dinhdang';
import { CHU, GIAI_THICH, TRANG_THAI_MAY, nhanVai } from '@/lib/nhan';
import type { Snapshot } from '@/lib/types';

import { TrangThai } from './TrangThai';

/**
 * Tổ sản xuất: bốn tác tử của engine cộng Engine, và những gì store ghi về từng
 * vai.
 *
 * # Điểm dễ nói dối nhất của bề mặt này: HAI CỬA SỔ khác nhau
 *
 * Hai con số trong cùng một hàng không cùng phạm vi:
 *
 *   • chương tham gia — suy từ `chapters[].owner`, phủ MỌI chương có dấu vết
 *     sản xuất
 *   • phán quyết      — đếm trong `snapshot.decisions`, và đó chỉ là 20 phán
 *     quyết gần nhất (snapshot.go:393 `const recent = 20`)
 *
 * Gọi cả hai là "tổng" thì cột phán quyết đứng yên ở 20 khi tác phẩm chạy tới
 * chương thứ ba trăm, và người vận hành kết luận Arbiter đã ngừng làm việc. Nên
 * cửa sổ được viết NGAY TRONG đầu cột, không nhét vào chú giải: một con số mà
 * phải hover mới biết phạm vi thì phần lớn người đọc sẽ không biết.
 *
 * # Vì sao không có cột chi phí
 *
 * `domain.UsageState` CÓ cộng chi phí theo tác tử và theo model, nhưng API chưa
 * trả phần đó — Transport chỉ mang `Overall.Cost`. Bỏ cột và nói ra lý do, đúng
 * cách bảng chương làm với chi phí theo chương.
 *
 * # Vì sao liệt kê cả vai chưa chạy lượt nào
 *
 * "Editor chưa duyệt chương nào" là tin vận hành, và nó chỉ đọc được nếu Editor
 * có mặt trong bảng. Một bảng chỉ chứa vai đã chạy thì vai vắng mặt trở thành
 * vô hình, mà vai vắng mặt đúng là thứ đáng nghi nhất.
 */

/** Roster của engine, theo PRODUCT.md. Vai lạ trong dữ liệu được thêm vào sau. */
const ROSTER = ['architect', 'writer', 'editor', 'arbiter', 'engine'] as const;

interface DongVai {
  ma: string;
  /** Số chương mà vai này tham gia chu kỳ gần nhất. */
  chuong: number;
  phanQuyet: number;
  thatBai: number;
  model: string[];
}

export function ToSanXuat({ snapshot }: { snapshot: Snapshot }) {
  const quyetDinh = snapshot.decisions ?? [];
  const dong = xepVai(snapshot);

  // Không một chương nào có `owner` nghĩa là store chưa ghi checkpoint — KHÁC
  // với "mọi vai đều tham gia 0 chương". Ca đầu là không đo được, ca sau là một
  // phép đo cho kết quả 0, và chỉ ca sau mới được in ra số.
  const doDuocVai = snapshot.chapters.some((r) => r.owner && r.owner.length > 0);

  const dangChay =
    snapshot.transport.state === 'running' ? snapshot.transport.agent : undefined;

  return (
    <main className="canvas khuto" id="to-san-xuat">
      <div className="head">
        <h1>{CHU.toSanXuat}</h1>
        <span className="sub">{motTa(dong, quyetDinh.length)}</span>
      </div>

      <section className="sect">
        <h2>{CHU.vaiTrongTo}</h2>

        {dong.length === 0 ? (
          <p className="trongSect">{GIAI_THICH.toChuaCoVaiNao}</p>
        ) : (
          <div className="bangwrap">
            <table className="bang bangto">
              <thead>
                <tr>
                  <th scope="col">{CHU.colVai}</th>
                  {/* Cửa sổ của mỗi con số nằm trong đầu cột, không ở chú giải. */}
                  <th scope="col" className="num">
                    {CHU.colChuongThamGia}
                    <em>{GIAI_THICH.toCuaSoChuong}</em>
                  </th>
                  <th scope="col" className="num">
                    {CHU.colPhanQuyetDaGhi}
                    <em>{GIAI_THICH.toCuaSoPhanQuyet(quyetDinh.length)}</em>
                  </th>
                  <th scope="col" className="num">
                    {CHU.colThatBai}
                  </th>
                  <th scope="col">{CHU.colModelDaDung}</th>
                </tr>
              </thead>
              <tbody>
                {dong.map((v) => (
                  <tr key={v.ma}>
                    <td className="vai">
                      {nhanVai(v.ma)}
                      {dangChay === v.ma ? (
                        <TrangThai tt={TRANG_THAI_MAY.running} />
                      ) : null}
                    </td>
                    <td className="num">
                      {doDuocVai ? (
                        so(v.chuong)
                      ) : (
                        <span className="trong" title={GIAI_THICH.toKhongDoDuocVai}>
                          {CHU.khongCo}
                        </span>
                      )}
                    </td>
                    <td className="num">{so(v.phanQuyet)}</td>
                    <td className="num">
                      {v.thatBai > 0 ? (
                        <span className="loi">{so(v.thatBai)}</span>
                      ) : (
                        so(0)
                      )}
                    </td>
                    <td className="model">
                      {v.model.length > 0 ? (
                        v.model.map((m) => (
                          <span className="ma" key={m}>
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="trong">{CHU.khongCo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!doDuocVai && dong.length > 0 ? (
          <p className="steerhint">{GIAI_THICH.toKhongDoDuocVai}</p>
        ) : null}
        <p className="steerhint">{GIAI_THICH.toKhongCoChiPhiTheoVai}</p>
      </section>
    </main>
  );
}

/**
 * Gộp roster với các vai thật sự thấy trong dữ liệu.
 *
 * Vai lạ (chuỗi ngoài roster) được thêm vào cuối chứ không bỏ đi: `owner` và
 * `decider` là chuỗi tự do ở tầng dữ liệu, và bỏ một vai lạ nghĩa là công của
 * nó biến mất khỏi bảng mà không ai biết.
 */
function xepVai(snapshot: Snapshot): DongVai[] {
  const quyetDinh = snapshot.decisions ?? [];

  const chuong = new Map<string, number>();
  for (const r of snapshot.chapters) {
    for (const o of r.owner ?? []) {
      chuong.set(o, (chuong.get(o) ?? 0) + 1);
    }
  }

  const phanQuyet = new Map<string, number>();
  const thatBai = new Map<string, number>();
  const model = new Map<string, Set<string>>();
  for (const d of quyetDinh) {
    if (!d.decider) continue;
    phanQuyet.set(d.decider, (phanQuyet.get(d.decider) ?? 0) + 1);
    if (d.error) thatBai.set(d.decider, (thatBai.get(d.decider) ?? 0) + 1);
    if (d.model) {
      const co = model.get(d.decider) ?? new Set<string>();
      co.add(d.model);
      model.set(d.decider, co);
    }
  }

  const la = [...new Set([...chuong.keys(), ...phanQuyet.keys()])]
    .filter((m) => !(ROSTER as readonly string[]).includes(m))
    .sort();

  return [...ROSTER, ...la].map((ma) => ({
    ma,
    chuong: chuong.get(ma) ?? 0,
    phanQuyet: phanQuyet.get(ma) ?? 0,
    thatBai: thatBai.get(ma) ?? 0,
    model: [...(model.get(ma) ?? [])].sort(),
  }));
}

/** Chỉ nói điều đếm được, và nói kèm cửa sổ của nó. */
function motTa(dong: DongVai[], soQuyetDinh: number): string {
  const daChay = dong.filter((v) => v.chuong > 0 || v.phanQuyet > 0).length;
  return `${dong.length} vai · ${daChay} có lượt trong dữ liệu đã tải · ${CHU.demPhanQuyetDaTai(soQuyetDinh)}`;
}
