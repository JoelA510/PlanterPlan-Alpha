import React, { useState, useRef, useEffect } from 'react';

const MonthSelector = ({ selectedMonth, onMonthChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = currentYear - 5; year <= currentYear + 2; year++) {
    yearOptions.push(year);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen]);

  // Handle month selection
  const handleMonthSelect = (month, year) => {
    onMonthChange({ month, year });
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      default:
        break;
    }
  };

  // Format selected month for display
  const formatSelectedMonth = () => {
    return `${monthNames[selectedMonth.month]} ${selectedMonth.year}`;
  };

  // Check if a month/year combination is in the future
  const isFutureMonth = (month, year) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return year > currentYear || (year === currentYear && month > currentMonth);
  };

  // Get relative time description
  const getRelativeTime = (month, year) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (year === currentYear && month === currentMonth) {
      return 'This month';
    }
    
    const monthDiff = (year - currentYear) * 12 + (month - currentMonth);
    
    if (monthDiff === -1) return 'Last month';
    if (monthDiff === 1) return 'Next month';
    if (monthDiff < 0) return `${Math.abs(monthDiff)} months ago`;
    if (monthDiff > 0) return `${monthDiff} months from now`;
    
    return '';
  };

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-50'}
          ${isOpen ? 'ring-1 ring-blue-500 border-blue-500' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="month-selector-label"
      >
        <span className="block truncate font-medium">
          {formatSelectedMonth()}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          role="listbox"
          aria-labelledby="month-selector-label"
        >
          {/* Recent/Quick Options */}
          <div className="py-2 border-b border-gray-200">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Quick Select
            </div>
            
            {/* Current Month */}
            {(() => {
              const now = new Date();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              const isSelected = selectedMonth.month === currentMonth && selectedMonth.year === currentYear;
              
              return (
                <button
                  onClick={() => handleMonthSelect(currentMonth, currentYear)}
                  className={`
                    w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between
                    ${isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-900'}
                  `}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{monthNames[currentMonth]} {currentYear}</span>
                  <span className="text-xs text-gray-500">This month</span>
                </button>
              );
            })()}

            {/* Last Month */}
            {(() => {
              const lastMonth = new Date();
              lastMonth.setMonth(lastMonth.getMonth() - 1);
              const month = lastMonth.getMonth();
              const year = lastMonth.getFullYear();
              const isSelected = selectedMonth.month === month && selectedMonth.year === year;
              
              return (
                <button
                  onClick={() => handleMonthSelect(month, year)}
                  className={`
                    w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between
                    ${isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-900'}
                  `}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{monthNames[month]} {year}</span>
                  <span className="text-xs text-gray-500">Last month</span>
                </button>
              );
            })()}
          </div>

          {/* Year/Month Grid */}
          <div className="py-2">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              All Months
            </div>
            
            {yearOptions.map(year => (
              <div key={year} className="mb-2 last:mb-0">
                <div className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-50">
                  {year}
                </div>
                <div className="grid grid-cols-3 gap-1 px-2 py-1">
                  {monthNames.map((monthName, monthIndex) => {
                    const isSelected = selectedMonth.month === monthIndex && selectedMonth.year === year;
                    const isFuture = isFutureMonth(monthIndex, year);
                    const relativeTime = getRelativeTime(monthIndex, year);
                    
                    return (
                      <button
                        key={monthIndex}
                        onClick={() => handleMonthSelect(monthIndex, year)}
                        className={`
                          px-2 py-1 text-xs rounded text-center transition-colors duration-150
                          ${isSelected 
                            ? 'bg-blue-600 text-white' 
                            : isFuture 
                              ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                        role="option"
                        aria-selected={isSelected}
                        title={relativeTime ? `${monthName} ${year} (${relativeTime})` : `${monthName} ${year}`}
                      >
                        {monthName.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthSelector;