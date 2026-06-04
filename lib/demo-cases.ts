import fs from "node:fs";
import path from "node:path";
import aiToolDemo from "@/data/demo_ai_tool.json";
import fashionDemo from "@/data/demo_fashion.json";
import fashionEvidenceDemo from "@/data/demo_fashion_evidence.json";
import roboticsDemo from "@/data/demo_robotics.json";
import { adjustScores, type EvidenceAdjustmentCase } from "@/lib/evidence-adjustment";
import { calculateTrendFit } from "@/lib/scoring";
import type { DemoCase, ScoreKey } from "@/lib/types";

export const DEMO_CASES = [
  fashionDemo,
  roboticsDemo,
  aiToolDemo
] as DemoCase[];

export const DEFAULT_DEMO_ID = "demo_fashion";

export const REPORT_FILES: Record<string, string> = {
  demo_fashion: "demo_fashion_report.md",
  demo_robotics: "demo_robotics_report.md",
  demo_ai_tool: "demo_ai_tool_report.md"
};

export const EVIDENCE_CASES = [
  fashionEvidenceDemo
] as EvidenceAdjustmentCase[];

export const DIMENSION_META: Array<{
  key: ScoreKey;
  label: string;
  weightLabel: string;
  question: string;
}> = [
  {
    key: "audienceOverlap",
    label: "Audience Overlap",
    weightLabel: "20%",
    question: "Does the trend audience overlap the product ICP?"
  },
  {
    key: "useCaseRelevance",
    label: "Use-case Relevance",
    weightLabel: "20%",
    question: "Can the product join the trend naturally?"
  },
  {
    key: "messageBridge",
    label: "Message Bridge",
    weightLabel: "15%",
    question: "Is there a clean bridge to a real selling point?"
  },
  {
    key: "creativeFeasibility",
    label: "Creative Feasibility",
    weightLabel: "15%",
    question: "Can the team produce native content for this format?"
  },
  {
    key: "commercialIntent",
    label: "Commercial Intent",
    weightLabel: "10%",
    question: "Is the audience near a buying, trial, or inquiry mindset?"
  },
  {
    key: "brandSafety",
    label: "Brand Safety",
    weightLabel: "10%",
    question: "How much reputational or claims risk exists?"
  },
  {
    key: "timingSaturation",
    label: "Timing & Saturation",
    weightLabel: "10%",
    question: "Is there still room to enter with a differentiated angle?"
  }
];

export function getDemoCase(id?: string | null): DemoCase {
  return DEMO_CASES.find((demo) => demo.id === id) ?? DEMO_CASES[0];
}

export function getDemoResult(id?: string | null) {
  const demo = getDemoCase(id);
  return calculateTrendFit(demo.scores, demo.product.riskTolerance, {
    qualifier: demo.expectedQualifier
  });
}

export function getEvidenceCase(id?: string | null): EvidenceAdjustmentCase | null {
  const demo = getDemoCase(id);
  return EVIDENCE_CASES.find((evidenceCase) => evidenceCase.case === demo.id) ?? null;
}

export function getEvidenceResult(id?: string | null) {
  const demo = getDemoCase(id);
  const evidenceCase = getEvidenceCase(demo.id);
  if (!evidenceCase) return null;

  const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
  const adjustedResult = calculateTrendFit(adjustment.adjusted, demo.product.riskTolerance, {
    qualifier: demo.expectedQualifier
  });

  return {
    evidenceCase,
    adjustment,
    adjustedResult
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
  return `${demo.product.category} x ${demo.trend.name}`;
}
