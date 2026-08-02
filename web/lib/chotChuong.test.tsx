import { act, renderHook } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { ChapterMark, MarkState } from './types';

import { GIU_MS, useVuaChot } from './chotChuong';

/**
 * `useVuaChot` là nguyên thủy của hai họ chuyển động cuối — 09 chương chốt và 10 đồng thanh.
 *
 * Nó phải phân biệt được đúng MỘT điều, và điều đó khó hơn vẻ ngoài: "chương này VỪA chốt"
 * khác hẳn "chương này ĐANG ở trạng thái chốt". Lane là một CỬA SỔ trượt trên một truyện
 * 111 chương (`Chương 1–16 / 111 · 95 chương ngoài cửa sổ`), nên chương đã chốt từ hôm qua
 * vẫn liên tục đi vào và ra khỏi danh sách. Nhầm hai câu đó thì mỗi lần đổi mức xem là cả
 * lane nổ pháo hoa, và người dùng học ngay rằng cái nhấp đó không có nghĩa gì.
 */

function m(chapter: number, state: MarkState): ChapterMark {
  return { chapter, state };
}

test('lần render ĐẦU không có chương nào vừa chốt', () => {
  // Cùng luật với `useDauDoi`: mở trang là thấy hàng chục chương đã chốt từ trước, và nếu
  // chúng cùng nhấp thì đó là một màn trình diễn đèn, không phải một tin.
  const r = renderHook(() => useVuaChot([m(1, 'done'), m(2, 'done'), m(3, 'running')]));
  expect(r.result.current.vua.size).toBe(0);
  expect(r.result.current.dau).toBe(0);
});

test('running → done là VỪA CHỐT', () => {
  const r = renderHook(({ ms }) => useVuaChot(ms), {
    initialProps: { ms: [m(1, 'done'), m(2, 'running')] },
  });
  act(() => r.rerender({ ms: [m(1, 'done'), m(2, 'done')] }));

  expect([...r.result.current.vua]).toEqual([2]);
  expect(r.result.current.dau).toBe(1);
});

test('done đứng yên ở done thì KHÔNG chốt lại', () => {
  // Snapshot nạp lại mỗi 1,5s và phần lớn lần nạp không đổi gì. Không có luật này thì mọi
  // chương đã chốt nhấp hai lần mỗi ba giây.
  const ms = [m(1, 'done'), m(2, 'done')];
  const r = renderHook(({ x }) => useVuaChot(x), { initialProps: { x: ms } });
  act(() => r.rerender({ x: [m(1, 'done'), m(2, 'done')] }));
  act(() => r.rerender({ x: [m(1, 'done'), m(2, 'done')] }));

  expect(r.result.current.vua.size).toBe(0);
  expect(r.result.current.dau).toBe(0);
});

test('chương LẦN ĐẦU thấy đã ở done thì KHÔNG nhấp', () => {
  // Đây là ca chịu lực, và nó là ca THƯỜNG chứ không phải ca biên: lane chỉ vẽ một cửa sổ,
  // nên trượt cửa sổ hoặc đổi mức xem Tập→Cung→Chương là hàng chục chương đã chốt từ lâu
  // vừa xuất hiện. Một bộ so sánh chỉ hỏi "có phải done không" sẽ cho cả đám nhấp.
  const r = renderHook(({ ms }) => useVuaChot(ms), {
    initialProps: { ms: [m(1, 'done'), m(2, 'running')] },
  });
  act(() => r.rerender({ ms: [m(8, 'done'), m(9, 'done'), m(10, 'pending')] }));

  expect(r.result.current.vua.size).toBe(0);
  expect(r.result.current.dau).toBe(0);
});

test('chương ra khỏi cửa sổ rồi quay lại vẫn KHÔNG nhấp', () => {
  // Hệ quả của bài trên, và nó cần bài riêng: một bản cài đặt "quên chương không còn trong
  // danh sách" vẫn làm bài trên xanh, rồi trượt cửa sổ qua lại là nhấp mỗi lần quay về.
  const r = renderHook(({ ms }) => useVuaChot(ms), {
    initialProps: { ms: [m(1, 'done'), m(2, 'done')] },
  });
  act(() => r.rerender({ ms: [m(50, 'pending')] }));
  act(() => r.rerender({ ms: [m(1, 'done'), m(2, 'done')] }));

  expect(r.result.current.vua.size).toBe(0);
  expect(r.result.current.dau).toBe(0);
});

