"use client";

import legoShortlist from "@/data/lego_trend_shortlist.json";
import {
  DECISION_TYPE_LABELS,
  EVIDENCE_GATE_LABELS,
  formatBand,
  RISK_LABELS,
  STABILITY_LABELS
} from "@/lib/display-labels";
import { PROFILE_OPTIONS, type WeightProfile } from "@/lib/recommendation-rigor";
import type { TrendShortlistInput } from "@/lib/trend-shortlist";
import type { RiskTolerance, ScoreKey, Scores, ScoreValue } from "@/lib/types";
import {
  buildWorkspaceEvidenceGaps,
  buildWorkspaceEvidenceRowsFromEvidence,
  buildWorkspaceProviderPreview,
  evaluateSingleWorkspaceTrend,
  evaluateWorkspaceShortlist,
  materializeWorkspaceEvidenceRows,
  renderShortlistWorkspaceMarkdown,
  renderSingleWorkspaceMarkdown,
  type WorkspaceCandidate,
  type WorkspaceEvidenceGap,
  type WorkspaceEvidenceRow,
  type WorkspaceProviderPreview,
  type WorkspaceProduct
} from "@/lib/workspace-evaluator";
import type { SourceSignal, VerificationStatus } from "@/lib/source-tier-classifier";
import { useMemo, useState } from "react";

type WorkspaceMode = "single" | "shortlist";

const SCORE_OPTIONS: ScoreValue[] = [0, 25, 50, 75, 100];
const DIRECTION_OPTIONS = [
  { value: "confirm", label: "确认" },
  { value: "up", label: "上调" },
  { value: "down", label: "下调" }
] as const;
const MAGNITUDE_OPTIONS = [
  { value: "weak", label: "弱" },
  { value: "moderate", label: "中" },
  { value: "strong", label: "强" }
] as const;
const CONFIDENCE_OPTIONS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" }
] as const;
const VERIFICATION_OPTIONS: Array<{ value: VerificationStatus; label: string }> = [
  { value: "verified", label: "已核验" },
  { value: "unverified", label: "未核验" },
  { value: "contradicted", label: "内容不符" }
];
const SOURCE_SIGNAL_OPTIONS: Array<{ value: SourceSignal; label: string }> = [
  { value: "raw_platform_data", label: "平台原始数据" },
  { value: "comment_corpus", label: "评论语料" },
  { value: "direct_competitor_campaign", label: "竞品 campaign" },
  { value: "named_expert_quote", label: "专家引用" },
  { value: "reputable_journalism", label: "可信媒体" },
  { value: "research_report", label: "研究报告" },
  { value: "supplier_category_report", label: "供应商类目报告" },
  { value: "vendor_copy", label: "厂商营销页" },
  { value: "vendor_documentation", label: "厂商文档" },
  { value: "listicle_affiliate_seo", label: "榜单/SEO" },
  { value: "press_release", label: "新闻稿" },
  { value: "single_social_thread", label: "单条社媒" },
  { value: "single_anecdote", label: "单个轶事" },
  { value: "unknown", label: "未知" }
];
const SCORE_META: Array<{ key: ScoreKey; label: string; hint: string }> = [
  { key: "audienceOverlap", label: "受众", hint: "趋势受众是否匹配目标用户" },
  { key: "useCaseRelevance", label: "场景", hint: "产品参与是否自然" },
  { key: "messageBridge", label: "卖点", hint: "能否桥接到核心卖点" },
  { key: "creativeFeasibility", label: "创意", hint: "是否容易做出原生内容" },
  { key: "commercialIntent", label: "商业", hint: "是否接近购买/咨询意图" },
  { key: "brandSafety", label: "安全", hint: "品牌风险是否可控" },
  { key: "timingSaturation", label: "时机", hint: "是否仍有进入窗口" }
];

function initialProduct(): WorkspaceProduct {
  return {
    name: "LEGO",
    category: "Toy / collectible building system",
    market: "Global",
    audience: "Families, kids, adult collectors, gift shoppers",
    positioning: "Creative play and collectible display",
    sellingPoints: "Hands-on building, display value, fandom collaborations",
    brandTone: "Imaginative, precise, family-safe",
    riskTolerance: "medium",
    profileUsed: "brand_awareness"
  };
}

