import React, { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import useMasterLibrarySearch from '../../hooks/useMasterLibrarySearch';
import { getHighlightSegments } from '../../utils/highlightMatches';

const SEARCH_MIN_LENGTH = 2;
const DEBOUNCE_MS = 300;

const MasterLibrarySearch = ({
  onSelect,
  onCreateResource,
  mode = 'copy',
  label = 'Search & pick from Master Library',
  placeholder = 'Search by title or description…',
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const inputRef = useRef(null);
  const hasMinimumQuery = query.trim().length >= SEARCH_MIN_LENGTH;

  const { results, isLoading, error, hasResults } = useMasterLibrarySearch({
    query,
    limit: 15,
    debounceMs: DEBOUNCE_MS,
    enabled: hasMinimumQuery,
  });

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  useEffect(() => {
    if (!hasMinimumQuery) {
      setActiveIndex(-1);
    }
  }, [hasMinimumQuery]);

  const activeResultId = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= results.length) {
      return undefined;
    }
    return `${listboxId}-item-${results[activeIndex].id}`;
  }, [activeIndex, listboxId, results]);

  const handleSelect = (task) => {
    if (onSelect) {
      onSelect(task);
    }
    setQuery(task.title ?? '');
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!hasResults) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= results.length) {
          return 0;
        }
        return nextIndex;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => {
        const nextIndex = prev - 1;
        if (nextIndex < 0) {
          return results.length - 1;
        }
        return nextIndex;
      });
    } else if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < results.length) {
      event.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setActiveIndex(-1);
    }
  };

  const renderActionLabel = useMemo(() => {
    if (mode === 'view') {
      return 'View task';
    }
    return 'Copy to form';
  }, [mode]);

  const renderHighlightedText = (text) => {
    if (text === null || text === undefined) {
      return null;
    }

    if (!hasMinimumQuery) {
      return text;
    }

    const segments = getHighlightSegments(text, query);

    return segments.map((segment, index) =>
      segment.isMatch ? (
        <mark
          key={`${segment.text}-${index}`}
          className="rounded bg-yellow-200 px-0.5 text-slate-900"
        >
          {segment.text}
        </mark>
      ) : (
        <Fragment key={`${segment.text}-${index}`}>{segment.text}</Fragment>
      )
    );
  };

  return (
    <div className="space-y-2">
      <label
        className="block text-sm font-medium text-slate-600"
        htmlFor={`master-library-search-${listboxId}`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={`master-library-search-${listboxId}`}
          type="search"
          className="form-input"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-controls={hasResults ? listboxId : undefined}
          aria-activedescendant={activeResultId}
          aria-expanded={hasResults}
          role="combobox"
          aria-haspopup="listbox"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-label="Master library search results"
        className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm"
      >
        {!hasMinimumQuery && !isLoading ? (
          <div className="px-4 py-3 text-sm text-slate-500">
            Start typing at least {SEARCH_MIN_LENGTH} characters to search the master library.
          </div>
        ) : null}

        {error ? (
          <div className="px-4 py-3 text-sm text-red-600">
            Failed to load results. Please try again.
          </div>
        ) : null}

        {hasMinimumQuery && !isLoading && !error && results.length === 0 ? (
          <div className="px-4 py-3 text-sm text-slate-500">
            No tasks found. You can create a new resource below.
          </div>
        ) : null}

        {results.map((task, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={task.id}
              type="button"
              id={`${listboxId}-item-${task.id}`}
              role="option"
              aria-selected={isActive}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(task)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 focus:outline-none ${
                isActive || (hasResults && activeResultId === `${listboxId}-item-${task.id}`)
                  ? 'bg-blue-50'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {renderHighlightedText(task.title)}
                  </p>
                  {task.description ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {renderHighlightedText(task.description)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400 italic">No description provided.</p>
                  )}
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
                  {task.origin || 'library'}
                </span>
              </div>
              <div className="mt-2 text-right">
                <span className="text-xs font-medium text-blue-600">{renderActionLabel}</span>
              </div>
            </button>
          );
        })}
      </div>

      {onCreateResource ? (
        <div className="flex items-center justify-between rounded-md border border-dashed border-slate-300 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Need something new?</p>
            <p className="text-xs text-slate-500">Create a resource directly from this form.</p>
          </div>
          <button
            type="button"
            onClick={onCreateResource}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create new resource
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default MasterLibrarySearch;
