# JayDev CTV Portal & AI Image Lab

Trang quản lý CTV JayDev bằng tiếng Việt, hỗ trợ kiểm tra credit, tra cứu/kích hoạt Locket Gold và thử nghiệm nhiều model ảnh cùng lúc.

> [Tài liệu kết nối API JayDev bằng tiếng Việt](https://locket.jayteam.click/capapi)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fninhneec%2Flocket)

## Tính năng chính

- Dashboard theo dõi credit và khách hàng JayDev.
- Tra cứu username và kích hoạt Locket Gold.
- AI Image Lab dùng chung một ảnh và prompt cho nhiều model.
- Đo tốc độ upload, xử lý, trả ảnh và tổng thời gian.
- Log riêng cho từng model để tìm bên lỗi.
- Telegram bot tách thành module và cấu hình riêng.
- API key/token chỉ nằm ở server, không đóng gói vào frontend.
- Chạy được trên máy cá nhân, mạng LAN, VPS và Vercel.

## Cài nhanh cho người mới

### Windows

```powershell
irm https://raw.githubusercontent.com/ninhneec/locket/main/scripts/setup-windows.ps1 | iex
```

[Hướng dẫn Windows từng bước](docs/CAI_DAT_WINDOWS.md)

### VPS Linux Ubuntu/Debian

```bash
curl -fsSL https://raw.githubusercontent.com/ninhneec/locket/main/scripts/setup-linux.sh | bash
```

[Hướng dẫn VPS Linux từng bước](docs/CAI_DAT_VPS_LINUX.md)

## Chạy thủ công

Yêu cầu Node.js 20 trở lên.

```powershell
npm install
Copy-Item .env.example .env.local
Copy-Item config\telegram.example.json config\telegram.local.json
npm run dev
```

- Trên máy đang chạy: [http://localhost:5173](http://localhost:5173)
- Máy khác cùng mạng: `http://IP_MAY_CHAY:5173`
- API production/VPS: `http://IP_MAY_CHAY:8787`

## Cấu hình JayDev và Image Lab

Mở `.env.local` và nhập key của riêng bạn:

```env
HOST=0.0.0.0
PORT=8787
JAYDEV_API_BASE_URL=https://locket.jayteam.click
JAYDEV_API_KEY=
JAYDEV_AUTH_MODE=x-api-key
JAYDEV_STATS_PATH=/api/v1/credits
JAYDEV_CUSTOMERS_PATH=/api/v1/ctv/customers
JAYDEV_ACTIVATE_PATH=/api/v1/dns/export
JAYDEV_LOOKUP_PATH=/api/v1/dns/lookup
XAH_API_KEY=
```

Nếu chưa có `JAYDEV_API_KEY`, ứng dụng dùng dữ liệu demo và không gửi kích hoạt thật.

Đường dẫn JayDev tiếng Việt:

- [Tài liệu API JayDev tiếng Việt](https://locket.jayteam.click/capapi)
- [Trang API JayDev](https://locket.jayteam.click)

## Cấu hình Telegram bot

Mở `config/telegram.local.json`:

```json
{
  "enabled": true,
  "botToken": "TOKEN_BOT_CUA_BAN",
  "chatId": "CHAT_ID_CUA_BAN",
  "parseMode": "HTML"
}
```

Gửi `/start` cho bot trước, sau đó kiểm tra:

```bash
curl http://localhost:8787/api/telegram/status
curl -X POST http://localhost:8787/api/telegram/test
```

Cấu hình đúng sẽ có `enabled`, `configured` và `ready` đều bằng `true`.

## Deploy Vercel

Repo đã có sẵn `vercel.json` và Express Function. Cách đơn giản nhất:

1. Mở [vercel.com/new](https://vercel.com/new).
2. Import repo `ninhneec/locket`.
3. Thêm các biến trong `.env.example` tại **Project Settings → Environment Variables**.
4. Bấm **Deploy**.

Hoặc bấm nút **Deploy with Vercel** ở đầu README. Xem [hướng dẫn Vercel bằng tiếng Việt](docs/DEPLOY_VERCEL.md) nếu bạn chưa deploy lần nào.

Không đưa `.env.local` hoặc `config/telegram.local.json` lên Vercel. Với Telegram, dùng các biến `TELEGRAM_ENABLED`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Chạy production/VPS

```bash
npm run build
npm start
```

Server mặc định nghe trên `0.0.0.0:8787`. Nếu không truy cập được từ ngoài, mở cổng 8787 trong firewall/security group hoặc dùng Nginx reverse proxy.

## Kiểm tra code

```bash
npm run typecheck
npm run build
```

## Bảo mật khi chia sẻ source

Không commit hoặc gửi công khai:

- `.env.local`
- `config/telegram.local.json`

Hai file đã nằm trong `.gitignore`. Repo chỉ chứa file mẫu không có key thật.

## Liên kết

- [Source GitHub](https://github.com/ninhneec/locket)
- [JayDev API – tài liệu tiếng Việt](https://locket.jayteam.click/capapi)
- [Hướng dẫn Express trên Vercel](https://vercel.com/docs/frameworks/backend/express)
