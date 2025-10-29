import React, { useCallback } from 'react';
import { useSearch } from '../contexts/SearchContext';

const SearchBar = ({ onToggleResults }) => {
  const {
    filters,
    setFilters,
    isLoading,
    count,
    isSearchActive,
    reset,
  } = useSearch();

  const handleChange = useCallback(
    (event) => {
      const { value } = event.target;
      setFilters((prev) => ({
        ...prev,
        text: value,
        from: 0,
      }));
    },
    [setFilters]
  );

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="search-container" style={{ marginBottom: '20px' }}>
      <div
        className="search-input-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          backgroundColor: 'white',
        }}
      >
        <span style={{ color: '#6b7280', fontSize: '16px' }}>🔍</span>
        <input
          type="text"
          placeholder="Search tasks…"
          value={filters.text}
          onChange={handleChange}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            fontSize: '16px',
            backgroundColor: 'transparent',
          }}
          aria-label="Search tasks"
        />
        {isLoading && (
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Searching…</span>
        )}
        {isSearchActive && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
            title="Clear search"
          >
            ✕
          </button>
        )}
        {onToggleResults && (
          <button
            type="button"
            onClick={onToggleResults}
            disabled={!isSearchActive}
            style={{
              backgroundColor: isSearchActive ? '#3b82f6' : '#e5e7eb',
              color: isSearchActive ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: isSearchActive ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s ease',
            }}
          >
            Results ({isSearchActive ? count : 0})
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
