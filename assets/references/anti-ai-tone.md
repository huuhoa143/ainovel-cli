# Tiêu chí chống văn phong AI

Tài liệu này là kho tiêu chí nhận diện "văn phong AI" dùng chung cho Writer và Editor: Writer né tránh toàn bộ các mẫu dưới đây khi sáng tác, Editor kiểm tra theo từng mục trong chiều thẩm mỹ (aesthetic) và **trích dẫn nguyên văn** làm bằng chứng.

> Phần cơ giới hóa được nằm ở hai chỗ: `working_memory.user_rules.structured` kiểm bắt buộc khi lưu chương (dấu gạch ngang, câu sáo cố định, từ sáo rỗng tần suất cao), còn `episodic_memory.style_stats` đếm tần suất trên toàn bộ chương đã viết. Tài liệu này chuyên quản **phán đoán ngữ nghĩa không thể cơ giới hóa**. Mục nào có lớp đếm tương ứng thì ghi kèm `[style_stats: tên lớp]`: Editor dẫn con số của lớp đó rồi lấy mục này làm căn cứ phán, Writer đọc mục này để hạ con số đó xuống. Ba lớp bổ sung cho nhau: lớp lưu chương bắt bề mặt trong một chương, lớp thống kê bắt sự đóng cứng ở tầm toàn sách, tài liệu này bắt chất cảm.

## I. Văn phong AI về cấu trúc

- **Câu ba vế / liệt kê đối xứng ba lần**: dùng liên tiếp ba câu ngắn hoặc mệnh đề có cấu trúc đối xứng để "tạo thế" ("Anh không còn do dự, không còn lùi bước, không còn ngoảnh đầu"). Cách sửa: giữ lại một câu mạnh nhất, phần còn lại tách thành hành động hoặc chi tiết cụ thể.
- **Chồng chất câu đối xứng đều nhau**: mỗi đoạn có độ dài và cú pháp gần giống nhau, đọc như danh sách. Cách sửa: xen kẽ câu dài ngắn, để nhịp văn có hơi thở.
- **Tiêu đề phụ đánh số trong chương / chia cắt bằng `##`**: xuất hiện các mục `một` `hai` `ba` hoặc dấu `##`/`###` trong thân bài. Cách sửa: chỉ giữ tiêu đề chương, dùng dòng trống chuyển cảnh tự nhiên.

## II. Văn phong AI về từ ngữ

- **Chồng thành ngữ / sáo ngữ**: nhét nhiều thành ngữ, tục ngữ hoặc cụm sáo vào một đoạn để thay cho miêu tả ("rợn người kinh hãi, ngàn cân treo sợi tóc, hiểm nguy rình rập"). Không giới hạn ở cụm bốn tiếng — sáo ngữ tiếng Việt dài năm sáu tiếng tính y như vậy. Cách sửa: thay cả chuỗi thành ngữ bằng một hành động hoặc hình ảnh cụ thể.
- **Câu so sánh sáo** [style_stats: So sánh sáo]: "tựa như", "chẳng khác nào", "hệt như", "y hệt", "như thể" lặp đi lặp lại theo cùng một công thức. Cách sửa: thay bằng động từ chính xác hoặc hình ảnh mới lạ, hoặc tả trực tiếp, không tô vẽ.
- **Nghiện lượng từ / hư từ đệm**: "một thoáng", "một tia", "một nét", "một chút" đi kèm cảm xúc; "không khỏi", "bỗng nhiên", "chẳng biết từ đâu", "dường như" dùng như cửa miệng. Cùng họ là lượng từ đo thời gian đóng khuôn [style_stats: Lượng từ thời gian]: "trong nháy mắt", "tích tắc", "thoáng chốc", "chớp mắt", "vài hơi thở". Cách sửa: bỏ từ đệm, để hành động xảy ra trực tiếp ("Anh cười", không phải "Anh không khỏi khẽ cong môi một nụ cười"); thời gian thì đo bằng việc kịp xảy ra trong khoảng đó, đừng đo bằng lượng từ.
- **Đại ngôn trừu tượng** [style_stats: Sáo trừu tượng]: "theo một nghĩa nào đó", "đáng chú ý là", "không rõ vì sao", "một cảm giác khó tả", "không thể diễn tả", "ý nghĩa nằm ở" — người kể đang thay độc giả tổng kết. Cách sửa: xóa đi, nhường phán đoán cho sự kiện cụ thể.
- **Câu đối lập định nghĩa** [style_stats: Câu chỉnh nghĩa]: "Điều anh muốn không phải X, mà là Y", "Đây không phải kết thúc, mà là khởi đầu" — thủ thuật dùng phủ định + chuyển ngoặt để "điểm chủ đề" xuất hiện lặp lại. Cách sửa: dùng một hành động hoặc lựa chọn cụ thể để thể hiện trực tiếp, không dựa vào cú pháp để tạo câu đắt.
- **Trạng ngữ dịch máy `một cách + tính từ`** [style_stats: Trạng ngữ dịch máy]: "nhìn một cách lạnh lùng", "nói một cách dứt khoát". Đây là lối dịch máy trạng ngữ tiếng Trung, gần như không có trong văn viết tiếng Việt tự nhiên, nên mật độ cao là dấu hiệu dịch máy mạnh nhất. Cách sửa: bỏ "một cách", để tính từ đứng thẳng sau động từ ("nhìn lạnh lùng").
- **Sở hữu dịch máy `của + đại từ`** [style_stats: Sở hữu dịch máy]: "ánh mắt của hắn", "bàn tay của nàng" — tiếng Việt lược sở hữu khi quan hệ đã rõ ("ánh mắt hắn"). Dày đặc là văn dịch chưa gột. Cách sửa: bỏ "của", chỉ giữ khi cần tránh hiểu nhầm hoặc cần nhấn.
- **Liên từ nghị luận mở đầu câu** [style_stats: Liên từ nghị luận mở câu]: "Tuy nhiên,", "Bên cạnh đó,", "Hơn thế nữa,", "Mặt khác," đứng đầu câu kể — đang viết văn kể như viết văn nghị luận. Cách sửa: bỏ liên từ, để hai câu tự đặt cạnh nhau; quan hệ giữa chúng nhường cho người đọc tự nối.

