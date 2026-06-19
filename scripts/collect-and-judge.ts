/**
 * Offline one-off (interview-week P0). For ONE demo case:
 *   real-collect evidence (HN/GDELT/TikHub) → Gemini judges per-dimension STANCE on each
 *   real snippet → deterministic rules map supports→up / contradicts→down / irrelevant→skip
 *   → freeze data/<case>_evidence.json.
 *
 * The LLM only LABELS stance on externally-collected text (with a verbatim quote); it never
 * sets score / tier / direction / the verdict — a deterministic rule does, the source-tier
 * classifier owns tier, and the existing engine owns the score. Preserves 采集者不能兼裁判.
 *
 * NOT wired into the live request path; changes NO engine file. Run from the project root:
 *   GEMINI_API_KEY=… TIKHUB_API_KEY=… node --import tsx scripts/collect-and-judge.ts demo_pixai
 *   node --import tsx scripts/collect-and-judge.ts demo_lego --dry   # collect+judge, print, no write
 */
import { GoogleGenAI, Type } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { collectFreeEvidence } from "../lib/free-evidence-providers";
import { buildEvidenceDraft, type EvidenceCandidate } from "../lib/evidence-collector";
import { adjustScores } from "../lib/evidence-adjustment";
import { SerpApiGoogleTrendsSource } from "../lib/seo-keyword-provider";
import { assertDemoFixtureReady } from "../lib/demo-fixture-guard";
import { SCORE_KEYS, type ScoreKey, type Scores } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

// Standalone node doesn't auto-load .env.local the way Next does. Load it so this script
// reads GEMINI_API_KEY / TIKHUB_API_KEY from the same file the app uses.
function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";

type CaseDef = { caseId: string; product: string; trend: string; trendDescription: string; baseline: Scores; searchTerms: string[]; trendsQuery?: string };

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
}

/** Reuse existing committed data so the product/trend/baseline aren't re-invented. */
function loadCase(caseId: string): CaseDef {
  if (caseId === "demo_pixai") {
    // New real-evidence case. Inlined here (NOT touching the hard-asserted demo_ai_tool baseline).
    // baseline = AI hypothesis: high fit, but brandSafety/timing held at 50 (AI-art style-theft /
    // copyright debate + a crowded AI-art lane) so there is real risk tension to show.
    return {
      caseId,
      product: "PixAI",
      trend: "AI 生成原创动漫角色（OC）",
      trendDescription:
        "二次元爱好者用 AI 生成原创角色（OC）、自设与同人插画，并在小红书 / TikTok / Reddit 分享捏崽和设定。",
      baseline: {
        audienceOverlap: 100, useCaseRelevance: 100, messageBridge: 100, creativeFeasibility: 100,
        commercialIntent: 75, brandSafety: 50, timingSaturation: 50
      } as Scores,
      searchTerms: ["PixAI", "AI 绘画", "AI anime art"],
      trendsQuery: "AI art generator"
    };
  }
  if (caseId === "demo_lego") {
    const s = readJson("lego_trend_shortlist.json");
    const wc = s.candidates.find((c: any) => c.id === "lego_world_cup_trend");
    return { caseId, product: s.productName, trend: wc.trendName, trendDescription: wc.trendDescription, baseline: wc.baselineScores, searchTerms: ["世界杯 2026", "乐高 世界杯", "LEGO World Cup"], trendsQuery: "World Cup 2026" };
  }
  throw new Error(`unknown case: ${caseId} (options: demo_pixai, demo_lego)`);
}

// ---- AI stance layer: outputs only structured labels, never scores/tier/direction ----
type Snippet = { snippetId: string; text: string; sourceUrl: string };
type Impact = { dimension: string; stance: string; quote: string; claim: string };
type Judgement = { snippetId: string; impacts: Impact[] };

function stanceSchema() {
  const impact = {
    type: Type.OBJECT,
    properties: {
      dimension: { type: Type.STRING, description: "one of the 7 English dimension keys" },
      stance: { type: Type.STRING, description: "supports | contradicts | irrelevant" },
      quote: { type: Type.STRING, description: "a substring that appears VERBATIM in the snippet" },
      claim: { type: Type.STRING, description: "one short Chinese sentence explaining the call" }
    },
    required: ["dimension", "stance", "quote", "claim"],
    propertyOrdering: ["dimension", "stance", "quote", "claim"]
  };
  const judgement = {
    type: Type.OBJECT,
    properties: {
      snippetId: { type: Type.STRING },
      impacts: { type: Type.ARRAY, items: impact }
    },
    required: ["snippetId", "impacts"],
    propertyOrdering: ["snippetId", "impacts"]
  };
  return {
    type: Type.OBJECT,
    properties: { judgements: { type: Type.ARRAY, items: judgement } },
    required: ["judgements"],
    propertyOrdering: ["judgements"]
  };
}

