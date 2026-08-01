# Buồng lái sản xuất + năm màn — kế hoạch chi tiết

Trạng thái: **chờ duyệt**. Preview: `web/out/preview.html` (không vào git).
Điểm neo: `scripts/novel.png` và `scripts/sample.gif` của upstream.

---

## 1. Vì sao làm

Người dùng nói ba câu, mỗi câu là một lớp lỗi khác nhau:

1. *"vào chẳng biết bắt đầu từ đâu… quá ngợp"* → đã sửa (commit `2e66bff`: đường vào +
   rail gọn + dải việc tiếp theo).
2. *"không biết luồng chạy như nào, rời rạc, bấm bắt đầu viết xong chả biết làm gì"* →
   đã sửa (commit `795acb2`: tạo xong tự đi tới bề mặt sản xuất, nói ra ba bước, bỏ ngõ
   chết "Mở máy", hai bề mặt tự chọn chương).
3. *"bố cục khi sản xuất khá ok"* (trỏ vào TUI) + *"ngoài ra còn quản lý sản phẩm"* →
   **tài liệu này**.

Cái còn thiếu không phải một tính năng. Nó là **cảm giác máy đang chạy**, và web mất nó
vì đã xé một màn hình TUI thành mười sáu bề mặt.

---

## 2. Những gì PHÉP ĐO đã chốt — không bàn lại

Đo trên `sample.gif`: 255 khung × 70ms = 17,9 giây. Mỗi vùng so từng khung với khung trước.

| Vùng | Khung đổi | Kết luận |
|---|---|---|
| Chữ máy phát (`生成内容`) | **146/254 · 57,5%** · mức 3,52 | thứ DUY NHẤT chạy liên tục |
| Con trỏ dòng nhập | 78/254 | chỉ là con trỏ nháy (ô hẹp đổi 78, phần còn lại 8) |
| Dòng sự kiện | 29/254 · 5 lần rời nhau | nhảy từng nấc, dồn ở 3 giây đầu rồi im 15 giây |
| Cột trái · cột phải · hai thanh | 0–3/254 ở ngưỡng thật | ĐỨNG IM trong lúc viết; chỉ đổi ở biên chương |

Ba hệ quả bắt buộc:

- **Khu chữ máy TỰ CUỘN.** Chia 8 dải ngang: bảy dải trên đổi 59–73 khung mức 7,1–8,8;
  dải cuối đổi 181 khung nhưng mức 1,83. Chỉ-thêm-ở-dưới thì dải trên phải im. Không im →
  cả khối dịch lên.
- **Tỉ lệ cột giữa là 2:1** (chữ máy : dòng sự kiện), không chia đều. 146 lần so với 5 lần.
- **`pollInterval = 700ms` của `events.go` chậm gấp 10 lần.** Nhịp thật: trung vị 70ms,
  94% khoảng cách ≤ 210ms. Đẩy văn sống qua vòng dò 700ms là biến dòng chảy thành cục nhảy.

Và một phát hiện sửa hướng: khu `生成内容` **không phải văn truyện**. Nó là đối số JSON của
lời gọi tool + danh mục khế ước tự đối chiếu có ✓ + bảng kiểm chất lượng + báo cáo chương.
Văn truyện đọc ở bề mặt đọc. Hai thứ khác nhau nên hai kiểu chữ khác nhau.

---

## 3. Phát hiện quyết định: KHÔNG phải sửa engine

`host.UISnapshot` (`internal/host/events.go:56`) đã mang **mọi** trường buồng lái cần:

| Cần cho | Trường đã có |
|---|---|
| cây vai + vai chờ | `Agents []AgentSnapshot{Name, State, TaskKind, Summary, Tool, Turn, Context}` |
| can thiệp đang chờ | `PendingSteer` |
| hàng chờ viết lại + lý do | `PendingRewrites []int`, `RewriteReason` |
| cửa nghiệm thu | `AdvanceMode`, `HasAdvanceHold`, `AdvanceHoldReason`, `AdvancePermitChapter` |
| "lần trước dừng ở đâu" | `RecoveryLabel` |
| ngữ cảnh | `ContextTokens`, `ContextWindow`, `ContextPercent`, `ContextScope`, `ContextStrategy` |
| chương đang soạn | `InProgressChapter` |
| tiền đề · nhân vật · phụ | `Premise`, `Characters`, `SupportingCount`, `RecentSupporting` |
| tập/cung hiện tại | `CurrentVolumeArc`, `NextVolumeTitle` |

