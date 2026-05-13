import { Inbox } from 'lucide-react';

export default function EmptyState({ icon, title, description, action }) {
  const Icon = icon || Inbox;
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={22} />
      </span>
      {title ? <div className="empty-title">{title}</div> : null}
      {description ? <div className="empty-desc">{description}</div> : null}
      {action ? <div style={{ marginTop: 'var(--space-3)' }}>{action}</div> : null}
    </div>
  );
}
