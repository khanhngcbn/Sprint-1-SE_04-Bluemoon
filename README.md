

Phân quyền: `/api/auth/**` công khai · `/api/admin/**` chỉ `ROLE_ADMIN` · các endpoint còn lại cần JWT (`Authorization: Bearer <token>`); các thao tác quản trị khác được khóa bằng `@PreAuthorize`.
Tài khoản admin mặc định được tạo khi chạy lần đầu: `admin` / `1234567890` (**đổi ngay sau khi đăng nhập**).

---

## 1. Code

### 1.1 Công nghệ

| Hạng mục | Công nghệ |
|---|---|
| Ngôn ngữ, framework | Java 17, Spring Boot 3.4.3 (Web, Data JPA, Validation, Security, Thymeleaf, Mail) |
| CSDL | PostgreSQL 13+ (driver `org.postgresql`), Hibernate `ddl-auto=update`; test dùng H2 in-memory |
| Xác thực | JWT (jjwt 0.12.3, HS256), mật khẩu mã hóa BCrypt |
| OTP | Lưu trong bộ nhớ bằng Caffeine (không cần Redis), gửi qua Gmail SMTP |
| Kiểm tra mật khẩu | Passay |
| Xuất Excel | Apache POI 5.2.0 |
| Build | Maven (Maven Wrapper `mvnw`), Docker |

### 1.2 Cấu trúc thư mục

```
src/main/java/com/example/demo/
  config/      AdminUserInitializer, ApartmentConfig
  controller/  REST API (+ export/: xuất Excel)
  dto/ entity/ enums/ repository/ validation/ exception/
  security/    HomeSecurity (JWT, CORS, method security), CurrentUserAccess
  service/     Bill, Contribution, User, Resident, Apartment, OTP, Mail, JWT…
src/main/resources/   application.properties (chỉ có placeholder, không chứa bí mật)
src/test/             DemoApplicationTests + cấu hình test (H2)
scripts/              smoke_test.py, smtp_stub.py
Dockerfile · docker-compose.yml · .env.example · pom.xml
```

### 1.3 Chạy nhanh

```bash
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run   -> http://localhost:9090
./mvnw test                     # test dùng H2 in-memory, không cần DB/SMTP
```

