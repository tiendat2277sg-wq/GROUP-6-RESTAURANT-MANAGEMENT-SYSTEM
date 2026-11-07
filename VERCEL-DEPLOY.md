# Chuẩn bị triển khai Vercel

Ngày chuẩn bị: 04/11/2026. Chỉ cấu hình và kiểm thử trên máy; chưa đăng nhập, tạo tài nguyên hoặc triển khai lên Vercel.

## Cấu trúc

- `vercel.json`: Vercel Services, frontend Vite và backend Express cùng domain. `/api`, `/socket.io`, `/uploads`, `/health` đi vào backend; các đường dẫn giao diện đi vào frontend.
- Node.js 24; cài dependency theo `package-lock.json`. Không cần Docker.
- Local vẫn dùng các file CMD hiện có và SQL Server Windows Authentication. Cloud dùng SQL authentication, không tự nạp `.env` local, không tự seed/migrate database, không mở cổng hoặc chạy interval khi import.
- Socket.IO dùng WebSocket và Redis pub/sub để truyền sự kiện giữa các instance. Bật Fluid Compute cho project; kết nối có thể reconnect khi instance hết thời gian.
- Upload cloud lưu ở private Vercel Blob. Ảnh được phục vụ qua API; báo cáo chỉ được đọc qua route quản trị có xác thực. Upload báo cáo tối đa 3 MB trên cloud.
- Cron `/api/cron/maintenance` dùng Bearer CRON_SECRET, Redis lock chống chạy trùng, xử lý hết hạn, OTP, nhắc lịch, no-show và kiểm tra thanh toán nếu được cấu hình.

## Những thứ cần chuẩn bị khi bạn triển khai

1. Project Vercel hỗ trợ Services (hiện Beta), Node 24 và Fluid Compute. Root Directory là thư mục `phurai-ui`, không phải riêng `frontend`.
2. SQL Server/Azure SQL có thể truy cập từ Vercel qua TLS; database đã có schema và dữ liệu. Dùng tài khoản ứng dụng riêng, cấu hình firewall phù hợp. SQL Server trên localhost không thể dùng trực tiếp từ Vercel.
3. Redis TCP/TLS hỗ trợ pub/sub (REDIS_URL dạng rediss://); không dùng REST URL/token thay cho Redis URL.
4. Private Blob store liên kết project; BLOB_STORE_ID hoặc BLOB_READ_WRITE_TOKEN.
5. Điền biến ở `.env.vercel.example` vào dashboard, tạo JWT_SECRET và CRON_SECRET mới. Không đưa `.env` local, mật khẩu hoặc token vào Git. Không dùng tài khoản demo cho hệ thống thật.
6. SMTP nếu cần đăng ký/khôi phục mật khẩu qua email. Google/Gemini là tùy chọn. Giao diện chuyển khoản ngân hàng hiện vẫn bị tắt từ bản local; không coi thanh toán online đã được tích hợp hoàn chỉnh.

Cron mặc định chạy mỗi phút, cần gói Vercel hỗ trợ (Pro/Enterprise). Hobby không hỗ trợ lịch này. Nếu dùng Hobby, cần bỏ mục crons và tự cấu hình scheduler ngoài gọi endpoint mỗi phút với Authorization: Bearer CRON_SECRET. Không giảm xuống một lần/ngày vì sẽ làm sai thời gian hết hạn/nhắc lịch.

Tách database, Redis và Blob cho Preview và Production để bản thử nghiệm không sửa dữ liệu thật. APP_URL phải khớp domain của môi trường.

## Chuyển dữ liệu

Sao lưu database và upload trước khi chuyển. File SQL gốc là schema/seed khởi tạo, không phải migration an toàn cho database đang có dữ liệu. Không chạy db:init trên database thật. Khôi phục bản .bak vào SQL Server tương thích; với Azure SQL dùng quy trình export/import tương thích như BACPAC. Kiểm tra schema đã được cập nhật từ bản local trước khi deploy.

Ảnh/báo cáo tải lên không nằm trong gói mã nguồn. Nếu cần chuyển dữ liệu cũ, tải chúng vào private Blob và giữ nguyên key `uploads/avatars/<tên>`, `uploads/dishes/<tên>`, `uploads/reports/<tên>` tương ứng URL đã lưu trong DB. Thư mục local lần lượt là backend/src/uploads/avatars, backend/src/uploads/dishes và backend/uploads/reports. Không công khai báo cáo. Ảnh menu mặc định được build vào frontend tự động.

## Kiểm tra và triển khai sau này

Tại thư mục dự án, với Node 24/npm trong PATH:

```powershell
npm ci
npm run build:vercel
npm run check:vercel
# Chỉ chạy khi bạn sẵn sàng triển khai:
npx vercel login
npx vercel link
npx vercel deploy
# Sau khi kiểm thử bản preview, mới triển khai production:
npx vercel deploy --prod
```

Đừng ghi đè `.env` local bằng lệnh env pull; nếu cần, dùng tên riêng `.env.vercel.local`. Cấu hình build cloud bỏ qua env file local và lấy biến từ Vercel. Không đặt bí mật trong biến VITE_* vì chúng được đưa vào trình duyệt.

Trước production, kiểm tra đăng nhập/phân quyền, CRUD, đặt bàn/đơn hàng, hai trình duyệt nhận sự kiện realtime, upload/xem báo cáo, email, cron và log lỗi. Kiểm tra phân quyền phòng Socket.IO hiện có và xử lý dependency audit trước khi dùng dữ liệu thật.

## Kết quả hiện tại và giới hạn

Build frontend cloud, kiểm tra bootstrap/API guard/cron authorization và kiểm tra hồi quy local đã đạt. Cấu hình được đối chiếu JSON schema Vercel. Chưa kiểm thử deployment thật, SQL online, Redis nhiều instance, Blob hay email thật vì chưa tạo các tài nguyên này. Kiểm tra chuẩn bị không thay thế kiểm thử preview. Dự án còn các lỗi lint và cảnh báo dependency có sẵn; đây chưa phải chứng nhận sẵn sàng production.

Gói `phurai-vercel-source-*.zip` trong thư mục `local-packages` chứa source và lockfile để cài lại dependency, không chứa .env, database cá nhân, runtime, node_modules hoặc upload. Các gói local cũ được giữ nguyên để khôi phục. Xem PROJECT-INDEX.md để tra cứu cấu trúc.

Tài liệu đối chiếu:
- https://vercel.com/docs/services/config-reference
- https://vercel.com/docs/functions/websockets
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/vercel-blob/using-blob-sdk