function stanceSystemPrompt(def: CaseDef): string {
  return [
    "你是一个严格的证据立场判定器。下面给你一个【产品】【候选热点】，以及若干条从社媒/社区真实采集的【snippet】。",
    `【产品】${def.product}`,
    `【候选热点】${def.trend} —— ${def.trendDescription}`,
    "对每条 snippet，判断它对下面 7 个「产品×趋势适配」维度分别是 supports / contradicts / irrelevant。",
    "",
    "【最重要原则——实质相关】判断必须基于 snippet 的实质内容，且必须实质针对【这个产品】【这个热点】或其受众/场景/争议。",
    "仅仅出现某个关键词、平台名、品类名，或泛泛的商业/市场/赚钱字眼，都【不构成】判断依据 → 一律 irrelevant。",
    "宁可漏判（irrelevant），也不要把无关内容牵强地关联到某维度。不要用世界知识补充 snippet 没写的东西。",
    "用户名、纯标签(#xxx)、导航词、广告、与产品/热点无实质关联的内容 → irrelevant。",
    "",
    "【7 个维度 + 判定标准】（只有 snippet 实质满足时才给 supports/contradicts）：",
    "- audienceOverlap 受众重合：snippet 显示真实用户【本身就是】这个热点/产品的目标人群（在讨论、使用、关心它）。仅提到平台名（如『小红书』）不算。",
    "- useCaseRelevance 场景相关：snippet 显示产品融入这个热点的【使用场景】真实、自然。",
    "- messageBridge 卖点桥接：snippet 显示这个热点能顺畅连接到产品的真实卖点。",
    "- creativeFeasibility 内容可执行：snippet 是这类内容【真实被产出】的实例（确有人在做）。",
    "- commercialIntent 商业意图：snippet 显示对【该产品或同类产品】的购买/付费/订阅/试用/比价意图。泛泛的『市场/赛道/股市/赚钱/创业』【不算】。",
    "- brandSafety 品牌安全：snippet 显示争议/风险/负面（版权、抄袭、NSFW、抵制、反感）→ contradicts；显示正面/安全/被认可 → supports。",
    "- timingSaturation 时机饱和：snippet 明确说热点【刚兴起/还新鲜】→ supports；明确说【已经烂大街/过气/卷】→ contradicts；否则 irrelevant。",
    "",
    "【输出红线】：",
    "1. quote 必须是 snippet 原文里【逐字出现】的片段；编造的判断会被丢弃。",
    "2. 只输出立场标签，绝不输出任何分数、数字、URL 或最终建议——评分由确定性引擎决定，不是你。",
    "3. 一条 snippet 可以同时 supports 一个维度、contradicts 另一个维度。"
  ].join("\n");
}

function stanceUserPrompt(def: CaseDef, snippets: Snippet[]): string {
  const lines = [
    `【产品】${def.product}`,
    `【候选热点】${def.trend} — ${def.trendDescription}`,
    "",
    "【snippets】(逐条判断，引用 snippetId)："
  ];
  for (const s of snippets) lines.push(`- ${s.snippetId}: ${s.text}`);
  return lines.join("\n");
}

/** Collected candidates are per-dimension; dedupe by note text → one snippet per real text. */
function dedupeSnippets(candidates: EvidenceCandidate[]): Snippet[] {
  const seen = new Map<string, Snippet>();
  let i = 0;
  for (const c of candidates) {
    const text = c.note.trim();
    if (!text || seen.has(text)) continue;
    seen.set(text, { snippetId: `s${i++}`, text, sourceUrl: c.sourceUrl });
  }
  return [...seen.values()];
}

