import type { EvidenceConfidence, SourceTier } from "./evidence-adjustment";
import type { ScoreKey } from "./types";

export type VerificationStatus = "verified" | "unverified" | "contradicted";

export type SourceSignal =
  | "vendor_copy"
  | "vendor_documentation"
  | "listicle_affiliate_seo"
  | "press_release"
  | "single_social_thread"
  | "single_anecdote"
  | "raw_platform_data"
  | "comment_corpus"
  | "named_expert_quote"
  | "direct_competitor_campaign"
  | "reputable_journalism"
  | "research_report"
  | "supplier_category_report"
  | "unknown";

export type SourceTierClassification = {
  action: "keep" | "drop";
  sourceTier: SourceTier | null;
  maxConfidence: EvidenceConfidence;
  reasons: string[];
};

const CONFIDENCE_ORDER: EvidenceConfidence[] = ["low", "medium", "high"];
const RAW_LANGUAGE_DIMENSIONS = new Set<ScoreKey>(["audienceOverlap", "useCaseRelevance"]);
const FORCED_PROXY_SIGNALS = new Set<SourceSignal>([
  "vendor_copy",
  "vendor_documentation",
  "listicle_affiliate_seo",
  "press_release",
  "single_anecdote"
]);
const PRIMARY_SIGNALS = new Set<SourceSignal>([
  "raw_platform_data",
  "comment_corpus",
  "named_expert_quote",
  "direct_competitor_campaign"
]);
const SECONDARY_SIGNALS = new Set<SourceSignal>(["reputable_journalism", "research_report"]);

function parseUrl(sourceUrl: string): URL | null {
  try {
    return new URL(sourceUrl);
  } catch {
    return null;
  }
}

function hasSignal(signals: SourceSignal[] | undefined, signal: SourceSignal): boolean {
  return signals?.includes(signal) ?? false;
}

function isVendorHelpOrDocs(url: URL): boolean {
  return url.hostname.startsWith("help.") || url.pathname.includes("/hc/en-us/articles/");
}

function isKnownVendorMarketingPage(url: URL): boolean {
  return url.hostname === "www.shopify.com" && url.pathname === "/magic";
}

function isListicleOrAffiliate(url: URL): boolean {
  const segments = url.pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean);

  return segments.some((segment) => {
    const tokens = segment.split("-");
    return (
      tokens.includes("affordable") ||
      tokens.includes("dupe") ||
      segment.startsWith("best-") ||
      segment.startsWith("top-")
    );
  });
}

function isSingleRedditThread(url: URL): boolean {
  return url.hostname.endsWith("reddit.com") && url.pathname.includes("/comments/");
}

export function isForcedProxySource(
  sourceUrl: string,
  dimension: ScoreKey,
  sourceSignals: SourceSignal[] = []
): { isForcedProxy: boolean; reasons: string[]; allowsRawLanguageException: boolean } {
  const url = parseUrl(sourceUrl);
  const reasons: string[] = [];

  if (!url) {
    return {
      isForcedProxy: true,
      reasons: ["invalid URL"],
      allowsRawLanguageException: false
    };
  }

  if (isVendorHelpOrDocs(url) || hasSignal(sourceSignals, "vendor_documentation")) {
    reasons.push("vendor documentation");
  }
  if (isKnownVendorMarketingPage(url) || hasSignal(sourceSignals, "vendor_copy")) {
    reasons.push("vendor copy");
  }
  if (isListicleOrAffiliate(url) || hasSignal(sourceSignals, "listicle_affiliate_seo")) {
    reasons.push("listicle / affiliate / SEO source");
  }
  if (hasSignal(sourceSignals, "press_release")) {
    reasons.push("press release / sponsored source");
  }
  if (hasSignal(sourceSignals, "single_anecdote")) {
    reasons.push("single anecdote");
  }

  const singleSocialThread = isSingleRedditThread(url) || hasSignal(sourceSignals, "single_social_thread");
  const allowsRawLanguageException = singleSocialThread && RAW_LANGUAGE_DIMENSIONS.has(dimension);
  if (singleSocialThread && !allowsRawLanguageException) {
    reasons.push("single social thread outside raw audience/use-case language");
  }

  return {
    isForcedProxy: reasons.length > 0,
    reasons,
    allowsRawLanguageException
  };
}

export function clampEvidenceConfidence(
  requested: EvidenceConfidence,
  maxConfidence: EvidenceConfidence
): EvidenceConfidence {
  return CONFIDENCE_ORDER[
    Math.min(CONFIDENCE_ORDER.indexOf(requested), CONFIDENCE_ORDER.indexOf(maxConfidence))
  ];
}

export function classifySourceTier({
  sourceUrl,
  dimension,
  verificationStatus,
  sourceSignals = []
}: {
  sourceUrl: string;
  dimension: ScoreKey;
  verificationStatus: VerificationStatus;
  sourceSignals?: SourceSignal[];
}): SourceTierClassification {
  if (verificationStatus === "contradicted") {
    return {
      action: "drop",
      sourceTier: null,
      maxConfidence: "low",
      reasons: ["claim not present at source URL"]
    };
  }

  if (verificationStatus === "unverified") {
    return {
      action: "keep",
      sourceTier: "proxy",
      maxConfidence: "low",
      reasons: ["unverified source; no browse/fetch confirmation"]
    };
  }

  const forcedProxy = isForcedProxySource(sourceUrl, dimension, sourceSignals);
  if (forcedProxy.allowsRawLanguageException && forcedProxy.reasons.length === 0) {
    return {
      action: "keep",
      sourceTier: "primary",
      maxConfidence: "medium",
      reasons: ["single social thread used only as raw audience/use-case language"]
    };
  }

  if (forcedProxy.isForcedProxy) {
    return {
      action: "keep",
      sourceTier: "proxy",
      maxConfidence: "medium",
      reasons: forcedProxy.reasons
    };
  }

  if (sourceSignals.some((signal) => PRIMARY_SIGNALS.has(signal))) {
    return {
      action: "keep",
      sourceTier: "primary",
      maxConfidence: "high",
      reasons: ["verified primary source signal"]
    };
  }

  if (hasSignal(sourceSignals, "supplier_category_report")) {
    return {
      action: "keep",
      sourceTier: "secondary",
      maxConfidence: "medium",
      reasons: ["supplier-owned category report; useful but bias-capped"]
    };
  }

  if (sourceSignals.some((signal) => SECONDARY_SIGNALS.has(signal))) {
    return {
      action: "keep",
      sourceTier: "secondary",
      maxConfidence: "high",
      reasons: ["verified secondary source signal"]
    };
  }

  if (sourceSignals.some((signal) => FORCED_PROXY_SIGNALS.has(signal))) {
    return {
      action: "keep",
      sourceTier: "proxy",
      maxConfidence: "medium",
      reasons: ["forced-proxy source signal"]
    };
  }

  return {
    action: "keep",
    sourceTier: "proxy",
    maxConfidence: "medium",
    reasons: ["unknown source type; tie-breaker goes to proxy"]
  };
}
