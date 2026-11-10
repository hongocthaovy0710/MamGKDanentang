# Kết nối Expo với MongoDB Atlas

## Chủ đề và sơ đồ kết nối

Ứng dụng **Mầm — Quản lý thành viên câu lạc bộ** dùng đúng bốn trường dữ liệu theo đề: `email`, `matkhau`, `hoten`, `hinhanh`. `matkhau` được băm trước khi lưu; màn hình chỉ hiển thị dạng chấm để tránh lộ mật khẩu.

`Expo app (web / điện thoại) → HTTP API (backend Node.js) → MongoDB Atlas`

App điện thoại không kết nối trực tiếp tới MongoDB. MongoDB username/password và URI chỉ được đặt trong `backend/.env` trên backend. `EXPO_PUBLIC_API_URL` trong app chỉ là địa chỉ API; biến có tiền tố này sẽ được đưa vào bundle của ứng dụng, vì vậy không được chứa mật khẩu hoặc secret.

## 1. Hoàn tất phần Atlas

Ảnh hiện tại đang ở **Database Access** và có user `hongocthaovy66_db_user` với role `atlasAdmin@admin`. Dòng banner báo Atlas đang triển khai thay đổi; chờ banner biến mất/trạng thái hoàn tất trước khi thử kết nối.

1. Trong Atlas, mở **Database** (hoặc **Database Deployments**) và tạo deployment/cluster nếu chưa có. Database Access chỉ quản lý tài khoản, nó chưa tự tạo cluster.
2. Mở **Database Access → Database Users**. Xác nhận user có quyền phù hợp. Cho ứng dụng CRUD sau này, nên dùng quyền `readWrite` trên database ứng dụng thay vì `atlasAdmin` trên mọi resource; có thể chỉnh role khi đã biết tên database.
3. Mở **Network Access → IP Access List → Add IP Address**. Để thử từ máy đang chạy backend, thêm IP công khai hiện tại của máy. Không để `0.0.0.0/0` lâu dài vì tùy chọn đó mở quyền truy cập từ mọi IP.
4. Vào cluster, chọn **Connect → Drivers → Node.js**, rồi sao chép URI `mongodb+srv://...`. Thay `<password>` bằng mật khẩu database user và thay `<dbname>` bằng tên database, ví dụ `crud_exam`.
5. Nếu mật khẩu có ký tự đặc biệt như `@`, `:`, `/`, `?`, `#`, `[`, `]`, hoặc `%`, hãy URL-encode phần mật khẩu trước khi đặt vào URI. Không gửi URI/mật khẩu lên chat hoặc commit vào Git.

## 2. Chạy backend

Mở terminal tại thư mục gốc project, chạy:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Mở `backend/.env`, thay dòng `MONGODB_URI` bằng URI vừa sao chép, ví dụ dạng:

```env
PORT=3000
MONGODB_URI=mongodb+srv://TEN_USER:MAT_KHAU_DA_MA_HOA@cluster0.xxxxx.mongodb.net/crud_exam?retryWrites=true&w=majority
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-admin-password
JWT_SECRET=replace-this-with-a-long-random-secret
```

Đổi `ADMIN_EMAIL` và `ADMIN_PASSWORD` thành thông tin đăng nhập admin của bạn. Đổi `JWT_SECRET` thành một chuỗi dài, riêng tư. Đây là tài khoản quản trị API, độc lập với Database User của Atlas.

Giữ terminal đang mở và chạy:

```powershell
npm run dev
```

Khi terminal in `Connected to MongoDB.` là backend đã đăng nhập được. Trên máy tính, mở `http://localhost:3000/health`; kết quả mong đợi là `{"api":"ok","database":"connected"}`.

## 3. Tạo database và nạp 10 thành viên/ảnh mẫu

