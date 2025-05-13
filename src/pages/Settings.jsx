import React, { useState, useEffect } from 'react';

function Settings() {
  // Get language from localStorage or use default (Romanian)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'ro';
  });
  
  // State for showing success message
  const [showSuccess, setShowSuccess] = useState(false);

  // Save language preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('appLanguage', language);
    // Trigger a storage event so other components can react to the change
    window.dispatchEvent(new Event('storage'));
  }, [language]);

  // Translations for the settings page
  const translations = {
    ro: {
      title: 'Setări Generale',
      languageSection: 'Setări Limbă',
      languageLabel: 'Selectează Limba',
      romanian: 'Română',
      english: 'Engleză',
      otherSettings: 'Alte Setări',
      save: 'Salvează',
      appAppearance: 'Aspectul Aplicației',
      darkMode: 'Mod Întunecat',
      lightMode: 'Mod Luminos',
      notifications: 'Notificări',
      enableNotifications: 'Activează Notificările',
      dataPrivacy: 'Confidențialitatea Datelor',
      deleteData: 'Șterge Toate Datele',
      saveSuccess: 'Setările au fost salvate cu succes!'
    },
    en: {
      title: 'General Settings',
      languageSection: 'Language Settings',
      languageLabel: 'Select Language',
      romanian: 'Romanian',
      english: 'English',
      otherSettings: 'Other Settings',
      save: 'Save',
      appAppearance: 'App Appearance',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      notifications: 'Notifications',
      enableNotifications: 'Enable Notifications',
      dataPrivacy: 'Data Privacy',
      deleteData: 'Delete All Data',
      saveSuccess: 'Settings saved successfully!'
    }
  };

  // Get current translation
  const t = translations[language];

  // Styling
  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  };

  const sectionStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const headerStyle = {
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '1rem',
    marginBottom: '1.5rem'
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#111827'
  };

  const sectionTitleStyle = {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem'
  };

  const formGroupStyle = {
    marginBottom: '1.5rem'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#374151'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    color: '#111827',
    fontSize: '1rem'
  };

  const buttonStyle = {
    backgroundColor: '#4F46E5',
    color: 'white',
    fontWeight: '500',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  };
  
  const successMessageStyle = {
    backgroundColor: '#10B981', // Green background
    color: 'white',
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
    marginTop: '1rem',
    display: showSuccess ? 'block' : 'none',
    transition: 'opacity 0.3s ease',
    opacity: showSuccess ? 1 : 0
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };
  
  const handleSave = () => {
    // Show success message
    setShowSuccess(true);
    
    // Hide the message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>{t.title}</h1>
      </header>

      {/* Language Settings Section */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>{t.languageSection}</h2>
        <div style={formGroupStyle}>
          <label htmlFor="language" style={labelStyle}>
            {t.languageLabel}
          </label>
          <select 
            id="language" 
            value={language} 
            onChange={handleLanguageChange} 
            style={selectStyle}
          >
            <option value="ro">{t.romanian}</option>
            <option value="en">{t.english}</option>
          </select>
        </div>
      </section>

      {/* Other settings sections would go here */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>{t.otherSettings}</h2>
        <div style={formGroupStyle}>
          <h3 style={{...labelStyle, fontSize: '1.1rem'}}>{t.appAppearance}</h3>
          <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
            <button style={{...buttonStyle, backgroundColor: '#1f2937'}}>{t.darkMode}</button>
            <button style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#1f2937'}}>{t.lightMode}</button>
          </div>
        </div>
        
        <div style={formGroupStyle}>
          <h3 style={{...labelStyle, fontSize: '1.1rem'}}>{t.notifications}</h3>
          <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
            <input type="checkbox" style={{marginRight: '0.5rem'}} />
            {t.enableNotifications}
          </label>
        </div>
        
        <div style={formGroupStyle}>
          <h3 style={{...labelStyle, fontSize: '1.1rem'}}>{t.dataPrivacy}</h3>
          <button style={{...buttonStyle, backgroundColor: '#EF4444'}}>
            {t.deleteData}
          </button>
        </div>
      </section>

      <button 
        style={buttonStyle}
        onClick={handleSave}
      >
        {t.save}
      </button>
      
      {/* Success message */}
      <div style={successMessageStyle}>
        {t.saveSuccess}
      </div>
    </div>
  );
}

export default Settings;