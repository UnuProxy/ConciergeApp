// hooks/useMediaQuery.js
import { useState, useEffect } from 'react';

/**
 * Hook personalizat pentru a detecta interogări media
 * @param {string} query Interogarea media de verificat (ex: '(max-width: 768px)')
 * @returns {boolean} Rezultatul interogării media
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// hooks/useResponsive.js
import { useMediaQuery } from './useMediaQuery';

/**
 * Hook pentru a verifica diferite breakpoint-uri responsive
 */
export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  
  return { isMobile, isTablet, isDesktop };
}

// utils/responsive.js
/**
 * Utilitar pentru a aplica stiluri condiționate în funcție de dimensiunea ecranului
 * @param {Object} baseStyles Stilurile de bază
 * @param {Object} mobileStyles Stiluri pentru mobile (max-width: 640px)
 * @param {Object} tabletStyles Stiluri pentru tablete (min-width: 641px) and (max-width: 1024px)
 * @param {Object} desktopStyles Stiluri pentru desktop (min-width: 1025px)
 * @returns {Object} Obiectul CSS final pentru render
 */
export function responsiveStyles(baseStyles = {}, mobileStyles = {}, tabletStyles = {}, desktopStyles = {}) {
  // Detectează dimensiunea ecranului în momentul randării
  const isMobile = window.innerWidth <= 640;
  const isTablet = window.innerWidth > 640 && window.innerWidth <= 1024;
  const isDesktop = window.innerWidth > 1024;
  
  let styles = { ...baseStyles };
  
  if (isMobile) {
    styles = { ...styles, ...mobileStyles };
  } else if (isTablet) {
    styles = { ...styles, ...tabletStyles };
  } else if (isDesktop) {
    styles = { ...styles, ...desktopStyles };
  }
  
  return styles;
}

// components/Responsive.jsx
import React from 'react';
import { useResponsive } from '../hooks/useResponsive';

/**
 * Componentă care redă conținut diferit în funcție de dimensiunea ecranului
 */
export function Responsive({ children, mobile, tablet, desktop }) {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  if (isMobile && mobile) return mobile;
  if (isTablet && tablet) return tablet;
  if (isDesktop && desktop) return desktop;
  
  return children; // Conținut implicit
}

// Exemplu de utilizare:
/*
import { Responsive } from '../components/Responsive';

function MyComponent() {
  return (
    <Responsive
      mobile={<div>Versiune pentru mobil</div>}
      tablet={<div>Versiune pentru tabletă</div>}
      desktop={<div>Versiune pentru desktop</div>}
    >
      <div>Conținut implicit</div>
    </Responsive>
  );
}
*/