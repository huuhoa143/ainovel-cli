# Sổ tay quan sát

Khi chạy tiểu thuyết dài, làm sao biết từng cơ chế có đang thật sự làm việc?

Tài liệu này không chép lại luật của diag một lượt, mà hướng tới **việc chạy thực tế**: bạn đã chạy tới chương N, thì nên mở tệp nào, xem trường nào, phán là khỏe hay bất thường.

---

## 1. Luồng tra lỗi chung

```
1. /diag                       # Chẩn đoán tự động, xem khu Findings
2. cd output/{novel}/meta/     # cat trực tiếp các hiện vật then chốt
3. tail decisions.jsonl                # Xem các phán quyết Arbiter gần nhất
4. ls -lt sessions/agents/             # Định vị phiên Worker gần nhất rồi mới tail
```

Những sự thật mà `/diag` không bao phủ (gồm cả các mục "chẩn đoán còn phải bổ sung" liệt kê trong tài liệu này) thì phải tra tay bằng bước 2-4.

### Báo issue: xuất chẩn đoán đã tẩy thông tin riêng

Mỗi lần `/diag` đều ghi thêm ra `output/{novel}/meta/diag-export.md` — một bản chẩn đoán **đã tẩy thông tin riêng** (chính văn tiểu thuyết / prompt / phần suy nghĩ đã bỏ, chỉ giữ bộ xương hành vi: tên tool, chuỗi lỗi, số lần lặp, phase/flow, step bị kẹt, phân loại lỗi trong log). Gặp vấn đề kiểu vòng lặp chết / bị ngắt, dán tệp này vào GitHub issue là đủ, người bảo trì định vị theo đó, không cần dữ liệu `output/` của bạn.

---

## 2. Bảng tra nhanh các hiện vật then chốt

Sắp theo "đường tra lỗi thường gặp nhất khi có vấn đề":

| Hiện vật | Đường dẫn | Xem gì | Khỏe | Không khỏe |
|---|---|---|---|---|
| Tiến độ | `meta/progress.json` | `phase` / `flow` / `completed_chapters` | phase tiến đơn điệu, flow nằm trong tập hợp lệ | phase lùi / flow kẹt ở một trạng thái |
| La bàn | `meta/compass.json` | Khoảng cách giữa `last_updated` và chương mới nhất | gap < 15 chương | gap > 15 chương (CompassDrift trúng) |
| Sổ nhân vật phụ | `meta/cast_ledger.json` | Số mục / tỉ lệ điền brief_role / tính nhất quán của tên | xem §4 | xem §4 |
| Sổ phục bút | `meta/foreshadow.json` | Số chương đứng bánh dài nhất của mục `status="planted"` | < số chương/3 | > số chương/3 (StaleForeshadow trúng) |
| Dàn ý | `meta/layered_outline.json` | Số chương chưa viết còn lại của tập hiện tại | đã mở rộng trước 1-2 chương | viết tới chương hiện tại mà chương sau không có outline (OutlineExhausted) |
| Hồ sơ nhân vật | `meta/characters.json` | Có tìm được nhân vật core/important trong tóm tắt N chương gần nhất không | đều tìm được | vắng mặt (GhostCharacter trúng) |
| Checkpoint | `meta/checkpoints.jsonl` | `step` của dòng gần nhất có ứng với progress không | khớp | không khớp (khôi phục sau sập chưa tự lành) |
| Kiểm toán phán quyết | `meta/decisions.jsonl` | facts/decision của mấy phán quyết gần nhất | phân loại chính xác, động tác hợp lý | cùng loại can thiệp mà phán quyết thất bại lặp lại |

---

## 3. Quan sát la bàn (compass)

**Thời điểm khắc phục**: 2026-05-08 (commit `fix: tool update_compass tự điền last_updated`)

### Xem gì

```bash
cat output/{novel}/meta/compass.json
```

Ngữ nghĩa các trường:
- `ending_direction`: hướng kết cục (phải khớp với đoạn "hướng kết cục" trong `premise.md`)
- `open_threads`: các mạch dài đang hoạt động (architect thêm/bớt ở mỗi biên tập)
- `estimated_scale`: quy mô ước lượng (như "4-6 tập", cập nhật ở mỗi biên tập)
- `last_updated`: **tool tự điền** bằng số chương đã hoàn thành lớn nhất tại lúc cập nhật (không còn dựa vào việc LLM tự điền)

### Phán độ khỏe

