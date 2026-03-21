import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { conferencesAPI } from '../services/api';
import ConferenceTable from '../components/ConferenceTable';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import SaveDashboardButton from '../components/SaveDashboardButton';
import HierarchicalFilterPanel from '../components/HierarchicalFilterPanel';
import SavedDashboardsList from '../components/SavedDashboardsList';
import '../styles/dashboard.css';

export default function SharedDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsLoggedIn(!!token);
  }, []);

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await conferencesAPI.getUserInfo(userId);
        if (response.data.success) {
          setUserInfo(response.data.user);
        } else {
          setError('User not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load user profile');
      }
    };

    fetchUserInfo();
  }, [userId]);

  // Fetch conferences
  useEffect(() => {
    const fetchConferences = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await conferencesAPI.getUserConferences(
          userId,
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
  }, [userId, search, filterBy, filterValue, selectedDomains, selectedKeywords]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (search.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await conferencesAPI.getKeywordAutocomplete(search);
        setSuggestions(response.data);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [search]);

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
          <div>
            <h1>📡 {userInfo?.email || 'User'}'s Conferences</h1>
            <p className="shared-badge">↗ Shared Dashboard</p>
          </div>
          <div className="header-actions">
            <SaveDashboardButton 
              savedUserId={userId}
              isLoggedIn={isLoggedIn}
              onSaveSuccess={() => {
                // Could refresh something here if needed
              }}
            />
            <button onClick={() => navigate('/dashboard')} className="logout-btn">
              My Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-wrapper">
        <aside className="filter-sidebar">
          <SavedDashboardsList />
          <HierarchicalFilterPanel
            selectedDomains={selectedDomains}
            selectedKeywords={selectedKeywords}
            onSelectedDomainsChange={setSelectedDomains}
            onSelectedKeywordsChange={setSelectedKeywords}
            onClearFilters={handleClearAllFilters}
            userId={userId}
          />
        </aside>

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
      </div>
    </div>
  );
}
