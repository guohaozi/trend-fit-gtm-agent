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
        eyebrow="第 2 步"
        title="热点输入"
        description="V1 暂时保留手动输入热点，把重点放在更难的中间层：这个热点是否真的适合这个产品。"
        demo={demo}
      />
      <WorkflowNav activePath="/trend-input" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/trend-input" />
      <TrendInputForm trend={demo.trend} />
    </div>
  );
}
