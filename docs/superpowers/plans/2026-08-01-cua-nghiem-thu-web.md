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

---

### Cụm nghiệm thu (Task 1–4) — thi hành xong

**Commit** (nền = `cc77990`, nhánh `thuc-thi/nghiem-thu`):

| sha | tiêu đề |
|---|---|
| `9561894` | feat(web): suy trạng thái cửa nghiệm thu từ snapshot.advance |
| `42d96fd` | feat(web): dải quyết định của cửa nghiệm thu — một component cho hai bề mặt |
| `c41f1a6` | feat(web): hai hành động của cửa nghiệm thu, và khóa lúc đang gửi |
| `bda3238` | feat(web): huy hiệu nghiệm thu ở thanh trên — thấy được từ MỌI khu |

#### Bộ chạy đột biến: hai cái chốt của cụm Xưởng CỨU được một bảng nói dối

Cụm Xưởng-logic ghi lại hai lần bộ đo của họ không đo gì. Tôi cắm nguyên hai chốt đó vào bộ
chạy của mình, và **chốt thứ hai đã bắn ngay lần chạy đầu của bảng Task 3**: tôi để hai đường
dẫn tệp kiểm trong một biến rồi truyền không ngoặc, zsh không tách từ, vitest nhận một chuỗi
chứa dấu cách và không khớp tệp nào. Không có chốt thì mười dòng bảng đó đã là mười ô trống
trông như "không có bài nào đỏ" — tức một bảng nói bộ kiểm thủng hoàn toàn.

Hai chốt, nguyên văn, để cụm sau khỏi dựng lại lần thứ tư:

```bash
# 1. đột biến có ăn không
if diff -q "$GOC" "$NGUON" >/dev/null; then echo "ĐỘT BIẾN KHÔNG ĂN"; …; fi
# 2. phép đo có chạy không
TONG="$(echo "$RA" | grep -E '^ +Tests +' | tail -1)"
[ -z "$TONG" ] && echo "PHÉP ĐO HỎNG (không có dòng tổng kết)"
```

Bộ chạy KHÔNG đưa vào repo, cùng lý do cụm Xưởng không đưa bộ đo tương phản vào: nó không nằm
trong cổng nào, nên trong repo nó là mã chết trông như một công cụ. Nhưng ba cụm liên tiếp đã
cần nó và hai cụm dựng bản hỏng — **nếu có cụm thứ năm, hãy cân nhắc commit nó thật.**

#### Task 1 — `lib/nghiemThu.ts`

| # | Đột biến | Kết quả | Bài kiểm bắt được |
|---|---|---|---|
| KH-1 | chốt null → `advance ?? {mode:'auto',hold:false}` | **XANH — nhưng KHÔNG phải lỗ hổng** | không bài nào |
| KH-2 | `dangCho: cheDoDuyet && advance.hold` → `advance.hold` | ĐỎ | "chế độ auto thì không bao giờ chờ" |
| KH-3 | `dangCho: …` → `cheDoDuyet` | ĐỎ | "chế độ review mà chưa tới biên" |
| R-4 | bỏ HẲN chốt null (`advance!.mode`) | ĐỎ | "advance null … KHÔNG có cửa nào chờ" |
| R-5 | chốt null → `?? {mode:'review',hold:true}` | ĐỎ | cùng bài |
| R-6 | bỏ `chuong: advance.permit_chapter` | ĐỎ | "review + hold … kèm chương và lý do" |
| R-7 | bỏ `lyDo: advance.hold_reason` | ĐỎ | cùng bài |
| R-8 | `cheDoDuyet` luôn `true` | ĐỎ | "chế độ auto thì không bao giờ chờ" |

**KH-1 xanh, và bảng của kế hoạch SAI ở chỗ nó nói dòng này phải đỏ.** Kế hoạch còn chú thêm
"(phải kiểm cả `cheDoDuyet`)" — nhưng mặc định `auto` cũng cho `cheDoDuyet: false`, nên hai
đầu vào ra CÙNG một kết quả và không khẳng định nào tách được chúng. (`toEqual` của vitest còn
bỏ qua thuộc tính `undefined`, nên `chuong`/`lyDo` cũng không tách được.)

