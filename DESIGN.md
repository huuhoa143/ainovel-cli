# Design

Hệ thiết kế của **ainovel studio** (web) — chốt từ hướng D đã được duyệt: `docs/design/explorations/d-studio.html`.

## Visual Theme

Sàn sản xuất tối, mật độ cao, lấy quy ước của bàn dựng phim và DAW: thanh transport luôn hiện ở đáy, dòng sản xuất dạng lane ở giữa, panel inspector bên phải.

**Vì sao tối:** engine chạy dài, thường là những phiên đêm hoặc nền màn hình phụ bên cạnh terminal. Người vận hành ngó vào rồi rời đi. Đây là lý do vật lý, không phải "công cụ thì trông ngầu khi tối".

**Vì sao là nâu-mực chứ không phải đen trung tính:** bản sắc màu đã tồn tại trong TUI (`internal/entry/tui/theme.go`) là tông "sách cũ ấm" — vàng `#b8860b` / `#e5b449`, lam-lục `#5fb8a3`. Giữ bản sắc thắng việc bịa mới, nên nền lệch về hue vàng của thương hiệu. Vàng đặt lên nền cùng họ thì không chỏi như đặt trên đen lạnh, và web với TUI thành một hệ chứ không phải hai sản phẩm.

Chiến lược màu: **restrained** — bề mặt là trung tính đã nhuộm, một màu tín hiệu duy nhất chiếm dưới 10% diện tích.

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
| `--serif` | Noto Serif | **chỉ** dùng cho văn bản tiểu thuyết — trích đoạn, bản thảo, dẫn chứng của Editor |

Serif là dấu hiệu ngữ nghĩa: thấy serif là thấy văn của tác phẩm, không phải chữ của công cụ.

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
| `bar` | chọn tác phẩm + tình trạng cả xưởng (hàm ý nhiều đầu việc) |
| `rail` | khu vực sản xuất, có số đếm việc tồn |
| `canvas` | trục sản xuất dạng lane → bảng chương → nhật ký phán quyết → ô can thiệp |
| `insp` | chi tiết đơn vị đang chọn, có tab: Hợp đồng / Kiểm định / Bản thảo |
| `trans` | trạng thái máy, năng suất, giá thành — **luôn hiện, không cuộn mất** |

Điểm ngắt: `1240px` bỏ inspector, `860px` bỏ rail. Transport không bao giờ bị bỏ.

Bán kính: `--r: 5px` thống nhất. Không có bán kính lớn — công cụ chuyên nghiệp không bo tròn mềm.

Lớp z có tên: `--z-sticky: 10`, `--z-pop: 30`, `--z-tip: 40`. Không dùng số tùy tiện kiểu 999.

## Components

- **Trục sản xuất (lane)** — Tập / Cung / Chương là ba lane cùng một trục ngang, độ rộng khối tỉ lệ với phạm vi thật. Lane chương: một vạch một chương. Khối "chờ mở" dùng vân sọc chéo để phân biệt *chưa quy hoạch* với *đã quy hoạch nhưng chưa chạy* — hai trạng thái khác nhau về bản chất trong mô hình cuốn-vòng-cung hai tầng.
- **Bảng chương** — số liệu canh phải và dùng mono; trạng thái công đoạn dùng `đốm + chữ`; hàng được chọn đánh dấu bằng `inset box-shadow 1px`, **không** dùng viền màu dày bên trái.
- **Inspector có tab** — Hợp đồng (yêu cầu chương) / Kiểm định (7 chiều) / Bản thảo. Kiểm định là hàng mảnh có kết luận kèm dẫn chứng, không phải thẻ điểm.
- **Nhật ký phán quyết** — mỗi dòng: giờ, loại phán quyết, lý do dựa trên sự thật, nút xem lại. Đây là hiện thân của nguyên tắc "máy tất định phải nhìn thấy được".
- **Transport** — các ô phân cách bằng viền 1px, số liệu mono. Thước ngữ cảnh có **vạch đỏ ở mốc 85%** để thấy ngưỡng nén sắp tới, không chỉ hiện một con số.

## Motion

Tối giản và có lý do. Không bounce, không elastic.

- Easing chuẩn: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint).
- Transition giao diện 120–180ms, chỉ trên `background`, `color`, `border-color`, `filter`.
- Chuyển động duy nhất mang thông tin: **nhịp đập của đốm trạng thái "đang chạy"** (2.2s, đổi `opacity`). Nó phân biệt *đang chạy* với *đã dừng ở trạng thái này* — điều mà ảnh tĩnh không nói được.
- Không animate thuộc tính layout.
- `prefers-reduced-motion: reduce` → tắt nhịp đập, mọi transition về `0.01ms`.
- Nội dung **không** bị gate sau animation: hiển thị mặc định rồi mới thêm hiệu ứng.
