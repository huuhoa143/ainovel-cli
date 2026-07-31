// Package serve cung cấp HTTP API chỉ-đọc trên store, làm nền cho web studio.
//
// # Vì sao chỉ đọc
//
// Engine là process riêng (TUI hoặc headless) và nó SỞ HỮU trạng thái ghi. Nếu
// `serve` cũng ghi thì hai process cùng sửa meta/run_meta.json: engine đọc
// PendingSteer, xử lý, rồi ClearPendingSteer — một lượt ghi chen vào giữa sẽ mất
// trắng ý kiến can thiệp, không lỗi, không dấu vết. Store không có khóa liên
// tiến-trình, và runtime queue không phải kênh lệnh (engine chỉ đọc nó để dựng
// lại giao diện, xem host.go:1432). Nên can thiệp qua web cần engine hợp tác
// trước; đến lúc đó Capabilities.Steer vẫn là false và giao diện tự ẩn ô nhập.
//
// # Vì sao tail queue thay vì hook vào engine
//
// observer đã ghi mọi sự kiện vào runtime queue kèm Seq tăng đơn điệu
// (observer.persistEvent → RuntimeStore.AppendQueue). SSE chỉ cần đọc
// LoadQueueAfter(seq). Nhờ vậy package này không chạm một dòng nào của core —
// điều quan trọng với một fork đang phải đuổi theo upstream phát triển nhanh.
// Seq cũng map thẳng sang Last-Event-ID nên client kết nối lại không bỏ sót.
//
// # Vì sao chuỗi ở đây KHÔNG đi qua i18n
//
// Đây là ngoại lệ duy nhất trong repo, và nó có chủ đích. Ghi lại để không ai
// "sửa" nó thành đúng-hình-thức mà sai-mục-đích.
//
// Lớp i18n của repo dùng chính chuỗi tiếng Trung làm msgid, và locale zh là
// catalog RỖNG — mọi msgid rơi về chính nó, tức đúng chuỗi gốc của upstream. Cơ
// chế đó tồn tại cho MỘT việc: đối chiếu hành vi với upstream (xem
// i18n.EnvLocale). Nó chỉ chạy được khi có một chuỗi upstream để rơi về.
//
// Package này là mã mới của fork, upstream không có `serve`. Nên bọc chuỗi ở đây
// đòi phải TỰ BỊA msgid tiếng Trung cho từng câu — 18 câu tiếng Trung do người
// không viết tiếng Trung soạn, đặt vào một fork tiếng Việt, để phục vụ một phép
// đối chiếu không tồn tại. Cái giá là thật, cái lợi thì không.
//
// Nên chuỗi ở đây là tiếng Việt trực tiếp, và `AINOVEL_LANG=zh` KHÔNG đổi được
// chúng. Đó là hệ quả đã biết, không phải lỗi bỏ sót.
//
// Điều này KHÔNG áp cho phần còn lại của repo: mọi chuỗi có nguyên bản tiếng
// Trung đều phải qua i18n.F/T, và có bộ canh soi mã nguồn để bảo đảm
// (internal/i18n/quetnguon_test.go, internal/serve/web_chu_test.go).
package serve

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/voocel/ainovel-cli/internal/domain"
	"github.com/voocel/ainovel-cli/internal/store"
)

var errNotInitialized = errors.New("thư mục này chưa có dữ liệu tác phẩm (thiếu meta/progress.json)")

// rawJSON để nguyên khối JSON thô khi đưa vào payload, thay vì bọc thành chuỗi.
type rawJSON json.RawMessage

func (r rawJSON) MarshalJSON() ([]byte, error) {
	if len(r) == 0 {
		return []byte("null"), nil
	}
	return r, nil
}

// Command là điểm vào của lệnh con `ainovel-cli serve`.
func Command(argv []string) int {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	addr := fs.String("addr", "127.0.0.1:8420", "địa chỉ lắng nghe")
	root := fs.String("root", filepath.Join("output"), "thư mục gốc chứa các tác phẩm")
	book := fs.String("book", "", "chỉ phục vụ một tác phẩm (tên thư mục con trong root)")
	webDir := fs.String("web", "", "thư mục web tĩnh đã build (rỗng = chỉ chạy API)")
	if err := fs.Parse(argv); err != nil {
		return 2
	}

	// Mặc định chỉ lắng nghe localhost: store chứa toàn văn tác phẩm chưa phát
	// hành và khóa cấu hình, mở ra mọi giao diện mạng là rò rỉ mặc định.
	if err := warnIfPublic(*addr); err != nil {
		fmt.Fprintf(os.Stderr, "serve: %v\n", err)
	}

	srv := &server{root: *root, onlyBook: *book, webDir: *webDir}
	mux := srv.routes()

	fmt.Fprintf(os.Stdout, "ainovel studio đang chạy tại http://%s\n", *addr)
	fmt.Fprintf(os.Stdout, "  thư mục gốc: %s\n", *root)
	if *webDir == "" {
		fmt.Fprintln(os.Stdout, "  chế độ: chỉ API (dùng --web để phục vụ giao diện đã build)")
	}

	httpSrv := &http.Server{
		Addr:              *addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		// Không đặt WriteTimeout: SSE là kết nối dài, WriteTimeout sẽ cắt stream
		// giữa phiên theo đồng hồ chứ không theo lỗi thật.
	}
	if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		fmt.Fprintf(os.Stderr, "serve: %v\n", err)
		return 1
	}
	return 0
}

