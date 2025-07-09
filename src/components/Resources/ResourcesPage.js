// src/components/Resources/ResourcesPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationProvider';
import { 
  fetchAllResources, 
  createResource, 
  updateResource, 
  deleteResource,
  getResourceTags,
  RESOURCE_FORMATS 
} from '../../services/resourceService';
import { 
  validateResourceData,
  DEFAULT_RESOURCE 
} from '../../types/resourceTypes';
import ResourceItem from './ResourceItem';
import ResourceForm from './ResourceForm';
import ResourceDetailsPanel from './ResourceDetailsPanel';
import { 
  EmptyResourcePanel, 
  ResourceDeleteConfirmation 
} from './ResourceUIComponents';

const ResourcesPage = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  
  // Core state
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [selectedResource, setSelectedResource] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  
  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    text: '',
    format: 'all',
    showMyResourcesOnly: false,
    showUnpublishedOnly: false,
    selectedTags: []
  });
  
  // Available tags for filtering
  const [availableTags, setAvailableTags] = useState([]);

  // Load resources
  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = filters.showMyResourcesOnly ? user?.id : null;
      const publishedOnly = !filters.showUnpublishedOnly;
      
      const result = await fetchAllResources(organizationId, userId, publishedOnly);
      
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
  }, [organizationId, user?.id, filters.showMyResourcesOnly, filters.showUnpublishedOnly]);

  // Load available tags
  const loadAvailableTags = useCallback(async () => {
    try {
      const result = await getResourceTags(organizationId);
      if (result.data) {
        setAvailableTags(result.data);
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  }, [organizationId]);

  // Initial load
  useEffect(() => {
    loadResources();
    loadAvailableTags();
  }, [loadResources, loadAvailableTags]);

  // Filter resources based on current filters
  const filteredResources = resources.filter(resource => {
    // Text filter
    if (filters.text) {
      const searchLower = filters.text.toLowerCase();
      const matchesTitle = resource.title?.toLowerCase().includes(searchLower);
      const matchesDescription = resource.description?.toLowerCase().includes(searchLower);
      const matchesTags = resource.tags?.some(tag => 
        tag.toLowerCase().includes(searchLower)
      );
      
      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false;
      }
    }
    
    // Format filter
    if (filters.format !== 'all' && resource.format !== filters.format) {
      return false;
    }
    
    // Tags filter
    if (filters.selectedTags.length > 0) {
      const hasMatchingTag = filters.selectedTags.some(selectedTag =>
        resource.tags?.includes(selectedTag)
      );
      if (!hasMatchingTag) {
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
        // Reload tags in case new ones were added
        loadAvailableTags();
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
      setIsUpdating(true);
      
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
        setShowForm(false);
        setSelectedResource(result.data);
        // Reload tags in case new ones were added
        loadAvailableTags();
      } else {
        alert('Error updating resource: ' + result.error);
      }
    } catch (err) {
      alert('Error updating resource: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle resource deletion
  const handleDeleteResource = async (resource) => {
    setResourceToDelete(resource);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteResource = async () => {
    if (!resourceToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const result = await deleteResource(resourceToDelete.id);
      
      if (result.success) {
        setResources(prev => prev.filter(r => r.id !== resourceToDelete.id));
        
        // Clear selection if deleted resource was selected
        if (selectedResource?.id === resourceToDelete.id) {
          setSelectedResource(null);
        }
        
        setShowDeleteConfirm(false);
        setResourceToDelete(null);
      } else {
        alert('Error deleting resource: ' + result.error);
      }
    } catch (err) {
      alert('Error deleting resource: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle resource selection
  const handleResourceSelect = (resource) => {
    setSelectedResource(resource);
    setEditingResource(null);
    setShowForm(false);
  };

  // Handle starting new resource creation
  const handleStartCreate = () => {
    setShowForm(true);
    setEditingResource(null);
    setSelectedResource(null);
  };

  // Handle starting resource edit
  const handleStartEdit = (resource) => {
    setEditingResource(resource);
    setShowForm(true);
    setSelectedResource(null);
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingResource(null);
  };

  // Handle filter changes
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle tag filter toggle
  const toggleTagFilter = (tag) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      text: '',
      format: 'all',
      showMyResourcesOnly: false,
      showUnpublishedOnly: false,
      selectedTags: []
    });
  };

  // Render loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '60vh' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #f3f4f6',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280' }}>Loading resources...</p>
        </div>
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
        height: '60vh' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ color: '#dc2626', marginBottom: '8px' }}>Error Loading Resources</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>{error}</p>
          <button
            onClick={loadResources}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
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
            marginBottom: '16px'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              Resources ({filteredResources.length})
            </h2>
            
            <button
              onClick={handleStartCreate}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>+</span>
              Create Resource
            </button>
          </div>
          
          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Text search */}
            <input
              type="text"
              placeholder="Search resources..."
              value={filters.text}
              onChange={(e) => updateFilter('text', e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            
            {/* Filter row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Format filter */}
              <select
                value={filters.format}
                onChange={(e) => updateFilter('format', e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Formats</option>
                {Object.entries(RESOURCE_FORMATS).map(([key, value]) => (
                  <option key={value} value={value}>
                    {key.replace('_', ' ')}
                  </option>
                ))}
              </select>
              
              {/* Toggle filters */}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={filters.showMyResourcesOnly}
                  onChange={(e) => updateFilter('showMyResourcesOnly', e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                My Resources Only
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={filters.showUnpublishedOnly}
                  onChange={(e) => updateFilter('showUnpublishedOnly', e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                Include Drafts
              </label>
              
              {/* Clear filters */}
              {(filters.text || filters.format !== 'all' || filters.showMyResourcesOnly || filters.showUnpublishedOnly || filters.selectedTags.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            {/* Tag filters */}
            {availableTags.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                  Filter by tags:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {availableTags.slice(0, 10).map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        backgroundColor: filters.selectedTags.includes(tag) ? '#3b82f6' : 'white',
                        color: filters.selectedTags.includes(tag) ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontWeight: filters.selectedTags.includes(tag) ? 'bold' : 'normal'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                  {availableTags.length > 10 && (
                    <span style={{ fontSize: '11px', color: '#9ca3af', padding: '3px' }}>
                      +{availableTags.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Resource List */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '8px'
        }}>
          {filteredResources.length === 0 ? (
            <EmptyResourcePanel 
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
                onClick={handleResourceSelect}
                onEdit={handleStartEdit}
                onDelete={handleDeleteResource}
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
            isLoading={isCreating || isUpdating}
          />
        ) : selectedResource ? (
          <ResourceDetailsPanel
            resource={selectedResource}
            onEdit={() => handleStartEdit(selectedResource)}
            onDelete={() => handleDeleteResource(selectedResource)}
            onClose={() => setSelectedResource(null)}
          />
        ) : (
          <EmptyResourcePanel 
            message="Select a resource to view details or create a new one"
            icon="📋"
          />
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && resourceToDelete && (
        <ResourceDeleteConfirmation
          resource={resourceToDelete}
          onConfirm={confirmDeleteResource}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setResourceToDelete(null);
          }}
        />
      )}
      
      {/* Loading overlay for delete operation */}
      {isDeleting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 60
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #f3f4f6',
              borderTop: '2px solid #ef4444',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span>Deleting resource...</span>
          </div>
        </div>
      )}
      
      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ResourcesPage;