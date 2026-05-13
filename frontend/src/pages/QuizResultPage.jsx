import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import * as attemptsApi from '../api/attempts';
import * as quizzesApi from '../api/quizzes';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import t from '../i18n/fr';

function congratulations(pct) {
  if (pct >= 80) return t.quiz.excellent;
  if (pct >= 50) return t.quiz.goodWork;
  return t.quiz.keepGoing;
}

export default function QuizResultPage() {
  const { id, attemptId } = useParams();
  const navigate = useNavigate();
  const r = useQuery({
    queryKey: ['attempt-result', attemptId],
    queryFn: () => attemptsApi.result(Number(attemptId)),
  });

  if (r.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <Spinner size="lg" />
      </div>
    );
  }
  if (r.error) return <ErrorState error={r.error} onRetry={() => r.refetch()} />;

  const { attempt, quiz, breakdown } = r.data;
  const total = attempt.total_questions;
  const correct = attempt.correct_answers;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  const restart = async () => {
    try {
      const { attempt: a } = await quizzesApi.startAttempt(Number(id));
      navigate(`/quizzes/${id}/take`, { replace: true, state: { attemptId: a.id } });
      // The Take page starts a fresh attempt itself on mount, so this is enough.
      window.location.assign(`/quizzes/${id}/take`);
    } catch {
      /* toast handled by client */
    }
  };

  return (
    <>
      <Link to={`/courses/${quiz.course_id}`} className="hstack" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
        <ArrowLeft size={16} /> <span>{t.quiz.backToCourse}</span>
      </Link>

      <div className="result-hero">
        <div className="muted text-sm">{t.quiz.yourScore}</div>
        <div className="result-score" style={{ marginTop: 4 }}>
          {correct}/{total}
        </div>
        <div style={{ marginTop: 4 }}>
          <Badge variant={pct >= 50 ? 'success' : 'warning'}>{pct}%</Badge>
        </div>
        <div style={{ marginTop: 'var(--space-3)' }} className="weight-medium">
          {congratulations(pct)}
        </div>
        <div className="hstack" style={{ justifyContent: 'center', marginTop: 'var(--space-6)' }}>
          <Button onClick={restart}>
            <RotateCcw size={16} /> {t.quiz.retake}
          </Button>
          <Link to={`/courses/${quiz.course_id}`} className="btn btn-secondary btn-md">
            {t.quiz.backToCourse}
          </Link>
        </div>
      </div>

      <div className="stack">
        {breakdown.map((row, i) => (
          <div key={row.attempt_answer_id} className="result-question">
            <div className="hstack-between" style={{ marginBottom: 'var(--space-2)' }}>
              <span className="weight-medium">
                {i + 1}. {row.question_text}
              </span>
              <Badge variant="brand">{row.difficulty}</Badge>
            </div>
            <div className="hstack" style={{ gap: 8 }}>
              {row.is_correct ? (
                <CheckCircle2 size={16} color="var(--color-success)" />
              ) : (
                <XCircle size={16} color="var(--color-danger)" />
              )}
              <span className={row.is_correct ? 'result-answer-correct' : 'result-answer-wrong'}>
                {t.quiz.youAnswered} : {row.selected_answer_text || '—'}
              </span>
            </div>
            {!row.is_correct && (
              <div style={{ marginTop: 4 }} className="text-sm">
                <span className="muted">{t.quiz.correctAnswer} : </span>
                <span className="result-answer-correct">{row.correct_answer_text}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
