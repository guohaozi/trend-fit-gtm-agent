import { NextResponse } from "next/server";
import { getDemoCase, getReportFileName, getReportMarkdown } from "@/lib/demo-cases";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const demo = getDemoCase(id);
  const markdown = getReportMarkdown(demo.id);
  const fileName = getReportFileName(demo.id);

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
