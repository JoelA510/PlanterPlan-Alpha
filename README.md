# Task Management App - Complete Architecture Documentation

## Executive Summary

PlanterPlan is a specialized project management web application designed specifically for church planters to manage the complex process of launching a new church. The app provides structured task templates, collaborative features, and comprehensive resources to guide planters through the 9-month church planting journey. This document outlines requirements for a complete system rewrite that maintains existing functionality while fixing partial implementations and adding new features.

## Core Concept

The application addresses the challenge that church planters face: managing hundreds of tasks within a 9-month timeframe without prior experience. PlanterPlan provides:

- Pre-built task templates organized hierarchically
- Detailed instructions and resources for each task
- Collaborative team management
- Timeline management with automated due date calculations
- White-label capabilities for partner organizations

## System Architecture

### Hierarchy Structure

1. **Phases** - Major stages of the church planting process
2. **Milestones** - Key accomplishments within each phase
3. **Tasks** - Specific action items within milestones
4. **Subtasks** - Granular child tasks under main tasks

### User Roles & Permissions

- **Project Owner**: Full edit access, settings management, user invitation
- **Full User**: View and edit all tasks
- **Limited User**: View all, edit only assigned tasks
- **Coach**: View all, edit only coaching-specific tasks

## Current Features (Fully Functional)

### User Experience Features

- Account creation and management
- Project creation from templates
- Project customization (add/delete/modify tasks)
- Team collaboration and user invitation system
- Task detail management with rich content
- Resource library (searchable/filterable)
- Multiple task list views (Priority, Overdue, Due Soon, Current, etc.)
- Alternative checkpoint-based project architecture

### Administrator Features

- Analytics dashboard
- Content management for master library
- Template creation and management
- User and license management
- White-label organization administration

### White-Label Features

- Custom branding and URLs
- Organization-specific administration
- View-only access for organizational oversight

## Features Requiring Fixes (Partially Functional)

### Critical Fixes Needed

1. Due date engine with automatic date calculations
2. CORS error during new user registration
3. Case-sensitive email field issue
4. Search functionality in both user and admin interfaces
5. Monthly status reports (print formatting for status reports)
6. Master library display when adding custom tasks
7. New project notification emails to administrators
8. Priority view filtering logic (orphaned tasks/empty milestones)
9. Project menu dropdown filtering for archived projects

## Features to Complete (Partially Coded)

### Priority Completions

1. **Automated Reporting**: Monthly status reports sent automatically to supervisors on the 2nd of each month
2. **Smart Task Filtering**:
   - Hide already-included tasks when adding from library
   - Show topically related tasks with "show more" option
   - Bulk task selection capability
3. **Strategy Templates**: New task type that prompts library additions upon completion
4. **Coaching Tasks**: Auto-assignment to users with Coach permissions
5. **Advanced User Management**: Filters for user activity, task completion, login history

- Progress visualization (donut charts)

### Lower Priority Completions:

6. **Store functionality**: Stripe integration, Admin management
   - items purchasable: resources, licenses, etc
7. Analytics

## Additional Development Requests

### Enhanced User Experience

1. Drag-and-drop reordering with automatic renumbering
2. Push notifications for:
   - Weekly priority task summaries
   - Overdue task alerts
   - Task comments
3. Multi-language interface support
4. API integrations (Zoho CRM, Zoho Analytics)
5. File upload system (AWS or similar)
6. Calendar integration via ICS feed
7. Due dates for checkpoint-based phases
8. Multiple sorting options (chronological, alphabetical, numerical)
9. Gantt chart reporting for phases and milestones

## Table of Contents

