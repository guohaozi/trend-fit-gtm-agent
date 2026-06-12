import { spawn } from "node:child_process";
import type { CustomerResearchFinding, CustomerResearchTheme } from "./customer-research-provider";
import type { EvidenceCandidate } from "./evidence-collector";
import {
  buildOpenCliCustomerResearchCommands,
  openCliRowsToCustomerResearchFindings,
  type OpenCliCustomerResearchPlatform
} from "./opencli-customer-research";
import type { ProviderFindingResult, ProviderFindingSource, ResearchLane, ResearchQuery } from "./evidence-case-research-runner";

export type OpenCliCommandResult = {
  status: number;
  stdout: string;
  stderr: string;
};

export type OpenCliCommandRunner = (command: string[]) => Promise<OpenCliCommandResult>;
export type OpenCliResearchPlatform = OpenCliCustomerResearchPlatform | "twitter" | "google";

export type OpenCliResearchSourceOptions = {
  openCliBin?: string;
  platforms?: OpenCliResearchPlatform[];
  themes?: CustomerResearchTheme[];
  runner?: OpenCliCommandRunner;
  continueOnCommandError?: boolean;
};

const DEFAULT_THEMES: CustomerResearchTheme[] = [
  "audience_language",
  "use_case_language",
  "commercial_intent",
  "brand_safety_concern"
];

const DEFAULT_PLATFORMS: OpenCliResearchPlatform[] = ["reddit", "youtube"];
const CUSTOMER_PLATFORMS = new Set<OpenCliResearchPlatform>(["reddit", "youtube"]);
const RAW_SOCIAL_PLATFORMS = new Set<OpenCliResearchPlatform>(["twitter"]);
const TOKEN_STOPWORDS = new Set(["and", "for", "from", "into", "market", "with", "the", "use"]);

function defaultOpenCliBin(): string {
  return process.env.OPENCLI_BIN?.trim() || "opencli";
}

function defaultRunner(command: string[]): Promise<OpenCliCommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      env: {
        ...process.env
      }
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({
        status: 1,
        stdout,
        stderr: `${stderr}${error.message}`
      });
    });
    child.on("close", (status) => {
      resolve({
        status: status ?? 1,
        stdout,
        stderr
      });
    });
  });
}

function parseRows(stdout: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(stdout) as unknown;
  if (Array.isArray(parsed)) return parsed.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  if (typeof parsed !== "object" || parsed === null) return [];

  const object = parsed as Record<string, unknown>;
  for (const key of ["rows", "results", "items", "data"]) {
    const value = object[key];
    if (Array.isArray(value)) {
      return value.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
    }
  }
  return [];
}

function withOpenCliBin(command: string[], openCliBin: string): string[] {
  return [openCliBin, ...command.slice(1)];
}

function baseQuery(product: string, market: string, trend: string): string {
  return `${product} ${market} ${trend}`.trim();
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "");
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .split(/\s+/)
      .map(normalizeToken)
      .filter((token) => token.length >= 3 && !TOKEN_STOPWORDS.has(token))
  );
}

function hasToken(textTokens: Set<string>, requiredTokens: Set<string>): boolean {
  for (const token of requiredTokens) {
    if (textTokens.has(token)) return true;
  }
  return false;
}

function rowText(row: Record<string, unknown>): string {
  const leadingText = (value: unknown): string => textValue(value).slice(0, 600);

  return [
    textValue(row.title),
    leadingText(row.text),
    leadingText(row.selftext),
    leadingText(row.snippet),
    textValue(row.url),
    textValue(row.author),
    textValue(row.channel)
  ].filter(Boolean).join(" ");
}

