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
        eyebrow="Step 1"
        title="Product Profile"
        description="The product profile anchors the scoring model. Risk tolerance, positioning, ICP, and selling points all feed the final decision."
        demo={demo}
      />
      <WorkflowNav activePath="/product-profile" caseId={demo.id} />
      <CaseSwitcher activeId={demo.id} currentPath="/product-profile" />
      <ProductProfileForm product={demo.product} />
    </div>
  );
}
