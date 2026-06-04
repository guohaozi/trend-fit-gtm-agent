import Link from "next/link";

const STEPS = [
  { href: "/product-profile", label: "产品画像" },
  { href: "/trend-input", label: "热点输入" },
  { href: "/fit-score", label: "适配评分" },
  { href: "/report", label: "GTM 简报" }
];

type WorkflowNavProps = {
  activePath: string;
  caseId: string;
};

export function WorkflowNav({ activePath, caseId }: WorkflowNavProps) {
  return (
    <nav className="workflow-nav" aria-label="工作流">
      {STEPS.map((step, index) => (
        <Link
          key={step.href}
          href={`${step.href}?case=${caseId}`}
          className={activePath === step.href ? "workflow-step active" : "workflow-step"}
        >
          <span className="step-index">{index + 1}</span>
          <span>{step.label}</span>
        </Link>
      ))}
    </nav>
  );
}
