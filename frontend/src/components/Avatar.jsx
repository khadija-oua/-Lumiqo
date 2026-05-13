import { colorFromName, initials } from '../utils/format';

export default function Avatar({ name, size = 'md', overrideInitials, color, title }) {
  const text = overrideInitials || initials(name);
  const bg = color || colorFromName(name || text);
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ background: bg }}
      title={title || name}
      aria-hidden
    >
      {text}
    </span>
  );
}
