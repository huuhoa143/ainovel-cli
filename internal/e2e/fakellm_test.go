// Package e2e chạy engine thật đầu-cuối ở locale tiếng Việt, với LLM giả đặt ở
// ĐÚNG ranh giới HTTP của provider.
//
// # Vì sao đặt LLM giả ở tầng HTTP chứ không stub ChatModel
//
// Cách rẻ hơn là tự dựng một agentcore.ChatModel giả rồi nhồi vào engine — đó là
// cách internal/host/engine_test.go làm. Nhưng engine là kiểu không xuất
// (host.engine), nên ngoài package host không ai dựng được nó; và quan trọng hơn,
// stub ở tầng ChatModel sẽ bỏ qua toàn bộ phần đắt nhất của đường chạy thật:
// bootstrap.NewModelSet, litellm, agents.BuildWorkers (system prompt THẬT lấy từ
// assets đã việt hóa), ctxpack, StopGuard, usage tracker, observer.
//
// Đặt server giả ở base_url thì host.New → engine → worker → tool → store → export
// đều là mã sản xuất, chỉ đúng một thứ là giả: chữ mà mô hình trả về. Nhờ vậy test
// này kiểm được cả những thứ không test nào khác trong repo kiểm: system prompt
// writer đến tay mô hình có thật là tiếng Việt không, task điều phối
// ("Viết chương 3") có khớp với cái Route sinh ra không.
//
// # Phần LLM giả KHÔNG mô phỏng được (nói rõ để không ai đọc test này thành bảo chứng)
//
//   - Chất lượng văn: văn mẫu ở đây do người viết, không phải mô hình sinh. Test
//     chứng minh ĐƯỜNG ỐNG đúng, không chứng minh mô hình viết hay.
//   - Việc mô hình có TUÂN prompt tiếng Việt không: server giả luôn trả tiếng Việt
//     vì ta bảo nó thế. Chỉ khóa API thật trả lời được câu đó (xem docs/audit/e2e-report.md).
//   - Đường phi-happy-path của provider: rate limit, refusal, cắt giữa stream.
package e2e

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// ── Giao thức dây (OpenAI-compatible, đúng phần litellm/provider/compat đọc) ──

type wireRequest struct {
	Model    string        `json:"model"`
	Messages []wireMessage `json:"messages"`
	Tools    []wireTool    `json:"tools"`
	Stream   bool          `json:"stream"`
}

type wireMessage struct {
	Role       string          `json:"role"`
	Content    json.RawMessage `json:"content"`
	ToolCallID string          `json:"tool_call_id"`
}

type wireTool struct {
	Function struct {
		Name string `json:"name"`
	} `json:"function"`
}

// text lấy phần chữ của một message, chịu cả dạng chuỗi và dạng mảng block.
func (m wireMessage) text() string {
	if len(m.Content) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(m.Content, &s); err == nil {
		return s
	}
	var parts []map[string]any
	if err := json.Unmarshal(m.Content, &parts); err != nil {
		return string(m.Content)
	}
	var b strings.Builder
	for _, p := range parts {
		if t, ok := p["text"].(string); ok {
			b.WriteString(t)
		}
	}
	return b.String()
}

// ── Yêu cầu đã bóc tách, dạng mà script của test nhìn thấy ──

// call là một lượt gọi mô hình đã được bóc tách. Giữ nguyên văn system prompt và
// task để test khẳng định trực tiếp trên chúng — đây chính là chữ mà một mô hình
// thật sẽ đọc.
type call struct {
	Role        string   // writer / editor / architect / arbiter (suy ra từ bộ tool)
	System      string   // system prompt THẬT do assets sinh
	LastUser    string   // task do Engine/Route phái xuống
	ToolResults int      // số message role=tool đã có → dùng để biết đang ở bước nào
	ToolNames   []string // các tool được chào trong lượt này
	Texts       []string // toàn bộ chữ của mọi message (dùng để soi ngữ cảnh đã tiêm)
}

// reply là câu trả lời script muốn server giả phát ra.
type reply struct {
	Text     string // trả chữ thuần (finish_reason=stop)
	ToolName string // hoặc gọi tool (finish_reason=tool_calls)
	ToolArgs any
}

func textReply(s string) reply { return reply{Text: s} }

func toolReply(name string, args any) reply { return reply{ToolName: name, ToolArgs: args} }

// ── Server giả ──

// fakeLLM là một endpoint OpenAI-compatible tối thiểu nhưng đủ thật: nó phục vụ
// cả nhánh non-stream và nhánh SSE, vì agentcore dùng cả hai (worker chạy stream,
// arbiter chạy generate).
type fakeLLM struct {
	t      *testing.T
	script func(call) reply

	mu    sync.Mutex
	calls []call
	srv   *httptest.Server
}

func newFakeLLM(t *testing.T, script func(call) reply) *fakeLLM {
	t.Helper()
	f := &fakeLLM{t: t, script: script}
	mux := http.NewServeMux()
	mux.HandleFunc("/", f.handle)
	f.srv = httptest.NewServer(mux)
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fakeLLM) baseURL() string { return f.srv.URL + "/v1" }

// Calls trả bản chụp mọi lượt gọi đã nhận (để test khẳng định trên prompt thật).
func (f *fakeLLM) Calls() []call {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]call(nil), f.calls...)
}

