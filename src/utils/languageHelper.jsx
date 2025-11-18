import React, { useEffect, useState } from 'react';
// languageHelper.js
/**
 * A simple utility for handling language in components
 */

// Get the current language from localStorage
export const getCurrentLanguage = () => {
    return localStorage.getItem('appLanguage') || 'ro'; // Default to Romanian
  };
  
  // Set the language in localStorage and trigger an update event
  export const setAppLanguage = (language) => {
    if (language === 'ro' || language === 'en') {
      localStorage.setItem('appLanguage', language);
      // Dispatch storage event to notify other components
      window.dispatchEvent(new Event('storage'));
    }
  };
  
  // Toggle between Romanian and English
  export const toggleLanguage = () => {
    const currentLang = getCurrentLanguage();
    setAppLanguage(currentLang === 'ro' ? 'en' : 'ro');
  };
  
  // Custom hook for using language in components
  export const useLanguage = () => {
    const [language, setLanguage] = useState(getCurrentLanguage());
    
    useEffect(() => {
      const handleStorageChange = () => {
        setLanguage(getCurrentLanguage());
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }, []);
    
    return {
      language,
      setLanguage: (lang) => setAppLanguage(lang),
      toggleLanguage
    };
  };
  
  // Usage in components:
  /*
  import { useLanguage } from '../utils/languageHelper';
  
  function MyComponent() {
    const { language } = useLanguage();
    
    const translations = {
      ro: {
        title: 'Titlu în Română',
        // other translations
      },
      en: {
        title: 'Title in English',
        // other translations
      }
    };
    
    const t = translations[language];
    
    return (
      <div>
        <h1>{t.title}</h1>
      </div>
    );
  }
  */
