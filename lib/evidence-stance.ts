import { Type } from "@google/genai";
import type { CollectedSnippet, EvidenceCandidate } from "./evidence-collector";
import { SCORE_KEYS, type ScoreKey } from "./types";

export const STANCE_BATCH_SIZE = 12;

export type StanceCaseContext = {
  productName: string;
  category: string;
  market: string;
  audience: string;
  positioning: string;
  sellingPoints: string[];
  trendName: string;
  trendDescription: string;
};

export type StanceImpact = {
  dimension: string;
  stance: string;
  quote: string;
  claim: string;
};

export type StanceJudgement = {
  snippetId: string;
  impacts: StanceImpact[];
};

export function stanceResponseSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      judgements: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            snippetId: { type: Type.STRING },
            impacts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dimension: { type: Type.STRING, enum: [...SCORE_KEYS] },
                  stance: { type: Type.STRING, enum: ["supports", "contradicts", "irrelevant"] },
                  quote: { type: Type.STRING },
                  claim: { type: Type.STRING }
                },
                required: ["dimension", "stance", "quote", "claim"]
              }
            }
          },
          required: ["snippetId", "impacts"]
        }
      }
    },
    required: ["judgements"]
  };
}

export function buildStanceSystemPrompt(context: StanceCaseContext): string {
  return [
    "你是严格的外部证据立场判定器。只能阅读给定 snippet，不得使用世界知识补充事实。",
    `产品：${context.productName}`,
    `品类：${context.category}`,
    `市场：${context.market}`,
    `目标受众：${context.audience}`,
    `定位：${context.positioning}`,
    `核心卖点：${context.sellingPoints.join("；")}`,
    `候选趋势：${context.trendName} —— ${context.trendDescription}`,
    "对每条 snippet 独立判断，不要受同批其他 snippet 影响。每个输入 snippetId 必须恰好返回一次。",
    "每个维度最多返回一次：audienceOverlap、useCaseRelevance、messageBridge、creativeFeasibility、commercialIntent、brandSafety、timingSaturation。",
    "立场只能是 supports、contradicts、irrelevant。仅关键词重合、用户名、纯标签、导航词、日期、音频名一律 irrelevant。",
    "quote 必须是 snippet 中逐字存在、能独立支撑判断的原文；纯标签或过短片段无效。",
    "AI 只做语义标签，不输出分数、权重、来源等级或最终建议。"
  ].join("\n");
}

export function buildStanceUserPrompt(context: StanceCaseContext, snippets: CollectedSnippet[]): string {
  return [
    `产品×趋势：${context.productName} × ${context.trendName}`,
    "逐条返回 judgement：",
    ...snippets.map((snippet) => `[${snippet.id}] (${snippet.platform}) ${snippet.text}`)
  ].join("\n");
}

export function chunkStanceSnippets(snippets: CollectedSnippet[]): CollectedSnippet[][] {
  const batches: CollectedSnippet[][] = [];
  for (let index = 0; index < snippets.length; index += STANCE_BATCH_SIZE) {
    batches.push(snippets.slice(index, index + STANCE_BATCH_SIZE));
  }
  return batches;
}

export function validateStanceJudgements(
  snippets: CollectedSnippet[],
  judgements: StanceJudgement[]
): StanceJudgement[] {
  const expectedIds = new Set(snippets.map((snippet) => snippet.id));
  const seen = new Set<string>();

  for (const judgement of judgements) {
    if (!expectedIds.has(judgement.snippetId)) throw new Error(`Unexpected snippet id: ${judgement.snippetId}`);
    if (seen.has(judgement.snippetId)) throw new Error(`Duplicate snippet id: ${judgement.snippetId}`);
    seen.add(judgement.snippetId);

    const dimensions = new Set<string>();
    for (const impact of judgement.impacts ?? []) {
      if (!SCORE_KEYS.includes(impact.dimension as ScoreKey)) throw new Error(`Invalid dimension: ${impact.dimension}`);
      if (dimensions.has(impact.dimension)) {
        throw new Error(`Duplicate dimension ${impact.dimension} for ${judgement.snippetId}`);
      }
      dimensions.add(impact.dimension);
      if (!["supports", "contradicts", "irrelevant"].includes(impact.stance)) {
        throw new Error(`Invalid stance: ${impact.stance}`);
      }
    }
  }

  const missing = [...expectedIds].filter((id) => !seen.has(id));
  if (missing.length > 0) throw new Error(`Missing snippet ids: ${missing.join(", ")}`);
  return judgements;
}

function isMeaningfulQuote(quote: string, text: string): boolean {
  const value = quote.replace(/\s+/g, " ").trim();
  if (value.length < 8 || !text.includes(value)) return false;
  if (/^(?:#[\p{L}\p{N}_-]+\s*)+$/u.test(value)) return false;
  return !/^(original audio|use template|explore|search|home)$/i.test(value);
}

export function mapStanceJudgementsToCandidates(
  snippets: CollectedSnippet[],
  judgements: StanceJudgement[]
): EvidenceCandidate[] {
  const byId = new Map(snippets.map((snippet) => [snippet.id, snippet]));
  const candidates: EvidenceCandidate[] = [];

  for (const judgement of judgements) {
    const snippet = byId.get(judgement.snippetId);
    if (!snippet) continue;
    for (const impact of judgement.impacts ?? []) {
      const dimension = impact.dimension as ScoreKey;
      if (!SCORE_KEYS.includes(dimension)) continue;
      if (impact.stance !== "supports" && impact.stance !== "contradicts") continue;
      const quote = impact.quote?.trim() ?? "";
      if (!isMeaningfulQuote(quote, snippet.text)) continue;
      candidates.push({
        id: `stance-${snippet.id}-${dimension}`,
        evidenceUse: "decision",
        canonicalSourceId: snippet.canonicalSourceId,
        dimension,
        direction: impact.stance === "supports" ? "up" : "down",
        magnitude: "weak",
        desiredConfidence: "medium",
        sourceUrl: snippet.sourceUrl,
        verificationStatus: snippet.verificationStatus,
        sourceSignals: [...snippet.sourceSignals],
        note: `${impact.claim}「${quote}」`
      });
    }
  }

  return candidates;
}
