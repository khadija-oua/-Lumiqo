export default function ProgressBar({ value = 0, max = 100, ariaLabel }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
