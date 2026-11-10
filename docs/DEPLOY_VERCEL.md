# Deploy lên Vercel cho người mới

## Cách nhanh nhất

Bấm nút sau và đăng nhập Vercel bằng GitHub:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fninhneec%2Flocket)

Vercel sẽ tạo một bản sao repo và nhận cấu hình từ `vercel.json`.

## Thêm biến môi trường

Trong Vercel, mở **Project → Settings → Environment Variables** rồi thêm:

```text
JAYDEV_API_BASE_URL=https://locket.jayteam.click
JAYDEV_API_KEY=key_của_bạn
JAYDEV_AUTH_MODE=x-api-key
JAYDEV_STATS_PATH=/api/v1/credits
JAYDEV_CUSTOMERS_PATH=/api/v1/ctv/customers
JAYDEV_ACTIVATE_PATH=/api/v1/dns/export
JAYDEV_LOOKUP_PATH=/api/v1/dns/lookup
XAH_API_KEY=key_của_bạn
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=token_bot_của_bạn
TELEGRAM_CHAT_ID=chat_id_của_bạn
```

Không cần thêm `HOST` hoặc `PORT` trên Vercel. Nếu chưa dùng Telegram, đặt `TELEGRAM_ENABLED=false` và bỏ trống hai biến Telegram còn lại.

Sau khi lưu biến môi trường, vào **Deployments**, mở deployment mới nhất và chọn **Redeploy**.

## Kiểm tra sau khi deploy

Thay `TEN-DU-AN.vercel.app` bằng domain Vercel của bạn:

```text
https://TEN-DU-AN.vercel.app
https://TEN-DU-AN.vercel.app/api/telegram/status
```

Trang chủ phải mở được và endpoint trạng thái Telegram phải trả JSON.

## Lưu ý

- Không upload `.env.local` hoặc `config/telegram.local.json` lên Vercel.
- Ảnh base64 lớn chịu giới hạn request của Vercel; nếu ảnh quá lớn hãy giảm kích thước trước khi gửi.
- Model xử lý quá lâu có thể chạm giới hạn thời gian Function của gói Vercel đang dùng.
- Tài liệu API JayDev tiếng Việt: [locket.jayteam.click/capapi](https://locket.jayteam.click/capapi).
