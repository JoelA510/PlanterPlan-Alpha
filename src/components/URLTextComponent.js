import React, { useState } from 'react';

const URLTextComponent = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter text...',
  disabled = false,
  style = {},
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(value);

  // URL regex pattern
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
            style={{
              color: '#2563eb',
              textDecoration: 'underline'
            }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleSave = () => {
    setIsEditing(false);
    if (onChange) {
      onChange(textValue);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTextValue(value); // Reset to original value
  };

  const handleEdit = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  // Update internal state when external value changes
  React.useEffect(() => {
    setTextValue(value);
  }, [value]);

  if (isEditing) {
    return (
      <div style={style} className={className}>
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            outline: 'none',
            resize: 'vertical',
            minHeight: '60px',
            fontFamily: 'inherit',
            fontSize: '14px'
          }}
          rows="2"
          autoFocus
        />
        <div style={{ 
          marginTop: '8px', 
          display: 'flex', 
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleSave}
            style={{
              padding: '4px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '4px 12px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        ...style,
        cursor: disabled ? 'default' : 'pointer',
        minHeight: '40px',
        padding: '8px',
        backgroundColor: disabled ? '#f3f4f6' : '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        fontSize: '14px',
        lineHeight: '1.4'
      }}
      className={className}
      onClick={handleEdit}
    >
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {textValue ? renderTextWithLinks(textValue) : (
          <span style={{ 
            color: '#9ca3af', 
            fontStyle: 'italic' 
          }}>
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
};

export default URLTextComponent;