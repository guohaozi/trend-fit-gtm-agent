import { NextResponse } from "next/server";
import {
  generateBaselineScores,
  type BaselineProductInput,
  type BaselineTrendInput
} from "@/lib/baseline-scorer";

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
  // Graceful degradation: no key → 503 so the UI can fall back to manual scoring,
  // mirroring the SerpApi fixture pattern. We never construct the client without a key.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "AI 自动评分需要配置 ANTHROPIC_API_KEY（服务端）。你仍然可以手动给七个维度打分。",
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

  if (!product.name || !trend.trendName) {
    return NextResponse.json({ error: "缺少产品名称或热点名称。" }, { status: 400 });
  }

  try {
    const result = await generateBaselineScores(product, trend);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `自动评分失败：${message}` }, { status: 502 });
  }
}
