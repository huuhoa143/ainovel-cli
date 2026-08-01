# Kế hoạch 2/4 — Buồng lái sản xuất (bề mặt web)

> **Cho người thi hành:** KỸ NĂNG BẮT BUỘC — dùng `superpowers:subagent-driven-development`.
> Các bước dùng cú pháp checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** dựng lại `?khu=dong-san-xuat` thành buồng lái ba cột theo bố cục TUI, với văn
sống chảy thật ở cột giữa.

**Kiến trúc:** logic chịu lực nằm ở hàm THUẦN trong `web/lib/` (bộ đệm văn, ngưỡng cuộn, cây
vai, bộ lọc sự kiện ui); React component chỉ vẽ và giữ DOM. Ranh giới đó là điều kiện để có
bài kiểm đỏ-trước — một component ôm cả ba việc thì không kiểm được việc nào.

**Bộ đồ nghề:** Next 16 · React 19 · vitest 4 (hai project: `logic` chạy Node, `giaodien` chạy
jsdom) · bộ canh quét nguồn phía Go giữ nguyên.

**Nền đã có:** kế hoạch 1/4 (`5f7fe95`) đã giao hợp đồng JSON ĐÃ ĐO: `/studio` mang `agents`,
`idle_agents`, `advance`, `context`, `in_progress_chapter`, `pending_steer`, `rewrite_reason`,
`recovery`; `/events` phát `stream_delta` + `stream_clear` với nhịp trung vị **2ms**, delta
không mang `id:`, chữ ở `data.text`. Bộ chạy test cho web dựng ở `61bc31e`.

---

## Luật cho mọi người thi hành — đọc trước khi gõ dòng đầu tiên

1. **KHÔNG xóa chú thích đang có.** Chú thích trong repo này ghi lý do và các phép đo đã trả
   giá để có. Chúng là tài sản, không phải mã chết. Nếu một chú thích thành sai sau thay đổi
   của bạn, **sửa nó cho đúng**, đừng xóa.
2. **Worktree đặt NGOÀI repo** — `~/.config/superpowers/worktrees/ainovel-cli/<nhánh>`. Đã đo:
   worktree trong `.worktrees/` làm `internal/diag` và `internal/i18n` (hai bộ quét cây nguồn)
   bò vào bản sao và cho **8 FAIL giả**.
3. **Cổng là DELTA so với nền, không phải "xanh hết".** Nền hiện tại: `go test ./...` **30 gói
   / 0 FAIL**, `npm test` **2/2**, `tsc --noEmit` 0 lỗi, `npm run build` exit 0. Chạy toàn bộ,
   không chạy `-x` hay lọc theo gói.
4. **Nhãn tiếng Việt phải qua `web/lib/nhan.ts`.** `TestNhanDlPhaiQuaTuDien` canh việc đó và
   nó sẽ bắt bạn.
5. **Mỗi bài kiểm phải ĐỎ TRƯỚC vì đúng lý do nó canh.** Chạy nó, đọc câu lỗi, xác nhận câu đó
   nói đúng cái bạn định canh. Một bài kiểm đỏ vì gõ sai tên hàm không chứng minh gì.

---

## Cấu trúc tệp

| Tệp | Việc | Trạng thái |
|---|---|---|
| `web/lib/dongSuKien.ts` | lọc sự kiện ui: bỏ thứ không mang `seq` | mới |
| `web/lib/vanSong.ts` | bộ đệm văn sống: lượt, vạch ngăn, hai trần | mới |
| `web/lib/tuCuon.ts` | ngưỡng "đang bám đáy" | mới |
| `web/lib/vaiTro.ts` | dựng cây vai từ `depth` | mới |
| `web/lib/api.ts` | tách hằng loại sự kiện làm hai nhóm | sửa |
| `web/lib/useStudio.ts` | định tuyến delta/clear sang bộ đệm, phơi `vanSong` | sửa |
| `web/components/VanSong.tsx` | pane văn sống + tự cuộn + vạch ngăn | mới |
| `web/components/DaiTrangThai.tsx` | dải trạng thái: vai · việc tồn · ngữ cảnh | mới |
| `web/components/BuongLai.tsx` | lưới ba cột của buồng lái | mới |
| `web/components/Inspector.tsx` | hai chế độ cột phải | sửa |
| `web/app/page.tsx` | chỉ còn định tuyến khu | sửa |
| `web/app/globals.css` | lưới + điểm gãy 1240/860 | sửa |
| `web/lib/nhan.ts` | nhãn mới | sửa |

`page.tsx` đang 509 dòng. Tách phần dựng buồng lái ra `BuongLai.tsx`; **không refactor gì
khác** trong tệp đó.

---

## Cụm A — bộ đệm và định tuyến sự kiện (T1–T5)

### Task 1: Sự kiện không mang `seq` không được đi vào đường ui

Có một lỗi THẬT đang sống trong `useStudio`. `LOAI_SU_KIEN` đã chứa `'stream_delta'` và
`'stream_clear'` (`web/lib/api.ts:45`), và vòng đăng ký gắn CÙNG MỘT handler `nhan` cho cả
bốn loại (`useStudio.ts:292`). Handler đó mở đầu bằng `if (ev.seq <= seqRef.current) return;`.

Payload của delta là `{"text":"…"}` — không có `seq`. Trong JavaScript `undefined <= 0` là
`false`, nên **không có early return**: `seqRef.current` bị gán `undefined`, mẩu chữ bị đẩy
vào danh sách `suKien` như một sự kiện, và — nặng nhất — `henRef` được đặt lại ở MỖI mẩu. Với
nhịp 2ms đã đo, hẹn 1500ms không bao giờ tới hạn, tức **bảng chương, trục và transport đứng
im suốt lúc engine đang viết**. Đúng thứ buồng lái tồn tại để hiện.

**Tệp:**
- Tạo: `web/lib/dongSuKien.ts`
- Tạo: `web/lib/dongSuKien.test.ts`

- [ ] **Bước 1: Viết bài kiểm đỏ**

```ts
// web/lib/dongSuKien.test.ts
import { expect, test } from 'vitest';

import { nhanSuKienUi } from './dongSuKien';

test('mẩu văn sống lọt vào đường ui bị bỏ, KHÔNG làm hỏng mốc seq', () => {
  // Đây đúng payload của `stream_delta`. Nó không có `seq`.
  expect(nhanSuKienUi({ text: 'nàng quay đầu lại' }, 12)).toBeUndefined();
});

test('sự kiện cũ hoặc trùng bị bỏ', () => {
  expect(nhanSuKienUi({ seq: 12, kind: 'ui_event' }, 12)).toBeUndefined();
  expect(nhanSuKienUi({ seq: 5, kind: 'ui_event' }, 12)).toBeUndefined();
});

test('sự kiện mới được nhận nguyên vẹn', () => {
  const ev = { seq: 13, kind: 'ui_event', summary: 'viết chương 2' };
  expect(nhanSuKienUi(ev, 12)).toEqual(ev);
});

test('seq không phải số bị bỏ — kể cả chuỗi số', () => {
  // Một `seq: "13"` lọt qua `>` sẽ so sánh kiểu ép, rồi được gán vào mốc dưới dạng chuỗi;
  // phép so sánh kế tiếp sẽ so chuỗi với số và cho kết quả không đoán được.
  expect(nhanSuKienUi({ seq: '13', kind: 'ui_event' }, 12)).toBeUndefined();
});
```

- [ ] **Bước 2: Chạy để xác nhận đỏ**

Chạy: `cd web && npx vitest run lib/dongSuKien.test.ts`
Chờ: FAIL — `Failed to resolve import "./dongSuKien"`.

- [ ] **Bước 3: Viết phần đủ để xanh**

