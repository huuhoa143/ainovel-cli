# Thiết kế: buồng lái sản xuất + năm màn của web studio

Ngày: 2026-08-01 · Trạng thái: **đã duyệt** · Thay thế: `docs/plans/2026-08-01-buong-lai-nam-man.md`
(tệp đó là bản nháp kế hoạch viết trước quy trình spec; các phép đo trong nó được đưa vào đây).

Điểm neo: `scripts/novel.png` và `scripts/sample.gif` của upstream.
Preview đã duyệt: `web/out/preview.html` (không vào git).

---

## 1. Vấn đề

Web studio có 16 bề mặt và làm được 20/20 việc mà TUI làm. Nhưng người dùng nói ba câu, và
câu thứ ba mới là câu về thiết kế:

1. *"vào chẳng biết bắt đầu từ đâu… quá ngợp"* → đã sửa, commit `2e66bff`.
2. *"bấm bắt đầu viết xong chả biết làm gì nữa luôn"* → đã sửa, commit `795acb2`.
3. *"bố cục khi sản xuất khá ok"* (trỏ vào TUI) + *"ngoài ra còn quản lý sản phẩm"*.

Cái thiếu không phải một tính năng. Nó là **cảm giác máy đang chạy**, và web mất nó vì đã xé
một màn hình TUI thành mười sáu bề mặt. Cộng thêm một lỗ hổng thật: **không có chỗ nào quản
lý nhiều tác phẩm** — tổng tiền đã tiêu cho cả xưởng hiện không hiện ở đâu cả.

## 2. Bằng chứng đo được — không bàn lại

Đo trên `sample.gif`: 255 khung × 70ms = 17,9 giây; mỗi vùng so từng khung với khung trước.

| Vùng | Khung đổi | Kết luận |
|---|---|---|
| Chữ máy phát (`生成内容`) | **146/254 · 57,5%** · mức 3,52 | thứ DUY NHẤT chạy liên tục |
| Con trỏ dòng nhập | 78/254 · mức 0,57 | chỉ là con trỏ nháy (ô hẹp đổi 78, phần còn lại của dòng 8) |
| Dòng sự kiện | 29/254 · 5 lần rời nhau | nhảy từng nấc, dồn ở 3 giây đầu rồi im 15 giây |
| Cột trái · cột phải · hai thanh | 0–3/254 ở ngưỡng thật | đứng im trong lúc viết; chỉ đổi ở biên chương |

Bốn hệ quả:

- **Khu chữ máy TỰ CUỘN.** Chia khu đó thành 8 dải ngang: bảy dải trên đổi 59–73 khung ở mức
  7,1–8,8; dải cuối đổi 181 khung nhưng mức chỉ 1,83. Nếu chữ chỉ thêm ở dưới thì dải trên
  phải đứng im — chúng không im, tức cả khối dịch lên.
- **Tỉ lệ cột giữa 2:1** (chữ máy : dòng sự kiện). 146 lần đổi so với 5 lần. Chia đều là chia
  theo cảm giác.
- **`pollInterval = 700ms` chậm gấp 10 lần.** Nhịp thật: trung vị **70ms**, 94% khoảng cách
  ≤ 210ms. Đẩy văn sống qua vòng dò 700ms là biến dòng chảy thành cục nhảy.
- **Khu `生成内容` KHÔNG phải văn truyện.** Nó là đối số JSON của lời gọi tool + danh mục khế
  ước tự đối chiếu có ✓ + bảng kiểm chất lượng + báo cáo chương theo mục. Văn truyện đọc ở bề
  mặt đọc. Hai thứ khác nhau → hai kiểu chữ khác nhau (preview đầu của tôi vẽ sai thành khổ
  serif đang chảy văn).

## 3. Phát hiện làm phạm vi nhỏ hẳn: không sửa engine

`host.UISnapshot` (`internal/host/events.go:56`) đã mang **mọi** trường buồng lái cần:

