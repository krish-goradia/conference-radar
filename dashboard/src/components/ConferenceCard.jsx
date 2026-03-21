import { formatDateInServerTimezone, daysUntilDeadlineServerTZ } from '../utils/timezone';
import '../styles/components.css';

export default function ConferenceCard({ conference }) {
  const absDeadlineDays = daysUntilDeadlineServerTZ(conference.abs_time);
  const paperDeadlineDays = daysUntilDeadlineServerTZ(conference.paper_time);

  const getDeadlineColor = (days) => {
    if (!days) return '';
    if (days < 0) return 'deadline-expired';
    if (days < 7) return 'deadline-urgent';
    if (days < 30) return 'deadline-soon';
    return 'deadline-normal';
  };

  return (
    <div className="conference-card">
      <div className="card-header">
        <h3>{conference.short_title || conference.long_title}</h3>
        <a
          href={conference.conf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="external-link"
          title="Visit conference website"
        >
          Link
        </a>
      </div>

      {conference.long_title && conference.long_title !== conference.short_title && (
        <p className="card-subtitle">{conference.long_title}</p>
      )}

      <div className="card-meta">
        {conference.research_domain && (
          <span className="badge badge-domain">{conference.research_domain}</span>
        )}
        {conference.keywords && conference.keywords.length > 0 && (
          <div className="keywords">
            {conference.keywords.slice(0, 3).map((kw, idx) => (
              <span key={idx} className="badge badge-keyword">
                {kw}
              </span>
            ))}
            {conference.keywords.length > 3 && (
              <span className="badge badge-more">+{conference.keywords.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="deadlines">
        {conference.abs_time && (
          <div className={`deadline ${getDeadlineColor(absDeadlineDays)}`}>
            <span className="deadline-label">Abstract Deadline</span>
            <span className="deadline-date">{formatDateInServerTimezone(conference.abs_time)}</span>
            {absDeadlineDays !== null && (
              <span className="deadline-days">
                {absDeadlineDays < 0 ? `${Math.abs(absDeadlineDays)} days ago` : `${absDeadlineDays} days left`}
              </span>
            )}
          </div>
        )}

        {conference.paper_time && (
          <div className={`deadline ${getDeadlineColor(paperDeadlineDays)}`}>
            <span className="deadline-label">Paper Deadline</span>
            <span className="deadline-date">{formatDateInServerTimezone(conference.paper_time)}</span>
            {paperDeadlineDays !== null && (
              <span className="deadline-days">
                {paperDeadlineDays < 0 ? `${Math.abs(paperDeadlineDays)} days ago` : `${paperDeadlineDays} days left`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
