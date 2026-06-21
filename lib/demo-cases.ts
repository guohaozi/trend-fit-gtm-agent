import aiToolDemo from "@/data/demo_ai_tool.json";
import aiToolEvidenceDemo from "@/data/demo_ai_tool_evidence.json";
import pixaiDemo from "@/data/demo_pixai.json";
import pixaiEvidenceDemo from "@/data/demo_pixai_evidence.json";
import fashionDemo from "@/data/demo_fashion.json";
import fashionEvidenceDemo from "@/data/demo_fashion_evidence.json";
import proteinDrinkDemo from "@/data/demo_protein_drink.json";
import proteinDrinkEvidenceDemo from "@/data/demo_protein_drink_evidence.json";
import roboticsDemo from "@/data/demo_robotics.json";
import snackDemo from "@/data/demo_snack.json";
import snackEvidenceDemo from "@/data/demo_snack_evidence.json";
import {
  BAND_LABELS,
  DECISION_TYPE_LABELS,
  EVIDENCE_GATE_LABELS,
  formatCategory,
  formatQualifier,
  RISK_LABELS,
  STABILITY_LABELS
} from "@/lib/display-labels";
import { adjustScores, type EvidenceAdjustmentCase } from "@/lib/evidence-adjustment";
import {
  applyRecommendationRigor,
  calculateTrendFitWithProfile,
  normalizeWeightProfile,
  PROFILE_OPTIONS
} from "@/lib/recommendation-rigor";
import type { Band, DemoCase, ScoreKey } from "@/lib/types";

export const DEMO_CASES = [
  fashionDemo,
  roboticsDemo,
  aiToolDemo,
  pixaiDemo,
  snackDemo,
  proteinDrinkDemo
] as DemoCase[];

export const DEFAULT_DEMO_ID = "demo_fashion";

export const REPORT_FILES: Record<string, string> = {
  demo_fashion: "demo_fashion_report.md",
  demo_robotics: "demo_robotics_report.md",
  demo_ai_tool: "demo_ai_tool_report.md",
  demo_pixai: "demo_pixai_report.md",
  demo_snack: "demo_snack_report.md",
  demo_protein_drink: "demo_protein_drink_report.md"
};

export const EVIDENCE_CASES = [
  fashionEvidenceDemo,
  aiToolEvidenceDemo,
  pixaiEvidenceDemo,
  snackEvidenceDemo,
  proteinDrinkEvidenceDemo
] as EvidenceAdjustmentCase[];

export const DIMENSION_META: Array<{
  key: ScoreKey;
  label: string;
  weightLabel: string;
  question: string;
}> = [
  {
    key: "audienceOverlap",
    label: "受众重合度",
    weightLabel: "20%",
    question: "趋势受众是否和产品目标用户重合？"
  },
  {
    key: "useCaseRelevance",
    label: "使用场景相关性",
    weightLabel: "20%",
    question: "产品加入这个热点是否自然、不牵强？"
  },
  {
    key: "messageBridge",
    label: "卖点桥接",
    weightLabel: "15%",
    question: "热点能否顺畅连接到真实卖点？"
  },
  {
    key: "creativeFeasibility",
    label: "内容可执行性",
    weightLabel: "15%",
    question: "团队是否能产出适合平台语境的内容？"
  },
  {
    key: "commercialIntent",
    label: "商业意图",
    weightLabel: "10%",
    question: "受众是否接近购买、试用或咨询心态？"
  },
  {
    key: "brandSafety",
    label: "品牌安全",
    weightLabel: "10%",
    question: "是否存在声誉、价值观或表达风险？"
  },
  {
    key: "timingSaturation",
    label: "时机与饱和度",
    weightLabel: "10%",
    question: "现在进入是否仍有差异化空间？"
  }
];

