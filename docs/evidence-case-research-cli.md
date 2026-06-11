# Evidence Case Research CLI

`evidence:case:research` creates an evidence-backed case directly from a product,
market, and trend brief.

It does three things:

1. Builds research queries for web, Reddit, X/Twitter, Xiaohongshu, and YouTube surface
   checks.
2. Converts search results into conservative `additionalCandidates`.
3. Reuses the existing project pipeline:
   `orchestrateEvidenceCase()` -> source-tier classifier -> score adjustment -> gate ->
   evidence JSON + markdown report.

## DJI Middle East Example

Offline fixture run:

```bash
npm run evidence:case:research -- \
  --product "DJI drones" \
  --market "Middle East" \
  --trend "video creation security inspection tourism enablement" \
  --risk high \
  --profile b2b_pipeline \
  --competitor Autel \
  --competitor Skydio \
  --fixture-results examples/dji-middle-east-search-results.fixture.json
```

Live web-search run:

```bash
npm run evidence:case:research -- \
  --product "DJI drones" \
  --market "UAE Saudi Middle East" \
  --trend "video creation security inspection tourism enablement" \
  --risk high \
  --profile b2b_pipeline \
  --competitor Autel \
  --competitor Skydio \
  --platforms web,reddit,x,xiaohongshu,youtube \
  --limit 2
```

OpenCLI provider run:

```bash
npm run evidence:case:research -- \
  --product "DJI drones" \
  --market "UAE Saudi Middle East" \
  --trend "video creation security inspection tourism enablement" \
  --risk high \
  --profile b2b_pipeline \
  --provider opencli \
  --platforms reddit,youtube,twitter,google \
  --opencli-bin /Users/guo/.npm-global/bin/opencli \
  --limit 3
```

SerpApi Google Trends provider run:

```bash
SERPAPI_API_KEY=your_key npm run evidence:case:research -- \
  --product "protein drink" \
  --market "US convenience retail" \
  --trend "grab-and-go protein" \
  --risk medium \
  --provider google-trends \
  --serpapi-geo US \
  --serpapi-date "today 12-m"
```

Dry-run the OpenCLI commands without executing platform searches:

```bash
npm run evidence:case:research -- \
  --product "DJI drones" \
  --market "UAE Saudi Middle East" \
  --trend "video creation security inspection tourism enablement" \
  --risk high \
  --profile b2b_pipeline \
  --provider opencli \
  --platforms reddit,youtube,twitter,google \
  --opencli-bin /Users/guo/.npm-global/bin/opencli \
  --dry-run-provider-commands
```

Expected outputs:

```text
data/dji_drones_middle_east_video_creation_security_inspection_tourism_enablement_evidence.json
outputs/dji_drones_middle_east_video_creation_security_inspection_tourism_enablement_evidence_case.md
```

## Current Boundary

The default live provider uses web search with site filters such as `site:reddit.com`,
`site:x.com`, `site:xiaohongshu.com`, and `site:youtube.com`.

The OpenCLI provider currently supports:

- Reddit and YouTube: mapped into `customerResearchFindings`, then passed through the
  customer-research provider and source-tier classifier.
- Twitter/X: mapped into `additionalCandidates` as raw social evidence candidates.
- Google Search: mapped into `additionalCandidates` as conservative search-result
  evidence candidates.

OpenCLI has Xiaohongshu adapters available, but their row-to-finding mapper has not been
promoted into this CLI yet. SerpApi Google Trends is available through `--provider
google-trends` or `--provider serpapi`; it calls `engine=google_trends` for related
queries and timeseries data, then maps those findings into Timing & Saturation and
Commercial Intent evidence. GooseWorks, TikTok, and marketplace providers can be added
behind the same provider interface without changing the evidence classifier or writer.

Because broad web search is only a first pass, the generated report should be treated as
an automated draft. Replace weak search-result evidence with direct platform exports,
official policy pages, marketplace data, customer comments, and competitor deployment
proof before making high-budget decisions.
