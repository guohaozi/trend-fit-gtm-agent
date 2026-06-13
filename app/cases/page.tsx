import Link from "next/link";
import type { Metadata } from "next";
import { getFeaturedCaseCards } from "@/lib/demo-cases";
import { BAND_LABELS } from "@/lib/display-labels";
import type { Band } from "@/lib/types";

export const metadata: Metadata = {
  title: "案例展示 · Trend-Fit",
  description: "真实案例：从评估输入到七维评分、证据修正和 GTM 简报，一页看完。"
};

function bandLabel(band: Band): string {
  return BAND_LABELS[band] ?? band;
}

export default function CasesPage() {
  const cases = getFeaturedCaseCards();

  return (
    <div className="cases-page">
      <header className="cases-page-head">
        <p className="cases-eyebrow">案例展示</p>
        <h1>真实案例，一页看完判断逻辑。</h1>
        <p>
          每个案例都直接展开完整的评估输入、七维评分、证据修正和可下载的 GTM
          简报——不用填表、不用等待，直接看引擎给出的结论和理由。
        </p>
        <p className="cases-legend">
          分数读作「<strong>基准分 → 证据修正后</strong>」：证据会把缺乏支撑的虚高分拉回真实区间。
        </p>
      </header>

      <div className="simple-case-grid">
        {cases.map((card) => (
          <Link className="simple-case-card" href={`/cases/${card.id}`} key={card.id}>
            <img src={card.image} alt={`${card.title}案例图`} />
            <div>
              <h3>{card.title}</h3>
              <dl>
                <div>
                  <dt>分数</dt>
                  <dd>
                    {card.baselineTotal} → {card.adjustedTotal}
                  </dd>
                </div>
                <div>
                  <dt>建议</dt>
                  <dd>{bandLabel(card.decisionBand)}</dd>
                </div>
              </dl>
              <p>{card.note}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