`internal/serve/snapshot.go` hiện chỉ ánh xạ một phần nhỏ. **Toàn bộ đợt 1 là việc ánh
xạ, không phải việc engine.** Rủi ro thấp hơn hẳn so với ước lượng ban đầu.

Ngoại lệ duy nhất cần mã mới: văn sống, vì `Host.Stream()` là channel một-người-nhận.

---

## 4. Năm màn

| # | Màn | Trạng thái | Khu (`?khu=`) |
|---|---|---|---|
| 1 | **Xưởng** — quản lý tác phẩm | mới | `xuong` |
| 2 | **Buồng lái sản xuất** | dựng lại `dong-san-xuat` | `dong-san-xuat` |
| 3 | **Cửa nghiệm thu** | mới (dải trên buồng lái + nút ở Kiểm định) | `kiem-dinh` |
| 4 | Đọc bản thảo | giữ nguyên | `ban-thao` |
| 5 | Tác phẩm mới | đã xong hôm nay | `tac-pham-moi` |

Mười một khu còn lại không đụng tới.

### 4.1 Màn 1 · Xưởng

Bảng ba dòng (một dòng một tác phẩm): tên + mã, giai đoạn, tiến độ (số + thanh), số từ,
chi phí (tổng + $/chương), nhịp ch/giờ, sửa lần cuối, hành động.

- Dải tổng trên đầu: `N tác phẩm · N chương đã chốt · N từ · $N đã tiêu · N engine đang mở`.
  Tổng tiền cả xưởng hiện KHÔNG hiện ở đâu cả — đó là lỗ hổng chính của màn này.
- Hành động theo trạng thái, không hiện nút không làm được việc: `▶ Chạy tiếp` chỉ ở cuốn
  chưa xong; `Xuất bản` chỉ ở cuốn `complete`; `Mở` luôn có.
- Dòng của cuốn đang mở engine mang nền vàng nhạt + chữ "engine đang mở".
- Là bề mặt đáp khi URL không có `?tp=` và xưởng có > 1 tác phẩm. Có `?tp=` thì vẫn đáp
  vào buồng lái như hiện tại — người quay lại một cuốn không phải bấm thêm một nhịp.

### 4.2 Màn 2 · Buồng lái

```
grid-template-columns: 194px  minmax(0,1fr)  312px
grid-template-rows:    44px   auto  1fr  32px
areas: 'bar bar bar' / 'rail band band' / 'rail giua phai' / 'trans trans trans'
```

**Dải trạng thái** (= cột trái TUI, xoay ngang): máy · giai đoạn · tiến độ · **cây vai**
(`writer → draft_chapter · turn 7`, `└ writer → novel_context`, `chờ: architect_long ·
editor · arbiter`) · việc tồn (`PendingRewrites` + `PendingSteer`) · ngữ cảnh (thước + %).

**Cột giữa**, bốn hàng `auto 2fr 1fr auto`:
1. dải trục mảnh 30px (tập/cung/chương) — TUI không có, giữ vì cuốn 113 chương cần thấy hình.
2. **Máy đang nói gì** — văn sống, tự cuộn, chữ UI/mono, có ✓.
3. **Dòng sự kiện** — như hiện tại, thu gọn.
4. **Ô can thiệp GHIM đáy** — như dòng nhập của TUI.

Bảng chương chi tiết + nhật ký phán quyết: cuộn tiếp trong cột giữa, dưới dòng sự kiện.

**Cột phải**, hai chế độ:
- mặc định (ngữ cảnh truyện): chương `●▶○` · nhân vật · tiền đề.
- khi chọn một chương: chi tiết chương (ba tab Khế ước / Kiểm định / Bản thảo) + nút
  `← danh sách`. KHÔNG mở cột thứ tư.

**Dải "việc tiếp theo"** (`ViecTiepTheo`, vừa làm hôm nay) không bị bỏ: nó thay dải trạng
thái khi máy KHÔNG chạy. Luật: `dangChay` → dải trạng thái; ngược lại → dải việc tiếp theo.
Lý do: lúc máy nghỉ không có gì đang chảy để xem, còn câu cần trả lời là "giờ tôi làm gì".

### 4.3 Màn 3 · Cửa nghiệm thu

