# Buồng lái · bàn chia ô — bản dựng thử

> **Đây là bản ghi của một quyết định đã chốt, không phải bề mặt đang chạy.**
> Phương án A đã vào sản phẩm (`components/BuongLai.tsx` + `app/globals.css`).
> CSS và markup trong `index.html` là ảnh chụp trạng thái TRƯỚC khi đổi, giữ
> nguyên để nút "Hiện tại" còn so được. Đừng đọc nó như tài liệu của bản hiện
> hành.
>
> Vài chi tiết đã đi xa hơn bản dựng thử sau khi gặp trạng thái thật: thứ tự
> nhường chiều cao giữa trục và bàn, van cuộn của `.blgiua`, và trần của khối
> cảnh báo. Lý do của cả ba nằm trong chú thích tại chỗ ở `globals.css`.

Mở `index.html` trong trình duyệt. Ba nút ở thanh trên đổi bố cục; con số bên
phải là **phần trăm nội dung đọc được mà không phải cuộn**, đo lại sau mỗi lần
đổi bố cục hoặc đổi cỡ cửa sổ. Tệp tự chứa — không cần server nào chạy.

## Vì sao có bản này

Cột giữa của buồng lái xếp **bốn vùng lên một trục dọc** trong 574px. Đo ở
1512×900 (canvas 1026×709):

| Vùng | Được | Cần | Đọc được |
|---|---|---|---|
| Trục sản xuất | 120px | 169px | 71% |
| Máy đang nói | 250px | ∞ | — |
| Khu cuộn · 3 mục nối đuôi | 125px | 2.666px | **4,7%** |
| Ô can thiệp | 79px | 79px | 100% |

Khu cuộn chứa Dòng sự kiện (98px), Chương (1.951px, bắt đầu ở offset 98) và
Nhật ký phán quyết (609px, bắt đầu ở offset 2.049). Trong khe 125px đó, bảng
chương hiện đúng **0 hàng** và nhật ký không bao giờ tới được.

## Ba bố cục trong bản dựng thử

- **Hiện tại** — bản đang chạy, để đối chiếu.
- **A · bàn 2×2** — đề xuất. Hàng trên là vùng SỐNG (Máy đang nói · Dòng sự
  kiện), hàng dưới là vùng ĐÃ GHI (Chương · Nhật ký phán quyết). Cột trái rộng
  cho văn xuôi và bảng, cột phải hẹp cho hai sổ có mốc giờ.
- **B · ba cột** — để so, không để chọn. Ở 1026px nó cho ba khe 380/265/380 và
  cả ba đều dưới sàn: summary của dòng sự kiện xuống ba dòng, bảng chương mất
  hai cột cuối, dẫn chứng của Arbiter xuống một từ một dòng.

## Bản dựng thử này làm từ gì

`index.html` trong repo là bản **đã ghép sẵn**, tự chứa — mở là chạy. Hai mảnh đầu vào dưới
đây thì **không** được commit (chúng nằm trong `.omc/`, đã ignore), nên `dung.mjs` chỉ chạy
lại được sau khi bạn chụp lại chúng theo lệnh ở cuối tệp này.

`dung.mjs` ghép ba mảnh:

1. `.omc/anh/app.css` — tệp CSS mà Next đã dựng, tải thẳng từ server đang chạy.
2. `.omc/anh/khung.html` — `document.querySelector('.khung').outerHTML` chụp
   trên ứng dụng thật ở 1512×900, cuốn `viet-truyen-mat-the-2`, engine đang chạy.
3. `bo-cuc-moi.css` + `dung-ban.js` — lớp phủ bố cục mới.

Cố ý không chép tay markup: một bản chép sẽ đẹp hơn bản thật và giấu đi đúng
những chỗ mà bố cục mới phải chịu được (tiêu đề dài, dẫn chứng nhiều dòng,
bảng 49 hàng).

Dựng lại sau khi sửa lớp phủ:

```
node docs/design/explorations/buong-lai/dung.mjs
```

Chụp lại markup và CSS khi ứng dụng đổi:

```
curl -s http://127.0.0.1:8420/_next/static/chunks/<tệp>.css -o .omc/anh/app.css
# rồi chạy trong console của trang: copy(document.querySelector('.khung').outerHTML)
```
