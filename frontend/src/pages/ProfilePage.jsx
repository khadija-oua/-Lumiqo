import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import * as varkApi from '../api/vark';
import * as enrollmentsApi from '../api/enrollments';
import * as materialsApi from '../api/materials';
import * as lpApi from '../api/learningPaths';
import Button from '../components/Button';
import Badge from '../components/Badge';
import BarChart from '../components/BarChart';
import EmptyState from '../components/EmptyState';
import { SkeletonStack } from '../components/Skeleton';
import { apiMessage } from '../api/client';
import t from '../i18n/fr';

const STYLE_EMOJI = { visual: '👁', auditory: '👂', reading: '📖', kinesthetic: '✋' };

export default function ProfilePage() {
  const profile = useQuery({
    queryKey: ['vark-me'],
    queryFn: () => varkApi.myProfile().catch(() => null),
  });
  const enrolled = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: enrollmentsApi.myEnrollments,
  });

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">{t.profile.title}</h1>
      </header>

      <section className="page-section">
        <h2 className="page-section-title">{t.profile.sectionVark}</h2>
        {profile.isLoading ? (
          <SkeletonStack rows={1} height={160} />
        ) : !profile.data ? (
          <EmptyState
            title={t.profile.noProfile}
            action={
              <Link to="/vark" className="btn btn-primary btn-md">
                {t.dashboard.takeVark}
              </Link>
            }
          />
        ) : (
          <ProfileSummary profile={profile.data} />
        )}
      </section>

      <section className="page-section">
        <h2 className="page-section-title">{t.profile.sectionPaths}</h2>
        {enrolled.isLoading ? (
          <SkeletonStack rows={2} height={80} />
        ) : !enrolled.data?.length ? (
          <EmptyState description={t.dashboard.noCoursesStudent} />
        ) : (
          <div className="stack">
            {enrolled.data.map((course) => (
              <LearningPathCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ProfileSummary({ profile }) {
  const dominant = profile.dominant_style;
  const rows = [
    { label: t.vark.styleNames.visual, value: profile.visual_score },
    { label: t.vark.styleNames.auditory, value: profile.auditory_score },
    { label: t.vark.styleNames.reading, value: profile.reading_score },
    { label: t.vark.styleNames.kinesthetic, value: profile.kinesthetic_score },
  ];
  return (
    <>
      <div className="profile-style-card">
        <div className="profile-style-emoji">{STYLE_EMOJI[dominant] || '✨'}</div>
        <div className="profile-style-name">{t.vark.styleNames[dominant] || dominant}</div>
        <p className="muted" style={{ marginTop: 'var(--space-2)', maxWidth: 520 }}>
          {t.vark.styleDescriptions[dominant]}
        </p>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/vark" className="btn btn-ghost btn-sm">
            <RefreshCw size={14} /> {t.vark.retake}
          </Link>
        </div>
      </div>
      <div className="card card-padded" style={{ marginTop: 'var(--space-4)' }}>
        <BarChart rows={rows} />
      </div>
    </>
  );
}

function LearningPathCard({ course }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const path = useQuery({
    queryKey: ['learning-path', course.id],
    queryFn: () => lpApi.myPath(course.id).catch(() => null),
  });
  const materials = useQuery({
    queryKey: ['materials', course.id],
    queryFn: () => materialsApi.listMaterials(course.id),
    enabled: open,
  });

  const generate = useMutation({
    mutationFn: () => lpApi.generate(course.id),
    onSuccess: () => {
      toast.success(t.profile.pathGenerated);
      qc.invalidateQueries({ queryKey: ['learning-path', course.id] });
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  const refresh = useMutation({
    mutationFn: () => lpApi.refresh(course.id),
    onSuccess: () => {
      toast.success(t.profile.pathRefreshed);
      qc.invalidateQueries({ queryKey: ['learning-path', course.id] });
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  return (
    <div className="lp-card">
      <button
        className="lp-card-header"
        style={{ width: '100%' }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div style={{ textAlign: 'left' }}>
          <div className="weight-medium">{course.title}</div>
          {path.data ? (
            <div className="text-sm muted">
              <Badge variant="brand">{path.data.recommended_difficulty}</Badge>
            </div>
          ) : (
            <div className="text-sm muted">{t.profile.pathNotGenerated}</div>
          )}
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="lp-card-body">
          {!path.data ? (
            <div style={{ paddingTop: 'var(--space-3)' }}>
              <Button onClick={() => generate.mutate()} loading={generate.isPending}>
                {t.profile.pathGenerate}
              </Button>
            </div>
          ) : (
            <>
              {path.data.tips?.length ? (
                <>
                  <div className="weight-medium" style={{ marginTop: 'var(--space-4)' }}>
                    {t.profile.pathTipsHeader}
                  </div>
                  <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 0 }} className="stack-sm">
                    {path.data.tips.map((tip, i) => (
                      <li key={i} className="muted" style={{ paddingLeft: 'var(--space-4)', borderLeft: '2px solid var(--color-accent)' }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <div className="weight-medium" style={{ marginTop: 'var(--space-5)' }}>
                {t.profile.pathRecommendedOrder}
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                {path.data.material_order.length === 0 ? (
                  <div className="muted text-sm">—</div>
                ) : (
                  path.data.material_order.map((id, i) => {
                    const m = materials.data?.find((x) => x.id === id);
                    return (
                      <div key={id} className="lp-step">
                        <span className="lp-step-num">{i + 1}</span>
                        <span>{m?.title || `Matériel #${id}`}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="hstack" style={{ marginTop: 'var(--space-4)' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refresh.mutate()}
                  loading={refresh.isPending}
                >
                  <RefreshCw size={14} /> {t.profile.pathRefresh}
                </Button>
                <Link to={`/courses/${course.id}`} className="btn btn-ghost btn-sm">
                  {t.profile.seePath}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
