import fs from "node:fs";
import path from "node:path";
import aiToolDemo from "@/data/demo_ai_tool.json";
import aiToolEvidenceDemo from "@/data/demo_ai_tool_evidence.json";
import fashionDemo from "@/data/demo_fashion.json";
import fashionEvidenceDemo from "@/data/demo_fashion_evidence.json";
import roboticsDemo from "@/data/demo_robotics.json";
import snackDemo from "@/data/demo_snack.json";
import snackEvidenceDemo from "@/data/demo_snack_evidence.json";
import { formatCategory } from "@/lib/display-labels";
import { adjustScores, type EvidenceAdjustmentCase } from "@/lib/evidence-adjustment";
import {
  applyRecommendationRigor,
  calculateTrendFitWithProfile,
  normalizeWeightProfile
} from "@/lib/recommendation-rigor";
import type { DemoCase, ScoreKey } from "@/lib/types";

export const DEMO_CASES = [
  fashionDemo,
  roboticsDemo,
  aiToolDemo,
  snackDemo
] as DemoCase[];

export const DEFAULT_DEMO_ID = "demo_fashion";

export const REPORT_FILES: Record<string, string> = {
  demo_fashion: "demo_fashion_report.md",
  demo_robotics: "demo_robotics_report.md",
  demo_ai_tool: "demo_ai_tool_report.md",
  demo_snack: "demo_snack_report.md"
};

export const EVIDENCE_CASES = [
  fashionEvidenceDemo,
  aiToolEvidenceDemo,
  snackEvidenceDemo
] as EvidenceAdjustmentCase[];

export const DIMENSION_META: Array<{
  key: ScoreKey;
  label: string;
  weightLabel: string;
  question: string;
}> = [
  {
    key: "audienceOverlap",
    label: "受众重合度",
    weightLabel: "20%",
    question: "趋势受众是否和产品目标用户重合？"
  },
  {
    key: "useCaseRelevance",
    label: "使用场景相关性",
    weightLabel: "20%",
    question: "产品加入这个热点是否自然、不牵强？"
  },
  {
    key: "messageBridge",
    label: "卖点桥接",
    weightLabel: "15%",
    question: "热点能否顺畅连接到真实卖点？"
  },
  {
    key: "creativeFeasibility",
    label: "内容可执行性",
    weightLabel: "15%",
    question: "团队是否能产出适合平台语境的内容？"
  },
  {
    key: "commercialIntent",
    label: "商业意图",
    weightLabel: "10%",
    question: "受众是否接近购买、试用或咨询心态？"
  },
  {
    key: "brandSafety",
    label: "品牌安全",
    weightLabel: "10%",
    question: "是否存在声誉、价值观或表达风险？"
  },
  {
    key: "timingSaturation",
    label: "时机与饱和度",
    weightLabel: "10%",
    question: "现在进入是否仍有差异化空间？"
  }
];

export function getDemoCase(id?: string | null): DemoCase {
  return DEMO_CASES.find((demo) => demo.id === id) ?? DEMO_CASES[0];
}

export function getDemoResult(id?: string | null, profileInput?: string | null) {
  const demo = getDemoCase(id);
  const profile = normalizeWeightProfile(profileInput ?? demo.profileUsed);
  return calculateTrendFitWithProfile(demo.scores, demo.product.riskTolerance, profile, {
    qualifier: demo.expectedQualifier
  });
}

export function getDemoRigorResult(id?: string | null, profileInput?: string | null) {
  const demo = getDemoCase(id);
  const profile = normalizeWeightProfile(profileInput ?? demo.profileUsed);
  const result = calculateTrendFitWithProfile(demo.scores, demo.product.riskTolerance, profile, {
    qualifier: demo.expectedQualifier
  });

  return {
    result,
    rigor: applyRecommendationRigor({
      scores: demo.scores,
      result,
      profile,
      evidence: []
    })
  };
}

export function getEvidenceCase(id?: string | null): EvidenceAdjustmentCase | null {
  const demo = getDemoCase(id);
  return EVIDENCE_CASES.find((evidenceCase) => evidenceCase.case === demo.id) ?? null;
}

export function getEvidenceResult(id?: string | null, profileInput?: string | null) {
  const demo = getDemoCase(id);
  const evidenceCase = getEvidenceCase(demo.id);
  if (!evidenceCase) return null;

  const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
  const profile = normalizeWeightProfile(profileInput ?? evidenceCase.profileUsed ?? demo.profileUsed);
  const adjustedResult = calculateTrendFitWithProfile(adjustment.adjusted, demo.product.riskTolerance, profile, {
    qualifier: demo.expectedQualifier
  });
  const rigor = applyRecommendationRigor({
    scores: adjustment.adjusted,
    result: adjustedResult,
    profile,
    evidence: evidenceCase.evidence
  });

  return {
    evidenceCase,
    adjustment,
    adjustedResult,
    rigor
  };
}

export function getReportMarkdown(id?: string | null): string {
  const demo = getDemoCase(id);
  const reportFile = REPORT_FILES[demo.id];
  return fs.readFileSync(path.join(process.cwd(), "outputs", reportFile), "utf8");
}

export function getReportFileName(id?: string | null): string {
  const demo = getDemoCase(id);
  return REPORT_FILES[demo.id];
}

export function getCaseLabel(demo: DemoCase): string {
  return `${formatCategory(demo.product.category)} × ${demo.trend.name}`;
}