function relevantRows({
  rows,
  product,
  market,
  trend,
  requireProductHit = false
}: {
  rows: Array<Record<string, unknown>>;
  product: string;
  market: string;
  trend: string;
  requireProductHit?: boolean;
}): Array<Record<string, unknown>> {
  const productTokens = tokenize(product);
  const marketTokens = tokenize(market);
  const trendTokens = tokenize(trend);

  return rows.filter((row) => {
    const textTokens = tokenize(rowText(row));
    const productHit = hasToken(textTokens, productTokens);
    const marketHit = hasToken(textTokens, marketTokens);
    const trendHit = hasToken(textTokens, trendTokens);
    const marketTrendHit = hasToken(textTokens, marketTokens) && hasToken(textTokens, trendTokens);
    return requireProductHit ? productHit && (marketHit || trendHit) : productHit || marketTrendHit;
  });
}

function themeToLane(theme: CustomerResearchTheme): ResearchLane {
  if (theme === "use_case_language") return "useCase";
  if (theme === "commercial_intent") return "commercial";
  if (theme === "brand_safety_concern") return "brandSafety";
  return "audience";
}

function themeToCandidateSpec(theme: CustomerResearchTheme): Pick<EvidenceCandidate, "dimension" | "direction" | "magnitude" | "desiredConfidence"> {
  if (theme === "use_case_language") {
    return {
      dimension: "useCaseRelevance",
      direction: "confirm",
      magnitude: "moderate",
      desiredConfidence: "medium"
    };
  }
  if (theme === "commercial_intent") {
    return {
      dimension: "commercialIntent",
      direction: "up",
      magnitude: "moderate",
      desiredConfidence: "medium"
    };
  }
  if (theme === "brand_safety_concern") {
    return {
      dimension: "brandSafety",
      direction: "down",
      magnitude: "moderate",
      desiredConfidence: "medium"
    };
  }
  return {
    dimension: "audienceOverlap",
    direction: "confirm",
    magnitude: "moderate",
    desiredConfidence: "medium"
  };
}

function twitterRowsToCandidates(theme: CustomerResearchTheme, rows: Array<Record<string, unknown>>): EvidenceCandidate[] {
  const spec = themeToCandidateSpec(theme);
  const candidates: EvidenceCandidate[] = [];

  rows.forEach((row, index) => {
    const id = textValue(row.id) || String(index + 1);
    const text = textValue(row.text);
    const url = textValue(row.url);
    const author = textValue(row.author);
    const likes = numberValue(row.likes);
    const views = numberValue(row.views);
    if (!text || !url) return;

    candidates.push({
      id: `opencli-twitter-${theme.replaceAll("_", "-")}-${id}`,
      ...spec,
      sourceUrl: url,
      verificationStatus: "unverified",
      sourceSignals: ["single_social_thread"],
      note: [
        "OpenCLI Twitter/X search hit.",
        author ? `Author: ${author}.` : "",
        likes === null ? "" : `Likes: ${likes}.`,
        views === null ? "" : `Views: ${views}.`,
        `Tweet text: "${text}"`
      ].filter(Boolean).join(" ")
    });
  });

  return candidates;
}

function googleRowsToCandidates(theme: CustomerResearchTheme, rows: Array<Record<string, unknown>>): EvidenceCandidate[] {
  const lane = themeToLane(theme);
  const spec = themeToCandidateSpec(theme);
  const candidates: EvidenceCandidate[] = [];

  rows.forEach((row, index) => {
    const title = textValue(row.title);
    const snippet = textValue(row.snippet);
    const url = textValue(row.url);
    const type = textValue(row.type);
    if (!title || !url) return;

    candidates.push({
      id: `opencli-google-${theme.replaceAll("_", "-")}-${index + 1}`,
      ...spec,
      sourceUrl: url,
      verificationStatus: "unverified",
      sourceSignals: lane === "brandSafety" ? ["research_report"] : ["unknown"],
      note: [
        "OpenCLI Google search result.",
        type ? `Type: ${type}.` : "",
        `${title}.`,
        snippet
      ].filter(Boolean).join(" ")
    });
  });

  return candidates;
}