Cấu hình biến môi trường bắt buộc và **cách chạy frontend (giao diện web) đi kèm** xem [Mục 5](#5-tài-liệu-vận-hành). Frontend nằm ở thư mục riêng `BlueMoon-Sprint1-FrontEnd` (React 18 + Chakra UI).

---

## 2. Tài liệu phân tích yêu cầu

### 2.1 Bối cảnh và vấn đề hiện trạng

Ban Quản trị chung cư BlueMoon đang quản lý cư dân và thu phí bằng sổ chép tay, file Excel và tiền mặt. Các vấn đề liên quan đến Sprint 1:

| Vấn đề hiện trạng | Hậu quả | Giải pháp |
|---|---|---|
| Hồ sơ cư dân, căn hộ nằm rải rác nhiều file | Không biết căn hộ nào còn trống, ai đang ở căn hộ nào; tra cứu thủ công | US01, US02, US03 |
| Kế toán tính tay phí theo m², tiền điện nước theo chỉ số; đổi đơn giá phải sửa nhiều công thức | Chậm, dễ sai | US05, US06, US07 |
| Thu tiền mặt tận nhà, biên lai giấy | Biên lai dễ thất lạc, khó đối chiếu | US06, US08, US12 |
| Vận động đóng góp: lập danh sách từng hộ, cộng sổ tay | Không theo dõi được tiến độ so với mục tiêu | US15 |
| File Excel dùng chung, ai mở cũng sửa được | Không kiểm soát ai xem, ai sửa; cư dân không tự tra cứu được | US21, US22, US23 |

### 2.2 Các bên liên quan và vai trò hệ thống

| Bên liên quan | Vai trò hệ thống | Nhu cầu chính |
|---|---|---|
| Ban Quản trị / Ban Quản lý (Product Owner) | `ADMIN` | Quản lý tài khoản, cư dân, căn hộ, đơn giá, khoản thu, đợt đóng góp |
| Kế toán | `ADMIN` | Tạo khoản thu, tạo điện nước hàng loạt, xác nhận thanh toán tiền mặt |
| Cư dân | `RESIDENT` | Tự đăng ký tài khoản, xem khoản phải thu của căn hộ mình |

### 2.3 Danh sách User Story Sprint 1 và truy vết

Chuỗi truy vết: *Wish list (RAW) → Epic → Feature → User Story → Acceptance Criteria*. Tiêu chí chấp nhận được viết theo dạng Given–When–Then; bảng dưới tóm tắt và là cơ sở của các test case ở [Mục 7](#7-kiểm-thử).

| US | Ưu tiên | Epic / Feature | Nguồn | User Story | Tiêu chí chấp nhận (tóm tắt) |
|---|---|---|---|---|---|
| US21 | Must | EP-05 / FT-18 | RAW-024, NFR-004 | Là Cư dân, tôi muốn tự đăng ký tài khoản và xác minh email bằng OTP | Đăng ký bằng email hợp lệ nhận được OTP; chỉ xác minh được khi nhập đúng OTP còn hiệu lực; có thể gửi lại OTP |
| US22 | Must | EP-05 / FT-19 | RAW-024, RAW-028, NFR-002 | Là Người dùng, tôi muốn đăng nhập, đổi và đặt lại mật khẩu | Đăng nhập đúng nhận JWT; đổi mật khẩu phải đúng mật khẩu cũ; quên mật khẩu đặt lại được qua OTP |
| US23 | Must | EP-05 / FT-20 | RAW-007, NFR-003 | Là BQL, tôi muốn đổi vai trò, kích hoạt hoặc vô hiệu hóa tài khoản (đơn lẻ, hàng loạt) | Tài khoản bị vô hiệu hóa không đăng nhập được; cư dân vào chức năng quản trị bị từ chối |
| US01 | Must | EP-01 / FT-01 | RAW-001 | Là BQL, tôi muốn thêm, sửa, xóa hồ sơ cư dân và gắn với căn hộ | Lưu hồ sơ (họ tên, tuổi, email, số điện thoại, trạng thái cư trú) và hiện trong danh sách; dữ liệu thiếu hoặc sai bị từ chối |
| US02 | Must | EP-01 / FT-02 | RAW-003 | Là BQL, tôi muốn quản lý căn hộ và cập nhật trạng thái hàng loạt | Thêm, sửa căn hộ (số căn hộ, số phòng, tầng, diện tích, loại, trạng thái); đổi trạng thái nhiều căn hộ một lần |
| US03 | Should | EP-01 / FT-03 | RAW-002, RAW-004 | Là BQL, tôi muốn lọc căn hộ và xem cư dân trong từng căn hộ | Lọc đúng theo tầng, diện tích, trạng thái, loại; hiện danh sách cư dân của căn hộ được chọn |
| US05 | Must | EP-02 / FT-05 | RAW-005, RAW-029 | Là BQL, tôi muốn thiết lập đơn giá phí căn hộ, phí dịch vụ theo m², điện theo kWh, nước theo m³ | Lưu bảng đơn giá; khoản thu tạo sau dùng đơn giá mới |
| US06 | Must | EP-02 / FT-06 | RAW-010 | Là Kế toán, tôi muốn tạo, sửa, xóa và tìm kiếm khoản thu theo căn hộ | Khoản thu lưu với trạng thái mặc định chưa thanh toán; tìm được theo căn hộ |
| US07 | Should | EP-02 / FT-07 | RAW-011, RAW-031 | Là Kế toán, tôi muốn nhập lượng tiêu thụ điện, nước để tạo khoản thu hàng loạt | Số tiền mỗi căn hộ = lượng tiêu thụ × đơn giá |
| US08 | Must | EP-02 / FT-11 | RAW-017 | Là Cư dân, tôi muốn xem các khoản phải thu của căn hộ mình | Chỉ thấy khoản thu thuộc căn hộ của mình, kèm số tiền, hạn đóng, trạng thái |
| US12 | Must | EP-02 / FT-10 | RAW-014 | Là Kế toán, tôi muốn xác nhận thanh toán thủ công cho khoản nộp tiền mặt | Chuyển sang đã thanh toán; tài khoản cư dân không có quyền này |
| US15 | Must | EP-03 / FT-13 | RAW-016, RAW-027 | Là BQL, tôi muốn tạo, quản lý đợt đóng góp có mục tiêu và thời gian | Tạo đợt; sửa, đóng, hủy, mở lại đợt; tạo khoản đóng góp cho toàn bộ căn hộ; xuất Excel |

### 2.4 Yêu cầu phi chức năng áp dụng cho Sprint 1

| Mã | Yêu cầu | Cách đáp ứng trong repo |
|---|---|---|
| NFR-002 | Bảo mật mật khẩu, xác thực mọi chức năng | Mật khẩu mã hóa BCrypt; mọi API (trừ `/api/auth/**` và `/user/**`) cần JWT |
| NFR-003 | Phân quyền theo vai trò | Hai vai trò `ADMIN`, `RESIDENT`; cư dân chỉ truy cập dữ liệu căn hộ của mình (`CurrentUserAccess`) |
| NFR-004 | OTP có thời hạn, giới hạn số lần thử | OTP hết hạn sau 5 phút, khóa sau 3 lần nhập sai; có gửi lại OTP |
| NFR-001 | Danh sách phản hồi ≤ 3 giây với 10.000 bản ghi | Mục tiêu của dự án; repo chưa có kiểm thử tải |


---

## 5. Vận hành

### 5.1 Yêu cầu hệ thống

JDK 17 · PostgreSQL 13+ (hoặc `docker compose up -d`) · không cần Redis (OTP lưu bằng Caffeine in-memory) · tài khoản Gmail có **App Password** để gửi OTP · Node.js 18+ và npm nếu chạy frontend (mục 5.4).

### 5.2 Cấu hình (biến môi trường)

`application.properties` **không chứa bí mật**, chỉ có placeholder. Sao chép `.env.example`, điền giá trị thật và nạp vào môi trường (Spring Boot không tự đọc `.env`).

| Biến | Bắt buộc | Mặc định |
|---|:---:|---|
| `DB_URL` | | `jdbc:postgresql://localhost:5432/chungcu_db` |
| `DB_USERNAME` | | `postgres` |
| `DB_PASSWORD` | ✅ | – |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | ✅ | Gmail + **App Password** (gửi OTP) |
| `JWT_SECRET` | ✅ | chuỗi Base64 ≥ 32 byte: `openssl rand -base64 32` |

PowerShell:

```powershell
$env:DB_PASSWORD="..."; $env:MAIL_USERNAME="you@gmail.com"; $env:MAIL_PASSWORD="app_password"
$env:JWT_SECRET=[Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }) -as [byte[]])
```

bash: `set -a; source .env; set +a`

Có thể giữ cấu hình thật trong `application-local.properties` (đã `.gitignore`) và chạy với `--spring.profiles.active=local`.

### 5.3 Chạy ở môi trường phát triển

```bash
docker compose up -d            # (tuỳ chọn) PostgreSQL cục bộ, cần DB_PASSWORD
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run   -> http://localhost:9090
```

Bảng được Hibernate tự tạo (`ddl-auto=update`). Lần chạy đầu tạo tài khoản `admin` mặc định (xem [Mục 1](#1-tổng-quan-và-phạm-vi-sprint-1)).

### 5.4 Chạy frontend (giao diện web)

Giao diện web nằm ở thư mục riêng `BlueMoon-Sprint1-FrontEnd` (React 18 + Chakra UI, template Horizon UI) và gọi API của backend qua HTTP. Cần chạy **cả hai** thì mới sử dụng được hệ thống.

**Yêu cầu:** Node.js 18 trở lên (khuyến nghị bản LTS) và npm; backend đang chạy ở cổng `9090` (mục 5.3).

1. Chạy backend và kiểm tra nó đã lên (`http://localhost:9090`).
2. Cài thư viện cho frontend:

   ```bash
   cd BlueMoon-Sprint1-FrontEnd
   npm install --legacy-peer-deps --ignore-scripts
   ```

   `--legacy-peer-deps` tránh lỗi xung đột peer dependency; `--ignore-scripts` bỏ bước `preinstall` (`npx npm-force-resolutions`).
3. Kiểm tra file `.env` của frontend (địa chỉ backend):

   ```
   REACT_APP_API_BASE_URL=http://localhost:9090
   GENERATE_SOURCEMAP=false
   ```

   Nếu backend ở địa chỉ khác, sửa `REACT_APP_API_BASE_URL` rồi **khởi động lại** `npm start` (biến này chỉ được đọc lúc khởi động/build).
4. Chạy frontend:

   ```bash
   npm start          # mở http://localhost:3000
   ```

**Build bản chạy thật:** đặt `REACT_APP_API_BASE_URL` đúng địa chỉ backend rồi chạy `npm run build`; thư mục `build/` có thể phục vụ bằng bất kỳ web server tĩnh nào.

**CORS:** backend chỉ nhận các origin nằm trong danh sách ở `HomeSecurity.corsConfigurationSource()` (đã có `http://localhost:3000`). Nếu chạy frontend ở địa chỉ khác, thêm địa chỉ đó vào danh sách rồi build lại backend.

**Quy trình dùng thử từ đầu (CSDL trống):**

| Bước | Ai | Việc làm | Màn hình |
|---|---|---|---|
| 1 | ADMIN | Đăng nhập `admin` / `1234567890`, đổi mật khẩu ngay | Sign in |
| 2 | ADMIN | Tạo các căn hộ (số căn hộ, số phòng, tầng, diện tích, loại) | Apartment Management |
| 3 | ADMIN | Lưu bảng đơn giá (phí căn hộ, dịch vụ, điện, nước) | Fee Unit Management |
| 4 | Cư dân hoặc ADMIN | Cư dân tự đăng ký và nhập OTP, hoặc ADMIN thêm tài khoản cho cư dân (gắn với căn hộ đã tạo) | Sign up + OTP / Resident Management |
| 5 | ADMIN | Tạo khoản thu cho từng căn hộ, hoặc nhập lượng điện, nước để tạo hàng loạt | Bill Management / Utility Bills Creation |
| 6 | RESIDENT | Đăng nhập, xem khoản phải thu của căn hộ mình | Bill Payment Service |
| 7 | ADMIN | Xác nhận thanh toán thủ công cho khoản nộp tiền mặt | Bill Management |
| 8 | ADMIN, RESIDENT | ADMIN tạo đợt đóng góp; cư dân xem ở màn hình đóng góp | Contributions Management / Contribution Service |

Bước 4 cần gửi được email OTP: dùng Gmail thật (App Password) hoặc SMTP giả ở [Mục 7.3](#73-smoke-test-không-cần-gmail-thật), khi đó OTP nằm trong `mail.log`.

### 5.5 Triển khai backend bằng Docker

```bash
docker build -t bluemoon-backend .
docker run -d -p 9090:9090 --name bluemoon-backend \
  -e DB_URL=jdbc:postgresql://<host-csdl>:5432/chungcu_db -e DB_USERNAME=postgres -e DB_PASSWORD=... \
  -e MAIL_USERNAME=... -e MAIL_PASSWORD=... -e JWT_SECRET=... \
  bluemoon-backend
```

`Dockerfile` build hai giai đoạn (Maven + Temurin 17 để build, `openjdk:17` để chạy) và chạy `java -jar app.jar`. `docker-compose.yml` chỉ dựng PostgreSQL 16 (dữ liệu lưu ở volume `bluemoon_pgdata`), không dựng ứng dụng.

### 5.6 Vận hành thường kỳ

| Việc | Cách làm |
|---|---|
| Sao lưu CSDL | `pg_dump` định kỳ trên PostgreSQL; dữ liệu thu phí cần được lưu tối thiểu 5 năm (yêu cầu dự án) |
| Đổi mật khẩu admin mặc định | Đăng nhập `admin` → `POST /api/user/change-password` |
| Đổi bí mật | Đặt lại biến môi trường rồi khởi động lại ứng dụng; đổi `JWT_SECRET` làm mọi token đang dùng mất hiệu lực |
| Nâng cấp schema | `ddl-auto=update` chỉ thêm bảng/cột mới; thay đổi lớn cần script migration riêng |

### 5.7 Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Frontend không đăng nhập được, báo lỗi mạng hoặc CORS | Backend chưa chạy, sai `REACT_APP_API_BASE_URL`, hoặc frontend chạy ở origin không có trong danh sách CORS | Kiểm tra backend ở `http://localhost:9090`, xem tab Network của trình duyệt; xem lại mục 5.4 |
| Sửa `.env` của frontend nhưng không có tác dụng | Biến môi trường chỉ được đọc lúc khởi động | Dừng và chạy lại `npm start` |
| `npm install` báo xung đột phiên bản | Thiếu cờ cài đặt | Chạy `npm install --legacy-peer-deps --ignore-scripts` |
| Cổng `3000` bị chiếm, frontend tự đổi cổng khác | Tiến trình khác dùng cổng 3000; cổng mới bị CORS chặn | Dừng tiến trình đang dùng cổng 3000 rồi chạy lại |
| Không khởi động được, lỗi liên quan khóa JWT | `JWT_SECRET` thiếu hoặc không phải Base64 ≥ 32 byte | Sinh lại bằng `openssl rand -base64 32` |
| Không kết nối được CSDL | Sai `DB_URL`, `DB_PASSWORD` hoặc PostgreSQL chưa chạy | Kiểm tra `docker compose ps` và biến môi trường |
| Không nhận được email OTP | Dùng mật khẩu Gmail thường thay vì App Password | Tạo App Password; hoặc dùng SMTP giả ở [Mục 7.3](#73-smoke-test-không-cần-gmail-thật) khi demo |
| API trả `403` | Thiếu token, token hết hạn (1 giờ) hoặc sai vai trò | Đăng nhập lại; admin mới gọi được `/api/admin/**` |
| Cổng `9090` bị chiếm | Tiến trình khác dùng cổng | Đổi `server.port` hoặc dừng tiến trình đó |

---

#

## 7. Kiểm thử


### 7.1 Chạy test tự động

```bash
./mvnw test        # dùng src/test/resources/application.properties (H2), không cần PostgreSQL hay SMTP
```


