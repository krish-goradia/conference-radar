import { useRef, useEffect } from 'react';
import '../styles/components.css';

export default function SearchBar({
  value,
  onChange,
  suggestions,
  showSuggestions,
  onShowSuggestions,
  onSelectSuggestion,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        onShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onShowSuggestions]);

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper" ref={inputRef}>
        <input
          type="text"
          placeholder="Search by title, domain, or keywords..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 2 && onShowSuggestions(true)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>

        {showSuggestions && suggestions.length > 0 && (
          <div className="autocomplete-dropdown">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="suggestion-item"
                onClick={() => onSelectSuggestion(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
