import { useState, useEffect } from 'react';
import '../styles/table.css';

export default function ConferenceTable({ conferences }) {
  const [serverTimezoneOffset, setServerTimezoneOffset] = useState(0);
  const [archivedOpen, setArchivedOpen] = useState(false);

  useEffect(() => {
    const fetchServerTimezone = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/server-timezone`);
        const data = await response.json();
        if (data.success) {
          setServerTimezoneOffset(data.offset);
        }
      } catch (err) {
        console.error('Failed to fetch server timezone:', err);
      }
    };
    fetchServerTimezone();
  }, []);

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="null-value">—</span>;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : <span className="null-value">—</span>;
    }
    return value.toString();
  };

  const formatTimeWithTimezone = (time, timezone) => {
    if (!time) return <span className="null-value">—</span>;
    const tz = (timezone && timezone.trim()) || 'AOE'; // since default value is AOE i kept it that
    const shortTime = time.slice(0,5);
    return `${shortTime}${tz ? ` ${tz}` : ''}`;
  };

  const isDeadlinePassed = (dateString) => {
    if (!dateString) return false;
    const [year, month, day] = dateString.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    const now = new Date();
    const userOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    const serverOffsetMs = -serverTimezoneOffset * 60 * 60 * 1000;
    const serverTimeMs = now.getTime() + userOffsetMs + serverOffsetMs;
    const serverToday = new Date(serverTimeMs);
    serverToday.setHours(0, 0, 0, 0);
    return deadlineDate < serverToday;
  };

  const isArchived = (conf) => {
    const dates = [conf.abs_deadline, conf.paper_deadline, conf.confer_enddate].filter(Boolean);
    if (dates.length === 0) return false;
    return dates.every(d => isDeadlinePassed(d));
  };

  const activeConferences = conferences.filter(c => !isArchived(c));
  const archivedConferences = conferences.filter(c => isArchived(c));

  const renderRow = (conf) => (
    <tr key={conf.config_id} className="conference-row">
      <td className="title-cell">
        <div className="title-info">
          <a
            href={conf.conf_url || '#'}
            target={conf.conf_url ? '_blank' : '_self'}
            rel={conf.conf_url ? 'noopener noreferrer' : ''}
            className={`title-link ${!conf.conf_url ? 'disabled' : ''}`}
            title={conf.conf_url ? 'Visit conference website' : 'No URL available'}
          >
            <strong>{conf.short_title || conf.long_title || '—'}</strong>
          </a>
          {conf.long_title && conf.long_title !== conf.short_title && (
            <small className="subtitle">{conf.long_title}</small>
          )}
        </div>
      </td>
      <td className="keywords-cell">
          {conf.keywords && conf.keywords.length > 0 ? (
            <div className="keywords-list">
              {conf.keywords.slice(0, 2).map((kw, i) => (
                <span key={i} className="keyword-tag">{kw}</span>
              ))}
              {conf.keywords.length > 2 && (
                <span className="keyword-tag keyword-tag--more">+{conf.keywords.length - 2}</span>
              )}
            </div>
          ) : (
            <span className="null-value">—</span>
          )}
      </td>
      <td className="deadline-cell">
        {formatValue(conf.abs_deadline)}
      </td>
      <td className="time-tz-cell">
        {formatTimeWithTimezone(conf.abs_time, conf.abs_timezone)}
      </td>
      <td className="deadline-cell">
        {formatValue(conf.paper_deadline)}
      </td>
      <td className="time-tz-cell">
        {formatTimeWithTimezone(conf.paper_time, conf.paper_timezone)}
      </td>
      <td className="info-cell">
        <div className="info-tooltip-wrapper">
          <span className="info-icon" title="More information">ℹ️</span>
          <div className="info-tooltip">
            <div className="tooltip-item">
              <span className="tooltip-label">Conf. Start Date:</span>
              <span className="tooltip-value">{conf.confer_startdate || '—'}</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-label">Conf. End Date:</span>
              <span className="tooltip-value">{conf.confer_enddate || '—'}</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-label">Conf. Venue:</span>
              <span className="tooltip-value">{conf.confer_venue || '—'}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="table-container">
      <table className="conferences-table">
        <thead>
            <tr>
              <th style={{ width: '14%' }}>Title</th>
              <th style={{ width: '14%' }}>Keywords</th>
              <th style={{ width: '16%' }}>Abstract Deadline</th>
              <th style={{ width: '13%' }}>Abstract Time</th>
              <th style={{ width: '14%' }}>Paper Deadline</th>
              <th style={{ width: '14%' }}>Paper Time</th>
              <th style={{ width: '15%' }}>Conference Info</th>
            </tr>
        </thead>
        <tbody>
          {activeConferences.map(renderRow)}

          {archivedConferences.length > 0 && (
            <>
              <tr
                className="archived-toggle-row"
                onClick={() => setArchivedOpen(o => !o)}
              >
                <td colSpan={7}>
                  <span className="archived-toggle-label">
                    {archivedOpen ? '▼' : '▶'} Completed ({archivedConferences.length})
                  </span>
                </td>
              </tr>
              {archivedOpen && archivedConferences.map(renderRow)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}