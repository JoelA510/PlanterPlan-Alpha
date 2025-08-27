# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`ForgotPasswordPage.js`, `LoginPage.js`, `ProtectedRoute.js`, `LoginForm.js`, `ResetPasswordPage.js`, and `RegisterPage.js`) into a single reference. Each file's components and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## ForgotPasswordPage.js

### Component: ForgotPasswordPage()
// Uses useNavigate, Link from react-router-dom
// Uses useAuth: user, loading
// Imports requestPasswordReset
// Uses state: email '', formLoading false, error null, success false
// Returns div minH screen bg gray light flex col between
// Div flex center py px: div maxW md w full space y: div center: h1 xxl bold gray PlanterPlan, p gray Reset password
// Div bg white p rounded shadow: h2 xl bold mb Forgot Password
// If error: div bg red light border l red p mb: p red {error}
// If success: div bg green light border l green p mb: p green Password reset email sent! Check inbox
// Else: form space y onSubmit handleSubmit: div: label block small bold gray Email, input email placeholder value=email onChange setEmail disabled loading w full px py border gray rounded
// Button submit w full py px bg loading blue light/blue dark white bold rounded disabled loading {loading Sending... else Send Reset Link}
// Div center small: p gray Remember password? Link to /login bold blue Back to Sign In
// P Don't have account? Link to /register bold blue Create Account
// Footer py center gray small © 2025 Task Manager. All rights reserved.

// Effect: if user && !loading: navigate /dashboard

// Function: handleSubmit(e) async
// PreventDefault
// SetError null success false
// If !email trim: error Email required return
// Try setFormLoading true
// Result = await requestPasswordReset(email)
// If result.error throw
// SetSuccess true
// Catch console error reset, setError message or Failed to send
// Finally setFormLoading false

## LoginPage.js

### Component: LoginPage()
// Uses useNavigate, Link from react-router-dom
// Uses useAuth: user, loading
// Imports signIn
// Uses state: email '', password '', formLoading false, error null
// Returns div minH screen bg gray light flex col between
// Div flex center py px: div maxW md w full space y: div center: h1 xxl bold gray PlanterPlan, p gray Sign in to manage projects tasks
// Div bg white p rounded shadow: h2 xl bold mb Sign In
// If error: div bg red light border l red p mb: p red {error}
// Form space y onSubmit handleSubmit: div: label block small bold gray Email, input email placeholder value=email onChange setEmail disabled loading w full px py border gray rounded
// Div: label block small bold gray Password, input password placeholder value=password onChange setPassword disabled loading w full px py border gray rounded
// Button submit w full py px bg loading blue light/blue dark white bold rounded disabled loading {loading Signing in... else Sign In}
// Div center small: p gray Don't have account? Link to /register bold blue Create Account
// P Link to /forgot-password bold blue Forgot password?
// Footer py center gray small © 2025 Task Manager. All rights reserved.

// Effect: if user && !loading: navigate /dashboard

// Function: handleSubmit(e) async
// PreventDefault
// SetError null
// If !email trim: error Email required return
// If !password: error Password required return
// Try setFormLoading true
// Result = await signIn(email, password)
// If result.error throw
// Auth context will redirect
// Catch console error login, setError message or Failed to sign in
// Finally setFormLoading false

## ProtectedRoute.js

### Component: ProtectedRoute({ children, allowedRoles=[], requireAdmin=false, redirectTo='/login' })
// Uses Navigate from react-router-dom
// Uses useAuth: user, loading, hasRole, isAdmin
// Returns if loading: div loading-spinner Loading...
// If !user: Navigate to redirectTo
// If allowedRoles length>0 && !some hasRole(role): Navigate /unauthorized
// If requireAdmin && !isAdmin(): Navigate /unauthorized
// Else: {children}

## LoginForm.js

### Component: LoginForm()
// Uses useNavigate from react-router-dom
// Imports signIn, signUp
// Uses state: isSignUp false, loading false, error null
// Uses state: formData {firstName '', lastName '', email '', password '', confirmPassword ''}
// Returns div auth-container: div auth-card: h2 {isSignUp Create Account else Sign In}
// If error: div error-message {error}
// Form onSubmit handleSubmit: if isSignUp: div form-group: label First Name, input id firstName text value=firstName onChange handleChange disabled loading
// Div similar Last Name
// Div form-group: label Email, input id email email value=email onChange disabled loading
// Div form-group: label Password, input id password password value=password onChange disabled loading
// If isSignUp: div form-group: label Confirm Password, input id confirmPassword password value=confirmPassword onChange disabled loading
// Button submit class submit-button disabled loading {loading Processing... else isSignUp Create Account else Sign In}
// Div auth-toggle: if isSignUp p Already have account? button onClick setIsSignUp false Sign In else p Don't have? button Create Account
// If !isSignUp: div reset-password: Link to /reset-password Forgot password?

