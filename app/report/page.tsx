import { CaseSwitcher } from "@/components/CaseSwitcher";
import { PageHeader } from "@/components/PageHeader";
import { ReportViewer } from "@/components/ReportViewer";
import { WorkflowNav } from "@/components/WorkflowNav";
import { getDemoCase, getReportFileName, getReportMarkdown } from "@/lib/demo-cases";

type PageProps = {
  searchParams?: Promise<{ case?: string }>;
};

export default async function ReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const demo = getDemoCase(params?.case);
  const markdown = getReportMarkdown(demo.id);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="Step 4"
        title="GTM Brief Report"
        description="The report page renders the gold-standard Markdown produced by the skill layer, preserving the twelve-section GTM brief contract."
        demo={demo}
      />
      <WorkflowNav activePath="/report" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/report" />
      <div className="report-actions">
        <a className="primary-action" href={`/api/report/${demo.id}`}>
          Download Markdown
        </a>
        <span className="secondary-action">{getReportFileName(demo.id)}</span>
      </div>
      <ReportViewer markdown={markdown} />
    </div>
  );
}
