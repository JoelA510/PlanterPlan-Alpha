import React from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';

const Layout = ({ userType }) => {
  const location = useLocation();
  const { slug } = useParams(); // Get the org slug from URL if present
  
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
        return `${slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Organization'} Admin Dashboard`;
      case 'org_user':
        return `${slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Organization'} User Dashboard`;
      default:
        return 'Dashboard';
    }
  };
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        width: '250px',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        padding: '20px',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        {/* Logo/App Name */}
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#10b981',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '8px' }}>🌱</span>
          Planter
        </div>
        
        {/* Navigation */}
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {renderNavItems()}
          </ul>
        </nav>
        
        {/* User Info - This would be dynamic in a real app */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          padding: '12px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center'
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
            JD
          </div>
          <div>
            <div style={{ fontWeight: 'bold' }}>John Doe</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {userType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
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