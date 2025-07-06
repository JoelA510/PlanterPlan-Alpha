// src/components/Resources/ResourceList.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationProvider';
import { 
  fetchAllResources, 
  createResource, 
  updateResource, 
  deleteResource,
  RESOURCE_FORMATS 
} from '../../services/resourceService';
import { 
  getResourceFormatLabel, 
  getResourceFormatIcon, 
  getResourceFormatColors,
  validateResourceData,
  DEFAULT_RESOURCE 
} from '../../types/resourceTypes';
import ResourceForm from './ResourceForm';
import ResourceDetailsPanel from './ResourceDetailsPanel';
import { EmptyPanel } from '../TaskList/TaskUIComponents';

const ResourceList = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  
  // State management
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Filters
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [showMyResourcesOnly, setShowMyResourcesOnly] = useState(false);

  // Fetch resources
  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = showMyResourcesOnly ? user?.id : null;
      const result = await fetchAllResources(organizationId, userId, true);
      
      if (result.error) {
        setError(result.error);
      } else {
        setResources(result.data || []);
      }
    } catch (err) {
      setError('Failed to load resources');
      console.error('Error loading resources:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load resources on component mount and when filters change
  useEffect(() => {
    loadResources();
  }, [organizationId, user?.id, showMyResourcesOnly]);

  // Filter resources based on current filters
  const filteredResources = resources.filter(resource => {
    // Format filter
    if (filterFormat !== 'all' && resource.format !== filterFormat) {
      return false;
    }
    
    // Text filter
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      const matchesTitle = resource.title?.toLowerCase().includes(searchLower);
      const matchesDescription = resource.description?.toLowerCase().includes(searchLower);
      const matchesTags = resource.tags?.some(tag => 
        tag.toLowerCase().includes(searchLower)
      );
      
      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });

  // Handle resource creation
  const handleCreateResource = async (resourceData) => {
    try {
      setIsCreating(true);
      
      const validation = validateResourceData(resourceData);
      if (!validation.isValid) {
        alert('Please fix the following errors:\n' + validation.errors.join('\n'));
        return;
      }
      
      const dataToCreate = {
        ...resourceData,
        created_by: user.id,
        white_label_id: organizationId
      };
      
      const result = await createResource(dataToCreate);
      
      if (result.error) {
        alert('Error creating resource: ' + result.error);
      } else {
        setResources(prev => [result.data, ...prev]);
        setShowForm(false);
        setSelectedResource(result.data);
      }
    } catch (err) {
      alert('Error creating resource: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle resource update
  const handleUpdateResource = async (resourceId, resourceData) => {
    try {
      const validation = validateResourceData(resourceData);
      if (!validation.isValid) {
        alert('Please fix the following errors:\n' + validation.errors.join('\n'));
        return;
      }
      
      const result = await updateResource(resourceId, resourceData);
      
      if (result.success) {
        setResources(prev => prev.map(r => 
          r.id === resourceId ? result.data : r
        ));
        setEditingResource(null);
        setSelectedResource(result.data);
      } else {
        alert('Error updating resource: ' + result.error);
      }
    } catch (err) {
      alert('Error updating resource: ' + err.message);
    }
  };

  // Handle resource deletion
  const handleDeleteResource = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }
    
    try {
      const result = await deleteResource(resourceId);
      
      if (result.success) {
        setResources(prev => prev.filter(r => r.id !== resourceId));
        setSelectedResource(null);
      } else {
        alert('Error deleting resource: ' + result.error);
      }
    } catch (err) {
      alert('Error deleting resource: ' + err.message);
    }
  };

  // Handle resource selection
  const handleResourceSelect = (resource) => {
    setSelectedResource(resource);
    setEditingResource(null);
    setShowForm(false);
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingResource(null);
  };

  // Render loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>Loading resources...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        color: '#ef4444'
      }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Panel - Resource List */}
      <div style={{ 
        width: '50%', 
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header with filters and create button */}
        <div style={{ 
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Resources ({filteredResources.length})
            </h2>
            
            <button
              onClick={() => {
                setShowForm(true);
                setEditingResource(null);
                setSelectedResource(null);
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              + Create Resource
            </button>
          </div>
          
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* Text search */}
            <input
              type="text"
              placeholder="Search resources..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                flex: '1',
                minWidth: '200px'
              }}
            />
            
            {/* Format filter */}
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Formats</option>
              {Object.values(RESOURCE_FORMATS).map(format => (
                <option key={format} value={format}>
                  {getResourceFormatLabel(format)}
                </option>
              ))}
            </select>
            
            {/* My resources toggle */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showMyResourcesOnly}
                onChange={(e) => setShowMyResourcesOnly(e.target.checked)}
                style={{ marginRight: '6px' }}
              />
              My Resources Only
            </label>
          </div>
        </div>
        
        {/* Resource List */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '8px'
        }}>
          {filteredResources.length === 0 ? (
            <EmptyPanel 
              message={
                resources.length === 0 
                  ? "No resources yet. Create your first resource to get started!"
                  : "No resources match your current filters."
              }
              icon="📚"
            />
          ) : (
            filteredResources.map(resource => (
              <ResourceItem
                key={resource.id}
                resource={resource}
                isSelected={selectedResource?.id === resource.id}
                onClick={() => handleResourceSelect(resource)}
                onEdit={() => {
                  setEditingResource(resource);
                  setShowForm(true);
                  setSelectedResource(null);
                }}
                onDelete={() => handleDeleteResource(resource.id)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Right Panel - Details/Form */}
      <div style={{ width: '50%' }}>
        {showForm ? (
          <ResourceForm
            initialData={editingResource || DEFAULT_RESOURCE}
            isEditing={!!editingResource}
            onSubmit={editingResource 
              ? (data) => handleUpdateResource(editingResource.id, data)
              : handleCreateResource
            }
            onCancel={handleFormCancel}
            isLoading={isCreating}
          />
        ) : selectedResource ? (
          <ResourceDetailsPanel
            resource={selectedResource}
            onEdit={() => {
              setEditingResource(selectedResource);
              setShowForm(true);
            }}
            onDelete={() => handleDeleteResource(selectedResource.id)}
            onClose={() => setSelectedResource(null)}
          />
        ) : (
          <EmptyPanel 
            message="Select a resource to view details or create a new one"
            icon="📋"
          />
        )}
      </div>
    </div>
  );
};

// ResourceItem component for individual resource display
const ResourceItem = ({ resource, isSelected, onClick, onEdit, onDelete }) => {
  const formatColors = getResourceFormatColors(resource.format);
  const formatIcon = getResourceFormatIcon(resource.format);
  const formatLabel = getResourceFormatLabel(resource.format);
  
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px',
        margin: '4px 0',
        borderRadius: '6px',
        border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        backgroundColor: isSelected ? '#eff6ff' : 'white',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#f9fafb';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'white';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {/* Title and format */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ marginRight: '8px', fontSize: '16px' }}>
              {formatIcon}
            </span>
            <h4 style={{ 
              margin: 0, 
              fontSize: '14px', 
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              {resource.title}
            </h4>
          </div>
          
          {/* Format badge */}
          <div style={{ marginBottom: '8px' }}>
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
          </div>
          
          {/* Description preview */}
          {resource.description && (
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
          
          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
              {resource.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    borderRadius: '8px'
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
                  borderRadius: '8px'
                }}>
                  +{resource.tags.length - 3} more
                </span>
              )}
            </div>
          )}
          
          {/* Created date */}
          <div style={{ 
            fontSize: '11px', 
            color: '#9ca3af',
            marginTop: '4px'
          }}>
            Created {new Date(resource.created_at).toLocaleDateString()}
          </div>
        </div>
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
            title="Edit resource"
          >
            Edit
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
            title="Delete resource"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceList;