import { CaseSwitcher } from "@/components/CaseSwitcher";
import { PageHeader } from "@/components/PageHeader";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { WorkflowNav } from "@/components/WorkflowNav";
import { getDemoCase, getDemoResult } from "@/lib/demo-cases";

type PageProps = {
  searchParams?: Promise<{ case?: string }>;
};

export default async function FitScorePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const demo = getDemoCase(params?.case);
  const result = getDemoResult(demo.id);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="第 3 步"
        title="适配评分"
        description="评分是确定性、可审计的：七个锚点评分维度、固定权重、四舍五入展示分，再叠加 override 规则。"
        demo={demo}
      />
      <WorkflowNav activePath="/fit-score" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/fit-score" />
      <RecommendationCard result={result} />
      <ScoreBreakdown scores={demo.scores} result={result} />
    </div>
  );
}
