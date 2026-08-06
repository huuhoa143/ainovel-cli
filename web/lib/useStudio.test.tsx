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
const LAY_HO_SO = vi.fn<() => Promise<unknown>>();

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
  layHoSo: () => LAY_HO_SO(),
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
  LAY_HO_SO.mockReset();
  LAY_HO_SO.mockResolvedValue({ characters: 3, rules: 4, foreshadow: 0 });
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

test('URL im thì đáp vào màn Quản lý — kể cả xưởng đúng MỘT cuốn', async () => {
  // Điều khoản đã đổi ở bản ba màn; xem lý do đầy đủ ở `khuDap` (lib/xuong.ts).
  // Bài này vẫn đáng giữ dù `lib/xuong.test.ts` đã đo chính hàm luật: nó đo SỢI DÂY —
  // `useStudio` có thật sự truyền tham số THÔ vào luật đáp không. Truyền `khuTuUrl()` đã suy
  // sẵn vào đó làm luật chết lặng mà không bài kiểm nào của hàm luật đỏ.
  const r = await mo('/', xuong(1));
  await waitFor(() => expect(r.result.current.tacPham).toBe('b1'));
  expect(r.result.current.khu).toBe('xuong');
  // Và màn phải đi theo khu: hai giá trị này là một sự thật nhìn từ hai chỗ.
  expect(r.result.current.man).toBe('quan-ly');
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

test('hồ sơ truyện cũng theo nhịp sự kiện — số ở rail không đứng im suốt lúc viết', async () => {
  // Rail hiện số Nhân vật / Luật thế giới / Phục bút từ `hoSo`, và engine THÊM những thứ đó
  // trong lúc viết. Nạp một lần lúc đổi cuốn thì mấy con số ấy đứng im cả phiên — cùng lớp
  // lỗi với danh sách xưởng, chỉ khác chỗ hiện ra.
  const r = await mo('/?tp=b1', xuong(2));
  await waitFor(() => expect(r.result.current.tacPham).toBe('b1'));

  const truoc = LAY_HO_SO.mock.calls.length;
  LAY_HO_SO.mockResolvedValue({ characters: 9, rules: 12, foreshadow: 2 });
  act(() => DongGiaCam.ban(202));

  await waitFor(() => expect(LAY_HO_SO.mock.calls.length).toBeGreaterThan(truoc), {
    timeout: 4000,
  });
  await waitFor(() =>
    expect((r.result.current.hoSo as { characters?: number } | undefined)?.characters).toBe(9),
  );
});

/**
 * Làm mới NỀN — bề mặt không được đứng im khi không có engine nào mở.
 *
 * Đây là lỗ hổng đã đo được trên máy thật, và nó im lặng tuyệt đối: dòng sự kiện chỉ mở khi
 * `tacPham && snapshot`, nên đứng ở màn Quản lý mà thêm một cuốn dưới thư mục gốc thì server
 * trả 4 cuốn còn bảng hiện 3 — mãi mãi. Không lỗi, không cảnh báo, chỉ có một người dùng học
 * được thói quen bấm F5.
 *
 * Hai bài dưới canh hai nguồn kích hoạt, và chúng bắt hai ca khác nhau nên không thay nhau
 * được: nhịp bắt thay đổi xảy ra trong lúc đang nhìn, `focus` bắt thay đổi xảy ra lúc tab ẩn
 * (nhịp không chạy khi ẩn).
 */
test('nhịp nền nạp lại xưởng khi không có engine nào mở', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    const r = await mo('/', xuong(3));
    const truoc = LAY_WORKSHOP.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });

    expect(LAY_WORKSHOP.mock.calls.length).toBeGreaterThan(truoc);
    expect(r.result.current.workshop).toBeDefined();
  } finally {
    vi.useRealTimers();
  }
});

test('quay lại tab thì nạp lại ngay, không đợi hết một nhịp', async () => {
  await mo('/', xuong(3));
  const truoc = LAY_WORKSHOP.mock.calls.length;

  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    await Promise.resolve();
  });

  await waitFor(() => expect(LAY_WORKSHOP.mock.calls.length).toBeGreaterThan(truoc));
});

/**
 * Tab ẩn thì DỪNG. Làm mới một bề mặt không ai nhìn là tiêu I/O đổi lấy không gì, và
 * `/api/workshop` quét meta của từng cuốn nên nó không miễn phí.
 */
test('tab ẩn thì nhịp nền không gọi gì', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Đọc mô tả trên ĐÚNG đối tượng sắp bị ghi đè.
  //
  // Bản trước đọc từ `Document.prototype` rồi ghi đè lên `document` — hai đối tượng khác nhau.
  // `visibilityState` vốn là accessor của prototype, nên gán lên instance chỉ CHE nó đi, và
  // lượt "khôi phục" trả prototype về đúng thứ nó vốn có trong khi lớp che vẫn nằm nguyên trên
  // `document`. Hậu quả: mọi bài kiểm CHẠY SAU bài này đều thấy tab ẩn, tức nhịp nền chết
  // lặng lẽ. Đã bắt được đúng thế khi thêm bài kiểm dải báo qua nhịp nền phía dưới — nó xanh
  // khi chạy một mình và đỏ khi chạy cả tệp.
  const goc = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  try {
    await mo('/', xuong(3));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    const truoc = LAY_WORKSHOP.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(LAY_WORKSHOP.mock.calls.length).toBe(truoc);
  } finally {
    if (goc) Object.defineProperty(document, 'visibilityState', goc);
    else delete (document as unknown as Record<string, unknown>).visibilityState;
    vi.useRealTimers();
  }
});

