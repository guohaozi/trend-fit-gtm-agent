import {
  adjustScores,
  type EvidenceAdjustment,
  type EvidenceConfidence,
  type EvidenceDirection,
  type EvidenceItem,
  type EvidenceMagnitude,
  type SourceTier
} from "./evidence-adjustment";
import type { EvidenceCandidate } from "./evidence-collector";
import {
  applyRecommendationRigor,
  calculateTrendFitWithProfile,
  PROFILE_OPTIONS,
  type GatedRecommendation,
  type WeightProfile
} from "./recommendation-rigor";
import {
  clampEvidenceConfidence,
  classifySourceTier,
  type SourceSignal,
  type SourceTierClassification,
  type VerificationStatus
} from "./source-tier-classifier";
import { buildTrendShortlist, type RankedTrendShortlistRow, type TrendShortlistResult } from "./trend-shortlist";
import type { RiskTolerance, ScoreKey, Scores, ScoringResult } from "./types";

export type WorkspaceProduct = {
  name: string;
  category: string;
  market: string;
  audience: string;
  positioning: string;
  sellingPoints: string;
  brandTone: string;
  riskTolerance: RiskTolerance;
  profileUsed: WeightProfile;
};

export type WorkspaceCandidate = {
  id: string;
  trendName: string;
  trendDescription: string;
  scores: Scores;
  evidence?: EvidenceItem[];
  evidenceRows?: WorkspaceEvidenceRow[];
  oneLineVerdict?: string;
  recommendedCampaign?: string;
};

export type SingleWorkspaceTrendResult = {
  baselineResult: ScoringResult;
  adjustment: EvidenceAdjustment;
  adjustedResult: ScoringResult;
  rigor: GatedRecommendation;
};

export type WorkspaceEvidenceGap = {
  slot: string;
  label: string;
  severity: "blocking" | "advisory";
  reason: string;
  providerHint: string;
};

export type WorkspaceProviderSlot = WorkspaceEvidenceGap & {
  plannedSources: string[];
};

export type WorkspaceProviderCommand = {
  label: string;
  command: string;
  description: string;
};

export type WorkspaceProviderPreview = {
  targetTrend: string;
  targetedSlots: WorkspaceProviderSlot[];
  dryRunCommand: WorkspaceProviderCommand;
  fixtureCommand: WorkspaceProviderCommand;
  commandsText: string;
  notes: string[];
};

export type WorkspaceEvidenceRow = {
  id: string;
  dimension: ScoreKey;
  direction: EvidenceDirection;
  magnitude: EvidenceMagnitude;
  desiredConfidence: EvidenceConfidence;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  sourceSignals: SourceSignal[];
  note: string;
};

export type ComputedWorkspaceEvidenceRow = WorkspaceEvidenceRow & {
  computedSourceTier: SourceTier | null;
  computedConfidence: EvidenceConfidence | null;
  classification: SourceTierClassification;
};

export type WorkspaceEvidenceMaterialization = {
  rows: ComputedWorkspaceEvidenceRow[];
  evidence: EvidenceItem[];
  droppedRows: ComputedWorkspaceEvidenceRow[];
};

export type WorkspaceMode = "single" | "shortlist";

export type WorkspaceStateSnapshot = {
  version: 1;
  savedAt: string;
  mode: WorkspaceMode;
  product: WorkspaceProduct;
  candidates: WorkspaceCandidate[];
  activeCandidateIndex: number;
};

export type WorkspaceStateParseResult =
  | { ok: true; state: WorkspaceStateSnapshot }
  | { ok: false; error: string };

const DIMENSION_LABELS: Record<string, string> = {
  audienceOverlap: "受众重合",
  useCaseRelevance: "使用场景",
  messageBridge: "卖点桥接",
  creativeFeasibility: "创意可行性",
  commercialIntent: "商业意图",
  brandSafety: "品牌安全",
  timingSaturation: "时机与饱和度",
  audienceOrUseCase: "受众或使用场景"
};

