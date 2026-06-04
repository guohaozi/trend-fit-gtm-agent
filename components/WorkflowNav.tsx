import Link from "next/link";

const STEPS = [
  { href: "/product-profile", label: "Product Profile" },
  { href: "/trend-input", label: "Trend Input" },
  { href: "/fit-score", label: "Fit Score" },
  { href: "/report", label: "GTM Brief" }
];

type WorkflowNavProps = {
  activePath: string;
  caseId: string;
};

export function WorkflowNav({ activePath, caseId }: WorkflowNavProps) {
  return (
    <nav className="workflow-nav" aria-label="Workflow">
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
