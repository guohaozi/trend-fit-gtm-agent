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
        eyebrow="Step 3"
        title="Fit Score"
        description="The score is deterministic and auditable: seven anchored dimensions, fixed weights, round-half-up display total, then override rules."
        demo={demo}
      />
      <WorkflowNav activePath="/fit-score" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/fit-score" />
      <RecommendationCard result={result} />
      <ScoreBreakdown scores={demo.scores} result={result} />
    </div>
  );
}
