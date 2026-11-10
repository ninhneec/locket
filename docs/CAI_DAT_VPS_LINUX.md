# Cài đặt trên VPS Linux cho người mới

Hướng dẫn phù hợp Ubuntu/Debian. Đăng nhập VPS bằng SSH rồi vào thư mục source code.

## Cài nhanh

Chạy một lệnh ở bất kỳ thư mục trống nào:

```bash
curl -fsSL https://raw.githubusercontent.com/ninhneec/locket/main/scripts/setup-linux.sh | bash
```

Source sẽ được clone vào thư mục `locket`.

## Nếu source đã có trên VPS

```bash
chmod +x scripts/setup-linux.sh
bash scripts/setup-linux.sh
```

Script sẽ cài Node.js nếu thiếu, cài thư viện, tạo cấu hình local và build dự án.

## Nhập cấu hình riêng

```bash
nano .env.local
nano config/telegram.local.json
```

Trong cấu hình Telegram, nhập `botToken`, `chatId` và đổi `enabled` thành `true`. Lưu trong nano bằng `Ctrl+O`, Enter, rồi thoát bằng `Ctrl+X`.

## Chạy thử

```bash
npm start
```

Từ máy của bạn truy cập `http://IP_VPS:8787`. Nếu không vào được, mở cổng 8787 trong firewall của VPS hoặc dùng Nginx reverse proxy.

## Kiểm tra Telegram

```bash
curl -X POST http://localhost:8787/api/telegram/test
```

Kiểm tra trạng thái mà không làm lộ token:

```bash
curl http://localhost:8787/api/telegram/status
```

Kết quả đúng sau khi cấu hình là `enabled`, `configured` và `ready` đều bằng `true`.

## Chạy nền bằng PM2

```bash
sudo npm install -g pm2
pm2 start dist-server/index.js --name jaydev-portal
pm2 save
pm2 startup
```

Lệnh `pm2 startup` sẽ in ra thêm một lệnh. Sao chép và chạy đúng lệnh đó để ứng dụng tự khởi động lại cùng VPS.
