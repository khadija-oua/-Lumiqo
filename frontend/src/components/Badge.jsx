const ROLE_VARIANT = {
  admin: 'danger',
  teacher: 'brand',
  student: 'info',
};

export default function Badge({ variant = 'default', role, children, className = '' }) {
  const resolved = role ? ROLE_VARIANT[role] || 'default' : variant;
  const klass = ['badge', resolved !== 'default' ? `badge-${resolved}` : '', className]
    .filter(Boolean)
    .join(' ');
  return <span className={klass}>{children}</span>;
}