// Function: handleChange(e)
// Name value = target, setFormData prev {...prev, [name]:value}

// Function: validateForm()
// SetError null
// If !email Email required return string
// If !password Password required
// If isSignUp: if !firstName First required, !lastName Last required, password.length<6 at least6, password!==confirm mismatch
// Return null if valid else error string

// Function: handleSubmit(e) async
// Prevent
// ValidationError=validateForm(), if error setError return
// SetLoading true
// Try let result
// If isSignUp: result=await signUp(email, password, {firstName, lastName})
// Else: result=await signIn(email, password)
// If result.error throw message or failed
// Navigate /
// Catch setError message
// Finally setLoading false

## ResetPasswordPage.js

### Component: ResetPasswordPage()
// Uses useNavigate, Link from react-router-dom
// Uses useAuth: user, loading
// Imports updatePassword
// Uses state: password '', confirmPassword '', formLoading false, error null, success false
// Returns div minH screen bg gray light flex col between
// Div flex center py px: div maxW md w full space y: div center: h1 xxl bold gray PlanterPlan, p gray Reset password
// Div bg white p rounded shadow: h2 xl bold mb Reset Password
// If error: div bg red light border l red p mb: p red {error}
// If success: div bg green light border l green p mb: p green Password reset! Redirecting to login
// Else: form space y onSubmit handleSubmit: div: label block small bold gray New Password, input password placeholder value=password onChange setPassword disabled loading w full px py border gray rounded minLength8
// Div: label block small bold gray Confirm New Password, input password placeholder value=confirmPassword onChange setConfirmPassword disabled loading w full px py border gray rounded minLength8
// Button submit w full py px bg loading blue light/blue dark white bold rounded disabled loading {loading Updating... else Update Password}
// Div center small: p gray Remember password? Link to /login bold blue Back to Sign In
// Footer py center gray small © 2025 Task Manager. All rights reserved.

// Effect: isPasswordReset = location.hash includes type=recovery
// If user && !loading && !isPasswordReset: navigate /dashboard

// Function: handleSubmit(e) async
// PreventDefault
// SetError null success false
// If !password: error Password required return
// If password !== confirm: error mismatch return
// If password.length <8: error at least8 return
// Try setFormLoading true
// Result = await updatePassword(password)
// If result.error throw
// SetSuccess true
// SetTimeout navigate /login 3000
// Catch console error reset, setError message or Failed to reset
// Finally setFormLoading false

## RegisterPage.js

### Component: RegisterPage()
// Uses useNavigate, Link from react-router-dom
// Uses useAuth: user, loading
// Imports signUp
// Uses state: email '', password '', confirmPassword '', firstName '', lastName '', formLoading false, error null, registrationComplete false
// Returns div minH screen bg gray light flex col between
// Div flex center py px: div maxW md w full space y: div center: h1 xxl bold gray PlanterPlan, p gray Create account
// If registrationComplete: div bg white p rounded shadow: h2 xl bold mb Account Created
// Div bg green light border l green p mb: p green Check {email} for verification. Click link to activate.
// Button onClick handleResendEmail w full py px bg blue white bold rounded Resend Verification
// Else: div bg white p rounded shadow: h2 xl bold mb Create Account
// If error: div bg red light border l red p mb: p red {error}
// Form space y onSubmit handleSubmit: div: label block small bold gray First Name, input text value=firstName onChange setFirstName disabled loading w full px py border gray rounded
// Div similar Last Name
// Div: label block small bold gray Email, input email value=email onChange setEmail disabled loading w full px py border gray rounded
// Div: label block small bold gray Password, input password value=password onChange setPassword disabled loading w full px py border gray rounded
// Div: label block small bold gray Confirm Password, input password value=confirmPassword onChange setConfirmPassword disabled loading w full px py border gray rounded
// Button submit w full py px bg loading blue light/blue dark white bold rounded disabled loading {loading Creating... else Create Account}
// If !registrationComplete: div center small: p gray Already have? Link to /login bold blue Sign In
// If registrationComplete: div center small: p gray Need help? a href bold blue Contact Support
// Footer py center gray small © 2025 Task Manager. All rights reserved.

// Effect: if user && !loading: navigate /dashboard

// Function: handleSubmit(e) async
// PreventDefault
// SetError null
// If !email trim: error Email required return
// If !password: error Password required return
// If password !== confirm: error mismatch return
// If !firstName trim: error First required return
// If !lastName trim: error Last required return
// Try setFormLoading true
// UserData = {firstName, lastName}
// Result = await signUp(email, password, userData)
// If result.error throw
// SetRegistrationComplete true
// Catch console error registration, setError message or Failed to register
// Finally setFormLoading false

// Function: handleResendEmail()
// Alert Verification resent! (implement actual resend)