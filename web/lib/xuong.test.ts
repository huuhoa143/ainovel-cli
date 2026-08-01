import { expect, test } from 'vitest';

import { sach } from '@/components/mau.test-helper';

import { cachMoTacPham, khuDap, tongXuong } from './xuong';

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

/* ── luật đáp lúc mở trang ────────────────────────────────────────────── */

test('có tp trên URL thì đáp thẳng vào buồng lái — người quay lại không phải bấm thêm nhịp', () => {
  expect(khuDap({ tpTuUrl: 'mac-the', khuTuUrl: undefined, soSach: 5 })).toBe('dong-san-xuat');
});

test('không có tp và xưởng nhiều cuốn thì đáp vào Xưởng', () => {
  expect(khuDap({ tpTuUrl: undefined, khuTuUrl: undefined, soSach: 3 })).toBe('xuong');
});

test('không có tp mà đúng MỘT cuốn thì đáp vào buồng lái, không phải bảng một dòng', () => {
  expect(khuDap({ tpTuUrl: undefined, khuTuUrl: undefined, soSach: 1 })).toBe('dong-san-xuat');
});

test('ĐÚNG HAI cuốn đã là Xưởng — mốc của spec §7.1 là ≥ 2, không phải > 2', () => {
  // Bốn bài của kế hoạch dùng 5 · 3 · 1 · 9, tức không bài nào đứng ở mốc. ĐO ĐƯỢC: đổi
  // `>= 2` thành `> 2` vẫn xanh cả bốn — trong khi hệ quả là một xưởng hai cuốn không bao
  // giờ thấy được màn Xưởng, đúng ca nhỏ nhất mà một bảng bắt đầu có nghĩa (hai dòng thì
  // đã có cái để so).
  expect(khuDap({ tpTuUrl: undefined, khuTuUrl: undefined, soSach: 2 })).toBe('xuong');
});

test('xưởng RỖNG không do luật này xử — nó vẫn trả khu mặc định, không trả Xưởng', () => {
  // `page.tsx` dẫn thẳng vào Tác phẩm mới trước mọi nhánh khác, nên số 0 không bao giờ tới
  // đây trên đường thật. Bài này chốt rằng nếu nó có tới thì hàm KHÔNG mở một bảng rỗng —
  // và nó chặn cách viết `soSach !== 1`, một cách viết thỏa cả bốn bài của kế hoạch.
  expect(khuDap({ tpTuUrl: undefined, khuTuUrl: undefined, soSach: 0 })).toBe('dong-san-xuat');
});

test('khu ghi rõ trên URL luôn THẮNG luật đáp', () => {
  // Tải lại trang ở bất kỳ màn nào phải về đúng màn đó. Luật đáp chỉ quyết định khi URL im.
  expect(khuDap({ tpTuUrl: undefined, khuTuUrl: 'chi-phi', soSach: 9 })).toBe('chi-phi');
  expect(khuDap({ tpTuUrl: 'mac-the', khuTuUrl: 'ban-thao', soSach: 9 })).toBe('ban-thao');
});

test('URL ghi rõ ĐÚNG khu mặc định vẫn thắng — `undefined` mới là "URL im"', () => {
  // Đây là mắt dễ tuột nhất của sợi dây này, và nó nằm ở NGƯỜI GỌI chứ ở hàm.
  // `khuTuUrl()` trong `useStudio.ts` trả `KHU_MAC_DINH` khi query string KHÔNG có `?khu=`,
  // và `ghiUrl` cố ý bỏ `khu` khỏi URL khi nó bằng `KHU_MAC_DINH`. Nên hai ca "URL im" và
  // "URL ghi dong-san-xuat" đến chỗ đó y hệt nhau. Ai đấu dây bằng cách truyền thẳng
  // `khuTuUrl()` vào đây sẽ làm luật đáp CHẾT HẲN mà không bài kiểm nào của luật đỏ: mọi
  // lần mở trang đều rơi vào nhánh đầu và về buồng lái.
  //
  // Hàm này nhận `Khu | undefined` chính vì thế: phân biệt đó là việc của người gọi, và
  // người gọi phải đọc tham số THÔ.
  expect(khuDap({ tpTuUrl: undefined, khuTuUrl: 'dong-san-xuat', soSach: 9 })).toBe(
    'dong-san-xuat',
  );
});

/* ── mở một cuốn từ bảng Xưởng ────────────────────────────────────────── */

test('mở một cuốn KHÁC: phải đổi cuốn, tức xóa snapshot và để effect nạp lại', () => {
  expect(cachMoTacPham('mac-the', 'tran-yeu', undefined)).toBe('doi-cuon');
  expect(cachMoTacPham(undefined, 'tran-yeu', undefined)).toBe('doi-cuon');
  expect(cachMoTacPham('mac-the', 'tran-yeu', 1)).toBe('doi-cuon');
});

test('mở ĐÚNG cuốn đang xem ở một chương: nạp lại tại chỗ, KHÔNG xóa snapshot', () => {
  // Đây là ca làm treo màn hình nếu xử nhầm. `moTacPhamVuaTao` xóa snapshot rồi trông cậy
  // vào effect §2 nạp lại — nhưng effect đó phụ thuộc `tacPham`, và đặt lại CÙNG một giá trị
  // không làm React chạy lại effect. Kết quả: `snapshot === undefined` vĩnh viễn, và
  // `page.tsx` đứng ở màn "đang đọc store…" không bao giờ thoát ra.
  //
  // Cuốn vừa tạo không bao giờ trùng cuốn đang xem nên `moTacPhamVuaTao` không gặp ca này.
  // Bảng Xưởng thì gặp ngay lần bấm đầu tiên: cuốn đang mở LUÔN có một dòng trong bảng.
  expect(cachMoTacPham('mac-the', 'mac-the', 1)).toBe('nap-lai');
});

test('mở ĐÚNG cuốn đang xem mà không chọn chương: chỉ đổi khu, không gọi mạng', () => {
  // Bấm `Mở` trên chính cuốn đang xem là một cú điều hướng thuần. Nạp lại snapshot ở đó là
  // một lượt đọc store không ai yêu cầu, và nó nháy cả bề mặt.
  expect(cachMoTacPham('mac-the', 'mac-the', undefined)).toBe('chi-doi-khu');
});
