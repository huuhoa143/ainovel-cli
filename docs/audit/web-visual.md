# Kiểm định giao diện web studio — bằng mắt, trên trình duyệt thật

**Commit kiểm:** `3ee5279` (`feat(i18n): dấu nối liệt kê theo ngôn ngữ + 4 bề mặt rail còn lại + E2E LLM giả`)
**Ngày:** 2026-07-31
**Cách kiểm:** Chrome DevTools MCP trên bản `next build` tĩnh, phục vụ bởi `ainovel-cli serve --web`. Ba bề rộng: 1440, 1024, 390.
**Ảnh:** `docs/audit/screenshots/` (30 ảnh, tên có tiền tố bề rộng).

> ⚠️ `web/components/DocTruyen.tsx`, `NhanVat.tsx`, `BanDuyet.tsx` đang được sửa song song. Mọi số dòng dưới đây đúng tại `3ee5279` và có thể lệch sau đó.

---

## 1. Chuỗi lệnh chạy được

Ghi lại chính xác vì lần trước chưa ai mở nó lần nào.

```bash
cd /Users/robin/Personal/ainovel-cli

# 1. Build web tĩnh (node_modules đã có; nếu chưa thì npm install trước)
cd web && npm run build && cd ..
#    → out/ ; ~10s ; exit 0
#    Cảnh báo "rewrites will not work with output: export" là BÌNH THƯỜNG
#    (rewrites chỉ dùng cho `next dev`, bản tĩnh gọi API cùng origin).

# 2. Gieo tác phẩm mẫu — LƯU Ý: seed-demo BẮT BUỘC có tham số đường dẫn
go run ./cmd/seed-demo output/tran-yeu-ky
#    `go run ./cmd/seed-demo` không tham số sẽ panic ở os.Args[1].

# 3. Chạy API + giao diện
go run ./cmd/ainovel-cli serve --web web/out --addr 127.0.0.1:8420
#    → http://127.0.0.1:8420   (root mặc định = ./output)
```

Xưởng trống kiểm bằng một tiến trình thứ hai:

```bash
mkdir -p /tmp/ainovel-empty
go run ./cmd/ainovel-cli serve --web web/out --addr 127.0.0.1:8421 --root /tmp/ainovel-empty
```

### Dữ liệu mẫu phải thêm tay để thấy được 5 bề mặt

`seed-demo` **không** ghi nhân vật, luật thế giới, phục bút, quan hệ, bản duyệt, hàng chờ viết lại. Năm bề mặt rail vì thế luôn rỗng nếu chỉ chạy seed-demo. Tôi ghi thêm fixture trực tiếp vào store (`output/` đã nằm trong `.gitignore`, không có gì bị commit):

| Tệp | Bề mặt nó mở ra |
|---|---|
| `output/tran-yeu-ky/characters.json` | Nhân vật |
| `output/tran-yeu-ky/world_rules.json` | Luật thế giới |
| `output/tran-yeu-ky/relationship_state.json` | Luật thế giới → Lưới quan hệ |
| `output/tran-yeu-ky/foreshadow_ledger.json` | Phục bút |
| `output/tran-yeu-ky/reviews/01.json` | Kiểm định (7 chiều) + Bản duyệt của Editor |
| `output/tran-yeu-ky/drafts/01.draft.md` | Đọc bản thảo (xem §2.1) |
| `pending_rewrites: [2]` thêm vào `meta/progress.json` | Hàng chờ viết lại |

**Đề nghị:** bổ sung các mục này vào `cmd/seed-demo/main.go`. Nếu không, mỗi người kiểm giao diện lần sau lại kết luận sai rằng năm bề mặt đó "chưa dựng".

---

## 2. CHẶN SHIP

### 2.1 Chương đã nghiệm thu hiện "chưa có bản thảo" — bảng nói 2.901 từ, ô bên phải nói không có gì

Đây là lỗi làm người vận hành hiểu sai nghiêm trọng nhất, và nó tự mâu thuẫn ngay trên một màn hình.

**Ảnh:** `1440-04-insp-banthao-trong.png`, `1440-06-khu-ban-thao.png`

Bảng chương: `1 · Người gác cầu đá · ● đã nghiệm thu · Writer · 2.901 · 1,2s`.
Tab **Bản thảo** của đúng chương đó: *"Chưa có bản thảo cho chương này."*

Nguyên nhân gốc nằm ở tầng Go, không phải web — `internal/store/drafts.go:71-80`:

```go
func (s *DraftStore) LoadChapterContent(chapter int) (string, int, error) {
	draft, err := s.LoadDraft(chapter)      // CHỈ đọc drafts/{NN}.draft.md
	...
	return "", 0, nil                       // chương đã chốt → rỗng
}
```

Nó chỉ đọc **bản nháp** `drafts/{NN}.draft.md`, không bao giờ ngã về **bản chốt** `chapters/{NN}.md`.

**Đo được:** `output/tran-yeu-ky/chapters/01.md` có 190 byte văn tiếng Việt trên đĩa, nhưng
`GET /api/books/tran-yeu-ky/chapters/1` trả `{"chapter":1,...,"words":0,"text":""}`.
Sau khi tôi tạo thêm `drafts/01.draft.md`, cùng endpoint trả `"words":172` và toàn văn. Đó là bằng chứng trực tiếp: API đọc sai tệp.

