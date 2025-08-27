# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`SideNavigation.js`, `NotFound.js`, `Layout.js`, `InvitationTest.js`, `DefaultHeader.js`, and `Header.js`) into a single reference. Each file's components and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## SideNavigation.js

### Component: SideNavigation()
// Imports React, Link from react-router-dom
// Imports OrganizationSelector, useOrganization: organization, loading
// Imports OrganizationLogo
// Const basePath = if organization /org/{subdomain} else ''
// Const isInOrgContext = !!organization
// Console log Logo data exists !!organization?.logo, Logo data organization?.logo?.substring(0,100)
// Const logoContainerStyle: flex center mb height 60px
// Returns nav width 240 bg slate dark text white padding flex col height 100vh
// OrganizationLogo
// Link to {basePath}/dashboard block padding slate no decoration mb Dashboard
// Link similar {basePath}/tasks Projects
// Link similar {basePath}/templates Templates
// If !isInOrgContext: Link similar /white-label-orgs White Label Orgs
// Link similar {basePath}/settings Settings
// If !isInOrgContext: hr margin border slate
// If isInOrgContext: div: Link to / block padding slate no decoration bg white opaque rounded center Back to Main App

## NotFound.js

### Component: NotFound()
// Imports React, Link, useNavigate from react-router-dom
// Returns div flex col center justify center padding text center
// Div text 72px bold gray light 404
// H1 24px bold mb Page Not Found
// P gray maxW 500 mb The page doesn't exist or moved
// Div flex gap: button onClick navigate -1 bg white border gray rounded padding cursor gray bold Go Back
// Link to / bg green no border rounded padding white no decoration bold Go Home

## Layout.js

### Component: Layout({ userType })
// Imports React, Outlet, Link, useLocation, useParams, useNavigate from react-router-dom
// Imports useOrganization: organization, organizationId, loading orgLoading
// Imports useAuth: user, userInfo
// Imports supabase
// Imports OrganizationLogo
// Const location, navigate, {slug} = useParams
// Const isInOrgContext = !!organization
// Function handleLogout async: try await supabase.auth.signOut, navigate /login catch console error logout
// Function getBasePath: switch userType planter_admin /admin, planter_user /user, org_admin /org/{slug}/admin, org_user /org/{slug}/user else /
// Const basePath = getBasePath()
// Function isActive(path): if path===basePath return location.pathname===basePath or ==={basePath}/ else return startsWith path
// Function renderNavItems: commonItems [ {path basePath label Projects icon 📋}, {path {basePath}/settings label Settings icon ⚙️} ]
// AdminItems [ {path {basePath}/templates label Templates icon 📝} ]
// NavItems = [...commonItems]
// If userType planter_admin or org_admin: navItems.splice 1,0 ...adminItems
// If userType planter_admin && !isInOrgContext: navItems.push {path {basePath}/white-label-orgs label White Label Orgs icon 🏢}
// Return map item: li key path: Link to path class nav-item if active active flex center padding no decoration color if active blue else gray bg if active blue light else transparent rounded mb bold if active transition
// Span mr font 18px {item.icon} {item.label}
// Function getHeaderTitle: switch userType planterplan_admin Planter Admin Dashboard, planterplan_user Planter User Dashboard, org_admin {organization.organization_name or slug capitalized or Organization} Admin Dashboard, org_user similar User Dashboard else Dashboard
// Function getUserInitials: if user && userInfo: firstName=first_name or '', lastName=last_name or '', return (first 0 + last 0).toUpperCase else U
// ... (truncated content, but includes getUserName presumably similar)
// Returns div flex minH 100vh
// Div width 250 bg slate dark text white padding fixed height 100vh overflowY auto: if isInOrgContext OrganizationLogo else div text 24px bold white mb flex center padding border bottom white opaque: span mr 🌱 Planter Plan
// Nav: ul no list padding 0 margin 0: {renderNavItems()}
// If isInOrgContext: div mt: Link to / block padding slate no decoration bg white opaque rounded center mt auto Back to Main App
// Div absolute bottom left right padding border top white opaque: div flex center mb padding: div width height 36 bg green rounded full flex center white bold mr {getUserInitials()}
// Div: div bold white {getUserName()}, div small slate {userType replace _ space capitalize}
// Button onClick handleLogout width full bg white opaque text slate light no border rounded padding small flex center justify center transition onMouseOver bg white more opaque onMouseOut bg opaque: span mr 🚪 Log Out
// Div ml 250 flexGrow padding bg white: header border bottom gray pb mb: h1 margin 0 text 24px bold {getHeaderTitle()}
// Main: Outlet

## InvitationTest.js

