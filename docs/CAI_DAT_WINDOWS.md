# Cài đặt trên Windows cho người mới

## Cách nhanh nhất

Mở PowerShell và dán đúng một lệnh này:

```powershell
irm https://raw.githubusercontent.com/ninhneec/locket/main/scripts/setup-windows.ps1 | iex
```

Source sẽ được tải vào thư mục `locket` tại vị trí PowerShell hiện tại.

## Nếu đã tải source về máy

1. Tải source code và giải nén.
2. Mở thư mục source, bấm vào thanh địa chỉ của File Explorer, nhập `powershell` rồi Enter.
3. Chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

Script sẽ tự kiểm tra Node.js, cài thư viện, tạo cấu hình local và build dự án.

## Nhập cấu hình riêng

- Mở `.env.local`, nhập `JAYDEV_API_KEY` và `XAH_API_KEY` của bạn.
- Mở `config\telegram.local.json`, nhập `botToken`, `chatId`, rồi đổi `enabled` thành `true`.
- Hai file này đã bị Git bỏ qua nên không đi theo source khi chia sẻ.

## Chạy ứng dụng

```powershell
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173).

Để mở từ điện thoại hoặc máy khác cùng Wi-Fi, chạy `ipconfig`, tìm dòng `IPv4 Address`, rồi truy cập `http://IP_CUA_MAY:5173`. Nếu Windows hỏi quyền Firewall, chọn **Allow access** cho mạng riêng.

## Kiểm tra Telegram

Khi ứng dụng đang chạy, mở PowerShell khác:

```powershell
Invoke-RestMethod -Method Post http://localhost:8787/api/telegram/test
```

Nếu bot chưa gửi được tin, kiểm tra token, chat ID và chắc chắn bạn đã nhắn `/start` cho bot.

Kiểm tra trạng thái mà không làm lộ token:

```powershell
Invoke-RestMethod http://localhost:8787/api/telegram/status
```

Kết quả đúng sau khi cấu hình là `enabled: true`, `configured: true`, `ready: true`.