| Tín hiệu | Phán |
|---|---|
| `last_updated` nằm trong khoảng `[latest-15, latest]` | Khỏe |
| `last_updated` trễ hơn latest quá 15 chương | architect không cập nhật ở biên cung/tập — tra prompt architect-long.md |
| `last_updated == 0` | **Dữ liệu bẩn từ trước lần khắc phục này**, lần update_compass sau sẽ tự lành |
| `ending_direction` không khớp đoạn "hướng kết cục" trong premise.md | architect âm thầm sửa ý định của người dùng — ghi lại, rồi quyết xem có đóng băng trường đó không (đề tài thiết kế, xem todo.md) |

### Cách kiểm chứng bản khắc phục có hiệu lực

Chạy truyện dài rồi đối chiếu trước sau:
- **Trước khi khắc phục**: chạy 30+ chương thì `compass.last_updated` phần lớn là `0` hoặc một số chương thời kỳ đầu
- **Sau khi khắc phục**: mỗi lần architect gọi `update_compass`, `last_updated` đều bị tầng tool ghi đè thành latest hiện tại

---

## 4. Quan sát sổ nhân vật phụ (cast_ledger)

**Thời điểm đáp đất tính năng**: 2026-05-08 (commit `feat: thêm sổ nhân vật phụ tự theo dõi các nhân vật thứ cấp`)

### Xem gì

```bash
cat output/{novel}/meta/cast_ledger.json | jq 'length'                     # Tổng số mục
cat output/{novel}/meta/cast_ledger.json | jq '[.[] | select(.brief_role == "" or .brief_role == null)] | length'  # Số mục thiếu brief_role
cat output/{novel}/meta/cast_ledger.json | jq '[.[] | select(.appearance_count >= 3)] | length'   # Số mục xuất hiện thường xuyên (≥3 lần)
cat output/{novel}/meta/cast_ledger.json | jq 'sort_by(-.appearance_count) | .[:10]'  # 10 mục xuất hiện nhiều nhất
```

### Phán độ khỏe

| Chiều | Khỏe | Bất thường | Cách xử |
|---|---|---|---|
| **Số mục so với số chương đã hoàn thành** | số mục ledger ≈ số chương đã hoàn thành × 0,3-0,6 | > số chương × 0,8 (nhân vật lướt qua bị vào sổ sai) | Tra xem đoạn `cast_intros` trong writer.md đã đủ rõ chưa |
| **Tỉ lệ điền brief_role** | thiếu < 30% | thiếu > 50% | Writer bỏ điền nghiêm trọng — prompt dẫn dắt chưa đủ |
| **Độ tương tự giữa các tên** | không có ai bị nghi là một người nhiều tên | đồng thời xuất hiện "Tư X" / "bác Tư" / "chủ quán X" | Tên bị LLM làm trôi — thêm ràng buộc "dùng tên nhất quán" vào prompt, hoặc thêm tool gộp qua steer của người dùng |
| **Nhân vật xuất hiện thường xuyên** | các mục có `appearance_count >= 5` thì thưa | nhiều mục xuất hiện tần cao xuyên nhiều cung | Nên tính tới việc nâng lên hồ sơ cốt lõi (kênh nâng cấp ở giai đoạn 3) |
| **Phần triệu hồi có được tiêu thụ** | Khi Writer viết tới nhân vật cũ, trường characters của commit_chapter chứa những tên đã có trong ledger | Writer phát minh lại cùng một tên (xuất hiện cả "bác Bảy A" và "bác Bảy B") | recent_cast triệu hồi mà không được tiêu thụ — kiểm đoạn "liên tục nhân vật phụ" trong writer.md |

### Kiểm chứng dòng dữ liệu (đầu-cuối)

Sau khi chạy 5 chương:
1. `cat meta/cast_ledger.json` lẽ ra không rỗng (trừ khi mỗi chương chỉ dùng nhân vật cốt lõi)
2. Nếu Writer giới thiệu "bác Bảy" ở chương 1:
   - trong `cast_ledger` lẽ ra có mục `bác Bảy`, `appearance_count=1`
3. Nếu chương 5 lại viết về bác Bảy:
   - `bác Bảy.appearance_count=2`, `last_seen_chapter=5`
4. Trong `meta/sessions/agents/writer-*.jsonl`, giá trị trả về của novel_context ở chương 5 lẽ ra phải thấy bác Bảy trong `episodic_memory.recent_cast`
5. Nếu bước trên thấy rồi mà Writer không tiêu thụ (bác Bảy viết ra không khớp với chương 1) — đây là vấn đề prompt