Cả repo còn lại đều dùng `LoadChapterText` để đọc bản chốt — `internal/tools/read_chapter.go:151`, `internal/host/exp/exporter.go:86`, `internal/eval/collect.go:120`, `internal/store/store.go:84`. Chỉ hai chỗ trong `serve` dùng `LoadChapterContent`, và cả hai đều là bề mặt đọc:

- `internal/serve/serve.go:204` → toàn văn của khu **Đọc bản thảo**
- `internal/serve/snapshot.go:438` → trích đoạn + số từ của tab **Bản thảo**

**Cách sửa:** trong `internal/store/drafts.go:71-80`, cho `LoadChapterContent` ngã về bản chốt khi không có nháp:

```go
draft, err := s.LoadDraft(chapter)
if err != nil { return "", 0, err }
if draft != "" { return draft, domain.WordCount(draft), nil }
final, err := s.LoadChapterText(chapter)   // chapters/{NN}.md
if err != nil { return "", 0, err }
if final != "" { return final, domain.WordCount(final), nil }
return "", 0, nil
```

Lưu ý thứ tự: nháp trước bản chốt, vì chương đang gia công thì nháp mới hơn. Nếu không muốn đổi hàm dùng chung (`check_consistency.go:61`, `commit_chapter.go:245` cũng gọi nó và **cố ý** chỉ muốn nháp), thì thêm hàm riêng cho `serve` và đổi hai chỗ gọi ở trên.

**Điểm cộng phải ghi nhận:** khu Đọc bản thảo đã tự chẩn đoán đúng lỗi này trong trạng thái rỗng của nó — *"Chương có dấu vết sản xuất nhưng store trả về bản thảo rỗng. Nội dung chương chỉ được đọc từ bản nháp (drafts/); chương đã chốt mà không còn bản nháp thì không có gì để đọc ở đây."* Đó là trung thực đúng mực. Nhưng nó **ghi lại** khuyết điểm chứ không sửa, nên câu hỏi số 3 của người vận hành trong `PRODUCT.md` ("Thành quả đọc ra sao?") vẫn không trả lời được.

### 2.2 Bấm "Đọc toàn văn chương" xong thì nút biến mất, không có đường quay lại

**Ảnh:** trước `1440-04-insp-banthao-trong.png` → sau `1440-05-doc-truyen.png`

`web/components/Inspector.tsx:284-289`: khi API trả `text: ""` thì `doan.length === 0`, và nhánh rỗng render **chỉ** một dòng `<p class="trong">`, bỏ luôn tiêu đề `Trích đoạn` và bỏ luôn nút.

Hệ quả trên màn hình: trạng thái sau khi bấm **trông y hệt** trạng thái chưa bấm bao giờ, chỉ khác là nút không còn. Người vận hành không có tín hiệu nào cho biết đã gọi API, và không bấm lại được — phải đổi tab rồi quay lại (`useEffect` ở dòng 263-266 chỉ reset theo `[tacPham, chuong]`, không reset khi đổi tab).

**Cách sửa:** ở nhánh `doan.length === 0`, giữ nguyên nút và nói rõ đã tải:

```tsx
if (doan.length === 0) {
  return (
    <div className="ibody">
      <h3>{CHU.trichDoan}</h3>
      <p className="trong">{GIAI_THICH.chuaCoBanThao}</p>
      <button type="button" className="docthem" onClick={doc}>Đọc lại</button>
    </div>
  );
}
```

### 2.3 Nhịp đập vẫn đập sau khi engine đã dừng — ba chỗ trên một màn hình nói ba điều khác nhau

**Ảnh:** `1440-21-o-can-thiep-nhat-ky.png`

Đo được cùng lúc, cùng một khung hình:

| Chỗ | Nói gì |
|---|---|
| Transport | `○ đang nghỉ` |
| Thanh trên | `2 tác phẩm · 0 đang chạy` |
| Hàng chương 3 | `▶ đang soạn bản thảo` — **đang đập, 2.2s, vô hạn** |

`DESIGN.md:126` định nghĩa nhịp đập là **chuyển động duy nhất mang thông tin**: nó "phân biệt *đang chạy* với *đã dừng ở trạng thái này*". Ở đây nó không phân biệt được, vì `web/app/globals.css:895-897` gắn animation thuần theo màu công đoạn:

```css
/* Nhịp đập là chuyển động duy nhất mang thông tin: nó phân biệt ĐANG chạy với
   ĐÃ DỪNG ở trạng thái này — điều ảnh tĩnh không nói được. */
.st.gold .ky {
  animation: dapnhip 2.2s var(--ease) infinite;
}
```

Chú thích ngay trên nó phát biểu đúng ý định, còn code thì không làm được: `stage === 'drafting'` (`lib/nhan.ts:67` → `mau: 'gold'`) là một **công đoạn đã ghi vào store**, không phải một sự thật về liveness. Chương chết dở giữa lúc soạn chính là ca "đã dừng ở trạng thái này", và nó đập.

Trực tiếp phá tiêu chí thành công ở `PRODUCT.md:27`: "mở studio sau 6 giờ đi vắng và trong vòng 5 giây biết được dây chuyền khỏe hay bệnh". Engine chết + hàng đang đập = đọc ra "khỏe".

**Cách sửa — mẫu đã có sẵn trong repo.** `web/components/Transport.tsx:67` làm đúng rồi:

