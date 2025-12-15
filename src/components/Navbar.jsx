import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/languageHelper';

const NAVBAR_TRANSLATIONS = {
  en: {
    pageTitles: {
      dashboard: 'Dashboard',
      addClient: 'Add Client',
      existingClients: 'Existing Clients',
      collaborators: 'Collaborators',
      rentalVillas: 'Rental Villas',
      boats: 'Boats',
      cars: 'Cars',
      security: 'Security',
      chef: 'Chef',
      finance: 'Finance',
      settings: 'Settings'
    },
    newClientButton: '+ New Client',
    synced: 'Synced',
    online: 'Online',
    signOut: 'Sign out',
    roles: {
      user: 'User',
      admin: 'Administrator',
      manager: 'Manager',
      agent: 'Agent'
    }
  },
  ro: {
    pageTitles: {
      dashboard: 'Tablou de Bord',
      addClient: 'Adaugă Client',
      existingClients: 'Clienți Existenți',
      collaborators: 'Colaboratori',
      rentalVillas: 'Vile de Închiriat',
      boats: 'Bărci',
      cars: 'Mașini',
      security: 'Securitate',
      chef: 'Bucătar',
      finance: 'Finanțe',
      settings: 'Setări'
    },
    newClientButton: '+ Client Nou',
    synced: 'Sincronizat',
    online: 'Online',
    signOut: 'Deconectare',
    roles: {
      user: 'Utilizator',
      admin: 'Administrator',
      manager: 'Manager',
      agent: 'Agent'
    }
  }
};

function Navbar({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentUser, userCompany, userRole: authUserRole, logout } = useAuth();
  const userMenuRef = useRef(null);
  const { language } = useLanguage();
  const navbarStrings = NAVBAR_TRANSLATIONS[language] || NAVBAR_TRANSLATIONS.en;
  const isReservationsPage = location.pathname.startsWith('/reservations');
  
  const userRole = useMemo(() => {
    if (!currentUser) return null;
    
    if (currentUser.email === 'conciergeapp2025@gmail.com' || 
        currentUser.email === 'unujulian@gmail.com') {
      return 'admin';
    }
    
    return authUserRole;
  }, [currentUser, authUserRole]);
  
  useEffect(() => {
    console.log('FIXED Navbar - Email:', currentUser?.email);
    console.log('FIXED Navbar - Override userRole:', userRole);
  }, [userRole, currentUser?.email]);
  
  const getUserInitials = () => {
    if (!currentUser || !currentUser.displayName) return 'U';
    
    const nameParts = currentUser.displayName.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };
  
  const getCompanyName = () => {
    if (userCompany === 'company1') return 'Luxury Concierge';
    if (userCompany === 'company2') return 'VIP Services';
    return '';
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return navbarStrings.pageTitles.dashboard;
    if (path.startsWith('/clients/add')) return navbarStrings.pageTitles.addClient;
    if (path.startsWith('/clients/existing')) return navbarStrings.pageTitles.existingClients;
    if (path.startsWith('/clients/collaborators')) return navbarStrings.pageTitles.collaborators;
    if (path.startsWith('/services/villas')) return navbarStrings.pageTitles.rentalVillas;
    if (path.startsWith('/services/boats')) return navbarStrings.pageTitles.boats;
    if (path.startsWith('/services/cars')) return navbarStrings.pageTitles.cars;
    if (path.startsWith('/services/security')) return navbarStrings.pageTitles.security;
    if (path.startsWith('/services/chef')) return navbarStrings.pageTitles.chef;
    if (path.startsWith('/finance')) return navbarStrings.pageTitles.finance;
    if (path.startsWith('/settings')) return navbarStrings.pageTitles.settings;
    
    return navbarStrings.pageTitles.dashboard;
  };
  
  const roleDisplay = useMemo(() => {
    if (!userRole || typeof userRole !== 'string') {
      return navbarStrings.roles.user;
    }

    const normalizedRole = userRole.toLowerCase();
    if (navbarStrings.roles[normalizedRole]) {
      return navbarStrings.roles[normalizedRole];
    }

    return userRole.charAt(0).toUpperCase() + userRole.slice(1);
  }, [userRole, language]);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="app-navbar">
      <div className="app-navbar__left">
        {isMobile && (
          <button
            type="button"
            className="app-navbar__icon-button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="app-navbar__page">{getPageTitle()}</div>
        {!isMobile && getCompanyName() && (
          <div className="app-navbar__company-pill">
            <div className="app-navbar__company-name">{getCompanyName()}</div>
            <div className="app-navbar__company-role">{roleDisplay}</div>
          </div>
        )}
        {!isMobile && (
          <div className="app-navbar__status">
            <span className="status-dot" />
            <span>{userRole ? navbarStrings.synced : navbarStrings.online}</span>
          </div>
        )}
      </div>
      <div className="app-navbar__right">
        {!isReservationsPage && (
          <button
            className="app-navbar__quick-action"
            onClick={() => navigate('/clients/add')}
          >
            {navbarStrings.newClientButton}
          </button>
        )}
        <button className="app-navbar__icon-button" onClick={() => navigate('/')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13.5l9-9 9 9M4.5 12H7v8H4.5zM17 12h2.5v8H17zM9.5 21v-6h5v6" />
          </svg>
        </button>
        <button className="app-navbar__icon-button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
          </svg>
        </button>
        <div className="app-navbar__user" ref={userMenuRef} onClick={() => setUserMenuOpen(prev => !prev)}>
          <div className="app-navbar__avatar">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser?.displayName || navbarStrings.roles.user}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getUserInitials()
            )}
          </div>
          {!isMobile && (
            <div className="app-navbar__user-label">
              <div className="app-navbar__user-name">{currentUser?.displayName || navbarStrings.roles.user}</div>
            </div>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16" style={{ opacity: 0.6 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {userMenuOpen && (
            <div className="app-navbar__user-menu">
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600 }}>{currentUser?.displayName || navbarStrings.roles.user}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(15,23,42,0.6)' }}>{currentUser?.email || 'user@example.com'}</div>
              </div>
              <button onClick={handleLogout}>{navbarStrings.signOut}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
