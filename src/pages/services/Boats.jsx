// Boats component with updated pricing structure - inline styles
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db, storage } from '../../firebase/config';

// Responsive styles with media queries
const styles = {
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    '@media (min-width: 768px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a202c'
  },
  subtitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '1rem'
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    marginBottom: '1.25rem'
  },
  form: {
    padding: '1.5rem',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  formSection: {
    marginBottom: '1.25rem'
  },
  formLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: '0.25rem'
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    marginBottom: '0.75rem'
  },
  textarea: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    marginBottom: '0.75rem',
    minHeight: '100px'
  },
  fileInput: {
    marginBottom: '0.75rem',
    width: '100%'
  },
  flexRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem'
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
    marginTop: '1.25rem',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    }
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: '#4b5563',
    marginBottom: '0.5rem'
  },
  checkbox: {
    marginRight: '0.5rem',
    width: '1rem',
    height: '1rem'
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: '500',
    padding: '0.625rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    minHeight: '2.5rem',
    width: '100%',
    '@media (min-width: 640px)': {
      width: 'auto'
    }
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    fontWeight: '500',
    padding: '0.625rem 1rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    minHeight: '2.5rem',
    width: '100%',
    '@media (min-width: 640px)': {
      width: 'auto'
    }
  },
  buttonDanger: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    fontWeight: '500',
    padding: '0.625rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    minHeight: '2.5rem',
    width: '100%',
    '@media (min-width: 640px)': {
      width: 'auto'
    }
  },
  tabContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '1.5rem',
    gap: '0.25rem',
    overflowX: 'auto',
    whiteSpace: 'nowrap'
  },
  tab: {
    padding: '0.5rem 0.75rem',
    fontWeight: '500',
    fontSize: '0.875rem',
    cursor: 'pointer',
    flex: '0 0 auto'
  },
  activeTab: {
    borderBottom: '2px solid #3b82f6',
    color: '#3b82f6'
  },
  inactiveTab: {
    color: '#6b7280'
  },
  photosContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem'
  },
  photoPreview: {
    position: 'relative',
    height: '5rem',
    width: '5rem',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  deleteButton: {
    position: 'absolute',
    top: '0.25rem',
    right: '0.25rem',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
    marginBottom: '1.25rem',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    }
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  sectionSubtitle: {
    fontSize: '1rem',
    fontWeight: '500',
    marginBottom: '0.75rem',
    marginTop: '1rem'
  },
  boatListContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    }
  },
  boatCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  boatImageContainer: {
    height: '12rem',
    backgroundColor: '#f3f4f6'
  },
  boatImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  boatCardContent: {
    padding: '1rem'
  },
  boatCardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#1f2937'
  },
  boatCardDetails: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem'
  },
  buttonRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '1rem',
    '@media (min-width: 640px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
    }
  },
  currencyInput: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  currencySymbol: {
    position: 'absolute',
    left: '0.75rem',
    fontSize: '0.875rem',
    color: '#6b7280'
  },
  currencyTextInput: {
    width: '100%',
    padding: '0.625rem 0.75rem 0.625rem 1.5rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem'
  },
  placeholderImage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: '#f9fafb',
    color: '#9ca3af'
  },
  nestedInput: {
    marginLeft: '1.5rem',
    marginTop: '0.5rem',
    marginBottom: '1rem'
  },
  formHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1.25rem',
    borderBottom: '1px solid #e5e7eb',
    '@media (min-width: 640px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }
  },
  formContent: {
    padding: '1.25rem'
  },
  formFooter: {
    marginTop: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
    '@media (min-width: 640px)': {
      justifyContent: 'flex-end',
    }
  },
  scrollableTabs: {
    display: 'flex',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    padding: '0 0.25rem',
    marginBottom: '1.5rem',
    scrollbarWidth: 'none', /* Firefox */
    msOverflowStyle: 'none', /* IE and Edge */
    '::-webkit-scrollbar': {
      display: 'none' /* Chrome, Safari, Opera */
    },
    WebkitOverflowScrolling: 'touch'
  },
  tabButton: {
    padding: '0.625rem 1rem',
    margin: '0 0.125rem',
    borderRadius: '6px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
    fontWeight: '500',
    fontSize: '0.875rem',
    color: '#6b7280',
    flex: '0 0 auto'
  },
  activeTabButton: {
    background: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6'
  },
  spinnerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '1.25rem',
    height: '1.25rem',
    marginRight: '0.625rem',
    borderTop: '2px solid #3b82f6',
    borderRight: '2px solid transparent',
    borderBottom: '2px solid #3b82f6',
    borderLeft: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  // Add keyframes animation for spinner
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  }
};

// Create a style injector that handles media queries
const injectStyles = () => {
  // Only inject once
  if (document.getElementById('responsive-boat-styles')) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'responsive-boat-styles';
  
  // Process styles object into CSS with media queries
  let cssText = '';
  
  // Extract keyframes
  if (styles['@keyframes spin']) {
    cssText += `@keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }\n`;
  }
  
  // Add special webkit webkit-scrollbar rule
  cssText += `::-webkit-scrollbar { 
    display: none; 
  }\n`;
  
  
  // Process each style rule
  Object.entries(styles).forEach(([selector, rules]) => {
    if (selector.startsWith('@')) return; // Skip keyframes and media queries for now
    
    cssText += `.${selector} {\n`;
    
    // Add base rules
    Object.entries(rules).forEach(([prop, value]) => {
      if (prop.startsWith('@')) return; // Skip media queries for now
      cssText += `  ${convertCamelToKebab(prop)}: ${value};\n`;
    });
    
    cssText += '}\n';
    
    // Add media queries for this selector
    Object.entries(rules).forEach(([prop, value]) => {
      if (prop.startsWith('@media')) {
        cssText += `${prop} {\n`;
        cssText += `  .${selector} {\n`;
        
        // Add rules for this media query
        Object.entries(value).forEach(([mediaProp, mediaValue]) => {
          cssText += `    ${convertCamelToKebab(mediaProp)}: ${mediaValue};\n`;
        });
        
        cssText += '  }\n';
        cssText += '}\n';
      }
    });
  });
  
  styleElement.textContent = cssText;
  document.head.appendChild(styleElement);
};

// Helper to convert camelCase to kebab-case for CSS properties
const convertCamelToKebab = (camelCase) => {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};

// Apply className helper
const cx = (...classNames) => {
  return classNames.filter(Boolean).join(' ');
};