```ts
// web/lib/dongSuKien.ts
import type { StreamEvent } from './types';

/**
 * Cổng vào của đường sự kiện ui.
 *
 * # Vì sao một hàm riêng cho hai phép so sánh
 *
 * Vì đã có một lỗi ĐO ĐƯỢC ở đúng chỗ này. `LOAI_SU_KIEN` chứa cả `stream_delta`, và
 * `useStudio` từng gắn cùng một handler cho mọi loại. Payload của delta là `{"text":"…"}`,
 * không có `seq`, và `undefined <= 0` trong JavaScript là `false` — nên không có early
 * return. Ba hệ quả, nặng dần:
 *
 *   1. `seqRef.current` bị gán `undefined`, tức mốc nối lại của stream mất nghĩa;
 *   2. mẩu chữ bị đẩy vào danh sách sự kiện như một sự kiện;
 *   3. hẹn làm mới snapshot bị đặt lại ở MỖI mẩu. Nhịp delta đã đo là trung vị 2ms, nên hẹn
 *      1500ms KHÔNG BAO GIỜ tới hạn — bảng chương và transport đứng im đúng lúc engine đang
 *      viết, tức đúng lúc buồng lái phải sống.
 *
 * Đòi `typeof === 'number'` chứ không chỉ `!= null`: một `seq: "13"` lọt qua `>` nhờ ép kiểu
 * rồi được gán vào mốc dưới dạng chuỗi, và phép so sánh của mẩu sau đó so chuỗi với chuỗi
 * theo thứ tự từ điển ("9" > "13").
 */
export function nhanSuKienUi(vao: unknown, mocSeq: number): StreamEvent | undefined {
  if (!vao || typeof vao !== 'object') return undefined;
  const ev = vao as Partial<StreamEvent>;
  if (typeof ev.seq !== 'number') return undefined;
  if (ev.seq <= mocSeq) return undefined;
  return ev as StreamEvent;
}
```

- [ ] **Bước 4: Chạy để xác nhận xanh**

Chạy: `cd web && npx vitest run lib/dongSuKien.test.ts`
Chờ: 4 passed.

- [ ] **Bước 5: Commit**

```bash
git add web/lib/dongSuKien.ts web/lib/dongSuKien.test.ts
git commit -m "fix(web): mẩu văn sống lọt đường ui làm chết hẹn làm mới snapshot"
```

---

### Task 2: Bộ đệm văn sống — thêm chữ vào lượt hiện tại

**Tệp:**
- Tạo: `web/lib/vanSong.ts`
- Tạo: `web/lib/vanSong.test.ts`

- [ ] **Bước 1: Viết bài kiểm đỏ**

```ts
// web/lib/vanSong.test.ts
import { expect, test } from 'vitest';

import { BO_DEM_RONG, themChu } from './vanSong';

test('mẩu đầu tiên tạo lượt mở, không có nhãn vạch', () => {
  const bd = themChu(BO_DEM_RONG, 'nàng ');
  expect(bd.luot).toHaveLength(1);
  expect(bd.luot[0]!.chu).toBe('nàng ');
  expect(bd.luot[0]!.nhan).toBeUndefined();
});

test('mẩu kế tiếp nối vào lượt hiện tại, không mở lượt mới', () => {
  const bd = themChu(themChu(BO_DEM_RONG, 'nàng '), 'quay đầu lại');
  expect(bd.luot).toHaveLength(1);
  expect(bd.luot[0]!.chu).toBe('nàng quay đầu lại');
});

test('bộ đệm cũ không bị sửa tại chỗ', () => {
  const truoc = themChu(BO_DEM_RONG, 'a');
  themChu(truoc, 'b');
  expect(truoc.luot[0]!.chu).toBe('a');
});
```

- [ ] **Bước 2: Chạy để xác nhận đỏ**

Chạy: `cd web && npx vitest run lib/vanSong.test.ts`
Chờ: FAIL — không resolve được `./vanSong`.

- [ ] **Bước 3: Viết phần đủ để xanh**

```ts
// web/lib/vanSong.ts

/**
 * Bộ đệm VĂN SỐNG phía client — chữ model đang sinh ra, đã nhận qua SSE.
 *
 * Đây là bộ đệm THỨ HAI, và hai bộ đệm giữ hai thứ khác nhau — đừng lẫn:
 *
 *   - **Server** (`internal/serve/dong_van.go`) giữ đúng LƯỢT HIỆN TẠI, trần 512KB, cắt từ
 *     đầu. Nó chỉ cần đủ cho người mở trang GIỮA một lượt.
 *   - **Client** (tệp này) giữ 3 lượt gần nhất để đọc lại được đoạn vừa trôi qua.
 *
 * Trần đôi là cố ý. Chỉ đếm lượt thì một lượt Writer bằng cả chương vẫn phình tới hàng chục
 * MB. Chỉ đếm byte thì một lượt dài đẩy hết lượt trước ra và mất luôn vạch ngăn — tức mất
 * đúng thứ làm người đọc biết mình đang ở lượt nào.
 */

/** Một lượt máy nói: từ lệnh xóa này tới lệnh xóa kế tiếp. */
export interface LuotVan {
  /**
   * Số thứ tự tăng dần, KHÔNG dùng lại sau khi lượt bị bỏ.
   *
   * Dùng làm `key` của React. Chỉ số mảng thì không được: khi lượt cũ nhất bị bỏ, mọi chỉ số
   * dịch xuống một bậc, React coi đó là "nội dung của phần tử 0 vừa đổi" và giữ nguyên nút
   * DOM — trong một khu đang tự cuộn thì đó là một cú nhảy vị trí ngay giữa lúc đọc.
   */
  id: number;
  /** Nhãn vạch ngăn mở đầu lượt. `undefined` cho lượt đầu tiên của phiên xem. */
  nhan?: string;
  chu: string;
}

export interface BoDemVan {
  luot: LuotVan[];
  /** id sẽ cấp cho lượt kế tiếp. */
  idKe: number;
}

export const BO_DEM_RONG: BoDemVan = { luot: [], idKe: 1 };

/** Số lượt giữ lại. Người dùng cần đối chiếu lượt này với lượt trước, không cần cả phiên. */
export const SO_LUOT_GIU = 3;

/** Trần tổng byte của cả bộ đệm. Cùng con số với trần của server, vì cùng một lý do. */
export const CO_TOI_DA = 512 * 1024;

/** Thêm một mẩu chữ vào lượt đang mở. Mở lượt đầu nếu bộ đệm còn rỗng. */
export function themChu(bd: BoDemVan, chu: string): BoDemVan {
  if (!chu) return bd;
  const luot = bd.luot.slice();
  const cuoi = luot[luot.length - 1];
  if (!cuoi) {
    // Mẩu tới trước lệnh xóa nào cả. Server LUÔN gửi `stream_clear` trước lúc nối, nên ca này
    // chỉ xảy ra khi engine mở giữa chừng — vẫn phải giữ chữ, không được bỏ.
    return cat({ luot: [{ id: bd.idKe, chu }], idKe: bd.idKe + 1 });
  }
  luot[luot.length - 1] = { ...cuoi, chu: cuoi.chu + chu };
  return cat({ luot, idKe: bd.idKe });
}

/** Cắt theo hai trần. Bước 3 của Task 4 thay thân hàm này. */
function cat(bd: BoDemVan): BoDemVan {
  return bd;
}
```

- [ ] **Bước 4: Chạy để xác nhận xanh**

Chạy: `cd web && npx vitest run lib/vanSong.test.ts`
Chờ: 3 passed.

- [ ] **Bước 5: Commit**

```bash
git add web/lib/vanSong.ts web/lib/vanSong.test.ts
git commit -m "feat(web): bộ đệm văn sống, thêm chữ vào lượt đang mở"
```

---

### Task 3: Vạch ngăn — `stream_clear` mở lượt mới, chữ lượt trước còn nguyên

**Tệp:**
- Sửa: `web/lib/vanSong.ts`
- Sửa: `web/lib/vanSong.test.ts`

- [ ] **Bước 1: Viết bài kiểm đỏ (thêm vào cuối tệp test)**

```ts
import { moLuot } from './vanSong';

test('lệnh xóa mở lượt mới, chữ lượt trước KHÔNG mất', () => {
  let bd = themChu(BO_DEM_RONG, 'lượt một');
  bd = moLuot(bd, '— chương 2 · 23:11 —');
  bd = themChu(bd, 'lượt hai');

  expect(bd.luot).toHaveLength(2);
  expect(bd.luot[0]!.chu).toBe('lượt một');
  expect(bd.luot[1]!.chu).toBe('lượt hai');
  expect(bd.luot[1]!.nhan).toBe('— chương 2 · 23:11 —');
});

test('mỗi lượt có id riêng, không dùng lại', () => {
  let bd = themChu(BO_DEM_RONG, 'a');
  bd = moLuot(bd, 'v1');
  bd = moLuot(bd, 'v2');
  const id = bd.luot.map((l) => l.id);
  expect(new Set(id).size).toBe(id.length);
});

test('hai lệnh xóa liền nhau không để lại lượt rỗng', () => {
  // Engine phát sentinel hai lần liên tiếp là ca hợp lệ (lượt bị hủy trước khi phát chữ).
  // Một lượt rỗng vẽ ra là một vạch ngăn không ngăn gì cả.
  let bd = themChu(BO_DEM_RONG, 'a');
  bd = moLuot(bd, 'v1');
  bd = moLuot(bd, 'v2');
  expect(bd.luot).toHaveLength(2);
  expect(bd.luot[1]!.nhan).toBe('v2');
});
```

