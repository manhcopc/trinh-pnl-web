import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Nếu có logic phân quyền phức tạp theo role (vd /admin chỉ cho role Admin) thì thêm ở đây.
    // Hiện tại chỉ cần có token là được qua.
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Chỉ cho phép đi tiếp nếu token tồn tại (user đã đăng nhập & có trong Master_Users)
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Bảo vệ toàn bộ ứng dụng ngoại trừ:
     * - Các API route của NextAuth (/api/auth/...)
     * - Trang đăng nhập (/login)
     * - Các file tĩnh (static, favicon, _next/...)
     */
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