### Component: InvitationTest()
// Imports React, useState, useEffect
// Imports useTasks: instanceTasks, fetchTasks
// Imports useAuth: user
// Imports useInvitations: projectInvitations, userPendingInvitations, invitationLoading, sendProjectInvitation, fetchProjectInvitations, fetchUserPendingInvitations, acceptProjectInvitation, declineProjectInvitation, revokeProjectInvitation
// Imports getInvitationsSentByUser
// Imports supabase
// Uses state: selectedProjectId '', inviteEmail '', inviteRole full_user, message ''
// SentInvitations [], loadingSentInvitations false
// AcceptedInvitations [], loadingAcceptedInvitations false
// Const projects = instanceTasks filter !parent_task_id
// Effect: if selectedProjectId: fetchProjectInvitations selectedProjectId
// Function fetchAcceptedInvitations async: if !user?.email setMessage Error user email not available return
// SetLoadingAcceptedInvitations true console log fetching
// Try data, error = await supabase from project_invitations select * eq email user.email.lower eq status accepted order accepted_at desc
// If error console error setMessage error setAcceptedInvitations []
// Else console log loaded setAcceptedInvitations data or []
// Catch console error unexpected setMessage error setAcceptedInvitations []
// Finally setLoading false
// Function fetchSentInvitations async: if !user?.id setMessage Error not authenticated return
// SetLoadingSentInvitations true console log fetching
// Try result = await getInvitationsSentByUser user.id
// If result.error console error setMessage error setSentInvitations []
// Else console log loaded setSentInvitations data or [] if length===0 setMessage No sent try sending
// Catch console error unexpected setMessage error setSentInvitations []
// Finally setLoading false
// Function handleSendInvitation async: if !selectedProjectId || !inviteEmail setMessage Please select project email return
// Result = await sendProjectInvitation selectedProjectId inviteEmail inviteRole
// If result.success setMessage sent! setInviteEmail '' setTimeout fetchSentInvitations 1000
// Else setMessage Error {result.error}
// Function handleAcceptInvitation async (invitationId): result = await acceptProjectInvitation invitationId () => fetchTasks true
// If result.success setMessage Accepted! fetchUserPendingInvitations fetchProjectInvitations selectedProjectId fetchSentInvitations fetchAcceptedInvitations
// Else setMessage Error {result.error}
// Function handleDeclineInvitation async (invitationId): result = await declineProjectInvitation invitationId
// If result.success setMessage Declined! fetchUserPendingInvitations fetchProjectInvitations selectedProjectId fetchSentInvitations
// Else setMessage Error {result.error}
// Function handleRevokeInvitation async (invitationId): result = await revokeProjectInvitation invitationId
// If result.success setMessage Revoked! fetchProjectInvitations selectedProjectId fetchSentInvitations
// Else setMessage Error {result.error}
// Function getStatusBadgeStyle(status): switch status pending {bg yellow light text yellow dark}, accepted {bg green light text green dark}, declined {bg red light text red dark}, revoked {bg gray light text gray dark} padding rounded small bold uppercase
// Returns div maxW md mx auto my padding bg white rounded shadow: h2 mb Invitation Test Component
// If message: p mb {message}
// Div mb: h3 mb Send Invitation
// Select value=selectedProjectId onChange setSelectedProjectId disabled !projects.length: option disabled Select Project
// Map projects: option key id value id {title}
// Input type email value=inviteEmail onChange setInviteEmail placeholder Email
// Select value=inviteRole onChange setInviteRole: option value full_user Full User, value view_only View Only
// Button onClick handleSendInvitation disabled invitationLoading Send Invitation
// Div mb: h3 mb Project Invitations
// Select value=selectedProjectId onChange setSelectedProjectId disabled !projects.length: option disabled Select Project to View
// Map projects: option key id value id {title}
// If invitationLoading: p Loading...
// Else if projectInvitations.length===0: p No invitations
// Else map invitation: div key id padding mb bg gray light rounded border gray: strong Project {project?.title} Role {role} From {inviter?.first_name last_name} Expires {new Date(expires_at).toLocaleDateString()}
// Div flex gap: button onClick handleRevokeInvitation id disabled loading Revoke
// Div mb: h3 mb Pending Invitations
// Button onClick fetchUserPendingInvitations disabled loading Load Pending
// If loading: p Loading...
// Else if userPendingInvitations.length===0: p No pending
// Else map invitation: div key id padding mb bg gray light rounded border gray: strong Project {project?.title} Role {role} From {inviter?.first_name last_name} Expires {new Date(expires_at).toLocaleDateString()}
// Div flex gap: button onClick handleAcceptInvitation id disabled loading Accept, button onClick handleDeclineInvitation id disabled loading Decline
// Div mb: h3 mb My Sent Invitations
// Button onClick fetchSentInvitations disabled loadingSentInvitations {loading Loading... else Load Sent}
// If !user?.id: p red Error user id not available
// Else if loading: p Loading...
// Else if sentInvitations.length===0: p No sent invitations yet. button onClick fetch text underline no border bg none cursor Click to load
// Else: p mb gray small Showing {length} sent
// Map invitation: div key id padding mb bg blue light rounded border blue: div mb flex center: strong To {email} span statusBadgeStyle {status}
// Div small gray: strong Role {role}
// Div xsmall gray: Sent {new Date(created_at).toLocaleDateString()} Invitation ID {id}
// If status===pending: button onClick handleRevokeInvitation id small Revoke
// Div padding border gray rounded: div flex between center mb: h3 My Accepted Invitations
// Button onClick fetchAcceptedInvitations disabled loading or !user?.email {loading Loading... else Load Accepted}
// If !user?.email: p red Error user email not available
// Else if loading: p Loading...
// Else if acceptedInvitations.length===0: p No accepted yet. button onClick fetch text underline no border bg none cursor Click to load
// Else: p mb gray small Showing {length} accepted
// Map invitation: div key id padding mb bg sky light rounded border sky: div mb flex center: strong Project ID {project_id} span statusBadgeStyle {status}
// Div small gray: strong Role {role}
// Div xsmall gray: Originally sent {new Date(created_at).toLocaleDateString()} if accepted_at Accepted {new Date(accepted_at).toLocaleDateString()} Invitation ID {id}

## DefaultHeader.js

### Component: DefaultHeader()
// Imports React, Link from react-router-dom
// Returns header bg white border bottom gray padding flex between center
// Div flex gap: Link to /tasks bg blue white padding rounded no decoration Projects
// Link to /templates bg purple white padding rounded no decoration Templates
// Div User Name

## Header.js

### Component: Header({ organization })
// Returns header app-header: div header-logo: if organization.logo_url img src logo_url alt {name} logo else h1 {organization.name}
// Nav header-nav: {/* Navigation items */}
// Div header-user: {/* User menu */}