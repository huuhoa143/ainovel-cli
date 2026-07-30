package e2e

// Kho văn mẫu tiếng Việt dùng cho mọi test trong package này.
//
// Văn do người viết, không phải mô hình sinh — nói rõ để không ai đọc test này
// thành bằng chứng về chất lượng mô hình. Mục đích của corpus là làm ĐẦU VÀO
// thật cho đường ống: chữ Việt có dấu, có thoại gạch đầu dòng, có số kiểu Việt,
// độ dài cỡ một chương ngắn thật (~400 chữ). Mọi ngưỡng đo trong repo (chỉ tiêu
// chữ/chương, cửa sổ style anchor, ngưỡng câu lặp) đều được hiệu chỉnh trên văn
// kể, nên đo bằng chuỗi lặp "abc abc abc" sẽ cho số đúng mà kết luận sai.
//
// chuongSach cố tình SẠCH tật giọng-AI: nếu thiếu ca sạch thì ca "bắt được tật"
// vô nghĩa — một bộ bắt mọi thứ cũng bắt hết văn hay.

// chuongSach là 6 chương văn kể sạch.
//
// Vì sao 6 mà không phải 3 như một truyện ngắn tối giản: cả
// stylestat.minChapters và domain.ReviewInterval đều bằng 5. Dưới 5 chương thì
// thống kê toàn sách trả nil và cửa duyệt toàn cục không mở — bài kiểm 3 chương
// sẽ XANH mà bỏ trắng đúng hai cơ chế. Còn đúng 5 chương thì cũng không đủ: sách
// không phân tầng tự hoàn thành ngay khi viết hết số chương đã hẹn
// (commit_chapter.applyCompletion), nên completion chặn trước cửa duyệt. Chương
// thứ 6 là chương duy nhất chứng minh được engine đi qua ĐỦ: viết → duyệt → viết
// tiếp → hoàn thành.
var chuongSach = []string{
	`Bến đá nằm ở khúc sông gấp, nơi dòng nước đổi màu từ xanh sang nâu đục. Ông Thản gác cầu ở đó ba mươi năm, đủ lâu để đếm được từng viên đá đã lở và từng bậc thang bị nước liếm mòn. Sáng nào ông cũng ra sớm, mang theo cái ấm nhôm móp một bên và bó nhang mua ở chợ đầu làng.

Hôm ấy có người lạ đứng chờ ở đầu cầu. Áo người đó bạc màu, tay xách một cái hòm gỗ nhỏ, quai đã thay bằng dây gai.

— Cầu này còn qua được không, bác?

— Qua được. Nhưng bước theo lối tôi đi, đừng đặt chân lên phiến thứ tư.

Người lạ nhìn xuống chân cầu. Phiến đá thứ tư nứt một đường dài, khe nứt hẹp mà sâu, bên dưới là nước xoáy.

— Sao bác không thay nó đi?

— Thay rồi. Ba lần. Lần nào nước cũng lấy lại.

Họ qua cầu chậm, từng bước một. Đến giữa cầu, người lạ dừng lại, đặt hòm gỗ xuống, mở nắp. Bên trong là những cuộn giấy buộc dây, mép giấy vàng như vỏ hành khô.

— Tôi tìm nhà họ Lư ở bờ bên kia. Bác biết chứ?

Ông Thản nhìn cuộn giấy hồi lâu rồi mới trả lời. Gió từ mặt sông thổi ngược lên, mang mùi bùn tanh nồng và mùi cỏ mục.

— Nhà đó cháy năm bốn mươi hai. Đất giờ trồng ngô.

— Vậy còn người?

— Còn một bà cụ. Ở nhờ chái bếp nhà con gái, cuối xóm Trại.

Người lạ gói lại cuộn giấy, tay hơi chậm. Ông Thản không hỏi thêm. Ba mươi năm gác cầu dạy ông một điều: người mang giấy tờ đi tìm nhà cũ thường không kể trước, và thường kể hết trước khi qua hết cầu.

Đến bậc cuối, người lạ mới lên tiếng.

— Bác có nghe về vụ chìm thuyền chở gạo năm ấy không?

— Nghe. Cả làng nghe.

— Người ta bảo thuyền chìm vì chở quá tải.

— Người ta bảo nhiều thứ.

Người lạ đặt tay lên tay cầm bằng sắt, chỗ đã bóng lên vì bao nhiêu bàn tay. Nước dưới chân cầu vẫn chảy, đều và dày, không nhanh hơn cũng không chậm hơn.

— Tôi tên Khang. Tôi giữ giấy của người lái thuyền.

Ông Thản đặt ấm nước xuống bậc đá. Lần đầu trong buổi sáng đó, ông quay hẳn người lại nhìn khách.

— Vậy thì đừng đi cuối xóm Trại lúc trời còn sáng.`,

	`Xóm Trại nằm sau một rặng tre già, đất thấp nên mùa nước lên phải kê giường bằng gạch. Khang đến đó khi trời đã tắt nắng. Đường vào là lối mòn, hai bên ruộng ngô mới trổ cờ, lá cứa vào ống tay áo nghe rào rào.

Chái bếp nhà con gái bà cụ Lư quay ra phía bờ mương. Trong bếp có ánh lửa, khói bò ra khỏi mái lá rồi tan ngay.

— Bà ơi.

Trong bếp không có tiếng trả lời. Khang gọi lần thứ hai, nhẹ hơn.

Một bóng người ngồi trên ghế thấp, lưng còng, hai tay hơ trên đống than. Bà cụ nghe tiếng nhưng không quay đầu, chỉ đẩy cái đòn gỗ về phía trước bằng mũi chân.

— Ngồi đi. Đứng ngoài cửa gió lùa.

Khang ngồi xuống. Cái hòm gỗ đặt trên đầu gối.

— Con là người ngoài. Con giữ giấy của ông Lư Đình.

Bàn tay bà cụ dừng lại trên đống than. Than đỏ lên rồi tối đi theo nhịp gió.

— Đình là chồng tôi. Ông ấy đi năm bốn mươi hai. Đi cùng thuyền.

— Giấy này viết trước hôm thuyền đi ba ngày.

Bà cụ chìa tay ra. Ngón tay bà nứt nẻ, đầu ngón chai dày, cầm cuộn giấy mà không mở.

— Tôi không đọc được chữ.

— Con đọc cho bà.

Khang mở cuộn thứ nhất. Chữ viết bằng mực nho, nét khô, chỗ đậm chỗ nhạt như người viết vừa viết vừa ngừng.

— "Gạo trong khoang là gạo cứu đói của phủ. Tôi nhận lệnh chở đi Hàn Sơn. Nếu thuyền không tới, xin đừng nói tôi ăn cắp."

Không ai nói thêm câu nào. Than nổ lách tách trong đống tro.

— Ba mươi năm, — bà cụ nói — ba mươi năm người ta gọi ông ấy là thằng lấy gạo.

— Còn hai cuộn nữa. Có tên người ra lệnh.

Bà cụ đặt cuộn giấy xuống lòng, ép hai bàn tay lên đó, giữ như giữ một con chim.

— Anh mang giấy này đi đâu?

— Lên phủ.

— Phủ nào? Người ra lệnh giờ đang ở phủ.

Ngoài mương có tiếng nước rẽ, rồi tiếng chân bước trên bờ đất. Khang nghiêng người, dời cái hòm gỗ khỏi vùng sáng của lửa. Bà cụ với tay tắt bớt ngọn đèn dầu trên bàn.

— Đi ra cửa sau. Qua ruộng ngô, đừng đi lối mòn.

— Còn bà?

— Tôi già rồi, họ không sợ tôi. Đi.`,

	`Đêm ấy Khang ngủ trong lều canh ngô, mái phủ lá mía, nền rải trấu. Ruộng ngô rộng đến bờ mương, gió đi qua lá tạo ra thứ tiếng đều đều làm người ta khó phân biệt bước chân với lá.

Gần sáng, ông Thản đến. Ông không gọi, chỉ dựng cây sào vào cột lều cho nó rơi xuống.

— Anh còn sống.

— Bác biết con ở đây?

— Ai đi ruộng ngô ban đêm cũng ngủ ở lều này. Ba mươi năm rồi.

Ông Thản ngồi xuống bậc lều, rót nước từ ấm nhôm ra cái nắp. Nước còn ấm.

— Đêm qua có ba người xuống xóm Trại. Sáng nay còn hai.

— Người thứ ba đâu?

— Ở bến. Đứng đếm người qua cầu.

Khang mở hòm gỗ, đếm lại ba cuộn giấy, rồi buộc chúng vào trong áo.

— Bác có cách nào qua sông mà không qua cầu?

— Có. Nhưng phải chờ nước xuống, mà nước xuống thì lòng sông trơ đá. Người đứng trên cầu nhìn thấy hết.

— Vậy là không có cách.

— Tôi chưa nói thế.

Ông Thản lấy que củi vạch xuống nền trấu. Một đường ngang là sông, hai vạch dọc là cầu và bến.

— Cầu có chín phiến. Phiến thứ tư nứt. Ba mươi năm tôi không thay được nó vì bên dưới có hõm đá, nước xoáy vào đó rồi vòng ra. Người rơi xuống chỗ ấy không bị đẩy ra giữa dòng, mà bị hút vào chân trụ.

— Nghĩa là chỗ đó bám được.

— Bám được nếu biết trước. Không biết thì chết.

Khang nhìn hình vẽ trên trấu. Que củi vẫn còn trong tay ông Thản, đầu que cháy dở.

— Sao bác giúp con?

Ông Thản không trả lời ngay. Ông cúi xuống xóa hình vẽ bằng lòng bàn tay, xóa kỹ, xóa cả vết que.

— Năm bốn mươi hai tôi mười chín tuổi. Tôi khiêng gạo xuống thuyền cho ông Lư Đình. Đủ chín mươi bao. Tôi đếm.

— Bác làm chứng được.

— Tôi làm chứng ba lần rồi. Ba lần người ta ghi lời tôi vào giấy, rồi giấy mất.

Ông đứng lên, dựng lại cây sào.

— Lần này anh giữ giấy. Tôi giữ cầu. Trưa nay nước xuống lúc mười một giờ.`,

	`Mười một giờ, nước sông rút xuống để lộ một dải đá đen trơn nhớt dọc chân trụ cầu. Trên mặt cầu, người đàn ông áo nâu vẫn đứng, tay chống lên tay cầm sắt, mắt dõi về phía bờ bên kia.

Ông Thản gánh hai thùng nước đi lên cầu, bước chậm, đòn gánh kêu ken két. Đến giữa cầu ông đặt gánh xuống nghỉ, đúng chỗ phiến đá thứ tư.

— Bác gánh nước lúc nắng thế này?

— Nắng thì nước mới trong.

Người áo nâu nhìn hai thùng nước, rồi nhìn ông. Ông Thản múc một gáo, chìa ra.

— Uống không?

Người kia không đưa tay. Ông Thản uống trước, rồi đổ phần còn lại xuống mặt cầu. Nước loang ra, chảy vào khe nứt của phiến thứ tư, rỉ xuống dưới thành một sợi mảnh.

Dưới chân trụ, Khang đang bám vào hõm đá, nghe nước rơi trên vai. Ba cuộn giấy buộc trong áo, ép sát ngực. Đá trơn đến mức phải dùng cả cạnh bàn chân mà chèn vào khe.

Trên cầu, ông Thản gánh nước đi tiếp, chậm hơn lúc đến. Khi đòn gánh đã sang hết bờ bên kia, người áo nâu quay lại nhìn phiến đá thứ tư, chỗ vệt nước vẫn còn ướt.

Anh ta ngồi xuống, chống hai tay lên mép phiến, nghiêng đầu xuống khe nứt.

Khang nín thở. Nước dưới chân dềnh lên rồi hạ xuống, mỗi lần dềnh lại đẩy anh vào sát trụ đá hơn. Bàn tay phải anh tê dần.

Trên cầu, người áo nâu đứng lên, lấy chân đạp thử phiến đá. Một mảnh vụn rơi xuống, đập vào vai Khang rồi mất trong nước.

Rồi có tiếng gọi từ bờ, tiếng đàn bà, cao và gấp.

— Cháy! Cháy chái bếp nhà cuối xóm!

Bước chân trên mặt cầu chạy đi, rung cả trụ đá. Khang đợi đến khi tiếng chân xa hẳn mới đổi tay, kéo người lên bậc đá thấp nhất, rồi bò vào bóng tối dưới gầm cầu.

Trong bóng tối đó có người ngồi chờ sẵn. Ông Thản, áo còn ướt vai, tay cầm bó nhang chưa đốt.

— Bà cụ tự đốt chái bếp.

Khang mở miệng, không ra tiếng.

— Bà ấy tính rồi. Bếp lá, cháy nhanh, dập cũng nhanh. Còn giấy thì chỉ có một bộ.`,

	`Chái bếp cháy hết trong nửa giờ, để lại cái khung tre đen và một khoảng đất trắng tro. Người trong xóm dập lửa bằng nước mương, xếp thành hàng chuyền thùng, ai cũng ướt đến vai.

Bà cụ Lư ngồi ở bờ mương, hai tay đặt trên đầu gối, nhìn đám tro. Con gái bà quỳ bên cạnh, lau mặt cho bà bằng vạt áo.

— Mẹ đốt bếp làm gì!

Bà cụ không giải thích. Bà chỉ hỏi một câu.

— Người mang giấy đi rồi chưa?

Chiều hôm đó, ba cuộn giấy được đọc trước sân đình, dưới bóng cây bàng, trước mặt bốn mươi người và một ông lý trưởng mới nhậm chức tháng trước. Khang đọc cuộn thứ nhất. Ông Thản đọc lời chứng của mình, chậm, từng bao gạo, đủ chín mươi bao.

Đến cuộn thứ ba, sân đình không còn ai nói chuyện riêng. Trên giấy có tên người ra lệnh, có dấu triện, có ngày tháng. Cái tên ấy hiện đang giữ một chức ở phủ, cách đây hai ngày đường.

Ông lý trưởng cầm cuộn giấy lên xem thật lâu.

— Việc này quá tay tôi.

— Vậy ông ghi lời chứng. — Ông Thản nói. — Ghi rồi cho tôi giữ một bản, ông giữ một bản, đình giữ một bản. Ba bản, ba nơi. Mất một vẫn còn hai.

Người trong sân bắt đầu bàn. Có người bảo nên đợi. Có người bảo đã ba mươi năm, đợi thêm nữa thì bà cụ không còn.

Sổ ghi lời chứng viết xong lúc trời tối. Ba bản, ba chỗ, đúng như ông Thản đã bàn.

Đêm ấy Khang ra bến. Nước đã lên lại, phủ kín dải đá đen, chỉ còn chín phiến cầu nhô lên trong bóng tối. Ông Thản đang thắp nhang, cắm vào khe nứt của phiến thứ tư.

— Bác cắm nhang ở đấy à?

— Ba mươi năm nay tôi vẫn cắm. Chỗ này nước lấy đá của tôi ba lần.

Khang nhìn ba nén nhang cháy đỏ trong khe đá, khói bị gió xé ngang rồi tan.

— Mai con lên phủ.

— Đi đường bộ. Đừng đi thuyền.

— Con biết.

Ông Thản gánh ấm nước lên vai, bước xuống bậc cuối. Đến chân cầu ông dừng lại, không quay đầu.

— Phiến thứ tư ấy, mai tôi thay lần thứ tư.`,

	`Đường lên phủ đi hết một ngày rưỡi, qua ba cái quán nước và một bến phà nhỏ. Khang đi bộ, ba cuộn giấy buộc trong áo, bản sao lời chứng gói riêng trong lá chuối khô.

Cửa phủ mở lúc đầu giờ chiều. Người canh cửa hỏi giấy tờ, Khang đưa bản sao. Người ấy đọc, rồi đọc lại, rồi gọi thêm một người nữa ra đọc.

— Anh từ đâu tới?

— Xóm Trại, bên bến đá.

— Ai cho anh giữ giấy này?

— Vợ người lái thuyền. Bà ấy còn sống.

Họ để Khang ngồi ở dãy ghế dài ngoài hành lang. Trưa đứng gió, mái ngói nóng, có con mèo tam thể đi dọc bờ tường rồi nhảy xuống sân.

Chờ đến gần tối, một người mặc áo xanh ra gọi tên.

— Bên trong hỏi anh vài câu. Vào một mình.

— Giấy gốc tôi không đưa.

— Không ai đòi giấy gốc.

Phòng trong hẹp, kê một cái bàn gỗ và hai cái ghế. Trên bàn có sổ, có bút, có một chén nước đã cạn nửa. Người ngồi sau bàn khoảng năm mươi tuổi, tóc bạc hai bên thái dương.

— Anh biết người có tên trong giấy hiện làm gì ở đây không?

— Biết.

— Vậy anh vẫn đến.

— Vâng.

Người kia mở sổ, viết mấy chữ, rồi đẩy chén nước sang phía Khang.

— Uống đi. Đường xa.

Khang không uống. Người kia cũng không giục.

— Ba mươi năm trước tôi là thư lại ở phủ này. Tôi chép lệnh chở gạo. Tôi chép, nên tôi biết trong sổ ghi chín mươi bao, mà giấy giao nhận chỉ có sáu mươi.

Ngoài hành lang có tiếng chuông báo hết giờ làm. Người kia nghe chuông, dừng bút, chờ chuông tắt hẳn.

— Sổ ấy còn không? — Khang hỏi.

— Còn. Ở kho, hàng thứ tư từ dưới lên.

— Vậy sao ba mươi năm không ai mở?

— Vì không ai mang giấy đến. Sổ một mình chỉ là con số. Phải có giấy người lái thuyền đặt bên cạnh thì con số mới thành lời.

Người kia đóng sổ lại, đứng lên, với cái áo khoác trên móc.

— Mai anh đến sớm. Mang cả bà cụ, nếu bà ấy đi được. Người ta tin mắt bà ấy hơn tin giấy trong kho.`,
}

