import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { sach, snap } from '@/components/mau.test-helper';
import type { Workshop } from '@/lib/types';

/**
 * Bộ kiểm cho SỢI DÂY giữa `khuDap` và `useStudio` — không phải cho `khuDap`.
 *
 * `lib/xuong.test.ts` đã canh luật đáp ở mức hàm thuần (tám đột biến, hai lỗ hổng đã bịt).
 * Cái nó KHÔNG canh được là chỗ đấu dây, và chỗ đó có đúng một cái bẫy mà nhật ký cụm
 * Xưởng-logic đã ghi sẵn: `khuTuUrl()` trả `KHU_MAC_DINH` khi query string không có `?khu=`,
 * còn `ghiUrl` cố ý bỏ `khu` khỏi URL khi nó bằng `KHU_MAC_DINH` — nên "URL im" và "URL ghi
 * dong-san-xuat" đến `khuDap` y hệt nhau nếu người đấu dây truyền thẳng hàm cũ vào. Hệ quả:
 * mọi lần mở trang rơi vào nhánh đầu, KHÔNG ai thấy màn Xưởng, và không một bài kiểm nào của
 * `khuDap` đỏ vì bản thân hàm vẫn đúng.
 *
 * Nên bài kiểm ở đây lái bằng URL THẬT (`history.replaceState`) và đọc `khu` ra khỏi hook
 * thật. Không có tầng nào ở giữa để nói dối.
 */

/** Xưởng `n` cuốn, mã `b1..bn`. Số lượng là thứ duy nhất luật đáp đọc. */
function xuong(n: number): Workshop {
  return {
    root: '/w',
    books: Array.from({ length: n }, (_, i) => sach({ id: `b${i + 1}`, name: `Cuốn ${i + 1}` })),
  };
}

const LAY_WORKSHOP = vi.fn<() => Promise<Workshop>>();

/**
 * `DongGia` giả: dòng sự kiện không phải thứ đang đo, nhưng effect §3 vẫn mở nó.
 *
 * Thay cả `LA_MOCK` thành `true` để `useStudio` đi nhánh này thay vì dựng `EventSource` —
 * jsdom không có `EventSource`, và một bài kiểm về luật đáp không được đỏ vì chuyện đó.
 */
class DongGiaCam {
  /** Bộ nghe theo loại, để bài kiểm bắn được một `ui_event` thật. */
  static nghe = new Map<string, (ev: MessageEvent) => void>();
  addEventListener(loai: string, fn: (ev: MessageEvent) => void) {
    DongGiaCam.nghe.set(loai, fn);
  }
  close() {}
  /** Bắn một ui_event có `seq` hợp lệ — đủ để `nhanSuKienUi` nhận và hẹn làm mới chạy. */
  static ban(seq: number) {
    DongGiaCam.nghe.get('ui_event')?.(
      new MessageEvent('ui_event', {
        data: JSON.stringify({ seq, kind: 'ui_event', time: '2026-08-02T00:00:00Z' }),
      }),
    );
  }
}

/**
 * jsdom KHÔNG hiện thực `EventSource`, và `useStudio` hỏi `nguon instanceof EventSource` —
 * một `instanceof` với vế phải `undefined` NÉM, kể cả khi nhánh mock đã tránh dựng nó.
 *
 * Vá TẠI ĐÂY chứ không ở `vitest.setup.giaodien.ts`, cùng lý do mà `app/page.test.tsx` đã ghi
 * cho `scrollIntoView`: tệp setup vá một lỗi làm MỌI bài kiểm nói dối; cái này chỉ chạm tới
 * bài kiểm nào dựng `useStudio` thật. Trình duyệt thật luôn có `EventSource`, nên đây là lỗ
 * hổng của môi trường kiểm, không phải của mã.
 */
globalThis.EventSource = class {} as unknown as typeof EventSource;

