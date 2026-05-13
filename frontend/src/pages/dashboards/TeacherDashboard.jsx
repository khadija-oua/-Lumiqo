import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
  const mine = (allCourses.data || []).filter((c) => c.teacher_id === user.id);

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
          {t.dashboard.teacherSubtitle(mine.length, '—')}
        </p>
      </header>

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
              <TeacherCourseCard key={c.id} course={c} />
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

function TeacherCourseCard({ course }) {
  const { data: materials = [] } = useQuery({
    queryKey: ['materials', course.id],
    queryFn: () => materialsApi.listMaterials(course.id).catch(() => []),
  });
  return (
    <CourseCard
      course={course}
      to={`/courses/${course.id}/manage`}
      meta={
        <span className="muted text-sm">
          {materials.length} matériel{materials.length > 1 ? 's' : ''}
        </span>
      }
    />
  );
}