func warnIfPublic(addr string) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return nil
	}
	switch host {
	case "", "127.0.0.1", "localhost", "::1":
		return nil
	}
	return fmt.Errorf("đang lắng nghe %s — store chứa toàn văn chưa phát hành, đừng mở ra mạng công cộng", addr)
}

type server struct {
	root     string
	onlyBook string
	webDir   string
}

func (s *server) routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/workshop", s.handleWorkshop)
	mux.HandleFunc("GET /api/books/{book}/studio", s.handleStudio)
	mux.HandleFunc("GET /api/books/{book}/chapters/{n}", s.handleChapter)
	mux.HandleFunc("GET /api/books/{book}/outline", s.handleOutline)
	mux.HandleFunc("GET /api/books/{book}/cast", s.handleCast)
	mux.HandleFunc("GET /api/books/{book}/world", s.handleWorld)
	mux.HandleFunc("GET /api/books/{book}/events", s.handleEvents)

	if s.webDir != "" {
		mux.Handle("/", http.FileServer(http.Dir(s.webDir)))
	}
	return mux
}

// openBook mở store của một tác phẩm sau khi đã kiểm tên thư mục.
func (s *server) openBook(id string) (*store.Store, error) {
	dir, err := s.bookDir(id)
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(filepath.Join(dir, "meta", "progress.json")); err != nil {
		return nil, errNotInitialized
	}
	return store.NewStore(dir), nil
}

