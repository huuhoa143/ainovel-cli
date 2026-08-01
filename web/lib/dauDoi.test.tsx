import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';

import { useDauDoi, useDauToi } from './dauDoi';

/**
 * `useDauDoi` là nguyên thủy dùng chung cho bốn họ chuyển động (số vừa đổi, nhãn có số đếm,
 * trạng thái vừa đổi, đồng thanh). Nó phải đúng ba điều, và cả ba đều là điều kiện để chuyển
 * động MANG THÔNG TIN chứ không thành nhiễu.
 */

test('lần render ĐẦU không được tính là vừa đổi', () => {
  // Điều kiện quan trọng nhất. Nếu mount cũng tính là đổi thì mở trang là cả bề mặt nhấp một
  // lượt — hàng chục ô cùng lúc — và người dùng học ngay rằng cái nhấp đó không có nghĩa gì.
  const r = renderHook(() => useDauDoi(17));
  expect(r.result.current).toBe(0);
});

test('giá trị đổi thì dấu tăng', () => {
  const r = renderHook(({ v }) => useDauDoi(v), { initialProps: { v: 17 } });
  expect(r.result.current).toBe(0);
  act(() => r.rerender({ v: 18 }));
  expect(r.result.current).toBe(1);
});

test('render lại với CÙNG giá trị thì dấu KHÔNG tăng', () => {
  // Snapshot được nạp lại mỗi 1,5s trong lúc engine chạy, và phần lớn lần nạp không đổi con
  // số nào. Nếu dấu tăng theo mỗi lần nạp thì mọi ô nhấp liên tục suốt phiên.
  const r = renderHook(({ v }) => useDauDoi(v), { initialProps: { v: 17 } });
  act(() => r.rerender({ v: 17 }));
  act(() => r.rerender({ v: 17 }));
  expect(r.result.current).toBe(0);
});

test('đổi nhiều lần thì dấu tăng nhiều lần — mỗi lần là một key mới', () => {
  // Dấu được dùng làm `key` để React dựng lại phần tử, tức để animation CSS chạy lại. Hai lần
  // đổi cho cùng một dấu thì lần thứ hai không có chuyển động nào.
  const r = renderHook(({ v }) => useDauDoi(v), { initialProps: { v: 1 } });
  act(() => r.rerender({ v: 2 }));
  act(() => r.rerender({ v: 3 }));
  act(() => r.rerender({ v: 4 }));
  expect(r.result.current).toBe(3);
});

test('đổi rồi quay lại giá trị cũ vẫn là một lần đổi', () => {
  // `2 → 3 → 2` là hai sự kiện, không phải không có gì. Ca thật: một chương bị trả về viết lại
  // rồi chốt lại.
  const r = renderHook(({ v }) => useDauDoi(v), { initialProps: { v: 2 } });
  act(() => r.rerender({ v: 3 }));
  act(() => r.rerender({ v: 2 }));
  expect(r.result.current).toBe(2);
});

test('undefined → có giá trị được tính là đổi', () => {
  // Ca thật và không hiếm: trường sống là `null`/vắng khi engine đóng, rồi có số khi engine mở.
  const r = renderHook(({ v }) => useDauDoi(v), {
    initialProps: { v: undefined as number | undefined },
  });
  act(() => r.rerender({ v: 5 }));
  expect(r.result.current).toBe(1);
});

test('so sánh bằng Object.is nên NaN không tự coi là đổi mãi', () => {
  // `NaN !== NaN`, nên một bộ so sánh dùng `!==` sẽ thấy NaN đổi ở MỌI lần render và nhấp vô
  // hạn. `chapters_per_hour` chia cho thời lượng nên NaN là ca đến được.
  const r = renderHook(({ v }) => useDauDoi(v), { initialProps: { v: Number.NaN } });
  act(() => r.rerender({ v: Number.NaN }));
  act(() => r.rerender({ v: Number.NaN }));
  expect(r.result.current).toBe(0);
});

/* ── useDauToi ─────────────────────────────────────────────────────────── */

test('chỉ tăng khi đi từ KHÔNG CÓ sang CÓ', () => {
  const r = renderHook(({ c }) => useDauToi(c), { initialProps: { c: false } });
  expect(r.result.current).toBe(0);
  act(() => r.rerender({ c: true }));
  expect(r.result.current).toBe(1);
});

test('bật sẵn từ đầu KHÔNG tính là vừa tới', () => {
  // Mở trang với một việc tồn đã có sẵn từ trước: nó không "vừa tới", nó đã ở đó. Nhấp lúc
  // này là nói dối về thời điểm.
  const r = renderHook(() => useDauToi(true));
  expect(r.result.current).toBe(0);
});

test('tắt đi KHÔNG tăng — biến mất không phải sự kiện cần lấy mắt', () => {
  const r = renderHook(({ c }) => useDauToi(c), { initialProps: { c: true } });
  act(() => r.rerender({ c: false }));
  expect(r.result.current).toBe(0);
});

test('tắt rồi bật lại thì tăng tiếp', () => {
  const r = renderHook(({ c }) => useDauToi(c), { initialProps: { c: false } });
  act(() => r.rerender({ c: true }));
  act(() => r.rerender({ c: false }));
  act(() => r.rerender({ c: true }));
  expect(r.result.current).toBe(2);
});
