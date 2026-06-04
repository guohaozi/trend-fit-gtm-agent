import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMarkdownBlocks } from "../lib/report-markdown";

describe("report markdown parsing", () => {
  it("joins soft-wrapped paragraphs into one paragraph block", () => {
    const blocks = parseMarkdownBlocks(
      [
        "This is close to a textbook fit: the people driving the trend are exact customers",
        "Northbound wants, and the product genuinely produces the understated look.",
        "",
        "**Total Fit Score: 90/100**"
      ].join("\n")
    );

    assert.deepEqual(blocks, [
      {
        type: "paragraph",
        text: "This is close to a textbook fit: the people driving the trend are exact customers Northbound wants, and the product genuinely produces the understated look."
      },
      {
        type: "paragraph",
        text: "**Total Fit Score: 90/100**"
      }
    ]);
  });

  it("keeps wrapped list item continuation text inside the same list item", () => {
    const blocks = parseMarkdownBlocks(
      [
        "- **Styling reveal:** Hook — \"Building a quiet-luxury fit for under $150.\" Build",
        "  the outfit, reveal each affordable piece at the end. → link in bio.",
        "- **2-look comparison:** \"Loud luxury vs. quiet luxury.\""
      ].join("\n")
    );

    assert.deepEqual(blocks, [
      {
        type: "list",
        items: [
          "**Styling reveal:** Hook — \"Building a quiet-luxury fit for under $150.\" Build the outfit, reveal each affordable piece at the end. → link in bio.",
          "**2-look comparison:** \"Loud luxury vs. quiet luxury.\""
        ]
      }
    ]);
  });

  it("joins consecutive blockquote lines into one quote block", () => {
    const blocks = parseMarkdownBlocks(
      [
        "> Hey {name} — love your everyday-outfit breakdowns.",
        "> Northbound is leaning into the quiet-luxury look.",
        "> Could we send you a couple pieces to style?"
      ].join("\n")
    );

    assert.deepEqual(blocks, [
      {
        type: "blockquote",
        text: "Hey {name} — love your everyday-outfit breakdowns. Northbound is leaning into the quiet-luxury look. Could we send you a couple pieces to style?"
      }
    ]);
  });

  it("parses markdown tables without turning separator rows into content", () => {
    const blocks = parseMarkdownBlocks(
      [
        "| Dimension | Score |",
        "|-----------|-------|",
        "| Audience | 100 |"
      ].join("\n")
    );

    assert.deepEqual(blocks, [
      {
        type: "table",
        head: ["Dimension", "Score"],
        rows: [["Audience", "100"]]
      }
    ]);
  });
});
