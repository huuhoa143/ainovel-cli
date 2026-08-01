'use client';

import { trangThaiCua } from '@/lib/nghiemThu';
import { CHU, GIAI_THICH, kyTheoTone } from '@/lib/nhan';
import type { TienDo } from '@/lib/types';

/**
 * Dải quyết định của cửa nghiệm thu — engine đang đứng ở biên chương, chờ người duyệt.
 *
 * # Vì sao KHÔNG dùng modal
 *
 * Modal chỉ dành cho `ask_user`, và lúc đó engine chặn THẬT: nó không tiến thêm bước nào
 * cho tới khi có câu trả lời, nên chặn màn hình lại là nói đúng sự thật (xem `HoiChan`).
 * Ở cửa nghiệm thu engine cũng đứng chờ, nhưng người dùng vẫn cần đọc bản thảo, xem chi
 * phí, đối chiếu chương trước — chặn họ lại là chặn đúng việc họ phải làm để quyết định.
 * Nên đây là một DẢI, và nó nằm cùng chỗ với bằng chứng chứ không đè lên bằng chứng.
 *
 * # Vì sao MỘT component cho hai bề mặt
 *
 * Dải này vẽ ở đầu buồng lái và ở bề mặt Kiểm định. Hai bản chép tay của cùng một quyết
 * định sẽ trôi lệch nhau ngay lần đổi đầu tiên, và lúc đó hai chỗ trên CÙNG một ứng dụng
 * nói khác nhau về cùng một cửa. Người gọi chỉ truyền `snapshot.advance` — không truyền
 * `dangCho` đã tính sẵn — để luật "cửa nào là cửa đang chờ" chỉ có MỘT chỗ giữ
 * (`lib/nghiemThu.ts`), và người nối dây không có cơ hội tính sai nó.
 *
 * # Vì sao hai nút cùng khóa theo `choGhi`
 *
 * Cả hai đều là đường GHI (`POST /advance`, `POST /steer`), và cả nhóm route ghi không
 * được mắc vào mux khi studio lắng nghe ngoài loopback. Vẽ nút bấm được rồi gửi vào hư
 * không là lỗi tệ nhất ở đây — cùng lý lẽ đã ghi trong `OCanThiep.tsx`.
 *
 * `choGhi === undefined` (đang hỏi `/api/config`) khóa nút nhưng KHÔNG hiện câu giải
 * thích: "studio đang ở chế độ chỉ đọc" lúc đó là một khẳng định chưa ai đo được — cùng
 * lớp `null` khác `false` mà cả hợp đồng `/studio` giữ.
 */
export function CuaNghiemThu({
  advance,
  tacPham,
  choGhi,
  onDoi,
}: {
  advance: TienDo | null;
  tacPham: string | undefined;
  /** undefined = chưa biết (đang hỏi `/api/config`) — xem `useMay`. */
  choGhi: boolean | undefined;
  /** Gọi sau mỗi lệnh để snapshot được nạp lại — đừng tự đoán trạng thái mới. */
  onDoi: () => void;
}) {
  const cua = trangThaiCua(advance);

  // Không chờ thì KHÔNG vẽ gì. Một dải amber rỗng nằm thường trực trên đầu buồng lái dạy
  // người vận hành bỏ qua màu amber, và lần nó nói thật thì họ cũng bỏ qua.
  if (!cua.dangCho) return null;

  const batDuoc = choGhi === true && !!tacPham;

  return (
    <section className="cuanghiemthu" aria-label={CHU.cuaNghiemThuVung}>
      <p className="cnthead">
        {/* Ký hiệu hình học đứng trước chữ để ảnh đen trắng và người mù màu vẫn phân biệt
            được — khuôn của `TrangThai.tsx`. Lấy từ `kyTheoTone` chứ không viết cứng: dải
            này là tông amber, và ngày bảng ký hiệu đổi thì nó phải đi theo cùng bảng mà
            bản duyệt của Editor đang dùng, vì hai thứ đứng cạnh nhau ở bề mặt Kiểm định. */}
        <span className="ky" aria-hidden="true">
          {kyTheoTone('amber')}
        </span>
        {CHU.dangChoNghiemThu(cua.chuong)}
      </p>

      <p className="cntlydo">
        {cua.lyDo ? (
          <>
            <span className="lbl">{CHU.ketLuanEditor}:</span> {cua.lyDo}
          </>
        ) : (
          GIAI_THICH.nghiemThuChuaCoKetLuan
        )}
      </p>

      <div className="cntnut">
        <button type="button" className="nutChinh" disabled={!batDuoc}>
          {CHU.choDiTiep}
        </button>
        <button type="button" className="nutPhu" disabled={!batDuoc}>
          {CHU.traChuongVeVietLai(cua.chuong)}
        </button>
      </div>

      {choGhi === false ? (
        <p className="steerhint">
          <strong>{GIAI_THICH.nghiemThuChoDay}.</strong> {GIAI_THICH.canThiepTat}
        </p>
      ) : null}
    </section>
  );
}
