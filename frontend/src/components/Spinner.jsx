export default function Spinner({ size = 'sm', label = 'Chargement' }) {
  const cls = size === 'lg' ? 'spinner spinner-lg' : 'spinner';
  return <span className={cls} role="status" aria-label={label} />;
}
