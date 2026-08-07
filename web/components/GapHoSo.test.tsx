import { cleanup, render, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { snap } from './mau.test-helper';

/**
 * Khối NỀN gập lại, khối ĐANG DÙNG mở ra.
 *
 * # Ca thật
 *
 * Người dùng: *"rất khó để xem và biết và sử dụng ấy, đặt vai vào người dùng nhé"*. Đo được
 * trên tác phẩm đang chạy, và hai con số nói hết:
 *
 *	Nhân vật   8 hồ sơ × ~501px = 4.083px → 6,3 màn hình, không mục lục
 *	Dàn ý      4 tập / 16 cung / 216 chương mở hết = 52.589px → 81,2 màn hình
 *
 * Cả hai bề mặt đều trả lời được câu hỏi khó (đọc kỹ một mục) mà KHÔNG trả lời được câu hỏi
 * dễ (*"cuốn này có những ai"*, *"Tập 3 có cung nào"*) — vì câu dễ đòi nhìn thấy cả danh
 * sách, mà cả danh sách thì không nằm vừa màn hình nào.
 *
 * Bốn bài dưới khoá đúng bộ mặc định ấy. Chúng dễ bị lật ngược bởi một lượt "cho tiện xem"
 * sau này, và lúc đó không có gì đỏ lên.
 */

let DAN_Y: { premise: string; volumes: unknown; flat: unknown } = {
  premise: '',
  volumes: null,
  flat: null,
};
let NHAN_VAT: { characters: unknown; snapshots: unknown } = {
  characters: null,
  snapshots: null,
};

vi.mock('@/lib/api', async (goc) => ({
  ...(await goc<typeof import('@/lib/api')>()),
  layDanY: () => Promise.resolve(DAN_Y),
  layNhanVat: () => Promise.resolve(NHAN_VAT),
}));

const { DanY } = await import('./DanY');
const { NhanVat } = await import('./NhanVat');

beforeEach(() => {
  cleanup();
  DAN_Y = { premise: '', volumes: null, flat: null };
  NHAN_VAT = { characters: null, snapshots: null };
});

/* ── Nhân vật ───────────────────────────────────────────────────────────── */

const NGUOI = [
  { name: 'Lâm Kỳ', tier: 'core', role: 'nhân vật chính', aliases: ['Ông chủ Lâm'], description: 'Hai mươi bảy tuổi.', arc: 'Đường dây dài.', traits: ['thực dụng'] },
  { name: 'Hạ Văn Tình', tier: 'core', role: 'nữ chính', aliases: [], description: 'Bác sĩ.', arc: '', traits: [] },
  { name: 'A Lực', tier: 'secondary', role: 'hộ vệ', aliases: [], description: 'Lực quê.', arc: '', traits: [] },
];

test('mọi hồ sơ nhân vật ĐÓNG sẵn — cả dàn phải nằm vừa một màn', async () => {
  NHAN_VAT = { characters: NGUOI, snapshots: null };
  render(<NhanVat tacPham="b" />);

  await waitFor(() => expect(document.querySelectorAll('.nguoiHop').length).toBe(3));

  const mo = Array.from(document.querySelectorAll<HTMLDetailsElement>('.nguoiHop')).filter((d) => d.open);
  expect(
    mo.map((d) => d.querySelector('h3')?.textContent),
    'một hồ sơ mở sẵn đã chiếm trọn màn hình, nên bảy người kia lại nằm dưới mép',
  ).toEqual([]);
});

test('dòng tóm mang đủ thứ để CHỌN mà không phải mở: tên · hạng · vai · bí danh', async () => {
  NHAN_VAT = { characters: NGUOI, snapshots: null };
  render(<NhanVat tacPham="b" />);

  await waitFor(() => expect(document.querySelector('.nguoidau')).not.toBeNull());
  const dau = document.querySelector('.nguoidau')!.textContent!;
  expect(dau).toContain('Lâm Kỳ');
  expect(dau).toContain('cốt lõi');
  expect(dau).toContain('nhân vật chính');
  // Bí danh là tên người vận hành hay gõ tìm — nó phải tra được khi hồ sơ còn đóng.
  expect(dau, 'bí danh nằm trong phần thân nên không tra được lúc đóng').toContain('Ông chủ Lâm');
});

/* ── Dàn ý ──────────────────────────────────────────────────────────────── */

const TAP = [
  {
    index: 1,
    title: 'Cánh Cửa Trong Kho Lạnh',
    theme: 'Từ đầu cơ sống sót.',
    final: false,
    arcs: [
      {
        index: 1,
        title: 'Khe hàng đầu tiên',
        goal: 'Phát hiện năng lực.',
        estimated_chapters: 12,
        chapters: [
          { chapter: 1, title: 'Kho lạnh nợ máu', core_event: 'Bị ép giao kho.', hook: 'Bàn tay dính máu.', scenes: ['Cảnh 1'] },
          { chapter: 2, title: 'Thỏi vàng dính bùn', core_event: 'Bán thử vàng.', hook: 'Tin nhắn lạ.', scenes: [] },
        ],
      },
    ],
  },
];

test('TẬP mở sẵn còn CUNG đóng — bản đồ sản xuất vừa một màn, chương tốn một cú bấm', async () => {
  DAN_Y = { premise: '', volumes: TAP, flat: null };
  render(<DanY snapshot={snap({})} tacPham="b" />);

  await waitFor(() => expect(document.querySelector('.ntap')).not.toBeNull());

  const tap = document.querySelector<HTMLDetailsElement>('.ntap .capGap')!;
  const cung = document.querySelector<HTMLDetailsElement>('.ncung .capGap')!;
  expect(tap.open, 'đóng cả tập thì bốn dòng còn lại không nói gì hơn con số ở đầu khu').toBe(true);
  expect(cung.open, 'mở sẵn cung là bung 216 chương ra — đúng 81 màn hình đã đo').toBe(false);

  // Số chương phải nằm trên DÒNG TÓM: cung đóng thì đó là thứ duy nhất nói nó chạy tới đâu.
  expect(cung.querySelector('summary')?.textContent).toMatch(/2\s*chương/);
});

test('TIỀN ĐỀ đóng sẵn, và dòng tóm nói ra nó có bao nhiêu mục', async () => {
  DAN_Y = {
    premise: '## Thể loại\nMạt thế.\n\n## Xung đột\nMở khe hàng.',
    volumes: TAP,
    flat: null,
  };
  render(<DanY snapshot={snap({})} tacPham="b" />);

  await waitFor(() => expect(document.querySelector('.hopGap')).not.toBeNull());

  const hop = document.querySelector<HTMLDetailsElement>('.hopGap')!;
  expect(
    hop.open,
    'tiền đề mở sẵn chiếm hai màn đầu, đẩy cây dàn ý — thứ mang tên cho cả khu — xuống đáy cuộn',
  ).toBe(false);
  // Đóng KHÔNG phải giấu: dòng tóm phải nói trong đó có gì.
  expect(hop.querySelector('summary')?.textContent).toContain('Tiền đề');
  expect(hop.querySelector('summary')?.textContent).toContain('2 mục');
});

// Không có gì để bung thì KHÔNG vẽ nút gập: một mũi tên bấm vào chẳng mở ra gì là lời hứa suông.
test('tập chưa mở cung thì không có nút gập', async () => {
  DAN_Y = {
    premise: '',
    volumes: [{ index: 1, title: 'Tập chưa mở', theme: '', final: false, arcs: null }],
    flat: null,
  };
  render(<DanY snapshot={snap({})} tacPham="b" />);

  await waitFor(() => expect(document.querySelector('.ntap')).not.toBeNull());
  expect(document.querySelector('.ntap .capGap')).toBeNull();
  expect(document.querySelector('.ntap .nhanhdau')?.tagName).toBe('DIV');
});
