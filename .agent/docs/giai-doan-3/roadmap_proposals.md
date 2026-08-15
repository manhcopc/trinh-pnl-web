# Lộ Trình Phát Triển Hệ Thống P&L Dashboard
*(Được tổng hợp và phân tích dựa trên bản đánh giá hệ thống)*

Dựa trên những nhận định chiến lược từ bản đánh giá của bạn, dưới đây là đề xuất lộ trình nâng cấp hệ thống (Product Roadmap) được chia theo từng giai đoạn ưu tiên, nhằm đảm bảo hệ thống vừa đáp ứng được nhu cầu tức thời, vừa sẵn sàng mở rộng (scale) trong tương lai.

---

## 🚀 Giai Đoạn 1: Hoàn Thiện Trải Nghiệm & Độ Tin Cậy (Ngắn hạn)
*Mục tiêu: Tối đa hóa giá trị của dữ liệu hiện tại, tăng độ tin cậy cho người xem báo cáo.*

1. **Drill-down Liên Module (Truy vết số liệu)**
   - **Mô tả:** Cho phép click vào một con số tổng (VD: Chi phí NVL tháng 6) trên trang Báo cáo để nhảy thẳng sang trang Lịch sử Giao dịch với các bộ lọc tương ứng đã được áp dụng.
   - **Giá trị:** Tăng tính minh bạch. Người dùng tự kiểm chứng được "con số này từ những hóa đơn nào cộng lại" mà không cần chuyển trang và lọc lại từ đầu bằng tay.

2. **Chức Năng Export Báo Cáo (PDF / Excel)**
   - **Mô tả:** Thêm nút "Xuất Báo Cáo" ở góc màn hình Report.
   - **Giá trị:** Phục vụ lưu trữ hồ sơ kế toán cứng, báo cáo cổ đông hoặc đối chiếu định kỳ. Chi phí triển khai thấp (sử dụng thư viện `xlsx` hoặc `html2pdf`).

---

## 📈 Giai Đoạn 2: Quản Trị Mục Tiêu & Cảnh Báo (Trung hạn)
*Mục tiêu: Chuyển đổi hệ thống từ "Công cụ thống kê" sang "Công cụ phân tích và cảnh báo chủ động".*

1. **Module Ngân Sách (Budget vs Actual)**
   - **Mô tả:** Bổ sung một sheet "Kế Hoạch Ngân Sách" để kế toán nhập định mức cho từng hạng mục chi phí của từng cơ sở theo tháng.
   - **Giá trị:** Trả lời được câu hỏi "Chi 10 triệu cho Marketing là tốt hay xấu?". Hệ thống sẽ hiển thị tỷ lệ hoàn thành ngân sách, làm nổi bật (màu đỏ) các khoản chi vượt định mức.

2. **Hệ Thống Cảnh Báo Tự Động (Auto-Alerts)**
   - **Mô tả:** Thiết lập quy tắc cảnh báo (VD: Chi phí một hạng mục tăng đột biến >20% so với trung bình 3 tháng trước).
   - **Giá trị:** Giúp chủ đầu tư phát hiện ngay các lỗ hổng chi phí (như lãng phí nguyên vật liệu, tiền điện tăng bất thường) mà không cần phải chủ động dò tìm từng dòng.

3. **Phân Quyền Truy Cập (Role-based Access Control)**
   - **Mô tả:** Phân chia User/Password theo cơ sở. Quản lý chi nhánh nào chỉ được xem dữ liệu của chi nhánh đó. Quản lý cấp cao được xem toàn hệ thống.
   - **Giá trị:** Bảo mật thông tin tài chính nhạy cảm giữa các chi nhánh, đồng thời cho phép quản lý cơ sở chủ động theo dõi P&L của mình.

---

## 🏗️ Giai Đoạn 3: Tái Cấu Trúc Kiến Trúc Dữ Liệu (Dài hạn)
*Mục tiêu: Giải quyết bài toán phình to dữ liệu (Scale) và giới hạn Quota API.*

1. **Thiết lập "Ngưỡng Chuyển Đổi" (Threshold)**
   - Chấp nhận dùng Google Sheets ở hiện tại, nhưng đặt mốc: **Khi hệ thống đạt > 10.000 dòng dữ liệu hoặc có > 5 người thao tác đồng thời**, sẽ bắt buộc chuyển đổi.

2. **Kiến Trúc Database Lai (Hybrid Architecture)**
   - **Mô tả:** Chuyển đổi lõi cơ sở dữ liệu sang một Relational Database thật (PostgreSQL / MySQL) có Index và Transaction an toàn.
   - **Workflow mới:** Google Sheets chỉ còn đóng vai trò là "Giao diện nhập liệu" (Input Layer) cho kế toán. Một webhook (Apps Script) sẽ tự động đồng bộ 1 chiều dữ liệu từ Sheets sang PostgreSQL.
   - **Giá trị:** Tận dụng được sự quen thuộc của Sheets cho kế toán, nhưng App Report sẽ query thẳng vào PostgreSQL tốc độ cao, né hoàn toàn giới hạn Quota của Google.

3. **Dịch chuyển Aggregation về Server-side**
   - **Mô tả:** Thay vì tải toàn bộ hàng chục ngàn giao dịch về trình duyệt và dùng `useMemo` để cộng dồn, hệ thống sẽ xây dựng các API endpoint dạng `/api/analytics?group_by=branch,month`.
   - **Giá trị:** Tiết kiệm RAM và CPU của thiết bị người dùng (nhất là trên điện thoại), đảm bảo tốc độ load báo cáo luôn ở mức mili-giây dù dữ liệu có lớn đến đâu.

---

> [!NOTE]
> **Đánh giá rủi ro Bảo Mật (Xác minh hiện tại):**
> Về vấn đề bạn lo ngại *"credentials có bị lộ trong bundle client không"*, hệ thống của chúng ta hiện đã an toàn. Tất cả giao tiếp với Google Sheets đều được thực hiện qua **API Route của Next.js (Server-side)** (`/api/pnl`). Thông tin Service Account Key nằm an toàn trong biến môi trường `.env` trên Server, hoàn toàn không bị rò rỉ xuống trình duyệt.
