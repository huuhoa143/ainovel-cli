# Soát chữ ĐÃ GHÉP — chạy phần mềm ở locale vi rồi đọc output

**Ảnh chụp**: 2026-07-31 09:02–09:25 +07. Build từ HEAD lúc soát (`ainovel-cli v0.7.5-0.20260731004243-2b356870d788`).
**Chế độ**: chỉ đo. Không sửa tệp nào ngoài báo cáo này. Không lệnh git ghi. Không sửa gì trong `internal/e2e/`.
**Đã đọc trước**: `docs/audit/proof-vietnamese.md` (cả 3 lượt). Mọi phát hiện dưới đây được đối chiếu với báo cáo đó;
chỗ nào trùng thì nói rõ là **xác nhận sống** hay **phát hiện mới**.

> **Lưu ý về số dòng**: `internal/i18n/locales/vi.json` đang bị agent khác sửa trong lúc tôi soát. Tôi trích dẫn
> **msgid** (khóa, ổn định) trước, số dòng chỉ là thông tin phụ theo ảnh chụp trên.

---

---

## TRẠNG THÁI SỬA (cập nhật 2026-07-31, lượt sửa sau lượt đo)

| Mục | Trạng thái | Sửa ở đâu |
|---|---|---|
| §1 mất chữ ở mối ngắt dòng | **ĐÃ SỬA** (lead, `d3a8c02`) — bề rộng gom về một hàm `eventContentWidth()`; nghiệm thu bằng phép GHÉP LẠI, hoàn nguyên thì 5/7 bề rộng đỏ | `model.go` |
| §2 `Khôi phục sáng tác: Khôi phục:` | **ĐÃ SỬA** (lead) — `恢复创作: ` → `Tiếp tục sáng tác — ` | `vi.json` |
| §3 `hàng đợi Gia công` hoa giữa câu | **ĐÃ SỬA** (lead, `dd51053`) — dịch CẢ CÂU cho từng luồng | `vi.json` |
| §4 `Chờ khôi phục Chờ khôi phục:` | **ĐÃ SỬA** — bỏ tiền tố trùng nhãn khỏi 2 giá trị `待恢复：…`; thêm hạn mức 2 dòng nên giá trị không còn bị cắt `...` | `vi.json`, `panels_sidebar.go` |
| §5 tiêu đề `Trợ giúp lệnh` hai lần | **ĐÃ SỬA** — bỏ tiêu đề trong thân, giữ ở viền khung | `command_help.go` |
| §6 ngắt giữa âm tiết + chỗ giữ hai ngôn ngữ | **ĐÃ SỬA** — `wrapText` ngắt ở BIÊN TỪ (lớp fix, không phải ca lẻ); chỗ giữ về một token: `<guide>`, `[direction]` | `report.go`, `vi.json` |
| §7 `Usage:` / `alias:` tiếng Anh hardcode | **ĐÃ SỬA** — `i18n.F("用法：")` / `i18n.F("别名：")` theo đúng quy ước `用法：` repo đã có | `command_help.go`, `command_palette.go`, `vi.json` |
| §8 cột giá trị so le + tràn vào cột nhãn | **ĐÃ SỬA** — dòng tiếp THỤT VÀO (lớp fix cho cả 9/27 nhãn vượt cột); `运行态` → `Trạng thái` (10 cột, thẳng hàng) | `panels_sidebar.go`, `vi.json` |
| §9 đường dẫn bị xé hai dòng | **ĐÃ SỬA** — nhãn và đường dẫn ở hai dòng riêng | `command_config.go` |
| §10 lớp 4 (văn dịch: `thời gian thực`/`tiêm`/`nhập bất kỳ`…) | **CHƯA SỬA** — không nằm trong phạm vi lượt sửa này, để nguyên có chủ đích | — |
| §11 lớp 1 + 6 | **SỬA MỘT PHẦN** — xem bảng chi tiết dưới | |
| §12 bề rộng tối thiểu | **KHÔNG SỬA, theo yêu cầu** — đây là quyết định sản phẩm. Đo lại: xem dưới | — |

### §11 chi tiết

| Mục | Trạng thái |
|---|---|
| a. `eval` hoa / `serve` thường trong cùng `--help` | **ĐÃ SỬA** — hạ 8 mô tả cờ `eval` về chữ thường (đúng quy ước Go, và khớp `serve` vốn không sửa được vì thuộc agent khác) |
| b. `Test kết nối` | **ĐÃ SỬA** → `Thử kết nối` (11 cột, vẫn thẳng cột giá trị 14) |
| c. `Esc xóa input` | **ĐÃ SỬA** → `Esc xóa ô nhập` (3 msgid) |
| d. `Provider` / `model` hoa-thường | **KHÔNG SỬA — đo rồi quyết định không sửa.** Đếm toàn catalog: `Provider` 12 / `provider` 15, `Model` 19 / `model` 51. Lệch trải trên ~97 chỗ và **nhiều chỗ hoa là hoa ĐẦU CÂU, đúng**. Chuẩn hóa mù sẽ tạo lỗi mới; cần một lượt soát từng chỗ, là việc riêng |
| e. `AI-Powered Novel Creation Engine` | **KHÔNG SỬA** — câu tagline dưới logo, thuộc nhận diện sản phẩm. Cùng loại quyết định với §12, để lead quyết |
| f. `vui lòng` → `hãy` | **ĐÃ SỬA** 2 chỗ đã bắt được trên màn (cổng bề rộng terminal; lỗi headless). 14 chỗ `vui lòng` còn lại chưa soát từng chỗ |
| g. `Usage of serve:` / `flag provided but not defined:` / `(default -1)` | **KHÔNG SỬA ĐƯỢC** — chuỗi của Go stdlib, không thuộc catalog |

### §12 đo lại ở bề rộng tối thiểu (100 cột), sau khi sửa

| Dòng | Rộng | Dư |
|---|---|---|
| `<> Can thiệp thời gian thực  Điều chỉnh hướng đi cốt truyện bất kỳ lúc nào trong quá trình sáng tác` | 99 | **1 cột** |
| `Tab chuyển chế độ · Chế độ bắt đầu nhanh nhấn Enter để sáng tác · Chế độ đồng sáng tác nhấn Enter để` | 100 | **0 cột** (đã xuống dòng) |

