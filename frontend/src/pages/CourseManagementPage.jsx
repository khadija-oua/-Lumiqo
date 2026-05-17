import { useEffect, useRef, useState } from 'react';
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
  const [resultsFor, setResultsFor] = useState(null);

  if (quizzes.isLoading) return <SkeletonStack rows={2} height={80} />;
  if (!quizzes.data?.length) return <EmptyState description={t.courses.noQuizzes} />;
  return (
    <>
      <div className="stack">
        {quizzes.data.map((q) => (
          <QuizManageRow key={q.id} quiz={q} onSeeResults={() => setResultsFor(q)} />
        ))}
      </div>
      <QuizResultsModal quiz={resultsFor} onClose={() => setResultsFor(null)} />
    </>
  );
}

function QuizManageRow({ quiz, onSeeResults }) {
  const qc = useQueryClient();
  const [localMax, setLocalMax] = useState(quiz.max_attempts ?? 1);

  // Keep the local max input in sync if the server-side value changes
  // (e.g., after the optimistic update settles).
  useEffect(() => {
    setLocalMax(quiz.max_attempts ?? 1);
  }, [quiz.max_attempts]);

  const setMode = useMutation({
    mutationFn: (payload) => quizzesApi.updateMode(quiz.id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(['quizzes', quiz.course_id], (prev) =>
        (prev || []).map((q) =>
          q.id === updated.id
            ? { ...q, mode: updated.mode, max_attempts: updated.max_attempts, show_answers: updated.show_answers }
            : q,
        ),
      );
      toast.success(t.manage.modeSaved);
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  // Debounced save when the teacher changes max_attempts in evaluation mode.
  useEffect(() => {
    if (quiz.mode !== 'evaluation') return undefined;
    if (localMax === quiz.max_attempts) return undefined;
    if (!Number.isInteger(localMax) || localMax < 1 || localMax > 10) return undefined;
    const t = setTimeout(() => {
      setMode.mutate({ mode: 'evaluation', maxAttempts: localMax });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localMax]);

  const switchMode = (nextMode) => {
    if (nextMode === quiz.mode) return;
    if (nextMode === 'training') setMode.mutate({ mode: 'training' });
    else setMode.mutate({ mode: 'evaluation', maxAttempts: Math.max(1, Math.min(10, localMax || 1)) });
  };

  const modeBadge =
    quiz.mode === 'evaluation' ? (
      <Badge variant="brand">{t.quiz.badgeEvaluation(quiz.max_attempts ?? '?')}</Badge>
    ) : (
      <Badge variant="success">{t.quiz.badgeTraining}</Badge>
    );

  return (
    <div className="card card-padded">
      <div className="hstack-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="weight-semibold">{quiz.title}</div>
          <div className="hstack" style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {modeBadge}
            <Badge>{quiz.difficulty}</Badge>
            {quiz.generated_by_ai ? <Badge variant="info">IA</Badge> : null}
            <span className="text-xs muted">{formatDateFr(quiz.created_at)}</span>
          </div>
        </div>
        <div className="hstack">
          <Button variant="secondary" size="sm" onClick={onSeeResults}>
            {t.manage.seeResults}
          </Button>
          <Link to={`/quizzes/${quiz.id}`} className="btn btn-ghost btn-sm">
            Voir
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div className="text-sm weight-medium" style={{ color: 'var(--text-secondary)' }}>
          {t.quiz.modeLabel}
        </div>
        <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${quiz.mode === 'training' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => switchMode('training')}
            disabled={setMode.isPending}
          >
            📝 {t.quiz.modeTraining}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${quiz.mode === 'evaluation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => switchMode('evaluation')}
            disabled={setMode.isPending}
          >
            🎯 {t.quiz.modeEvaluation}
          </button>
        </div>

        {quiz.mode === 'evaluation' && (
          <div style={{ maxWidth: 220 }}>
            <Input
              type="number"
              label={t.quiz.maxAttemptsLabel}
              min={1}
              max={10}
              value={localMax}
              onChange={(e) => setLocalMax(Number(e.target.value))}
              helper={t.quiz.maxAttemptsHelp(Math.max(1, Math.min(10, localMax || 1)))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function QuizResultsModal({ quiz, onClose }) {
  const data = useQuery({
    queryKey: ['quiz-attempts', quiz?.id],
    queryFn: () => quizzesApi.listAttempts(quiz.id),
    enabled: !!quiz,
  });
  if (!quiz) return null;

  const summary = data.data?.summary;
  const attempts = data.data?.attempts || [];

  // Roll the all-attempts list up into per-student rows so the teacher
  // sees one row per learner with their attempt count + latest score.
  const byStudent = new Map();
  for (const a of attempts) {
    if (!byStudent.has(a.student_id)) {
      byStudent.set(a.student_id, { latest: a, count: 0 });
    }
    byStudent.get(a.student_id).count += 1;
  }
  const rows = Array.from(byStudent.values());

  const verdictFor = (score) => {
    if (score >= 80) return { label: t.manage.verdictExcellent, tone: 'success' };
    if (score >= 50) return { label: t.manage.verdictGood, tone: 'warning' };
    return { label: t.manage.verdictNeedsWork, tone: 'danger' };
  };

  const dist = summary?.scoreDistribution || { excellent: 0, good: 0, needsWork: 0 };
  const distTotal = dist.excellent + dist.good + dist.needsWork;

  return (
    <Modal open onClose={onClose} title={`${t.manage.resultsTitle} — ${quiz.title}`} size="lg">
      {data.isLoading ? (
        <SkeletonStack rows={3} height={40} />
      ) : (
        <div className="stack">
          <div className="muted text-sm">
            {summary
              ? t.manage.resultsSummary(
                  summary.totalStudents,
                  summary.averageScore,
                  summary.completionRate,
                )
              : null}
          </div>

          {distTotal > 0 && (
            <div
              role="img"
              aria-label="Répartition des scores"
              style={{
                display: 'flex',
                height: 10,
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                background: 'var(--bg-surface-2)',
              }}
            >
              <span style={{ width: `${(dist.excellent / distTotal) * 100}%`, background: 'var(--color-success)' }} />
              <span style={{ width: `${(dist.good / distTotal) * 100}%`, background: 'var(--color-warning)' }} />
              <span style={{ width: `${(dist.needsWork / distTotal) * 100}%`, background: 'var(--color-danger)' }} />
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyState description={t.manage.resultsEmpty} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.manage.colStudent}</th>
                    <th>{t.manage.colScore}</th>
                    <th>{t.manage.colVerdict}</th>
                    <th>{t.manage.colAttempts}</th>
                    <th>{t.manage.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ latest, count }) => {
                    const score = latest.score ?? 0;
                    const v = verdictFor(score);
                    return (
                      <tr key={latest.student_id}>
                        <td className="weight-medium">
                          {latest.first_name} {latest.last_name}
                          <div className="text-xs muted">{latest.email}</div>
                        </td>
                        <td>
                          <Badge variant={v.tone}>{Math.round(score)}%</Badge>
                        </td>
                        <td>{v.label}</td>
                        <td>{count}</td>
                        <td className="text-sm muted">{formatDateFr(latest.completed_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
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