type ReportCopy = {
  productName: string;
  trendName: string;
  recommendation: string;
  fitRead: string;
  angle: {
    primary: string;
    alternatives: string[];
  };
  contentIdeas: string[];
  risks: string[];
  voice: string;
  useWords: string[];
  avoidWords: string[];
  creatorTypes: string;
  launchTest: string;
};

const REPORT_COPY: Record<string, ReportCopy> = {
  demo_fashion: {
    productName: "Northbound Supply Co.",
    trendName: "静奢风男装",
    recommendation:
      "适合跟进，但不要把传播重点放在阶层、old money 身份或“装有钱”上。更稳的打法是强调干净、耐穿、有质感，以及普通预算也能穿出利落感。",
    fitRead:
      "产品本身就是干净基础款和中端价位，和静奢风需要的低调、合身、少 logo 很自然地接在一起。主要风险不在产品，而在表达：如果文案太像财富崇拜，会引发阶层感和“假精英”反感。",
    angle: {
      primary: "不用奢侈品预算，也能穿得干净有质感。",
      alternatives: ["通勤也能穿的高级感基础款。", "把钱花在版型和面料上，而不是 logo 上。"]
    },
    contentIdeas: [
      "做一组“150 美元以内通勤穿搭”短视频，展示每件单品价格和上身效果。",
      "拍摄“高调奢华 vs 低调质感”的对比内容，让产品成为自然选择。",
      "用面料、版型、领口和裤型的近景镜头，强化质感而不是炫耀。",
      "邀请男装微型创作者做一周通勤搭配，测试收藏、加购和评论里的购买意图。"
    ],
    risks: [
      "避免使用“富人感”“老钱身份”“阶层跃升”等表达。",
      "不要暗示消费者应该模仿某个阶层，重点放在穿着场景和真实预算。",
      "如果评论区开始讨论“装有钱”，应立刻把文案拉回版型、舒适度和价格透明。"
    ],
    voice: "克制、实用、笃定，像懂穿搭的朋友给出建议，而不是品牌在贩卖身份幻想。",
    useWords: ["干净", "利落", "有质感", "通勤", "耐穿", "基础款", "真实预算"],
    avoidWords: ["富人感", "阶层", "精英", "装有钱", "假奢华", "old money 身份"],
    creatorTypes: "优先找 1 万到 15 万粉的男装、通勤穿搭、日常生活方式创作者。不要优先找纯奢侈品 haul 创作者，他们的价格信号不匹配。",
    launchTest: "先送样给 3 到 5 位男装微型创作者，统一测试“真实预算穿出质感”的表达，观察评论、收藏、站内搜索和加购，再决定是否放大投放。"
  },
  demo_robotics: {
    productName: "Hearth Robotics Companion",
    trendName: "智能家居设备展示",
    recommendation:
      "建议跟进，但传播重点必须是可信演示，而不是科幻式承诺。家庭机器人用户最在意它到底能做什么、是否可靠、是否侵犯隐私。",
    fitRead:
      "产品本身就是智能家居设备，天然适合进入家居 setup、真实使用日记和科技测评内容。限制在于硬件信任门槛较高：如果画面太像广告，用户会怀疑是否摆拍；如果承诺太满，又会引发隐私和过度自动化担忧。",
    angle: {
      primary: "我让家用机器人帮忙 7 天，这是真实体验。",
      alternatives: ["它能做什么，也不能做什么。", "一个忙碌家庭实际会用到的家用机器人。"]
    },
    contentIdeas: [
      "做 7 天真实使用日记，展示有用场景，也展示限制和失败片段。",
      "拍“它看得到什么、看不到什么”的隐私解释视频，把最大顾虑变成信任点。",
      "用晨间流程、宠物互动、家庭整理等真实场景做短视频，而不是棚拍大片。",
      "邀请以诚实测评著称的智能家居创作者做长视频和短视频切片。"
    ],
    risks: [
      "不要说“完全替代人”或“自动打理整个家”。",
      "隐私、摄像头、传感器权限必须解释清楚。",
      "演示要可复现，不要只展示理想条件下的一次性效果。"
    ],
    voice: "温暖、可信、实用，轻微未来感即可。越是硬件产品，越要少夸张、多展示。",
    useWords: ["真实使用", "日常帮手", "可靠", "简单设置", "你保持控制", "隐私可控"],
    avoidWords: ["替代人类", "全自动生活", "什么都能做", "科幻管家", "无懈可击"],
    creatorTypes: "优先找智能家居测评、家庭生活方式、宠物家庭和科技 YouTube 创作者，尤其是会讲缺点的测评人。",
    launchTest: "先做一条 7 天真实体验和一条隐私解释内容，观察评论区对信任、隐私、实用性的反馈，再决定是否进入付费投放。"
  },
  demo_pixai: {
    productName: "PixAI",
    trendName: "AI 生成原创动漫角色（OC）",
    recommendation:
      "建议跟进，但仅适合小规模测试。产品和热点契合度极高，但真实社区里存在版权争议和动漫圈反对，必须先用小测试观察舆情风向。",
    fitRead:
      "PixAI 的核心场景就是用 AI 生成原创角色，与「捏崽 / OC / 自设」趋势天然契合：受众重合、场景自然、卖点直连。真实证据也确认了付费意愿（用户在讨论会员是否值得），但同时把品牌安全压到了 25——日本动漫圈对 AI 艺术有强烈反对，画师抗议未授权训练，NSFW 内容也是隐忧。",
    angle: {
      primary: "把「拥有专属画师」从绘师手作变成人人可达的二次元体验。",
      alternatives: ["不会画画也能有自己的 OC。", "捏崽、训 LoRA、出图——三步搞定属于你的角色。"]
    },
    contentIdeas: [
      "录屏展示从描述词到 OC 成品的完整捏崽过程，强调创作乐趣而非取代画师。",
      "做「我的 OC 设定卡」教程，引导用户用 PixAI 训练专属 LoRA。",
      "邀请二次元创作者分享 OC 故事，把工具放在第二位，角色和情感放在第一位。",
      "在小红书发布短笔记，避开 Reddit/X 上对 AI 艺术更敏感的英文社区。"
    ],
    risks: [
      "不要使用其他画师作品训练或营销，避免「抄袭画风」争议。",
      "在内容中清晰区分 AI 辅助与原创，尊重画师群体的诉求。",
      "如果遇到「AI slop」「未授权训练」类负面评论，要正面回应而不是装作没看见。",
      "NSFW 内容必须按平台规则严格管控，避免被关联到不安全品牌形象。"
    ],
    voice: "对二次元用户友好、尊重创作圈、不抢画师风头。把工具定位成「让你拥有专属画师」，而不是「替代画师」。",
    useWords: ["原创角色", "OC", "捏崽", "二次元", "自设", "LoRA", "角色设定"],
    avoidWords: ["替代画师", "免费抄袭", "AI 神作", "比画师还好", "无限二创"],
    creatorTypes: "优先找二次元同人画师、VTuber、ACG 测评、原创角色创作者，避免对 AI 艺术持强烈反对态度的硬核画师社区。",
    launchTest: "先在小红书做小规模捏崽内容测试（3-5 条），观察评论区对 AI 艺术、版权、付费的反应；如果舆情可控再投放，否则保持低调先把社区好感攒起来。"
  },
  demo_ai_tool: {
    productName: "Snapforge AI",
    trendName: "图片前后对比",
    recommendation:
      "适合跟进。产品产出的内容形式和趋势本身高度一致，但需要用真实可复现的工作流来区分，而不是只展示夸张变形。",
    fitRead:
      "前后对比是修图工具最容易理解的表达方式：用户一眼就能看到原图到成片的变化。风险是同类内容已经很多，且用户对过度修饰、虚假头像和 AI 感很敏感，所以要把重点放在速度、批量工作流和真实素材。",
    angle: {
      primary: "把原始照片快速变成能发布、能售卖的视觉素材。",
      alternatives: ["10 秒完成一张产品图。", "真实照片、真实流程、真实结果。"]
    },
    contentIdeas: [
      "录屏展示一张普通产品图如何变成可上架图片，并保留完整操作过程。",
      "做“午饭前修完一整组商品图”的批量工作流内容。",
      "用不完美的真实输入图做演示，主动避免过度美化。",
      "对比手动修图与工具修图的时间成本，把节省时间作为卖点。"
    ],
    risks: [
      "避免承诺“完美脸”“换身份”“一键变真人大片”。",
      "不要用不可复现的夸张案例诱导购买。",
      "如果平台或评论区出现“假”“AI 垃圾感”反馈，应转向真实工作流证明。"
    ],
    voice: "创作者给创作者分享效率工具的语气：直接、实用、少玄学，用结果和流程说服。",
    useWords: ["前后对比", "真实照片", "创作者工作流", "商品图", "批量处理", "省时间"],
    avoidWords: ["完美脸", "换身份", "不真实", "一键奇迹", "完全自动"],
    creatorTypes: "优先找工具测评、跨境电商、摄影教学、设计教程和创作者工作流账号；他们的受众更容易转化为注册和付费。",
    launchTest: "先投 3 到 5 条真实录屏内容，分别测试商品图、头像、批量处理三个角度，以注册率和付费转化作为放大依据。"
  },
  demo_snack: {
    productName: "CrunchCraft Minis",
    trendName: "迪拜风开心果脆巧克力",
    recommendation:
      "建议跟进，但适合作为限量上新测试，不适合直接做大规模品牌重塑。这个热点有强视觉和强试吃动机，同时也已经比较拥挤。",
    fitRead:
      "产品能自然接入这个热点：脆响、夹心、掰开瞬间和限量发售都很适合短视频。主要风险是被看作跟风复制，或因为“迪拜”标签引发产地和真实性误解。",
    angle: {
      primary: "把爆火开心果脆感做成更容易尝试的小包装。",
      alternatives: ["不用高价，也能试试这口开心果脆。", "掰开、听脆响、尝一口限量新口味。"]
    },
    contentIdeas: [
      "拍掰开特写和咬下去的声音，让馅料和脆感成为第一视觉。",
      "做“高价原版 vs 小包装尝鲜”的价格诚实测试。",
      "邀请零食测评创作者按脆度、开心果味、甜度打分。",
      "用限量批次和投票机制测试下一款口味，而不是一次性铺太大。"
    ],
    risks: [
      "不要声称自己是正宗迪拜原版。",
      "包装和文案要用“迪拜风”“开心果脆感”，避免产地误导。",
      "如果评论集中质疑价格和跟风，应强调小包装、低试错成本和真实口感。"
    ],
    voice: "轻松、感官、直接，不装奢华。像一个零食品牌邀请用户试一口新口味。",
    useWords: ["开心果", "脆感", "小包装", "限量", "掰开", "尝鲜", "分享装"],
    avoidWords: ["正宗迪拜", "奢华", "稀有", "贵族", "健康", "原版"],
    creatorTypes: "优先找零食测评、便利店新品、甜品和预算美食创作者。不要找奢侈生活方式账号。",
    launchTest: "先做小批量限量上新，找零食创作者做开箱和试吃，重点看售罄速度、复购意愿和关于价格/真实性的负面评论。"
  },
  demo_protein_drink: {
    productName: "FitMilk Daily Protein",
    trendName: "日常蛋白补充",
    recommendation:
      "建议跟进。它不是健身房专属补剂，而是把蛋白补充变成早餐、办公室和轻运动场景里的日常饮品。",
    fitRead:
      "即饮蛋白奶能降低用户进入门槛：不用摇粉、不像代餐、也不要求用户把自己定义成健身人群。核心机会在于便利店和日常场景教育；核心风险是减脂、代餐和健康宣称过度。",
    angle: {
      primary: "不是健身补剂，是每天都能顺手喝的蛋白饮品。",
      alternatives: ["早餐来不及，也能补一点蛋白。", "办公室下午四点，比甜饮更稳的一瓶。"]
    },
    contentIdeas: [
      "拍便利店蛋白饮品发现内容，对比普通甜饮和蛋白奶。",
      "展示没时间吃早餐时的组合：蛋白奶加水果或面包。",
      "做轻运动后的真实补给场景，不把它包装成健美补剂。",
      "用营养师或健康生活创作者解释蛋白、糖和热量，不做焦虑型内容。"
    ],
    risks: [
      "不要承诺快速减肥、燃脂或替代正餐。",
      "包装和详情页要清楚标注蛋白、糖、热量、乳糖和过敏信息。",
      "不要把它描述成医疗营养或疾病管理产品。"
    ],
    voice: "实用、日常、健康但不制造焦虑。重点是帮助用户稳定生活习惯，而不是制造身材压力。",
    useWords: ["日常蛋白", "即饮", "早餐空档", "办公室加餐", "轻运动", "习惯支持"],
    avoidWords: ["快速瘦", "代餐", "燃脂", "改变体质", "不吃饭也行"],
    creatorTypes: "优先找轻健身、办公室生活、便利店新品、营养科普和小红书健康习惯创作者。避免极端减脂和夸张前后对比账号。",
    launchTest: "先在便利店密度高、办公和轻健身人群重合的城市做小范围测试，配合 2 到 3 个口味和创作者种草，看试饮、复购和评论里的健康顾虑。"
  }
};

