import { DIMENSION_META } from "@/lib/demo-cases";
import { WEIGHTS } from "@/lib/scoring";
import type { EvidenceAdjustment, EvidenceAdjustmentCase } from "@/lib/evidence-adjustment";
import type { ScoringResult } from "@/lib/types";

type EvidenceComparisonProps = {
  evidenceCase: EvidenceAdjustmentCase;
  adjustment: EvidenceAdjustment;
  baselineResult: ScoringResult;
  adjustedResult: ScoringResult;
};

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function EvidenceComparison({
  evidenceCase,
  adjustment,
  baselineResult,
  adjustedResult
}: EvidenceComparisonProps) {
  const uniqueSources = Array.from(
    new Map(evidenceCase.evidence.map((item) => [item.sourceUrl, item])).values()
  );

  return (
    <section className="evidence-panel" aria-label="Evidence adjusted scoring">
      <div className="section-heading">
        <p className="eyebrow">Evidence-adjusted scoring</p>
        <h2>Baseline vs. Evidence</h2>
        <p>
          The frozen demo score stays intact, then sourced evidence shifts only anchored
          dimensions before the same scoring function runs again.
        </p>
      </div>

      <div className="evidence-summary-grid">
        <div className="evidence-summary-item">
          <span>Baseline</span>
          <strong>{baselineResult.total}/100</strong>
          <small>{baselineResult.recommendation.finalBand}</small>
        </div>
        <div className="evidence-summary-item">
          <span>Evidence-adjusted</span>
          <strong>{adjustedResult.total}/100</strong>
          <small>{adjustedResult.recommendation.finalBand}</small>
        </div>
        <div className="evidence-summary-item">
          <span>Research date</span>
          <strong>{evidenceCase.researchDate}</strong>
          <small>{evidenceCase.evidence.length} evidence items</small>
        </div>
      </div>

      <div className="table-wrap">
        <table className="evidence-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Base</th>
              <th>Adjusted</th>
              <th>Delta</th>
              <th>Confidence</th>
              <th>Weighted</th>
            </tr>
          </thead>
          <tbody>
            {DIMENSION_META.map((dimension) => {
              const baseline = evidenceCase.baselineScores[dimension.key];
              const adjusted = adjustment.adjusted[dimension.key];
              const delta = adjusted - baseline;
              return (
                <tr key={dimension.key}>
                  <td>
                    <strong>{dimension.label}</strong>
                    <small>{dimension.weightLabel}</small>
                  </td>
                  <td>{baseline}</td>
                  <td>{adjusted}</td>
                  <td>{formatDelta(delta)}</td>
                  <td>{adjustment.confidenceByDimension[dimension.key]}</td>
                  <td>{(adjusted * WEIGHTS[dimension.key]).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="source-list">
        <h3>Sources</h3>
        <ul>
          {uniqueSources.map((item) => (
            <li key={item.sourceUrl}>
              <a href={item.sourceUrl}>{item.sourceUrl}</a>
              <span>
                {item.sourceTier} / {item.confidence}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
