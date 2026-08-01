import { expect, test } from 'vitest';

import type { Vai } from './types';
import { cayVai } from './vaiTro';

const v = (role: string, depth: number): Vai => ({ role, state: 'working', depth });

test('mọi vai cùng depth 0 đều là gốc', () => {
  const cay = cayVai([v('writer', 0), v('editor', 0)]);
  expect(cay).toHaveLength(2);
  expect(cay[0]!.con).toHaveLength(0);
});

test('vai depth 1 thành con của vai depth 0 ngay TRƯỚC nó', () => {
  const cay = cayVai([v('writer', 0), v('novel_context', 1), v('editor', 0)]);
  expect(cay).toHaveLength(2);
  expect(cay[0]!.vai.role).toBe('writer');
  expect(cay[0]!.con.map((c) => c.vai.role)).toEqual(['novel_context']);
  expect(cay[1]!.vai.role).toBe('editor');
});

test('cháu depth 2 gắn vào con depth 1 gần nhất', () => {
  const cay = cayVai([v('writer', 0), v('tool', 1), v('sub', 2)]);
  expect(cay[0]!.con[0]!.con.map((c) => c.vai.role)).toEqual(['sub']);
});

test('vai mồ côi (depth nhảy cóc, không có cha) vẫn được vẽ, KHÔNG bị nuốt', () => {
  // Nuốt im lặng một vai đang chạy là nói dối về việc máy đang làm gì. Thà vẽ nó ở gốc.
  const cay = cayVai([v('lac-loai', 3)]);
  expect(cay).toHaveLength(1);
  expect(cay[0]!.vai.role).toBe('lac-loai');
});

test('danh sách rỗng cho cây rỗng, không ném', () => {
  expect(cayVai([])).toEqual([]);
});

test('nhánh đã đóng không nhận con nữa: vai sâu SAU một vai nông về nhánh mới', () => {
  // Bài "vai depth 1 thành con của vai depth 0 ngay TRƯỚC nó" KHÔNG canh được điều này, dù
  // kế hoạch bảo nó canh: bỏ hẳn `ganNhat.length = bac + 1` vẫn xanh cả năm bài (đã thử đột
  // biến). Lý do là cắt bậc chỉ có hiệu lực với vai tới SAU đó, mà không bài nào có vai nào
  // đứng sau một vai nông.
  //
  // Ca này mới chạm tới nó: `editor` ở bậc 0 đóng nhánh của `writer` lại, nên `phu` ở bậc 2
  // phải tìm cha trong nhánh MỚI. Không cắt bậc thì `ganNhat[1]` vẫn là `tool` của nhánh cũ
  // và `phu` bị treo dưới `writer` — tức giao diện khẳng định Writer đang gọi một công cụ mà
  // nó không gọi, đúng lúc người dùng nhìn vào để biết máy đang làm gì.
  const cay = cayVai([
    v('writer', 0),
    v('tool', 1),
    v('sub', 2),
    v('editor', 0),
    v('phu', 2),
  ]);

  expect(cay.map((n) => n.vai.role)).toEqual(['writer', 'editor']);
  // Nhánh cũ đóng đúng ở chỗ nó dừng: writer → tool → sub, không có gì thêm.
  expect(cay[0]!.con.map((n) => n.vai.role)).toEqual(['tool']);
  expect(cay[0]!.con[0]!.con.map((n) => n.vai.role)).toEqual(['sub']);
  expect(cay[1]!.con.map((n) => n.vai.role)).toEqual(['phu']);
});

test('depth nhảy cóc mà CÓ tổ tiên thì gắn vào tổ tiên gần nhất, không rơi về gốc', () => {
  // Vòng đi ngược lên trong `cayVai` không có bài nào giữ: thay nó bằng `ganNhat[bac - 1]`
  // vẫn xanh cả bộ (đã thử đột biến). Bài "vai mồ côi" ở trên không chạm tới vì vai của nó
  // không có tổ tiên nào cả, nên hai cách viết cho cùng một kết quả.
  //
  // Hai ca này là hai câu trả lời KHÁC nhau và cả hai đều đúng: không có tổ tiên nào đang mở
  // thì vẽ ở gốc (thà lạc chỗ còn hơn biến mất); có tổ tiên thì đứng dưới nó, vì đó là vai
  // đã sinh ra nó.
  const cay = cayVai([v('writer', 0), v('sub', 2)]);

  expect(cay.map((n) => n.vai.role)).toEqual(['writer']);
  expect(cay[0]!.con.map((n) => n.vai.role)).toEqual(['sub']);
});

test('depth âm không được xóa sạch mốc cha đang giữ', () => {
  // `Math.max(0, vai.depth)` là một nhánh phòng thủ không bài nào canh: bỏ nó vẫn xanh cả bộ
  // (đã thử đột biến). Hệ quả thì rộng và im lặng — `ganNhat.length = bac + 1` với `bac = -1`
  // thành `length = 0`, tức xóa sạch mọi mốc cha đang giữ, và MỌI vai lồng sau đó bị đẩy lên
  // gốc. Một con số lạ ở một vai không được phép làm phẳng phần còn lại của cây.
  //
  // Chưa thấy depth âm trong payload thật (Go khai `int`, engine đếm lên từ 0). Nhưng đây là
  // dữ liệu qua dây, và hàm này là chỗ duy nhất giữa dây và màn hình.
  const cay = cayVai([v('la', -1), v('con', 1)]);

  expect(cay.map((n) => n.vai.role)).toEqual(['la']);
  expect(cay[0]!.con.map((n) => n.vai.role)).toEqual(['con']);
});
