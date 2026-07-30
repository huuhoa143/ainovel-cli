# Product

## Register

product

## Users

Người vận hành một xưởng sản xuất truyện — thường là một người, có nền kỹ thuật, tự chạy engine Go trên máy mình hoặc trên VPS riêng.

Bối cảnh sử dụng: engine chạy hàng giờ đến hàng ngày mà không cần người trực. Người vận hành không ngồi xem liên tục; họ **quay lại theo chu kỳ** để trả lời ba câu hỏi, theo đúng thứ tự đó:

1. Dây chuyền còn chạy đúng không, hay đã kẹt / đốt tiền vô ích?
2. Chất lượng có tuột không — Editor bắt lỗi gì, chương nào bị trả về?
3. Thành quả đọc ra sao?

Việc họ làm trên bề mặt này: theo dõi nhiều tác phẩm cùng lúc, tra vì sao máy quyết như vậy, tiêm ý kiến can thiệp vào dây chuyền đang chạy, xem kết quả kiểm định, và đọc bản thảo.

Đây **không** phải công cụ cho người đọc truyện. Người đọc nhận sản phẩm đã xuất bản, không vào đây.

## Product Purpose

ainovel biến một câu yêu cầu thành một bộ tiểu thuyết dài hoàn chỉnh bằng tiếng Việt, chạy trọn vẹn không cần người can thiệp. Engine tất định điều phối ba tác tử tự chủ (Architect / Writer / Editor) và gọi Arbiter khi cần phán quyết ngữ nghĩa.

Web studio là **bề mặt vận hành** của cỗ máy đó: nơi giám sát dây chuyền, kiểm soát chất lượng, và truy vết quyết định. Nó không nhân bản logic engine — engine vẫn là nguồn sự thật duy nhất, studio đọc từ store.

Thành công trông như thế này: người vận hành mở studio sau 6 giờ đi vắng và trong vòng 5 giây biết được dây chuyền khỏe hay bệnh, không cần đọc log.

## Brand Personality

**Chuyên nghiệp · chính xác · điềm tĩnh.**

Giọng của thiết bị công nghiệp, không phải giọng của trợ lý AI. Nó báo cáo sự thật kèm số đo, không chúc mừng và không xin lỗi. Khi có lỗi thì nói rõ lỗi gì và làm gì tiếp, không làm dịu.

Tham chiếu về cảm giác: bàn dựng phim và DAW — thanh transport luôn hiện, dòng sản xuất dạng lane, panel inspector. Người làm nghề đã quen bộ quy ước đó, và nó khớp tự nhiên với domain vì **Tập → Cung → Chương vốn đã là cấp bậc sản xuất**, đúng như Act → Sequence → Shot.

Cảm xúc cần đạt: sự tin cậy đến từ độ chính xác. Không phải sự phấn khích đến từ "AI làm được".

## Anti-references

Bốn thứ đã bị người dùng loại thẳng, ghi lại thành luật cấm:

- **Landing page SaaS** — cấm hero-metric (số to + nhãn nhỏ + thống kê phụ), cấm chữ gradient, cấm lưới card giống nhau lặp vô hạn, cấm nhãn chữ hoa nhỏ giãn cách đặt trên mọi khối.
- **Web đọc truyện lậu tiếng Việt** — cấm nhồi nút, banner, chữ đỏ/xanh loang lổ, đầu trang chứa hai chục liên kết.
- **Giao diện "AI" tím-xanh neon** — cấm glassmorphism trang trí, gradient tím-xanh, hiệu ứng phát sáng kiểu chatbot.
- **Admin panel Bootstrap cũ** — cấm bảng xám viền đầy ô, sidebar xanh navy, cảm giác phần mềm nội bộ 2015.

## Design Principles

1. **Sản xuất là cấp bậc, không phải danh sách.** Tập → Cung → Chương phải hiện ra như một trục sản xuất có tỷ lệ và vị trí, không bao giờ dẹt thành danh sách phẳng. Nhìn vào phải thấy được "đang ở đâu trong toàn bộ công trình".

2. **Máy tất định thì phải nhìn thấy được là tất định.** Engine quyết định bằng bảng sự thật, không bằng phép màu; Arbiter落盘 mọi phán quyết và replay được. Giao diện phải phơi cái *vì sao* ra — quyết định nào, dựa trên sự thật nào. Không bao giờ trình bày quyết định của máy như hộp đen.

3. **Số liệu là giá thành, không phải điểm thưởng.** Đơn vị của xưởng là chương/giờ và đô-la/chương, không phải "tổng số từ" để tự khen. Mỗi con số phải trả lời được một câu hỏi vận hành.

4. **Tiếng Việt là ràng buộc thiết kế, không phải bản dịch.** Dấu xếp hai tầng đòi line-height cao hơn; nhãn tiếng Việt dài hơn tiếng Anh 20–30% nên cột nhãn phải rộng hơn phản xạ; chữ hoa có dấu cần chừa chỗ phía trên. Bố cục sinh ra cùng tiếng Việt, không phải bố cục Anh rồi nhồi chữ Việt vào.

5. **Màu dành cho dữ liệu, không cho khung.** Bề mặt hạ chroma; một màu tín hiệu duy nhất (vàng) cho "đang chạy" và tiêu điểm. Trạng thái không bao giờ chỉ dựa vào màu — luôn kèm ký hiệu và chữ.

## Accessibility & Inclusion

- **WCAG 2.1 AA.** Thân bài và nhãn nhỏ ≥ 4.5:1; chữ lớn ≥ 3:1. Placeholder chịu cùng ngưỡng 4.5:1, không được nhạt hơn cho "thanh thoát".
- **Màu không phải kênh thông tin duy nhất.** Mọi trạng thái công đoạn mang cả ký hiệu và nhãn chữ, để người mù màu và ảnh chụp đen trắng vẫn đọc được.
- **`prefers-reduced-motion` là bắt buộc.** Nhịp đập trạng thái và mọi transition phải có nhánh thay thế; không có animation nào không có đường tắt.
- **Bàn phím là hạng nhất.** Mọi điều khiển có `:focus-visible` thấy rõ. Công cụ chuyên nghiệp phải dùng được không cần chuột.
- **Không gate nội dung sau animation.** Nội dung hiển thị mặc định rồi mới thêm hiệu ứng; transition bị treo trên tab ẩn hoặc trình render headless sẽ làm mất trắng cả khối.