| Cần cho | Trường đã có |
|---|---|
| cây vai + vai chờ | `Agents []AgentSnapshot{Name, State, TaskKind, Summary, Tool, Turn, Context}` |
| can thiệp đang chờ | `PendingSteer` |
| hàng chờ viết lại + lý do | `PendingRewrites []int`, `RewriteReason` |
| cửa nghiệm thu | `AdvanceMode`, `HasAdvanceHold`, `AdvanceHoldReason`, `AdvancePermitChapter` |
| lần trước dừng ở đâu | `RecoveryLabel` |
| ngữ cảnh | `ContextTokens`, `ContextWindow`, `ContextPercent`, `ContextScope`, `ContextStrategy` |
| chương đang soạn | `InProgressChapter` |
| tiền đề · nhân vật · phụ | `Premise`, `Characters`, `SupportingCount`, `RecentSupporting` |
| tập/cung hiện tại | `CurrentVolumeArc`, `NextVolumeTitle` |

`internal/serve/snapshot.go` chỉ ánh xạ một phần nhỏ. **Phần Go của việc này gần như toàn bộ
là ánh xạ JSON.** Ngoại lệ duy nhất cần mã mới: văn sống, vì `Host.Stream()` là channel
một-người-nhận.

## 4. Quyết định đã chốt

| # | Quyết định | Vì sao | Ai chốt |
|---|---|---|---|
| 1 | **Một spec** cho cả năm màn, không chia bốn | người dùng chọn sau khi tôi nêu lo ngại về chỗ giáp ranh | người dùng, 2026-08-01 |
| 2 | Dưới **1240px** bỏ cột phải, giữ dải + cột giữa; dưới 860px dải xếp hai hàng | app đã làm đúng thế với inspector | người dùng |
| 3 | **Tự cuộn**; cuộn lên thì DỪNG tự cuộn, kèm nút "về cuối" | tự cuộn là phép đo; dừng-khi-cuộn-lên vì không dừng thì đọc lại một đoạn dài là bất khả | phép đo + người dùng |
| 4 | Màn Xưởng **KHÔNG có nút chạy**; dòng chỉ có "Mở" | một đường tiêu tiền duy nhất, ở transport (điểm neo DAW của `PRODUCT.md`). Hai nút cùng gọi `POST /run` thì trạng thái khóa-lúc-đang-gửi của chúng không thấy nhau → bấm cả hai là hai lượt chạy. Tệ hơn: tiêu tiền từ một màn người ta đang quét mắt | người dùng |
| 5 | Lệnh xóa lượt thành **vạch ngăn**, giữ **3 lượt gần nhất HOẶC 512KB, cái nào chạm trước thì thắng**, bỏ từ lượt cũ nhất | trình duyệt giỏi đúng cái terminal dở. Phải có cả hai trần: chỉ đếm lượt thì một lượt Writer bằng cả chương vẫn phình; chỉ đếm byte thì một lượt dài đẩy hết lượt trước ra và mất luôn vạch ngăn | người dùng |
| 6 | Trường sống vào **`/studio`**, không tách endpoint riêng | web đã nạp lại `/studio` mỗi lô sự kiện. Hai endpoint cùng mô tả một engine ở hai thời điểm lệch nhau là lớp lỗi "hai sự thật" | tôi |
| 7 | "Trả chương về viết lại" dùng **`/steer`** sẵn có | ở cửa nghiệm thu engine đang đứng nên `canThiep` chọn `Continue` — đúng nghĩa "đi tiếp, nhưng làm việc này". Route riêng là đưa quyết định phạm vi ảnh hưởng vào `serve`, tức nhân bản logic Arbiter mà `PRODUCT.md` cấm | tôi |
| 8 | Xưởng **không xóa/đổi tên** tác phẩm | xóa một cuốn là xóa hàng giờ chạy và hàng chục đô; để ở hệ tệp nơi thấy rõ mình đang phá cái gì | tôi |

## 5. Kiến trúc

Ba tầng, và ranh giới giữa chúng không đổi:

