export type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "table"; head: string[]; rows: string[][] };

function compactJoin(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(" ");
}

function parseTable(lines: string[]): Extract<MarkdownBlock, { type: "table" }> {
  const rows = lines
    .filter((line) => !/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    );

  const [head = [], ...bodyRows] = rows;
  return { type: "table", head, rows: bodyRows };
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      blocks.push(parseTable(tableLines));
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quoteLines.push(lines[index].trim().replace(/^>\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", text: compactJoin(quoteLines) });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      let currentItem = trimmed.replace(/^-\s+/, "");
      index += 1;

      while (index < lines.length) {
        const nextLine = lines[index];
        const nextTrimmed = nextLine.trim();

        if (!nextTrimmed) {
          index += 1;
          break;
        }

        if (nextTrimmed.startsWith("- ")) {
          items.push(currentItem.trim());
          currentItem = nextTrimmed.replace(/^-\s+/, "");
          index += 1;
          continue;
        }

        if (nextLine.startsWith(" ") || nextLine.startsWith("\t")) {
          currentItem = compactJoin([currentItem, nextTrimmed]);
          index += 1;
          continue;
        }

        break;
      }

      items.push(currentItem.trim());
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const nextTrimmed = lines[index].trim();
      if (
        !nextTrimmed ||
        nextTrimmed.startsWith("|") ||
        nextTrimmed.startsWith("> ") ||
        nextTrimmed.startsWith("- ")
      ) {
        break;
      }
      paragraphLines.push(nextTrimmed);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: compactJoin(paragraphLines) });
  }

  return blocks;
}
