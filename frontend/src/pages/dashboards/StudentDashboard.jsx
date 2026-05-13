import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessagesSquare, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as enrollmentsApi from '../../api/enrollments';
import * as varkApi from '../../api/vark';
import * as quizzesApi from '../../api/quizzes';
import * as lpApi from '../../api/learningPaths';
import * as materialsApi from '../../api/materials';
import CourseCard from '../../components/CourseCard';
import BarChart from '../../components/BarChart';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonStack } from '../../components/Skeleton';
import Badge from '../../components/Badge';
import t from '../../i18n/fr';

const STYLE_EMOJI = { visual: '👁', auditory: '👂', reading: '📖', kinesthetic: '✋' };

function NextStep({ course }) {
  // Fetch this course's learning path + materials to surface "what to study next".
  const { data: path } = useQuery({
    queryKey: ['learning-path', course.id],
    queryFn: () => lpApi.myPath(course.id).catch(() => null),
  });
  const { data: materials = [] } = useQuery({
    queryKey: ['materials', course.id],
    queryFn: () => materialsApi.listMaterials(course.id),
    enabled: !!path,
  });

  const order = path?.material_order || [];
  const next = order
    .map((id) => materials.find((m) => m.id === id))
    .find((m) => m);

  return (
    <div className="card card-padded" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <div className="weight-medium">{course.title}</div>
        <div className="muted text-sm">
          {next ? next.title : t.profile.pathNotGenerated}
        </div>
      </div>
      <Link to={`/courses/${course.id}`} className="btn btn-secondary btn-sm">
        {t.dashboard.continueButton}
      </Link>
    </div>
  );
}

function VarkSection({ profile }) {
  if (!profile) {
    return (
      <div className="card card-padded">
        <div className="stack-sm">
          <div className="weight-semibold">{t.dashboard.varkProfile}</div>
          <p className="muted">{t.dashboard.takeVarkCta}</p>
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/vark" className="btn btn-primary btn-md">
            {t.dashboard.takeVark}
          </Link>
        </div>
      </div>
    );
  }
  const rows = [
    { label: t.vark.styleNames.visual, value: profile.visual_score },
    { label: t.vark.styleNames.auditory, value: profile.auditory_score },
    { label: t.vark.styleNames.reading, value: profile.reading_score },
    { label: t.vark.styleNames.kinesthetic, value: profile.kinesthetic_score },
  ];
  return (
    <div className="card card-padded">
      <div className="hstack-between" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <div className="muted text-sm">{t.dashboard.varkProfile}</div>
          <div className="text-2xl weight-bold" style={{ marginTop: 4 }}>
            <span style={{ marginRight: 8 }}>{STYLE_EMOJI[profile.dominant_style]}</span>
            {t.vark.styleNames[profile.dominant_style] || profile.dominant_style}
          </div>
        </div>
        <Badge variant="brand">VARK</Badge>
      </div>
      <BarChart rows={rows} />
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const enrollments = useQuery({ queryKey: ['my-enrollments'], queryFn: enrollmentsApi.myEnrollments });
  const profile = useQuery({
    queryKey: ['vark-me'],
    queryFn: () => varkApi.myProfile().catch(() => null),
  });

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">{t.dashboard.greeting(user.first_name)}</h1>
        <p className="page-subtitle">{t.dashboard.studentSubtitle}</p>
      </header>

      <section className="page-section">
        <div className="page-section-header">
          <h2 className="page-section-title">{t.dashboard.myCourses}</h2>
          <Link to="/courses" className="btn btn-ghost btn-sm">
            {t.dashboard.browseCourses}
          </Link>
        </div>
        {enrollments.isLoading ? (
          <SkeletonStack rows={2} height={120} />
        ) : enrollments.data?.length ? (
          <div className="card-grid">
            {enrollments.data.map((c) => (
              <StudentCourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t.dashboard.noCoursesStudent}
            action={
              <Link to="/courses" className="btn btn-primary btn-sm">
                {t.dashboard.browseCourses}
              </Link>
            }
          />
        )}
      </section>

      <section className="page-section">
        <h2 className="page-section-title">{t.dashboard.learningPath}</h2>
        {enrollments.data?.length ? (
          <div className="stack">
            {enrollments.data.map((c) => (
              <NextStep key={`next-${c.id}`} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState description={t.dashboard.noCoursesStudent} />
        )}
      </section>

      <section className="page-section">
        <h2 className="page-section-title">{t.dashboard.varkProfile}</h2>
        {profile.isLoading ? (
          <SkeletonStack rows={1} height={140} />
        ) : (
          <VarkSection profile={profile.data} />
        )}
      </section>

      <Link to="/chat" className="fab" aria-label={t.nav.chat} title={t.nav.chat}>
        <MessagesSquare size={22} />
      </Link>
    </>
  );
}

function StudentCourseCard({ course }) {
  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes', course.id],
    queryFn: () => quizzesApi.listCourseQuizzes(course.id).catch(() => []),
  });
  // No "completed quiz count" endpoint — display total quizzes as a simple meta.
  return (
    <CourseCard
      course={course}
      to={`/courses/${course.id}`}
      meta={
        <span className="muted text-sm">
          {quizzes.length} {quizzes.length > 1 ? 'quiz' : 'quiz'}
        </span>
      }
    />
  );
}
