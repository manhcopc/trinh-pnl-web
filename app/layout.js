import "./globals.css";

export const metadata = {
  title: "P&L Dashboard",
  description: "Profit & Loss Management Dashboard",
};

import Navigation from './components/Navigation';
import AuthProvider from './components/AuthProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-layout">
            <Navigation />
            <main className="main-content">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
