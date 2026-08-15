# Kế hoạch Tái cấu trúc Giao diện P&L (Multi-page Architecture)

Dựa trên quyết định sử dụng phương án chia nhỏ thành 3 trang với thanh điều hướng (Sidebar/Bottom Bar), dưới đây là bản thiết kế chi tiết (Design) và kế hoạch triển khai.

## 1. Nhật ký Quyết định (Decision Log)
- **Quyết định:** Chuyển từ kiến trúc Single-page (Tất cả trong 1) sang Multi-page với Next.js App Router.
- **Phương án thay thế đã loại bỏ:** Dùng Tabs (giữ nguyên 1 trang) và Dùng Drawer trượt.
- **Lý do chọn:** Phương pháp chia trang giải quyết triệt để vấn đề quá tải thông tin và phải cuộn trang quá dài trên thiết bị di động (Mobile-first). Nó cô lập hoàn toàn môi trường nhập liệu, giúp nhân viên tập trung cao độ, đồng thời giải phóng không gian màn hình tối đa để hiển thị bảng dữ liệu lịch sử.

---

## 2. Thiết kế Kiến trúc (Architecture & Routing)

Ứng dụng sẽ được chia làm 3 tuyến đường (routes) chính:

1. **`/` (Trang Chủ / Dashboard):** Chỉ hiển thị các Thẻ Tổng quan (Doanh thu, Chi phí, Lợi nhuận).
2. **`/add` (Nhập liệu):** Dành riêng cho form `AddRecordForm`.
3. **`/transactions` (Lịch sử):** Dành riêng cho bảng `PnLTable`.

### Layout & Navigation (`app/layout.js` & `app/components/Navigation.js`)
- Tạo một component `Navigation` dùng chung.
- **Trên Desktop (`min-width: 768px`):** Hiển thị dưới dạng **Sidebar** (Cột bên trái), cố định. Phần nội dung chính (Main Content) nằm bên phải.
- **Trên Mobile (`max-width: 767px`):** Chuyển đổi thành **Bottom Bar** (Thanh điều hướng dưới cùng màn hình) giống thiết kế của các app ngân hàng/ví điện tử.

---

## 3. Chi tiết Thay đổi Cấu trúc (Proposed Changes)

### Cập nhật UI & Layout Khung (Shell)

#### [NEW] `app/components/Navigation.js`
- Chứa 3 nút liên kết (Link) tới 3 trang với các SVG icon tương ứng (Home, Plus, List).
- Sử dụng `usePathname` từ `next/navigation` để làm nổi bật (active) tab hiện tại.

#### [MODIFY] `app/globals.css`
- Bổ sung cấu trúc Grid cho App Layout (`.app-layout`).
- Thêm CSS cho `.sidebar` và các hiệu ứng hover, active của `.nav-item`.
- Cập nhật Responsive Media Query để chuyển `.sidebar` thành thanh điều hướng nằm ngang bám đáy màn hình trên Mobile.

#### [MODIFY] `app/layout.js`
- Bọc toàn bộ `{children}` bên trong cấu trúc layout mới chứa `<Navigation />`.

### Chia tách chức năng (Pages)

#### [MODIFY] `app/page.js`
- Xóa bỏ Form và Bảng.
- Chỉ giữ lại logic fetch API và hiển thị 3 Thẻ Summary Cards (Doanh thu, Chi phí, Lợi nhuận) cùng trạng thái Loading/Error Skeleton tương ứng.

#### [NEW] `app/add/page.js`
- Tạo trang mới, import `AddRecordForm`.
- Giao diện cô đọng, loại bỏ việc fetch dữ liệu không cần thiết (chỉ cần POST dữ liệu).
- Giữ nguyên hiệu ứng Success Toast khi thêm thành công.

#### [NEW] `app/transactions/page.js`
- Tạo trang mới, import `PnLTable`.
- Fetch API để lấy `data.records` và truyền vào bảng.
- Bảng giờ đây sẽ được tận dụng tối đa chiều rộng của màn hình.

---

## 4. Verification Plan

### Manual Verification
1. Kiểm tra trên màn hình lớn (Desktop) xem Sidebar có hiển thị đúng và phần nội dung có nằm bên phải hay không.
2. Dùng tính năng Responsive của DevTools thu nhỏ về màn hình điện thoại (iPhone) để kiểm tra xem thanh điều hướng có chuyển xuống dưới cùng (Bottom Bar) không.
3. Click qua lại giữa các trang để đảm bảo Next.js Client-side routing hoạt động mượt mà (không load lại cả trang).
4. Thử nhập một giao dịch ở `/add`, sau đó chuyển sang `/transactions` và `/` để kiểm tra dữ liệu có được cập nhật đúng hay không.
