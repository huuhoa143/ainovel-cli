import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { Snapshot } from '@/lib/types';
import { BO_DEM_RONG, moLuot, themChu, type BoDemVan } from '@/lib/vanSong';

import { BuongLai } from './BuongLai';
import { snap } from './mau.test-helper';

/**
 * Ba bài đầu canh LUẬT ĐỔI DẢI (Task 12); phần còn lại canh việc Task 13 chuyển cả thân
 * `Canvas` vào đây mà không đánh rơi khối nào và không đứt sợi dây nào.
 *
 * `.vtt` chứ không phải `.viectieptheo` như kế hoạch ghi: `ViecTiepTheo` đã tồn tại từ trước
 * và lớp của nó là `vtt` (`app/globals.css` bám theo tên đó). Đổi tên lớp cho khớp kế hoạch
 * là sửa CSS của một dải đang chạy được, chỉ để một bài kiểm đọc đẹp hơn.
 */
function ve(
  dangChay: boolean,
  p: Partial<Snapshot> = {},
  vanSong: BoDemVan = BO_DEM_RONG,
  q: Partial<Parameters<typeof BuongLai>[0]> = {},
) {
  return render(
    <BuongLai
      snapshot={snap({ agents: [], idle_agents: [], ...p })}
      tacPham="b"
      choGhi
      vuaChot={new Set<number>()}
      chuongChon={undefined}
      onChonChuong={() => {}}
      onChonKhu={() => {}}
      onDocChuong={() => {}}
      onDoi={() => {}}
      suKien={[]}
      song={undefined}
      vanSong={vanSong}
      dangChay={dangChay}
      {...q}
    />,
  );
}

/* ── luật đổi dải (Task 12) ───────────────────────────────────────────── */

test('đang chạy → hiện dải trạng thái, KHÔNG hiện dải việc tiếp theo', () => {
  const { container } = ve(true);

  // Khung mang lớp `buonglai`. Lưới ba hàng của Task 13 và CSS của Task 14 đều bám vào đúng
  // tên đó, nên đổi tên nó là để cả buồng lái rơi về một chồng khối dọc mà không bài kiểm
  // nào lên tiếng (đã thử đột biến: bỏ lớp vẫn xanh).
  expect(container.querySelector('.buonglai')).not.toBeNull();
  expect(container.querySelector('.daitrangthai')).not.toBeNull();
  // Hiện CẢ HAI cũng là sai, không chỉ hiện nhầm: một dải "việc tiếp theo" lúc máy đang chạy
  // là mời người dùng bấm một nút thứ hai trong khi một lượt đang tiêu tiền.
  expect(container.querySelector('.vtt')).toBeNull();
});

test('máy nghỉ → hiện dải việc tiếp theo, KHÔNG hiện dải trạng thái', () => {
  const { container } = ve(false);

  expect(container.querySelector('.vtt')).not.toBeNull();
  expect(container.querySelector('.daitrangthai')).toBeNull();
});

test('dải việc tiếp theo được cho biết máy đang NGHỈ, không phải đang chạy', () => {
  // Hai bài trên chỉ hỏi dải nào có mặt, nên chúng vẫn xanh nếu `dangChay` bị nhét cứng
  // thành `true` lúc truyền xuống. Dải đó suy CẢ câu trạng thái lẫn nút từ cờ này: nhét cứng
  // là để nó nói "Máy đang viết" ngay dưới một thanh transport đang đứng im.
  const { container } = ve(false);

  expect(container.querySelector('.vtt')!.textContent).toContain(CHU.ttNghi(1, 3));
});

/* ── dải quyết định của cửa nghiệm thu (Task 5) ────────────────────────── */

const CHO = { mode: 'review', hold: true, permit_chapter: 8 } as const;

