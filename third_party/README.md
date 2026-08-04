# third_party — phụ thuộc đã vá

Thư mục này chứa bản sao **đã sửa** của một phụ thuộc, được nối vào bằng `replace` trong
`go.mod`. Không sửa gì ở đây mà không đọc hết trang này trước.

## litellm

| | |
|---|---|
| Nguồn | `github.com/voocel/litellm` |
| Bản fork từ | **v1.8.8** (bản `agentcore v1.7.13` cũng ghim) |
| Nối vào bằng | `replace github.com/voocel/litellm => ./third_party/litellm` |
| Đã sửa | **2 tệp**, mỗi tệp một khối 4 dòng |

### Đã sửa gì

```
provider/openai/stream.go   ~dòng 82
provider/compat/stream.go   ~dòng 110
```

Cả hai cùng một sửa đổi: khi stream hết dữ liệu (EOF) mà **đã** nhận `finish_reason`, trả
`DoneEvent` thay vì báo lỗi. EOF khi **chưa** có `finish_reason` thì vẫn báo lỗi như bản gốc.

Lý lẽ đầy đủ nằm trong chú thích ngay tại chỗ sửa. Tóm tắt:

> `finish_reason` là dấu kết thúc **ngữ nghĩa** của đặc tả OpenAI. `data: [DONE]` chỉ là
> sentinel **vận chuyển**. Nhiều gateway tương thích OpenAI phát đủ chunk kết thúc —
> `finish_reason` kèm cả `usage` — rồi đóng kết nối mà không gửi sentinel.

Bản gốc coi đó là stream bị cắt, nên engine bỏ một lượt sinh **hoàn chỉnh** rồi thử lại bảy
lần, mỗi lần gửi lại toàn bộ prompt. Đo trên một gateway thật: không cuốn nào viết nổi
chương đầu, và mỗi lần bấm Chạy đốt tiền mà không ra chương.

### Vì sao KHÔNG chèn `data: [DONE]` ở tầng HTTP

Cách đó nhẹ hơn nhiều — một `RoundTripper` khoảng 40 dòng, không phải fork gì cả. Nó bị loại
vì **sai về đúng-sai**, không vì nặng: nó cũng dán dấu "xong" lên một stream bị cắt thật, tức
biến một lỗi thấy được thành một chương dở dang chốt âm thầm vào bản thảo.

Chỗ duy nhất phân biệt được hai ca là bên trong litellm, nơi có `s.finish`. Tầng trên chỉ
nhận được một câu lỗi giống hệt nhau cho cả hai.

### Bài kiểm canh bản vá

`internal/e2e/stream_sentinel_test.go` — hai bài, và **phải giữ cả hai**:

- thiếu sentinel mà có `finish_reason` ⇒ coi là xong;
- đứt ngang khi chưa có `finish_reason` ⇒ **vẫn** báo lỗi.

Bài đầu một mình sẽ xanh cả khi ai đó "sửa" bằng cách bỏ luôn việc kiểm. Bài thứ hai giữ cho
bản vá là *nới đúng một ca* chứ không phải tháo cả lớp bảo vệ.

Đã đột biến kiểm chứng: đổi `if s.finish != ""` thành `if false` thì bài đầu đỏ.

### Đồng bộ lại khi upstream lên bản mới

```bash
cp -R "$(go env GOMODCACHE)/github.com/voocel/litellm@<bản mới>" third_party/litellm
chmod -R u+w third_party/litellm
# rồi áp lại HAI khối sửa ở trên
go test ./internal/e2e/ -run TestStream   # phải xanh cả hai
```

Chép đè là **mất bản vá**, và không có gì báo ngoài hai bài kiểm kia. Đó là lý do chúng tồn tại.

### Nên gửi ngược lên upstream

Đây là lỗi bền vững của litellm, không phải nhu cầu riêng của fork này: mã đã ghi `s.finish`
ở dòng trên rồi vứt đi ở dòng dưới. Một PR về `voocel/litellm` sẽ xoá được cả thư mục này.

### Hệ quả phải biết

`replace` dùng **đường dẫn tương đối**, nên module `ainovel-cli` không thể được import như
một thư viện (Go cấm relative replace ở phụ thuộc). Với một CLI thì không sao — nhưng nếu có
ngày cần cho import, phải chuyển sang fork trên GitHub kèm số phiên bản.
