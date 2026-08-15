import "./globals.css";

export const metadata = {
  title: "P&L Dashboard",
  description: "Profit & Loss Management Dashboard",
};

import Navigation from './components/Navigation';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Navigation />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
