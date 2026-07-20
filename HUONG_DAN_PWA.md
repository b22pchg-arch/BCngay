# SCADA Report V152 PWA 1.1.0 — đọc trực tiếp ZIP

## Cài đặt

1. Giải nén toàn bộ gói.
2. Chạy `CHAY_PWA.cmd` hoặc đưa toàn bộ file lên GitHub Pages.
3. Mở `index.html` qua `http://`, `https://` hoặc localhost.
4. Cài ứng dụng từ nút **Cài ứng dụng** của trình duyệt/PWA.

## Nạp ZIP

Tại **Nạp tổng hợp nhiều file**, có thể chọn đồng thời file rời và một hoặc nhiều `.zip` rồi bấm **Nạp cộng dồn**.

PWA giải nén hoàn toàn trong bộ nhớ trình duyệt và tự chuyển các file bên trong cho lõi phân loại hiện có:

- Gói cấu hình JSON/XLSX và map báo cáo.
- SCADA thô TBA 110 kV.
- SCADA thủy điện/TDB22.
- Dữ liệu công tơ DULIEU thông thường.
- DataMart.
- Map SCADA, Topo SCADA và Route thủy điện.
- File mẫu báo cáo khi chọn ZIP tại vùng **Xuất báo cáo mẫu**.

Bảng **V151 · Đọc trực tiếp ZIP** hiển thị tên ZIP, file con, loại nhận diện, dung lượng và trạng thái xử lý.

## ZIP hỗn hợp và ZIP lồng

- Có thể trộn nhiều ZIP và file rời trong một lần chọn.
- Hỗ trợ ZIP lồng tối đa 3 cấp.
- Bỏ qua thư mục, `.DS_Store`, `__MACOSX`, file tạm `~$...` và định dạng không hỗ trợ.
- ZIP có mật khẩu chưa được hỗ trợ.

## Giới hạn an toàn

- Tối đa 1.000 file.
- Tối đa 256 MB cho một file sau giải nén.
- Tối đa 768 MB tổng dữ liệu sau giải nén.

Các giới hạn này ngăn ZIP bomb làm treo trình duyệt.

## Cập nhật GitHub Pages

Chép đè toàn bộ gói, sau đó mở `CAP_NHAT_PWA.html` để gỡ service worker và cache cũ. Phiên bản đúng hiển thị `V152-PWA-1.2.0`.

## Lưu ý dữ liệu

PWA không gửi nội dung ZIP lên máy chủ. Việc giải nén, đọc Excel/CSV/JSON và tính toán diễn ra trên thiết bị người dùng.
