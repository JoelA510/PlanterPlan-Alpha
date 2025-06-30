// src/components/Search/SearchBar.js
import React, { useState, useRef, useEffect } from 'react';
import { useSearch } from '../contexts/SearchContext';

const SearchBar = ({ onToggleResults }) => {
  const {
    searchFilters,
    updateTextSearch,
    updateFilter,
    activeFilterCount,
    activeFilters,
    removeFilter,
    clearAllFilters,
    applyQuickFilter,
    isSearchActive,
    filteredTasks
  } = useSearch();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  const quickFilters = [
    { id: 'my_overdue', label: 'My Overdue Tasks', icon: '⚠️' },
    { id: 'due_today', label: 'Due Today', icon: '📅' },
    { id: 'my_incomplete', label: 'My Tasks', icon: '👤' },
    { id: 'templates_only', label: 'Templates', icon: '📋' }
  ];

  const handleTextChange = (e) => {
    const value = e.target.value;
    updateTextSearch(value);
    setShowSuggestions(value.length > 0);
  };

  const handleFocus = () => {
    setIsExpanded(true);
    setShowSuggestions(true);
  };

  const handleClickOutside = (e) => {
    if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
      setShowSuggestions(false);
      if (!searchFilters.text && activeFilterCount === 0) {
        setIsExpanded(false);
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchFilters.text, activeFilterCount]);

  return (
    <div className="search-container" style={{ marginBottom: '20px' }}>
      {/* Main Search Input */}
      <div 
        ref={searchInputRef}
        className={`search-input-container ${isExpanded ? 'expanded' : ''}`}
        style={{
          border: isExpanded ? '2px solid #3b82f6' : '1px solid #d1d5db',
          borderRadius: '8px',
          backgroundColor: 'white',
          transition: 'all 0.2s ease',
          boxShadow: isExpanded ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#6b7280', fontSize: '16px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchFilters.text}
            onChange={handleTextChange}
            onFocus={handleFocus}
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              fontSize: '16px',
              backgroundColor: 'transparent'
            }}
          />
          {(searchFilters.text || activeFilterCount > 0) && (
            <button
              onClick={clearAllFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px'
              }}
              title="Clear all filters"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Section */}
        {isExpanded && (
          <div style={{ 
            borderTop: '1px solid #e5e7eb', 
            padding: '16px',
            backgroundColor: '#f8fafc'
          }}>
            {/* Status Filters */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '6px' 
              }}>
                Status
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { value: 'all', label: 'All' },
                  { value: 'incomplete', label: 'Incomplete' },
                  { value: 'complete', label: 'Complete' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'due_today', label: 'Due Today' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateFilter('status', option.value)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      background: searchFilters.status === option.value ? '#3b82f6' : 'white',
                      color: searchFilters.status === option.value ? 'white' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Type Filters */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '6px' 
              }}>
                Scope
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { value: 'all', label: 'All Tasks' },
                  { value: 'my_tasks', label: 'My Tasks' },
                  { value: 'created_by_me', label: 'Created by Me' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateFilter('taskType', option.value)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      background: searchFilters.taskType === option.value ? '#3b82f6' : 'white',
                      color: searchFilters.taskType === option.value ? 'white' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Filters */}
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '6px' 
              }}>
                Quick Filters
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {quickFilters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => applyQuickFilter(filter.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      background: 'white',
                      color: '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{filter.icon}</span>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <div style={{ 
            padding: '8px 16px', 
            backgroundColor: '#eff6ff', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Active filters:</span>
            {activeFilters.map((filter, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '10px',
                  fontSize: '11px'
                }}
              >
                {filter.label}
                <button
                  onClick={() => removeFilter(filter.type)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.3)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Results Summary */}
        {isSearchActive && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f0f9ff',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', color: '#1e40af' }}>
              Found {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </span>
            {onToggleResults && (
              <button
                onClick={onToggleResults}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                {filteredTasks.length > 0 ? 'View Results' : 'Close'}
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .search-input-container.expanded {
          z-index: 10;
          position: relative;
        }
        
        .search-input-container button:hover {
          background-color: #f3f4f6 !important;
        }
        
        .search-input-container button:hover[style*="background: #3b82f6"] {
          background-color: #2563eb !important;
        }
      `}</style>
    </div>
  );
};

export default SearchBar;