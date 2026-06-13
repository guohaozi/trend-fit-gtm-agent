import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Trend-Fit 热点决策",
  description: "用于判断产品是否适合跟进热点的 GTM 策略分析工具。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${fraunces.variable} ${plexMono.variable}`}>
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand-mark" href="/">
              <span className="brand-symbol">TF</span>
              <span className="brand-copy">
                <strong>Trend-Fit 热点决策</strong>
                <span>产品 × 热点适配决策层</span>
              </span>
            </Link>
            <div className="topbar-actions">
              <Link className="secondary-action" href="/cases">
                案例展示
              </Link>
              <Link className="primary-action" href="/evaluate">
                开始评估
              </Link>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
