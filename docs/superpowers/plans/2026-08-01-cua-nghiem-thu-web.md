# Kế hoạch 4/4 — Cửa nghiệm thu

> **Cho người thi hành:** KỸ NĂNG BẮT BUỘC — dùng `superpowers:subagent-driven-development`.

**Mục tiêu:** khi engine dừng ở biên chương chờ người duyệt, chuyện đó phải thấy được từ MỌI
bề mặt, và quyết định phải bấm được ngay tại chỗ đang đọc.

**Kiến trúc:** một component `CuaNghiemThu` dùng ở HAI chỗ (dải trên buồng lái, và bề mặt Kiểm
định) cộng một huy hiệu ở thanh trên. Không endpoint mới: `advance` đã có trong `/studio` từ
kế hoạch 1/4, và ba route hành động đã có (`POST /advance`, `POST /steer`, `PUT /advance-mode`).

**Nền:** nhánh `feat/viet-hoa-i18n` sau khi kế hoạch 2/4 và 3/4 hạ cánh.

---

## Luật cho người thi hành

Giống hai kế hoạch trước; lặp lại vì chúng đã trả giá để có:

1. **KHÔNG xóa chú thích đang có.** Sửa cho đúng nếu nó thành sai.
2. **Worktree NGOÀI repo**, `web/node_modules` phải là thư mục THẬT.
3. **Cổng là DELTA so với nền**, chạy toàn bộ, không `-x`, không lọc gói.
4. **Nhãn phải qua `web/lib/nhan.ts`.**
5. **Nghi ngờ bài kiểm y như nghi ngờ mã.** Ba lỗ hổng cùng một lớp đã tìm được ở kế hoạch
   2/4: bài kiểm dựng đầu vào từ chính hằng số nó đang đo, và bảng đột biến chỉ canh chiều
   nghịch. Câu hỏi bắt buộc cho mỗi bài kiểm: *"xóa hẳn tính năng này thì nó có đỏ không?"*
6. **`web/vitest.setup.giaodien.ts` là bản vá cho lỗi hạ tầng kiểm thật — ĐỪNG GỠ.**

---

## Quyết định đã chốt (spec §4 và §7.3, không bàn lại)

| # | Quyết định | Vì sao |
|---|---|---|
| 7 | "Trả chương về viết lại" dùng **`/steer`** sẵn có | ở cửa nghiệm thu engine đang đứng nên server chọn `Continue` — đúng nghĩa "đi tiếp, nhưng làm việc này". Một route riêng là đưa quyết định phạm vi ảnh hưởng vào `serve`, tức nhân bản logic Arbiter mà `PRODUCT.md` cấm |
| — | **KHÔNG dùng modal** | modal chỉ dành cho `ask_user`, lúc đó engine chặn THẬT. Ở cửa nghiệm thu engine đứng chờ nhưng người dùng vẫn cần đọc bản thảo, xem chi phí, đối chiếu chương trước — chặn họ lại là chặn đúng việc họ phải làm để quyết định |

---

## Cấu trúc tệp

| Tệp | Việc | Trạng thái |
|---|---|---|
| `web/lib/nghiemThu.ts` | suy trạng thái cửa từ `snapshot.advance` | mới |
| `web/components/CuaNghiemThu.tsx` | dải quyết định, dùng ở 2 chỗ | mới |
| `web/components/ThanhTren.tsx` | huy hiệu `NGHIỆM THU · ĐANG CHỜ BẠN` | sửa |
| `web/components/BuongLai.tsx` | gắn dải lên đầu buồng lái | sửa |
| `web/components/KiemDinh.tsx` | gắn dải trên bản duyệt | sửa |
| `web/components/DieuKhien.tsx` | bỏ nguồn thứ hai của `advance_mode` | sửa |
| `web/app/page.tsx` | truyền snapshot xuống thanh trên | sửa |
| `web/lib/nhan.ts` · `web/app/globals.css` | nhãn + kiểu | sửa |

---

### Task 1: Suy trạng thái cửa

**Tệp:** tạo `web/lib/nghiemThu.ts`, `web/lib/nghiemThu.test.ts`

- [ ] **Bước 1: Viết bài kiểm đỏ**