const PROVIDER_HINTS: Record<string, string> = {
  audienceOverlap: "补充 Reddit、X、TikTok、小红书、YouTube 评论、评论区或访谈里的真实用户语言。",
  useCaseRelevance: "补充用户评论、创作者内容、评价，或真实观察到的竞品 campaign。",
  audienceOrUseCase: "补充真实用户语言，或能证明受众和使用场景存在的客户/竞品例子。",
  messageBridge: "补充竞品 campaign、创作者脚本、落地页或评价语言，证明热点语言能接到核心卖点。",
  creativeFeasibility: "补充创作者案例、现有品牌素材、平台原生格式，或直接观察到的竞品创意。",
  commercialIntent: "补充搜索/送礼意图、电商查询、where-to-buy 评论、评价、渠道页或 SEO 需求数据。",
  brandSafety: "升级建议前，先补政策检查、安全/新闻覆盖、舆情和社区情绪扫描。",
  timingSaturation: "补充 Google Trends / SEO 时间序列、平台声量、创作者饱和度和竞品近期动作。"
};

const PROVIDER_SOURCES: Record<string, string[]> = {
  audienceOverlap: ["Reddit / YouTube / X 原始用户语言", "用户评价或电商问答"],
  useCaseRelevance: ["创作者案例和用户评论", "竞品 campaign 或产品使用案例"],
  audienceOrUseCase: ["Reddit / YouTube / X 原始用户语言", "用户评价、电商问答或竞品使用案例"],
  messageBridge: ["竞品 campaign 页面", "创作者脚本、落地页或评价语言"],
  creativeFeasibility: ["创作者内容案例", "现有品牌素材或可观察竞品创意"],
  commercialIntent: ["购买地点和价格查询", "电商评价、渠道页或 SEO 需求数据"],
  brandSafety: ["Google 政策、新闻和负面反馈扫描", "Reddit / X 情绪和社区安全检查"],
  timingSaturation: ["Google Trends / SEO 时间序列", "近期平台声量、创作者饱和度和竞品动作"],
  stability: ["对最敏感维度补一条高信号来源", "小规模受控测试结果"]
};

const SLOT_PLATFORMS: Record<string, string[]> = {
  audienceOverlap: ["reddit", "youtube", "twitter"],
  useCaseRelevance: ["reddit", "youtube", "twitter"],
  audienceOrUseCase: ["reddit", "youtube", "twitter"],
  messageBridge: ["google", "youtube"],
  creativeFeasibility: ["youtube", "google"],
  commercialIntent: ["google", "reddit"],
  brandSafety: ["google", "reddit", "twitter"],
  timingSaturation: ["google", "youtube"],
  stability: ["google", "reddit"]
};
const SCORE_KEYS: ScoreKey[] = [
  "audienceOverlap",
  "useCaseRelevance",
  "messageBridge",
  "creativeFeasibility",
  "commercialIntent",
  "brandSafety",
  "timingSaturation"
];
const SCORE_VALUES = new Set([0, 25, 50, 75, 100]);
const RISK_TOLERANCES = new Set<RiskTolerance>(["low", "medium", "high"]);
const WEIGHT_PROFILES = new Set(PROFILE_OPTIONS.map((profile) => profile.id));
const EVIDENCE_DIRECTIONS = new Set<EvidenceDirection>(["confirm", "up", "down"]);
const EVIDENCE_MAGNITUDES = new Set<EvidenceMagnitude>(["weak", "moderate", "strong"]);
const EVIDENCE_CONFIDENCES = new Set<EvidenceConfidence>(["low", "medium", "high"]);
const VERIFICATION_STATUSES = new Set<VerificationStatus>(["verified", "unverified", "contradicted"]);

function defaultSignalsForTier(sourceTier: SourceTier): SourceSignal[] {
  if (sourceTier === "primary") return ["direct_competitor_campaign"];
  if (sourceTier === "secondary") return ["reputable_journalism"];
  return ["unknown"];
}

export function buildWorkspaceEvidenceRowsFromEvidence(evidence: EvidenceItem[]): WorkspaceEvidenceRow[] {
  return evidence.map((item) => ({
    id: item.id,
    dimension: item.dimension,
    direction: item.direction,
    magnitude: item.magnitude,
    desiredConfidence: item.confidence,
    sourceUrl: item.sourceUrl,
    verificationStatus: "verified",
    sourceSignals: defaultSignalsForTier(item.sourceTier),
    note: item.note
  }));
}