Không phải tạo database ảnh riêng. Script `backend/seed-members.js` đọc 10 file JPG trong `assets`, chuyển nội dung ảnh thành data URI và ghi vào trường `hinhanh` của hồ sơ tương ứng. MongoDB tự tạo database `crud_exam` và collection `members` khi lần đầu ghi dữ liệu; hai tên này lấy từ đường dẫn database trong `MONGODB_URI`. [MongoDB giải thích việc tự tạo database/collection khi ghi document đầu tiên](https://www.mongodb.com/docs/manual/faq/fundamentals/).

Trong terminal backend (đang ở `backend/`), chạy:

```powershell
npm run seed
```

Script ghép ảnh như sau: `an.jpg` → `An Nguyễn`, `duy.jpg` → `Duy Trần`, `khiem.jpg` → `Khiêm Lê`, `linh.jpg` → `Linh Phạm`, `mai.jpg` → `Mai Hoàng`, `minhanh.jpg` → `Minh Anh Võ`, `phuc.jpg` → `Phúc Đặng`, `thuy.jpg` → `Thúy Bùi`, `tu.jpg` → `Tú Nguyễn`, `vy.jpg` → `Vy Trần`. Có thể sửa email/tên trong mảng `members` ở đầu file `backend/seed-members.js` trước khi nạp.

Mật khẩu mẫu cho 10 hồ sơ mới là `ThanhVien123!`; trong database nó được băm. Script chỉ thêm email chưa có, không ghi đè hồ sơ đã tồn tại. Nó không tạo dữ liệu admin; admin vẫn là `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `backend/.env`.

Sau đó mở Atlas → **Database → Browse Collections**. Bạn sẽ thấy database `crud_exam`, collection `members`, và hồ sơ có bốn trường đề bài cùng `_id` do MongoDB tự tạo.

## 4. Nối app Expo tới backend

Trong một terminal khác ở thư mục gốc project, tạo `.env`:

```powershell
Copy-Item .env.example .env
```

File `.env.example` ở thư mục gốc đã có sẵn URL mẫu. Đặt `.env` thực tế tương ứng với thiết bị:

- **Expo Web chạy trên cùng máy:** `EXPO_PUBLIC_API_URL=http://localhost:3000`
- **Android Emulator:** `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`
- **iOS Simulator:** thường dùng `EXPO_PUBLIC_API_URL=http://localhost:3000`
- **Điện thoại thật:** dùng IPv4 LAN của máy tính, ví dụ `EXPO_PUBLIC_API_URL=http://192.168.1.25:3000`. Điện thoại và máy tính phải cùng Wi‑Fi; firewall Windows cần cho phép Node.js nhận kết nối trên cổng 3000.

Sau đó tại thư mục gốc chạy app web:

```powershell
npm run web
```

Đăng nhập bằng `ADMIN_EMAIL` và `ADMIN_PASSWORD` bạn đã đặt ở `backend/.env`. Để mở Expo Go trên điện thoại, dùng `npm start` rồi quét QR; hãy đặt URL API trong `.env` gốc theo hướng dẫn thiết bị ở trên. Sau khi vào màn hình danh sách, thêm hồ sơ để kiểm tra CRUD và chọn ảnh đại diện.

## 5. Nếu lỗi

- `MONGODB_URI is missing`: kiểm tra đã tạo `backend/.env` (không phải `.env` gốc) và thay URI mẫu.
- `bad auth` / `Authentication failed`: kiểm tra **Database User** và mật khẩu database user; đây không phải mật khẩu đăng nhập MongoDB Atlas. URL-encode ký tự đặc biệt trong mật khẩu.
- `IP ... is not whitelisted` / server selection timeout: thêm IP của máy backend trong **Network Access** và chờ Atlas áp dụng.
- `Network request failed` trên điện thoại: kiểm tra địa chỉ API là IP LAN, cùng Wi‑Fi, firewall và backend còn chạy.
- Backend mở được `/` nhưng `/health` báo 503: API đang chạy nhưng Mongoose chưa kết nối được tới Atlas; đọc lỗi trong terminal backend.

Backend tạo collection `members` với đúng bốn trường đề bài; MongoDB tự thêm `_id` để định danh từng bản ghi. Mật khẩu được băm bằng bcrypt. API có đăng nhập admin, liệt kê, thêm, sửa, xóa và tìm kiếm phía app. Ảnh đại diện được nén thành JPEG/PNG data URI và lưu trong trường `hinhanh` để không cần thêm dịch vụ lưu trữ ảnh cho bài giữa kỳ. Vì ảnh ở trong MongoDB, hãy chọn ảnh có dung lượng vừa phải.
