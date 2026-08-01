# Thiết kế thống nhất cho luật người dùng

## Một câu

Mọi luật viết lâu dài đều được chuẩn hóa vào cùng một ảnh chụp luật của sách; lúc chạy chỉ tiêm ảnh chụp đó qua `novel_context`, không nhồi văn bản luật gốc vào prompt lặp đi lặp lại nữa.

```text
prompt khởi động / tệp rules của người dùng / yêu cầu lâu dài phát ra lúc đang chạy
        ↓
LLM chuẩn hóa ngữ nghĩa (theo từng nguồn)
        ↓
Go hợp nhất tất định (theo ưu tiên)  ←  luật mặc định của hệ thống (dựng sẵn trong code, vào hợp nhất luôn, không qua LLM)
        ↓
output/novel/meta/user_rules.json
        ↓
novel_context tiêm vào
        ↓
Architect / Writer / Editor / phép kiểm khi commit dùng chung
```

## Trạng thái hiện thực (2026-07-19, đã đáp đất + đã vá sau review)

Thiết kế này đã được hiện thực, 24 package `go build` / `go vet` / `go test` đều xanh. Sau một vòng code review thì vá được 4 chỗ hụt (đều đã khắc phục): ① luật từ prompt khởi động chỉ nối vào phương thức chết `Host.Start`, còn cửa vào thật đi qua `StartPrepared` nên bỏ sót việc dựng ảnh chụp — đã cho prompt gốc truyền xuyên qua `Plan.RawPrompt` tới cả hai cửa vào quick/cocreate, gọi thống nhất `Host.PrepareUserRules`; ② việc ghi ảnh chụp xuống đĩa thất bại thì bị nuốt — `PrepareUserRules` đổi thành ghi xuống đĩa thất bại là trả error và hủy việc mở sách (đường resume giữ best-effort, tránh đưa một dạng thất bại mới vào các sách cũ); ③ lỗi đọc tệp rules bị bỏ qua im lặng — `raw.go` ghi log với những lỗi không phải "không tồn tại" (quyền v.v.); ④ README vẫn dạy YAML/front matter cũ và trỏ tới tệp đã xóa — đã viết lại.

Phần đáp đất về cơ bản khớp tài liệu này, các chọn lựa hiện thực sau khi nâng cấp đầu ra có cấu trúc như sau:

1. **Việc chuẩn hóa chỉ có một bản `Contract.Schema` duy nhất, không bảo trì hai bộ prompt.**
   Khi model khai là có hỗ trợ thì gửi JSON Schema nguyên bản; khi không hỗ trợ hoặc chưa rõ năng lực thì tầng hợp đồng thống nhất tiêm cùng bản Schema đó vào prompt.
   Cả hai chế độ đều soát lại Schema ở phía Go, rồi mới thi hành phép kiểm miền giá trị và phép kiểm nghiệp vụ xuyên trường.
2. **Khi một trường đơn lẻ có giá trị bất hợp pháp thì hạ cấp thành "trường đó khuyết", chứ không hạ cấp cả nguồn.**
   Nếu một trường nào đó là chỗ giữ rỗng hoặc sai kiểu, sanitize sẽ bỏ trường đó (coi như chưa khai) và giữ lại các trường hợp lệ còn lại của nguồn đó;
   chỉ khi "cả lượt chuẩn hóa thất bại" (mạng/model/JSON bất hợp pháp/phân tích thất bại) thì mới hạ cấp cả nguồn thành raw preferences và
   đặt `status=degraded`. Nhờ vậy một trường tồi không kéo theo các luật hợp lệ khác cùng nguồn. Những lỗi đầu ra mà model sửa được sẽ mang theo
   nguyên nhân chính xác để tiếp tục tự lành, vòng đời do `context` điều khiển; những lỗi kết thúc dứt khoát thì vào log và hạ cấp theo nguồn.

Chỗ đặt code: `internal/rules` (dữ liệu thuần + hợp nhất tất định: snapshot.go / raw.go / types.go), `internal/userrules`
(LLM chuẩn hóa + điều phối + ghi xuống đĩa: normalize.go / service.go), `internal/store/user_rules.go` (lưu ảnh chụp),
`internal/userrules/service.go` (ghi xuống đĩa các luật phát ra lúc đang chạy), `assets/prompts/arbiter-intervention.md` (phân ba dòng).
Đường nền máy móc mặc định của hệ thống đã di từ `assets/rules/default.md` vào `rules.SystemDefaults()` dựng sẵn trong code, đường phân tích YAML và
phụ thuộc yaml.v3 đã xóa. **Chưa kiểm chứng**: toàn chuỗi mở sách bằng LLM thật / động tác Arbiter rules lúc đang chạy (bản mẫu offline của normalizer đã kiểm 10/10).

