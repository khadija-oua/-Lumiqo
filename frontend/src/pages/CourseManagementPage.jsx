import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import * as coursesApi from '../api/courses';
import * as materialsApi from '../api/materials';
import * as quizzesApi from '../api/quizzes';
import Tabs from '../components/Tabs';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import { SkeletonStack } from '../components/Skeleton';
import { formatDateFr } from '../utils/format';
import { apiMessage } from '../api/client';
import t from '../i18n/fr';

export default function CourseManagementPage() {
  const { id } = useParams();
  const courseId = Number(id);
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');

  const course = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getCourse(courseId),
  });

  return (
    <>
      <Link to="/courses" className="hstack" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
        <ArrowLeft size={16} /> <span>{t.common.back}</span>
      </Link>
      <header className="page-header">
        <h1 className="page-title">{course.data?.title || ''}</h1>
      </header>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: t.manage.tabOverview },
          { value: 'materials', label: t.manage.tabMaterials },
          { value: 'quizzes', label: t.manage.tabQuizzes },
          { value: 'students', label: t.manage.tabStudents },
        ]}
      />

      {tab === 'overview' && course.data && <Overview course={course.data} qc={qc} />}
      {tab === 'materials' && <MaterialsTab courseId={courseId} />}
      {tab === 'quizzes' && <QuizzesTab courseId={courseId} />}
      {tab === 'students' && <StudentsTab courseId={courseId} />}
    </>
  );
}

