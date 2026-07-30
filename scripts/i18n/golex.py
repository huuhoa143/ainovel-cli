"""Go source lexer đủ dùng cho việc bóc chuỗi và comment.

Không phải parser đầy đủ — chỉ cần tách chính xác 4 loại token để việt hóa:
comment dòng, comment khối, chuỗi thường ("..." có escape) và chuỗi thô (`...`).
Tách được chúng mới phân biệt nổi "chữ Trung trong comment" (không cần i18n)
với "chữ Trung trong chuỗi hiển thị" (chính là khối lượng công việc thật).
"""

import re

CJK = re.compile(r"[一-鿿]")


def has_cjk(s: str) -> bool:
    return bool(CJK.search(s))


def unescape_go(s):
    """Giải escape của chuỗi Go thường ("...") về giá trị LÚC CHẠY.

    Đây là chỗ từng gây một bug im lặng nghiêm trọng: trước đây hàm tokenize trả
    nguyên văn nguồn, nên `"a\\nb"` trong code cho ra msgid chứa HAI ký tự `\` và
    `n`. Nhưng lúc chạy, i18n.F() nhận chuỗi đã được Go giải escape — một ký tự
    newline thật. Hai thứ đó không bằng nhau, nên 111 msgid trong catalog không
    bao giờ tra được và cứ hiển thị tiếng Trung dù đã dịch xong. Không lỗi, không
    log — chỉ là bản dịch vô hiệu.

    Chỉ áp dụng cho chuỗi thường. Chuỗi thô (`...`) KHÔNG có escape: trong Go,
    dấu \ trong chuỗi thô là dấu \ thật, nên giải escape nó sẽ làm sai lệch.
    """
    out = []
    i = 0
    n = len(s)
    simple = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", '"': '"', "'": "'",
              "a": "\a", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}
    while i < n:
        c = s[i]
        if c != "\\" or i + 1 >= n:
            out.append(c)
            i += 1
            continue
        nxt = s[i + 1]
        if nxt in simple:
            out.append(simple[nxt])
            i += 2
        elif nxt == "x" and i + 3 < n:
            try:
                out.append(chr(int(s[i + 2:i + 4], 16)))
                i += 4
            except ValueError:
                out.append(c)
                i += 1
        elif nxt == "u" and i + 5 < n:
            try:
                out.append(chr(int(s[i + 2:i + 6], 16)))
                i += 6
            except ValueError:
                out.append(c)
                i += 1
        elif nxt == "U" and i + 9 < n:
            try:
                out.append(chr(int(s[i + 2:i + 10], 16)))
                i += 10
            except ValueError:
                out.append(c)
                i += 1
        else:
            # Escape không nhận ra: giữ nguyên cả hai ký tự thay vì đoán, để
            # không âm thầm làm méo msgid.
            out.append(c)
            i += 1
    return "".join(out)


class Token:
    __slots__ = ("kind", "text", "raw", "line", "col", "start", "end")

    def __init__(self, kind, text, line, col, start, end):
        self.kind = kind  # 'line_comment' | 'block_comment' | 'string' | 'raw_string'
        # text = giá trị LÚC CHẠY (đã giải escape với chuỗi thường). Đây là thứ
        # phải dùng làm msgid, vì i18n.F() nhận đúng giá trị này.
        self.raw = text  # nguyên văn trong nguồn, cần khi ghi lại vào file
        self.text = unescape_go(text) if kind == "string" else text
        self.line = line
        self.col = col
        self.start = start  # offset tuyệt đối của dấu mở
        self.end = end  # offset ngay sau dấu đóng

    def __repr__(self):
        return f"<{self.kind} L{self.line} {self.text[:40]!r}>"


def tokenize(src: str):
    """Trả về list Token. Bỏ qua rune literal ('x') và mọi code khác."""
    toks = []
    i = 0
    n = len(src)
    line = 1
    line_start = 0

    while i < n:
        c = src[i]

        if c == "\n":
            line += 1
            i += 1
            line_start = i
            continue

        # comment
        if c == "/" and i + 1 < n:
            nxt = src[i + 1]
            if nxt == "/":
                j = src.find("\n", i)
                if j == -1:
                    j = n
                toks.append(Token("line_comment", src[i + 2 : j], line, i - line_start, i, j))
                i = j
                continue
            if nxt == "*":
                j = src.find("*/", i + 2)
                if j == -1:
                    j = n - 2
                body = src[i + 2 : j]
                toks.append(Token("block_comment", body, line, i - line_start, i, j + 2))
                line += body.count("\n")
                i = j + 2
                continue

        # raw string
        if c == "`":
            j = src.find("`", i + 1)
            if j == -1:
                j = n - 1
            body = src[i + 1 : j]
            toks.append(Token("raw_string", body, line, i - line_start, i, j + 1))
            line += body.count("\n")
            i = j + 1
            continue

        # interpreted string
        if c == '"':
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == '"' or src[j] == "\n":
                    break
                j += 1
            toks.append(Token("string", src[i + 1 : j], line, i - line_start, i, j + 1))
            i = j + 1
            continue

        # rune literal — bỏ qua để dấu ' không phá bộ đếm
        if c == "'":
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == "'" or src[j] == "\n":
                    break
                j += 1
            i = j + 1
            continue

        i += 1

    return toks


def strings_with_cjk(src: str):
    """Chỉ các chuỗi (thường + thô) có chữ Trung — đây là khối lượng i18n thật."""
    return [t for t in tokenize(src) if t.kind in ("string", "raw_string") and has_cjk(t.text)]


def comments_with_cjk(src: str):
    return [t for t in tokenize(src) if t.kind in ("line_comment", "block_comment") and has_cjk(t.text)]
