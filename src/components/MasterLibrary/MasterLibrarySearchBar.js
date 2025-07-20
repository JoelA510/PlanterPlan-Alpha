// src/components/MasterLibrary/MasterLibrarySearchBar.js
import React, { useState, useRef, useEffect } from 'react';
import { useMasterLibrarySearch } from '../../hooks/useMasterLibrarySearch';

const MasterLibrarySearchBar = ({ onResultSelect, onCreateFromTemplate }) => {
  const {
    searchTerm,
    searchResults,
    isSearching,
    searchError,
    hasSearched,
    hasMoreResults,
    searchSuggestions,
    updateSearchTerm,
    clearSearch,
    loadMoreResults,
    addToLibraryFromSearch,
    isTaskInLibrary,
    isTaskLoading,
    searchStats
  } = useMasterLibrarySearch();

  const [showResults, setShowResults] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Handle clicking outside to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowResults(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show/hide results based on search state
  useEffect(() => {
    if (hasSearched && searchTerm.trim()) {
      setShowResults(true);
      setShowSuggestions(false);
    } else if (!searchTerm.trim()) {
      setShowResults(false);
    }
  }, [hasSearched, searchTerm]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    updateSearchTerm(value);
    
    if (value.trim()) {
      setShowSuggestions(false);
      setShowResults(true);
    } else {
      setShowResults(false);
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowResults(true);
    } else if (searchSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    updateSearchTerm(suggestion);
    setShowSuggestions(false);
    setShowResults(true);
    inputRef.current?.focus();
  };

  const handleClearSearch = () => {
    clearSearch();
    setShowResults(false);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleResultClick = (result) => {
    const task = result.task || result;
    onResultSelect?.(task);
    setShowResults(false);
  };

  const handleAddToLibrary = async (result) => {
    const task = result.task || result;
    await addToLibraryFromSearch(task);
  };

  const handleCreateFromTemplate = (result) => {
    const task = result.task || result;
    onCreateFromTemplate?.(task);
    setShowResults(false);
  };

  const getTaskStatusInfo = (task) => {
    const duration = task.default_duration || task.duration_days || 1;
    const hasChildren = task.actions?.length > 0 || task.resources?.length > 0;
    
    return {
      duration: `${duration} day${duration !== 1 ? 's' : ''}`,
      complexity: hasChildren ? 'Complex' : 'Simple',
      origin: task.origin === 'template' ? 'Template' : 'Instance'
    };
  };

  return (
    <div ref={searchContainerRef} className="master-library-search" style={{ position: 'relative', marginBottom: '20px' }}>
      {/* Search Input */}
      <div style={{
        border: showResults || showSuggestions ? '2px solid #3b82f6' : '1px solid #d1d5db',
        borderRadius: '8px',
        backgroundColor: 'white',
        transition: 'all 0.2s ease',
        boxShadow: showResults || showSuggestions ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          padding: '12px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px' 
        }}>
          <span style={{ color: '#6b7280', fontSize: '18px' }}>🔍</span>
          
          <input
            ref={inputRef}
            type="text"
            placeholder="Search master library templates..."
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              fontSize: '16px',
              backgroundColor: 'transparent'
            }}
          />
          
          {isSearching && (
            <div style={{ 
              color: '#3b82f6',
              animation: 'spin 1s linear infinite',
              fontSize: '16px'
            }}>
              ⟳
            </div>
          )}
          
          {(searchTerm || showResults) && (
            <button
              onClick={handleClearSearch}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                fontSize: '16px'
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Statistics */}
        {showResults && hasSearched && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f0f9ff',
            borderTop: '1px solid #e0f2fe',
            fontSize: '12px',
            color: '#1e40af',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              {searchStats.totalResults} template{searchStats.totalResults !== 1 ? 's' : ''} found
              {searchStats.totalResults > searchStats.currentResults && 
                ` (showing ${searchStats.currentResults})`
              }
            </span>
            {searchError && (
              <span style={{ color: '#dc2626' }}>Search error occurred</span>
            )}
          </div>
        )}
      </div>

      {/* Search Suggestions */}
      {showSuggestions && searchSuggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 50,
          marginTop: '4px'
        }}>
          <div style={{ 
            padding: '8px 12px', 
            fontSize: '12px', 
            fontWeight: '500', 
            color: '#6b7280',
            borderBottom: '1px solid #f3f4f6'
          }}>
            Recent searches
          </div>
          {searchSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                borderBottom: index < searchSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <span style={{ marginRight: '8px' }}>🕐</span>
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Search Results */}
      {showResults && hasSearched && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 50,
          marginTop: '4px',
          maxHeight: '500px',
          overflow: 'auto'
        }}>
          {searchError ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#dc2626'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
              <div style={{ fontWeight: '500' }}>Search Error</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>{searchError}</div>
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>No templates found</div>
              <div style={{ fontSize: '14px' }}>
                Try different keywords or check your spelling
              </div>
            </div>
          ) : (
            <>
              {searchResults.map((result, index) => {
                const task = result.task || result;
                const isInLibrary = isTaskInLibrary(task.id);
                const isLoading = isTaskLoading(task.id);
                const statusInfo = getTaskStatusInfo(task);
                
                return (
                  <div
                    key={result.id || index}
                    style={{
                      padding: '16px',
                      borderBottom: index < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {/* Template Icon */}
                      <div style={{
                        flexShrink: 0,
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#e0f2fe',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                      }}>
                        📋
                      </div>

                      {/* Template Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div 
                          onClick={() => handleResultClick(result)}
                          style={{ cursor: 'pointer' }}
                        >
                          <h4 style={{
                            margin: '0 0 4px 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            lineHeight: '1.3'
                          }}>
                            {task.title || 'Untitled Template'}
                          </h4>
                          
                          {task.description && (
                            <p style={{
                              margin: '0 0 8px 0',
                              fontSize: '14px',
                              color: '#6b7280',
                              lineHeight: '1.4',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {task.description}
                            </p>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '12px',
                            color: '#9ca3af',
                            marginBottom: '12px'
                          }}>
                            <span>{statusInfo.duration}</span>
                            <span>•</span>
                            <span>{statusInfo.complexity}</span>
                            {task.actions?.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{task.actions.length} action{task.actions.length !== 1 ? 's' : ''}</span>
                              </>
                            )}
                            {isInLibrary && (
                              <>
                                <span>•</span>
                                <span style={{ 
                                  color: '#059669',
                                  fontWeight: '500'
                                }}>
                                  ✅ In Your Library
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateFromTemplate(result);
                            }}
                            style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Create a new template based on this one"
                          >
                            <span>📄</span>
                            Create Template
                          </button>

                          {!isInLibrary && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToLibrary(result);
                              }}
                              disabled={isLoading}
                              style={{
                                backgroundColor: isLoading ? '#d1d5db' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Add this template to your library"
                            >
                              {isLoading ? (
                                <>
                                  <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <span>📚</span>
                                  Add to Library
                                </>
                              )}
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResultClick(result);
                            }}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#6b7280',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="View template details"
                          >
                            <span>👁️</span>
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMoreResults && (
                <div style={{
                  padding: '16px',
                  borderTop: '1px solid #f3f4f6',
                  textAlign: 'center'
                }}>
                  <button
                    onClick={loadMoreResults}
                    disabled={isSearching}
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isSearching ? 'not-allowed' : 'pointer',
                      opacity: isSearching ? 0.7 : 1
                    }}
                  >
                    {isSearching ? 'Loading...' : `Load More (${searchStats.totalResults - searchStats.currentResults} remaining)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MasterLibrarySearchBar;