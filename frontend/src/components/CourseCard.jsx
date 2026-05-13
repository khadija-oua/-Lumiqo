import { Link } from 'react-router-dom';
import Badge from './Badge';
import ProgressBar from './ProgressBar';
import t from '../i18n/fr';

export default function CourseCard({
  course,
  to,
  enrolled,
  showEnrollmentBadge = false,
  progress,
  meta,
}) {
  const cover = course.cover_image_url
    ? { backgroundImage: `url(${course.cover_image_url})` }
    : undefined;
  const teacherName =
    course.teacher_first_name && course.teacher_last_name
      ? `${course.teacher_first_name} ${course.teacher_last_name}`
      : null;

  return (
    <Link to={to} className="course-card">
      <div className="course-card-cover" style={cover} aria-hidden />
      <div className="course-card-body">
        <div className="course-card-title">{course.title || t.common.untitled}</div>
        {teacherName && <div className="course-card-teacher">{teacherName}</div>}
        {progress != null && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <div
              className="hstack-between"
              style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}
            >
              <span>{t.dashboard.progress}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <ProgressBar value={progress} />
            </div>
          </div>
        )}
        <div className="course-card-meta">
          {meta || <span />}
          {showEnrollmentBadge && (
            <Badge variant={enrolled ? 'success' : 'default'}>
              {enrolled ? t.courses.enrolled : t.courses.notEnrolled}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
