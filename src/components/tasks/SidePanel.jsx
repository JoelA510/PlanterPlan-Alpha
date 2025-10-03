import React, { useEffect } from 'react';

const SidePanel = ({ isOpen, onClose, title, children, width = '500px' }) => {
  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="side-panel-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel */}
      <div 
        className="side-panel"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        {/* Header */}
        <div className="side-panel-header">
          <h2 id="panel-title" className="side-panel-title">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="side-panel-close"
            aria-label="Close panel"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="side-panel-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default SidePanel;