Bản Trung của dòng đầu (`<> 实时干预  创作过程中随时调整剧情走向`) chỉ **39 cột** → tỉ lệ **2,54×**, cao nhất đo được
trong repo. **Đề xuất cho lead** (không tự làm): hoặc nâng cổng bề rộng tối thiểu 100 → 104, hoặc rút bản dịch
(`Can thiệp thời gian thực` → `Can thiệp tức thời`, bớt 8 cột). Thêm một chữ vào một trong hai msgid của dòng đó
là dòng bị cắt ở đúng bề rộng mà app tự cho phép.

### Cửa kiểm sau khi sửa

`go build ./...` sạch · `go vet ./...` sạch · `go test -count=1 ./...` = **30 gói ok, 0 FAIL** (y như mốc trước khi sửa).

Hai bản sửa lớp (§6, §8) đều có hồi quy **và đã kiểm chiều đỏ**: hoàn nguyên `wrapText` về ngắt-theo-ký-tự →
`TestWrapTextKhongXeGiuaTu` đỏ; bỏ phần thụt dòng tiếp → `TestSidebarDongTiepPhaiThutVao` đỏ, báo đúng hai dòng
bị hiểu thành nhãn. `TestWrapTextVanNgatCungChuHan` giữ đường tiếng Trung (không có khoảng trắng → vẫn ngắt cứng,
không mất chữ).

---

## 0. Số liệu thu được — con số quyết định giá trị báo cáo

| Đường thu | Thực hiện | Chuỗi ghép thu được (đoạn phân biệt) |
|---|---|---|
| **1. Headless + LLM giả** (`internal/e2e`, `-count=1 -v`) | ✅ 13/13 test PASS | **131** |
| **2. Các đường lỗi CLI** (`die()`, lỗi cờ, `serve`, `eval`) | ✅ 13 lần gọi | **57** |
| **3. TUI đã render** — **không dùng test render, mà chạy app thật trong pty (tmux)** | ✅ 22 khung, 4 bề rộng (80 / 100 / 120 / 150 / 200 cột), 3 trạng thái sách | **~250** |
| **Tổng, sau khi khử trùng lặp toàn bộ** | | **370 đoạn ghép phân biệt, trong đó 265 đoạn có dấu tiếng Việt** |

Đường 3 là đường **chưa ai làm được** trước đây: `go test ./internal/entry/tui/ -count=1 -v` **in ra 0 chuỗi**
(76 test PASS, không test nào `t.Log` nội dung render). Tôi lấy chữ thật bằng cách build binary rồi chạy trong
**tmux** với bề rộng ghim (`tmux new-session -x N -y M` + `capture-pane -p`) — tmux cấp pty có kích cỡ thật nên
bubbletea mới render (chạy dưới `script` thì pty cỡ 0×0, app đứng mãi ở `Đang tải...`). Kèm đó tôi trỏ app vào
**một cuốn sách thật** (`output/tran-yeu-ky`, đã có 2 chương + `pending_rewrites`) copy sang `/tmp`, nên thu được
cả bàn làm việc lúc chạy — nơi chữ ghép nhiều nhất.

**Không lượt soát nào trước đây đọc lớp này.** `proof-vietnamese.md` §6 tự khai: *"Chạy TUI thật để nhìn canh cột —
chỉ đọc mã, **không phải trên ảnh chụp màn hình**"*. Báo cáo này là lượt đầu tiên có ảnh chụp.

**Kết luận một dòng**: có **1 lỗi mất dữ liệu** (chữ bị xóa hẳn khỏi thông báo, 3 lần tái lập), **1 lỗi lặp từ mới
do chính bản sửa 4.1 sinh ra**, **xác nhận sống 2 lỗi §9.2 vẫn chưa sửa**, và **6 chỗ vỡ layout** mà đọc catalog
không thể thấy. Ngược lại, hai lớp nặng nhất mà đề bài lo — **dấu câu toàn phần và chữ Hán sót — SẠCH tuyệt đối
trên cả 370 đoạn**.

---

## 1. NGHIÊM TRỌNG — mất hẳn một chữ ở mỗi mối ngắt dòng của luồng sự kiện

Đây là phát hiện quan trọng nhất và nó **không thuộc bất kỳ lớp nào trong sáu lớp đề bài nêu** — nó không phải
"chữ bị cắt" (cắt thì mất phần đuôi, người đọc biết là bị cắt), mà là **một chữ ở giữa từ bị xóa, hai nửa dính
liền lại thành một từ khác**. Người dùng sẽ báo đây là **lỗi chính tả**, không ai nghĩ là lỗi layout.

### 1.1 Ba lần tái lập, hai bề rộng terminal khác nhau

**Ca 1** — terminal 150 cột, `/next` khi chưa bật `/review`:

```
09:16:13 ✕ Cho qua chương kế tiếp thất bại: /next chỉ dùng cho chế độ nghi
           m thu từng chương, hãy chạy /review on trước
```

Ghép hai dòng: `…chế độ **nghim thu** từng chương…`. Chuỗi gốc là `nghiệm`. **Chữ `ệ` bị xóa.**
(Đã hexdump: không phải lỗi ký tự tổ hợp — mọi ký tự trong khung đều NFC dựng sẵn, `ệ` = U+1EC7 đơn giản
là **không có trên màn hình**.)

**Ca 2** — terminal 150 cột, luồng `polishing`:

```
09:20:46 ✕ writer thất bại: Mục tiêu viết không hợp lệ: chương 3 không có
           rong hàng đợi Gia công, hàng đợi hiện tại: []. Hãy xử lý...
```

Ghép: `chương 3 không có **rong** hàng đợi`. Gốc là `trong`. **Chữ `t` bị xóa.** Đây là ca tệ nhất trong ba ca
vì **`rong` là một từ tiếng Việt thật** — câu vẫn "đọc được", chỉ là sai nghĩa. Không có dấu hiệu nào cho người
đọc biết chữ đã mất.

**Ca 3** — terminal 120 cột, lỗi xác thực:

```
09:14:20 ✕ writer thất bại: User not found. [auth, HTTP 401
           openrouter]
```

Gốc là `[auth, HTTP 401, openrouter]`. **Dấu phẩy bị xóa** (khoảng trắng thì mất là đúng — ngắt dòng ở khoảng
trắng — nhưng dấu phẩy đứng trước nó thì không).

### 1.2 Nguyên nhân trong mã — không phải hàm ngắt dòng

