# Báo cáo Tái cấu trúc & Cải tiến Giao diện (Giai đoạn 2 & 3)

Tài liệu này tóm tắt những thay đổi chiến lược về mặt giao diện và trải nghiệm người dùng (UI/UX) đã được áp dụng cho ứng dụng quản lý P&L, biến nó từ một Dashboard cơ bản thành một ứng dụng SaaS chuyên nghiệp.

## 1. Tái cấu trúc Kiến trúc (Multi-page App Router)
Nhằm giải quyết vấn đề quá tải thông tin trên một màn hình duy nhất, ứng dụng đã được chia tách thành 3 tuyến đường (routes) riêng biệt:
- **Trang chủ (`/`):** Chỉ tập trung vào Tổng quan (Dashboard Summary) với 3 thẻ hiển thị Doanh Thu, Chi Phí và EBIT, mang lại cái nhìn toàn cảnh nhanh chóng.
- **Trang Nhập liệu (`/add`):** Môi trường "Focus mode" giúp nhân viên kế toán tập trung tối đa vào Form nhập liệu.
- **Trang Lịch sử (`/transactions`):** Cung cấp không gian tối đa (Full-width) cho bảng dữ liệu P&L, tránh tình trạng phải cuộn ngang quá nhiều.

Hệ thống điều hướng sử dụng `<Navigation />` với `next/link` đảm bảo Client-side routing, giúp chuyển trang ngay lập tức mà không cần tải lại (Zero-latency navigation). Trên máy tính, nó hiển thị như một **Sidebar** bên trái, còn trên điện thoại sẽ tự động biến thành **Bottom Bar** (Thanh điều hướng dưới đáy màn hình) tương tự các app ngân hàng.

## 2. Nâng cấp Ngôn ngữ Thiết kế (Visual Overhaul)
Đã xóa bỏ hoàn toàn giao diện Dark Mode u tối, thay thế bằng phong cách thiết kế **hiện đại, trẻ trung, tươi sáng** chuẩn nhận diện thương hiệu "Trình Blue":

### Màu sắc (Color Palette)
- Chuyển sang nền sáng (Trắng pha kem ánh xanh `#F5FCFF`) làm nổi bật các thành phần nội dung.
- Màu chủ đạo là Xanh dương Trình Blue (`#05AFF2`), được dùng cho các nút bấm, icon, và Lợi nhuận (EBIT).
- Màu nhấn (Nâu, Vàng Caramel, Xanh lá) được dùng để cân bằng và giữ lại bản sắc thương hiệu F&B.

### Kiểu chữ (Typography)
- Hệ thống Hierarchy rõ ràng nhờ kết hợp 3 font từ Google Fonts:
  - **Montserrat:** Dùng cho tiêu đề (`h1`->`h6`), tạo sự vững chãi, hiện đại.
  - **Outfit:** Dùng cho văn bản và các con số tài chính, rất thân thiện và dễ đọc.
  - **Dancing Script:** Dùng riêng cho câu Slogan (*Sống tươi mỗi ngày*) tạo điểm nhấn nghệ thuật.

### Phong cách Kính mờ (Glassmorphism)
- Các khối nội dung (Glass Panels, Forms, Cards) được thiết kế dạng kính mờ: sử dụng nền trắng bán trong suốt `rgba(255, 255, 255, 0.7)` và hiệu ứng làm mờ `backdrop-filter: blur(20px)`.
- Kết hợp với bóng đổ ánh xanh (Blueish Shadow) tạo chiều sâu không gian (3D depth) tinh tế thay vì dùng bóng đen nặng nề.

### Vi hiệu ứng (Micro-animations)
- Các nút bấm hình viên thuốc (Pill-shaped `border-radius: 50px`) có hiệu ứng nảy lên (TranslateY) khi hover.
- Bổ sung các animation như `wingFlap` (Icon điều hướng vỗ cánh khi hover), `pulse-slow`, `float-slow` giúp giao diện trở nên sống động, tương tác và "có hồn" hơn.

## 3. Sửa lỗi (Bug Fixes)
- Khắc phục lỗi trong Bảng Lịch sử giao dịch (PnLTable): Hệ thống cũ chỉ nhận diện `type === 'revenue'` là Doanh thu, khiến các bản ghi có type là `Thu` (tiếng Việt từ Master Data) bị tính và hiển thị nhầm dưới dạng Chi phí (mang dấu trừ đỏ). Lỗi này đã được xử lý triệt để.