Và đây KHÔNG phải lỗ hổng bộ kiểm, mà là một sự thật về hàm: với câu hỏi "có cửa nào đang chờ
không", **engine đóng và chế độ tự chạy có cùng một câu trả lời đúng**. Tôi đã cân nhắc thêm
một trường `doDuoc` để tách chúng và bỏ ý đó: trong Task 1–4 không ai đọc nó, nên nó sẽ là một
trường chỉ bài kiểm quan sát được — đúng thứ mã chết mà cụm C và cụm Xưởng đã tranh luận.

Thay vào đó chốt `!advance` được chứng minh bằng hai đột biến khác (R-4 ném TypeError, R-5 vẽ
cửa cho một engine đã đóng), và **chú thích của hàm nói thẳng: ai cần tách "engine đóng" khỏi
"tự chạy" — tức người làm Task 6 cho nhãn chế độ ở transport — phải đọc `snapshot.advance ===
null`, đừng hỏi hàm này.** Task 6 có một gạch đầu dòng đúng về ca đó; đây là chỗ nó phải nhìn.

#### Task 2 — `components/CuaNghiemThu.tsx` (kế hoạch không có bảng; bảng này của tôi)

| # | Đột biến | Kết quả | Bài kiểm bắt được |
|---|---|---|---|
| T2-1 | bỏ chốt không-chờ (luôn vẽ dải) | ĐỎ | "cửa KHÔNG chờ thì không vẽ gì" |
| T2-2 | đảo chốt | ĐỎ | cả 7 bài |
| T2-3 | nhãn nút bỏ số chương | ĐỎ | "nhãn nút mang ĐÚNG số chương" |
| T2-4 | bỏ nhánh chưa-có-kết-luận | ĐỎ | "không có kết luận … không bịa" |
| T2-5 | luôn dùng câu chưa-có-kết-luận | ĐỎ | "thấy NGUYÊN VĂN kết luận Editor" |
| T2-6 | nút không bao giờ khóa | ĐỎ | 2 bài |
| T2-7 | gộp `choGhi === undefined` vào `false` | ĐỎ | "choGhi chưa biết" |
| T2-8 | bỏ chốt `!!tacPham` | **XANH — LỖ HỔNG** | không bài nào |
| T2-9 | bỏ ký hiệu hình học | **XANH — LỖ HỔNG** | không bài nào |
| T2-10 | bỏ tên vùng (`aria-label`) | **XANH — LỖ HỔNG** | không bài nào |

**Lỗ hổng T2-8 là lỗ hổng đắt nhất của cụm, và nó trỏ thẳng vào Task 5.** Bỏ `!!tacPham` khỏi
điều kiện bật nút vẫn xanh 7/7, trong khi hệ quả là hai nút bấm được gọi
`POST /api/books/undefined/advance`. Không phải giả thuyết: **`KiemDinh` hôm nay KHÔNG nhận
`tacPham`** (`app/page.tsx` chỉ truyền `snapshot`, `chuongChon`, `onChonChuong`), nên người
gắn dải ở Task 5 rất dễ để trống prop đó. Bịt bằng bài `tacPham: undefined` → nút khóa, và
KHÔNG có câu "chế độ chỉ đọc" (studio ghi được, chỉ là chưa có cuốn nào để ghi vào — hai ca
cần hai lời giải thích khác nhau).

T2-9 và T2-10 là cùng một lớp: hai kênh phụ mà không ai canh. Ký hiệu là kênh duy nhất còn
lại khi mất màu — và sau Task 7 dải này là một khối amber, tức màu sẽ là thứ đập vào mắt
trước. Tên vùng thì nặng hơn bình thường ở đây vì đây là component DUY NHẤT vẽ ở hai bề mặt.
Bịt bằng một bài chung. Cả ba: chạy lại sau khi bịt → ĐỎ. `CuaNghiemThu.test.tsx` có **9** bài.

