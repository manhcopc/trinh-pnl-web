# Báo cáo Tối ưu hóa (Giai đoạn 4: Upsert & Report View)

Tài liệu này tổng hợp lại các quyết định tối ưu hóa kiến trúc, giao diện và luồng dữ liệu (Data Flow) đã được triển khai nhằm biến ứng dụng P&L từ một công cụ nhập liệu đơn giản thành một Dashboard tài chính chuyên nghiệp.

## 1. Tối ưu hóa Luồng Nhập Liệu (Unified Upsert Flow)
**Vấn đề trước đây:** Nhập mới và Chỉnh sửa là 2 luồng tách biệt, dễ gây trùng lặp dữ liệu (Duplicate records) nếu người dùng vô tình nhập 2 lần cho cùng một tháng.
**Giải pháp Tối ưu:**
- **Chuyển đổi Tham chiếu Thời gian:** Chuyển từ nhập `Ngày (Date)` sang nhập theo `Kỳ kế toán (Tháng/Năm)`. Phù hợp tuyệt đối với bản chất báo cáo P&L.
- **Auto-fill & Upsert:**
  - **Frontend:** Ngay khi người dùng chọn `Tháng` và `Cơ sở`, `AddRecordForm` sẽ tự động gọi API `GET` để tải số liệu cũ. Nếu có số liệu, form tự động được điền (Auto-fill) giúp người dùng dễ dàng chỉnh sửa mà không cần nhớ số cũ.
  - **Backend (Security Gatekeeper):** Hàm `upsertPnLTransactions` được bổ sung. Khi có request `POST` cập nhật dữ liệu của một kỳ, Backend tự động tìm và xóa sạch các dòng cũ của kỳ đó trước khi chèn mảng dữ liệu mới.
- **Kết quả:** Trải nghiệm nhập liệu liền mạch 100%. Không bao giờ xảy ra rác dữ liệu trên Google Sheets.

## 2. Tối ưu hóa Cấu trúc Báo Cáo (P&L DataGrid Report)
**Vấn đề trước đây:** Ứng dụng chỉ hiển thị 3 con số tổng quan (Thu, Chi, Lợi nhuận) thiếu tính phân tích. Nhúng Google Sheets (Iframe) lên web thì phá vỡ thiết kế UI.
**Giải pháp Tối ưu:**
- **Component `PnLReportTable.js`:** Xây dựng một bảng tính (DataGrid) đa cấp ngay trên Next.js.
- **Hard-coded Taxonomy (`lib/constants.js`):** Danh sách 25 chỉ tiêu tài chính được phân rã thành 6 nhóm chuẩn (Tổng doanh thu, COGS, Giảm trừ, OPEX, Chi phí khác, Khấu hao/Tồn kho).
- **Trải nghiệm UX:** 
  - Giao diện thừa kế phong cách Glassmorphism.
  - Các nhóm có thể gập/mở (Accordion / Collapsible) linh hoạt.
  - Phân màu sắc số liệu rõ ràng (Xanh/Đỏ).
- **Khả năng Lọc (Filter):** Bổ sung thanh công cụ cho phép truy vấn (Query) số liệu theo `Toàn hệ thống` hoặc từng `Cơ sở` cụ thể theo thời gian thực (Real-time recalculation) thông qua `useMemo`.

## 3. Tối ưu hóa Cơ sở Dữ liệu (Google Sheets Schema)
- Khớp nối hoàn hảo cấu trúc Header của `Database_GIao_Dich` với các thuộc tính tiếng Việt: `Ma_Giao_Dich`, `Thoi_Gian`, `Ngay`, `Chi_Nhanh`, `Danh_Muc`, `Loai`, `So_Tien`, `Ghi_Chu`.
- Điều này giúp ứng dụng có thể thả mượt mà vào bất kỳ cấu trúc Google Sheets nào có sẵn của người dùng mà không cần đập đi xây lại file Excel.

## 4. Kết luận
Ở giai đoạn tối ưu hóa này, ứng dụng đã đạt chuẩn một phần mềm SaaS tài chính khép kín (End-to-End). Toàn bộ Logic nghiệp vụ nặng (Grouping, Fetching) được xử lý thông minh để giảm thiểu số lần gọi API tới Google Sheets, tối ưu hóa tốc độ tải trang (Loading speed) và bảo vệ toàn vẹn dữ liệu (Data Integrity).
