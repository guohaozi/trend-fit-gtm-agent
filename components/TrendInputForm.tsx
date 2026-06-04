import type { Trend } from "@/lib/types";

type TrendInputFormProps = {
  trend: Trend;
};

export function TrendInputForm({ trend }: TrendInputFormProps) {
  const rows = [
    ["Trend name", trend.name],
    ["Platform", trend.platform],
    ["Region", trend.region],
    ["Driven by", trend.drivenBy],
    ["Format", trend.format],
    ["Why it is popular", trend.whyPopular],
    ["Example content", trend.exampleContent],
    ["Known controversy", trend.controversy]
  ];

  return (
    <section className="form-surface" aria-label="Trend input">
      <label className="field-row wide">
        <span>Description</span>
        <textarea value={trend.description} readOnly rows={4} />
      </label>
      {rows.map(([label, value]) => (
        <label className="field-row" key={label}>
          <span>{label}</span>
          <input value={value} readOnly />
        </label>
      ))}
    </section>
  );
}