// bookDir dịch id thành đường dẫn, chặn thoát khỏi thư mục gốc.
//
// id đến từ URL nên phải coi là dữ liệu không tin được: "../../../etc" hay
// đường dẫn tuyệt đối sẽ đọc được file ngoài xưởng. Chỉ nhận đúng một đoạn tên,
// không chứa dấu phân cách, và đối chiếu lại bằng đường dẫn đã giải quyết.
func (s *server) bookDir(id string) (string, error) {
	if s.onlyBook != "" && id != s.onlyBook {
		return "", fmt.Errorf("tác phẩm %q không được phục vụ ở phiên này", id)
	}
	if id == "" || id == "." || id == ".." ||
		strings.ContainsAny(id, `/\`) || filepath.IsAbs(id) {
		return "", fmt.Errorf("tên tác phẩm không hợp lệ: %q", id)
	}

	rootAbs, err := filepath.Abs(s.root)
	if err != nil {
		return "", err
	}
	dir := filepath.Join(rootAbs, id)
	// Chốt lần hai sau khi ghép. Hai lớp này KHÔNG lớp nào dư — đã kiểm bằng
	// cách bỏ từng lớp và xem test hỏng ở đâu:
	//   - lớp trên bắt: đường dẫn tuyệt đối ("/etc/passwd"), tên nhiều đoạn
	//     ("sub/dir"), dấu phân cách Windows
	//   - lớp này bắt: ".." và "../etc" — filepath.Join làm sạch chúng thành
	//     đường dẫn hợp lệ TRÔNG vô hại, chỉ so tiền tố mới thấy nó đã ra ngoài
	if dir != rootAbs && !strings.HasPrefix(dir, rootAbs+string(os.PathSeparator)) {
		return "", fmt.Errorf("tên tác phẩm không hợp lệ: %q", id)
	}
	return dir, nil
}

func (s *server) handleWorkshop(w http.ResponseWriter, r *http.Request) {
	ws, err := scanWorkshop(s.root, s.onlyBook)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, ws)
}

func (s *server) handleStudio(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("book")
	st, err := s.openBook(id)
	if err != nil {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	selected, _ := strconv.Atoi(r.URL.Query().Get("chapter"))
	snap, err := buildSnapshot(st, id, selected)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, snap)
}

// Nguồn văn bản của một chương, trả kèm trong JSON để giao diện gọi tên đúng thứ
// nó đang hiện.
const (
	NguonNhap = "draft" // drafts/{NN}.draft.md — đang viết, chưa chốt
	NguonChot = "final" // chapters/{NN}.md — đã nghiệm thu
)

// noiDungChuong đọc văn bản một chương: ưu tiên bản nháp, thiếu thì lấy bản chốt.
//
// # Vì sao phải có hàm này thay vì dùng thẳng LoadChapterContent
//
// LoadChapterContent CHỈ đọc drafts/{NN}.draft.md, và đó là hợp đồng đúng của nó:
// năm điểm gọi trong internal/tools/ dựa vào nghĩa "có bản nháp hay chưa" để quyết
// định luồng — rõ nhất là novel_context_builders.go:261 dùng `draftWords > 0`. Cho
// nó ngã về bản chốt sẽ làm mọi chương đã nghiệm thu bị báo là "đang có nháp", tức
// sửa một lỗi hiển thị bằng cách phá logic engine.
//
// Nên chỗ ngã về phải nằm ở đây, tại tầng đọc-để-hiện.
//
// # Lỗi mà nó sửa
//
// Trên MỘT màn hình, bảng chương ghi `● đã nghiệm thu · 2.901 từ` còn tab Bản thảo
// cùng chương ghi "Chưa có bản thảo cho chương này". Đo được: chapters/01.md có
// nội dung trên đĩa mà API trả text rỗng. Chương đã chốt và chương nhập từ nguồn
// ngoài (host/imp ghi thẳng vào chapters/) không có tệp nháp nào cả.
//
// # Vì sao trả kèm nguồn
//
// Ngã về mà không nói là đổi một lỗi lấy một lỗi khác: giao diện đang gắn nhãn
// "Bản thảo", nên trả bản chốt dưới nhãn đó là hết rỗng nhưng thành gọi sai tên.
// Trường source để giao diện phân biệt được, và bỏ trống khi không có nội dung nào.
func noiDungChuong(st *store.Store, n int) (text string, words int, nguon string, err error) {
	if text, words, err = st.Drafts.LoadChapterContent(n); err != nil {
		return "", 0, "", err
	}
	if text != "" {
		return text, words, NguonNhap, nil
	}
	chot, err := st.Drafts.LoadChapterText(n)
	if err != nil {
		return "", 0, "", err
	}
	if chot == "" {
		return "", 0, "", nil
	}
	return chot, domain.WordCount(chot), NguonChot, nil
}

func (s *server) handleChapter(w http.ResponseWriter, r *http.Request) {
	st, err := s.openBook(r.PathValue("book"))
	if err != nil {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	n, err := strconv.Atoi(r.PathValue("n"))
	if err != nil || n <= 0 {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("số chương không hợp lệ"))
		return
	}

	text, words, nguon, err := noiDungChuong(st, n)
	if err != nil {
		writeErr(w, http.StatusNotFound, fmt.Errorf("chương %d chưa có nội dung", n))
		return
	}
	out := struct {
		Chapter  int       `json:"chapter"`
		Title    string    `json:"title,omitempty"`
		Words    int       `json:"words"`
		Text     string    `json:"text"`
		Source   string    `json:"source,omitempty"`
		Contract *Contract `json:"contract,omitempty"`
		Review   *Review   `json:"review,omitempty"`
	}{Chapter: n, Title: chapterTitle(st, n), Words: words, Text: text, Source: nguon}

	if sel := buildSelection(st, n); sel != nil {
		out.Contract, out.Review = sel.Contract, sel.Review
	}
	writeJSON(w, out)
}

func (s *server) handleOutline(w http.ResponseWriter, r *http.Request) {
	st, err := s.openBook(r.PathValue("book"))
	if err != nil {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	volumes, _ := st.Outline.LoadLayeredOutline()
	flat, _ := st.Outline.LoadOutline()
	premise, _ := st.Outline.LoadPremise()
	writeJSON(w, map[string]any{
		"premise": premise,
		"volumes": volumes,
		"flat":    flat,
	})
}

func (s *server) handleCast(w http.ResponseWriter, r *http.Request) {
	st, err := s.openBook(r.PathValue("book"))
	if err != nil {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	chars, _ := st.Characters.Load()
	snapshots, _ := st.Characters.LoadLatestSnapshots()
	writeJSON(w, map[string]any{
		"characters": chars,
		"snapshots":  snapshots,
	})
}

func (s *server) handleWorld(w http.ResponseWriter, r *http.Request) {
	st, err := s.openBook(r.PathValue("book"))
	if err != nil {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	rules, _ := st.World.LoadWorldRules()
	foreshadow, _ := st.World.LoadForeshadowLedger()
	relations, _ := st.World.LoadRelationships()
	writeJSON(w, map[string]any{
		"rules":      rules,
		"foreshadow": foreshadow,
		"relations":  relations,
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	// Store là dữ liệu sống; bộ nhớ đệm của trình duyệt sẽ khiến giao diện hiện
	// tiến độ cũ sau khi tải lại trang.
	w.Header().Set("Cache-Control", "no-store")
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false) // giữ nguyên dấu tiếng Việt, không thoát thành \u
	if err := enc.Encode(v); err != nil {
		// Header đã gửi rồi nên không đổi được mã trạng thái; chỉ ghi log.
		fmt.Fprintf(os.Stderr, "serve: ghi JSON thất bại: %v\n", err)
	}
}

func writeErr(w http.ResponseWriter, code int, err error) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(map[string]string{"error": err.Error()})
}
