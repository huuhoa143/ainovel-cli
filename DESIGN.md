# Design

Hệ thiết kế của **ainovel studio** (web) — chốt từ hướng D đã được duyệt: `docs/design/explorations/d-studio.html`.

## Visual Theme

Sàn sản xuất tối, mật độ cao, lấy quy ước của bàn dựng phim và DAW: thanh transport luôn hiện ở đáy, dòng sản xuất dạng lane ở giữa, panel inspector bên phải.

**Vì sao tối:** engine chạy dài, thường là những phiên đêm hoặc nền màn hình phụ bên cạnh terminal. Người vận hành ngó vào rồi rời đi. Đây là lý do vật lý, không phải "công cụ thì trông ngầu khi tối".

**Vì sao là nâu-mực chứ không phải đen trung tính:** bản sắc màu đã tồn tại trong TUI (`internal/entry/tui/theme.go`) là tông "sách cũ ấm" — vàng `#b8860b` / `#e5b449`, lam-lục `#5fb8a3`. Giữ bản sắc thắng việc bịa mới, nên nền lệch về hue vàng của thương hiệu. Vàng đặt lên nền cùng họ thì không chỏi như đặt trên đen lạnh, và web với TUI thành một hệ chứ không phải hai sản phẩm.

Chiến lược màu: **restrained** — bề mặt là trung tính đã nhuộm, một màu tín hiệu duy nhất chiếm dưới 10% diện tích.

## Dấu hiệu

Logo và favicon là **một** dấu hiệu: ba lane của trục sản xuất Tập → Cung → Chương, độ rộng
giảm dần, mỗi lane một trạng thái của bảng ngữ nghĩa.

| Lane | Màu | Nghĩa |
|---|---|---|
| trên · rộng nhất | `--teal` | đã nghiệm thu |
| giữa | `--gold` | đang chạy — **màu tín hiệu duy nhất**, nằm giữa nên bắt mắt nhất |
| dưới · ngắn nhất | `--ink-3` | chưa tới |

**Vì sao là ba lane, không phải một chữ cái.** Hình đặc trưng nhất của sản phẩm đã có sẵn
trên buồng lái, và nó cũng đúng là ẩn dụ mà tài liệu này chốt (bàn dựng phim / DAW). Một chữ
"a" cách điệu thì thương hiệu nào cũng dùng được; ba lane thì chỉ sản phẩm này dùng được.

**Độ rộng phải GIẢM DẦN.** Ba dải bằng nhau đọc thành nút hamburger; bậc thang thì không.

**Ổ khoá thu gọn theo bề rộng, không biến mất.** Dưới 700px phần CHỮ ẩn (nó tốn 88px và
không mang tin — ứng dụng đang mở rồi thì không ai hỏi nó là ứng dụng gì), còn DẤU HIỆU ở
lại: nó chỉ tốn 20px và là thứ duy nhất còn nói đây là sản phẩm nào. Dấu hiệu mang
`flex: none` — flex nén chứ không tràn, và một dấu hiệu bị nén ngang thành hình méo còn tệ
hơn một dấu hiệu bị ẩn.

### Hai bản, một hình — và cái bẫy giữa chúng

Chúng không dùng chung mã được: logo là SVG nội tuyến (đọc được biến CSS), favicon là tệp
tĩnh mà trình duyệt tải như một ảnh riêng nên buộc phải viết hex. Nên hình học và màu nằm ở
`web/lib/dauHieu.ts`, và `web/lib/dauHieu.test.ts` **đọc `app/icon.svg` trên đĩa** rồi đối
chiếu từng con số.

Bài kiểm đó không thừa: trước bản này hai bên đã lệch thật. `icon.svg` ghi
`#221d17 / #4f9d8b / #e0a53a` kèm chú thích khẳng định đó là token đã chuyển sang sRGB, trong
khi token thật cho `#0e0c09 / #71c1ad / #eab656` — sai cả ba màu, và không có gì đối chiếu
nên không ai thấy.

Hai luật cứng cho tệp favicon, cả hai đều là lỗi đã xảy ra:

- **Khai `width`/`height`, không chỉ `viewBox`.** Thiếu kích thước nội tại thì SVG không có
  cỡ để rasterise, và `new Image()` bắn `onerror`.
- **KHÔNG viết hai dấu gạch nối liền nhau trong khối chú thích.** XML cấm chuỗi đó bên trong
  comment và SVG được phân tích như XML nghiêm ngặt. Một lần lỡ viết tên biến CSS đầy đủ đã
  làm cả tệp thành XML sai định dạng — trình duyệt không báo gì, nó chỉ im lặng không vẽ.

Màu hex lấy từ chính trình duyệt (tô token lên canvas 1×1 rồi đọc pixel), không tự chuyển
OKLCH bằng tay.

## Color

OKLCH toàn bộ. Tỉ số tương phản ghi kèm là so với `--bg`.

