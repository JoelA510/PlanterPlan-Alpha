// components/Header.jsx
function Header({ organization }) {
    return (
      <header className="app-header">
        <div className="header-logo">
          {organization.logo_url ? (
            <img src={organization.logo_url} alt={`${organization.name} logo`} />
          ) : (
            <h1>{organization.name}</h1>
          )}
        </div>
        
        <nav className="header-nav">
          {/* Navigation items */}
        </nav>
        
        <div className="header-user">
          {/* User menu */}
        </div>
      </header>
    );
  }
  
  export default Header;