vi.mock('@/lib/api', () => ({
  LA_MOCK: true,
  DongGia: DongGiaCam,
  LOAI_SU_KIEN_UI: ['ui_event'] as const,
  LOAI_VAN_SONG: ['stream_delta', 'stream_clear'] as const,
  duongSuKien: () => '/khong-dung',
  layWorkshop: () => LAY_WORKSHOP(),
  laySnapshot: () => Promise.resolve(snap({})),
  layHoSo: () => Promise.reject(new Error('không cần cho bài kiểm này')),
}));

const { useStudio } = await import('./useStudio');

/** Mở trang tại một URL cụ thể, rồi chờ `/workshop` về. */
async function mo(url: string, ws: Workshop) {
  window.history.replaceState(null, '', url);
  LAY_WORKSHOP.mockResolvedValue(ws);
  const r = renderHook(() => useStudio());
  await waitFor(() => expect(r.result.current.workshop).toBeDefined());
  return r;
}

beforeEach(() => {
  LAY_WORKSHOP.mockReset();
});

test('URL im và xưởng nhiều cuốn thì đáp vào Xưởng', async () => {
  // Số lượng sách chỉ biết SAU khi `/workshop` trả về, nên luật đáp không thể chạy lúc dựng
  // state. Bài này là bằng chứng nó có chạy ở chỗ biết được con số đó.
  const r = await mo('/', xuong(3));
  await waitFor(() => expect(r.result.current.khu).toBe('xuong'));
});

test('`?khu=chi-phi` thắng luật đáp, kể cả với xưởng chín cuốn', async () => {
  // Tải lại trang ở một màn phải về ĐÚNG màn đó. Chín cuốn là ca luật đáp "muốn" nhất, nên
  // nếu có chỗ nào luật đáp thắng được URL thì nó thắng ở đây.
  const r = await mo('/?khu=chi-phi', xuong(9));
  await waitFor(() => expect(r.result.current.tacPham).toBeDefined());
  expect(r.result.current.khu).toBe('chi-phi');
});

test('`?khu=dong-san-xuat` ghi RÕ vẫn thắng, dù nó trùng khu mặc định', async () => {
  // Cái bẫy của sợi dây này. `ghiUrl` bỏ `khu` khỏi URL khi nó bằng `KHU_MAC_DINH`, nên rất
  // dễ viết một bộ đọc coi "ghi rõ khu mặc định" là "URL im" — và lúc đó bài trên vẫn xanh
  // (chi-phi khác mặc định) trong khi người dùng ghim đúng buồng lái bị ném sang Xưởng.
  const r = await mo('/?khu=dong-san-xuat', xuong(3));
  await waitFor(() => expect(r.result.current.tacPham).toBeDefined());
  expect(r.result.current.khu).toBe('dong-san-xuat');
});

test('có `?tp=` mà URL không ghi khu thì đáp vào buồng lái, không phải Xưởng', async () => {
  const r = await mo('/?tp=b2', xuong(4));
  await waitFor(() => expect(r.result.current.tacPham).toBe('b2'));
  expect(r.result.current.khu).toBe('dong-san-xuat');
});

test('xưởng đúng MỘT cuốn thì đáp vào buồng lái, không phải bảng một dòng', async () => {
  const r = await mo('/', xuong(1));
  await waitFor(() => expect(r.result.current.tacPham).toBe('b1'));
  expect(r.result.current.khu).toBe('dong-san-xuat');
});

