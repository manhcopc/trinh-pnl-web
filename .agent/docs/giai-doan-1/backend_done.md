# Tổng kết Kiến trúc & Backend - Giai đoạn 2 (Google Sheets & Security Gatekeeper)

Tài liệu này tổng hợp lại các quyết định về kiến trúc và cấu trúc mã nguồn Backend đã được thống nhất và triển khai trong Giai đoạn 2 của dự án P&L Web.

## 1. Công nghệ sử dụng (Tech Stack)
- **Framework:** Next.js (Node.js) cho cả Frontend và Backend (App Router).
- **Cơ sở dữ liệu:** Google Sheets API.
- **Thư viện xử lý dữ liệu:** 
  - `google-spreadsheet` để thực hiện các thao tác đọc/ghi file Google Sheets.
  - `uuid` để tạo định danh duy nhất (Transaction_ID) cho mỗi bản ghi.
- **Xác thực (Authentication):** Sử dụng Google Service Account (`JWT`) thông qua các biến môi trường cấu hình tại `.env.local`.

## 2. Thiết kế Kiến trúc (Security Gatekeeper)
Kiến trúc của dự án được thiết kế theo mô hình "Security Gatekeeper" (Nhà kho & Kế toán trưởng). Giao diện Frontend (Web) hoàn toàn không biết cấu trúc hoặc vị trí thực sự của Google Sheets.

### A. Lớp Bảo vệ và Xử lý Dữ liệu (Gatekeeper Layer)
- Được thực thi thông qua module **`lib/googleSheetsHelper.js`**. 
- Thực hiện các nhiệm vụ cốt lõi:
  - **Bảo vệ dữ liệu:** Dùng Service Account để thao tác với Google Sheets. Không công khai file Sheets ra bên ngoài, chống việc người dùng thao tác nhầm hoặc phá hỏng công thức.
  - **Tự động gán thông tin (System-generated fields):** Tự động sinh `Transaction_ID` ngẫu nhiên và chốt `Timestamp` (Múi giờ Việt Nam) ở cấp độ Server, đảm bảo người dùng không thể gian lận hay làm giả thời gian/giao dịch.
  - **Thao tác CRUD:** Thực hiện việc chèn mới (CREATE) và đọc (GET) từ Sheet `Database_Giao_Dich`.

### B. Lớp API (API Routes Layer)
- Tiếp tục sử dụng App Router của Next.js tại **`app/api/pnl/route.js`**.
- Đóng vai trò như các Controllers tiếp nhận request từ Client, gọi các hàm tương ứng từ `googleSheetsHelper.js` và trả về kết quả JSON.
- Đảm nhận việc bóc tách "Gói hàng" từ Frontend và validate (xác thực dữ liệu) trước khi chuyển cho Gatekeeper.

## 3. Cấu trúc Cột Dữ liệu (Google Sheets Schema)
Dữ liệu sẽ được ghi thẳng vào Sheet có tên `Database_Giao_Dich` với cấu trúc cột:
1. **Transaction_ID:** Mã định danh duy nhất do Backend tự tạo ra (UUID).
2. **Timestamp:** Thời gian ghi nhận giao dịch tại Server (Việt Nam UTC+7).
3. **Date:** Ngày tháng của giao dịch do người dùng chọn (YYYY-MM-DD).
4. **Branch:** Cơ sở của giao dịch (Tùy chọn, vd: PHT, Hội An).
5. **Category:** Danh mục (Vd: Bán hàng, Quảng cáo, Tiền thuê nhà).
6. **Type:** Loại giao dịch (`Revenue` hoặc `Expense`).
7. **Amount:** Số tiền (VND).
8. **Note:** Ghi chú bổ sung (Tùy chọn).

## 4. Tầng Báo cáo (Reporting Engine)
- Do sử dụng Google Sheets, tầng xử lý Báo cáo và logic tính toán phức tạp (Pivot Table, Query, Chart) được **chuyển giao hoàn toàn cho Google Sheets**. 
- Nhờ có `Database_Giao_Dich` chuẩn chỉnh với `Transaction_ID` và `Timestamp`, việc thiết lập các Dashboard báo cáo nội bộ sẽ được thực hiện trực tiếp trên nền tảng Google Workspace, giúp giảm tải cực lớn cho Backend của web, đáp ứng mô hình No-code / Low-code hiệu quả.
