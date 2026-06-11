/**
 * One-off verification: call the REAL SerpApi Google Trends endpoint once and
 * confirm its raw JSON shape matches what lib/seo-keyword-provider.ts assumes
 * (extractRelatedQueries / extractTimeseriesValues) and what the committed
 * fixture examples/google-trends-workspace.fixture.json encodes.
 *
 * The key stays in YOUR terminal and is never committed:
 *   SERPAPI_API_KEY=xxx node --import tsx scripts/verify-serpapi.ts
 *   SERPAPI_API_KEY=xxx PRODUCT="..." MARKET="..." TREND="..." GEO=US \
 *     node --import tsx scripts/verify-serpapi.ts
 *
 * Cost: 2 SerpApi searches per run (RELATED_QUERIES + TIMESERIES).
 */
import { SerpApiGoogleTrendsSource } from "../lib/seo-keyword-provider";

const product = process.env.PRODUCT ?? "protein drink";
const market = process.env.MARKET ?? "united states";
const trend = process.env.TREND ?? "high protein convenience snacks";
const geo = process.env.GEO?.trim() || undefined;
const date = process.env.DATE?.trim() || undefined;

if (!process.env.SERPAPI_API_KEY) {
  console.error(
    "Missing SERPAPI_API_KEY.\nRun: SERPAPI_API_KEY=xxx node --import tsx scripts/verify-serpapi.ts"
  );
  process.exit(1);
}

const raw: Record<string, unknown> = {};

const capturingFetcher = async (url: URL): Promise<unknown> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`SerpApi request failed: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  raw[url.searchParams.get("data_type") ?? "unknown"] = json;
  return json;
};

function topKeys(value: unknown): string[] {
  return value && typeof value === "object" ? Object.keys(value as object) : [];
}

const source = new SerpApiGoogleTrendsSource({ geo, date, fetcher: capturingFetcher });
const result = await source.collect({ product, market, trend });

const related = raw.RELATED_QUERIES as Record<string, any> | undefined;
const timeseries = raw.TIMESERIES as Record<string, any> | undefined;

console.log("=== QUERY ===");
console.log({ product, market, trend, geo, date });

// SerpApi returns an `error` field instead of HTTP error for some failures.
if (related?.error || timeseries?.error) {
  console.log("\n=== SerpApi reported an error ===");
  console.log("related.error:", related?.error);
  console.log("timeseries.error:", timeseries?.error);
}

console.log("\n=== RAW related_queries top-level keys ===");
console.log(topKeys(related));
console.log("has .related_queries:", Boolean(related?.related_queries));
console.log("rising[0]:", related?.related_queries?.rising?.[0]);
console.log("top[0]:", related?.related_queries?.top?.[0]);

console.log("\n=== RAW timeseries top-level keys ===");
console.log(topKeys(timeseries));
console.log("has .interest_over_time:", Boolean(timeseries?.interest_over_time));
console.log("timeline_data[0]:", JSON.stringify(timeseries?.interest_over_time?.timeline_data?.[0]));

console.log("\n=== PARSED findings (what the pipeline extracted from the live JSON) ===");
console.log(JSON.stringify(result.seoKeywordFindings, null, 2));

console.log("\n=== CHECK vs fixture/code assumptions ===");
console.log(
  "code/fixture expect: related_queries.rising[].{query,formatted_value}, top[].query,"
);
console.log("                     interest_over_time.timeline_data[].values[].extracted_value");
const findingsCount = result.seoKeywordFindings?.length ?? 0;
console.log("findings count:", findingsCount);
if (findingsCount > 0) {
  console.log("OK: the live JSON parsed into findings, so the field paths match.");
} else if (related?.error) {
  console.log(
    "OK (data-insufficient): SerpApi reported no Google Trends results for this query,\n" +
      "so the provider correctly emitted no evidence instead of a fabricated declining trend."
  );
} else {
  console.log(
    "WARNING: 0 findings but SerpApi reported no error. A field path in\n" +
      "extractRelatedQueries / extractTimeseriesValues may not match the live JSON.\n" +
      "Inspect the RAW dumps above to compare field names."
  );
}