func (f *fakeLLM) handle(w http.ResponseWriter, r *http.Request) {
	if strings.HasSuffix(r.URL.Path, "/models") {
		_, _ = w.Write([]byte(`{"data":[{"id":"fake-vi"}]}`))
		return
	}
	if !strings.HasSuffix(r.URL.Path, "/chat/completions") {
		http.NotFound(w, r)
		return
	}
	var req wireRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	c := parseCall(req)
	f.mu.Lock()
	f.calls = append(f.calls, c)
	f.mu.Unlock()

	rep := f.script(c)
	if req.Stream {
		f.writeSSE(w, rep)
		return
	}
	f.writeJSON(w, rep)
}

// parseCall bóc một wireRequest thành sự thật mà script cần.
//
// Vai được suy ra từ BỘ TOOL thay vì từ chữ trong system prompt: bộ tool là khế
// ước mã (agents/build.go), còn system prompt là chuỗi đã dịch — dựa vào chữ đã
// dịch để nhận vai thì mỗi lần biên tập lại bản dịch là một lần test đỏ oan.
func parseCall(req wireRequest) call {
	c := call{Role: "unknown"}
	names := make([]string, 0, len(req.Tools))
	for _, t := range req.Tools {
		names = append(names, t.Function.Name)
	}
	c.ToolNames = names
	switch {
	case hasTool(names, "commit_chapter"):
		c.Role = "writer"
	case hasTool(names, "save_review"):
		c.Role = "editor"
	case hasTool(names, "save_foundation"):
		c.Role = "architect"
	case len(names) == 0:
		c.Role = "arbiter"
	}
	for _, m := range req.Messages {
		txt := m.text()
		c.Texts = append(c.Texts, txt)
		switch m.Role {
		case "system":
			if c.System == "" {
				c.System = txt
			}
		case "user":
			c.LastUser = txt
		case "tool":
			c.ToolResults++
		}
	}
	return c
}

func hasTool(names []string, want string) bool {
	for _, n := range names {
		if n == want {
			return true
		}
	}
	return false
}

// ── Kết xuất phản hồi ──

func (f *fakeLLM) writeJSON(w http.ResponseWriter, rep reply) {
	msg := map[string]any{"role": "assistant"}
	finish := "stop"
	if rep.ToolName != "" {
		args, err := json.Marshal(rep.ToolArgs)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		msg["tool_calls"] = []map[string]any{{
			"id":       "call_" + rep.ToolName,
			"type":     "function",
			"function": map[string]string{"name": rep.ToolName, "arguments": string(args)},
		}}
		finish = "tool_calls"
	} else {
		msg["content"] = rep.Text
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"id":      "cmpl-fake",
		"object":  "chat.completion",
		"model":   "fake-vi",
		"choices": []map[string]any{{"index": 0, "message": msg, "finish_reason": finish}},
		"usage":   map[string]int{"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20},
	})
}

func (f *fakeLLM) writeSSE(w http.ResponseWriter, rep reply) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.WriteHeader(http.StatusOK)
	flusher, _ := w.(http.Flusher)
	send := func(payload any) {
		b, err := json.Marshal(payload)
		if err != nil {
			f.t.Errorf("fakeLLM: marshal chunk: %v", err)
			return
		}
		fmt.Fprintf(w, "data: %s\n\n", b)
		if flusher != nil {
			flusher.Flush()
		}
	}

	chunk := func(delta any, finish any) map[string]any {
		ch := map[string]any{"index": 0, "delta": delta}
		if finish != nil {
			ch["finish_reason"] = finish
		}
		return map[string]any{"id": "cmpl-fake", "model": "fake-vi", "choices": []any{ch}}
	}

	if rep.ToolName != "" {
		args, err := json.Marshal(rep.ToolArgs)
		if err != nil {
			f.t.Errorf("fakeLLM: marshal tool args: %v", err)
			return
		}
		send(chunk(map[string]any{"tool_calls": []map[string]any{{
			"index":    0,
			"id":       "call_" + rep.ToolName,
			"type":     "function",
			"function": map[string]string{"name": rep.ToolName, "arguments": string(args)},
		}}}, nil))
		send(chunk(map[string]any{}, "tool_calls"))
	} else {
		// Cắt chữ thành nhiều delta: đường stream thật không bao giờ gửi trọn
		// một chương trong một chunk, và observer/ctxpack chạy trên delta.
		for _, part := range splitForStream(rep.Text, 200) {
			send(chunk(map[string]any{"content": part}, nil))
		}
		send(chunk(map[string]any{}, "stop"))
	}
	send(map[string]any{
		"id": "cmpl-fake", "model": "fake-vi", "choices": []any{},
		"usage": map[string]int{"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20},
	})
	fmt.Fprint(w, "data: [DONE]\n\n")
	if flusher != nil {
		flusher.Flush()
	}
}

// splitForStream cắt theo rune để không xé đôi ký tự UTF-8 (tiếng Việt nhiều
// rune 2-3 byte; cắt theo byte là ra tofu).
func splitForStream(s string, size int) []string {
	if s == "" {
		return nil
	}
	runes := []rune(s)
	var out []string
	for i := 0; i < len(runes); i += size {
		end := min(i+size, len(runes))
		out = append(out, string(runes[i:end]))
	}
	return out
}
