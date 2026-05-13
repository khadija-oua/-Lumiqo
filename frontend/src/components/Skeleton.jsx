export default function Skeleton({ height = 16, width = '100%', radius = 'var(--radius-md)', style }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

export function SkeletonStack({ rows = 3, height = 60, gap = 12 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}