#### Task 3 — hành động (bảng của kế hoạch + của tôi). Không lỗ hổng.

| # | Đột biến | Kết quả | Bài kiểm bắt được |
|---|---|---|---|
| KH-1 | bỏ cờ `dangGui` | ĐỎ (2) | "bấm hai lần chỉ gọi MỘT lần" × 2 |
| KH-2a | `Cho đi tiếp` gọi nhầm `/steer` | ĐỎ (3) | "gọi POST /advance trên ĐÚNG cuốn" |
| KH-2b | nút gửi gọi nhầm `/advance` | ĐỎ (3) | "gọi POST /steer với chữ ĐÃ SỬA" |
| KH-3 | nuốt lỗi (`catch {}` rỗng) | ĐỎ (2) | hai bài về lỗi nguyên văn |
| R-4 | ô nhập không mang kết luận Editor | ĐỎ (2) | "mang sẵn NGUYÊN VĂN kết luận" |
| R-5 | bỏ `onDoi()` | ĐỎ (2) | hai bài nạp lại |
| R-6 | nhãn nút gửi bỏ `dangChay` | ĐỎ | "nhãn nói TRƯỚC câu này sẽ thành gì" |
| R-7 | nhánh LỖI cũng xóa chữ đã gõ | ĐỎ | "ô nhập GIỮ chữ đã gõ" |
| R-8 | bỏ câu nói ra hệ quả của `/steer` | ĐỎ | "ô nhập nói ra hệ quả" |
| R-9 | `khoa` bỏ `!batDuoc` | ĐỎ (3) | ba bài về nút vô hiệu |
| R-10 | gửi lý do GỐC thay vì chữ đã sửa | ĐỎ | "với chữ ĐÃ SỬA" |

**Bài "bấm hai lần" của tôi lúc đầu xanh vì một lý do sai, và chính nó lộ ra.** Bản đầu tra
nút theo NHÃN ở cả hai cú bấm — nhưng nhãn đổi thành "Đang gửi…" ngay sau cú đầu, nên cú thứ
hai đỏ vì "không tìm thấy nút", không phải vì cái khóa. Cùng lớp với "bài kiểm chờ một điều
kiện mà đầu vào đã thỏa sẵn" của cụm Xưởng. Bịt bằng cách giữ CÙNG một nút qua hai cú bấm
(đúng cách người dùng bấm đôi) và khẳng định thêm `disabled === true` sau cú đầu — nếu không
thì cái nhãn, chứ không phải cái khóa, mới là thứ đang giữ.

#### Task 4 — huy hiệu (kế hoạch không có bảng; bảng này của tôi)

| # | Đột biến | Kết quả | Bài kiểm bắt được |
|---|---|---|---|
| T4-1 | luôn vẽ huy hiệu | ĐỎ (2) | "KHÔNG chờ thì không có huy hiệu" · bài `Trang` |
| T4-2 | bỏ hẳn huy hiệu | ĐỎ (4) | 4 bài |
| T4-3 | dùng `cheDoDuyet` thay `dangCho` | ĐỎ | "cả ba ca không-chờ" |
| T4-4 | huy hiệu dẫn nhầm khu | ĐỎ | "bấm huy hiệu đi tới khu Kiểm định" |
| T4-5 | bỏ ký hiệu hình học | ĐỎ | bài huy hiệu |
| T4-6 | huy hiệu chui vào khối bộ chọn tác phẩm | ĐỎ | "KHÔNG phụ thuộc `dangXem`" |
| T4-7 | bỏ `title` của huy hiệu | **XANH — LỖ HỔNG** | không bài nào |
| T4-8 | `page.tsx` không nối cửa lên thanh trên | ĐỎ | bài `Trang` |
| T4-9 | `page.tsx` nối một cửa rỗng | ĐỎ | bài `Trang` |
| T4-10 | `onChonKhu` của thanh trên thành no-op | **XANH — LỖ HỔNG** | không bài nào |