```ts
// web/lib/nghiemThu.test.ts
import { expect, test } from 'vitest';

import type { TienDo } from './types';
import { trangThaiCua } from './nghiemThu';

test('advance null (engine đóng) thì KHÔNG có cửa nào chờ', () => {
  // `null` = engine đóng nên không đo được. Vẽ một cửa nghiệm thu lúc đó là mời người dùng
  // bấm một nút chắc chắn trả 409.
  expect(trangThaiCua(null)).toEqual({ dangCho: false, cheDoDuyet: false });
});

test('chế độ auto thì không bao giờ chờ, kể cả hold bật', () => {
  const a: TienDo = { mode: 'auto', hold: true };
  expect(trangThaiCua(a).dangCho).toBe(false);
});

test('chế độ review + hold thì cửa đang chờ, kèm chương và lý do', () => {
  const a: TienDo = {
    mode: 'review', hold: true, permit_chapter: 8, hold_reason: 'nhịp tụt ở đoạn giữa',
  };
  const t = trangThaiCua(a);
  expect(t.dangCho).toBe(true);
  expect(t.cheDoDuyet).toBe(true);
  expect(t.chuong).toBe(8);
  expect(t.lyDo).toBe('nhịp tụt ở đoạn giữa');
});

test('chế độ review mà chưa tới biên thì chưa chờ', () => {
  expect(trangThaiCua({ mode: 'review', hold: false }).dangCho).toBe(false);
  expect(trangThaiCua({ mode: 'review', hold: false }).cheDoDuyet).toBe(true);
});

test('hold bật mà KHÔNG có lý do vẫn là đang chờ — lý do là tùy, cửa thì không', () => {
  // Engine có thể dừng ở biên mà Editor chưa kịp kết luận. Đòi lý do mới vẽ cửa sẽ giấu mất
  // một dây chuyền đang đứng im.
  expect(trangThaiCua({ mode: 'review', hold: true }).dangCho).toBe(true);
});
```

- [ ] **Bước 2: Chạy → FAIL**

- [ ] **Bước 3: Viết**

```ts
import type { TienDo } from './types';

/** Trạng thái của cửa nghiệm thu, đủ để cả ba chỗ dùng vẽ ra. */
export interface TrangThaiCua {
  /** Engine ĐANG đứng chờ người duyệt. Đây là thứ bật huy hiệu ở thanh trên. */
  dangCho: boolean;
  /** Chế độ nghiệm thu có bật không — khác với "đang chờ ngay lúc này". */
  cheDoDuyet: boolean;
  chuong?: number;
  lyDo?: string;
}

/**
 * Suy trạng thái cửa từ `snapshot.advance`.
 *
 * Ba điều tách bạch, và lẫn chúng là nguồn của những giao diện nói dối:
 *
 *   - `advance === null` → engine ĐÓNG, không đo được. KHÔNG phải "không chờ vì mọi thứ ổn".
 *     Vẽ cửa lúc này là mời người dùng bấm một nút chắc chắn trả 409.
 *   - `mode !== 'review'` → chế độ tự chạy; `hold` có bật cũng không có ai phải duyệt.
 *   - `mode === 'review' && hold` → ĐANG CHỜ. Đây là ca duy nhất bật huy hiệu.
 *
 * `hold_reason` là TÙY. Engine dừng ở biên trước, Editor kết luận sau; đòi có lý do mới vẽ
 * cửa sẽ giấu mất một dây chuyền đang đứng im trong khoảng giữa hai việc đó.
 */
export function trangThaiCua(advance: TienDo | null): TrangThaiCua {
  if (!advance) return { dangCho: false, cheDoDuyet: false };
  const cheDoDuyet = advance.mode === 'review';
  return {
    dangCho: cheDoDuyet && advance.hold,
    cheDoDuyet,
    chuong: advance.permit_chapter,
    lyDo: advance.hold_reason,
  };
}
```

- [ ] **Bước 4: Chạy → 5 passed**

- [ ] **Bước 5: Phép thử đột biến**

| # | Đột biến | Phải đỏ ở |
|---|---|---|
| 1 | `if (!advance) return …` → `advance = advance ?? {mode:'auto',hold:false}` rồi bỏ nhánh | "advance null … KHÔNG có cửa nào chờ" (phải kiểm cả `cheDoDuyet`) |
| 2 | `dangCho: cheDoDuyet && advance.hold` → `advance.hold` | "chế độ auto thì không bao giờ chờ" |
| 3 | `dangCho: … && advance.hold` → `cheDoDuyet` | "chế độ review mà chưa tới biên" |

- [ ] **Bước 6: Commit**

---

### Task 2: `CuaNghiemThu.tsx` — dải quyết định

**Tệp:** tạo `web/components/CuaNghiemThu.tsx`, `web/components/CuaNghiemThu.test.tsx`

Dải amber, nội dung: đang chờ ở chương nào · kết luận của Editor (`hold_reason`, nguyên văn) ·
hai nút `Cho đi tiếp` và `Trả chương N về viết lại`.

- [ ] **Bài kiểm phải có, tối thiểu:**

1. `dangCho === false` → component **không vẽ gì** (trả `null`). Khẳng định điều này ra: một
   dải amber rỗng nằm trên đầu buồng lái suốt phiên là một cảnh báo giả thường trực.
