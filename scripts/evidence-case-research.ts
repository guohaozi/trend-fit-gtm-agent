import { FixtureResearchSource, runEvidenceCaseResearch, type ResearchPlatform } from "../lib/evidence-case-research-runner";
import { OpenCliResearchSource } from "../lib/opencli-research-source";
import type { OpenCliResearchPlatform } from "../lib/opencli-research-source";
import type { RiskTolerance } from "../lib/types";
import type { WeightProfile } from "../lib/recommendation-rigor";

type ParsedArgs = {
  product?: string;
  market?: string;
  trend?: string;
  risk?: RiskTolerance;
  profile?: WeightProfile;
  provider?: "web" | "opencli";
  competitors: string[];
  platforms?: ResearchPlatform[];
  fixtureResults?: string;
  openCliBin?: string;
  dryRunProviderCommands?: boolean;
  dataDir?: string;
  outputDir?: string;
  limit?: number;
  help?: boolean;
};

function usage(): string {
  return [
    "Usage:",
    "  npm run evidence:case:research -- --product \"DJI drones\" --market \"Middle East\" --trend \"video creation security inspection tourism\" --risk high --profile b2b_pipeline",
    "",
    "Options:",
    "  --product <text>          Product or brand/product name",
    "  --market <text>           Target market or region",
    "  --trend <text>            Trend to validate",
    "  --risk <low|medium|high>  Risk tolerance",
    "  --profile <profile>       default | brand_awareness | ecommerce_conversion | b2b_pipeline | creator_seeding | risk_sensitive",
    "  --provider <provider>     web | opencli (default: web, unless --fixture-results is used)",
    "  --competitor <name>       Repeatable competitor name",
    "  --platforms <csv>         web,reddit,x,twitter,xiaohongshu,youtube,google",
    "  --fixture-results <path>  Use fixture search results instead of live web search",
    "  --opencli-bin <path>      OpenCLI binary path for --provider opencli",
    "  --dry-run-provider-commands  Print provider commands and exit",
    "  --data-dir <path>         Evidence JSON output directory",
    "  --output-dir <path>       Markdown report output directory",
    "  --limit <n>               Search results per query for live web provider",
    "  --help                    Show this message"
  ].join("\n");
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { competitors: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--dry-run-provider-commands") {
      args.dryRunProviderCommands = true;
      continue;
    }

    if (!next || next.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    if (arg === "--product") args.product = next;
    else if (arg === "--market") args.market = next;
    else if (arg === "--trend") args.trend = next;
    else if (arg === "--risk") args.risk = next as RiskTolerance;
    else if (arg === "--profile") args.profile = next as WeightProfile;
    else if (arg === "--provider") args.provider = next as "web" | "opencli";
    else if (arg === "--competitor") args.competitors.push(next);
    else if (arg === "--platforms") args.platforms = next.split(",").map((value) => value.trim()).filter(Boolean) as ResearchPlatform[];
    else if (arg === "--fixture-results") args.fixtureResults = next;
    else if (arg === "--opencli-bin") args.openCliBin = next;
    else if (arg === "--data-dir") args.dataDir = next;
    else if (arg === "--output-dir") args.outputDir = next;
    else if (arg === "--limit") args.limit = Number.parseInt(next, 10);
    else throw new Error(`Unknown argument: ${arg}`);

    index += 1;
  }

  return args;
}

function requireValue<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`Missing required ${label}.\n\n${usage()}`);
  return value;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  const product = requireValue(args.product, "--product");
  const market = requireValue(args.market, "--market");
  const trend = requireValue(args.trend, "--trend");
  const limit = args.limit ?? 2;

  if (args.dryRunProviderCommands) {
    if (args.provider !== "opencli") {
      throw new Error("--dry-run-provider-commands currently requires --provider opencli");
    }
    const source = new OpenCliResearchSource({
      openCliBin: args.openCliBin,
      platforms: args.platforms?.map((platform) => platform === "x" ? "twitter" : platform).filter((platform) =>
        platform === "reddit" || platform === "youtube" || platform === "twitter" || platform === "google"
      ) as OpenCliResearchPlatform[] | undefined
    });
    for (const entry of source.buildCommands({ product, market, trend, limitPerQuery: limit })) {
      console.log(`${entry.theme}: ${entry.command.join(" ")}`);
    }
    return;
  }

  const result = await runEvidenceCaseResearch({
    product,
    market,
    trend,
    riskTolerance: requireValue(args.risk, "--risk"),
    profileUsed: args.profile ?? "default",
    competitors: args.competitors,
    platforms: args.platforms,
    provider: args.fixtureResults
      ? new FixtureResearchSource(args.fixtureResults)
      : args.provider === "opencli"
        ? new OpenCliResearchSource({
            openCliBin: args.openCliBin,
            platforms: args.platforms?.map((platform) => platform === "x" ? "twitter" : platform).filter((platform) =>
              platform === "reddit" || platform === "youtube" || platform === "twitter" || platform === "google"
            ) as OpenCliResearchPlatform[] | undefined,
            continueOnCommandError: true
          })
        : undefined,
    limitPerQuery: limit,
    dataDir: args.dataDir,
    outputDir: args.outputDir
  });

  console.log(`Evidence JSON: ${result.fileResult.evidencePath}`);
  console.log(`Markdown report: ${result.fileResult.reportPath}`);
  console.log(`Queries: ${result.queries.length}; search results: ${result.searchResults.length}`);
  console.log(
    `Candidates: ${result.fileResult.candidateCount}; accepted evidence: ${result.fileResult.evidenceCount}; dropped: ${result.fileResult.droppedCount}`
  );
  console.log(
    `Adjusted: ${result.fileResult.evidenceCase.expectedAdjustedTotal} / ${result.fileResult.evidenceCase.expectedAdjustedBand}; gate: ${result.fileResult.evidenceCase.expectedEvidenceGate}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
