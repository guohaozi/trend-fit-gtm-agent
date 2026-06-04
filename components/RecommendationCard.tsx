import type { ScoringResult } from "@/lib/types";
import { formatBand, formatQualifier } from "@/lib/display-labels";

type RecommendationCardProps = {
  result: ScoringResult;
};

export function RecommendationCard({ result }: RecommendationCardProps) {
  const { recommendation } = result;
  const qualifier = formatQualifier(recommendation.qualifier);
  const label = recommendation.qualifier
    ? `${formatBand(recommendation.finalBand)} - ${qualifier}`
    : formatBand(recommendation.finalBand);

  return (
    <section className="recommendation-band" aria-label="推荐结论">
      <div>
        <p className="eyebrow">推荐结论</p>
        <h2>{label}</h2>
        <p>
          原始加权分 {result.totalRaw.toFixed(2)}，展示为 {result.total}/100。业务逻辑使用最终判断档位，
          补充短语只作为展示说明。
        </p>
      </div>
      <div className="score-dial" aria-label={`总分 ${result.total} / 100`}>
        <span>{result.total}</span>
        <small>/100</small>
      </div>
      {recommendation.overrideReason ? (
        <p className="override-note">{recommendation.overrideReason}</p>
      ) : null}
    </section>
  );
}
