# Sổ chốt — điều kiện dừng và ai sở hữu tệp nào

Tệp này tồn tại vì một lỗi vận hành đo được: việc dựng xong lúc 00:31 ngày 31/07,
nhưng 9 giờ sau vẫn chưa chốt được. Không phải vì khối lượng việc, mà vì ba khuyết
điểm trong cách điều phối.

## Ba khuyết điểm, và luật thay thế

### 1. Không có sổ sở hữu tệp → bốn agent cùng ghi một tệp

`web/lib/types.ts` bị bốn bên chạm cùng lúc. Một agent báo nó đọc tệp ba lần trong
vài phút và thấy **ba nội dung khác nhau**. Trước đó `web/` được giao cho hai agent
song song, và có một lượt hai agent dựng **cùng ba bề mặt** vì một bên báo lỗi mạng
rồi sống lại.

**Luật**: mỗi tệp có ĐÚNG MỘT người ghi, ghi trong bảng dưới. Cần tệp ngoài vùng thì
báo, không tự ghi. Agent báo "failed" thì **kiểm tệp trên đĩa trước khi dựng lại** —
lỗi mạng khác với chết thật.

**Sổ ở mức tệp CHƯA đủ.** Hai agent cùng gói viết `style_test.go` và `cost_test.go`
với hàm trợ giúp trùng tên `ghiTho` và hai tên test trùng nhau → **vỡ build** một
lần. Tệp khác nhau mà cùng gói thì Go vẫn coi là một không gian tên. Nên khi hai
người phải cùng viết test trong MỘT gói, phân vai ở mức **tên test** (tiền tố định
danh riêng), không chỉ ở mức tệp.

Chuyện này xảy ra hai lần vì tôi dựng bản thay thế cho một agent báo "failed" mà
thật ra còn sống — cả `websurface`/`websurface2` lẫn `apisurface`/`apisurface2`.

### 2. "Agent rảnh" bị dùng làm tín hiệu tìm việc mới → vòng lặp không đáy

Mỗi lần một agent xong, tôi tìm cho nó việc tiếp. Luôn còn một thứ để soát, nên vòng
này không bao giờ đóng.

**Luật**: agent rảnh = **dừng**. Việc mới chỉ giao khi nó nằm trong danh sách "Điều
kiện xong" dưới đây. Mọi thứ khác vào **Việc tồn** và ở đó.

### 3. Không có định nghĩa "xong" → mỗi bản sửa sinh một lượt soát

Sáu lượt soát liên tiếp, mỗi lượt tìm ra một lớp lỗi mới. Các phát hiện đều thật —
hai cái nặng (mất chữ giữa từ; dạy Editor rằng chương nào cũng có tật) — nhưng giá
trị mỗi vòng đang giảm, và vòng không tự đóng.

**Luật**: danh sách dưới đây là danh sách ĐÓNG. Xong hết là chốt. Phát hiện mới,
dù thật, cũng vào Việc tồn.

### 4. `git add -A` quét trạng thái nửa vời của agent đang viết → BA lần

Người điều phối là người duy nhất được commit, và ba lần đã commit thứ chưa xong:

| Commit | Quét vào cái gì |
|---|---|
| `a8cd1d2` | bản nháp đầu của `web-visual.md`, số dòng còn sai |
| `8b3046b` | ba cờ `Capabilities` không ai gán + chú thích trỏ tới hàm không tồn tại |
| `8b3046b` | ba component web trỏ tới khóa `nhan.ts` chưa thêm → **HEAD tsc đỏ** |

Nguyên nhân chung: `git add -A` không phân biệt "agent đã xong" với "agent đang gõ".
Và cổng của tôi chỉ chạy `go test`, nên mọi lần trạng thái dở nằm ở `web/` thì nó
lọt hết.

**Luật**: trước khi commit, cổng phải chạy **cả hai** phía tương ứng với tệp trong
commit — có tệp `web/` thì phải `npx tsc --noEmit` sạch, không chỉ `go test`. Và
KHÔNG `git add -A` khi còn agent đang viết trong vùng đó; liệt tệp tường minh.

Hướng sai của lỗi này đáng chú ý: nó KHÔNG làm ai đỏ ngay. `go test` vẫn 30/30 nên
tôi vẫn báo "cây xanh" trong lúc HEAD thực ra không dựng được web. Một cổng chỉ đo
một nửa thì nó báo xanh cho cả phần nó không đo.

