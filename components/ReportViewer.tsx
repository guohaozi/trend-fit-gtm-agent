import { extractReportSections } from "@/lib/report-sections";
import { parseMarkdownBlocks } from "@/lib/report-markdown";

type ReportViewerProps = {
  markdown: string;
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderBody(body: string) {
  return parseMarkdownBlocks(body).map((block, index) => {
    if (block.type === "paragraph") {
      return <p key={`p-${index}`}>{renderInline(block.text)}</p>;
    }

    if (block.type === "blockquote") {
      return <blockquote key={`quote-${index}`}>{renderInline(block.text)}</blockquote>;
    }

    if (block.type === "list") {
      return (
        <ul key={`list-${index}`}>
          {block.items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    }

    return (
      <div className="table-wrap" key={`table-${index}`}>
          <table>
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${row.join("-")}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cell}-${cellIndex}`}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    );
  });
}

export function ReportViewer({ markdown }: ReportViewerProps) {
  const [titleLine] = markdown.split("\n");
  const sections = extractReportSections(markdown);

  return (
    <article className="report-viewer">
      <header>
        <p className="eyebrow">Gold-standard Markdown</p>
        <h2>{titleLine.replace(/^#\s+/, "")}</h2>
      </header>
      {sections.map((section) => (
        <section className="report-section" id={section.id} key={section.id}>
          <h3>{section.title}</h3>
          {renderBody(section.body)}
        </section>
      ))}
    </article>
  );
}
