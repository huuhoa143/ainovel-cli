import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { CHU } from '@/lib/nhan';
import type { Snapshot } from '@/lib/types';

import { DieuKhien } from './DieuKhien';
import { snap } from './mau.test-helper';

/**
 * Bộ kiểm cho thanh điều khiển. Repo chưa từng có tệp này; nó ra đời cùng Task 6, và không có
 * nó thì việc bỏ nguồn thứ hai của `advance_mode` không có hàng rào nào — nhãn chế độ sẽ lặng
 * lẽ quay về `/settings` ngày ai đó "sửa lại cho chắc".
 *
 * # Hai phép đo cho cùng một câu "KHÔNG gọi mạng để biết chế độ"
 *
 * `LAY_CAI_DAT` bắt đường đi qua `lib/api.ts`; `FETCH` bắt đường ai đó gọi thẳng `fetch`. Một
 * mình phép đo thứ nhất không đủ — nó chỉ canh đúng một cái tên hàm.
 *
 * Và cả hai đều KHÔNG BAO GIỜ resolve. Đó là điều kiện để bài kiểm đo đúng thứ nó nói: một
 * mock trả sẵn `advance_mode` sẽ cho ra nhãn đúng vì lý do sai, và lúc đó bài kiểm xanh trong
 * khi component vẫn phụ thuộc mạng.
 */
const LAY_CAI_DAT = vi.fn(() => new Promise<never>(() => {}));

vi.mock('@/lib/api', async (goc) => ({
  ...(await goc<typeof import('@/lib/api')>()),
  layCaiDat: (...a: unknown[]) => LAY_CAI_DAT(...(a as [])),
  doiCheDoTien: (...a: unknown[]) => DOI_CHE_DO(...a),
}));

const DOI_CHE_DO = vi.fn();
const FETCH = vi.fn(() => new Promise<never>(() => {}));

const ON_DOI = vi.fn();

beforeEach(() => {
  LAY_CAI_DAT.mockClear();
  DOI_CHE_DO.mockReset().mockResolvedValue({ mode: 'review', permit_chapter: 0, has_hold: false });
  FETCH.mockClear();
  ON_DOI.mockReset();
  vi.stubGlobal('fetch', FETCH);
});

/** Máy ĐANG MỞ cho cuốn này là ca thường: `advance` non-null nghĩa đúng thế. */
function ve(p: Partial<Snapshot> = {}, dangChay = false) {
  return render(
    <DieuKhien
      snapshot={snap(p)}
      tacPham="tran-yeu-ky"
      choGhi
      dangChay={dangChay}
      onDoi={ON_DOI}
    />,
  );
}

const REVIEW = { mode: 'review', hold: false } as const;
const AUTO = { mode: 'auto', hold: false } as const;

/* ── chế độ đọc từ snapshot, không từ /settings ─────────────────────────── */

test('chế độ nghiệm thu suy từ `snapshot.advance`, KHÔNG cần một lời gọi mạng nào', () => {
  ve({ advance: { ...REVIEW } });

  expect(screen.getByRole('button', { name: CHU.cheDoNghiemThu })).toBeDefined();

  // Hai phép đo cho cùng một câu. `/settings` là endpoint mà nhãn này TỪNG đọc, nên nó là
  // đúng chuỗi phải vắng mặt.
  expect(LAY_CAI_DAT).not.toHaveBeenCalled();
  for (const [u] of FETCH.mock.calls as unknown as [string][]) {
    expect(String(u)).not.toContain('settings');
  }
});

test('chế độ tự chạy cũng suy từ snapshot — vế ngược', () => {
  // Cần bài riêng: một nhãn viết cứng thành `cheDoNghiemThu` vẫn làm bài trên xanh, và hệ quả
  // là một thanh transport nói "Nghiệm thu từng chương" trên một engine đang chạy liên tục.
  ve({ advance: { ...AUTO } });

  expect(screen.getByRole('button', { name: CHU.cheDoTuChay })).toBeDefined();
  expect(screen.queryByRole('button', { name: CHU.cheDoNghiemThu })).toBeNull();
  expect(LAY_CAI_DAT).not.toHaveBeenCalled();
});

