import fs from "node:fs";
import path from "node:path";
import {
  BAND_LABELS,
  CONFIDENCE_LABELS,
  DECISION_TYPE_LABELS,
  EVIDENCE_GATE_LABELS,
  SOURCE_CONFIDENCE_LABELS,
  SOURCE_TIER_LABELS,
  STABILITY_LABELS
} from "./display-labels";
import { orchestrateEvidenceCase, type OrchestrateEvidenceCaseInput } from "./evidence-case-orchestrator";
import type { EvidenceAdjustmentCase, EvidenceDirection, EvidenceMagnitude } from "./evidence-adjustment";
import type { EvidenceCandidate } from "./evidence-collector";
import { SCORE_KEYS, type ScoreKey } from "./types";

export type EvidenceCaseReportInput = {
  title?: string;
  productName?: string;
  trendName?: string;
  recommendation?: string;
  nextEvidence?: string[];
};

export type EvidenceCaseCliInput = OrchestrateEvidenceCaseInput & {
  report?: EvidenceCaseReportInput;
  output?: {
    dataDir?: string;
    outputDir?: string;
    evidenceFileName?: string;
    reportFileName?: string;
  };
};

export type EvidenceCaseFileWriterOptions = {
  dataDir?: string;
  outputDir?: string;
  evidenceFileName?: string;
  reportFileName?: string;
};

export type EvidenceCaseFileWriterResult = {
  evidenceCase: EvidenceAdjustmentCase;
  evidencePath: string;
  reportPath: string;
  candidateCount: number;
  evidenceCount: number;
  droppedCount: number;
};

const DIMENSION_LABELS: Record<ScoreKey, string> = {
  audienceOverlap: "受众重合度",
  useCaseRelevance: "使用场景相关性",
  messageBridge: "卖点桥接",
  creativeFeasibility: "内容可执行性",
  commercialIntent: "商业意图",
  brandSafety: "品牌安全",
  timingSaturation: "时机与饱和度"
};

const DIRECTION_LABELS: Record<EvidenceDirection, string> = {
  confirm: "确认",
  up: "上调",
  down: "下调"
};

const MAGNITUDE_LABELS: Record<EvidenceMagnitude, string> = {
  weak: "弱",
  moderate: "中",
  strong: "强"
};

function confidenceLabel(value: string): string {
  return CONFIDENCE_LABELS[value] ?? SOURCE_CONFIDENCE_LABELS[value] ?? value;
}

function formatSlots(values: string[] | undefined): string {
  if (!values || values.length === 0) return "无";
  return values.map((value) => DIMENSION_LABELS[value as ScoreKey] ?? (value === "audienceOrUseCase" ? "受众或使用场景" : value)).join("、");
}

function safeBaseName(value: string): string {
  const safe = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return safe || "evidence_case";
}

function resolveOutputPath(dir: string, fileName: string): string {
  return path.resolve(dir, fileName);
}

function defaultReportTitle(input: EvidenceCaseCliInput): string {
  if (input.report?.title) return input.report.title;
  if (input.report?.productName && input.report?.trendName) {
    return `${input.report.productName} x ${input.report.trendName}`;
  }
  return input.caseId;
}

function evidenceByDimension(evidenceCase: EvidenceAdjustmentCase): Record<ScoreKey, EvidenceAdjustmentCase["evidence"]> {
  const grouped = {} as Record<ScoreKey, EvidenceAdjustmentCase["evidence"]>;
  for (const key of SCORE_KEYS) grouped[key] = [];
  for (const item of evidenceCase.evidence) {
    grouped[item.dimension].push(item);
  }
  return grouped;
}

function formatEvidenceBullets(items: EvidenceAdjustmentCase["evidence"]): string {
  if (items.length === 0) return "- 这个维度暂时还没有可计入评分的证据。";
  return items
    .map((item) => {
      return [
        `- **${item.id}** — ${SOURCE_TIER_LABELS[item.sourceTier] ?? item.sourceTier}，${SOURCE_CONFIDENCE_LABELS[item.confidence] ?? item.confidence}，${DIRECTION_LABELS[item.direction]} / ${MAGNITUDE_LABELS[item.magnitude]}。`,
        `  说明：${item.note}`,
        `  来源：${item.sourceUrl}`
      ].join("\n");
    })
    .join("\n");
}

