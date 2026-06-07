import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { conferencesAPI } from '../services/api';
import ConferenceTable from '../components/ConferenceTable';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import HierarchicalFilterPanel from '../components/HierarchicalFilterPanel';
import SavedDashboardsList from '../components/SavedDashboardsList';
import ShareModal from '../components/ShareModal';
import '../styles/dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/');
      return;
    }

    // Decode JWT to get userId
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      setUserId(decoded.userId);
    } catch (err) {
      console.error('Failed to decode token:', err);
    }
  }, [navigate]);

  // Fetch conferences
  useEffect(() => {
    const fetchConferences = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await conferencesAPI.getMyConferences(
          search,
          filterBy,
          filterValue,
          selectedDomains,
          selectedKeywords
        );
        if (response.data.success) {
          setConferences(response.data.conferences);
        } else {
          setError('Failed to fetch conferences');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchConferences();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, filterBy, filterValue, selectedDomains, selectedKeywords]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (search.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await conferencesAPI.getSearchAutocomplete(search);
        setSuggestions(response.data.map(item => item.value));
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/');
  };

  const handleClearAllFilters = () => {
    setFilterBy('');
    setFilterValue('');
    setSelectedDomains([]);
    setSelectedKeywords([]);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>My Conferences</h1>
          <div className="header-actions">
            <button 
              onClick={() => setShowShareModal(true)} 
              className="share-btn"
              title="Share your dashboard"
            >
              Share
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <ShareModal 
        userId={userId} 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
      />

      <div className="dashboard-wrapper new-dashboard-layout">
        {/* Left Sidebar: HierarchicalFilterPanel */}
        <aside className="left-sidebar">
          <HierarchicalFilterPanel
            selectedDomains={selectedDomains}
            selectedKeywords={selectedKeywords}
            onSelectedDomainsChange={setSelectedDomains}
            onSelectedKeywordsChange={setSelectedKeywords}
            onClearFilters={handleClearAllFilters}
          />
        </aside>

        {/* Center: Main Results */}
        <main className="dashboard-main">
          <div className="controls-section">
            <SearchBar
              value={search}
              onChange={setSearch}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              onShowSuggestions={setShowSuggestions}
              onSelectSuggestion={(suggestion) => {
                setSearch(suggestion);
                setShowSuggestions(false);
              }}
            />

            <FilterPanel
              filterBy={filterBy}
              filterValue={filterValue}
              onFilterByChange={setFilterBy}
              onFilterValueChange={setFilterValue}
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          {loading ? (
            <div className="loading-spinner">
              <p>Loading conferences...</p>
            </div>
          ) : conferences.length === 0 ? (
            <div className="empty-state">
              <p>No conferences found</p>
              <small>Try adjusting your filters or search query</small>
            </div>
          ) : (
            <ConferenceTable conferences={conferences} />
          )}
        </main>

        {/* Right Sidebar: SavedDashboardsList */}
        <aside className="right-sidebar">
          <SavedDashboardsList />
        </aside>
      </div>
    </div>
  );
}