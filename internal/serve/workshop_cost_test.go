package serve

import (
	"encoding/json"
	"net/http"
	"testing"
)

// usageSanSang là một meta/usage.json ĐỌC ĐƯỢC (schema khớp domain.UsageSchemaVersion = 2).
//
// `overall.cost_usd` được SUY từ các vai chứ không truyền vào rời, vì đó là bất biến mà store
// thật giữ: đo trên `output/tran-yeu-ky/meta/usage.json` thì `overall` bằng tổng `per_agent`
// sai khác 8.9e-16 — tức bằng nhau, chỉ lệch bụi dấu phẩy động. Một fixture đặt hai giá trị
// đó độc lập sẽ làm bài kiểm "phần bổ cộng ra tổng" đỏ vì chính fixture, và người sửa sau sẽ
// đi sửa mã đang đúng.
//
// Viết thô thay vì gọi store: bài kiểm này đo phép CỘNG của tờ tổng, và tệp thô cho phép đặt
// những con số có đuôi rác giống dữ liệu thật (4.1826, 1.9064) — đúng chỗ phép cộng dễ sai.
func usageSanSang(saved float64, vai map[string]float64) string {
	var cost float64
	perAgent := map[string]any{}
	for ten, v := range vai {
		cost += v
		perAgent[ten] = map[string]any{"cost_usd": v}
	}
	b, _ := json.Marshal(map[string]any{
		"schema": 2,
		"overall": map[string]any{
			"input": 703920, "output": 168390, "cost_usd": cost, "saved_usd": saved,
		},
		"per_agent": perAgent,
		"per_model": map[string]any{
			"gemini-2.5-pro": map[string]any{"cost_usd": cost},
		},
	})
	return string(b)
}

func layTongXuong(t *testing.T, s *server) WorkshopCostDoc {
	t.Helper()
	rec := do(t, s, "GET", "/api/workshop/cost")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/workshop/cost = %d, phải 200: %s", rec.Code, rec.Body.String())
	}
	var doc WorkshopCostDoc
	if err := json.Unmarshal(rec.Body.Bytes(), &doc); err != nil {
		t.Fatal(err)
	}
	return doc
}

// TestTongXuong_CongChiPhiVaBoTheoVai là bài kiểm chính: tờ tổng phải cộng đúng, và phần bổ
// theo vai phải cộng lại ra được con số ở tiêu đề.
//
// Điều kiện thứ hai là thứ dễ mất nhất khi ai đó "sửa cho gọn" bằng cách làm tròn từng cuốn
// trước khi cộng (xem chú thích ở WorkshopCostDoc.Overall về vì sao luật ở đây khác luật của
// dải tổng ở màn Quản lý).
func TestTongXuong_CongChiPhiVaBoTheoVai(t *testing.T) {
	root := t.TempDir()
	a := newBook(t, root, "cuon-a", nil)
	b := newBook(t, root, "cuon-b", nil)
	// Bốn vai với đuôi rác thật, chép từ output/tran-yeu-ky.
	ghiTho(t, a, "meta/usage.json", usageSanSang(19.65, map[string]float64{
		"writer": 4.1826, "editor": 1.9064, "architect": 1.284, "arbiter": 0,
	}))
	ghiTho(t, b, "meta/usage.json", usageSanSang(3.30, map[string]float64{
		"writer": 3.5, "architect": 0.9785, "editor": 0, "arbiter": 0,
	}))

	doc := layTongXuong(t, &server{root: root})

	if doc.Counted != 2 {
		t.Errorf("counted = %d, phải 2", doc.Counted)
	}
	if len(doc.NoData) != 0 {
		t.Errorf("no_data = %v, phải rỗng", doc.NoData)
	}
	if got, muon := doc.Overall.CostUSD, 7.373+4.4785; !gan(got, muon) {
		t.Errorf("overall.cost_usd = %v, phải %v", got, muon)
	}
	if got, muon := doc.Overall.SavedUSD, 19.65+3.30; !gan(got, muon) {
		t.Errorf("overall.saved_usd = %v, phải %v", got, muon)
	}
	if got, muon := doc.PerAgent["writer"].CostUSD, 4.1826+3.5; !gan(got, muon) {
		t.Errorf("per_agent[writer] = %v, phải %v", got, muon)
	}
	if got, muon := doc.PerAgent["architect"].CostUSD, 1.284+0.9785; !gan(got, muon) {
		t.Errorf("per_agent[architect] = %v, phải %v", got, muon)
	}
	// `arbiter` = 0 ở CẢ HAI cuốn vẫn phải có khóa trong map. `0` là một phép đo có thật
	// (vai đó chưa tốn gì), khác hẳn vắng mặt — cùng luật null≠0 mà cả hợp đồng giữ.
	if _, co := doc.PerAgent["arbiter"]; !co {
		t.Error("per_agent thiếu khóa \"arbiter\" — $0 là phép đo có thật, không phải vắng mặt")
	}

	// Phần bổ theo vai phải cộng ra tổng. Nếu nhánh này đỏ thì các thanh trên bề mặt Cài
	// đặt chung không cộng ra được con số in ngay trên chúng.
	var boVai float64
	for _, v := range doc.PerAgent {
		boVai += v.CostUSD
	}
	if !gan(boVai, doc.Overall.CostUSD) {
		t.Errorf("bổ theo vai cộng ra %v nhưng tổng ghi %v — bảng không tự cộng được", boVai, doc.Overall.CostUSD)
	}
}

