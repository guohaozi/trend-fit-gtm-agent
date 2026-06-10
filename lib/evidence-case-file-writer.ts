import fs from "node:fs";
import path from "node:path";
import { orchestrateEvidenceCase, type OrchestrateEvidenceCaseInput } from "./evidence-case-orchestrator";
import type { EvidenceAdjustmentCase } from "./evidence-adjustment";
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
  audienceOverlap: "Audience Overlap",
  useCaseRelevance: "Use-case Relevance",
  messageBridge: "Message Bridge",
  creativeFeasibility: "Creative Feasibility",
  commercialIntent: "Commercial Intent",
  brandSafety: "Brand Safety",
  timingSaturation: "Timing & Saturation"
};

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
  if (items.length === 0) return "- No accepted evidence for this dimension yet.";
  return items
    .map((item) => {
      return [
        `- **${item.id}** — ${item.sourceTier}, ${item.confidence} confidence, ${item.direction} / ${item.magnitude}.`,
        `  ${item.note}`,
        `  Source: ${item.sourceUrl}`
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
    "Add raw customer-language evidence from Reddit, reviews, comments, or interviews.",
    "Add SEO / Google Trends exports for timing and buying-intent queries.",
    "Add competitor campaign, review, pricing, and backlash evidence for saturation and risk."
  ];

  const lines = [
    `# Evidence Case: ${title}`,
    "",
    "## Executive Read",
    "",
    `Profile used: **${evidenceCase.profileUsed ?? "default"}**.`,
    `Evidence-adjusted read: **${evidenceCase.expectedAdjustedTotal} / ${evidenceCase.expectedAdjustedBand}**.`,
    `Gated recommendation: **${evidenceCase.expectedGatedBand ?? evidenceCase.expectedAdjustedBand}**, with **${evidenceCase.expectedStability ?? "unknown"}** stability.`,
    `Decision type: **${evidenceCase.expectedDecisionType ?? "unknown"}**.`,
    "",
    input.report?.recommendation ?? "Use this generated case as the first evidence-backed read, then improve it with stronger local and channel-specific evidence.",
    "",
    "## Collector Notes",
    "",
    `- Candidates received: **${candidates.length}**`,
    `- Evidence accepted after source-tier classification: **${evidenceCase.evidence.length}**`,
    `- Candidates dropped by source-tier guard: **${droppedCount}**`,
    `- Tooling: ${evidenceCase.tooling}`,
    "",
    "## Before / After",
    "",
    "| Dimension | Baseline | Evidence-adjusted | Confidence |",
    "|-----------|----------|-------------------|------------|",
    ...SCORE_KEYS.map((key) => {
      return `| ${DIMENSION_LABELS[key]} | ${evidenceCase.baselineScores[key]} | ${evidenceCase.expectedAdjustedScores[key]} | ${evidenceCase.expectedDimensionConfidence[key]} |`;
    }),
    "",
    "## Evidence Items",
    "",
    ...SCORE_KEYS.flatMap((key) => [`### ${DIMENSION_LABELS[key]}`, "", formatEvidenceBullets(grouped[key]), ""]),
    "## Rigor Layer",
    "",
    `- Evidence gate: **${evidenceCase.expectedEvidenceGate ?? "unknown"}**`,
    `- Gated band: **${evidenceCase.expectedGatedBand ?? evidenceCase.expectedAdjustedBand}**`,
    `- Missing gate slots: ${evidenceCase.expectedGateMissing?.length ? evidenceCase.expectedGateMissing.join(", ") : "none"}`,
    `- Dimension caps: ${evidenceCase.expectedDimensionCaps?.length ? evidenceCase.expectedDimensionCaps.join(", ") : "none"}`,
    `- Stability: **${evidenceCase.expectedStability ?? "unknown"}**`,
    `- Decision type: **${evidenceCase.expectedDecisionType ?? "unknown"}**`,
    "",
    "## Next Evidence To Collect",
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