---

## Điều kiện xong — danh sách ĐÓNG

- [x] Ba endpoint `/style` `/cost` `/settings` — curl cả ca có dữ liệu lẫn `sach-moi` rỗng (200, không 500), 4 trạng thái chi phí, hàng rào traversal cả 3 route
- [x] Ba bề mặt Văn phong / Chi phí / Cài đặt — dựng THẬT cả ba, không mục nào giữ nhãn giả. Tương phản 0 vi phạm AA (226 phần tử có chữ, thấp nhất 5,22:1), 0 tràn ngang ở 390px, 0 vi phạm danh sách CẤM
- [x] Sáu chỗ vỡ layout TUI (§4–§9, §11) — kèm `wrapText` giờ ngắt Ở BIÊN TỪ thay vì giữa từ, có `TestWrapTextKhongXeGiuaTu` canh
- [x] `khế ước chương` nghiệm thu xuyên `vi.json` + `assets/prompts/` + README/DESIGN — ĐO ĐƯỢC: `vi.json` 7 khế-ước / **0** hợp-đồng ở nghĩa B / 10 `contract` giữ ở nghĩa A; 4 dòng cực âm trong prompt còn nguyên
- [x] Ba chỗ hở bộ quét i18n đã siết — điểm neo 7→45, miễn trừ xuống độ mịn TRƯỜNG, luật 3 lan tới điểm bất động; mỗi luật có bằng chứng hoàn nguyên
- [x] `web-visual.md` §4.5 — sửa RỘNG hơn báo cáo: cả danh sách VÀ nút chọn đã đóng, vì cả ba tác phẩm mẫu cùng `name` nên nút đóng hiện y hệt nhau
- [x] Cổng: `go build`+`go vet`+`gofmt` sạch · `go test -count=1 ./...` **30 gói / 0 FAIL** · `tsc` 0 lỗi · `npm run build` exit 0

Xong **bảy** mục trên → commit, **dừng mọi agent**, bàn giao E2E cho người dùng.

### Mục duy nhất được THÊM sau khi danh sách đã đóng, và vì sao

§4.5 vào danh sách vì nó **sai về DỮ LIỆU, không về hình**: hai tác phẩm khác thư mục
mà cùng tên sẽ hiện y hệt nhau, nên người vận hành mở sai tác phẩm mà không biết. Đó
là hạng khác với năm mục cùng đợt (`overflow: hidden`, thiếu sticky, canh giữa) — những
cái đó làm giao diện kém đẹp, cái này làm nó **nói sai sự thật**.

Ghi ra tiêu chí để lần sau khỏi tranh: được thêm vào danh sách đã đóng nếu nó khiến
sản phẩm **nói sai** hoặc **mất dữ liệu**. Kém đẹp thì không.


## Việc tồn — CỐ Ý không làm

Ghi ra để không ai tưởng bị bỏ sót, và để lần sau không đào lại.

