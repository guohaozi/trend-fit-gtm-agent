import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { getDemoResult, getEvidenceResult, getFeaturedCaseCards } from "@/lib/demo-cases";
import { BAND_LABELS } from "@/lib/display-labels";

type Props = {
  id: string;
};

// Resolve the cover-image path against /public at module load. If the file is missing
// (the asset hasn't been delivered yet), we skip the <img> entirely so the pine-
// gradient placeholder carries the panel instead of the browser's broken-image glyph.
function coverImageExists(publicPath: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")));
  } catch {
    return false;
  }
}

export function FeaturedCaseHero({ id }: Props) {
  const card = getFeaturedCaseCards().find((entry) => entry.id === id);
  const evidence = getEvidenceResult(id);
  if (!card || !evidence) return null;

  const baseline = getDemoResult(id);
  const baselineBandRaw = baseline.recommendation.finalBand;
  const gatedBandRaw = evidence.rigor.gatedBand;
  const baselineBand = BAND_LABELS[baselineBandRaw] ?? baselineBandRaw;
  const gatedBand = BAND_LABELS[gatedBandRaw] ?? gatedBandRaw;
  const bandChanged = baselineBandRaw !== gatedBandRaw;

  const adjustedSafety = evidence.adjustment.adjusted.brandSafety;
  const baselineSafety = evidence.evidenceCase.baselineScores.brandSafety;
  const safetyDropped = adjustedSafety < baselineSafety;
  const eyebrowSlug = id.replace(/^demo_/, "").toUpperCase();

  const hasCover = coverImageExists(card.image);

  return (
    <Link className="featured-case-hero" href={`/cases/${id}`} aria-label={`查看案例 ${card.title}`}>
      <div className={`featured-case-hero__cover${hasCover ? "" : " featured-case-hero__cover--empty"}`}>
        {hasCover ? <img src={card.image} alt={`${card.title} 案例配图`} /> : null}
      </div>

      <div className="featured-case-hero__body">
        <p className="featured-case-hero__eyebrow">案例 · {eyebrowSlug}</p>
        <h3 className="featured-case-hero__title">{card.title}</h3>

        <div className="featured-case-hero__readout">
          <div className="featured-case-hero__score">
            <span className="featured-case-hero__score-label">证据修正后</span>
            <p className="featured-case-hero__score-row">
              <span className="featured-case-hero__score-adjusted">{card.adjustedTotal}</span>
              <span className="featured-case-hero__score-suffix">/ 100</span>
            </p>
          </div>

          <div className="featured-case-hero__verdict">
            <span className="featured-case-hero__verdict-label">
              {bandChanged ? "基准判断 → 证据门槛后" : "基准与证据一致"}
            </span>
            <p className="featured-case-hero__verdict-row">
              {bandChanged ? (
                <>
                  <span className="featured-case-hero__verdict-from">{baselineBand}</span>
                  <span className="featured-case-hero__verdict-arrow">→</span>
                  <strong className="featured-case-hero__verdict-to">{gatedBand}</strong>
                </>
              ) : (
                <strong className="featured-case-hero__verdict-to">{gatedBand}</strong>
              )}
            </p>
          </div>
        </div>

        {safetyDropped ? (
          <p className="featured-case-hero__constraint">
            <span>品牌安全</span>
            <em>{adjustedSafety}</em>
            <span>· 真实社区把分数拉回区间</span>
          </p>
        ) : null}

        <p className="featured-case-hero__note">{card.note}</p>

        <ul className="featured-case-hero__contents">
          <li>七维评分 + 加权细节</li>
          <li>每条证据点开都能溯源</li>
          <li>可下载 GTM 简报（Markdown）</li>
        </ul>

        <span className="featured-case-hero__cta">
          查看完整案例
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
