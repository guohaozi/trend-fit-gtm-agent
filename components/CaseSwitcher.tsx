import Link from "next/link";
import { DEMO_CASES, getCaseLabel } from "@/lib/demo-cases";

type CaseSwitcherProps = {
  activeId: string;
  currentPath: string;
};

export function CaseSwitcher({ activeId, currentPath }: CaseSwitcherProps) {
  return (
    <nav className="case-switcher" aria-label="Demo cases">
      {DEMO_CASES.map((demo) => {
        const isActive = demo.id === activeId;
        return (
          <Link
            key={demo.id}
            href={`${currentPath}?case=${demo.id}`}
            className={isActive ? "case-link active" : "case-link"}
          >
            <span>{demo.product.name.replace(" (demo)", "")}</span>
            <small>{getCaseLabel(demo)}</small>
          </Link>
        );
      })}
    </nav>
  );
}
