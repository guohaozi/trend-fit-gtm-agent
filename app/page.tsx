import Link from "next/link";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { DEMO_CASES, getDemoResult } from "@/lib/demo-cases";

export default function HomePage() {
  const featured = DEMO_CASES[0];
  const featuredResult = getDemoResult(featured.id);

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">Portfolio MVP</p>
          <h1>Decide whether a product should ride a trend.</h1>
          <p className="header-copy">
            This app turns a product profile and manual trend input into a deterministic
            Trend-Product Fit score, risk guidance, creator direction, and a GTM brief.
          </p>
        </div>
      </header>

      <section className="dashboard-grid" aria-label="Dashboard">
        <div className="demo-grid">
          {DEMO_CASES.map((demo) => {
            const result = getDemoResult(demo.id);
            const label = result.recommendation.qualifier
              ? `${result.recommendation.finalBand} - ${result.recommendation.qualifier}`
              : result.recommendation.finalBand;
            return (
              <article className="demo-card" key={demo.id}>
                <div>
                  <p className="eyebrow">{demo.product.category}</p>
                  <h2>{demo.product.name.replace(" (demo)", "")}</h2>
                  <p>{demo.trend.name}</p>
                </div>
                <div className="meta-grid">
                  <div className="meta-item">
                    <span>Score</span>
                    <strong>{result.total}/100</strong>
                  </div>
                  <div className="meta-item">
                    <span>Decision</span>
                    <strong>{label}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Risk</span>
                    <strong>{demo.product.riskTolerance}</strong>
                  </div>
                </div>
                <Link className="text-action" href={`/fit-score?case=${demo.id}`}>
                  Inspect score
                </Link>
              </article>
            );
          })}
        </div>

        <aside className="insight-panel">
          <p className="eyebrow">Current case</p>
          <h2>{featured.product.name.replace(" (demo)", "")}</h2>
          <p>
            A mid-range menswear brand evaluating whether quiet luxury is an honest
            campaign lane or a forced class-coded trend grab.
          </p>
          <RecommendationCard result={featuredResult} />
          <Link className="primary-action" href={`/report?case=${featured.id}`}>
            Read GTM brief
          </Link>
        </aside>
      </section>

      <div style={{ marginTop: 28 }}>
        <ScoreBreakdown scores={featured.scores} result={featuredResult} />
      </div>
    </div>
  );
}
