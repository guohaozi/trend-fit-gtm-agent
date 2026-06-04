import type { Product } from "@/lib/types";
import { formatCategory, RISK_LABELS } from "@/lib/display-labels";

type ProductProfileFormProps = {
  product: Product;
};

export function ProductProfileForm({ product }: ProductProfileFormProps) {
  const rows = [
    ["产品名称", product.name],
    ["品类", formatCategory(product.category)],
    ["目标市场", product.targetMarket.join(", ")],
    ["目标受众", product.audience],
    ["价格区间", product.priceRange],
    ["定位", product.positioning],
    ["品牌语气", product.brandTone],
    ["营销目标", product.campaignGoal],
    ["风险偏好", RISK_LABELS[product.riskTolerance]]
  ];

  return (
    <section className="form-surface" aria-label="产品画像">
      {rows.map(([label, value]) => (
        <label className="field-row" key={label}>
          <span>{label}</span>
          <input value={value} readOnly />
        </label>
      ))}
      <div className="field-row wide">
        <span>核心卖点</span>
        <ul>
          {product.sellingPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="field-row wide">
        <span>竞品</span>
        <p>{product.competitors.join(", ")}</p>
      </div>
    </section>
  );
}
