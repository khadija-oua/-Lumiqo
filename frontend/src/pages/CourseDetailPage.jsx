import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, PlayCircle, ArrowLeft, Lock, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import * as coursesApi from '../api/courses';
import * as enrollmentsApi from '../api/enrollments';
import * as materialsApi from '../api/materials';
import * as quizzesApi from '../api/quizzes';
import Badge from '../components/Badge';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { SkeletonStack } from '../components/Skeleton';
import { formatDateFr } from '../utils/format';
import { apiMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import t from '../i18n/fr';

export default function CourseDetailPage() {
  const { id } = useParams();
  const courseId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const course = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getCourse(courseId),
  });
  const myEnrollments = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: enrollmentsApi.myEnrollments,
    enabled: user.role === 'student',
  });

  const enrolled = useMemo(
    () => (myEnrollments.data || []).some((c) => c.id === courseId),
    [myEnrollments.data, courseId],
  );

  const canSeeContent =
    user.role === 'admin' ||
    enrolled ||
    (user.role === 'teacher' && course.data?.teacher_id === user.id);

  const materials = useQuery({
    queryKey: ['materials', courseId],
    queryFn: () => materialsApi.listMaterials(courseId),
    enabled: canSeeContent,
  });
  const quizzes = useQuery({
    queryKey: ['quizzes', courseId],
    queryFn: () => quizzesApi.listCourseQuizzes(courseId),
    enabled: canSeeContent,
  });

  const enroll = useMutation({
    mutationFn: () => enrollmentsApi.enroll(courseId),
    onSuccess: () => {
      toast.success(t.courses.enrollSuccess);
      qc.invalidateQueries({ queryKey: ['my-enrollments'] });
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  const handleDownload = async (mat) => {
    try {
      const blob = await materialsApi.downloadMaterial(mat.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  if (course.isLoading) return <SkeletonStack rows={3} height={140} />;
  if (!course.data) return <EmptyState title="Cours introuvable" />;

  const c = course.data;

  return (
    <>
      <Link to="/courses" className="hstack" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
        <ArrowLeft size={16} /> <span>{t.common.back}</span>
      </Link>

      <div
        style={{
          background: c.cover_image_url
            ? `url(${c.cover_image_url}) center/cover`
            : 'linear-gradient(135deg, var(--color-brand), var(--color-accent))',
          borderRadius: 'var(--radius-lg)',
          minHeight: 200,
          marginBottom: 'var(--space-6)',
          position: 'relative',
        }}
        aria-hidden
      />

      <header className="page-header">
        <h1 className="page-title">{c.title}</h1>
        {c.teacher_first_name && (
          <p className="page-subtitle">
            {t.courses.teacherLabel} : {c.teacher_first_name} {c.teacher_last_name}
          </p>
        )}
        {c.description && <p style={{ marginTop: 'var(--space-2)' }}>{c.description}</p>}
      </header>

      {user.role === 'student' && !enrolled && (
        <div className="card card-padded" style={{ marginBottom: 'var(--space-6)' }}>
          <p className="muted">{t.courses.notEnrolledCta}</p>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button onClick={() => enroll.mutate()} loading={enroll.isPending}>
              {t.courses.enrollButton}
            </Button>
          </div>
        </div>
      )}

      {canSeeContent && (
        <>
          <section className="page-section">
            <h2 className="page-section-title">{t.courses.materials}</h2>
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
                      <div className="material-meta">
                        PDF · {formatDateFr(m.created_at)}
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleDownload(m)}>
                      <Download size={14} /> {t.courses.downloadMaterial}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="page-section">
            <h2 className="page-section-title">{t.courses.quizzes}</h2>
            {quizzes.isLoading ? (
              <SkeletonStack rows={2} height={60} />
            ) : (quizzes.data || []).length === 0 ? (
              <EmptyState description={t.courses.noQuizzes} />
            ) : (
              <div>
                {quizzes.data.map((q) => {
                  const isEval = q.mode === 'evaluation';
                  const used = q.userAttempts ?? 0;
                  const hasAttempted = used > 0;
                  const canAttempt = q.canAttempt !== false;
                  return (
                    <div key={q.id} className="material-row">
                      <div className="material-info">
                        <div className="material-title">{q.title}</div>
                        <div className="material-meta hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
                          {isEval ? (
                            <Badge variant="brand">{t.quiz.badgeEvaluation(q.max_attempts ?? '?')}</Badge>
                          ) : (
                            <Badge variant="success">{t.quiz.badgeTraining}</Badge>
                          )}
                          <Badge>{difficultyLabel(q.difficulty)}</Badge>
                          {q.generated_by_ai ? <Badge variant="info">IA</Badge> : null}
                          {user.role === 'student' && (
                            <span className="text-xs muted">
                              {isEval
                                ? t.quiz.attemptsUsed(used, q.max_attempts ?? '?')
                                : t.quiz.trainingInfo(used)}
                            </span>
                          )}
                          {user.role === 'student' && hasAttempted && q.lastScore != null && (
                            <Badge
                              variant={q.lastScore >= 80 ? 'success' : q.lastScore >= 50 ? 'warning' : 'danger'}
                            >
                              {Math.round(q.lastScore)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      {user.role === 'student' && enrolled ? (
                        !canAttempt ? (
                          <Badge variant="default">
                            <Lock size={12} style={{ marginRight: 4 }} />
                            {t.quiz.btnLockedScore(Math.round(q.lastScore ?? 0))}
                          </Badge>
                        ) : hasAttempted ? (
                          <Button onClick={() => navigate(`/quizzes/${q.id}/take`)}>
                            <RotateCcw size={14} />{' '}
                            {isEval ? t.quiz.btnRetakeEval : t.quiz.btnRetake}
                          </Button>
                        ) : (
                          <Button onClick={() => navigate(`/quizzes/${q.id}/take`)}>
                            <PlayCircle size={14} /> {t.quiz.btnStart}
                          </Button>
                        )
                      ) : (
                        <Link to={`/quizzes/${q.id}`} className="btn btn-secondary btn-sm">
                          Voir
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function difficultyLabel(level) {
  if (level === 'easy') return t.quiz.difficultyEasy;
  if (level === 'hard') return t.quiz.difficultyHard;
  return t.quiz.difficultyMedium;
}
