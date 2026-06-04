import { DIMENSION_META } from "@/lib/demo-cases";
import type { ScoringResult, Scores } from "@/lib/types";

type ScoreBreakdownProps = {
  scores: Scores;
  result: ScoringResult;
};

export function ScoreBreakdown({ scores, result }: ScoreBreakdownProps) {
  return (
    <section className="score-section" aria-label="评分拆解">
      <div className="section-heading">
        <p className="eyebrow">七维评分契约</p>
        <h2>评分拆解</h2>
      </div>
      <div className="score-list">
        {DIMENSION_META.map((dimension) => {
          const score = scores[dimension.key];
          return (
            <article className="score-row" key={dimension.key}>
              <div className="score-copy">
                <div className="score-title-line">
                  <h3>{dimension.label}</h3>
                  <span>{dimension.weightLabel}</span>
                </div>
                <p>{dimension.question}</p>
              </div>
              <div className="score-meter" aria-label={`${dimension.label}: ${score}`}>
                <div className="meter-track">
                  <span style={{ width: `${score}%` }} />
                </div>
                <strong>{score}</strong>
                <small>加权 {result.weightedScores[dimension.key].toFixed(2)}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
