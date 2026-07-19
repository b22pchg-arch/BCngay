# SCADA Report Studio V150 PWA 1.0.1 – Map Bridge

## Lỗi đã xử lý

PWA chạy trên HTTPS/GitHub Pages có vùng `localStorage` riêng với HTML mở bằng `file://`. Ngoài ra, luồng **Nạp tổng hợp nhiều file** của HTML V150 chỉ đọc Topo/Map/Route/Công tơ từ JSON và chưa chuyển `data.reportTemplateMaps` vào bộ thiết kế báo cáo. Vì thế HTML cục bộ có thể nhận map nhờ bộ nhớ cũ, còn PWA mới lại tạo registry rỗng.

Bản 1.0.1 tự quét các file JSON/XLSX được chọn tại **Nạp tổng hợp nhiều file**, lấy gói có nhiều điểm map nhất, lưu vào vùng PWA và áp lại sau khi 32 file mẫu được đọc xong.

## Cập nhật trên GitHub Pages

1. Chép đè toàn bộ nội dung thư mục PWA 1.0.1 lên thư mục GitHub Pages, gồm cả `CAP_NHAT_PWA.html`.
2. Mở địa chỉ:

   `https://<tài-khoản>.github.io/<thư-mục>/CAP_NHAT_PWA.html`

3. Trang này xóa service worker/cache 1.0.0 và tự mở lại `index.html?v=1.0.1`.
4. Kiểm tra bảng **SCADA PWA** ở góc dưới phải phải ghi `V150-PWA-1.0.1`.

## Nạp dữ liệu và map

1. Tại **Nạp tổng hợp nhiều file**, chọn gói cấu hình JSON có `reportTemplateMaps` cùng các file SCADA/công tơ khác.
2. Ngay sau khi chọn, bảng PWA phải báo số cấu hình mẫu, số mẫu có map, số điểm gán và số mẫu tùy chỉnh.
3. Nạp 32 file mẫu trong tab **Xuất báo cáo mẫu**.
4. PWA tự áp lại map sau khi đọc xong. Mẫu tùy chỉnh phải hiển thị số `Map ô` và `Vùng lặp` đã lưu.
5. Nút **Khôi phục map từ gói đã chọn** dùng để quét và áp lại thủ công mà không phải chọn lại file.

## Kiểm tra đúng

Với gói đã khôi phục trước đây, trạng thái dự kiến gần như:

- 32 cấu hình mẫu.
- 22 mẫu có map.
- 351 điểm gán.
- 1 mẫu tùy chỉnh.

Con số thực tế phụ thuộc gói đang chọn.

## Lưu ý

- File tổng hợp chỉ được tự nhận là gói map khi là JSON hoặc workbook cấu hình có `CFG_REPORT_JSON`/`CFG_REPORT_TEMPLATE`.
- Khi có nhiều gói, PWA ưu tiên gói có nhiều điểm map thực tế nhất, tránh gói cấu trúc rỗng ghi đè gói đầy đủ.
- Sau khi map đã hiện đúng, xuất lại **Gói cấu hình dùng lại** từ PWA để lưu map trong đúng origin HTTPS.