**Lỗ hổng T4-10 là mắt cuối của sợi dây, lần thứ TƯ trong dự án này** — sau
`vanSong={s.vanSong}` (cụm D), `sach={s.workshop?.books}` và `onMoTacPham={s.moTacPhamTai}`
(cụm Xưởng). Bộ kiểm của `ThanhTren` truyền spy của chính nó vào `onChonKhu`, nên nó chỉ
chứng minh component GỌI đúng tham số. Thay `onChonKhu={s.chonKhu}` ở `page.tsx` bằng một hàm
rỗng thì **14/14 vẫn xanh**, trong khi hệ quả là một huy hiệu amber bấm vào không đi đâu cả và
không lỗi nào nổ ra. Bịt bằng bài dựng cả `Trang` (`chonKhu` là `vi.fn()`) rồi bấm nút thật.

T4-7 (chú giải) bịt bằng một khẳng định trong bài huy hiệu. Nó là kênh thứ BA chứ không thay
được nhãn — chú thích của `moMay` đã ghi lý do: trên cảm ứng chú giải không tồn tại.

Cả hai: chạy lại sau khi bịt → ĐỎ.

**Nói thẳng một chuyện:** bài "KHÔNG chờ thì không có huy hiệu" XANH ngay lần chạy đầu (lúc đó
chưa có huy hiệu nào để mà hiện). Xanh sẵn không có nghĩa là thừa — T4-1 và T4-3 cho thấy nó
là bài duy nhất bắt được hai đột biến đó — nhưng nó KHÔNG được viết theo lối đỏ-trước, và bảng
này là thứ duy nhất chứng minh nó có giá.

#### Chỗ kế hoạch SAI hoặc thiếu

1. **Bảng đột biến Task 1 sai ở dòng 1** — xem mục Task 1 ở trên.
2. **Quyết định 7 nói "ở cửa nghiệm thu engine đang ĐỨNG nên server chọn `Continue`" — điều
   đó không chắc, và tôi đã lệch.** `AdvanceHold` là một ý định tạm dừng được đặt TRƯỚC và chỉ
   được tiêu ở biên chương kế tiếp (`internal/host/imp/runner.go:729` đặt nó ngay sau khi nhập
   truyện xong; `internal/host/engine.go:671` đặt nó từ một op). Nên cửa có thể đang treo
   trong lúc engine vẫn viết dở, và lúc đó `/steer` là `Steer` chứ không phải `Continue`.
   Hệ quả nằm ở NHÃN nút gửi, và nó là hệ quả về tiền: `OCanThiep` đã ghi rõ hai việc khác
   nhau — tiêm vào lượt đang chạy có thể làm chương đang viết bị xếp lại vào hàng chờ, còn
   đánh thức là bắt đầu một lượt MỚI và tiêu tiền. Đã thi hành: `CuaNghiemThu` nhận thêm
   `dangChay: boolean` và dùng lại đúng hai khóa nhãn của `OCanThiep`
   (`tiemVaoLuotDangChay` / `danhThucLuotMoi`). **Việc chọn route thì KHÔNG lệch** — vẫn là
   `/steer`, đúng quyết định 7.
   **Người làm Task 5 phải truyền `dangChay` ở CẢ HAI bề mặt.** `BuongLai` đã có sẵn;
   `KiemDinh` thì `mayDangChay(snapshot)` (`lib/song.ts`) cho đúng giá trị đó từ `snapshot`.
3. **Task 5 sẽ vấp `tacPham` nếu làm theo bảng tệp một cách máy móc.** `KiemDinh` hiện KHÔNG
   nhận `tacPham` (`app/page.tsx`), mà `CuaNghiemThu` cần nó cho cả hai lời gọi API. Có bài
   kiểm giữ ca đó (lỗ hổng T2-8), nên để trống sẽ ra hai nút vô hiệu chứ không ra một lời gọi
   `/books/undefined/…` — nhưng nó vẫn là một dải chết trên đúng bề mặt mà spec §7.3 gọi là
   chỗ người dùng quyết định.