Khi `HasAdvanceHold`:
- huy hiệu `NGHIỆM THU · ĐANG CHỜ BẠN` ở thanh trên (mọi bề mặt, không chỉ buồng lái).
- dải amber trên đầu buồng lái: nói rõ đang chờ gì, kết luận Editor, và hai nút
  `Cho đi tiếp` / `Trả chương N về viết lại`.
- bề mặt Kiểm định: bản duyệt 7 chiều + danh sách vấn đề theo mức, cùng hai nút đó.

KHÔNG dùng modal. Modal chỉ dành cho `ask_user` — engine lúc đó chặn thật; ở cửa nghiệm thu
engine đứng chờ nhưng người dùng vẫn cần đọc bản thảo, xem chi phí, đối chiếu chương trước.

---

## 5. Các đợt làm

Mỗi đợt tự chạy được đầu-cuối và kiểm được riêng.

### Đợt 1 — Go: văn sống (đường dây mới duy nhất)

- `internal/serve/dong_van.go` — **đã viết**, build xanh, chưa ai đọc nên đang nằm im.
  Còn thiếu: cơ chế **đánh thức** thay vì dò. Thêm `cho chan struct{}` phát broadcast mỗi
  lần `them()`, để `handleEvents` chờ được trên nó.
- `internal/serve/events.go`:
  - tách hai nhịp: `ui_event` giữ dò 700ms (nó nhảy từng nấc, 5 lần/18 giây — dò là đủ);
    văn sống đi theo **đánh thức**, không dò.
  - lúc mới nối: gửi `stream_clear` rồi gửi cả `vongHienTai()` trong MỘT sự kiện — người
    vào giữa lượt phải thấy cả đoạn đang chảy, không phải nửa cuối một câu.
  - `event: stream_delta` với `data: {"text": "..."}`. Chữ đi trong `payload`, **không**
    trong `summary`: `congDoanTu()` ở web dựng "công đoạn" từ `summary`, nên nhồi văn vào
    đó sẽ làm transport hiện văn truyện ở ô công đoạn.
  - **KHÔNG đặt `id:`** cho sự kiện delta. `resumeSeq` đọc `Last-Event-ID` làm mốc hàng đợi;
    một seq của delta lọt vào đó sẽ làm client bỏ hoặc phát lại sự kiện ui.
- Bài kiểm (`dong_van_test.go`, `events_van_test.go`):
  1. sentinel `StreamClearSentinel` thành mục `Xoa`, ĐÚNG THỨ TỰ với chữ quanh nó;
  2. hàng đầy thì bỏ mục cũ nhất, `vong` bị cắt từ ĐẦU (phần cuối là phần đang đọc);
  3. **hai kết nối cùng lúc đều nhận đủ** — đây là lý do bộ đệm tồn tại;
  4. người vào muộn nhận `vong` hiện tại, không nhận lại các mẩu đã nằm trong đó;
  5. delta không mang `id:`.

**Cổng**: `go build` · `go vet` · `gofmt -l` rỗng · `go test ./...` 30 gói / 0 FAIL ·
`curl -N /events` trên cuốn đang chạy thấy `stream_delta` chảy.

### Đợt 2 — Go: ánh xạ phần còn thiếu của UISnapshot

`internal/serve/model.go` + `snapshot.go`, thêm vào `/studio`:

```jsonc
"agents": [{"role":"writer","state":"working","tool":"draft_chapter","turn":7,
            "task":"viết chương 2","depth":0}],
"idle_agents": ["architect_long","editor","arbiter"],
"pending_steer": "…",            // rỗng = không có
"rewrite_reason": "…",
"advance": {"mode":"review","permit_chapter":8,"hold":true,"hold_reason":"…"},
"recovery": "lần trước dừng ở cửa nghiệm thu",
"context": {"tokens":52400,"window":128000,"percent":41,"scope":"baseline","strategy":"light_trim"},
"in_progress_chapter": 2
```

`/api/workshop` thêm mỗi cuốn: `cost_usd`, `cost_per_chapter`, `chapters_per_hour`,
`updated_at`, `engine_open` — để màn 1 không phải gọi ba lượt `/studio`.

- Vai chờ suy theo ĐÚNG luật của TUI (`sidebarIdleAgents`, `panels_sidebar.go:19`). Bài
  kiểm phải so hai bên: web và TUI nói khác nhau về "ai đang chạy" là lớp lỗi tệ nhất ở
  đây, vì cả hai đều trông đáng tin.
