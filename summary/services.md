# Consolidated Pseudo-Code Summary of JavaScript Services

This document consolidates the pseudo-code summaries from the provided JavaScript files (`licenseService.js`, `taskService.js`, `resourceService.js`, `authService.js`, `organizationService.js`, `reportService.js`, `invitationService.js`, and `teamManagementService.js`) into a single reference. Each file's functions/classes are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## licenseService.js

### Function: generateLicense(licenseData)
```
// Generates random key if not provided
// Sets defaults: license_key, org_id null, is_used false
// Inserts into 'licenses' table, selects back
// Returns {data} or {error}
```

### Function: canUserCreateProject(userId)
```
// Counts user's top-level instance tasks
// Returns {canCreate: count <1, reason} or {error}
```

### Function: generateRandomLicenseKey()
```
// Generates XXXX-XXXX-XXXX format with uppercase letters/numbers
```

### Function: validateLicense(licenseKey, userId)
```
// Selects from 'licenses' where key and !is_used
// Checks if user_id matches or null
// Returns {success, data} or {error}
```

### Function: markLicenseAsUsed(licenseId)
```
// Updates 'licenses' set is_used=true where id
// Returns {success} or {error}
```

## taskService.js

### Function: fetchAllTasks(organizationId, userId, origin, projectId, options)
```
// Builds query on 'tasks' with origin, creator/user filter
// If projectId: fetches project and descendants recursively
// Applies org filter null or eq
// Orders by position
// Returns {data array, error}
```

### Function: fetchAllDescendants(parentTasks, organizationId)
```
// Uses map to collect unique tasks
// Recursively fetches children batches
// Returns all tasks array
```

### Function: fetchTasksForProjects(projectIds, organizationId)
```
// Fetches roots by ids
// Then all descendants
// Returns combined array
```

### Function: createTask(taskData)
```
// Validates required fields
// Gets next position if parent
// Inserts into 'tasks', selects back
// Returns {data} or {error}
```

### Function: updateTaskCompletion(taskId, isComplete)
```
// Updates 'tasks' set is_complete
// Returns {success} or {error}
```

### Function: updateTaskPosition(taskId, newPosition, newParentId)
```
// Gets task
// Updates position/parent
// Reorders siblings if needed
// Returns {success} or {error}
```

### Function: updateTaskDateFields(taskId, dateFields)
```
// Updates start_date, due_date
// Updates dependent tasks
// Returns updated task or {error}
```

### Function: updateTaskFields(taskId, fields)
```
// Updates arbitrary fields in 'tasks'
```

### Function: updateTaskComplete(taskId, isComplete)
```
// Updates is_complete
```

### Function: updateTaskHierarchy(taskId, newParentId, newPosition)
```
// Moves task to new parent/position
// Handles cycles, updates dates
```

### Function: deleteTask(taskId)
```
// Deletes task and all descendants recursively
```

### Function: getTaskById(taskId)
```
// Selects single task
```

### Function: getTasksByParent(parentId)
```
// Selects children ordered by position
```

### Function: getTaskWithPermissions(taskId, userId)
```
// Gets task if creator or shared via membership
```

### Function: findRootProject(taskId)
```
// Traverses parents to find root
```

### Function: batchUpdateTasks(updates)
```
// Updates multiple tasks in batch
```

### Function: getTaskStatistics(userId, organizationId)
```
// Counts total, completed, overdue tasks
```

### Function: addToMasterLibrary(taskId, organizationId, addedBy)
```
// Inserts into 'master_library_tasks'
```

### Function: removeFromMasterLibrary(taskId, organizationId)
```
// Deletes from 'master_library_tasks'
```

### Function: checkIfInMasterLibrary(taskId, organizationId)
```
// Selects from 'master_library_tasks'
```

### Function: getMasterLibraryTasks(organizationId, options)
```
// Selects from 'master_library_view' with pagination
```

### Function: searchMasterLibraryTasks(searchTerm, organizationId, options)
```
// Searches 'master_library_view' by title/description/purpose
```

## resourceService.js

### Function: fetchAllResources(organizationId, userId, publishedOnly)
```
// Selects resources with creator user details
// Filters by org null/eq, user, published
// Orders by created_at desc
// Returns {data array} or {error}
```

### Function: createResource(resourceData)
```
// Validates required fields
// Normalizes tags array, is_published
// Inserts into 'resources', selects with creator
// Returns {data} or {error}
```

### Function: updateResource(resourceId, updateData)
```
// Validates id, data
// Updates 'resources' with fields
// Returns {data} or {error}
```

### Function: deleteResource(resourceId)
```
// Deletes from 'resources' by id
// Returns {success} or {error}
```

### Function: getResourceById(resourceId)
```
// Selects single resource with creator
```

### Function: getResourceTags(organizationId)
```
// Selects tags, flattens unique sorted
```

### Constants: RESOURCE_FORMATS, RESOURCE_FORMAT_LABELS
```
// Enum-like objects for formats and labels
```

### Function: validateResourceData(resourceData)
```
// Checks title, format valid, url if hyperlink
// Returns {isValid, errors array}
```

### Function: isValidUrl(url)
```
// Tries new URL, catches error
```

## authService.js

### Function: signUp(email, password, userData, role, whitelabelOrgId)
```
// supabase.auth.signUp with metadata
// Then upsert 'users' table with profile
// Returns {user, session} or {error}
```

### Function: signIn(email, password)
```
// supabase.auth.signInWithPassword
// Returns {user, session} or {error}
```

