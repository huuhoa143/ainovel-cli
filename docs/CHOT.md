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

---

## Điều kiện xong — danh sách ĐÓNG

- [x] Ba endpoint `/style` `/cost` `/settings` — curl cả ca có dữ liệu lẫn `sach-moi` rỗng (200, không 500), 4 trạng thái chi phí, hàng rào traversal cả 3 route
- [ ] Ba bề mặt Văn phong / Chi phí / Cài đặt dựng xong **hoặc** giữ nhãn "chưa dựng" kèm lý do thật
- [ ] Sáu chỗ vỡ layout TUI (§4–§9, §11 của `docs/audit/ghep-chu-vi.md`)
- [x] `khế ước chương` nghiệm thu xuyên `vi.json` + `assets/prompts/` + README/DESIGN — ĐO ĐƯỢC: `vi.json` 7 khế-ước / **0** hợp-đồng ở nghĩa B / 10 `contract` giữ ở nghĩa A; 4 dòng cực âm trong prompt còn nguyên
- [x] Ba chỗ hở bộ quét i18n đã siết — điểm neo 7→45, miễn trừ xuống độ mịn TRƯỜNG, luật 3 lan tới điểm bất động; mỗi luật có bằng chứng hoàn nguyên
- [ ] `web-visual.md` §4.5 — `ThanhTren.tsx:111` bỏ `id` của tác phẩm
- [ ] Cổng: `go build`+`go vet` sạch · `go test -count=1 ./...` 30 gói / 0 FAIL · `tsc` sạch · `npm run build` exit 0

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
| Đo lại tương phản + tràn ngang + danh sách CẤM cho ba bề mặt MỚI | ba bề mặt Văn phong/Chi phí/Cài đặt chưa đo lần nào. Thuộc người DỰNG chúng, không phải một lượt soát riêng |

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

## Thứ duy nhất còn lại mà không agent nào làm được

**Chưa ai đọc một chương do mô hình THẬT sinh ra.** Mọi bằng chứng hiện có là build
sạch, test xanh, catalog đủ. Với một công cụ viết truyện thì đó không phải bằng chứng
về thứ đáng đo nhất.

`docs/audit/e2e-report.md` phần B là checklist 10 bước có tiêu chí đạt/không-đạt, chạy
được ngay khi có khóa API. Phần A của báo cáo đó có mục A.5 nói rõ nó **không** chứng
minh chất lượng văn — văn trong test do người viết, test chỉ chứng minh bộ kiểm phân
biệt được hai mẫu đã biết trước đáp án.
