import { expect, test } from 'vitest';

import { KHU_MAC_DINH, laKhu } from './khu';

/**
 * Chim hoàng yến cho project `logic`: nó chứng minh bộ chạy nạp được mã nguồn THẬT của web,
 * chứ không chỉ chạy được một biểu thức rỗng.
 *
 * Giữ lại thay vì xóa sau khi dựng xong: khi một bài kiểm thật đỏ, câu hỏi đầu tiên là "mã
 * sai hay bộ chạy sai". Tệp này trả lời câu đó trong một dòng.
 */
test('project logic nạp được mã nguồn thật của web', () => {
  expect(laKhu(KHU_MAC_DINH)).toBe(true);
  expect(laKhu('khong-co-khu-nay')).toBe(false);
});
