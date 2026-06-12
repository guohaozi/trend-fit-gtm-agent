import Link from "next/link";
import {
  DEMO_CASES,
  DIMENSION_META,
  getDemoResult,
  getEvidenceResult
} from "@/lib/demo-cases";
import {
  BAND_LABELS,
  DECISION_TYPE_LABELS,
  EVIDENCE_GATE_LABELS,
  SOURCE_TIER_LABELS,
  STABILITY_LABELS
} from "@/lib/display-labels";
import { buildTrendShortlist, type TrendShortlistInput } from "@/lib/trend-shortlist";
import legoShortlistFixture from "@/data/lego_trend_shortlist.json";
import type { Band, ScoreKey } from "@/lib/types";

const dimensionLabels: Record<ScoreKey, string> = {
  audienceOverlap: "人群重合",
  useCaseRelevance: "场景适配",
  messageBridge: "信息桥梁",
  creativeFeasibility: "创意可行",
  commercialIntent: "商业意图",
  brandSafety: "品牌安全",
  timingSaturation: "时机热度"
};

const disciplineItems = [
  {
    title: "没有数据不等于有证据",
    body: "缺失、近乎为零或互相矛盾的来源不会被包装成正向发现。系统会记录缺口，而不是假装有把握。"
  },
  {
    title: "证据等级由分类器决定",
    body: "每条候选来源都会经过 source-tier classifier。品牌自述、榜单软文和未验证搜索结果不能自己升级成强证据。"
  },
  {
    title: "强烈建议必须有非代理证据",
    body: "高分只是分析判断，门槛后的结论才是产品可以对外负责的建议。代理指标不足时，Strong Go 会被降级。"
  }
];

const evidenceNoteLabels: Record<string, string> = {
  "ev-audience-1":
    "静奢风的平价案例多次提到中端品牌和预算友好穿搭，说明该趋势能触达务实男装人群。",
  "ev-timing-1": "静奢风高峰已过，正在转向“低调但有表达”的细分类目，而不是继续上升。",
  "ev-timing-2": "静奢风热度正在下滑，审美声望开始迁移。",
  "ev-timing-3": "平价替代赛道已经拥挤，大量榜单和 affiliate 内容构成饱和信号。",
  "ev-safety-1": "专家公开指出 old money aesthetic 存在阶级与文化排斥风险，品牌表达需要谨慎。"
};

const legoTrendCopy: Record<string, { name: string; description: string; verdict: string }> = {
  lego_world_cup_trend: {
    name: "世界杯球迷文化",
    description: "围绕 2026 世界杯的观赛派对、国家队身份和收藏时刻。",
    verdict: "文化表面积大，但需要更清晰的授权或球迷仪式角度，避免变成泛足球内容。"
  },
  lego_f1_race_trend: {
    name: "F1 比赛周末",
    description: "F1 车队身份、赛车设计、工程叙事和成年收藏者文化。",
    verdict: "最佳适配：LEGO 已有直接 F1 产品桥梁、强创意格式和自然的成年收藏者角度。"
  },
  lego_graduation_season_trend: {
    name: "毕业季礼物",
    description: "毕业礼物、学年里程碑、桌面装饰和家庭庆祝内容。",
    verdict: "安全且适合作为礼物，但差异性弱于 F1，因为很多品牌都能参与毕业季。"
  }
};

function bandLabel(band: Band): string {
  return BAND_LABELS[band] ?? band;
}

function gateLabel(gate: string): string {
  return EVIDENCE_GATE_LABELS[gate] ?? gate;
}

function stabilityLabel(stability: string): string {
  return STABILITY_LABELS[stability] ?? stability;
}

function decisionTypeLabel(decisionType: string): string {
  return DECISION_TYPE_LABELS[decisionType] ?? decisionType;
}