Tôi đã loại `wrapRunes` trước: mô phỏng lại **nguyên văn** thuật toán ở `internal/entry/tui/panels_activity.go:535-562`
bằng Python trên đúng chuỗi ca 1 và ca 3 → **nó không mất chữ nào**, với mọi bề rộng thử (48/49/50 và 63/64/65).
`wrapRunes` đúng.

Lỗi nằm ở **bề rộng truyền vào không khớp bề rộng render**:

| Chỗ | Mã | Bề rộng |
|---|---|---|
| `internal/entry/tui/model.go:250` | `renderEventContent(m.events, centerW, m.toolSpinnerIdx)` | **`centerW`** |
| `internal/entry/tui/model.go:300` | `m.viewport.Width = centerW - 2` | **`centerW - 2`** |

Nội dung được dàn cho `centerW` cột rồi nhồi vào viewport rộng `centerW - 2`. Nhánh `ERROR`
(`panels_activity.go:108-120`) tính `maxSumW = width - 12` và tiền tố đúng 12 cột, nên dòng đầu chiếm **trọn
`centerW` cột** — vượt viewport, phần vượt bị cắt mất, và vì đây là ký tự **cuối dòng đầu của một câu đang ngắt
tiếp**, chỗ mất nằm **giữa từ**.

**Đề xuất**: `model.go:250` truyền `m.viewport.Width` (hoặc `centerW-2`) thay vì `centerW`. Kèm hồi quy: dựng một
`Event{Category:"ERROR"}` có `Summary` dài hơn bề rộng, render ở **hai** bề rộng khác nhau, khẳng định
`strings.Join(lines,"")` == `Summary` sau khi bỏ khoảng trắng ngắt. *(Người sửa nên tự xác nhận lại con số 2 —
tôi chứng minh được **có** lệch và **có** mất chữ, nhưng số cột chính xác còn phụ thuộc bề rộng thực của `✕`
qua go-runewidth.)*

### 1.3 Vì sao đây là lỗi **do việt hóa sinh ra**

Lỗi chỉ nổ khi dòng **thật sự phải ngắt**. Đo trên đúng các chuỗi đã bắt được:

| Chuỗi | zh (cột) | vi (cột) | tỉ lệ |
|---|---|---|---|
| `/next 仅用于逐章验收模式，请先执行 /review on` | 45 | **75** | 1,67× |
| `恢复创作: ` + nhãn khôi phục | 30 | **59** | 1,97× |
| dòng tính năng `实时干预` | 39 | **99** | 2,54× |

Đường `zh` gần như không bao giờ chạm mốc ngắt (45 cột trong khung 61–76 cột). Đường `vi` chạm thường xuyên.
**Khuyết điểm có sẵn trong mã từ trước, nhưng nó nằm im ở tiếng Trung và chỉ thức dậy ở tiếng Việt** — đúng họ
lỗi mà đề bài gọi là "do chính việc chuyển sang tiếng Việt sinh ra".

---

## 2. CẦN SỬA — `Khôi phục sáng tác: Khôi phục: …` (lớp 3, lỗi MỚI, do chính bản sửa 4.1 sinh ra)

Ba lần tái lập, ba nhãn khác nhau — chứng minh lỗi ở **mối ghép**, không ở nhãn:

```
09:14:19 ⚙ Khôi phục sáng tác: Khôi phục: Viết lại, 1 chương chờ xử lý
09:20:46 ⚙ Khôi phục sáng tác: Khôi phục: chương 3 đang tiến hành
09:22:17 ⚙ Khôi phục sáng tác: Đã khôi phục
```

| | |
|---|---|
| Điểm ghép | `internal/host/host.go:498` — `i18n.F("恢复创作: ") + label` |
| Vế trái | msgid `恢复创作: ` → `Khôi phục sáng tác: ` |
| Vế phải | msgid `%s恢复：%d 章待处理` → `Khôi phục: %s, %d chương chờ xử lý` (và các nhãn chị em `恢复：…`) |

**Đây là hệ quả trực tiếp của bản sửa cho `proof-vietnamese.md` §4.1.** Lượt 1 báo bản dịch cũ
`%s khôi phục: %d chương chờ xử lý` sai vị ngữ và đề xuất đổi khuôn thành `Khôi phục: %s, …`. Bản sửa **đã được
áp** (catalog hiện là `"Khôi phục: %s, %d chương chờ xử lý"`) và nó **đúng khi nhãn đứng riêng** — sidebar hiện
`Khôi phục: Viết lại, 1 chương chờ xử lý`, đọc tốt. Nhưng nó đẩy chữ `Khôi phục` lên **đầu** nhãn, và ở điểm ghép
`host.go:498` nhãn đó lại nằm ngay sau `Khôi phục sáng tác: ` → **hai lần `Khôi phục`, hai dấu hai chấm, cách nhau
12 ký tự.**

Bản Trung có `恢复` hai lần nhưng lần thứ hai nằm **giữa** nhãn (`重写恢复：`) nên không đọc ra tiếng lặp;
bản Việt đưa nó ra đầu nên thành nói lắp. Đọc catalog **không thể thấy** — cả hai giá trị đều đúng khi đọc rời.

**Đề xuất** (1 dòng, rủi ro thấp): msgid `恢复创作: ` là chuỗi **chỉ dùng đúng một chỗ** (`host.go:498` — tôi đã
grep toàn repo). Đổi giá trị của nó, đừng đổi nhãn:

```
"恢复创作: ": "Tiếp tục sáng tác — "
```

→ `Tiếp tục sáng tác — Khôi phục: Viết lại, 1 chương chờ xử lý`. Không cần đổi mã, không đụng nhãn sidebar.

---

## 3. CẦN SỬA — xác nhận SỐNG: `hàng đợi Gia công` / `hàng đợi Viết lại` vẫn hoa giữa câu

