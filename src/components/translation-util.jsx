export function getTranslationValue(key, translations, language) {
    const entry = translations[key];
    if (!entry) {
      return key; // fallback if key missing
    }
  
    // If entry is an object (e.g. { en: '...', ro: '...' }), pick the correct language
    if (typeof entry === 'object') {
      return entry[language] || entry.en || Object.values(entry)[0];
    }
  
    
    return entry;
  }