import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as React from "react";

// The app uses the automatic JSX runtime (Next 15 / React 19), so pages do not
// `import React`. Under tsx/esbuild the test transform compiles JSX to the
// classic `React.createElement`, which resolves `React` from the global scope.
// Expose it globally for the duration of these tests so calling a page function
// can construct its element tree. This is a test-only shim; product code is
// unchanged and correct.
(globalThis as typeof globalThis & { React?: typeof React }).React = React;

import { GET as reportRouteGet } from "../app/api/report/[id]/route";
import HomePage from "../app/page";
import EvaluatePage from "../app/evaluate/page";
import CasesPage from "../app/cases/page";
import CaseDetailPage from "../app/cases/[id]/page";
import WorkspacePage from "../app/workspace/page";

// Every known demo case plus an unknown id, which must fall back to the default
// demo instead of throwing. This is the cheap UI-regression guard the project
// was missing: it does not render to a DOM, but importing each page module
// evaluates its whole component/import graph, and calling the page function
// runs the real demo-data loading path.
const CASE_IDS = ["demo_fashion", "demo_robotics", "demo_ai_tool", "demo_pixai", "demo_snack", "demo_protein_drink"] as const;

function assertRenderable(node: unknown, label: string): void {
  // A React element is a truthy object; we deliberately avoid asserting the
  // exact $$typeof symbol because it differs across React versions.
  assert.ok(node && typeof node === "object", `${label} should return a renderable element`);
}

type ReactElementLike = {
  type?: unknown;
  props?: { children?: unknown; alt?: unknown; "aria-label"?: unknown; href?: unknown; [key: string]: unknown };
};

// Invoke a function component (sync server component) once to expand its tree so
// collectText / collectHrefs can walk into rendered output instead of stopping at
// the placeholder element. Returns the original node for host elements/strings.
function expandFunctionComponent(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  const element = node as ReactElementLike;
  if (typeof element.type === "function") {
    try {
      return (element.type as (props: unknown) => unknown)(element.props ?? {});
    } catch {
      return null;
    }
  }
  return node;
}

function collectText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (typeof node !== "object") return "";

  const expanded = expandFunctionComponent(node);
  if (expanded !== node) return collectText(expanded);

  const props = (node as ReactElementLike).props;
  if (!props) return "";

  return [props.alt, props["aria-label"], props.children].map(collectText).join(" ");
}

function collectHrefs(node: unknown): string[] {
  if (node == null || typeof node === "boolean") return [];
  if (Array.isArray(node)) return node.flatMap(collectHrefs);
  if (typeof node !== "object") return [];

  const expanded = expandFunctionComponent(node);
  if (expanded !== node) return collectHrefs(expanded);

  const props = (node as ReactElementLike).props;
  if (!props) return [];

  const ownHref = typeof props.href === "string" ? [props.href] : [];
  return [...ownHref, ...collectHrefs(props.children)];
}

describe("report markdown download API", () => {
  it("returns a markdown attachment for a known case", async () => {
    const response = await reportRouteGet(new Request("http://test/api/report/demo_fashion"), {
      params: Promise.resolve({ id: "demo_fashion" })
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/markdown/);
    assert.match(response.headers.get("content-disposition") ?? "", /attachment; filename=".+"/);
    assert.ok((await response.text()).length > 0, "markdown body should not be empty");
  });

  it("returns customer-facing Chinese markdown for every GTM brief", async () => {
    for (const caseId of CASE_IDS) {
      const response = await reportRouteGet(new Request(`http://test/api/report/${caseId}`), {
        params: Promise.resolve({ id: caseId })
      });
      const markdown = await response.text();

      assert.equal(response.status, 200);
      assert.match(markdown, /^# .+热点适配简报/m);
      assert.match(markdown, /## 1\. 最终建议/);
      assert.match(markdown, /## 4\. 营销切入点/);
      assert.doesNotMatch(
        markdown,
        /GTM Brief|Executive recommendation|Score breakdown|Campaign angle|Content ideas|Risk assessment|Final decision/
      );
    }
  });

  it("falls back to a default report for an unknown id instead of throwing", async () => {
    const response = await reportRouteGet(new Request("http://test/api/report/nope"), {
      params: Promise.resolve({ id: "nope" })
    });

    assert.equal(response.status, 200);
    assert.ok((await response.text()).length > 0);
  });

  it("keeps the PixAI brief aligned with its evidence-adjusted verdict", async () => {
    const response = await reportRouteGet(new Request("http://test/api/report/demo_pixai"), {
      params: Promise.resolve({ id: "demo_pixai" })
    });
    const markdown = await response.text();

    assert.match(markdown, /\*\*谨慎测试。\*\*/);
    assert.match(markdown, /基准判断：\*\*强烈建议跟进\*\*/);
    assert.match(markdown, /证据门槛后判断：\*\*谨慎测试\*\*/);
    assert.match(markdown, /证据门槛：\*\*证据部分通过\*\*/);
    assert.match(markdown, /建议动作：\*\*小测试\*\*/);
    assert.match(markdown, /\| 品牌安全 \| 10% \| 25 \|/);
    // brandSafety drops to 25, so it is always a gate-flagged slot; the second slot varies with the
    // freshly collected evidence run, so assert only the stable membership rather than the full list.
    assert.match(markdown, /仍需补齐：[^\n]*品牌安全/);
  });
});

describe("page route smoke tests", () => {
  it("renders the home page", () => {
    assertRenderable(HomePage(), "HomePage");
  });

  it("surfaces one interview-ready demo as the primary entry point", () => {
    const text = collectText(HomePage());
    const hrefs = collectHrefs(HomePage());

    assert.match(text, /产品该不该追热点？/);
    assert.match(text, /查看完整案例/);
    assert.match(text, /PixAI × AI 生成原创动漫角色/);
    assert.ok(hrefs.includes("/cases/demo_pixai"));
    assert.match(text, /要不要蹭热点/);
    assert.match(text, /从热点到行动，三步完成。/);
    assert.doesNotMatch(text, /中端男装 × 静奢风/);
    assert.doesNotMatch(text, /零食 × 迪拜风开心果脆/);
  });

  it("renders the workspace page (and loads the WorkspaceClient module)", () => {
    assertRenderable(WorkspacePage(), "WorkspacePage");
  });

  it("renders the evaluate page (and loads the EvaluateClient module)", () => {
    assertRenderable(EvaluatePage(), "EvaluatePage");
  });

  it("renders the cases gallery with only the interview demo", () => {
    const text = collectText(CasesPage());

    assert.match(text, /案例展示/);
    assert.match(text, /基准分 → 证据修正后/);
    assert.match(text, /PixAI × AI 生成原创动漫角色/);
    assert.doesNotMatch(text, /中端男装 × 静奢风/);
    assert.doesNotMatch(text, /零食 × 迪拜风开心果脆/);
  });

  it("renders a one-page case detail for every featured case", async () => {
    for (const id of ["demo_fashion", "demo_pixai", "demo_snack"]) {
      const node = await CaseDetailPage({ params: Promise.resolve({ id }) });
      assertRenderable(node, `CaseDetailPage(id=${id})`);
      assert.match(collectText(node), /证据修正后/);
    }
  });
});
