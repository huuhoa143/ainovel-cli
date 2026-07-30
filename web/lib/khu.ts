/**
 * Các khu vực của studio — tức các bề mặt mà rail điều hướng tới.
 *
 * Mã khu để nguyên dạng slug tiếng Việt không dấu vì nó đi vào query string
 * (`?khu=ban-thao`) và người vận hành sẽ thấy nó trên thanh địa chỉ. Chữ hiển
 * thị vẫn nằm ở lib/nhan.ts như mọi chỗ khác.
 *
 * Rail có mười ba mục nhưng chỉ một số mục có bề mặt thật. Danh sách dưới đây là
 * hợp đồng giữa rail và page: mục nào không nằm trong `Khu` thì rail PHẢI vẽ nó
 * dưới dạng chưa dựng, không phải liên kết. Bấm vào một bề mặt chưa có là một
 * lời hứa hụt, và một bề mặt trống trơn còn tệ hơn — đó là nói dối.
 */

export type Khu =
  | 'dong-san-xuat'
  | 'ban-thao'
  | 'dan-y'
  | 'nhan-vat'
  | 'luat-the-gioi'
  | 'phuc-but';

export const KHU: readonly Khu[] = [
  'dong-san-xuat',
  'ban-thao',
  'dan-y',
  'nhan-vat',
  'luat-the-gioi',
  'phuc-but',
] as const;

export const KHU_MAC_DINH: Khu = 'dong-san-xuat';

export function laKhu(v: string | null | undefined): v is Khu {
  return !!v && (KHU as readonly string[]).includes(v);
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
