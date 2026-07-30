# Bản đồ nội dung assets

Trước khi thêm vào hệ thống "một đoạn văn / một bài tư liệu / một điều quy tắc", hãy tra bảng dưới để xác định nó thuộc về đâu, rồi xem cách đấu nối.

| Thư mục | Đựng cái gì | Ai tiêu thụ | Cách đấu nối |
|---|---|---|---|
| `prompts/` | Worker system prompt (writer / editor / architect×2), prompt phán quyết của Arbiter và prompt cho các nhiệm vụ một lần (import×2 / simulation×2) | `agents/build.go`, `internal/arbiter`, imp / sim runner | Các trường Prompts trong `load.go`. Lưu ý: simulation_guidance do `load.go` tiêm vào lúc nạp, trong tệp md không thấy được |
| `references/` | Tư liệu kiến thức viết truyện không phụ thuộc thể loại. Không vào system prompt, mà do novel_context cắt tỉa theo vai / theo chương rồi tiêm vào `reference_pack` | writer / editor / architect | **Đấu nối ở ba chỗ**: thêm trường vào `tools.References` + `load.go` loadReferences đọc lên + `novel_context.go` writerReferences / architectReferences tiêm vào. Bỏ tệp vào thư mục thôi thì không tự nạp |
| `references/genres/<style>/` | Kiến thức riêng cho thể loại (style-references / arc-templates) | như trên, nạp khi `style != default` | `load.go` loadReferences |
| `rules/` | Thư mục quy tắc nội trú cũ, đã phế; đường cơ sở máy móc đã chuyển vào code, còn quy tắc người dùng đến từ ảnh chụp ngôn ngữ tự nhiên trong `~/.ainovel/rules/*.md` / `./.ainovel/rules/*.md` | `userrules.Service` chuẩn hóa thành `meta/user_rules.json`; `novel_context` tiêm vào; `commit_chapter` kiểm | Đường cơ sở nội trú xem `SystemDefaults()` trong `internal/rules/snapshot.go`; tệp `.md` của người dùng không cần định dạng, không cần YAML, được chuẩn hóa theo ngôn ngữ tự nhiên |
| `styles/<style>.md` | Chỉ thị văn phong viết theo thể loại | Ghép vào system prompt của **writer** (`agents/build.go`) | Tên tệp chính là giá trị của `config.style`. Nó và `references/genres/<style>/` là hai vật chứa của cùng một khái niệm thể loại: cái trước là chỉ thị văn phong, cái sau là tư liệu kiến thức |

## Phán định nội dung mới thuộc về đâu (năm câu hỏi)

1. Quy trình này buộc phải được **bảo đảm**? → Đừng viết prompt, hãy viết ràng buộc bằng code (StopAfterTools / chốt canh công cụ / Flow Router)
2. Đây là căn cứ phán quyết? → Loại quy trình tra bảng thì viết vào `internal/flow/router.go`; phán định ngữ nghĩa thì viết vào `prompts/arbiter-*.md`
3. Đây là tiêu chuẩn thẩm mỹ / thực thi của một vai nào đó? → `prompts/<role>.md`
4. Đây là quy tắc mặc định liệt kê được bằng máy (từ cấm / ngưỡng)? → `SystemDefaults()` trong `internal/rules/snapshot.go`; quy tắc người dùng tự định nghĩa thì viết vào `.ainovel/rules/*.md`, do ảnh chụp chuẩn hóa tiêu thụ (số từ/độ dài là ràng buộc mềm ngữ nghĩa, đi qua preferences, không làm quy tắc máy móc)
5. Đây là tư liệu kiến thức viết truyện? → `references/` (nhớ đấu nối ba chỗ)

## Bảo đảm tính nhất quán

Đường dẫn phong bì mà prompt tham chiếu (`working_memory.*` v.v.) buộc phải khớp với `novel_context`. Hình dạng tham số công cụ chỉ được định nghĩa trong Schema của công cụ; prompt chỉ bù thêm phần ngữ nghĩa nghiệp vụ mà Schema không diễn đạt được, không chép lại danh sách tham số JSON và ví dụ hình dạng nữa.

Prompt có thể mô tả cách thực thi của một Worker đơn lẻ, nhưng việc định tuyến toàn cục, chuyển dịch trạng thái và logic phục hồi thì chỉ lấy code làm chuẩn. Những bước có thể xác định được từ dữ kiện trong Store thì đưa vào Router/Tool; chỉ những phán định cần hiểu nội dung truyện hoặc ý định người dùng mới để lại cho model.
