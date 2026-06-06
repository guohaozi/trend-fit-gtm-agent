import { DIMENSION_META } from "@/lib/demo-cases";
import {
  CONFIDENCE_LABELS,
  formatBand,
  SOURCE_CONFIDENCE_LABELS,
  SOURCE_TIER_LABELS
} from "@/lib/display-labels";
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
    <section className="evidence-panel" aria-label="证据修正评分">
      <div className="section-heading">
        <p className="eyebrow">证据修正评分</p>
        <h2>基线分 vs. 证据分</h2>
        <p>
          冻结 demo 分数保持为基线；真实来源只允许推动锚点维度，再交给同一个评分函数重新计算。
        </p>
      </div>

      <div className="evidence-summary-grid">
        <div className="evidence-summary-item">
          <span>基线分</span>
          <strong>{baselineResult.total}/100</strong>
          <small>{formatBand(baselineResult.recommendation.finalBand)}</small>
        </div>
        <div className="evidence-summary-item">
          <span>证据修正后</span>
          <strong>{adjustedResult.total}/100</strong>
          <small>{formatBand(adjustedResult.recommendation.finalBand)}</small>
        </div>
        <div className="evidence-summary-item">
          <span>调研日期</span>
          <strong>{evidenceCase.researchDate}</strong>
          <small>{evidenceCase.evidence.length} 条证据</small>
        </div>
      </div>

      <div className="table-wrap">
        <table className="evidence-table">
          <thead>
            <tr>
              <th>维度</th>
              <th>基线</th>
              <th>修正后</th>
              <th>变化</th>
              <th>置信度</th>
              <th>加权</th>
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
                    <small>{Math.round(adjustedResult.weights[dimension.key] * 100)}%</small>
                  </td>
                  <td>{baseline}</td>
                  <td>{adjusted}</td>
                  <td>{formatDelta(delta)}</td>
                  <td>{CONFIDENCE_LABELS[adjustment.confidenceByDimension[dimension.key]]}</td>
                  <td>{(adjusted * adjustedResult.weights[dimension.key]).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="source-list">
        <h3>证据来源</h3>
        <ul>
          {uniqueSources.map((item) => (
            <li key={item.sourceUrl}>
              <a href={item.sourceUrl}>{item.sourceUrl}</a>
              <span>
                {SOURCE_TIER_LABELS[item.sourceTier]} / {SOURCE_CONFIDENCE_LABELS[item.confidence]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