async function judgeStance(def: CaseDef, snippets: Snippet[]): Promise<Judgement[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: stanceUserPrompt(def, snippets),
        config: {
          systemInstruction: stanceSystemPrompt(def),
          responseMimeType: "application/json",
          responseSchema: stanceSchema(),
          temperature: 0.2
        }
      });
      const text = response.text;
      if (!text) throw new Error("Gemini 没有返回内容。");
      const parsed = JSON.parse(text);
      return Array.isArray(parsed?.judgements) ? (parsed.judgements as Judgement[]) : [];
    } catch (e: any) {
      const status = e?.status ?? e?.code;
      if ((status !== 503 && status !== 429 && status !== 500) || attempt === maxAttempts) throw e;
      const waitMs = 3000 * attempt;
      console.log(`  Gemini ${status} 过载，${waitMs / 1000}s 后重试（${attempt}/${maxAttempts - 1}）…`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error("Gemini 多次重试仍失败。");
}

/**
 * Deterministic map: stance → direction. supports→up, contradicts→down, irrelevant→skip.
 * Hard guards: dimension must be legal; quote must be found VERBATIM in the snippet text.
 */
function mapToCandidates(snippets: Snippet[], judgements: Judgement[]): EvidenceCandidate[] {
  const byId = new Map(snippets.map((s) => [s.snippetId, s]));
  const out: EvidenceCandidate[] = [];
  let n = 0;
  for (const j of judgements) {
    const snip = byId.get(j.snippetId);
    if (!snip) continue;
    for (const im of j.impacts ?? []) {
      const dim = im.dimension as ScoreKey;
      if (!SCORE_KEYS.includes(dim)) continue;
      if (im.stance !== "supports" && im.stance !== "contradicts") continue; // irrelevant → skip
      const quote = (im.quote ?? "").trim();
      if (!quote || !snip.text.includes(quote)) continue; // anti-hallucination: verbatim only
      out.push({
        id: `aij-${n++}-${dim}`,
        dimension: dim,
        direction: im.stance === "supports" ? "up" : "down",
        magnitude: "weak", // weak so the existing thresholds need ≥2 independent rows to move a step
        desiredConfidence: "medium",
        sourceUrl: snip.sourceUrl,
        verificationStatus: "verified",
        sourceSignals: ["comment_corpus"],
        note: `${im.claim}「${quote}」`
      });
    }
  }
  return out;
}

// ---- SerpApi Google Trends: deterministic timing/commercial evidence (NOT via the AI layer) ----
const SERP_SIGNAL: Record<string, { dim: ScoreKey; dir: "up" | "down"; mag: "weak" | "moderate" | "strong"; conf: "low" | "medium" | "high" }> = {
  breakout_keyword: { dim: "timingSaturation", dir: "up", mag: "strong", conf: "high" },
  high_growth_keyword: { dim: "timingSaturation", dir: "up", mag: "moderate", conf: "medium" },
  moderate_growth_keyword: { dim: "timingSaturation", dir: "up", mag: "weak", conf: "medium" },
  trend_rising: { dim: "timingSaturation", dir: "up", mag: "moderate", conf: "medium" },
  trend_declining: { dim: "timingSaturation", dir: "down", mag: "moderate", conf: "medium" },
  trend_saturated: { dim: "timingSaturation", dir: "down", mag: "moderate", conf: "medium" },
  related_buying_query: { dim: "commercialIntent", dir: "up", mag: "moderate", conf: "medium" },
  low_search_demand: { dim: "commercialIntent", dir: "down", mag: "weak", conf: "medium" }
};

async function collectSerpApiTiming(trendsQuery?: string): Promise<EvidenceCandidate[]> {
  if (!process.env.SERPAPI_API_KEY || !trendsQuery) return [];
  try {
    const source = new SerpApiGoogleTrendsSource({});
    const r = await source.collect({ product: "", market: "", trend: trendsQuery });
    const out: EvidenceCandidate[] = [];
    let i = 0;
    for (const f of r.seoKeywordFindings as Array<Record<string, any>>) {
      const m = SERP_SIGNAL[f.signal];
      if (!m) continue;
      out.push({
        id: `serp-${i++}-${m.dim}`,
        dimension: m.dim,
        direction: m.dir,
        magnitude: m.mag,
        desiredConfidence: m.conf,
        sourceUrl: f.sourceUrl ?? "https://trends.google.com",
        verificationStatus: "verified",
        sourceSignals: ["research_report"],
        note: `Google Trends：${f.note ?? ""}（${f.query ?? trendsQuery}）`
      });
    }
    return out;
  } catch (e) {
    console.log(`  SerpApi 跳过：${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

function printDelta(baseline: Scores, evidenceCount: number, adjusted: ReturnType<typeof adjustScores>) {
  console.log(`\n证据 → 评分修正（${evidenceCount} 条有方向证据）：`);
  for (const key of SCORE_KEYS) {
    const from = baseline[key];
    const to = adjusted.adjusted[key];
    const net = adjusted.netByDimension[key];
    const mark = from === to ? "  =" : from < to ? " ↑↑" : " ↓↓";
    console.log(`${mark} ${key.padEnd(18)} ${String(from).padStart(3)} → ${String(to).padStart(3)}   (net ${net})`);
  }
}

async function main() {
  const caseId = process.argv[2];
  const dry = process.argv.includes("--dry");
  const cached = process.argv.includes("--cached");
  if (!caseId) {
    console.error("usage: node --import tsx scripts/collect-and-judge.ts <demo_ai_tool|demo_lego> [--dry]");
    process.exit(1);
  }
  const def = loadCase(caseId);
  console.log(`\n=== ${caseId}: ${def.product} × ${def.trend} ===`);

  // 1) real collect — search each REAL keyword separately. A short real term hits; a long
  // trend-sentence + brand name does not. A real product name IS a good term (Snapforge wasn't).
  // Cache the (paid) collected snippets to /tmp so a later Gemini failure or prompt tweak can be
  // re-run with --cached without re-billing TikHub.
  const cachePath = path.join("/tmp", `tf_cache_${caseId}_snippets.json`);
  let snippets: Snippet[];
  if (cached && fs.existsSync(cachePath)) {
    snippets = JSON.parse(fs.readFileSync(cachePath, "utf8")) as Snippet[];
    console.log(`复用缓存采集：${snippets.length} 条 snippet（--cached，未重新计费）`);
  } else {
    const allCandidates: EvidenceCandidate[] = [];
    const bySource: Record<string, number> = {};
    for (const term of def.searchTerms) {
      const r = await collectFreeEvidence({ trend: term });
      console.log(`  搜「${term}」→ ${r.candidates.length} 条`, r.bySource);
      allCandidates.push(...r.candidates);
      for (const [k, v] of Object.entries(r.bySource)) bySource[k] = (bySource[k] ?? 0) + v;
    }
    console.log(`采集合计 ${allCandidates.length} 条 candidate，来源:`, bySource);
    snippets = dedupeSnippets(allCandidates);
    fs.writeFileSync(cachePath, JSON.stringify(snippets, null, 2));
    console.log(`去重后 ${snippets.length} 条独立 snippet（已缓存，下次可 --cached 复用）`);
  }
  if (snippets.length === 0) {
    console.error("没采到任何 snippet（检查 key / 平台返回），终止。");
    process.exit(1);
  }

  // 2) AI stance → 3) deterministic up/down
  const judgements = await judgeStance(def, snippets);
  const judged = mapToCandidates(snippets, judgements);
  const ups = judged.filter((c) => c.direction === "up").length;
  const downs = judged.filter((c) => c.direction === "down").length;
  console.log(`AI 判定保留 ${judged.length} 条有方向证据：↑${ups} supports / ↓${downs} contradicts`);

  // SerpApi Google Trends → deterministic timing/commercial evidence (bypasses the AI stance layer).
  const serp = await collectSerpApiTiming(def.trendsQuery);
  console.log(`SerpApi Google Trends「${def.trendsQuery ?? "-"}」→ ${serp.length} 条 timing/commercial 证据`);
  const allJudged = [...judged, ...serp];

  // 4) classifier owns tier → 5) engine adjusts the score
  const draft = buildEvidenceDraft({
    id: `${caseId}_evidence`,
    case: caseId,
    researchDate: new Date().toISOString().slice(0, 10),
    tooling: "Live collect (HN/GDELT/TikHub) + Gemini stance + SerpApi Google Trends; deterministic up/down.",
    baselineScores: def.baseline,
    candidates: allJudged
  });
  console.log(`分级后保留 ${draft.evidence.length} 条 / 丢弃 ${draft.droppedCandidates.length} 条`);
  const adjusted = adjustScores(def.baseline, draft.evidence);
  printDelta(def.baseline, draft.evidence.length, adjusted);

  assertDemoFixtureReady({
    evidenceCount: draft.evidence.length,
    baseline: def.baseline,
    adjusted: adjusted.adjusted
  });

  // 6) freeze
  const payload = {
    id: `${caseId}_evidence`,
    case: caseId,
    researchDate: new Date().toISOString().slice(0, 10),
    tooling: "Live collect (HN/GDELT/TikHub) + Gemini stance layer; deterministic up/down mapping. Frozen for demo.",
    baselineScores: def.baseline,
    evidence: draft.evidence
  };
  const outPath = path.join(DATA_DIR, `${caseId}_evidence.json`);
  if (dry) {
    console.log("\n--dry：不写文件。evidence 预览：\n", JSON.stringify(draft.evidence, null, 2));
  } else {
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
    console.log(`\n已写入 ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
