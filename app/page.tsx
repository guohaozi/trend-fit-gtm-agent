import Link from "next/link";
import { getEvidenceResult, getFeaturedCaseCards, INTERVIEW_DEMO_ID } from "@/lib/demo-cases";
import { BAND_LABELS, EVIDENCE_GATE_LABELS } from "@/lib/display-labels";
import type { Band } from "@/lib/types";

function bandLabel(band: Band): string {
  return BAND_LABELS[band] ?? band;
}

function gateLabel(gate: string): string {
  return EVIDENCE_GATE_LABELS[gate] ?? gate;
}

export default function HomePage() {
  const demoEvidence = getEvidenceResult(INTERVIEW_DEMO_ID);

  if (!demoEvidence) {
    throw new Error("Homepage interview demo is missing.");
  }

  const heroStats = [
    ["流程", "3 步"],
    ["启动", "10 分钟"],
    ["输出", "行动建议"]
  ];

  const cases = getFeaturedCaseCards()
    .filter((card) => card.id === INTERVIEW_DEMO_ID)
    .map((card) => ({
      title: card.title,
      image: card.image,
      href: `/cases/${card.id}`,
      score: `${card.baselineTotal} → ${card.adjustedTotal}`,
      decision: bandLabel(card.decisionBand),
      note: card.note
    }));

  return (
    <div className="simple-home">
      <section className="simple-hero" aria-label="产品展示">
        <div className="simple-hero-copy">
          <p className="simple-kicker">热点适配工作台</p>
          <h1>产品该不该追热点？</h1>
          <p>
            输入产品、市场和候选热点，系统用评分、证据和门槛规则给出“跟进、测试、观望或不建议”的判断。
          </p>
          <div className="simple-actions">
            <Link className="simple-primary" href={`/cases/${INTERVIEW_DEMO_ID}`}>
              查看完整 Demo
            </Link>
            <Link className="simple-secondary" href="#how-it-works">
              了解判断方式
            </Link>
          </div>
          <div className="simple-stats" aria-label="产品价值">
            {heroStats.map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="simple-product-preview" aria-label="决策预览">
          <div className="preview-topline">
            <span>当前评估</span>
            <strong>PixAI × AI 生成原创动漫角色（OC）</strong>
          </div>
          <div className="preview-score">
            <span>证据修正后</span>
            <strong>{demoEvidence.adjustedResult.total}</strong>
            <small>/ 100</small>
          </div>
          <div className="preview-result-grid">
            <div>
              <span>最终建议</span>
              <strong>{bandLabel(demoEvidence.rigor.gatedBand)}</strong>
            </div>
            <div>
              <span>证据门槛</span>
              <strong>{gateLabel(demoEvidence.rigor.evidenceGate)}</strong>
            </div>
          </div>
          <p>从 AI 基准分、外部证据修正，到确定性门槛与 GTM 简报，一页展示完整链路。</p>
          <Link href={`/cases/${INTERVIEW_DEMO_ID}`}>查看完整证据链</Link>
        </div>
      </section>

      <section className="simple-section simple-problem" aria-label="解决的问题">
        <div>
          <h2>它解决的是“要不要蹭热点”的中间判断。</h2>
          <p>
            热点工具告诉你什么流行，达人工具告诉你谁有流量。Trend-Fit 判断的是：你的产品是否适合加入这波话题，以及下一步该怎么试。
          </p>
        </div>
        <ul>
          <li>受众是否匹配</li>
          <li>场景是否自然</li>
          <li>卖点是否接得上</li>
          <li>风险是否可控</li>
        </ul>
      </section>

      <section id="how-it-works" className="simple-section simple-how" aria-label="判断方式">
        <div className="simple-section-heading">
          <h2>从热点到行动，三步完成。</h2>
          <p>不用先搭复杂调研流程，先把产品、热点和风险放到同一张判断表里。</p>
        </div>
        <div className="simple-steps">
          {[
            ["1", "描述你的产品", "输入市场、目标人群、核心卖点和风险偏好。"],
            ["2", "选择候选热点", "把想追的话题放进来，快速比较哪一个更适合。"],
            ["3", "拿到下一步动作", "输出跟进、测试、观望或不建议，并给出优先验证方向。"]
          ].map(([index, title, body]) => (
            <article key={index}>
              <span>{index}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="simple-section simple-cases" aria-label="案例展示">
        <div className="simple-section-heading">
          <h2>一个案例，完整走完判断链路。</h2>
          <p>面试 Demo 聚焦一个产品和一个热点，展示证据如何真正改变分数和建议。</p>
          <p className="simple-cases-legend">
            分数读作「<strong>基准分 → 证据修正后</strong>」：证据会把缺乏支撑的虚高分拉回真实区间。
          </p>
        </div>
        <div className="simple-case-grid">
          {cases.map((item) => (
            <Link className="simple-case-card" href={item.href} key={item.title}>
              <img src={item.image} alt={`${item.title}案例图`} />
              <div>
                <h3>{item.title}</h3>
                <dl>
                  <div>
                    <dt>分数</dt>
                    <dd>{item.score}</dd>
                  </div>
                  <div>
                    <dt>建议</dt>
                    <dd>{item.decision}</dd>
                  </div>
                </dl>
                <p>{item.note}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
