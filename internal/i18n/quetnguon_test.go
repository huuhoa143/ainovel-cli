package i18n

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

// Bộ quét mã nguồn canh lớp lỗi "chữ mang tính ngôn ngữ KHÔNG đi qua catalog".
//
// # Vì sao lớp lỗi này cần một bộ quét riêng
//
// Mọi phép đo độ phủ dịch của dự án đều tính trên catalog: đếm msgid, đối chiếu
// format verb, kiểm cặp rỗng. Chúng đo được thứ NẰM TRONG catalog. Nhưng có
// những thứ mang tính ngôn ngữ mà không bao giờ là một msgid:
//
//   - dấu nối liệt kê: strings.Join(x, "、")
//   - dấu câu toàn phần trong chuỗi KHÔNG có chữ Hán: fmt.Errorf("premise：%w")
//
// Chuỗi loại thứ hai đáng ngại nhất vì nó VĨNH VIỄN không vào catalog được:
// không có chữ Hán thì bộ thu thập msgid không nhặt, nên nó in dấu `：` toàn
// phần ra giao diện tiếng Việt ở MỌI locale, và không phép đo nào thấy.
//
// # Vì sao dùng go/ast chứ không quét theo dòng
//
// Bản quét-theo-dòng trước đây báo bừa hai lần, cả hai lần đều vào chính comment
// giải thích lỗi mà nó canh — vì quét theo dòng không phân biệt được chữ TRONG mã
// và chữ nói VỀ mã. go/parser bỏ comment ngay ở tầng phân tích nên lớp báo bừa đó
// không còn đường xảy ra. Nó cũng thấy được chuỗi nhiều dòng và chuỗi thô, thứ mà
// regex neo theo dòng bỏ sót.

// dauToanPhan là các dấu câu toàn phần gây lỗi thật.
//
// Không lấy cả dải CJK punctuation: `…` (U+2026) dùng hợp lệ trong cả tiếng Việt
// lẫn tiếng Trung, và `·` (U+00B7) là dấu giữa dòng dùng bình thường trong chữ
// Latin. Bắt chúng là báo bừa, và một bộ canh báo bừa là một bộ canh bị tắt.
const dauToanPhan = "，。、：；（）！？【】「」『』《》"

// quetBoQua là các nhánh không quét, mỗi nhánh một lý do khác nhau.
var quetBoQua = map[string]string{
	"web":          "mã TypeScript, có bộ canh riêng ở internal/serve/web_chu_test.go",
	"scripts":      "công cụ dịch chạy tay, không phải mã sản phẩm",
	"node_modules": "phụ thuộc ngoài",
	"testdata":     "dữ liệu mẫu, cố ý chứa chuỗi thô",
	".git":         "",
}

// boQuaCoLyDo miễn trừ từng chuỗi cụ thể, mỗi chuỗi kèm lý do.
//
// Khóa là {tệp, chuỗi} chứ không phải {tệp, dòng}: số dòng xê dịch mỗi lần sửa
// tệp, nên danh sách khóa theo dòng sẽ âm thầm miễn trừ sai chỗ.
//
// Chỉ dùng khi chuỗi là DỮ LIỆU mà bộ nhận tập-ký-tự không với tới được — tức
// tập ký tự không truyền thẳng vào hàm strings mà đi qua một trường struct. Đừng
// dùng để tắt một phát hiện thật.
var boQuaCoLyDo = map[[2]string]string{
	{"internal/stylestat/stylestat.go", "。！？"}: "tập rune kết câu của zhProfile; " +
		"viProfile ngay dưới đã có \".!?…\" — dữ liệu chọn theo locale, không phải chữ hiển thị. " +
		"Bộ nhận tập-ký-tự không thấy vì nó vào struct rồi mới tới strings.ContainsRune.",
}