```
engine (host.Host, in-process)
   │  Snapshot() ─ 40+ trường sự thật sống
   │  Stream()   ─ channel string, MỘT người nhận
   ▼
serve (internal/serve)
   │  dongVan  ─ hút Stream() một lần, phát lại cho N kết nối
   │  snapshot ─ ánh xạ UISnapshot → JSON
   ▼
web (Next.js static export)
   useStudio ─ một nguồn state, SSE + fetch
```

### 5.1 Đơn vị mới duy nhất ở Go: `dongVan`

**Việc**: giữ chữ model đang sinh ra để nhiều kết nối SSE đọc lại được.
**Dùng thế nào**: `them(delta)` từ một goroutine hút; `sau(seq)` và `vongHienTai()` từ mỗi
kết nối; `hut(ch)` chạy một lần cho mỗi phiên engine.
**Phụ thuộc**: chỉ `host.StreamClearSentinel`. Không biết gì về HTTP.

Vì sao phải có nó: `Host.Stream()` là một channel Go, tức **một người nhận**. Mỗi mẩu chữ chỉ
đến đúng một chỗ đọc. Nếu mỗi kết nối SSE tự nhận thẳng thì hai tab trình duyệt **giành mẩu
của nhau** — mỗi bên thấy một nửa câu và không bên nào biết mình đang thiếu. Kể cả một tab
cũng vỡ: đóng rồi mở lại là mất trắng lượt đang chạy.

Ranh giới lượt phải đi **trong hàng**, không xử lý riêng: sentinel đi cùng channel với chữ để
giữ thứ tự, nên nếu tách nó ra thì một mẩu của lượt mới có thể vượt lên trước lệnh xóa của
lượt cũ, và giao diện xóa mất đúng phần vừa nhận.

### 5.2 Hai nhịp khác nhau ở SSE

| Loại | Cách đẩy | Vì sao |
|---|---|---|
| `ui_event` | giữ dò 700ms như hiện tại | nó nhảy 5 lần trong 18 giây; dò là đủ |
| `stream_delta` | **đánh thức** ngay khi có | nhịp thật 70ms; engine in-process nên chờ được trên tín hiệu, không cần dò |

Hạ vòng dò chung xuống 150ms là nghiền đĩa cho một dòng gần như im — không làm.

## 6. Hợp đồng API

### 6.1 `GET /api/books/{book}/studio` — thêm

```jsonc
{
  "agents": [                       // null khi engine đóng
    {"role":"writer","state":"working","tool":"draft_chapter","turn":7,
     "task":"viết chương 2","depth":0}
  ],
  "idle_agents": ["architect_long","editor","arbiter"],   // null khi engine đóng
  "pending_steer": "…",             // "" = không có; null = không biết (engine đóng)
  "rewrite_reason": "…",
  "advance": {                      // null khi engine đóng
    "mode":"review", "permit_chapter":8, "hold":true, "hold_reason":"…"
  },
  "recovery": "…",
  "context": {                      // null khi engine đóng HOẶC chưa đo được
    "tokens":52400,"window":128000,"percent":41,
    "scope":"baseline","strategy":"light_trim"
  },
  "in_progress_chapter": 2          // null khi không có chương nào đang soạn
}
```

**`null` KHÁC `0`.** Engine đóng thì các trường sống không đo được → `null`. `0` nói "đo được,
bằng không", và giao diện sẽ vẽ một thước ngữ cảnh 0% thay vì vẽ dấu "không có nguồn". Đây là
lớp lỗi đã đo được ở dự án này một lần: một kiểu TypeScript **nói dối** về payload (khai
`LaneBlock[]` cho trường server trả `null`) làm `tsc` xanh trong khi renderer SẬP ở bề mặt
mặc định.

### 6.2 `GET /api/workshop` — thêm cho mỗi cuốn

```jsonc
{"cost_usd":1.91,"cost_per_chapter":1.912,"chapters_per_hour":4.4,
 "updated_at":"2026-07-31T16:11:20Z","engine_open":true}
```

Không có chúng thì màn Xưởng phải gọi `/studio` một lượt cho mỗi cuốn.

### 6.3 `GET /api/books/{book}/events` — thêm hai loại sự kiện