function formatList(values: string[]): string {
  return values.length ? values.join("、") : "暂无";
}

function profileLabel(profileId: string | undefined): string {
  return PROFILE_OPTIONS.find((profile) => profile.id === profileId)?.label ?? "默认平衡";
}

function bandLabel(band: Band | undefined): string {
  return band ? BAND_LABELS[band] : "未知";
}

function dimensionLabel(key: ScoreKey): string {
  return DIMENSION_META.find((dimension) => dimension.key === key)?.label ?? key;
}

function slotLabel(slot: string): string {
  if (slot === "audienceOrUseCase") return "受众或使用场景";
  return DIMENSION_META.find((dimension) => dimension.key === slot)?.label ?? slot;
}

export function getDemoCase(id?: string | null): DemoCase {
  return DEMO_CASES.find((demo) => demo.id === id) ?? DEMO_CASES[0];
}

export function getDemoResult(id?: string | null, profileInput?: string | null) {
  const demo = getDemoCase(id);
  const profile = normalizeWeightProfile(profileInput ?? demo.profileUsed);
  return calculateTrendFitWithProfile(demo.scores, demo.product.riskTolerance, profile, {
    qualifier: demo.expectedQualifier
  });
}

export function getDemoRigorResult(id?: string | null, profileInput?: string | null) {
  const demo = getDemoCase(id);
  const profile = normalizeWeightProfile(profileInput ?? demo.profileUsed);
  const result = calculateTrendFitWithProfile(demo.scores, demo.product.riskTolerance, profile, {
    qualifier: demo.expectedQualifier
  });

  return {
    result,
    rigor: applyRecommendationRigor({
      scores: demo.scores,
      result,
      profile,
      evidence: []
    })
  };
}

