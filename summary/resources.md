# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`resourceList.js` and `resourceTypes.js`) into a single reference. Each file's components, constants, and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## resourceList.js

### Component: ResourceList()
// Uses useAuth: user
// Uses useOrganization: organizationId
// Uses state: resources, loading, error, selectedResource, showForm, editingResource, isCreating
// Filters state: filterFormat ('all'), filterText, showMyResourcesOnly
// Returns div with left panel (list) and right panel (details/form)

// Effect: on organizationId, user.id, showMyResourcesOnly change: calls loadResources

// Function: loadResources()
// Sets loading true, error null
// If showMyResourcesOnly: userId = user.id else null
// Calls fetchAllResources(organizationId, userId, true)
// On error: sets error
// Else: sets resources = data or []
// Finally loading false

// Computed: filteredResources
// Filters resources by format if not 'all'
// By text: lower case search in title, description, tags
// Returns filtered array

// Function: handleCreateResource(resourceData)
// Sets isCreating true
// Validates via validateResourceData, if invalid: alert errors, return
// Enhances data: created_by user.id, white_label_id organizationId
// Calls createResource
// On success: prepends to resources, hides form, selects new
// On error: alert
// Finally isCreating false

// Function: handleUpdateResource(resourceId, resourceData)
// Validates via validateResourceData, if invalid: alert, return
// Calls updateResource
// On success: maps resources to update matching id, clears editing, selects updated
// On error: alert

// Function: handleDeleteResource(resourceId)
// Confirms delete
// Calls deleteResource
// On success: filters out from resources, clears selected
// On error: alert

// Function: handleResourceSelect(resource)
// Sets selectedResource, clears editing/form

// Function: handleFormCancel()
// Hides form, clears editing

// Render: if loading: centered loading div
// If error: centered error div
// Else: flex div height 100vh
// Left: width 50%, border right, flex column
// Header: padding, border bottom, bg
// Flex between: h2 Resources (count), + Create button (sets showForm true, clears editing/selected)
// Filters: input text search (sets filterText), select format (options all + formats via getLabel), checkbox My Only (sets showMyResourcesOnly)
// List: flex 1, overflow auto, padding
// If empty: EmptyPanel with message (no resources or no match)
// Else: maps filtered to ResourceItem with key, isSelected, onClick select, onEdit set editing/showForm/clear selected, onDelete handleDelete
// Right: width 50%
// If showForm: ResourceForm with initial editing or DEFAULT, isEditing !!editing, onSubmit update or create, onCancel cancel, isLoading isCreating
// Else if selected: ResourceDetailsPanel with resource, onEdit set editing/showForm, onDelete handleDelete, onClose clear selected
// Else: EmptyPanel select or create

### Component: ResourceItem({ resource, isSelected, onClick, onEdit, onDelete })
// Gets formatColors, formatIcon, formatLabel via helpers
// Returns div onClick, style: padding/margin/border (selected blue), bg (selected blue light), cursor pointer, transition
// On enter/leave: bg hover if not selected
// Inner flex between align start
// Left flex 1: flex align center margin bottom - icon span, h4 title bold
// Format badge: inline padding small, bg/text/border from colors
// Description p: margin, small gray, ellipsis line clamp 2
// Tags: flex wrap gap, slices 0-3 small bg gray spans, if more +count more
// Created small gray date locale
// Right: flex gap margin left - Edit blue button (stop prop, onEdit), Delete red button (stop prop, onDelete)

## resourceTypes.js

### Constants:
// RESOURCE_FORMATS: {PDF: 'pdf', HYPERLINK: 'hyperlink', POWERPOINT: 'powerpoint', MICROSOFT_DOC: 'microsoft_doc'}
// RESOURCE_FORMAT_LABELS: object with human labels
// RESOURCE_FORMAT_ICONS: object with emojis
// RESOURCE_FORMAT_COLORS: object with bg/text/border hex for each
// DEFAULT_RESOURCE: {title '', format hyperlink, url '', description '', usage_rights '', tags [], is_published true}
// RESOURCE_VALIDATION_RULES: object per field - title: required true, min1 max200; format: required, allowed values; url: required false, for [hyperlink], pattern https?://.+; description: max1000; usage_rights: max500; tags: max10, maxTag50
// RESOURCE_SEARCH_FILTERS: {ALL_FORMATS 'all', MY_RESOURCES 'my_resources', ...}
// SEARCH_SCOPE: {TASKS 'tasks', RESOURCES 'resources', ALL 'all'}
// COMMON_RESOURCE_TAGS: array of strings like 'template', 'guide', etc.

### Function: getResourceFormatLabel(format)
// Returns RESOURCE_FORMAT_LABELS[format] or format

### Function: getResourceFormatIcon(format)
// Returns RESOURCE_FORMAT_ICONS[format] or '📄'

### Function: getResourceFormatColors(format)
// Returns RESOURCE_FORMAT_COLORS[format] or PDF colors

### Function: isUrlRequiredForFormat(format)
// Returns if RESOURCE_VALIDATION_RULES.url.requiredForFormats includes format

### Function: validateResourceField(fieldName, value, allData = {})
// Gets rules for field
// If no rules: null
// Required: if required and empty/trim empty: error required
// Required for formats: if in requiredForFormats and format matches and empty: error required for label
// String: minLength error if <, maxLength if >
// Pattern: if value and !test: invalid format
// Allowed: if !includes value: must be one of join
// Array: maxItems if >, maxTagLength find tag >: error max chars
// Returns error string or null

### Function: validateResourceData(resourceData)
// Errors array
// For each rule key: calls validateField, if error push
// Returns {isValid: errors.length === 0, errors}

### Function: createSafeResourceObject(partialResource = {})
// Returns {...DEFAULT_RESOURCE, ...partial, tags: if array else if truthy [it] else []}

### Function: formatResourceForDisplay(resource)
// Returns {...resource, formatLabel via get, formatIcon via get, formatColors via get, hasUrl Boolean(url), tagCount array length or 0, createdAtFormatted locale or 'Unknown', updatedAtFormatted locale or 'Unknown'}