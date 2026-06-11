import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST } from "../app/api/workspace/google-trends/route";

describe("workspace Google Trends API", () => {
  it("returns classifier-ready workspace evidence rows without exposing the SerpApi key", async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.SERPAPI_API_KEY;
    const requested: URL[] = [];
    process.env.SERPAPI_API_KEY = "test-serpapi-key";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      requested.push(url);
      const body =
        url.searchParams.get("data_type") === "RELATED_QUERIES"
          ? {
              related_queries: {
                rising: [
                  { query: "protein drink convenience store", formatted_value: "Breakout" },
                  { query: "where to buy protein drink", formatted_value: "+120%", extracted_value: 120 }
                ],
                top: [{ query: "protein drink", extracted_value: 100 }]
              }
            }
          : {
              interest_over_time: {
                timeline_data: [
                  { values: [{ extracted_value: 10 }] },
                  { values: [{ extracted_value: 20 }] },
                  { values: [{ extracted_value: 60 }] },
                  { values: [{ extracted_value: 80 }] }
                ]
              }
            };

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as typeof fetch;

    try {
      const response = await POST(
        new Request("http://localhost/api/workspace/google-trends", {
          method: "POST",
          body: JSON.stringify({
            product: "protein drink",
            market: "US convenience retail",
            trend: "grab-and-go protein",
            geo: "US",
            date: "today 12-m"
          })
        })
      );
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.provider, "google-trends");
      assert.equal(payload.tooling, "SerpApi Google Trends");
      assert.deepEqual(
        requested.map((url) => url.searchParams.get("data_type")),
        ["RELATED_QUERIES", "TIMESERIES"]
      );
      assert.equal(requested[0].searchParams.get("api_key"), "test-serpapi-key");
      assert.equal(payload.rows.length, 3);
      assert.deepEqual(
        payload.rows.map((row: { dimension: string; sourceUrl: string }) => [row.dimension, row.sourceUrl.includes("api_key")]),
        [
          ["timingSaturation", false],
          ["commercialIntent", false],
          ["timingSaturation", false]
        ]
      );
      assert.equal(payload.computedRows[0].computedSourceTier, "secondary");
      assert.equal(payload.evidenceCount, 3);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) {
        delete process.env.SERPAPI_API_KEY;
      } else {
        process.env.SERPAPI_API_KEY = originalKey;
      }
    }
  });

  it("returns a setup error when the server has no SerpApi key", async () => {
    const originalKey = process.env.SERPAPI_API_KEY;
    delete process.env.SERPAPI_API_KEY;

    try {
      const response = await POST(
        new Request("http://localhost/api/workspace/google-trends", {
          method: "POST",
          body: JSON.stringify({
            product: "protein drink",
            market: "US convenience retail",
            trend: "grab-and-go protein"
          })
        })
      );
      const payload = await response.json();

      assert.equal(response.status, 503);
      assert.match(payload.error, /SERPAPI_API_KEY/);
    } finally {
      if (originalKey !== undefined) process.env.SERPAPI_API_KEY = originalKey;
    }
  });

  it("can replay a committed fixture without a SerpApi key", async () => {
    const originalKey = process.env.SERPAPI_API_KEY;
    delete process.env.SERPAPI_API_KEY;

    try {
      const response = await POST(
        new Request("http://localhost/api/workspace/google-trends", {
          method: "POST",
          body: JSON.stringify({
            product: "protein drink",
            market: "US convenience retail",
            trend: "grab-and-go protein",
            fixture: true
          })
        })
      );
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.provider, "google-trends-fixture");
      assert.equal(payload.rows.length > 0, true);
      assert.equal(payload.rows.some((row: { sourceUrl: string }) => row.sourceUrl.includes("api_key")), false);
    } finally {
      if (originalKey !== undefined) process.env.SERPAPI_API_KEY = originalKey;
    }
  });
});