test('cửa đang chờ → dải quyết định đứng TRÊN dải trạng thái', () => {
  // Thứ tự là nội dung, không phải trang trí: "dây chuyền đang chờ BẠN" là tin cấp cao hơn
  // "dây chuyền đang làm gì" — cái thứ nhất là một việc phải làm, cái thứ hai là tin để ngó.
  const { container } = ve(true, { advance: { ...CHO } });

  const dai = container.querySelector('.cuanghiemthu');
  expect(dai).not.toBeNull();

  const tt = container.querySelector('.daitrangthai')!;
  expect(dai!.compareDocumentPosition(tt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('cửa đang chờ lúc máy NGHỈ → dải quyết định vẫn đứng trên dải việc tiếp theo', () => {
  // Ca thường gặp hơn ca trên: engine dừng ở biên chương rồi mới treo cửa. Hai bài vì luật đổi
  // dải làm khối dưới đổi component, và một dải chèn vào giữa `.bltren` có thể đúng thứ tự với
  // một khối mà sai với khối kia.
  const { container } = ve(false, { advance: { ...CHO } });

  const dai = container.querySelector('.cuanghiemthu')!;
  const vtt = container.querySelector('.vtt')!;
  expect(dai.compareDocumentPosition(vtt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('cửa KHÔNG chờ → buồng lái không có dải quyết định nào', () => {
  // `snap()` để `advance: null` theo mặc định. Vế ngược cần bài riêng: một dải luôn vẽ vẫn làm
  // hai bài trên xanh, và hệ quả là một khối amber thường trực trên đầu bề mặt đông nhất.
  const { container } = ve(true);
  expect(container.querySelector('.cuanghiemthu')).toBeNull();
});

test('dải ở buồng lái nhận `choGhi`, nên chế độ chỉ đọc khóa được hai nút', () => {
  const { container } = ve(true, { advance: { ...CHO } }, BO_DEM_RONG, { choGhi: false });
  const dai = container.querySelector('.cuanghiemthu')!;

  for (const n of dai.querySelectorAll('button')) {
    expect(n.disabled).toBe(true);
  }
  expect(dai.textContent).toContain(GIAI_THICH.nghiemThuChoDay);
});

test('dải ở buồng lái được cho biết máy đang chạy hay nghỉ', () => {
  // Nhãn nút gửi của ô nhập là hai HỆ QUẢ khác nhau về tiền. Phải mở ô nhập mới đo được: chỉ
  // hỏi hai cái nút ngoài thì nhét cứng `dangChay={false}` cho riêng dải này vẫn xanh.
  //
  // Tra trong `.cuanghiemthu` chứ không tra cả bề mặt: ô can thiệp ở hàng 4 dùng ĐÚNG hai nhãn
  // đó, nên một phép tra toàn cục sẽ thấy nút của nó và xanh mà không cần dải nói gì.
  // Cả HAI chiều: nhét cứng `true` cũng là một đột biến, và nó chỉ lộ ra ở ca máy nghỉ — đúng
  // ca thường gặp nhất của cửa nghiệm thu.
  const nhanNutGui = (dangChay: boolean) => {
    const { container } = ve(dangChay, { advance: { ...CHO } });
    const dai = container.querySelector('.cuanghiemthu')!;
    fireEvent.click(
      [...dai.querySelectorAll('button')].find(
        (n) => n.textContent === CHU.traChuongVeVietLai(8),
      )!,
    );
    return [...dai.querySelectorAll('button')].map((n) => n.textContent);
  };

  expect(nhanNutGui(true)).toContain(CHU.tiemVaoLuotDangChay);
  cleanup();
  expect(nhanNutGui(false)).toContain(CHU.danhThucLuotMoi);
});

/* ── ba hàng của cột giữa, và bàn chia ô ở hàng giữa ──────────────────── */

test('cột giữa có đủ BA hàng, theo đúng thứ tự trục · bàn · can thiệp', () => {
  // Hỏi thứ tự chứ không chỉ hỏi sự có mặt: trục phải TRÊN bàn (nó nói về cả cuốn, và một
  // dải nói phạm vi đứng dưới các ô nói chi tiết là đảo cấp bậc), và ô can thiệp phải DƯỚI
  // cùng — nó là dòng nhập của TUI, ghim đáy, không cuộn đi mất.
  const { container } = ve(true);
  const giua = container.querySelector('.blgiua');
  expect(giua).not.toBeNull();

  // Thanh chia của trục nằm GIỮA trục và bàn, không phải cuối danh sách: thứ tự DOM là thứ
  // tự Tab, nên một thanh chia đứng sai chỗ là bàn phím đi tới nó ở một chỗ mà mắt không
  // thấy ranh giới nào.
  const hang = [...giua!.children].map((e) => e.className.split(' ')[0]);
  expect(hang).toEqual(['bltruc', 'blkeo', 'blsan', 'blcanthiep']);
});

test('ba ranh giới kéo được, mỗi cái một thanh chia có nhãn riêng', () => {
  // Ba `separator` cùng một chỗ mà chung nhãn thì trình đọc màn hình đọc ra ba lần cùng một
  // câu, và người dùng bàn phím không biết mình đang đứng ở ranh giới nào.
  const { container } = ve(true);
  const nhan = [...container.querySelectorAll('[role="separator"]')].map((e) => ({
    nhan: e.getAttribute('aria-label'),
    huong: e.getAttribute('aria-orientation'),
    bamPhimDuoc: (e as HTMLElement).tabIndex === 0,
  }));

  expect(nhan).toEqual([
    { nhan: CHU.keoTruc, huong: 'horizontal', bamPhimDuoc: true },
    { nhan: CHU.keoCot, huong: 'vertical', bamPhimDuoc: true },
    { nhan: CHU.keoHang, huong: 'horizontal', bamPhimDuoc: true },
  ]);
});

test('bàn có đủ BỐN ô, và thứ tự DOM là thứ tự ĐỌC', () => {
  // Lưới đặt bốn ô bằng `grid-area`, nên thứ tự DOM và thứ tự nhìn thấy có thể tách rời —
  // đúng lớp lỗi mà `PRODUCT.md` cấm ("bàn phím là hạng nhất"): một bàn đẹp mắt với thứ tự
  // Tab nhảy cóc là một bàn không dùng được bằng bàn phím.
  //
  // Thứ tự này cũng là thứ tự mà bố cục một-cột dưới 700px canvas dùng nguyên xi, nên nó
  // phải đúng ở CẢ HAI chỗ bằng một khai báo duy nhất.
  const { container } = ve(true);
  const o = [...container.querySelectorAll('.blsan > .blo')].map(
    (e) => e.className.split(' ')[1],
  );
  expect(o).toEqual(['blo-song', 'blo-sukien', 'blo-chuong', 'blo-nhatky']);
});

test('mỗi ô của bàn có đầu ô RIÊNG, để biết mình đang đọc ô nào lúc đã cuộn', () => {
  // Bốn ô cùng cuộn độc lập. Một ô mất đầu ô là một cột số không tên ngay khi người dùng
  // cuộn qua dòng đầu — và ở ô bảng chương thì đó là năm cột số cùng lúc.
  const { container } = ve(true);
  for (const ma of ['blo-song', 'blo-sukien', 'blo-chuong', 'blo-nhatky']) {
    const o = container.querySelector(`.${ma}`)!;
    expect(o.querySelector('h2'), ma).not.toBeNull();
  }
});

test('đầu ô mang MẪU SỐ của thứ đang cuộn bên dưới', () => {
  // Ô cao vài trăm pixel chứa vài nghìn pixel nội dung. Không nói ra "còn bao nhiêu nữa" thì
  // thanh cuộn là dấu hiệu duy nhất — mà nó rộng 6px (`scrollbar-width: thin`). Cùng luật
  // với dải tổng của màn Quản lý: một con số không kèm mẫu số bị đọc thành toàn bộ.
  ve(true, {
    chapters: [
      { chapter: 1, stage: 'done', words: 2100 },
      { chapter: 2, stage: 'done', words: 1900 },
    ],
    decisions: [
      { id: 'd1', at: '2026-08-01T10:00:00Z', kind: 'gate', decider: 'arbiter', reason: 'ok' },
    ],
  });

  expect(screen.getByText(CHU.soChuongTrongBang(2))).toBeDefined();
  expect(screen.getByText(CHU.soPhanQuyet(1))).toBeDefined();
  expect(screen.getByText(CHU.soDongSuKien(0))).toBeDefined();
});

test('khu văn sống vẽ chữ của bộ đệm THẬT, không phải một bộ đệm rỗng dựng tại chỗ', () => {
  // Đây là sợi dây dài nhất của Task 13: `useStudio` → `page.tsx` → `BuongLai` → `VanSong`.
  // Đứt ở bất kỳ mắt nào thì khu đắt nhất màn hình im lặng trong lúc engine đang viết, và
  // không có lỗi nào nổ ra — nó chỉ hiện câu "chưa có lượt nào".
  let bd = themChu(BO_DEM_RONG, 'khế ước: ✓ 4/4');
  bd = moLuot(bd, 'chương 2 · 23:11');
  bd = themChu(bd, 'nàng quay đầu lại');

  ve(true, {}, bd);

  expect(screen.getByText('khế ước: ✓ 4/4')).toBeDefined();
  expect(screen.getByText('nàng quay đầu lại')).toBeDefined();
  expect(screen.getByText('chương 2 · 23:11')).toBeDefined();
});

test('khu văn sống được cho biết máy đang chạy hay đang nghỉ', () => {
  // `dangChay` đi tới HAI nơi trong buồng lái (luật đổi dải và tiêu đề khu văn sống). Nhét
  // cứng một trong hai vẫn để bài "đổi dải" xanh, nên tiêu đề phải có bài riêng.
  ve(true, {}, themChu(BO_DEM_RONG, 'x'));
  expect(screen.getByRole('heading', { name: CHU.mayDangNoi })).toBeDefined();

  // Bộ đệm CÓ chữ, nên ca nghỉ ở đây là "văn của lượt gần nhất" — xem ba ca ở `VanSong.tsx`.
  ve(false, {}, themChu(BO_DEM_RONG, 'x'));
  expect(screen.getByRole('heading', { name: CHU.vanLuotGanNhat })).toBeDefined();
});

test('ô can thiệp nói ra hệ quả đúng với trạng thái máy', () => {
  // Nhãn nút của ô can thiệp là hai HỆ QUẢ khác nhau ("tiêm vào lượt đang chạy" vs "đánh
  // thức lượt mới"), và nó suy từ cùng cờ `dangChay`. Không truyền cờ xuống thì nút mời
  // đánh thức một lượt mới trong lúc một lượt đang chạy.
  ve(true);
  expect(screen.getByRole('button', { name: CHU.tiemVaoLuotDangChay })).toBeDefined();

  ve(false);
  expect(screen.getByRole('button', { name: CHU.danhThucLuotMoi })).toBeDefined();
});

/* ── bảng chương + nhật ký: mỗi thứ một Ô, không nối đuôi nhau ────────── */

test('bảng chương và nhật ký ở HAI ô riêng, không nằm sau dòng sự kiện trong một khu cuộn', () => {
  // Đây là phép đo của chính lỗi mà bàn chia ô sinh ra để sửa. Bản trước xếp ba mục nối đuôi
  // trong MỘT khu cuộn cao 125px: dòng sự kiện cao 98px, bảng chương bắt đầu ở offset 98 và
  // cao 1.951px nên hiện đúng 0 hàng, nhật ký bắt đầu ở offset 2.049 nên không bao giờ tới.
  //
  // jsdom không bố cục nên nó không đo được 125px kia. Cái nó đo được — và đủ để chặn việc
  // dựng lại cấu trúc cũ — là mỗi mục có VÙNG CUỘN CỦA RIÊNG NÓ.
  const { container } = ve(
    true,
    {
      chapters: [{ chapter: 1, stage: 'done', words: 2100 }],
      decisions: [
        {
          id: 'd1',
          at: '2026-08-01T10:00:00Z',
          kind: 'gate',
          decider: 'arbiter',
          reason: 'đủ điều kiện',
        },
      ],
    },
    BO_DEM_RONG,
    {
      suKien: [
        { seq: 1, time: '2026-08-01T10:00:00Z', kind: 'tool', category: 'TOOL', summary: 'x' },
      ],
    },
  );

  expect(container.querySelector('.blcuon')).toBeNull();
  expect(container.querySelector('.blo-sukien > .blothan .dong')).not.toBeNull();
  expect(container.querySelector('.blo-chuong > .blothan .bangwrap')).not.toBeNull();
  expect(container.querySelector('.blo-nhatky > .blothan .log')).not.toBeNull();
});

test('hai neo cuộn `#dong-su-kien` và `#nhat-ky-phan-quyet` còn nguyên', () => {
  // `DangLam` trong `ViecTiepTheo.tsx` cuộn tới `#dong-su-kien` bằng id. Bàn chia ô chuyển
  // hai mục này từ `<section class="sect">` sang `<section class="blo">`, và một lần đổi
  // markup làm rơi mất `id` sẽ để nút "xem dòng sự kiện" bấm mà không đi đâu — không lỗi
  // nào nổ ra, chỉ một nút im lặng.
  const { container } = ve(true);
  expect(container.querySelector('#dong-su-kien')).not.toBeNull();
  expect(container.querySelector('#nhat-ky-phan-quyet')).not.toBeNull();
});

/* ── phần đi theo từ `Canvas` (Task 13) ───────────────────────────────── */

test('đầu trang nói tên cuốn, giai đoạn và số đo — không phải mỗi tiêu đề khu', () => {
  ve(true, {
    book: { ...snap({}).book, name: 'Trấn Yêu Ký', total_chapters: 300, total_words: 12000 },
  });

  expect(screen.getByRole('heading', { name: CHU.dongSanXuat })).toBeDefined();
  expect(screen.getByText(/Trấn Yêu Ký · đang viết · 300 chương · 12\.000 từ/)).toBeDefined();
});

test('cuốn KHÔNG phân tầng thì không có bộ chọn mức xem', () => {
  // `layered_outline === false` nghĩa là không có tập/cung nào để lọc. Vẽ bộ chọn ở đó là
  // mời bấm một phép lọc không lọc gì.
  const { container } = ve(true);
  expect(container.querySelector('.mucxem')).toBeNull();
});

test('cuốn phân tầng thì có bộ chọn mức xem', () => {
  const { container } = ve(true, {
    capabilities: { ...snap({}).capabilities, layered_outline: true },
    timeline: {
      volumes: [{ index: 1, state: 'running', chapters: 3, from: 1, to: 3 }],
      arcs: null,
      chapters: [],
    },
  });
  expect(container.querySelector('.mucxem')).not.toBeNull();
});

test('cảnh báo dữ liệu lệch hiện ra, không bị nuốt', () => {
  const { container } = ve(true, { warnings: ['chương 4 thiếu tệp bản thảo'] });

  expect(container.querySelector('.canhbao')).not.toBeNull();
  expect(screen.getByText('chương 4 thiếu tệp bản thảo')).toBeDefined();
});

test('không có cảnh báo thì không vẽ khối cảnh báo rỗng', () => {
  const { container } = ve(true);
  expect(container.querySelector('.canhbao')).toBeNull();
});
