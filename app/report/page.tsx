import { CaseSwitcher } from "@/components/CaseSwitcher";
import { EvidenceComparison } from "@/components/EvidenceComparison";
import { PageHeader } from "@/components/PageHeader";
import { ReportViewer } from "@/components/ReportViewer";
import { WorkflowNav } from "@/components/WorkflowNav";
import { getDemoCase, getDemoResult, getEvidenceResult, getReportFileName, getReportMarkdown } from "@/lib/demo-cases";

type PageProps = {
  searchParams?: Promise<{ case?: string }>;
};

export default async function ReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const demo = getDemoCase(params?.case);
  const baselineResult = getDemoResult(demo.id);
  const evidenceResult = getEvidenceResult(demo.id);
  const markdown = getReportMarkdown(demo.id);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="第 4 步"
        title="GTM 简报"
        description="报告页保留技能层产出的标准 Markdown 简报，同时展示证据修正后的评分闭环。"
        demo={demo}
      />
      <WorkflowNav activePath="/report" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/report" />
      <div className="report-actions">
        <a className="primary-action" href={`/api/report/${demo.id}`}>
          下载 Markdown
        </a>
        <span className="secondary-action">{getReportFileName(demo.id)}</span>
      </div>
      {evidenceResult ? (
        <EvidenceComparison
          evidenceCase={evidenceResult.evidenceCase}
          adjustment={evidenceResult.adjustment}
          baselineResult={baselineResult}
          adjustedResult={evidenceResult.adjustedResult}
        />
      ) : null}
      <ReportViewer markdown={markdown} />
    </div>
  );
}
