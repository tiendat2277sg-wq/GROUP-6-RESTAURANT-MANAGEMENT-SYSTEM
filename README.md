Bộ thiết lập môi trường

Repo lưu cấu hình Vercel, phiên bản thư viện và công cụ chạy dự án trên Windows. Để chạy ứng dụng, chép các file setup vào thư mục mã nguồn riêng có backend, frontend và database. Giữ file .env riêng của máy.

Dùng Node.js 24 và chạy npm ci trong thư mục dự án đầy đủ. Với bộ local Windows đã đóng gói, OPEN-LOCAL.cmd mở ứng dụng và CHECK-ENVIRONMENT.cmd kiểm tra môi trường. Các file CMD và scripts/setup-windows.ps1 sử dụng runtime Node đi kèm gói local.

Với mã nguồn đầy đủ, chạy npm run build:vercel rồi npm run check:vercel để kiểm tra cấu hình cho cloud. Xem VERCEL-DEPLOY.md để cấu hình SQL Server, Redis và Blob trước khi triển khai. Root Directory khi deploy là thư mục có vercel.json và hai thư mục frontend, backend.

Git ở đây chỉ theo dõi danh sách file setup trong .gitignore. Khi thêm công cụ setup mới, thêm chính xác đường dẫn đó vào danh sách.