export function getEvidenceCase(id?: string | null): EvidenceAdjustmentCase | null {
  const demo = getDemoCase(id);
  return EVIDENCE_CASES.find((evidenceCase) => evidenceCase.case === demo.id) ?? null;
}

export function getEvidenceResult(id?: string | null, profileInput?: string | null) {
  const demo = getDemoCase(id);
  const evidenceCase = getEvidenceCase(demo.id);
  if (!evidenceCase) return null;

  const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
  const profile = normalizeWeightProfile(profileInput ?? evidenceCase.profileUsed ?? demo.profileUsed);
  const adjustedResult = calculateTrendFitWithProfile(adjustment.adjusted, demo.product.riskTolerance, profile, {
    qualifier: demo.expectedQualifier
  });
  const rigor = applyRecommendationRigor({
    scores: adjustment.adjusted,
    result: adjustedResult,
    profile,
    evidence: evidenceCase.evidence
  });

  return {
    evidenceCase,
    adjustment,
    adjustedResult,
    rigor
  };
}

export function getReportMarkdown(id?: string | null): string {
  const demo = getDemoCase(id);
  const copy = REPORT_COPY[demo.id];
  const baseline = getDemoResult(demo.id, demo.profileUsed);
  const evidenceResult = getEvidenceResult(demo.id, demo.profileUsed);
  const rigor = evidenceResult?.rigor ?? getDemoRigorResult(demo.id, demo.profileUsed).rigor;
  const reportScores = evidenceResult?.adjustment.adjusted ?? demo.scores;
  const titleProduct = copy?.productName ?? demo.product.name.replace(" (demo)", "");
  const titleTrend = copy?.trendName ?? demo.trend.name;
  const evidenceSummary = evidenceResult
    ? [
        `- 证据修正后分数：**${evidenceResult.adjustedResult.total}/100**`,
        `- 证据修正后建议：**${bandLabel(evidenceResult.rigor.gatedBand)}**`,
        `- 证据门槛：**${EVIDENCE_GATE_LABELS[evidenceResult.rigor.evidenceGate] ?? evidenceResult.rigor.evidenceGate}**`
      ]
    : ["- 当前案例还没有结构化证据修正版，建议先用小规模测试补齐证据。"];

  const lines = [
    `# ${titleProduct} × ${titleTrend} 热点适配简报`,
    "",
    `> 这份简报用于判断「${titleProduct}」是否值得跟进「${titleTrend}」这个热点，并把结论转成可执行的增长动作。`,
    "",
    "## 1. 最终建议",
    "",
    `**${bandLabel(rigor.gatedBand)}。** ${copy?.recommendation ?? "建议先做小规模验证，再决定是否扩大预算。"}`,
    "",
    `- 基准分：**${baseline.total}/100**`,
    `- 基准判断：**${bandLabel(baseline.recommendation.finalBand)}${formatQualifier(baseline.recommendation.qualifier) ? `（${formatQualifier(baseline.recommendation.qualifier)}）` : ""}**`,
    `- 证据门槛后判断：**${bandLabel(rigor.gatedBand)}**`,
    `- 证据门槛：**${EVIDENCE_GATE_LABELS[rigor.evidenceGate] ?? rigor.evidenceGate}**`,
    `- 稳定性：**${STABILITY_LABELS[rigor.recommendationStability] ?? rigor.recommendationStability}**`,
    `- 建议动作：**${DECISION_TYPE_LABELS[rigor.decisionType] ?? rigor.decisionType}**`,
    "",
    "## 2. 为什么适合或不适合",
    "",
    copy?.fitRead ?? `${demo.product.positioning} 与 ${demo.trend.description} 有一定关联，但仍需要补充真实市场和渠道证据。`,
    "",
    "## 3. 评分明细",
    "",
    `评分模型：**${profileLabel(demo.profileUsed)}**；风险偏好：**${RISK_LABELS[demo.product.riskTolerance]}**。`,
    "",
    "| 维度 | 权重 | 分数 | 判断依据 |",
    "|------|------|------|----------|",
    ...DIMENSION_META.map((dimension) => {
      return `| ${dimension.label} | ${dimension.weightLabel} | ${reportScores[dimension.key]} | ${dimension.question} |`;
    }),
    "",
    "## 4. 营销切入点",
    "",
    `**主切入点：**${copy?.angle.primary ?? "先用低成本内容验证用户是否愿意参与这个热点。"}`,
    ...(copy?.angle.alternatives.map((angle, index) => `- 备选 ${index + 1}：${angle}`) ?? []),
    "",
    "## 5. 内容方向",
    "",
    ...(copy?.contentIdeas.map((idea) => `- ${idea}`) ?? ["- 做一组低成本内容测试，观察点击、收藏、评论和转化信号。"]),
    "",
    "## 6. 风险与边界",
    "",
    ...(copy?.risks.map((risk) => `- ${risk}`) ?? ["- 不要把热点包装成未经验证的确定性增长机会。"]),
    "",
    "## 7. 品牌语气与用词",
    "",
    copy?.voice ?? "语气应保持真实、具体、可验证，避免过度承诺。",
    "",
    `- 推荐使用：${formatList(copy?.useWords ?? [])}`,
    `- 避免使用：${formatList(copy?.avoidWords ?? [])}`,
    "",
    "## 8. 合作人群",
    "",
    copy?.creatorTypes ?? "优先选择受众与产品目标人群重合、内容风格真实、评论区购买意图清晰的创作者。",
    "",
    "## 9. 证据状态",
    "",
    ...evidenceSummary,
    `- 仍需补齐：${rigor.gateMissing.length ? rigor.gateMissing.map(slotLabel).join("、") : "暂无阻塞型证据缺口"}`,
    `- 高分但证据不足的维度：${rigor.dimensionCaps.length ? rigor.dimensionCaps.map(dimensionLabel).join("、") : "暂无"}`,
    "",
    "## 10. 下一步测试",
    "",
    copy?.launchTest ?? "先用一个小预算内容测试验证用户反应，再根据转化和评论质量决定是否放大。",
    ""
  ];

  return lines.join("\n");
}

