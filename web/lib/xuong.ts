import { KHU_MAC_DINH, type Khu } from './khu';
import type { Book } from './types';

/** Con số của cả xưởng, cho dải tổng ở đầu màn Xưởng. */
export interface TongXuong {
  soTacPham: number;
  chuongDaChot: number;
  soTu: number;
  /** Đô la. Cộng qua xu để không tích lũy sai số dấu phẩy động. */
  chiPhi: number;
  engineDangMo: number;
}

/**
 * Tổng hợp cả xưởng từ danh sách `/workshop`.
 *
 * Cộng chi phí bằng SỐ NGUYÊN XU rồi mới chia lại. `0.1 + 0.2` trong IEEE-754 là
 * `0.30000000000000004`, và với mười cuốn thì sai số đủ để dải tổng hiện
 * `$18,299999999999997` — một con số nói dối về độ chính xác mà nó có. Đây là dải trả lời câu
 * "tôi đã tiêu bao nhiêu", nên nó không được có chữ số vô nghĩa. Dữ liệu thật đã đo có
 * `$2.1965540000000003` và `$7.906347000000001`, tức mỗi cuốn đã mang sẵn đuôi rác trước khi
 * phép cộng bắt đầu.
 *
 * Làm tròn TỪNG CUỐN rồi cộng, không phải cộng rồi mới làm tròn — và chỗ này đắt hơn vẻ ngoài
 * của nó. Với hai giá trị thật ở trên, cộng số thực rồi làm tròn cho `$10,10` còn cộng theo xu
 * cho `$10,11`. `$10,10` gần sự thật số học hơn, nhưng bảng ngay dưới dải tổng hiện chi phí
 * từng cuốn với HAI chữ số thập phân — `$2,20` và `$7,91` — nên một dải tổng ghi `$10,10` đứng
 * trên một cột cộng lại ra `$10,11` là một bảng không tự cộng được. Tổng phải khớp với thứ mắt
 * đọc được; sai số nửa xu mỗi cuốn rẻ hơn một bảng mà người vận hành cộng tay ra số khác.
 *
 * Chỉ cộng, không suy: mọi trường vào đây đã do server tính trên cùng một `progress` và cùng
 * một danh sách checkpoint. Tính lại ở đây là nhân bản logic engine — đúng thứ PRODUCT.md cấm,
 * và nó sẽ lệch ngay lần engine đổi cách tính.
 */
export function tongXuong(sach: Book[]): TongXuong {
  let xu = 0;
  const t: TongXuong = {
    soTacPham: sach.length,
    chuongDaChot: 0,
    soTu: 0,
    chiPhi: 0,
    engineDangMo: 0,
  };
  for (const b of sach) {
    t.chuongDaChot += b.completed_chapters;
    t.soTu += b.total_words;
    xu += Math.round(b.cost_usd * 100);
    if (b.engine_open) t.engineDangMo += 1;
  }
  t.chiPhi = xu / 100;
  return t;
}

