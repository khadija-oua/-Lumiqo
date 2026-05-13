import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import * as coursesApi from '../api/courses';
import * as enrollmentsApi from '../api/enrollments';
import CourseCard from '../components/CourseCard';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonStack } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import t from '../i18n/fr';

export default function CoursesListPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const courses = useQuery({ queryKey: ['all-courses'], queryFn: coursesApi.listCourses });
  const enrolled = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: enrollmentsApi.myEnrollments,
    enabled: user.role === 'student',
  });

  const enrolledIds = useMemo(
    () => new Set((enrolled.data || []).map((c) => c.id)),
    [enrolled.data],
  );

  const filtered = useMemo(() => {
    const list = courses.data || [];
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((c) => c.title.toLowerCase().includes(q));
  }, [courses.data, query]);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">{t.courses.listTitle}</h1>
        <p className="page-subtitle">{t.courses.listSubtitle}</p>
      </header>

      <div
        className="hstack"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          marginBottom: 'var(--space-6)',
          maxWidth: 420,
        }}
      >
        <Search size={16} color="var(--text-muted)" />
        <input
          aria-label={t.common.search}
          placeholder={t.courses.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            border: 0,
            outline: 'none',
            background: 'transparent',
            flex: 1,
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {courses.isLoading ? (
        <SkeletonStack rows={3} height={140} />
      ) : courses.error ? (
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun cours" description="Aucun cours ne correspond à cette recherche." />
      ) : (
        <div className="card-grid">
          {filtered.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              to={
                user.role === 'teacher' && c.teacher_id === user.id
                  ? `/courses/${c.id}/manage`
                  : `/courses/${c.id}`
              }
              showEnrollmentBadge={user.role === 'student'}
              enrolled={enrolledIds.has(c.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
