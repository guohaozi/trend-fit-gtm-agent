import { NextResponse } from "next/server";
import { buildEvidenceDraft } from "@/lib/evidence-collector";
import { collectFreeEvidence } from "@/lib/free-evidence-providers";
import { checkAccess, clientIp } from "@/lib/access-gate";
import { SCORE_KEYS, type Scores } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function neutralScores(): Scores {
  return Object.fromEntries(SCORE_KEYS.map((key) => [key, 50])) as Scores;
}

export async function POST(request: Request) {
  let body: { product?: unknown; trend?: unknown } | null = null;
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed;
  } catch {
    body = null;
  }

  const product = text((body?.product as Record<string, unknown>)?.name ?? body?.product);
  const trend = text((body?.trend as Record<string, unknown>)?.trendName ?? body?.trend);

  if (!trend) {
    return NextResponse.json({ error: "缺少热点名称。" }, { status: 400 });
  }

  // Gate + per-IP rate limit (open when unconfigured). Evidence collection is free, so we do
  // NOT consume a registration-code use — only validate + rate-limit.
  const access = await checkAccess({
    code: request.headers.get("x-access-code") ?? "",
    ip: clientIp(request)
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const collected = await collectFreeEvidence({ trend, product: product || undefined });
    const draft = buildEvidenceDraft({
      id: "live-free-evidence",
      case: "live",
      researchDate: new Date().toISOString().slice(0, 10),
      tooling: "Reddit JSON + HN Algolia + GDELT (free, no key)",
      baselineScores: neutralScores(),
      candidates: collected.candidates
    });

    const tierCounts = draft.evidence.reduce<Record<string, number>>((acc, item) => {
      acc[item.sourceTier] = (acc[item.sourceTier] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      tooling: draft.tooling,
      bySource: collected.bySource,
      collected: collected.candidates.length,
      kept: draft.evidence.length,
      dropped: draft.droppedCandidates.length,
      tierCounts,
      evidence: draft.evidence,
      droppedCandidates: draft.droppedCandidates
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `证据采集失败：${message}` }, { status: 502 });
  }
}
