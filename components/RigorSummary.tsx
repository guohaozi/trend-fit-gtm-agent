import {
  DECISION_TYPE_LABELS,
  EVIDENCE_GATE_LABELS,
  formatBand,
  STABILITY_LABELS
} from "@/lib/display-labels";
import type { GatedRecommendation } from "@/lib/recommendation-rigor";
import type { ScoringResult } from "@/lib/types";

type RigorSummaryProps = {
  title?: string;
  result: ScoringResult;
  rigor: GatedRecommendation;
};

const FIELD_LABELS: Record<string, string> = {
  audienceOverlap: "受众重合度",
  useCaseRelevance: "使用场景相关性",
  messageBridge: "卖点桥接",
  creativeFeasibility: "内容可执行性",
  commercialIntent: "商业意图",
  brandSafety: "品牌安全",
  timingSaturation: "时机与饱和度",
  audienceOrUseCase: "受众或使用场景"
};

function formatList(values: string[]): string {
  if (values.length === 0) return "无";
  return values.map((value) => FIELD_LABELS[value] ?? value).join("、");
}

export function RigorSummary({ title = "实际可站台结论", result, rigor }: RigorSummaryProps) {
  return (
    <section className="evidence-panel" aria-label="证据门槛与实际建议">
      <div className="section-heading">
        <p className="eyebrow">v1.2 严谨层</p>
        <h2>{title}</h2>
        <p>
          原始总分仍保留为分析主张；证据门槛、来源等级和稳定性决定这个结论是否能被升级为真正的 Strong Go。
        </p>
      </div>

      <div className="evidence-summary-grid">
        <div className="evidence-summary-item">
          <span>原始结论</span>
          <strong>{result.total}/100</strong>
          <small>{formatBand(result.recommendation.finalBand)}</small>
        </div>
        <div className="evidence-summary-item">
          <span>门槛后结论</span>
          <strong>{formatBand(rigor.gatedBand)}</strong>
          <small>{EVIDENCE_GATE_LABELS[rigor.evidenceGate]}</small>
        </div>
        <div className="evidence-summary-item">
          <span>实际动作</span>
          <strong>{DECISION_TYPE_LABELS[rigor.decisionType]}</strong>
          <small>{STABILITY_LABELS[rigor.recommendationStability]}</small>
        </div>
      </div>

      <div className="rigor-notes">
        <p>
          <strong>权重 profile：</strong>
          {rigor.profileUsed}
        </p>
        <p>
          <strong>缺失证据：</strong>
          {formatList(rigor.gateMissing)}
        </p>
        <p>
          <strong>高分但缺非 proxy 证据：</strong>
          {formatList(rigor.dimensionCaps)}
        </p>
        <p>
          <strong>下一步验证：</strong>
          {rigor.nextValidationAction}
        </p>
      </div>
    </section>
  );
}