test('done → rewrite KHÔNG phải chốt, và chốt LẠI sau đó thì nhấp lần nữa', () => {
  // Ca thật: Arbiter trả một chương về viết lại rồi nó được chốt lại. Lần chốt thứ hai là
  // một sự kiện thật y như lần đầu — người vận hành đang chờ đúng nó.
  const r = renderHook(({ ms }) => useVuaChot(ms), {
    initialProps: { ms: [m(1, 'done')] },
  });
  act(() => r.rerender({ ms: [m(1, 'rewrite')] }));
  expect(r.result.current.vua.size).toBe(0);
  expect(r.result.current.dau).toBe(0);

  act(() => r.rerender({ ms: [m(1, 'done')] }));
  expect([...r.result.current.vua]).toEqual([1]);
  expect(r.result.current.dau).toBe(1);
});

test('hai chương chốt cùng lúc → cả hai trong tập, nhưng dấu chỉ tăng MỘT', () => {
  // `dau` lái họ 10 (đồng thanh): ba bề mặt nhấp CÙNG một nhịp. Tăng theo số chương sẽ làm
  // chip ở rail nhấp hai lần cho một lượt nạp, tức lệch nhịp với lane — mà cùng nhịp mới là
  // cả điểm của họ ấy.
  const r = renderHook(({ ms }) => useVuaChot(ms), {
    initialProps: { ms: [m(1, 'running'), m(2, 'running')] },
  });
  act(() => r.rerender({ ms: [m(1, 'done'), m(2, 'done')] }));

  expect([...r.result.current.vua].sort()).toEqual([1, 2]);
  expect(r.result.current.dau).toBe(1);
});

/* ── dọn theo GIỜ, không theo nhịp nạp ──────────────────────────────────
 *
 * Đây là nhóm bài chịu lực nhất của tệp, và nó ra đời từ một phép đo chứ không từ trực
 * giác: hoạt ảnh họ 09 kết thúc ở 1.850ms còn snapshot nạp lại mỗi 1.500ms. Bản đầu dọn
 * tập ở lượt nạp kế, tức cắt hoạt ảnh ở khoảng 80% đường — vạch đổ đầy xong rồi tắt phụt
 * giữa nhịp nhấp.
 */

test('lượt nạp KẾ TIẾP không dọn mất tập — hoạt ảnh phải chạy hết', () => {
  vi.useFakeTimers();
  try {
    const r = renderHook(({ ms }) => useVuaChot(ms), {
      initialProps: { ms: [m(1, 'running')] },
    });
    act(() => r.rerender({ ms: [m(1, 'done')] }));
    expect(r.result.current.vua.size).toBe(1);

    // Một lượt nạp nữa ở 1.500ms, đúng nhịp thật của studio.
    act(() => {
      vi.advanceTimersByTime(1500);
      r.rerender({ ms: [m(1, 'done'), m(2, 'pending')] });
    });
    expect(r.result.current.vua.size, 'vẫn phải giữ ở 1.500ms').toBe(1);
  } finally {
    vi.useRealTimers();
  }
});

