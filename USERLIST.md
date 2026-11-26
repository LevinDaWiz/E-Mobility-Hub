# USERLIST — Tài khoản demo

**Mật khẩu chung của mọi tài khoản: `123456`**

Đăng nhập tại trang đầu của ứng dụng → "Identity Provider". Tên đăng nhập không phân biệt hoa thường. Sinh viên có thể dùng **mã sinh viên hoặc email**; nhân sự dùng **tên đăng nhập** trong bảng.

## Sinh viên (vào app `/app`)

| Mã sinh viên (tên đăng nhập) | Họ tên | Email | Xe cá nhân | Gợi ý dùng khi demo |
|---|---|---|---|---|
| `2112345` | Nguyễn Văn An | an.nguyen@hcmut.edu.vn | `PV-001` xe máy điện (pin 34%), `PV-002` xe đạp điện (pin 18%) | Tài khoản chính: đặt xe, đỗ xe, đăng ký sạc |
| `2112346` | Trần Thị Bình | binh.tran@hcmut.edu.vn | `PV-003` xe máy điện (pin 62%) | Tài khoản thứ hai: thử xung đột với `2112345` |
| `2112347` | Lê Minh Châu | chau.le@hcmut.edu.vn | `PV-004` xe đạp điện (pin 45%) | Cạnh tranh cổng sạc (NIFR-05) |
| `2112348` | Phạm Quốc Duy | duy.pham@hcmut.edu.vn | không có | Chỉ dùng xe dùng chung |

## Nhân sự (vào site quản trị `/admin`)

| Tên đăng nhập | Mã | Họ tên | Vai trò | Quyền chính |
|---|---|---|---|---|
| `admin` | AD001 | Quản trị viên | ADMIN | Toàn quyền: thêm / sửa / xóa Hub, chỗ đỗ, cổng sạc, **phương tiện**; Cài đặt hệ thống; mọi trang vận hành |
| `operator1` | OP001 | Hoàng Gia Huy | OPERATOR (vận hành) | Giám sát Hub, quá tải, điều phối, sự cố, lịch sạc, mô phỏng; **không** thêm / sửa / xóa xe |
| `operator2` | OP002 | Võ Thanh Tâm | OPERATOR (kỹ thuật) | Như `operator1`, thiên về xử lý sự cố |
| `manager` | MG001 | Ban quản lý | MANAGEMENT | Xem và xuất báo cáo, thống kê |

## Ghi chú

- Nhập sai mật khẩu **5 lần** thì tài khoản bị khóa **5 phút** (giờ thật). Phiên đăng nhập giữ **8 giờ**.
- Mật khẩu `timeout` và `expired` không phải mật khẩu thật: dùng để xem màn hình lỗi "Identity System không phản hồi" và "Hết phiên xác thực".
- Khung **⚙ Demo** (góc dưới phải) đổi tài khoản không cần mật khẩu, tiện khi trình bày.
- Mật khẩu được lưu dưới dạng băm PBKDF2 trong `src/data/credentials.ts`. Đây chỉ là xác thực giả lập phía trình duyệt, **đừng nhập mật khẩu thật**.
