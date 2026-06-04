import { CaseSwitcher } from "@/components/CaseSwitcher";
import { PageHeader } from "@/components/PageHeader";
import { ProductProfileForm } from "@/components/ProductProfileForm";
import { WorkflowNav } from "@/components/WorkflowNav";
import { getDemoCase } from "@/lib/demo-cases";

type PageProps = {
  searchParams?: Promise<{ case?: string }>;
};

export default async function ProductProfilePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const demo = getDemoCase(params?.case);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="第 1 步"
        title="产品画像"
        description="产品画像是评分模型的锚点。风险偏好、定位、ICP 和卖点都会进入最终判断。"
        demo={demo}
      />
      <WorkflowNav activePath="/product-profile" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/product-profile" />
      <ProductProfileForm product={demo.product} />
    </div>
  );
}