### Bề mặt

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--bg` | `oklch(0.155 0.008 74)` | nền canvas |
| `--panel` | `oklch(0.185 0.009 74)` | rail, inspector, thanh trên, transport |
| `--panel-2` | `oklch(0.215 0.010 74)` | ô nhập, khối chưa chạy, hàng được chọn |
| `--raised` | `oklch(0.245 0.011 74)` | nút bật, nền thước đo |
| `--line` | `oklch(0.275 0.010 74)` | viền phân vùng |
| `--line-2` | `oklch(0.225 0.009 74)` | viền trong bảng, phân cách nhẹ |

### Chữ

| Token | Giá trị | Tương phản | Dùng cho |
|---|---|---|---|
| `--ink` | `oklch(0.945 0.010 82)` | 16.1:1 | thân bài, giá trị chính |
| `--ink-2` | `oklch(0.755 0.012 82)` | 8.2:1 | chữ phụ, ô bảng |
| `--ink-3` | `oklch(0.625 0.011 82)` | 4.9:1 | nhãn nhỏ, placeholder — **sàn cứng, không hạ thêm** |

`--ink-3` là giới hạn dưới. Mọi lần muốn "nhạt hơn cho thanh thoát" đều phải bị từ chối: nhãn nhỏ và placeholder chịu cùng ngưỡng 4.5:1 như thân bài.

### Ngữ nghĩa

| Token | Giá trị | Nghĩa |
|---|---|---|
| `--gold` | `oklch(0.805 0.128 80)` | đang chạy, tiêu điểm — **màu tín hiệu duy nhất** |
| `--teal` | `oklch(0.755 0.085 176)` | đã nghiệm thu |
| `--amber` | `oklch(0.785 0.125 62)` | cần chú ý, chờ viết lại, ngữ cảnh cao |
| `--red` | `oklch(0.705 0.155 25)` | lỗi, mốc ngưỡng nén |
| `--violet` | `oklch(0.745 0.095 300)` | tên tool, cửa kiểm định |

Quy tắc: **màu không bao giờ là kênh thông tin duy nhất.** Mọi trạng thái công đoạn mang cả đốm màu, ký hiệu, và nhãn chữ.

## Typography

Ba họ chữ, mỗi họ một nhiệm vụ rõ ràng — ghép theo trục tương phản, không ghép hai sans gần giống nhau.

| Token | Họ | Nhiệm vụ |
|---|---|---|
| `--ui` | Inter | toàn bộ giao diện. Hỗ trợ tiếng Việt đầy đủ |
| `--mono` | JetBrains Mono | mọi số liệu, tên tool, mã step. Canh phải trong bảng |
| `--serif` | Noto Serif | **chỉ** dùng cho văn bản tiểu thuyết — trích đoạn, bản thảo, tiêu đề chương, dẫn chứng của Editor |

Serif là dấu hiệu ngữ nghĩa: thấy serif là thấy văn của tác phẩm, không phải chữ của công cụ.

**Phép thử khi gặp một loại chữ mới:** chữ này có nằm trong bộ truyện xuất bản không? Có thì serif, không thì `--ui`. Danh sách bốn mục trên là kết quả của phép thử, không phải một bảng trắng để tra — trích đoạn và bản thảo là văn đó, tiêu đề chương được in cùng nó, và dẫn chứng của Editor mang serif vì nó *trích lại* văn đó chứ không vì Editor viết ra nó.

Phép thử này loại hẳn một loại dễ nhầm: **mô tả trong hồ sơ tác phẩm** — mô tả nhân vật, mô tả phục bút, ghi chú luật thế giới. Chúng là bản ghi của engine *về* tác phẩm, viết cho người vận hành, và người đọc truyện không bao giờ thấy chúng; cùng loại với `core_event` của khế ước hay `comment` của bản duyệt. Cho chúng serif thì mỗi hồ sơ đọc như một trang truyện và tín hiệu serif loãng đi đúng chỗ nó cần sắc nhất. Chúng dùng `--ui`, vẫn giữ `line-height` và `max-width` của khổ đọc dài.

### Thang cỡ

| Vai trò | Cỡ / weight / line-height |
|---|---|
| nền giao diện | 13px / 400 / 1.5 |
| tiêu đề vùng | 14.5px / 600 / 1 |
| nhãn nhóm | 11–11.5px / 500 / 1 |
| ô bảng | 12.5px / 400 |
| số liệu | 12px mono / 400 |
| transport | 11.5px / 400 |
| **văn tiểu thuyết** | **13px serif / 400 / 1.72** |

### Ràng buộc tiếng Việt

Ba luật này sinh ra từ lỗi thật đã gặp khi dựng bản thử, không phải phòng ngừa lý thuyết:

1. **`line-height` văn bản ≥ 1.72** (khổ đọc dài ≥ 1.78). Dấu tiếng Việt xếp hai tầng — `ế`, `ộ`, `ữ`, `ỗ` ăn vào khoảng trên, dấu nặng ăn khoảng dưới. Mức 1.5 đủ cho tiếng Anh sẽ làm dấu huyền dòng dưới chạm dấu nặng dòng trên.
2. **Cột nhãn rộng hơn phản xạ 20–30%.** Nhãn tiếng Việt dài hơn tiếng Anh. Cột 82px làm "Nhịp bắt buộc" ngắt hai dòng; phải 104px.
3. **Chữ hoa có dấu cần chừa chỗ phía trên.** Drop cap `line-height: 0.94`, không phải `0.86` — `Ế`, `Ộ`, `Ữ`, `Ấ` cao hơn Latin trơn và sẽ bị cắt ngọn. Lỗi này ẩn khi chương mở bằng "Đêm" vì `Đ` không có dấu trên, nên phải chừa chỗ ngay từ đầu.

Ngoài ra: `text-wrap: balance` cho tiêu đề, `text-wrap: pretty` cho văn xuôi dài.

## Ba màn

Điều hướng có HAI tầng, không một. Tầng trên là **màn**; tầng dưới là **khu**.

| Màn | Phạm vi | Chứa |
|---|---|---|
| **Quản lý** | cả xưởng | danh sách tác phẩm · dải việc cần bạn · tổng xưởng · tạo tác phẩm · cùng dựng |
| **Cài đặt chung** | mọi tác phẩm | nhà cung cấp & khóa · model theo vai (mặc định) · chi phí toàn xưởng |
| **Xưởng sản xuất** | một tác phẩm | 13 khu sáng tác và vận hành của cuốn đang mở |

**Màn mở đầu là Quản lý**, bất kể xưởng có mấy cuốn. `?tp=` trên URL vẫn thắng và mở thẳng
xưởng sản xuất của cuốn đó; `?khu=` thắng cả hai. Điều khoản cũ ("một cuốn thì vào buồng lái,
vì một bảng một dòng không quyết định gì") đúng khi Xưởng là một BẢNG; giờ Quản lý là một MÀN
mang dải việc-cần-bạn, tổng xưởng và hai đường tạo tác phẩm, nên nó trả lời được cả cho xưởng
một cuốn.

**Vì sao phải là một tầng thật, không phải một tên nhóm.** Ranh giới cấp-máy/cấp-tác-phẩm đã
tồn tại trong mã từ lâu (`laKhuMucMay`) nhưng chỉ được thể hiện bằng nhãn nhóm rail "Chung cho
mọi tác phẩm". Cái tên thua, và phép đo nói rõ vì sao: đứng ở bề mặt Cấu hình máy — thứ sửa
`~/.ainovel/config.json` cho MỌI cuốn — thanh trên vẫn là bộ chọn của một cuốn, rail vẫn liệt
kê 14 khu của cuốn đó, và transport dưới đáy vẫn mời `▶ Chạy` cho cuốn đó. Ba trong bốn vùng
của khung nói về cuốn A trong khi canvas nói về cả máy. Một nhãn nhóm không thắng nổi ba vùng.

Nên **đổi màn là đổi cả khung**, không chỉ đổi canvas.

## Layout

Khung ứng dụng cố định, không phải trang cuộn:

```
grid-template-rows:    44px  1fr  30px
grid-template-columns: 194px 1fr  292px
grid-template-areas:   "bar    bar     bar"
                       "rail   canvas  insp"
                       "trans  trans   trans"
