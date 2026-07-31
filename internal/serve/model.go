package serve

// Hợp đồng JSON giữa engine và web studio.
//
// Khóa dùng tiếng Anh: đây là hợp đồng máy–máy. Mọi trạng thái trả về dưới dạng
// mã enum, không phải chữ hiển thị — chữ tiếng Việt thuộc về giao diện, để đổi
// từ ngữ không phải sửa server và để cùng payload dùng được cho nhiều bề mặt.
//
// Nguyên tắc bao trùm: KHÔNG BỊA. Trường nào store không có dữ liệu thì để
// nil/omitempty và khai báo trong Capabilities, để giao diện tự biết cột nào
// không nên vẽ. Trả về một con số trông hợp lý mà không có nguồn còn tệ hơn
// trả về trống, vì người vận hành sẽ tin nó.

// Capabilities cho giao diện biết dữ liệu nào thật sự tồn tại trong store của
// bản này. Bản mockup thiết kế ban đầu có cột chi phí theo chương; store chỉ
// cộng chi phí theo agent và theo model (domain.UsageState), không theo chương,
// nên cột đó không có nguồn và bị khai báo false ở đây.
type Capabilities struct {
	PerChapterDuration bool `json:"per_chapter_duration"`
	PerChapterCost     bool `json:"per_chapter_cost"`
	LayeredOutline     bool `json:"layered_outline"`
	Steer              bool `json:"steer"`
}

// Book là một tác phẩm trong xưởng, dùng cho bộ chọn ở thanh trên.
type Book struct {
	ID        string `json:"id"`   // tên thư mục, dùng làm khóa trong URL
	Name      string `json:"name"` // tên tác phẩm; rỗng khi chưa đặt
	Phase     string `json:"phase"`
	Flow      string `json:"flow,omitempty"`
	Done      int    `json:"completed_chapters"`
	Total     int    `json:"total_chapters"`
	Words     int    `json:"total_words"`
	Activity  string `json:"activity"` // running | idle | complete
	UpdatedAt string `json:"updated_at,omitempty"`
}

// Workshop là toàn cảnh xưởng: mọi tác phẩm tìm thấy dưới thư mục gốc.
type Workshop struct {
	Root  string `json:"root"`
	Books []Book `json:"books"`
}

// LaneBlock là một khối trên trục sản xuất (tập hoặc cung).
type LaneBlock struct {
	Index int    `json:"index"`
	Title string `json:"title,omitempty"`
	// State: done | running | planned | unplanned
	//   planned   = đã có cấu trúc chi tiết, chưa chạy tới
	//   unplanned = mới là bộ khung, Architect sẽ mở khi tới lượt
	// Hai trạng thái này khác nhau về bản chất trong mô hình cuốn-vòng-cung hai
	// tầng, nên giao diện vẽ chúng khác nhau (đặc/sọc chéo).
	State string `json:"state"`
	// Chapters là số chương thật khi đã mở, hoặc số dự kiến khi còn là bộ khung.
	// 0 nghĩa là CHƯA BIẾT — tập chưa mở thì chưa có cung nào nên không có cả số
	// dự kiến. Giao diện phải vẽ khối đó bằng độ rộng mặc định, không nhân với 0
	// (khối sẽ biến mất khỏi trục).
	Chapters  int  `json:"chapters"`
	Estimated bool `json:"estimated,omitempty"` // true khi Chapters là số dự kiến
	Final     bool `json:"final,omitempty"`     // tập收官
	From      int  `json:"from,omitempty"`      // chương đầu, chỉ khi đã mở
	To        int  `json:"to,omitempty"`
}

// ChapterMark là trạng thái một chương trên lane chương (1 vạch = 1 chương).
type ChapterMark struct {
	Chapter int    `json:"chapter"`
	State   string `json:"state"` // done | running | rewrite | gate | pending
}

// Timeline là dữ liệu cho trục sản xuất ba tầng.
type Timeline struct {
	Volumes  []LaneBlock   `json:"volumes"`
	Arcs     []LaneBlock   `json:"arcs"` // các cung trong tập hiện tại
	Chapters []ChapterMark `json:"chapters"`
}

// ChapterRow là một hàng trong bảng chương.
type ChapterRow struct {
	Chapter int    `json:"chapter"`
	Title   string `json:"title,omitempty"`
	// Stage: done | drafting | rewrite | pending
	Stage string `json:"stage"`
	Words int    `json:"words,omitempty"`
	// DurationMs nil = không đo được (chương chỉ có một checkpoint, hoặc chưa
	// chạy). Không dùng 0 cho "không biết": 0 nghĩa là xong tức thời.
	DurationMs *int64 `json:"duration_ms,omitempty"`
	// Owner là các vai đã tham gia chu kỳ gần nhất, suy ra từ bước checkpoint.
	Owner []string `json:"owner,omitempty"`
}

// Dimension là một chiều trong bản duyệt của Editor.
type Dimension struct {
	Name string `json:"name"`
	// Con trỏ, không phải int: điểm 0 và điểm VẮNG là hai chuyện khác nhau. 0/100
	// là điểm Editor thật sự chấm — điểm tệ nhất có thể — còn vắng là chiều không
	// được chấm.
	//
	// `int` cộng `omitempty` gộp hai chuyện đó lại: 0 là zero-value nên omitempty
	// bỏ luôn khóa, và client nhận đúng thứ mà một chiều chưa chấm nhận được. Đo
	// được trên bản mẫu: chiều foreshadow chấm 0 ra JSON KHÔNG có khóa "score",
	// trong khi các chiều cùng bản duyệt có "score": 88 bình thường.
	//
	// Đáng ghi lại vì phía web ĐÃ phòng đúng ca này (`d.score != null` trong
	// BanDuyet.tsx, kèm comment giải thích) nhưng phòng vô ích: server đã làm rụng
	// dữ liệu trước khi tới client. Một lớp phòng ở đúng chỗ vẫn không cứu được khi
	// tầng dưới đã mất thông tin.
	//
	// Bỏ omitempty là đủ, không cần con trỏ: domain.DimensionScore.Score là `int`
	// với thẻ `json:"score"` không omitempty, nên store LUÔN có một con số. "Vắng"
	// không phải trạng thái biểu diễn được ở tầng dưới, nên dựng con trỏ ở đây chỉ
	// là máy móc dư cho một ca không tồn tại.
	Score   int    `json:"score"`
	Verdict string `json:"verdict,omitempty"`
	Comment string `json:"comment,omitempty"`
}