- [ ] **Bước 2: Chạy để xác nhận đỏ**

Chạy: `cd web && npx vitest run lib/vanSong.test.ts`
Chờ: FAIL — `moLuot` không được export.

- [ ] **Bước 3: Viết phần đủ để xanh (thêm vào `vanSong.ts`)**

```ts
/**
 * Mở một lượt mới — phản ứng với `stream_clear`.
 *
 * Tên hàm là "mở lượt", không phải "xóa": ở TUI lệnh này XÓA sạch khu chữ, còn ở đây nó thành
 * một vạch ngăn. Trình duyệt giỏi đúng cái terminal dở — cuộn lại được — nên vứt đi phần vừa
 * đọc là bỏ phí một khả năng, và người dùng đã chọn phương án vạch ngăn.
 *
 * Lượt đang mở mà RỖNG thì thay nhãn của nó chứ không xếp thêm một lượt nữa: hai sentinel
 * liền nhau là ca hợp lệ, và một lượt rỗng vẽ ra là một vạch ngăn không ngăn gì cả.
 */
export function moLuot(bd: BoDemVan, nhan?: string): BoDemVan {
  const cuoi = bd.luot[bd.luot.length - 1];
  if (cuoi && cuoi.chu === '') {
    const luot = bd.luot.slice();
    luot[luot.length - 1] = { ...cuoi, nhan };
    return { luot, idKe: bd.idKe };
  }
  return cat({
    luot: [...bd.luot, { id: bd.idKe, nhan, chu: '' }],
    idKe: bd.idKe + 1,
  });
}
```

- [ ] **Bước 4: Chạy để xác nhận xanh**

Chạy: `cd web && npx vitest run lib/vanSong.test.ts`
Chờ: 6 passed.

- [ ] **Bước 5: Commit**

```bash
git add web/lib/vanSong.ts web/lib/vanSong.test.ts
git commit -m "feat(web): lệnh xóa lượt thành vạch ngăn, giữ chữ lượt trước"
```

---

### Task 4: Hai trần — 3 lượt HOẶC 512KB, bỏ từ lượt cũ nhất

**Tệp:**
- Sửa: `web/lib/vanSong.ts` (thay thân `cat`)
- Sửa: `web/lib/vanSong.test.ts`

- [ ] **Bước 1: Viết bài kiểm đỏ (thêm vào cuối tệp test)**

```ts
import { CO_TOI_DA, SO_LUOT_GIU } from './vanSong';

function boDemNhieuLuot(soLuot: number, chuMoiLuot: string): BoDemVan {
  let bd = BO_DEM_RONG;
  for (let i = 0; i < soLuot; i += 1) {
    bd = moLuot(bd, `v${i}`);
    bd = themChu(bd, chuMoiLuot);
  }
  return bd;
}

test('quá SO_LUOT_GIU lượt thì bỏ lượt CŨ NHẤT', () => {
  const bd = boDemNhieuLuot(SO_LUOT_GIU + 2, 'x');
  expect(bd.luot).toHaveLength(SO_LUOT_GIU);
  // Hai lượt đầu (v0, v1) phải là hai lượt bị bỏ.
  expect(bd.luot.map((l) => l.nhan)).toEqual(['v2', 'v3', 'v4']);
});

test('quá trần byte thì bỏ từ lượt cũ nhất cho tới khi dưới trần', () => {
  const nua = 'x'.repeat(Math.floor(CO_TOI_DA * 0.6));
  let bd = BO_DEM_RONG;
  bd = moLuot(bd, 'v0');
  bd = themChu(bd, nua);
  bd = moLuot(bd, 'v1');
  bd = themChu(bd, nua);

  // Hai lượt = 120% trần, mà số lượt vẫn dưới SO_LUOT_GIU → chỉ trần byte mới cắt được.
  expect(bd.luot).toHaveLength(1);
  expect(bd.luot[0]!.nhan).toBe('v1');
});

test('MỘT lượt vượt trần thì không xóa sạch — cắt từ ĐẦU lượt đó', () => {
  // Ca này là lý do trần byte không được viết thành vòng "bỏ tới khi vừa". Bỏ lượt cuối cùng
  // là để lại một khu trống trong lúc engine đang phát chữ.
  const qua = 'y'.repeat(CO_TOI_DA + 5000);
  const bd = themChu(BO_DEM_RONG, qua);

  expect(bd.luot).toHaveLength(1);
  expect(bd.luot[0]!.chu.length).toBeLessThanOrEqual(CO_TOI_DA);
  // Giữ phần CUỐI: đó là phần đang chảy, tức phần người dùng đang đọc.
  expect(bd.luot[0]!.chu.endsWith('y')).toBe(true);
  expect(bd.luot[0]!.chu.length).toBeGreaterThan(0);
});

test('id vẫn tăng sau khi bỏ lượt — không cấp lại id đã dùng', () => {
  const bd = boDemNhieuLuot(SO_LUOT_GIU + 3, 'x');
  expect(bd.idKe).toBeGreaterThan(SO_LUOT_GIU + 3);
});
```

- [ ] **Bước 2: Chạy để xác nhận đỏ**

Chạy: `cd web && npx vitest run lib/vanSong.test.ts`
Chờ: FAIL — bài "bỏ lượt cũ nhất" báo nhận 5 lượt thay vì 3 (`cat` còn là hàm rỗng).

- [ ] **Bước 3: Thay thân `cat` trong `vanSong.ts`**

```ts
/**
 * Cắt bộ đệm theo HAI trần: số lượt và tổng byte. Cái nào chạm trước thì cái đó cắt.
 *
 * Thứ tự cố ý: bỏ lượt cũ nhất TRƯỚC, và chỉ khi chỉ còn một lượt mà vẫn quá trần thì mới cắt
 * chữ bên trong nó. Ngược lại — cắt chữ trước — sẽ gọt mất phần đầu của một lượt cũ mà lẽ ra
 * chỉ cần bỏ cả lượt, tức để lại một lượt cụt đầu vô nghĩa.
 *
 * Không bao giờ bỏ lượt CUỐI. Trần chạm được trong lúc engine đang phát, và một khu trống ở
 * vị trí đắt nhất của màn hình đúng lúc máy đang nói là hỏng nặng hơn cả việc phình bộ đệm.
 */
function cat(bd: BoDemVan): BoDemVan {
  let luot = bd.luot;

  if (luot.length > SO_LUOT_GIU) luot = luot.slice(luot.length - SO_LUOT_GIU);

  let tong = luot.reduce((n, l) => n + l.chu.length, 0);
  while (tong > CO_TOI_DA && luot.length > 1) {
    tong -= luot[0]!.chu.length;
    luot = luot.slice(1);
  }

  // Chỉ còn một lượt mà vẫn quá trần: cắt từ ĐẦU chữ của nó. Phần cuối là phần đang chảy.
  const cuoi = luot[luot.length - 1];
  if (luot.length === 1 && cuoi && cuoi.chu.length > CO_TOI_DA) {
    luot = [{ ...cuoi, chu: cuoi.chu.slice(cuoi.chu.length - CO_TOI_DA) }];
  }

  return luot === bd.luot ? bd : { luot, idKe: bd.idKe };
}
```

- [ ] **Bước 4: Chạy để xác nhận xanh**

Chạy: `cd web && npx vitest run lib/vanSong.test.ts`
Chờ: 10 passed.

- [ ] **Bước 5: Phép thử đột biến — chứng minh bài kiểm có canh gì**

Sửa mã sản xuất, chạy test, xác nhận ĐỎ, rồi hoàn nguyên. Ghi kết quả vào phần Nhật ký cuối
kế hoạch này.

| # | Đột biến | Phải đỏ ở |
|---|---|---|
| 1 | `luot.slice(luot.length - SO_LUOT_GIU)` → `luot.slice(0, SO_LUOT_GIU)` | "bỏ lượt CŨ NHẤT" |
| 2 | `luot.length > 1` → `luot.length > 0` | "MỘT lượt vượt trần không xóa sạch" |
| 3 | `chu.slice(chu.length - CO_TOI_DA)` → `chu.slice(0, CO_TOI_DA)` | "giữ phần CUỐI" |
| 4 | trong `moLuot`, bỏ nhánh lượt-rỗng | "hai lệnh xóa liền nhau" |

