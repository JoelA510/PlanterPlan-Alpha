// src/components/Resources/ResourceDetailsPanel.js
import React from 'react';
import { 
  getResourceFormatLabel, 
  getResourceFormatIcon, 
  getResourceFormatColors
} from './resourceTypes';
import { formatDisplayDate } from '../../utils/taskUtils';

const ResourceDetailsPanel = ({
  resource,
  onEdit,
  onDelete,
  onClose
}) => {
  if (!resource) return null;

  // Get format display properties directly
  const formatColors = getResourceFormatColors(resource.format);
  const formatIcon = getResourceFormatIcon(resource.format);
  const formatLabel = getResourceFormatLabel(resource.format);

  // Handle external link opening
  const handleOpenLink = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle copy URL to clipboard
  const handleCopyUrl = async (url) => {
    if (navigator.clipboard && url) {
      try {
        await navigator.clipboard.writeText(url);
        // You could add a toast notification here in the future
        console.log('URL copied to clipboard');
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

  // Get creator display name
  const getCreatorName = () => {
    if (resource.created_by_user) {
      const { first_name, last_name, email } = resource.created_by_user;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();
      return fullName || email || 'Unknown User';
    }
    return 'Unknown User';
  };

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      height: '100%',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: formatColors.text,
        color: 'white',
        padding: '16px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '12px', fontSize: '24px' }}>
              {formatIcon}
            </span>
            <h3 style={{ 
              margin: 0, 
              fontWeight: 'bold',
              wordBreak: 'break-word'
            }}>
              {resource.title}
            </h3>
          </div>
          
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Format Badge */}
        <div style={{ 
          display: 'inline-block',
          marginBottom: '16px'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 12px',
            backgroundColor: formatColors.bg,
            color: formatColors.text,
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 'bold',
            border: `1px solid ${formatColors.border}`
          }}>
            <span style={{ marginRight: '6px' }}>{formatIcon}</span>
            {formatLabel}
          </span>
        </div>

        {/* URL Section */}
        {resource.url && (
          <div style={{ 
            backgroundColor: '#f0f9ff', 
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            border: '1px solid #e0f2fe'
          }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '0', fontSize: '14px' }}>
              Resource Link
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  wordBreak: 'break-all',
                  fontSize: '14px',
                  flex: 1
                }}
                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
              >
                {resource.url}
              </a>
              <button
                onClick={() => handleOpenLink(resource.url)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                title="Open in new tab"
              >
                🔗 Open
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '0' }}>
            Description
          </h4>
          {resource.description ? (
            <div style={{ 
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {resource.description}
            </div>
          ) : (
            <div style={{ 
              color: '#6b7280', 
              fontStyle: 'italic',
              backgroundColor: '#f9fafb',
              padding: '12px',
              borderRadius: '4px',
              border: '1px dashed #d1d5db'
            }}>
              No description provided
            </div>
          )}
        </div>

        {/* Usage Rights */}
        {resource.usage_rights && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '0' }}>
              Usage Rights
            </h4>
            <div style={{ 
              backgroundColor: '#fefce8',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #fde047',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {resource.usage_rights}
            </div>
          </div>
        )}

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '0' }}>
              Tags
            </h4>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '6px' 
            }}>
              {resource.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Section */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '12px', marginTop: '0', fontSize: '14px' }}>
            Resource Information
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            {/* Creator */}
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Created by</span>
              <span style={{ fontWeight: '500', color: '#1f2937' }}>
                {getCreatorName()}
              </span>
            </div>

            {/* Published Status */}
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Status</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 'bold',
                backgroundColor: resource.is_published ? '#dcfce7' : '#fee2e2',
                color: resource.is_published ? '#166534' : '#dc2626'
              }}>
                {resource.is_published ? '✓ Published' : '✕ Unpublished'}
              </span>
            </div>

            {/* Created Date */}
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Created</span>
              <span style={{ fontWeight: '500', color: '#1f2937' }}>
                {formatDisplayDate(resource.created_at)}
              </span>
            </div>

            {/* Updated Date */}
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Last updated</span>
              <span style={{ fontWeight: '500', color: '#1f2937' }}>
                {formatDisplayDate(resource.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {resource.url && (
          <div style={{ 
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #e0f2fe'
          }}>
            <h4 style={{ 
              fontWeight: 'bold', 
              marginBottom: '8px', 
              marginTop: '0', 
              fontSize: '14px',
              color: '#0369a1' 
            }}>
              Quick Actions
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleOpenLink(resource.url)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🔗 Open Resource
              </button>
              
              {navigator.clipboard && (
                <button
                  onClick={() => handleCopyUrl(resource.url)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📋 Copy URL
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* Edit Button */}
          <button
            onClick={onEdit}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              border: 'none',
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            <span style={{ marginRight: '6px' }}>✎</span>
            Edit Resource
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              border: 'none',
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            <span style={{ marginRight: '6px' }}>🗑️</span>
            Delete Resource
          </button>
        </div>

        {/* Usage Analytics (Future Enhancement) */}
        <div style={{ 
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            marginTop: '0', 
            fontSize: '14px',
            color: '#475569' 
          }}>
            Usage Information
          </h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#64748b', 
              margin: 0,
              fontStyle: 'italic' 
            }}>
              Usage tracking will be available in a future update
            </p>
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}>
              Coming Soon
            </span>
          </div>
        </div>

        {/* Resource ID for debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details style={{ marginBottom: '16px', fontSize: '12px' }}>
            <summary style={{ color: '#6b7280', cursor: 'pointer' }}>
              Developer Information
            </summary>
            <div style={{ 
              marginTop: '8px', 
              padding: '8px', 
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              <div>Resource ID: {resource.id}</div>
              <div>Created By: {resource.created_by}</div>
              <div>White Label ID: {resource.white_label_id || 'null'}</div>
              <div>Format: {resource.format}</div>
              <div>Published: {resource.is_published ? 'true' : 'false'}</div>
            </div>
          </details>
        )}

        {/* Footer with additional resource info */}
        <div style={{
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center'
        }}>
          <div>
            Resource ID: {resource.id.split('-')[0]}...
          </div>
          <div style={{ marginTop: '4px' }}>
            {resource.is_published 
              ? `Published and available to ${resource.white_label_id ? 'organization members' : 'all users'}`
              : 'Draft - only visible to you'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceDetailsPanel;