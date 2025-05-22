import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../utils/languageHelper';

function Sidebar({ open, setOpen }) {
  const location = useLocation();
  const [clientsExpanded, setClientsExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { userRole } = useDatabase();
  
  // Get language from localStorage or use default (Romanian)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'ro';
  });
  
  // Listen for language changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('appLanguage');
      if (currentLang && currentLang !== language) {
        setLanguage(currentLang);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [language]);
  
  // Check if user is admin
  const isAdmin = userRole === 'admin';

  // Translations
  const translations = {
    ro: {
      appName: 'ConciergeApp',
      reservations: 'Rezervări',
      clients: 'Clienți',
      addClient: 'Adaugă Client',
      existingClients: 'Clienți Existenți',
      collaborators: 'Colaboratori',
      services: 'Servicii',
      rentalVillas: 'Vile de Închiriat',
      propertiesForSale: 'Proprietăți de Vânzare',
      boats: 'Bărci',
      cars: 'Mașini',
      security: 'Securitate',
      chef: 'Bucătar',
      finance: 'Finanțe',
      financeOverview: 'Prezentare Financiară',
      system: 'Sistem',
      settings: 'Setări',
      generalSettings: 'Setări Generale',
      userManagement: 'Administrare Utilizatori',
      version: 'Versiune',
      language: 'Limbă: Română'
    },
    en: {
      appName: 'ConciergeApp',
      reservations: 'Reservations',
      clients: 'Clients',
      addClient: 'Add Client',
      existingClients: 'Existing Clients',
      collaborators: 'Collaborators',
      services: 'Services',
      rentalVillas: 'Rental Villas',
      propertiesForSale: 'Properties For Sale',
      boats: 'Boats',
      cars: 'Cars',
      security: 'Security',
      chef: 'Chef',
      finance: 'Finance',
      financeOverview: 'Finance Overview',
      system: 'System',
      settings: 'Settings',
      generalSettings: 'General Settings',
      userManagement: 'User Management',
      version: 'Version',
      language: 'Language: English'
    }
  };

  // Get current translation
  const t = translations[language];

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setOpen]);

  // Auto-expand section for current page
  useEffect(() => {
    if (location.pathname.startsWith('/clients')) {
      setClientsExpanded(true);
    }
    if (location.pathname.startsWith('/services')) {
      setServicesExpanded(true);
    }
    if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/users')) {
      setSystemExpanded(true);
    }
  }, [location.pathname]);

  const sidebarStyle = {
    width: isMobile ? '85%' : '280px',
    maxWidth: '280px',
    backgroundColor: '#4F46E5',
    position: isMobile ? 'fixed' : 'sticky',
    top: 0,
    left: 0,
    height: '100vh',
    transform: open ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s ease-in-out',
    zIndex: 40,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isMobile && open ? '0 0 15px rgba(0, 0, 0, 0.2)' : 'none'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isMobile ? 'space-between' : 'center',
    padding: '0 1rem',
    height: '70px',
    backgroundColor: '#4338CA',
  };

  const headerTextStyle = {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white'
  };

  const closeButtonStyle = {
    color: 'white',
    background: 'none',
    border: 'none',
    display: isMobile ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    cursor: 'pointer',
    fontSize: '1.5rem'
  };

  const navContainerStyle = {
    padding: '1rem',
    flex: 1,
    overflowY: 'auto'
  };

  const categoryStyle = {
    fontSize: '0.875rem',
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
    paddingLeft: '0.75rem'
  };

  const navItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem',
    marginBottom: '0.375rem',
    borderRadius: '0.375rem',
    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.8)',
    backgroundColor: isActive ? '#4338CA' : 'transparent',
    textDecoration: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  });

  const subNavItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
    marginBottom: '0.25rem',
    borderRadius: '0.375rem',
    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
    backgroundColor: isActive ? '#4338CA' : 'rgba(255, 255, 255, 0.05)',
    textDecoration: 'none',
    fontWeight: 400,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  });

  const iconStyle = {
    width: '1.25rem',
    height: '1.25rem',
    marginRight: '0.875rem',
    color: 'rgba(255, 255, 255, 0.7)',
    flexShrink: 0
  };

  const chevronStyle = (expanded) => ({
    width: '1rem',
    height: '1rem',
    marginLeft: 'auto',
    transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
    transition: 'transform 0.2s ease-in-out',
    color: 'rgba(255, 255, 255, 0.7)'
  });

  const handleLinkClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && isMobile && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 30,
            opacity: open ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={headerStyle}>
          <span style={headerTextStyle}>{t.appName}</span>
          <button 
            style={closeButtonStyle} 
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        
        <div style={navContainerStyle}>
          <Link 
            to="/reservations" 
            style={navItemStyle(location.pathname === '/reservations')}
            onClick={handleLinkClick}
          >
            <svg 
              style={iconStyle}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 002-2v-7H3v7a2 2 0 002 2z"
              />
            </svg>
            {t.reservations}
          </Link>

          {/* Clients Section */}
          <div style={categoryStyle}>{t.clients}</div>
          
          <div 
            style={navItemStyle(location.pathname.startsWith('/clients'))}
            onClick={() => setClientsExpanded(!clientsExpanded)}
          >
            <svg 
              style={iconStyle}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {t.clients}
            <svg 
              style={chevronStyle(clientsExpanded)}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {clientsExpanded && (
            <>
              <Link 
                to="/clients/add" 
                style={subNavItemStyle(location.pathname === '/clients/add')}
                onClick={handleLinkClick}
              >
                {t.addClient}
              </Link>
              <Link 
                to="/clients/existing" 
                style={subNavItemStyle(location.pathname === '/clients/existing')}
                onClick={handleLinkClick}
              >
                {t.existingClients}
              </Link>
              <Link 
                to="/clients/collaborators" 
                style={subNavItemStyle(location.pathname === '/clients/collaborators')}
                onClick={handleLinkClick}
              >
                {t.collaborators}
              </Link>
            </>
          )}

          {/* Services Section */}
          <div style={categoryStyle}>{t.services}</div>
          
          <div 
            style={navItemStyle(location.pathname.startsWith('/services'))}
            onClick={() => setServicesExpanded(!servicesExpanded)}
          >
            <svg 
              style={iconStyle}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            {t.services}
            <svg 
              style={chevronStyle(servicesExpanded)}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {servicesExpanded && (
            <>
              <Link 
                to="/services/villas" 
                style={subNavItemStyle(location.pathname === '/services/villas')}
                onClick={handleLinkClick}
              >
                {t.rentalVillas}
              </Link>
              <Link 
                to="/services/properties-for-sale" 
                style={subNavItemStyle(location.pathname === '/services/properties-for-sale' || location.pathname.includes('/services/properties-for-sale/'))}
                onClick={handleLinkClick}
              >
                {t.propertiesForSale}
              </Link>
              <Link 
                to="/services/boats" 
                style={subNavItemStyle(location.pathname === '/services/boats')}
                onClick={handleLinkClick}
              >
                {t.boats}
              </Link>
              <Link 
                to="/services/cars" 
                style={subNavItemStyle(location.pathname === '/services/cars')}
                onClick={handleLinkClick}
              >
                {t.cars}
              </Link>
              <Link 
                to="/services/security" 
                style={subNavItemStyle(location.pathname === '/services/security')}
                onClick={handleLinkClick}
              >
                {t.security}
              </Link>
              <Link 
                to="/services/chef" 
                style={subNavItemStyle(location.pathname === '/services/chef')}
                onClick={handleLinkClick}
              >
                {t.chef}
              </Link>
            </>
          )}

          {/* Finance Section - Only visible to admins */}
          {isAdmin && (
            <>
              <div style={categoryStyle}>{t.finance}</div>
              <Link 
                to="/finance" 
                style={navItemStyle(location.pathname === '/finance')}
                onClick={handleLinkClick}
              >
                <svg 
                  style={iconStyle}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {t.financeOverview}
              </Link>
            </>
          )}

          {/* System Section */}
          <div style={categoryStyle}>{t.system}</div>
          
          <div 
            style={navItemStyle(location.pathname.startsWith('/settings') || location.pathname.startsWith('/users'))}
            onClick={() => setSystemExpanded(!systemExpanded)}
          >
            <svg 
              style={iconStyle}
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
            {t.settings}
            <svg 
              style={chevronStyle(systemExpanded)}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          
          {systemExpanded && (
            <>
              <Link 
                to="/settings" 
                style={subNavItemStyle(location.pathname === '/settings')}
                onClick={handleLinkClick}
              >
                {t.generalSettings}
              </Link>
              
              {/* Only show User Management for admins */}
              {isAdmin && (
                <Link 
                  to="/users/manage" 
                  style={subNavItemStyle(location.pathname === '/users/manage')}
                  onClick={handleLinkClick}
                >
                  {t.userManagement}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Version info */}
        <div style={{ 
          padding: '1rem', 
          fontSize: '0.75rem', 
          color: 'rgba(255, 255, 255, 0.5)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          {t.appName} v1.0
        </div>
      </div>
    </>
  );
}

export default Sidebar;