| Việc | Vì sao không làm bây giờ |
|---|---|
| Hai chỗ hở còn lại của bộ quét i18n (miễn trừ theo tên không có scope) | hướng sai là bỏ SÓT, và giá phải trả hôm nay đo được là **0**. Siết đòi đổi một xấp xỉ rẻ thành bộ phân tích scope phải bảo trì |
| 6 chú thích Go dùng `khế ước` theo nghĩa A | chú thích không hiện cho người, không gửi cho mô hình |
| Bề rộng tối thiểu TUI còn 1 cột dự phòng | nới là quyết định về sản phẩm, không phải sửa lỗi. Cần người dùng quyết |
| `non_cjk_fragments` giữ tên dù nghĩa đã đổi ở nhánh vi | tên đã nằm trong `rule_violations.jsonl` append-only; đổi là bỏ mồ côi bản ghi cũ |
| Bản ghi cũ trên ổ mang nghĩa trái ngược dưới cùng tên rule | chỉ chạm ai đang có sách viết dở từ trước bản sửa. Cách rẻ nhất: xóa `meta/rule_violations.jsonl` |
| `stylestat/zhPatternDefs` miễn trừ ở mức ký hiệu thay vì mức trường | đã siết được thì tốt, nhưng ở locale vi `viProfile` được chọn nên có bảo vệ |
| `web-visual.md` §4.1 `.ctxbar` còn `overflow: hidden` · §4.3 `Truc.tsx:357` còn `· {…}` · §4.4 `.benle` không sticky · §4.6 ô can thiệp chỉ có `aria-label` · §4.10 `.trangtrong` canh giữa | năm mục làm giao diện kém đẹp, không làm nó nói sai. Xem tiêu chí ở trên |
| `web-visual.md` §4.7 — `DESIGN.md` chưa có câu cấm `--ink-3` trên bề mặt sáng hơn `--raised` | agent soát xếp đây là **rủi ro-âm-thầm cao nhất**: không sai hôm nay, nhưng là chỗ vỡ tương phản AA mà không ai hay. Là việc viết luật thiết kế, không phải sửa lỗi |
| `/cost` ở ca `stale_schema` trả `updated_at: ""` | `UsageStore.Load()` trả nil khi schema lệch, nên `buildCost` biết tệp TỒN TẠI (nó stat) mà không đọc được gì bên trong, kể cả mốc thời gian. Nên đúng ca cần bằng chứng nhất — "có chạy, chỉ không đọc được" — thì không có bằng chứng nào để hiện. Rẻ nhất: mang `mtime` của tệp ra. Nhánh render phía web đã có sẵn, tự bật khi Go có số |
| `ToSanXuat.tsx:27-31` — comment "API chưa trả chi phí theo vai" giờ đã sai | `/cost` đã land. Cùng lớp "chú thích đúng lúc viết, thành sai vì code đổi bên dưới" |
| Ảnh chụp ba bề mặt mới không ghi được ra tệp | MCP chặn ghi vào `docs/audit/screenshots/`. Ảnh nằm trong transcript của agent. Ghi ra để không ai tưởng có tệp |
| `p.ChapterWordCounts` đếm cả dòng `# tiêu đề`, nên bảng chương lệch lên vài từ mỗi chương | ĐO ĐƯỢC trên sách thật: chương 7 bảng ghi 2.532, bề mặt Đọc ghi 2.527 — đúng 5 từ của tiêu đề. Số đúng là 2.527. Nhưng nguồn sai nằm ở ENGINE (chỗ ghi progress), không ở `serve`, và `ChapterWordCounts`/`TotalWordCount` còn được engine dùng để xét độ dài chương. Sửa 5 từ ở đó là đổi ngưỡng của đường viết để lấy một sai số 0,2% mà không ai đọc được bằng mắt. Chênh này do bản sửa `tachTieuDeH1` LÀM LỘ RA, không phải làm ra: trước đó cả hai bề mặt cùng lệch +5 nên cùng sai mà khớp nhau |

## Ai sở hữu tệp nào

| Vùng | Người ghi duy nhất |
|---|---|
| `web/**` | `websurface` |
| `internal/serve/**`, `cmd/seed-demo/**` | `apisurface2` |
| `internal/entry/tui/**` | `docghep2` |
| `internal/i18n/*.go` | `botquet` |
| `internal/i18n/locales/vi.json` | dùng chung — **chỉ Edit từng chỗ**, CẤM đọc-rồi-ghi-lại cả tệp |
| `assets/**`, `README.md`, `DESIGN.md` | `thuatngu` |
| `scripts/i18n/tm.json` | **KHÔNG AI** — bản chụp có xuất xứ, đóng băng |
| git commit | **chỉ người điều phối** |

## Đợt đưa toàn bộ lên web (31/07) — điều kiện xong

Sáu đợt, làm tuần tự, mỗi đợt tự chạy được đầu-cuối.

- [x] **Đợt 1 — xương sống.** Engine chạy TRONG process `serve`. Khóa mức tệp trong `store` (không phải trong `serve` — `host.New` có 5 chỗ gọi). Ba hàng rào bảo mật.
- [x] **Đợt 2 — cấu hình.** Khóa API một chiều, màn cài lần đầu, model theo vai. Thêm `/open` (mở máy mà không chạy).
- [x] **Đợt 3 — vòng đời.** Chế độ nghiệm thu, cấp phép chương, mở lại. Điều khiển trong thanh transport. `Capabilities.Steer` thôi viết cứng.
- [x] **Đợt 4 — hai luồng chặn.** Cầu nối `ask_user` (modal không có nút Đóng) và cùng dựng.
- [x] **Đợt 5 — luồng tệp.** Nhập truyện, mô phỏng văn phong, xuất bản tải về. Thêm `Host.SimulateFrom`.
- [x] **Đợt 6 — sửa tài liệu nói sai.** `PRODUCT.md`, `README.md`, `main.go`, `serve.go` package doc, `settings.go`, `model.go`, và 5 câu trong `web/lib/nhan.ts`.

