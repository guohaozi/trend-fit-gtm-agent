import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trend-Fit GTM Agent",
  description: "用于判断产品是否适合跟进热点的 GTM 策略分析工具。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand-mark" href="/">
              <span className="brand-symbol">TF</span>
              <span className="brand-copy">
                <strong>Trend-Fit GTM Agent</strong>
                <span>产品 × 热点适配决策层</span>
              </span>
            </Link>
            <div className="topbar-actions">
              <Link className="secondary-action" href="/workspace">
                开始评估
              </Link>
              <Link className="secondary-action" href="/fit-score">
                查看评分
              </Link>
              <Link className="primary-action" href="/report">
                打开简报
              </Link>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