4. **`permit_chapter` VẮNG là ca thường, không phải ca biên.** `TienDo.PermitChapter` khai
   `omitempty` (`internal/serve/model.go:243`) nên số 0 — "chưa cấp phép chương nào", đúng ca
   mà chế độ nghiệm thu tồn tại để tạo ra — rụng khỏi JSON. Kế hoạch vẽ mọi nhãn quanh một số
   chương có thật (`Trả chương 8 về viết lại`); một nhãn dựng bằng chuỗi thẳng sẽ in "Trả
   chương undefined về viết lại". Hai nhãn vì vậy nhận `n?: number`, và có bài kiểm riêng.
   Ghi chú về ngữ nghĩa: `permit_chapter` là chương ĐÃ ĐƯỢC CHO ĐI TIẾP — TUI in đúng trường
   này thành "已放行第 N 章" (`internal/entry/tui/panels_sidebar.go:34`). Ở một cửa đang treo
   thì đó cũng là chương vừa viết xong và đang chờ duyệt, nên cách kế hoạch dùng nó là đúng;
   tôi ghi lại vì suy ra được điều đó tốn một vòng đọc mã Go.
5. **Kế hoạch không nói `CuaNghiemThu` nhận gì.** Bảng tệp chỉ nói "dải quyết định, dùng ở 2
   chỗ". Đã chọn `advance: TienDo | null` (thô, từ `snapshot.advance`) chứ không phải một
   `TrangThaiCua` đã tính sẵn: luật "cửa nào là cửa đang chờ" khi đó chỉ có MỘT chỗ giữ, và
   người nối dây ở Task 5 không có cơ hội tính sai nó. Ngược lại `ThanhTren` nhận
   `TrangThaiCua | undefined` đúng như kế hoạch nói — thanh trên không đọc gì khác của
   snapshot, và cho nó cả cục là mời người sau biến một thanh mức MÁY thành nửa-theo-tác-phẩm.
6. **Task 4 nói `ThanhTren` "nhận thêm prop `cuaNghiemThu`" nhưng không nói nó cũng cần
   `onChonKhu`** — huy hiệu phải dẫn đi đâu đó. Đã thêm; `page.tsx` truyền `s.chonKhu`.
7. **Bảng tệp không kê `web/components/ThanhTren.test.tsx`** — repo chưa từng có bộ kiểm cho
   `ThanhTren`. Không có tệp đó thì T4-2 tới T4-6 không có chỗ nào bắt được.

#### Quyết định tự đưa ra vì kế hoạch không nói

- **`choGhi === undefined` khóa nút nhưng KHÔNG hiện câu "chế độ chỉ đọc".** `undefined` là
  "đang hỏi `/api/config`", không phải "đã hỏi, câu trả lời là không" — cùng lớp `null` khác
  `false` mà cả hợp đồng `/studio` giữ, và câu sai đó sẽ hiện ra ở MỌI lần mở trang.
- **MỘT cờ `dangGui` cho CẢ HAI nút**, không phải mỗi nút một cờ: hai lệnh này loại trừ nhau
  về ý định, và "cho đi tiếp trong lúc câu trả-về đang bay" là một trạng thái không ai đọc
  được.
- **Nhánh LỖI giữ nguyên chữ đã gõ và giữ ô nhập mở.** Nuốt câu vừa gõ cùng lúc với báo lỗi là
  hai thiệt hại chồng nhau; `datChu('')` chỉ nằm ở nhánh thành công.
- **Câu giải thích `/steer` hiện RA MÀN HÌNH khi ô nhập mở**, không nằm trong chú thích mã:
  "trả chương về viết lại" nghe như một lệnh xóa chương, nhưng phạm vi ảnh hưởng do Arbiter
  quyết định và có thể nhiều hơn một chương — người bấm phải biết trước khi gửi. Cùng lối
  `xuongKhongCoNutChay` của màn Xưởng.
- **Ký hiệu lấy từ `kyTheoTone('amber')`, không viết cứng `■`.** Dải này đứng cạnh bản duyệt
  của Editor ở bề mặt Kiểm định, nên hai chỗ phải đi theo cùng một bảng ký hiệu.