test('`Cho đi tiếp` chỉ có ở chế độ nghiệm thu', () => {
  // Ở chế độ tự chạy engine không chờ giấy phép nào, nên một nút cấp phép ở đó không làm gì.
  ve({ advance: { ...REVIEW } });
  expect(screen.getByRole('button', { name: CHU.choDiTiep })).toBeDefined();

  // `cleanup()` giữa hai lượt vẽ: không có nó thì nút của lượt trước còn nằm trong
  // `document` và `queryByRole` thấy nó — bài kiểm khi đó đỏ (hoặc xanh) vì rác của chính
  // mình, không vì điều đang canh. Đúng lớp lỗi hạ tầng mà `vitest.setup.giaodien.ts` vá cho
  // ranh giới GIỮA CÁC BÀI; trong CÙNG một bài thì phải tự dọn.
  cleanup();

  ve({ advance: { ...AUTO } });
  expect(screen.queryByRole('button', { name: CHU.choDiTiep })).toBeNull();
});

/* ── ca engine đóng: KHÔNG đo được, và không được vẽ thành "tự chạy" ────── */

test('`advance === null` thì KHÔNG vẽ chế độ nào — "tự chạy" là một khẳng định chưa ai đo', () => {
  // Đây là ca chịu lực của Task 6. `null` nghĩa engine ĐÓNG nên không đo được, KHÔNG nghĩa là
  // auto (`serve.go:325` chỉ gán `advance` khi `may.dangMo(id)` thành công). Vẽ "Tự chạy liên
  // tục" ở đó là đúng lớp lỗi `null`-đọc-thành-một-phép-đo mà cả hợp đồng `/studio` giữ, và nó
  // đã gây một lỗi thật ở kế hoạch 2/4.
  //
  // Và nó còn sai về chức năng, không chỉ về lời: `PUT /advance-mode` tự đòi `may.dangMo(book)`
  // (`vongdoi.go:41`), nên trên một engine đã đóng cái nút đó chắc chắn trả lỗi. Vẽ nó là mời
  // bấm một nút không bấm được.
  ve();

  expect(screen.queryByRole('button', { name: CHU.cheDoTuChay })).toBeNull();
  expect(screen.queryByRole('button', { name: CHU.cheDoNghiemThu })).toBeNull();
  expect(screen.queryByRole('button', { name: CHU.choDiTiep })).toBeNull();
});

test('`advance === null` KHÔNG làm mất nút Chạy — bề mặt vẫn điều khiển được', () => {
  // Vế ngược của bài trên, và nó cần đứng riêng: "ẩn cả thanh khi không đo được chế độ" cũng
  // làm bài trên xanh, trong khi hệ quả là mất đường chạy engine — đúng cái "ngõ chết" mà chú
  // thích của nhánh `maMoy === false` đã ghi bằng lời của người dùng.
  ve();
  expect(screen.getByRole('button', { name: `▶ ${CHU.chay}` })).toBeDefined();
});

/* ── đổi chế độ ────────────────────────────────────────────────────────── */

test('bấm nhãn chế độ gửi chế độ NGƯỢC LẠI, rồi nạp lại snapshot', async () => {
  // Không tự đoán trạng thái mới: `SetAdvanceMode` chạm engine THẬT (`vongdoi.go:46`) và
  // `snapshot.advance.mode` đọc từ cùng `p.eng.Snapshot()` đó, nên đường về đúng là nạp lại
  // snapshot. Tự `datCheDo(r.mode)` là dựng lại một bản thứ hai của cùng sự thật.
  ve({ advance: { ...REVIEW } });

  fireEvent.click(screen.getByRole('button', { name: CHU.cheDoNghiemThu }));

  expect(DOI_CHE_DO).toHaveBeenCalledWith('tran-yeu-ky', 'auto');
  await waitFor(() => expect(ON_DOI).toHaveBeenCalled());
});

test('bấm nhãn chế độ ở chế độ tự chạy thì bật nghiệm thu', async () => {
  ve({ advance: { ...AUTO } });

  fireEvent.click(screen.getByRole('button', { name: CHU.cheDoTuChay }));

  expect(DOI_CHE_DO).toHaveBeenCalledWith('tran-yeu-ky', 'review');
  await waitFor(() => expect(ON_DOI).toHaveBeenCalled());
});
