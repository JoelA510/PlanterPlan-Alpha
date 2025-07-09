// src/components/Resources/ResourceForm.js
import React, { useState, useEffect } from 'react';
import { 
  RESOURCE_FORMATS,
  RESOURCE_FORMAT_LABELS,
  validateResourceField,
  validateResourceData,
  isUrlRequiredForFormat,
  COMMON_RESOURCE_TAGS
} from '../../types/resourceTypes';

const ResourceForm = ({ 
  initialData = null,
  isEditing = false,
  onSubmit, 
  onCancel, 
  isLoading = false
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    format: RESOURCE_FORMATS.HYPERLINK,
    url: '',
    description: '',
    usage_rights: '',
    tags: [],
    is_published: true
  });
  
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        format: initialData.format || RESOURCE_FORMATS.HYPERLINK,
        url: initialData.url || '',
        description: initialData.description || '',
        usage_rights: initialData.usage_rights || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags : [],
        is_published: initialData.is_published !== undefined ? initialData.is_published : true
      });
    }
  }, [initialData]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // If format changes and URL was required for old format but not new, clear URL error
    if (name === 'format') {
      const wasUrlRequired = isUrlRequiredForFormat(formData.format);
      const isUrlRequired = isUrlRequiredForFormat(newValue);
      
      if (wasUrlRequired && !isUrlRequired && errors.url) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.url;
          return newErrors;
        });
      }
    }
  };

  // Handle tag input
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
    setShowTagSuggestions(e.target.value.length > 0);
  };

  // Add tag
  const addTag = (tag) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  // Handle tag input key press
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      }
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Get suggested tags based on input
  const getSuggestedTags = () => {
    if (!tagInput) return [];
    
    const input = tagInput.toLowerCase();
    return COMMON_RESOURCE_TAGS
      .filter(tag => 
        tag.toLowerCase().includes(input) && 
        !formData.tags.includes(tag.toLowerCase())
      )
      .slice(0, 5);
  };

  // Validate form
  const validateForm = () => {
    const validation = validateResourceData(formData);
    setErrors(validation.errors.reduce((acc, error) => {
      const field = error.split(' ')[0].toLowerCase();
      acc[field] = error;
      return acc;
    }, {}));
    
    return validation.isValid;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Get form title
  const getFormTitle = () => {
    if (isEditing) return 'Edit Resource';
    return 'Create New Resource';
  };

  // Check if URL is required for current format
  const urlRequired = isUrlRequiredForFormat(formData.format);

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
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '16px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontWeight: 'bold' }}>
          {getFormTitle()}
        </h3>
        <button 
          onClick={onCancel}
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
      
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
        {/* Title Field */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="title"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${errors.title ? '#ef4444' : '#d1d5db'}`,
              outline: 'none'
            }}
            placeholder="Enter resource title"
          />
          {errors.title && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.title}
            </p>
          )}
        </div>

        {/* Format Field */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="format"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Format *
          </label>
          <select
            id="format"
            name="format"
            value={formData.format}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${errors.format ? '#ef4444' : '#d1d5db'}`,
              outline: 'none'
            }}
          >
            {Object.entries(RESOURCE_FORMAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.format && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.format}
            </p>
          )}
        </div>

        {/* URL Field */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="url"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            URL {urlRequired && '*'}
          </label>
          <input
            id="url"
            name="url"
            type="url"
            value={formData.url}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${errors.url ? '#ef4444' : '#d1d5db'}`,
              outline: 'none'
            }}
            placeholder="https://example.com"
          />
          {errors.url && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.url}
            </p>
          )}
          {!urlRequired && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Optional for this format
            </p>
          )}
        </div>

        {/* Description Field */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="description"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${errors.description ? '#ef4444' : '#d1d5db'}`,
              outline: 'none',
              resize: 'vertical'
            }}
            placeholder="Describe this resource and how it should be used"
          />
          {errors.description && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.description}
            </p>
          )}
        </div>

        {/* Usage Rights Field */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="usage_rights"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Usage Rights
          </label>
          <textarea
            id="usage_rights"
            name="usage_rights"
            value={formData.usage_rights}
            onChange={handleChange}
            rows={2}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${errors.usage_rights ? '#ef4444' : '#d1d5db'}`,
              outline: 'none',
              resize: 'vertical'
            }}
            placeholder="Copyright information, licensing terms, etc."
          />
          {errors.usage_rights && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.usage_rights}
            </p>
          )}
        </div>

        {/* Tags Field */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Tags
          </label>
          
          {/* Current Tags */}
          {formData.tags.length > 0 && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '6px', 
              marginBottom: '8px' 
            }}>
              {formData.tags.map((tag, index) => (
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
                </span>
              ))}
            </div>
          )}
          
          {/* Tag Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyPress={handleTagKeyPress}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                outline: 'none'
              }}
              placeholder="Type a tag and press Enter or comma"
            />
            
            {/* Tag Suggestions */}
            {showTagSuggestions && getSuggestedTags().length > 0 && (
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
                {getSuggestedTags().map((tag, index) => (
                  <div
                    key={index}
                    onClick={() => addTag(tag)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      borderBottom: index < getSuggestedTags().length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Press Enter or comma to add tags. Click suggestions to add them.
          </p>
        </div>

        {/* Published Toggle */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            <input
              type="checkbox"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontWeight: 'bold' }}>Published</span>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>
              (Make this resource available to others)
            </span>
          </label>
        </div>

        {/* Form Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              background: isLoading ? '#9ca3af' : '#10b981',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isLoading && (
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            {isEditing ? 'Update Resource' : 'Create Resource'}
          </button>
        </div>
      </form>
      
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

export default ResourceForm;