export function buildWorkspaceEvidenceRowsFromCandidates(candidates: EvidenceCandidate[]): WorkspaceEvidenceRow[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    dimension: candidate.dimension,
    direction: candidate.direction,
    magnitude: candidate.magnitude,
    desiredConfidence: candidate.desiredConfidence,
    sourceUrl: candidate.sourceUrl,
    verificationStatus: candidate.verificationStatus,
    sourceSignals: candidate.sourceSignals ?? ["unknown"],
    note: candidate.note
  }));
}

function nextWorkspaceEvidenceRowId(existingIds: Set<string>, requestedId: string): string {
  if (!existingIds.has(requestedId)) return requestedId;

  let suffix = 2;
  while (existingIds.has(`${requestedId}-${suffix}`)) {
    suffix += 1;
  }
  return `${requestedId}-${suffix}`;
}

export function appendWorkspaceEvidenceRows(
  existingRows: WorkspaceEvidenceRow[],
  incomingRows: WorkspaceEvidenceRow[]
): WorkspaceEvidenceRow[] {
  const ids = new Set(existingRows.map((row) => row.id));
  const appended = incomingRows.map((row) => {
    const id = nextWorkspaceEvidenceRowId(ids, row.id);
    ids.add(id);
    return {
      ...row,
      id
    };
  });

  return [...existingRows, ...appended];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return value === "single" || value === "shortlist";
}

function isScores(value: unknown): value is Scores {
  if (!isRecord(value)) return false;
  return SCORE_KEYS.every((key) => typeof value[key] === "number" && SCORE_VALUES.has(value[key] as number));
}

function isWorkspaceProduct(value: unknown): value is WorkspaceProduct {
  if (!isRecord(value)) return false;
  const stringFields: Array<keyof WorkspaceProduct> = [
    "name",
    "category",
    "market",
    "audience",
    "positioning",
    "sellingPoints",
    "brandTone"
  ];
  if (!stringFields.every((key) => isNonEmptyString(value[key]))) return false;
  if (!RISK_TOLERANCES.has(value.riskTolerance as RiskTolerance)) {
    throw new Error("工作台状态里的风险偏好无效。");
  }
  if (!WEIGHT_PROFILES.has(value.profileUsed as WeightProfile)) {
    throw new Error("工作台状态里的评分模型无效。");
  }
  return true;
}

function isWorkspaceEvidenceRow(value: unknown): value is WorkspaceEvidenceRow {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    SCORE_KEYS.includes(value.dimension as ScoreKey) &&
    EVIDENCE_DIRECTIONS.has(value.direction as EvidenceDirection) &&
    EVIDENCE_MAGNITUDES.has(value.magnitude as EvidenceMagnitude) &&
    EVIDENCE_CONFIDENCES.has(value.desiredConfidence as EvidenceConfidence) &&
    isNonEmptyString(value.sourceUrl) &&
    VERIFICATION_STATUSES.has(value.verificationStatus as VerificationStatus) &&
    Array.isArray(value.sourceSignals) &&
    value.sourceSignals.every((signal) => typeof signal === "string") &&
    typeof value.note === "string"
  );
}

function isWorkspaceCandidate(value: unknown): value is WorkspaceCandidate {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.trendName) || typeof value.trendDescription !== "string") return false;
  if (!isScores(value.scores)) return false;
  if (value.evidenceRows !== undefined && (!Array.isArray(value.evidenceRows) || !value.evidenceRows.every(isWorkspaceEvidenceRow))) {
    return false;
  }
  return true;
}

function clampActiveCandidateIndex(index: number, candidates: WorkspaceCandidate[]): number {
  if (candidates.length === 0) return 0;
  if (!Number.isInteger(index)) return 0;
  return Math.min(Math.max(index, 0), candidates.length - 1);
}

export function createWorkspaceStateSnapshot({
  mode,
  product,
  candidates,
  activeCandidateIndex
}: {
  mode: WorkspaceMode;
  product: WorkspaceProduct;
  candidates: WorkspaceCandidate[];
  activeCandidateIndex: number;
}): WorkspaceStateSnapshot {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    mode,
    product,
    candidates,
    activeCandidateIndex: clampActiveCandidateIndex(activeCandidateIndex, candidates)
  };
}

