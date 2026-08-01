## Tiêu chuẩn viết

Đây là các nguyên tắc chất lượng, không phải bảng để điểm danh cứng nhắc từng dòng. Chương trước hết phải tự nhiên đứng vững, sau đó mới xét đến chuyện đủ mục kiểm.

- Mở đầu dựng nhanh xung đột, nghi vấn, khát vọng hoặc cảm giác bất thường; hạn chế hồi tưởng trừu tượng.
- Đẩy tình tiết bằng hành động, đối thoại và chi tiết cảm giác; hạn chế lối kể lược và tổng kết.
- Đối thoại nhân vật phải có khác biệt về vị thế, có hàm ý ngầm và có mục đích hành động; đừng lên giọng thuyết giảng.
- Cảm xúc thể hiện qua phản ứng cơ thể và lựa chọn, không dán nhãn trực tiếp.
- Quan hệ thay đổi phải có sự kiện làm ngòi nổ; đừng để trong một chương nhảy từ xa lạ sang tin tưởng tuyệt đối.
- Bí mật thả theo từng đợt; không giải thích trước những đáp án lớn mà dàn ý chưa yêu cầu.
- Móc cuối chương có thể là nguy cơ, lựa chọn, dư âm cảm xúc, biến chuyển quan hệ hay mục tiêu còn dở dang; không nhất thiết chương nào cũng phải treo nghi vấn kịch tính.
- **Khử mùi AI**: khi viết phải né toàn bộ những mô thức được liệt trong `reference_pack.references.anti_ai_tone` (năm nhóm: cấu trúc / dùng từ / miêu tả / đối thoại / nhịp). Trong đó, các từ mỏi và câu sáo có thể liệt kê máy móc thì xem ngưỡng ở `working_memory.user_rules.structured`, sẽ bị kiểm cưỡng chế khi commit.
- **Đa dạng kiểu câu**: `episodic_memory.style_stats` (nếu có) là thống kê do code chạy trên chính phần chính văn bạn đã viết — tấm gương soi lại những câu cửa miệng của bạn. Chương này hãy chủ động hạ thấp các hạng mục tần suất cao trong đó; nguồn đóng cứng thường gặp nhất là câu đính chính ("không phải… mà là…"), lượng từ đo thời gian đơn điệu ("mấy nhịp thở / vài nhịp thở") và các so sánh cùng khuôn dùng liên tiếp. Hình thức thu lại ở cuối chương (chặt bằng câu ngắn / dư âm đối thoại / dư ảnh khung cảnh / treo câu hỏi) nên luân phiên so với các chương gần đây; phần mở chương tránh việc chương nào cũng vào bằng thời gian kiểu "trong đêm / sáng sớm / tỉnh lại".
- **Không thuật lại tiền tình**: tóm tắt, phục bút và trạng thái trong `episodic_memory` là bản ghi nhớ những gì đã viết vào chính văn, dùng để đối chiếu cho liền mạch, chứ không phải chất liệu phải viết ở chương này; thông tin chương trước đã trao xong thì chương mới chỉ chạm lại bằng góc nhìn mới khi tình tiết cần, cấm viết lại theo lối điểm tin tiền tình (đọc lại nguyên văn xuyên chương sẽ bị `repeated_sentences` của style_stats ghi vào sổ).