export function getReportFileName(id?: string | null): string {
  const demo = getDemoCase(id);
  return REPORT_FILES[demo.id];
}

export function getCaseLabel(demo: DemoCase): string {
  return `${formatCategory(demo.product.category)} × ${demo.trend.name}`;
}

export const FEATURED_CASE_META: Array<{
  id: string;
  title: string;
  image: string;
  logo?: string;
  note: string;
}> = [
  {
    id: "demo_fashion",
    title: "中端男装 × 静奢风",
    image: "/case-studies/quiet-luxury-fashion.png",
    note: "适合先做内容测试，再决定是否扩大预算。"
  },
  {
    id: "demo_pixai",
    title: "PixAI × AI 生成原创动漫角色（OC）",
    image: "/case-studies/作品.png",
    logo: "/case-studies/logo.png",
    note: "契合度极高，但真实社区把品牌安全压到 25，只适合小规模测试。"
  },
  {
    id: "demo_snack",
    title: "零食 × 迪拜风开心果脆",
    image: "/case-studies/dubai-chocolate.png",
    note: "适合限量上新测试，不适合直接做大规模品牌重塑。"
  }
];

export const INTERVIEW_DEMO_ID = "demo_pixai";

export type FeaturedCaseCard = (typeof FEATURED_CASE_META)[number] & {
  baselineTotal: number;
  adjustedTotal: number;
  decisionBand: Band;
};

export function isFeaturedCase(id?: string | null): boolean {
  return FEATURED_CASE_META.some((meta) => meta.id === id);
}

export function getFeaturedCaseCards(): FeaturedCaseCard[] {
  return FEATURED_CASE_META.map((meta) => {
    const evidence = getEvidenceResult(meta.id);
    if (!evidence) {
      throw new Error(`精选案例 ${meta.id} 缺少证据修正结果。`);
    }
    return {
      ...meta,
      baselineTotal: getDemoResult(meta.id).total,
      adjustedTotal: evidence.adjustedResult.total,
      decisionBand: evidence.rigor.gatedBand
    };
  });
}
