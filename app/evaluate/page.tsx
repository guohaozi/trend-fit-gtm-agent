import type { Metadata } from "next";
import { EvaluateClient } from "@/components/EvaluateClient";

export const metadata: Metadata = {
  title: "开始评估 · Trend-Fit",
  description: "填入产品画像和候选热点，拿到确定性的适配评分、门槛后裁决和可下载的 GTM 简报。"
};

export default function EvaluatePage() {
  return <EvaluateClient />;
}