export class OpenCliResearchSource implements ProviderFindingSource {
  private readonly openCliBin: string;
  private readonly platforms: OpenCliResearchPlatform[];
  private readonly themes: CustomerResearchTheme[];
  private readonly runner: OpenCliCommandRunner;
  private readonly continueOnCommandError: boolean;

  constructor(options: OpenCliResearchSourceOptions = {}) {
    this.openCliBin = options.openCliBin ?? defaultOpenCliBin();
    this.platforms = options.platforms ?? DEFAULT_PLATFORMS;
    this.themes = options.themes ?? DEFAULT_THEMES;
    this.runner = options.runner ?? defaultRunner;
    this.continueOnCommandError = options.continueOnCommandError ?? false;
  }

  buildCommands({
    product,
    market,
    trend,
    limitPerQuery
  }: {
    product: string;
    market: string;
    trend: string;
    queries?: ResearchQuery[];
    limitPerQuery: number;
  }): Array<{ platform: OpenCliResearchPlatform; theme: CustomerResearchTheme; command: string[] }> {
    const customerPlatforms = this.platforms.filter((platform): platform is OpenCliCustomerResearchPlatform => CUSTOMER_PLATFORMS.has(platform));
    const customerCommands = buildOpenCliCustomerResearchCommands({
      query: baseQuery(product, market, trend),
      themes: this.themes,
      platforms: customerPlatforms,
      limit: limitPerQuery
    }).map((entry) => ({
      ...entry,
      command: withOpenCliBin(entry.command, this.openCliBin)
    }));
    const base = baseQuery(product, market, trend);
    const extraCommands = this.platforms
      .filter((platform) => !CUSTOMER_PLATFORMS.has(platform))
      .flatMap((platform) =>
        this.themes.map((theme) => ({
          platform,
          theme,
          command: [
            this.openCliBin,
            platform,
            "search",
            `${base} ${theme.replaceAll("_", " ")}`,
            "--limit",
            String(limitPerQuery),
            "-f",
            "json"
          ]
        }))
      );

    return [...customerCommands, ...extraCommands];
  }

  async collect({
    product,
    market,
    trend,
    limitPerQuery
  }: {
    product: string;
    market: string;
    trend: string;
    queries: ResearchQuery[];
    limitPerQuery: number;
  }): Promise<ProviderFindingResult> {
    const findings: CustomerResearchFinding[] = [];
    const additionalCandidates: EvidenceCandidate[] = [];
    const failedCommands: string[] = [];

    for (const entry of this.buildCommands({ product, market, trend, limitPerQuery })) {
      const result = await this.runner(entry.command);
      if (result.status !== 0) {
        if (this.continueOnCommandError) {
          failedCommands.push(`${entry.platform}/${entry.theme}: ${result.stderr || result.stdout}`.trim());
          continue;
        }
        throw new Error(`OpenCLI command failed (${entry.command.join(" ")}): ${result.stderr || result.stdout}`);
      }
      const rows = relevantRows({
        rows: parseRows(result.stdout),
        product,
        market,
        trend,
        requireProductHit: CUSTOMER_PLATFORMS.has(entry.platform) || RAW_SOCIAL_PLATFORMS.has(entry.platform)
      });
      if (entry.platform === "reddit" || entry.platform === "youtube") {
        findings.push(
          ...openCliRowsToCustomerResearchFindings({
            platform: entry.platform,
            theme: entry.theme,
            rows
          })
        );
      } else if (RAW_SOCIAL_PLATFORMS.has(entry.platform)) {
        additionalCandidates.push(...twitterRowsToCandidates(entry.theme, rows));
      } else if (entry.platform === "google") {
        additionalCandidates.push(...googleRowsToCandidates(entry.theme, rows));
      }
    }

    return {
      customerResearchFindings: findings,
      additionalCandidates,
      tooling: [
        "evidence:case:research + OpenCLI customer research provider",
        failedCommands.length > 0 ? `Skipped failed OpenCLI commands: ${failedCommands.length}.` : ""
      ].filter(Boolean).join(" ")
    };
  }
}