2. `dangCho === true` → thấy số chương, thấy nguyên văn `hold_reason`, thấy hai nút.
3. `hold_reason` vắng → vẫn thấy hai nút và một câu nói rõ Editor chưa kết luận. **Không bịa
   một lý do.**
4. Nhãn nút "trả về viết lại" mang đúng số chương (`Trả chương 8 về viết lại`), không phải một
   câu chung chung — người bấm phải thấy mình đang trả cuốn nào về đâu.
5. `choGhi === false` (studio chạy ngoài loopback) → hai nút **vô hiệu**, kèm câu giải thích.
   Vẽ nút bấm được rồi gửi vào hư không là lỗi tệ nhất ở đây — cùng lý lẽ đã ghi trong
   `OCanThiep.tsx`, đọc nó trước.

- [ ] Chú thích bắt buộc: vì sao KHÔNG dùng modal (chép lý do từ bảng quyết định đầu kế hoạch).

---

### Task 3: Hai hành động, và khóa lúc đang gửi

**Tệp:** sửa `CuaNghiemThu.tsx` + test

- [ ] `Cho đi tiếp` → `choDiTiep(book)` (`POST /advance`, đã có ở `web/lib/api.ts`).
- [ ] `Trả chương N về viết lại` → mở một ô nhập, gửi `canThiep(book, text)` (`POST /steer`).
      Engine đang đứng nên server chọn `Continue` — quyết định 7. **Gửi nguyên văn mô tả lỗi
      của Editor làm giá trị mặc định của ô**, để người vận hành sửa chứ không phải gõ lại.
- [ ] **Khóa lúc đang gửi.** Bài kiểm bắt buộc: bấm hai lần liên tiếp chỉ gọi API **một lần**.
      Bấm đôi ở đây là hai lượt chạy, tức tiền đôi — cùng lớp rủi ro đã khiến màn Xưởng bị
      cấm có nút chạy (quyết định 4 của spec).
- [ ] Lỗi từ server hiện **nguyên văn**, không làm dịu. Giọng thiết bị công nghiệp; và câu của
      server biết rõ hơn giao diện chuyện gì đã xảy ra.
- [ ] Sau khi gửi xong: gọi `onDoi()` để snapshot được nạp lại, đừng tự đoán trạng thái mới.

- [ ] **Phép thử đột biến bắt buộc:**

| # | Đột biến | Phải đỏ ở |
|---|---|---|
| 1 | bỏ cờ `dangGui` (khóa lúc đang gửi) | "bấm hai lần chỉ gọi một lần" |
| 2 | `choDiTiep` ↔ `canThiep` đổi chỗ | hai bài về hành động |
| 3 | nuốt lỗi (`catch {}` rỗng) | bài về hiện lỗi nguyên văn |

---

### Task 4: Huy hiệu ở thanh trên — thấy từ MỌI bề mặt

**Tệp:** `web/components/ThanhTren.tsx`, `web/app/page.tsx`

- [ ] `ThanhTren` nhận thêm prop `cuaNghiemThu: TrangThaiCua | undefined`.
- [ ] `dangCho` → vẽ huy hiệu `NGHIỆM THU · ĐANG CHỜ BẠN`, bấm được, dẫn tới `?khu=kiem-dinh`.
- [ ] Huy hiệu phải hiện ở **mọi khu**, không chỉ buồng lái. Đây là lý do nó ở thanh trên chứ
      không trong một bề mặt: một dây chuyền đang đứng chờ không được ẩn sau một lựa chọn
      điều hướng — cùng lý lẽ đã ghi cho `HoiChan` ở `page.tsx`.
- [ ] Bài kiểm: (a) `dangCho` → huy hiệu có mặt; (b) không chờ → **không** có; (c) bấm huy
      hiệu gọi `onChonKhu('kiem-dinh')`.
- [ ] Màu: amber, dùng token đang có. Một màu tín hiệu duy nhất — luật 5 của `PRODUCT.md`.
      Ký hiệu hình học đứng trước chữ để ảnh đen trắng và người mù màu vẫn phân biệt được;
      xem `TrangThai.tsx` cho khuôn.

---

### Task 5: Gắn dải vào hai bề mặt

- [ ] `BuongLai.tsx`: `<CuaNghiemThu …/>` đặt **trên** dải trạng thái / dải việc tiếp theo.
      Nó là tin cấp cao hơn: "dây chuyền đang chờ BẠN" đứng trước "dây chuyền đang làm gì".
- [ ] `KiemDinh.tsx`: cùng component, đặt trên bản duyệt 7 chiều — đó là chỗ người dùng đọc
      bằng chứng để quyết định, nên nút quyết định phải ở cùng chỗ với bằng chứng.
- [ ] Bài kiểm: cùng một `snapshot` cho cả hai bề mặt thì cả hai đều vẽ dải.
- [ ] Giữ nguyên mọi chú thích hiện có trong `KiemDinh.tsx` — chúng ghi lý do bề mặt này tồn
      tại song song với tab inspector, và vì sao nó không tự gọi thêm mạng.

