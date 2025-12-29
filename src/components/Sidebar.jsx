import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../utils/languageHelper';

const getInitialMobileState = () => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth < 768;
};

function Sidebar({ open, setOpen }) {
  const location = useLocation();
  const [clientsExpanded, setClientsExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(getInitialMobileState);
  const { userRole } = useDatabase();
  const { language: currentLanguage, setLanguage: updateAppLanguage } = useLanguage();

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'ro';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('appLanguage');
      if (currentLang && currentLang !== language) {
        setLanguage(currentLang);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [language]);

  const isAdmin = userRole === 'admin';

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

  const t = translations[language];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile && !open) {
        setOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, setOpen]);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [isMobile, setOpen]);

  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, open]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && open && isMobile) {
        closeSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeSidebar, open, isMobile]);

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

  const sidebarClass = [
    'app-sidebar',
    isMobile ? 'app-sidebar--mobile' : '',
    open ? 'app-sidebar--open' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <>
      {open && isMobile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            zIndex: 30
          }}
          onClick={closeSidebar}
        />
      )}

      <nav className={sidebarClass}>
        <div className="app-sidebar__header">
          <Link 
            to="/" 
            className="app-sidebar__brand" 
            onClick={handleLinkClick}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {t.appName}
          </Link>
          {isMobile && (
            <button
              type="button"
              className="app-sidebar__close"
              aria-label="Close sidebar"
              onClick={closeSidebar}
            >
              ×
            </button>
          )}
        </div>

        <div className="app-sidebar__nav">
          <div className="app-sidebar__meta">
            <div>
              <div className="app-sidebar__meta-label">{t.language}</div>
            </div>
            <button
              className="pill"
              style={{ border: 'none', background: 'rgba(255,255,255,0.08)', color: 'white' }}
              onClick={() => updateAppLanguage(currentLanguage === 'ro' ? 'en' : 'ro')}
            >
              {currentLanguage === 'ro' ? 'EN' : 'RO'}
            </button>
          </div>

          <div className="app-sidebar__category">{t.reservations}</div>
          <Link
            to="/reservations"
            className={`app-sidebar__item ${location.pathname.startsWith('/reservations') ? 'app-sidebar__item--active' : ''}`}
            onClick={handleLinkClick}
          >
            <SidebarIcon path="M9.75 17a2.25 2.25 0 104.5 0m-7.5-3h10.5A1.5 1.5 0 0018 12.5V9a6 6 0 00-6-6 6 6 0 00-6 6v3.5A1.5 1.5 0 006.75 14z" />
            {t.reservations}
          </Link>

          <div className="app-sidebar__category">{t.clients}</div>
          <div
            className={`app-sidebar__item ${location.pathname.startsWith('/clients') ? 'app-sidebar__item--active' : ''}`}
            onClick={() => setClientsExpanded((prev) => !prev)}
          >
            <SidebarIcon path="M17 20h5V10H2v10h5m10-8v8M7 12v8m0 0a3 3 0 006 0m-6 0a3 3 0 016 0" />
            {t.clients}
            <Chevron expanded={clientsExpanded} />
          </div>
          {clientsExpanded && (
            <div>
              <SidebarLink
                to="/clients/add"
                label={t.addClient}
                active={location.pathname === '/clients/add'}
                onClick={handleLinkClick}
              />
              <SidebarLink
                to="/clients/existing"
                label={t.existingClients}
                active={location.pathname === '/clients/existing'}
                onClick={handleLinkClick}
              />
              <SidebarLink
                to="/clients/collaborators"
                label={t.collaborators}
                active={location.pathname === '/clients/collaborators'}
                onClick={handleLinkClick}
              />
            </div>
          )}

          <div className="app-sidebar__category">{t.services}</div>
          <div
            className={`app-sidebar__item ${location.pathname.startsWith('/services') ? 'app-sidebar__item--active' : ''}`}
            onClick={() => setServicesExpanded((prev) => !prev)}
          >
            <SidebarIcon path="M3 7h18M3 12h18M3 17h18" />
            {t.services}
            <Chevron expanded={servicesExpanded} />
          </div>
          {servicesExpanded && (
            <div>
              <SidebarLink
                to="/services/villas"
                label={t.rentalVillas}
                active={location.pathname === '/services/villas'}
                onClick={handleLinkClick}
              />
              <SidebarLink
                to="/services/properties-for-sale"
                label={t.propertiesForSale}
                active={location.pathname === '/services/properties-for-sale'}
                onClick={handleLinkClick}
              />
              <SidebarLink
                to="/services/boats"
                label={t.boats}
                active={location.pathname === '/services/boats'}
                onClick={handleLinkClick}
              />
              <SidebarLink
                to="/services/cars"
                label={t.cars}
                active={location.pathname === '/services/cars'}
                onClick={handleLinkClick}
              />
            </div>
          )}

          <div className="app-sidebar__category">{t.finance}</div>
          <Link
            to="/finance"
            className={`app-sidebar__item ${location.pathname.startsWith('/finance') ? 'app-sidebar__item--active' : ''}`}
            onClick={handleLinkClick}
          >
            <SidebarIcon path="M11 11V5a1 1 0 112 0v6a4 4 0 11-2 0z" />
            {t.financeOverview}
          </Link>

          <div className="app-sidebar__category">{t.system}</div>
          <div
            className={`app-sidebar__item ${
              location.pathname.startsWith('/settings') || location.pathname.startsWith('/users')
                ? 'app-sidebar__item--active'
                : ''
            }`}
            onClick={() => setSystemExpanded((prev) => !prev)}
          >
            <SidebarIcon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            {t.system}
            <Chevron expanded={systemExpanded} />
          </div>
          {systemExpanded && (
            <div>
              <SidebarLink
                to="/settings"
                label={t.generalSettings}
                active={location.pathname === '/settings'}
                onClick={handleLinkClick}
              />
              {isAdmin && (
                <SidebarLink
                  to="/users/manage"
                  label={t.userManagement}
                  active={location.pathname.startsWith('/users')}
                  onClick={handleLinkClick}
                />
              )}
            </div>
          )}
        </div>

        <div className="app-sidebar__footer">
          <div>© {new Date().getFullYear()} ConciergeApp · Build 3.4.1</div>
        </div>
      </nav>
    </>
  );
}

const SidebarIcon = ({ path }) => (
  <svg className="app-sidebar__item-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const SidebarLink = ({ to, label, active, onClick }) => (
  <Link
    to={to}
    className={`app-sidebar__item app-sidebar__subitem ${active ? 'app-sidebar__item--active' : ''}`}
    onClick={onClick}
  >
    {label}
  </Link>
);

const Chevron = ({ expanded }) => (
  <svg
    style={{
      width: '1rem',
      height: '1rem',
      marginLeft: 'auto',
      transition: 'transform 0.2s',
      transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
      opacity: 0.7
    }}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default Sidebar;
