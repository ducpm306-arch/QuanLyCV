# Quản lý CV

Ứng dụng hỗ trợ tải CV, trích xuất thông tin ứng viên, đối chiếu CV với vị trí
tuyển dụng, lưu ứng viên và xuất CV theo mẫu của công ty.

Backend sử dụng NestJS và MongoDB. Frontend sử dụng React và Vite.

## Yêu cầu

Cài các phần mềm sau trước khi chạy dự án:

- Node.js 20 trở lên và npm.
- MongoDB local, MongoDB Atlas hoặc Docker Desktop.
- Một API hỗ trợ giao thức OpenAI cho chức năng trích xuất và đánh giá CV.
- LibreOffice nếu cần chuyển file DOCX đã tạo sang PDF.
- Apache Tika nếu cần đọc file DOC cũ hoặc muốn tăng khả năng OCR.

Kiểm tra Node.js và npm trong Windows CMD:

```bat
node --version
npm --version
```

## 1. Chuẩn bị MongoDB

Chọn một trong các cách dưới đây.

### Cách 1: MongoDB cài trực tiếp

Nếu MongoDB được cài dưới dạng Windows Service:

```bat
net start MongoDB
```

Chuỗi kết nối dùng trong `.env`:

```text
mongodb://127.0.0.1:27017/QuanLyCV
```

### Cách 2: MongoDB bằng Docker

```bat
docker run -d --name quanlycv-mongo -p 27017:27017 -v quanlycv-mongo-data:/data/db mongo:8
```

Các lần chạy sau chỉ cần:

```bat
docker start quanlycv-mongo
```

### Cách 3: MongoDB Atlas

Tạo database trên MongoDB Atlas, cho phép IP của máy kết nối, sau đó dùng connection
string Atlas làm giá trị `MONGO_URL`.

## 2. Cài dự án

Mở CMD tại thư mục dự án:

```bat
cd /d D:\QuanLyCV
npm install
copy .env.example .env
notepad .env
```

Điền ít nhất các biến sau trong `.env`:

```dotenv
PORT=8000
MONGO_URL=mongodb://127.0.0.1:27017/QuanLyCV
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=api_key_cua_ban
AI_MODEL=ten_model_cua_ban
```

Không commit file `.env` vì file này chứa API key và thông tin đăng nhập database.

## 3. Tạo dữ liệu Position và Tech Stack mặc định

Chạy lệnh sau sau khi cấu hình `MONGO_URL`:

```bat
npm run seed
```

Seed tạo sẵn các vị trí:

- Backend Developer
- Frontend Developer
- Fullstack Developer
- Mobile Developer
- QA Engineer
- DevOps Engineer
- Data Engineer

Mỗi vị trí có danh sách Tech Stack tương ứng. Dữ liệu nguồn nằm tại
`src/database/seed-data.ts` và có thể chỉnh trước khi seed.

Lệnh seed có thể chạy lại. Script chỉ thêm Position hoặc Tech Stack chưa tồn tại;
không xóa và không ghi đè dữ liệu đã có trong database.

Để kiểm tra dữ liệu sau khi backend chạy:

```bat
curl http://localhost:8000/positions
curl http://localhost:8000/tech-stacks
```

## 4. Chạy ứng dụng

Mở CMD thứ nhất để chạy backend:

```bat
cd /d D:\QuanLyCV
npm run start:dev
```

Mở CMD thứ hai để chạy frontend:

```bat
cd /d D:\QuanLyCV
npm run dev:frontend
```

Truy cập:

- Frontend: <http://localhost:5173>
- Backend health check: <http://localhost:8000>
- Danh sách Position: <http://localhost:8000/positions>
- Danh sách Tech Stack: <http://localhost:8000/tech-stacks>

Cũng có thể mở cả hai cửa sổ từ một CMD:

```bat
start "Backend" cmd /k "cd /d D:\QuanLyCV && npm run start:dev"
start "Frontend" cmd /k "cd /d D:\QuanLyCV && npm run dev:frontend"
```

Nếu dự án được đặt ở thư mục khác, thay `D:\QuanLyCV` bằng đường dẫn thực tế.

## 5. Apache Tika tùy chọn

Backend mặc định tìm Tika tại `http://localhost:9998`. Có thể chạy Tika bằng
Docker:

```bat
docker run -d --name quanlycv-tika -p 9998:9998 apache/tika:latest-full
```

Các lần chạy sau:

```bat
docker start quanlycv-tika
```

Nếu không chạy Tika, hệ thống vẫn tự đọc PDF và DOCX bằng thư viện local. File DOC
định dạng cũ cần Tika hoặc phải được chuyển sang DOCX.

## 6. Xuất PDF bằng LibreOffice

Cài LibreOffice và đặt đường dẫn sau trong `.env`:

```dotenv
DOCX_TO_PDF_BIN=C:\Program Files\LibreOffice\program\soffice.exe
```

Nếu không có LibreOffice, hệ thống vẫn tạo DOCX nhưng trường PDF sẽ không có.

Template mặc định nằm tại:

```text
templates/company-cv-template.docx
```

## 7. Build và kiểm thử

```bat
npm run build
npm test
npm run test:e2e
```

E2E yêu cầu MongoDB trong `MONGO_URL` đang hoạt động. Unit test không cần gọi API AI.

Chạy bản đã build:

```bat
npm run build
npm run start:prod
```

## Lỗi thường gặp

### `npm` không được nhận diện

Cài lại Node.js, chọn tùy chọn thêm Node.js vào `PATH`, sau đó đóng và mở lại CMD.

### Không kết nối được MongoDB

- Kiểm tra MongoDB service hoặc container đang chạy.
- Kiểm tra `MONGO_URL` trong `.env`.
- Với Atlas, kiểm tra Database User, mật khẩu và danh sách IP được phép truy cập.

### Frontend gọi API thất bại

Frontend đang proxy API tới `http://localhost:8000`. Đảm bảo `.env` có
`PORT=8000` và backend đang chạy.

### Seed không tạo dữ liệu

Kiểm tra kết nối bằng cách chạy lại:

```bat
npm run seed
```

Lệnh sẽ in số Position và Tech Stack vừa được thêm. Nếu cả hai bằng `0`, dữ liệu
mặc định đã tồn tại trong database.

### Không tạo được PDF

Kiểm tra LibreOffice đã cài và `DOCX_TO_PDF_BIN` trỏ đúng tới `soffice.exe`.
File DOCX vẫn được tạo ngay cả khi bước chuyển PDF thất bại.
