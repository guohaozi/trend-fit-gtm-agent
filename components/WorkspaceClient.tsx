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
  appendWorkspaceEvidenceRows,
  createWorkspaceStateSnapshot,
  evaluateSingleWorkspaceTrend,
  evaluateWorkspaceShortlist,
  materializeWorkspaceEvidenceRows,
  parseWorkspaceStateJson,
  renderShortlistWorkspaceMarkdown,
  renderSingleWorkspaceMarkdown,
  serializeWorkspaceState,
  type WorkspaceCandidate,
  type WorkspaceEvidenceGap,
  type WorkspaceEvidenceRow,
  type WorkspaceMode,
  type WorkspaceProviderPreview,
  type WorkspaceProduct
} from "@/lib/workspace-evaluator";
import type { SourceSignal, VerificationStatus } from "@/lib/source-tier-classifier";
import { useEffect, useMemo, useState } from "react";

type ProviderRunStatus = "idle" | "running" | "succeeded" | "failed";
type GoogleTrendsProviderPayload = {
  rows?: WorkspaceEvidenceRow[];
  findingsCount?: number;
  evidenceCount?: number;
  error?: string;
};

const WORKSPACE_STORAGE_KEY = "trend-fit-workspace-state-v2";
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
  { value: "direct_competitor_campaign", label: "竞品营销活动" },
  { value: "named_expert_quote", label: "专家引用" },
  { value: "reputable_journalism", label: "可信媒体" },
  { value: "research_report", label: "研究报告" },
  { value: "supplier_category_report", label: "供应商类目报告" },
  { value: "vendor_copy", label: "厂商营销页" },
  { value: "vendor_documentation", label: "厂商文档" },
  { value: "listicle_affiliate_seo", label: "搜索榜单" },
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

const WORKSPACE_TREND_COPY: Record<
  string,
  { name: string; description: string; verdict?: string; campaign?: string }
> = {
  lego_world_cup_trend: {
    name: "世界杯球迷文化",
    description: "围绕 2026 世界杯的观赛派对、国家队身份和收藏时刻。",
    verdict: "文化表面积大，但需要更清晰的授权或球迷仪式角度，避免变成泛足球内容。",
    campaign: "围绕比赛日家庭搭建、国家队配色小模型和观赛派对内容做轻量测试。"
  },
  lego_f1_race_trend: {
    name: "F1 比赛周末",
    description: "F1 车队身份、赛车设计、工程叙事和成年收藏者文化。",
    verdict: "最佳适配：LEGO 已有直接 F1 产品桥梁、强创意格式和自然的成年收藏者角度。",
    campaign: "做一组比赛周末搭建内容：桌面赛车展示、亲子排位挑战和工程细节短视频。"
  },
  lego_graduation_season_trend: {
    name: "毕业季礼物",
    description: "毕业礼物、学年里程碑、桌面装饰和家庭庆祝内容。",
    verdict: "安全且适合作为礼物，但差异性弱于 F1，因为很多品牌都能参与毕业季。",
    campaign: "作为季节性礼物方向测试：桌面摆件、花束套装和毕业纪念包装。"
  }
};

const WORKSPACE_EVIDENCE_NOTE_COPY: Record<string, string> = {
  "world-cup-official-timing": "FIFA 官方页面确认 2026 世界杯时间和赛事规模。",
  "world-cup-lego-sports-fit": "LEGO 运动类目能提供方向性参考，但不是世界杯 campaign 的直接证据。",
  "f1-lego-category-fit": "LEGO 已有 Formula 1 类目，产品和热点的连接不是强行拼接。",
  "f1-lego-speed-champions-creative": "LEGO Speed Champions 已提供赛车搭建、比赛周末内容和收藏展示格式。",
  "f1-official-partnership-timing": "Formula 1 对 LEGO 合作的报道支持当前比赛周末激活的相关性。",
  "f1-family-safe-brand-fit": "合作语境把活动放在主流娱乐和家庭友好的收藏场景中。",
  "f1-adult-collector-audience": "Formula 1 类目支持 LEGO 买家、成年收藏者、赛车粉丝和礼物购买者的重合。",
  "graduation-gift-commercial-fit": "LEGO 礼物导航支持送礼场景，但这仍是宽泛礼物证据，不是毕业季转化证明。",
  "graduation-brand-safety": "毕业季礼物低风险、家庭友好，但更像季节性零售机会，不是强差异化热点。"
};

const SOURCE_TIER_LABELS: Record<string, string> = {
  primary: "一手来源",
  secondary: "二手来源",
  proxy: "代理来源"
};

const CONFIDENCE_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高"
};

