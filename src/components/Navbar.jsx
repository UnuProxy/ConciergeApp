import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentUser, userCompany, userRole: authUserRole, logout } = useAuth();
  const userMenuRef = useRef(null);
  
  // DIRECT FIX: Override userRole based on email using useMemo to prevent recalculations
  // This runs only when currentUser or authUserRole changes
  const userRole = useMemo(() => {
    if (!currentUser) return null;
    
    // Directly check email and return the correct role
    if (currentUser.email === 'conciergeapp2025@gmail.com' || 
        currentUser.email === 'unujulian@gmail.com') {
      // Log only once when the component mounts or when dependencies change
      return 'admin';
    }
    
    // Fallback to the context value
    return authUserRole;
  }, [currentUser, authUserRole]);
  
  // Log only once when userRole changes, not on every render
  useEffect(() => {
    // Only log when the role actually changes
    console.log('FIXED Navbar - Email:', currentUser?.email);
    console.log('FIXED Navbar - Override userRole:', userRole);
  }, [userRole, currentUser?.email]);
  
  // Get user initials from display name
  const getUserInitials = () => {
    if (!currentUser || !currentUser.displayName) return 'U';
    
    const nameParts = currentUser.displayName.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Get company name
  const getCompanyName = () => {
    if (userCompany === 'company1') return 'Luxury Concierge';
    if (userCompany === 'company2') return 'VIP Services';
    return '';
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Get current page title based on location
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/clients/add')) return 'Add Client';
    if (path.startsWith('/clients/existing')) return 'Existing Clients';
    if (path.startsWith('/clients/collaborators')) return 'Collaborators';
    if (path.startsWith('/services/villas')) return 'Rental Villas';
    if (path.startsWith('/services/boats')) return 'Boats';
    if (path.startsWith('/services/cars')) return 'Cars';
    if (path.startsWith('/services/security')) return 'Security';
    if (path.startsWith('/services/chef')) return 'Chef';
    if (path.startsWith('/finance')) return 'Finance';
    if (path.startsWith('/settings')) return 'Settings';
    
    return 'Dashboard';
  };
  
  // Get the appropriate role display text - memoize this for performance
  const roleDisplay = useMemo(() => {
    // If no role, return 'User'
    if (!userRole) return 'User';
    
    // If role is 'admin', return 'Administrator'
    if (typeof userRole === 'string' && userRole.toLowerCase() === 'admin') {
      return 'Administrator';
    }
    
    // For any other role, capitalize first letter
    if (typeof userRole === 'string') {
      return userRole.charAt(0).toUpperCase() + userRole.slice(1);
    }
    
    // Fallback
    return 'User';
  }, [userRole]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header style={{
      backgroundColor: 'white',
      padding: '1rem',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          style={{
            marginRight: '1rem',
            padding: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg
            style={{ width: '1.5rem', height: '1.5rem', color: '#6B7280' }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{getPageTitle()}</div>
        
        {/* Company name badge */}
        {getCompanyName() && !isMobile && (
          <div style={{
            marginLeft: '1rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: '#EEF2FF',
            color: '#4F46E5',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            {getCompanyName()}
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Notifications button */}
        <button
          style={{
            padding: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          <svg
            style={{ width: '1.5rem', height: '1.5rem', color: '#6B7280' }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
        
        {/* User menu */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            {/* User avatar/initials */}
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              backgroundColor: '#4F46E5',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'User'} 
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                getUserInitials()
              )}
            </div>
            
            {/* User name and role (visible on larger screens) */}
            {!isMobile && (
              <div style={{ marginLeft: '0.75rem' }}>
                <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                  {currentUser?.displayName || 'User'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  {roleDisplay}
                </div>
              </div>
            )}
            
            {/* Dropdown chevron */}
            <svg 
              style={{ 
                width: '1rem', 
                height: '1rem', 
                color: '#6B7280', 
                marginLeft: '0.5rem',
                transition: 'transform 0.2s ease',
                transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0)'
              }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {/* Dropdown menu */}
          {userMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: '12rem',
              backgroundColor: 'white',
              borderRadius: '0.375rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              {/* User info section */}
              <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: '500' }}>{currentUser?.displayName}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{currentUser?.email}</div>
                <div style={{ 
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#4F46E5'
                }}>
                  {getCompanyName()} · {roleDisplay}
                </div>
              </div>
              
              {/* Menu items */}
              <div>
                <a 
                  href="/settings"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    color: '#374151',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                >
                  <svg 
                    style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                  </svg>
                  Settings
                </a>
                
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    color: '#EF4444',
                    fontSize: '0.875rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <svg 
                    style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;