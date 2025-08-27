# Consolidated Pseudo-Code Summary of License-Related JavaScript Files

This document consolidates the pseudo-code summaries from the provided license-related JavaScript files (`LicenseKeyEntry.js`, `LicenseManager.js`, and `WhiteLabelOrgList.js`) into a single reference. Each file's components and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## LicenseKeyEntry.js

### Component: LicenseKeyEntry({ onSuccess, onCancel })
// Uses useTasks: applyLicenseKey
// Uses state: licenseKey '', isSubmitting false, error '', success ''
// Returns div bg gray light radius border padding maxW500 margin auto
// H2 medium bold margin bottom center Enter License Key
// P margin bottom gray center Enter license to create additional projects
// If error: div bg red light red text padding radius margin bottom {error}
// If success: div bg green light green text padding radius margin bottom {success}
// Form onSubmit handleSubmit: div margin bottom: label block bold margin bottom small License Key, input id licenseKey text value=licenseKey onChange handleChange placeholder XXXX-XXXX w100 padding12 radius border gray font large
// Div flex between gap margin top: button type button onClick onCancel disabled submitting flex1 padding12 radius border gray bg white cursor Cancel
// Button submit disabled submitting flex1 padding12 radius none bg green white cursor not/pointer if submitting opacity 0.7 {submitting Applying... else Apply License Key}

// Function: handleChange(e)
// SetLicenseKey value, setError ''

// Function: handleSubmit(e) async
// PreventDefault
// If !licenseKey trim: error Please enter return
// SetSubmitting true
// Try result = await applyLicenseKey(licenseKey)
// If result.success: setSuccess applied successfully!, setTimeout if onSuccess onSuccess() 1500
// Else: setError error or Invalid
// Catch console error applying, setError An error occurred
// Finally setSubmitting false

## LicenseManager.js

### Component: LicenseManager()
// Uses useAuth: user
// Imports supabase, generateLicense
// Uses state: licenses [], loading true, error null, bulkAmount 5, generatingLicenses false, filterStatus 'all', filterOrgId '', organizations [], searchQuery '', copiedLicense null
// Returns div padding maxW 7xl margin auto
// H1 xlarge bold margin bottom License Manager
// If loading: div center padding large Loading...
// Else if error: div bg red light border red text red padding radius margin {error}
// Else: div margin bottom flex wrap gap: div flex1 minW md: h3 medium bold mb Available Licenses: {filter licenses !is_used length}
// Div flex1 minW md: h3 medium bold mb Used Licenses: {filter licenses is_used length}
// Div flex1 minW md: h3 medium bold mb Total Licenses: {licenses length}
// Div flex between items center mb: div flex gap: label small bold margin auto Status:, select value=filterStatus onChange setFilterStatus w auto padding radius border gray: option All, Used, Unused
// Label small bold margin auto Organization:, select value=filterOrgId onChange setFilterOrgId w auto padding radius border gray: option All Organizations, map organizations option key id {name}
// Div relative: input type text placeholder Search licenses... value=searchQuery onChange setSearchQuery w64 padding radius border gray
// Div flex between items center mb: button onClick handleGenerateBulk bg green white padding radius cursor disabled generating {generating Generating... else Generate Licenses}
// Input number value=bulkAmount onChange setBulkAmount min1 w24 padding radius border gray margin left
// If generating: p gray Generating {bulkAmount} licenses...
// FilteredLicenses = licenses filter (status all or match is_used) && (org all or match org_id) && (search match license_key or user email/name)
// If !filtered length: p gray center No licenses match
// Else: table w full bg white border gray radius overflow hidden: thead bg gray light: tr: th padding left License Key, th Status, th Organization, th User, th Created, th Actions
// Tbody: map filtered li key id tr border bottom last none: td padding {key}, td padding: span bg !is_used green light/green else gray light/gray padding radius small bold {!is_used Available else Used}
// Td padding {org.name or N/A}, td padding: if user div {first last} small gray {email} else Not assigned
// Td padding {date toLocale}, td padding: button onClick handleCopy {key id} bg gray light color copied green/gray padding radius none cursor flex center gap {copied ✓ Copied else 📋 Copy}

// Effect: fetchLicenses fetchOrganizations on mount

// Function: fetchLicenses() async
// SetLoading true
// Query = supabase from licenses select * user:user_id (id email first last) org:org_id (id name subdomain) order created_at desc
// If filterStatus used: eq is_used true, unused false
// If filterOrgId: eq org_id
// Data error = await query
// If error throw
// SetLicenses data or []
// Catch console setError Failed
// Finally setLoading false