const CLASSIFIER_REASON_LABELS: Record<string, string> = {
  "invalid URL": "来源链接无效",
  "claim not present at source URL": "来源链接中没有对应主张",
  "unverified source; no browse/fetch confirmation": "来源未核验，缺少浏览或抓取确认",
  "single social thread used only as raw audience/use-case language": "单条社媒帖只作为原始受众/场景语言使用",
  "verified primary source signal": "已核验的一手来源信号",
  "supplier-owned category report; useful but bias-capped": "供应商自有类目报告可参考，但会因偏差限制等级",
  "verified secondary source signal": "已核验的二手来源信号",
  "forced-proxy source signal": "该来源信号只能作为代理指标",
  "unknown source type; tie-breaker goes to proxy": "来源类型不明确，保守归为代理指标",
  "vendor documentation": "厂商文档",
  "vendor copy": "厂商营销页",
  "listicle / affiliate / SEO source": "榜单、联盟或 SEO 来源",
  "press release / sponsored source": "新闻稿或赞助来源",
  "single anecdote": "单个轶事",
  "single social thread outside raw audience/use-case language": "单条社媒帖不能支撑这个维度"
};

function classifierReasonLabel(reason: string): string {
  return CLASSIFIER_REASON_LABELS[reason] ?? reason;
}

function initialProduct(): WorkspaceProduct {
  return {
    name: "LEGO",
    category: "拼搭玩具 / 收藏模型",
    market: "全球 / 欧洲",
    audience: "家庭用户、儿童、成年收藏者、礼物购买者",
    positioning: "兼具创意拼搭和收藏展示价值",
    sellingPoints: "动手搭建、展示价值、粉丝文化合作",
    brandTone: "有想象力、精确、家庭友好",
    riskTolerance: "medium",
    profileUsed: "brand_awareness"
  };
}