test('tập được dọn sau GIU_MS, và GIU_MS phải dài hơn hoạt ảnh', () => {
  // Canh cả QUAN HỆ chứ không chỉ con số: nếu ai đó kéo dài họ 09 mà quên nâng `GIU_MS`
  // thì hoạt ảnh lại bị cắt, và không có gì báo.
  expect(GIU_MS, 'phải dài hơn 1.850ms — thời điểm kết thúc của họ 09').toBeGreaterThan(1850);

  vi.useFakeTimers();
  try {
    const r = renderHook(({ ms }) => useVuaChot(ms), {
      initialProps: { ms: [m(1, 'running')] },
    });
    act(() => r.rerender({ ms: [m(1, 'done')] }));
    act(() => vi.advanceTimersByTime(GIU_MS + 50));

    expect(r.result.current.vua.size).toBe(0);
    // Dấu thì KHÔNG lùi: nó là bộ đếm sự kiện, dùng làm `key` để dựng lại phần tử.
    expect(r.result.current.dau).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});

test('chốt lần hai ĐẶT LẠI đồng hồ, không bị lượt trước dọn mất', () => {
  // Không đặt lại thì đồng hồ của lượt một dọn mất tập của lượt hai giữa chừng — và ca này
  // đến được: hai chương chốt cách nhau dưới 2 giây là chuyện thường khi máy chạy nhanh.
  vi.useFakeTimers();
  try {
    const r = renderHook(({ ms }) => useVuaChot(ms), {
      initialProps: { ms: [m(1, 'running'), m(2, 'running')] },
    });
    act(() => r.rerender({ ms: [m(1, 'done'), m(2, 'running')] }));
    act(() => {
      vi.advanceTimersByTime(1200);
      r.rerender({ ms: [m(1, 'done'), m(2, 'done')] });
    });
    expect([...r.result.current.vua]).toEqual([2]);
    expect(r.result.current.dau).toBe(2);

    // 1.200ms sau lượt hai: đồng hồ của lượt MỘT đã quá hạn, nhưng tập vẫn phải còn.
    act(() => vi.advanceTimersByTime(1200));
    expect(r.result.current.vua.size, 'đồng hồ cũ không được dọn tập mới').toBe(1);
  } finally {
    vi.useRealTimers();
  }
});

test('gate → done cũng là chốt', () => {
  // `gate` là chương đang đứng ở cửa kiểm định. Cho đi tiếp thì nó thành `done`, và đó đúng
  // là khoảnh khắc người vận hành vừa cấp phép — sự kiện đáng thấy nhất trong chế độ
  // nghiệm thu.
  const r = renderHook(({ ms }) => useVuaChot(ms), {
    initialProps: { ms: [m(4, 'gate')] },
  });
  act(() => r.rerender({ ms: [m(4, 'done')] }));

  expect([...r.result.current.vua]).toEqual([4]);
});

test('danh sách MỚI mỗi lần render vẫn HỘI TỤ, không lặp vô hạn', () => {
  // Tính chất này lộ ra khi thử đột biến: bỏ vế "đã từng thấy" thì bộ kiểm KHÔNG đỏ mà
  // TREO. Lý do là một vòng thật: effect phụ thuộc `[marks]`, người gọi dựng mảng mới mỗi
  // lần render (`?? []` hay một literal), nên setState → render → mảng mới → effect → …
  //
  // Bản đúng thoát ra sau đúng MỘT vòng vì `daThay` đã ghi `done` nên lượt sau `vua` rỗng
  // và effect return sớm. Đó là một tính chất chịu lực, không phải may mắn — nên nó có bài
  // kiểm riêng thay vì chỉ sống trong lập luận.
  let soLanRender = 0;
  const r = renderHook(({ n }) => {
    soLanRender += 1;
    // Mảng MỚI mỗi lần render, đúng kiểu người gọi bất cẩn nhất.
    return useVuaChot([{ chapter: 1, state: n === 0 ? 'running' : 'done' }]);
  }, { initialProps: { n: 0 } });

  const truocKhiChot = soLanRender;
  act(() => r.rerender({ n: 1 }));

  expect([...r.result.current.vua]).toEqual([1]);
  // Ngân sách rộng rãi — điều đang canh là HỮU HẠN, không phải một con số chính xác.
  expect(soLanRender - truocKhiChot, 'phải hội tụ, không lặp vô hạn').toBeLessThan(10);
});

test('danh sách rỗng không ném và không nhấp', () => {
  const r = renderHook(({ ms }) => useVuaChot(ms), { initialProps: { ms: [] as ChapterMark[] } });
  act(() => r.rerender({ ms: [] }));
  expect(r.result.current.vua.size).toBe(0);
  expect(r.result.current.dau).toBe(0);
});