```tsx
className={`ky ${may.mau}${transport.state === 'running' ? ' dap' : ''}`}
```

Áp cùng cách cho bảng chương:

1. `web/app/globals.css:895` — đổi `.st.gold .ky` thành `.st.gold.dap .ky`.
2. `web/app/globals.css:2724` — trong nhánh `prefers-reduced-motion`, đổi `.st.gold .ky` theo cho khớp.
3. `web/components/BangChuong.tsx:91` — truyền liveness vào `<TrangThai>`; `<TrangThai tt={tt} dap={dangChay} />`, với `dangChay` lấy từ đúng nguồn transport đang dùng (`book.activity === 'running'`).

Cũng nên xem lại đốm vàng đang đập ở viên `dòng sự kiện` (`globals.css:356-359`, `data-tt='song'`) khi ngay bên dưới ghi *"Chưa nhận sự kiện nào từ engine kể từ lúc mở dòng"*. Ở đây nhịp đập có cổng liveness thật (`song`/`mat`) nên không sai như 2.3, nhưng đặt cạnh "0 đang chạy" thì một đốm vàng đang đập vẫn dễ đọc thành "sự kiện đang chảy".

---

## 3. NẶNG

### 3.1 Rail ghi "Kiểm định 0" trong khi bề mặt Kiểm định có đủ bản duyệt 7 chiều

**Ảnh:** `1440-15-kiem-dinh-7chieu.png` (thấy rõ cả hai số cùng lúc)

- Rail: `◆ Kiểm định 0`
- Tiêu đề bề mặt: `3 chương có dấu vết sản xuất · 1 đã nghiệm thu`, bên dưới là bản duyệt đầy đủ 7 chiều của chương 1.

Hai con số cùng nhãn nhưng khác mẫu số. `web/components/Rail.tsx:82`:

```ts
const cuaKiemDinh = marks.filter((m) => m.state === 'gate').length;
```

Rail đếm **cửa kiểm định trên trục**; bề mặt liệt kê **chương có dấu vết sản xuất**. Người vận hành đọc "0" là "không có gì để kiểm" rồi không bấm vào — trong khi bên trong có một chương verdict `gia công` với 2 vấn đề, một cái severity `error`.

**Cách sửa:** cho rail đếm đúng thứ bề mặt sẽ liệt kê. Bề mặt đọc từ `snapshot.chapters`, nên rail cũng nên đếm từ đó (giống cách `vietLai` ở `Rail.tsx:87` đã cố ý làm, kèm chú thích giải thích chính xác cái bẫy này). Nếu muốn giữ nghĩa "cửa kiểm định" thì phải đổi nhãn rail thành `Cửa kiểm định` để hai con số không dùng chung một tên.

### 3.2 Nhãn phụ đầu bảng Tổ sản xuất: `line-height 1.35`, khe mực xấu nhất còn **0,31px**

**Ảnh:** `1440-20-to-san-xuat.png`, `390-03-to-san-xuat.png` (ở 390 nó ngắt hai dòng)
**Tệp:** `web/app/globals.css:2635` — `.bangto thead th em { font: 400 10.5px/1.35 var(--ui); }`

Đo bằng `TextMetrics.actualBoundingBoxAscent/Descent` của chính Inter đang render, không phải ước lượng:

| | px | ratio | khe mực dòng 1 ↔ dòng 2 |
|---|---|---|---|
| chuỗi hiện tại `theo chu kỳ gần nhất của mỗi / chương` | 10.5 | 1.35 | 4,27px |
| **xấu nhất** (dòng 1 hết bằng `ộng`, dòng 2 mở bằng `Ấ/Ộ/Ữ`) | 10.5 | **1.35** | **0,31px** |
| cùng chuỗi xấu nhất, nếu để 1.72 | 10.5 | 1.72 | 4,19px |

0,31px ở DPR 2 là dưới một điểm ảnh vật lý — dấu hai tầng chạm nhau. `DESIGN.md:80` đặt sàn `line-height ≥ 1.72` cho văn bản, và đây là 1.35.

**Cách sửa:** `web/app/globals.css:2635` → `font: 400 10.5px/1.72 var(--ui);`. Cột nới thêm ~3,9px mỗi dòng; nhãn phụ đã có `max-width: 26ch` nên bề rộng cột không đổi.

### 3.3 Tiêu đề chương trong danh sách đọc: `line-height 1.45`, khe mực xấu nhất **1,62px**

**Ảnh:** `1440-13-doc-ban-thao-co-van.png` (`Thư không người / nhận` ngắt hai dòng)
**Tệp:** `web/app/globals.css:1793-1801` — `.dsChuong .ten { -webkit-line-clamp: 2; line-height: 1.45; }`

| | khe mực |
|---|---|
| `Thư không người / nhận` (hiện tại) | 5,90px |
| xấu nhất `…ộng` / `Ấ…` | **1,62px** |
| nếu để 1.72 | 4,99px |

Chú thích ngay trên rule đó tự nói tiêu đề **cố ý ngắt hai dòng** và "tiêu đề chương do mô hình đặt, không có giới hạn trên" — nghĩa là ca xấu nhất chắc chắn tới, chỉ là chưa tới.

**Cách sửa:** `line-height: 1.45` → `1.72`. Hộp clamp 2 dòng cao thêm 6,8px.