function initialCandidates(): WorkspaceCandidate[] {
  const input = legoShortlist as TrendShortlistInput;
  return input.candidates.map((candidate) => ({
    id: candidate.id,
    trendName: WORKSPACE_TREND_COPY[candidate.id]?.name ?? candidate.trendName,
    trendDescription: WORKSPACE_TREND_COPY[candidate.id]?.description ?? candidate.trendDescription ?? "",
    scores: candidate.baselineScores,
    evidence: candidate.evidence,
    evidenceRows: buildWorkspaceEvidenceRowsFromEvidence(candidate.evidence ?? []).map((row) => ({
      ...row,
      note: WORKSPACE_EVIDENCE_NOTE_COPY[row.id] ?? row.note
    })),
    oneLineVerdict: WORKSPACE_TREND_COPY[candidate.id]?.verdict ?? candidate.oneLineVerdict,
    recommendedCampaign: WORKSPACE_TREND_COPY[candidate.id]?.campaign ?? candidate.recommendedCampaign
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
        note: "先写清楚来源主张，再决定是否计入证据。"
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
  const [providerRunStatus, setProviderRunStatus] = useState<ProviderRunStatus>("idle");
  const [providerRunMessage, setProviderRunMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [workspaceStateStatus, setWorkspaceStateStatus] = useState("本地状态准备中");
  const [importOpen, setImportOpen] = useState(false);
  const [importValue, setImportValue] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (saved) {
      const parsed = parseWorkspaceStateJson(saved);
      if (parsed.ok) {
        setMode(parsed.state.mode);
        setProduct(parsed.state.product);
        setCandidates(parsed.state.candidates);
        setActiveCandidateIndex(parsed.state.activeCandidateIndex);
        setWorkspaceStateStatus("已恢复本地保存");
      } else {
        setWorkspaceStateStatus(`本地保存无效：${parsed.error}`);
      }
    } else {
      setWorkspaceStateStatus("已使用默认工作台");
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const snapshot = createWorkspaceStateSnapshot({
      mode,
      product,
      candidates,
      activeCandidateIndex
    });
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, serializeWorkspaceState(snapshot));
    setWorkspaceStateStatus("已自动保存到本机");
  }, [activeCandidateIndex, candidates, mode, product, storageReady]);

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

  async function exportWorkspaceState() {
    const snapshot = createWorkspaceStateSnapshot({
      mode,
      product,
      candidates,
      activeCandidateIndex
    });
    const serialized = serializeWorkspaceState(snapshot);
    try {
      await navigator.clipboard.writeText(serialized);
      setWorkspaceStateStatus("状态 JSON 已复制");
    } catch {
      setImportValue(serialized);
      setImportOpen(true);
      setWorkspaceStateStatus("复制失败，已放入导入框供手动复制");
    }
  }

  function importWorkspaceState() {
    const parsed = parseWorkspaceStateJson(importValue);
    if (!parsed.ok) {
      setWorkspaceStateStatus(`导入失败：${parsed.error}`);
      return;
    }

    setMode(parsed.state.mode);
    setProduct(parsed.state.product);
    setCandidates(parsed.state.candidates);
    setActiveCandidateIndex(parsed.state.activeCandidateIndex);
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, serializeWorkspaceState(parsed.state));
    setWorkspaceStateStatus("导入成功，已保存到本机");
    setImportOpen(false);
  }

  function resetWorkspaceState() {
    const nextProduct = initialProduct();
    const nextCandidates = initialCandidates();
    setMode("shortlist");
    setProduct(nextProduct);
    setCandidates(nextCandidates);
    setActiveCandidateIndex(0);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      serializeWorkspaceState(createWorkspaceStateSnapshot({
        mode: "shortlist",
        product: nextProduct,
        candidates: nextCandidates,
        activeCandidateIndex: 0
      }))
    );
    setWorkspaceStateStatus("已重置为默认工作台");
  }

  async function runGoogleTrendsProvider({ fixture = false }: { fixture?: boolean } = {}) {
    const targetIndex = candidates.findIndex((candidate) => candidate.id === providerCandidate.id);
    const resolvedTargetIndex = targetIndex >= 0 ? targetIndex : activeCandidateIndex;
    const targetCandidate = candidates[resolvedTargetIndex];

    setProviderRunStatus("running");
    setProviderRunMessage(fixture ? "正在回放内置 Google Trends 演示数据..." : "正在通过服务端接口拉取 Google Trends...");

    const requestTrends = async (useFixture: boolean) => {
      const response = await fetch("/api/workspace/google-trends", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          product: product.name,
          market: product.market,
          trend: targetCandidate.trendName,
          fixture: useFixture
        })
      });
      const payload = await response.json() as GoogleTrendsProviderPayload;
      return { response, payload };
    };

    try {
      let { response, payload } = await requestTrends(fixture);
      let usedFixtureFallback = false;

      // Graceful fallback: a public deploy has no SERPAPI_API_KEY, so a live run returns 503.
      // Replay the committed fixture instead of showing a setup error — the demo keeps working
      // for every visitor, with zero SerpApi quota and no key exposure.
      if (!fixture && response.status === 503) {
        setProviderRunMessage("服务器未配置 SerpApi 密钥，改用内置演示数据回放...");
        ({ response, payload } = await requestTrends(true));
        usedFixtureFallback = true;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Google Trends 数据源运行失败。");
      }
      const rows = payload.rows ?? [];
      setCandidates((currentCandidates) => {
        const currentTarget = currentCandidates[resolvedTargetIndex];
        const currentRows = currentTarget.evidenceRows ?? buildWorkspaceEvidenceRowsFromEvidence(currentTarget.evidence ?? []);
        return candidateUpdate(currentCandidates, resolvedTargetIndex, {
          evidenceRows: appendWorkspaceEvidenceRows(currentRows, rows)
        });
      });
      setActiveCandidateIndex(resolvedTargetIndex);
      setProviderRunStatus("succeeded");
      const usedFixture = fixture || usedFixtureFallback;
      const fallbackPrefix = usedFixtureFallback ? "服务器未配置密钥，已用内置演示数据：" : "";
      setProviderRunMessage(
        `${fallbackPrefix}已追加 ${rows.length} 条 ${usedFixture ? "演示" : "Google Trends"} 证据；${payload.evidenceCount ?? rows.length} 条可计入评分。`
      );
    } catch (error) {
      setProviderRunStatus("failed");
      setProviderRunMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="workspace-page">
      <header className="workspace-hero">
        <div>
          <h1>真实工作台</h1>
          <p>
            输入产品画像和候选趋势，直接运行确定性评分、证据门槛和候选排序。当前版本先使用手动锚点评分，
            Google Trends 证据会通过服务端接口写入证据编辑区。
          </p>
        </div>
        <div className="workspace-hero-actions">
          <div className="mode-toggle" aria-label="工作模式">
            <button className={mode === "single" ? "active" : ""} type="button" onClick={() => setMode("single")}>
              单趋势
            </button>
            <button className={mode === "shortlist" ? "active" : ""} type="button" onClick={() => setMode("shortlist")}>
              候选排序
            </button>
          </div>
          <div className="workspace-state-actions" aria-label="工作台状态">
            <button className="secondary-action" type="button" onClick={exportWorkspaceState}>
              导出状态
            </button>
            <button className="secondary-action" type="button" onClick={() => setImportOpen((open) => !open)}>
              导入状态
            </button>
            <button className="text-action compact-action" type="button" onClick={resetWorkspaceState}>
              重置
            </button>
            <span aria-live="polite">{workspaceStateStatus}</span>
          </div>
        </div>
      </header>

      {importOpen ? (
        <section className="workspace-import-panel" aria-label="导入工作台状态">
          <label className="field-row wide">
            <span>粘贴工作台状态 JSON</span>
            <textarea
              rows={6}
              value={importValue}
              onChange={(event) => setImportValue(event.target.value)}
            />
          </label>
          <div>
            <button className="primary-action" type="button" onClick={importWorkspaceState}>
              导入
            </button>
            <button className="secondary-action" type="button" onClick={() => setImportOpen(false)}>
              取消
            </button>
          </div>
        </section>
      ) : null}

      <div className="workspace-grid">
        <section className="workspace-panel" aria-label="输入区">
          <div className="section-heading compact">
            <p className="eyebrow">输入</p>
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
              <span>评分模型</span>
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
              <p className="eyebrow">趋势</p>
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
              复制报告
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
                runStatus={providerRunStatus}
                runMessage={providerRunMessage}
                onRunGoogleTrends={() => runGoogleTrendsProvider()}
                onRunFixture={() => runGoogleTrendsProvider({ fixture: true })}
              />
            </>
          ) : (
            <>
              <div className="result-headline">
                <span>排序第一名</span>
                <strong>{shortlistResult.winner.trendName}</strong>
                <small>
                  {shortlistResult.winner.adjustedResult.total}/100 · {formatBand(shortlistResult.winner.rigor.gatedBand)}
                </small>
              </div>
              <div className="shortlist-table-wrap">
                <table className="shortlist-table">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>趋势</th>
                      <th>分数</th>
                      <th>门槛</th>
                      <th>动作</th>
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
                runStatus={providerRunStatus}
                runMessage={providerRunMessage}
                onRunGoogleTrends={() => runGoogleTrendsProvider()}
                onRunFixture={() => runGoogleTrendsProvider({ fixture: true })}
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
    <section className="evidence-editor" aria-label="证据编辑">
      <div className="evidence-editor-head">
        <div className="section-heading compact">
          <p className="eyebrow">证据</p>
          <h2>证据编辑</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onAdd}>
          新增证据
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="evidence-editor-empty">还没有证据。新增一条来源后，来源等级会由分类器自动计算。</p>
      ) : (
        <div className="evidence-row-list">
          {rows.map((row, rowIndex) => (
            <article className="evidence-row-card" key={row.id}>
              <div className="evidence-row-topline">
                <strong>证据 {rowIndex + 1}</strong>
                <button className="text-action compact-action" type="button" onClick={() => onRemove(rowIndex)}>
                  移除
                </button>
              </div>
              <div className="evidence-edit-grid">
                <label className="field-row wide">
                  <span>来源链接</span>
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
                  <span>来源信号</span>
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
                  <span>说明</span>
                  <textarea rows={2} value={row.note} onChange={(event) => onUpdate(rowIndex, { note: event.target.value })} />
                </label>
              </div>
              <div className="computed-tier-strip">
                <div>
                  <span>计算来源等级</span>
                  <strong>{row.computedSourceTier ? SOURCE_TIER_LABELS[row.computedSourceTier] : "已丢弃"}</strong>
                </div>
                <div>
                  <span>计算置信度</span>
                  <strong>{row.computedConfidence ? CONFIDENCE_LABELS[row.computedConfidence] : "无"}</strong>
                </div>
                <p>{row.classification.reasons.map(classifierReasonLabel).join("；")}</p>
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
  onCopy,
  runStatus,
  runMessage,
  onRunGoogleTrends,
  onRunFixture
}: {
  preview: WorkspaceProviderPreview;
  copyStatus: "idle" | "copied" | "failed";
  onCopy: () => void;
  runStatus: ProviderRunStatus;
  runMessage: string;
  onRunGoogleTrends: () => void;
  onRunFixture: () => void;
}) {
  return (
    <section className="provider-preview-panel" aria-label="数据源预览">
      <div className="provider-preview-head">
        <div className="section-heading compact">
          <p className="eyebrow">数据源预览</p>
          <h2>命令预览 / 演示回放</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onCopy}>
          复制命令
        </button>
      </div>
      <p className="provider-target">目标趋势：{preview.targetTrend}</p>
      <div className="provider-live-actions">
        <button
          className="primary-action"
          type="button"
          disabled={runStatus === "running"}
          onClick={onRunGoogleTrends}
        >
          {runStatus === "running" ? "运行中..." : "运行 Google Trends（实时）"}
        </button>
        <button
          className="secondary-action"
          type="button"
          disabled={runStatus === "running"}
          onClick={onRunFixture}
        >
          运行演示数据
        </button>
        <span className={runStatus === "failed" ? "provider-run-error" : ""} aria-live="polite">
          {runMessage || " "}
        </span>
      </div>
      <details className="provider-command-details">
        <summary>查看可复制命令</summary>
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
      </details>
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
        <p className="provider-empty">当前结果没有阻塞型数据源缺口。可以用演示数据回放验证整条证据管线。</p>
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
        <p className="eyebrow">证据缺口</p>
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
