import type { Band, RiskTolerance } from "./types";

export const BAND_LABELS: Record<Band, string> = {
  "Strong Go": "强烈建议跟进",
  Go: "建议跟进",
  "Cautious test": "谨慎测试",
  "Weak fit": "弱适配",
  "No-go": "不建议"
};

export const RISK_LABELS: Record<RiskTolerance, string> = {
  low: "低风险偏好",
  medium: "中等风险偏好",
  high: "高风险偏好"
};

export const CATEGORY_LABELS: Record<string, string> = {
  "Mid-range men's clothing": "中端男装",
  "Home robotics / smart home": "家用机器人 / 智能家居",
  "AI photo-editing tool": "AI 图片编辑工具",
  "Snack / confectionery": "零食 / 巧克力糖果",
  "RTD protein beverage": "即饮蛋白饮料"
};

export const CONFIDENCE_LABELS: Record<string, string> = {
  assumption: "仍为假设",
  "evidence-confirmed (low)": "证据确认（低置信）",
  "evidence-confirmed (medium)": "证据确认（中置信）",
  "evidence-confirmed (high)": "证据确认（高置信）",
  "evidence-revised (low)": "证据修正（低置信）",
  "evidence-revised (medium)": "证据修正（中置信）",
  "evidence-revised (high)": "证据修正（高置信）"
};

export const SOURCE_TIER_LABELS: Record<string, string> = {
  primary: "一手 / 强证据",
  secondary: "二手 / 方向性证据",
  proxy: "代理指标"
};

export const SOURCE_CONFIDENCE_LABELS: Record<string, string> = {
  low: "低置信",
  medium: "中置信",
  high: "高置信"
};

export const EVIDENCE_GATE_LABELS: Record<string, string> = {
  pass: "证据门槛通过",
  partial: "证据部分通过",
  fail: "证据不足"
};

export const STABILITY_LABELS: Record<string, string> = {
  stable: "稳定",
  moderate: "中等敏感",
  fragile: "脆弱"
};

export const DECISION_TYPE_LABELS: Record<string, string> = {
  "No-go": "不执行",
  observe: "观察",
  "small test": "小测试",
  "creator seeding": "创作者种草",
  "organic push": "自然流量推进",
  "paid push": "付费放大"
};

export const QUALIFIER_LABELS: Record<string, string> = {
  "trust-building angle": "信任建设角度"
};

export function formatBand(band: Band): string {
  return BAND_LABELS[band];
}

export function formatCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function formatQualifier(qualifier: string | null): string | null {
  if (!qualifier) return null;
  return QUALIFIER_LABELS[qualifier] ?? qualifier;
}
