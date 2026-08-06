'use client';

import { useState } from 'react';

import { duKienChuyen, thanChuyenCaDay, type DongChuyen } from '@/lib/chuyenNhaCungCap';
import { CHU, GIAI_THICH, nhanKenhVai } from '@/lib/nhan';
import type { CauHinhDoc } from '@/lib/types';

import { HopXacNhan } from './HopXacNhan';

/**
 * Hộp "chuyển sang nhà cung cấp này" — bảng đối chiếu trước khi ghi.
 *
 * # Vì sao một hộp chứ không phải hai nút
 *
 * Người dùng hỏi hai chuyện tưởng khác nhau: *"đổi mặc định thì Model theo vai có đổi theo
 * không"* và *"A hết tiền, mua B, chuyển cả xưởng sang B"*. Chúng là CÙNG một việc nhìn từ hai
 * phía, nên chúng dùng chung một bảng. Dựng hai nút riêng là dựng hai đường tới cùng một lượt
 * ghi, và hai đường thì có ngày lệch.
 *
 * # Vì sao có LỐI RA THỨ BA
 *
 * Câu hỏi thật sự có ba đáp án: hủy, chỉ đổi mặc định (vai đặt riêng giữ nguyên — đó là cả lý
 * do nó được đặt riêng), hoặc chuyển hết. Ép thành hai là bắt người dùng đoán "Đồng ý" nghĩa
 * là lối nào.
 *
 * # Vì sao phải CHO XEM chứ không tự ánh xạ
 *
 * Tên model chỉ có nghĩa bên trong một nhà cung cấp. Sang nhà cung cấp mới, một số vai giữ
 * được tên (gateway khai đúng tên đó), một số phải chọn lại. Tự đoán im lặng là đúng cách đã
 * đẻ ra ca hỏng của người dùng: ba vai trỏ `openai · cx/gpt-5.5` trong khi `openai` chỉ khai
 * `claude-opus-5`, và lỗi lúc chạy thì nói về khóa API.
 */
export function ChuyenNhaCungCap({
  du,
  den,
  dangGui,
  onChiDoiMacDinh,
  onChuyenCaDay,
  onHuy,
}: {
  du: CauHinhDoc;
  /** Nhà cung cấp đích và model mặc định của nó. */
  den: { provider: string; model: string };
  dangGui: boolean;
  onChiDoiMacDinh: () => void;
  onChuyenCaDay: (than: ReturnType<typeof thanChuyenCaDay>) => void;
  onHuy: () => void;
}) {
  // Bảng dựng MỘT LẦN lúc mở hộp, rồi người dùng sửa trên đó. Tính lại ở mỗi lần vẽ sẽ xóa
  // mất những ô họ vừa chọn tay.
  const [dong, datDong] = useState<DongChuyen[]>(() => duKienChuyen(du, den.provider, den.model));

  const khai = (du.providers.find((p) => p.name === den.provider)?.models ?? []).map((m) => m.name);
  const coVaiGhim = dong.some((d) => d.dangGhim);

  return (
    <HopXacNhan
      moRa
      tieuDe={GIAI_THICH.chuyenDe(den.provider)}
      /* Không vai nào ĐẶT RIÊNG thì "chuyển cả dây chuyền" và "chỉ đổi mặc định" là CÙNG một
         lượt ghi — mọi vai đang thừa hưởng nên chúng tự đi theo. Gọi nó bằng cái tên lớn hơn
         việc nó làm là hứa quá; và bày hai nút cho một hành động là mời người dùng đi tìm
         khác biệt không có thật. */
      nhanLam={coVaiGhim ? CHU.chuyenCaDay : CHU.doiMacDinh}
      onLam={() => onChuyenCaDay(thanChuyenCaDay(dong, den.provider))}
      /* Lối ra thứ ba chỉ có nghĩa khi CÓ vai đặt riêng để mà giữ lại. Không có thì hộp này
         chỉ còn là bảng xác nhận của một lượt đổi mặc định bình thường. */
      nhanPhu={coVaiGhim ? CHU.chiDoiMacDinh : undefined}
      onPhu={coVaiGhim ? onChiDoiMacDinh : undefined}
      onHuy={onHuy}
      dangLam={dangGui}
      nhanDangLam={CHU.dangChuyen}
      than={
        <>
          <p>{GIAI_THICH.chuyenThan(den.provider)}</p>
          <table className="bangChuyen">
            <thead>
              <tr>
                <th scope="col">{CHU.vai}</th>
                <th scope="col">{CHU.dangDung}</th>
                <th scope="col">{CHU.seThanh}</th>
              </tr>
            </thead>
            <tbody>
              {dong.map((d, i) => (
                <tr key={d.vai} className={d.giuDuocTen ? undefined : 'phaiChon'}>
                  <th scope="row">{nhanKenhVai(d.vai)}</th>
                  <td className="m">
                    {d.tuProvider} · {d.tuModel}
                  </td>
                  <td className="m">
                    <input
                      aria-label={CHU.modelMoiCua(nhanKenhVai(d.vai))}
                      value={d.denModel}
                      list="ds-chuyen"
                      onChange={(e) => {
                        const v = e.target.value;
                        datDong((cu) => cu.map((x, j) => (j === i ? { ...x, denModel: v } : x)));
                      }}
                    />
                    {/* Nói ra dòng nào TỰ giữ được tên và dòng nào bị đề xuất một cái tên
                        khác — mắt người dùng chỉ cần dừng ở nhóm thứ hai. */}
                    {d.giuDuocTen ? null : <span className="mo"> {CHU.phaiChonLai}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="ds-chuyen">
            {khai.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </>
      }
    />
  );
}
