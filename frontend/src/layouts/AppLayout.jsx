import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  MessagesSquare,
  Sparkles,
  User,
  GraduationCap,
  Users,
  Shield,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import t from '../i18n/fr';

const STUDENT_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: t.nav.dashboard },
  { to: '/courses', icon: BookOpen, label: t.nav.coursesStudent },
  { to: '/chat', icon: MessagesSquare, label: t.nav.chat },
  { to: '/profile', icon: Sparkles, label: t.nav.learningPath },
  { to: '/vark', icon: User, label: t.nav.profile },
];

const TEACHER_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: t.nav.dashboard },
  { to: '/courses', icon: BookOpen, label: t.nav.coursesTeacher },
  { to: '/dashboard', icon: GraduationCap, label: t.nav.students },
];

const ADMIN_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: t.nav.dashboard },
  { to: '/admin', icon: Users, label: t.nav.users },
  { to: '/courses', icon: BookOpen, label: t.nav.coursesAdmin },
];

function navForRole(role) {
  if (role === 'admin') return ADMIN_NAV;
  if (role === 'teacher') return TEACHER_NAV;
  return STUDENT_NAV;
}

function roleLabel(role) {
  if (role === 'admin') return 'Administrateur';
  if (role === 'teacher') return 'Enseignant';
  return 'Étudiant';
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile nav on route change.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const items = navForRole(user?.role);
  const fullName = user ? `${user.first_name} ${user.last_name}` : '';

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        {t.common.skipToContent}
      </a>

      <div className={`sidebar-scrim ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Navigation principale">
        <div className="sidebar-brand">
          <Link to="/dashboard" style={{ display: 'inline-flex' }} aria-label="Lumiqo">
            <Logo size="md" />
          </Link>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="sidebar-item-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Shield className="sidebar-item-icon" />
              <span>{t.nav.admin}</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <Avatar name={fullName} size="md" />
            <div className="user-card-info">
              <span className="user-card-name">{fullName}</span>
              <span className="user-card-role">
                <Badge role={user?.role}>{roleLabel(user?.role)}</Badge>
              </span>
            </div>
          </div>
          <div className="sidebar-actions">
            <button
              className="btn btn-ghost btn-icon-only btn-sm"
              onClick={toggle}
              aria-label={t.common.toggleTheme}
              title={t.common.toggleTheme}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => signOut()}
              aria-label={t.common.logout}
            >
              <LogOut size={16} />
              <span>{t.common.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="mobile-topbar">
          <button
            className="btn btn-ghost btn-icon-only"
            aria-label={t.common.openMenu}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Logo size="sm" />
          <button
            className="btn btn-ghost btn-icon-only"
            aria-label={t.common.toggleTheme}
            onClick={toggle}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <main id="main" className="main-content">
          <Outlet />
        </main>
      </div>

      {mobileOpen && (
        <button
          className="sr-only"
          onClick={() => setMobileOpen(false)}
          aria-label={t.common.closeMenu}
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
