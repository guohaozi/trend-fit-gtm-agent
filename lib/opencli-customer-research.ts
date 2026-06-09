import type {
  CustomerResearchFinding,
  CustomerResearchTheme
} from "./customer-research-provider";

export type OpenCliCustomerResearchPlatform = "reddit" | "youtube";

export type OpenCliCustomerResearchCommand = {
  platform: OpenCliCustomerResearchPlatform;
  theme: CustomerResearchTheme;
  command: string[];
};

export type OpenCliCustomerResearchCommandInput = {
  query: string;
  themes: CustomerResearchTheme[];
  platforms?: OpenCliCustomerResearchPlatform[];
  limit?: number;
};

export type OpenCliRowsToFindingsInput = {
  platform: OpenCliCustomerResearchPlatform;
  theme: CustomerResearchTheme;
  rows: Array<Record<string, unknown>>;
  sourceUrl?: string;
};

const DEFAULT_PLATFORMS: OpenCliCustomerResearchPlatform[] = ["reddit", "youtube"];

const THEME_QUERY_SUFFIX: Record<CustomerResearchTheme, string> = {
  audience_language: "audience",
  use_case_language: "routine use case",
  commercial_intent: "buy worth it",
  brand_safety_concern: "concern risk skeptical"
};

function themeSlug(theme: CustomerResearchTheme): string {
  return theme.replaceAll("_", "-");
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeLimit(limit: number | undefined): string {
  const safeLimit = typeof limit === "number" && Number.isInteger(limit) && limit > 0 ? Math.min(limit, 25) : 10;
  return String(safeLimit);
}

function buildSearchQuery(query: string, theme: CustomerResearchTheme): string {
  return `${query.trim()} ${THEME_QUERY_SUFFIX[theme]}`.trim();
}

export function buildOpenCliCustomerResearchCommands({
  query,
  themes,
  platforms = DEFAULT_PLATFORMS,
  limit
}: OpenCliCustomerResearchCommandInput): OpenCliCustomerResearchCommand[] {
  const limitValue = normalizeLimit(limit);
  return themes.flatMap((theme) =>
    platforms.map((platform) => ({
      platform,
      theme,
      command: ["opencli", platform, "search", buildSearchQuery(query, theme), "--limit", limitValue, "-f", "json"]
    }))
  );
}

function redditFinding(theme: CustomerResearchTheme, row: Record<string, unknown>, index: number): CustomerResearchFinding {
  const id = textValue(row.id) || String(index + 1);
  const title = textValue(row.title);
  const quote = textValue(row.selftext) || title;
  const subreddit = textValue(row.subreddit);
  const score = numberValue(row.score);
  const comments = numberValue(row.comments);
  const contextParts = [
    subreddit ? `Reddit r/${subreddit} post` : "Reddit post",
    score === null ? "" : `score ${score}`,
    comments === null ? "" : `${comments} comments`
  ].filter(Boolean);

  return {
    id: `opencli-reddit-${themeSlug(theme)}-${id}`,
    theme,
    sourceType: "reddit_thread",
    sourceUrl: textValue(row.url),
    verificationStatus: "verified",
    confidence: "medium",
    intensity: theme === "commercial_intent" || theme === "brand_safety_concern" ? "moderate" : "weak",
    quote,
    context: contextParts.join("; "),
    note: title ? `OpenCLI Reddit search hit: ${title}.` : "OpenCLI Reddit search hit."
  };
}

function youtubeFinding(
  theme: CustomerResearchTheme,
  row: Record<string, unknown>,
  index: number,
  sourceUrl?: string
): CustomerResearchFinding {
  const rank = numberValue(row.rank) ?? index + 1;
  const text = textValue(row.text) || textValue(row.title);
  const author = textValue(row.author) || textValue(row.channel);
  const likes = numberValue(row.likes);
  const contextParts = [
    author ? `YouTube by ${author}` : "YouTube result",
    likes === null ? "" : `${likes} likes`,
    textValue(row.time)
  ].filter(Boolean);

  return {
    id: `opencli-youtube-${themeSlug(theme)}-${rank}`,
    theme,
    sourceType: textValue(row.text) ? "youtube_comments" : "unknown",
    sourceUrl: sourceUrl ?? textValue(row.url),
    verificationStatus: "verified",
    confidence: "medium",
    intensity: theme === "commercial_intent" || theme === "brand_safety_concern" ? "moderate" : "weak",
    quote: text,
    context: contextParts.join("; "),
    note: textValue(row.text) ? "OpenCLI YouTube comments hit." : "OpenCLI YouTube search hit."
  };
}

export function openCliRowsToCustomerResearchFindings({
  platform,
  theme,
  rows,
  sourceUrl
}: OpenCliRowsToFindingsInput): CustomerResearchFinding[] {
  return rows
    .map((row, index) => (platform === "reddit" ? redditFinding(theme, row, index) : youtubeFinding(theme, row, index, sourceUrl)))
    .filter((finding) => finding.sourceUrl && finding.quote);
}
