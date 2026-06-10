import fs from "node:fs";
import path from "node:path";
import { writeEvidenceCaseFiles, type EvidenceCaseCliInput } from "../lib/evidence-case-file-writer";

type ParsedArgs = {
  input?: string;
  dataDir?: string;
  outputDir?: string;
  evidenceFileName?: string;
  reportFileName?: string;
  help?: boolean;
};

function usage(): string {
  return [
    "Usage:",
    "  npm run evidence:case -- --input path/to/input.json",
    "",
    "Options:",
    "  --input <path>          JSON input containing baseline scores and provider findings",
    "  --data-dir <path>       Directory for the generated evidence JSON (default: ./data)",
    "  --output-dir <path>     Directory for the generated markdown report (default: ./outputs)",
    "  --evidence-file <name>  Override evidence JSON filename",
    "  --report-file <name>    Override markdown report filename",
    "  --help                  Show this message"
  ].join("\n");
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (!next || next.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    if (arg === "--input") args.input = next;
    else if (arg === "--data-dir") args.dataDir = next;
    else if (arg === "--output-dir") args.outputDir = next;
    else if (arg === "--evidence-file") args.evidenceFileName = next;
    else if (arg === "--report-file") args.reportFileName = next;
    else throw new Error(`Unknown argument: ${arg}`);

    index += 1;
  }

  return args;
}

function readJsonInput(inputPath: string): EvidenceCaseCliInput {
  const absolutePath = path.resolve(inputPath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as EvidenceCaseCliInput;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  if (!args.input) {
    throw new Error(`Missing required --input.\n\n${usage()}`);
  }

  const input = readJsonInput(args.input);
  const result = writeEvidenceCaseFiles(input, {
    dataDir: args.dataDir,
    outputDir: args.outputDir,
    evidenceFileName: args.evidenceFileName,
    reportFileName: args.reportFileName
  });

  console.log(`Evidence JSON: ${result.evidencePath}`);
  console.log(`Markdown report: ${result.reportPath}`);
  console.log(`Candidates: ${result.candidateCount}; accepted evidence: ${result.evidenceCount}; dropped: ${result.droppedCount}`);
  console.log(
    `Adjusted: ${result.evidenceCase.expectedAdjustedTotal} / ${result.evidenceCase.expectedAdjustedBand}; gate: ${result.evidenceCase.expectedEvidenceGate}`
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