function initialCandidates(): WorkspaceCandidate[] {
  const input = legoShortlist as TrendShortlistInput;
  return input.candidates.map((candidate) => ({
    id: candidate.id,
    trendName: candidate.trendName,
    trendDescription: candidate.trendDescription ?? "",
    scores: candidate.baselineScores,
    evidence: candidate.evidence,
    evidenceRows: buildWorkspaceEvidenceRowsFromEvidence(candidate.evidence ?? []),
    oneLineVerdict: candidate.oneLineVerdict,
    recommendedCampaign: candidate.recommendedCampaign
  }));
}

function fieldUpdate<T extends keyof WorkspaceProduct>(
  product: WorkspaceProduct,
  key: T,
  value: WorkspaceProduct[T]
): WorkspaceProduct {
  return {
    ...product,
    [key]: value
  };
}

function candidateUpdate(
  candidates: WorkspaceCandidate[],
  index: number,
  update: Partial<WorkspaceCandidate>
): WorkspaceCandidate[] {
  return candidates.map((candidate, candidateIndex) =>
    candidateIndex === index ? { ...candidate, ...update } : candidate
  );
}

function scoreUpdate(
  candidates: WorkspaceCandidate[],
  index: number,
  key: ScoreKey,
  value: ScoreValue
): WorkspaceCandidate[] {
  const candidate = candidates[index];
  return candidateUpdate(candidates, index, {
    scores: {
      ...candidate.scores,
      [key]: value
    } as Scores
  });
}

function evidenceRowUpdate(
  candidates: WorkspaceCandidate[],
  candidateIndex: number,
  rowIndex: number,
  update: Partial<WorkspaceEvidenceRow>
): WorkspaceCandidate[] {
  const candidate = candidates[candidateIndex];
  const evidenceRows = candidate.evidenceRows ?? buildWorkspaceEvidenceRowsFromEvidence(candidate.evidence ?? []);
  return candidateUpdate(candidates, candidateIndex, {
    evidenceRows: evidenceRows.map((row, index) => (index === rowIndex ? { ...row, ...update } : row))
  });
}

function addEvidenceRow(candidates: WorkspaceCandidate[], candidateIndex: number): WorkspaceCandidate[] {
  const candidate = candidates[candidateIndex];
  const evidenceRows = candidate.evidenceRows ?? buildWorkspaceEvidenceRowsFromEvidence(candidate.evidence ?? []);
  const nextIndex = evidenceRows.length + 1;
  return candidateUpdate(candidates, candidateIndex, {
    evidenceRows: [
      ...evidenceRows,
      {
        id: `${candidate.id}-workspace-evidence-${nextIndex}`,
        dimension: "audienceOverlap",
        direction: "confirm",
        magnitude: "moderate",
        desiredConfidence: "medium",
        sourceUrl: "https://example.com/source",
        verificationStatus: "unverified",
        sourceSignals: ["unknown"],
        note: "Describe the source claim before counting it."
      }
    ]
  });
}

function removeEvidenceRow(
  candidates: WorkspaceCandidate[],
  candidateIndex: number,
  rowIndex: number
): WorkspaceCandidate[] {
  const candidate = candidates[candidateIndex];
  const evidenceRows = candidate.evidenceRows ?? buildWorkspaceEvidenceRowsFromEvidence(candidate.evidence ?? []);
  return candidateUpdate(candidates, candidateIndex, {
    evidenceRows: evidenceRows.filter((_, index) => index !== rowIndex)
  });
}

