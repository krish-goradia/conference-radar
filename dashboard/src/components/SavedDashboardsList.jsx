import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { conferencesAPI } from '../services/api';
import '../styles/saved-dashboards.css';

export default function SavedDashboardsList() {
  const navigate = useNavigate();
  const [savedDashboards, setSavedDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    fetchSavedDashboards();
  }, []);

  const fetchSavedDashboards = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await conferencesAPI.getSavedDashboards();
      setSavedDashboards(response.data.dashboards);
    } catch (err) {
      console.error('Error fetching saved dashboards:', err);
      setError('Failed to load saved dashboards');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (userId) => {
    navigate(`/shared/${userId}`);
  };

  if (loading) {
    return <div className="saved-dashboards-section loading">Loading saved dashboards...</div>;
  }

  if (savedDashboards.length === 0) {
    return null; // Don't show section if no saved dashboards
  }

  return (
    <div className="saved-dashboards-section">
      <button 
        className="section-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="toggle-arrow">{isExpanded ? '▼' : '▶'}</span>
        <span className="section-title">📌 Saved Dashboards ({savedDashboards.length})</span>
      </button>

      {isExpanded && (
        <div className="saved-dashboards-list">
          {error && <div className="error-message">{error}</div>}
          {savedDashboards.map((dashboard) => (
            <button
              key={dashboard.id}
              className="saved-dashboard-item"
              onClick={() => handleNavigate(dashboard.id)}
              title={`View ${dashboard.email}'s dashboard`}
            >
              <span className="dashboard-email">{dashboard.email}</span>
              <span className="arrow">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