## Vì sao

Writer ở mỗi chương không chắc chắn nhận được trọn bộ prompt ban đầu của người dùng. Nó chủ yếu dựa vào tác vụ của chương này và `novel_context(chapter=N)`.

Nên luật lâu dài không thể dựa vào ký ức lịch sử hội thoại, cũng không nên nhờ regex đoán mò từ ngôn ngữ tự nhiên. Cách đúng là: chuẩn hóa luật lâu dài thành trạng thái một cách tường minh, rồi để `novel_context` phân phát thống nhất.

Việc "chuẩn hóa" ở đây buộc phải dùng năng lực hiểu ngôn ngữ tự nhiên của model lớn, chứ không phải liệt kê các cách diễn đạt trong Go. Chương trình chỉ định nghĩa vài trường kiểm máy móc được, và chịu trách nhiệm về schema, hợp nhất tất định, kiểm, ghi xuống đĩa và phép kiểm khi commit; những cách diễn đạt như "mỗi chương khoảng một nghìn năm trăm", "một chương đừng vượt hai nghìn", "đừng viết những câu kiểu bánh xe số phận nữa" thì để LLM hiểu về mặt ngữ nghĩa.

## Trạng thái thống nhất

Lúc chạy, mỗi cuốn sách chỉ giữ một nguồn sự thật về luật người dùng:

```text
output/novel/meta/user_rules.json
```

Hình dạng giữ đơn giản:

```json
{
  "version": 1,
  "status": "ready",
  "structured": {
    "genre": "tu tiên",
    "forbidden_chars": [],
    "forbidden_phrases": ["ở một mức độ nào đó"],
    "fatigue_words": {}
  },
  "preferences": "Nhân vật chính điềm tĩnh và biết kìm nén; giải thích ít, dùng nhiều hành động và đối thoại.",
  "sources": [
    "startup_prompt",
    ".ainovel/rules/style.md"
  ],
  "uncertain": [
    "dùng ít ví von: không có ngưỡng rõ ràng, xử theo sở thích văn phong"
  ]
}
```

Biên của các trường:

- `version`: phiên bản schema của ảnh chụp, tiện cho việc di trú về sau.
- `status`: `ready` / `degraded`, gắn cờ việc chuẩn hóa có thành công trọn vẹn không; chỉ dùng để hồi đáp và chẩn đoán, không vào phán đoán sáng tác.
- `structured`: những luật mà code kiểm máy móc được hoặc tiêu thụ ổn định được.
- `preferences`: những sở thích bằng ngôn ngữ tự nhiên không kiểm máy móc được nhưng có hiệu lực lâu dài với việc sáng tác.
- `sources`: kiểm toán nguồn, không vào phán đoán sáng tác.
- `uncertain`: chẩn đoán về việc chuẩn hóa, chỉ dùng để hồi đáp và tra lỗi, không vào phán đoán sáng tác.

Phần tiêm cho model chỉ có `structured` và `preferences`; `version` / `status` / `sources` / `uncertain` là siêu dữ liệu vận hành và chẩn đoán, không vào `working_memory.user_rules`. Lỗi kỹ thuật không vào ảnh chụp, chỉ vào log (xem §Thất bại và hạ cấp).

## Các nguồn đầu vào

Luật lâu dài có bốn nguồn đầu vào:

1. **prompt khởi động**: yêu cầu lâu dài mà người dùng viết khi mở sách.
2. **tệp rules của người dùng**: sở thích lâu dài ở cấp toàn cục hoặc cấp dự án, đọc như ngôn ngữ tự nhiên thường.
3. **luật mặc định của hệ thống**: đường nền máy móc dựng sẵn trong code.
4. **yêu cầu lâu dài phát ra lúc đang chạy**: giữa đường người dùng nói "từ giờ về sau hãy thế này", Arbiter trích ra động tác `rules`, Host gọi `AddRuntimeRule`.