export default function HomePage() {
  const fashionCase = DEMO_CASES[0];
  const baselineResult = getDemoResult(fashionCase.id);
  const evidenceResult = getEvidenceResult(fashionCase.id);
  const aiToolEvidence = getEvidenceResult("demo_ai_tool");
  const snackEvidence = getEvidenceResult("demo_snack");
  const legoShortlist = buildTrendShortlist(legoShortlistFixture as TrendShortlistInput);
  const legoWinner = legoShortlist.winner;

  if (!evidenceResult || !aiToolEvidence || !snackEvidence) {
    throw new Error("Homepage evidence cases are missing.");
  }

  const caseStudies = [
    {
      title: "中端男装 × 静奢风",
      category: "服饰与配件",
      image: "/case-studies/quiet-luxury-fashion.png",
      imageAlt: "中端男装静奢风证据案例缩略图",
      href: "/report?case=demo_fashion",
      baseline: baselineResult.total,
      evidence: evidenceResult.adjustedResult.total,
      gate: gateLabel(evidenceResult.rigor.evidenceGate),
      decision: bandLabel(evidenceResult.rigor.gatedBand),
      reason: "人群和场景证据仍偏代理指标，原始 Strong Go 被门槛收敛为 Go。"
    },
    {
      title: "AI 图片工具 × 前后对比",
      category: "消费级应用",
      image: "/case-studies/ai-photo-before-after.png",
      imageAlt: "AI 图片前后对比证据案例缩略图",
      href: "/report?case=demo_ai_tool",
      baseline: getDemoResult("demo_ai_tool").total,
      evidence: aiToolEvidence.adjustedResult.total,
      gate: gateLabel(aiToolEvidence.rigor.evidenceGate),
      decision: bandLabel(aiToolEvidence.rigor.gatedBand),
      reason: "证据确认了使用场景，但品牌安全压力让推荐稳定性仍然脆弱。"
    },
    {
      title: "零食品牌 × 迪拜巧克力",
      category: "食品饮料",
      image: "/case-studies/dubai-chocolate.png",
      imageAlt: "迪拜巧克力零食证据案例缩略图",
      href: "/report?case=demo_snack",
      baseline: getDemoResult("demo_snack").total,
      evidence: snackEvidence.adjustedResult.total,
      gate: gateLabel(snackEvidence.rigor.evidenceGate),
      decision: bandLabel(snackEvidence.rigor.gatedBand),
      reason: "搜索和热度支持跟进，但同质化和价格质疑更适合先做受控测试。"
    },
    {
      title: "LEGO × F1 候选热点排序",
      category: "玩具与收藏",
      image: "/case-studies/lego-f1-shortlist.png",
      imageAlt: "LEGO F1 候选热点排序缩略图",
      href: "/workspace",
      baseline: legoWinner.baselineResult.total,
      evidence: legoWinner.adjustedResult.total,
      gate: gateLabel(legoWinner.rigor.evidenceGate),
      decision: bandLabel(legoWinner.rigor.gatedBand),
      reason: "F1 在产品桥梁、创意格式和时机证据上都强于世界杯与毕业季。"
    }
  ];

  const topEvidence = evidenceResult.evidenceCase.evidence.slice(0, 5);

  return (
    <div className="home-page">
      <section className="home-hero" aria-label="证据决策中心">
        <div className="home-hero-copy">
          <p className="home-kicker">证据决策中心</p>
          <h1>这个产品该不该追这个热点？</h1>
          <p>
            把产品、热点和证据放进同一套可审计模型里，输出可执行但不过度承诺的 GTM 判断。
          </p>
          <div className="home-actions">
            <Link className="home-primary-action" href="/workspace">
              打开工作台
            </Link>
            <Link className="home-secondary-action" href="/workspace">
              回放免 Key Demo
            </Link>
            <Link className="home-text-action" href="/report?case=demo_fashion">
              查看证据案例
            </Link>
          </div>
        </div>

        <div className="decision-panel" aria-label="门槛后决策预览">
          <div className="decision-panel-header">
            <div>
              <span>案例</span>
              <strong>中端男装 × 静奢风</strong>
            </div>
            <Link href="/fit-score?case=demo_fashion">查看评分框架</Link>
          </div>

          <div className="decision-stats">
            <div>
              <span>基准分</span>
              <strong>{baselineResult.total}</strong>
              <small>/ 100</small>
            </div>
            <div>
              <span>证据修正后</span>
              <strong>{evidenceResult.adjustedResult.total}</strong>
              <small>/ 100</small>
            </div>
            <div>
              <span>原始判断</span>
              <strong>{bandLabel(evidenceResult.adjustedResult.recommendation.finalBand)}</strong>
            </div>
            <div>
              <span>门槛后判断</span>
              <strong>{bandLabel(evidenceResult.rigor.gatedBand)}</strong>
            </div>
            <div>
              <span>证据门槛</span>
              <strong>{gateLabel(evidenceResult.rigor.evidenceGate)}</strong>
            </div>
          </div>

          <p className="gate-note">只有代理指标或榜单软文时，系统不会放行“强烈建议跟进”。</p>

          <div className="dimension-strip" aria-label="七维适配评分">
            {DIMENSION_META.map((dimension) => {
              const score = evidenceResult.adjustment.adjusted[dimension.key];
              return (
                <div key={dimension.key}>
                  <span>{dimensionLabels[dimension.key]}</span>
                  <strong>{score}</strong>
                  <div className="mini-meter" aria-hidden="true">
                    <i style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="evidence-table-preview">
            <div className="evidence-table-head">
              <span>关键证据</span>
              <span>证据等级</span>
              <span>影响</span>
            </div>
            {topEvidence.map((item) => (
              <div className="evidence-table-row" key={item.id}>
                <span>{evidenceNoteLabels[item.id] ?? item.note}</span>
                <strong className={`tier-chip ${item.sourceTier}`}>{SOURCE_TIER_LABELS[item.sourceTier]}</strong>
                <strong>{item.direction === "down" ? "风险" : "支持"}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-trust-strip" aria-label="项目可信度">
        <div>
          <strong>120 / 120</strong>
          <span>测试通过</span>
        </div>
        <div>
          <strong>CI 构建</strong>
          <span>测试 + 生产构建</span>
        </div>
        <div>
          <strong>13</strong>
          <span>结构化证据案例</span>
        </div>
        <div>
          <strong>SerpApi Fixture 回放</strong>
          <span>无需暴露 Key 也能演示</span>
        </div>
      </section>

      <section className="home-discipline" aria-label="证据纪律">
        <div className="home-section-heading">
          <h2>核心不是打高分，而是不乱下结论。</h2>
          <p>这个项目最值得讲的不是模型会给建议，而是它知道什么时候该降级、观望或拒绝。</p>
        </div>
        <div className="discipline-grid">
          {disciplineItems.map((item, index) => (
            <article key={item.title}>
              <span>{index + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-preview-section" aria-label="工作台预览">
        <div className="home-section-heading split">
          <div>
            <h2>工作台预览</h2>
            <p>一个产品、多个候选热点、证据行、排序结果和门槛后的行动建议。</p>
          </div>
          <Link className="home-secondary-action" href="/workspace">
            打开完整工作台
          </Link>
        </div>

        <div className="home-workspace-preview">
          <div className="workspace-column product-column">
            <h3>1. 产品与市场</h3>
            <dl>
              <div>
                <dt>产品</dt>
                <dd>LEGO</dd>
              </div>
              <div>
                <dt>市场</dt>
                <dd>全球 / 欧洲</dd>
              </div>
              <div>
                <dt>风险偏好</dt>
                <dd>中等</dd>
              </div>
            </dl>
            <div className="anchor-score-list">
              {[
                ["人群重合", 75],
                ["场景适配", 100],
                ["信息桥梁", 100],
                ["创意可行", 100],
                ["商业意图", 75]
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <div className="mini-meter" aria-hidden="true">
                    <i style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="workspace-column shortlist-column">
            <h3>2. 候选热点排序</h3>
            <div className="shortlist-preview-table">
              {legoShortlist.rows.map((row) => (
                <div className={row.id === legoWinner.id ? "selected" : ""} key={row.id}>
                  <span>
                    <strong>{legoTrendCopy[row.id]?.name ?? row.trendName}</strong>
                    <small>{legoTrendCopy[row.id]?.description ?? row.trendDescription}</small>
                  </span>
                  <span>
                    <strong>{row.adjustedResult.total}</strong>
                    <small>{bandLabel(row.rigor.gatedBand)}</small>
                  </span>
                  <span>
                    <strong>{gateLabel(row.rigor.evidenceGate)}</strong>
                    <small>{stabilityLabel(row.rigor.recommendationStability)}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="workspace-column evidence-column">
            <h3>3. 证据与建议</h3>
            <div className="recommendation-preview">
              <span>选中的热点</span>
              <strong>{legoTrendCopy[legoWinner.id]?.name ?? legoWinner.trendName}</strong>
              <p>{legoTrendCopy[legoWinner.id]?.verdict ?? legoWinner.oneLineVerdict}</p>
            </div>
            <div className="recommendation-facts">
              <div>
                <span>证据门槛</span>
                <strong>{gateLabel(legoWinner.rigor.evidenceGate)}</strong>
              </div>
              <div>
                <span>门槛后判断</span>
                <strong>{bandLabel(legoWinner.rigor.gatedBand)}</strong>
              </div>
              <div>
                <span>行动类型</span>
                <strong>{decisionTypeLabel(legoWinner.rigor.decisionType)}</strong>
              </div>
            </div>
            <Link className="home-primary-action compact" href="/workspace">
              用 Fixture 开始演示
            </Link>
          </div>
        </div>
      </section>

      <section className="case-study-section" aria-label="带证据的案例">
        <div className="home-section-heading split">
          <div>
            <h2>带证据的案例</h2>
            <p>每个案例都展示证据如何改变分数，或者约束一个看似很强的建议。</p>
          </div>
          <Link className="home-text-action" href="/report?case=demo_fashion">
            阅读主案例
          </Link>
        </div>

        <div className="case-study-grid">
          {caseStudies.map((study) => (
            <Link className="case-study-card" href={study.href} key={study.title}>
              <img src={study.image} alt={study.imageAlt} />
              <div className="case-study-body">
                <span>{study.category}</span>
                <h3>{study.title}</h3>
                <div className="case-score-row">
                  <div>
                    <small>基准分</small>
                    <strong>{study.baseline}</strong>
                  </div>
                  <div>
                    <small>证据分</small>
                    <strong>{study.evidence}</strong>
                  </div>
                  <div>
                    <small>门槛</small>
                    <strong>{study.gate}</strong>
                  </div>
                  <div>
                    <small>结论</small>
                    <strong>{study.decision}</strong>
                  </div>
                </div>
                <p>{study.reason}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
