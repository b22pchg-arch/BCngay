# SCADA Report Studio V150 PWA

Phiên bản: **V150-PWA-1.0.0**  
HTML nghiệp vụ: **V150**  
Nguồn HTML SHA-256: `98adc5d33efcc433353e3f1aa7047f8f522d60101158293718191ce144180c72`

## Chạy và cài đặt trên Windows

1. Giải nén toàn bộ thư mục, không lấy riêng `index.html`.
2. Chạy `CHAY_PWA.cmd`.
3. Edge/Chrome mở `http://127.0.0.1:8765/index.html`.
4. Bấm **Cài ứng dụng** trong bảng `SCADA PWA`, hoặc dùng biểu tượng cài đặt trên thanh địa chỉ.
5. Sau lần mở đầu tiên, ứng dụng có thể hoạt động ngoại tuyến.

PWA không thể đăng ký service worker khi mở trực tiếp bằng `file://`. HTML vẫn chạy theo kiểu tệp độc lập, nhưng sẽ không có cài đặt, cache ngoại tuyến và cập nhật.

## Chuyển dữ liệu từ HTML mở trực tiếp

Dữ liệu trình duyệt của `file://` và `http://127.0.0.1:8765` thuộc hai vùng lưu trữ khác nhau. Trước khi chuyển sang PWA:

1. Mở HTML cũ đang dùng.
2. Xuất **Gói cấu hình dùng lại**, cấu hình map mẫu và DataMart cần lưu.
3. Chạy PWA rồi nạp lại các gói đó.

Không xóa HTML cũ cho đến khi kiểm tra xong cấu hình trong PWA.

## Cập nhật

1. Đóng ứng dụng PWA và cửa sổ server cũ.
2. Thay toàn bộ các tệp bằng gói PWA mới, giữ nguyên cấu trúc thư mục.
3. Chạy lại `CHAY_PWA.cmd`.
4. Bấm **Kiểm tra cập nhật** trong bảng `SCADA PWA`.

Dữ liệu do người dùng nạp nằm trong bộ nhớ trình duyệt/IndexedDB/localStorage tùy chức năng của HTML. Nên tiếp tục xuất gói cấu hình và DataMart định kỳ để sao lưu.

## Thành phần

- `index.html`: HTML V150, chỉ bổ sung khai báo PWA và bootstrap.
- `manifest.webmanifest`: thông tin cài đặt ứng dụng.
- `sw.js`: cache ngoại tuyến và cập nhật.
- `pwa-bootstrap.js`: nút cài đặt, trạng thái mạng và kiểm tra cập nhật.
- `version.json`: nhận diện phiên bản.
- `icons/`: biểu tượng PWA.
- `CHAY_PWA.cmd`: chạy localhost không cần IIS.
- `LOCAL_PWA_SERVER.ps1`: máy chủ tĩnh cục bộ.
- `DUNG_PWA.cmd`: dừng máy chủ ở cổng 8765.
