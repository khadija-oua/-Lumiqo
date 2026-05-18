import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
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

  // Teachers see only their own courses; admin/student see everything.
  const scoped = useMemo(() => {
    if (user.role !== 'teacher') return courses.data || [];
    return (courses.data || []).filter((c) => c.teacher_id === user.id);
  }, [courses.data, user]);

  const filtered = useMemo(() => {
    if (!query.trim()) return scoped;
    const q = query.trim().toLowerCase();
    return scoped.filter((c) => c.title.toLowerCase().includes(q));
  }, [scoped, query]);

  const pageTitle = user.role === 'teacher' ? t.nav.coursesTeacher : t.courses.listTitle;
  const pageSubtitle = user.role === 'teacher' ? null : t.courses.listSubtitle;

  return (
    <>
      <header className="page-header">
        <div className="hstack-between" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            {pageSubtitle && <p className="page-subtitle">{pageSubtitle}</p>}
          </div>
        </div>
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
        <SkeletonStack rows={3} height={180} />
      ) : courses.error ? (
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            user.role === 'teacher' && (courses.data || []).filter((c) => c.teacher_id === user.id).length === 0
              ? t.dashboard.noCoursesTeacher
              : 'Aucun cours'
          }
          description={
            user.role === 'teacher'
              ? null
              : 'Aucun cours ne correspond à cette recherche.'
          }
          action={
            user.role === 'teacher' ? (
              <Link to="/dashboard" className="btn btn-primary btn-md">
                <Plus size={16} /> {t.dashboard.createCourse}
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="card-grid">
          {filtered.map((c) =>
            user.role === 'teacher' ? (
              <TeacherCourseCard key={c.id} course={c} />
            ) : (
              <CourseCard
                key={c.id}
                course={c}
                to={`/courses/${c.id}`}
                showEnrollmentBadge={user.role === 'student'}
                enrolled={enrolledIds.has(c.id)}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}

// Teacher variant: not a clickable card — has two explicit action buttons
// at the bottom (Gérer + Voir) and per-course stat line.
function TeacherCourseCard({ course }) {
  const cover = course.cover_image_url
    ? { backgroundImage: `url(${course.cover_image_url})` }
    : undefined;
  return (
    <div className="course-card" style={{ cursor: 'default' }}>
      <div className="course-card-cover" style={cover} aria-hidden />
      <div className="course-card-body">
        <div className="course-card-title">{course.title}</div>
        <div className="course-card-teacher text-sm muted">
          {course.enrollment_count} étudiant{course.enrollment_count > 1 ? 's' : ''} ·{' '}
          {course.material_count} matériel{course.material_count > 1 ? 's' : ''} ·{' '}
          {course.quiz_count} quiz
        </div>
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 'var(--space-3)',
            display: 'flex',
            gap: 'var(--space-2)',
          }}
        >
          <Link to={`/courses/${course.id}/manage`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            Gérer
          </Link>
          <Link to={`/courses/${course.id}`} className="btn btn-ghost btn-sm">
            Voir
          </Link>
        </div>
      </div>
    </div>
  );
}
