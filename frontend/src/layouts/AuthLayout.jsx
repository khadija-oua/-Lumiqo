import Logo from '../components/Logo';
import t from '../i18n/fr';

export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        <Logo size="lg" />
        <div className="auth-tagline">{t.app.tagline}</div>
      </div>
      <div className="auth-card">{children}</div>
    </main>
  );
}