**Bằng chứng đầu-cuối**: một cuốn tạo TỪ TRÌNH DUYỆT — nhập yêu cầu → engine đặt tên
"Ba đêm đèn tắt" → viết 3 chương → xuất TXT 32KB tải về. Không mở terminal lần nào.

### Sáu lỗi bài kiểm bắt được của chính tôi trong đợt này

Ghi ra vì cả sáu cùng một hình dạng: mã trông đúng, và chỉ một phép đo mới thấy sai.

| Lỗi | Vì sao nó sống được |
|---|---|
| `laDiaChiCucBo(":8420")` trả true → đường ghi BẬT khi nghe mọi giao diện | một bảng dùng cho hai câu hỏi: chuỗi rỗng trong header `Host` vô hại, trong địa chỉ bind nghĩa là "tất cả" |
| `warnIfPublic` mắc đúng lỗi đó từ trước, và `TestWarnIfPublic` tự mâu thuẫn | bài kiểm xếp `:8420` là cục bộ rồi đòi cảnh báo cho `0.0.0.0:8420` — với Go hai chuỗi đó là một |
| khóa tệp đặt trong `serve` là VÔ DỤNG | `host.New` có 5 chỗ gọi; khóa ở một chỗ chỉ chặn chỗ đó tự đụng chính nó |
| kiểm `ValidateBase` trên riêng tệp đích | tệp project hợp lệ khi chỉ chứa phần ghi đè; kiểm nó một mình chặn đúng cách dùng mà lớp cấu hình tồn tại để phục vụ |
| đọc bản đã TRỘN rồi ghi lại | đổ credential global vào tệp project — người dùng commit nó lên git |
| `daTraLoi = true` TRƯỚC khi kiểm đáp án | một đáp án thiếu khóa người dùng ra khỏi chính câu hỏi đang chặn engine của họ |

### Việc tồn của đợt này — CỐ Ý không làm

| Việc | Vì sao không làm |
|---|---|
| Stream từng chữ cho cùng dựng và ba luồng tệp | cả bốn đều CHẶN tới khi xong, nên bản không-stream đủ chức năng — chỉ hiện muộn hơn. Stream đòi một kênh SSE thứ hai có vòng đời riêng phải hòa với kênh sự kiện đang có; nó mua sự mượt, không mua tính năng |
| Xem trước cách chia chương khi nhập truyện | `imp` có bước xem-trước-rồi-xác-nhận tương tác. Bản web hiện chỉ có `auto_confirm` bật/tắt: tắt thì luồng dừng ở bước xem trước và nhật ký nói rõ. Dựng cả bước xác nhận tương tác là một tiểu-ứng-dụng riêng |
| Chạy nhiều tác phẩm song song | bộ giám sát dựng dạng map nên đỡ được, nhưng `soToiDa = 1`. Hai cuốn cùng chạy là gấp đôi tiền và RAM |
| Mật khẩu / chạy trên VPS | người dùng chọn không. Nên đường ghi TỪ CHỐI bind ngoài loopback, và đó là hàng rào thay cho xác thực |
| `/help` và `Ctrl+L`/`Ctrl+U`/`Tab` đổi pane | cơ chế xem của terminal, không phải tính năng |
| Bài kiểm cho `cung_dung.go` và `tep.go` | hai tệp này chủ yếu là đấu dây tới `Host`; phần có logic riêng (áp ba luật của `ApplyReply`) nằm ở phía web. Kiểm chúng cho đúng cần một `Host` giả, tức một tầng giả thứ hai để bảo trì |

## Thứ duy nhất còn lại mà không agent nào làm được

**Chưa ai đọc một chương do mô hình THẬT sinh ra.** Mọi bằng chứng hiện có là build
sạch, test xanh, catalog đủ. Với một công cụ viết truyện thì đó không phải bằng chứng
về thứ đáng đo nhất.

`docs/audit/e2e-report.md` phần B là checklist 10 bước có tiêu chí đạt/không-đạt, chạy
được ngay khi có khóa API. Phần A của báo cáo đó có mục A.5 nói rõ nó **không** chứng
minh chất lượng văn — văn trong test do người viết, test chỉ chứng minh bộ kiểm phân
biệt được hai mẫu đã biết trước đáp án.