export function serializeWorkspaceState(state: WorkspaceStateSnapshot): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export function parseWorkspaceStateJson(json: string): WorkspaceStateParseResult {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isRecord(parsed)) return { ok: false, error: "工作台状态必须是 JSON 对象。" };
    if (parsed.version !== 1) return { ok: false, error: "不支持这个工作台状态版本。" };
    if (!isWorkspaceMode(parsed.mode)) return { ok: false, error: "工作模式无效。" };
    if (!isWorkspaceProduct(parsed.product)) return { ok: false, error: "产品画像无效。" };
    if (!Array.isArray(parsed.candidates) || parsed.candidates.length === 0 || !parsed.candidates.every(isWorkspaceCandidate)) {
      return { ok: false, error: "候选趋势无效。" };
    }
    const activeCandidateIndex = clampActiveCandidateIndex(Number(parsed.activeCandidateIndex), parsed.candidates);
    return {
      ok: true,
      state: {
        version: 1,
        savedAt: isNonEmptyString(parsed.savedAt) ? parsed.savedAt : new Date().toISOString(),
        mode: parsed.mode,
        product: parsed.product,
        candidates: parsed.candidates,
        activeCandidateIndex
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "工作台状态 JSON 无效。"
    };
  }
}

export function materializeWorkspaceEvidenceRows(
  rows: WorkspaceEvidenceRow[]
): WorkspaceEvidenceMaterialization {
  const computedRows: ComputedWorkspaceEvidenceRow[] = rows.map((row) => {
    const classification = classifySourceTier({
      sourceUrl: row.sourceUrl,
      dimension: row.dimension,
      verificationStatus: row.verificationStatus,
      sourceSignals: row.sourceSignals
    });
    return {
      ...row,
      computedSourceTier: classification.sourceTier,
      computedConfidence:
        classification.action === "keep" && classification.sourceTier
          ? clampEvidenceConfidence(row.desiredConfidence, classification.maxConfidence)
          : null,
      classification
    };
  });
  const evidence = computedRows.flatMap((row): EvidenceItem[] => {
    if (row.classification.action === "drop" || row.computedSourceTier === null || row.computedConfidence === null) {
      return [];
    }

    return [
      {
        id: row.id,
        dimension: row.dimension,
        direction: row.direction,
        magnitude: row.magnitude,
        confidence: row.computedConfidence,
        sourceTier: row.computedSourceTier,
        sourceUrl: row.sourceUrl,
        note: row.note
      }
    ];
  });

  return {
    rows: computedRows,
    evidence,
    droppedRows: computedRows.filter((row) => row.classification.action === "drop")
  };
}

function evidenceForWorkspaceCandidate(candidate: WorkspaceCandidate): EvidenceItem[] {
  return candidate.evidenceRows ? materializeWorkspaceEvidenceRows(candidate.evidenceRows).evidence : candidate.evidence ?? [];
}

function formatScoreBlock(scores: Scores): string {
  return Object.entries(scores)
    .map(([key, value]) => `- ${DIMENSION_LABELS[key] ?? key}: ${value}`)
    .join("\n");
}

function providerHintFor(slot: string): string {
  return PROVIDER_HINTS[slot] ?? "升级建议前，先从数据源补充一条非代理证据。";
}