---

### Task 6: Bỏ nguồn thứ hai của `advance_mode`

`DieuKhien.tsx` hiện tự `fetch` `/settings` để biết `advance_mode` (xem chú thích ở đó:
*"`Snapshot.transport` không mang `advance_mode`; nó nằm ở `/settings`"*). Câu đó đã **hết
hiệu lực**: kế hoạch 1/4 đưa `advance` vào `/studio`.

- [ ] Đọc `advance.mode` từ `snapshot` thay vì gọi `/settings`.
- [ ] **SỬA chú thích đó cho đúng, đừng xóa** — nó ghi một lý do thật, chỉ là tiền đề đã đổi.
- [ ] Vì sao đáng làm: hai endpoint mô tả cùng một engine ở hai thời điểm lệch nhau là lớp lỗi
      "hai sự thật" — đúng thứ quyết định 6 của spec đã tránh khi từ chối tách endpoint riêng
      cho các trường sống. Ở đây nó nặng hơn: nút `Cho đi tiếp` ở dải đọc `snapshot.advance`
      còn nhãn chế độ ở transport đọc `/settings`, nên hai chỗ trên **cùng một màn hình** có
      thể nói khác nhau về cùng một chế độ.
- [ ] Bài kiểm: `snapshot.advance.mode === 'review'` → transport hiện nhãn chế độ nghiệm thu,
      **không cần** bất kỳ lời gọi mạng nào (không mock `fetch`; nếu component vẫn gọi thì bài
      kiểm phải thấy được điều đó).
- [ ] Ca `advance === null` (engine đóng): giữ hành vi hiện tại của `DieuKhien` cho ca không
      biết chế độ — đừng vẽ "tự chạy" như một sự thật.

---

### Task 7: CSS

- [ ] `.cuanghiemthu` — dải amber, ký hiệu + chữ, hai nút căn phải.
- [ ] `.hieunghiemthu` — huy hiệu ở thanh trên.
- [ ] Dùng token đang có; `--ink-3` là sàn cứng.
- [ ] `@media (max-width: 860px)`: hai nút xuống hàng, không tràn ngang.
- [ ] Kiểm: tương phản AA cho mọi chữ trên nền amber; 0 tràn ngang ở 1440 và 390.

---

### Task 8: Cổng cuối + E2E trên cuốn THẬT

- [ ] `go build` · `go vet` · `gofmt -l` rỗng · `go test -count=1 ./...` → **30 gói / 0 FAIL**
- [ ] `cd web && npm test && npx tsc --noEmit && npm run build`
- [ ] E2E trên cuốn thật (không `seed-demo`):

| # | Việc | Bằng chứng |
|---|---|---|
| 1 | bật chế độ nghiệm thu, chạy tới biên chương | engine dừng; `curl /studio \| jq .advance` cho `hold: true` |
| 2 | huy hiệu ở thanh trên | hiện ở buồng lái **và** ở `?khu=chi-phi` (bề mặt bất kỳ) |
| 3 | bấm `Cho đi tiếp` | engine chạy tiếp; `hold` về `false`; chương sau bắt đầu |
| 4 | bấm hai lần thật nhanh | chỉ MỘT lượt chạy — kiểm bằng `/events`, không phải bằng mắt |
| 5 | `Trả chương N về viết lại` | chương vào `pending_rewrites`; văn chương sau lệch theo ý đã gửi |
| 6 | tắt engine rồi mở lại trang | không dải, không huy hiệu (`advance === null`) |
| 7 | chụp 1440 + 390 | 0 tràn ngang, tương phản AA đạt |

- [ ] Kiểm `git merge-base` trước khi gộp `--ff-only`; chạy LẠI toàn bộ cổng **trên cây đã
      gộp**. Cổng xanh trong worktree không chứng minh gì về cây đã gộp — đã đo: 0 FAIL trong
      worktree, 8 FAIL sau khi gộp.

---

## Sau khi cả bốn kế hoạch hạ cánh

- [ ] Sửa ba chỗ tài liệu đang nói sai (spec §"Đợt 6" của bản nháp cũ): `PRODUCT.md` phần
      *Product Purpose* nói "studio đọc từ store"; `README.md:272` nói studio chỉ đọc;
      `main.go:36` chú thích `serve` là dịch vụ chỉ đọc. Cả ba sai từ khi engine chạy
      in-process.
- [ ] Cập nhật `DESIGN.md` cho các mẫu mới (dải trạng thái, khu văn sống, vạch ngăn, dải
      quyết định).

---

## Nhật ký thi hành

Người thi hành ghi vào đây: phép thử đột biến, lỗ hổng bộ kiểm, và mọi chỗ kế hoạch này SAI.