// Function: fetchOrganizations() async
// Data error = await supabase from white_label_orgs select id name subdomain order name
// If error throw
// SetOrganizations data or []
// Catch console setError Failed

// Function: handleGenerateBulk() async
// If !bulkAmount or <1 return
// SetGenerating true
// Try newLicenses = []
// For i 0 to bulkAmount: result=await generateLicense(user.id), if !success throw error or Failed
// NewLicenses push result.license
// SetLicenses prev [...newLicenses, ...prev]
// SetSuccess Generated {bulkAmount} licenses
// Catch console setError message or Failed
// Finally setGenerating false

// Function: handleCopyLicense(key, id)
// Navigator.clipboard writeText key
// SetCopiedLicense id
// SetTimeout setCopied null 2000

// Function: handleFilterChange(status/org) setFilter update fetchLicenses

## WhiteLabelOrgList.js

### Component: WhiteLabelOrgList()
// Imports Link from react-router-dom, supabase
// Uses state: organizations [], loading true, error null, selectedOrgId null
// Returns div flex height calc100vh-100
// Left flex1 60% margin right overflow auto: div flex between center mb: h1 large bold White Label Organizations, div flex gap: button onClick alert create New Organization bg green white padding radius cursor, button onClick fetchOrganizations Refresh bg blue white padding radius cursor
// If loading: div center padding Loading...
// Else if error: div bg red light border red text red padding radius mb {error}
// Else: div {renderOrgList()}
// Right flex1 40% minW300 maxW500 {renderOrgDetailsPanel()}

// Effect: fetchOrganizations on mount

// Function: fetchOrganizations() async
// SetLoading true
// Data error = await supabase from white_label_orgs select * admin_user:admin_user_id(first last email) order name
// If error throw
// Console Fetched {data}
// SetOrganizations data or []
// Catch console setError Failed
// Finally setLoading false

// Function: selectOrg(orgId)
// SetSelected prev===id ? null : id

// Computed: selectedOrg = find id===selected

// Function: renderSmallLogo(org)
// If !logo: div w h24 margin right bg primary or blue radius flex center white bold small {name.charAt0 upper}
// Else try: div dangerouslySetInnerHTML {__html: logo} style w24 h24 margin right, catch div w h24 margin right bg gray radius flex center gray Invalid SVG

// Function: renderOrgList()
// If !orgs length: div padding center gray: large 🏢, h3 bold No organizations, p small Create first
// Else: div: map orgs div key id onClick selectOrg id class org-item selected if bg white/light shadow/none border gray/none radius padding flex between center cursor pointer transition
// Div flex center gap: {renderSmallLogo(org)}, div: h3 bold medium {name}, p small gray Subdomain: {subdomain or N/A}
// Div flex center gap small: span bg primary or blue white padding radius small bold Primary, span bg secondary or blue white padding radius small bold Secondary, span bg tertiary or amber white padding radius small bold Tertiary
// If selectedOrg: renderOrgDetailsPanel() with selectedOrg

// Function: renderOrgDetailsPanel()
// If !selectedOrg: div padding center gray: large 🔍, h3 bold Select organization, p small Click to view details
// Else: div bg white border gray radius padding overflow auto height full
// Header bg primary or blue white text padding radius top: flex between: h3 bold large {name}, button onClose setSelected null bg white0.2 none radius white cursor small ✕
// Content: div margin: h4 bold mb Logo, div bg white border gray radius padding center: if logo try dangerouslySetInnerHTML {__html: logo} style maxW full maxH 200 object contain, catch p red Invalid SVG format
// Div margin: h4 bold mb Primary Color, input color value=primary disabled w full h10
// Similar Secondary/Tertiary Color
// Div margin: h4 bold mb Font Family, select value=font disabled w full padding radius border gray
// Div margin: h4 bold mb Admin User, if admin_user: p {first last}, small gray {email} else p gray No admin assigned
// Div margin: h4 bold mb Subdomain, p {subdomain or N/A}
// Div margin: h4 bold mb Created At, p {created_at toLocale}
// Action buttons: button Edit Organization bg blue white padding radius cursor full ✎ Edit
// Button Manage Licenses Link to /admin/licenses?org={id} bg green white padding radius cursor full 📜 Licenses
// Button Delete Organization bg red white padding radius cursor full Delete