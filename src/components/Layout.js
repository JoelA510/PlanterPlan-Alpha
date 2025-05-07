import React from 'react';
import { Outlet, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useOrganization } from './contexts/OrganizationProvider';
import { useAuth } from './contexts/AuthContext';
import { supabase } from '../supabaseClient';
import OrganizationLogo from './OrganizationLogo';

const Layout = ({ userType }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams(); // Get the org slug from URL if present
  const { organization, organizationId, loading: orgLoading } = useOrganization();
  const { user, userInfo } = useAuth();
  const isInOrgContext = !!organization;
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  // Determine the base path for navigation links based on user type
  const getBasePath = () => {
    switch (userType) {
      case 'planter_admin':
        return '/admin';
      case 'planter_user':
        return '/user';
      case 'org_admin':
        return `/org/${slug}/admin`;
      case 'org_user':
        return `/org/${slug}/user`;
      default:
        return '/';
    }
  };
  
  const basePath = getBasePath();
  
  // Check if a path is active
  const isActive = (path) => {
    if (path === basePath) {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(path);
  };
  
  // Render navigation items based on user type
  const renderNavItems = () => {
    // Common navigation items for all user types
    const commonItems = [
      {
        path: basePath,
        label: 'Projects',
        icon: '📋'
      },
      {
        path: `${basePath}/settings`,
        label: 'Settings',
        icon: '⚙️'
      }
    ];
    
    // Admin-only navigation items
    const adminItems = [
      {
        path: `${basePath}/templates`,
        label: 'Templates',
        icon: '📝'
      }
    ];
    
    // Determine which items to show based on user type
    const navItems = [...commonItems];
    
    // Add template management for admin users only
    if (userType === 'planter_admin' || userType === 'org_admin') {
      navItems.splice(1, 0, ...adminItems);
    }
    
    // Add white label organizations link for planter_admin only
    if (userType === 'planter_admin' && !isInOrgContext) {
      navItems.push({
        path: `${basePath}/white-label-orgs`,
        label: 'White Label Orgs',
        icon: '🏢'
      });
    }
    
    return navItems.map((item) => (
      <li key={item.path}>
        <Link
          to={item.path}
          className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            textDecoration: 'none',
            color: isActive(item.path) ? '#3b82f6' : '#4b5563',
            backgroundColor: isActive(item.path) ? '#eff6ff' : 'transparent',
            borderRadius: '4px',
            marginBottom: '4px',
            fontWeight: isActive(item.path) ? 'bold' : 'normal',
            transition: 'background-color 0.2s'
          }}
        >
          <span style={{ marginRight: '12px', fontSize: '18px' }}>{item.icon}</span>
          {item.label}
        </Link>
      </li>
    ));
  };
  
  // Return user-specific header title
  const getHeaderTitle = () => {
    switch (userType) {
      case 'planter_admin':
        return 'Planter Admin Dashboard';
      case 'planter_user':
        return 'Planter User Dashboard';
      case 'org_admin':
        return `${organization ? organization.organization_name : (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Organization')} Admin Dashboard`;
      case 'org_user':
        return `${organization ? organization.organization_name : (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Organization')} User Dashboard`;
      default:
        return 'Dashboard';
    }
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (user && user.profile) {
      const firstName = user.profile.first_name || '';
      const lastName = user.profile.last_name || '';
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    return 'U';
  };
  
  // Get user display name
  // const getUserName = () => {
  //   if (user && user.profile) {
  //     return `${user.profile.first_name || ''} ${user.profile.last_name || ''}`;
  //   }
  //   return 'User';
  // };
  const getUserName = () => {
    if (user && userInfo ) {
      return `${userInfo.first_name || ''} ${userInfo.last_name || ''}`;
    }
    return 'User';
  };
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        width: '250px',
        backgroundColor: '#1e293b', // Darker background from SideNavigation
        color: 'white',
        padding: '20px',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        {/* Organization Logo or App Name */}
        {isInOrgContext ? (
          <OrganizationLogo />
        ) : (
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            padding: '20px 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{ marginRight: '8px' }}>🌱</span>
            Planter Plan
          </div>
        )}
        
        {/* Navigation */}
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {renderNavItems()}
          </ul>
        </nav>
        
        {/* Back to Main App - only show when in org context */}
        {isInOrgContext && (
          <div style={{ marginTop: '24px' }}>
            <Link to="/" style={{ 
              display: "block", 
              padding: "10px", 
              color: "#94a3b8",
              textDecoration: "none",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "4px",
              textAlign: "center",
              marginTop: "auto"
            }}>
              Back to Main App
            </Link>
          </div>
        )}
        
        {/* User Info with Logout Button */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          padding: '12px 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '0 12px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              marginRight: '12px'
            }}>
              {getUserInitials()}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: 'white' }}>{getUserName()}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                {userType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            <span style={{ marginRight: '8px' }}>🚪</span>
            Log Out
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{
        marginLeft: '250px',
        flexGrow: 1,
        padding: '20px 32px',
        backgroundColor: '#ffffff'
      }}>
        {/* Header */}
        <header style={{
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {getHeaderTitle()}
          </h1>
        </header>
        
        {/* Page Content - React Router's Outlet */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;