// TestNguonKhongVietCungDauTiengTrung canh cả hai lớp trên toàn repo.
//
// Quét TOÀN repo, không chỉ internal/: bản trước chỉ đi internal/ nên assets/ và
// cmd/ là điểm mù — và assets/load.go là chỗ rất dễ mọc thêm strings.Join mới.
func TestNguonKhongVietCungDauTiengTrung(t *testing.T) {
	goc := filepath.Join("..", "..")

	// Chuỗi đã có trong catalog thì KHÔNG vi phạm: nó có bản dịch, và bản dịch
	// là chỗ đúng để chọn dấu. Ví dụ msgid "（%s）" dịch thành " (%s)" — kèm cả
	// khoảng trắng đầu, thứ mà bản ASCII viết trực tiếp tại chỗ luôn quên, vì
	// `（` toàn phần không cần space trước còn `(` ASCII thì cần.
	//
	// Nhờ vậy bộ canh này tự bảo dưỡng: muốn hết đỏ thì hoặc bỏ dấu toàn phần,
	// hoặc đưa chuỗi vào catalog kèm bản dịch. Cả hai đều là kết cục đúng.
	trongCatalog := func(s string) bool {
		p := current.Load()
		if p == nil {
			return false
		}
		_, ok := (*p)[s]
		return ok
	}

	var viPham []string
	soTep := 0
	fset := token.NewFileSet()

	// Vị trí các literal đứng ở chỗ TẬP KÝ TỰ, thu trước rồi bỏ qua sau.
	// Xem laTapKyTu để biết vì sao chúng không phải chữ hiển thị.
	tapKyTu := map[token.Pos]bool{}

	err := filepath.WalkDir(goc, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if _, bo := quetBoQua[d.Name()]; bo {
				return fs.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(p, ".go") || strings.HasSuffix(p, "_test.go") {
			return nil
		}
		// Gói i18n là tầng DUY NHẤT được phép nêu tên các dấu này: listSeparator
		// phải viết ra "、" mới trả về được nó.
		if filepath.Base(filepath.Dir(p)) == "i18n" {
			return nil
		}

		f, err := parser.ParseFile(fset, p, nil, 0)
		if err != nil {
			// Không bỏ qua: tệp không phân tích được nghĩa là bộ canh mù với nó,
			// và mù âm thầm còn tệ hơn đỏ.
			return err
		}
		soTep++
		rel, _ := filepath.Rel(goc, p)

		// Lượt một: đánh dấu literal ở chỗ tập ký tự. Phải đi trước vì ast.Inspect
		// gặp literal TRƯỚC khi biết nó nằm trong lời gọi nào.
		ast.Inspect(f, func(n ast.Node) bool {
			if c, ok := n.(*ast.CallExpr); ok {
				if pos, ok := viTriTapKyTu(c); ok {
					tapKyTu[pos] = true
				}
			}
			return true
		})

		ast.Inspect(f, func(n ast.Node) bool {
			switch v := n.(type) {
			case *ast.CallExpr:
				if laJoinDauTiengTrung(v) {
					viPham = append(viPham, viTri(fset, rel, v.Pos())+
						"  strings.Join(..., \"、\") — dùng i18n.JoinList")
				}
			case *ast.BasicLit:
				if v.Kind != token.STRING {
					return true
				}
				if tapKyTu[v.Pos()] {
					return true
				}
				s, err := strconv.Unquote(v.Value)
				if err != nil {
					return true
				}
				if !strings.ContainsAny(s, dauToanPhan) {
					return true
				}
				// Có chữ Hán → đây là msgid của upstream. Dấu toàn phần trong đó là
				// chữ của bản gốc, và bản dịch trong catalog mới là chỗ đổi dấu.
				if coChuHan(s) {
					return true
				}
				if trongCatalog(s) {
					return true
				}
				if _, mien := boQuaCoLyDo[[2]string{filepath.ToSlash(rel), s}]; mien {
					return true
				}
				viPham = append(viPham, viTri(fset, rel, v.Pos())+
					"  "+strconv.Quote(s)+" — dấu toàn phần trong chuỗi không có chữ Hán")
			}
			return true
		})
		return nil
	})
	if err != nil {
		t.Fatalf("quét: %v", err)
	}

	// Chống bài kiểm rỗng. Lỗi này đã xảy ra thật ở đây: một bài kiểm so chuỗi
	// xuống dòng dạng-nguồn với dạng-lúc-chạy nên cả hai bên đều sai, kiểm đúng 0
	// mục và xanh suốt. Từ đó mọi bài kiểm quét-nguồn đều phải tự chứng minh là
	// có quét được gì.
	if soTep < 100 {
		t.Fatalf("chỉ quét được %d tệp .go — bộ quét đang lạc đường, bài kiểm này rỗng nghĩa", soTep)
	}

	if len(viPham) > 0 {
		t.Errorf("chữ mang tính ngôn ngữ không đi qua catalog (%d chỗ), quét %d tệp:\n  %s",
			len(viPham), soTep, strings.Join(viPham, "\n  "))
	}
	t.Logf("đã quét %d tệp .go", soTep)
}