### 3.4 Ở 390px, 56% thanh transport bị đẩy ra ngoài — mất đúng phần giá thành và năng suất

**Ảnh:** `390-01-dong-san-xuat.png` (đáy khung chỉ còn `đang nghỉ`, `công đoạn commit`, `tổ —`, `ngữ cả…`)

Đo được: `.trans` có `scrollWidth 890px`, `clientWidth 390px` → **500px bị ẩn**, `overflow-x: auto`. Năm trong tám ô nằm ngoài khung:

| ô | left → right | trong khung? |
|---|---|---|
| `○ đang nghỉ` | 4 → 105 | ✓ |
| `công đoạn commit vừa xong` | 105 → 291 | ✓ |
| `tổ —` | 291 → 343 | ✓ |
| `ngữ cảnh —` | 343 → 500 | ✗ |
| `năng suất —` | 500 → 590 | ✗ |
| `giá thành —` | 590 → 677 | ✗ |
| `tổng $0,00` | 677 → 766 | ✗ |
| `đã chạy 0:00:02` | 766 → 886 | ✗ |

`DESIGN.md:104` nói transport là "**luôn hiện, không cuộn mất**"; `DESIGN.md:106` nói "Transport không bao giờ bị bỏ". Thanh thì còn, nhưng nội dung nó tồn tại để mang — chương/giờ và đô-la/chương, đúng ba con số của `PRODUCT.md` Design Principle 3 — thì phải cuộn ngang mới thấy. Ở 390 thanh transport giữ lại đúng phần ít cần nhất.

**Cách sửa:** dưới 860px, xếp transport thành hai hàng thay vì cuộn ngang một hàng — hàng trên `trạng thái máy + công đoạn`, hàng dưới `năng suất · giá thành · tổng · đã chạy`. Grid gốc `44px 1fr 30px` đổi thành `44px 1fr 30px 30px` trong media query, hoặc để `.trans { flex-wrap: wrap; height: auto }` và bỏ `overflow-x`. Cách nào cũng giữ đúng chữ "luôn hiện".

---

## 4. NHẸ

### 4.1 Vạch đỏ mốc 85% của thước ngữ cảnh bị `overflow: hidden` cắt phần nhô ra

**Tệp:** `web/app/globals.css:1572-1594`

```css
.ctxbar   { height: 5px; overflow: hidden; position: relative; }
.ctxbar::after { left: 85%; top: -2px; bottom: -2px; width: 1px; background: var(--red); }
```

Vạch được thiết kế nhô 2px trên và 2px dưới để nhìn thấy được trên một thanh cao 5px, nhưng `overflow: hidden` của cha cắt sạch phần nhô đó. Đo được `.ctxbar` có `scrollHeight - clientHeight = 2` — chính là phần bị cắt.

`DESIGN.md:118` đòi "vạch đỏ ở mốc 85% để thấy ngưỡng nén sắp tới, không chỉ hiện một con số". Vạch có, nhưng bị bóp thành 1×5px nằm lọt trong thanh.

**Cách sửa:** bỏ `overflow: hidden` khỏi `.ctxbar` — `.ctxbar i` đã tự có `border-radius: 3px` nên không cần cha cắt góc.

### 4.2 Câu "Ranh giới" ở Luật thế giới tô amber toàn bộ — 15,1% diện tích chữ của bề mặt

**Ảnh:** `1440-18-luat-the-gioi.png`

Đo được trên bề mặt đó: tổng diện tích chữ 107.084px², phần **không** phải `--ink/--ink-2/--ink-3` là **15,14%**, trong đó `--amber` `rgb(242,166,96)` chiếm **15,03%**.

`DESIGN.md:13` đặt chiến lược "một màu tín hiệu duy nhất chiếm **dưới 10%** diện tích", và `PRODUCT.md` Design Principle 5 là "Màu dành cho dữ liệu, không cho khung". Ở đây cả câu luật chạy dài đều là amber, không chỉ nhãn.

**Cách sửa:** giữ `Ranh giới:` + đốm ■ ở amber, để câu ranh giới ở `--ink` (16,59:1, thừa ngưỡng). Diện tích amber tụt còn ~3%.

### 4.3 Ở 390px, dấu `·` thành chữ mồ côi mở đầu dòng

**Ảnh:** `390-01-dong-san-xuat.png`

```
Chương 1–15 / 300
· 285 chương ngoài cửa sổ
Hiện toàn bộ 300 chương
```

Ba mảnh là ba phần tử riêng; ở 1440 chúng nằm cùng một dòng nên dấu `·` đóng đúng vai phân cách, ở 390 chúng xuống dòng và `·` mở đầu dòng thứ hai. **Cách sửa:** đưa `·` vào làm `::before` chỉ hiện khi cùng dòng, hoặc bỏ nó ở breakpoint hẹp.

### 4.4 Cuộn hết khu Đọc bản thảo thì cột văn trống trơn, chỉ còn lề bản duyệt

**Ảnh:** `1440-13-doc-ban-thao-co-van.png` → `1440-14-doc-ban-thao-cuoi-7chieu.png`

Chỉ có một khung cuộn (`.canvas.khudoc`, `scrollHeight 1245` / `clientHeight 653`). Khi lề bản duyệt cao hơn cột văn — chương ngắn, hoặc bản duyệt 7 chiều + nhiều vấn đề — cuộn tới đáy để lại một vùng đen lớn ở chỗ vừa còn văn. Đọc ra như "văn bị mất".