Các nguồn đầu vào này không vào prompt của Writer trực tiếp, cũng không bị đọc lặp lại lúc chạy. Chúng chỉ tham gia việc chuẩn hóa khi sinh hoặc cập nhật ảnh chụp, kết quả hợp nhất vào `meta/user_rules.json`.

## Tệp rules

Tệp rules là prompt lâu dài thông thường, không phải prompt lúc chạy, cũng không phải tệp cấu hình. Nó chỉ làm đầu vào cho việc chuẩn hóa, và không hỗ trợ YAML:

```md
# Sở thích viết

Mỗi chương 1200-1600 từ.
Nhân vật chính điềm tĩnh và biết kìm nén, đừng thành thánh mẫu.
Giải thích ít, dùng nhiều hành động và đối thoại để đẩy truyện.
Đừng để xuất hiện "ở một mức độ nào đó".
```

Hệ thống đọc rồi chuẩn hóa thành:

```json
{
  "structured": {
    "forbidden_phrases": ["ở một mức độ nào đó"]
  },
  "preferences": "Mỗi chương 1200-1600 từ; nhân vật chính điềm tĩnh và biết kìm nén, đừng thành thánh mẫu; giải thích ít, dùng nhiều hành động và đối thoại để đẩy truyện."
}
```

Nếu trong tệp xuất hiện YAML front matter thì cũng xử như văn bản thường, không coi là khai báo có cấu trúc. Kết quả có cấu trúc chỉ đến từ luồng chuẩn hóa thống nhất.

Sau khi khởi động, nếu người dùng sửa tệp rules thì cuốn sách hiện tại không tự đổi theo; cần sinh lại ảnh chụp. Nhờ vậy sách cũ không bị trôi hành vi vì tệp rules toàn cục thay đổi.

## Chuẩn hóa ngữ nghĩa

Việc chuẩn hóa là một lời gọi LLM độc lập, bị schema ràng buộc — mỗi nguồn chuẩn hóa một lần riêng, không trộn vào việc sinh nội dung sáng tác, cũng không dựa vào biểu thức chính quy hay bảng từ khóa để phân tích cứng.

Đầu vào:

- Nguyên văn của một nguồn duy nhất (prompt khởi động / một tệp rules / một yêu cầu phát ra lúc đang chạy)
- Phần giải thích các trường `structured` mà hệ thống hiện hỗ trợ

Luật mặc định của hệ thống không nằm trong danh sách này — chúng là luật có cấu trúc đã biên dịch sẵn trong code, vào §Luật hợp nhất luôn, không qua normalizer.

Đầu ra:

- `structured` ứng viên của nguồn đó
- `preferences` ứng viên của nguồn đó
- `sources`
- `uncertain`

Trách nhiệm phía Go:

- Cấp schema.
- Kiểm kiểu và miền giá trị của các trường.
- Hợp nhất tất định các nguồn theo ưu tiên ở §Luật hợp nhất (LLM không phán quyết ưu tiên của các nguồn).
- Lưu ảnh chụp.
- Tiêm ảnh chụp vào `novel_context`.
- Dùng cùng ảnh chụp đó để kiểm máy móc trong `commit_chapter`.

Trách nhiệm phía LLM:

- Hiểu luật bằng ngôn ngữ tự nhiên của một nguồn duy nhất.
- Nâng những luật rõ ràng, kiểm máy móc được lên `structured`.
- Giữ những sở thích về thẩm mỹ, văn phong, nhân vật ở `preferences`.
- Giữ thái độ bảo toàn với nội dung chưa rõ, không tự phát minh ngưỡng.

### Nâng cấp bảo toàn

`structured` là luật cứng hoặc tham số ổn định, không phải "vùng model đoán". Luật nâng cấp buộc phải bảo toàn:

- Chỉ khi người dùng diễn đạt rõ ràng, không mơ hồ thì mới ghi vào `structured`.
- `forbidden_chars` / `forbidden_phrases` là trường cấp error, buộc phải bảo toàn đặc biệt; chỉ những phép cấm rõ ràng kiểu "đừng để xuất hiện X", "cấm X", "đừng viết X" thì mới nâng.
- `fatigue_words` chỉ nâng khi người dùng đưa ra từ và ngưỡng rõ ràng; những yêu cầu không có ngưỡng kiểu "dùng ít ví von", "đừng quá văn viết", "giảm từ đầu miệng" thì vào `preferences`.
- Các ý muốn về số từ/độ dài ("mỗi chương 3000 từ", "ngắn hơn một chút") nhất loạt vào `preferences`: độ dài chương là phần lượng định ngữ nghĩa của nhịp tự sự, không kiểm máy móc — số hóa thành đường cứng sẽ dụ model pha nước cho đủ vạch.
- Mọi yêu cầu không máy móc hóa được, không có ngưỡng rõ ràng, phụ thuộc phán đoán theo ngữ cảnh thì đều vào `preferences`.

