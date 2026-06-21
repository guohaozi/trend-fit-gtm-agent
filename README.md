# Trend-Fit GTM Agent

**用可审计的证据，判断一个产品该不该追一个热点。**

趋势工具告诉你什么正在流行，达人和投放工具告诉你哪里有流量。Trend-Fit 补上中间最关键的一步：判断产品与热点是否真正适配、风险是否可控，以及下一步应该跟进、测试、观望还是放弃。

它不是销量预测器，也不替用户发现热点。它把 AI 假设、外部证据和确定性规则放进同一条可复核的决策链。

[在线体验](https://trend-fit-seven.vercel.app) · [开始评估](https://trend-fit-seven.vercel.app/evaluate) · [查看 PixAI 完整案例](https://trend-fit-seven.vercel.app/cases/demo_pixai)

## 为什么需要它

GTM 团队面对热点时，常见选择通常只有两个：错过机会，或在证据不足时仓促跟进。

真正需要回答的是：

- 热点受众是否与目标客户重合？
- 产品能否自然进入热点语境？
- 卖点与热点之间是否有清晰的信息桥梁？
- 商业意图、窗口期和品牌风险是否有证据支持？
- 当前证据足够支持正式投入，还是只适合小范围测试？

Trend-Fit 将这些判断拆成结构化评分、证据修正和行动门槛，让团队看见结论是如何形成的。

## 产品如何工作

```text
产品画像 + 市场 + 候选热点
            ↓
Gemini 生成七维基准假设
            ↓
外部证据采集与立场判定
            ↓
确定性评分、证据门槛与风险规则
            ↓
行动建议 + 可下载 GTM 简报
```

AI 负责提出基准假设和识别证据立场；权重、分数修正、来源等级和最终建议全部由确定性规则处理。AI 不直接下裁决。

## 一个分数不够

旗舰案例评估的是：**PixAI 是否应该跟进「AI 生成原创动漫角色（OC）」热点？**

| 判断阶段 | 结果 |
|---|---|
| AI 基准判断 | `88 / 100`，强烈建议跟进 |
| 证据修正 | 商业意图 `75 → 100`，品牌安全 `50 → 25` |
| 修正后总分 | 仍为 `88 / 100`，两项变化在加权后抵消 |
| 最终建议 | **谨慎测试**，而不是直接投入 |

真实社区证据显示，日本动漫圈对 AI 艺术存在明显抵制。即使总分没有变化，品牌安全规则仍会收紧最终建议。这正是项目的核心价值：**分数相同，不代表决策相同。**

案例证据来自 HN、Reddit、小红书、TikTok、Instagram、X 和 Google Trends，经立场判定、去重与双来源佐证后冻结为可重复演示的数据。完整结构化证据见 [`data/demo_pixai_evidence.json`](data/demo_pixai_evidence.json)。

## 核心能力

- **七维适配模型**：人群重合、场景适配、信息桥梁、创意可行、商业意图、品牌安全和时机热度。
- **锚点评分**：只允许 `{0, 25, 50, 75, 100}`，减少看似精确但无法解释的分数。
- **证据完整性控制**：来源分级、重复与矛盾过滤、双来源佐证；弱证据可以保留为背景，但不能推动分数。
- **建议严谨性门槛**：高分不自动等于 Go；系统还检查证据覆盖、稳定性和品牌风险。
- **可审计输出**：保留基准分、证据变化、门槛原因和下一步验证动作，并生成 GTM 简报。
- **安全的服务端调用**：Gemini、SerpApi 等密钥不进入浏览器。

## 产品边界

Trend-Fit 刻意不把不确定性包装成确定答案：

- 它评估用户输入的 `产品 × 市场 × 热点`，不自动发现全网热点。
- 它约束产品与热点的适配假设，不预测销量或 campaign ROI。
- 对尚未开展营销的产品，产品与热点的共现证据通常不存在；外部证据主要验证热点的时机、热度和品牌风险。
- 当前公开评估页运行 AI baseline 与确定性裁决；多平台 AI stance 全管线以离线采集并冻结的旗舰案例展示。
- 权重仍是专家先验，尚未声称经过真实 campaign 结果校准。

这些限制是决策模型的一部分，而不是被隐藏的例外。

## 本地运行

```bash
git clone https://github.com/guohaozi/trend-fit-gtm-agent.git
cd trend-fit-gtm-agent
npm install
npm run dev
```

打开 `http://localhost:3000`。公开 fixture 和工作台回放无需 API key；在线 AI 基准评分需要在 `.env.local` 中配置 `GEMINI_API_KEY`。

提交或部署前：

```bash
npm test
npm run build
```

## 技术实现

- Next.js 15、React 19、TypeScript、Tailwind CSS
- Gemini structured output
- SerpApi Google Trends
- TikHub 多平台数据采集
- Node test runner + GitHub Actions

核心代码集中在：

| 模块 | 位置 |
|---|---|
| 评分与风险规则 | [`lib/scoring.ts`](lib/scoring.ts)、[`lib/recommendation-rigor.ts`](lib/recommendation-rigor.ts) |
| AI 基准与立场判定 | [`lib/baseline-scorer.ts`](lib/baseline-scorer.ts)、[`lib/evidence-stance.ts`](lib/evidence-stance.ts) |
| 证据收集与修正 | [`lib/evidence-collector.ts`](lib/evidence-collector.ts)、[`lib/evidence-adjustment.ts`](lib/evidence-adjustment.ts) |
| 产品界面 | [`app/`](app/)、[`components/`](components/) |
| 回归测试 | [`tests/`](tests/) |

## 项目文档

- [`docs/current-state.md`](docs/current-state.md)：当前实现、能力边界和下一步工作
- [`docs/changelog.md`](docs/changelog.md)：完整迭代记录
- [`docs/evidence-case-research-cli.md`](docs/evidence-case-research-cli.md)：证据案例采集流程

项目已部署至 [trend-fit-seven.vercel.app](https://trend-fit-seven.vercel.app)。
