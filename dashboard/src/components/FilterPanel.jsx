import '../styles/components.css';

export default function FilterPanel({
  filterBy,
  filterValue,
  onFilterByChange,
  onFilterValueChange,
}) {
  return (
    <div className="filter-panel">
      <div className="filter-group">
        <label htmlFor="filter-type">Filter by deadline:</label>
        <select
          id="filter-type"
          value={filterBy}
          onChange={(e) => {
            onFilterByChange(e.target.value);
            onFilterValueChange('');
          }}
          className="filter-select"
        >
          <option value="">--Select deadline--</option>
          <option value="abs_deadline">Abstract Deadline</option>
          <option value="paper_deadline">Paper Deadline</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-value">Time range:</label>
        <select
          id="filter-value"
          value={filterValue}
          onChange={(e) => onFilterValueChange(e.target.value)}
          className="filter-select"
          disabled={!filterBy}
        >
          <option value="">-- Select range --</option>
          <option value="7 days">Next 7 days</option>
          <option value="14 days">Next 14 days</option>
          <option value="30 days">Next 30 days</option>
          <option value="60 days">Next 60 days</option>
          <option value="90 days">Next 90 days</option>
        </select>
      </div>

      <button
        onClick={() => {
          onFilterByChange('');
          onFilterValueChange('');
        }}
        className="clear-filters-btn"
        disabled={!filterBy && !filterValue}
      >
        Clear Filters
      </button>
    </div>
  );
}