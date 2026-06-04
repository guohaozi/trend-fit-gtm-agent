import type { ScoringResult } from "@/lib/types";

type RecommendationCardProps = {
  result: ScoringResult;
};

export function RecommendationCard({ result }: RecommendationCardProps) {
  const { recommendation } = result;
  const label = recommendation.qualifier
    ? `${recommendation.finalBand} - ${recommendation.qualifier}`
    : recommendation.finalBand;

  return (
    <section className="recommendation-band" aria-label="Recommendation">
      <div>
        <p className="eyebrow">Recommendation</p>
        <h2>{label}</h2>
        <p>
          Raw score {result.totalRaw.toFixed(2)} rounds to {result.total}/100. Logic uses
          the final band; qualifier is display-only.
        </p>
      </div>
      <div className="score-dial" aria-label={`Total score ${result.total} out of 100`}>
        <span>{result.total}</span>
        <small>/100</small>
      </div>
      {recommendation.overrideReason ? (
        <p className="override-note">{recommendation.overrideReason}</p>
      ) : null}
    </section>
  );
}
