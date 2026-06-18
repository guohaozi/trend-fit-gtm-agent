import { SCORE_KEYS, type Scores } from "./types";

export function assertDemoFixtureReady({
  evidenceCount,
  baseline,
  adjusted
}: {
  evidenceCount: number;
  baseline: Scores;
  adjusted: Scores;
}): void {
  if (evidenceCount === 0) {
    throw new Error("Refusing to freeze demo fixture: no directional evidence.");
  }

  if (!SCORE_KEYS.some((key) => baseline[key] !== adjusted[key])) {
    throw new Error("Refusing to freeze demo fixture: evidence caused no score movement.");
  }
}
