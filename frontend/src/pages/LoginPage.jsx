import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { apiMessage } from '../api/client';
import t from '../i18n/fr';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t.auth.emailInvalid;
    if (!password) e.password = t.auth.requiredField;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      toast.success(t.auth.welcomeToast);
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(apiMessage(err, t.auth.loginFailed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
        {t.auth.loginTitle}
      </h1>
      <form onSubmit={onSubmit} className="stack" noValidate>
        <Input
          label={t.auth.email}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoFocus
        />
        <Input
          label={t.auth.password}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" loading={loading} size="lg">
          {t.auth.loginSubmit}
        </Button>
      </form>
      <div className="auth-footer">
        <Link to="/register">{t.auth.needAccount}</Link>
      </div>
    </AuthLayout>
  );
}