```
event: stream_delta
data: {"text":"…"}

event: stream_clear
data: {}
```

Ba luật cứng:

1. **KHÔNG đặt `id:`** cho hai loại này. `resumeSeq` đọc `Last-Event-ID` làm mốc hàng đợi
   `ui_event`; một seq của delta lọt vào đó làm client bỏ hoặc phát lại sự kiện ui.
2. **Chữ đi trong `data.text`, KHÔNG trong `summary`.** `congDoanTu()`
   (`web/lib/useStudio.ts`) dựng nhãn "công đoạn" từ `ev.summary` — nhồi văn vào đó thì ô công
   đoạn ở thanh transport hiện văn truyện.
3. **Lúc mới nối**: gửi `stream_clear` rồi gửi cả `vongHienTai()` trong MỘT `stream_delta`.
   Người vào giữa lượt phải thấy cả đoạn đang chảy, không phải nửa cuối một câu.

### 6.4 Route đã có, dùng lại nguyên trạng

`POST /advance` (cho đi tiếp) · `POST /steer` (trả về viết lại, gửi nguyên văn mô tả lỗi của
Editor) · `POST /run` · `POST /abort` · `PUT /advance-mode`.

## 7. Năm màn

### 7.1 Màn 1 · Xưởng — `?khu=xuong` (mới)

**Mục đích**: trả lời "tôi đang có những gì, và đã tiêu bao nhiêu".

Dải tổng: `N tác phẩm · N chương đã chốt · N từ · $N đã tiêu · N engine đang mở`.
Bảng, một dòng một cuốn: tên + mã · giai đoạn · tiến độ (số + thanh) · số từ · chi phí (tổng
+ $/chương) · nhịp ch/giờ · sửa lần cuối · hành động.

- Hành động: **chỉ `Mở`** (mọi cuốn) và `Đọc` / `Xuất bản` (cuốn đã hoàn thành). Không nút chạy.
- Dòng của cuốn đang mở engine: nền vàng nhạt + chữ "engine đang mở".
- Bề mặt đáp: có `?tp=` → buồng lái (người quay lại một cuốn không phải bấm thêm nhịp);
  không có `?tp=` và xưởng có **≥ 2** tác phẩm → Xưởng; không có `?tp=` và xưởng có **đúng 1**
  tác phẩm → buồng lái của cuốn đó, vì lúc đó một bảng một dòng không quyết định gì.
- Rỗng: xưởng chưa có cuốn nào → không vẽ bảng rỗng, dẫn thẳng sang Tác phẩm mới (đã có).

### 7.2 Màn 2 · Buồng lái — `?khu=dong-san-xuat` (dựng lại)

```
grid-template-columns: 194px  minmax(0,1fr)  312px
grid-template-rows:    44px   auto  1fr  32px
areas: 'bar bar bar' / 'rail band band' / 'rail giua phai' / 'trans trans trans'
```

**Dải trạng thái** (= cột trái TUI, xoay ngang): máy · giai đoạn · tiến độ · cây vai
(`writer → draft_chapter · turn 7`, `└ writer → novel_context`, `chờ: architect_long ·
editor · arbiter`) · việc tồn (`pending_rewrites` + `pending_steer`) · ngữ cảnh (thước + %).

**Cột giữa**, bốn hàng `auto 2fr 1fr auto`:

1. dải trục mảnh ~30px (tập/cung/chương). TUI không có; giữ vì cuốn 113 chương cần thấy hình
   dạng cả cuốn trong một cái nhìn.
2. **Máy đang nói gì** — văn sống. Chữ UI/mono, có ✓. Tự cuộn; cuộn lên thì dừng + nút "về
   cuối". Lượt mới → vạch ngăn có nhãn (`— chương 2 · 23:11 —`).

   Hai trần ở hai phía, đừng lẫn: **server** giữ đúng LƯỢT HIỆN TẠI, trần 512KB, cắt từ đầu
   (nó chỉ cần đủ cho người vào muộn). **Client** giữ 3 lượt gần nhất hoặc 512KB tổng, cái nào
   chạm trước thì bỏ từ lượt cũ nhất.
