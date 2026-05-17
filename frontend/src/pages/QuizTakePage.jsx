import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, AlertTriangle } from 'lucide-react';
import * as quizzesApi from '../api/quizzes';
import * as attemptsApi from '../api/attempts';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ProgressBar from '../components/ProgressBar';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import { apiMessage } from '../api/client';
import t from '../i18n/fr';

const MAX_QUESTIONS = 10;
const DIFFICULTY_LABEL = {
  easy: t.quiz.difficultyEasy,
  medium: t.quiz.difficultyMedium,
  hard: t.quiz.difficultyHard,
};

// QuizTakePage states:
//   loading-quiz   → GET /quizzes/:id (to read mode / canAttempt / userAttempts)
//   locked         → canAttempt=false (max_attempts reached in evaluation)
//   confirm        → mode=evaluation; show banner + "Commencer / Annuler"
//   running        → attempt created, serving questions
// Training mode skips `confirm` and starts immediately.

export default function QuizTakePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);

  const [attemptId, setAttemptId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [served, setServed] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bypassLeave, setBypassLeave] = useState(false);

  // 1. Load quiz metadata to decide which phase to enter.
  useEffect(() => {
    let cancelled = false;
    quizzesApi
      .getQuiz(Number(id))
      .then((q) => {
        if (cancelled) return;
        setQuiz(q);
        if (q.canAttempt === false) setPhase('locked');
        else if (q.mode === 'evaluation') setPhase('confirm');
        else setPhase('starting'); // training → start immediately
      })
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 2. When phase becomes 'starting' (training auto-start OR evaluation confirm),
  //    call POST /:id/start.
  useEffect(() => {
    if (phase !== 'starting') return undefined;
    let cancelled = false;
    quizzesApi
      .startAttempt(Number(id))
      .then((data) => {
        if (cancelled) return;
        setAttemptId(data.attempt.id);
        setQuestion(data.question);
        setServed(1);
        setPhase('running');
      })
      .catch((e) => {
        if (cancelled) return;
        // 403 MAX_ATTEMPTS_REACHED can still surface here if the gate was
        // beaten by a race — fall through to the lock screen.
        const code = e?.response?.data?.error?.code;
        if (code === 'MAX_ATTEMPTS_REACHED') {
          setPhase('locked');
          return;
        }
        setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, id]);

  // 3. beforeunload guard while a quiz is running.
  useEffect(() => {
    const handler = (e) => {
      if (phase === 'running' && attemptId && !bypassLeave) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase, attemptId, bypassLeave]);

  const submitAnswer = async () => {
    if (!selected || submitting || !question) return;
    setSubmitting(true);
    try {
      const data = await attemptsApi.answer(attemptId, question.id, selected);
      if (data.isComplete) {
        setBypassLeave(true);
        navigate(`/quizzes/${id}/result/${attemptId}`, { replace: true });
        return;
      }
      setQuestion(data.nextQuestion);
      setSelected(null);
      setServed((n) => n + 1);
    } catch (e) {
      toast.error(apiMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  if (phase === 'loading' || !quiz) {
    return (
      <div className="quiz-shell" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <Spinner size="lg" label={t.common.loading} />
      </div>
    );
  }

  // ---- Locked ------------------------------------------------------------
  if (phase === 'locked') {
    return (
      <div className="quiz-shell">
        <div
          className="card card-padded"
          style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-6)' }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-danger-subtle)',
              color: 'var(--color-danger)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <Lock size={24} />
          </div>
          <h2 className="text-2xl weight-bold">{t.quiz.lockedTitle}</h2>
          <p className="muted" style={{ marginTop: 'var(--space-3)', maxWidth: 460, marginInline: 'auto' }}>
            {t.quiz.lockedBody(quiz.userAttempts ?? quiz.max_attempts ?? 0, quiz.max_attempts ?? 0)}
          </p>
          <Link to={`/courses/${quiz.course_id}`} className="btn btn-primary btn-md" style={{ marginTop: 'var(--space-6)' }}>
            {t.quiz.backToCourse}
          </Link>
        </div>
      </div>
    );
  }

  // ---- Evaluation confirm ------------------------------------------------
  if (phase === 'confirm') {
    const nextNumber = (quiz.userAttempts ?? 0) + 1;
    return (
      <div className="quiz-shell">
        <div className="card card-padded">
          <div className="hstack" style={{ gap: 'var(--space-3)' }}>
            <AlertTriangle size={22} color="var(--color-warning)" />
            <div>
              <div className="weight-semibold">{t.quiz.evalConfirmTitle}</div>
              <div className="muted text-sm">
                {t.quiz.evalConfirmHeadline(nextNumber, quiz.max_attempts)}
              </div>
            </div>
          </div>
          <p style={{ marginTop: 'var(--space-4)' }}>{t.quiz.evalConfirmWarning}</p>
          <p className="muted" style={{ marginTop: 'var(--space-2)' }}>{t.quiz.evalConfirmAsk}</p>

          <div className="hstack" style={{ marginTop: 'var(--space-6)' }}>
            <Button onClick={() => setPhase('starting')} size="lg">
              {t.quiz.evalConfirmStart}
            </Button>
            <Link to={`/courses/${quiz.course_id}`} className="btn btn-ghost btn-lg">
              {t.common.cancel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- Running -----------------------------------------------------------
  if (phase === 'starting' || !question) {
    return (
      <div className="quiz-shell" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <Spinner size="lg" label={t.quiz.starting} />
      </div>
    );
  }

  const isEval = quiz.mode === 'evaluation';

  return (
    <div className="quiz-shell">
      {isEval ? (
        <div
          className="hstack"
          style={{
            background: 'var(--color-warning-subtle)',
            color: 'var(--color-warning)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            gap: 8,
          }}
        >
          <AlertTriangle size={16} />
          <span className="text-sm weight-medium">
            {t.quiz.evalBanner((quiz.userAttempts ?? 0) + 1, quiz.max_attempts)}
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <Badge variant="success">{t.quiz.trainingBanner}</Badge>
        </div>
      )}

      <div className="quiz-progress-row">
        <span className="muted text-sm">{t.quiz.progress(served, MAX_QUESTIONS)}</span>
        <Badge variant="brand">{DIFFICULTY_LABEL[question.difficulty] || question.difficulty}</Badge>
      </div>
      <ProgressBar value={(served / MAX_QUESTIONS) * 100} />

      <div className="quiz-question" style={{ marginTop: 'var(--space-6)' }}>
        {question.question_text}
      </div>

      <div className="answer-options">
        {(question.answers || []).map((a) => (
          <button
            key={a.id}
            type="button"
            className={`answer-option ${selected === a.id ? 'selected' : ''}`}
            onClick={() => setSelected(a.id)}
          >
            <span className="answer-radio" />
            <span>{a.answer_text}</span>
          </button>
        ))}
      </div>

      <div className="hstack-between" style={{ marginTop: 'var(--space-8)' }}>
        <span />
        <Button
          onClick={submitAnswer}
          loading={submitting}
          disabled={!selected || submitting}
          size="lg"
        >
          {submitting ? t.quiz.submitting : t.quiz.submitAnswer}
        </Button>
      </div>
    </div>
  );
}
