'use client';

import { soTu } from '@/lib/dinhdang';
import type { Khu } from '@/lib/khu';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { Snapshot } from '@/lib/types';

/**
 * Dải VIỆC TIẾP THEO — dòng đầu tiên của bề mặt mặc định.
 *
 * # Vì sao dải này tồn tại
 *
 * Người dùng mở studio và nói nguyên văn: "vào chẳng biết bắt đầu từ đâu… quá ngợp".
 * Bề mặt mặc định trả lời rất nhiều câu hỏi — trục sản xuất, bảng chương, nhật ký phán
 * quyết, dòng sự kiện — mà KHÔNG câu nào là "giờ tôi làm gì". Mười sáu mục trong rail đều
 * cùng sức nặng, nên câu trả lời đó phải do người dùng tự suy ra từ dữ liệu.
 *
 * Dải này là một câu trạng thái cộng nhiều nhất hai hành động. Nó không thêm dữ liệu mới:
 * mọi thứ trong đây đều đã có ở đâu đó trên trang. Cái nó thêm là THỨ TỰ ƯU TIÊN.
 *
 * # Vì sao hành động ở đây chỉ ĐIỀU HƯỚNG, không chạy engine
 *
 * Chạy tiếp là hành vi tiêu tiền, và thanh transport đã là chỗ bấm nó. Hai nút cùng gọi
 * `POST /run` thì trạng thái "đang gửi" của chúng không thấy nhau, nên bấm cả hai là hai
 * lượt chạy — tức tiền đôi vì một chi tiết giao diện. Lúc máy đang nghỉ, dải này CHỈ ĐƯỜNG
 * tới thanh dưới bằng chữ.
 *
 * # Vì sao "Đọc từ chương 1" chọn luôn chương chứ chỉ đổi khu
 *
 * `DocTruyen` với `chuongChon` rỗng hiện "chưa chọn chương" — tức một bề mặt đọc không có
 * gì để đọc. Đường cũ là ba bước: đổi khu, hiểu rằng danh sách bên trái bấm được, bấm một
 * dòng. Đây là đúng chỗ người dùng rơi ra, vì thành quả — thứ duy nhất họ thật sự muốn —
 * nằm sau ba bước không ai dẫn. Nên nút này chọn chương RỒI đổi khu.
 */
