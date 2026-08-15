# Kế hoạch Xây dựng Web Báo cáo P&L (Sử dụng Excel làm Database)

Dự án này nhằm mục đích xây dựng một ứng dụng web cho phép người dùng thiết lập, xem và quản lý báo cáo Kết quả Hoạt động Kinh doanh (Profit & Loss - P&L), với dữ liệu được lưu trữ hoàn toàn dưới dạng file Excel (`.xlsx`).

> [!IMPORTANT]
> **User Review Required**
> Vui lòng xem xét các đề xuất về công nghệ và kiến trúc bên dưới. Hệ thống sử dụng file Excel làm database rất tiện lợi cho cá nhân/nội bộ, nhưng cần lưu ý nếu có nhiều người cùng chỉnh sửa cùng lúc (concurrency).

## Open Questions
> [!WARNING]
> **Câu hỏi cần bạn làm rõ trước khi bắt đầu code:**
> 1. **Vị trí lưu trữ dự án:** Mình nên khởi tạo dự án ở thư mục nào? (Ví dụ: `/Users/copc/Workspace/pnl-web`)
> 2. **File Excel:** Bạn đã có sẵn một file Excel với cấu trúc/format mẫu chưa, hay bạn muốn mình tự tạo một file Excel mẫu (Template) từ đầu?
> 3. **Tính năng cốt lõi:** Trên giao diện web, bạn chỉ cần xem bảng số liệu (Data Table), hay cần thêm cả Biểu đồ (Charts) và tính năng Thêm/Sửa/Xóa dòng trực tiếp trên web?

## Đề xuất Giải pháp Công nghệ (Tech Stack)

Dựa trên yêu cầu của bạn, mình đề xuất cấu trúc sau để đảm bảo giao diện cao cấp (Premium) và xử lý file Excel mượt mà:

1. **Framework:** **Next.js** (Node.js). Next.js cho phép chúng ta viết cả Frontend (giao diện) và Backend (API đọc/ghi file Excel) trong cùng một dự án rất gọn gàng.
2. **Giao diện & Styling:** **React** + **Vanilla CSS**. Tuân thủ phong cách thiết kế hiện đại (Glassmorphism, Dark mode hoặc Corporate Clean), sử dụng CSS thuần để tùy biến tối đa các hiệu ứng hover, micro-animations mà không bị gò bó.
3. **Thư viện xử lý Excel:** **`exceljs`** (hoặc `xlsx`). Thư viện này sẽ chạy ngầm ở Backend (API) để đọc dữ liệu từ file `.xlsx` chuyển thành JSON cho web hiển thị, và nhận dữ liệu từ web để ghi đè vào file Excel.

## Các Thành phần (Components) Dự kiến

---

### 1. Backend (API Routes)
*   **[NEW]** `app/api/pnl/route.js`: Chứa 2 phương thức.
    *   `GET`: Đọc file `data.xlsx`, tính toán các chỉ số (Doanh thu, Chi phí, Lợi nhuận gộp, Lợi nhuận ròng) và trả về JSON.
    *   `POST`: Nhận dữ liệu nhập từ web và ghi thêm/cập nhật vào file `data.xlsx`.
*   **[NEW]** `lib/excelHelper.js`: Module chuyên xử lý logic giao tiếp với Excel.

---

### 2. Frontend (Giao diện Web)
*   **[NEW]** `app/page.js`: Bảng điều khiển (Dashboard) chính hiển thị tổng quan P&L.
*   **[NEW]** `app/components/PnLTable.js`: Bảng hiển thị chi tiết các hạng mục doanh thu/chi phí.
*   **[NEW]** `app/components/AddRecordForm.js`: Form nhập liệu để thêm giao dịch mới trực tiếp từ web.
*   **[NEW]** `app/globals.css`: Chứa hệ thống CSS hiện đại, thiết kế các thẻ (cards), bảng (tables) với màu sắc cao cấp, gradient và animation mượt mà.

---

### 3. Database
*   **[NEW]** `data/pnl_database.xlsx`: File Excel gốc lưu trữ dữ liệu. Gồm các cột cơ bản như: Ngày tháng, Hạng mục (Doanh thu/Chi phí), Số tiền, Ghi chú.

## Verification Plan (Kế hoạch Kiểm thử)

### Automated/Unit Tests
*   Không áp dụng ngay trong phiên bản MVP này để tập trung ra mắt nhanh. Tuy nhiên có thể tích hợp script test nhỏ để kiểm tra xem API có đọc đúng số liệu từ Excel hay không.

### Manual Verification
1.  **Đọc dữ liệu:** Điền thử dữ liệu trực tiếp vào file Excel, refresh trang web xem dữ liệu có cập nhật lên biểu đồ/bảng không.
2.  **Ghi dữ liệu:** Nhập dữ liệu mới từ giao diện Web, sau đó mở file Excel ra xem dòng dữ liệu đó đã được ghi vào đúng cột chưa.
3.  **UI/UX:** Kiểm tra giao diện trên cả màn hình rộng và thu nhỏ cửa sổ để đảm bảo Responsive, hiệu ứng mượt mà.
