import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { conferencesAPI } from '../services/api';
import ConferenceCard from '../components/ConferenceCard';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import '../styles/dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
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

  // Fetch conferences
  useEffect(() => {
    const fetchConferences = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await conferencesAPI.getMyConferences(
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
  }, [search, filterBy, filterValue]);

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

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📡 My Conferences</h1>
          <button onClick={handleLogout} className="logout-btn">
            Logout
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
          <div className="conferences-grid">
            {conferences.map((conf) => (
              <ConferenceCard key={conf.config_id} conference={conf} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}