- Mỗi trường một phép kiểm là nó ĐẾN TỪ `Host.Snapshot()`, không phải suy lại ở serve —
  suy lại là dựng bản sao thứ hai của sự thật, đúng thứ `PRODUCT.md` cấm.
- Ca engine ĐÓNG: `/studio` vẫn phải trả được (nó đọc store). Các trường sống trả `null`,
  và web phải phân biệt `null` với `0` — `0` nói "đo được, bằng không".

**Cổng**: như trên + `npx tsc --noEmit` sau khi cập nhật `web/lib/types.ts`.

### Đợt 3 — Web: màn 1 Xưởng

- `web/lib/khu.ts`: thêm `'xuong'`, vào `laKhuMucMay`, không dùng inspector.
- `web/components/Xuong.tsx` mới; `Rail.tsx` thêm mục đầu nhóm "Chung cho mọi tác phẩm".
- `useStudio`: khi không có `?tp=` và có > 1 tác phẩm thì khu mặc định là `xuong`.
  Dùng MỘT hành động ghi URL (bài học `moTacPhamVuaTao`: hai hành động trong một nhịp thì
  hành động sau còn đọc ref của nhịp cũ, và URL ghi sai).
- Nhãn mới qua `lib/nhan.ts`.

**Cổng**: `tsc` · `npm run build` · chụp 1440 + 390 · đo tương phản AA · 0 tràn ngang.

### Đợt 4 — Web: buồng lái

