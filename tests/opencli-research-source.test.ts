import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { OpenCliResearchSource } from "../lib/opencli-research-source";
import { buildResearchQueries, runEvidenceCaseResearch } from "../lib/evidence-case-research-runner";

function makeTempProject(): { root: string; dataDir: string; outputDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opencli-research-source-"));
  return {
    root,
    dataDir: path.join(root, "data"),
    outputDir: path.join(root, "outputs")
  };
}

describe("OpenCLI research source", () => {
  it("executes OpenCLI Reddit and YouTube commands and returns customer research findings", async () => {
    const executed: string[][] = [];
    const source = new OpenCliResearchSource({
      openCliBin: "/custom/opencli",
      platforms: ["reddit", "youtube"],
      themes: ["audience_language", "commercial_intent"],
      runner: async (command) => {
        executed.push(command);
        if (command[1] === "reddit") {
          return {
            status: 0,
            stdout: JSON.stringify([
              {
                id: "abc123",
                title: "Drone video for Dubai tourism?",
                subreddit: "dubai",
                score: 24,
                comments: 9,
                url: "https://www.reddit.com/r/dubai/comments/abc123/drone_video/",
                selftext: "I want a drone for desert and hotel video shoots."
              }
            ]),
            stderr: ""
          };
        }

        return {
          status: 0,
          stdout: JSON.stringify([
            {
              rank: 1,
              title: "DJI drone Dubai travel video",
              channel: "Creator",
              url: "https://www.youtube.com/watch?v=video123"
            }
          ]),
          stderr: ""
        };
      }
    });

    const result = await source.collect({
      product: "DJI drones",
      market: "Middle East",
      trend: "video creation tourism",
      queries: buildResearchQueries({
        product: "DJI drones",
        market: "Middle East",
        trend: "video creation tourism",
        platforms: ["reddit", "youtube"]
      }),
      limitPerQuery: 2
    });

    assert.equal(executed.length, 4);
    assert.deepEqual(executed[0].slice(0, 3), ["/custom/opencli", "reddit", "search"]);
    assert.deepEqual(executed[1].slice(0, 3), ["/custom/opencli", "youtube", "search"]);
    const findings = result.customerResearchFindings ?? [];
    assert.equal(findings.length, 4);
    assert.equal(findings[0].sourceType, "reddit_thread");
    assert.equal(findings[1].sourceType, "unknown");
    assert.match(findings[0].quote ?? "", /desert and hotel/);
  });

  it("maps OpenCLI Twitter and Google rows into additional evidence candidates", async () => {
    const executed: string[][] = [];
    const source = new OpenCliResearchSource({
      openCliBin: "/custom/opencli",
      platforms: ["twitter", "google"],
      themes: ["audience_language", "brand_safety_concern"],
      runner: async (command) => {
        executed.push(command);
        if (command[1] === "twitter") {
          return {
            status: 0,
            stdout: JSON.stringify([
              {
                id: "tweet123",
                author: "creator",
                text: "DJI drone footage makes Dubai tourism content look unreal.",
                likes: 42,
                views: 1200,
                url: "https://x.com/creator/status/tweet123"
              }
            ]),
            stderr: ""
          };
        }

        return {
          status: 0,
          stdout: JSON.stringify([
            {
              type: "organic",
              title: "UAE drone regulation guide",
              url: "https://www.gcaa.gov.ae/",
              snippet: "Drone operators need approval and must follow aviation safety requirements."
            }
          ]),
          stderr: ""
        };
      }
    });

    const result = await source.collect({
      product: "DJI drones",
      market: "Middle East",
      trend: "video creation tourism",
      queries: buildResearchQueries({
        product: "DJI drones",
        market: "Middle East",
        trend: "video creation tourism",
        platforms: ["x", "web"]
      }),
      limitPerQuery: 2
    });

    const candidates = result.additionalCandidates ?? [];
    assert.equal(executed.length, 4);
    assert.deepEqual(executed[0].slice(0, 3), ["/custom/opencli", "twitter", "search"]);
    assert.equal(executed.some((command) => command.slice(0, 3).join(" ") === "/custom/opencli google search"), true);
    assert.equal(candidates.length, 4);
    assert.equal(candidates[0].id, "opencli-twitter-audience-language-tweet123");
    assert.equal(candidates[0].dimension, "audienceOverlap");
    assert.equal(candidates[0].verificationStatus, "unverified");
    assert.deepEqual(candidates[0].sourceSignals, ["single_social_thread"]);
    assert.equal(candidates.some((candidate) => candidate.id === "opencli-google-audience-language-1"), true);
    assert.equal(candidates.find((candidate) => candidate.id === "opencli-google-audience-language-1")?.verificationStatus, "unverified");
    assert.equal(candidates[3].dimension, "brandSafety");
  });

  it("can continue when one OpenCLI platform command fails", async () => {
    const source = new OpenCliResearchSource({
      openCliBin: "/custom/opencli",
      platforms: ["reddit", "google"],
      themes: ["audience_language"],
      continueOnCommandError: true,
      runner: async (command) => {
        if (command[1] === "reddit") {
          return {
            status: 1,
            stdout: "",
            stderr: "SyntaxError: Unexpected token '<'"
          };
        }

        return {
          status: 0,
          stdout: JSON.stringify([
            {
              type: "organic",
              title: "Saudi deploys drones for Hajj security",
              url: "https://example.com/drone-security",
              snippet: "Drones support crowd monitoring and security operations."
            }
          ]),
          stderr: ""
        };
      }
    });

    const result = await source.collect({
      product: "DJI drones",
      market: "Middle East",
      trend: "security inspection",
      queries: buildResearchQueries({
        product: "DJI drones",
        market: "Middle East",
        trend: "security inspection",
        platforms: ["reddit", "web"]
      }),
      limitPerQuery: 2
    });

    assert.equal(result.customerResearchFindings?.length ?? 0, 0);
    assert.equal(result.additionalCandidates?.length, 1);
    assert.match(result.tooling ?? "", /Skipped failed OpenCLI commands: 1/);
  });

  it("filters irrelevant OpenCLI rows before mapping them into evidence", async () => {
    const source = new OpenCliResearchSource({
      openCliBin: "/custom/opencli",
      platforms: ["reddit"],
      themes: ["audience_language"],
      runner: async () => ({
        status: 0,
        stdout: JSON.stringify([
          {
            id: "gourd123",
            title: "Final update on ornamental gourd futures",
            subreddit: "BestofRedditorUpdates",
            score: 99,
            comments: 120,
            url: "https://www.reddit.com/r/BestofRedditorUpdates/comments/gourd123/",
            selftext: "A long story about agricultural futures."
          },
          {
            id: "war123",
            title: "Regional conflict update",
            subreddit: "news",
            score: 44,
            comments: 20,
            url: "https://www.reddit.com/r/news/comments/war123/",
            selftext: `${"Political conflict recap. ".repeat(40)} Saudi Arabia intercepted drones overnight.`
          },
          {
            id: "drone123",
            title: "Drone filming around Dubai tourism sites",
            subreddit: "dubai",
            score: 12,
            comments: 4,
            url: "https://www.reddit.com/r/dubai/comments/drone123/",
            selftext: "Is a DJI drone practical for tourism and hotel video creation?"
          }
        ]),
        stderr: ""
      })
    });

    const result = await source.collect({
      product: "DJI drones",
      market: "UAE Saudi Middle East",
      trend: "video creation security inspection tourism enablement",
      queries: buildResearchQueries({
        product: "DJI drones",
        market: "UAE Saudi Middle East",
        trend: "video creation security inspection tourism enablement",
        platforms: ["reddit"]
      }),
      limitPerQuery: 2
    });

    const findings = result.customerResearchFindings ?? [];
    assert.equal(findings.length, 1);
    assert.equal(findings[0].id, "opencli-reddit-audience-language-drone123");
  });

  it("feeds OpenCLI customer findings into evidence case research", async () => {
    const { dataDir, outputDir } = makeTempProject();
    const source = new OpenCliResearchSource({
      platforms: ["reddit"],
      themes: ["audience_language", "commercial_intent"],
      runner: async () => ({
        status: 0,
        stdout: JSON.stringify([
          {
            id: "abc123",
            title: "Buying a drone for Dubai content?",
            subreddit: "dubai",
            score: 24,
            comments: 9,
            url: "https://www.reddit.com/r/dubai/comments/abc123/drone_video/",
            selftext: "Is DJI worth buying for real estate and tourism shoots?"
          }
        ]),
        stderr: ""
      })
    });

    const result = await runEvidenceCaseResearch({
      product: "DJI drones",
      market: "Middle East",
      trend: "video creation tourism",
      riskTolerance: "high",
      profileUsed: "b2b_pipeline",
      provider: source,
      dataDir,
      outputDir,
      researchDate: "2026-06-10"
    });

    const evidence = JSON.parse(fs.readFileSync(result.fileResult.evidencePath, "utf8"));

    assert.equal(result.fileResult.candidateCount, 2);
    assert.equal(evidence.evidence[0].id, "opencli-reddit-audience-language-abc123");
    assert.equal(evidence.evidence[0].sourceTier, "primary");
    assert.equal(evidence.evidence[1].id, "opencli-reddit-commercial-intent-abc123");
    assert.equal(evidence.evidence[1].sourceTier, "proxy");
  });

  it("prints OpenCLI provider commands from the research CLI dry run", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/evidence-case-research.ts",
        "--product",
        "DJI drones",
        "--market",
        "Middle East",
        "--trend",
        "video creation tourism",
        "--risk",
        "high",
        "--profile",
        "b2b_pipeline",
        "--provider",
        "opencli",
        "--platforms",
        "reddit,youtube,twitter,google",
        "--opencli-bin",
        "/custom/opencli",
        "--dry-run-provider-commands"
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\/custom\/opencli reddit search/);
    assert.match(result.stdout, /\/custom\/opencli youtube search/);
    assert.match(result.stdout, /\/custom\/opencli twitter search/);
    assert.match(result.stdout, /\/custom\/opencli google search/);
    assert.match(result.stdout, /commercial_intent/);
  });

  it("uses portable opencli commands by default in dry-run output", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/evidence-case-research.ts",
        "--product",
        "DJI drones",
        "--market",
        "Middle East",
        "--trend",
        "video creation tourism",
        "--risk",
        "high",
        "--profile",
        "b2b_pipeline",
        "--provider",
        "opencli",
        "--platforms",
        "reddit",
        "--dry-run-provider-commands"
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          OPENCLI_BIN: ""
        }
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^audience_language: opencli reddit search/m);
    assert.doesNotMatch(result.stdout, /\/Users\/guo\/\.npm-global\/bin\/opencli/);
  });
});