```

| Vùng | Vai trò |
|---|---|
| `bar` | **màn theo tác phẩm:** chọn tác phẩm · **hai màn kia:** gốc xưởng. Cộng nút tạo tác phẩm + tình trạng cả xưởng |
| `rail` | **ba màn ở đỉnh** (luôn hiện, không thu được), rồi các khu của màn đang mở, có số đếm việc tồn |
| `canvas` | bề mặt của khu đang mở |
| `insp` | chi tiết đơn vị đang chọn, có tab: Khế ước / Kiểm định / Bản thảo |
| `trans` | trạng thái máy, năng suất, giá thành — **chỉ ở màn xưởng sản xuất** |

Điểm ngắt: `1240px` bỏ inspector, `860px` rail **thôi làm cột và thành dải ngang cuộn được** —
không bỏ. Điều khoản cũ ("860px bỏ rail") đúng khi rail là danh sách trang trí của một bề mặt
duy nhất; giờ nó là đường điều hướng duy nhất giữa 13 khu của một tác phẩm, nên bỏ nó là khóa
người dùng trong khu đang mở. Ở dải ngang thì nhãn nhóm và phép thu nhóm đều tắt: không còn
nhóm thì không còn cái để thu, và một nhóm đóng ở đó sẽ ẩn mục mà không còn nút nào mở lại.

**Bộ chuyển màn thì GHIM TRÁI ở dải ngang, không cuộn đi cùng các khu.** Đo được ở 390px:
effect `scrollIntoView` kéo khu đang mở vào tầm nhìn, và việc đó đẩy cả ba hàng màn ra ngoài
mép trái — màn hình chỉ còn mấy mục khu, không dấu hiệu nào nói rằng có ba màn. Đó đúng câu
người dùng đã hỏi một lần rồi: *"các màn khác đâu rồi ta"*.

### Transport KHÔNG còn "luôn hiện"

Điều khoản cũ nói transport không bao giờ bị bỏ. Nó đúng khi studio chỉ có một phạm vi. Giờ
transport nói năng suất · giá thành · thời lượng của MỘT cuốn và mang nút `▶ Chạy` — một nút
tiêu tiền thật. Đặt nó dưới màn Quản lý (canvas liệt kê mọi cuốn) là dán một điều khiển
cấp-tác-phẩm vào đáy một bề mặt cấp-xưởng, và mời một cú bấm không có chủ ý vào giữa một màn
đang được quét mắt. Đây cũng chính là luật đã cấm nút chạy trong bảng Xưởng ("một đường tiêu
tiền duy nhất") — trước đây nó bị lách qua đường transport.

Hàng transport bị bỏ khỏi LƯỚI ở hai màn kia, không để trống 30px: một dải trống ở đáy là một
vùng giao diện không nói gì, cùng lý do mà `khung.rong` đã bỏ hẳn cột inspector.

### Máng lề: `--mang: 18px`

Mọi khối cấp một trong `.canvas` bắt đầu CHỮ ở đúng một tọa độ. Máng là tọa độ của **chữ**,
không của hộp: khối nào tự mang đệm trong (ô bảng 10px, ô dải tổng 12px) thì máng của nó là
phần bù, không phải 18px lặp lại.

Điều khoản này sinh ra từ một lỗi đo được, không phải sở thích. Trên màn Quản lý, chữ bắt đầu
ở **18 · 32 · 16 · 10 · 14** — năm gốc lề trên một màn hình. Người dùng nói nguyên văn: *"text
bị sát lề quá, không những trái mà lề trên"*. Nguyên nhân là 18px từng nằm rải trong `.head`
và `.sect`, còn mọi khối khác tự chọn lấy. Một hằng thì chỉ có một chỗ để sai.

Hai hệ quả bắt buộc:

- **Bảng đặt lề ở Ô ĐẦU/Ô CUỐI, không ở `.bangwrap`.** `.bangwrap` là vùng cuộn ngang, nên lề
  đặt ở đó sẽ cuộn đi mất cùng nội dung và cột đầu lại dính mép ngay khi kéo ngang một pixel.
- **Đoạn văn đứng thẳng trong canvas dùng MARGIN, không padding.** `max-width: 74ch` là khổ
  đọc, và với `box-sizing: border-box` thì padding ăn vào khổ đó — khổ đọc phải là chữ, không
  phải chữ cộng lề.

Khối có viền (`.vphacap`) căn bằng MÉP VIỀN, không bằng chữ bên trong: một hộp có viền thẳng
hàng với cột chữ là hộp đặt viền ở máng.

### Gần nhau = một nhóm: khoảng NGOÀI phải lớn hơn khoảng TRONG

Mắt gom theo khoảng cách. Nên với mọi danh sách mà một mục chứa nhiều dòng, khoảng cách
**giữa hai mục** phải lớn hơn khoảng cách **giữa các dòng trong một mục**. Đảo lại thì các
dòng của hai mục khác nhau trông gắn bó hơn hai dòng của cùng một mục, và danh sách đọc ra
thành một khối chữ không có hàng. Người dùng gọi hiện tượng đó là *"ríu rít"*.

Hai chỗ đã vi phạm, cả hai đo được:

| Chỗ | Khoảng NGOÀI (cũ → mới) | Khoảng TRONG |
|---|---|---|
| Hàng bảng (tên + mã, tổng + đơn giá) | 14px → **19px** | 14–17px |
| Danh sách nhân vật ở inspector | 5px → **14px** | 7px |

Kèm hai luật con:

- **Hàng tiêu đề bảng phải có band riêng.** `padding-top` từng là `0`, nên chữ tiêu đề cột
  dính vào bất cứ dải nào nằm trên — đo được ở màn Quản lý: khoảng cách bằng đúng **0**. Giờ
  là `11px` trên / `8px` dưới: tiêu đề cột thuộc về bảng bên dưới, không thuộc dải bên trên.
- **Cặp xếp chồng trong một ô thì THẮT LẠI** (`line-height: 1.35`), để cặp đó đọc ra là một
  đơn vị thay vì hai dòng rời.

### Thanh cuộn không được ăn bề rộng của rail

Rail cao thêm vì bộ chuyển màn, và ở khung 722px nội dung tràn đúng **2px**. Hai pixel đó bật
một thanh cuộn 16px, thanh cuộn ăn mất bề rộng, và nhãn dài nhất — "Nhật ký phán quyết" — bị
cắt thành "Nhật ký phán q…". Hai pixel DỌC làm mất chữ theo chiều NGANG.

Nên rail dùng thanh cuộn mảnh (4px), cùng lối với dải ngang của chính nó và với transport.

Bán kính: `--r: 5px` thống nhất. Không có bán kính lớn — công cụ chuyên nghiệp không bo tròn mềm.

Lớp z có tên: `--z-sticky: 10`, `--z-pop: 30`, `--z-tip: 40`. Không dùng số tùy tiện kiểu 999.

## Components

- **Dải việc tiếp theo** — hàng đầu của bề mặt mặc định: một đốm trạng thái, một câu nói máy đang làm gì *kèm số thật của cuốn đang mở*, một câu chỉ đường, và nhiều nhất hai nút. Nó không mang dữ liệu mới — mọi thứ trong đó đã có ở đâu đó trên trang; nó mang **thứ tự ưu tiên**. Hai luật cứng: (a) nút ở đây chỉ ĐIỀU HƯỚNG, việc chạy engine để nguyên ở transport, vì hai nút cùng gọi một API tiêu tiền thì trạng thái khóa của chúng không thấy nhau; (b) nút mời đọc chỉ trỏ tới chương CHẮC CHẮN có bản thảo (`done`/`rewrite`), và nó chọn chương rồi mới đổi khu — mở bề mặt đọc mà chưa chọn chương là mở một khổ đọc trống.
- **Bộ chuyển màn** — ba hàng ở đỉnh rail, KHÔNG mang ký hiệu (khác hẳn mục khu ngay dưới: chúng là một tầng khác, nên sự khác nhau phải đọc được từ hình dạng chứ không từ việc nhớ thêm ba biểu tượng). Cái chúng mang thay vào đó là **dòng phạm vi** — "cả xưởng" / "mọi tác phẩm" / tên cuốn đang mở — tức đúng điều đang bị đọc nhầm. Hàng "Quản lý" mang dấu amber khi có cuốn nào đó còn việc đã ký, vì người đang đứng trong xưởng sản xuất không thấy bảng Quản lý.
- **Nhóm rail thu gọn được** — nhãn nhóm là nút, thu bằng `display: none` chứ không bằng cách thôi render. Ba hệ quả bắt buộc: khu đang mở luôn kéo nhóm chứa nó mở ra (đọc `[aria-current]` từ DOM, không từ một bảng khu→nhóm sẽ lệch), nhóm đóng mà bên trong có việc tồn thì mang dấu amber ra ngoài, và dải ngang dưới 860px bật lại toàn bộ mục bằng một `@media`. **Mặc định giờ là MỞ**: rail chỉ còn phục vụ một màn, nên 14 mục trong ba nhóm vừa một cột 900px và không còn lý do nào để giấu. Phép thu vẫn còn — nó là của người dùng, không phải của thiết kế.
- **Dải việc cần bạn** (đầu màn Quản lý) — mang THỨ TỰ ƯU TIÊN, không mang dữ liệu mới. Ba trạng thái là ba loại sự thật khác nhau và không được gộp: `activity === 'running'` là engine đang chạy (đo được từ `/workshop`); "đã ký" là ý định trên ĐĨA đọc từ `meta/run.json`; và không-có-gì thì nói thẳng ra. Câu "engine đang đứng ở cửa" chỉ tồn tại trong `/studio` của cuốn ĐANG MỞ engine — và vì `soToiDa: 1`, nhiều nhất một cuốn trong cả xưởng nói được câu đó.
- **Trục sản xuất (lane)** — Tập / Cung / Chương là ba lane cùng một trục ngang, độ rộng khối tỉ lệ với phạm vi thật. Lane chương: một vạch một chương. Khối "chờ mở" dùng vân sọc chéo để phân biệt *chưa quy hoạch* với *đã quy hoạch nhưng chưa chạy* — hai trạng thái khác nhau về bản chất trong mô hình cuốn-vòng-cung hai tầng.
- **Bảng chương** — số liệu canh phải và dùng mono; trạng thái công đoạn dùng `đốm + chữ`; hàng được chọn đánh dấu bằng `inset box-shadow 1px`, **không** dùng viền màu dày bên trái.
- **Inspector có tab** — Khế ước (yêu cầu chương) / Kiểm định (7 chiều) / Bản thảo. Kiểm định là hàng mảnh có kết luận kèm dẫn chứng, không phải thẻ điểm.
- **Nhật ký phán quyết** — mỗi dòng: giờ, loại phán quyết, lý do dựa trên sự thật, nút xem lại. Đây là hiện thân của nguyên tắc "máy tất định phải nhìn thấy được".
- **Chip kết nối** — nhãn phải nói **hệ quả**, không nói sự thật kỹ thuật. "Đã nối" nói rằng có một socket đang mở, thứ người vận hành không dùng được vào việc gì; điều họ cần biết là *số trên màn có tự cập nhật không, hay là ảnh chụp lúc tải trang*. Nên nhãn là `engine · trực tiếp` — "trực tiếp" là chữ buồng lái đã dùng sẵn ("Dòng sự kiện · trực tiếp từ engine"), nên chip và buồng lái nói cùng một thứ tiếng. Bốn ca có bốn chú giải RIÊNG, và ca `mat` nói thẳng điều đắt nhất: số đang hiện đã DỪNG cập nhật và có thể đã cũ. Bản ngắn dưới 700px bỏ tiền tố; hai bản cùng trong DOM, CSS chọn, `aria-label` giữ bản đầy đủ. Chip này KHÔNG nói engine đang chạy hay nghỉ — câu đó ở transport.
- **Transport** — các ô phân cách bằng viền 1px, số liệu mono. Thước ngữ cảnh có **vạch đỏ ở mốc 85%** để thấy ngưỡng nén sắp tới, không chỉ hiện một con số.

## Motion

Tối giản và có lý do. Không bounce, không elastic.

- Easing chuẩn: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint).
- Transition giao diện 120–180ms, chỉ trên `background`, `color`, `border-color`, `filter`.
- Chuyển động duy nhất mang thông tin: **nhịp đập của đốm trạng thái "đang chạy"** (2.2s, đổi `opacity`). Nó phân biệt *đang chạy* với *đã dừng ở trạng thái này* — điều mà ảnh tĩnh không nói được.
- Không animate thuộc tính layout.
- `prefers-reduced-motion: reduce` → tắt nhịp đập, mọi transition về `0.01ms`.
- Nội dung **không** bị gate sau animation: hiển thị mặc định rồi mới thêm hiệu ứng.

## Mẫu cho bề mặt GHI

Studio thôi chỉ-đọc, nên có một nhóm mẫu mới. Ghi ra vì chúng là quyết định, không phải sở thích.

### Nút nói ra hệ quả, không nói ra hành động

Câu cảnh của bề mặt ghi: *người vận hành ngồi trước máy lúc khuya, sắp bấm một nút sẽ chạy 6 giờ và tiêu 35 đô*. Nên nhãn nút nói cái sẽ xảy ra, không nói cái nút làm:

- ô can thiệp: `Tiêm vào lượt đang chạy` / `Đánh thức lượt mới` — hai hệ quả khác nhau, nên hai nhãn khác nhau, và nhãn đổi theo trạng thái thật của engine
- tạo tác phẩm: câu *"bấm Bắt đầu là gọi model thật và tiêu tiền thật"* đứng **ngay trên** nút, không ở đầu trang — người dùng đọc dòng gần nút nhất trước khi bấm
- KHÔNG hiện số tiền dự kiến trước khi Arbiter quyết số chương: mọi con số lúc đó là số bịa

### Nút chỉ hiện khi nó làm được việc

Không vẽ một nút rồi để nó thất bại với lỗi từ tầng dưới:

- `Dừng` và `Chạy` loại trừ nhau theo `IsRunning`, không phải hai nút luôn hiện
- `Cho đi tiếp 1 chương` chỉ có ở chế độ nghiệm thu — ở chế độ tự chạy engine không chờ giấy phép nào
- chưa mở máy thì hiện ĐÚNG MỘT nút `Mở máy`, không hiện bốn nút cùng thất bại vì một lý do
- nút `Lưu` của dải kênh vai chỉ bật khi có gì đổi thật: bốn nút luôn bật cạnh nhau mời bấm bừa, và mỗi cú bấm dựng lại model set của engine đang chạy

### `disabled` khi đang gửi là bắt buộc

Bấm đôi một nút ghi = hai lượt ghi chồng nhau. Với nút tạo tác phẩm thì đó là hai engine và tiền đôi.

### Modal chỉ dùng khi hệ thống THẬT SỰ bị chặn

Đúng một chỗ dùng modal: khi engine gọi `ask_user` rồi đứng chờ. Nó không đóng được bằng ESC hay bấm ra ngoài, và **không có nút Đóng** — đóng không làm engine đi tiếp, nên một nút như thế là nút hứa hẹn sai. Lớp phủ tối đặc (`0.86` alpha), không phải glass mờ: bề mặt phía sau đúng nghĩa là không dùng được lúc này.

### Trạng thái bằng nền và màu chữ, không bằng dải cạnh

Dải cạnh màu bị cấm (xem danh sách CẤM). Nên:

- vai đã đặt riêng vs thừa hưởng: khác **nền** (`--panel-2` vs `--panel`)
- dòng nhật ký lỗi/cảnh báo: khác **màu chữ**, không phải nền cả dòng — một dòng nền đỏ trong danh sách dài làm mắt nhảy tới nó rồi mất mạch đọc theo thời gian
- `Dừng` mang viền amber, KHÔNG đỏ: đỏ nghĩa là lỗi, còn dừng có chủ ý không phải lỗi
- `Xóa` trong bảng: lúc NGHỈ là chữ `--ink-3`, không nền không viền; `--red` chỉ hiện ở
  `:hover`/`:focus-visible`, và vẫn không tô nền

#### Hành động phá hủy trên bề mặt để quét mắt

Điều khoản `Xóa` ở trên là suy ra từ hai điều khoản ngay trên nó, không phải một ngoại lệ:
xóa có chủ ý cũng không phải lỗi (nên nghỉ thì không mang màu lỗi), và một khối màu trong
danh sách dài làm mắt nhảy tới nó (nên không tô nền). Bản đầu của nút này vi phạm cả hai —
nó dùng `.nutPhu.nguyHiem`, mà `.nutPhu` có sẵn `background: var(--raised)` + viền, nên ba
hàng thành ba chip đỏ có nền.

Luật chung: **hành động phá hủy lùi lúc nghỉ, tuyên bố lúc được chỉ vào.** Sức nặng của nó
thuộc về lời xác nhận — nơi đọc ra số chương và số tiền sắp mất — chứ không thuộc màu sắc ở
trạng thái nghỉ. Một bề mặt liệt kê mười cuốn không được có mười điểm báo động.

Kèm theo: hai nút cùng một hàng phải cùng hệ chữ. Bản đầu lệch `Chi tiết` ở bốn thuộc tính
(11px/500 so với 12px/400, bo 3px so với 5px, đệm 4px so với 3px, có nền so với không) — bốn
chỗ lệch thì không đọc ra hai cấp bậc, nó đọc ra là hỏng.

### Biểu mẫu tiếng Việt

- cột nhãn **132px**, không 96px như phản xạ: `Nhà cung cấp`, `Địa chỉ gốc`, `Độ suy luận` dài hơn nhãn Anh 20–30%
- dưới 560px thì gập xuống một cột — ô nhập bị bóp là lỗi tệ hơn nhãn xuống dòng
- `line-height` **1.72** cho nhãn, **1.78** cho ô nhập nhiều dòng: dấu tiếng Việt xếp hai tầng
- ô nhập chữ mono cho thứ **đối chiếu được** (khóa, địa chỉ, tên model) — chúng là định danh, và mono làm sai một ký tự nhìn ra được

### Một con số tổng phải mang MẪU SỐ của nó

Đo trên xưởng thật: tổng chi phí `$7,37` với `counted: 1` trên ba cuốn — hai cuốn kia chưa có
`meta/usage.json` nên không có gì để cộng. Một con số tiền không kèm mẫu số sẽ được đọc thành
"cả xưởng tốn có thế", và người vận hành lập ngân sách theo nó. Nên ô tiền mang thêm một dòng
`đo được ở 1/3 cuốn`, và dòng đó tông **amber** chứ không `--ink-3`: nó không phải một đơn vị,
nó là một lời báo rằng con số bên cạnh chưa phủ hết.

Cùng luật cho `missing_assistant_usage`: số lượt mô hình không trả usage nói về ĐỘ TIN CẬY của
mọi con số phía trên, nên nó đứng ngay dưới chúng chứ không ở cuối trang.

### Thanh tỉ lệ phải có mẫu số của CHÍNH dải nó

Hai dải bổ (theo vai / theo model) cộng lại bằng nhau nhưng ĐỈNH thì không. Dùng chung một mốc
làm thanh của `gemini-2.5-pro` tính ra **176%** — và nó không lộ ra như lỗi vì `overflow: hidden`
cắt phần thừa: thanh trông đầy 100% và đọc ra là "cao nhất", đúng lúc nó thực ra gần gấp đôi cái
được lấy làm mốc. Một thanh nói dối mà không có vạch nào cho thấy nó đang nói dối.

### Chữ trên `--gold` phải tối

`--gold` ở L 0.805. Chữ sáng trên nó không đạt AA, nên nút chính dùng `oklch(0.19 0.02 74)`.

### `min-width: 0` chỉ cho phép co; `max-width` mới buộc

Một block con có `min-content` lớn hơn cha sẽ **tràn ra ngoài cha và đè** phần tử bên cạnh, và `text-overflow: ellipsis` không bao giờ chạy. Đo được ở thanh trên: khung bọc 150px mà picker 237px, tràn 88px, phủ lên nhãn `dòng sự kiện`. Cần cả hai.

### Vùng tự cuộn phải nhường người đang đọc

Khu văn sống tự cuộn theo chữ mới, và đó là phép ĐO chứ không phải sở thích: chia khu chữ của
`scripts/sample.gif` thành tám dải ngang thì bảy dải TRÊN cũng đổi 59–73/254 khung — nếu chữ
chỉ thêm ở dưới thì chúng phải đứng im.

Nhưng tự cuộn phải DỪNG khi người dùng cuộn lên, kèm một nút "về cuối". Nhịp delta đã đo là
trung vị **2ms**, nên không dừng thì mỗi mẩu lại kéo màn hình về đáy và đọc lại một đoạn dài là
bất khả. Ngưỡng bám đáy là **24px**, không so bằng đúng: trình duyệt trả số lẻ do
devicePixelRatio và bố cục sub-pixel, nên so bằng 0 làm khu rớt khỏi chế độ tự cuộn ngay nhịp
đầu.

### Hai bộ đệm, hai việc — đừng lẫn

Văn sống có bộ đệm ở **cả hai** phía, và chúng giữ hai thứ khác nhau. Server giữ đúng LƯỢT
HIỆN TẠI (trần 512KB, cắt từ ĐẦU) vì nó chỉ cần đủ cho người mở trang giữa một lượt. Client giữ
**3 lượt gần nhất HOẶC 512KB**, cái nào chạm trước, bỏ từ lượt cũ nhất.

Phải có cả hai trần: chỉ đếm lượt thì một lượt Writer bằng cả chương vẫn phình; chỉ đếm byte thì
một lượt dài đẩy hết lượt trước ra và mất luôn vạch ngăn.

### Lệnh xóa của terminal thành VẠCH NGĂN trên web

TUI xóa sạch khu chữ ở mỗi lượt vì terminal không cuộn lại được. Trình duyệt giỏi đúng chỗ đó,
nên vứt phần vừa đọc là bỏ phí. Vạch chỉ vẽ GIỮA hai lượt — một vạch trên cùng khẳng định có
một lượt phía trên nó mà lượt đó đã bị trần cắt mất.

### Dải trạng thái ↔ dải việc tiếp theo: đổi, không hiện cả hai

Máy chạy → dải trạng thái (vai · việc tồn · ngữ cảnh). Máy nghỉ → dải "việc tiếp theo".

Lúc nghỉ không có gì đang chảy để xem và câu người dùng mang theo là "giờ tôi làm gì". Lúc chạy
thì ngược lại, và một dải "việc tiếp theo" lúc đó là mời bấm một nút thứ hai trong khi một lượt
đang tiêu tiền — hai nút cùng gọi `POST /run` không thấy trạng thái khóa-lúc-đang-gửi của nhau.

### `null` KHÁC `0`, và giao diện phải vẽ hai thứ khác nhau

Các trường sống (`agents`, `idle_agents`, `advance`, `context`, `in_progress_chapter`, `runtime`)
là `null`/`""` khi engine ĐÓNG — nghĩa "không đo được", không nghĩa "đo được, bằng không". Một
thước ngữ cảnh 0% và một dấu "không có nguồn" nói hai điều khác nhau.

Mảng rỗng cũng vậy và theo chiều ngược: `idle_agents: []` nghĩa "đã đo, không ai chờ" nên KHÔNG
vẽ dòng nào; `null` mới vẽ dấu không-đo-được. Lỗi này đã xảy ra thật — dải từng hiện
"chờ: không đo được" ngay cạnh một vai đang làm việc.

### Liveness đọc từ `runtime`, không từ `activity`

`book.activity` suy từ mốc checkpoint trong store, nên nó trễ ở CẢ HAI chiều: engine vừa nhận
giấy phép và đang viết mà `activity` còn `idle`, hoặc engine đã dừng ở cửa nghiệm thu mà
`activity` còn `running` vài phút. `runtime` là trạng thái engine tự khẳng định. `activity` chỉ
còn là nguồn dự phòng cho ca engine đóng.

### Cửa nghiệm thu KHÔNG dùng modal

Modal chỉ dành cho `ask_user`, lúc đó engine chặn thật. Ở cửa nghiệm thu engine cũng đứng chờ,
nhưng người dùng cần đọc bản thảo, xem chi phí và đối chiếu chương trước để quyết định — chặn
họ lại là chặn đúng việc họ phải làm.

Huy hiệu "đang chờ bạn" ở thanh trên, hiện ở MỌI bề mặt: một dây chuyền đang đứng chờ không
được ẩn sau một lựa chọn điều hướng.

### Ngân sách thanh trên ở 390px là 123px — và tràn ngang KHÔNG bắt được

Flex NÉN chứ không tràn. Thêm một phần tử vào `.bar` từng nén bộ chọn tác phẩm xuống **5px**
(tên cuốn biến mất) trong khi cả `documentElement.scrollWidth - clientWidth` lẫn phép đo tràn
của chính thanh đều bằng 0. Đo bề rộng THẬT của từng phần tử, đừng chỉ đo tràn.
