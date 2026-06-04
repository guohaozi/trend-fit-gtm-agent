import Link from "next/link";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { DEMO_CASES, getDemoResult } from "@/lib/demo-cases";
import { formatBand, formatCategory, formatQualifier, RISK_LABELS } from "@/lib/display-labels";

export default function HomePage() {
  const featured = DEMO_CASES[0];
  const featuredResult = getDemoResult(featured.id);

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">作品集 MVP</p>
          <h1>判断一个产品，值不值得跟一个热点。</h1>
          <p className="header-copy">
            输入产品画像和候选热点，系统用固定评分契约判断适配度、品牌风险、内容角度和
            GTM 建议。现在已接入第一版证据修正评分层。
          </p>
        </div>
      </header>

      <section className="dashboard-grid" aria-label="仪表盘">
        <div className="demo-grid">
          {DEMO_CASES.map((demo) => {
            const result = getDemoResult(demo.id);
            const qualifier = formatQualifier(result.recommendation.qualifier);
            const label = result.recommendation.qualifier
              ? `${formatBand(result.recommendation.finalBand)} - ${qualifier}`
              : formatBand(result.recommendation.finalBand);
            return (
              <article className="demo-card" key={demo.id}>
                <div>
                  <p className="eyebrow">{formatCategory(demo.product.category)}</p>
                  <h2>{demo.product.name.replace(" (demo)", "")}</h2>
                  <p>{demo.trend.name}</p>
                </div>
                <div className="meta-grid">
                  <div className="meta-item">
                    <span>评分</span>
                    <strong>{result.total}/100</strong>
                  </div>
                  <div className="meta-item">
                    <span>判断</span>
                    <strong>{label}</strong>
                  </div>
                  <div className="meta-item">
                    <span>风险</span>
                    <strong>{RISK_LABELS[demo.product.riskTolerance]}</strong>
                  </div>
                </div>
                <Link className="text-action" href={`/fit-score?case=${demo.id}`}>
                  查看评分
                </Link>
              </article>
            );
          })}
        </div>

        <aside className="insight-panel">
          <p className="eyebrow">当前案例</p>
          <h2>{featured.product.name.replace(" (demo)", "")}</h2>
          <p>
            一个中端男装品牌，判断 quiet luxury 是否是自然的营销切入点，还是容易显得
            生硬、带有阶层意味的追热点。
          </p>
          <RecommendationCard result={featuredResult} />
          <Link className="primary-action" href={`/report?case=${featured.id}`}>
            阅读 GTM 简报
          </Link>
        </aside>
      </section>

      <div style={{ marginTop: 28 }}>
        <ScoreBreakdown scores={featured.scores} result={featuredResult} />
      </div>
    </div>
  );
}
