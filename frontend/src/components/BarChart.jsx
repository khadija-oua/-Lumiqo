// Tiny horizontal bar chart for the VARK score breakdown.

export default function BarChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} className="bar-row">
          <div className="bar-row-label">{r.label}</div>
          <div className="bar-row-track">
            <div
              className="bar-row-fill"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: r.color || 'var(--color-accent)',
              }}
            />
          </div>
          <div className="bar-row-value">{r.value}</div>
        </div>
      ))}
    </div>
  );
}