Nguyên tắc:

```text
Thà để sót không vào structured, hạ xuống thành sở thích mềm;
chứ không được cho sai vào structured, tạo ra báo lỗi sai ở mỗi chương.
```

Giá của việc chắt sót là sở thích văn phong yếu hơn một chút; giá của việc chắt sai là mỗi chương sinh ra một sự thật luật sai.

## Thất bại và hạ cấp

Việc chuẩn hóa là đường bổ trợ, không phải điều kiện tiên quyết của việc sáng tác chính. Model hiểu thất bại thì tuyệt đối không được chặn việc viết sách.

- **Hạ cấp theo nguồn**: một nguồn nào đó chuẩn hóa thất bại (mạng / model / JSON bất hợp pháp / kiểm schema thất bại) thì nguồn đó hạ cấp thành raw preferences, không sinh `structured`; các nguồn thành công khác vẫn góp `structured` như thường.
- **Context điều khiển việc tự lành**: các lỗi request thử lại được, lỗi định dạng/Schema ở chế độ prompt và lỗi kiểm nghiệp vụ thì tiếp tục tự lành, cho tới khi thành công hoặc `context` kết thúc; không đặt số lần cố định. Vi phạm hợp đồng nguyên bản, từ chối trả lời, bị cắt, kết thúc lỗi và lỗi request không thử lại được thì phơi ra ngay và hạ cấp theo nguồn.
- **Lỗi kỹ thuật vào log**: các lỗi kỹ thuật như JSON / schema / mạng thì ghi vào log, không vào `working_memory.user_rules`, không làm đầu vào cho sáng tác.
- **Gắn cờ trên ảnh chụp**: khi có bất kỳ nguồn nào bị hạ cấp thì ảnh chụp mang `status=degraded`.
- **Ghi xuống đĩa được thì tiếp tục**: chỉ cần `meta/user_rules.json` ghi được thì việc sáng tác chính buộc phải tiếp tục.
- **Chỉ khi ghi xuống đĩa thất bại thì mới hủy**: chỉ hủy khi ảnh chụp không ghi nổi ra đĩa, bởi các lần chạy sau sẽ không có nguồn sự thật ổn định.

Hợp đồng của `AddRuntimeRule` (lúc đang chạy): khi normalizer thất bại thì lưu ảnh chụp degraded,
không tiêm các lỗi chuẩn hóa như JSON/schema/mạng vào luồng sáng tác; chỉ khi ghi xuống đĩa thất bại thì mới trả error.

## Luật mặc định của hệ thống

`System defaults` là đường nền máy móc dựng sẵn trong code, không phải tệp rules của người dùng, và cũng không dùng YAML.

Nó không qua việc chuẩn hóa của LLM — nó đã ở dạng có cấu trúc, vào thẳng phần hợp nhất bên Go ở §Luật hợp nhất với vai nguồn ưu tiên thấp nhất. Nhờ vậy luật mặc định không có vấn đề LLM thất bại, trôi lệch hay chi phí.

Luật máy móc mặc định của hệ thống trước đây tạm nằm ở `assets/rules/default.md` (chi tiết hiện thực cũ, không phải YAML của người dùng cần tương thích); khi đáp đất thiết kế này thì đã di vào `rules.SystemDefaults()` dựng sẵn trong code, đường phân tích YAML đã xóa (xem §Trạng thái hiện thực).

Khi di trú thì giữ lại các chú thích cần thiết để nói rõ ngưỡng đến từ đâu, ví dụ một số ngưỡng từ mỏi đến từ chứng cứ thực nghiệm của các sản phẩm chạy dài. Đây không phải để tương thích YAML cũ, mà để người bảo trì tương lai biết vì sao ngưỡng mặc định tồn tại và khi nào thì nên điều chỉnh.

## Luật hợp nhất