// laJoinDauTiengTrung nhận strings.Join(x, "、").
//
// Xét cây cú pháp thay vì chuỗi ký tự nên nó thấy được cả trường hợp đối số dài
// có dấu phẩy bên trong — đúng chỗ mà bản quét-theo-dòng bỏ sót một lần
// (command_config.go:999, đối số là một lời gọi hàm có hai tham số).
func laJoinDauTiengTrung(c *ast.CallExpr) bool {
	sel, ok := c.Fun.(*ast.SelectorExpr)
	if !ok || sel.Sel.Name != "Join" {
		return false
	}
	if pkg, ok := sel.X.(*ast.Ident); !ok || pkg.Name != "strings" {
		return false
	}
	if len(c.Args) != 2 {
		return false
	}
	lit, ok := c.Args[1].(*ast.BasicLit)
	if !ok || lit.Kind != token.STRING {
		return false
	}
	s, err := strconv.Unquote(lit.Value)
	return err == nil && s == "、"
}

// hamTapKyTu là các hàm strings nhận TẬP KÝ TỰ ở tham số thứ hai.
//
// Chuỗi ở vị trí đó không phải chữ hiển thị mà là danh sách ký tự cần khớp —
// cùng loại với biểu thức chính quy. Nó PHẢI giữ dấu toàn phần bất kể ngôn ngữ:
// `strings.Trim(name, "《》\"")` ở domain/runtime.go bóc dấu trang trí mà mô hình
// tự thêm vào tên sách, và mô hình có thể thêm dấu tiếng Trung ở bất kỳ locale nào.
// Bỏ dấu đó khỏi tập ký tự là làm hàng rào phòng vệ hở ra.
var hamTapKyTu = map[string]bool{
	"Trim": true, "TrimLeft": true, "TrimRight": true,
	"ContainsAny": true, "IndexAny": true, "LastIndexAny": true,
}

// viTriTapKyTu trả về vị trí literal tập-ký-tự trong lời gọi, nếu có.
func viTriTapKyTu(c *ast.CallExpr) (token.Pos, bool) {
	sel, ok := c.Fun.(*ast.SelectorExpr)
	if !ok || !hamTapKyTu[sel.Sel.Name] {
		return 0, false
	}
	if pkg, ok := sel.X.(*ast.Ident); !ok || pkg.Name != "strings" {
		return 0, false
	}
	if len(c.Args) != 2 {
		return 0, false
	}
	lit, ok := c.Args[1].(*ast.BasicLit)
	if !ok || lit.Kind != token.STRING {
		return 0, false
	}
	return lit.Pos(), true
}

func coChuHan(s string) bool {
	for _, r := range s {
		if r >= 0x4E00 && r <= 0x9FFF {
			return true
		}
	}
	return false
}

func viTri(fset *token.FileSet, rel string, pos token.Pos) string {
	return rel + ":" + strconv.Itoa(fset.Position(pos).Line)
}
