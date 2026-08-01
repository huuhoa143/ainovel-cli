import { expect, test } from 'vitest';

import { KHU, dungInspector, laKhu, laKhuMucMay, type Khu } from './khu';

/**
 * Hợp đồng của danh sách khu.
 *
 * `bo_chay.test.ts` đã canh `laKhu` ở mức "bộ chạy nạp được mã thật". Tệp này canh những
 * điều mà một khu MỚI dễ làm sai, và cả ba đều hỏng theo kiểu im lặng.
 */

/**
 * Bảng đối chiếu để `tsc` bắt ca "thêm khu vào union mà quên mảng `KHU`".
 *
 * Đây là thứ duy nhất bắt được ca đó, và hệ quả của nó im lặng hoàn toàn: `laKhu` đọc mảng
 * `KHU`, và `useStudio.khuTuUrl()` dùng `laKhu` để quyết định có nhận `?khu=` hay không. Khu
 * thiếu trong mảng vẫn biên dịch, vẫn điều hướng được bằng rail — nhưng TẢI LẠI TRANG ở đó
 * sẽ lặng lẽ về khu mặc định, tức URL thôi giữ đúng chỗ đang xem. Không có lỗi nào nổ ra.
 *
 * `Record<Khu, true>` là chỗ dừng bắt buộc: thêm một nhánh vào union mà không thêm vào đây
 * là lỗi biên dịch, và bài kiểm ngay dưới mới so được hai danh sách.
 */
const MOI_KHU: Record<Khu, true> = {
  xuong: true,
  'dong-san-xuat': true,
  'ban-thao': true,
  'kiem-dinh': true,
  'hang-cho-viet-lai': true,
  'dan-y': true,
  'nhan-vat': true,
  'luat-the-gioi': true,
  'phuc-but': true,
  'van-phong': true,
  'to-san-xuat': true,
  'chi-phi': true,
  'cai-dat': true,
  'cau-hinh': true,
  'tac-pham-moi': true,
  'cung-dung': true,
  'nhap-xuat': true,
};

test('mảng KHU chứa đúng mọi nhánh của union, không thiếu không trùng', () => {
  expect([...KHU].sort()).toEqual(Object.keys(MOI_KHU).sort());
  expect(new Set(KHU).size).toBe(KHU.length);
});

test('`?khu=xuong` đọc được từ URL — tải lại trang ở Xưởng phải về Xưởng', () => {
  expect(laKhu('xuong')).toBe(true);
});

test('Xưởng là khu mức MÁY: nội dung của nó không đổi khi người dùng chuyển tác phẩm', () => {
  // Bảng Xưởng liệt kê MỌI cuốn, nên nó không thuộc cuốn nào. Cùng hạng với Cấu hình máy và
  // Tác phẩm mới, khác hẳn Bản thảo hay Kiểm định — hai bề mặt đó đọc `tacPham`.
  expect(laKhuMucMay('xuong')).toBe(true);
  expect(laKhuMucMay('ban-thao')).toBe(false);
});

test('Xưởng KHÔNG dùng cột inspector — bảng đã mang mọi thứ nó cần', () => {
  // Cột phải là chi tiết của HÀNG đang chọn trong bảng chương của buồng lái. Ở đây mỗi dòng
  // là một cuốn và mọi số của cuốn đó đã nằm trên dòng, nên giữ 292px để vẽ một panel không
  // nói gì là lấy mất 1/5 bề rộng của chính cái bảng.
  expect(dungInspector('xuong')).toBe(false);
  expect(dungInspector('dong-san-xuat')).toBe(true);
});
