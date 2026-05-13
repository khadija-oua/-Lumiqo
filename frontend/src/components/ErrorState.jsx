import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import t from '../i18n/fr';
import { apiMessage } from '../api/client';

export default function ErrorState({ error, onRetry, title }) {
  return (
    <div className="error-state">
      <AlertTriangle size={28} color="var(--color-danger)" />
      <div>
        <div className="empty-title">{title || t.common.errorTitle}</div>
        <div className="empty-desc">{apiMessage(error, t.common.errorGeneric)}</div>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t.common.retry}
        </Button>
      ) : null}
    </div>
  );
}