1. [Core Technologies](#core-technologies)
2. [Architecture Overview](#architecture-overview)
3. [Component Architecture](#component-architecture)
4. [State Management](#state-management)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Key Features](#key-features)
7. [API Services](#api-services)
8. [Utility Systems](#utility-systems)
9. [Styling and UI](#styling-and-ui)
10. [Performance Optimizations](#performance-optimizations)
11. [Security and Authentication](#security-and-authentication)
12. [Development Considerations](#development-considerations)

## Core Technologies

### Frontend Stack

- **React 18+**: Component-based UI with hooks and contexts
- **React Router DOM**: Client-side routing
- **Tailwind CSS**: Utility-first styling framework
- **HTML5 Drag & Drop API**: Native drag-drop functionality

### Backend Stack

- **Supabase**:
  - Authentication service
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions
  - Storage for assets

### State Management

- **React Context API**: Global state management
- **Custom Hooks**: Reusable business logic
- **Local Component State**: UI-specific state

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                      │
├───────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Components  │  │   Contexts    │  │    Hooks     │   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
├───────────────────────────────────────────────────────────┤
│                    Service Layer                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Auth | Task | Resource | License | Organization │    │
│  └─────────────────────────────────────────────────┘    │
├───────────────────────────────────────────────────────────┤
│                    Utility Layer                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Date | Drag | Position | Cache | Validation    │    │
│  └─────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│                   Backend (Supabase)                       │
├───────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Auth    │  │   Database    │  │   Storage    │       │
│  └──────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── components/
│   ├── Admin/              # Administrative tools
│   ├── contexts/           # React contexts for global state
│   ├── License/            # License management UI
│   ├── Login/              # Authentication components
│   ├── MasterLibrary/      # Template library features
│   ├── Organization/       # White-label organization UI
│   ├── Reports/            # Reporting and analytics
│   ├── Resources/          # Resource management
│   ├── Search/             # Search functionality
│   ├── Settings/           # User and admin settings
│   ├── TaskForm/           # Task creation/editing forms
│   ├── TaskList/           # Task listing and management
│   ├── TemplateList/       # Template management
│   └── TemplateProject/    # Project creation from templates
├── hooks/                  # Custom React hooks
├── services/               # API service layers
├── utils/                  # Helper functions and utilities
└── supabaseClient.js       # Supabase client configuration
```

## Component Architecture

### Core Components Overview

| Component              | Purpose                             | Key Functions                                                                   |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `TaskList`             | Displays and manages projects/tasks | Task creation, selection, hierarchical display, drag-drop, search integration   |
| `TaskItem`             | Represents a single task            | Displays task info, handles drag events, toggles expansion, recursive rendering |
| `TaskDetailsPanel`     | Displays detailed task information  | Shows/edits task properties, manages dates, validates changes                   |
| `TaskForm`             | Task creation/editing form          | Form validation, date calculations, array field management                      |
| `TemplateList`         | Manages templates                   | Template creation, listing, hierarchical display                                |
| `TemplateItem`         | Represents a single template        | Displays template, handles drag events, recursive structure                     |
| `TemplateDetailsPanel` | Displays template details           | Shows template properties, editing interface                                    |
| `TemplateTaskForm`     | Template creation/editing           | Manages template-specific fields, duration calculations                         |
| `HTML5DragDropZone`    | Drop zones for drag operations      | Handles 'between' and 'into' drops, visual feedback                             |
| `ResourcesPage`        | Resource management interface       | CRUD operations, filtering, tag management                                      |
| `ResourceItem`         | Single resource display             | Shows resource details, format badges, action buttons                           |
| `OrganizationHeader`   | Organization navigation             | Displays org branding, navigation links                                         |
| `OrganizationApp`      | Organization app wrapper            | Routes, sidebar, themed container                                               |
| `LicenseManager`       | License administration              | Generate, filter, track license usage                                           |
| `LicenseKeyEntry`      | License key input                   | Validates and applies license keys                                              |
| `WhiteLabelOrgList`    | Organization management             | Lists orgs, shows details, manages settings                                     |
| `UserSettings`         | User preferences                    | Profile, notifications, license info                                            |
| `AdminSettings`        | Admin configuration                 | Organization settings, appearance, user management                              |
| `AppearanceSettings`   | Theme customization                 | Colors, fonts, logo management                                                  |

### Component Relationships

```
App
├── AuthProvider
│   └── OrganizationProvider
│       └── TaskProvider
│           └── SearchProvider
│               └── Router
│                   └── ProtectedRoutes
│                       └── Layout (varies by route/user)
│                           ├── TaskList
│                           │   ├── TaskItem (recursive)
│                           │   │   ├── HTML5DragDropZone
│                           │   │   └── Children TaskItems
│                           │   ├── TaskDetailsPanel
│                           │   │   └── TaskForm
│                           │   ├── NewProjectForm
│                           │   └── TaskUIComponents
│                           │       ├── EmptyPanel
│                           │       ├── DeleteConfirmation
│                           │       └── SearchBanner
│                           ├── TemplateList
│                           │   ├── TemplateItem (recursive)
│                           │   │   └── Children TemplateItems
│                           │   ├── TemplateDetailsPanel
│                           │   │   └── TemplateTaskForm
│                           │   └── CreateNewTemplateForm
│                           ├── ResourcesPage
│                           │   ├── ResourceItem
│                           │   ├── ResourceDetailsPanel
│                           │   └── ResourceForm
│                           ├── Settings
│                           │   ├── UserSettings
│                           │   │   └── LicenseSection
│                           │   └── AdminSettings
│                           │       └── AppearanceSettings
│                           ├── Organization
│                           │   ├── OrganizationHeader
│                           │   ├── OrganizationSelector
│                           │   └── OrganizationSettings
│                           └── Admin
│                               ├── LicenseManager
│                               └── WhiteLabelOrgList
```

### Context Providers

#### AuthContext

- **Purpose**: Manages user authentication state and session
- **State**: `user`, `loading`, `userRole`, `userOrgId`, `userInfo`
- **Key Methods**:
  - `fetchUserInfo()`: Retrieves user profile data
  - `hasRole()`: Role-based access control

#### TaskContext

- **Purpose**: Central task management hub
- **State**: `tasks`, `loading`, `error`, `isFetching`
- **Key Methods**:
  - `fetchTasks()`: Parallel fetch of instance and template tasks
  - `createTask()`: Task creation with license validation
  - `updateTask()`: Task updates with impact analysis
  - `deleteTask()`: Recursive deletion with hierarchy updates
  - `afterDragDrop()`: Drag-drop position synchronization

#### OrganizationProvider

- **Purpose**: White-label organization data management
- **State**: `organization`, `organizationId`, `loading`, `error`
- **Features**:
  - CSS variable injection for theming
  - Fallback to default organization
  - Automatic refetch on visibility change

#### SearchContext

- **Purpose**: Search and filtering functionality
- **State**: `searchFilters`, `isSearchActive`, `filteredTasks`
- **Filters**:
  - Text search across multiple fields
  - Status filtering (overdue, today, this week)
  - Task type filtering (instance vs template)
  - User assignment filtering

### Hook Architecture

| Hook                   | Purpose                       | Key Returns                                                          |
| ---------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `useTaskCreation`      | Handles task/project creation | `createTask()`, `isCreating`, `canCreate`                            |
| `useTaskDeletion`      | Manages recursive deletion    | `deleteTask()`, `getDeletionConfirmationMessage()`                   |
| `useTaskUpdate`        | Updates with impact analysis  | `updateTask()`, `updateTaskDates()`, `getUpdateStatus()`             |
| `useTaskDates`         | Cached date calculations      | `taskDates`, `recalculateAllDates()`, `isTaskOverdue()`              |
| `useTemplateToProject` | Template conversion           | `createProjectFromTemplate()`, `isConverting`                        |
| `useLicenses`          | License management            | `canCreateProject`, `applyLicenseKey()`, `validateProjectCreation()` |
| `useInvitations`       | Project invitations           | `sendProjectInvitation()`, `acceptProjectInvitation()`               |
| `useTaskForm`          | Form state management         | `formData`, `errors`, `validateForm()`, `dateMode`                   |
| `useTemplateTaskForm`  | Template form logic           | `formData`, `validateForm()`, `affectedAncestors`                    |

### Service Layer Architecture

| Service                 | Purpose                   | Key Methods                                                           |
| ----------------------- | ------------------------- | --------------------------------------------------------------------- |
| `authService`           | Authentication operations | `signUp()`, `signIn()`, `getCurrentUser()`, `updateUserProfile()`     |
| `taskService`           | Task CRUD operations      | `fetchAllTasks()`, `createTask()`, `updateTask()`, `deleteTask()`     |
| `licenseService`        | License management        | `generateLicense()`, `validateLicense()`, `markLicenseAsUsed()`       |
| `organizationService`   | Org management            | `fetchOrganizationBySlug()`, `updateOrganization()`                   |
| `resourceService`       | Resource operations       | `fetchAllResources()`, `createResource()`, `validateResourceData()`   |
| `invitationService`     | Invitation handling       | `createInvitation()`, `acceptInvitation()`, `getPendingInvitations()` |
| `teamManagementService` | Team operations           | `getProjectMembers()`, `addProjectMember()`, `checkUserRole()`        |
| `reportService`         | Report generation         | `generateProjectReport()`, `exportReport()`, `generatePDFExport()`    |

### Utility Functions Overview

| Utility                 | Purpose                  | Key Functions                                                     |
| ----------------------- | ------------------------ | ----------------------------------------------------------------- |
| `DateCacheEngine`       | Date calculation caching | `calculateAllDates()`, `updateTaskDatesIncremental()`             |
| `dateUtils`             | Date operations          | `calculateDueDate()`, `determineTaskStartDate()`, `formatDate()`  |
| `dragUtils`             | Drag-drop helpers        | `calculateDropPosition()`, `canDropOnTarget()`, `makeDraggable()` |
| `sparsePositioning`     | Position management      | `calculateInsertPosition()`, `checkIfRenormalizationNeeded()`     |
| `sequentialTaskManager` | Sequential updates       | `calculateSequentialStartDates()`, `updateAncestorDurations()`    |
| `taskUtils`             | Task helpers             | `getTaskLevel()`, `isDescendantOf()`, `getBackgroundColor()`      |

### Core Components Details

#### Task Management

**TaskList Component**

- Hierarchical task display with expand/collapse
- HTML5 drag-drop zones for reordering
- Real-time date recalculation
- Search integration
- License-based project creation

**TaskItem Component**

- Recursive rendering for nested tasks
- Drag handle with accessibility support
- Visual feedback for drag operations
- Contextual background colors by level

**TaskDetailsPanel Component**

- View/edit mode toggle
- Parent impact warnings
- Field validation
- Array field management (actions/resources)

**TaskForm Components**

- `TaskForm`: Instance task creation/editing
- `TemplateTaskForm`: Template task management
- `NewProjectForm`: Project initialization
- `CreateNewTemplateForm`: Template creation
- Date mode selection (calculate end date vs duration)

#### Drag & Drop System

**HTML5DragDropZone Component**

- Two zone types: 'between' (reorder) and 'into' (nest)
- Visual feedback with animations
- Hover state management
- Debug mode for development

**Drag Operation Flow**

1. `handleDragStart`: Validates draggability, stores drag data
2. `handleDragOver`: Prevents default, shows drop zones
3. `handleDrop`: Calculates new position, updates hierarchy
4. `afterDragDrop`: Syncs to database, recalculates dates

#### Resource Management

**ResourcesPage Component**

- Split-panel interface (list/details)
- Format filtering (PDF, hyperlink, PowerPoint, etc.)
- Tag management
- User-scoped resource visibility

**Resource Validation**

- Title requirements
- URL validation for hyperlinks
- Tag length limits
- Format-specific rules

#### Organization Features

**White-Label Customization**

- Custom color schemes (primary, secondary, tertiary)
- Font selection
- SVG logo upload with validation
- Subdomain routing

**OrganizationSettings Component**

- Logo management with SVG validation
- Color picker integration
- Font selection dropdown
- Real-time preview

#### License System

**LicenseManager Component**

- Bulk license generation
- Status filtering (available/used)
- Organization assignment
- Copy-to-clipboard functionality

**License Validation Flow**

1. User applies license key
2. System validates uniqueness and availability
3. License marked as used upon project creation
4. User limited to one project without license

## State Management

### Global State (Contexts)

```javascript
// Task state structure
{
  tasks: [
    {
      id: string,
      title: string,
      parent_task_id: string | null,
      position: number,
      origin: 'instance' | 'template',
      start_date: Date | null,
      due_date: Date | null,
      duration_days: number,
      is_complete: boolean,
      // ... additional fields
    }
  ],
  loading: boolean,
  error: Error | null
}
```

### Local Component State

Common patterns:

- `expandedTasks`: Object tracking expanded nodes in tree views
- `selectedTaskId`: Currently selected item
- `isEditing`: Edit mode toggle
- `formData`: Form field values
- `errors`: Validation errors
- `dateMode`: Date calculation mode

### Hook-Based State

Custom hooks encapsulate complex stateful logic:

- `useTaskDates`: Cached date calculations
- `useTaskCreation`: Creation with license validation
- `useTaskDeletion`: Recursive deletion logic
- `useInvitations`: Project invitation management

## Data Flow Patterns

### Task Creation Flow

```
User Input → Form Validation → License Check → Position Calculation
→ Date Enhancement → Database Insert → State Update → UI Re-render
```

### Drag-Drop Flow

```
Drag Start → Visual Feedback → Drop Zone Activation → Drop Event
→ Position Calculation → Optimistic Update → Database Sync → Date Recalculation
```

### Template to Project Conversion

```
Template Selection → License Validation → Hierarchy Traversal
→ Root Project Creation → Recursive Child Creation → Date Calculation
→ State Integration
```

## Key Features

### 1. Hierarchical Task Management

- Unlimited nesting levels
- Parent-child relationships
- Automatic duration rollup
- Sequential date calculations

### 2. Template System

- Reusable task templates
- Template library with search
- Project creation from templates
- Default duration preservation

### 3. Drag & Drop

- Visual reordering
- Parent reassignment
- Accessibility support
- Touch device compatibility

### 4. Date Management

- Multiple calculation modes
- Dependency-based updates
- Cache optimization
- Overdue tracking

### 5. White-Label Support

- Custom branding
- Organization-specific themes
- Subdomain routing
- Logo customization

### 6. License Management

- Project creation limits
- Key generation and validation
- Bulk operations
- Usage tracking

### 7. Team Collaboration

- Project invitations
- Role-based permissions
- Member management
- Activity tracking

### 8. Resource Management

- Multiple format support
- Tag categorization
- File attachments
- Link validation

## API Services

### Core Service Modules

#### authService

- User registration with metadata
- Authentication (sign in/out)
- Password reset flow
- Profile management

#### taskService

- CRUD operations
- Batch updates
- Hierarchy management
- Statistics generation
- Master library operations

#### licenseService

- Key generation algorithm
- Validation logic
- Usage tracking
- Project limit enforcement

#### organizationService

- Organization CRUD
- Theme management
- Logo storage
- Subdomain handling

#### resourceService

- Resource CRUD
- Format validation
- Tag management
- Permission checking

#### invitationService

- Invitation creation
- Email validation
- Status management
- Acceptance flow

#### teamManagementService

- Member management
- Role assignments
- Permission checking
- Statistics

## Utility Systems

### Date Calculation Engine

**DateCacheEngine Class**

- Dependency mapping
- Incremental updates
- Cache invalidation
- Performance monitoring

**Key Algorithms**:

- Sequential start date calculation
- Duration rollup for parents
- Milestone-based scheduling
- Working days calculation

### Position Management

**Sparse Positioning System**

- Gap-based positioning (increment: 1000)
- Automatic renormalization
- Collision avoidance
- Insertion optimization

### Drag Utilities

**Features**:

- Cross-browser compatibility
- Touch support
- Keyboard navigation
- Screen reader announcements
- Error recovery

## Styling and UI

### Design System

**Color Scheme**

- Level-based background colors
- Status indicators
- Hover/active states
- Dark mode support (planned)

**Typography**

- System font stack
- Responsive sizing
- Hierarchy emphasis
- Readability optimization

### Animations

**CSS Transitions**

- Smooth expand/collapse
- Drag feedback
- Hover effects
- Loading states

**Keyframe Animations**

- `pulse-blue/green`: Drop zone feedback
- `shimmer`: Loading effects
- `task-reorder`: Success feedback
- `shake`: Error indication

### Responsive Design

- Mobile-first approach
- Touch-optimized interactions
- Flexible layouts
- Breakpoint management

## Performance Optimizations

### Rendering Optimizations

- React.memo for expensive components
- useMemo for computed values
- useCallback for stable references
- Virtual scrolling (planned)

### Data Management

- Incremental updates
- Optimistic UI updates
- Batch operations
- Query result caching

### Network Optimization

- Parallel fetching
- Request debouncing
- Error retry logic
- Connection pooling

## Security and Authentication

### Authentication Flow

1. Supabase Auth handles user sessions
2. JWT tokens for API requests
3. Row Level Security (RLS) policies
4. Organization-scoped data access

### Permission System

- Role hierarchy: owner > full > limited > coach
- Project-level permissions
- Organization admin rights
- Resource visibility controls

### Data Protection

- Input sanitization
- XSS prevention
- CSRF protection (via Supabase)
- Secure password policies

## Development Considerations

### Testing Strategy

- Unit tests for utilities
- Integration tests for services
- Component testing with React Testing Library
- E2E testing for critical flows

### Error Handling

- Graceful degradation
- User-friendly error messages
- Automatic retry for network errors
- Error boundary implementation

### Monitoring and Logging

- Console logging in development
- Error tracking integration (planned)
- Performance monitoring
- User analytics (planned)

### Deployment

- Environment configuration
- Build optimization
- Code splitting
- Asset optimization

## Future Enhancements

### Planned Features

1. **Real-time Collaboration**: Live updates via Supabase subscriptions
2. **Advanced Reporting**: Charts, exports, custom reports
3. **Mobile App**: React Native implementation
4. **Offline Support**: Service worker integration
5. **AI Integration**: Smart task suggestions and automation
6. **Calendar View**: Visual timeline and Gantt charts
7. **Notifications**: Email and in-app notifications
8. **File Attachments**: Direct file upload to tasks
9. **Time Tracking**: Built-in timer functionality
10. **Recurring Tasks**: Template-based recurring task creation

### Technical Improvements

- TypeScript migration
- Storybook integration
- Performance profiling
- Accessibility audit
- Internationalization
- Dark mode implementation

## Conclusion

This Task Management App represents a sophisticated, enterprise-ready solution with robust architecture, comprehensive features, and scalable design. The modular structure, combined with modern React patterns and Supabase backend, provides a solid foundation for future growth and enhancement.
