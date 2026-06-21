/**
 * One-off demo fixture builder:
 * real collection -> batched Gemini stance labels -> deterministic evidence engine -> frozen JSON.
 *
 * Run from the project root:
 *   node --import tsx scripts/collect-and-judge.ts demo_pixai --dry
 *   node --import tsx scripts/collect-and-judge.ts demo_lego --cached
 */
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertDemoFixtureReady } from "../lib/demo-fixture-guard";
import { adjustScores } from "../lib/evidence-adjustment";
import { generateEvidenceAdjustmentCaseFromDraft } from "../lib/evidence-case-generator";
import { buildEvidenceDraft, requireSourceCorroboration, type CollectedSnippet, type EvidenceCandidate } from "../lib/evidence-collector";
import { collectFreeEvidence } from "../lib/free-evidence-providers";
import {
  buildStanceSystemPrompt,
  buildStanceUserPrompt,
  chunkStanceSnippets,
  mapStanceJudgementsToCandidates,
  stanceResponseSchema,
  validateStanceJudgements,
  type StanceCaseContext,
  type StanceJudgement
} from "../lib/evidence-stance";
import { SerpApiGoogleTrendsSource, seoKeywordFindingsToCandidates } from "../lib/seo-keyword-provider";
import { SCORE_KEYS, type DemoCase, type RiskTolerance, type Scores } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";

export type CaseDef = {
  caseId: string;
  context: StanceCaseContext;
  baseline: Scores;
  riskTolerance: RiskTolerance;
  profileUsed?: string;
  searchTerms: string[];
  trendsQuery?: string;
};

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
}

export function loadCase(caseId: string): CaseDef {
  if (caseId === "demo_pixai") {
    const demo = readJson<DemoCase>("demo_pixai.json");
    return {
      caseId,
      context: {
        productName: demo.product.name,
        category: demo.product.category,
        market: demo.product.targetMarket.join("、"),
        audience: demo.product.audience,
        positioning: demo.product.positioning,
        sellingPoints: demo.product.sellingPoints,
        trendName: demo.trend.name,
        trendDescription: demo.trend.description
      },
      baseline: demo.scores,
      riskTolerance: demo.product.riskTolerance,
      profileUsed: demo.profileUsed,
      searchTerms: ["PixAI", "AI 绘画", "AI anime art"],
      trendsQuery: "AI art generator"
    };
  }

  if (caseId === "demo_lego") {
    const shortlist = readJson<{
      productName: string;
      profileUsed?: string;
      riskTolerance: RiskTolerance;
      candidates: Array<{ id: string; trendName: string; trendDescription: string; baselineScores: Scores }>;
    }>("lego_trend_shortlist.json");
    const trend = shortlist.candidates.find((candidate) => candidate.id === "lego_world_cup_trend");
    if (!trend) throw new Error("LEGO World Cup shortlist candidate is missing.");
    return {
      caseId,
      context: {
        productName: shortlist.productName,
        category: "construction toys and collectible display sets",
        market: "global",
        audience: "families, builders, collectors, football fans, and gift shoppers",
        positioning: "creative construction that turns shared cultural moments into hands-on play and display",
        sellingPoints: ["hands-on building", "collectible display", "family and fandom participation"],
        trendName: trend.trendName,
        trendDescription: trend.trendDescription
      },
      baseline: trend.baselineScores,
      riskTolerance: shortlist.riskTolerance,
      profileUsed: shortlist.profileUsed,
      searchTerms: ["世界杯 2026", "乐高 世界杯", "LEGO World Cup"],
      trendsQuery: "World Cup 2026"
    };
  }

  throw new Error(`Unknown case: ${caseId} (options: demo_pixai, demo_lego)`);
}

function uniqueSnippets(snippets: CollectedSnippet[]): CollectedSnippet[] {
  const bySource = new Map<string, CollectedSnippet>();
  for (const snippet of snippets) {
    if (!bySource.has(snippet.canonicalSourceId)) bySource.set(snippet.canonicalSourceId, snippet);
  }
  return [...bySource.values()].map((snippet, index) => ({ ...snippet, id: `snippet-${index}` }));
}

