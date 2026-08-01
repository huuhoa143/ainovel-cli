import { expect, test } from 'vitest';

import { sach } from '@/components/mau.test-helper';

import { tongXuong } from './xuong';

test('cộng chương đã chốt, số từ, chi phí và số engine đang mở', () => {
  const t = tongXuong([
    sach({ id: 'a', completed_chapters: 3, total_words: 5305, cost_usd: 1.67, engine_open: true }),
    sach({ id: 'b', completed_chapters: 2, total_words: 3000, cost_usd: 0.9 }),
  ]);

  expect(t.soTacPham).toBe(2);
  expect(t.chuongDaChot).toBe(5);
  expect(t.soTu).toBe(8305);
  expect(t.chiPhi).toBeCloseTo(2.57, 6);
  expect(t.engineDangMo).toBe(1);
});

test('xưởng rỗng cho mọi số bằng 0, không ném', () => {
  const t = tongXuong([]);
  expect(t.soTacPham).toBe(0);
  expect(t.chiPhi).toBe(0);
});

test('chi phí cộng bằng số nguyên xu, không tích lũy sai số dấu phẩy động', () => {
  // 0.1 + 0.2 !== 0.3 trong IEEE-754. Với mười cuốn thì sai số đủ để tổng hiện ra
  // $18,299999999999997 — một con số nói dối về độ chính xác nó có.
  const t = tongXuong([sach({ cost_usd: 0.1 }), sach({ cost_usd: 0.2 })]);
  expect(t.chiPhi).toBe(0.3);
});

test('chi phí DƯỚI xu: làm tròn TỪNG CUỐN, để tổng cộng đúng bằng các số hiện trên bảng', () => {
  // Bốn con số của ba bài trên (1.67 · 0.9 · 0.1 · 0.2) đều là bội của một xu, và với chúng
  // `Math.round` với `Math.trunc` cho CÙNG kết quả — nên không bài nào trong ba bài đó chạm
  // tới quyết định làm tròn. ĐO ĐƯỢC: thay `round` bằng `trunc` vẫn xanh cả ba.
  //
  // Hai giá trị dưới đây là chi phí THẬT đã đo trên hai cuốn của xưởng này, và chúng có độ
  // phân giải dưới xu — đúng lớp dữ liệu mà quyết định làm tròn tồn tại để xử. Ba cách viết
  // cho ba con số KHÁC nhau, nên bài này chốt được đúng một cách:
  //
  //   $10,11  làm tròn từng cuốn rồi cộng   ← cách này
  //   $10,10  cộng số thực rồi mới làm tròn
  //   $10,09  cắt cụt từng cuốn
  //
  // Vì sao $10,11 là con số đúng, dù $10,10 gần sự thật số học hơn: bảng ngay dưới dải tổng
  // hiện chi phí từng cuốn qua `tongTien`, tức HAI chữ số thập phân — $2,20 và $7,91. Một dải
  // tổng ghi $10,10 trên một cột cộng lại ra $10,11 là một bảng không tự cộng được, trên đúng
  // bề mặt tồn tại để trả lời "tôi đã tiêu bao nhiêu". Tổng phải khớp với thứ mắt đọc được.
  const t = tongXuong([
    sach({ id: 'a', cost_usd: 2.1965540000000003 }),
    sach({ id: 'b', cost_usd: 7.906347000000001 }),
  ]);
  expect(t.chiPhi).toBe(10.11);
});