`proof-vietnamese.md` §9.2 (#1, #2) và §4.2 đã báo hai ca này ở `internal/store/progress.go:492,495` bằng **câu
dựng lại**. Đây là **chữ thật, dán nguyên văn** — vẫn **chưa sửa**:

```
09:20:46 ✕ writer thất bại: Mục tiêu viết không hợp lệ: chương 3 không có
           rong hàng đợi Gia công, hàng đợi hiện tại: []. Hãy xử lý...
```

`hàng đợi **G**ia công` — hoa giữa mệnh đề. Đề bài nêu chính ca `hàng đợi Viết lại` (msgid `重写`) làm ví dụ; ca
`Gia công` (msgid `打磨`) là **anh em sinh đôi cùng khuôn** và tôi bắt được ca `Gia công` trước vì trạng thái
`polishing` dễ dựng hơn. Cả hai cùng một nguyên nhân, cùng một cách chữa.

**Đề xuất**: giữ nguyên khuyến nghị §9.5 "Ổ 1 — CÁCH 1: tách msgid". Tôi **xác nhận lý lẽ đó vẫn đúng** bằng
bằng chứng sống: `internal/entry/tui/panels_sidebar.go:330-340` là một `switch` 5 nhãn, và tôi đã thấy 3/5 nhãn
hiển thị đúng dạng nhãn độc lập trên màn hình (`◆ Viết lại`, `◆ Duyệt`, `Luồng Gia công`). Hạ chữ thường trong
`vi.json` **sẽ** làm lệch khối đó — đúng như §9.5 cảnh báo.

*Lưu ý cho người sửa*: dòng này còn **trúng luôn lỗi §1** (`không có` / `rong`). Sửa hoa/thường mà không sửa §1
thì câu vẫn hỏng.

---

## 4. CẦN SỬA — `Chờ khôi phục Chờ khôi phục: xử lý viết lại` — nhãn lặp lại trong giá trị, và nó **làm vỡ layout**

Chữ thật, terminal 200 cột (đủ rộng để thấy trọn):

```
 │ Chờ khôi phục Chờ khôi phục: xử lý viết lại
```

Và ở 120/150 cột thì chính chỗ lặp đó ăn hết bề rộng, giá trị **vừa xuống dòng vừa bị cắt**:

```
 │ Chờ khôi phục Chờ khôi
 │ phục:...
```

→ Người dùng **mất hẳn** phần thông tin duy nhất có ích (`xử lý viết lại` / `xử lý can thiệp của người dùng`),
chỉ còn đọc được hai lần cùng một chữ.

| | |
|---|---|
| Nhãn | `internal/entry/tui/panels_sidebar.go:63` — `i18n.F("待恢复")` → `Chờ khôi phục` |
| Giá trị | `panels_sidebar.go:275,281` — `i18n.F("待恢复：处理用户干预")` / `i18n.F("待恢复：返工处理")` |

**Trung thực về nguồn gốc**: chỗ lặp này **có sẵn trong bản Trung** (`待恢复` + `待恢复：返工处理`) — tôi không
gán nó cho lượt việt hóa. Nhưng zh là 6 cột lặp, vi là **13 cột lặp** (2,17×), và cặp nhãn+giá trị nở từ 23 → 43
cột (1,87×). Ở zh nó là chỗ rườm; ở vi nó **vượt bề rộng cột và làm mất nội dung**. Thiệt hại là của tiếng Việt.

**Đề xuất** (2 dòng catalog, không đụng mã): nhãn đã nói "Chờ khôi phục" rồi, bỏ tiền tố trong giá trị —

```
"待恢复：处理用户干预": "xử lý can thiệp của người dùng"
"待恢复：返工处理":     "xử lý viết lại"
```

Ràng buộc đã kiểm: `snapshotHeadline` dùng hai msgid này **chỉ** cho ô giá trị này. Nhưng cùng hàm còn nhánh
`当前` (`Hiện tại`) dùng lại cùng giá trị — sau khi sửa, nhánh đó ra `Hiện tại xử lý viết lại`, vẫn đọc được.

---

## 5. CẦN SỬA — tiêu đề `Trợ giúp lệnh` hiện HAI LẦN trong cùng một khung

```
┌─ Trợ giúp lệnh ──────────────────────────────────────────────────────┐
│ Trợ giúp lệnh                                                        │
│                                                                      │
│ /help                                                                │
```

| | |
|---|---|
| Lần 1 (viền khung) | `internal/entry/tui/command_help.go:99` — `i18n.F("命令帮助")` |
| Lần 2 (thân) | `internal/entry/tui/command_help.go:39` — `b.WriteString(titleStyle.Render(i18n.F("命令帮助")))` |

Cùng lớp với hai ca đã sửa mà đề bài nêu (`Chương 37 Chương 37`, `"Tên""Tên" sáng tác hoàn tất`). Ở zh là 4+4 cột;
ở vi là 13+13 (1,53×) nên chiếm hẳn một dòng đầu vô nghĩa của một khung đang phải cuộn.

**Đề xuất**: xóa `command_help.go:39` (viền khung đã mang tiêu đề). 1 dòng.

---

## 6. CẦN SỬA — chỗ giữ tham số trong `/help` dùng HAI ngôn ngữ, và nó làm ngắt dòng giữa chữ

Toàn bộ khung `/help`, chữ thật:

```
│ Usage: /model [role]
│ Usage: /review on|off
│ Usage: /import <path> [--yes] [--story=open|closed] [--continue] [--guide=<hướng dẫn cắt chư
│   ơng>]
│ Usage: /reopen [hướng viết tiếp]
│ Usage: /export [path] [from=N] [to=M] [--overwrite]
```

Hai vấn đề chồng nhau:

**(a) Trộn ngôn ngữ, có chỗ ngay trong CÙNG một msgid.** msgid
`/import <path> … [--guide=<切分指导>]` được dịch thành `… <path> … [--guide=<hướng dẫn cắt chương>]` —
**người dịch dịch `<切分指导>` nhưng để nguyên `<path>`, trong cùng một chuỗi** (`internal/entry/tui/commands.go:168`,
có qua catalog). Còn `[role]`, `[path]`, `[from=N]` là **hardcode trong mã**, không qua catalog
(`commands.go:71` v.v.) nên không lượt soát catalog nào thấy. Cạnh đó, dòng mô tả ngay dưới `/model` lại viết
`…của từng **vai**` — tức repo đã có bản dịch cho `role`, chỉ chỗ giữ tham số là không dùng.

**(b) Chính bản dịch đó làm dòng vượt bề rộng rồi ngắt giữa chữ.** `<切分指导>` = 6 cột, `<hướng dẫn cắt chương>`
= 22 cột; cả dòng usage từ 78 → **90 cột** (1,15×). Kết quả: `chư` / `ơng` — **`chương` bị xé giữa âm tiết**.
Dòng mô tả `/import` cũng bị: `--guide dù` / `ng lời văn tự nhiên` — **`dùng` xé thành `dù` + `ng`**, và `dù` là
một từ tiếng Việt thật.

**Đề xuất**: chốt **một** quy ước cho chỗ giữ tham số rồi áp cả hai phía. Khuyến nghị dùng chỗ giữ **ngắn, không
dấu, có gạch nối** để vừa nhất quán vừa không nở cột: `<duong-dan>`, `<cach-cat>`, `[vai]`, `[tu=N] [den=M]`.
Nếu chọn để nguyên tiếng Anh thì phải sửa `<hướng dẫn cắt chương>` → `<guide>` cho khỏi lệch trong cùng chuỗi.

*(Ngắt dòng ở đây là ngắt **có tiếp tục dòng dưới**, không mất chữ — khác §1. Nó xấu và khó đọc, không phải mất
dữ liệu.)*

> **Công bằng với người đã sửa trước**: `command_help.go:52-53` có chú thích *"Dòng Usage cũng phải ngắt: /import
> có usage dài hơn khung ở **mọi bề rộng**, và khung cắt cứng nên phần `[--guide=<...>]` mất luôn cả dấu đóng"* —
> tức việc dòng này tràn **đã được biết và đã được xử lý một nửa** (thêm `wrapText` để không mất dấu `]`). Phần
> chưa xử lý là **ngắt giữa âm tiết** mà chính bản dịch dài gây ra. Đề xuất ở trên nhằm vào phần còn lại đó, chứ
> không phải nhằm vào chỗ đã sửa.

---

## 7. CẦN SỬA — `Usage:` và `alias:` là tiếng Anh hardcode, catalog không thấy được

```
│ /cocreate  alias: /plan
│ Usage: /cocreate
│ Usage: /model [role] · còn 2 lệnh nữa
```

| Chuỗi | Chỗ | Ghi chú |
|---|---|---|
| `"Usage: "` | `internal/entry/tui/command_help.go:53` | không bọc `i18n.F` |
| `"Usage: "` | `internal/entry/tui/command_palette.go:200` | không bọc `i18n.F` |
| `"  alias: /"` | `internal/entry/tui/command_help.go:48` | không bọc `i18n.F`, **và có 2 khoảng trắng hardcode** → `/cocreate␠␠alias:` |

Đây là **lớp 3 của đề bài lượt 2A** (chuỗi viết cứng trong Go) nhưng ở chiều ngược: không phải chuỗi Việt viết
cứng, mà **chuỗi Anh viết cứng nằm giữa giao diện Việt**. `proof-vietnamese.md` L2.4 quét chuỗi Việt hardcode nên
bỏ qua họ này. Nó xuất hiện **14 lần trong một khung `/help`** — mật độ cao nhất trong toàn bộ giao diện.

**Đề xuất**: bọc `i18n.F("Usage: ")` → `Cách dùng: `, `i18n.F("  alias: /")` → `  bí danh: /` (và cân nhắc rút về
1 khoảng trắng).

---

## 8. CẦN SỬA — cột giá trị sidebar so le VÀ giá trị xuống dòng vào cột nhãn

Chữ thật, terminal 120 cột:

```
 │ Trạng thái chạy Đã
 │ tạm dừng
 │ Giai đoạn  Viết
 │ Luồng      Viết
 │ Đẩy chương Tự động
 │ Tiến độ    2 / 300
 │ chương
 │ Số từ      5,803
 │ Đang viết  Chương 2
 │ Chờ khôi phục Chờ
 │ khô...
```

Sáu dòng có giá trị bắt đầu ở cột 13; hai dòng (`Trạng thái chạy` 15 cột, `Chờ khôi phục` 13 cột) đẩy giá trị
sang phải rồi **giá trị xuống dòng, và dòng tiếp nằm ngay trong cột nhãn** — `tạm dừng`, `chương`, `khô...` đọc
ra như thể chúng là nhãn.

**Đây là chỗ báo cáo trước kết luận sai vì chỉ đọc mã.** `proof-vietnamese.md` §2.6 viết: *"nhãn dài đẩy giá trị
sang phải, **không cắt, không xé dòng**"* và *"Không còn khuyết điểm nào thuộc lớp 'nhãn >10 ký tự đẩy lệch cột'.
Dư lại duy nhất là cột giá trị so le — **thuần thẩm mỹ**"*. Chạy thật thì: **có xé dòng, và có mất chữ**
(`khô...`). Kết luận "thuần thẩm mỹ" không đúng. `layout_vi_width_test.go` xanh vì nó kiểm nhãn, không kiểm giá
trị đã xuống dòng.

Đo: `运行状态` 8 cột → `Trạng thái chạy` 15 cột (1,88×); `待恢复` 6 → `Chờ khôi phục` 13 (2,17×).

**Đề xuất, theo thứ tự rẻ→chắc**:
1. Rút nhãn: `Trạng thái chạy` → `Trạng thái` (bớt 5 cột, đủ vào 13). Msgid `运行状态` — kiểm chỗ dùng trước.
2. Cho `renderField` đệm theo **nhãn dài nhất trong section** thay vì hằng số, để cột giá trị luôn thẳng.
3. Nếu giá trị vẫn phải xuống dòng thì dòng tiếp phải **thụt vào bằng bề rộng cột nhãn**, đừng để nó nằm ở cột 3.

---

## 9. CẦN SỬA — đường dẫn tệp bị xé làm hai dòng, không copy được

Khung `/config` → provider hub, chữ thật:

```
│ Cấu hình nâng cao (extra / extra_body / stream_idle_timeout): /tmp/v │
│   ihome/.ainovel/config.json                                        │
```

Đường dẫn `/tmp/vihome/.ainovel/config.json` bị cắt thành `/tmp/v` + `ihome/…`. Đây là dòng **duy nhất trong
giao diện dùng để chỉ cho người dùng biết phải mở tệp nào** để cấu hình nâng cao — mà nó không copy được, và
người đọc nhanh sẽ tưởng đường dẫn là `/tmp/v`.

Nguyên nhân: nhãn `高级配置` 8 cột → `Cấu hình nâng cao` **17 cột** (2,12×), cộng phần `(extra / extra_body /
stream_idle_timeout)` cố định, đẩy đường dẫn ra sát lề.

**Đề xuất**: xuống dòng **có chủ đích** — nhãn + ngoặc ở dòng 1, đường dẫn nguyên vẹn ở dòng 2 (đường dẫn không
bao giờ nên đi qua bộ ngắt dòng theo cột).

---

## 10. Lớp 4 (đọc như văn dịch) — 5 chỗ, kèm chỗ nào cũng có bằng chứng sống

| # | Chữ thật thu được | Msgid | Vấn đề | Đề xuất |
|---|---|---|---|---|
| a | `-timeout duration` → `Trần **thời gian thực** cho một case (0=không hạn)` | `单 case 墙钟上限（0=不限）` (`internal/eval/eval.go:28`) | `墙钟` = **wall-clock**, nhưng `thời gian thực` trong tiếng Việt kỹ thuật = **real-time**. Nặng hơn: cùng cụm đó đang được dùng **đúng** cho `实时` ở `panels.go:174` (`Can thiệp thời gian thực`) → **một cụm Việt cho hai khái niệm Trung khác nhau, một chỗ sai** | `Trần thời gian chạy thực tế cho một case` |
| b | `Đồng sáng tác giai đoạn hoàn thành, đã **tiêm** hướng tiếp theo và khôi phục sáng tác` | `阶段共创完成，已注入后续方向并恢复创作` | `注入` → `tiêm` đọc ra nghĩa y tế. Và **lệch với chính repo**: `/help` của `/reopen` dịch cùng khái niệm là `hướng được phán quyết **nạp** vào trước` | `đã **nạp** hướng tiếp theo` |
| c | `Sáng tác đã tạm dừng, **nhập bất kỳ** để tiếp tục sáng tác` | `创作已暂停，输入任意内容继续创作` + `运行中断，输入任意内容恢复创作` | `任意内容` = "nội dung bất kỳ"; `nhập bất kỳ` thiếu bổ ngữ, đọc như câu bỏ lửng. Đây là **placeholder trong hộp nhập** — chuỗi người dùng thấy nhiều nhất | `nhập nội dung bất kỳ để tiếp tục sáng tác` |
| d | `Chọn Provider để sửa, hoặc thêm mới **một cái**` | `选择要修改的 Provider，或新增一个` | `一个` dịch mộc thành loại từ trống `một cái` — khẩu ngữ, và không rõ "một cái" là cái gì | `hoặc thêm một Provider mới` |
| e | `Ctrl+R chuyển sang **chế độ chọn sao chép**` | `切换选择复制模式` | Dịch theo trật tự từ tiếng Trung, phải đọc hai lần. Đây là chuỗi thanh gợi ý thường trực | `Ctrl+R để bật chế độ **chọn để sao chép**` |

---

## 11. Lớp 1 + lớp 6 — nhỏ, nhưng đọc thấy ngay trên màn hình

| # | Chữ thật | Chỗ | Ghi chú |
|---|---|---|---|
| a | `-cases string` → `**T**hư mục case…` (eval, **8/8 cờ viết hoa**) cạnh `-addr string` → `**đ**ịa chỉ lắng nghe` (serve, **4/4 chữ thường**) | eval qua catalog; serve hardcode `internal/serve/serve.go:76-79` | Hai quy ước viết hoa trong **cùng một `--help` của cùng một binary**. Đọc catalog không thấy vì chuỗi serve không nằm trong catalog (đúng như L2.4 Nhóm 1 đã ghi) |
| b | `**Test** kết nối fake-vi` | hub provider | `Test` tiếng Anh giữa nhãn Việt; các nhãn cạnh nó là `API Key` / `Base URL` (thuật ngữ) nên `Test` không có cớ |
| c | `Esc xóa **input**` | msgid `Tab 切换启动模式 · … · Esc 清空输入` | `input` tiếng Anh, trong khi repo chỗ khác dùng `hộp nhập liệu` |
| d | `Thêm hoặc sửa **P**rovider, **m**odel và cửa sổ ngữ cảnh` | mô tả `/config` | Hoa/thường lệch **trong cùng một dòng** cho hai danh từ cùng loại |
| e | `AI-Powered Novel Creation Engine` | `internal/entry/tui/panels.go` (khối logo) | Câu tagline duy nhất còn nguyên tiếng Anh, nằm giữa 4 dòng tính năng đã việt hóa |
| f | `Chiều rộng terminal không đủ, **vui lòng** mở rộng ít nhất 100 cột` | | Bằng chứng sống cho §4.5f (`vui lòng` 16 vs `hãy` 86). Đây là chuỗi **toàn màn hình**, ai dùng terminal hẹp cũng gặp |
| g | `Usage of serve:` / `flag provided but not defined: -bogus` / `(default -1)` | Go stdlib | Không thuộc catalog, không sửa được rẻ. Ghi để người sau không đi tìm |

---

## 12. Bề rộng tối thiểu chỉ còn **1 cột** dự phòng — đo được, chưa vỡ

App có cổng bề rộng: dưới 100 cột thì thay toàn màn hình bằng
`Chiều rộng terminal không đủ, vui lòng mở rộng ít nhất 100 cột`. Ở **đúng 100 cột**, dòng tính năng dài nhất đo
được **99 cột**:

```
<> Can thiệp thời gian thực  Điều chỉnh hướng đi cốt truyện bất kỳ lúc nào trong quá trình sáng tác
```

Bản Trung tương ứng (`<> 实时干预  创作过程中随时调整剧情走向`) = **39 cột**. Tỉ lệ **2,54×** — cao nhất tôi đo
được trong toàn repo. Ba dòng tính năng chị em vẫn được canh giữa; dòng này đã **hết lề, bắt đầu ở cột 0**.

**Chưa phải lỗi** — nó vừa khít. Nhưng biên an toàn là **1 cột**: bất kỳ ai thêm một chữ vào một trong hai msgid
(`实时干预`, `创作过程中随时调整剧情走向`) là dòng bị cắt ở bề rộng tối thiểu mà app tự cho phép. Đề xuất: hoặc
rút bản dịch (`Can thiệp tức thời` bớt 8 cột), hoặc nâng cổng bề rộng lên 104.

---

## 13. Đã kiểm và SẠCH — kèm cách đo, để "không có lỗi" đáng tin

### 13.1 Dấu câu toàn phần: **0 / 370 đoạn**

Đúng phép kiểm rẻ mà đề bài đưa, chạy trên **toàn bộ** output đã thu:

```bash
grep -rn '（\|）\|；\|，\|：\|、\|《\|》\|。\|！\|？\|「\|」\|『\|』' /tmp/corpus/ | wc -l
# → 0
```

Không một dấu toàn phần nào lọt ra màn hình, kể cả ở các mối ghép mới (dòng `Usage:`, thanh trạng thái, luồng
sự kiện, khung modal). Nguy cơ lệch cột do ký tự 2 cột: **không tồn tại trong output thật**.

### 13.2 Chữ Hán sót: **2 dòng, cả 2 là dữ liệu thử có chủ đích**

```
e2e.txt:220: BẮT ĐƯỢC: non_cjk_fragments{"忐忑, 深邃" limit=<nil> actual=2}
e2e.txt:221: EDITOR NHẬN: co=true [{"rule":"non_cjk_fragments","target":"忐忑, 深邃",…}]
```

Đây là `TestRoChuHanTrongVanVietPhaiBiBat` **cố tình** nhồi chữ Hán vào văn Việt để chứng minh bộ dò bắt được —
tức là dương tính đúng, không phải rò rỉ. **Trên 368 đoạn còn lại: 0 chữ Hán.** Đây là kiểm chứng cuối cho toàn
bộ công việc việt hóa, và nó đạt.

### 13.3 Ba chỗ tôi nghi là lỗi, kiểm ra thì KHÔNG — đừng đào lại

| Nghi vấn | Kết luận | Vì sao |
|---|---|---|
| `Chế độ khởi động ·␠␠Bắt đầu nhanh␠␠␠␠Kế hoạch đồng sáng tác` — thừa khoảng trắng ở mối ghép | **Không phải lỗi việt hóa** | `internal/entry/tui/cocreate.go:176` — `title + " " + divider + " " + quick + "  " + cocreate`, và `renderStartupModePill` có `Padding(0,1)`. Khoảng trắng đôi là **padding của pill**, hardcode, **giống hệt ở zh**. Cố ý. |
| `◆ openrouter fake-vi(200K,auto)` — thiếu space trước `(` | **Không phải lỗi việt hóa** | `internal/entry/tui/statusbar.go:31` — `dim.Render("(" + suffix + ")")`, ngoặc **ASCII hardcode ngay từ bản Trung**, chưa từng là `（）`. Đối chiếu: `· Ứng Nguyệt Đường (phản diện)` **có** space và đúng. |
| `│ Giai đoạn  completed` — enum tiếng Anh rò ra giao diện | **Dương tính giả của chính tôi** | Tôi dựng `phase="completed"` trong dữ liệu thử, nhưng giá trị hợp lệ là `"complete"` (`internal/domain/runtime.go:17`). Không phải lỗi sống. **Tuy vậy** `snapshotPhaseLabel` (`panels_sidebar.go:303-307`) có `default: return phase` → mọi phase chưa map **sẽ** in nguyên chuỗi mã tiếng Anh. Rủi ro tiềm ẩn, không phải lỗi hiện tại. |
| Gợi ý ở viền khung modal lệch nhau: `└␠␠↑↓ cuộn · Esc đóng` (help, report) vs `└↑↓ chọn · Enter xác nhận · Esc hủy` (config, hub) | **Không phải lỗi việt hóa** — nhưng là lệch thật | Cùng một khe `hint` của `renderPaddedModalFrame`. msgid `␠␠↑↓ 滚动 · Esc 关闭` **tự nó mang 2 khoảng trắng đầu** (`command_help.go:100`, `report.go:355`); các msgid chị em (`command_config.go:844,871`, `ask_user.go:246`) mang 0. Lệch có sẵn **trong msgid tiếng Trung**, bản dịch chỉ giữ nguyên → đúng. Ghi lại vì `proof-vietnamese.md` §2.2 xếp khoảng trắng đầu của nhóm entry này là "canh cột TUI **có chủ ý**"; chạy thật thì nó cho ra **hai kiểu viền khác nhau**, không phải canh cột. Muốn đều thì sửa msgid, không sửa bản dịch. |

### 13.4 Hai chỗ hoạt động ĐÚNG, xác nhận bằng ảnh chụp

- **Đệm cột nhãn hoạt động** với nhãn ≤ 13 cột: `Test kết nối` (12 cột, vs `测试连接` 8 cột) vẫn thẳng hàng với
  `API Key` / `Base URL` / `Model` ở đúng cột 14. Kết luận §2.6 của báo cáo trước **đúng cho khoảng này** — nó
  chỉ sai ở khoảng > 13 cột (xem §8).
- **Bảng model canh cột đúng**: `Model ID` / `Cửa sổ ngữ cảnh` / `Tham chiếu` với giá trị `fake-vi` / `200K` /
  `default` thẳng hàng, dù `Cửa sổ ngữ cảnh` (15 cột) dài gấp đôi `上下文窗口`.
- **`wrapRunes` không mất chữ**: mô phỏng nguyên văn thuật toán trên 2 chuỗi thật × 3 bề rộng → 6/6 lần bảo toàn
  đủ ký tự. Lỗi §1 **không** ở đây.

---

## 14. Bằng chứng cho các phát hiện cũ chưa sửa (không phải phát hiện mới, nhưng giờ có chữ thật)

| Phát hiện cũ | Chữ thật thu được | Trạng thái |
|---|---|---|
| §4.5a `失败裁定` → `Phán quyết thất bại` nhập nhằng | `✕ ARBITER (Phán quyết thất bại)` **rồi ngay dòng dưới** `⚙ Không dùng được phán quyết thất bại, đã tạm dừng chờ người can thiệp` | **Chưa sửa.** Hai dòng liền nhau làm đúng cái nhập nhằng §4.5a dự đoán: người vận hành đọc ra "trọng tài đã thất bại" |
| L2.2 #3 `钩子`: `Điểm móc` vs `Móc` | `layered_outline.md` xuất ra: `**Điểm móc**: bỏ lửng` | **Chưa sửa.** Nằm trong tệp người dùng mở đọc |
| L2.2 #1 `file` vs `tệp` | `Nhập /import <đường dẫn **file**> để nhập rồi viết tiếp` (màn hình chính) + `Thư mục case hoặc một **file** .json` (eval) | **Chưa sửa.** Cả hai đều là chuỗi hạng nhất |
| §4.5f `vui lòng` vs `hãy` | `Chiều rộng terminal không đủ, **vui lòng** mở rộng…` (toàn màn hình) + `chế độ không giao diện không hỗ trợ khởi động lần đầu, **vui lòng** chạy TUI một lần…` (CLI) | **Chưa sửa** |
| §4.1 `%s恢复：%d 章待处理` | `Khôi phục: Viết lại, 1 chương chờ xử lý` | **ĐÃ SỬA** và nhãn rời đọc tốt — nhưng bản sửa sinh ra §2 |

---

## 15. Chưa thu được — nói rõ để người sau không tưởng tôi phủ hết

| Chưa thu | Vì sao | Ai đọc tiếp thì cần gì |
|---|---|---|
| **Một lượt chạy có LLM thật** | Không có API key hợp lệ. Mọi khung "đang chạy" tôi thu được đều dừng ở lỗi `HTTP 401` sau 1–2 lượt phân việc | Đây là lỗ hổng lớn nhất của báo cáo này |
| **Khung `/cocreate` (hội thoại đồng sáng tác)** | Cần LLM | Ước 30–50 chuỗi ghép chưa ai đọc |
| **Khung `/import` lúc đang chạy** (thanh tiến độ, đếm lùi retry, hợp nhất cắt chương) | Cần LLM. Đây là khu **§9.2 #3–#10 của lượt 2B** (6 ổ `imp/state.go` + 2 ổ `imp/segment.go`) — tôi **không xác nhận sống được ổ nào** trong nhóm đó | Ưu tiên số 1 cho lượt sau: dựng một `/import` với LLM thật rồi đọc 8 chuỗi trạng thái đó |
| **Khung duyệt / nghiệm thu từng chương** (`/review on` + `/next` có chương thật) | Cần LLM để sinh chương mới | `hàng đợi Viết lại` (msgid `重写`, ca đề bài nêu) tôi bắt được **anh em `Gia công`** chứ chưa bắt đúng ca `Viết lại` — cùng khuôn, cùng cách chữa, nhưng nếu cần chữ thật của đúng ca đó thì phải qua đường này |
| **Bảng dàn ý (`phase=outline`/`premise`) và bàn làm việc sách đã xong (`phase=complete`)** | Tôi dựng được 3 trạng thái qua `progress.json` (`writing`/`polishing`/`reviewing`) nhưng không dựng đủ dữ liệu cho 3 phase còn lại | Cần fixture sách ở các phase đó. Cả 3 cuốn trong `output/` **đều là cùng một fixture** (`Trấn Yêu Ký`, phase `writing`) — kiểm rồi |
| **`web/` (chuỗi UI Next.js)** | Ngoài phạm vi, và có 6 agent khác đang sửa | — |
| **Chuỗi headless chạy trọn vòng** | Chỉ thu được 2 đường lỗi headless (khóa sai, thiếu `--prompt`) qua `internal/e2e` | — |

**Cách tôi dựng thêm trạng thái** (để lượt sau tái lập): copy `output/tran-yeu-ky` sang `/tmp`, sửa
`meta/progress.json` (`flow`, `pending_rewrites`, `pending_polishes`, `phase`), rồi chạy binary với `cwd` là thư
mục cha của `output/novel` — `OutputDir` là `json:"-"` (`internal/bootstrap/config.go:203`) nên **không cấu hình
được**, mặc định cứng là `output/novel` **tương đối theo cwd** (`config.go:415`). Đó là cách duy nhất trỏ app vào
một cuốn sách có sẵn.

---

## 16. Cách tái lập toàn bộ

```bash
# Đường 1 — headless + LLM giả (CHỈ ĐỌC, không sửa gì trong internal/e2e)
go test ./internal/e2e/ -count=1 -v            # 13/13 PASS, 131 đoạn ghép

# Đường 2 — các đường lỗi CLI (HOME giả để không đụng ~/.ainovel thật)
go build -o /tmp/ainovel ./cmd/ainovel-cli
HOME=/tmp/vihome /tmp/ainovel version extra    # v.v.
HOME=/tmp/vihome /tmp/ainovel eval             # bảng cờ eval
HOME=/tmp/vihome /tmp/ainovel serve --help     # bảng cờ serve

# Đường 3 — TUI THẬT trong pty có kích cỡ ghim (mấu chốt: tmux, không phải `script`)
mkdir -p /tmp/viwork/output
cp -R output/tran-yeu-ky /tmp/viwork/output/novel
cp ~/.ainovel/models-cache.json /tmp/vihome/.ainovel/   # thiếu cache thì app đứng ở "Đang tải..."
tmux -L vipty new-session -d -s vb -x 120 -y 40 -c /tmp/viwork \
     "cd /tmp/viwork && HOME=/tmp/vihome TERM=xterm-256color /tmp/ainovel"
sleep 7
tmux -L vipty capture-pane -p -t vb            # khung đã render, canh cột thật
tmux -L vipty resize-window -t vb -x 100 -y 32 # đổi bề rộng để soi lớp 5
tmux -L vipty send-keys -t vb '/help' Enter    # gõ lệnh
```

`-count=1` dùng cho **cả hai** lần chạy test (`internal/e2e`, `internal/entry/tui`). `go build ./...` chạy trước
và sạch (exit 0) nên không có đỏ giả do agent khác ghi tệp.

Toàn bộ 22 khung đã thu + output CLI + output e2e nằm ở `/tmp/corpus/` (ngoài repo, đúng quy tắc chỉ-ghi-báo-cáo).

---

## 17. Nếu chỉ sửa được năm chỗ

1. **§1** — `model.go:250` truyền `centerW` vào chỗ render bằng `centerW-2`. Đây là lỗi **mất dữ liệu**, 3 lần
   tái lập, và nó ngụy trang thành lỗi chính tả nên sẽ bị báo sai loại mãi.
2. **§2** — một dòng catalog: `"恢复创作: "` → `"Tiếp tục sáng tác — "`. Xóa tiếng nói lắp ở dòng đầu tiên mỗi
   phiên khôi phục.
3. **§4** — hai dòng catalog: bỏ tiền tố `Chờ khôi phục: ` khỏi hai giá trị `待恢复：…`. Vừa hết lặp vừa hết vỡ cột.
4. **§3** — tách msgid `重写`/`打磨` cho ngữ cảnh giữa câu, theo đúng §9.5 Ổ 1. Đây là ca đề bài nêu tên và nó
   **vẫn chưa sửa**.
5. **§5** — xóa `command_help.go:39`. Một dòng, hết tiêu đề lặp.

§7 (`Usage:`/`alias:` hardcode) rẻ tương đương và nên gộp vào cùng lượt vì cùng tệp với §5.
