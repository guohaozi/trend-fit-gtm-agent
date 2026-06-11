import { NextResponse } from "next/server";
import googleTrendsFixture from "@/examples/google-trends-workspace.fixture.json";
import {
  SeoKeywordProviderError,
  SerpApiGoogleTrendsSource,
  serpApiKeywordResearchToFindings,
  seoKeywordFindingsToCandidates
} from "@/lib/seo-keyword-provider";
import type { SeoKeywordFinding } from "@/lib/seo-keyword-provider";
import type { SerpApiKeywordResearchInput } from "@/lib/seo-keyword-provider";
import {
  buildWorkspaceEvidenceRowsFromCandidates,
  materializeWorkspaceEvidenceRows
} from "@/lib/workspace-evaluator";

export const runtime = "nodejs";
const typedGoogleTrendsFixture = googleTrendsFixture as SerpApiKeywordResearchInput;

type GoogleTrendsRequestBody = {
  product?: unknown;
  market?: unknown;
  trend?: unknown;
  geo?: unknown;
  date?: unknown;
  fixture?: unknown;
};

function textField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function readBody(request: Request): Promise<GoogleTrendsRequestBody | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as GoogleTrendsRequestBody : null;
  } catch {
    return null;
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function successResponse({
  provider,
  tooling,
  product,
  market,
  trend,
  findings
}: {
  provider: "google-trends" | "google-trends-fixture";
  tooling: string;
  product: string;
  market: string;
  trend: string;
  findings: SeoKeywordFinding[];
}) {
  const candidates = seoKeywordFindingsToCandidates(findings);
  const rows = buildWorkspaceEvidenceRowsFromCandidates(candidates);
  const materialized = materializeWorkspaceEvidenceRows(rows);

  return NextResponse.json({
    provider,
    tooling,
    target: { product, market, trend },
    findingsCount: findings.length,
    rows,
    computedRows: materialized.rows,
    evidenceCount: materialized.evidence.length,
    droppedCount: materialized.droppedRows.length
  });
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const product = textField(body?.product);
  const market = textField(body?.market);
  const trend = textField(body?.trend);

  if (!product || !market || !trend) {
    return errorResponse("Missing required product, market, or trend.", 400);
  }

  if (body?.fixture === true) {
    return successResponse({
      provider: "google-trends-fixture",
      tooling: "SerpApi Google Trends fixture",
      product,
      market,
      trend,
      findings: serpApiKeywordResearchToFindings(typedGoogleTrendsFixture)
    });
  }

  try {
    const source = new SerpApiGoogleTrendsSource({
      geo: textField(body?.geo),
      date: textField(body?.date)
    });
    const result = await source.collect({ product, market, trend });
    return successResponse({
      provider: "google-trends",
      tooling: result.tooling ?? "SerpApi Google Trends",
      product,
      market,
      trend,
      findings: result.seoKeywordFindings ?? []
    });
  } catch (error) {
    if (error instanceof SeoKeywordProviderError) {
      const missingSetup = /SERPAPI_API_KEY|SerpApi key/i.test(error.message);
      return errorResponse(
        missingSetup
          ? "Missing server SerpApi key. Set SERPAPI_API_KEY before running workspace Google Trends."
          : error.message,
        missingSetup ? 503 : 502
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`Google Trends provider failed: ${message}`, 502);
  }
}
