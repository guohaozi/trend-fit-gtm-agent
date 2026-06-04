import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trend-Fit GTM Agent",
  description: "Product-trend fit scoring and GTM brief generator for portfolio demos."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand-mark" href="/">
              <span className="brand-symbol">TF</span>
              <span className="brand-copy">
                <strong>Trend-Fit GTM Agent</strong>
                <span>Product x trend decision layer</span>
              </span>
            </Link>
            <div className="topbar-actions">
              <Link className="secondary-action" href="/fit-score">
                Score demos
              </Link>
              <Link className="primary-action" href="/report">
                Open brief
              </Link>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
