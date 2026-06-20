import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadCase } from "../scripts/collect-and-judge";

describe("offline demo case selection", () => {
  it("keeps demo_lego on the user-selected 2026 World Cup case", () => {
    const lego = loadCase("demo_lego");

    assert.equal(lego.context.trendName, "World Cup fan culture");
    assert.deepEqual(lego.searchTerms, ["世界杯 2026", "乐高 世界杯", "LEGO World Cup"]);
    assert.equal(lego.trendsQuery, "World Cup 2026");
  });
});