// TestTongXuong_CuonChuaCoSoLieuKhongLamTongNoiDoi.
//
// Một tổng $7,37 trên xưởng ba cuốn nói hai điều rất khác nhau tuỳ vào việc nó cộng từ ba
// cuốn hay từ một. Không nói ra thì người vận hành đọc nó thành "cả xưởng tốn có thế", trong
// khi hai cuốn kia chỉ là chưa đo được.
func TestTongXuong_CuonChuaCoSoLieuKhongLamTongNoiDoi(t *testing.T) {
	root := t.TempDir()
	a := newBook(t, root, "da-chay", nil)
	newBook(t, root, "chua-chay", nil) // không có meta/usage.json
	c := newBook(t, root, "schema-lech", nil)
	ghiTho(t, a, "meta/usage.json", usageSanSang(0, map[string]float64{"writer": 7.37}))
	ghiTho(t, c, "meta/usage.json", `{"schema":999,"overall":{"cost_usd":99.99}}`)

	doc := layTongXuong(t, &server{root: root})

	if doc.Counted != 1 {
		t.Errorf("counted = %d, phải 1 — chỉ một cuốn đọc được số liệu", doc.Counted)
	}
	if len(doc.NoData) != 2 {
		t.Errorf("no_data = %v, phải có đúng 2 cuốn", doc.NoData)
	}
	// Cuốn schema lệch KHÔNG được cộng $99,99 vào tổng: bản này không đọc được tệp đó, nên
	// mọi con số trong nó là số bản khác.
	if !gan(doc.Overall.CostUSD, 7.37) {
		t.Errorf("overall.cost_usd = %v, phải đúng 7.37", doc.Overall.CostUSD)
	}

	// Bốn ca của buildCost phải đi tới được từng hàng, không bị hạ xuống một bool.
	theoID := map[string]WorkshopCostBook{}
	for _, b := range doc.Books {
		theoID[b.ID] = b
	}
	if got := theoID["chua-chay"].CostState; got != ChiPhiChuaCoTep {
		t.Errorf("chua-chay cost_state = %q, phải %q", got, ChiPhiChuaCoTep)
	}
	if got := theoID["schema-lech"].CostState; got != ChiPhiLechSchema {
		t.Errorf("schema-lech cost_state = %q, phải %q — gộp nó vào \"chưa chạy\" là nói cuốn này chưa tốn tiền", got, ChiPhiLechSchema)
	}
}

