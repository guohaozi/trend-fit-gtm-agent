import Link from "next/link";
import { DEMO_CASES, getCaseLabel } from "@/lib/demo-cases";

type CaseSwitcherProps = {
  activeId: string;
  currentPath: string;
  profile?: string;
};

export function CaseSwitcher({ activeId, currentPath, profile }: CaseSwitcherProps) {
  return (
    <nav className="case-switcher" aria-label="案例切换">
      {DEMO_CASES.map((demo) => {
        const isActive = demo.id === activeId;
        const profileQuery = profile && profile !== "default" ? `&profile=${profile}` : "";
        return (
          <Link
            key={demo.id}
            href={`${currentPath}?case=${demo.id}${profileQuery}`}
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
