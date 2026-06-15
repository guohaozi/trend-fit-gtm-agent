"use client";

import { useEffect, useRef, useState } from "react";
import { ReportViewer } from "@/components/ReportViewer";
import {
  buildWorkspaceEvidenceGaps,
  evaluateSingleWorkspaceTrend,
  evaluateWorkspaceShortlist,
  renderShortlistWorkspaceMarkdown,
  renderSingleWorkspaceMarkdown,
  type WorkspaceCandidate,
  type WorkspaceEvidenceGap,
  type WorkspaceProduct
} from "@/lib/workspace-evaluator";
import {
  PROFILE_OPTIONS,
  type GatedRecommendation
} from "@/lib/recommendation-rigor";
import type { EvidenceItem } from "@/lib/evidence-adjustment";
import {
  BAND_LABELS,
  DECISION_TYPE_LABELS,
  EVIDENCE_GATE_LABELS,
  RISK_LABELS,
  STABILITY_LABELS
} from "@/lib/display-labels";
import type { Band, RiskTolerance, ScoreKey, ScoreValue, Scores } from "@/lib/types";

const SCORE_OPTIONS: ScoreValue[] = [0, 25, 50, 75, 100];

const SCORE_META: Array<{ key: ScoreKey; label: string; hint: string }> = [
  { key: "audienceOverlap", label: "受众重合", hint: "趋势受众是否和产品目标用户重合？" },
  { key: "useCaseRelevance", label: "使用场景", hint: "产品加入这个热点是否自然、不牵强？" },
  { key: "messageBridge", label: "卖点桥接", hint: "热点能否顺畅连接到真实卖点？" },
  { key: "creativeFeasibility", label: "内容可执行", hint: "团队能否产出适合平台语境的内容？" },
  { key: "commercialIntent", label: "商业意图", hint: "受众是否接近购买、试用或咨询心态？" },
  { key: "brandSafety", label: "品牌安全", hint: "是否存在声誉、价值观或表达风险？" },
  { key: "timingSaturation", label: "时机饱和", hint: "现在进入是否仍有差异化空间？" }
];

const RISK_OPTIONS: Array<{ value: RiskTolerance; label: string }> = [
  { value: "low", label: "低（保守）" },
  { value: "medium", label: "中等" },
  { value: "high", label: "高（激进）" }
];

type EvaluateCandidate = {
  id: string;
  trendName: string;
  trendDescription: string;
  scores: Scores;
  aiRationales?: Partial<Record<ScoreKey, string>>;
  aiOverall?: string;
};

type AiScoreState = { status: "loading" | "setup" | "error"; message?: string };

type EvalRow = {
  rank: number | null;
  trendName: string;
  total: number;
  band: Band;
  decision: string;
  stability: string;
};

type EvidenceSummary = {
  collected: number;
  kept: number;
  tierCounts: Record<string, number>;
  bySource: Record<string, number>;
  failed: boolean;
};

const SOURCE_LABELS: Record<string, string> = {
  hackernews: "HN",
  reddit: "Reddit",
  gdelt: "GDELT",
  xiaohongshu: "小红书",
  tiktok: "TikTok",
  instagram: "IG",
  twitter: "X"
};

type EvalOutcome = {
  multiple: boolean;
  headlineTrend: string;
  baselineScore: number;
  headlineScore: number;
  baselineBand: Band;
  rigor: GatedRecommendation;
  gaps: WorkspaceEvidenceGap[];
  rows: EvalRow[];
  markdown: string;
  reportFileName: string;
  evidenceSummary: EvidenceSummary;
};

const EMPTY_EVIDENCE_SUMMARY: EvidenceSummary = {
  collected: 0,
  kept: 0,
  tierCounts: {},
  bySource: {},
  failed: true
};

const SOURCE_TIER_LABELS: Record<string, string> = {
  primary: "一手 / 强证据",
  secondary: "二手 / 方向性",
  proxy: "代理指标"
};

function makeScores(value: ScoreValue): Scores {
  return {
    audienceOverlap: value,
    useCaseRelevance: value,
    messageBridge: value,
    creativeFeasibility: value,
    commercialIntent: value,
    brandSafety: value,
    timingSaturation: value
  };
}