Thứ tự hợp nhất theo lối "càng cụ thể càng ưu tiên":

```text
System defaults
→ Kết quả biên dịch của Global rules
→ Kết quả biên dịch của Project rules
→ Kết quả biên dịch của Startup prompt
→ Runtime user update
```

Nguồn ưu tiên cao ghi đè nguồn ưu tiên thấp.

Việc hợp nhất do Go thi hành tất định: LLM chỉ chuẩn hóa ngôn ngữ tự nhiên của một nguồn duy nhất thành `structured`/`preferences` ứng viên, còn Go ghi đè theo trường và nối văn bản theo thứ tự trên, ưu tiên không giao cho LLM phán quyết.

- `structured`: ghi đè theo trường, trường cùng tên của nguồn sau ghi đè nguồn trước.
- `preferences`: không ghi đè nhau, nối thành văn bản đọc được theo thứ tự ưu tiên (nguồn ưu tiên cao đặt sau), để LLM thấy được thứ tự các nguồn.

Hạn chế đã biết: `preferences` được sắp theo ưu tiên, nhưng Go không hóa giải xung đột. Trong lúc chạy dài, nếu người dùng lần lượt đưa ra những sở thích mềm trái nhau (như trước "điềm tĩnh kìm nén" sau "nói nhiều"), cả hai đều nằm lại trong văn bản, để LLM cân nhắc theo thứ tự và ngữ cảnh; cái nào cần ghi đè cứng tất định thì nên diễn đạt thành trường `structured` máy móc hóa được.

## Các cửa vào việc ghi xuống đĩa

Việc chuẩn hóa, hợp nhất, ghi xuống đĩa là cùng một bộ logic, nhưng có hai bên gọi, buộc phải phân biệt rõ, nếu không sẽ trộn phần chuẩn bị khởi động vào ngữ cảnh sáng tác chính:

- **Mở sách / làm mới (phía khởi động, tất định)**: Host / luồng khởi động gọi trực tiếp bộ logic này để sinh ảnh chụp ban đầu, không vào vòng lặp sáng tác chính. Đây là một tác vụ chuẩn bị khởi động mang tính tất định.
- **Cập nhật lúc đang chạy (động tác phán quyết can thiệp)**: động tác `rules` mà Arbiter phân loại ra sẽ do Host gọi trực tiếp `userrules.Service.AddRuntimeRule`, dùng lại cùng bộ logic kiểm / hợp nhất / ghi xuống đĩa, hợp nhất luật mới không có điểm khởi tiến độ vào ảnh chụp với vai `Runtime user update`.

(Về mặt hiện thực thì nên thu bộ logic này về một service nội bộ, hai bên gọi dùng chung; việc đặt tên cụ thể để dành cho lúc hiện thực.)

Bên gọi nào cũng vậy, cuối cùng đều ghi vào cùng một `meta/user_rules.json`. Logic ghi xuống đĩa chỉ làm ba việc:

1. Kiểm các trường có cấu trúc.
2. Hợp nhất vào ảnh chụp hiện tại của sách theo ưu tiên ở §Luật hợp nhất.
3. Trả về trọn bộ sự thật luật sau khi lưu.

Không làm:

- Không phái tác tử con.
- Không sửa dàn ý.
- Không nuốt im lặng các trường bất hợp pháp (ghi lại và hạ cấp, xem §Thất bại và hạ cấp).
- Không lấy văn bản gốc làm prompt cuối rồi tiêm thẳng vào.

Ví dụ cập nhật lúc đang chạy: người dùng nói "từ giờ về sau hãy thế này" (không có điểm khởi tiến độ) → Arbiter phán thành động tác `rules` → Host chuẩn hóa câu đó qua `AddRuntimeRule` → hợp nhất vào ảnh chụp với ưu tiên cao nhất dưới vai `Runtime user update` → hồi đáp qua dòng sự kiện.

## Hồi đáp

Mỗi lần sinh hoặc cập nhật ảnh chụp `user_rules` thì đều buộc phải hồi đáp kết quả chuẩn hóa cho người dùng:

```text
Đã sinh ảnh chụp luật của sách:
- Luật máy móc: mỗi chương 1200-1600 từ; cấm cụm "ở một mức độ nào đó"
- Sở thích văn phong: nhân vật chính điềm tĩnh và biết kìm nén; giải thích ít, dùng nhiều hành động và đối thoại để đẩy truyện
- Chưa nâng thành luật máy móc: dùng ít ví von (không có ngưỡng rõ ràng, xử theo sở thích văn phong)
```