/* ── bản dựng đổi dưới chân tab ─────────────────────────────────────────── */

/**
 * `next build` thay toàn bộ tệp chunk. JS đã tải vẫn chạy — dòng sự kiện vẫn chảy — nhưng mảnh
 * nào nạp VỀ SAU thì nhận 404, và bề mặt hỏng nửa vời TRONG IM LẶNG.
 *
 * ĐO ĐƯỢC trên máy người dùng: khu "Máy đang nói" trống suốt trong khi server phát 1.182
 * `stream_delta` và một tab mới hiển thị chúng bình thường. Họ phải tự đoán ra là cần F5 —
 * nguyên văn: "phải F5 thì mới thấy được… hơi bị phiền".
 *
 * Không tự tải lại hộ: có thể họ đang đọc dở hoặc đang gõ can thiệp.
 */
test('mã bản dựng đổi giữa hai nhịp thì báo ra', async () => {
  const r = await mo('/', { ...xuong(2), web_build: 'cu' });
  expect(r.result.current.banDungDaDoi, 'báo ngay lần đầu — chưa có gì để so').toBe(false);

  LAY_WORKSHOP.mockResolvedValue({ ...xuong(2), web_build: 'moi' });
  await act(async () => {
    await r.result.current.taiLai();
  });
  await waitFor(() => expect(r.result.current.banDungDaDoi).toBe(true));
});

/**
 * Và nó phải báo qua NHỊP NỀN, không chỉ qua một lượt nạp lại do người dùng gọi.
 *
 * Đây là lỗ mà phép đo đột biến chỉ ra: mọi bài kiểm dải báo đều đi qua `taiLai()`, mà
 * `taiLai()` chạy lại effect §1 — tức chúng canh chỗ nạp LẦN ĐẦU. Gỡ phép so trong
 * `napLaiXuong` thì cả 391 bài vẫn xanh.
 *
 * Mà `napLaiXuong` mới là đường kích hoạt THẬT: người dùng không tự bấm tải lại, họ ngồi
 * nhìn (nhịp 8 giây) hoặc quay lại tab (`focus`). Đúng ca trong nhật ký — dựng lại giao diện
 * dưới chân một tab đang mở, dải tự hiện sau ~19 giây mà không ai đụng vào gì.
 */
test('dải báo hiện qua NHỊP NỀN, không cần ai bấm tải lại', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    const r = await mo('/', { ...xuong(2), web_build: 'cu' });
    expect(r.result.current.banDungDaDoi).toBe(false);

    // Bản dựng đổi dưới chân tab; KHÔNG gọi `taiLai()` ở đâu trong bài kiểm này.
    LAY_WORKSHOP.mockResolvedValue({ ...xuong(2), web_build: 'moi' });
    const truoc = LAY_WORKSHOP.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    // Chốt trung gian: nếu nhịp không hề gọi thì bài kiểm phải nói ra ĐIỀU ĐÓ, chứ không đổ
    // cho phép so — hai nguyên nhân khác nhau, hai chỗ sửa khác nhau.
    expect(LAY_WORKSHOP.mock.calls.length, 'nhịp nền không chạy — bài kiểm đang đo nhầm thứ').toBeGreaterThan(
      truoc,
    );

    expect(
      r.result.current.banDungDaDoi,
      'nhịp nền nạp về mã mới mà không so — dải chỉ hiện nếu người dùng tình cờ bấm tải lại',
    ).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

test('cùng mã bản dựng thì KHÔNG báo — một dải thừa là nhiễu', async () => {
  const r = await mo('/', { ...xuong(2), web_build: 'cu' });
  LAY_WORKSHOP.mockResolvedValue({ ...xuong(2), web_build: 'cu' });
  await act(async () => {
    await r.result.current.taiLai();
  });
  expect(r.result.current.banDungDaDoi).toBe(false);
});

test('server không khai mã (bản chỉ-API) thì không bao giờ báo', async () => {
  const r = await mo('/', xuong(2));
  LAY_WORKSHOP.mockResolvedValue(xuong(2));
  await act(async () => {
    await r.result.current.taiLai();
  });
  expect(r.result.current.banDungDaDoi).toBe(false);
});

test('mã RỖNG nghĩa là KHÔNG BIẾT, không phải đã đổi', async () => {
  // `maBanDung()` trả rỗng khi không có thư mục web — chẳng hạn server được khởi động lại ở
  // chế độ chỉ-API. Coi rỗng là "đã đổi" sẽ bắn dải cho một tab hoàn toàn lành, và người dùng
  // tải lại để nhận đúng bản họ đang chạy. Một cảnh báo sai làm hỏng niềm tin vào mọi cảnh
  // báo sau nó.
  const r = await mo('/', { ...xuong(2), web_build: 'co-that' });
  LAY_WORKSHOP.mockResolvedValue({ ...xuong(2), web_build: '' });
  await act(async () => {
    await r.result.current.taiLai();
  });
  expect(r.result.current.banDungDaDoi, 'mã rỗng bị đọc thành một bản dựng khác').toBe(false);
});
