import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import * as adminApi from '../../api/admin';
import * as coursesApi from '../../api/courses';
import { SkeletonStack } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import t from '../../i18n/fr';

export default function AdminDashboard() {
  const { user } = useAuth();
  const users = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.listUsers });
  const courses = useQuery({ queryKey: ['all-courses'], queryFn: coursesApi.listCourses });

  const loading = users.isLoading || courses.isLoading;

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">{t.dashboard.greeting(user.first_name)}</h1>
        <p className="page-subtitle">{t.dashboard.adminSubtitle}</p>
      </header>

      <section className="page-section">
        <h2 className="page-section-title">Statistiques</h2>
        {loading ? (
          <SkeletonStack rows={1} height={90} />
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">{t.dashboard.statUsers}</div>
              <div className="stat-value">{users.data?.length ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t.dashboard.statCourses}</div>
              <div className="stat-value">{courses.data?.length ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t.dashboard.statQuizzes}</div>
              <div className="stat-value">—</div>
            </div>
          </div>
        )}
      </section>

      <section className="page-section">
        <h2 className="page-section-title">{t.dashboard.activityFeed}</h2>
        {/* TODO: backend doesn't expose a platform-wide activity feed yet. */}
        <EmptyState description={t.dashboard.activityComingSoon} />
      </section>
    </>
  );
}