/**
 * Bề mặt đáp lúc mở trang.
 *
 * Ba nhánh, ba lý do khác nhau:
 *
 *   - **URL nói rõ khu** → theo URL, không bàn. Tải lại trang ở một màn phải về đúng màn đó;
 *     một luật đáp thắng URL là URL nói dối.
 *   - **có `?tp=`** → buồng lái. Người quay lại một cuốn cụ thể đã nói ra họ muốn gì; bắt họ
 *     đi qua một bảng nữa là thêm một nhịp cho mọi lần mở trang.
 *   - **không `?tp=`** → Xưởng nếu có ≥ 2 cuốn, buồng lái nếu đúng 1. Một bảng một dòng không
 *     quyết định gì, nên nó chỉ là một màn hình phải bấm qua.
 *
 * Xưởng RỖNG không xử ở đây: `page.tsx` đã dẫn thẳng vào Tác phẩm mới trước mọi nhánh khác, và
 * lý do được ghi ở đó. Nhánh cuối vẫn trả khu mặc định cho `soSach === 0` chứ không trả
 * `'xuong'` — nếu một ngày số 0 tới được đây thì mở một bảng rỗng là câu trả lời tệ nhất.
 *
 * `khuTuUrl` là `Khu | undefined`, và `undefined` mang nghĩa "URL IM" — không phải "URL ghi
 * khu mặc định". Người gọi phải đọc tham số THÔ để phân biệt hai ca đó: `khuTuUrl()` trong
 * `useStudio.ts` trả `KHU_MAC_DINH` khi không có `?khu=`, và `ghiUrl` cố ý bỏ `khu` khỏi URL
 * khi nó bằng `KHU_MAC_DINH`, nên truyền thẳng hàm đó vào đây sẽ làm cả luật này chết lặng:
 * mọi lần mở trang rơi vào nhánh đầu và không ai thấy màn Xưởng.
 */
export function khuDap(v: {
  tpTuUrl: string | undefined;
  khuTuUrl: Khu | undefined;
  soSach: number;
}): Khu {
  if (v.khuTuUrl) return v.khuTuUrl;
  if (v.tpTuUrl) return KHU_MAC_DINH;
  return v.soSach >= 2 ? 'xuong' : KHU_MAC_DINH;
}

/**
 * Ba cách mở một cuốn từ bảng Xưởng, và chúng KHÔNG thay thế nhau được.
 *
 *   - `doi-cuon`    — cuốn khác cuốn đang xem. Xóa snapshot và hồ sơ, rồi để effect
 *                     "snapshot của tác phẩm đang xem" trong `useStudio` nạp lại.
 *   - `nap-lai`     — đúng cuốn đang xem, nhưng mở ở một chương cụ thể. Phải tự gọi
 *                     `napSnapshot`, và tuyệt đối KHÔNG xóa snapshot.
 *   - `chi-doi-khu` — đúng cuốn đang xem, không chọn chương. Chỉ là một cú điều hướng.
 */
export type CachMo = 'doi-cuon' | 'nap-lai' | 'chi-doi-khu';

/**
 * Mở cuốn nào, và mở bằng cách nào.
 *
 * # Vì sao đây là một hàm THUẦN chứ một nhánh `if` trong hành động
 *
 * Ca `nap-lai` làm TREO màn hình nếu xử nhầm, và nó không nhìn thấy được từ chỗ gọi. Effect
 * nạp snapshot phụ thuộc `tacPham`; đặt lại CÙNG một giá trị không làm React chạy lại effect
 * đó. Nên một hành động "mở cuốn" viết theo mẫu `moTacPhamVuaTao` — xóa snapshot rồi trông
 * cậy effect nạp lại — sẽ để `snapshot === undefined` vĩnh viễn khi cuốn được mở đúng là cuốn
 * đang xem, và `page.tsx` đứng mãi ở màn "đang đọc store…".
 *
 * `moTacPhamVuaTao` không gặp ca đó vì cuốn vừa tạo không bao giờ trùng cuốn đang xem. Bảng
 * Xưởng thì gặp ngay lần bấm đầu tiên: cuốn đang mở LUÔN có một dòng trong bảng, và `Mở` trên
 * chính dòng đó là cú bấm tự nhiên nhất.
 *
 * Tách ra đây để ca ấy có phép đo. Nằm trong hook thì nó chỉ đo được bằng cách giả lập cả
 * `fetch` lẫn `EventSource`, tức bằng một bài kiểm đo nhầm thứ.
 */
export function cachMoTacPham(
  cuonDangXem: string | undefined,
  muonMo: string,
  chuong: number | undefined,
): CachMo {
  if (cuonDangXem !== muonMo) return 'doi-cuon';
  return chuong === undefined ? 'chi-doi-khu' : 'nap-lai';
}
