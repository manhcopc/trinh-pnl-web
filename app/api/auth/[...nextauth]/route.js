import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserByEmail } from "@/lib/googleSheetsHelper";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        const dbUser = await getUserByEmail(user.email);
        
        // Block sign in if email is not in Master_Users
        if (!dbUser) {
          return "/login?error=AccessDenied"; // Redirect to login page with error
        }
        
        // Allow sign in
        return true;
      }
      return false;
    },
    async jwt({ token, user, account }) {
      // Khi user vừa đăng nhập thành công (chỉ chạy 1 lần)
      if (user) {
        // Fetch lại role từ DB để nhúng vào token
        const dbUser = await getUserByEmail(user.email);
        if (dbUser) {
          token.role = dbUser.role;
          token.branch = dbUser.branch;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Đẩy role và branch từ token ra session (Client có thể đọc được)
      if (session.user) {
        session.user.role = token.role;
        session.user.branch = token.branch;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
