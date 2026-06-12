import Link from "next/link";
import { getDemoResult, getEvidenceResult } from "@/lib/demo-cases";
import { BAND_LABELS, EVIDENCE_GATE_LABELS } from "@/lib/display-labels";
import { buildTrendShortlist, type TrendShortlistInput } from "@/lib/trend-shortlist";
import legoShortlistFixture from "@/data/lego_trend_shortlist.json";
import type { Band } from "@/lib/types";

function bandLabel(band: Band): string {
  return BAND_LABELS[band] ?? band;
}

function gateLabel(gate: string): string {
  return EVIDENCE_GATE_LABELS[gate] ?? gate;
}

export default function HomePage() {
  const fashionEvidence = getEvidenceResult("demo_fashion");
  const aiToolEvidence = getEvidenceResult("demo_ai_tool");
  const snackEvidence = getEvidenceResult("demo_snack");
  const legoShortlist = buildTrendShortlist(legoShortlistFixture as TrendShortlistInput);
  const legoWinner = legoShortlist.winner;

  if (!fashionEvidence || !aiToolEvidence || !snackEvidence) {
    throw new Error("Homepage evidence cases are missing.");
  }

  const heroStats = [
    ["案例", "13"],
    ["测试", "120/120"],
    ["演示", "免密钥"]
  ];

  const cases = [
    {
      title: "中端男装 × 静奢风",
      image: "/case-studies/quiet-luxury-fashion.png",
      href: "/report?case=demo_fashion",
      score: `${getDemoResult("demo_fashion").total} → ${fashionEvidence.adjustedResult.total}`,
      decision: bandLabel(fashionEvidence.rigor.gatedBand),
      note: "高分被证据门槛收敛，避免把代理指标包装成强结论。"
    },
    {
      title: "AI 图片工具 × 前后对比",
      image: "/case-studies/ai-photo-before-after.png",
      href: "/report?case=demo_ai_tool",
      score: `${getDemoResult("demo_ai_tool").total} → ${aiToolEvidence.adjustedResult.total}`,
      decision: bandLabel(aiToolEvidence.rigor.gatedBand),
      note: "使用场景成立，但品牌安全风险会影响推荐稳定性。"
    },
    {
      title: "LEGO × F1 比赛周末",
      image: "/case-studies/lego-f1-shortlist.png",
      href: "/workspace",
      score: `${legoWinner.baselineResult.total} → ${legoWinner.adjustedResult.total}`,
      decision: bandLabel(legoWinner.rigor.gatedBand),
      note: "在多个候选热点中，F1 的产品桥梁和创意格式最清晰。"
    }
  ];

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
            <Link className="simple-primary" href="/workspace">
              体验工作台
            </Link>
            <Link className="simple-secondary" href="/report?case=demo_fashion">
              查看案例
            </Link>
          </div>
          <div className="simple-stats" aria-label="项目可信度">
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
            <span>示例案例</span>
            <strong>中端男装 × 静奢风</strong>
          </div>
          <div className="preview-score">
            <span>证据修正后</span>
            <strong>{fashionEvidence.adjustedResult.total}</strong>
            <small>/ 100</small>
          </div>
          <div className="preview-result-grid">
            <div>
              <span>最终建议</span>
              <strong>{bandLabel(fashionEvidence.rigor.gatedBand)}</strong>
            </div>
            <div>
              <span>证据门槛</span>
              <strong>{gateLabel(fashionEvidence.rigor.evidenceGate)}</strong>
            </div>
          </div>
          <p>分数不是结论。只有证据足够，系统才允许强建议。</p>
          <Link href="/workspace">打开完整演示</Link>
        </div>
      </section>

      <section className="simple-section simple-problem" aria-label="解决的问题">
        <div>
          <h2>它解决的是“要不要蹭热点”的中间判断。</h2>
          <p>
            热点工具告诉你什么流行，达人工具告诉你谁有流量。这个项目判断的是：产品能不能自然参与，以及证据是否足够支持行动。
          </p>
        </div>
        <ul>
          <li>受众是否匹配</li>
          <li>场景是否自然</li>
          <li>卖点是否接得上</li>
          <li>风险是否可控</li>
        </ul>
      </section>

      <section className="simple-section simple-how" aria-label="判断方式">
        <div className="simple-section-heading">
          <h2>简单展示，严谨判断。</h2>
          <p>面试官先看到结果，有兴趣时再进入工作台看完整证据链。</p>
        </div>
        <div className="simple-steps">
          {[
            ["1", "输入产品和热点", "手动给出初始判断，不让系统凭空编造基准分。"],
            ["2", "加入真实证据", "每条来源先过分类器，榜单软文和未验证搜索不会变成强证据。"],
            ["3", "输出行动建议", "高分也可能被降级，最终建议更接近可执行决策。"]
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
          <h2>三个案例，十秒看懂。</h2>
          <p>保留最适合展示的案例，不把所有模型细节堆在首页。</p>
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