export function renderEvidenceCaseMarkdown(
  input: EvidenceCaseCliInput,
  evidenceCase: EvidenceAdjustmentCase,
  candidates: EvidenceCandidate[],
  droppedCount: number
): string {
  const title = defaultReportTitle(input);
  const grouped = evidenceByDimension(evidenceCase);
  const nextEvidence = input.report?.nextEvidence ?? [
    "补充来自评论、评价、访谈或社区讨论的真实用户语言。",
    "补充 Google Trends、SEO 或站内搜索数据，用来判断时机和购买意图。",
    "补充竞品营销活动、评价、价格和负面反馈证据，用来判断饱和度与风险。"
  ];

  const lines = [
    `# 证据简报：${title}`,
    "",
    "## 核心结论",
    "",
    `评分模型：**${evidenceCase.profileUsed ?? "默认"}**。`,
    `证据修正后判断：**${evidenceCase.expectedAdjustedTotal} / ${BAND_LABELS[evidenceCase.expectedAdjustedBand] ?? evidenceCase.expectedAdjustedBand}**。`,
    `证据门槛后建议：**${BAND_LABELS[evidenceCase.expectedGatedBand ?? evidenceCase.expectedAdjustedBand] ?? evidenceCase.expectedGatedBand ?? evidenceCase.expectedAdjustedBand}**，稳定性：**${STABILITY_LABELS[evidenceCase.expectedStability ?? ""] ?? "未知"}**。`,
    `建议动作：**${DECISION_TYPE_LABELS[evidenceCase.expectedDecisionType ?? ""] ?? "未知"}**。`,
    "",
    input.report?.recommendation ?? "先把这份简报作为证据化初判，再用更强的本地和渠道证据继续校准。",
    "",
    "## 采集概况",
    "",
    `- 候选证据数：**${candidates.length}**`,
    `- 来源分级后可计入评分的证据：**${evidenceCase.evidence.length}**`,
    `- 被来源分级规则丢弃的候选：**${droppedCount}**`,
    `- 使用工具：${evidenceCase.tooling}`,
    "",
    "## 评分变化",
    "",
    "| 维度 | 基准分 | 证据修正后 | 置信状态 |",
    "|------|--------|------------|----------|",
    ...SCORE_KEYS.map((key) => {
      return `| ${DIMENSION_LABELS[key]} | ${evidenceCase.baselineScores[key]} | ${evidenceCase.expectedAdjustedScores[key]} | ${confidenceLabel(evidenceCase.expectedDimensionConfidence[key])} |`;
    }),
    "",
    "## 证据明细",
    "",
    ...SCORE_KEYS.flatMap((key) => [`### ${DIMENSION_LABELS[key]}`, "", formatEvidenceBullets(grouped[key]), ""]),
    "## 严谨层检查",
    "",
    `- 证据门槛：**${EVIDENCE_GATE_LABELS[evidenceCase.expectedEvidenceGate ?? ""] ?? "未知"}**`,
    `- 门槛后档位：**${BAND_LABELS[evidenceCase.expectedGatedBand ?? evidenceCase.expectedAdjustedBand] ?? evidenceCase.expectedGatedBand ?? evidenceCase.expectedAdjustedBand}**`,
    `- 缺失的门槛证据：${formatSlots(evidenceCase.expectedGateMissing)}`,
    `- 高分但证据不足的维度：${formatSlots(evidenceCase.expectedDimensionCaps)}`,
    `- 稳定性：**${STABILITY_LABELS[evidenceCase.expectedStability ?? ""] ?? "未知"}**`,
    `- 建议动作：**${DECISION_TYPE_LABELS[evidenceCase.expectedDecisionType ?? ""] ?? "未知"}**`,
    "",
    "## 下一步要补的证据",
    "",
    ...nextEvidence.map((item, index) => `${index + 1}. ${item}`),
    ""
  ];

  return lines.join("\n");
}

export function writeEvidenceCaseFiles(
  input: EvidenceCaseCliInput,
  options: EvidenceCaseFileWriterOptions = {}
): EvidenceCaseFileWriterResult {
  const orchestration = orchestrateEvidenceCase(input);
  const dataDir = options.dataDir ?? input.output?.dataDir ?? path.join(process.cwd(), "data");
  const outputDir = options.outputDir ?? input.output?.outputDir ?? path.join(process.cwd(), "outputs");
  const baseName = safeBaseName(input.id);
  const evidenceFileName = options.evidenceFileName ?? input.output?.evidenceFileName ?? `${baseName}.json`;
  const reportFileName = options.reportFileName ?? input.output?.reportFileName ?? `${baseName}_case.md`;
  const evidencePath = resolveOutputPath(dataDir, evidenceFileName);
  const reportPath = resolveOutputPath(outputDir, reportFileName);
  const markdown = renderEvidenceCaseMarkdown(
    input,
    orchestration.evidenceCase,
    orchestration.candidates,
    orchestration.draft.droppedCandidates.length
  );

  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(orchestration.evidenceCase, null, 2)}\n`);
  fs.writeFileSync(reportPath, markdown);

  return {
    evidenceCase: orchestration.evidenceCase,
    evidencePath,
    reportPath,
    candidateCount: orchestration.candidates.length,
    evidenceCount: orchestration.evidenceCase.evidence.length,
    droppedCount: orchestration.draft.droppedCandidates.length
  };
}