Tất cả 7 chiều đều tới được (đã kiểm: chiều cuối `60/100` nằm trong tầm cuộn), nên đây không phải nội dung không truy cập được, chỉ là hình xấu và gây hiểu sai. **Cách sửa:** cho lề bản duyệt `position: sticky; top: 0` trong cột riêng của nó, hoặc cho hai cột cuộn độc lập.

### 4.5 Bộ chọn tác phẩm bỏ mất `id`, hai tác phẩm cùng tên thành không phân biệt được

**Ảnh:** `1440-23-picker-chon-tac-pham.png`, `1440-24-truc-muc-xem-chuong.png`

Hai mục trong danh sách hiện **y hệt nhau**: `○ Trấn Yêu Ký 2/300` và `○ Trấn Yêu Ký 2/300`. Đó là hai thư mục khác nhau, `tran-yeu-ky` và `thanh-van-lo`.

`web/components/ThanhTren.tsx:102` — `{b.name ? b.name : <em>{b.id}</em>}`. `id` chỉ dùng làm phương án dự phòng khi `name` rỗng, không bao giờ dùng để phân biệt. `/api/workshop` đã trả `id` sẵn.

Trường hợp này do fixture của tôi (seed-demo đặt cứng tên "Trấn Yêu Ký" cho mọi thư mục), nhưng nó có thật ngoài đời: chạy lại, nhân bản, làm bản v2 trong thư mục khác đều cho hai tác phẩm cùng tên.

**Đã kiểm và KHÔNG phải lỗi:** mục đang mở có nền `--raised` `rgb(36,32,27)` và chữ `--ink`, cộng `aria-current="true"`; đóng bằng click ra ngoài và Escape đều chạy; `aria-expanded`/`aria-haspopup="listbox"` đúng. Chỉ có ký hiệu là **`○` cho cả hai** — tức kênh ký hiệu mà `DESIGN.md:50` đòi ("mọi trạng thái mang cả đốm màu, ký hiệu, và nhãn chữ") ở đây không mang tin gì.

**Cách sửa:** thêm `id` làm dòng phụ mono `--ink-3` dưới tên, và đổi ký hiệu mục đang mở thành `●`.

### 4.6 Ô nhập can thiệp không có `id`/`name` — console báo issue

Đây là **thông điệp console duy nhất** thuộc loại lỗi/issue trên toàn bộ đợt kiểm: *"A form field element should have an id or name attribute"*. Ô `Ý kiến can thiệp` có `aria-label` nên vẫn dùng được với trình đọc, nhưng thêm `id` + `<label for>` là xong.

### 4.7 Nhãn `--ink-3` trên `--raised` chỉ còn 4,53:1 — hết biên an toàn

Đo trực tiếp từ token đang render (dùng canvas để quy `oklch()` về sRGB):

| | `--bg` | `--panel` | `--panel-2` | `--raised` |
|---|---|---|---|---|
| `--ink` | 16,59 | 15,86 | 14,88 | 13,75 |
| `--ink-2` | 8,93 | 8,54 | 8,02 | 7,40 |
| `--ink-3` | 5,46 | 5,22 | 4,90 | **4,53** |

`DESIGN.md` ghi 16.1 / 8.2 / 4.9 so với `--bg`; đo được 16,59 / 8,93 / 5,46 — con số trong tài liệu **thận trọng hơn thực tế**, tức không có chỗ nào tài liệu nói quá. Tốt.

Nhưng `--ink-3` trên `--raised` (theo `DESIGN.md:26` là "nút bật, nền thước đo") còn 4,53:1 — hơn sàn 4,5 đúng 0,03. Bất kỳ lần nào sau này hạ `--ink-3` hoặc nâng `--raised` là vỡ AA mà không ai để ý. **Đề nghị:** ghi vào `DESIGN.md` rằng cặp `--ink-3` trên `--raised` là cặp sát sàn nhất, và cấm dùng `--ink-3` trên bề mặt nào sáng hơn `--raised`.

### 4.8 Hai chỗ dưới sàn 1.72 nhưng chưa tới mức nguy hiểm

| Tệp | Rule | ratio | khe xấu nhất | Ghi chú |
|---|---|---|---|---|
| `globals.css:1799` | `.title` (tiêu đề chương ở bảng Dòng sản xuất) | 1.5 | 2,24px | ngắt hai dòng ở 390 — ảnh `390-01` |
| `globals.css:2121` | `.chuamoNoi` | 1.66 | 4,07px | chỉ lệch chuẩn, không có rủi ro chạm dấu |
| `globals.css:603` | `.canhbao li` | 1.6 | *chưa đo* | không dựng được trạng thái cảnh báo trong đợt này |

`.title` nên lên 1.72 cùng lúc với §3.3 (cùng một loại nội dung: tiêu đề chương do mô hình đặt).

### 4.9 Sáu cảnh báo preload font — vô hại, ghi ra để lần sau không phải điều tra lại

`next/font` preload 3 họ × 2 subset (`latin`, `vietnamese`) = 6 tệp woff2, và mỗi trang chỉ dùng một phần trong vài giây đầu → 6 cảnh báo `preloaded but not used`. Cấu hình ở `web/app/layout.tsx:17-36` là **đúng** (subset `vietnamese` là bắt buộc). Không phải khuyết điểm.