// Issue là một vấn đề Editor nêu, kèm dẫn chứng.
type Issue struct {
	Type        string `json:"type"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
	Evidence    string `json:"evidence,omitempty"`
	Suggestion  string `json:"suggestion,omitempty"`
	Chapters    []int  `json:"chapters,omitempty"`
	NeedsChange bool   `json:"needs_change"`
}

// Review là bản duyệt của Editor cho một chương hoặc một cung.
type Review struct {
	Chapter        int         `json:"chapter"`
	Scope          string      `json:"scope"`
	Verdict        string      `json:"verdict"`
	Summary        string      `json:"summary,omitempty"`
	Dimensions     []Dimension `json:"dimensions,omitempty"`
	Issues         []Issue     `json:"issues,omitempty"`
	ContractStatus string      `json:"contract_status,omitempty"`
	ContractMisses []string    `json:"contract_misses,omitempty"`
}

// Contract là yêu cầu đặt ra cho một chương, do Writer lập ở bước plan.
type Contract struct {
	Chapter   int      `json:"chapter"`
	Title     string   `json:"title,omitempty"`
	CoreEvent string   `json:"core_event,omitempty"`
	Hook      string   `json:"hook,omitempty"`
	Scenes    []string `json:"scenes,omitempty"`
}

// Decision là một phán quyết của Arbiter đã落盘.
type Decision struct {
	ID         string `json:"id"`
	At         string `json:"at"`
	Kind       string `json:"kind"`
	Decider    string `json:"decider"`
	Reason     string `json:"reason,omitempty"`
	Input      string `json:"input,omitempty"`
	Model      string `json:"model,omitempty"`
	DurationMs int64  `json:"duration_ms,omitempty"`
	Error      string `json:"error,omitempty"`
	// Decision là quyết định thô dạng JSON, giữ nguyên để giao diện có thể mở
	// ra xem — đây là phần "replay được" của nhật ký phán quyết.
	Decision any `json:"decision,omitempty"`
}

// Transport là dải trạng thái luôn hiện ở đáy giao diện.
type Transport struct {
	// State: running | idle | complete
	State string `json:"state"`
	// LastStep là công đoạn vừa HOÀN THÀNH, không phải công đoạn đang chạy.
	// Store chỉ ghi checkpoint khi một bước thành công, nên đây là tất cả những
	// gì suy được từ trạng thái tĩnh. Tên field nói đúng điều đó: gọi nó là
	// "step" từng làm giao diện hiện "commit" trong khi engine đang draft chương
	// kế tiếp. Công đoạn đang chạy chỉ có trong dòng sự kiện (SSE), và giao diện
	// phải ghi đè bằng dữ liệu đó ngay khi nhận được sự kiện đầu tiên.
	LastStep string  `json:"last_step,omitempty"`
	Agent    string  `json:"agent,omitempty"`
	Model    string  `json:"model,omitempty"`
	CostUSD  float64 `json:"cost_usd"`
	// CostPerChapter là tổng chi phí chia số chương đã xong — con số này CÓ
	// nguồn thật, khác với chi phí theo từng chương.
	CostPerChapter *float64 `json:"cost_per_chapter,omitempty"`
	// ChaptersPerHour nil khi phiên quá ngắn để con số có nghĩa.
	ChaptersPerHour *float64 `json:"chapters_per_hour,omitempty"`
	ElapsedMs       *int64   `json:"elapsed_ms,omitempty"`
}

// Snapshot là toàn bộ dữ liệu cho một lần tải bề mặt studio.
type Snapshot struct {
	Book         Book         `json:"book"`
	Capabilities Capabilities `json:"capabilities"`
	Timeline     Timeline     `json:"timeline"`
	Chapters     []ChapterRow `json:"chapters"`
	Transport    Transport    `json:"transport"`
	Decisions    []Decision   `json:"decisions,omitempty"`
	Selected     *Selection   `json:"selected,omitempty"`
	// Warnings là kết quả kiểm tra nhất quán nông của store. Hiện ra thay vì
	// nuốt đi: dữ liệu lệch là tin vận hành, không phải chi tiết nội bộ.
	Warnings []string `json:"warnings,omitempty"`
	// QueueSeq là số thứ tự sự kiện mới nhất lúc chụp snapshot. Giao diện dùng
	// nó làm điểm bắt đầu cho SSE để không bỏ sót và không nhận trùng sự kiện
	// phát ra giữa lúc tải trang và lúc mở stream.
	QueueSeq int64 `json:"queue_seq"`
}

// Selection là chi tiết của chương đang được chọn, cho panel inspector.
type Selection struct {
	Chapter  int       `json:"chapter"`
	Title    string    `json:"title,omitempty"`
	Contract *Contract `json:"contract,omitempty"`
	Review   *Review   `json:"review,omitempty"`
	Excerpt  string    `json:"excerpt,omitempty"`
	Words    int       `json:"words,omitempty"`
}