Đột biến nào XANH là một lỗ hổng thật: viết thêm bài kiểm bịt nó **trước khi** đi tiếp.

- [ ] **Bước 6: Commit**

```bash
git add web/lib/vanSong.ts web/lib/vanSong.test.ts
git commit -m "feat(web): hai trần cho bộ đệm văn sống, bỏ từ lượt cũ nhất"
```

---

### Task 5: `useStudio` định tuyến delta/clear sang bộ đệm

**Tệp:**
- Sửa: `web/lib/api.ts:45`
- Sửa: `web/lib/useStudio.ts`
- Sửa: `web/lib/nhan.ts`

- [ ] **Bước 1: Tách hằng loại sự kiện trong `api.ts`**

Thay dòng 45:

```ts
/**
 * Hai nhóm loại sự kiện, và chúng đi hai đường KHÁC NHAU trong `useStudio`.
 *
 * Gộp làm một danh sách là lỗi đã đo: handler của đường ui đòi trường `seq`, mà payload văn
 * sống không có nó — xem chú thích của `nhanSuKienUi` trong lib/dongSuKien.ts.
 *
 * Hai nhịp cũng khác nhau, và đó là thiết kế chứ không phải thiếu sót: `ui_event` nhảy khoảng
 * 5 lần trong 18 giây nên vòng dò 700ms là đủ; `stream_delta` có nhịp trung vị 2ms nên nó
 * được ĐÁNH THỨC ở phía server. Hạ vòng dò chung xuống cho khớp delta là nghiền đĩa vì một
 * dòng gần như im.
 */
export const LOAI_SU_KIEN_UI = ['ui_event', 'control'] as const;
export const LOAI_VAN_SONG = ['stream_delta', 'stream_clear'] as const;
export const LOAI_SU_KIEN = [...LOAI_SU_KIEN_UI, ...LOAI_VAN_SONG] as const;
```

- [ ] **Bước 2: Viết bài kiểm đỏ cho nhãn vạch**

```ts
// thêm vào web/lib/vanSong.test.ts
import { nhanVach } from './vanSong';

test('nhãn vạch nói chương nào và lúc mấy giờ', () => {
  const t = new Date('2026-08-01T23:11:04');
  expect(nhanVach(2, t)).toBe('chương 2 · 23:11');
});

test('không biết chương thì nhãn chỉ có giờ, không bịa số chương', () => {
  const t = new Date('2026-08-01T09:05:00');
  expect(nhanVach(undefined, t)).toBe('09:05');
});
```

Chạy: `cd web && npx vitest run lib/vanSong.test.ts` → FAIL (`nhanVach` chưa có).

- [ ] **Bước 3: Thêm `nhanVach` vào `vanSong.ts`**

```ts
import { CHU } from './nhan';

/**
 * Nhãn của một vạch ngăn: lượt này thuộc chương nào, mở lúc mấy giờ.
 *
 * Chương có thể chưa biết (`in_progress_chapter` là `null` khi không có chương nào đang
 * soạn). Lúc đó nhãn chỉ có giờ — bịa một số chương vào một vạch ngăn là gán sai cả một đoạn
 * văn cho một chương.
 */
export function nhanVach(chuong: number | undefined, luc: Date): string {
  const gio = `${String(luc.getHours()).padStart(2, '0')}:${String(luc.getMinutes()).padStart(2, '0')}`;
  return chuong === undefined ? gio : `${CHU.chuong.toLowerCase()} ${chuong} · ${gio}`;
}
```

Chạy lại → 12 passed.

- [ ] **Bước 4: Đấu dây trong `useStudio.ts`**

Bốn sửa đổi, không hơn:

1. Thêm import: `import { BO_DEM_RONG, moLuot, nhanVach, themChu, type BoDemVan } from './vanSong';`
   và `import { nhanSuKienUi } from './dongSuKien';`, và đổi `LOAI_SU_KIEN` thành
   `LOAI_SU_KIEN_UI, LOAI_VAN_SONG` trong import từ `./api`.

2. Thêm state cạnh các state khác:

```ts
const [vanSong, setVanSong] = useState<BoDemVan>(BO_DEM_RONG);
```

3. Trong effect "dòng sự kiện", thay đầu handler `nhan` và thêm hai handler mới:

```ts
    const nhan = (raw: MessageEvent) => {
      let tho: unknown;
      try {
        tho = JSON.parse(raw.data as string);
      } catch {
        return; // một mục hỏng không được giết cả dòng
      }
      const ev = nhanSuKienUi(tho, seqRef.current);
      if (!ev) return;
      seqRef.current = ev.seq;
      setKetNoi('song');
      /* … phần còn lại giữ NGUYÊN … */
    };

    // Văn sống đi đường riêng: nó không có `seq`, không vào danh sách sự kiện, và KHÔNG
    // được đặt lại hẹn làm mới snapshot — nhịp 2ms sẽ làm hẹn 1500ms không bao giờ tới hạn.
    const nhanDelta = (raw: MessageEvent) => {
      let d: { text?: unknown };
      try {
        d = JSON.parse(raw.data as string) as { text?: unknown };
      } catch {
        return;
      }
      if (typeof d.text !== 'string' || !d.text) return;
      setKetNoi('song');
      setVanSong((b) => themChu(b, d.text as string));
    };

    const nhanXoa = () => {
      setKetNoi('song');
      setVanSong((b) => moLuot(b, nhanVach(chuongDangSoanRef.current, new Date())));
    };

    for (const loai of LOAI_SU_KIEN_UI) nguon.addEventListener(loai, nhan);
    nguon.addEventListener(LOAI_VAN_SONG[0], nhanDelta);
    nguon.addEventListener(LOAI_VAN_SONG[1], nhanXoa);
```

4. Thêm ref cho chương đang soạn (đặt cạnh ba ref hiện có, và gán trong lúc render như chúng):

```ts
  const chuongDangSoanRef = useRef<number | undefined>(undefined);
  /* … */
  chuongDangSoanRef.current = snapshot?.in_progress_chapter ?? undefined;
```

5. Đổi tác phẩm thì bộ đệm phải sạch. Trong effect §2, cạnh `setSuKien([])`:

```ts
    setVanSong(BO_DEM_RONG);
```

6. Phơi ra ngoài: thêm `vanSong: BoDemVan;` vào interface `Studio`, thêm `vanSong` vào cả
   object trả về và mảng deps của `useMemo`.

- [ ] **Bước 5: Cổng**

```bash
cd web && npm test && npx tsc --noEmit && npm run build
```
Chờ: test 12+ passed · tsc 0 lỗi · build exit 0.

- [ ] **Bước 6: Commit**

```bash
git add web/lib/api.ts web/lib/useStudio.ts web/lib/vanSong.ts web/lib/vanSong.test.ts web/lib/nhan.ts
git commit -m "feat(web): useStudio nhận văn sống vào bộ đệm riêng"
```

---

## Cụm B — pane văn sống (T6–T9)

### Task 6: Ngưỡng "đang bám đáy"

**Tệp:**
- Tạo: `web/lib/tuCuon.ts`, `web/lib/tuCuon.test.ts`

- [ ] **Bước 1: Viết bài kiểm đỏ**

```ts
// web/lib/tuCuon.test.ts
import { expect, test } from 'vitest';

import { LE_DAY, dangODay } from './tuCuon';

test('đúng đáy thì đang bám đáy', () => {
  expect(dangODay({ scrollTop: 900, scrollHeight: 1000, clientHeight: 100 })).toBe(true);
});

test('lệch trong ngưỡng vẫn coi là bám đáy', () => {
  // Trình duyệt trả số lẻ (devicePixelRatio, sub-pixel), nên so bằng đúng sẽ RỚT khỏi chế độ
  // tự cuộn ngay ở nhịp đầu — và người dùng không hiểu vì sao chữ đứng lại.
  expect(dangODay({ scrollTop: 900 - LE_DAY + 1, scrollHeight: 1000, clientHeight: 100 })).toBe(true);
});

test('cuộn lên quá ngưỡng thì KHÔNG còn bám đáy', () => {
  expect(dangODay({ scrollTop: 400, scrollHeight: 1000, clientHeight: 100 })).toBe(false);
});

test('nội dung ngắn hơn khung thì luôn là bám đáy', () => {
  // Lúc mới mở, khu chưa có gì để cuộn. Trả false ở đây sẽ hiện nút "về cuối" trên một khu
  // không cuộn được — một nút không làm gì.
  expect(dangODay({ scrollTop: 0, scrollHeight: 80, clientHeight: 300 })).toBe(true);
});
```