export function ViecTiepTheo({
  snapshot,
  dangChay,
  onChonKhu,
  onChonChuong,
}: {
  snapshot: Snapshot;
  dangChay: boolean;
  onChonKhu: (k: Khu) => void;
  onChonChuong: (n: number) => void;
}) {
  const b = snapshot.book;
  const xong = b.completed_chapters;
  const vietLai = snapshot.chapters.filter((r) => r.stage === 'rewrite').length;

  // Chương mới nhất CÓ BẢN THẢO, không phải chương có số lớn nhất: một chương đang soạn
  // chưa có tệp nào để đọc, nên mở nó ra là mở một khổ đọc trống.
  const chuongDoc = chuongDocDuoc(snapshot);

  const doc = (n: number) => {
    onChonChuong(n);
    onChonKhu('ban-thao');
  };

  const tt = trangThai(snapshot, dangChay);

  return (
    <section className={`vtt ${tt.mau}`} aria-label={CHU.vttVung}>
      <span className={`vttDot ${tt.mau}${dangChay ? ' dap' : ''}`} aria-hidden="true" />

      <div className="vttChu">
        <p className="vttCau">{tt.cau}</p>
        <p className="vttHint">{tt.hint}</p>
      </div>

      <div className="vttNut">
        {/* Chương chờ viết lại đứng TRƯỚC nút đọc: nó là việc tồn, và một việc tồn bị
            đặt sau một lời mời đọc thì không còn là việc tồn nữa. */}
        {vietLai > 0 ? (
          <button
            type="button"
            className="vttPhu vttCanh"
            onClick={() => onChonKhu('hang-cho-viet-lai')}
          >
            <span className="ky" aria-hidden="true">
              ■
            </span>
            {CHU.xemChoVietLai(vietLai)}
          </button>
        ) : null}

        {chuongDoc !== undefined ? (
          <button type="button" className="vttChinh" onClick={() => doc(chuongDoc.so)}>
            {chuongDoc.nhan}
          </button>
        ) : null}

        {/* Xuất bản chỉ hiện khi truyện đã xong: trước lúc đó nó xuất ra một tệp thiếu
            chương, và một nút mời làm việc đó là mời hiểu sai trạng thái. */}
        {b.phase === 'complete' && xong > 0 ? (
          <button
            type="button"
            className="vttPhu"
            onClick={() => onChonKhu('nhap-xuat')}
            title={GIAI_THICH.xuatBanGiaiThich}
          >
            {CHU.xuatBan}
          </button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Chương nào mở ra được, và nhãn nào nói đúng chương đó.
 *
 * Chỉ nhận `done` và `rewrite`: đó là hai công đoạn đã có tệp bản thảo trên đĩa. Chương
 * `drafting` thì Writer còn đang viết và `pending` thì chưa chạy — mở một trong hai ra là
 * mở khổ đọc rồi nhận "chưa có bản thảo", tức biến nút mời đọc thành cái bẫy. `DocTruyen`
 * cho bấm mọi hàng vì ở đó người dùng đang chọn có ý thức trong một danh sách có ký hiệu
 * công đoạn; ở đây thì máy chọn thay họ, nên nó phải chọn cái chắc chắn đọc được.
 *
 * Nhãn mang SỐ chương thật thay vì "chương đầu": danh sách chương có lỗ (chương 1–3 có thể
 * không có dấu vết sản xuất nào), nên "Đọc từ chương 1" trên một danh sách bắt đầu ở chương
 * 4 là một câu sai.
 */
function chuongDocDuoc(snap: Snapshot): { so: number; nhan: string } | undefined {
  const xong = snap.chapters.filter((r) => r.stage === 'done').map((r) => r.chapter);
  // Chương bị trả về viết lại vẫn có bản thảo để đọc — và khi CHỈ có loại đó thì đọc nó
  // là việc đúng: đó là chỗ chất lượng đang tuột.
  const traVe = snap.chapters.filter((r) => r.stage === 'rewrite').map((r) => r.chapter);
  const co = [...(xong.length > 0 ? xong : traVe)].sort((a, b) => a - b);

  // Lấy hai đầu rồi kiểm tường minh thay vì tin `co.length`: `noUncheckedIndexedAccess`
  // nói đúng — một phép kiểm độ dài KHÔNG chứng minh được phần tử tại một chỉ số có thật,
  // và đây đúng lớp lỗi đã làm sập bề mặt này một lần (kiểu khai `LaneBlock[]` cho một
  // trường server trả `null`, `tsc` xanh vì kiểu nói dối).
  const dau = co[0];
  const cuoi = co[co.length - 1];
  if (dau === undefined || cuoi === undefined) return undefined;

  // Truyện đã xong hoặc mới có một chương → mời đọc từ đầu. Đang viết dở → chương mới
  // nhất, vì đó là thứ vừa xuất hiện và là lý do họ mở trang lên. Studio không lưu "đã
  // đọc tới đâu", nên bịa ra một con dấu đọc là bịa dữ liệu.
  if (snap.book.phase === 'complete' || co.length === 1) {
    return {
      so: dau,
      nhan: dau === 1 ? CHU.docTuChuongDau : `${CHU.docBanThao} · ${CHU.chuong} ${dau}`,
    };
  }
  return { so: cuoi, nhan: CHU.docChuongMoiNhat };
}

/** Câu trạng thái + lời chỉ đường, suy từ dữ liệu chứ không từ một cờ duy nhất. */
function trangThai(
  snap: Snapshot,
  dangChay: boolean,
): { cau: string; hint: string; mau: string } {
  const b = snap.book;
  const xong = b.completed_chapters;

  if (dangChay) {
    if (xong === 0) {
      return {
        cau: CHU.ttDangDungNen,
        hint: GIAI_THICH.dangDungNenChoMotChut,
        mau: 'chay',
      };
    }
    return {
      cau: CHU.ttDangViet(xong, b.total_chapters),
      hint: GIAI_THICH.dangVietTuDiTiep,
      mau: 'chay',
    };
  }

  if (b.phase === 'complete') {
    return {
      cau: CHU.ttXong(xong, soTu(b.total_words) ?? '0'),
      hint: GIAI_THICH.xongCoTheXuat,
      mau: 'xong',
    };
  }

  if (xong === 0) {
    return { cau: CHU.ttChuaCoChuong, hint: GIAI_THICH.chuaChayLanNao, mau: 'nghi' };
  }

  return {
    cau: CHU.ttNghi(xong, b.total_chapters),
    hint: GIAI_THICH.chayTiepOThanhDuoi,
    mau: 'nghi',
  };
}