function shellQuote(value: string): string {
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function platformsForGaps(gaps: WorkspaceEvidenceGap[]): string[] {
  const platforms = gaps.flatMap((gap) => SLOT_PLATFORMS[gap.slot] ?? ["google"]);
  return unique(platforms.length > 0 ? platforms : ["reddit", "youtube", "twitter", "google"]);
}

function activeResearchCommand({
  product,
  candidate,
  platforms,
  dryRun
}: {
  product: WorkspaceProduct;
  candidate: WorkspaceCandidate;
  platforms: string[];
  dryRun: boolean;
}): string {
  return [
    "npm run evidence:case:research --",
    "--product",
    shellQuote(product.name),
    "--market",
    shellQuote(product.market),
    "--trend",
    shellQuote(candidate.trendName),
    "--risk",
    product.riskTolerance,
    "--profile",
    product.profileUsed,
    "--provider",
    "opencli",
    "--platforms",
    platforms.join(","),
    "--limit",
    "3",
    dryRun ? "--dry-run-provider-commands" : ""
  ].filter(Boolean).join(" ");
}

function fixtureSmokeCommand(): string {
  return [
    "npm run evidence:case:research --",
    "--product",
    shellQuote("DJI drones"),
    "--market",
    shellQuote("UAE Saudi Middle East"),
    "--trend",
    shellQuote("video creation security inspection tourism enablement"),
    "--risk",
    "high",
    "--profile",
    "b2b_pipeline",
    "--fixture-results",
    "examples/dji-middle-east-search-results.fixture.json",
    "--limit",
    "3"
  ].join(" ");
}

export function buildWorkspaceEvidenceGaps(rigor: GatedRecommendation): WorkspaceEvidenceGap[] {
  const missing = rigor.gateMissing.map((slot): WorkspaceEvidenceGap => ({
    slot,
    label: DIMENSION_LABELS[slot] ?? slot,
    severity: "blocking",
    reason: "强建议所需的证据门槛还没补齐。",
    providerHint: providerHintFor(slot)
  }));
  const caps = rigor.dimensionCaps.map((dimension): WorkspaceEvidenceGap => ({
    slot: dimension,
    label: DIMENSION_LABELS[dimension],
    severity: "advisory",
    reason: "这个维度评分高于 75，但还缺少非代理证据支撑。",
    providerHint: providerHintFor(dimension)
  }));

  if (missing.length === 0 && caps.length === 0 && rigor.recommendationStability === "fragile") {
    return [
      {
        slot: "stability",
        label: "推荐稳定性",
        severity: "advisory",
        reason: "推荐接近档位边界，或对一个未支撑的锚点变化过于敏感。",
        providerHint: "放大预算前，先跑一个小规模受控测试，或补一条高信号数据源结果。"
      }
    ];
  }

  return [...missing, ...caps];
}

export function buildWorkspaceProviderPreview({
  product,
  candidate,
  gaps,
  mode
}: {
  product: WorkspaceProduct;
  candidate: WorkspaceCandidate;
  gaps: WorkspaceEvidenceGap[];
  mode: "single" | "shortlist";
}): WorkspaceProviderPreview {
  const targetedSlots = gaps.map((gap) => ({
    ...gap,
    plannedSources: PROVIDER_SOURCES[gap.slot] ?? ["数据源结果会归一化为候选证据"]
  }));
  const platforms = platformsForGaps(gaps);
  const dryRunCommand: WorkspaceProviderCommand = {
    label: "预览当前趋势命令",
    command: activeResearchCommand({ product, candidate, platforms, dryRun: true }),
    description: "只打印这个产品、市场、趋势和证据缺口对应的采集命令，不执行实时采集。"
  };
  const fixtureCommand: WorkspaceProviderCommand = {
    label: "演示数据回放",
    command: fixtureSmokeCommand(),
    description: "用仓库内置演示数据跑通证据管线，任何机器都能展示数据源契约。"
  };
  const commandsText = [dryRunCommand.command, fixtureCommand.command].join("\n\n");

  return {
    targetTrend: candidate.trendName,
    targetedSlots,
    dryRunCommand,
    fixtureCommand,
    commandsText,
    notes: [
      mode === "shortlist"
        ? "候选排序模式会为当前第一名趋势预览数据源计划。"
        : "单趋势模式会为当前选中的趋势预览数据源计划。",
      "OpenCLI 会从 --opencli-bin、OPENCLI_BIN 或 PATH 解析，运行时不依赖某个用户机器上的固定路径。",
      "数据源输出只会成为候选证据；来源等级仍由分类器决定，工作台里不能手动改。"
    ]
  };
}

export function evaluateSingleWorkspaceTrend(
  product: WorkspaceProduct,
  candidate: WorkspaceCandidate
): SingleWorkspaceTrendResult {
  const evidence = evidenceForWorkspaceCandidate(candidate);
  const baselineResult = calculateTrendFitWithProfile(
    candidate.scores,
    product.riskTolerance,
    product.profileUsed
  );
  const adjustment = adjustScores(candidate.scores, evidence);
  const adjustedResult = calculateTrendFitWithProfile(
    adjustment.adjusted,
    product.riskTolerance,
    product.profileUsed
  );
  const rigor = applyRecommendationRigor({
    scores: adjustment.adjusted,
    result: adjustedResult,
    profile: product.profileUsed,
    evidence
  });

  return {
    baselineResult,
    adjustment,
    adjustedResult,
    rigor
  };
}

export function evaluateWorkspaceShortlist(
  product: WorkspaceProduct,
  candidates: WorkspaceCandidate[]
): TrendShortlistResult {
  return buildTrendShortlist({
    id: `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_workspace_shortlist`,
    productName: product.name,
    profileUsed: product.profileUsed,
    riskTolerance: product.riskTolerance,
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      trendName: candidate.trendName,
      trendDescription: candidate.trendDescription,
      baselineScores: candidate.scores,
      evidence: evidenceForWorkspaceCandidate(candidate),
      oneLineVerdict: candidate.oneLineVerdict ?? "把这条趋势先当作待验证的适配假设。",
      recommendedCampaign: candidate.recommendedCampaign
    }))
  });
}

