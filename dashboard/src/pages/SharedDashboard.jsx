import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { conferencesAPI } from '../services/api';
import ConferenceTable from '../components/ConferenceTable';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
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
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

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
          filterValue
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
  }, [userId, search, filterBy, filterValue]);

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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>📡 {userInfo?.email || 'User'}'s Conferences</h1>
            <p className="shared-badge">↗ Shared Dashboard</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="logout-btn">
            My Dashboard
          </button>
        </div>
      </header>

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
  );
}
