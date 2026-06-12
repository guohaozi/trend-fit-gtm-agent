import { CaseSwitcher } from "@/components/CaseSwitcher";
import { EvidenceComparison } from "@/components/EvidenceComparison";
import { PageHeader } from "@/components/PageHeader";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { ReportViewer } from "@/components/ReportViewer";
import { RigorSummary } from "@/components/RigorSummary";
import { WorkflowNav } from "@/components/WorkflowNav";
import {
  getDemoCase,
  getDemoResult,
  getDemoRigorResult,
  getEvidenceResult,
  getReportFileName,
  getReportMarkdown
} from "@/lib/demo-cases";
import { normalizeWeightProfile } from "@/lib/recommendation-rigor";

type PageProps = {
  searchParams?: Promise<{ case?: string; profile?: string }>;
};

export default async function ReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const demo = getDemoCase(params?.case);
  const profile = normalizeWeightProfile(params?.profile);
  const baselineResult = getDemoResult(demo.id, profile);
  const baselineRigor = getDemoRigorResult(demo.id, profile);
  const evidenceResult = getEvidenceResult(demo.id, profile);
  const markdown = getReportMarkdown(demo.id);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="第 4 步"
        title="GTM 简报"
        description="把推荐结论、营销切入点、风险边界和下一步测试整理成一份可下载的中文行动简报。"
        demo={demo}
      />
      <WorkflowNav activePath="/report" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/report" profile={profile} />
      <ProfileSwitcher activeProfile={profile} caseId={demo.id} currentPath="/report" />
      <div className="report-actions">
        <a className="primary-action" href={`/api/report/${demo.id}`}>
          下载 Markdown
        </a>
        <span className="secondary-action">{getReportFileName(demo.id)}</span>
      </div>
      <RigorSummary result={baselineRigor.result} rigor={baselineRigor.rigor} />
      {evidenceResult ? (
        <>
          <RigorSummary
            title="证据修正后的实际结论"
            result={evidenceResult.adjustedResult}
            rigor={evidenceResult.rigor}
          />
          <EvidenceComparison
            evidenceCase={evidenceResult.evidenceCase}
            adjustment={evidenceResult.adjustment}
            baselineResult={baselineResult}
            adjustedResult={evidenceResult.adjustedResult}
          />
        </>
      ) : null}
      <ReportViewer markdown={markdown} />
    </div>
  );
}
