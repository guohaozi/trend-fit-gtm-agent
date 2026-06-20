import type { EvidenceItem } from "./evidence-adjustment";
import { SCORE_KEYS, type Scores } from "./types";

export function assertDemoFixtureReady({
  evidence,
  baseline,
  adjusted
}: {
  evidence: EvidenceItem[];
  baseline: Scores;
  adjusted: Scores;
}): void {
  const directionalEvidence = evidence.filter(
    (item) => item.evidenceUse !== "context" && (item.direction === "up" || item.direction === "down")
  );
  if (directionalEvidence.length === 0) {
    throw new Error("Refusing to freeze demo fixture: no directional evidence.");
  }

  const movedDimensions = SCORE_KEYS.filter((key) => baseline[key] !== adjusted[key]);
  if (movedDimensions.length === 0) {
    throw new Error("Refusing to freeze demo fixture: evidence caused no score movement.");
  }

  for (const dimension of movedDimensions) {
    const sources = new Set(
      directionalEvidence
        .filter((item) => item.dimension === dimension)
        .map((item) => item.canonicalSourceId ?? item.sourceUrl)
    );
    if (sources.size < 2) {
      throw new Error(`Refusing to freeze demo fixture: two independent sources required for ${dimension}.`);
    }
  }
}
