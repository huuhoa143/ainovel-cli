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
  loi,
  onChiDoiMacDinh,
  onChuyenCaDay,
  onHuy,
}: {
  du: CauHinhDoc;
  /** Nhà cung cấp đích và model mặc định của nó. */
  den: { provider: string; model: string };
  dangGui: boolean;
  /** Lỗi của lượt ghi vừa rồi. Hộp ở lại để người dùng đọc và thử tiếp. */
  loi?: string | null;
  /**
   * Vắng mặt = lối ra thứ ba KHÔNG có nghĩa ở lối vào này.
   *
   * Bắt buộc phải truyền thì một lối vào không dùng tới nó sẽ truyền một hàm rỗng cho xong —
   * và ĐO ĐƯỢC là đã xảy ra: từ dải kênh vai, nút "Chỉ đổi mặc định" chỉ đóng hộp và không
   * ghi gì, trong khi cùng cái nhãn ấy mở từ thẻ nhà cung cấp thì CÓ ghi. Một nhãn hai nghĩa,
   * tùy cửa nào mở nó. Kiểu tùy chọn làm chỗ không dùng phải nói ra là không dùng.
   */
  onChiDoiMacDinh?: () => void;
  onChuyenCaDay: (than: ReturnType<typeof thanChuyenCaDay>) => void;
  onHuy: () => void;
}) {
  // Bảng dựng MỘT LẦN lúc mở hộp, rồi người dùng sửa trên đó. Tính lại ở mỗi lần vẽ sẽ xóa
  // mất những ô họ vừa chọn tay.
  const [dong, datDong] = useState<DongChuyen[]>(() => duKienChuyen(du, den.provider, den.model));

  const khai = (du.providers.find((p) => p.name === den.provider)?.models ?? []).map((m) => m.name);
  const coVaiGhim = dong.some((d) => d.dangGhim);
  /**
   * MẶC ĐỊNH có dời chỗ không — đó mới là thứ quyết định gọi việc này là "chuyển" hay không.
   *
   * Bản trước hỏi `dong.every(d => d.tuProvider === den.provider)`, tức "mọi vai đã ở đích
   * chưa". Hai câu hỏi khác nhau, và ĐO ĐƯỢC là chúng lệch nhau ở một trạng thái tới được:
   * mặc định đã là `9Router`, chỉ mỗi `writer` ghim ở `openai`. Một vai lạc chỗ lật cả hộp
   * sang giọng "Chuyển sang 9Router?" trong khi 9Router VỐN ĐÃ là mặc định.
   *
   * Ở ca ấy tiêu đề hỏi một câu mà biến trả lời một câu khác. Người dùng đứng ở dải kênh vai
   * chỉ muốn sửa các vai; bảng bên dưới vẫn cho họ thấy `writer` dời chỗ.
   */
  const chiDoiModel = den.provider === du.provider;

  return (
    <HopXacNhan
      moRa
      tieuDe={chiDoiModel ? GIAI_THICH.capNhatModelDe(den.provider) : GIAI_THICH.chuyenDe(den.provider)}
      /* Không vai nào ĐẶT RIÊNG thì "chuyển cả dây chuyền" và "chỉ đổi mặc định" là CÙNG một
         lượt ghi — mọi vai đang thừa hưởng nên chúng tự đi theo. Gọi nó bằng cái tên lớn hơn
         việc nó làm là hứa quá; và bày hai nút cho một hành động là mời người dùng đi tìm
         khác biệt không có thật. */
      nhanLam={chiDoiModel ? CHU.capNhatModel : coVaiGhim ? CHU.chuyenCaDay : CHU.doiMacDinh}
      onLam={() => onChuyenCaDay(thanChuyenCaDay(dong, den.provider, du.roles))}
      /* Lối ra thứ ba chỉ có nghĩa khi CÓ vai đặt riêng để mà giữ lại. Không có thì hộp này
         chỉ còn là bảng xác nhận của một lượt đổi mặc định bình thường. */
      nhanPhu={onChiDoiMacDinh && !chiDoiModel && coVaiGhim ? CHU.chiDoiMacDinh : undefined}
      onPhu={onChiDoiMacDinh && !chiDoiModel && coVaiGhim ? onChiDoiMacDinh : undefined}
      onHuy={onHuy}
      dangLam={dangGui}
      nhanDangLam={CHU.dangChuyen}
      than={
        <>
          <p>{chiDoiModel ? GIAI_THICH.capNhatModelThan(den.provider) : GIAI_THICH.chuyenThan(den.provider)}</p>
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
          {/* Lỗi ghi đứng TRONG hộp, ngay trên hàng nút: người dùng vừa bấm ở đó. Đóng hộp
              rồi báo ở đâu đó phía sau là bắt họ đoán xem có chuyện gì xảy ra. */}
          {loi ? <p className="loiDoc">{loi}</p> : null}
        </>
      }
    />
  );
}