- Khởi động / làm mới: dùng lại năng lực log luật khởi động hiện có để in ảnh chụp, không thêm cơ chế mới; tình huống cùng lên kế hoạch thì có thể gộp phần hồi đáp vào khâu xác nhận của việc cùng lên kế hoạch.
- Lúc đang chạy: sau khi `AddRuntimeRule` thành công thì hồi đáp qua dòng sự kiện ("luật viết đã cập nhật và đã lưu bền").
- Hạ cấp: khi `status=degraded` thì phần hồi đáp nói rõ nguồn nào chưa phân tích được, hiện đang chạy theo raw preferences, và có thể sinh lại ảnh chụp.

Hồi đáp không phải cửa phê duyệt lần hai; tác dụng của nó là để người dùng biết hệ thống đã hiểu thành cái gì, phát hiện sai thì sinh lại ảnh chụp.

## Cách Agent tiêu thụ

Mọi agent chỉ xem:

```json
working_memory.user_rules
```

Phân công trách nhiệm:

- Architect: điều chỉnh mật độ tình tiết mỗi chương và số chương chia ra theo ý muốn về số từ trong `preferences`.
- Writer: viết theo luật cứng của `structured`, điều chỉnh văn phong theo `preferences`.
- Editor: duyệt theo cùng bản luật đó.
- `commit_chapter`: dùng `structured` để kiểm máy móc và trả về violations.

Writer không hiểu lại prompt khởi động gốc, cũng không đọc tệp rules gốc.

## Phân loại can thiệp: ba hướng đi

Can thiệp lúc đang chạy được chia ba loại theo "muốn sửa cái gì":

- **Viết thế nào** (bút pháp / văn phong / chất lượng: số từ, dùng từ, từ bị cấm, mẫu câu, tỉ lệ đối thoại, định dạng tiêu đề v.v.) → động tác `rules` của Arbiter, chuẩn hóa rồi hợp nhất vào `meta/user_rules.json`. Ví dụ: "mỗi chương 1500 từ", "tiêu đề chỉ dùng tiếng Việt", "nhân vật chính tổng thể điềm tĩnh kìm nén", "tỉ lệ đối thoại cao hơn một chút".
- **Viết cái gì** (tình tiết / kết cấu / hướng đi nhân vật / độ dài) → architect, rơi vào compass / outline / hồ sơ nhân vật. Ví dụ: "tập này viết nhiều tuyến chiến đấu hơn", "từ chương 30 giọng nhân vật chính chuyển lạnh", "tăng lên 40 chương".
- **Sửa phần đã viết** (viết lại / chỉnh sửa chương chỉ định) → editor, vào hàng đợi PendingRewrites.

Tiêu chí: **"viết thế nào" → rules; "viết cái gì" → architect; "sửa phần đã viết" → editor**.

## Các bước thi hành

1. Thêm store `meta/user_rules.json`.
2. Thêm một pass chuẩn hóa LLM độc lập (theo nguồn), dùng schema ràng buộc để xuất ra `structured/preferences/sources/uncertain` ứng viên.
3. Thêm phần hợp nhất tất định ở phía Go: ghi đè theo trường và nối văn bản theo ưu tiên cho từng nguồn, sinh ảnh chụp.
4. Thu việc chuẩn hóa / hợp nhất / ghi xuống đĩa về một bộ logic, hai bên gọi dùng chung: phía khởi động gọi trực tiếp để sinh ảnh chụp ban đầu; lúc đang chạy thì động tác `rules` do phán quyết can thiệp sinh ra sẽ dùng lại qua `AddRuntimeRule`. Khi thất bại thì xử theo §Thất bại và hạ cấp: nguồn hạ cấp thành raw preferences, ảnh chụp `status=degraded`, việc sáng tác chính tiếp tục.
5. Di các luật máy móc mặc định của hệ thống hiện ở `assets/rules/default.md` sang cấu trúc dựng sẵn trong code hoặc một asset JSON, giữ chú thích về nguồn của ngưỡng; xóa đường phân tích YAML cho rules của người dùng, không làm tầng tương thích.
6. Sau khi đọc tệp rules thì không tiêm chính văn làm prompt trực tiếp nữa, mà chuẩn hóa rồi hợp nhất vào ảnh chụp `user_rules`.
7. `novel_context` chỉ tiêm phần `working_memory.user_rules` trong `meta/user_rules.json`.
8. `commit_chapter` dùng cùng một bản `user_rules.structured` để kiểm.
10. Việc phân loại can thiệp (hiện do Arbiter gánh, arbiter-intervention.md) phân ba dòng rõ ràng theo "muốn sửa cái gì": các yêu cầu lâu dài thuộc loại văn phong / chất lượng thì đi qua động tác `rules` để xuống ảnh chụp; tình tiết / kết cấu / nhân vật / độ dài thì đi qua architect; việc viết lại chương đã viết thì đi qua editor (chi tiết xem §Phân loại can thiệp: ba hướng đi).

