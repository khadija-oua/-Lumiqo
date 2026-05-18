import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, Users, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import * as coursesApi from '../../api/courses';
import * as materialsApi from '../../api/materials';
import CourseCard from '../../components/CourseCard';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonStack } from '../../components/Skeleton';
import { apiMessage } from '../../api/client';
import t from '../../i18n/fr';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', coverImageUrl: '' });

  const allCourses = useQuery({ queryKey: ['all-courses'], queryFn: coursesApi.listCourses });
  const mine = useMemo(
    () => (allCourses.data || []).filter((c) => c.teacher_id === user.id),
    [allCourses.data, user.id],
  );

  // Per-course student lists — fetched in parallel via useQueries so the
  // dashboard can report a unique student count (a student in two of my
  // courses still counts as one).
  const studentLists = useQueries({
    queries: mine.map((c) => ({
      queryKey: ['course-students', c.id],
      queryFn: () => coursesApi.listCourseStudents(c.id),
      // 30s freshness — these don't change minute-to-minute.
      staleTime: 30_000,
    })),
  });
  const studentsLoading = studentLists.some((q) => q.isLoading);
  const uniqueStudentCount = useMemo(() => {
    const ids = new Set();
    for (const q of studentLists) {
      if (!q.data) continue;
      for (const s of q.data) ids.add(s.id);
    }
    return ids.size;
  }, [studentLists]);

  // Aggregate quizzes from the per-course quiz_count subquery on courses.
  const totalQuizzes = mine.reduce((sum, c) => sum + (c.quiz_count || 0), 0);

  const create = useMutation({
    mutationFn: () =>
      coursesApi.createCourse({
        title: form.title.trim(),
        description: form.description.trim() || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t.courses.courseCreated);
      qc.invalidateQueries({ queryKey: ['all-courses'] });
      setModal(false);
      setForm({ title: '', description: '', coverImageUrl: '' });
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">{t.dashboard.greeting(user.first_name)}</h1>
        <p className="page-subtitle">
          {studentsLoading
            ? `${mine.length} cours, … étudiants au total`
            : t.dashboard.teacherSubtitle(mine.length, uniqueStudentCount)}
        </p>
      </header>

      <section className="page-section">
        <div className="stats-grid">
          <StatCard
            icon={<BookOpen size={20} />}
            value={mine.length}
            label="Cours actifs"
            loading={allCourses.isLoading}
          />
          <StatCard
            icon={<Users size={20} />}
            value={studentsLoading ? null : uniqueStudentCount}
            label="Étudiants inscrits"
            loading={studentsLoading}
          />
          <StatCard
            icon={<Target size={20} />}
            value={allCourses.isLoading ? null : totalQuizzes}
            label="Quiz générés"
            loading={allCourses.isLoading}
          />
        </div>
      </section>

      <section className="page-section">
        <div className="page-section-header">
          <h2 className="page-section-title">{t.nav.coursesTeacher}</h2>
          <Button onClick={() => setModal(true)}>
            <Plus size={16} /> {t.dashboard.createCourse}
          </Button>
        </div>
        {allCourses.isLoading ? (
          <SkeletonStack rows={2} height={140} />
        ) : mine.length === 0 ? (
          <EmptyState
            title={t.dashboard.noCoursesTeacher}
            action={
              <Button onClick={() => setModal(true)}>
                <Plus size={16} /> {t.dashboard.createCourse}
              </Button>
            }
          />
        ) : (
          <div className="card-grid">
            {mine.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                to={`/courses/${c.id}/manage`}
                meta={
                  <span className="muted text-sm">
                    {c.enrollment_count} étudiant{c.enrollment_count > 1 ? 's' : ''} · {c.material_count}{' '}
                    matériel{c.material_count > 1 ? 's' : ''} · {c.quiz_count} quiz
                  </span>
                }
              />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={t.courses.createTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.title.trim()}>
              {t.common.create}
            </Button>
          </>
        }
      >
        <div className="stack">
          <Input
            label={t.courses.titleField}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <Textarea
            label={`${t.courses.descriptionField} ${t.courses.optional}`}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            label={`${t.courses.coverField} ${t.courses.optional}`}
            placeholder="https://…"
            value={form.coverImageUrl}
            onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
          />
        </div>
      </Modal>
    </>
  );
}

function StatCard({ icon, value, label, loading }) {
  return (
    <div
      className="stat-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
    >
      <div
        className="hstack"
        style={{ color: 'var(--color-brand)', gap: 'var(--space-2)' }}
      >
        {icon}
        <span
          className="stat-value"
          style={{ color: 'var(--color-brand)', marginTop: 0, lineHeight: 1 }}
        >
          {loading || value == null ? '—' : value}
        </span>
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
