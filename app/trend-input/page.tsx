import { CaseSwitcher } from "@/components/CaseSwitcher";
import { PageHeader } from "@/components/PageHeader";
import { TrendInputForm } from "@/components/TrendInputForm";
import { WorkflowNav } from "@/components/WorkflowNav";
import { getDemoCase } from "@/lib/demo-cases";

type PageProps = {
  searchParams?: Promise<{ case?: string }>;
};

export default async function TrendInputPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const demo = getDemoCase(params?.case);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="Step 2"
        title="Trend Input"
        description="V1 keeps trend discovery manual. The app focuses on the harder middle layer: whether this trend belongs with this product."
        demo={demo}
      />
      <WorkflowNav activePath="/trend-input" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/trend-input" />
      <TrendInputForm trend={demo.trend} />
    </div>
  );
}