- [ ] **Bước 2: Chạy → FAIL (không resolve `./tuCuon`)**

- [ ] **Bước 3: Viết**

```ts
// web/lib/tuCuon.ts

/**
 * Ba số của một khu cuộn. Nhận dưới dạng dữ liệu chứ không nhận `HTMLElement` để bài kiểm
 * không phải dựng DOM cho một phép trừ.
 */
export interface ViTriCuon {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Ngưỡng (px) còn coi là "đang ở đáy".
 *
 * Không so bằng đúng: trình duyệt trả số lẻ do devicePixelRatio và bố cục sub-pixel, nên
 * `scrollHeight - scrollTop - clientHeight` hiếm khi tròn 0 kể cả khi đã cuộn hết. So bằng
 * đúng sẽ làm khu rớt khỏi chế độ tự cuộn ngay nhịp đầu tiên.
 */
export const LE_DAY = 24;

/** Người dùng có đang ở đáy khu cuộn không — tức tự cuộn có được phép chạy không. */
export function dangODay(v: ViTriCuon): boolean {
  return v.scrollHeight - v.scrollTop - v.clientHeight <= LE_DAY;
}
```

- [ ] **Bước 4: Chạy → 4 passed**

- [ ] **Bước 5: Commit**

```bash
git add web/lib/tuCuon.ts web/lib/tuCuon.test.ts
git commit -m "feat(web): ngưỡng bám đáy cho khu tự cuộn"
```

---

### Task 7: `VanSong.tsx` vẽ lượt và vạch ngăn

**Tệp:**
- Tạo: `web/components/VanSong.tsx`, `web/components/VanSong.test.tsx`
- Sửa: `web/lib/nhan.ts`

- [ ] **Bước 1: Thêm nhãn vào `nhan.ts` (trong object `CHU`)**

```ts
  mayDangNoi: 'Máy đang nói',
  veCuoi: 'về cuối',
  mayNghi: 'Máy đang nghỉ',
```

và vào `GIAI_THICH`:

```ts
  vanSongTrong:
    'Chưa có lượt nào trong phiên xem này. Khi máy bắt đầu viết, chữ sẽ chảy ở đây.',
  vanSongNghi:
    'Đây là báo cáo của lượt vừa xong. Bấm Chạy ở thanh dưới để máy viết tiếp.',
```

- [ ] **Bước 2: Viết bài kiểm đỏ**

```tsx
// web/components/VanSong.test.tsx
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { BO_DEM_RONG, moLuot, themChu } from '@/lib/vanSong';

import { VanSong } from './VanSong';

test('vẽ chữ của mọi lượt đang giữ', () => {
  let bd = themChu(BO_DEM_RONG, 'lượt một');
  bd = moLuot(bd, 'chương 2 · 23:11');
  bd = themChu(bd, 'lượt hai');

  render(<VanSong boDem={bd} dangChay />);

  expect(screen.getByText('lượt một')).toBeDefined();
  expect(screen.getByText('lượt hai')).toBeDefined();
});

test('vạch ngăn hiện nhãn của lượt, và lượt đầu KHÔNG có vạch', () => {
  let bd = themChu(BO_DEM_RONG, 'lượt một');
  bd = moLuot(bd, 'chương 2 · 23:11');
  bd = themChu(bd, 'lượt hai');

  const { container } = render(<VanSong boDem={bd} dangChay />);

  expect(screen.getByText('chương 2 · 23:11')).toBeDefined();
  // Hai lượt nhưng chỉ MỘT vạch: vạch là thứ ngăn giữa, không phải nhãn của mỗi khối.
  expect(container.querySelectorAll('.vach')).toHaveLength(1);
});

test('bộ đệm rỗng nói ra là chưa có gì, không để khung trắng', () => {
  render(<VanSong boDem={BO_DEM_RONG} dangChay />);
  expect(screen.getByText(/chưa có lượt nào/i)).toBeDefined();
});
```

- [ ] **Bước 3: Chạy → FAIL (không resolve `./VanSong`)**

- [ ] **Bước 4: Viết `VanSong.tsx`**

```tsx
'use client';

import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { BoDemVan } from '@/lib/vanSong';

/**
 * Khu VĂN SỐNG — chữ model đang sinh ra.
 *
 * # Vì sao chữ UI/mono chứ không phải serif
 *
 * ĐO ĐƯỢC trên `scripts/sample.gif` (255 khung): khu này KHÔNG phải văn truyện. Nó là đối số
 * JSON của lời gọi tool, danh mục khế ước tự đối chiếu có ✓, bảng kiểm chất lượng, và báo cáo
 * chương theo mục. Văn truyện đọc ở bề mặt Bản thảo — đó là chỗ DUY NHẤT nó xuất hiện, và ở
 * đó nó mới là serif khổ 70ch.
 *
 * Bản preview đầu tiên vẽ khu này thành khổ serif đang chảy văn. Sai, và sai theo kiểu tốn
 * kém: nó làm cả bố cục cột giữa được cân theo một thứ không tồn tại.
 *
 * # Vì sao vạch ngăn thay vì xóa
 *
 * TUI XÓA sạch khu này ở mỗi lượt vì terminal không cuộn lại được. Trình duyệt giỏi đúng chỗ
 * đó, nên vứt đi phần vừa đọc là bỏ phí. Trần giữ 3 lượt nằm ở `lib/vanSong.ts` cùng lý do.
 */
export function VanSong({
  boDem,
  dangChay,
}: {
  boDem: BoDemVan;
  dangChay: boolean;
}) {
  return (
    <section className="vansong" aria-label={CHU.mayDangNoi}>
      <div className="vshead">
        <h2>{dangChay ? CHU.mayDangNoi : CHU.mayNghi}</h2>
      </div>
      <div className="vsthan">
        {boDem.luot.length === 0 ? (
          <p className="vstrong">
            {dangChay ? GIAI_THICH.vanSongTrong : GIAI_THICH.vanSongNghi}
          </p>
        ) : (
          boDem.luot.map((l, i) => (
            <div className="luot" key={l.id}>
              {/* Lượt ĐẦU trong bộ đệm không có vạch kể cả khi nó mang nhãn: vạch là thứ
                  NGĂN GIỮA hai lượt. Vẽ một vạch trên cùng là khẳng định có một lượt phía
                  trên nó — mà lượt đó đã bị trần cắt mất, hoặc chưa từng có. */}
              {i > 0 && l.nhan ? (
                <div className="vach" role="separator">
                  <span>{l.nhan}</span>
                </div>
              ) : null}
              <pre className="chu">{l.chu}</pre>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
```

- [ ] **Bước 5: Chạy → 3 passed**

- [ ] **Bước 6: Commit**

```bash
git add web/components/VanSong.tsx web/components/VanSong.test.tsx web/lib/nhan.ts
git commit -m "feat(web): khu văn sống vẽ lượt và vạch ngăn"
```

---

### Task 8: Tự cuộn — dừng khi cuộn lên, nút "về cuối"

**Tệp:**
- Sửa: `web/components/VanSong.tsx`
- Sửa: `web/components/VanSong.test.tsx`

**Đã thăm dò trước, đừng dò lại** — ba giả định của các bài kiểm dưới đây đã được đo trên
chính cấu hình vitest này:

| Giả định | Đo được |
|---|---|
| jsdom có lưu `scrollTop` không | **CÓ** — gán 250 thì đọc lại được 250 |
| `fireEvent.scroll(el)` có kích hoạt `onScroll` của React không | **CÓ** — bộ đếm lên 1 |
| gán `el.scrollTop = el.scrollHeight` có ăn không | **CÓ** — đọc lại được 1000 |

`scrollHeight` và `clientHeight` thì KHÔNG: jsdom không bố cục nên cả hai luôn là 0, phải đặt
tay bằng `Object.defineProperty` — đó là việc của hàm `datCuon` dưới đây.

- [ ] **Bước 1: Viết bài kiểm đỏ (thêm vào cuối tệp test)**