3. **Dòng sự kiện** — như hiện tại, thu gọn.
4. **Ô can thiệp ghim đáy** — như dòng nhập của TUI.

Bảng chương chi tiết + nhật ký phán quyết: cuộn tiếp trong cột giữa, dưới dòng sự kiện.

**Cột phải**, hai chế độ:
- mặc định (ngữ cảnh truyện): chương `●▶○` · nhân vật · tiền đề.
- khi chọn một chương: chi tiết chương (ba tab Khế ước / Kiểm định / Bản thảo) + nút
  `← danh sách`. Không mở cột thứ tư.

**Luật đổi dải**: `dangChay` → dải trạng thái; ngược lại → dải "việc tiếp theo" (`ViecTiepTheo`,
đã có). Lý do: lúc máy nghỉ không có gì đang chảy để xem, câu cần trả lời là "giờ tôi làm gì".

**Khi máy nghỉ, khu văn sống hiện gì**: báo cáo cuối của lượt vừa xong (khế ước ✓ + số từ +
kết luận Editor) — vẫn là chữ thật, thay vì để một khung trống ở vị trí đắt nhất.

### 7.3 Màn 3 · Cửa nghiệm thu — `?khu=kiem-dinh` + dải trên buồng lái (mới)

Khi `advance.hold`:
- huy hiệu `NGHIỆM THU · ĐANG CHỜ BẠN` ở thanh trên, **mọi bề mặt** (không chỉ buồng lái).
- dải amber trên đầu buồng lái: đang chờ gì, kết luận Editor, hai nút `Cho đi tiếp` /
  `Trả chương N về viết lại`.
- bề mặt Kiểm định: bản duyệt 7 chiều + danh sách vấn đề theo mức, cùng hai nút đó.

**Không dùng modal.** Modal chỉ dành cho `ask_user` — lúc đó engine chặn thật. Ở cửa nghiệm
thu engine đứng chờ nhưng người dùng vẫn cần đọc bản thảo, xem chi phí, đối chiếu chương trước.

### 7.4 Màn 4 · Đọc bản thảo — không đổi

Serif, khổ 70ch, dòng 1.8. Đây là chỗ duy nhất văn truyện xuất hiện.

### 7.5 Màn 5 · Tác phẩm mới — đã xong (commit `795acb2`)

Ba bước nói trước khi bấm; dòng chờ nói ra Arbiter đang làm gì trong 10–20 giây im lặng.

## 8. Luồng dùng đầu-cuối

```
mở app
 ├─ chưa có khóa API      → Cấu hình máy (đã có)
 ├─ xưởng rỗng            → Tác phẩm mới (đã có)
 ├─ không ?tp= , >1 cuốn  → MÀN 1 Xưởng            ← mới
 └─ có ?tp=               → MÀN 2 Buồng lái

Tác phẩm mới → (Arbiter 10–20s, có dòng chờ) → tự đi tới MÀN 2
MÀN 2 khi chạy   : xem văn sống chảy · can thiệp ở ô ghim đáy
MÀN 2 khi nghỉ   : dải "việc tiếp theo" → Đọc chương / Chạy tiếp ở transport
chế độ nghiệm thu: engine dừng ở biên → MÀN 3 → Cho đi tiếp | Trả về viết lại
xong             → Đọc (MÀN 4) → Xuất bản
```

## 9. Xử lý lỗi và ca biên

| Ca | Xử lý |
|---|---|
| engine ĐÓNG | `/studio` vẫn 200 (đọc store); trường sống `null`; dải trạng thái nhường chỗ cho dải việc tiếp theo; khu văn sống hiện báo cáo lượt cuối |
| mất SSE | huy hiệu "mất kết nối" (đã có); nối lại thì `stream_clear` + cả lượt hiện tại được gửi lại |
| **hai tab cùng xem** | cả hai nhận đủ chữ — đây là lý do `dongVan` tồn tại, và nó phải có bài kiểm |
| engine sập giữa lượt | `theoDoi` có `recover`; HTTP còn sống và HIỆN lỗi thật, không làm dịu |
| bộ đệm phình (engine không phát lệnh xóa) | trần 512KB, cắt từ ĐẦU — phần cuối là phần đang đọc |
| người dùng cuộn lên đọc lại | dừng tự cuộn + nút "về cuối" |
| cuốn không phân tầng | dải trục chỉ có lane chương; `timeline.volumes` là `null` và kiểu TS phải khai `| null` |
| chưa chọn chương ở cột phải | chế độ ngữ cảnh truyện, không phải panel rỗng |

