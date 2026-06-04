import type { Trend } from "@/lib/types";

type TrendInputFormProps = {
  trend: Trend;
};

export function TrendInputForm({ trend }: TrendInputFormProps) {
  const rows = [
    ["热点名称", trend.name],
    ["平台", trend.platform],
    ["地区", trend.region],
    ["主要推动者", trend.drivenBy],
    ["内容形式", trend.format],
    ["流行原因", trend.whyPopular],
    ["示例内容", trend.exampleContent],
    ["已知争议", trend.controversy]
  ];

  return (
    <section className="form-surface" aria-label="热点输入">
      <label className="field-row wide">
        <span>热点描述</span>
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