test('đổi khu sau khi đã đáp thì luật đáp KHÔNG kéo về nữa, kể cả khi tải lại dữ liệu', async () => {
  // Luật đáp là luật LÚC MỞ TRANG. Đặt nó vào một effect chạy lại theo `workshop` thì mỗi lần
  // làm mới danh sách sẽ ném người dùng về Xưởng ngay giữa lúc họ đang xem bề mặt khác — một
  // bề mặt tự đổi dưới tay người đang dùng.
  const r = await mo('/', xuong(3));
  await waitFor(() => expect(r.result.current.khu).toBe('xuong'));

  act(() => r.result.current.chonTacPham('b2'));
  act(() => r.result.current.chonKhu('chi-phi'));
  expect(r.result.current.khu).toBe('chi-phi');

  // Xưởng trả về một danh sách KHÁC để lần tải lại này quan sát được. Chờ `tacPham` là không
  // đủ — nó đã bằng `b2` từ trước lời gọi, nên `waitFor` về ngay và khẳng định cuối chạy
  // TRƯỚC khi `/workshop` kịp trả lời. ĐO ĐƯỢC: với bản đó, đột biến "bỏ điều kiện URL-im"
  // không làm bài này đỏ.
  LAY_WORKSHOP.mockResolvedValue(xuong(4));
  act(() => r.result.current.taiLai());
  await waitFor(() => expect(r.result.current.workshop?.books).toHaveLength(4));
  expect(r.result.current.khu).toBe('chi-phi');
});


/* ── Danh sách xưởng phải SỐNG, không phải nạp một lần rồi thôi ──────────────
 *
 * ĐO ĐƯỢC trên máy thật: tạo tác phẩm mới rồi chạy nó, thanh trên KHÔNG hiện cuốn nào, bảng
 * Xưởng vẫn liệt kê 3 cuốn cũ và ghi "0 engine đang mở" — trong khi transport phía dưới ghi
 * "đang chạy". Phải F5 mới thấy. Nguyên nhân: `/workshop` chỉ được gọi trong effect §1, và
 * effect đó chỉ chạy theo `lanTai`.
 *
 * Hư hại không chỉ là một dòng thiếu. `ThanhTren` suy cuốn đang xem bằng
 * `workshop.books.find(b => b.id === tacPham)`, nên cuốn vắng trong danh sách làm bộ chọn tác
 * phẩm KHÔNG được vẽ — người dùng mất luôn đường đổi cuốn. */

test('tạo tác phẩm mới xong thì Xưởng có nó ngay — không cần F5', async () => {
  const r = await mo('/', xuong(3));
  await waitFor(() => expect(r.result.current.khu).toBe('xuong'));
  expect(r.result.current.workshop?.books).toHaveLength(3);

  // Cuốn mới đã có ở server; `/workshop` từ giờ trả BỐN cuốn.
  LAY_WORKSHOP.mockResolvedValue({
    root: '/w',
    books: [...xuong(3).books, sach({ id: 'moi', name: 'Con Rối Trong Hộp Kính' })],
  });

  act(() => r.result.current.moTacPhamVuaTao('moi'));

  await waitFor(() => expect(r.result.current.workshop?.books).toHaveLength(4));
  // Điều kiện thật mà `ThanhTren` cần để vẽ được bộ chọn tác phẩm.
  expect(r.result.current.workshop?.books.some((b) => b.id === 'moi')).toBe(true);
});

test('sự kiện engine tới thì danh sách xưởng cũng được nạp lại, không chỉ snapshot', async () => {
  // Bảng Xưởng hiện chương đã chốt, tiền đã tiêu và "engine đang mở" — cả ba đổi TRONG lúc
  // chạy. Làm mới snapshot mà không làm mới xưởng thì dải tổng đứng im suốt phiên, và ô
  // "N engine đang mở" nói 0 trong khi có một engine đang viết.
  const r = await mo('/?tp=b1', xuong(2));
  await waitFor(() => expect(r.result.current.tacPham).toBe('b1'));

  const truoc = LAY_WORKSHOP.mock.calls.length;
  LAY_WORKSHOP.mockResolvedValue(xuong(5));
  act(() => DongGiaCam.ban(101));

  await waitFor(() => expect(LAY_WORKSHOP.mock.calls.length).toBeGreaterThan(truoc), {
    timeout: 4000,
  });
  await waitFor(() => expect(r.result.current.workshop?.books).toHaveLength(5));
});