### 4.10 Xưởng trống canh giữa cả hai trục, ở 1440 trôi lơ lửng giữa màn hình đen

**Ảnh:** `1440-22-xuong-trong.png`, `390-04-xuong-trong.png`

Nội dung thì xuất sắc (xem §6), nhưng `.trangtrong { align-content: center; margin: 0 auto }` đặt nó vào giữa một canvas 1440×~1200, cách xa góc trên-trái nơi mắt bắt đầu. **Cách sửa:** neo vào trên-trái với padding, hoặc chỉ canh giữa trục ngang.

---

## 5. Bề mặt nào rỗng — và rỗng đúng cách hay rỗng vì vỡ

Phân biệt rõ vì đó là hai chuyện khác nhau.

| Bề mặt | Trạng thái | Rỗng đúng cách? |
|---|---|---|
| Đọc bản thảo (toàn văn) | rỗng dù chương đã chốt | ❌ **rỗng vì vỡ** — §2.1, `LoadChapterContent` đọc sai tệp |
| Tab Bản thảo trong inspector | như trên | ❌ **rỗng vì vỡ** — §2.1 |
| Kiểm định | rỗng khi thiếu `reviews/{NN}.json` | ✅ đúng cách — nói rõ "Store ghi bản duyệt theo từng chương, và API trả bản duyệt của đúng chương đang chọn" |
| Nhân vật | rỗng khi thiếu `characters.json` | ✅ đúng cách — "Engine ghi mục này ở bước dựng nền" |
| Luật thế giới · Phục bút | rỗng khi thiếu tệp tương ứng | ✅ đúng cách |
| Hàng chờ viết lại | rỗng khi `pending_rewrites` rỗng | ✅ đúng cách — "Editor trả chương về khi bản duyệt có vấn đề buộc phải sửa" |
| Hàng chờ, mở rộng một dòng | `Chưa có bản duyệt cho chương này` | ⚠️ đúng-về-dữ-liệu nhưng **vô dụng về vận hành** — xem dưới |
| Dàn ý → Dàn ý phẳng | `Chưa có dàn ý nào trong store` | ⚠️ câu quá tuyệt đối — xem dưới |
| Dòng sự kiện | `Chưa nhận sự kiện nào từ engine kể từ lúc mở dòng` | ✅ đúng cách |
| Ô can thiệp | vô hiệu có chủ ý | ✅ đúng cách, mẫu mực — xem §6 |
| Xưởng trống | không có tác phẩm | ✅ đúng cách, mẫu mực — xem §6 |
| Văn phong · Chi phí · Cài đặt | **không phải bề mặt** — nhãn "chưa dựng", không bấm được | ✅ đúng hợp đồng ở `web/lib/khu.ts:8-11` |

**Endpoint còn thiếu** (khớp đúng ghi chú ở `Rail.tsx:29-35`): `meta/style_rules.json` (Văn phong) không có endpoint; `meta/usage.json` có `PerAgent`/`PerModel` nhưng API chỉ trả `Overall.Cost` (Chi phí); `RunMeta` không được trả (Cài đặt). Không có mục nào trong ba mục đó giả vờ bấm được — rail dựng đúng.

Hai chỗ nên sửa câu chữ:

- **Hàng chờ viết lại, mở rộng** (`1440-17-hang-cho-mo-rong.png`): chương 2 đang trong hàng chờ mà mở ra chỉ được "Chưa có bản duyệt cho chương này". Bề mặt này tồn tại để trả lời câu hỏi số 2 của `PRODUCT.md` — "Editor bắt lỗi gì, chương nào bị trả về?" — nên khi thiếu bản duyệt, nó nên nói rõ nó đọc `pending_rewrites` từ `progress.json` còn lý do nằm ở `reviews/{NN}.json`, chứ không phải một câu phủ định trơ.
- **Dàn ý phẳng** (`1440-10-dan-y-cuoi.png`): câu "Chưa có dàn ý nào trong store" đứng ngay dưới một dàn ý phân tầng đầy đủ 2 tập. Nên là "Chưa có dàn ý phẳng — tác phẩm này dùng dàn ý phân tầng".

**Một chỗ tôi không kiểm được:** thư mục con không có `meta/progress.json` bị `/api/workshop` loại im lặng (tôi tạo `output/xuong-rong-chua-init` và nó không hiện, cũng không có cảnh báo). Không phán được là đúng hay sai vì chưa rõ ý định; nhưng người vận hành gieo sai thư mục sẽ thấy "Xưởng chưa có tác phẩm" mà không biết là có thư mục nhưng chưa init.

---

## 6. Những chỗ làm đúng, đã đo và xác nhận

Ghi ra để đợt sau không sửa hỏng chúng.

**Tương phản: 0 lỗi trên toàn bộ bề mặt, cả ba bề rộng.** Đo bằng cách quy `oklch()`/`lab()` về sRGB qua canvas rồi tự tính WCAG, không ước lượng bằng mắt. Tổng ~1.000 nút chữ qua 3 bề rộng × 9 khu, không một nút nào dưới ngưỡng. (Lần đo đầu của tôi dùng regex `rgb()` và **âm thầm bỏ qua** mọi màu `lab()` — nếu tin nó thì "0 lỗi" là vô nghĩa; con số trên là lần đo lại đã sửa.)