## III. Văn phong AI về miêu tả

- **Khái quát trừu tượng thay vì ngũ quan cụ thể**: các nhãn mô tả kiểu "không khí u ám", "bầu không khí căng thẳng". Cách sửa: đưa vào một chi tiết có thể cảm nhận bằng xúc giác / khứu giác / thính giác (ưu tiên hơn thuần thị giác).
- **Dán nhãn cảm xúc**: viết thẳng "anh rất hồi hộp / tức giận / buồn". Cách sửa: thể hiện qua phản ứng cơ thể và hành động lựa chọn ("đốt ngón tay trắng bệch", "cổ họng thắt lại"), không gọi tên cảm xúc — nhưng đọc tiếp mục dưới, vì chính cách sửa này là nơi dễ sinh ra tật mới.
- **Mẫu thần thái / phản ứng cơ thể đóng khuôn** [style_stats: Mẫu thần thái, Phản ứng cơ thể]: "khóe miệng khẽ nhếch", "ánh mắt lóe lên", "nhíu mày", "con ngươi co lại", "tim thắt lại", "sống lưng lạnh toát", "hít sâu một hơi". Từng câu tách ra đều đúng và đặt đúng chỗ; vấn đề là cả sách chỉ có chừng ấy cách biểu đạt, đọc liền vài chương là thấy nhân vật nào cũng cùng một bộ mặt. Đây là cái giá phải trả khi sửa "dán nhãn cảm xúc" bằng phản ứng cơ thể: đổi một tật lấy một tật. Cách sửa: phản ứng cơ thể phải riêng cho từng nhân vật và từng tình huống; và không phải cảm xúc nào cũng cần một cử chỉ kèm theo, để trống cũng là một cách.

## IV. Văn phong AI trong đối thoại

- **Nhân vật đồng nhất hóa**: bỏ dấu hiệu người nói thì không phân biệt được ai đang nói — mọi người cùng cú pháp, từ ngữ, trình độ văn hóa như nhau. Cách sửa: cho mỗi nhân vật độ dài câu ổn định, cửa miệng riêng, tỉ lệ ngầm ý riêng.
- **Giải thích động cơ thái quá**: nhân vật trình bày trắng ra tâm lý của mình, hoặc người kể lập tức giải thích "anh nói vậy vì…". Cách sửa: để động cơ ẩn trong lựa chọn và lời nói có tầng lớp, tin tưởng độc giả.
- **Giọng văn viết**: mọi người đều nói câu hoàn chỉnh, chỉnh tề, có từ nối logic. Cách sửa: khẩu ngữ có ngắt quãng, bỏ lửng, trả lời lạc đề.

## V. Văn phong AI về nhịp điệu và cảm xúc

- **Kể rõ mọi thứ**: mọi hành động, quan hệ nhân quả đều được viết đầy đủ, không để khoảng trống cho trí tưởng tượng. Dấu hiệu bề mặt là các từ đánh dấu suy nghĩ [style_stats: Đánh dấu suy nghĩ] — "cảm thấy", "nhận ra", "nghĩ rằng", "hiểu ra", "tự nhủ" — người kể chui vào đầu nhân vật để thuật lại thay vì cho thấy. Cách sửa: cái cần giấu thì giấu, dùng khoảng lặng tạo sức hút đọc tiếp; bỏ từ đánh dấu và để chính sự việc nói.
- **Nhịp im lặng làm phản ứng mặc định** [style_stats: Nhịp im lặng]: "Nàng im lặng.", "Hắn không đáp.", "Hắn không quay đầu lại." dùng làm cách đáp cho mọi tình huống căng. Một lần thì hay, cả sách thì thành cái van xả duy nhất. Cách sửa: cho nhân vật đáp lệch hướng, đáp bằng hành động, hoặc đáp một câu không liên quan — im lặng chỉ giữ cho chỗ nó thật sự nặng nhất.
- **Nâng tầm gượng ép / điểm chủ đề cuối chương**: cuối chương vọt lên cảm ngộ nhân sinh hoặc câu đắt về chủ đề. Cách sửa: dừng ở hình ảnh cụ thể, lựa chọn hoặc dư ba cảm xúc, không thay độc giả tổng kết ý nghĩa.
