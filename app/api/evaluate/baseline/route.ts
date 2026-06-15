import { NextResponse } from "next/server";
import {
  generateBaselineScores,
  type BaselineProductInput,
  type BaselineTrendInput
} from "@/lib/baseline-scorer";
import { checkAccess, clientIp, consumeAccess } from "@/lib/access-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  product?: Record<string, unknown>;
  trend?: Record<string, unknown>;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function readBody(request: Request): Promise<RequestBody | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as RequestBody) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // 1) Server not configured → 503 so the UI falls back to manual scoring. Checked first so
  //    a misconfigured server never consumes a registration-code use.
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI 自动评分需要配置 GEMINI_API_KEY（服务端）。你仍然可以手动给七个维度打分。",
        setupRequired: true
      },
      { status: 503 }
    );
  }

  const body = await readBody(request);
  const product: BaselineProductInput = {
    name: text(body?.product?.name),
    category: text(body?.product?.category),
    market: text(body?.product?.market),
    audience: text(body?.product?.audience),
    positioning: text(body?.product?.positioning),
    sellingPoints: text(body?.product?.sellingPoints),
    brandTone: text(body?.product?.brandTone),
    riskTolerance: text(body?.product?.riskTolerance) || "medium"
  };
  const trend: BaselineTrendInput = {
    trendName: text(body?.trend?.trendName),
    trendDescription: text(body?.trend?.trendDescription)
  };

  // 2) Bad input → 400 (before the gate, so it never burns a use).
  if (!product.name || !trend.trendName) {
    return NextResponse.json({ error: "缺少产品名称或热点名称。" }, { status: 400 });
  }

  // 3) Registration-code gate + per-IP rate limit (open if not configured). No consume yet.
  const accessCode = request.headers.get("x-access-code") ?? "";
  const access = await checkAccess({ code: accessCode, ip: clientIp(request) });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // 4) Do the work, then consume one use only on success (failures don't burn quota).
  try {
    const result = await generateBaselineScores(product, trend);
    const remaining = await consumeAccess(accessCode);
    return NextResponse.json({ ...result, remaining });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `自动评分失败：${message}` }, { status: 502 });
  }
}
