import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as coursesApi from '../api/courses';
import * as quizzesApi from '../api/quizzes';
import EmptyState from '../components/EmptyState';
import { SkeletonStack } from '../components/Skeleton';
import Badge from '../components/Badge';
import { formatDateFr, relativeTimeFr } from '../utils/format';

// Teacher-only page: lists the teacher's courses, each as an expandable
// section with an enrollment table + per-student quiz analytics.

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  const allCourses = useQuery({ queryKey: ['all-courses'], queryFn: coursesApi.listCourses });
  const mine = useMemo(
    () => (allCourses.data || []).filter((c) => c.teacher_id === user.id),
    [allCourses.data, user.id],
  );

  // Fetch each course's enrolled students in parallel. We need the data
  // for the unique-students summary AND each course section reuses it
  // through React Query's cache.
  const studentLists = useQueries({
    queries: mine.map((c) => ({
      queryKey: ['course-students', c.id],
      queryFn: () => coursesApi.listCourseStudents(c.id),
      staleTime: 30_000,
    })),
  });
  const studentsLoading = studentLists.some((q) => q.isLoading);

  const uniqueCount = useMemo(() => {
    const ids = new Set();
    for (const q of studentLists) {
      if (!q.data) continue;
      for (const s of q.data) ids.add(s.id);
    }
    return ids.size;
  }, [studentLists]);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Mes étudiants</h1>
        <p className="page-subtitle">Étudiants inscrits dans vos cours</p>
        {!studentsLoading && mine.length > 0 && (
          <p className="muted text-sm">
            {uniqueCount} étudiant{uniqueCount > 1 ? 's' : ''} au total dans vos cours
          </p>
        )}
      </header>

      {allCourses.isLoading ? (
        <SkeletonStack rows={3} height={70} />
      ) : mine.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aucun étudiant inscrit dans vos cours pour le moment."
          description="Créez un cours et invitez des étudiants à s'y inscrire pour voir leurs progrès ici."
        />
      ) : (
        <div className="stack">
          {mine.map((course) => (
            <CourseSection key={course.id} course={course} />
          ))}
        </div>
      )}
    </>
  );
}

function CourseSection({ course }) {
  const [open, setOpen] = useState(false);

  // Students are eagerly fetched at the page level (same query key) — this
  // hook reads from the cache without firing a duplicate request.
  const students = useQuery({
    queryKey: ['course-students', course.id],
    queryFn: () => coursesApi.listCourseStudents(course.id),
    staleTime: 30_000,
  });

  // Quizzes + attempts only when the panel is open, to keep the page light.
  const quizzes = useQuery({
    queryKey: ['quizzes', course.id],
    queryFn: () => quizzesApi.listCourseQuizzes(course.id),
    enabled: open,
  });
  const attemptsQueries = useQueries({
    queries: (quizzes.data || []).map((q) => ({
      queryKey: ['quiz-attempts', q.id],
      queryFn: () => quizzesApi.listAttempts(q.id),
      enabled: open,
    })),
  });

  // Aggregate per-student quiz stats across all the course's quizzes.
  const studentStats = useMemo(() => {
    const map = new Map();
    for (const aq of attemptsQueries) {
      const attempts = aq.data?.attempts;
      if (!attempts) continue;
      for (const a of attempts) {
        const cur = map.get(a.student_id) || { count: 0, scoreSum: 0, lastAt: null };
        cur.count += 1;
        cur.scoreSum += a.score ?? 0;
        if (a.completed_at && (!cur.lastAt || a.completed_at > cur.lastAt)) {
          cur.lastAt = a.completed_at;
        }
        map.set(a.student_id, cur);
      }
    }
    return map;
    // attemptsQueries identity changes per render — depend on data fingerprint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptsQueries.map((q) => (q.data ? q.data.attempts?.length : -1)).join(',')]);

  const enrolledCount = course.enrollment_count ?? students.data?.length ?? 0;

  return (
    <div className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="hstack-between"
        aria-expanded={open}
        style={{
          width: '100%',
          padding: 'var(--space-4) var(--space-5)',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div className="hstack" style={{ gap: 'var(--space-3)' }}>
          <BookOpen size={18} color="var(--color-brand)" />
          <div>
            <div className="weight-semibold">{course.title}</div>
            <div className="muted text-sm">
              {enrolledCount} étudiant{enrolledCount > 1 ? 's' : ''} inscrit
              {enrolledCount > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {students.isLoading ? (
            <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <SkeletonStack rows={2} height={36} />
            </div>
          ) : (students.data || []).length === 0 ? (
            <div style={{ padding: 'var(--space-6) var(--space-5)' }}>
              <EmptyState description="Aucun étudiant inscrit à ce cours." />
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Email</th>
                    <th>Quiz complétés</th>
                    <th>Score moyen</th>
                    <th>Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {students.data.map((s) => {
                    const stats = studentStats.get(s.id);
                    const hasActivity = !!stats && stats.count > 0;
                    const avg = hasActivity ? Math.round(stats.scoreSum / stats.count) : null;
                    return (
                      <tr key={s.id}>
                        <td className="weight-medium">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="text-sm muted">{s.email}</td>
                        <td>{hasActivity ? stats.count : '—'}</td>
                        <td>
                          {hasActivity ? (
                            <Badge
                              variant={avg >= 80 ? 'success' : avg >= 50 ? 'warning' : 'danger'}
                            >
                              {avg}%
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-sm muted">
                          {hasActivity ? (
                            <span title={formatDateFr(stats.lastAt)}>
                              {relativeTimeFr(stats.lastAt)}
                            </span>
                          ) : (
                            'Aucune activité'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
