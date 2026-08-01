import { expect, test } from 'vitest';

import { LE_DAY, dangODay } from './tuCuon';

test('đúng đáy thì đang bám đáy', () => {
  expect(dangODay({ scrollTop: 900, scrollHeight: 1000, clientHeight: 100 })).toBe(true);
});

test('lệch trong ngưỡng vẫn coi là bám đáy', () => {
  // Trình duyệt trả số lẻ (devicePixelRatio, sub-pixel), nên so bằng đúng sẽ RỚT khỏi chế độ
  // tự cuộn ngay ở nhịp đầu — và người dùng không hiểu vì sao chữ đứng lại.
  expect(dangODay({ scrollTop: 900 - LE_DAY + 1, scrollHeight: 1000, clientHeight: 100 })).toBe(true);
});

test('cuộn lên quá ngưỡng thì KHÔNG còn bám đáy', () => {
  expect(dangODay({ scrollTop: 400, scrollHeight: 1000, clientHeight: 100 })).toBe(false);
});

test('nội dung ngắn hơn khung thì luôn là bám đáy', () => {
  // Lúc mới mở, khu chưa có gì để cuộn. Trả false ở đây sẽ hiện nút "về cuối" trên một khu
  // không cuộn được — một nút không làm gì.
  expect(dangODay({ scrollTop: 0, scrollHeight: 80, clientHeight: 300 })).toBe(true);
});

test('lệch một pixel vẫn là bám đáy — ngưỡng KHÔNG được là số không', () => {
  // Số 899 ở đây viết THẲNG, không suy từ LE_DAY, và đó là cả điểm của bài này.
  //
  // Ba bài trên đều dựng đầu vào TỪ chính LE_DAY, nên đầu vào của chúng trôi theo hằng số:
  // đặt LE_DAY = 0 thì cả ba vẫn xanh (đã thử đột biến), trong khi lúc đó ngưỡng không tha
  // một lệch nào — tức mất đúng thứ nó sinh ra để tha, và khu rớt khỏi tự cuộn ngay nhịp đầu.
  // Một bài kiểm đo cái nó tự sinh ra thì không đo gì cả.
  expect(dangODay({ scrollTop: 899, scrollHeight: 1000, clientHeight: 100 })).toBe(true);
});

test('lệch đúng bằng LE_DAY vẫn là bám đáy — mốc nằm TRONG ngưỡng', () => {
  // Hằng số khai là "ngưỡng CÒN coi là ở đáy", tức mốc thuộc về phía trong. Không chốt mốc
  // thì `<=` đổi thành `<` vẫn xanh cả bộ.
  expect(dangODay({ scrollTop: 900 - LE_DAY, scrollHeight: 1000, clientHeight: 100 })).toBe(true);
});

test('lệch hơn LE_DAY một pixel thì hết bám đáy — ngưỡng có mốc thật', () => {
  // Cặp với hai bài trên để chốt ngưỡng từ CẢ HAI phía: bài "cuộn lên quá ngưỡng" chỉ dùng
  // lệch 500px nên một LE_DAY nới rộng thành 600 vẫn lọt qua nó.
  expect(dangODay({ scrollTop: 900 - LE_DAY - 1, scrollHeight: 1000, clientHeight: 100 })).toBe(
    false,
  );
});
