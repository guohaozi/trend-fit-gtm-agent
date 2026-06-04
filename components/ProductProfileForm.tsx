import type { Product } from "@/lib/types";

type ProductProfileFormProps = {
  product: Product;
};

export function ProductProfileForm({ product }: ProductProfileFormProps) {
  const rows = [
    ["Product name", product.name],
    ["Category", product.category],
    ["Target market", product.targetMarket.join(", ")],
    ["Audience", product.audience],
    ["Price range", product.priceRange],
    ["Positioning", product.positioning],
    ["Brand tone", product.brandTone],
    ["Campaign goal", product.campaignGoal],
    ["Risk tolerance", product.riskTolerance]
  ];

  return (
    <section className="form-surface" aria-label="Product profile">
      {rows.map(([label, value]) => (
        <label className="field-row" key={label}>
          <span>{label}</span>
          <input value={value} readOnly />
        </label>
      ))}
      <div className="field-row wide">
        <span>Selling points</span>
        <ul>
          {product.sellingPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="field-row wide">
        <span>Competitors</span>
        <p>{product.competitors.join(", ")}</p>
      </div>
    </section>
  );
}