## 10. Kiểm thử — TDD, bài kiểm trước

Mỗi bài phải **đỏ trước** vì đúng lý do nó canh, rồi mới viết phần đủ để nó xanh.

### 10.1 Go · `dongVan`

1. sentinel thành mục `Xoa` **đúng thứ tự** với chữ quanh nó (canh việc xử lý sentinel ngoài hàng)
2. hàng đầy → bỏ mục cũ nhất; `vong` vượt trần → cắt từ đầu
3. **hai người đọc độc lập đều nhận đủ** chuỗi mẩu
4. người vào muộn nhận cả lượt hiện tại, **không lặp** mẩu đã nằm trong đó
5. `hut` kết thúc khi channel đóng, không rò goroutine

### 10.2 Go · SSE

6. khung `stream_delta` **không có `id:`**
7. chữ ở `data.text`, `summary` rỗng
8. lúc nối: `stream_clear` rồi một `stream_delta` mang cả lượt
9. `s.may == nil` (chế độ chỉ đọc) và engine chưa mở → `/events` vẫn chạy, không delta nào
10. `ui_event` vẫn giữ nhịp dò cũ (canh việc ai đó "tối ưu" nhầm cả hai về một nhịp)

### 10.3 Go · ánh xạ

11. engine đóng → trường sống là `null` trong JSON **thô** (`map[string]json.RawMessage`),
    không phải zero value. Giải vào struct sẽ biến `null` thành 0 và bài kiểm mất đúng thứ nó đo.
12. `idle_agents` khớp luật của TUI (`sidebarIdleAgents`) trên cùng một `[]AgentSnapshot`
13. mọi trường đi xuyên từ `Host.Snapshot()`, serve không tự tính
14. `/workshop` có đủ 5 trường mới cho mỗi cuốn

### 10.4 Web

15. một bộ canh QUÉT NGUỒN `web/lib/types.ts` đòi các trường sống phải khai `| null`, theo
    đúng tiền lệ `TestNhanDlPhaiQuaTuDien` (một test Go quét tệp nguồn của web, vì `web/` cố ý
    không có bộ chạy test). Không viết "tsc phải đỏ" thành bài kiểm: `tsc` không tự khẳng định
    thất bại của chính nó được, nên câu đó là một bài kiểm không chạy
16. dải đổi theo `dangChay` (dải trạng thái ↔ dải việc tiếp theo)
17. tự cuộn dừng khi cuộn lên, chạy lại khi bấm "về cuối"
18. vạch ngăn xuất hiện đúng chỗ khi nhận `stream_clear`, chữ lượt trước không mất

### 10.5 E2E trên cuốn THẬT (không fixture)

`seed-demo` đã hai lần cho lỗi sống sót vì giàu hơn đường thật.

1. mở cuốn đang chạy → chữ chảy mượt, không nhảy cục 0,7 giây
2. **hai tab cùng lúc** → cả hai đủ chữ
3. đóng tab mở lại giữa lượt → thấy cả đoạn đang chảy
4. cuộn lên → dừng; "về cuối" → chạy lại
5. dừng engine → khu văn sống đổi sang báo cáo lượt cuối
6. bật nghiệm thu, chạy tới cửa → huy hiệu amber, hai nút hoạt động
7. Xưởng: tổng tiền khớp tổng ba cuốn; mở cuốn khác thì cuốn cũ được đóng
8. tải lại trang ở mọi màn → URL giữ đúng `tp` + `ch` + `khu`

