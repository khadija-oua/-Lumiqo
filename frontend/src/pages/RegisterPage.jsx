import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { apiMessage } from '../api/client';
import t from '../i18n/fr';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = t.auth.requiredField;
    if (!form.lastName.trim()) e.lastName = t.auth.requiredField;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t.auth.emailInvalid;
    if (form.password.length < 8) e.password = t.auth.passwordTooShort;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success(t.auth.welcomeToast);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(apiMessage(err, t.auth.registerFailed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
        {t.auth.registerTitle}
      </h1>
      <form onSubmit={onSubmit} className="stack" noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <Input
            label={t.auth.firstName}
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            error={errors.firstName}
            autoFocus
          />
          <Input
            label={t.auth.lastName}
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            error={errors.lastName}
          />
        </div>
        <Input
          label={t.auth.email}
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
        <Input
          label={t.auth.password}
          type="password"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          helper="8 caractères minimum."
        />
        <fieldset
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            display: 'flex',
            gap: 'var(--space-4)',
          }}
        >
          <legend
            style={{
              padding: '0 var(--space-2)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {t.auth.role}
          </legend>
          <label className="hstack">
            <input
              type="radio"
              name="role"
              value="student"
              checked={form.role === 'student'}
              onChange={() => set('role', 'student')}
            />
            <span>{t.auth.roleStudent}</span>
          </label>
          <label className="hstack">
            <input
              type="radio"
              name="role"
              value="teacher"
              checked={form.role === 'teacher'}
              onChange={() => set('role', 'teacher')}
            />
            <span>{t.auth.roleTeacher}</span>
          </label>
        </fieldset>
        <Button type="submit" loading={loading} size="lg">
          {t.auth.registerSubmit}
        </Button>
      </form>
      <div className="auth-footer">
        <Link to="/login">{t.auth.haveAccount}</Link>
      </div>
    </AuthLayout>
  );
}