**Placeholder giữ 4,5:1 — yêu cầu mà `PRODUCT.md:62` nói riêng.** Đo `::placeholder` của ô can thiệp: `--ink-3` trên `--bg` = **5,46:1**. Không hạ nhạt "cho thanh thoát".

**Drop cap chịu được ca xấu nhất của tiếng Việt.** `DESIGN.md:82` cảnh báo lỗi này *ẩn* khi chương mở bằng "Đêm" vì `Đ` không có dấu trên. Tôi cố ý viết bản nháp mở bằng **"Ấy là đêm mưa không dứt"** — `Ấ` có cả dấu mũ và dấu sắc. Ảnh `1440-13` và `390-02`: drop cap `Ấ` hiện nguyên hai tầng dấu, không cụt ngọn. `line-height: 0.94` làm đúng việc nó nói.

**Không có lỗi React/hydration nào.** Console qua toàn đợt: 1 issue a11y (§4.6) + 6 cảnh báo preload font vô hại (§4.9). Không error, không cảnh báo hydration.

**Không tràn ngang ở bất kỳ bề rộng nào.** `document.documentElement.scrollWidth === innerWidth` ở cả 1440, 1024, 390 trên cả 9 khu.

**Không vi phạm danh sách CẤM.** Soát cả CSS lẫn ảnh: không `backdrop-filter`, không gradient chữ, không glow, không sidebar navy, không bảng viền đầy ô (bảng chỉ có kẻ ngang 1px), không nhãn chữ hoa giãn cách (`grp` là sentence case; chỗ duy nhất có `text-transform`/`letter-spacing` là `globals.css:2597-2598` và nó *tắt* cả hai). Hai `repeating-linear-gradient` duy nhất là vân sọc chéo của khối "chờ mở" — đúng `DESIGN.md:114` yêu cầu.

**Hàng được chọn dùng đúng `inset 1px`, không phải viền dày.** Đo `box-shadow` ô đầu hàng: `lab(77.4575 12.5001 55.13) 1px 0 0 0 inset`, `border-left-width: 0px`. Đúng `DESIGN.md:115`.

**Token khớp `DESIGN.md` từng giá trị**, và tỉ số thực **tốt hơn** con số tài liệu ghi (§4.7).

**`prefers-reduced-motion` đầy đủ.** `globals.css:2723-2736` gọi tên cả ba selector nhịp đập rồi mới phủ toàn cục `transition-duration: 0.01ms` — có nhánh thay thế, không animation nào không có đường tắt.

**Bàn phím là hạng nhất.** `:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px }` toàn cục, cộng hai override ở chỗ outline bị cắt (`.bang tbody tr`, `.dsHangCho .hangdau`). Vàng trên `--bg` = 10,53:1, thừa ngưỡng 3:1 cho thành phần không phải chữ.

**Trạng thái không bao giờ chỉ dựa vào màu.** Mọi công đoạn đều có đốm + ký hiệu + nhãn chữ: `● đã nghiệm thu`, `▶ đang soạn bản thảo`, `■ trả về viết lại`, `○ chờ trong hàng`, `◆ cửa kiểm định`, `◇ mới gieo`. Ảnh đen trắng vẫn đọc được. (Ngoại lệ duy nhất: ký hiệu trong bộ chọn tác phẩm — §4.5.)

**Trục giữ được hình dạng khi hẹp.** Ở 390 khối bỏ phần chữ phạm vi (`T1 · 1–3` → `T1`) mà giữ tỉ lệ và vị trí, đúng ý định ghi ở `globals.css:41-44`. Cửa sổ chương tự co (1–51 ở 1440 → 1–43 ở 1024 → 1–15 ở 390) và số "ngoài cửa sổ" cập nhật theo (249 → 257 → 285). Không có chỗ nào bịa.

**Ô can thiệp vô hiệu là mẫu mực.** `disabled` + `readOnly` thật (đã kiểm DOM), `cursor: not-allowed`, kèm giải thích in đậm *vì sao*: engine sở hữu quyền ghi, hai process cùng ghi thì ý kiến can thiệp mất trắng — và chỉ luôn sang TUI. Khớp đúng lời mở đầu `internal/serve/serve.go:1-12`.

**Xưởng trống nêu nguyên nhân + đường dẫn thật + lệnh sửa:** "Thư mục gốc không chứa tác phẩm nào có meta/progress.json", `thư mục gốc /tmp/ainovel-empty`, `ainovel-cli run --root <thư mục gốc>`. Rail biến mất đúng (không tác phẩm thì không có khu), transport còn lại và nói "chưa có tác phẩm nào để theo dõi".

**Kiểm định là hàng mảnh có dẫn chứng, không phải thẻ điểm** (`DESIGN.md:116`). Mỗi chiều một hàng: tên chiều, verdict có đốm + chữ, điểm mono, rồi một câu kết luận. Vấn đề kèm `Dẫn chứng:` in serif nghiêng — dùng serif đúng chỗ `DESIGN.md:60` cho phép ("dẫn chứng của Editor").

**Cột nhãn tiếng Việt được nới thật.** `globals.css:597-599` ghi rõ 96px chứ không phải 74px của bản mockup vì "Cung, tập 3" bị ngắt hai dòng. Ở cả 1440 và 1024, `Cung, tập 1` nằm một dòng. Luật 2 của `DESIGN.md:81` được thi hành, không chỉ chép lại.

