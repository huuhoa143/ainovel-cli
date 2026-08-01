# E2E với mô hình THẬT — kết quả đo

Chạy 2026-07-31 trên `main` @ `f6914ab`. Provider `cx/gpt-5.5` qua một router OpenAI-compatible tự dựng (tên miền riêng, không nêu).
Đây là lần **đầu tiên** có người đọc chương do mô hình thật sinh ra; mọi lượt kiểm trước
chỉ chứng minh máy móc đúng.

## Kết luận

**Dùng được.** Luồng chạy trọn `phase: complete`, 3/3 chương, 8124 từ, **0 ERROR và 0 lần
thử lại** trong cả phiên thành công.

## Một lỗi provider, KHÔNG phải lỗi việt hóa

Lượt chạy đầu chết ở `architect_long` với `openai: stream ended before [DONE]`, thử lại 7
lần rồi cầu dao bế tắc tạm dừng.

Nguyên nhân: giao thức stream OpenAI kết thúc bằng `data: [DONE]`. Router đó gửi ĐỦ nội
dung — kể cả mẩu cuối có `finish_reason: "stop"` và `usage` — nhưng không gửi dòng đó,
chỉ đóng kết nối. `voocel/litellm@v1.8.8` coi đó là stream đứt giữa đường.

Nằm ở **dependency**, không ở repo này. Cách đi tiếp đã dùng: proxy 40 dòng chèn đúng một
dòng thiếu. Việc tồn: đáng đẩy lên upstream một luật khoan dung — stream đã có
`finish_reason` rồi đóng sạch thì nên coi là xong. Đây là provider thứ hai trong dự án
gặp chuyện này.

Đáng ghi nhận: **cầu dao bế tắc hoạt động đúng.** Nó phát hiện 5 lần chỉ thị không tiến
triển rồi TẠM DỪNG chờ người, thay vì quay vòng vô hạn hay ghi trạng thái hỏng. Và lượt
chạy thứ hai **tiếp được từ trạng thái lượt một để lại** — khôi phục sau lỗi chạy thật.

Arbiter cũng chẩn đoán đúng bằng ngữ nghĩa: `worker_failure` → *"Lỗi provider/stream kết
thúc trước [DONE] có vẻ nhất thời do môi trường"*.

## Luồng — đúng khuôn, không lệch một bước

```
premise → outline → characters → world_rules → foundation_audit
→ plan → draft → consistency_check → commit    (×3, một chu kỳ mỗi chương)
```

`plan_start` của Arbiter có suy luận thật, không chọn bừa: *"Người dùng giới hạn 3 chương
nhưng không yêu cầu rõ ràng truyện ngắn"* → chọn `architect_long`.

## Năm tiêu chí chất lượng, đo trên 8125 từ

| Tiêu chí | Đo được |
|---|---|
| Không kì cục | **4 lần / 8125 từ** trên cả 11 mẫu giọng-AI = **0,49 / 1000 từ** |
| | **0/13** từ gây mỏi xuất hiện dù một lần · **0** chữ Hán sót |
| Trôi chảy | 559 câu, TB **14,5** từ, **độ lệch chuẩn 8,1**, ngắn nhất 1 dài nhất 50 |
| Mạch lạc | Chương 2 tiếp chương 1 qua một VẬT: sổ tuần có dòng canh ba bị cạo |
| Đúng mục đích | Prompt xin "nhịp chậm, giọng tiết chế, không hô hào" → ra đúng thế |
| Thu hút | Có — xem hai dẫn chứng dưới |

Độ lệch chuẩn 8,1 trên trung bình 14,5 là đa dạng thật; giọng AI đơn điệu cho độ lệch
thấp. **0/200 đoạn** mở bằng thời gian/thời tiết — đúng thứ prompt cấm.

Bốn lần trúng mẫu: `im lặng` ×1, `nhận ra` ×1, `một cách vụng` ×1, `của hắn` ×1. Hai cái
sau thuộc **ba mẫu chỉ có ở tiếng Việt** mà bản Trung không có, tức bộ nhận đang bắt đúng
thứ nó được thêm vào để bắt.

## Hai phép đo tôi từng lo, cả hai đều ổn

**Ngưỡng từ mỏi có bóp văn không?** Không. `rule_violations` = `null` cả ba chương,
**0 báo oan**. Bản sửa `rules/lint.go` (nhánh vi đảo chiều thành bắt chữ Hán sót thay vì
bắt chữ Latin) hiệu quả: trước bản sửa, mọi chương sạch đều bị ghi một violation
`non_cjk_fragments` với `Target` là mấy mảnh âm tiết vô nghĩa (`"kh, ng, xanh"`) rồi nạp
lại cho Editor — tức dạy Editor rằng chương nào cũng có tật cơ học.

**Mẫu chống-AI dịch từ tiếng Trung có bắt sai chỗ không?** Không. 8/11 mẫu bằng 0, và cả
hai lần trúng có ý nghĩa đều là mẫu tiếng-Việt-riêng.

## Chất văn — dẫn chứng

Chủ đề nói chệch qua miệng một viên chức lão luyện, chương 1:

> Người có chức ở trấn nhỏ thích nhất là câu "vì dân yên ổn". Câu ấy dùng để che mưa cũng
> được, che máu cũng được.

Kết chương 3 — chủ đề đáp xuống qua một VẬT, và vòng lại bó nhang mua từ buổi trưa lẫn
nhân vật A Chi bán nhang ở chương 1:

> Nhang chưa đốt, thân nhang cong vì ẩm.
> Có những thứ không cần cháy trước án thờ mới tính là đã được dâng lên.

## Chi phí

**$1,69** cho 3 chương / 8124 từ. Tiết kiệm $1,30 nhờ cache. Writer $1,12 · Architect
$0,51 · Arbiter $0,06. Input 468.672 token, output 21.452.

## Còn chưa đo

- `stylestat` cần **≥5 chương** mới trả thống kê (đúng thiết kế: thống kê cần đủ mẫu). Với
  3 chương nó trả nil, nên cơ chế "mô hình tự soi gương câu cửa miệng của mình" chưa được
  kiểm ở đường thật. Cần một lượt ≥5 chương.
- Sách phân tầng (nhiều tập, `expand_arc`, tóm tắt vòng/tập) — lượt này chỉ 3 chương một
  tập nên chưa chạm.
- Bản duyệt Editor: `reviews/` rỗng vì `/review` không bật. Chưa kiểm Editor phán quyết
  trên văn thật.
