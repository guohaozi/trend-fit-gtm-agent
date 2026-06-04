export type ReportSection = {
  id: string;
  title: string;
  body: string;
};

export function extractReportSections(markdown: string): ReportSection[] {
  const sections: ReportSection[] = [];
  const lines = markdown.split("\n");
  let current: ReportSection | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      const title = line.replace(/^##\s+/, "").trim();
      current = {
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        title,
        body: ""
      };
      continue;
    }

    if (current) {
      current.body += `${line}\n`;
    }
  }

  if (current) sections.push(current);
  return sections;
}