```tsx
import { fireEvent } from '@testing-library/react';
import { CHU } from '@/lib/nhan';

/** jsdom không bố cục nên ba số cuộn đều là 0; đặt tay để mô phỏng một khu đã cuộn. */
function datCuon(el: HTMLElement, v: { top: number; height: number; client: number }) {
  Object.defineProperty(el, 'scrollHeight', { value: v.height, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: v.client, configurable: true });
  el.scrollTop = v.top;
}

test('đang bám đáy thì KHÔNG hiện nút về cuối', () => {
  let bd = themChu(BO_DEM_RONG, 'x');
  const { container } = render(<VanSong boDem={bd} dangChay />);
  const than = container.querySelector('.vsthan') as HTMLElement;

  datCuon(than, { top: 900, height: 1000, client: 100 });
  fireEvent.scroll(than);

  expect(screen.queryByRole('button', { name: CHU.veCuoi })).toBeNull();
});

test('cuộn lên thì hiện nút về cuối', () => {
  const bd = themChu(BO_DEM_RONG, 'x');
  const { container } = render(<VanSong boDem={bd} dangChay />);
  const than = container.querySelector('.vsthan') as HTMLElement;

  datCuon(than, { top: 100, height: 1000, client: 100 });
  fireEvent.scroll(than);

  expect(screen.getByRole('button', { name: CHU.veCuoi })).toBeDefined();
});

test('bấm về cuối thì cuộn xuống đáy và nút biến mất', () => {
  const bd = themChu(BO_DEM_RONG, 'x');
  const { container } = render(<VanSong boDem={bd} dangChay />);
  const than = container.querySelector('.vsthan') as HTMLElement;

  datCuon(than, { top: 100, height: 1000, client: 100 });
  fireEvent.scroll(than);
  fireEvent.click(screen.getByRole('button', { name: CHU.veCuoi }));

  expect(than.scrollTop).toBe(1000);
  expect(screen.queryByRole('button', { name: CHU.veCuoi })).toBeNull();
});

test('chữ mới KHÔNG kéo màn hình khi người dùng đã cuộn lên', () => {
  // Đây là bài canh quan trọng nhất của Task này: tự cuộn phải nhường người đọc. Không có nó
  // thì đọc lại một đoạn dài trong lúc engine đang phát là bất khả.
  let bd = themChu(BO_DEM_RONG, 'x');
  const { container, rerender } = render(<VanSong boDem={bd} dangChay />);
  const than = container.querySelector('.vsthan') as HTMLElement;

  datCuon(than, { top: 100, height: 1000, client: 100 });
  fireEvent.scroll(than);

  bd = themChu(bd, 'chữ mới tới');
  rerender(<VanSong boDem={bd} dangChay />);

  expect(than.scrollTop).toBe(100);
});
```

- [ ] **Bước 2: Chạy → FAIL (chưa có nút, chưa có hành vi cuộn)**

- [ ] **Bước 3: Sửa `VanSong.tsx`**

Thêm import `useCallback, useEffect, useRef, useState` từ `react` và `dangODay` từ
`@/lib/tuCuon`. Thân component:

```tsx
  const thanRef = useRef<HTMLDivElement>(null);
  const [bamDay, datBamDay] = useState(true);

  // Giữ trong ref VÀ trong state: effect dưới đọc ref (không muốn chạy lại mỗi lần đổi), còn
  // nút "về cuối" cần state để render lại.
  const bamDayRef = useRef(true);
  bamDayRef.current = bamDay;

  const theoCuon = useCallback(() => {
    const el = thanRef.current;
    if (!el) return;
    datBamDay(dangODay(el));
  }, []);

  const veCuoi = useCallback(() => {
    const el = thanRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    datBamDay(true);
  }, []);

  /**
   * Tự cuộn — nhưng CHỈ khi người đọc đang ở đáy.
   *
   * Tự cuộn là phép ĐO, không phải sở thích: chia khu chữ của `sample.gif` thành 8 dải ngang
   * thì bảy dải TRÊN cũng đổi 59–73 khung. Nếu chữ chỉ thêm ở dưới thì dải trên phải đứng im
   * — chúng không im, tức cả khối dịch lên.
   *
   * Nhường người đọc cũng là quyết định đã chốt: không dừng khi cuộn lên thì đọc lại một đoạn
   * dài trong lúc engine đang phát là bất khả — cứ mỗi mẩu 2ms là màn hình lại nhảy về đáy.
   */
  useEffect(() => {
    if (!bamDayRef.current) return;
    const el = thanRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [boDem]);
```

Gắn vào JSX: `<div className="vsthan" ref={thanRef} onScroll={theoCuon}>` và ngay sau khối
`.vsthan`:

```tsx
      {bamDay ? null : (
        <button type="button" className="vecuoi" onClick={veCuoi}>
          {CHU.veCuoi}
        </button>
      )}
```

- [ ] **Bước 4: Chạy → 7 passed**

- [ ] **Bước 5: Phép thử đột biến**

| # | Đột biến | Phải đỏ ở |
|---|---|---|
| 1 | bỏ `if (!bamDayRef.current) return;` trong effect | "chữ mới KHÔNG kéo màn hình" |
| 2 | `dangODay(el)` → `true` cố định | "cuộn lên thì hiện nút" |
| 3 | trong `veCuoi`, bỏ `datBamDay(true)` | "bấm về cuối thì nút biến mất" |

- [ ] **Bước 6: Commit**

```bash
git add web/components/VanSong.tsx web/components/VanSong.test.tsx
git commit -m "feat(web): tự cuộn khu văn sống, nhường người đang đọc lại"
```

---

### Task 9: Ca máy nghỉ — hiện báo cáo lượt cuối, không để khung trống

**Tệp:**
- Sửa: `web/components/VanSong.test.tsx`
- Sửa: `web/components/VanSong.tsx` (chỉ chữ giải thích + `aria`)

- [ ] **Bước 1: Viết bài kiểm đỏ**

```tsx
test('máy nghỉ mà bộ đệm CÒN chữ thì giữ nguyên chữ, chỉ đổi tiêu đề', () => {
  // Bộ đệm còn giữ báo cáo của lượt vừa xong. Xóa nó đi lúc engine đóng là vứt thứ duy nhất
  // đang nói được điều gì đó ở vị trí đắt nhất màn hình.
  const bd = themChu(BO_DEM_RONG, 'khế ước: ✓ 4/4 · 1.874 từ');
  render(<VanSong boDem={bd} dangChay={false} />);

  expect(screen.getByText('khế ước: ✓ 4/4 · 1.874 từ')).toBeDefined();
  expect(screen.getByRole('heading', { name: /máy đang nghỉ/i })).toBeDefined();
});

test('máy nghỉ và bộ đệm rỗng thì nói việc tiếp theo, không nói "chờ chữ"', () => {
  render(<VanSong boDem={BO_DEM_RONG} dangChay={false} />);
  expect(screen.getByText(/bấm chạy ở thanh dưới/i)).toBeDefined();
});
```

- [ ] **Bước 2: Chạy.** Bài đầu có thể XANH sẵn (Task 7 đã vẽ đúng); bài thứ hai đỏ nếu chữ
      `GIAI_THICH.vanSongNghi` chưa khớp. Ghi lại bài nào đỏ và vì sao — nếu **cả hai** xanh
      sẵn thì Task này không thêm phòng thủ nào, hãy nói ra điều đó thay vì giả vờ.

- [ ] **Bước 3: Sửa cho xanh** (chỉnh chữ trong `nhan.ts` nếu cần).

- [ ] **Bước 4: Commit**

```bash
git add web/components/VanSong.tsx web/components/VanSong.test.tsx web/lib/nhan.ts
git commit -m "test(web): canh ca máy nghỉ của khu văn sống"
```

---

## Cụm C — dải trạng thái (T10–T12)

### Task 10: Cây vai từ `depth`

**Tệp:**
- Tạo: `web/lib/vaiTro.ts`, `web/lib/vaiTro.test.ts`

- [ ] **Bước 1: Viết bài kiểm đỏ**

