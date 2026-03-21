import { useState, useEffect } from 'react';
import '../styles/table.css';

export default function ConferenceTable({ conferences }) {
  const [serverTimezoneOffset, setServerTimezoneOffset] = useState(0);

  // Fetch server timezone offset on mount
  useEffect(() => {
    const fetchServerTimezone = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/server-timezone`);
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
    const tz = timezone || '';
    return `${time}${tz ? ` ${tz}` : ''}`;
  };

  const isDeadlinePassed = (dateString) => {
    if (!dateString) return false;
    // Parse date string (YYYY-MM-DD) - already in server timezone from backend
    const [year, month, day] = dateString.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    
    // Get today in server timezone
    const now = new Date();
    const userOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    const serverOffsetMs = -serverTimezoneOffset * 60 * 60 * 1000;
    const serverTimeMs = now.getTime() + userOffsetMs + serverOffsetMs;
    const serverToday = new Date(serverTimeMs);
    serverToday.setHours(0, 0, 0, 0);
    
    return deadlineDate < serverToday;
  };

  return (
    <div className="table-container">
      <table className="conferences-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Abstract Deadline</th>
            <th>Abstract Time</th>
            <th>Paper Deadline</th>
            <th>Paper Time</th>
            <th>Conference Info</th>
          </tr>
        </thead>
        <tbody>
          {conferences.map((conf) => {
            return (
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
                <td className={`deadline-cell ${isDeadlinePassed(conf.abs_deadline) ? 'deadline-passed' : ''}`}>
                  {formatValue(conf.abs_deadline)}
                </td>
                <td className="time-tz-cell">
                  {formatTimeWithTimezone(conf.abs_time, conf.abs_timezone)}
                </td>
                <td className={`deadline-cell ${isDeadlinePassed(conf.paper_deadline) ? 'deadline-passed' : ''}`}>
                  {formatValue(conf.paper_deadline)}
                </td>
                <td className="time-tz-cell">
                  {formatTimeWithTimezone(conf.paper_time, conf.paper_timezone)}
                </td>
                <td className="info-cell">
                  <div className="info-tooltip-wrapper">
                    <span className="info-icon" title="More information">ℹ️</span>
                    <div className="info-tooltip">
                      {conf.confer_date ? (
                        <div className="tooltip-item">
                          <span className="tooltip-label">Conf. Date:</span>
                          <span className="tooltip-value">{conf.confer_date}</span>
                        </div>
                      ) : (
                        <div className="tooltip-item">
                          <span className="tooltip-label">Conf. Date:</span>
                          <span className="tooltip-value">—</span>
                        </div>
                      )}
                      {conf.confer_time ? (
                        <div className="tooltip-item">
                          <span className="tooltip-label">Conf. Time:</span>
                          <span className="tooltip-value">{conf.confer_time}</span>
                        </div>
                      ) : (
                        <div className="tooltip-item">
                          <span className="tooltip-label">Conf. Time:</span>
                          <span className="tooltip-value">—</span>
                        </div>
                      )}
                      {conf.confer_venue ? (
                        <div className="tooltip-item">
                          <span className="tooltip-label">Conf. Venue:</span>
                          <span className="tooltip-value">{conf.confer_venue}</span>
                        </div>
                      ) : (
                        <div className="tooltip-item">
                          <span className="tooltip-label">Conf. Venue:</span>
                          <span className="tooltip-value">—</span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
