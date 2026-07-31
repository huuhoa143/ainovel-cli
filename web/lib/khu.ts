/**
 * Các khu vực của studio — tức các bề mặt mà rail điều hướng tới.
 *
 * Mã khu để nguyên dạng slug tiếng Việt không dấu vì nó đi vào query string
 * (`?khu=ban-thao`) và người vận hành sẽ thấy nó trên thanh địa chỉ. Chữ hiển
 * thị vẫn nằm ở lib/nhan.ts như mọi chỗ khác.
 *
 * Danh sách dưới đây là hợp đồng giữa rail và page: mục nào không nằm trong
 * `Khu` thì rail PHẢI vẽ nó dưới dạng chưa dựng, không phải liên kết. Bấm vào
 * một bề mặt chưa có là một lời hứa hụt, và một bề mặt trống trơn còn tệ hơn —
 * đó là nói dối.
 *
 * Ba khu cuối (Văn phong, Chi phí, Cài đặt) có bề mặt ở tầng web nhưng phụ thuộc
 * ba endpoint chỉ có ở bản engine đã dựng chúng. Nằm trong `Khu` là điều kiện
 * CẦN, không phải điều kiện đủ: rail còn hỏi thăm endpoint (`Profile.vanPhong`
 * và hai anh em của nó) rồi mới quyết định vẽ nút hay vẽ nhãn "chưa dựng". Hai
 * lớp này khác nhau — cái trên nói "web đã dựng bề mặt", cái dưới nói "engine
 * đang chạy có nguồn cho nó".
 */

export type Khu =
  | 'dong-san-xuat'
  | 'ban-thao'
  | 'kiem-dinh'
  | 'hang-cho-viet-lai'
  | 'dan-y'
  | 'nhan-vat'
  | 'luat-the-gioi'
  | 'phuc-but'
  | 'van-phong'
  | 'to-san-xuat'
  | 'chi-phi'
  | 'cai-dat'
  | 'cau-hinh'
  | 'tac-pham-moi'
  | 'cung-dung'
  | 'nhap-xuat';

export const KHU: readonly Khu[] = [
  'dong-san-xuat',
  'ban-thao',
  'kiem-dinh',
  'hang-cho-viet-lai',
  'dan-y',
  'nhan-vat',
  'luat-the-gioi',
  'phuc-but',
  'van-phong',
  'to-san-xuat',
  'chi-phi',
  'cai-dat',
  'cau-hinh',
  'tac-pham-moi',
  'cung-dung',
  'nhap-xuat',
] as const;

export const KHU_MAC_DINH: Khu = 'dong-san-xuat';

export function laKhu(v: string | null | undefined): v is Khu {
  return !!v && (KHU as readonly string[]).includes(v);
}

/**
 * `cau-hinh` là khu mức MÁY, không mức tác phẩm.
 *
 * Nó nằm trong `Khu` để dùng chung một mô hình điều hướng (rail + `?khu=`), nhưng bề mặt
 * của nó không đọc `tacPham` và nội dung không đổi khi người dùng chuyển tác phẩm. Rail
 * đặt nó trong nhóm riêng tên "Máy" để sự khác cấp đó nhìn thấy được — nếu nó nằm lẫn
 * trong nhóm "Xưởng" thì người vận hành sẽ đọc nó là cấu hình của cuốn đang mở, đúng
 * kiểu nhầm mà bề mặt Cài đặt đã phải tách ra để tránh.
 */
export function laKhuMucMay(khu: Khu): boolean {
  return khu === 'cau-hinh' || khu === 'tac-pham-moi' || khu === 'cung-dung';
}

/**
 * Khu nào dùng panel inspector.
 *
 * Chỉ Dòng sản xuất: inspector là chi tiết của HÀNG đang chọn trong bảng chương.
 * Các bề mặt khác đã tự mang chi tiết của mình (bề mặt đọc có khu lề riêng cho
 * bản duyệt), nên để cột 292px trống ở đó là lấy mất 1/5 bề rộng để hiện một
 * panel không nói gì.
 */
export function dungInspector(khu: Khu): boolean {
  return khu === 'dong-san-xuat';
}
