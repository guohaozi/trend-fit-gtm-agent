# Trend-Fit GTM Agent

**一个用来判断“这个产品该不该追这个热点”的 GTM 决策工作台。**

Trend-Fit GTM Agent 位于“趋势发现工具”和“达人/投放工具”之间：前者告诉你什么正在流行，后者告诉你谁有流量，而这个项目回答更难的问题：产品和热点是否真的适配，有什么证据支持，建议是否强到足以执行。

它是一个确定性的决策框架，不是销量预测器，也不是自动爬取全网热点的工具。

## 演示入口

线上演示（已部署到 Vercel，无需本地环境，公开 demo 默认走 fixture，不暴露 key）：

- 官网首页：[https://trend-fit-seven.vercel.app](https://trend-fit-seven.vercel.app)
- 开始评估（分析师式流程）：[https://trend-fit-seven.vercel.app/evaluate](https://trend-fit-seven.vercel.app/evaluate)
- 旗舰案例（一页看完判断）：[https://trend-fit-seven.vercel.app/cases/demo_pixai](https://trend-fit-seven.vercel.app/cases/demo_pixai)
- GTM 工作台（高级 / 引擎视图）：[https://trend-fit-seven.vercel.app/workspace](https://trend-fit-seven.vercel.app/workspace)

本地运行：

```bash
npm install
npm run dev
```

然后打开 `http://127.0.0.1:3000` 或 `http://localhost:3000`。

`/workspace` 已内置 Google Trends fixture 回放路径，因此公开演示时可以不暴露 SerpApi key。

## 旗舰案例：PixAI × AI 生成原创动漫角色（OC）

首页和 `/cases` 都聚焦同一个真实案例——PixAI 这个二次元 AI 绘画平台，要不要追「AI 生成原创动漫角色（OC）」这个热点。

- 基准分（AI baseline）：**88 / 100 · 强烈建议跟进**
- 证据修正后：**88 / 100**（商业意图 +25 与品牌安全 -25 在加权后互相抵消）
- 证据门槛后：**谨慎测试**（脆弱 · 小测试）
- 真正的故事：默认权重下总分没变，但日本动漫圈对 AI 艺术的真实抵制把品牌安全压到 25，门槛因此把判断收紧——分数不一定要变，建议也可能变。

证据全部来自真实采集（HN/Reddit/小红书/TikTok/Instagram/X + SerpApi Google Trends），由 Gemini 立场判定器 + 确定性引擎评分，固化在 [`data/demo_pixai_evidence.json`](data/demo_pixai_evidence.json)。

## 这个项目解决什么

GTM 团队看到一个热点时，常见选择都很粗糙：

- 不追，可能错过真实机会。
- 硬追，可能做出尴尬、廉价或伤害品牌的 campaign。

真正有价值的是中间层判断：

- 热点受众是否匹配产品目标客户？
- 产品能否自然进入热点语境，而不是强行蹭？
- 卖点和热点之间有没有清晰的信息桥梁？
- 时机、商业意图和品牌安全有什么证据支撑？
- 该付费放大、创作者种草、小范围测试，还是直接 No-go？

Trend-Fit 把这套判断显性化、结构化，并保留可审计的证据链。

## 当前能力

- **AI baseline scorer**（Gemini）：用户输入产品 + 候选热点 → 模型按 7 维锚点给出基线评分，写明 rationale 而非编造证据。
- **AI 立场判定器**（Gemini，离线批处理）：把外部采集的真实片段切成 batch，让模型只输出 `{dimension, stance, quote, claim}`，方向/权重/最终建议全部由确定性规则映射；AI 永远不下裁决。
- **多平台真实采集**：HN、GDELT 免费 provider + TikHub 一把 key 覆盖小红书/TikTok/Instagram/X/Reddit（小红书走 `app/search_notes`），SerpApi 提供 Google Trends 时机/商业信号。
- **证据完整性双道闸**：(1) 同一来源同一维度去重 + 互相矛盾 drop；(2) **双来源佐证**——任何维度若只有 1 个独立来源支撑方向，自动降级为 context（仍展示但不动分数）。
- **Source-tier classifier** 决定证据等级，防止品牌自述、榜单软文和未验证搜索结果抬高置信度。
- **七维评分固定在锚点** `{0, 25, 50, 75, 100}`，证据只能按锚点整档修正分数，避免伪精度。
- **推荐严谨性门槛**：Strong Go evidence gate、无证据封顶、稳定性（fragile/robust）、行动类型（small test / full launch）都已接入；`brandSafety ≤ 25` 强制最高「谨慎测试」。
- **`/workspace`** 可编辑产品、市场、候选热点、七维锚点分和证据行；支持单热点评分，也支持 3 候选排序、fixture 回放、JSON 导入导出、本地自动保存、Markdown 报告导出。
- **服务端 API 安全**：SerpApi/Gemini 等所有 key 走服务端调用，浏览器不接收。

当前刻意不做：

- 自动从 TikTok、X、Instagram、小红书抓取全网热点。
- 抓取达人联系方式。
- 接入广告平台开户或投放 API。
- 做登录、数据库、支付或云端持久化。
- 假装权重已经用真实 campaign 结果校准过。

## 能力边界——「时间悖论」

工具在 campaign **之前**判断，但 `产品 × 热点` 的共现证据只在 campaign **之后**才会大量出现。对未营销过的产品(真实使用场景)，搜「产品名 + 热点词」几乎为零。

结论：证据验证的是**热点本身**的客观属性(时机/热度/品牌风险)；产品↔热点的契合度仍是 LLM 假设，由 evidence gate 约束——我们不假装它已被证明。详见 [`docs/current-state.md`](docs/current-state.md) "Capability boundary"。

## 证据纪律

这个项目最强的部分不是“能给高分”，而是“知道什么时候不能过度承诺”。

| 规则 | 防止什么问题 |
|---|---|
| **没有数据不等于有证据** | 缺失、近乎为零或互相矛盾的来源不会变成正向结论。 |
| **证据等级由分类器决定** | Agent 和用户不能把弱来源手动升级成强证据。 |
| **Strong Go 必须有非代理证据** | 原始高分如果只靠代理指标，会被门槛降级。 |
| **不伪造校准** | 权重被诚实标注为专家先验，直到有真实 campaign 数据。 |

例子：PixAI × AI 生成原创动漫角色 在证据修正后总分仍是 `88 / 100`(权重抵消)，但 brandSafety 从 50 被真实社区证据压到 25，门槛因此把判断从「强烈建议跟进」收紧为「谨慎测试」——分数不一定要变，建议也可能变。

## Demo 案例

面向用户的旗舰案例只展示一个 PixAI（首页 + `/cases`）；其余几个保留为引擎回归 fixture，不在前端展示。

| 案例 | 基准分 | 证据修正后 | 门槛后结论 | 说明 | 来源 |
|---|---:|---:|---|---|---|
| **PixAI × AI 生成原创动漫角色（OC）** | **88** | **88** | **谨慎测试** | 总分未变但 brandSafety 50→25 触发门槛收紧。 | 真实采集 + AI stance |
| 中端男装 × 静奢风 | 90 | 88 | 建议跟进 | 时机被下修，代理证据阻止 Strong Go。 | 人工策展 fixture |
| AI 图片工具 × 前后对比 | 89 | 86 | 强烈建议跟进 | 场景证据通过，但品牌安全让稳定性偏脆弱。 | 人工策展 fixture |
| 零食品牌 × 迪拜巧克力 | 81 | 76 | 建议跟进 | 饱和与跟风风险降低置信度。 | 人工策展 fixture |
| 即饮蛋白饮料 × 日常蛋白摄入 | 78 | 85 | 强烈建议跟进 | 健康和商业信号抬高分数，但刚过阈值。 | 人工策展 fixture |

报告文件在 [`outputs/`](outputs/)，结构化输入和证据在 [`data/`](data/)。PixAI evidence 的离线重跑入口见下面 `scripts/collect-and-judge.ts`。

## 评分模型

每个维度只允许 `0`、`25`、`50`、`75`、`100` 五档锚点。

| 维度 | 权重 | 核心问题 |
|---|---:|---|
| 人群重合 | 20% | 热点受众是否匹配目标客户？ |
| 场景适配 | 20% | 产品能否自然参与热点？ |
| 信息桥梁 | 15% | 热点和产品价值之间是否有清晰连接？ |
| 创意可行 | 15% | 团队能否做出符合平台语境的内容？ |
| 商业意图 | 10% | 受众是否接近购买、试用或咨询心智？ |
| 品牌安全 | 10% | 是否存在价值观、语气或声誉风险？ |
| 时机热度 | 10% | 热点是否仍然有窗口期，而不是已经拥挤？ |

展示总分为确定性计算：`floor(weightedRaw + 0.5)`。

决策区间：

| 分数 | 结论 |
|---:|---|
| 85-100 | 强烈建议跟进 |
| 70-84 | 建议跟进 |
| 55-69 | 谨慎测试 |
| 40-54 | 弱适配 |
| 0-39 | 不建议 |

硬性覆盖规则：

1. `brandSafety <= 25` 时，最高只能到“谨慎测试”。
2. 低风险偏好且 `brandSafety < 50` 时，强制“不建议”。
3. `audienceOverlap <= 25` 且 `useCaseRelevance <= 25` 时，最高只能到“弱适配”。

## 架构

项目核心是稳定的评分合同，上面叠加证据修正和严谨性门槛。

| 模块 | 主要文件 |
|---|---|
| 评分合同 | [`lib/scoring.ts`](lib/scoring.ts)、[`tests/scoring.test.ts`](tests/scoring.test.ts) |
| AI baseline scorer | [`lib/baseline-scorer.ts`](lib/baseline-scorer.ts)、[`app/api/evaluate/baseline/route.ts`](app/api/evaluate/baseline/route.ts) |
| AI 立场判定器 | [`lib/evidence-stance.ts`](lib/evidence-stance.ts)、[`tests/evidence-stance.test.ts`](tests/evidence-stance.test.ts) |
| 证据修正引擎 | [`lib/evidence-adjustment.ts`](lib/evidence-adjustment.ts)、[`tests/evidence-adjustment.test.ts`](tests/evidence-adjustment.test.ts) |
| 推荐严谨性门槛 | [`lib/recommendation-rigor.ts`](lib/recommendation-rigor.ts)、[`tests/recommendation-rigor.test.ts`](tests/recommendation-rigor.test.ts) |
| 来源等级分类器 | [`lib/source-tier-classifier.ts`](lib/source-tier-classifier.ts)、[`tests/source-tier-classifier.test.ts`](tests/source-tier-classifier.test.ts) |
| 证据收集 + 双来源佐证 | [`lib/evidence-collector.ts`](lib/evidence-collector.ts)、[`tests/evidence-collector.test.ts`](tests/evidence-collector.test.ts) |
| 免费 provider（HN/GDELT/TikHub） | [`lib/free-evidence-providers.ts`](lib/free-evidence-providers.ts)、[`lib/tikhub-provider.ts`](lib/tikhub-provider.ts)、[`tests/tikhub-provider.test.ts`](tests/tikhub-provider.test.ts) |
| Google Trends Provider | [`lib/seo-keyword-provider.ts`](lib/seo-keyword-provider.ts)、[`app/api/workspace/google-trends/route.ts`](app/api/workspace/google-trends/route.ts) |
| Demo fixture 冻结守卫 | [`lib/demo-fixture-guard.ts`](lib/demo-fixture-guard.ts) |
| 工作台桥接 | [`lib/workspace-evaluator.ts`](lib/workspace-evaluator.ts)、[`components/WorkspaceClient.tsx`](components/WorkspaceClient.tsx) |
| 候选热点排序 | [`lib/trend-shortlist.ts`](lib/trend-shortlist.ts)、[`tests/trend-shortlist.test.ts`](tests/trend-shortlist.test.ts) |
| 报告输出 | [`lib/report-markdown.ts`](lib/report-markdown.ts)、[`app/api/report/[id]/route.ts`](app/api/report/[id]/route.ts) |
| 旗舰案例 hero 组件 | [`components/FeaturedCaseHero.tsx`](components/FeaturedCaseHero.tsx) |

本地 strategy skills 在 [`skills/`](skills/) 下：

- `trend-product-fit`
- `evidence-collector`
- `competitor-evidence`
- `trend-shortlist`
- `campaign-generator`
- `outreach-copy`

## 路由

| 路由 | 用途 |
|---|---|
| `/` | 中文官网首页：FeaturedCaseHero 把 PixAI 案例作为单一展示入口。 |
| `/evaluate` | 分析师式评估：填产品画像 + 候选热点 → AI baseline 评分 + 七维确定性引擎 + 门槛裁决 + 证据缺口 + 可下载 GTM 简报。 |
| `/cases` | 案例展示页：与首页同样的 FeaturedCaseHero。 |
| `/cases/[id]` | 一页式案例详情（输入 + 评分 + 证据修正 + 简报，直出无等待，SSG 预渲染 fashion / pixai / snack）。 |
| `/workspace` | 高级 / 引擎视图：评分、排序、证据行、fixture 回放、导入导出、Markdown 导出。 |
| `/api/evaluate/baseline` | 服务端 Gemini baseline scorer，返回 7 维锚点分 + rationale。 |
| `/api/report/[id]` | 下载已知案例的 Markdown 报告，未知 id 会回退到默认 demo。 |
| `/api/workspace/google-trends` | 服务端 SerpApi Google Trends 调用，或 fixture 回放。 |
| `/api/evidence/collect` | 把候选证据收集成 Draft（去重、源等级、双来源佐证、降级 context）。 |

`/cases/[id]` 与 `/api/report/[id]` 的有效案例 id：`demo_fashion`、`demo_pixai`、`demo_ai_tool`、`demo_snack`、`demo_protein_drink`、`demo_robotics`（未知 id 回退到默认 demo）。

## API 示例

### `GET /api/report/[id]`

下载某个 demo 报告：

```bash
curl -i https://trend-fit-seven.vercel.app/api/report/demo_fashion
```

### `POST /api/workspace/google-trends`

使用已提交的 fixture 回放，不需要 API key：

```bash
curl -X POST https://trend-fit-seven.vercel.app/api/workspace/google-trends \
  -H "Content-Type: application/json" \
  -d '{
    "product": "LEGO",
    "market": "Global / Europe",
    "trend": "F1 race weekend",
    "fixture": true
  }'
```

真实 SerpApi 调用需要服务端环境变量 `SERPAPI_API_KEY`。不要在浏览器输入或公开仓库里放 key。

## 部署与固定域名

已部署到 Vercel，线上地址：**[https://trend-fit-seven.vercel.app](https://trend-fit-seven.vercel.app)**（README 顶部“演示入口”即为此地址；公开 demo 默认走 fixture，不暴露 key）。

如果之后想用更正式的自定义域名：

1. 购买或使用自己的域名，例如 `trendfitgtm.com` 或 `gtm.yourdomain.com`。
2. 在 Vercel 项目 `Settings -> Domains` 添加域名，按 Vercel 给出的 DNS 记录配置。
3. 子域名通常用 CNAME 指向 Vercel；根域名按 Vercel 控制台提示配置 A/CNAME 记录。

注意：公开部署前轮换任何在聊天或截图里出现过的 SerpApi key。真实 SerpApi 调用走服务端环境变量 `SERPAPI_API_KEY`，公开 demo 不依赖它。

## 脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Next.js 开发服务。 |
| `npm run build` | 构建生产版本。 |
| `npm start` | 运行生产构建。 |
| `npm test` | 运行所有 Node 测试（164 个）。 |
| `npm run evidence:case` | 从显式证据数据生成 evidence case。 |
| `npm run evidence:case:research` | 运行研究 provider 管线，写入 `data/*_evidence.json` 和 `outputs/*_evidence_case.md`。 |
| `node --import tsx scripts/collect-and-judge.ts demo_pixai` | 实采集 + Gemini stance 立场判定 + 冻结 demo fixture；`--cached` 复用 `/tmp` snippet 缓存不重计 TikHub，`--dry` 只打印不写文件，`--inspect` 列出每个维度的方向性证据。 |

## 环境变量

| 变量 | 是否必须 | 用途 |
|---|---|---|
| `GEMINI_API_KEY` | live `/evaluate` baseline + 离线 stance 需要 | Google AI Studio key（一把覆盖 baseline 和 stance）。 |
| `GEMINI_BASELINE_MODEL` | 可选 | 覆盖 baseline 模型，默认 `gemini-3.5-flash`。 |
| `GEMINI_MODEL` | 可选 | 覆盖 stance 模型（仅 `scripts/collect-and-judge.ts` 使用），默认 `gemini-3.1-flash-lite`。 |
| `TIKHUB_API_KEY` | 仅离线重采集需要 | TikHub 一把 key 覆盖小红书/TikTok/Instagram/X/Reddit；Vercel 不需要。 |
| `SERPAPI_API_KEY` | 仅真实 Google Trends 调用需要 | 服务端 SerpApi Google Trends key；fixture 回放不需要。 |
| `OPENCLI_BIN` | 可选 | 覆盖 `opencli` 二进制路径。 |

公开 Vercel demo 只需要 `GEMINI_API_KEY`（用于 `/evaluate` baseline）。TikHub/SerpApi 的实采集在本地离线脚本里运行，结果固化为 fixture 后由前端回放，所以 Vercel 不需要它们的 key。

## 验证

推荐在提交或部署前运行：

```bash
npm test
npm run build
```

CI 通过 [`.github/workflows/ci.yml`](.github/workflows/ci.yml) 在 push 和 pull request 时运行 `npm ci`、`npm test` 和 `npm run build`。

UI 改动需要浏览器检查：

- 桌面视口：首屏能打开，无横向溢出，FeaturedCaseHero 视觉面板与内容面板各占约半宽。
- 手机视口（≤860px）：hero 卡片自动堆叠成单列，标题、按钮、约束 pill 不重叠。

## 目录结构

```text
trend-fit-gtm-agent/
├── app/                         # Next.js 页面和 API routes
├── components/                  # 共享 UI 组件
├── data/                        # Demo 案例和结构化证据 JSON
├── docs/                        # 当前状态、changelog、研究 CLI 说明
├── examples/                    # 可重复演示的 fixture
├── lib/                         # 评分、证据、provider、报告和工作台逻辑
├── outputs/                     # 生成的 Markdown 报告和 evidence cases
├── public/case-studies/         # 首页案例缩略图
├── skills/                      # 本地策略 skill 定义
└── tests/                       # Node 测试套件
```

## 当前缺口

- 已部署到 Vercel（[trend-fit-seven.vercel.app](https://trend-fit-seven.vercel.app)），暂未绑定自定义域名。
- 热点仍需要人工输入；产品到热点的自动发现暂不在本版范围内。
- 离线 `collect-and-judge.ts` 才是真正多平台采集 + AI stance 全管线；live `/evaluate` 目前只跑 baseline，stance 层尚未上线（P1，详见 [`docs/current-state.md`](docs/current-state.md)）。
- TikHub 多平台采集需要付费 key，公开 demo 走 fixture 回放。
- 旗舰案例视觉面板目前是纯数据排版；PixAI logo 或样图待补素材。
- 如果旧 SerpApi/Gemini/TikHub key 曾在聊天或截图里出现过，公开部署前必须轮换。

## 技术栈

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Node test runner
