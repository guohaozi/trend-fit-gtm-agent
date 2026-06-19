import { GoogleGenAI, Type } from "@google/genai";
import { SCORE_KEYS, type ScoreKey, type ScoreValue, type Scores } from "./types";

// The model proposes the *baseline hypothesis* — the 7 anchor scores a human analyst
// would otherwise enter by hand. The deterministic engine + source-tier classifier +
// evidence gate then constrain it: a proposed 90 is still capped to a gated band until
// real evidence exists. The model is told these are reasoned assumptions, never evidence,
// and is forbidden from inventing metrics/URLs — preserving the project's
// "evidence-backed, never fabricate" rule. Runs on Gemini (AI Studio free tier).

// Override with GEMINI_MODEL if a newer free-tier Flash ships (e.g. gemini-3-flash).
// Default = gemini-3.1-flash-lite (higher free-tier RPM/RPD than 2.5-flash).
export const BASELINE_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";

export type BaselineProductInput = {
  name: string;
  category: string;
  market: string;
  audience: string;
  positioning: string;
  sellingPoints: string;
  brandTone: string;
  riskTolerance: string;
};

export type BaselineTrendInput = {
  trendName: string;
  trendDescription: string;
};

export type BaselineResult = {
  scores: Scores;
  rationales: Record<ScoreKey, string>;
  overallRationale: string;
};

const DIMENSIONS: Array<{ key: ScoreKey; label: string; question: string }> = [
  { key: "audienceOverlap", label: "受众重合度", question: "趋势受众是否和产品目标用户重合？" },
  { key: "useCaseRelevance", label: "使用场景相关性", question: "产品加入这个热点是否自然、不牵强？" },
  { key: "messageBridge", label: "卖点桥接", question: "热点能否顺畅连接到产品真实卖点？" },
  { key: "creativeFeasibility", label: "内容可执行性", question: "团队能否产出适合平台语境的内容？" },
  { key: "commercialIntent", label: "商业意图", question: "受众是否接近购买、试用或咨询心态？" },
  { key: "brandSafety", label: "品牌安全", question: "是否存在声誉、价值观或表达风险？（越安全分越高）" },
  { key: "timingSaturation", label: "时机与饱和度", question: "现在进入是否仍有差异化空间？（越有空间分越高）" }
];

/** Snap any number to the nearest legal anchor {0,25,50,75,100}; default 50 if invalid. */
export function snapToAnchor(value: unknown): ScoreValue {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  const snapped = Math.round(n / 25) * 25;
  return Math.min(100, Math.max(0, snapped)) as ScoreValue;
}

function buildResponseSchema() {
  const dimensionSchema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER, description: "锚点分，必须是 0 / 25 / 50 / 75 / 100 之一" },
      rationale: { type: Type.STRING, description: "一句话中文理由（你的推理，不是证据）" }
    },
    required: ["score", "rationale"],
    propertyOrdering: ["score", "rationale"]
  };

  const properties: Record<string, object> = {};
  for (const dim of DIMENSIONS) {
    properties[dim.key] = dimensionSchema;
  }
  properties.overallRationale = {
    type: Type.STRING,
    description: "一句话总体判断（基线假设，待证据验证）"
  };

  return {
    type: Type.OBJECT,
    properties,
    required: [...SCORE_KEYS, "overallRationale"],
    propertyOrdering: [...SCORE_KEYS, "overallRationale"]
  };
}

function buildSystemPrompt(): string {
  const rubric = DIMENSIONS.map((dim) => `- ${dim.key}（${dim.label}）：${dim.question}`).join("\n");
  return [
    "你是一个「产品 × 趋势适配」基线评分助手。基于给定的【产品画像】和【候选热点】文本，",
    "为 7 个维度各给出一个锚点分，并给出一句中文理由。",
    "",
    "锚点分只能取 {0, 25, 50, 75, 100}：0=明显不具备/不相关；25=偏弱；50=中等或不确定；75=较强；100=很强或接近确定。",
    "",
    "7 个维度：",
    rubric,
    "",
    "铁律：你给出的是【基于推理的基线假设】，不是证据。严禁编造任何指标、数据、百分比、URL、报告或引用。",
    "理由只能是你对所给文本的推理，每条一句话。信息不足时给中性分 50 并说明不确定。"
  ].join("\n");
}

function buildUserPrompt(product: BaselineProductInput, trend: BaselineTrendInput): string {
  return [
    "【产品画像】",
    `产品名称：${product.name}`,
    `品类：${product.category}`,
    `目标市场：${product.market}`,
    `目标人群：${product.audience}`,
    `定位：${product.positioning}`,
    `核心卖点：${product.sellingPoints}`,
    `品牌调性：${product.brandTone}`,
    `风险偏好：${product.riskTolerance}`,
    "",
    "【候选热点】",
    `热点名称：${trend.trendName}`,
    `热点描述：${trend.trendDescription || "（未提供）"}`
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Validate + normalize the model payload into engine-ready scores. Pure + testable. */
export function parseBaselinePayload(payload: unknown): BaselineResult {
  if (!isRecord(payload)) {
    throw new Error("模型返回的评分结构无效。");
  }

  const scores = {} as Scores;
  const rationales = {} as Record<ScoreKey, string>;

  for (const key of SCORE_KEYS) {
    const dim = payload[key];
    if (isRecord(dim)) {
      scores[key] = snapToAnchor(dim.score);
      rationales[key] = typeof dim.rationale === "string" ? dim.rationale.trim() : "";
    } else {
      scores[key] = 50;
      rationales[key] = "";
    }
  }

  const overallRationale =
    typeof payload.overallRationale === "string" ? payload.overallRationale.trim() : "";

  return { scores, rationales, overallRationale };
}

export async function generateBaselineScores(
  product: BaselineProductInput,
  trend: BaselineTrendInput
): Promise<BaselineResult> {
  // GoogleGenAI reads GEMINI_API_KEY when apiKey is passed explicitly.
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: BASELINE_MODEL,
    contents: buildUserPrompt(product, trend),
    config: {
      systemInstruction: buildSystemPrompt(),
      responseMimeType: "application/json",
      responseSchema: buildResponseSchema(),
      temperature: 0.3
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini 没有返回内容。");
  }

  return parseBaselinePayload(JSON.parse(text));
}
