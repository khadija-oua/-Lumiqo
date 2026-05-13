import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import * as quizzesApi from '../api/quizzes';
import Badge from '../components/Badge';
import { SkeletonStack } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import t from '../i18n/fr';

// Read-only quiz inspector for teachers/admins (and students once they
// finish — though students typically reach the result page instead).
export default function QuizDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const quiz = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => quizzesApi.getQuiz(Number(id)),
  });

  if (quiz.isLoading) return <SkeletonStack rows={4} height={80} />;
  if (!quiz.data) return null;
  const q = quiz.data;
  const showCorrect = user.role !== 'student';

  return (
    <>
      <Link to={`/courses/${q.course_id}`} className="hstack" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
        <ArrowLeft size={16} /> <span>{t.common.back}</span>
      </Link>
      <header className="page-header">
        <h1 className="page-title">{q.title}</h1>
        <div className="hstack">
          <Badge variant="brand">{q.difficulty}</Badge>
          {q.generated_by_ai ? <Badge variant="info">IA</Badge> : null}
        </div>
      </header>

      <div className="stack">
        {q.questions.map((question, i) => (
          <div key={question.id} className="card card-padded">
            <div className="weight-semibold">
              {i + 1}. {question.question_text}
            </div>
            <div className="text-xs muted" style={{ marginTop: 4 }}>
              <Badge>{question.difficulty}</Badge>
            </div>
            <div className="stack-sm" style={{ marginTop: 'var(--space-3)' }}>
              {question.answers.map((a) => (
                <div
                  key={a.id}
                  className="hstack"
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background:
                      showCorrect && a.is_correct ? 'var(--color-success-subtle)' : 'transparent',
                  }}
                >
                  {showCorrect && a.is_correct ? (
                    <CheckCircle2 size={16} color="var(--color-success)" />
                  ) : (
                    <span style={{ width: 16 }} />
                  )}
                  <span>{a.answer_text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