- **Huy hiệu đứng sau nhóm "cuốn nào / cuốn mới", KHÔNG ở nhóm bên phải** — chép nguyên luật
  đã ghi trong `ThanhTren.tsx` cho nút tạo tác phẩm: bên phải là tin để NGÓ (dòng sự kiện),
  còn đây là một việc phải làm, và nó nói về đúng cuốn mà bộ chọn bên trái đang hiện. Nó nằm
  NGOÀI khối `dangXem` (có bài kiểm): khối đó biến mất khi chưa chọn tác phẩm, và một dây
  chuyền đang đứng chờ không được biến mất cùng một bộ chọn.
- **`page.tsx` truyền `undefined` khi chưa có snapshot, không phải `trangThaiCua(null)`.** Hai
  ca cho cùng một hình (không huy hiệu) nhưng khác nguồn — "chưa tải xong" và "engine đóng".
- **Bài kiểm hành động nằm ở tệp RIÊNG (`CuaNghiemThu.hanhdong.test.tsx`).** `vi.mock` là
  hoisted và có phạm vi cả tệp, nên gộp lại sẽ bắt bài kiểm hình chạy trên một tầng API giả —
  hai chuyện khác nhau, và một ngày ai sửa mock sẽ làm đỏ những bài không liên quan tới mạng.
- **KHÔNG đụng `app/globals.css`** — Task 7 sở hữu nó, và tránh va chạm với phiên chạy song
  song. Đã đo bằng `grep` từng lớp, và **phép đo đầu tiên của tôi ở đây SAI theo đúng cái bẫy
  mà cụm Xưởng đã ghi** (`.ten .nb .ma .sl .tu` "đã có CSS" — thật ra chỉ tồn tại dưới dạng bị
  giới hạn trong component khác). Đếm số lần xuất hiện là chưa đủ; phải nhìn CHÍNH selector:

  | lớp | trạng thái |
  |---|---|
  | `.cuanghiemthu .cnthead .cntlydo .cntnut .cntO .hieunghiemthu` | chưa có một dòng nào |
  | `.steerbox .steerhint .loiDoc .nutChinh .nutPhu` | có luật TRẦN, dùng lại được ngay |
  | `.ky` · `.lbl` | **CHỈ có luật bị giới hạn** (`.st .ky`, `.trans .ky`, `.mucxem .lbl`…) — KHÔNG có luật trần nào |

  Nghĩa là **Task 7 phải viết TÁM khối, không phải sáu**: sáu lớp mới, cộng `.cuanghiemthu .ky`
  / `.hieunghiemthu .ky` và `.cntlydo .lbl`. Không có chúng thì ký hiệu `■` và nhãn "Kết luận
  của Editor" render trần — đúng thứ đã thấy ở `xuong-1440-truoc-css.png`.

  Sau cụm này dải đã đọc được nhưng CHƯA amber và chưa có bố cục hai nút căn phải.
- **KHÔNG đụng Task 5 và Task 6** dù cả hai chạm vào tệp tôi vừa sửa. Ghi các bẫy ở mục "kế
  hoạch sai" 2 và 3 thay vì tự làm.

#### Cổng sau Task 4 (chạy toàn bộ trong worktree, không lọc gói, không `-x`)

`go build ./...` exit 0 · `go vet ./...` exit 0 · `gofmt -l .` **rỗng** ·
`go test -count=1 ./...` **30 gói ok / 0 FAIL** (đúng nền) ·
`npm test` **171/171** (nền 139/139, không bài nào đỏ) · `npx tsc --noEmit` exit 0 ·
`npm run build` exit 0.

`git merge-base --is-ancestor cc77990 HEAD` → đúng; cây làm việc sạch.

**`tsc` lại bắt được thứ `npm test` không bắt**, lần thứ ba trong dự án: thêm prop bắt buộc
`dangChay` ở Task 3 làm bốn lời gọi trong `CuaNghiemThu.test.tsx` thiếu tham số — `npm test`
xanh 20/20 vì JSX thiếu prop chỉ là `undefined` lúc chạy. Chạy CẢ HAI trước khi commit.