async function judgeBatch(context: StanceCaseContext, snippets: CollectedSnippet[]): Promise<StanceJudgement[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: buildStanceUserPrompt(context, snippets),
        config: {
          systemInstruction: buildStanceSystemPrompt(context),
          responseMimeType: "application/json",
          responseSchema: stanceResponseSchema(),
          temperature: 0.1
        }
      });
      if (!response.text) throw new Error("Gemini returned no content.");
      const parsed = JSON.parse(response.text) as { judgements?: StanceJudgement[] };
      if (!Array.isArray(parsed.judgements)) throw new Error("Gemini response has no judgements array.");
      return validateStanceJudgements(snippets, parsed.judgements);
    } catch (error: unknown) {
      const status = (error as { status?: number; code?: number }).status ?? (error as { code?: number }).code;
      if ([400, 401, 403].includes(status ?? 0) || attempt === maxAttempts) throw error;
      const waitMs = 2000 * attempt;
      console.log(`  Gemini batch retry ${attempt}/${maxAttempts - 1} in ${waitMs / 1000}s: ${error instanceof Error ? error.message : String(error)}`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw new Error("Gemini stance retries exhausted.");
}

async function judgeStance(context: StanceCaseContext, snippets: CollectedSnippet[]): Promise<EvidenceCandidate[]> {
  const judgements: StanceJudgement[] = [];
  const batches = chunkStanceSnippets(snippets);
  for (let index = 0; index < batches.length; index += 1) {
    console.log(`  Gemini stance batch ${index + 1}/${batches.length} (${batches[index].length} snippets)`);
    judgements.push(...await judgeBatch(context, batches[index]));
  }
  return mapStanceJudgementsToCandidates(snippets, judgements);
}

async function collectSerpEvidence(trendsQuery?: string): Promise<EvidenceCandidate[]> {
  if (!process.env.SERPAPI_API_KEY || !trendsQuery) return [];
  try {
    const result = await new SerpApiGoogleTrendsSource({}).collect({
      product: "",
      market: "",
      trend: trendsQuery
    });
    return seoKeywordFindingsToCandidates(result.seoKeywordFindings ?? []);
  } catch (error) {
    console.log(`  SerpApi skipped: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function printDelta(baseline: Scores, adjusted: ReturnType<typeof adjustScores>): void {
  console.log("\nEvidence score adjustment:");
  for (const key of SCORE_KEYS) {
    const from = baseline[key];
    const to = adjusted.adjusted[key];
    const mark = from === to ? "=" : from < to ? "up" : "down";
    console.log(`${mark.padEnd(4)} ${key.padEnd(20)} ${from} -> ${to} (net ${adjusted.netByDimension[key]})`);
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const caseId = process.argv[2];
  const dry = process.argv.includes("--dry");
  const cached = process.argv.includes("--cached");
  if (!caseId) throw new Error("Usage: node --import tsx scripts/collect-and-judge.ts <demo_pixai|demo_lego> [--dry] [--cached]");
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY.");

  const def = loadCase(caseId);
  console.log(`\n=== ${caseId}: ${def.context.productName} x ${def.context.trendName} ===`);
  const cachePath = path.join("/tmp", `tf_cache_${caseId}_snippets.json`);
  let snippets: CollectedSnippet[];

  if (cached && fs.existsSync(cachePath)) {
    snippets = readJsonFromPath<CollectedSnippet[]>(cachePath);
    console.log(`Reused ${snippets.length} cached snippets.`);
  } else {
    const collected: CollectedSnippet[] = [];
    const bySource: Record<string, number> = {};
    for (const term of def.searchTerms) {
      const result = await collectFreeEvidence({ trend: term });
      collected.push(...result.snippets);
      for (const [source, count] of Object.entries(result.bySource)) bySource[source] = (bySource[source] ?? 0) + count;
      console.log(`  collected "${term}": ${result.snippets.length} snippets`, result.bySource);
    }
    snippets = uniqueSnippets(collected);
    fs.writeFileSync(cachePath, JSON.stringify(snippets, null, 2));
    console.log(`Collected ${snippets.length} unique canonical snippets.`, bySource);
  }
  if (snippets.length === 0) throw new Error("No structured snippets collected.");

  const judged = await judgeStance(def.context, snippets);
  const serp = await collectSerpEvidence(def.trendsQuery);
  console.log(`Directional stance evidence: ${judged.length}; SerpApi evidence: ${serp.length}.`);

  const researchDate = new Date().toISOString().slice(0, 10);
  const tooling = `HN/GDELT/TikHub structured collection + Gemini ${MODEL} stance + SerpApi Google Trends; deterministic scoring.`;
  const draft = buildEvidenceDraft({
    id: `${caseId}_evidence`,
    case: caseId,
    researchDate,
    tooling,
    baselineScores: def.baseline,
    candidates: [...judged, ...serp]
  });
  // Single-source directional signals (e.g. a lone Google-Trends datapoint) are recorded but demoted
  // to context so they cannot move a score on their own — same bar the freeze guard enforces.
  draft.evidence = requireSourceCorroboration(draft.evidence);
  const adjustment = adjustScores(def.baseline, draft.evidence);
  printDelta(def.baseline, adjustment);

  if (process.argv.includes("--inspect")) {
    console.log("\nPer-dimension directional evidence (sourceId | direction | magnitude | note):");
    for (const key of SCORE_KEYS) {
      const items = draft.evidence.filter(
        (item) => item.dimension === key && item.evidenceUse !== "context" && item.direction !== "confirm"
      );
      if (items.length === 0) continue;
      const sources = new Set(items.map((item) => item.canonicalSourceId ?? item.sourceUrl));
      console.log(`\n  ${key} — ${items.length} items, ${sources.size} independent source(s):`);
      for (const item of items) {
        console.log(`    [${item.canonicalSourceId ?? item.sourceUrl}] ${item.direction}/${item.magnitude} :: ${item.note.slice(0, 90)}`);
      }
    }
    console.log("");
  }

  assertDemoFixtureReady({ evidence: draft.evidence, baseline: def.baseline, adjusted: adjustment.adjusted });

  const fixture = generateEvidenceAdjustmentCaseFromDraft({
    draft,
    riskTolerance: def.riskTolerance,
    profileUsed: def.profileUsed
  });
  const outPath = path.join(DATA_DIR, `${caseId}_evidence.json`);
  if (dry) {
    console.log("\n--dry: fixture not written.\n", JSON.stringify(fixture, null, 2));
  } else {
    fs.writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`);
    console.log(`\nWrote ${outPath}`);
  }
}

function readJsonFromPath<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