### Hiện chưa có chẩn đoán tự động (nhưng snapshot đã nạp)

`diag.Snapshot.CastLedger` đã được đọc trong `Load()`, luật có thể tiêu thụ trực tiếp — nhưng hiện chưa viết luật nào. Việc kiểm chứng vẫn dựa vào các lệnh `jq` ở trên để tra tay.

Nếu sau này muốn bổ sung luật chẩn đoán (các ứng viên):
- `CastBriefRoleMissing`: tỉ lệ thiếu > 50% thì cảnh báo
- `CastBloat`: số mục > số chương × 0,8 thì cảnh báo
- `CastPromotionCandidate`: appearance_count ≥ 5 và xuyên cung → đề xuất nâng cấp

Đừng chốt ngưỡng ngay lúc này — đợi dữ liệu truyện dài ra rồi xem phân bố thật mới định. Bản thân code của luật chỉ cần 30-50 dòng.

---

## 5. Writer có đang làm việc như mong đợi không

Khi chạy truyện dài, điều đáng quan tâm nhất là **Writer có thật sự hành xử theo prompt không**. Cách quan sát trực tiếp nhất là session log:

```bash
ls output/{novel}/meta/sessions/agents/    # Mỗi tác tử con một tệp jsonl
tail -50 output/{novel}/meta/sessions/agents/writer-*.jsonl
```

Xem vài hành vi cụ thể:

| Hành vi mong đợi | Thể hiện trong jsonl |
|---|---|
| Writer đã xem recent_cast | Trường `episodic_memory.recent_cast` trong giá trị trả về của tool novel_context không rỗng |
| Writer đã điền cast_intros trong commit_chapter | Tham số tool_call `cast_intros` là mảng không rỗng (chỉ ở những chương giới thiệu nhân vật mới) |
| Writer đã dùng phần gợi ý chương liên quan | Số lần gọi `read_chapter` > 1 (mặc định 1 lần, vượt lên nghĩa là đã đọc lại) |
| Writer không vi phạm thứ tự tool | Chuỗi tool_call đúng nghiêm ngặt `novel_context → read_chapter → plan_chapter → draft_chapter → check_consistency → commit_chapter` |

Nếu trong jsonl thấy Writer gọi rỗng novel_context nhiều lần, hoặc sau commit_chapter lại gọi tool khác — là prompt chưa thu được.

---

## 6. Vạch đỏ cho tình huống chạy dài

Khi chạy truyện dài 100+ chương, bất kỳ điều nào dưới đây trúng là nên dừng lại để tra:

- [ ] CompassDrift trúng và kéo dài 2 cung chưa xóa được
- [ ] Số mục cast_ledger > số chương đã hoàn thành × 0,8
- [ ] Tỉ lệ điền brief_role trong cast_ledger < 30%
- [ ] Cùng một nhân vật xuất hiện dưới nhiều tên bị nghi trùng (cùng tồn tại "bác Tư" / "chủ quán Tư")
- [ ] Writer viết chương mới mà không đọc các nhân vật cũ đã có trong recent_cast (phát minh lại)
- [ ] Trong phiên Worker xuất hiện ≥ 5 lần liên tiếp gọi rỗng novel_context
- [ ] Sau khi commit bất kỳ chương nào mà `meta/checkpoints.jsonl` không có step `commit_chapter` tương ứng

4 điều đầu là độ khỏe của các cơ chế mới lần này; 3 điều sau là tính ổn định của các cơ chế đã có.

---

## 7. Quy phạm bảo trì tài liệu

**Khi thêm một hiện vật ở tầng sự thật (tạo mới một `meta/*.json` / `meta/*.jsonl`), hãy đồng bộ:**

1. Thêm một dòng tra nhanh vào §2 của tài liệu này
2. Nếu hiện vật cần quan sát chuyên đề (không phải chỉ phán "có/không có" đơn giản), thêm một mục chuyên đề §X
3. Nếu muốn chẩn đoán tự động, hãy nạp trong `internal/diag/snapshot.go::Load` và thêm luật vào `internal/diag/rules_*.go`

**Đừng:**
- Đừng chép toàn bộ luật trong `internal/diag/` vào tài liệu này (đó là phần tham chiếu luật, không phải sổ tay quan sát)
- Đừng viết luật chẩn đoán cho mọi cơ chế — ngưỡng mà chốt theo cảm tính thì sẽ sai, hãy quan sát trước rồi bổ sung sau
