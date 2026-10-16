# HAI Shop — Frontend Demo

Dự án FE bán hàng gồm 2 khu vực có thể bấm và chuyển đổi trực tiếp:

- Khách hàng: `#/` và `#/shop`
- Admin: `/admin`

## Chạy dự án

```bash
npm install
npm run dev
```

## Tính năng đã làm

### Khách hàng
- Landing page hiện đại
- Danh mục sản phẩm
- Lọc theo danh mục
- Sắp xếp giá
- Thêm sản phẩm vào giỏ
- Xóa sản phẩm khỏi giỏ
- Tổng tiền tự động
- Toast khi thêm giỏ
- Điều hướng sang Admin

### Admin
- Dashboard
- Doanh thu / đơn hàng / khách hàng / sản phẩm
- Trang đơn hàng
- Quản lý sản phẩm
- Thêm sản phẩm bằng modal
- Xóa sản phẩm
- Trang khách hàng
- Trang phân tích
- Điều hướng quay lại cửa hàng

> Đây là frontend demo, dữ liệu đang dùng state local và chưa kết nối backend/database.

---

## Backend (thư mục `server/`)

Node.js 22.13+ · Express 5 · SQLite (`node:sqlite` có sẵn, không cần build native) · JWT · bcrypt. Lần chạy đầu tự tạo DB, seed 8 sản phẩm + review mẫu và tài khoản admin.

### Chạy local (2 terminal)

```bash
# Terminal 1 - Backend (http://localhost:4000)
npm run server:install
cp server/.env.example server/.env
npm run server:dev

# Terminal 2 - Frontend (http://localhost:5173, /api đã proxy sang :4000)
npm install
npm run dev
```

- Admin mặc định: `admin@hai.vn` / `admin123` (đổi bằng `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `server/.env` **trước lần chạy đầu**).
- Khách hàng: bấm "Đăng nhập" → "Tạo tài khoản" để đăng ký.
- Test API: `cd server && npm test`

### Chạy bằng Docker (FE + BE)

```bash
docker compose up --build   # http://localhost:8080
```

Đặt `JWT_SECRET`, `ADMIN_PASSWORD` trong file `.env` cạnh `docker-compose.yml` khi chạy thật. Dữ liệu SQLite nằm trong volume `api-data`.

### Deploy tách riêng (Render)

- **API**: Web Service, Root Directory `server`, Docker. Gắn **Disk** mount `/data`; env: `JWT_SECRET` (bắt buộc), `ADMIN_PASSWORD`, `CORS_ORIGIN=https://<domain-fe>`.
- **FE**: build arg `VITE_API_URL=https://<domain-api>` (Render → Environment → Docker build args).

### API

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/health` | - | Kiểm tra server |
| POST | `/api/auth/register` | - | Đăng ký `{name,email,password}` |
| POST | `/api/auth/login` | - | Đăng nhập khách `{email,password}` |
| POST | `/api/auth/admin/login` | - | Đăng nhập admin |
| GET/PUT | `/api/auth/me` | Đăng nhập | Xem / cập nhật hồ sơ `{name,phone,address}` |
| POST | `/api/auth/change-password` | Đăng nhập | Đổi mật khẩu `{currentPassword,newPassword}`, trả token mới, token cũ hết hiệu lực |
| POST | `/api/auth/forgot-password` | - | Gửi email liên kết đặt lại mật khẩu `{email}` (hiệu lực 30 phút) |
| POST | `/api/auth/reset-password` | - | Đặt mật khẩu mới `{token,password}` (token dùng 1 lần) |
| GET | `/api/products`, `/api/products/:id` | - | Danh sách / chi tiết (kèm `stock`) |
| POST/PUT/DELETE | `/api/products[/:id]` | Admin | Thêm / sửa / xóa sản phẩm |
| GET/POST | `/api/products/:id/reviews` | - | Đánh giá sản phẩm |
| POST | `/api/orders` | Đăng nhập | Đặt hàng `{items:[{id,qty}],code?}` (server tự tính giá, mã `HAI10`/`FREESHIP`, ship, trừ kho) |
| GET | `/api/orders/mine` | Đăng nhập | Đơn của tôi |
| GET | `/api/orders` | Admin | Tất cả đơn |
| PATCH | `/api/orders/:id/status` | Admin | Đổi trạng thái (`Chờ xử lý` / `Đang giao` / `Đã giao`) |

### Quên mật khẩu / Email

- Cấu hình `SMTP_*`, `MAIL_FROM`, `APP_URL` trong `server/.env` để gửi email thật (xem `.env.example`).
- Chưa cấu hình `SMTP_HOST` thì server **in nội dung email (kèm link đặt lại mật khẩu) ra console** — dùng khi dev/test.
