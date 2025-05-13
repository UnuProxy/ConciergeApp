import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the language context
const LanguageContext = createContext();

// Create the language provider component
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  // Load saved language preference from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Function to toggle between languages
  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'ro' : 'en';
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Create and export the useLanguage hook
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}