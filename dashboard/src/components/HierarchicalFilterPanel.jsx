import { useState, useEffect } from 'react';
import { conferencesAPI } from '../services/api';
import '../styles/components.css';

export default function HierarchicalFilterPanel({
  selectedDomains,
  selectedKeywords,
  onSelectedDomainsChange,
  onSelectedKeywordsChange,
  onClearFilters,
  userId = null, // If set, fetch public research domains for this user
}) {
  const [researchDomains, setResearchDomains] = useState([]);
  const [expandedDomains, setExpandedDomains] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch research domains
  useEffect(() => {
    const fetchDomains = async () => {
      setLoading(true);
      setError('');
      try {
        let response;
        if (userId) {
          response = await conferencesAPI.getUserResearchDomains(userId);
        } else {
          response = await conferencesAPI.getResearchDomains();
        }
        if (response.data.success) {
          setResearchDomains(response.data.researchDomains);
        } else {
          setError('Failed to fetch research domains');
        }
      } catch (err) {
        console.error('Failed to fetch research domains:', err);
        setError('Failed to load research domains');
      } finally {
        setLoading(false);
      }
    };
    fetchDomains();
  }, [userId]);

  const toggleDomainExpand = (domain) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
  };

  const handleDomainCheckChange = (domain) => {
    const newDomains = selectedDomains.includes(domain)
      ? selectedDomains.filter(d => d !== domain)
      : [...selectedDomains, domain];
    onSelectedDomainsChange(newDomains);
  };

  const handleKeywordCheckChange = (keyword) => {
    const newKeywords = selectedKeywords.includes(keyword)
      ? selectedKeywords.filter(k => k !== keyword)
      : [...selectedKeywords, keyword];
    onSelectedKeywordsChange(newKeywords);
  };

  const hasActiveFilters = selectedDomains.length > 0 || selectedKeywords.length > 0;

  if (loading) {
    return (
      <div className="hierarchical-filter-panel">
        <p className="filter-loading">Loading research domains...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hierarchical-filter-panel">
        <p className="filter-error">{error}</p>
      </div>
    );
  }

  if (researchDomains.length === 0) {
    return (
      <div className="hierarchical-filter-panel">
        <p className="filter-empty">No research domains found</p>
      </div>
    );
  }

  return (
    <div className="hierarchical-filter-panel">
      <div className="filter-header">
        <h3>Research Domains</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="clear-filters-btn"
            title="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>

      <div className="hierarchy-container">
        {researchDomains.map((item) => {
          const domainIsSelected = selectedDomains.includes(item.domain);
          const isExpanded = expandedDomains.has(item.domain);

          return (
            <div key={item.domain} className="hierarchy-item">
              {/* Parent Domain */}
              <div className="hierarchy-parent">
                <button
                  className="expand-btn"
                  onClick={() => toggleDomainExpand(item.domain)}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
                <label className="parent-label">
                  <input
                    type="checkbox"
                    checked={domainIsSelected}
                    onChange={() => handleDomainCheckChange(item.domain)}
                    className="parent-checkbox"
                  />
                  <span className="domain-name">{item.domain}</span>
                  <span className="keyword-count">
                    ({item.keywords.length})
                  </span>
                </label>
              </div>

              {/* Child Keywords */}
              {isExpanded && item.keywords.length > 0 && (
                <div className="hierarchy-children">
                  {item.keywords.map((keyword) => (
                    <div key={keyword} className="hierarchy-child">
                      <label className="child-label">
                        <input
                          type="checkbox"
                          checked={selectedKeywords.includes(keyword)}
                          onChange={() => handleKeywordCheckChange(keyword)}
                          className="child-checkbox"
                        />
                        <span className="keyword-name">{keyword}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasActiveFilters && (
        <div className="filter-summary">
          <small>
            {selectedDomains.length > 0 && (
              <div>{selectedDomains.length} domain(s) selected</div>
            )}
            {selectedKeywords.length > 0 && (
              <div>{selectedKeywords.length} keyword(s) selected</div>
            )}
          </small>
        </div>
      )}
    </div>
  );
}