## Chuẩn nghiệm thu

- Người dùng viết "mỗi chương 1200-1600 từ" trong prompt khởi động, thì `novel_context` của chương 1 phải cho Writer thấy nguyên văn ý muốn đó trong `preferences`.
- Tệp rules chỉ viết ngôn ngữ tự nhiên, vẫn chuẩn hóa vào cùng một `user_rules` được khi sinh ảnh chụp.
- Tệp rules không cần và cũng không hỗ trợ YAML; tất cả đều chuẩn hóa theo luật ngôn ngữ tự nhiên.
- Lúc chạy không đọc tệp rules nữa; chỉ đọc `meta/user_rules.json`.
- Luật máy móc mặc định không còn đến từ tệp rules YAML, rules của người dùng cũng không có tầng tương thích YAML.
- Việc chuẩn hóa không dùng regex/từ khóa đóng cứng; việc hiểu ngôn ngữ tự nhiên do LLM làm.
- Luật mơ hồ không bị nâng lên thành trường `structured` cấp error.
- Luật mặc định của hệ thống không qua LLM, vào thẳng phần hợp nhất của Go.
- Ưu tiên nguồn và việc ghi đè theo trường do Go thi hành tất định, cùng đầu vào thì cho ra cùng ảnh chụp.
- Lúc đang chạy người dùng nói "từ giờ về sau hãy thế này", thì qua động tác Arbiter rules sẽ hợp nhất vào ảnh chụp, và `novel_context` của các chương sau thấy được bản cập nhật.
- Chuẩn hóa thất bại không chặn việc viết sách: nguồn thất bại hạ cấp thành raw preferences, ảnh chụp `status=degraded`, việc sáng tác chính tiếp tục; chỉ khi ảnh chụp không ghi nổi xuống đĩa thì mới hủy.
- Chuẩn hóa thất bại trả về `status=degraded`, không ném lỗi kỹ thuật lên làm ô nhiễm luồng chính.
- Sau khi sinh hoặc cập nhật ảnh chụp thì hồi đáp `structured` / `preferences` / các mục chưa được nâng; khi hạ cấp thì hồi đáp nói rõ nguồn bị hạ cấp.
- Mở một cuốn sách mới thì không kế thừa `user_rules` của cuốn trước.
- Trường có cấu trúc bất hợp pháp không bị bỏ qua im lặng: ghi lại và hạ cấp nguồn đó, không chặn luồng chính.

## Dứt khoát không làm (đã phán là không cần, không phải chia giai đoạn)

Các năng lực sau, với nhu cầu hiện tại, không mang lại lợi ích nên không vào thiết kế, để tránh thiết kế quá mức:

- Ngữ nghĩa xóa / hủy ở cấp trường như `clear_fields`.
- Việc tự làm mới khi lắng nghe tệp rules thay đổi (sửa tệp rồi thì sinh lại ảnh chụp một cách tường minh là đủ).
- Mốc neo thời gian / hóa giải ghi đè cho `preferences` (cần ghi đè cứng thì dùng `structured`).
- Lưu bền mảng `diagnostics` trong ảnh chụp (lỗi kỹ thuật vào log là đủ, ảnh chụp chỉ giữ `status`).
- Sinh tự động phần giải thích trường schema từ kiểu Go (bảo trì tay một bản giải thích ngắn là đủ).

Nguyên tắc thiết kế không đổi: LLM chịu trách nhiệm hiểu ngôn ngữ tự nhiên, Go chịu trách nhiệm hợp nhất tất định, kiểm, ghi xuống đĩa và kiểm tra.