// tenChuong là tên các chương, dùng cho dàn ý và cho dòng tiêu đề bản xuất.
var tenChuong = []string{
	"Người gác cầu đá",
	"Chái bếp cuối xóm",
	"Lều canh ngô",
	"Nước xuống lúc mười một giờ",
	"Ba bản, ba nơi",
	"Hàng thứ tư từ dưới lên",
}

// vanNhoiTat là văn tiếng Việt cố tình nhồi đủ năm lớp tật mà bộ chống giọng-AI
// phải bắt được. Mỗi câu nhồi một lớp, viết thưa ra để đếm được từng lớp:
//
//	so sánh sáo         → tựa như / chẳng khác nào / hệt như
//	mẫu thần thái       → khóe miệng / ánh mắt lóe lên / nhíu mày
//	phản ứng cơ thể     → tim thắt lại / người khẽ run / hít vào một hơi
//	đánh dấu suy nghĩ   → cảm thấy / nhận ra / tự nhủ
//	liên từ nghị luận   → Tuy nhiên, / Ngoài ra, / Bên cạnh đó, (đầu dòng)
//	trạng ngữ dịch máy  → một cách + tính từ
//	sở hữu dịch máy     → của hắn / của nàng
const vanNhoiTat = `Hắn đứng bên bến, ánh mắt lóe lên một tia sáng lạ.

Khóe miệng nàng khẽ nhướn lên, tựa như đã biết trước mọi chuyện.

Tim hắn thắt lại. Người hắn khẽ run, rồi hắn hít vào một hơi thật sâu.

Hắn cảm thấy có điều gì không ổn. Hắn nhận ra bàn tay của nàng đang lạnh. Hắn tự nhủ rằng phải bình tĩnh.

Tuy nhiên, nàng không đáp.

Ngoài ra, gió đêm đó cũng thổi mạnh hơn thường lệ.

Bên cạnh đó, dòng nước dưới chân cầu chảy một cách chậm rãi, chẳng khác nào một dải lụa đen.

Nàng nhìn hắn, nhíu mày, ánh mắt của nàng thoáng một nét buồn.

Hắn im lặng. Hắn im lặng rất lâu. Hắn vẫn im lặng.

Trong nháy mắt, mọi thứ đổi khác. Chỉ trong chớp mắt, hắn hiểu ra tất cả, hệt như người vừa tỉnh giấc.

Đôi mắt của hắn nhìn xuống nước, cảm thấy một cảm giác khó tả.`
