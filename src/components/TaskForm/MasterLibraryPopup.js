// src/components/TaskForm/MasterLibraryPopup.js
import React from 'react';
import MasterLibrarySearchBar from '../MasterLibrary/MasterLibrarySearchBar';

const MasterLibraryPopup = ({ 
  isOpen, 
  onClose, 
  onCopyTask,
  position = { top: 0, left: 0 } 
}) => {
  if (!isOpen) return null;

  const handleCopyTask = (task) => {
    console.log('Copying task from popup:', task);
    onCopyTask(task);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
      />
      
      {/* Popup Container */}
      <div
        style={{
          position: 'fixed',
          top: Math.max(20, position.top),
          left: Math.max(20, position.left - 500), // Position to the left of the form
          width: '480px',
          maxHeight: 'calc(100vh - 40px)',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 1001,
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontWeight: 'bold' }}>
            Search Master Library
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ 
          height: 'calc(100vh - 140px)',
          maxHeight: '600px',
          overflow: 'auto',
          padding: '16px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ 
              margin: '0 0 12px 0', 
              color: '#6b7280', 
              fontSize: '14px' 
            }}>
              Search for templates to copy into your current task form:
            </p>
            <MasterLibrarySearchBar
              mode="copy"
              onCopyTask={handleCopyTask}
              onViewTask={handleCopyTask}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default MasterLibraryPopup;