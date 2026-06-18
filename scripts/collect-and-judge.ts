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
 *   GEMINI_API_KEY=… TIKHUB_API_KEY=… node --import tsx scripts/collect-and-judge.ts demo_ai_tool
 *   node --import tsx scripts/collect-and-judge.ts demo_lego --dry   # collect+judge, print, no write
 */
import { GoogleGenAI, Type } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { collectFreeEvidence } from "../lib/free-evidence-providers";
import { buildEvidenceDraft, type EvidenceCandidate } from "../lib/evidence-collector";
import { adjustScores } from "../lib/evidence-adjustment";
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

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

type CaseDef = { caseId: string; product: string; trend: string; trendDescription: string; baseline: Scores };

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
}

/** Reuse existing committed data so the product/trend/baseline aren't re-invented. */
function loadCase(caseId: string): CaseDef {
  if (caseId === "demo_ai_tool") {
    const d = readJson("demo_ai_tool.json");
    return { caseId, product: d.product.name, trend: d.trend.name, trendDescription: d.trend.description, baseline: d.scores };
  }
  if (caseId === "demo_lego") {
    const s = readJson("lego_trend_shortlist.json");
    const f1 = s.candidates.find((c: any) => c.id === "lego_f1_race_trend");
    return { caseId, product: s.productName, trend: f1.trendName, trendDescription: f1.trendDescription, baseline: f1.baselineScores };
  }
  throw new Error(`unknown case: ${caseId} (options: demo_ai_tool, demo_lego)`);
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

function stanceSystemPrompt(): string {
  return [
    "你是一个证据立场判定器。给你一个【产品】【候选热点】和若干条从社媒/社区真实采集到的【snippet】。",
    "对每条 snippet，判断它对 7 个『产品×趋势适配』维度分别是 supports（支持）/ contradicts（反对）/ irrelevant（无关）。",
    "",
    "7 个维度（英文 key）：audienceOverlap 受众重合、useCaseRelevance 场景相关、messageBridge 卖点桥接、",
    "creativeFeasibility 内容可执行、commercialIntent 商业意图、brandSafety 品牌安全、timingSaturation 时机与饱和。",
    "",
    "铁律：",
    "1. 只依据 snippet 文本本身判断，不要用你的世界知识补充 snippet 里没有的信息。",
    "2. quote 必须是 snippet 原文里【逐字出现】的片段；编造 quote 的判断会被丢弃。",
    "3. 只输出立场标签，绝不输出任何分数、数字、百分比、URL 或最终建议——评分由确定性引擎决定，不是你。",
    "4. 只有文本明确指向某维度时才给 supports/contradicts；泛泛而谈或不确定一律 irrelevant。",
    "5. 一条 snippet 可以同时 supports 一个维度、contradicts 另一个维度。"
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
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: stanceUserPrompt(def, snippets),
    config: {
      systemInstruction: stanceSystemPrompt(),
      responseMimeType: "application/json",
      responseSchema: stanceSchema(),
      temperature: 0.2
    }
  });
  const text = response.text;
  if (!text) throw new Error("Gemini 没有返回内容。");
  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.judgements) ? (parsed.judgements as Judgement[]) : [];
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
  if (!caseId) {
    console.error("usage: node --import tsx scripts/collect-and-judge.ts <demo_ai_tool|demo_lego> [--dry]");
    process.exit(1);
  }
  const def = loadCase(caseId);
  console.log(`\n=== ${caseId}: ${def.product} × ${def.trend} ===`);

  // 1) real collect
  const collected = await collectFreeEvidence({ trend: def.trend, product: def.product });
  console.log(`采集到 ${collected.candidates.length} 条 candidate，来源:`, collected.bySource);
  const snippets = dedupeSnippets(collected.candidates);
  console.log(`去重后 ${snippets.length} 条独立 snippet 送 Gemini 判 stance…`);
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

  // 4) classifier owns tier → 5) engine adjusts the score
  const draft = buildEvidenceDraft({
    id: `${caseId}_evidence`,
    case: caseId,
    researchDate: new Date().toISOString().slice(0, 10),
    tooling: "Live collect (HN/GDELT/TikHub) + Gemini stance layer; deterministic supports→up / contradicts→down.",
    baselineScores: def.baseline,
    candidates: judged
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