// TestTongXuong_YDinhDaKyKhacVoiEngineDangDungOCua.
//
// `advance_mode` rỗng nghĩa là CHƯA CÓ meta/run.json — cuốn chưa chạy engine lần nào. Khác
// hẳn `auto`, vốn là một chế độ đã chọn. Gộp hai ca đó lại là dựng một hàng chờ cho những
// cuốn không có gì đang chờ.
func TestTongXuong_YDinhDaKyKhacVoiEngineDangDungOCua(t *testing.T) {
	root := t.TempDir()
	newBook(t, root, "chua-mo-lan-nao", nil)
	b := newBook(t, root, "cho-duyet", nil)
	ghiTho(t, b, "meta/run.json", `{
	  "advance_mode": "review",
	  "advance_permit_chapter": 8,
	  "advance_hold": {"after": "rewrite_queue_drained", "reason": "kiểm tuyến Bạch gia"},
	  "pending_steer": "Lâm Thanh nên do dự lâu hơn"
	}`)

	doc := layTongXuong(t, &server{root: root})

	theoID := map[string]WorkshopCostBook{}
	for _, x := range doc.Books {
		theoID[x.ID] = x
	}

	chua := theoID["chua-mo-lan-nao"]
	if chua.AdvanceMode != "" {
		t.Errorf("cuốn chưa có run.json: advance_mode = %q, phải rỗng", chua.AdvanceMode)
	}
	if chua.AdvanceHold || chua.PendingSteer {
		t.Error("cuốn chưa có run.json không được mang dấu tồn nào")
	}

	cho := theoID["cho-duyet"]
	if cho.AdvanceMode != "review" {
		t.Errorf("advance_mode = %q, phải \"review\"", cho.AdvanceMode)
	}
	if !cho.AdvanceHold {
		t.Error("advance_hold phải true — có một mốc tạm dừng đã ký trên đĩa")
	}
	if cho.AdvanceHoldReason == "" {
		t.Error("advance_hold_reason phải có: một dấu tồn không nói lý do thì không hành động được")
	}
	if !cho.PendingSteer {
		t.Error("pending_steer phải true")
	}
}

// TestTongXuong_ThuMucRongKhongPhaiLoi: máy mới chưa có thư mục output là trạng thái hợp lệ.
func TestTongXuong_ThuMucRongKhongPhaiLoi(t *testing.T) {
	doc := layTongXuong(t, &server{root: t.TempDir()})
	if doc.Counted != 0 || len(doc.Books) != 0 {
		t.Errorf("xưởng rỗng phải cho counted=0 và books rỗng, nhận %d / %d", doc.Counted, len(doc.Books))
	}
	// Mảng phải là `[]` chứ không `null`: giao diện lặp trên nó không cần chốt riêng.
	rec := do(t, &server{root: t.TempDir()}, "GET", "/api/workshop/cost")
	if !jsonCo(rec.Body.String(), `"books":[]`) {
		t.Errorf("books phải là [] không phải null: %s", rec.Body.String())
	}
}

// TestTongXuong_GiuThuTuCuaWorkshop: hai tờ phải xếp giống nhau để giao diện ghép được theo
// chỉ số, và để hai bề mặt không liệt kê cùng một xưởng theo hai thứ tự.
func TestTongXuong_GiuThuTuCuaWorkshop(t *testing.T) {
	root := t.TempDir()
	newBook(t, root, "aaa", nil)
	newBook(t, root, "bbb", nil)
	newBook(t, root, "ccc", nil)
	s := &server{root: root}

	recWs := do(t, s, "GET", "/api/workshop")
	var ws Workshop
	if err := json.Unmarshal(recWs.Body.Bytes(), &ws); err != nil {
		t.Fatal(err)
	}
	doc := layTongXuong(t, s)

	if len(ws.Books) != len(doc.Books) {
		t.Fatalf("hai tờ có số cuốn khác nhau: %d và %d", len(ws.Books), len(doc.Books))
	}
	for i := range ws.Books {
		if ws.Books[i].ID != doc.Books[i].ID {
			t.Errorf("vị trí %d: /workshop nói %q, /workshop/cost nói %q", i, ws.Books[i].ID, doc.Books[i].ID)
		}
	}
}

func gan(a, b float64) bool {
	d := a - b
	return d < 1e-9 && d > -1e-9
}

func jsonCo(than, mau string) bool {
	return len(than) > 0 && len(mau) > 0 && (indexOf(than, mau) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
