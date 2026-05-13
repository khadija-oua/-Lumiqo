import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
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

export default function QuizTakePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attemptId, setAttemptId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [served, setServed] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Flips true once the attempt is complete so we don't fire the
  // beforeunload confirm when programmatically navigating to /result.
  const [bypassLeave, setBypassLeave] = useState(false);
  const [error, setError] = useState(null);

  // Start the attempt on mount.
  useEffect(() => {
    let cancelled = false;
    quizzesApi
      .startAttempt(Number(id))
      .then((data) => {
        if (cancelled) return;
        setAttemptId(data.attempt.id);
        setQuestion(data.question);
        setServed(1);
      })
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Confirm before browser-level unload (refresh / close tab).
  useEffect(() => {
    const handler = (e) => {
      if (attemptId && !bypassLeave) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [attemptId, bypassLeave]);

  const submitAnswer = async () => {
    if (!selected || submitting || !question) return;
    setSubmitting(true);
    try {
      const data = await attemptsApi.answer(attemptId, question.id, selected);
      if (data.isComplete) {
        // Allow navigation (skip the leave-confirm).
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
  if (!question) {
    return (
      <div className="quiz-shell" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <Spinner size="lg" label={t.quiz.starting} />
      </div>
    );
  }

  return (
    <div className="quiz-shell">
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