- `components/DaiTrangThai.tsx` — dải trạng thái + cây vai.
- `components/VanSong.tsx` — pane văn sống. Tự cuộn; **dừng tự cuộn khi người dùng cuộn
  lên**, hiện nút "về cuối" (câu hỏi mở #2 bên dưới).
- `lib/useStudio.ts` — nhận `stream_delta` / `stream_clear`, giữ văn của lượt hiện tại,
  cắt trần ~256KB phía client.
- `app/page.tsx` — lưới ba cột cho `dong-san-xuat`; ô can thiệp ra khỏi danh sách section
  và ghim đáy; bảng chương + nhật ký cuộn dưới dòng sự kiện.
- `components/Inspector.tsx` — hai chế độ (ngữ cảnh truyện ↔ chi tiết chương).
- `Truc.tsx` — thêm dạng thu gọn một dải.

**Cổng**: như đợt 3, cộng E2E trên cuốn đang chạy: thấy chữ chảy, thấy nó tự cuộn, cuộn
lên thì dừng, bấm "về cuối" thì chạy lại.

### Đợt 5 — Web: cửa nghiệm thu

- huy hiệu chế độ ở `ThanhTren` (đọc `advance.mode`), amber khi `hold`.
- `components/CuaNghiemThu.tsx`: dải quyết định, dùng ở cả buồng lái và Kiểm định.
- `KiemDinh.tsx`: thêm hai nút; nút "trả về viết lại" gọi `/steer` với câu nêu rõ lý do
  từ vấn đề mức `error` — không bịa câu, lấy nguyên văn mô tả của Editor.

**Cổng**: như trên + E2E: bật `/review`, chờ cửa, bấm cho đi tiếp, xác nhận engine đi tiếp.

### Đợt 6 — tài liệu + dọn

- `DESIGN.md`: lưới buồng lái, dải trạng thái, pane văn sống, luật đổi dải theo `dangChay`,
  luật hai chế độ cột phải.
- `PRODUCT.md`: điểm neo thêm "TUI gốc của upstream" cạnh bàn transport DAW. Ba câu về
  giọng công nghiệp KHÔNG đổi — bản này đi theo chúng, không đi ngược.
- `docs/CHOT.md`: ghi phần cố ý không làm (mục 7).
- Xóa `web/out/preview.html` (không vào git, nhưng đừng để nó lẫn vào bản export).

---

## 6. Kiểm chứng

Cổng mỗi đợt: `go build ./...` · `go vet ./...` · `gofmt -l` rỗng · `go test -count=1 ./...`
(nền **30 gói / 0 FAIL**) · `npx tsc --noEmit` 0 lỗi · `npm run build` exit 0.

E2E trên cuốn THẬT, không fixture (`seed-demo` đã hai lần cho lỗi sống sót vì giàu hơn
đường thật):

1. Mở cuốn đang chạy → thấy chữ máy chảy trong pane, nhịp mượt (không nhảy cục 0,7 giây).
2. Mở HAI tab cùng lúc → cả hai thấy đủ chữ, không tab nào mất mẩu. (Đây là ca mà thiết
   kế một-channel-một-người-nhận sẽ vỡ, nên nó phải được thử thật.)
3. Đóng tab, mở lại giữa lượt → thấy cả đoạn đang chảy, không phải nửa câu.
4. Cuộn lên trong pane → tự cuộn dừng; bấm "về cuối" → chạy lại.
5. Dừng engine → pane đổi sang báo cáo lượt vừa xong, không để khung trống.
6. Bật chế độ nghiệm thu, chạy tới cửa → huy hiệu amber, dải quyết định, hai nút hoạt động.
7. Màn Xưởng: tổng tiền khớp tổng ba cuốn; nút theo trạng thái đúng; mở cuốn khác thì cuốn
   cũ được đóng.
8. Tải lại trang ở mọi màn → URL giữ đúng chỗ (tp + ch + khu).

Giao diện: chụp 1440 và 390 cho cả năm màn; đo tương phản AA cho mọi phần tử có chữ (nền:
**0 vi phạm**); 0 tràn ngang ngoài hai chỗ cuộn có chủ ý (dải rail, bảng chương).

---

## 7. Cố ý KHÔNG làm

- **Bảng cache / token theo vai lên buồng lái.** Số cho người viết engine; về khu Chi phí.
- **配角生态 (sinh thái nhân vật phụ) thành khối riêng.** `SupportingCount` +
  `RecentSupporting` đủ cho một dòng trong khối Nhân vật; cột 312px không chứa hai danh
  sách người.
- **Bỏ rail.** TUI không có điều hướng vì nó dùng lệnh gạch chéo; web phải giữ mười một
  khu kia.
- **Bỏ trục tập/cung/chương.** TUI không có, nhưng nó là thứ duy nhất cho thấy hình dạng
  một cuốn 113 chương trong một cái nhìn.
- **Nhiều engine song song.** Vẫn `soToiDa = 1`.
- **Sửa `pollInterval` chung thành 150ms.** Chỉ văn sống cần nhanh; hạ cả vòng dò xuống là
  nghiền đĩa cho một dòng sự kiện nhảy 5 lần mỗi 18 giây.

---

## 8. Ba câu đã chốt

1. **Dưới 1240px**: bỏ cột phải (app đã làm thế với inspector), giữ dải trạng thái + cột
   giữa. Dưới 860px dải xếp hai hàng. — *người dùng duyệt 2026-08-01*
2. **Cuộn lên đọc lại thì DỪNG tự cuộn**, kèm nút nhỏ "về cuối". Không dừng thì đọc lại một
   đoạn dài là bất khả. — *người dùng duyệt 2026-08-01*
3. **Tự cuộn**: phép đo trên `sample.gif` đã trả lời (8 dải ngang đều đổi, không chỉ dải cuối).

Cách làm: **TDD** — bài kiểm trước, xác nhận nó đỏ vì đúng lý do, rồi mới viết phần đủ để
nó xanh. Thi hành bằng **subagent** cho từng đợt, mỗi đợt một worktree riêng.
— *người dùng chốt 2026-08-01*

---

## 9. Rủi ro

| Rủi ro | Hệ quả | Cách chặn |
|---|---|---|
| `Host.Stream()` là channel một-người-nhận | hai tab giành mẩu chữ của nhau, mỗi bên thấy nửa câu | một goroutine hút, mọi tab đọc lại từ bộ đệm — kèm bài kiểm hai kết nối |
| seq của delta lọt vào `Last-Event-ID` | client bỏ hoặc phát lại sự kiện ui | delta KHÔNG mang `id:`; có bài kiểm |
| văn sống nhồi vào `summary` | ô "công đoạn" ở transport hiện văn truyện | chữ đi trong `payload.text` |
| `vong` phình vô hạn nếu engine không phát lệnh xóa | RAM của process giữ cả engine | trần 512KB, cắt từ đầu |
| serve suy lại trạng thái vai thay vì lấy từ Host | web và TUI nói khác nhau về "ai đang chạy" | ánh xạ trực tiếp + bài kiểm so hai bên |
| dựng lại bề mặt lớn nhất | vỡ bề mặt đang dùng được | đợt 4 tách khỏi đợt 3; mỗi đợt build + chụp ảnh trước khi sang đợt sau |
