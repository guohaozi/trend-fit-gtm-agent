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
import FitScorePage from "../app/fit-score/page";
import ReportPage from "../app/report/page";
import ProductProfilePage from "../app/product-profile/page";
import TrendInputPage from "../app/trend-input/page";
import WorkspacePage from "../app/workspace/page";

// Every known demo case plus an unknown id, which must fall back to the default
// demo instead of throwing. This is the cheap UI-regression guard the project
// was missing: it does not render to a DOM, but importing each page module
// evaluates its whole component/import graph, and calling the page function
// runs the real demo-data loading path.
const CASE_IDS = ["demo_fashion", "demo_robotics", "demo_ai_tool", "demo_snack"] as const;
const CASE_INPUTS = [undefined, ...CASE_IDS, "unknown-case"] as const;
const PROFILE_INPUTS = [undefined, "risk_sensitive", "ecommerce_conversion", "not-a-profile"] as const;

function assertRenderable(node: unknown, label: string): void {
  // A React element is a truthy object; we deliberately avoid asserting the
  // exact $$typeof symbol because it differs across React versions.
  assert.ok(node && typeof node === "object", `${label} should return a renderable element`);
}

function collectText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (typeof node !== "object") return "";

  const props = (node as { props?: { children?: unknown; alt?: unknown; "aria-label"?: unknown } }).props;
  if (!props) return "";

  return [props.alt, props["aria-label"], props.children].map(collectText).join(" ");
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

  it("falls back to a default report for an unknown id instead of throwing", async () => {
    const response = await reportRouteGet(new Request("http://test/api/report/nope"), {
      params: Promise.resolve({ id: "nope" })
    });

    assert.equal(response.status, 200);
    assert.ok((await response.text()).length > 0);
  });
});

describe("page route smoke tests", () => {
  it("renders the home page", () => {
    assertRenderable(HomePage(), "HomePage");
  });

  it("surfaces the redesigned homepage story and workspace entry points", () => {
    const text = collectText(HomePage());

    assert.match(text, /这个产品该不该追这个热点？/);
    assert.match(text, /打开工作台/);
    assert.match(text, /回放免 Key Demo/);
    assert.match(text, /没有数据不等于有证据/);
    assert.match(text, /证据等级由分类器决定/);
    assert.match(text, /工作台预览/);
    assert.match(text, /带证据的案例/);
  });

  it("renders the workspace page (and loads the WorkspaceClient module)", () => {
    assertRenderable(WorkspacePage(), "WorkspacePage");
  });

  it("renders the product-profile page for every case input", async () => {
    for (const caseId of CASE_INPUTS) {
      const node = await ProductProfilePage({ searchParams: Promise.resolve({ case: caseId }) });
      assertRenderable(node, `ProductProfilePage(case=${caseId})`);
    }
  });

  it("renders the trend-input page for every case input", async () => {
    for (const caseId of CASE_INPUTS) {
      const node = await TrendInputPage({ searchParams: Promise.resolve({ case: caseId }) });
      assertRenderable(node, `TrendInputPage(case=${caseId})`);
    }
  });

  it("renders the fit-score page across cases and profiles", async () => {
    for (const caseId of CASE_INPUTS) {
      for (const profile of PROFILE_INPUTS) {
        const node = await FitScorePage({ searchParams: Promise.resolve({ case: caseId, profile }) });
        assertRenderable(node, `FitScorePage(case=${caseId}, profile=${profile})`);
      }
    }
  });

  it("renders the report page across cases and profiles", async () => {
    for (const caseId of CASE_INPUTS) {
      for (const profile of PROFILE_INPUTS) {
        const node = await ReportPage({ searchParams: Promise.resolve({ case: caseId, profile }) });
        assertRenderable(node, `ReportPage(case=${caseId}, profile=${profile})`);
      }
    }
  });
});