```ts
// web/lib/vaiTro.test.ts
import { expect, test } from 'vitest';

import type { Vai } from './types';
import { cayVai } from './vaiTro';

const v = (role: string, depth: number): Vai => ({ role, state: 'working', depth });

test('mọi vai cùng depth 0 đều là gốc', () => {
  const cay = cayVai([v('writer', 0), v('editor', 0)]);
  expect(cay).toHaveLength(2);
  expect(cay[0]!.con).toHaveLength(0);
});

test('vai depth 1 thành con của vai depth 0 ngay TRƯỚC nó', () => {
  const cay = cayVai([v('writer', 0), v('novel_context', 1), v('editor', 0)]);
  expect(cay).toHaveLength(2);
  expect(cay[0]!.vai.role).toBe('writer');
  expect(cay[0]!.con.map((c) => c.vai.role)).toEqual(['novel_context']);
  expect(cay[1]!.vai.role).toBe('editor');
});

test('cháu depth 2 gắn vào con depth 1 gần nhất', () => {
  const cay = cayVai([v('writer', 0), v('tool', 1), v('sub', 2)]);
  expect(cay[0]!.con[0]!.con.map((c) => c.vai.role)).toEqual(['sub']);
});

test('vai mồ côi (depth nhảy cóc, không có cha) vẫn được vẽ, KHÔNG bị nuốt', () => {
  // Nuốt im lặng một vai đang chạy là nói dối về việc máy đang làm gì. Thà vẽ nó ở gốc.
  const cay = cayVai([v('lac-loai', 3)]);
  expect(cay).toHaveLength(1);
  expect(cay[0]!.vai.role).toBe('lac-loai');
});

test('danh sách rỗng cho cây rỗng, không ném', () => {
  expect(cayVai([])).toEqual([]);
});
```

- [ ] **Bước 2: Chạy → FAIL**

- [ ] **Bước 3: Viết**

```ts
// web/lib/vaiTro.ts
import type { Vai } from './types';

/** Một nút trong cây vai. */
export interface NutVai {
  vai: Vai;
  con: NutVai[];
}

/**
 * Dựng cây vai từ danh sách PHẲNG có `depth`.
 *
 * Engine phát danh sách phẳng theo đúng thứ tự gọi, và `depth` là bậc lồng nhau — đúng cách
 * TUI vẽ (`writer → draft_chapter` rồi `└ writer → novel_context`). Web dựng lại cây từ hai
 * thứ đó chứ không tự suy quan hệ từ tên vai: suy từ tên là nhân bản logic của engine, đúng
 * thứ PRODUCT.md cấm, và nó sẽ lệch ngay lần engine đổi cách gọi lồng.
 *
 * Vai mồ côi (depth nhảy cóc mà không có cha ở bậc trên) được vẽ ở GỐC chứ không bị bỏ. Nuốt
 * im lặng một vai đang chạy là nói dối về việc máy đang làm.
 */
export function cayVai(vao: Vai[]): NutVai[] {
  const goc: NutVai[] = [];
  /** Nút gần nhất ở mỗi bậc, để tìm cha trong một lượt duyệt. */
  const ganNhat: (NutVai | undefined)[] = [];

  for (const vai of vao) {
    const nut: NutVai = { vai, con: [] };
    const bac = Math.max(0, vai.depth);

    let cha: NutVai | undefined;
    for (let b = bac - 1; b >= 0; b -= 1) {
      cha = ganNhat[b];
      if (cha) break;
    }

    if (cha) cha.con.push(nut);
    else goc.push(nut);

    ganNhat[bac] = nut;
    // Bậc sâu hơn của nhánh trước không còn là cha hợp lệ cho vai sau.
    ganNhat.length = bac + 1;
  }

  return goc;
}
```

- [ ] **Bước 4: Chạy → 5 passed**

- [ ] **Bước 5: Phép thử đột biến**

| # | Đột biến | Phải đỏ ở |
|---|---|---|
| 1 | bỏ `ganNhat.length = bac + 1;` | "vai depth 1 thành con của vai depth 0 ngay TRƯỚC nó" |
| 2 | `if (cha) … else goc.push` → `if (cha) … ` (bỏ else) | "vai mồ côi vẫn được vẽ" |

- [ ] **Bước 6: Commit**

```bash
git add web/lib/vaiTro.ts web/lib/vaiTro.test.ts
git commit -m "feat(web): dựng cây vai từ danh sách phẳng có depth"
```

---

### Task 11: `DaiTrangThai.tsx` — vai · việc tồn · ngữ cảnh, và ca `null`

**Tệp:**
- Tạo: `web/components/DaiTrangThai.tsx`, `web/components/DaiTrangThai.test.tsx`
- Sửa: `web/lib/nhan.ts`

- [ ] **Bước 1: Thêm nhãn vào `CHU`**

```ts
  vaiDangChay: 'đang chạy',
  vaiCho: 'chờ',
  vieccTon: 'việc tồn',
  nguCanh: 'ngữ cảnh',
  khongDoDuoc: 'không đo được',
```

và vào `GIAI_THICH`:

```ts
  truongSongNull:
    'Engine đang đóng nên studio không đo được giá trị này. Đây KHÁC với "đo được, bằng không".',
```

- [ ] **Bước 2: Viết bài kiểm đỏ**

```tsx
// web/components/DaiTrangThai.test.tsx
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import type { Snapshot } from '@/lib/types';

import { DaiTrangThai } from './DaiTrangThai';

/** Snapshot tối thiểu; chỉ đặt những trường dải này thật sự đọc. */
function snap(p: Partial<Snapshot>): Snapshot {
  return {
    book: {
      id: 'b', name: 'B', phase: 'writing', completed_chapters: 1, total_chapters: 3,
      total_words: 100, activity: 'running', cost_usd: 0, cost_per_chapter: 0,
      chapters_per_hour: 0, engine_open: true,
    },
    capabilities: {} as Snapshot['capabilities'],
    timeline: {} as Snapshot['timeline'],
    agents: null, idle_agents: null, advance: null, context: null,
    in_progress_chapter: null,
    chapters: [], transport: {} as Snapshot['transport'], queue_seq: 0,
    ...p,
  } as Snapshot;
}

test('vẽ cây vai với công cụ và số lượt', () => {
  render(
    <DaiTrangThai
      snapshot={snap({
        agents: [
          { role: 'writer', state: 'working', tool: 'draft_chapter', turn: 7, depth: 0 },
          { role: 'novel_context', state: 'working', depth: 1 },
        ],
        idle_agents: ['architect_long', 'editor'],
      })}
    />,
  );

  expect(screen.getByText(/writer/)).toBeDefined();
  expect(screen.getByText(/draft_chapter/)).toBeDefined();
  expect(screen.getByText(/7/)).toBeDefined();
  expect(screen.getByText(/architect_long/)).toBeDefined();
});

test('ngữ cảnh null hiện dấu KHÔNG ĐO ĐƯỢC, không phải thước 0%', () => {
  // Lớp lỗi đã đo ở dự án này: `null` bị đọc thành `0` và giao diện vẽ một thước 0% cho một
  // thứ không có nguồn. Hai điều đó nói hai chuyện khác nhau.
  const { container } = render(<DaiTrangThai snapshot={snap({ context: null })} />);

  expect(container.querySelector('.thuoc')).toBeNull();
  expect(screen.getByText(/không đo được/i)).toBeDefined();
});

test('ngữ cảnh đo được BẰNG 0 vẫn vẽ thước', () => {
  const { container } = render(
    <DaiTrangThai
      snapshot={snap({ context: { tokens: 0, window: 128000, percent: 0 } })}
    />,
  );
  expect(container.querySelector('.thuoc')).not.toBeNull();
});

test('không có vai nào thì nói ra, không để dải trống', () => {
  render(<DaiTrangThai snapshot={snap({ agents: [], idle_agents: [] })} />);
  expect(screen.getByText(/không đo được|chưa có vai/i)).toBeDefined();
});
```

- [ ] **Bước 3: Chạy → FAIL**

- [ ] **Bước 4: Viết `DaiTrangThai.tsx`**

Yêu cầu bắt buộc, viết đúng những điều này:

- Nhận đúng một prop: `snapshot: Snapshot`.
- Dựng cây bằng `cayVai(snapshot.agents ?? [])`; vẽ lồng bằng `<ul>`/`<li>` (cấu trúc thật,
  không phải thụt lề bằng khoảng trắng — trình đọc màn hình cần cây thật).
- Vai chờ: một dòng `chờ: a · b · c` từ `snapshot.idle_agents`.
- Việc tồn: `pending_steer` (nếu khác rỗng) và `rewrite_reason`.
- Ngữ cảnh: `snapshot.context === null` → chữ `CHU.khongDoDuoc` với `title={GIAI_THICH.truongSongNull}`;
  ngược lại → `<div className="thuoc">` với bề rộng theo `percent`, kèm `tokens/window`.
- **Mọi trường sống phải kiểm `=== null` TRƯỚC khi đọc**, không dùng `?? 0`.
- Chữ hiển thị lấy từ `CHU`/`GIAI_THICH`; tên vai và tên tool là DỮ LIỆU, giữ nguyên.

