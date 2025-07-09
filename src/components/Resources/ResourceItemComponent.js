// src/components/Resources/ResourceItem.js
import React, { useState } from 'react';
import { 
  getResourceFormatIcon, 
  getResourceFormatColors, 
  getResourceFormatLabel 
} from '../../types/resourceTypes';
import { formatDisplayDate } from '../../utils/taskUtils';

const ResourceItem = ({ 
  resource, 
  isSelected = false, 
  onClick, 
  onEdit = null, 
  onDelete = null,
  showActions = true,
  compact = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  if (!resource) return null;
  
  const formatColors = getResourceFormatColors(resource.format);
  const formatIcon = getResourceFormatIcon(resource.format);
  const formatLabel = getResourceFormatLabel(resource.format);
  
  // Get creator display name
  const getCreatorName = () => {
    if (resource.created_by_user) {
      const { first_name, last_name, email } = resource.created_by_user;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();
      return fullName || email || 'Unknown User';
    }
    return 'Unknown User';
  };

  // Handle click events
  const handleClick = (e) => {
    // Don't trigger onClick if clicking on action buttons
    if (e.target.closest('.resource-action-button')) {
      return;
    }
    if (onClick) {
      onClick(resource);
    }
  };

  // Handle action button clicks
  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(resource);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(resource);
    }
  };

  // Handle external link opening
  const handleOpenLink = (e) => {
    e.stopPropagation();
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const baseStyles = {
    padding: compact ? '8px 12px' : '12px',
    margin: '4px 0',
    borderRadius: '6px',
    border: isSelected ? `2px solid ${formatColors.text}` : '1px solid #e5e7eb',
    backgroundColor: isSelected ? formatColors.bg : (isHovered ? '#f9fafb' : 'white'),
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    userSelect: 'none'
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={baseStyles}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        gap: '8px'
      }}>
        {/* Left content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title and format icon */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: compact ? '4px' : '6px',
            gap: '8px'
          }}>
            <span style={{ 
              fontSize: compact ? '14px' : '16px',
              flexShrink: 0 
            }}>
              {formatIcon}
            </span>
            <h4 style={{ 
              margin: 0, 
              fontSize: compact ? '13px' : '14px', 
              fontWeight: 'bold',
              color: isSelected ? formatColors.text : '#1f2937',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {resource.title}
            </h4>
          </div>
          
          {/* Format badge and status */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: compact ? '4px' : '8px'
          }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 'bold',
              borderRadius: '12px',
              backgroundColor: formatColors.bg,
              color: formatColors.text,
              border: `1px solid ${formatColors.border}`
            }}>
              {formatLabel}
            </span>
            
            {/* Published status */}
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '8px',
              backgroundColor: resource.is_published ? '#dcfce7' : '#fee2e2',
              color: resource.is_published ? '#166534' : '#dc2626',
              fontWeight: 'bold'
            }}>
              {resource.is_published ? 'Published' : 'Draft'}
            </span>
            
            {/* URL indicator */}
            {resource.url && (
              <span 
                onClick={handleOpenLink}
                className="resource-action-button"
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  backgroundColor: '#dbeafe',
                  color: '#2563eb',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                title="Click to open link"
              >
                🔗 Link
              </span>
            )}
          </div>
          
          {/* Description preview */}
          {!compact && resource.description && (
            <p style={{ 
              margin: '0 0 8px 0', 
              fontSize: '12px', 
              color: '#6b7280',
              lineHeight: '1.4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {resource.description}
            </p>
          )}
          
          {/* Tags preview */}
          {!compact && resource.tags && resource.tags.length > 0 && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '4px', 
              marginBottom: '8px' 
            }}>
              {resource.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}
                >
                  {tag}
                </span>
              ))}
              {resource.tags.length > 3 && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#e5e7eb',
                  color: '#6b7280',
                  borderRadius: '8px',
                  fontWeight: '500'
                }}>
                  +{resource.tags.length - 3}
                </span>
              )}
            </div>
          )}
          
          {/* Metadata */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px', 
            color: '#9ca3af'
          }}>
            <span>
              Created by {getCreatorName()}
            </span>
            <span>•</span>
            <span>
              {formatDisplayDate(resource.created_at)}
            </span>
            {resource.updated_at !== resource.created_at && (
              <>
                <span>•</span>
                <span>
                  Updated {formatDisplayDate(resource.updated_at)}
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Right side - Action buttons */}
        {showActions && (isHovered || isSelected) && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '4px',
            flexShrink: 0
          }}>
            {onEdit && (
              <button
                onClick={handleEdit}
                className="resource-action-button"
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}
                title="Edit resource"
              >
                ✎ Edit
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={handleDelete}
                className="resource-action-button"
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}
                title="Delete resource"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Compact mode additional info */}
      {compact && resource.tags && resource.tags.length > 0 && (
        <div style={{ 
          marginTop: '4px',
          fontSize: '10px',
          color: '#6b7280'
        }}>
          {resource.tags.length} tag{resource.tags.length !== 1 ? 's' : ''}
          {resource.tags.length <= 2 && ': ' + resource.tags.join(', ')}
        </div>
      )}
    </div>
  );
};

export default ResourceItem;