function Overview({ course, qc }) {
  const [form, setForm] = useState({
    title: course.title,
    description: course.description || '',
    coverImageUrl: course.cover_image_url || '',
  });
  const save = useMutation({
    mutationFn: () => coursesApi.updateCourse(course.id, form),
    onSuccess: () => {
      toast.success(t.courses.courseUpdated);
      qc.invalidateQueries({ queryKey: ['course', course.id] });
    },
    onError: (e) => toast.error(apiMessage(e)),
  });
  return (
    <div className="card card-padded" style={{ maxWidth: 640 }}>
      <div className="stack">
        <Input
          label={t.courses.titleField}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
        <div>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            {t.common.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MaterialsTab({ courseId }) {
  const qc = useQueryClient();
  const materials = useQuery({
    queryKey: ['materials', courseId],
    queryFn: () => materialsApi.listMaterials(courseId),
  });
  const [pending, setPending] = useState(null); // {file, title, progress}
  const [uploading, setUploading] = useState(false);
  const [generateFor, setGenerateFor] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);
  const fileInput = useRef(null);

  const onFiles = (files) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type !== 'application/pdf') {
      toast.error(t.manage.uploadOnlyPdf);
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error(t.manage.uploadMaxSize);
      return;
    }
    setPending({ file: f, title: f.name.replace(/\.pdf$/i, ''), progress: 0 });
  };

  const upload = async () => {
    if (!pending) return;
    setUploading(true);
    try {
      await materialsApi.uploadMaterial(courseId, pending.file, pending.title.trim(), (p) =>
        setPending((q) => (q ? { ...q, progress: p } : q)),
      );
      toast.success(t.manage.uploadSuccess);
      setPending(null);
      qc.invalidateQueries({ queryKey: ['materials', courseId] });
    } catch (e) {
      toast.error(apiMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const remove = useMutation({
    mutationFn: (id) => materialsApi.deleteMaterial(id),
    onSuccess: () => {
      toast.success(t.manage.materialDeleted);
      qc.invalidateQueries({ queryKey: ['materials', courseId] });
      setDeleteFor(null);
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  return (
    <div className="stack-lg">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => fileInput.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('dragover');
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('dragover');
          onFiles(e.dataTransfer.files);
        }}
      >
        <Upload size={24} style={{ marginInline: 'auto' }} />
        <div style={{ marginTop: 8 }}>{t.manage.uploadHint}</div>
        <div className="text-sm muted">
          {t.manage.uploadMaxSize}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {pending && (
        <div className="card card-padded stack">
          <Input
            label={t.manage.materialTitleField}
            value={pending.title}
            onChange={(e) => setPending((q) => ({ ...q, title: e.target.value }))}
          />
          {uploading && (
            <div>
              <ProgressBar value={pending.progress} />
              <div className="text-sm muted" style={{ marginTop: 4 }}>
                {pending.progress}%
              </div>
            </div>
          )}
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={uploading}>
              {t.common.cancel}
            </Button>
            <Button onClick={upload} loading={uploading} disabled={!pending.title.trim()}>
              {uploading ? t.manage.uploadInProgress : t.common.submit}
            </Button>
          </div>
        </div>
      )}

      {materials.isLoading ? (
        <SkeletonStack rows={2} height={60} />
      ) : (materials.data || []).length === 0 ? (
        <EmptyState description={t.courses.noMaterials} />
      ) : (
        <div>
          {materials.data.map((m) => (
            <div key={m.id} className="material-row">
              <div className="material-info">
                <div className="material-title">{m.title}</div>
                <div className="material-meta">PDF · {formatDateFr(m.created_at)}</div>
              </div>
              <div className="hstack">
                <Button variant="secondary" size="sm" onClick={() => setGenerateFor(m)}>
                  <Sparkles size={14} /> {t.manage.generateQuizButton}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={t.common.delete}
                  onClick={() => setDeleteFor(m)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <GenerateQuizModal
        material={generateFor}
        onClose={() => setGenerateFor(null)}
        onDone={() => qc.invalidateQueries({ queryKey: ['quizzes', courseId] })}
      />

      <ConfirmDialog
        open={!!deleteFor}
        onClose={() => setDeleteFor(null)}
        title={t.manage.confirmDeleteMaterialTitle}
        body={t.manage.confirmDeleteMaterialBody}
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate(deleteFor.id)}
        confirmLabel={t.common.delete}
      />
    </div>
  );
}

function GenerateQuizModal({ material, onClose, onDone }) {
  const [counts, setCounts] = useState({ numEasy: 4, numMedium: 4, numHard: 2 });
  const [loading, setLoading] = useState(false);
  if (!material) return null;
  const submit = async () => {
    setLoading(true);
    try {
      await materialsApi.generateQuizFromMaterial(material.id, counts);
      toast.success(t.manage.quizGenerated);
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(apiMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      open
      onClose={loading ? () => {} : onClose}
      title={t.manage.generateQuizTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} loading={loading}>
            {t.common.create}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="muted">{material.title}</p>
        {loading && <p className="text-sm">{t.manage.generateQuizHint}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
          <Input
            type="number"
            label={t.manage.numEasy}
            min={0}
            max={10}
            value={counts.numEasy}
            onChange={(e) => setCounts((c) => ({ ...c, numEasy: Number(e.target.value) }))}
            disabled={loading}
          />
          <Input
            type="number"
            label={t.manage.numMedium}
            min={0}
            max={10}
            value={counts.numMedium}
            onChange={(e) => setCounts((c) => ({ ...c, numMedium: Number(e.target.value) }))}
            disabled={loading}
          />
          <Input
            type="number"
            label={t.manage.numHard}
            min={0}
            max={10}
            value={counts.numHard}
            onChange={(e) => setCounts((c) => ({ ...c, numHard: Number(e.target.value) }))}
            disabled={loading}
          />
        </div>
      </div>
    </Modal>
  );
}

function QuizzesTab({ courseId }) {
  const quizzes = useQuery({
    queryKey: ['quizzes', courseId],
    queryFn: () => quizzesApi.listCourseQuizzes(courseId),
  });
  if (quizzes.isLoading) return <SkeletonStack rows={2} height={60} />;
  if (!quizzes.data?.length) return <EmptyState description={t.courses.noQuizzes} />;
  return (
    <div>
      {quizzes.data.map((q) => (
        <div key={q.id} className="material-row">
          <div className="material-info">
            <div className="material-title">{q.title}</div>
            <div className="material-meta hstack">
              <Badge variant="brand">{q.difficulty}</Badge>
              {q.generated_by_ai ? <Badge variant="info">IA</Badge> : null}
              <span className="text-xs muted">{formatDateFr(q.created_at)}</span>
            </div>
          </div>
          <Link to={`/quizzes/${q.id}`} className="btn btn-secondary btn-sm">
            Voir
          </Link>
        </div>
      ))}
    </div>
  );
}

function StudentsTab({ courseId }) {
  const students = useQuery({
    queryKey: ['course-students', courseId],
    queryFn: () => coursesApi.listCourseStudents(courseId),
  });
  if (students.isLoading) return <SkeletonStack rows={3} height={50} />;
  if (!students.data?.length) return <EmptyState description="Aucun étudiant inscrit." />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{t.admin.columnName}</th>
            <th>{t.admin.columnEmail}</th>
            <th>{t.manage.enrolledOn}</th>
          </tr>
        </thead>
        <tbody>
          {students.data.map((s) => (
            <tr key={s.id}>
              <td>
                {s.first_name} {s.last_name}
              </td>
              <td>{s.email}</td>
              <td>{formatDateFr(s.enrolled_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