function seedProduct(): WorkspaceProduct {
  return {
    name: "Northbound 男装",
    category: "中端男装",
    market: "美国 / 一二线城市",
    audience: "20–35 岁注重质感的男性白领",
    positioning: "干净基础款、平价质感、少 logo",
    sellingPoints: "版型利落、面料耐穿、通勤也能穿出高级感",
    brandTone: "克制、实用、笃定",
    riskTolerance: "medium",
    profileUsed: "default"
  };
}

function seedCandidate(): EvaluateCandidate {
  return {
    id: "trend-1",
    trendName: "静奢风 / old money 穿搭",
    trendDescription: "对 logo 堆砌的反叛，追求低调、合身、看不出价格的高级感。",
    scores: {
      audienceOverlap: 75,
      useCaseRelevance: 100,
      messageBridge: 75,
      creativeFeasibility: 75,
      commercialIntent: 50,
      brandSafety: 50,
      timingSaturation: 50
    }
  };
}

function blankProduct(): WorkspaceProduct {
  return {
    name: "",
    category: "",
    market: "",
    audience: "",
    positioning: "",
    sellingPoints: "",
    brandTone: "",
    riskTolerance: "medium",
    profileUsed: "default"
  };
}

function blankCandidate(index: number): EvaluateCandidate {
  return {
    id: `trend-${index}`,
    trendName: "",
    trendDescription: "",
    scores: makeScores(50)
  };
}

function toWorkspaceCandidate(
  candidate: EvaluateCandidate,
  evidence: EvidenceItem[] = []
): WorkspaceCandidate {
  return {
    id: candidate.id,
    trendName: candidate.trendName.trim() || "未命名热点",
    trendDescription: candidate.trendDescription,
    scores: candidate.scores,
    evidence
  };
}

function computeOutcome(
  product: WorkspaceProduct,
  candidates: EvaluateCandidate[],
  evidenceByIndex: EvidenceItem[][],
  evidenceSummary: EvidenceSummary
): EvalOutcome {
  const wsCandidates = candidates.map((candidate, index) =>
    toWorkspaceCandidate(candidate, evidenceByIndex[index] ?? [])
  );

  if (wsCandidates.length === 1) {
    const candidate = wsCandidates[0];
    const single = evaluateSingleWorkspaceTrend(product, candidate);
    return {
      multiple: false,
      headlineTrend: candidate.trendName,
      baselineScore: single.baselineResult.total,
      headlineScore: single.adjustedResult.total,
      baselineBand: single.baselineResult.recommendation.finalBand,
      rigor: single.rigor,
      gaps: buildWorkspaceEvidenceGaps(single.rigor),
      rows: [
        {
          rank: null,
          trendName: candidate.trendName,
          total: single.adjustedResult.total,
          band: single.rigor.gatedBand,
          decision: DECISION_TYPE_LABELS[single.rigor.decisionType] ?? single.rigor.decisionType,
          stability: STABILITY_LABELS[single.rigor.recommendationStability] ?? single.rigor.recommendationStability
        }
      ],
      markdown: renderSingleWorkspaceMarkdown({ product, candidate, result: single }),
      reportFileName: "trend-fit-single-evaluation.md",
      evidenceSummary
    };
  }

  const shortlist = evaluateWorkspaceShortlist(product, wsCandidates);
  const winner = shortlist.winner;
  return {
    multiple: true,
    headlineTrend: winner.trendName,
    baselineScore: winner.baselineResult.total,
    headlineScore: winner.adjustedResult.total,
    baselineBand: winner.baselineResult.recommendation.finalBand,
    rigor: winner.rigor,
    gaps: buildWorkspaceEvidenceGaps(winner.rigor),
    rows: shortlist.rows.map((row) => ({
      rank: row.rank,
      trendName: row.trendName,
      total: row.adjustedResult.total,
      band: row.rigor.gatedBand,
      decision: DECISION_TYPE_LABELS[row.rigor.decisionType] ?? row.rigor.decisionType,
      stability: STABILITY_LABELS[row.rigor.recommendationStability] ?? row.rigor.recommendationStability
    })),
    markdown: renderShortlistWorkspaceMarkdown({ product, shortlist }),
    reportFileName: "trend-fit-shortlist-evaluation.md",
    evidenceSummary
  };
}

