# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`OrganizationHeader.js`, `OrganizationApp.js`, `OrganizationLogo.js`, `OrganizationSettings.js`, and `OrganizationSelector.js`) into a single reference. Each file's components and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## OrganizationHeader.js

### Component: OrganizationHeader()
// Imports React, Link from react-router-dom
// Uses useOrganization: organization
// If !organization: return null
// Returns header bg white border bottom solid gray padding flex between center
// Div flex gap: Link to /org/{subdomain}/tasks bg primary blue white padding rounded no decoration Projects
// Link to /org/{subdomain}/templates bg secondary purple white padding rounded no decoration Templates
// Div: {organization.organization_name} User

## OrganizationApp.js

### Component: OrganizationApp()
// Imports useOrganization: organization, loading
// Imports Routes, Route from react-router-dom
// Imports Dashboard, TaskList, TemplateList, Header, Sidebar
// If loading: div loading Loading organization...
// Returns div org-app: Header organization=organization
// Div app-container: Sidebar
// Main: Routes: Route path / element Dashboard
// Route path /tasks element TaskList
// Route path /templates element TemplateList

## OrganizationLogo.js

### Component: OrganizationLogo()
// Imports React
// Uses useOrganization: organization, loading
// Const logoContainerStyle: flex center padding border bottom white opaque
// If loading || !organization || !organization.logo: div logoContainerStyle: h1 white bold 1.5rem {organization.organization_name or PlanterPlan}
// Else: div logoContainerStyle: div width 90% height auto maxHeight 80px flex center dangerouslySetInnerHTML {__html: organization.logo} aria-label {organization_name} logo

## OrganizationSettings.js

### Component: OrganizationSettings()
// Imports React, useState, useEffect
// Imports supabase
// Uses state: org null, loading true, saving false, error null, successMessage '', logoFile null, logoPreview null
// Effect: fetchOrganization()
// Returns if loading: div Loading organization settings...
// Div maxW 800 margin auto padding: h1 1.8rem bold mb Organization Settings
// If error: div bg red light text red padding rounded mb {error}
// If successMessage: div bg green light text green padding rounded mb {successMessage}
// Div bg white rounded shadow padding: h2 1.5rem bold mb Organization Logo
// Form onSubmit handleSubmit: div mb: label block bold mb Current Logo
// Div width full height 120 border dashed gray rounded flex center bg gray light mb: if logoPreview: div dangerouslySetInnerHTML {__html: logoPreview} maxW 80% maxH 100px aria-label preview else span gray No logo uploaded
// Input type file accept .svg onChange handleLogoChange mb
// Div small gray mt Please upload SVG with viewBox
// Button submit disabled saving or !logoFile bg green white padding rounded no border cursor if disabled not-allowed opacity 0.7 {saving Saving... else Save Logo}
// Div bg white rounded shadow padding: h2 1.5rem bold mb Organization Details
// Div mb: label bold Organization Name, div {org.organization_name}
// Div mb: label bold Subdomain, div {org.subdomain}.planter-plan.vercel.app
// Div mb: label bold Status, div: span bg if active green light else red light text corresponding padding rounded small bold uppercase {org.status}
// Div: label bold Created At, div {new Date(org.created_at).toLocaleDateString()}

// Function: fetchOrganization() async
// Try setLoading true
// User = await supabase.auth.getUser().data.user
// If !user throw User not authenticated
// Data, error = await supabase.from white_label_orgs select * eq admin_user_id user.id single
// If error throw
// SetOrg data
// If data.logo: setLogoPreview data.logo
// Catch console error fetch, setError message
// Finally setLoading false

// Function: handleLogoChange(e)
// File = target.files[0]
// If !file return
// If file.type !== image/svg+xml: setError Please upload SVG return
// SetLogoFile file
// Reader = new FileReader
// Reader.onloadend: setLogoPreview reader.result
// Reader.readAsText file

// Function: handleSubmit(e) async
// PreventDefault
// Try setSaving true setError null setSuccessMessage ''
// If logoFile: if !logoPreview || !includes <svg: throw Invalid SVG
// SvgString = logoPreview
// Error = await supabase.from white_label_orgs update {logo: svgString} eq id org.id
// If error throw
// SetOrg ...org logo svgString
// SetSuccessMessage Organization logo updated successfully!
// SetLogoFile null
// Else: setError No file selected return
// Catch console error update, setError message
// Finally setSaving false

## OrganizationSelector.js

### Component: OrganizationSelector()
// Imports React, useState, useEffect
// Imports Link from react-router-dom
// Imports fetchAllOrganizations
// Uses state: organizations [], loading true
// Effect: loadOrganizations()
// Returns if loading: div Loading organizations...
// Div mt: h3 1rem mb Organizations
// Div: if organizations.length >0: map org: Link key id to /org/{subdomain}/tasks block padding text slate no decoration mb bg white opaque rounded {org.organization_name}
// Else: div slate small No organizations found

// Function: loadOrganizations() async
// SetLoading true
// Data, error = await fetchAllOrganizations()
// If !error && data: setOrganizations data
// Else console error loading error
// SetLoading false