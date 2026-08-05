# ── tầng 1: giao diện web studio ──────────────────────────────────────
#
# `$BUILDPLATFORM` chứ không phải nền tảng đích, và đó là một phép tiết kiệm có
# lý do: đầu ra của `next build` là HTML/JS/CSS tĩnh — không có nhị phân nào —
# nên nó GIỐNG NHAU cho amd64 và arm64. Chạy tầng này trên nền tảng của máy
# build là dựng MỘT lần cho mọi kiến trúc, và không phải giả lập qemu.
#
# `node:22` (Debian) chứ không `node:22-alpine`: `next build` gọi các nhị phân
# native của SWC, và trên alpine chúng phải là biến thể musl. Bản Debian bỏ hẳn
# lớp rủi ro đó, còn image cuối vẫn là alpine vì tầng này chỉ đóng góp tệp tĩnh.
FROM --platform=$BUILDPLATFORM node:22 AS web

WORKDIR /web

# Hai tệp khai phụ thuộc đi TRƯỚC mã nguồn: chúng đổi hiếm hơn `.tsx` rất nhiều,
# nên tầng `npm ci` bên dưới được dùng lại ở mọi lần build chỉ sửa giao diện.
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# ── tầng 2: nhị phân Go ───────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM golang:1.25 AS builder

WORKDIR /src

ENV CGO_ENABLED=0 GOWORK=off

ARG TARGETOS
ARG TARGETARCH

COPY go.mod go.sum ./

# `third_party` phải có mặt TRƯỚC `go mod download`, và đây là một lỗi đã đo được
# chứ không phải phòng ngừa: `go.mod` mang
# `replace github.com/voocel/litellm => ./third_party/litellm`, nên `go mod
# download` đi phân giải một module nằm trên ĐĨA. Thiếu thư mục đó thì nó thoát
# với mã 1 và cả `docker build` chết ở tầng này.
#
# Lỗi có từ lúc chỉ thị `replace` được thêm vào — đã dựng lại Dockerfile của
# `main` để xác nhận, và nó chết ở đúng dòng này.
#
# Vẫn tách khỏi `COPY . .` bên dưới: hai tệp khai phụ thuộc cộng một module vendor
# đổi hiếm hơn mã nguồn nhiều, nên tầng `go mod download` còn được dùng lại ở mọi
# lần build chỉ sửa mã Go.
COPY third_party ./third_party
RUN go mod download

COPY . .

RUN GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" \
    -o /out/ainovel-cli \
    ./cmd/ainovel-cli

# ── tầng 3: image chạy ────────────────────────────────────────────────
FROM alpine:3.22

RUN apk add --no-cache \
    ca-certificates \
    tzdata

WORKDIR /workspace

COPY --from=builder /out/ainovel-cli /usr/local/bin/ainovel-cli

# Giao diện KHÔNG nằm trong `/workspace`, và đó là điều kiện đúng-sai chứ không
# phải chuyện gọn: `/workspace` là chỗ người dùng mount thư mục tác phẩm của họ
# (`-v $PWD/output:/workspace`), nên một `web/` đặt ở đó sẽ bị chính volume ấy
# che đi và giao diện biến mất mà không có gì nói vì sao.
#
# Nhị phân đọc thư mục này từ ĐĨA ở từng lượt yêu cầu (`http.Dir` trong
# `internal/serve/serve.go`), không nhúng vào binary. Nên nó phải có mặt trong
# image, và nó được truyền vào bằng `--web` — xem README, mục Docker.
COPY --from=web /web/out /usr/local/share/ainovel-cli/web

ENTRYPOINT ["ainovel-cli"]
