# Báo cáo Cải tiến Kiến trúc Frontend (Giai đoạn 2)

Trong giai đoạn này, ứng dụng đã trải qua một sự lột xác toàn diện về mặt kiến trúc Frontend, chuyển đổi từ một hệ thống **tĩnh (Hardcoded)** sang một hệ thống **động (Dynamic & Data-driven)** tích hợp bộ đệm cục bộ cực nhanh.

Dưới đây là các thay đổi và cải tiến chính ở tầng Frontend:

## 1. Loại bỏ dữ liệu Tĩnh (Hardcoded Constants)
- **Thực trạng cũ:** Danh sách các Cơ sở (Branches) và Danh mục chi phí (Categories) được khai báo cứng trong file `lib/constants.js`. Bất cứ khi nào doanh nghiệp mở chi nhánh mới hay có nhóm chi phí mới, kỹ sư lập trình phải can thiệp trực tiếp vào mã nguồn để sửa.
- **Giải pháp:** Đã xóa bỏ hoàn toàn `lib/constants.js`. Hệ thống Frontend giờ đây đọc trực tiếp cấu hình hoạt động (Master Data) từ Google Sheets thông qua API.

## 2. Tối ưu Hóa Hiệu suất với LocalStorage Caching (Zero-Latency)
Vì Master Data (Cơ sở, Danh mục) là dữ liệu rất ít khi thay đổi (Low-frequency updates), việc gọi API mỗi lần người dùng chuyển trang sẽ làm trang web chậm đi và tiêu tốn hạn mức (Quota) của Google API một cách lãng phí.
- **[NEW] `hooks/useMasterData.js`:** Đã xây dựng một Custom React Hook đóng vai trò như một lớp Middleware quản lý Cache. 
- **Quy trình hoạt động:** Khi Web tải lần đầu, Hook sẽ lấy dữ liệu từ API và lưu vào `localStorage` của trình duyệt với vòng đời (TTL) 24 giờ. Trong các lần truy cập hoặc chuyển trang sau đó (từ trang Nhập liệu sang trang Báo cáo), dữ liệu sẽ được lấy ra từ `localStorage` ngay lập tức (độ trễ 0ms).

## 3. Quản trị Dữ liệu Chủ (Master Data CMS) trên Giao diện Web
Người quản trị giờ đây có thể thao tác với cấu hình hệ thống trực tiếp trên Web, không cần phải mở file Google Sheets.
- **[NEW] `app/settings/page.js`:** Xây dựng trang Cấu Hình (Settings). Cung cấp giao diện để thêm mới Cơ sở và Danh mục chi phí.
- **Cơ chế Đồng bộ trực tiếp (Live Sync):** Khi người dùng thêm một Cơ sở mới thông qua Form, Frontend vừa gửi tín hiệu cập nhật (POST API) xuống Backend, vừa chèn ngay (inject) Cơ sở mới đó vào bộ nhớ `localStorage`. Hệ quả là giao diện tự động cập nhật ngay lập tức mà không cần tải lại trang.
- **[MODIFY] `app/components/Navigation.js`:** Bổ sung thanh điều hướng tới trang Cấu hình (⚙️).
- **Tính năng "Force Sync" (Làm mới bắt buộc):** Cung cấp nút đồng bộ thủ công để ghi đè `localStorage` trong trường hợp nhân viên cần tải cấu hình mới nhất từ máy chủ của người quản trị.

## 4. Tự động hóa Form Nhập liệu và Bảng Báo cáo
- **[MODIFY] `app/components/AddRecordForm.js`:** Tích hợp `useMasterData`, thay thế Drop-down tĩnh bằng danh sách động lấy từ Cache.
- **[MODIFY] `app/report/page.js`:** Tích hợp bộ lọc Cơ sở tự động sinh từ Cache thay vì danh sách cứng.
- **[MODIFY] `app/components/PnLReportTable.js`:** Cải tiến mạnh mẽ thuật toán render Bảng báo cáo:
  - Bảng P&L tự động co giãn và hiển thị các hạng mục theo đúng cấu trúc của nhóm (Groups) từ `Master_Danh_Muc`.
  - **Phân tích Tỷ trọng (% DT):** Bổ sung cột tự động tính phần trăm chi phí so với Tổng Doanh Thu (Vertical Analysis), giúp đánh giá tức thời tỷ lệ lợi nhuận biên và điểm nghẽn chi phí.

---

### Tổng kết
Kiến trúc Frontend hiện tại đã hoàn toàn tách biệt khỏi cấu trúc dữ liệu thô. Ứng dụng đã sẵn sàng hoạt động như một phần mềm dịch vụ (SaaS) độc lập, nơi người dùng cuối (End-users) tự do tùy chỉnh taxonomy (phân loại danh mục) của riêng họ thông qua giao diện Web tốc độ cao.
