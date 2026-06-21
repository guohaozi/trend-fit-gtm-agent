import type { Metadata } from "next";
import { FeaturedCaseHero } from "@/components/FeaturedCaseHero";
import { INTERVIEW_DEMO_ID } from "@/lib/demo-cases";

export const metadata: Metadata = {
  title: "案例展示 · Trend-Fit",
  description: "真实案例：从评估输入到七维评分、证据修正和 GTM 简报，一页看完。"
};

export default function CasesPage() {
  return (
    <div className="cases-page">
      <header className="cases-page-head">
        <p className="cases-eyebrow">案例展示</p>
        <h1>一个案例，一页看完判断逻辑。</h1>
        <p>
          挑一个真实产品和一个候选热点，从评估输入到七维评分、证据修正和可下载的 GTM 简报，全部在一页里展开。
        </p>
        <p className="cases-legend">
          分数读作「<strong>基准分 → 证据修正后</strong>」：证据会把缺乏支撑的虚高分拉回真实区间。
        </p>
      </header>

      <FeaturedCaseHero id={INTERVIEW_DEMO_ID} />
    </div>
  );
}