### Function: signOut()
```
// supabase.auth.signOut
// Returns {success} or {error}
```

### Function: getCurrentSession()
```
// supabase.auth.getSession
// Returns {session} or {error}
```

### Function: getCurrentUser()
```
// supabase.auth.getUser
// Then select from 'users' for profile
// Combines and returns {user: {..., profile}} or {error}
```

### Function: requestPasswordReset(email)
```
// supabase.auth.resetPasswordForEmail with redirect
// Returns {success} or {error}
```

### Function: updatePassword(newPassword)
```
// supabase.auth.updateUser({password})
// Returns {success} or {error}
```

### Function: updateUserProfile(userData)
```
// Gets current user
// Updates auth metadata
// Updates 'users' table
// Returns {success} or {error}
```

## organizationService.js

### Function: fetchOrganizationBySlug(slug)
```
// Selects from 'white_label_orgs' by subdomain single
// Returns {data} or {error}
```

### Function: fetchAllOrganizations()
```
// Selects all from 'white_label_orgs' ordered by name
// Returns {data array} or {error}
```

### Function: createOrganization(orgData)
```
// Inserts into 'white_label_orgs', selects back
// Returns {data} or {error}
```

### Function: updateOrganization(updateData)
```
// Updates 'white_label_orgs' with colors, font, logo by id
// Returns {data} or {error}
```

### Function: deleteOrganization(id)
```
// Deletes from 'white_label_orgs' by id
// Returns {success} or {error}
```

## reportService.js

### Function: fetchTasksForReporting(params)
```
// Builds query on 'tasks' with filters: org, user, origin, dates, projects, completion
// Orders by created_at desc
// Returns {data array} or {error}
```

### Function: generateProjectReport(projectId, options)
```
// Gets project details
// Fetches tasks for project
// Calculates stats: total, completed, incomplete, overdue, upcoming
// Returns report object
```

### Function: generateUserReport(userId, options)
```
// Gets user projects
// Fetches tasks for projects
// Calculates stats per project and overall
```

### Function: generateOrganizationReport(organizationId, options)
```
// Gets org projects
// Fetches tasks
// Calculates stats
```

### Function: exportReport(reportData, format, options)
```
// Delegates to generatePDF/CSV/JSON/ExcelExport
// Returns {data string, filename, mimeType} or {error}
```

### Function: generatePDFExport(reportData, baseFilename, options)
```
// Uses pdfkit or similar to build PDF (pseudo)
// Sections for stats, overdue, upcoming
```

### Function: generateCSVExport(reportData, baseFilename, options)
```
// Builds CSV string with sections: stats, overdue, upcoming, project stats
```

### Function: generateJSONExport(reportData, baseFilename, options)
```
// JSON.stringify with exportedAt
```

### Function: generateExcelExport(reportData, baseFilename, options)
```
// Placeholder, returns CSV-like for Excel
```

### Function: saveGeneratedReport(reportData, metadata)
```
// Placeholder save to reports table
// Returns {success} or {error}
```

## invitationService.js

### Function: getUserByEmail(email)
```
// Selects user by email lower
// Returns {data} or {error}
```

### Function: createInvitation(projectId, email, role, invitedBy)
```
// Validates inputs, email format, role
// Gets invitedUser by email
// Checks existing membership/invitation
// Inserts into 'project_invitations'
// Returns {data} or {error}
```

### Function: getProjectInvitations(projectId)
```
// Selects invitations with user/inviter/project details
// Orders by created_at desc
```

### Function: getPendingInvitationsForUser(userId)
```
// Selects pending invitations with project/inviter
// Orders by created_at desc
```

### Function: getInvitationsSentByUser(userId)
```
// Selects invitations where invited_by=userId
// With user/project details
```

### Function: acceptInvitation(invitationId, userId)
```
// Validates invitation pending, matches user
// Creates membership in 'project_memberships'
// Updates invitation status accepted
// Returns {data: {membership, invitation}} or {error}
```

### Function: declineInvitation(invitationId)
```
// Updates status to declined if pending
// Returns {data} or {error}
```

### Function: revokeInvitation(invitationId, revokedBy)
```
// Updates status to revoked if pending
// Returns {data} or {error}
```

## teamManagementService.js

### Function: getProjectMembers(projectId)
```
// Selects memberships with user/inviter details
// Orders by created_at asc
// Returns {data array} or {error}
```

### Function: addProjectMember(projectId, userId, role, invitedBy)
```
// Validates inputs, role
// Checks user exists, not already member
// Checks project exists
// Inserts into 'project_memberships' with accepted
// Returns {data} or {error}
```

### Function: updateMemberRole(membershipId, newRole)
```
// Validates role
// Checks membership exists
// Updates role
// Returns {data} or {error}
```

### Function: removeMember(membershipId)
```
// Deletes membership by id
// Returns {success} or {error}
```

### Function: getUserProjects(userId)
```
// Selects memberships with project details where user_id and accepted
// Returns {data array} or {error}
```

### Function: getProjectMember(projectId, userId)
```
// Selects membership by project/user
// With user/inviter details
```

### Function: checkUserRole(projectId, userId, requiredRole)
```
// Gets member
// Checks role hierarchy >= required
// Returns {data boolean} or {error}
```

### Function: getProjectMembershipStats(projectId)
```
// Selects role/status
// Counts total, byRole, byStatus, activeMembers
// Returns {data stats} or {error}
```