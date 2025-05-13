// styles/constants.js - Variabile de stil reutilizabile pentru întreaga aplicație

// Breakpoints pentru responsive design
export const BREAKPOINTS = {
    xs: '480px',    // Extra small devices
    sm: '640px',    // Small devices (mobile)
    md: '768px',    // Medium devices (tablets)
    lg: '1024px',   // Large devices (laptops)
    xl: '1280px',   // Extra large devices (desktops)
    xxl: '1536px'   // Extra extra large devices
  };
  
  // Spacing - pentru a menține consistența spațierii în aplicație
  export const SPACING = {
    xxs: '0.25rem',  // 4px
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem'      // 48px
  };
  
  // Colors - schema de culori a aplicației
  export const COLORS = {
    // Culori primare
    primary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1', // Culoarea primară principală
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81'
    },
    
    // Culori de accent
    accent: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6', // Culoarea de accent principală
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A'
    },
    
    // Nuanțe de gri
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    },
    
    // Culori de stare
    status: {
      success: '#10B981', // Green
      warning: '#FBBF24', // Yellow
      error: '#EF4444',   // Red
      info: '#3B82F6'     // Blue
    },
    
    // Alte culori
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)'
  };
  
  // Shadows - pentru efecte de umbră consistente
  export const SHADOWS = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  };
  
  // Border Radius - pentru colțuri rotunjite
  export const BORDER_RADIUS = {
    xs: '0.125rem', // 2px
    sm: '0.25rem',  // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem',   // 8px
    xl: '0.75rem',  // 12px
    '2xl': '1rem',  // 16px
    full: '9999px'  // Perfect circle/pill
  };
  
  // Typography - pentru stil de text consistent
  export const TYPOGRAPHY = {
    fontFamily: {
      sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    },
    
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      md: '1rem',        // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
    },
    
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    
    lineHeight: {
      none: 1,
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2
    }
  };
  
  // Z-index - pentru a gestiona ordinea straturilor
  export const Z_INDEX = {
    hide: -1,
    auto: 'auto',
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modal: 40,
    popover: 50,
    tooltip: 60,
    toast: 70
  };
  
  // Tranziții - pentru animații consistente
  export const TRANSITIONS = {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    timing: {
      ease: 'ease',
      linear: 'linear',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out'
    }
  };
  
  // Media Queries - pentru a simplifica utilizarea media queries
  export const mediaQuery = (key) => {
    return `@media (min-width: ${BREAKPOINTS[key]})`;
  };
  
  // Exemplu de utilizare a Media Queries
  /*
  const containerStyle = {
    width: '100%',
    padding: SPACING.md,
    [mediaQuery('md')]: {
      width: '50%',
      padding: SPACING.lg
    }
  };
  */
  
  // Ghid de stil pentru diverse componente (common.js)
  export const commonStyles = {
    // Card style
    card: {
      backgroundColor: COLORS.white,
      borderRadius: BORDER_RADIUS.lg,
      boxShadow: SHADOWS.md,
      padding: SPACING.lg,
      marginBottom: SPACING.lg
    },
    
    // Button styles
    button: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SPACING.sm} ${SPACING.lg}`,
        borderRadius: BORDER_RADIUS.md,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        transition: `all ${TRANSITIONS.duration.normal} ${TRANSITIONS.timing.inOut}`,
        cursor: 'pointer'
      },
      
      primary: {
        backgroundColor: COLORS.primary[600],
        color: COLORS.white,
        ':hover': {
          backgroundColor: COLORS.primary[700]
        }
      },
      
      secondary: {
        backgroundColor: COLORS.gray[200],
        color: COLORS.gray[800],
        ':hover': {
          backgroundColor: COLORS.gray[300]
        }
      },
      
      success: {
        backgroundColor: COLORS.status.success,
        color: COLORS.white,
        ':hover': {
          backgroundColor: '#0DA271' // Darker green
        }
      },
      
      danger: {
        backgroundColor: COLORS.status.error,
        color: COLORS.white,
        ':hover': {
          backgroundColor: '#DC2626' // Darker red
        }
      }
    },
    
    // Form element styles
    form: {
      input: {
        display: 'block',
        width: '100%',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        border: `1px solid ${COLORS.gray[300]}`,
        fontSize: TYPOGRAPHY.fontSize.md,
        ':focus': {
          outline: 'none',
          borderColor: COLORS.primary[500],
          boxShadow: `0 0 0 2px ${COLORS.primary[100]}`
        }
      },
      
      label: {
        display: 'block',
        marginBottom: SPACING.xs,
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        color: COLORS.gray[700]
      },
      
      formGroup: {
        marginBottom: SPACING.lg
      }
    },
    
    // Page container
    container: {
      width: '100%',
      paddingLeft: SPACING.md,
      paddingRight: SPACING.md,
      marginLeft: 'auto',
      marginRight: 'auto',
      [mediaQuery('sm')]: {
        maxWidth: '640px'
      },
      [mediaQuery('md')]: {
        maxWidth: '768px'
      },
      [mediaQuery('lg')]: {
        maxWidth: '1024px'
      },
      [mediaQuery('xl')]: {
        maxWidth: '1280px'
      }
    },
    
    // Grid Layout
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(1, 1fr)',
      gap: SPACING.md,
      [mediaQuery('sm')]: {
        gridTemplateColumns: 'repeat(2, 1fr)'
      },
      [mediaQuery('md')]: {
        gridTemplateColumns: 'repeat(3, 1fr)'
      },
      [mediaQuery('lg')]: {
        gridTemplateColumns: 'repeat(4, 1fr)'
      }
    },
    
    // Utilitare flexbox
    flex: {
      row: {
        display: 'flex',
        flexDirection: 'row'
      },
      column: {
        display: 'flex',
        flexDirection: 'column'
      },
      center: {
        justifyContent: 'center',
        alignItems: 'center'
      },
      between: {
        justifyContent: 'space-between'
      },
      wrap: {
        flexWrap: 'wrap'
      }
    }
  };
  
  // Mobile-first styles - exemplu de implementare
  export const mobileFirst = {
    // Layout cu grid care se adaptează la multiple breakpoint-uri
    responsiveGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',             // Default: o singură coloană pe mobil
      gap: SPACING.md,
      [mediaQuery('sm')]: {
        gridTemplateColumns: 'repeat(2, 1fr)' // 2 coloane pe tablete mici
      },
      [mediaQuery('md')]: {
        gridTemplateColumns: 'repeat(3, 1fr)' // 3 coloane pe tablete
      },
      [mediaQuery('lg')]: {
        gridTemplateColumns: 'repeat(4, 1fr)' // 4 coloane pe desktop
      }
    },
    
    // Elemente vizibile doar pe anumite breakpoint-uri
    visibilityClasses: {
      hideOnMobile: {
        display: 'none',
        [mediaQuery('md')]: {
          display: 'block'
        }
      },
      showOnlyOnMobile: {
        display: 'block',
        [mediaQuery('md')]: {
          display: 'none'
        }
      }
    },
    
    // Butoane responsive
    button: {
      // Buton care ocupă toată lățimea pe mobil, dar este de dimensiune normală pe desktop
      fullWidthOnMobile: {
        display: 'block',
        width: '100%',
        [mediaQuery('md')]: {
          display: 'inline-block',
          width: 'auto'
        }
      }
    },
    
    // Tipografie responsivă
    typography: {
      responsiveHeading: {
        fontSize: TYPOGRAPHY.fontSize.xl,           // 20px pe mobil
        [mediaQuery('md')]: {
          fontSize: TYPOGRAPHY.fontSize['2xl']      // 24px pe tablete
        },
        [mediaQuery('lg')]: {
          fontSize: TYPOGRAPHY.fontSize['3xl']      // 30px pe desktop
        }
      }
    }
  };
  
  // Recomandări și bune practici pentru mobile
  /*
  1. Folosește abordarea "mobile-first" - începe cu stilurile pentru mobil ca bază, apoi adaugă media queries pentru ecrane mai mari
  2. Asigură-te că toate zonele interactive (butoane, linkuri) au dimensiuni de minim 44x44px pentru a fi ușor de atins pe mobil
  3. Simplifică formularele pe mobil - aranjează câmpurile unul sub altul și folosește toată lățimea disponibilă
  4. Testează aplicația pe dispozitive reale sau folosind Chrome DevTools pentru simulare
  5. Folosește unități responsive precum %, em, rem în loc de pixeli ficși
  6. Asigură-te că textul este suficient de mare pentru a fi citit ușor pe ecrane mici (minim 16px/1rem)
  7. Implementează 'touch feedback' pentru elementele interactive (hover state, active state)
  8. Optimizează imaginile pentru a se redimensiona corect pe ecrane de diferite dimensiuni
  9. Folosește aria-labels și alte atribute de accesibilitate pentru o experiență inclusivă
  10. Testează performanța aplicației pe conexiuni lente sau instabile
  */