**Số liệu định dạng theo tiếng Việt:** `2.901` (dấu chấm hàng nghìn), `1,2s` (dấu phẩy thập phân), `$0,00`.

---

## 7. Một điều cần đối chiếu lại với chủ thiết kế

**Serif tràn ra ngoài phạm vi `DESIGN.md` cho phép.** `DESIGN.md:60` viết serif "**chỉ** dùng cho văn bản tiểu thuyết — trích đoạn, bản thảo, dẫn chứng của Editor". Đo được `.tavan` là `13px/1.78 var(--serif)` và nó mang:

- `web/components/NhanVat.tsx:103` — mô tả nhân vật
- `web/components/TheGioi.tsx:194` — mô tả phục bút

Cả hai đều **không** thuộc ba loại được liệt kê. Về mặt chữ nghĩa thì không sao (1.78 vượt sàn, có `max-width: 74ch`, có `text-wrap: pretty`), và lập luận "đây là mô tả nội dung tác phẩm" nghe được. Nhưng nó làm loãng chính tín hiệu mà `DESIGN.md:62` nói serif tồn tại để mang: "thấy serif là thấy văn của tác phẩm, không phải chữ của công cụ".

Đây là quyết định của chủ thiết kế, không phải lỗi. Chọn một trong hai: nới câu ở `DESIGN.md:60` để bao gồm mô tả hồ sơ, hoặc đổi `.tavan` sang `var(--ui)`. Đừng để hai tài liệu và code nói khác nhau.

**Một điểm tôi phải nói rõ là do fixture của tôi:** trong ảnh `1440-23`, bảng chương ghi chương 1 có `2.901` từ còn inspector ghi `Số từ 172`. Con số 2.901 lấy từ `chapter_word_counts` trong `progress.json` (seed-demo ghi), 172 là đếm từ bản nháp tôi tự viết. Trong một lượt chạy thật hai số này khớp. **Nhưng** nó phơi ra một chuyện thật: hai con số đến từ hai nguồn khác nhau và không có chỗ nào đối chiếu, nên một lần lệch thật (ví dụ `edit_chapter` sửa nháp mà không cập nhật `progress.json` — xem `internal/tools/edit_chapter.go:162-169`) sẽ hiện ra im lặng như vậy.

---

## 8. Trả lời thẳng: giao diện này đã dùng được chưa?

**Chưa — còn ba chỗ làm người vận hành hiểu sai, và cả ba đều nằm đúng vào ba câu hỏi mà `PRODUCT.md` nói người vận hành mở studio để hỏi.**

Nói cho công bằng: đây là một giao diện làm rất tốt. Hệ token khớp thiết kế từng giá trị, tương phản không sai một chỗ nào trên cả ba bề rộng, ba luật tiếng Việt được thi hành thật chứ không chép lại, danh sách CẤM không bị vi phạm chỗ nào, trạng thái rỗng ở hầu hết bề mặt nêu được cả nguyên nhân lẫn cách sửa, và ô can thiệp vô hiệu là hình mẫu về trung thực. Bố cục ở 1440 và 1024 gần như không có gì phải nói. Người viết nó rõ ràng đã đọc `PRODUCT.md` và `DESIGN.md`, không chỉ nhìn ảnh mockup.

Nhưng ba chỗ này chặn:

1. **"Dây chuyền còn chạy đúng không?"** — Nhịp đập vẫn đập trên hàng `đang soạn bản thảo` sau khi engine đã dừng, trong khi transport ghi `đang nghỉ` và thanh trên ghi `0 đang chạy` (§2.3). Engine chết đọc ra thành khỏe. Đây đúng là thứ mà `PRODUCT.md:27` đặt làm tiêu chí thành công, và cũng đúng là thứ chỉ mở trình duyệt mới thấy — ảnh tĩnh và pytest đều không bắt được một animation nói sai.

2. **"Chất lượng có tuột không?"** — Rail ghi `Kiểm định 0` trong khi bề mặt có bản duyệt 7 chiều với một vấn đề severity `error` (§3.1). Người vận hành đọc "0" rồi đi qua.

3. **"Thành quả đọc ra sao?"** — Không đọc được. Chương đã nghiệm thu hiện "chưa có bản thảo" vì API đọc bản nháp thay vì bản chốt (§2.1), và nút "Đọc toàn văn chương" bấm xong thì tự biến mất không để lại đường quay lại (§2.2).

Ba lỗi này sửa nhỏ: một nhánh fallback trong `drafts.go`, một class `dap` truyền vào `BangChuong`, một cách đếm trong `Rail.tsx`, một nhánh rỗng trong `Inspector.tsx`. Không có gì phải làm lại về kiến trúc hay thiết kế.

Sau ba lỗi đó, hai chỗ nữa nên sửa trước khi ai đó thật sự vận hành trên điện thoại: transport ở 390 đẩy hết giá thành và năng suất ra ngoài khung (§3.4), và hai `line-height` mà khe mực xấu nhất còn 0,31px và 1,62px (§3.2, §3.3) — hôm nay chưa chạm dấu, nhưng tiêu đề chương do mô hình đặt nên ca xấu nhất chỉ là chuyện thời gian.