function evidenceGapMarkdown(gaps: WorkspaceEvidenceGap[]): string {
  if (gaps.length === 0) return "- 暂无需要立即补齐的证据缺口。";
  return gaps
    .map((gap) => `- ${gap.label} (${gap.severity}): ${gap.reason} ${gap.providerHint}`)
    .join("\n");
}

export function renderSingleWorkspaceMarkdown({
  product,
  candidate,
  result
}: {
  product: WorkspaceProduct;
  candidate: WorkspaceCandidate;
  result: SingleWorkspaceTrendResult;
}): string {
  const gaps = buildWorkspaceEvidenceGaps(result.rigor);

  return [
    "# Trend-Fit 工作台备忘录",
    "",
    `产品：${product.name}`,
    `市场：${product.market}`,
    `趋势：${candidate.trendName}`,
    `评分模型：${product.profileUsed}`,
    "",
    "## 建议",
    "",
    `- 基准分：${result.baselineResult.total}/100`,
    `- 证据调整后分数：${result.adjustedResult.total}/100`,
    `- 门槛后档位：${result.rigor.gatedBand}`,
    `- 证据门槛：${result.rigor.evidenceGate}`,
    `- 稳定性：${result.rigor.recommendationStability}`,
    `- 决策类型：${result.rigor.decisionType}`,
    "",
    "## 评分",
    "",
    formatScoreBlock(result.adjustment.adjusted),
    "",
    "## 证据缺口",
    "",
    evidenceGapMarkdown(gaps),
    "",
    "## 下一步验证动作",
    "",
    result.rigor.nextValidationAction
  ].join("\n");
}

function shortlistRowMarkdown(row: RankedTrendShortlistRow): string {
  return `| ${row.rank} | ${row.trendName} | ${row.adjustedResult.total} | ${row.rigor.gatedBand} | ${row.rigor.evidenceGate} | ${row.rigor.recommendationStability} | ${row.rigor.decisionType} |`;
}

export function renderShortlistWorkspaceMarkdown({
  product,
  shortlist
}: {
  product: WorkspaceProduct;
  shortlist: TrendShortlistResult;
}): string {
  const winnerGaps = buildWorkspaceEvidenceGaps(shortlist.winner.rigor);

  return [
    "# 趋势候选排序报告",
    "",
    `产品：${product.name}`,
    `市场：${product.market}`,
    `评分模型：${product.profileUsed}`,
    `第一名：${shortlist.winner.trendName}`,
    "",
    "| 排名 | 趋势 | 调整后分数 | 门槛后档位 | 证据门槛 | 稳定性 | 决策 |",
    "|------|-------|-----------|------------|------|-----------|----------|",
    ...shortlist.rows.map(shortlistRowMarkdown),
    "",
    "## 为什么第一名胜出",
    "",
    `${shortlist.winner.trendName} 胜出，是因为经过证据门槛和稳定性检查后，它仍保留最强的推荐档位。`,
    "",
    "## 第一名的证据缺口",
    "",
    evidenceGapMarkdown(winnerGaps),
    "",
    "## 下一步验证动作",
    "",
    shortlist.winner.rigor.nextValidationAction
  ].join("\n");
}
