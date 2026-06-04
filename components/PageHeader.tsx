import Link from "next/link";
import type { DemoCase } from "@/lib/types";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  demo: DemoCase;
};

export function PageHeader({ eyebrow, title, description, demo }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="header-copy">{description}</p>
      </div>
      <Link className="text-action" href={`/report?case=${demo.id}`}>
        View report
      </Link>
    </header>
  );
}
