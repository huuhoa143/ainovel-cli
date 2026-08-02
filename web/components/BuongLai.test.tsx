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

/* ── bốn hàng của cột giữa (Task 13) ──────────────────────────────────── */

test('cột giữa có đủ BỐN hàng, theo đúng thứ tự trục · văn sống · sự kiện · can thiệp', () => {
  // Hỏi thứ tự chứ không chỉ hỏi sự có mặt: bốn hàng này được xếp theo tỉ lệ ĐO ĐƯỢC (chữ
  // máy đổi 146/254 khung, dòng sự kiện đổi 5 lần trong cùng 17,9 giây), và một `2fr` đặt
  // nhầm vào hàng dòng sự kiện cho ra đúng bốn khối ấy ở đúng chỗ ấy trên DOM — nên phép đo
  // duy nhất bài kiểm chạm được là THỨ TỰ. Phần tỉ lệ chỉ mắt người kiểm được (Task 14).
  const { container } = ve(true);
  const giua = container.querySelector('.blgiua');
  expect(giua).not.toBeNull();

  const hang = [...giua!.children].map((e) => e.className.split(' ')[0]);
  expect(hang).toEqual(['bltruc', 'vansong', 'blcuon', 'blcanthiep']);
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

/* ── phần cuộn tiếp: bảng chương + nhật ký (Task 13) ──────────────────── */

test('bảng chương và nhật ký phán quyết cuộn tiếp trong cột giữa, DƯỚI dòng sự kiện', () => {
  const { container } = ve(true, {
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
  });

  const cuon = container.querySelector('.blcuon');
  expect(cuon).not.toBeNull();
  // Ba khối nằm TRONG cùng một khu cuộn, theo thứ tự: sự kiện trước, hai khối tra cứu sau.
  // Đặt chúng ngoài khu cuộn là để chúng không bao giờ tới được — cột giữa cao có hạn.
  expect(cuon!.querySelector('#dong-su-kien')).not.toBeNull();
  expect(cuon!.querySelector('.bangwrap')).not.toBeNull();
  expect(cuon!.querySelector('#nhat-ky-phan-quyet')).not.toBeNull();
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