function Boats() {
  const [boats, setBoats] = useState([]);
  const [isAddingBoat, setIsAddingBoat] = useState(false);
  const [isEditingBoat, setIsEditingBoat] = useState(false);
  const [currentBoat, setCurrentBoat] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [activeTab, setActiveTab] = useState('basic'); // For form navigation
  
  // Inject responsive styles on component mount
  useEffect(() => {
    injectStyles();
  }, []);
  
  // Form data with comprehensive boat details
  const [formData, setFormData] = useState({
    // Basic Information
    name_en: '',
    name_ro: '',
    length: '',
    capacity: '',
    cruisingArea_en: '',
    cruisingArea_ro: '',
    description_en: '',
    description_ro: '',
    
    // Detailed Specifications
    specs: {
      year: '',
      cruisingSpeed: '',
      maxSpeed: '',
      engine: '',
      horsePower: '',
      class: '',
      cabins: '',
      crew: ''
    },
    
    // Standard daily price
    priceDaily: '',
    
    // Monthly prices
    monthlyPrices: {
      may: '',
      june: '',
      july: '',
      august: '',
      september: '',
      october: ''
    },
    
    // Equipment
    equipment: {
      tenders: false,
      tenderCount: '',
      deckJacuzzi: false,
      deckJacuzziCount: '',
      pool: false,
      antiJellyfishPool: false,
      aquapark: false,
      inflatablePlatform: false
    },
    
    // Water Sports
    waterSports: {
      jetSkis: false,
      jetSkiCount: '',
      seabobs: false,
      seabobCount: '',
      paddleboards: false,
      paddleboardCount: '',
      wakeboard: false,
      waterSkis: false,
      snorkelingGear: false,
      fishingGear: false,
      inflatables: false
    },
    
    // Amenities
    amenities: {
      // Entertainment
      wifi: false,
      satelliteTV: false,
      appleTV: false,
      sonos: false,
      indoorCinema: false,
      outdoorCinema: false,
      
      // Comfort
      airConditioning: false,
      heating: false,
      stabilizers: false,
      
      // Deck
      outdoorBar: false,
      outdoorDining: false,
      bbq: false,
      sunpads: false,
      
      // Indoor
      formalDining: false,
      wineStorage: false,
      gym: false,
      spa: false
    },
    
    // Crew & Services
    crew: {
      captain: false,
      chef: false,
      deckhand: false,
      steward: false,
      included_en: '',
      included_ro: ''
    },
    
    // Contact & Booking
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    bookingNotes_en: '',
    bookingNotes_ro: ''
  });
  
  // Photos array
  const [existingPhotos, setExistingPhotos] = useState([]);
  
  // Current UI language
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en';
  });
  
  // Helper function to safely get localized content
  const getLocalizedContent = (obj, lang, fallback = '') => {
    if (!obj) return fallback;
    if (typeof obj === 'string') return obj;
    if (typeof obj !== 'object') return String(obj);
    if (obj[lang]) return obj[lang];
    
    // Try the other language if current one is missing
    const otherLang = lang === 'en' ? 'ro' : 'en';
    if (obj[otherLang]) return obj[otherLang];
    
    return fallback;
  };
  
  useEffect(() => {
    const handleStorageChange = () => {
      const storedLanguage = localStorage.getItem('appLanguage');
      if (storedLanguage && storedLanguage !== language) {
        setLanguage(storedLanguage);
      }
    };
    
    // Listen for storage events (triggered by Settings component)
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [language]);

  // Initialize anonymous auth to fix storage permission issues
  useEffect(() => {
    const initAuth = async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          await signInAnonymously(auth);
          console.log("Signed in anonymously for storage access");
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    
    initAuth();
  }, []);
  
  // Fetch boats on component mount
  useEffect(() => {
    fetchBoats();
  }, []);
  
  // Fetch boats from Firestore
  const fetchBoats = async () => {
    try {
      const boatCollection = collection(db, "boats");
      const boatSnapshot = await getDocs(boatCollection);
      const boatList = boatSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBoats(boatList);
    } catch (error) {
      console.error("Error fetching boats:", error);
    }
  };
  
  // Enhanced input handler that can handle deeply nested objects
  const handleInputChange = (e, section = null, subSection = null) => {
    if (!e || !e.target) return;
    
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    
    if (!name) return;
    
    setFormData(prev => {
      // Handle price fields with number validation
      if (name.includes('price') && type !== 'checkbox') {
        const numericValue = value.replace(/[^0-9.]/g, '');
        if (numericValue.split('.').length > 2) return prev;
        
        // Handle top-level price fields
        if (!section && !subSection) {
          return { ...prev, [name]: numericValue };
        }
      }
      
      // Handle nested objects (two levels)
      if (section && subSection) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [subSection]: {
              ...prev[section][subSection],
              [name]: inputValue
            }
          }
        };
      }
      
      // Handle single-level nesting
      if (section) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [name]: inputValue
          }
        };
      }
      
      // Handle top-level fields
      return {
        ...prev,
        [name]: inputValue
      };
    });
  };
  
  // Toggle a boolean value in a nested object
  const toggleFeature = (section, name) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: !prev[section][name]
      }
    }));
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name_en: '',
      name_ro: '',
      length: '',
      capacity: '',
      cruisingArea_en: '',
      cruisingArea_ro: '',
      description_en: '',
      description_ro: '',
      
      specs: {
        year: '',
        cruisingSpeed: '',
        maxSpeed: '',
        engine: '',
        horsePower: '',
        class: '',
        cabins: '',
        crew: ''
      },
      
      priceDaily: '',
      
      monthlyPrices: {
        may: '',
        june: '',
        july: '',
        august: '',
        september: '',
        october: ''
      },
      
      equipment: {
        tenders: false,
        tenderCount: '',
        deckJacuzzi: false,
        deckJacuzziCount: '',
        pool: false,
        antiJellyfishPool: false,
        aquapark: false,
        inflatablePlatform: false
      },
      
      waterSports: {
        jetSkis: false,
        jetSkiCount: '',
        seabobs: false,
        seabobCount: '',
        paddleboards: false,
        paddleboardCount: '',
        wakeboard: false,
        waterSkis: false,
        snorkelingGear: false,
        fishingGear: false,
        inflatables: false
      },
      
      amenities: {
        wifi: false,
        satelliteTV: false,
        appleTV: false,
        sonos: false,
        indoorCinema: false,
        outdoorCinema: false,
        airConditioning: false,
        heating: false,
        stabilizers: false,
        outdoorBar: false,
        outdoorDining: false,
        bbq: false,
        sunpads: false,
        formalDining: false,
        wineStorage: false,
        gym: false,
        spa: false
      },
      
      crew: {
        captain: false,
        chef: false,
        deckhand: false,
        steward: false,
        included_en: '',
        included_ro: ''
      },
      
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      bookingNotes_en: '',
      bookingNotes_ro: ''
    });
    
    setExistingPhotos([]);
    setPhotoFiles([]);
    setPreviewUrls([]);
    setActiveTab('basic');
  };
  
  // Handle photo file selection
  const handlePhotoChange = (e) => {
    if (!e.target.files) return;
    
    const filesArray = Array.from(e.target.files);
    const currentPhotoCount = existingPhotos.length + photoFiles.length;
    const newTotalCount = currentPhotoCount + filesArray.length;
    
    if (newTotalCount > 24) {
      alert(`You can only upload a maximum of 24 photos.`);
      return;
    }
    
    setPhotoFiles(prev => [...prev, ...filesArray]);
    
    // Create preview URLs
    const newPreviewUrls = filesArray.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };
  
  // Upload photos to Firebase Storage
  const uploadPhotos = async () => {
    if (photoFiles.length === 0) return [];
    
    // Ensure we're authenticated for Firebase Storage
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
        console.log("Signed in anonymously for photo upload");
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
    
    setIsUploading(true);
    const photoUrls = [];
    
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      if (!(file instanceof File)) {
        // Skip if it's a URL string and not a File object
        continue;
      }
      
      const fileName = `boats/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        // Create a promise for this upload
        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              photoUrls.push({
                url: downloadURL,
                path: fileName
              });
              resolve();
            }
          );
        });
      } catch (error) {
        console.error("Error uploading photo:", error);
      }
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    return photoUrls;
  };
  
  // Convert form data to structured format for database
  const prepareFormDataForSave = () => {
    return {
      // Basic company association
      companyId: 'just_enjoy_ibiza',
      companyName: 'Just Enjoy Ibiza',
      
      // Localized fields
      name: {
        en: formData.name_en || '',
        ro: formData.name_ro || ''
      },
      cruisingArea: {
        en: formData.cruisingArea_en || '',
        ro: formData.cruisingArea_ro || ''
      },
      description: {
        en: formData.description_en || '',
        ro: formData.description_ro || ''
      },
      bookingNotes: {
        en: formData.bookingNotes_en || '',
        ro: formData.bookingNotes_ro || ''
      },
      
      // Basic specs
      length: formData.length || '',
      capacity: formData.capacity || '',
      
      // Detailed specs
      specs: formData.specs,
      
      // Pricing
      pricing: {
        daily: formData.priceDaily || '',
        monthly: formData.monthlyPrices
      },
      
      // Features
      equipment: formData.equipment,
      waterSports: formData.waterSports,
      amenities: formData.amenities,
      
      // Crew information
      crew: {
        ...formData.crew,
        included: {
          en: formData.crew.included_en || '',
          ro: formData.crew.included_ro || ''
        }
      },
      
      // Contact info
      contact: {
        name: formData.contactName || '',
        phone: formData.contactPhone || '',
        email: formData.contactEmail || ''
      }
    };
  };
  
  // Handle adding a new boat
  const handleAddBoat = async (e) => {
    e.preventDefault();
    
    try {
      // Upload photos
      const photoUrls = await uploadPhotos();
      
      // Prepare structured data for Firestore
      const boatData = {
        ...prepareFormDataForSave(),
        photos: photoUrls,
        createdAt: new Date()
      };
      
      // Save to Firestore
      const boatCollection = collection(db, "boats");
      await addDoc(boatCollection, boatData);
      
      // Reset form and fetch updated data
      resetForm();
      setIsAddingBoat(false);
      fetchBoats();
    } catch (error) {
      console.error("Error adding boat: ", error);
    }
  };
  
  // Handle updating an existing boat
  const handleUpdateBoat = async (e) => {
    e.preventDefault();
    
    try {
      if (!currentBoat || !currentBoat.id) {
        console.error("No current boat selected for update");
        return;
      }
      
      // Get existing photos as an array
      let updatedPhotos = [...existingPhotos];
      
      // Filter out photo objects that were removed during editing
      const newPhotoUrls = await uploadPhotos();
      
      // Combine existing photos with new ones
      updatedPhotos = [...updatedPhotos, ...newPhotoUrls];
      
      // Prepare structured data for Firestore
      const boatData = {
        ...prepareFormDataForSave(),
        photos: updatedPhotos,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      const boatDoc = doc(db, "boats", currentBoat.id);
      await updateDoc(boatDoc, boatData);
      
      // Reset form and fetch updated data
      resetForm();
      setIsEditingBoat(false);
      setCurrentBoat(null);
      fetchBoats();
    } catch (error) {
      console.error("Error updating boat: ", error);
    }
  };
  
  // Handle boat deletion
  const handleDeleteBoat = async (id) => {
    try {
      // Find the boat to get its photos
      const boatToDelete = boats.find(boat => boat.id === id);
      
      // Delete photos from storage if they exist
      if (boatToDelete.photos && boatToDelete.photos.length > 0) {
        for (const photo of boatToDelete.photos) {
          if (photo.path) {
            try {
              const storageRef = ref(storage, photo.path);
              await deleteObject(storageRef);
            } catch (error) {
              console.error("Error deleting image:", error);
            }
          }
        }
      }
      
      // Delete the boat document
      await deleteDoc(doc(db, "boats", id));
      
      // Refresh boat list
      fetchBoats();
    } catch (error) {
      console.error("Error deleting boat: ", error);
    }
  };
  
  // Handle photo deletion
  const handleDeletePhoto = async (index, isExistingPhoto = false) => {
    if (isExistingPhoto) {
      // This is an existing photo
      const photoToDelete = existingPhotos[index];
      
      // Remove from the array
      setExistingPhotos(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
      
      // Delete from storage if it has a path
      if (photoToDelete?.path) {
        try {
          const storageRef = ref(storage, photoToDelete.path);
          await deleteObject(storageRef);
        } catch (error) {
          console.error("Error deleting image from storage:", error);
        }
      }
    } else {
      // This is a new photo preview
      setPhotoFiles(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
      
      setPreviewUrls(prev => {
        const updated = [...prev];
        URL.revokeObjectURL(updated[index]); // Clean up URL
        updated.splice(index, 1);
        return updated;
      });
    }
  };
  
  // Start editing a boat
  const startEditingBoat = (boat) => {
    setCurrentBoat(boat);
    
    // Extract data to flat form structure
    setFormData({
      name_en: boat.name?.en || '',
      name_ro: boat.name?.ro || '',
      length: boat.length || '',
      capacity: boat.capacity || '',
      cruisingArea_en: boat.cruisingArea?.en || '',
      cruisingArea_ro: boat.cruisingArea?.ro || '',
      description_en: boat.description?.en || '',
      description_ro: boat.description?.ro || '',
      
      // Detailed specs
      specs: {
        year: boat.specs?.year || '',
        cruisingSpeed: boat.specs?.cruisingSpeed || '',
        maxSpeed: boat.specs?.maxSpeed || '',
        engine: boat.specs?.engine || '',
        horsePower: boat.specs?.horsePower || '',
        class: boat.specs?.class || '',
        cabins: boat.specs?.cabins || '',
        crew: boat.specs?.crew || ''
      },
      
      // Pricing
      priceDaily: boat.pricing?.daily || '',
      monthlyPrices: {
        may: boat.pricing?.monthly?.may || '',
        june: boat.pricing?.monthly?.june || '',
        july: boat.pricing?.monthly?.july || '',
        august: boat.pricing?.monthly?.august || '',
        september: boat.pricing?.monthly?.september || '',
        october: boat.pricing?.monthly?.october || '',
      },
      
      // Features are copied directly
      equipment: boat.equipment || {
        tenders: false,
        tenderCount: '',
        deckJacuzzi: false,
        deckJacuzziCount: '',
        pool: false,
        antiJellyfishPool: false,
        aquapark: false,
        inflatablePlatform: false
      },
      waterSports: boat.waterSports || {
        jetSkis: false,
        jetSkiCount: '',
        seabobs: false,
        seabobCount: '',
        paddleboards: false,
        paddleboardCount: '',
        wakeboard: false,
        waterSkis: false,
        snorkelingGear: false,
        fishingGear: false,
        inflatables: false
      },
      amenities: boat.amenities || {
        wifi: false,
        satelliteTV: false,
        appleTV: false,
        sonos: false,
        indoorCinema: false,
        outdoorCinema: false,
        airConditioning: false,
        heating: false,
        stabilizers: false,
        outdoorBar: false,
        outdoorDining: false,
        bbq: false,
        sunpads: false,
        formalDining: false,
        wineStorage: false,
        gym: false,
        spa: false
      },
      
      // Crew information
      crew: {
        captain: boat.crew?.captain || false,
        chef: boat.crew?.chef || false,
        deckhand: boat.crew?.deckhand || false,
        steward: boat.crew?.steward || false,
        included_en: boat.crew?.included?.en || '',
        included_ro: boat.crew?.included?.ro || ''
      },
      
      // Contact info
      contactName: boat.contact?.name || '',
      contactPhone: boat.contact?.phone || '',
      contactEmail: boat.contact?.email || '',
      bookingNotes_en: boat.bookingNotes?.en || '',
      bookingNotes_ro: boat.bookingNotes?.ro || ''
    });
    
    // Set existing photos
    setExistingPhotos(boat.photos || []);
    
    setIsEditingBoat(true);
  };
  
  // Translations
  const translations = {
    en: {
      addBoat: "Add Boat",
      editBoat: "Edit Boat",
      boatName: "Boat Name",
      length: "Length (meters)",
      capacity: "Capacity (people)",
      cruisingArea: "Cruising Area",
      description: "Description",
      price: {
        daily: "Price per Day (€)",
        monthly: "Monthly Prices",
        may: "May Price (€)",
        june: "June Price (€)",
        july: "July Price (€)",
        august: "August Price (€)",
        september: "September Price (€)",
        october: "October Price (€)"
      },
      specs: {
        title: "Specifications",
        year: "Year Built",
        cruisingSpeed: "Cruising Speed (knots)",
        maxSpeed: "Maximum Speed (knots)",
        engine: "Engine",
        horsePower: "Horse Power",
        class: "Class",
        cabins: "Cabins",
        crew: "Crew Members"
      },
      equipment: {
        title: "Equipment",
        tenders: "Tenders",
        tenderCount: "Number of Tenders",
        deckJacuzzi: "Deck Jacuzzi",
        deckJacuzziCount: "Number of Jacuzzis",
        pool: "Swimming Pool",
        antiJellyfishPool: "Anti-Jellyfish Pool",
        aquapark: "Aquapark",
        inflatablePlatform: "Inflatable Platform"
      },
      waterSports: {
        title: "Water Sports Equipment",
        jetSkis: "Jet Skis",
        jetSkiCount: "Number of Jet Skis",
        seabobs: "Seabobs",
        seabobCount: "Number of Seabobs",
        paddleboards: "Paddleboards",
        paddleboardCount: "Number of Paddleboards",
        wakeboard: "Wakeboard",
        waterSkis: "Water Skis",
        snorkelingGear: "Snorkeling Gear",
        fishingGear: "Fishing Gear",
        inflatables: "Inflatables"
      },
      amenities: {
        title: "Amenities",
        entertainment: "Entertainment",
        wifi: "Wi-Fi",
        satelliteTV: "Satellite TV",
        appleTV: "Apple TV",
        sonos: "Sonos Sound System",
        indoorCinema: "Indoor Cinema",
        outdoorCinema: "Outdoor Cinema",
        comfort: "Comfort",
        airConditioning: "Air Conditioning",
        heating: "Heating",
        stabilizers: "Stabilizers",
        deck: "Deck Features",
        outdoorBar: "Outdoor Bar",
        outdoorDining: "Outdoor Dining",
        bbq: "BBQ",
        sunpads: "Sunpads",
        indoor: "Indoor Features",
        formalDining: "Formal Dining",
        wineStorage: "Wine Storage",
        gym: "Gym",
        spa: "Spa"
      },
      crew: {
        title: "Crew",
        captain: "Captain",
        chef: "Chef",
        deckhand: "Deckhand",
        steward: "Steward",
        included: "Crew Included Details"
      },
      contact: {
        title: "Contact & Booking",
        name: "Contact Name",
        phone: "Contact Phone",
        email: "Contact Email",
        bookingNotes: "Booking Notes"
      },
      formTabs: {
        basic: "Basic Info",
        specs: "Specifications",
        pricing: "Pricing",
        features: "Features",
        crew: "Crew",
        contact: "Contact"
      },
      photos: "Photos (Max: 24)",
      noPhotos: "No image",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      uploadingPhotos: "Uploading...",
      boatList: {
        title: "Boat Rentals",
        subtitle: "Boat Listings",
        addNew: "Add New Boat",
        noBoats: "No boats available. Add your first boat to get started!"
      },
      switchLanguage: "Switch to Romanian",
      selectTab: "Select section"
    },
    ro: {
      addBoat: "Adaugă Barcă",
      editBoat: "Editează Barca",
      boatName: "Numele Bărcii",
      length: "Lungime (metri)",
      capacity: "Capacitate (persoane)",
      cruisingArea: "Zonă de Navigație",
      description: "Descriere",
      price: {
        daily: "Preț pe Zi (€)",
        monthly: "Prețuri Lunare",
        may: "Preț Mai (€)",
        june: "Preț Iunie (€)",
        july: "Preț Iulie (€)",
        august: "Preț August (€)",
        september: "Preț Septembrie (€)",
        october: "Preț Octombrie (€)"
      },
      specs: {
        title: "Specificații",
        year: "An Fabricație",
        cruisingSpeed: "Viteză de Croazieră (noduri)",
        maxSpeed: "Viteză Maximă (noduri)",
        engine: "Motor",
        horsePower: "Putere",
        class: "Clasă",
        cabins: "Cabine",
        crew: "Membri Echipaj"
      },
      equipment: {
        title: "Echipament",
        tenders: "Bărci Auxiliare",
        tenderCount: "Număr de Bărci Auxiliare",
        deckJacuzzi: "Jacuzzi pe Punte",
        deckJacuzziCount: "Număr de Jacuzzi",
        pool: "Piscină",
        antiJellyfishPool: "Piscină Anti-Meduze",
        aquapark: "Aquapark",
        inflatablePlatform: "Platformă Gonflabilă"
      },
      waterSports: {
        title: "Echipament pentru Sporturi Nautice",
        jetSkis: "Jet Ski",
        jetSkiCount: "Număr de Jet Ski",
        seabobs: "Seabob",
        seabobCount: "Număr de Seabob",
        paddleboards: "Paddleboard",
        paddleboardCount: "Număr de Paddleboard",
        wakeboard: "Wakeboard",
        waterSkis: "Schiuri Nautice",
        snorkelingGear: "Echipament Snorkeling",
        fishingGear: "Echipament Pescuit",
        inflatables: "Gonflabile"
      },
      amenities: {
        title: "Facilități",
        entertainment: "Divertisment",
        wifi: "Wi-Fi",
        satelliteTV: "TV prin Satelit",
        appleTV: "Apple TV",
        sonos: "Sistem Audio Sonos",
        indoorCinema: "Cinema Interior",
        outdoorCinema: "Cinema Exterior",
        comfort: "Confort",
        airConditioning: "Aer Condiționat",
        heating: "Încălzire",
        stabilizers: "Stabilizatori",
        deck: "Facilități Punte",
        outdoorBar: "Bar Exterior",
        outdoorDining: "Dining Exterior",
        bbq: "Grătar",
        sunpads: "Perne pentru Soare",
        indoor: "Facilități Interioare",
        formalDining: "Dining Formal",
        wineStorage: "Depozitare Vin",
        gym: "Sală Fitness",
        spa: "Spa"
      },
      crew: {
        title: "Echipaj",
        captain: "Căpitan",
        chef: "Bucătar",
        deckhand: "Marinar",
        steward: "Steward",
        included: "Detalii Echipaj Inclus"
      },
      contact: {
        title: "Contact și Rezervări",
        name: "Nume Contact",
        phone: "Telefon Contact",
        email: "Email Contact",
        bookingNotes: "Note Rezervare"
      },
      formTabs: {
        basic: "Informații Bază",
        specs: "Specificații",
        pricing: "Prețuri",
        features: "Facilități",
        crew: "Echipaj",
        contact: "Contact"
      },
      photos: "Fotografii (Max: 24)",
      noPhotos: "Fără imagine",
      cancel: "Anulează",
      save: "Salvează",
      delete: "Șterge",
      edit: "Editează",
      uploadingPhotos: "Se încarcă...",
      boatList: {
        title: "Închirieri Bărci",
        subtitle: "Lista Bărcilor",
        addNew: "Adaugă Barcă Nouă",
        noBoats: "Nu există bărci disponibile. Adaugă prima barcă pentru a începe!"
      },
      switchLanguage: "Schimbă în Engleză",
      selectTab: "Selectează secțiunea"
    }
  };
  
  const t = translations[language];
  
  // Tab navigation system for the form
  const renderFormTab = () => {
    switch(activeTab) {
      case 'basic':
        return (
          <div>
            <div className="formSection">
              <label className="formLabel">
                {t.boatName}
              </label>
              <input
                type="text"
                name={`name_${language}`}
                value={formData[`name_${language}`] || ''}
                onChange={handleInputChange}
                required
                className="input"
              />
            </div>
            
            <div className="twoColumnGrid">
              <div>
                <label className="formLabel">
                  {t.length}
                </label>
                <input
                  type="number"
                  name="length"
                  value={formData.length || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className="input"
                />
              </div>
              
              <div>
                <label className="formLabel">
                  {t.capacity}
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity || ''}
                  onChange={handleInputChange}
                  min="0"
                  className="input"
                />
              </div>
            </div>
            
            <div className="formSection">
              <label className="formLabel">
                {t.cruisingArea}
              </label>
              <input
                type="text"
                name={`cruisingArea_${language}`}
                value={formData[`cruisingArea_${language}`] || ''}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            
            <div className="formSection">
              <label className="formLabel">
                {t.description}
              </label>
              <textarea
                name={`description_${language}`}
                value={formData[`description_${language}`] || ''}
                onChange={handleInputChange}
                rows="4"
                className="textarea"
              />
            </div>
            
            <div className="formSection">
              <label className="formLabel">
                {t.photos}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="fileInput"
              />
              
              {/* Photo previews */}
              <div className="photosContainer">
                {/* Existing photos */}
                {existingPhotos.map((photo, index) => (
                  <div key={`existing-${index}`} className="photoPreview">
                    <img 
                      src={photo.url} 
                      alt={`Photo ${index}`}
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(index, true)}
                      className="deleteButton"
                      aria-label="Delete photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {/* New photo previews */}
                {previewUrls.map((url, index) => (
                  <div key={`preview-${index}`} className="photoPreview">
                    <img 
                      src={url} 
                      alt={`Preview ${index}`}
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(index, false)}
                      className="deleteButton"
                      aria-label="Delete photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'specs':
        return (
          <div>
            <h3 className="sectionTitle">{t.specs.title}</h3>
            <div className="twoColumnGrid">
              <div>
                <label className="formLabel">
                  {t.specs.year}
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.specs.year || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  min="1900"
                  max={new Date().getFullYear()}
                  className="input"
                />
              </div>
              
              <div>
                <label className="formLabel">
                  {t.specs.class}
                </label>
                <input
                  type="text"
                  name="class"
                  value={formData.specs.class || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  className="input"
                />
              </div>
              
              <div>
                <label className="formLabel">
                  {t.specs.cruisingSpeed}
                </label>
                <input
                  type="number"
                  name="cruisingSpeed"
                  value={formData.specs.cruisingSpeed || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  min="0"
                  className="input"
                />
              </div>
              
              <div>
                <label className="formLabel">
                  {t.specs.maxSpeed}
                </label>
                <input
                  type="number"
                  name="maxSpeed"
                  value={formData.specs.maxSpeed || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  min="0"
                  className="input"
                />
              </div>
              
              <div>
                <label className="formLabel">
                  {t.specs.engine}
                </label>
                <input
                  type="text"
                  name="engine"
                  value={formData.specs.engine || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  className="input"
                />
              </div>
              
              <div>
                <label className="formLabel">
                  {t.specs.horsePower}
                </label>
                <input
                  type="text"
                  name="horsePower"
                  value={formData.specs.horsePower || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  className="input"
                />
              </div>
              
              <div>
                <label className="formLabel">
                  {t.specs.cabins}
                </label>
                <input
                  type="text"
                  name="cabins"
                  value={formData.specs.cabins || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  className="input"
                />
              </div>
              
              <div>
                <label className="formLabel">
                  {t.specs.crew}
                </label>
                <input
                  type="text"
                  name="crew"
                  value={formData.specs.crew || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  className="input"
                />
              </div>
            </div>
          </div>
        );
        
      case 'pricing':
        return (
          <div>
            <h3 className="sectionTitle">{language === 'en' ? 'Pricing' : 'Prețuri'}</h3>
            
            <div style={{marginBottom: '1.25rem'}}>
              <label className="formLabel">
                {t.price.daily}
              </label>
              <div className="currencyInput">
                <span className="currencySymbol">
                  €
                </span>
                <input
                  type="text"
                  name="priceDaily"
                  value={formData.priceDaily || ''}
                  onChange={handleInputChange}
                  className="currencyTextInput"
                />
              </div>
            </div>
            
            <h4 className="sectionSubtitle">
              {t.price.monthly}
            </h4>
            
            <div className="twoColumnGrid">
              <div>
                <label className="formLabel">
                  {t.price.may}
                </label>
                <div className="currencyInput">
                  <span className="currencySymbol">
                    €
                  </span>
                  <input
                    type="text"
                    name="may"
                    value={formData.monthlyPrices.may || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    className="currencyTextInput"
                  />
                </div>
              </div>
              
              <div>
                <label className="formLabel">
                  {t.price.june}
                </label>
                <div className="currencyInput">
                  <span className="currencySymbol">
                    €
                  </span>
                  <input
                    type="text"
                    name="june"
                    value={formData.monthlyPrices.june || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    className="currencyTextInput"
                  />
                </div>
              </div>
              
              <div>
                <label className="formLabel">
                  {t.price.july}
                </label>
                <div className="currencyInput">
                  <span className="currencySymbol">
                    €
                  </span>
                  <input
                    type="text"
                    name="july"
                    value={formData.monthlyPrices.july || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    className="currencyTextInput"
                  />
                </div>
              </div>
              
              <div>
                <label className="formLabel">
                  {t.price.august}
                </label>
                <div className="currencyInput">
                  <span className="currencySymbol">
                    €
                  </span>
                  <input
                    type="text"
                    name="august"
                    value={formData.monthlyPrices.august || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    className="currencyTextInput"
                  />
                </div>
              </div>
              
              <div>
                <label className="formLabel">
                  {t.price.september}
                </label>
                <div className="currencyInput">
                  <span className="currencySymbol">
                    €
                  </span>
                  <input
                    type="text"
                    name="september"
                    value={formData.monthlyPrices.september || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    className="currencyTextInput"
                  />
                </div>
              </div>
              
              <div>
                <label className="formLabel">
                  {t.price.october}
                </label>
                <div className="currencyInput">
                  <span className="currencySymbol">
                    €
                  </span>
                  <input
                    type="text"
                    name="october"
                    value={formData.monthlyPrices.october || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    className="currencyTextInput"
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'features':
        return (
          <div>
            {/* Equipment Section */}
            <div style={{marginBottom: '1.875rem'}}>
              <h3 className="sectionTitle">{t.equipment.title}</h3>
              <div className="twoColumnGrid">
                {/* Left Column */}
                <div>
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="tenders"
                      checked={formData.equipment.tenders || false}
                      onChange={() => toggleFeature('equipment', 'tenders')}
                      className="checkbox"
                    />
                    <label htmlFor="tenders">
                      {t.equipment.tenders}
                    </label>
                  </div>
                  
                  {formData.equipment.tenders && (
                    <div className="nestedInput">
                      <label className="formLabel">
                        {t.equipment.tenderCount}
                      </label>
                      <input
                        type="number"
                        name="tenderCount"
                        value={formData.equipment.tenderCount || ''}
                        onChange={(e) => handleInputChange(e, 'equipment')}
                        min="0"
                        className="input"
                      />
                    </div>
                  )}
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="deckJacuzzi"
                      checked={formData.equipment.deckJacuzzi || false}
                      onChange={() => toggleFeature('equipment', 'deckJacuzzi')}
                      className="checkbox"
                    />
                    <label htmlFor="deckJacuzzi">
                      {t.equipment.deckJacuzzi}
                    </label>
                  </div>
                  
                  {formData.equipment.deckJacuzzi && (
                    <div className="nestedInput">
                      <label className="formLabel">
                        {t.equipment.deckJacuzziCount}
                      </label>
                      <input
                        type="number"
                        name="deckJacuzziCount"
                        value={formData.equipment.deckJacuzziCount || ''}
                        onChange={(e) => handleInputChange(e, 'equipment')}
                        min="0"
                        className="input"
                      />
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div>
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="pool"
                      checked={formData.equipment.pool || false}
                      onChange={() => toggleFeature('equipment', 'pool')}
                      className="checkbox"
                    />
                    <label htmlFor="pool">
                      {t.equipment.pool}
                    </label>
                  </div>
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="antiJellyfishPool"
                      checked={formData.equipment.antiJellyfishPool || false}
                      onChange={() => toggleFeature('equipment', 'antiJellyfishPool')}
                      className="checkbox"
                    />
                    <label htmlFor="antiJellyfishPool">
                      {t.equipment.antiJellyfishPool}
                    </label>
                  </div>
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="aquapark"
                      checked={formData.equipment.aquapark || false}
                      onChange={() => toggleFeature('equipment', 'aquapark')}
                      className="checkbox"
                    />
                    <label htmlFor="aquapark">
                      {t.equipment.aquapark}
                    </label>
                  </div>
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="inflatablePlatform"
                      checked={formData.equipment.inflatablePlatform || false}
                      onChange={() => toggleFeature('equipment', 'inflatablePlatform')}
                      className="checkbox"
                    />
                    <label htmlFor="inflatablePlatform">
                      {t.equipment.inflatablePlatform}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Water Sports */}
            <div style={{marginBottom: '1.875rem'}}>
              <h3 className="sectionTitle">{t.waterSports.title}</h3>
              <div className="twoColumnGrid">
                {/* Left Column */}
                <div>
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="jetSkis"
                      checked={formData.waterSports.jetSkis || false}
                      onChange={() => toggleFeature('waterSports', 'jetSkis')}
                      className="checkbox"
                    />
                    <label htmlFor="jetSkis">
                      {t.waterSports.jetSkis}
                    </label>
                  </div>
                  
                  {formData.waterSports.jetSkis && (
                    <div className="nestedInput">
                      <label className="formLabel">
                        {t.waterSports.jetSkiCount}
                      </label>
                      <input
                        type="number"
                        name="jetSkiCount"
                        value={formData.waterSports.jetSkiCount || ''}
                        onChange={(e) => handleInputChange(e, 'waterSports')}
                        min="0"
                        className="input"
                      />
                    </div>
                  )}
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="seabobs"
                      checked={formData.waterSports.seabobs || false}
                      onChange={() => toggleFeature('waterSports', 'seabobs')}
                      className="checkbox"
                    />
                    <label htmlFor="seabobs">
                      {t.waterSports.seabobs}
                    </label>
                  </div>
                  
                  {formData.waterSports.seabobs && (
                    <div className="nestedInput">
                      <label className="formLabel">
                        {t.waterSports.seabobCount}
                      </label>
                      <input
                        type="number"
                        name="seabobCount"
                        value={formData.waterSports.seabobCount || ''}
                        onChange={(e) => handleInputChange(e, 'waterSports')}
                        min="0"
                        className="input"
                      />
                    </div>
                  )}
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="paddleboards"
                      checked={formData.waterSports.paddleboards || false}
                      onChange={() => toggleFeature('waterSports', 'paddleboards')}
                      className="checkbox"
                    />
                    <label htmlFor="paddleboards">
                      {t.waterSports.paddleboards}
                    </label>
                  </div>
                  
                  {formData.waterSports.paddleboards && (
                    <div className="nestedInput">
                      <label className="formLabel">
                        {t.waterSports.paddleboardCount}
                      </label>
                      <input
                        type="number"
                        name="paddleboardCount"
                        value={formData.waterSports.paddleboardCount || ''}
                        onChange={(e) => handleInputChange(e, 'waterSports')}
                        min="0"
                        className="input"
                      />
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div>
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="wakeboard"
                      checked={formData.waterSports.wakeboard || false}
                      onChange={() => toggleFeature('waterSports', 'wakeboard')}
                      className="checkbox"
                    />
                    <label htmlFor="wakeboard">
                      {t.waterSports.wakeboard}
                    </label>
                  </div>
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="waterSkis"
                      checked={formData.waterSports.waterSkis || false}
                      onChange={() => toggleFeature('waterSports', 'waterSkis')}
                      className="checkbox"
                    />
                    <label htmlFor="waterSkis">
                      {t.waterSports.waterSkis}
                    </label>
                  </div>
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="snorkelingGear"
                      checked={formData.waterSports.snorkelingGear || false}
                      onChange={() => toggleFeature('waterSports', 'snorkelingGear')}
                      className="checkbox"
                    />
                    <label htmlFor="snorkelingGear">
                      {t.waterSports.snorkelingGear}
                    </label>
                  </div>
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="fishingGear"
                      checked={formData.waterSports.fishingGear || false}
                      onChange={() => toggleFeature('waterSports', 'fishingGear')}
                      className="checkbox"
                    />
                    <label htmlFor="fishingGear">
                      {t.waterSports.fishingGear}
                    </label>
                  </div>
                  
                  <div className="checkboxLabel">
                    <input
                      type="checkbox"
                      id="inflatables"
                      checked={formData.waterSports.inflatables || false}
                      onChange={() => toggleFeature('waterSports', 'inflatables')}
                      className="checkbox"
                    />
                    <label htmlFor="inflatables">
                      {t.waterSports.inflatables}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Amenities */}
            <div style={{marginBottom: '1.875rem'}}>
              <h3 className="sectionTitle">{t.amenities.title}</h3>
              
              {/* Entertainment */}
              <h4 className="sectionSubtitle">{t.amenities.entertainment}</h4>
              <div className="twoColumnGrid">
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="wifi"
                    checked={formData.amenities.wifi || false}
                    onChange={() => toggleFeature('amenities', 'wifi')}
                    className="checkbox"
                  />
                  <label htmlFor="wifi">
                    {t.amenities.wifi}
                  </label>
                </div>
                
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="satelliteTV"
                    checked={formData.amenities.satelliteTV || false}
                    onChange={() => toggleFeature('amenities', 'satelliteTV')}
                    className="checkbox"
                  />
                  <label htmlFor="satelliteTV">
                    {t.amenities.satelliteTV}
                  </label>
                </div>
                
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="appleTV"
                    checked={formData.amenities.appleTV || false}
                    onChange={() => toggleFeature('amenities', 'appleTV')}
                    className="checkbox"
                  />
                  <label htmlFor="appleTV">
                    {t.amenities.appleTV}
                  </label>
                </div>
                
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="sonos"
                    checked={formData.amenities.sonos || false}
                    onChange={() => toggleFeature('amenities', 'sonos')}
                    className="checkbox"
                  />
                  <label htmlFor="sonos">
                    {t.amenities.sonos}
                  </label>
                </div>
                
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="indoorCinema"
                    checked={formData.amenities.indoorCinema || false}
                    onChange={() => toggleFeature('amenities', 'indoorCinema')}
                    className="checkbox"
                  />
                  <label htmlFor="indoorCinema">
                    {t.amenities.indoorCinema}
                  </label>
                </div>
                
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="outdoorCinema"
                    checked={formData.amenities.outdoorCinema || false}
                    onChange={() => toggleFeature('amenities', 'outdoorCinema')}
                    className="checkbox"
                  />
                  <label htmlFor="outdoorCinema">
                    {t.amenities.outdoorCinema}
                  </label>
                </div>
              </div>
              
              {/* Comfort & Deck */}
              <div className="twoColumnGrid">
                <div>
                  <h4 className="sectionSubtitle">{t.amenities.comfort}</h4>
                  <div>
                    <div className="checkboxLabel">
                      <input
                        type="checkbox"
                        id="airConditioning"
                        checked={formData.amenities.airConditioning || false}
                        onChange={() => toggleFeature('amenities', 'airConditioning')}
                        className="checkbox"
                      />
                      <label htmlFor="airConditioning">
                        {t.amenities.airConditioning}
                      </label>
                    </div>
                    
                    <div className="checkboxLabel">
                      <input
                        type="checkbox"
                        id="heating"
                        checked={formData.amenities.heating || false}
                        onChange={() => toggleFeature('amenities', 'heating')}
                        className="checkbox"
                      />
                      <label htmlFor="heating">
                        {t.amenities.heating}
                      </label>
                    </div>
                    
                    <div className="checkboxLabel">
                      <input
                        type="checkbox"
                        id="stabilizers"
                        checked={formData.amenities.stabilizers || false}
                        onChange={() => toggleFeature('amenities', 'stabilizers')}
                        className="checkbox"
                      />
                      <label htmlFor="stabilizers">
                        {t.amenities.stabilizers}
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="sectionSubtitle">{t.amenities.deck}</h4>
                  <div>
                    <div className="checkboxLabel">
                      <input
                        type="checkbox"
                        id="outdoorBar"
                        checked={formData.amenities.outdoorBar || false}
                        onChange={() => toggleFeature('amenities', 'outdoorBar')}
                        className="checkbox"
                      />
                      <label htmlFor="outdoorBar">
                        {t.amenities.outdoorBar}
                      </label>
                    </div>
                    
                    <div className="checkboxLabel">
                      <input
                        type="checkbox"
                        id="outdoorDining"
                        checked={formData.amenities.outdoorDining || false}
                        onChange={() => toggleFeature('amenities', 'outdoorDining')}
                        className="checkbox"
                      />
                      <label htmlFor="outdoorDining">
                        {t.amenities.outdoorDining}
                      </label>
                    </div>
                    
                    <div className="checkboxLabel">
                      <input
                        type="checkbox"
                        id="bbq"
                        checked={formData.amenities.bbq || false}
                        onChange={() => toggleFeature('amenities', 'bbq')}
                        className="checkbox"
                      />
                      <label htmlFor="bbq">
                        {t.amenities.bbq}
                      </label>
                    </div>
                    
                    <div className="checkboxLabel">
                      <input
                        type="checkbox"
                        id="sunpads"
                        checked={formData.amenities.sunpads || false}
                        onChange={() => toggleFeature('amenities', 'sunpads')}
                        className="checkbox"
                      />
                      <label htmlFor="sunpads">
                        {t.amenities.sunpads}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Indoor */}
              <h4 className="sectionSubtitle">{t.amenities.indoor}</h4>
              <div className="twoColumnGrid">
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="formalDining"
                    checked={formData.amenities.formalDining || false}
                    onChange={() => toggleFeature('amenities', 'formalDining')}
                    className="checkbox"
                  />
                  <label htmlFor="formalDining">
                    {t.amenities.formalDining}
                  </label>
                </div>
                
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="wineStorage"
                    checked={formData.amenities.wineStorage || false}
                    onChange={() => toggleFeature('amenities', 'wineStorage')}
                    className="checkbox"
                  />
                  <label htmlFor="wineStorage">
                    {t.amenities.wineStorage}
                  </label>
                </div>
                
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="gym"
                    checked={formData.amenities.gym || false}
                    onChange={() => toggleFeature('amenities', 'gym')}
                    className="checkbox"
                  />
                  <label htmlFor="gym">
                    {t.amenities.gym}
                  </label>
                </div>
                
                <div className="checkboxLabel">
                  <input
                    type="checkbox"
                    id="spa"
                    checked={formData.amenities.spa || false}
                    onChange={() => toggleFeature('amenities', 'spa')}
                    className="checkbox"
                  />
                  <label htmlFor="spa">
                    {t.amenities.spa}
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'crew':
        return (
          <div>
            <h3 className="sectionTitle">{t.crew.title}</h3>
            
            <div className="twoColumnGrid">
              <div className="checkboxLabel">
                <input
                  type="checkbox"
                  id="captain"
                  checked={formData.crew.captain || false}
                  onChange={() => toggleFeature('crew', 'captain')}
                  className="checkbox"
                />
                <label htmlFor="captain">
                  {t.crew.captain}
                </label>
              </div>
              
              <div className="checkboxLabel">
                <input
                  type="checkbox"
                  id="chef"
                  checked={formData.crew.chef || false}
                  onChange={() => toggleFeature('crew', 'chef')}
                  className="checkbox"
                />
                <label htmlFor="chef">
                  {t.crew.chef}
                </label>
              </div>
              
              <div className="checkboxLabel">
                <input
                  type="checkbox"
                  id="deckhand"
                  checked={formData.crew.deckhand || false}
                  onChange={() => toggleFeature('crew', 'deckhand')}
                  className="checkbox"
                />
                <label htmlFor="deckhand">
                  {t.crew.deckhand}
                </label>
              </div>
              
              <div className="checkboxLabel">
                <input
                  type="checkbox"
                  id="steward"
                  checked={formData.crew.steward || false}
                  onChange={() => toggleFeature('crew', 'steward')}
                  className="checkbox"
                />
                <label htmlFor="steward">
                  {t.crew.steward}
                </label>
              </div>
            </div>
            
            <div className="formSection">
              <label className="formLabel">
                {t.crew.included}
              </label>
              <textarea
                name={`included_${language}`}
                value={formData.crew[`included_${language}`] || ''}
                onChange={(e) => handleInputChange(e, 'crew')}
                rows="4"
                className="textarea"
              />
            </div>
          </div>
        );
      
      case 'contact':
        return (
          <div>
            <h3 className="sectionTitle">{t.contact.title}</h3>
            
            <div className="formSection">
              <label className="formLabel">
                {t.contact.name}
              </label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName || ''}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            
            <div className="formSection">
              <label className="formLabel">
                {t.contact.phone}
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone || ''}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            
            <div className="formSection">
              <label className="formLabel">
                {t.contact.email}
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail || ''}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            
            <div className="formSection">
              <label className="formLabel">
                {t.contact.bookingNotes}
              </label>
              <textarea
                name={`bookingNotes_${language}`}
                value={formData[`bookingNotes_${language}`] || ''}
                onChange={handleInputChange}
                rows="4"
                className="textarea"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="container">
      <div className="header">
        <h1 className="title">{t.boatList.title}</h1>
      </div>
      
      {/* Add/Edit Forms */}
      {(isAddingBoat || isEditingBoat) && (
        <div className="card">
          <div className="formHeader">
            <h2 className="subtitle">
              {isAddingBoat ? t.addBoat : t.editBoat}
            </h2>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAddingBoat(false);
                setIsEditingBoat(false);
                setCurrentBoat(null);
              }}
              className="buttonSecondary"
            >
              {t.cancel}
            </button>
          </div>
          
          {/* Mobile Tab Dropdown */}
          <div className="formContent">
            <select
              className="mobileTabs"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              aria-label={t.selectTab}
            >
              {Object.entries(t.formTabs).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            
            {/* Desktop Tabs */}
            <div className="desktopTabs tabContainer">
              {Object.entries(t.formTabs).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cx(
                    'tab',
                    activeTab === key ? 'activeTab' : 'inactiveTab'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* Form content based on active tab */}
            <form onSubmit={isAddingBoat ? handleAddBoat : handleUpdateBoat}>
              {renderFormTab()}
              
              {/* Submit button */}
              <div className="formFooter">
                {isUploading ? (
                  <div className="spinnerContainer">
                    <div className="spinner"></div>
                    <span>{t.uploadingPhotos} {Math.round(uploadProgress)}%</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="buttonPrimary"
                  >
                    {t.save}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Boat List */}
      {!isAddingBoat && !isEditingBoat && (
        <div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            '@media (min-width: 640px)': {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }
          }}>
            <h2 className="subtitle">{t.boatList.subtitle}</h2>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAddingBoat(true);
              }}
              className="buttonPrimary"
            >
              {t.boatList.addNew}
            </button>
          </div>
          
          {boats.length === 0 ? (
            <div style={{textAlign: 'center', padding: '2.5rem 1rem', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'}}>
              <p style={{color: '#6b7280'}}>{t.boatList.noBoats}</p>
            </div>
          ) : (
            <div className="boatListContainer">
              {boats.map((boat) => (
                <div key={boat.id} className="boatCard">
                  {/* Boat image or placeholder */}
                  <div className="boatImageContainer">
                    {boat.photos && boat.photos.length > 0 ? (
                      <img
                        src={boat.photos[0].url}
                        alt={getLocalizedContent(boat.name, language, t.noPhotos)}
                        className="boatImage"
                      />
                    ) : (
                      <div className="placeholderImage">
                        {t.noPhotos}
                      </div>
                    )}
                  </div>
                  
                  {/* Boat details */}
                  <div className="boatCardContent">
                    <h3 className="boatCardTitle">
                      {getLocalizedContent(boat.name, language)}
                    </h3>
                    
                    <div className="boatCardDetails">
                      <p style={{marginBottom: '0.25rem'}}>
                        {boat.length ? `${boat.length}m • ` : ''}
                        {boat.capacity ? `${boat.capacity} ${language === 'en' ? 'people' : 'persoane'}` : ''}
                      </p>
                      <p>{getLocalizedContent(boat.cruisingArea, language)}</p>
                    </div>
                    
                    <div className="buttonRow">
                      <button
                        type="button"
                        onClick={() => startEditingBoat(boat)}
                        className="buttonSecondary"
                      >
                        {t.edit}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(language === 'en' ? 'Are you sure you want to delete this boat?' : 'Ești sigur că vrei să ștergi această barcă?')) {
                            handleDeleteBoat(boat.id);
                          }
                        }}
                        className="buttonDanger"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Boats;