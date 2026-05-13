import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import t from '../i18n/fr';

export default function NotFoundPage() {
  return (
    <main className="auth-layout">
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <Logo size="lg" />
        <h1 style={{ fontSize: 'var(--text-3xl)', marginTop: 'var(--space-6)' }}>
          {t.notFound.title}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
          {t.notFound.body}
        </p>
        <Link
          to="/"
          className="btn btn-primary btn-md"
          style={{ marginTop: 'var(--space-6)', display: 'inline-flex' }}
        >
          {t.notFound.backHome}
        </Link>
      </div>
    </main>
  );
}
