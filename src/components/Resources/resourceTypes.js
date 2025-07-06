// src/types/resourceTypes.js

/**
 * Resource format enum values matching the database enum
 */
export const RESOURCE_FORMATS = {
    PDF: 'pdf',
    HYPERLINK: 'hyperlink',
    POWERPOINT: 'powerpoint',
    MICROSOFT_DOC: 'microsoft_doc'
  };
  
  /**
   * Human-readable labels for resource formats
   */
  export const RESOURCE_FORMAT_LABELS = {
    [RESOURCE_FORMATS.PDF]: 'PDF Document',
    [RESOURCE_FORMATS.HYPERLINK]: 'Web Link',
    [RESOURCE_FORMATS.POWERPOINT]: 'PowerPoint Presentation',
    [RESOURCE_FORMATS.MICROSOFT_DOC]: 'Microsoft Document'
  };
  
  /**
   * Icons for different resource formats
   */
  export const RESOURCE_FORMAT_ICONS = {
    [RESOURCE_FORMATS.PDF]: '📄',
    [RESOURCE_FORMATS.HYPERLINK]: '🔗',
    [RESOURCE_FORMATS.POWERPOINT]: '📊',
    [RESOURCE_FORMATS.MICROSOFT_DOC]: '📝'
  };
  
  /**
   * Color schemes for different resource formats
   */
  export const RESOURCE_FORMAT_COLORS = {
    [RESOURCE_FORMATS.PDF]: {
      bg: '#fee2e2',
      text: '#dc2626',
      border: '#fecaca'
    },
    [RESOURCE_FORMATS.HYPERLINK]: {
      bg: '#dbeafe',
      text: '#2563eb',
      border: '#bfdbfe'
    },
    [RESOURCE_FORMATS.POWERPOINT]: {
      bg: '#fed7aa',
      text: '#ea580c',
      border: '#fdba74'
    },
    [RESOURCE_FORMATS.MICROSOFT_DOC]: {
      bg: '#dcfce7',
      text: '#16a34a',
      border: '#bbf7d0'
    }
  };
  
  /**
   * Default resource data structure
   */
  export const DEFAULT_RESOURCE = {
    title: '',
    format: RESOURCE_FORMATS.HYPERLINK,
    url: '',
    description: '',
    usage_rights: '',
    tags: [],
    is_published: true
  };
  
  /**
   * Validation rules for resource fields
   */
  export const RESOURCE_VALIDATION_RULES = {
    title: {
      required: true,
      minLength: 1,
      maxLength: 200
    },
    format: {
      required: true,
      allowedValues: Object.values(RESOURCE_FORMATS)
    },
    url: {
      required: false,
      requiredForFormats: [RESOURCE_FORMATS.HYPERLINK],
      pattern: /^https?:\/\/.+/
    },
    description: {
      required: false,
      maxLength: 1000
    },
    usage_rights: {
      required: false,
      maxLength: 500
    },
    tags: {
      required: false,
      maxItems: 10,
      maxTagLength: 50
    }
  };
  
  /**
   * Search filter options for resources
   */
  export const RESOURCE_SEARCH_FILTERS = {
    ALL_FORMATS: 'all',
    MY_RESOURCES: 'my_resources',
    PUBLISHED_ONLY: 'published_only',
    WITH_TAGS: 'with_tags'
  };
  
  /**
   * Resource search scope options
   */
  export const SEARCH_SCOPE = {
    TASKS: 'tasks',
    RESOURCES: 'resources',
    ALL: 'all'
  };
  
  /**
   * Common resource tags (can be used for autocomplete)
   */
  export const COMMON_RESOURCE_TAGS = [
    'template',
    'guide',
    'reference',
    'tutorial',
    'documentation',
    'training',
    'legal',
    'policy',
    'procedure',
    'checklist',
    'form',
    'contract',
    'presentation',
    'report',
    'analysis',
    'research',
    'best-practices',
    'how-to',
    'faq',
    'troubleshooting'
  ];
  
  /**
   * Helper functions for resource operations
   */
  
  /**
   * Get the display label for a resource format
   * @param {string} format - The resource format
   * @returns {string} - Human readable label
   */
  export const getResourceFormatLabel = (format) => {
    return RESOURCE_FORMAT_LABELS[format] || format;
  };
  
  /**
   * Get the icon for a resource format
   * @param {string} format - The resource format
   * @returns {string} - Icon emoji
   */
  export const getResourceFormatIcon = (format) => {
    return RESOURCE_FORMAT_ICONS[format] || '📄';
  };
  
  /**
   * Get the color scheme for a resource format
   * @param {string} format - The resource format
   * @returns {Object} - Color scheme object
   */
  export const getResourceFormatColors = (format) => {
    return RESOURCE_FORMAT_COLORS[format] || RESOURCE_FORMAT_COLORS[RESOURCE_FORMATS.PDF];
  };
  
  /**
   * Check if a resource format requires a URL
   * @param {string} format - The resource format
   * @returns {boolean} - Whether URL is required
   */
  export const isUrlRequiredForFormat = (format) => {
    return RESOURCE_VALIDATION_RULES.url.requiredForFormats.includes(format);
  };
  
  /**
   * Validate a single resource field
   * @param {string} fieldName - Name of the field to validate
   * @param {any} value - Value to validate
   * @param {Object} allData - All resource data (for cross-field validation)
   * @returns {string|null} - Error message or null if valid
   */
  export const validateResourceField = (fieldName, value, allData = {}) => {
    const rules = RESOURCE_VALIDATION_RULES[fieldName];
    if (!rules) return null;
  
    // Required field validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${fieldName} is required`;
    }
  
    // Required for specific formats
    if (rules.requiredForFormats && rules.requiredForFormats.includes(allData.format)) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} is required for ${getResourceFormatLabel(allData.format)}`;
      }
    }
  
    // String length validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return `${fieldName} must be at least ${rules.minLength} characters`;
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return `${fieldName} must be no more than ${rules.maxLength} characters`;
      }
    }
  
    // Pattern validation (for URLs)
    if (rules.pattern && value && !rules.pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }
  
    // Allowed values validation
    if (rules.allowedValues && !rules.allowedValues.includes(value)) {
      return `${fieldName} must be one of: ${rules.allowedValues.join(', ')}`;
    }
  
    // Array validations
    if (Array.isArray(value)) {
      if (rules.maxItems && value.length > rules.maxItems) {
        return `${fieldName} can have at most ${rules.maxItems} items`;
      }
      if (rules.maxTagLength) {
        const invalidTag = value.find(tag => tag.length > rules.maxTagLength);
        if (invalidTag) {
          return `Tags must be no more than ${rules.maxTagLength} characters`;
        }
      }
    }
  
    return null;
  };
  
  /**
   * Validate complete resource data
   * @param {Object} resourceData - Complete resource data to validate
   * @returns {Object} - Validation result with isValid boolean and errors array
   */
  export const validateResourceData = (resourceData) => {
    const errors = [];
  
    // Validate each field
    Object.keys(RESOURCE_VALIDATION_RULES).forEach(fieldName => {
      const error = validateResourceField(fieldName, resourceData[fieldName], resourceData);
      if (error) {
        errors.push(error);
      }
    });
  
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  /**
   * Create a safe resource object with all required fields
   * @param {Object} partialResource - Partial resource data
   * @returns {Object} - Complete resource object with defaults
   */
  export const createSafeResourceObject = (partialResource = {}) => {
    return {
      ...DEFAULT_RESOURCE,
      ...partialResource,
      // Ensure arrays are always arrays
      tags: Array.isArray(partialResource.tags) ? partialResource.tags : (partialResource.tags ? [partialResource.tags] : [])
    };
  };
  
  /**
   * Format resource data for display
   * @param {Object} resource - Resource data
   * @returns {Object} - Formatted resource data
   */
  export const formatResourceForDisplay = (resource) => {
    return {
      ...resource,
      formatLabel: getResourceFormatLabel(resource.format),
      formatIcon: getResourceFormatIcon(resource.format),
      formatColors: getResourceFormatColors(resource.format),
      hasUrl: Boolean(resource.url),
      tagCount: Array.isArray(resource.tags) ? resource.tags.length : 0,
      createdAtFormatted: resource.created_at ? new Date(resource.created_at).toLocaleDateString() : 'Unknown',
      updatedAtFormatted: resource.updated_at ? new Date(resource.updated_at).toLocaleDateString() : 'Unknown'
    };
  };