type CollectedEvidence = {
  evidence: EvidenceItem[];
  data: { collected?: number; kept?: number; tierCounts?: Record<string, number>; bySource?: Record<string, number> } | null;
};

function aggregateEvidenceSummary(results: CollectedEvidence[]): EvidenceSummary {
  const summary: EvidenceSummary = {
    collected: 0,
    kept: 0,
    tierCounts: {},
    bySource: {},
    failed: true
  };
  for (const result of results) {
    if (!result.data) continue;
    summary.failed = false;
    summary.collected += result.data.collected ?? 0;
    summary.kept += result.data.kept ?? 0;
    for (const [tier, count] of Object.entries(result.data.tierCounts ?? {})) {
      summary.tierCounts[tier] = (summary.tierCounts[tier] ?? 0) + count;
    }
    for (const [source, count] of Object.entries(result.data.bySource ?? {})) {
      summary.bySource[source] = (summary.bySource[source] ?? 0) + count;
    }
  }
  return summary;
}

export function EvaluateClient() {
  const [product, setProduct] = useState<WorkspaceProduct>(() => seedProduct());
  const [candidates, setCandidates] = useState<EvaluateCandidate[]>(() => [seedCandidate()]);
  const [phase, setPhase] = useState<"editing" | "loading" | "done">("editing");
  const [outcome, setOutcome] = useState<EvalOutcome | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [aiState, setAiState] = useState<Record<string, AiScoreState>>({});
  const [accessCode, setAccessCode] = useState("");
  const [accessRemaining, setAccessRemaining] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("tf-access-code");
    if (saved) setAccessCode(saved);
  }, []);

  function updateAccessCode(value: string) {
    setAccessCode(value);
    try {
      window.localStorage.setItem("tf-access-code", value);
    } catch {
      /* ignore storage failures (private mode) */
    }
  }

  const canEvaluate =
    product.name.trim().length > 0 && candidates.every((candidate) => candidate.trendName.trim().length > 0);

  function updateProduct<K extends keyof WorkspaceProduct>(key: K, value: WorkspaceProduct[K]) {
    setProduct((prev) => ({ ...prev, [key]: value }));
  }

  function updateCandidate(index: number, update: Partial<EvaluateCandidate>) {
    setCandidates((prev) => prev.map((candidate, i) => (i === index ? { ...candidate, ...update } : candidate)));
  }

  function setScore(index: number, key: ScoreKey, value: ScoreValue) {
    setCandidates((prev) =>
      prev.map((candidate, i) =>
        i === index ? { ...candidate, scores: { ...candidate.scores, [key]: value } } : candidate
      )
    );
  }

  function addCandidate() {
    setCandidates((prev) => [...prev, blankCandidate(prev.length + 1)]);
  }

  function removeCandidate(index: number) {
    setCandidates((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function runAiScoring(index: number) {
    const candidate = candidates[index];
    if (!product.name.trim() || !candidate.trendName.trim()) return;

    setAiState((prev) => ({ ...prev, [candidate.id]: { status: "loading" } }));
    try {
      const response = await fetch("/api/evaluate/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": accessCode },
        body: JSON.stringify({
          product: {
            name: product.name,
            category: product.category,
            market: product.market,
            audience: product.audience,
            positioning: product.positioning,
            sellingPoints: product.sellingPoints,
            brandTone: product.brandTone,
            riskTolerance: product.riskTolerance
          },
          trend: { trendName: candidate.trendName, trendDescription: candidate.trendDescription }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 503) {
        setAiState((prev) => ({
          ...prev,
          [candidate.id]: { status: "setup", message: data?.error ?? "需要配置 GEMINI_API_KEY。" }
        }));
        return;
      }
      if (!response.ok || !data?.scores) {
        setAiState((prev) => ({
          ...prev,
          [candidate.id]: { status: "error", message: data?.error ?? "自动评分失败。" }
        }));
        return;
      }

      setCandidates((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                scores: data.scores as Scores,
                aiRationales: data.rationales as Partial<Record<ScoreKey, string>>,
                aiOverall: typeof data.overallRationale === "string" ? data.overallRationale : undefined
              }
            : item
        )
      );
      setAiState((prev) => {
        const next = { ...prev };
        delete next[candidate.id];
        return next;
      });
      if (typeof data.remaining === "number") setAccessRemaining(data.remaining);
    } catch {
      setAiState((prev) => ({
        ...prev,
        [candidate.id]: { status: "error", message: "网络错误，自动评分失败。" }
      }));
    }
  }

  function loadExample() {
    setProduct(seedProduct());
    setCandidates([seedCandidate()]);
    setOutcome(null);
    setPhase("editing");
  }

  function clearForm() {
    setProduct(blankProduct());
    setCandidates([blankCandidate(1)]);
    setOutcome(null);
    setPhase("editing");
  }

  async function collectEvidenceFor(candidate: EvaluateCandidate): Promise<CollectedEvidence> {
    try {
      const response = await fetch("/api/evidence/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": accessCode },
        body: JSON.stringify({
          product: { name: product.name },
          trend: { trendName: candidate.trendName }
        })
      });
      if (!response.ok) return { evidence: [], data: null };
      const data = await response.json();
      const evidence = Array.isArray(data.evidence) ? (data.evidence as EvidenceItem[]) : [];
      return { evidence, data };
    } catch {
      return { evidence: [], data: null };
    }
  }

  async function runEvaluation() {
    if (!canEvaluate || phase === "loading") return;
    setPhase("loading");
    setCopyStatus("idle");
    // Collect real evidence per candidate (server-side, free providers), then let the
    // deterministic engine adjust the baseline + gate against it.
    const collected = await Promise.all(candidates.map((candidate) => collectEvidenceFor(candidate)));
    const evidenceByIndex = collected.map((item) => item.evidence);
    const summary = aggregateEvidenceSummary(collected);
    setOutcome(computeOutcome(product, candidates, evidenceByIndex, summary));
    setPhase("done");
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function copyBrief() {
    if (!outcome) return;
    try {
      await navigator.clipboard.writeText(outcome.markdown);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("failed");
    }
  }

  function downloadBrief() {
    if (!outcome) return;
    const blob = new Blob([outcome.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = outcome.reportFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const gatedDropped = outcome ? outcome.headlineScore !== outcome.baselineScore : false;

  return (
    <div className="eval-page">
      <header className="eval-head">
        <p className="cases-eyebrow">开始评估</p>
        <h1>这波热点，你的产品该不该追？</h1>
        <p className="eval-lede">
          填好产品画像，给每个候选热点的七个维度打分，点「评估」拿到确定性结论和可下载的 GTM 简报。
        </p>
        <div className="eval-method">
          <strong>这是确定性、可审计的评分</strong>
          ——七维各取 0/25/50/75/100，固定权重加权，再叠加门槛与 override
          规则。没有证据支撑时，引擎会拒绝把高分升级成「强烈建议」，并直接告诉你还缺什么证据。
          <span>
            不想逐维打分？点每个热点上的「✨ 用 AI 评分」，让 AI 先提一版基线假设，你再微调——AI
            负责提出，证据门槛负责约束。
          </span>
        </div>
        <div className="eval-access">
          <label className="eval-field">
            <span>注册码</span>
            <input
              value={accessCode}
              onChange={(event) => updateAccessCode(event.target.value)}
              placeholder="输入注册码后才能用 AI 评分（demo 限次）"
            />
          </label>
          {accessRemaining !== null ? (
            <span className="eval-access-remaining">本注册码剩余 {accessRemaining} 次</span>
          ) : null}
        </div>
      </header>

      <div className="eval-grid">
        <section className="eval-panel" aria-label="产品画像">
          <div className="eval-panel-head">
            <h2>产品画像</h2>
            <div className="eval-panel-actions">
              <button type="button" className="eval-ghost" onClick={loadExample}>
                载入示例
              </button>
              <button type="button" className="eval-ghost" onClick={clearForm}>
                清空
              </button>
            </div>
          </div>

          <div className="eval-fields">
            <label className="eval-field">
              <span>产品名称</span>
              <input
                value={product.name}
                onChange={(event) => updateProduct("name", event.target.value)}
                placeholder="例如 Northbound 男装"
              />
            </label>
            <label className="eval-field">
              <span>品类</span>
              <input
                value={product.category}
                onChange={(event) => updateProduct("category", event.target.value)}
                placeholder="例如 中端男装"
              />
            </label>
            <label className="eval-field">
              <span>目标市场</span>
              <input
                value={product.market}
                onChange={(event) => updateProduct("market", event.target.value)}
                placeholder="例如 美国 / 一二线城市"
              />
            </label>
            <label className="eval-field">
              <span>目标人群</span>
              <input
                value={product.audience}
                onChange={(event) => updateProduct("audience", event.target.value)}
                placeholder="例如 20–35 岁注重质感的男性白领"
              />
            </label>
            <label className="eval-field eval-field-wide">
              <span>定位</span>
              <input
                value={product.positioning}
                onChange={(event) => updateProduct("positioning", event.target.value)}
                placeholder="例如 干净基础款、平价质感"
              />
            </label>
            <label className="eval-field eval-field-wide">
              <span>核心卖点</span>
              <input
                value={product.sellingPoints}
                onChange={(event) => updateProduct("sellingPoints", event.target.value)}
                placeholder="例如 版型利落、面料耐穿"
              />
            </label>
            <label className="eval-field">
              <span>品牌调性</span>
              <input
                value={product.brandTone}
                onChange={(event) => updateProduct("brandTone", event.target.value)}
                placeholder="例如 克制、实用、笃定"
              />
            </label>
            <label className="eval-field">
              <span>风险偏好</span>
              <select
                value={product.riskTolerance}
                onChange={(event) => updateProduct("riskTolerance", event.target.value as RiskTolerance)}
              >
                {RISK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="eval-field">
              <span>评分模型</span>
              <select
                value={product.profileUsed}
                onChange={(event) =>
                  updateProduct("profileUsed", event.target.value as WorkspaceProduct["profileUsed"])
                }
              >
                {PROFILE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="eval-panel" aria-label="候选热点">
          <div className="eval-panel-head">
            <h2>候选热点</h2>
            <button type="button" className="eval-ghost" onClick={addCandidate}>
              + 添加候选热点
            </button>
          </div>

          <div className="eval-candidates">
            {candidates.map((candidate, index) => (
              <article className="eval-candidate" key={candidate.id}>
                <div className="eval-candidate-head">
                  <span className="eval-candidate-index">热点 {index + 1}</span>
                  <div className="eval-candidate-tools">
                    <button
                      type="button"
                      className="eval-ai-btn"
                      onClick={() => runAiScoring(index)}
                      disabled={
                        aiState[candidate.id]?.status === "loading" ||
                        product.name.trim().length === 0 ||
                        candidate.trendName.trim().length === 0
                      }
                      title="让 AI 先提一版七维基线分，你再微调"
                    >
                      {aiState[candidate.id]?.status === "loading" ? "AI 评分中…" : "✨ 用 AI 评分"}
                    </button>
                    {candidates.length > 1 ? (
                      <button type="button" className="eval-remove" onClick={() => removeCandidate(index)}>
                        移除
                      </button>
                    ) : null}
                  </div>
                </div>

                <label className="eval-field eval-field-wide">
                  <span>热点名称</span>
                  <input
                    value={candidate.trendName}
                    onChange={(event) => updateCandidate(index, { trendName: event.target.value })}
                    placeholder="例如 静奢风 / old money 穿搭"
                  />
                </label>
                <label className="eval-field eval-field-wide">
                  <span>热点描述</span>
                  <textarea
                    value={candidate.trendDescription}
                    onChange={(event) => updateCandidate(index, { trendDescription: event.target.value })}
                    rows={2}
                    placeholder="一句话描述这个热点为什么火、围绕什么内容。"
                  />
                </label>

                {aiState[candidate.id]?.status === "setup" ? (
                  <p className="eval-ai-note setup">{aiState[candidate.id]?.message}</p>
                ) : null}
                {aiState[candidate.id]?.status === "error" ? (
                  <p className="eval-ai-note error">{aiState[candidate.id]?.message}</p>
                ) : null}
                {candidate.aiOverall ? (
                  <p className="eval-ai-note done">
                    AI 基线判断：{candidate.aiOverall}
                    <span>（这是 AI 提出的假设，没有证据支撑；评估时会被门槛约束。你可以直接微调下面的分数。）</span>
                  </p>
                ) : null}

                <div className="eval-scores">
                  {SCORE_META.map((dimension) => (
                    <div className="eval-score-row" key={dimension.key}>
                      <div className="eval-score-copy">
                        <strong>{dimension.label}</strong>
                        <small>{dimension.hint}</small>
                        {candidate.aiRationales?.[dimension.key] ? (
                          <small className="eval-ai-rationale">✨ {candidate.aiRationales[dimension.key]}</small>
                        ) : null}
                      </div>
                      <div className="eval-score-options" role="radiogroup" aria-label={dimension.label}>
                        {SCORE_OPTIONS.map((value) => (
                          <button
                            type="button"
                            key={value}
                            role="radio"
                            aria-checked={candidate.scores[dimension.key] === value}
                            className={
                              candidate.scores[dimension.key] === value
                                ? "eval-score-pill is-active"
                                : "eval-score-pill"
                            }
                            onClick={() => setScore(index, dimension.key, value)}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="eval-submit">
        <button
          type="button"
          className="eval-primary"
          onClick={runEvaluation}
          disabled={!canEvaluate || phase === "loading"}
        >
          {phase === "loading" ? "评估中…" : outcome ? "重新评估" : "评估"}
        </button>
        {!canEvaluate ? <span className="eval-hint">请先填写产品名称和每个候选热点的名称。</span> : null}
      </div>

      <div ref={resultRef}>
        {phase === "loading" ? (
          <section className="eval-loading" aria-live="polite">
            <span className="eval-spinner" aria-hidden="true" />
            <p>正在采集真实证据（HN / GDELT / TikHub 社媒）并用门槛规则计算确定性结论…</p>
          </section>
        ) : null}

        {phase === "done" && outcome ? (
          <section className="eval-result" aria-label="评估结果">
            <div className="eval-result-hero">
              <div className="eval-result-headline">
                <p className="cases-eyebrow">评估结果{outcome.multiple ? " · 候选排序第一名" : ""}</p>
                <h2>{outcome.headlineTrend}</h2>
                <p className="eval-result-sub">
                  {gatedDropped
                    ? `证据门槛把它从 ${BAND_LABELS[outcome.baselineBand]} 调整为 ${BAND_LABELS[outcome.rigor.gatedBand]}。`
                    : `经过证据门槛和稳定性检查后，结论保持为 ${BAND_LABELS[outcome.rigor.gatedBand]}。`}
                </p>
              </div>
              <aside className="case-detail-verdict eval-verdict">
                <span className="verdict-label">门槛后裁决</span>
                <strong className="verdict-score">{outcome.headlineScore}</strong>
                <small className="verdict-scale">/ 100</small>
                <div className="verdict-meta">
                  <div>
                    <span>最终建议</span>
                    <strong>{BAND_LABELS[outcome.rigor.gatedBand] ?? outcome.rigor.gatedBand}</strong>
                  </div>
                  <div>
                    <span>证据门槛</span>
                    <strong>
                      {EVIDENCE_GATE_LABELS[outcome.rigor.evidenceGate] ?? outcome.rigor.evidenceGate}
                    </strong>
                  </div>
                </div>
                <p className="verdict-delta">
                  基准分 {outcome.baselineScore} → 门槛后 {outcome.headlineScore} · 稳定性{" "}
                  {STABILITY_LABELS[outcome.rigor.recommendationStability] ??
                    outcome.rigor.recommendationStability}{" "}
                  · 风险偏好 {RISK_LABELS[product.riskTolerance]}
                </p>
              </aside>
            </div>

            <div className="eval-evidence">
              <h3>采集到的真实证据</h3>
              {outcome.evidenceSummary.failed || outcome.evidenceSummary.kept === 0 ? (
                <p className="eval-evidence-empty">
                  本次未采集到可用的实时证据（免费源被限流、或未配置 TIKHUB_API_KEY），结论按你的基线分给出。
                </p>
              ) : (
                <>
                  <p>
                    采集 <strong>{outcome.evidenceSummary.collected}</strong> 条信号，
                    经来源分级后纳入 <strong>{outcome.evidenceSummary.kept}</strong> 条证据：
                    {Object.entries(outcome.evidenceSummary.tierCounts).map(([tier, count]) => (
                      <span className="eval-evidence-tier" key={tier}>
                        {SOURCE_TIER_LABELS[tier] ?? tier} {count}
                      </span>
                    ))}
                  </p>
                  <p className="eval-evidence-sources">
                    来源：
                    {Object.entries(outcome.evidenceSummary.bySource)
                      .filter(([, count]) => count > 0)
                      .map(([source, count]) => `${SOURCE_LABELS[source] ?? source} ${count}`)
                      .join(" · ") || "—"}
                    。这些真实证据已喂进确定性引擎——上面的门槛后分就是基线被证据校正后的结果。
                  </p>
                </>
              )}
            </div>

            <div className="eval-why">
              <h3>为什么是这个结论？</h3>
              <p>
                你的打分给出基准分 <strong>{outcome.baselineScore}</strong>
                ，但最终能不能站台由证据门槛决定。当前证据门槛：
                <strong> {EVIDENCE_GATE_LABELS[outcome.rigor.evidenceGate] ?? outcome.rigor.evidenceGate}</strong>。
              </p>
              <p className="eval-why-action">
                <span>下一步验证：</span>
                {outcome.rigor.nextValidationAction}
              </p>
            </div>

            {outcome.multiple ? (
              <div className="eval-ranking">
                <h3>候选热点排序</h3>
                <div className="table-wrap">
                  <table className="evidence-table">
                    <thead>
                      <tr>
                        <th>排名</th>
                        <th>热点</th>
                        <th>门槛后分</th>
                        <th>建议</th>
                        <th>决策</th>
                        <th>稳定性</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outcome.rows.map((row) => (
                        <tr key={row.trendName} className={row.rank === 1 ? "is-winner" : undefined}>
                          <td>{row.rank}</td>
                          <td>
                            <strong>{row.trendName}</strong>
                          </td>
                          <td>{row.total}</td>
                          <td>{BAND_LABELS[row.band] ?? row.band}</td>
                          <td>{row.decision}</td>
                          <td>{row.stability}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="eval-gaps">
              <h3>下一步该补什么证据</h3>
              {outcome.gaps.length === 0 ? (
                <p className="eval-gaps-empty">暂无阻塞型证据缺口，可以直接进入下一步验证动作。</p>
              ) : (
                <ul>
                  {outcome.gaps.map((gap) => (
                    <li key={`${gap.slot}-${gap.severity}`}>
                      <span className={gap.severity === "blocking" ? "eval-gap-tag blocking" : "eval-gap-tag"}>
                        {gap.severity === "blocking" ? "阻塞" : "建议"}
                      </span>
                      <div>
                        <strong>{gap.label}</strong>
                        <p>{gap.reason}</p>
                        <small>{gap.providerHint}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="eval-brief">
              <div className="report-actions">
                <button type="button" className="primary-action" onClick={downloadBrief}>
                  下载 Markdown 简报
                </button>
                <button type="button" className="secondary-action" onClick={copyBrief}>
                  {copyStatus === "copied" ? "已复制" : copyStatus === "failed" ? "复制失败" : "复制简报"}
                </button>
              </div>
              <ReportViewer markdown={outcome.markdown} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