- [ ] **Bước 5: Chạy → 4 passed**

- [ ] **Bước 6: Phép thử đột biến**

| # | Đột biến | Phải đỏ ở |
|---|---|---|
| 1 | `snapshot.context === null ? … :` → `snapshot.context?.percent ?? 0` | "null hiện dấu KHÔNG ĐO ĐƯỢC" |
| 2 | `cayVai(agents)` → `agents.map(v => ({vai: v, con: []}))` | "vẽ cây vai" (mất lồng) |

- [ ] **Bước 7: Commit**

```bash
git add web/components/DaiTrangThai.tsx web/components/DaiTrangThai.test.tsx web/lib/nhan.ts
git commit -m "feat(web): dải trạng thái với cây vai và ngữ cảnh"
```

---

### Task 12: Luật đổi dải theo `dangChay`

**Tệp:**
- Tạo: `web/components/BuongLai.tsx` (khung tối thiểu), `web/components/BuongLai.test.tsx`

- [ ] **Bước 1: Viết bài kiểm đỏ**

```tsx
// web/components/BuongLai.test.tsx — chỉ canh LUẬT ĐỔI DẢI ở Task này
test('đang chạy → hiện dải trạng thái, KHÔNG hiện dải việc tiếp theo', () => { … });
test('máy nghỉ → hiện dải việc tiếp theo, KHÔNG hiện dải trạng thái', () => { … });
```

Dùng `container.querySelector('.daitrangthai')` và `.viectieptheo` để phân biệt. Người thi
hành viết đầy đủ hai bài này theo mẫu của Task 11 (hàm `snap` dùng lại được — tách nó ra
`web/components/mau.test-helper.ts` nếu cần dùng ở hai tệp).

- [ ] **Bước 2: Chạy → FAIL**

- [ ] **Bước 3: Viết khung `BuongLai.tsx`**

Ở Task này chỉ cần khung đủ để hai bài trên xanh: một `<div className="buonglai">` chứa
`{dangChay ? <DaiTrangThai …/> : <ViecTiepTheo …/>}`. Lưới ba cột đầy đủ ở Task 13.

Chú thích bắt buộc ghi vào tệp:

```
Vì sao đổi dải chứ không hiện cả hai: lúc máy nghỉ KHÔNG CÓ GÌ đang chảy để xem, và câu người
dùng mang theo lúc đó là "giờ tôi làm gì" — đúng câu `ViecTiepTheo` trả lời. Lúc máy chạy thì
ngược lại: câu là "nó đang làm gì", và một dải "việc tiếp theo" lúc đó là mời người dùng bấm
một nút thứ hai trong khi một lượt đang tiêu tiền.
```

- [ ] **Bước 4: Chạy → 2 passed**

- [ ] **Bước 5: Commit**

---

## Cụm D — vỏ, lưới, cột phải (T13–T16)

### Task 13: Lưới ba cột, tách khỏi `page.tsx`

**Tệp:**
- Sửa: `web/components/BuongLai.tsx`
- Sửa: `web/app/page.tsx`

- [ ] **Bước 1: Chuyển thân `Canvas` từ `page.tsx` sang `BuongLai.tsx`**

Giữ NGUYÊN mọi chú thích đang có trong `Canvas` — chúng ghi lý do của bộ lọc phạm vi, của
tiêu đề bảng, và của dải việc tiếp theo. `page.tsx` sau bước này chỉ còn định tuyến khu và
case `default` trả `<BuongLai …/>`.

- [ ] **Bước 2: Dựng lưới**

```
grid-template-columns: 194px minmax(0, 1fr) 312px;
grid-template-rows: auto 1fr;
areas: 'dai dai dai' / 'trai giua phai'
```

Cột giữa chia bốn hàng `auto 2fr 1fr auto`:
1. dải trục mảnh (`<Truc …/>`, ~30px)
2. `<VanSong …/>` — **2fr**
3. dòng sự kiện thu gọn — **1fr**
4. `<OCanThiep …/>` ghim đáy

Tỉ lệ 2:1 là phép ĐO, không phải cảm giác: khu chữ máy đổi **146/254 khung**, dòng sự kiện
đổi **5 lần** trong cùng 17,9 giây. Ghi con số đó vào chú thích cạnh `grid-template-rows`.

Bảng chương chi tiết + nhật ký phán quyết cuộn tiếp trong cột giữa, DƯỚI dòng sự kiện.

- [ ] **Bước 3: Cổng** — `npm test && npx tsc --noEmit && npm run build`

- [ ] **Bước 4: Commit**

---

### Task 14: CSS + hai điểm gãy

**Tệp:** `web/app/globals.css`

- [ ] Lưới buồng lái, `.vansong`, `.vsthan` (`overflow-y: auto`), `.vach`, `.vecuoi`,
      `.daitrangthai`, cây vai.
- [ ] `.chu` — `white-space: pre-wrap`, `font-family` mono, `overflow-wrap: anywhere`
      (một dòng JSON dài không được đẩy tràn ngang cả cột).
- [ ] `@media (max-width: 1240px)` — bỏ cột phải, giữ dải + cột giữa.
- [ ] `@media (max-width: 860px)` — dải xếp hai hàng.
- [ ] Màu: chỉ dùng token đang có. `--ink-3` là sàn cứng, không hạ. Một màu tín hiệu duy
      nhất (vàng) — luật 5 của `PRODUCT.md`.
- [ ] Kiểm: 0 tràn ngang ở 1440 và 390; tương phản AA cho mọi phần tử có chữ.

---

### Task 15: Cột phải hai chế độ

**Tệp:** `web/components/Inspector.tsx` + test

- [ ] Chưa chọn chương → **ngữ cảnh truyện**: chương `●▶○` · nhân vật · tiền đề.
- [ ] Đã chọn chương → chi tiết chương (ba tab hiện có) + nút `← danh sách` đặt lại về chế độ
      ngữ cảnh truyện.
- [ ] KHÔNG mở cột thứ tư.
- [ ] Bài kiểm: (a) không có `chuongChon` → thấy tiền đề, không thấy tab; (b) có `chuongChon`
      → thấy tab, thấy nút quay lại; (c) bấm nút quay lại → về chế độ ngữ cảnh.

Giữ nguyên chú thích hiện có về việc tab không dùng transition ẩn/hiện.

---

### Task 16: Cổng cuối + E2E trên cuốn THẬT

- [ ] `go build ./...` · `go vet ./...` · `gofmt -l` rỗng · `go test -count=1 ./...` → **30
      gói / 0 FAIL** (delta so nền, không phải "xanh hết")
- [ ] `cd web && npm test && npx tsc --noEmit && npm run build`
- [ ] Dựng binary mới, chạy `serve --web web/out` với `HOME` cách ly, mở một cuốn THẬT và chạy:

| # | Việc | Bằng chứng phải thu |
|---|---|---|
| 1 | mở cuốn đang chạy | chữ chảy mượt; đo khoảng cách giữa các lần DOM đổi, trung vị phải ở hàng chục ms chứ không phải 700ms |
| 2 | hai tab cùng lúc | cả hai đủ chữ, so byte |
| 3 | đóng tab mở lại giữa lượt | thấy CẢ đoạn đang chảy, không phải nửa cuối câu |
| 4 | cuộn lên | tự cuộn dừng; bấm "về cuối" thì chạy lại |
| 5 | dừng engine | khu văn sống giữ báo cáo lượt cuối, tiêu đề đổi sang "Máy đang nghỉ" |
| 6 | tải lại trang | URL giữ đúng `tp` + `ch` + `khu` |
| 7 | chụp 1440 + 390 | 0 tràn ngang |

**Không dùng `seed-demo`.** Nó đã hai lần để lỗi sống sót vì giàu hơn đường thật.

- [ ] Gộp về `feat/viet-hoa-i18n` bằng `--ff-only`, và **kiểm `git merge-base` trước khi
      gộp** — subagent commit trên base cũ làm rơi commit, đã đo được ở dự án này.
- [ ] Sau khi gộp, chạy LẠI toàn bộ cổng **trên cây đã gộp**. Cổng xanh trong worktree không
      chứng minh gì về cây đã gộp — đã đo: 0 FAIL trong worktree, 8 FAIL sau khi gộp.

---

## Nhật ký thi hành

Người thi hành ghi vào đây: kết quả phép thử đột biến từng cụm, lỗ hổng phát hiện được, và
mọi chỗ kế hoạch này SAI. Kế hoạch sai là chuyện bình thường; giấu chuyện đó mới không.
