import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EvidenceComparison } from "@/components/EvidenceComparison";
import { RigorSummary } from "@/components/RigorSummary";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ReportViewer } from "@/components/ReportViewer";
import {
  FEATURED_CASE_META,
  getDemoCase,
  getDemoResult,
  getEvidenceResult,
  getReportFileName,
  getReportMarkdown,
  isFeaturedCase
} from "@/lib/demo-cases";
import {
  BAND_LABELS,
  EVIDENCE_GATE_LABELS,
  formatBand,
  formatCategory,
  RISK_LABELS
} from "@/lib/display-labels";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return FEATURED_CASE_META.map((meta) => ({ id: meta.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isFeaturedCase(id)) return { title: "案例未找到 · Trend-Fit" };
  const meta = FEATURED_CASE_META.find((item) => item.id === id);
  return {
    title: `${meta?.title ?? "案例"} · Trend-Fit 案例`,
    description: meta?.note
  };
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!isFeaturedCase(id)) {
    notFound();
  }

  const demo = getDemoCase(id);
  const meta = FEATURED_CASE_META.find((item) => item.id === id)!;
  const baselineResult = getDemoResult(demo.id, demo.profileUsed);
  const evidence = getEvidenceResult(demo.id, demo.profileUsed);
  const markdown = getReportMarkdown(demo.id);

  if (!evidence) {
    notFound();
  }

  const { adjustedResult, adjustment, evidenceCase, rigor } = evidence;

  const productRows: Array<[string, string]> = [
    ["产品", demo.product.name.replace(" (demo)", "")],
    ["品类", formatCategory(demo.product.category)],
    ["目标市场", demo.product.targetMarket.join("、")],
    ["目标人群", demo.product.audience],
    ["定位", demo.product.positioning],
    ["核心卖点", demo.product.sellingPoints.join("、")],
    ["品牌调性", demo.product.brandTone],
    ["风险偏好", RISK_LABELS[demo.product.riskTolerance]]
  ];

  const trendRows: Array<[string, string]> = [
    ["热点", demo.trend.name],
    ["平台", demo.trend.platform],
    ["地区", demo.trend.region],
    ["流行原因", demo.trend.whyPopular],
    ["内容形式", demo.trend.format],
    ["已知争议", demo.trend.controversy]
  ];

  return (
    <div className="case-detail">
      <Link className="case-back-link" href="/cases">
        ← 返回案例展示
      </Link>

      <header className="case-detail-hero">
        <div className="case-detail-headline">
          <p className="cases-eyebrow">{meta.title}</p>
          <h1>{demo.product.name.replace(" (demo)", "")} 该不该追这波热点？</h1>
          <p className="case-detail-trend">
            产品 · {formatCategory(demo.product.category)} × 热点 · {demo.trend.name}
          </p>
          <p className="case-detail-note">{meta.note}</p>
        </div>

        <aside className="case-detail-verdict" aria-label="证据修正后的裁决">
          <span className="verdict-label">证据修正后</span>
          <strong className="verdict-score">{adjustedResult.total}</strong>
          <small className="verdict-scale">/ 100</small>
          <div className="verdict-meta">
            <div>
              <span>最终建议</span>
              <strong>{BAND_LABELS[rigor.gatedBand] ?? rigor.gatedBand}</strong>
            </div>
            <div>
              <span>证据门槛</span>
              <strong>{EVIDENCE_GATE_LABELS[rigor.evidenceGate] ?? rigor.evidenceGate}</strong>
            </div>
          </div>
          <p className="verdict-delta">
            基准分 {baselineResult.total} → 证据修正后 {adjustedResult.total}（
            {formatBand(baselineResult.recommendation.finalBand)} → {BAND_LABELS[rigor.gatedBand]}）
          </p>
        </aside>
      </header>

      <section className="case-detail-input" aria-label="评估输入">
        <div className="section-heading">
          <p className="eyebrow">评估输入</p>
          <h2>这次判断喂进去的产品与热点</h2>
        </div>
        <div className="case-input-grid">
          <div className="case-input-column">
            <h3>产品画像</h3>
            <dl>
              {productRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="case-input-column">
            <h3>候选热点</h3>
            <dl>
              {trendRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <RigorSummary title="证据修正后的实际结论" result={adjustedResult} rigor={rigor} />
      <ScoreBreakdown scores={demo.scores} result={baselineResult} />
      <EvidenceComparison
        evidenceCase={evidenceCase}
        adjustment={adjustment}
        baselineResult={baselineResult}
        adjustedResult={adjustedResult}
      />

      <div className="report-actions">
        <a className="primary-action" href={`/api/report/${demo.id}`}>
          下载 Markdown 简报
        </a>
        <span className="secondary-action">{getReportFileName(demo.id)}</span>
      </div>
      <ReportViewer markdown={markdown} />
    </div>
  );
}
