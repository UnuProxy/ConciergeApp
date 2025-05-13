// TranslationProvider.jsx
// Add this file to your project and wrap your App with it

import React from 'react';

// Create a context for translations
export const TranslationContext = React.createContext({
  t: (key) => key, // Default translator that just returns the key
  currentLanguage: 'en'
});

// Helper function to safely get translation value
const safeTranslation = (value, language = 'en') => {
  // Handle null/undefined
  if (value == null) return '';
  
  // If it's already a string, return it
  if (typeof value === 'string') return value;
  
  // Handle translation objects with language keys
  if (typeof value === 'object' && (value.en !== undefined || value.ro !== undefined)) {
    return value[language] || value.en || value.ro || '';
  }
  
  // Handle other cases by converting to string
  return String(value);
};

// Monkey patch React's createElement to intercept translation objects
// This is a bit of a hack, but it's effective for catching all instances
const originalCreateElement = React.createElement;
React.createElement = function(type, props, ...children) {
  // Only process string/text content in spans or other text elements
  if (type === 'span' || type === 'p' || type === 'h1' || type === 'h2' || 
      type === 'h3' || type === 'h4' || type === 'h5' || type === 'h6' || 
      type === 'label' || type === 'a' || type === 'button' || 
      type === 'div' || type === 'li') {
    
    // Process children to safely handle translation objects
    if (children && children.length > 0) {
      children = children.map(child => {
        if (child !== null && typeof child === 'object' && 
            !React.isValidElement(child) && (child.en !== undefined || child.ro !== undefined)) {
          // If this is a translation object, extract the value
          return safeTranslation(child);
        }
        return child;
      });
    }
    
    // Also check text content in dangerouslySetInnerHTML
    if (props && props.dangerouslySetInnerHTML && props.dangerouslySetInnerHTML.__html) {
      const html = props.dangerouslySetInnerHTML.__html;
      if (typeof html === 'object' && (html.en !== undefined || html.ro !== undefined)) {
        props = {
          ...props,
          dangerouslySetInnerHTML: {
            __html: safeTranslation(html)
          }
        };
      }
    }
  }
  
  // Call the original React.createElement with our processed props and children
  return originalCreateElement.apply(this, [type, props, ...children]);
};

// The translation provider component
export const TranslationProvider = ({ children, defaultLanguage = 'en' }) => {
  const [language, setLanguage] = React.useState(defaultLanguage);
  
  // The translation function
  const t = React.useCallback((key) => {
    if (!key) return '';
    
    // If it's a translation object, return the appropriate language value
    if (typeof key === 'object' && (key.en !== undefined || key.ro !== undefined)) {
      return key[language] || key.en || key.ro || '';
    }
    
    // Otherwise, just return the key
    return key;
  }, [language]);
  
  // Create context value
  const contextValue = React.useMemo(() => ({
    t,
    currentLanguage: language,
    setLanguage
  }), [t, language]);
  
  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
};

// Custom hook to use translations
export const useTranslation = () => {
  const context = React.useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Safe text component to use when you know you're dealing with translations
export const SafeText = ({ children, ...props }) => {
  const { currentLanguage } = useTranslation();
  
  // Handle direct translation objects
  if (children && typeof children === 'object' && 
      !React.isValidElement(children) && (children.en !== undefined || children.ro !== undefined)) {
    return <span {...props}>{safeTranslation(children, currentLanguage)}</span>;
  }
  
  return <span {...props}>{children}</span>;
};

export default TranslationProvider;