export function WorkspaceClient() {
  const [mode, setMode] = useState<WorkspaceMode>("shortlist");
  const [product, setProduct] = useState<WorkspaceProduct>(() => initialProduct());
  const [candidates, setCandidates] = useState<WorkspaceCandidate[]>(() => initialCandidates());
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [providerCopyStatus, setProviderCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const singleResult = useMemo(
    () => evaluateSingleWorkspaceTrend(product, candidates[activeCandidateIndex]),
    [product, candidates, activeCandidateIndex]
  );
  const shortlistResult = useMemo(
    () => evaluateWorkspaceShortlist(product, candidates),
    [product, candidates]
  );
  const activeCandidate = candidates[activeCandidateIndex];
  const activeEvidenceRows = activeCandidate.evidenceRows ?? buildWorkspaceEvidenceRowsFromEvidence(activeCandidate.evidence ?? []);
  const activeEvidenceMaterialization = useMemo(
    () => materializeWorkspaceEvidenceRows(activeEvidenceRows),
    [activeEvidenceRows]
  );
  const providerCandidate = useMemo(
    () =>
      mode === "single"
        ? activeCandidate
        : candidates.find((candidate) => candidate.id === shortlistResult.winner.id) ?? activeCandidate,
    [mode, activeCandidate, candidates, shortlistResult.winner.id]
  );
  const activeGaps = useMemo(
    () =>
      mode === "single"
        ? buildWorkspaceEvidenceGaps(singleResult.rigor)
        : buildWorkspaceEvidenceGaps(shortlistResult.winner.rigor),
    [mode, singleResult.rigor, shortlistResult.winner.rigor]
  );
  const providerPreview = useMemo(
    () =>
      buildWorkspaceProviderPreview({
        product,
        candidate: providerCandidate,
        gaps: activeGaps,
        mode
      }),
    [product, providerCandidate, activeGaps, mode]
  );
  const markdownExport = useMemo(
    () =>
      mode === "single"
        ? renderSingleWorkspaceMarkdown({
            product,
            candidate: activeCandidate,
            result: singleResult
          })
        : renderShortlistWorkspaceMarkdown({
            product,
            shortlist: shortlistResult
          }),
    [mode, product, activeCandidate, singleResult, shortlistResult]
  );

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdownExport);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("failed");
    }
  }

  async function copyProviderCommands() {
    try {
      await navigator.clipboard.writeText(providerPreview.commandsText);
      setProviderCopyStatus("copied");
      window.setTimeout(() => setProviderCopyStatus("idle"), 1800);
    } catch {
      setProviderCopyStatus("failed");
    }
  }

  return (
    <div className="workspace-page">
      <header className="workspace-hero">
        <div>
          <h1>真实工作台</h1>
          <p>
            输入产品画像和候选趋势，直接运行确定性评分、严谨层 gate 和 shortlist 排名。当前版本先使用手动锚点评分，
            live provider 调用会放在下一阶段接入。
          </p>
        </div>
        <div className="mode-toggle" aria-label="工作模式">
          <button className={mode === "single" ? "active" : ""} type="button" onClick={() => setMode("single")}>
            单趋势
          </button>
          <button className={mode === "shortlist" ? "active" : ""} type="button" onClick={() => setMode("shortlist")}>
            Shortlist
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <section className="workspace-panel" aria-label="输入区">
          <div className="section-heading compact">
            <p className="eyebrow">Input</p>
            <h2>产品画像</h2>
          </div>

          <div className="workspace-form-grid">
            <label className="field-row">
              <span>产品名</span>
              <input value={product.name} onChange={(event) => setProduct(fieldUpdate(product, "name", event.target.value))} />
            </label>
            <label className="field-row">
              <span>品类</span>
              <input value={product.category} onChange={(event) => setProduct(fieldUpdate(product, "category", event.target.value))} />
            </label>
            <label className="field-row">
              <span>市场</span>
              <input value={product.market} onChange={(event) => setProduct(fieldUpdate(product, "market", event.target.value))} />
            </label>
            <label className="field-row">
              <span>风险偏好</span>
              <select
                value={product.riskTolerance}
                onChange={(event) => setProduct(fieldUpdate(product, "riskTolerance", event.target.value as RiskTolerance))}
              >
                {Object.entries(RISK_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-row wide">
              <span>目标受众</span>
              <textarea
                rows={3}
                value={product.audience}
                onChange={(event) => setProduct(fieldUpdate(product, "audience", event.target.value))}
              />
            </label>
            <label className="field-row wide">
              <span>定位</span>
              <textarea
                rows={3}
                value={product.positioning}
                onChange={(event) => setProduct(fieldUpdate(product, "positioning", event.target.value))}
              />
            </label>
            <label className="field-row wide">
              <span>核心卖点</span>
              <textarea
                rows={3}
                value={product.sellingPoints}
                onChange={(event) => setProduct(fieldUpdate(product, "sellingPoints", event.target.value))}
              />
            </label>
            <label className="field-row">
              <span>品牌语气</span>
              <input
                value={product.brandTone}
                onChange={(event) => setProduct(fieldUpdate(product, "brandTone", event.target.value))}
              />
            </label>
            <label className="field-row">
              <span>Profile</span>
              <select
                value={product.profileUsed}
                onChange={(event) => setProduct(fieldUpdate(product, "profileUsed", event.target.value as WeightProfile))}
              >
                {PROFILE_OPTIONS.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="trend-editor-header">
            <div>
              <p className="eyebrow">Trends</p>
              <h2>候选趋势</h2>
            </div>
            <div className="candidate-tabs" aria-label="候选趋势">
              {candidates.map((candidate, index) => (
                <button
                  className={index === activeCandidateIndex ? "active" : ""}
                  key={candidate.id}
                  type="button"
                  onClick={() => setActiveCandidateIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="trend-editor">
            <label className="field-row">
              <span>趋势名</span>
              <input
                value={activeCandidate.trendName}
                onChange={(event) =>
                  setCandidates(candidateUpdate(candidates, activeCandidateIndex, { trendName: event.target.value }))
                }
              />
            </label>
            <label className="field-row">
              <span>证据条数</span>
              <input
                value={`${activeEvidenceMaterialization.evidence.length} 条计入 · ${activeEvidenceMaterialization.droppedRows.length} 条丢弃`}
                readOnly
              />
            </label>
            <label className="field-row wide">
              <span>趋势描述</span>
              <textarea
                rows={3}
                value={activeCandidate.trendDescription}
                onChange={(event) =>
                  setCandidates(candidateUpdate(candidates, activeCandidateIndex, { trendDescription: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="score-matrix" aria-label="锚点评分矩阵">
            {SCORE_META.map((dimension) => (
              <label className="score-control" key={dimension.key}>
                <span>{dimension.label}</span>
                <small>{dimension.hint}</small>
                <select
                  value={activeCandidate.scores[dimension.key]}
                  onChange={(event) =>
                    setCandidates(
                      scoreUpdate(candidates, activeCandidateIndex, dimension.key, Number(event.target.value) as ScoreValue)
                    )
                  }
                >
                  {SCORE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <EvidenceEditor
            rows={activeEvidenceMaterialization.rows}
            onAdd={() => setCandidates(addEvidenceRow(candidates, activeCandidateIndex))}
            onRemove={(rowIndex) => setCandidates(removeEvidenceRow(candidates, activeCandidateIndex, rowIndex))}
            onUpdate={(rowIndex, update) =>
              setCandidates(evidenceRowUpdate(candidates, activeCandidateIndex, rowIndex, update))
            }
          />
        </section>

        <aside className="workspace-panel result-panel" aria-label="结果区">
          <div className="result-actions">
            <button className="secondary-action" type="button" onClick={copyMarkdown}>
              复制 Markdown
            </button>
            <span aria-live="polite">
              {copyStatus === "copied" ? "已复制" : copyStatus === "failed" ? "复制失败，请手动选择" : " "}
            </span>
          </div>
          {mode === "single" ? (
            <>
              <div className="result-headline">
                <span>单趋势结果</span>
                <strong>{singleResult.adjustedResult.total}/100</strong>
                <small>{formatBand(singleResult.rigor.gatedBand)}</small>
              </div>
              <div className="result-summary-grid">
                <div>
                  <span>证据门槛</span>
                  <strong>{EVIDENCE_GATE_LABELS[singleResult.rigor.evidenceGate]}</strong>
                </div>
                <div>
                  <span>稳定性</span>
                  <strong>{STABILITY_LABELS[singleResult.rigor.recommendationStability]}</strong>
                </div>
                <div>
                  <span>实际动作</span>
                  <strong>{DECISION_TYPE_LABELS[singleResult.rigor.decisionType]}</strong>
                </div>
              </div>
              <div className="workspace-note">
                <strong>下一步验证</strong>
                <p>{singleResult.rigor.nextValidationAction}</p>
              </div>
              <EvidenceGapList gaps={activeGaps} />
              <ProviderPreviewPanel
                preview={providerPreview}
                copyStatus={providerCopyStatus}
                onCopy={copyProviderCommands}
              />
            </>
          ) : (
            <>
              <div className="result-headline">
                <span>Shortlist winner</span>
                <strong>{shortlistResult.winner.trendName}</strong>
                <small>
                  {shortlistResult.winner.adjustedResult.total}/100 · {formatBand(shortlistResult.winner.rigor.gatedBand)}
                </small>
              </div>
              <div className="shortlist-table-wrap">
                <table className="shortlist-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Trend</th>
                      <th>Score</th>
                      <th>Gate</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortlistResult.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.rank}</td>
                        <td>
                          <strong>{row.trendName}</strong>
                          <small>{row.oneLineVerdict}</small>
                        </td>
                        <td>
                          {row.adjustedResult.total}
                          <small>{formatBand(row.rigor.gatedBand)}</small>
                        </td>
                        <td>
                          {EVIDENCE_GATE_LABELS[row.rigor.evidenceGate]}
                          <small>{STABILITY_LABELS[row.rigor.recommendationStability]}</small>
                        </td>
                        <td>{DECISION_TYPE_LABELS[row.rigor.decisionType]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="workspace-note">
                <strong>为什么第一名胜出</strong>
                <p>
                  {shortlistResult.winner.trendName} 在证据门槛后仍保持最高档位，并且调整后总分领先。
                  如果要放大预算，下一步先补齐：{shortlistResult.winner.rigor.nextValidationAction}
                </p>
              </div>
              <EvidenceGapList gaps={activeGaps} />
              <ProviderPreviewPanel
                preview={providerPreview}
                copyStatus={providerCopyStatus}
                onCopy={copyProviderCommands}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function EvidenceEditor({
  rows,
  onAdd,
  onRemove,
  onUpdate
}: {
  rows: ReturnType<typeof materializeWorkspaceEvidenceRows>["rows"];
  onAdd: () => void;
  onRemove: (rowIndex: number) => void;
  onUpdate: (rowIndex: number, update: Partial<WorkspaceEvidenceRow>) => void;
}) {
  return (
    <section className="evidence-editor" aria-label="Evidence editor">
      <div className="evidence-editor-head">
        <div className="section-heading compact">
          <p className="eyebrow">Evidence</p>
          <h2>证据编辑</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onAdd}>
          新增证据
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="evidence-editor-empty">还没有证据。新增一条来源后，tier 会由 classifier 自动计算。</p>
      ) : (
        <div className="evidence-row-list">
          {rows.map((row, rowIndex) => (
            <article className="evidence-row-card" key={row.id}>
              <div className="evidence-row-topline">
                <strong>{row.id}</strong>
                <button className="text-action compact-action" type="button" onClick={() => onRemove(rowIndex)}>
                  移除
                </button>
              </div>
              <div className="evidence-edit-grid">
                <label className="field-row wide">
                  <span>Source URL</span>
                  <input value={row.sourceUrl} onChange={(event) => onUpdate(rowIndex, { sourceUrl: event.target.value })} />
                </label>
                <label className="field-row">
                  <span>维度</span>
                  <select
                    value={row.dimension}
                    onChange={(event) => onUpdate(rowIndex, { dimension: event.target.value as ScoreKey })}
                  >
                    {SCORE_META.map((dimension) => (
                      <option key={dimension.key} value={dimension.key}>
                        {dimension.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-row">
                  <span>方向</span>
                  <select
                    value={row.direction}
                    onChange={(event) =>
                      onUpdate(rowIndex, { direction: event.target.value as WorkspaceEvidenceRow["direction"] })
                    }
                  >
                    {DIRECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-row">
                  <span>强度</span>
                  <select
                    value={row.magnitude}
                    onChange={(event) =>
                      onUpdate(rowIndex, { magnitude: event.target.value as WorkspaceEvidenceRow["magnitude"] })
                    }
                  >
                    {MAGNITUDE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-row">
                  <span>请求置信度</span>
                  <select
                    value={row.desiredConfidence}
                    onChange={(event) =>
                      onUpdate(rowIndex, { desiredConfidence: event.target.value as WorkspaceEvidenceRow["desiredConfidence"] })
                    }
                  >
                    {CONFIDENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-row">
                  <span>核验状态</span>
                  <select
                    value={row.verificationStatus}
                    onChange={(event) => onUpdate(rowIndex, { verificationStatus: event.target.value as VerificationStatus })}
                  >
                    {VERIFICATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-row">
                  <span>Source signal</span>
                  <select
                    value={row.sourceSignals[0] ?? "unknown"}
                    onChange={(event) => onUpdate(rowIndex, { sourceSignals: [event.target.value as SourceSignal] })}
                  >
                    {SOURCE_SIGNAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-row wide">
                  <span>Note</span>
                  <textarea rows={2} value={row.note} onChange={(event) => onUpdate(rowIndex, { note: event.target.value })} />
                </label>
              </div>
              <div className="computed-tier-strip">
                <div>
                  <span>Computed tier</span>
                  <strong>{row.computedSourceTier ?? "dropped"}</strong>
                </div>
                <div>
                  <span>Computed confidence</span>
                  <strong>{row.computedConfidence ?? "none"}</strong>
                </div>
                <p>{row.classification.reasons.join("; ")}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ProviderPreviewPanel({
  preview,
  copyStatus,
  onCopy
}: {
  preview: WorkspaceProviderPreview;
  copyStatus: "idle" | "copied" | "failed";
  onCopy: () => void;
}) {
  return (
    <section className="provider-preview-panel" aria-label="Provider dry-run preview">
      <div className="provider-preview-head">
        <div className="section-heading compact">
          <p className="eyebrow">Provider preview</p>
          <h2>Dry-run / fixture</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onCopy}>
          复制命令
        </button>
      </div>
      <p className="provider-target">Target: {preview.targetTrend}</p>
      <div className="provider-command-list">
        {[preview.dryRunCommand, preview.fixtureCommand].map((command) => (
          <article key={command.label}>
            <div>
              <strong>{command.label}</strong>
              <span>{command.description}</span>
            </div>
            <code>{command.command}</code>
          </article>
        ))}
      </div>
      {preview.targetedSlots.length > 0 ? (
        <ul className="provider-slot-list">
          {preview.targetedSlots.map((slot) => (
            <li key={`${slot.slot}-${slot.reason}`}>
              <strong>{slot.label}</strong>
              <span>{slot.plannedSources.join(" · ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="provider-empty">No blocking provider gaps for this result. Use the fixture smoke command to verify the pipeline contract.</p>
      )}
      <div className="provider-notes">
        {preview.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
      <span className="provider-copy-status" aria-live="polite">
        {copyStatus === "copied" ? "命令已复制" : copyStatus === "failed" ? "复制失败，请手动选择" : " "}
      </span>
    </section>
  );
}

function EvidenceGapList({ gaps }: { gaps: WorkspaceEvidenceGap[] }) {
  return (
    <section className="evidence-gap-panel" aria-label="证据缺口">
      <div className="section-heading compact">
        <p className="eyebrow">Evidence gap</p>
        <h2>下一步该补什么证据</h2>
      </div>
      {gaps.length === 0 ? (
        <p className="gap-empty">当前没有阻塞型证据缺口，下一步可以进入小规模验证。</p>
      ) : (
        <ul>
          {gaps.map((gap) => (
            <li key={`${gap.slot}-${gap.reason}`}>
              <div>
                <strong>{gap.label}</strong>
                <span>{gap.severity === "blocking" ? "阻塞" : "建议"}</span>
              </div>
              <p>{gap.reason}</p>
              <small>{gap.providerHint}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
