// src/components/Resources/ResourceUIComponents.js
import React from 'react';
import {
  getResourceFormatIcon,
  getResourceFormatColors,
  getResourceFormatLabel,
  RESOURCE_FORMAT_LABELS
} from './resourceTypes';

/**
 * EmptyResourcePanel - Displays an empty state for resources
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {ReactNode} props.icon - Optional custom icon component
 */
export const EmptyResourcePanel = ({ message, icon }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      textAlign: 'center',
      color: '#6b7280',
      backgroundColor: '#f9fafb',
      borderRadius: '6px',
      border: '2px dashed #d1d5db',
      padding: '32px'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
        {icon || '📚'}
      </div>
      <p style={{ 
        fontSize: '16px', 
        fontWeight: '500',
        color: '#374151',
        marginBottom: '8px'
      }}>
        {message}
      </p>
    </div>
  );
};

/**
 * ResourceDeleteConfirmation - A modal dialog to confirm resource deletion
 * @param {Object} props
 * @param {Function} props.onConfirm - Function to call when deletion is confirmed
 * @param {Function} props.onCancel - Function to call when deletion is canceled
 * @param {Object} props.resource - The resource being deleted
 */
export const ResourceDeleteConfirmation = ({ onConfirm, onCancel, resource }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '400px',
        maxWidth: '90vw',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗑️</div>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            color: '#dc2626', 
            fontSize: '18px', 
            fontWeight: 'bold' 
          }}>
            Delete Resource
          </h3>
          <p style={{ margin: 0, color: '#374151' }}>
            Are you sure you want to delete "{resource?.title}"?
          </p>
        </div>
        
        {resource && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>
                {getResourceFormatIcon(resource.format)}
              </span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {resource.title}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {getResourceFormatLabel(resource.format)}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px' 
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#dc2626',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Delete Resource
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * ResourceFormatSelector - A visual selector for resource formats
 * @param {Object} props
 * @param {string} props.selectedFormat - Currently selected format
 * @param {Function} props.onFormatSelect - Function called when format is selected
 * @param {boolean} props.disabled - Whether the selector is disabled
 */
export const ResourceFormatSelector = ({ selectedFormat, onFormatSelect, disabled = false }) => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
      gap: '8px' 
    }}>
      {Object.entries(RESOURCE_FORMAT_LABELS).map(([format, label]) => {
        const isSelected = selectedFormat === format;
        const colors = getResourceFormatColors(format);
        const icon = getResourceFormatIcon(format);
        
        return (
          <button
            key={format}
            onClick={() => !disabled && onFormatSelect(format)}
            disabled={disabled}
            style={{
              padding: '12px 8px',
              borderRadius: '6px',
              border: isSelected ? `2px solid ${colors.text}` : '1px solid #d1d5db',
              backgroundColor: isSelected ? colors.bg : 'white',
              color: isSelected ? colors.text : '#374151',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              opacity: disabled ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!disabled && !isSelected) {
                e.target.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && !isSelected) {
                e.target.style.backgroundColor = 'white';
              }
            }}
          >
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              textAlign: 'center',
              lineHeight: '1.2'
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * ResourceTagInput - Enhanced tag input component
 * @param {Object} props
 * @param {Array} props.tags - Current tags array
 * @param {Function} props.onTagsChange - Function called when tags change
 * @param {Array} props.suggestions - Array of suggested tags
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether input is disabled
 */
export const ResourceTagInput = ({ 
  tags = [], 
  onTagsChange, 
  suggestions = [], 
  placeholder = "Type a tag and press Enter",
  disabled = false 
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef(null);

  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
    !tags.includes(suggestion.toLowerCase())
  ).slice(0, 5);

  const addTag = (tag) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Tag Display */}
      {tags.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px', 
          marginBottom: '8px' 
        }}>
          {tags.map((tag, index) => (
            <span
              key={index}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.3)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    marginLeft: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      
      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowSuggestions(e.target.value.length > 0);
        }}
        onKeyPress={handleKeyPress}
        onFocus={() => setShowSuggestions(inputValue.length > 0)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #d1d5db',
          outline: 'none',
          fontSize: '14px'
        }}
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 10,
          maxHeight: '120px',
          overflow: 'auto'
        }}>
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => addTag(suggestion)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * ResourceCard - Compact card view for resources
 * @param {Object} props
 * @param {Object} props.resource - The resource object
 * @param {Function} props.onClick - Function called when card is clicked
 * @param {boolean} props.isSelected - Whether the card is selected
 * @param {boolean} props.showActions - Whether to show action buttons
 */
export const ResourceCard = ({ 
  resource, 
  onClick, 
  isSelected = false, 
  showActions = false,
  onEdit = null,
  onDelete = null 
}) => {
  const formatColors = getResourceFormatColors(resource.format);
  const formatIcon = getResourceFormatIcon(resource.format);
  const formatLabel = getResourceFormatLabel(resource.format);
  
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px',
        borderRadius: '6px',
        border: isSelected ? `2px solid ${formatColors.text}` : '1px solid #e5e7eb',
        backgroundColor: isSelected ? formatColors.bg : 'white',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>
          {formatIcon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#1f2937',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {resource.title}
          </h4>
          
          {/* Format Badge */}
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            backgroundColor: formatColors.bg,
            color: formatColors.text,
            borderRadius: '8px',
            fontWeight: 'bold'
          }}>
            {formatLabel}
          </span>
        </div>
        
        {/* Action Buttons */}
        {showActions && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Del
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Description Preview */}
      {resource.description && (
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '11px',
          color: '#6b7280',
          lineHeight: '1.3',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {resource.description}
        </p>
      )}
      
      {/* Tags Preview */}
      {resource.tags && resource.tags.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          <span style={{
            fontSize: '9px',
            color: '#9ca3af',
            backgroundColor: '#f3f4f6',
            padding: '1px 4px',
            borderRadius: '6px'
          }}>
            {resource.tags.length} tag{resource.tags.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * ResourceLoadingCard - Loading placeholder for resource cards
 */
export const ResourceLoadingCard = () => {
  return (
    <div style={{
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      animation: 'pulse 2s infinite'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{
          width: '18px',
          height: '18px',
          backgroundColor: '#e5e7eb',
          borderRadius: '2px'
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            height: '14px',
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
            marginBottom: '4px',
            width: '60%'
          }} />
          <div style={{
            height: '10px',
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
            width: '40%'
          }} />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};