**Cổng mỗi đợt**: `go build ./...` · `go vet ./...` · `gofmt -l` rỗng ·
`go test -count=1 ./...` (nền **30 gói / 0 FAIL**) · `npx tsc --noEmit` 0 lỗi ·
`npm run build` exit 0 · chụp 1440 + 390 · đo tương phản AA (nền: 0 vi phạm) · 0 tràn ngang.

## 11. Ranh giới component

Mỗi tệp một việc; tệp phình là dấu hiệu nó làm quá nhiều việc.

| Tệp | Việc | Trạng thái |
|---|---|---|
| `internal/serve/dong_van.go` | bộ đệm văn sống, không biết HTTP | có bản nháp, chưa có bài kiểm |
| `internal/serve/events.go` | SSE: hai nhịp, hai loại sự kiện | sửa |
| `internal/serve/snapshot.go` + `model.go` | ánh xạ `UISnapshot` → JSON | sửa |
| `web/components/Xuong.tsx` | bảng quản lý tác phẩm | mới |
| `web/components/DaiTrangThai.tsx` | dải trạng thái + cây vai | mới |
| `web/components/VanSong.tsx` | pane văn sống + tự cuộn + vạch ngăn | mới |
| `web/components/CuaNghiemThu.tsx` | dải quyết định, dùng ở 2 chỗ | mới |
| `web/lib/useStudio.ts` | nhận `stream_delta`/`stream_clear`, giữ ~3 lượt | sửa |
| `web/components/Inspector.tsx` | hai chế độ cột phải | sửa |
| `web/app/page.tsx` | lưới ba cột cho buồng lái | sửa |

`page.tsx` đang 470+ dòng và sẽ phình thêm. Trong phạm vi việc này: tách phần dựng buồng lái
ra `components/BuongLai.tsx` để `page.tsx` chỉ còn định tuyến khu. Không refactor gì khác.

## 12. Cố ý không làm

- **Bảng cache / token theo vai lên buồng lái** — số cho người viết engine; về khu Chi phí.
- **配角生态 thành khối riêng** — `SupportingCount` + `RecentSupporting` đủ cho một dòng.
- **Bỏ rail** — TUI không có điều hướng vì nó dùng lệnh gạch chéo; web phải giữ 11 khu kia.
- **Bỏ trục tập/cung/chương** — thứ duy nhất cho thấy hình dạng cuốn 113 chương.
- **Nhiều engine song song** — vẫn `soToiDa = 1`.
- **Hạ `pollInterval` chung xuống 150ms** — nghiền đĩa cho một dòng gần như im.
- **Xóa/đổi tên tác phẩm ở Xưởng** — hành vi phá hoại, để ở hệ tệp.
- **Sửa `p.ChapterWordCounts` lệch 5 từ** — đã trong việc tồn của `docs/CHOT.md`.

## 13. Rủi ro

| Rủi ro | Hệ quả | Cách chặn |
|---|---|---|
| `Host.Stream()` một-người-nhận | hai tab giành mẩu, mỗi bên nửa câu | một goroutine hút + bài kiểm hai người đọc |
| seq delta lọt vào `Last-Event-ID` | client bỏ hoặc phát lại sự kiện ui | delta không mang `id:` + bài kiểm |
| văn sống nhồi vào `summary` | ô "công đoạn" ở transport hiện văn truyện | chữ ở `data.text` + bài kiểm |
| `null` bị ánh xạ thành `0` | thước ngữ cảnh 0% cho một thứ không đo được | bài kiểm đọc JSON thô |
| serve suy lại trạng thái vai | web và TUI nói khác nhau về "ai đang chạy", cả hai đều trông đáng tin | ánh xạ trực tiếp + bài kiểm so hai bên |
| dựng lại bề mặt lớn nhất | vỡ bề mặt đang dùng được | tách đợt; mỗi đợt build + chụp ảnh trước khi sang đợt sau |
| subagent commit trên base cũ | commit rơi lúc merge | kiểm `git merge-base` từng worktree trước khi merge; đã đo được trong dự án này |
