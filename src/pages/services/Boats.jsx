// Boats component with updated pricing structure - inline styles
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db, storage } from '../../firebase/config';
import { useDatabase } from '../../context/DatabaseContext';

// Normalize media items to support both images and PDFs
const normalizeMediaItem = (item) => {
  if (!item) return null;
  if (typeof item === 'string') {
    return { url: item, type: 'image', name: '' };
  }
  const inferredType = item.type || (item.url && item.url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
  return {
    name: item.name || item.originalName || '',
    ...item,
    type: inferredType
  };
};

// Helper to safely read a boat photo URL (supports string or { url }) and skips PDFs
const getBoatPhotoUrl = (boat) => {
  const photos = boat?.photos || [];
  for (const item of photos) {
    const media = normalizeMediaItem(item);
    if (media?.url && media.type !== 'pdf') return media.url;
  }
  return null;
};

const getBoatDocuments = (boat) => {
  const mediaDocs = (boat?.photos || []).map(normalizeMediaItem).filter(item => item?.type === 'pdf');
  const explicitDocs = (boat?.documents || []).map(normalizeMediaItem).filter(item => item?.type === 'pdf');
  return [...mediaDocs, ...explicitDocs];
};

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
    color: '#111827'
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
    gap: '1.25rem',
    marginTop: '1.25rem',
    justifyItems: 'stretch',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
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
    backgroundColor: '#4F46E5',
    color: 'white',
    fontWeight: '500',
    padding: '0.625rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    minHeight: '2.5rem',
    width: 'auto',
    '@media (max-width: 639px)': {
      width: '100%'
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
  buttonIcon: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    width: '44px',
    height: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    cursor: 'pointer'
  },
  buttonIconDanger: {
    backgroundColor: '#fff1f2',
    color: '#b91c1c',
    border: '1px solid #fecdd3',
    borderRadius: '8px',
    width: '44px',
    height: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    cursor: 'pointer'
  },
  buttonDanger: {
    backgroundColor: '#fee2e2',
    color: '#ef4444',
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
    borderBottom: '2px solid #4F46E5',
    color: '#4F46E5'
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
  // IMPROVED BOAT CARDS - More compact and responsive
  boatListContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
    width: '100%',
    margin: '0 auto',
    justifyItems: 'stretch'
  },
  boatCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 5px 14px rgba(15, 23, 42, 0.08)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    border: '1px solid #e5e7eb',
    width: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  boatImageContainer: {
    height: '180px',
    backgroundColor: '#f3f4f6'
  },
  boatImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  boatCardContent: {
    padding: '0.875rem 1rem 1.25rem',
    flex: 1
  },
  boatCardTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
    color: '#1f2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  boatCardDetails: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginBottom: '0.5rem'
  },
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
    paddingTop: '0.75rem',
    paddingBottom: '1.5rem',
    borderTop: '1px solid #e5e7eb',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  compactButton: {
    fontSize: '1rem',
    fontWeight: '600',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    border: '1px solid #d8dee9',
    background: '#fff',
    color: '#111827',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
    transition: 'all 0.18s ease',
    flex: 1
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
  // Search and filter styles
  searchContainer: {
    marginBottom: '1rem'
  },
  searchInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '0.75rem 1rem 0.75rem 2.5rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  searchInputWrapper: {
    position: 'relative',
    maxWidth: '400px'
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
    pointerEvents: 'none'
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    backgroundColor: 'white',
    color: '#6b7280',
    fontWeight: '500',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  filterButtonActive: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderColor: '#d1d5db'
  },
  controlsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem',
    '@media (min-width: 768px)': {
      flexDirection: 'row',
      alignItems: 'flex-start',
    }
  },
  resultsInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: '#f9fafb',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb'
  },
  clearButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '0.375rem 0.75rem',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
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

// Minimal inline icon set (stroke-only, neutral)
const Icon = ({ name, size = 16, color = '#6b7280' }) => {
  const common = { width: size, height: size, fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'length':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M4 7v10m16-10v10M8 7v4m4-4v4m0 2v4m4-4v4" />
        </svg>
      );
    case 'people':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M8 11a3 3 0 110-6 3 3 0 010 6zm8 0a3 3 0 110-6 3 3 0 010 6zM4 20v-1a4 4 0 014-4h0M16 15h0a4 4 0 014 4v1" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M7 4v2m10-2v2M5 8h14M6 5h12a1 1 0 011 1v14H5V6a1 1 0 011-1z" />
        </svg>
      );
    case 'engine':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M5 9l2-2h6l2 2v6l-2 2H7l-2-2V9z" />
          <path d="M9 9v6m6-3h2m-12 0h2" />
        </svg>
      );
    case 'hp':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M6 12h12M12 6v12" />
        </svg>
      );
    case 'pricing':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M7 7h10v10H7z" />
          <path d="M9 10h6m-6 4h6" />
        </svg>
      );
    case 'amenities':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM6 17l1 3m10-3l-1 3" />
        </svg>
      );
    case 'description':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M7 4h7l3 3v13H7z" />
          <path d="M10 12h4m-4 3h4m-4-6h2" />
        </svg>
      );
    default:
      return null;
  }
};

function Boats() {
  // Get company context
  const { companyInfo } = useDatabase();
  const userCompanyId = companyInfo?.id;

  const [boats, setBoats] = useState([]);
  const [isAddingBoat, setIsAddingBoat] = useState(false);
  const [isEditingBoat, setIsEditingBoat] = useState(false);
  const [currentBoat, setCurrentBoat] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('basic'); // For form navigation
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [selectedBoatPhotoIndex, setSelectedBoatPhotoIndex] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lengthFilter, setLengthFilter] = useState({ min: '', max: '' });
  const [capacityFilter, setCapacityFilter] = useState({ min: '', max: '' });
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });

  // Helper function to get price range from monthly prices
  const getPriceRange = (monthlyPrices) => {
    if (!monthlyPrices) return null;

    const prices = Object.values(monthlyPrices)
      .map(p => parseFloat(p))
      .filter(p => !isNaN(p) && p > 0);

    if (prices.length === 0) return null;

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return { min, max, average: prices.reduce((a, b) => a + b, 0) / prices.length };
  };
  
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

    // Monthly prices (day price is the monthly price for that specific month)
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
  
  // Enhanced filtering logic for boats
  const getFilteredBoats = () => {
    return boats.filter(boat => {
      // Search term filter (name and cruising area)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = getLocalizedContent(boat.name, language, '').toLowerCase().includes(searchLower);
        const areaMatch = getLocalizedContent(boat.cruisingArea, language, '').toLowerCase().includes(searchLower);
        
        if (!nameMatch && !areaMatch) {
          return false;
        }
      }

      // Length filter
      if (lengthFilter.min || lengthFilter.max) {
        const boatLength = parseFloat(boat.length) || 0;
        
        if (lengthFilter.min && boatLength < parseFloat(lengthFilter.min)) {
          return false;
        }
        
        if (lengthFilter.max && boatLength > parseFloat(lengthFilter.max)) {
          return false;
        }
      }

      // Capacity filter
      if (capacityFilter.min || capacityFilter.max) {
        const boatCapacity = parseInt(boat.capacity) || 0;
        
        if (capacityFilter.min && boatCapacity < parseInt(capacityFilter.min)) {
          return false;
        }
        
        if (capacityFilter.max && boatCapacity > parseInt(capacityFilter.max)) {
          return false;
        }
      }

      // Price filter (use average of monthly prices)
      if (priceFilter.min || priceFilter.max) {
        const priceRange = getPriceRange(boat.pricing?.monthly);
        const boatPrice = priceRange ? priceRange.average : 0;

        if (priceFilter.min && boatPrice < parseFloat(priceFilter.min)) {
          return false;
        }

        if (priceFilter.max && boatPrice > parseFloat(priceFilter.max)) {
          return false;
        }
      }

      return true;
    });
  };
  
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
    setDocuments([]);
    setDocumentFiles([]);
    setActiveTab('basic');
  };
  
  // Handle photo file selection
  const handlePhotoChange = (e) => {
    if (!e.target.files) return;
    
    const filesArray = Array.from(e.target.files).filter(file =>
      file.type.startsWith('image/')
    );
    const currentPhotoCount = existingPhotos.length + photoFiles.length;
    const newTotalCount = currentPhotoCount + filesArray.length;
    
    if (newTotalCount > 24) {
      alert(`You can only upload a maximum of 24 files.`);
      return;
    }
    
    setPhotoFiles(prev => [...prev, ...filesArray]);
    
    // Create preview URLs
    const newPreviewUrls = filesArray.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const handleDocumentChange = (e) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    setDocumentFiles(prev => [...prev, ...filesArray]);
  };
  
  const uploadDocuments = async () => {
    if (documentFiles.length === 0) return [];
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (error) {
      console.error("Auth error:", error);
    }

    setIsUploading(true);
    const uploadPromises = documentFiles.map(async (file) => {
      if (!(file instanceof File) || file.type !== 'application/pdf') return null;
      const fileName = `boats/docs/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        await uploadTask;
        const downloadURL = await getDownloadURL(storageRef);
        return {
          url: downloadURL,
          path: fileName,
          type: 'pdf',
          name: file.name
        };
      } catch (error) {
        console.error("Error uploading document:", error);
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      setIsUploading(false);
      setDocumentFiles([]);
      return results.filter(Boolean);
    } catch (error) {
      console.error("Error in document upload:", error);
      setIsUploading(false);
      return [];
    }
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
    
    // Upload all photos in parallel for maximum speed
    const uploadPromises = photoFiles.map(async (file) => {
      if (!(file instanceof File)) return null;
      const isImage = file.type.startsWith('image/');
      if (!isImage) return null;
      
      const fileName = `boats/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        await uploadTask;
        const downloadURL = await getDownloadURL(storageRef);
        return {
          url: downloadURL,
          path: fileName,
          type: 'image',
          name: file.name
        };
      } catch (error) {
        console.error("Error uploading media:", error);
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      setIsUploading(false);
      return results.filter(Boolean);
    } catch (error) {
      console.error("Error in parallel upload:", error);
      setIsUploading(false);
      return [];
    }
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
      
      // Pricing - monthly prices only (day price is the monthly price for that specific month)
      pricing: {
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
      const docUrls = await uploadDocuments();
      
      // Prepare structured data for Firestore
      const boatData = {
        ...prepareFormDataForSave(),
        photos: photoUrls,
        documents: docUrls,
        createdAt: new Date(),
        companyId: userCompanyId
      };
      
      // Save to Firestore
      const boatCollection = collection(db, "boats");
      await addDoc(boatCollection, boatData);

      // Show success message
      setSuccessMessage(language === 'en' ? 'Boat successfully uploaded!' : 'Barca a fost încărcată cu succes!');
      setTimeout(() => setSuccessMessage(''), 3000);

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
      let updatedDocuments = [...documents];
      
      // Filter out photo objects that were removed during editing
      const newPhotoUrls = await uploadPhotos();
      const newDocUrls = await uploadDocuments();
      
      // Combine existing photos with new ones
      updatedPhotos = [...updatedPhotos, ...newPhotoUrls];
      updatedDocuments = [...updatedDocuments, ...newDocUrls];
      
      // Prepare structured data for Firestore
      const boatData = {
        ...prepareFormDataForSave(),
        photos: updatedPhotos,
        documents: updatedDocuments,
        updatedAt: new Date(),
        companyId: currentBoat.companyId || userCompanyId
      };
      
      // Update in Firestore
      const boatDoc = doc(db, "boats", currentBoat.id);
      await updateDoc(boatDoc, boatData);

      // Show success message
      setSuccessMessage(language === 'en' ? 'Boat successfully updated!' : 'Barca a fost actualizată cu succes!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
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
      // Delete documents from storage if they exist
      if (boatToDelete.documents && boatToDelete.documents.length > 0) {
        for (const docItem of boatToDelete.documents) {
          if (docItem.path) {
            try {
              const storageRef = ref(storage, docItem.path);
              await deleteObject(storageRef);
            } catch (error) {
              console.error("Error deleting document:", error);
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
        if (updated[index]?.url) {
          URL.revokeObjectURL(updated[index].url); // Clean up URL
        }
        updated.splice(index, 1);
        return updated;
      });
    }
  };

  const handleDeleteDocument = async (index, isExisting = false) => {
    if (isExisting) {
      const docToDelete = documents[index];
      setDocuments(prev => prev.filter((_, i) => i !== index));
      if (docToDelete?.path) {
        try {
          const storageRef = ref(storage, docToDelete.path);
          await deleteObject(storageRef);
        } catch (error) {
          console.error("Error deleting document from storage:", error);
        }
      }
    } else {
      setDocumentFiles(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  // Start editing a boat
  const startEditingBoat = (boat) => {
    setCurrentBoat(boat);
    
    // Extract data to flat form structure
    setFormData({
      name_en: typeof boat.name === 'string' ? boat.name : (boat.name?.en || ''),
      name_ro: typeof boat.name === 'string' ? boat.name : (boat.name?.ro || ''),
      length: boat.length || '',
      capacity: boat.capacity || '',
      cruisingArea_en: typeof boat.cruisingArea === 'string' ? boat.cruisingArea : (boat.cruisingArea?.en || ''),
      cruisingArea_ro: typeof boat.cruisingArea === 'string' ? boat.cruisingArea : (boat.cruisingArea?.ro || ''),
      description_en: typeof boat.description === 'string' ? boat.description : (boat.description?.en || ''),
      description_ro: typeof boat.description === 'string' ? boat.description : (boat.description?.ro || ''),
      
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
        included_en: typeof boat.crew?.included === 'string' ? boat.crew.included : (boat.crew?.included?.en || ''),
        included_ro: typeof boat.crew?.included === 'string' ? boat.crew.included : (boat.crew?.included?.ro || '')
      },
      
      // Contact info
      contactName: boat.contact?.name || '',
      contactPhone: boat.contact?.phone || '',
      contactEmail: boat.contact?.email || '',
      bookingNotes_en: typeof boat.bookingNotes === 'string' ? boat.bookingNotes : (boat.bookingNotes?.en || ''),
      bookingNotes_ro: typeof boat.bookingNotes === 'string' ? boat.bookingNotes : (boat.bookingNotes?.ro || '')
    });
    
    // Set existing photos
    setExistingPhotos((boat.photos || []).map(normalizeMediaItem).filter(Boolean));
    setDocuments((boat.documents || []).map(normalizeMediaItem).filter(Boolean));
    setDocumentFiles([]);
    
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
        monthly: "Day Price by Month",
        may: "May - Price per Day (€)",
        june: "June - Price per Day (€)",
        july: "July - Price per Day (€)",
        august: "August - Price per Day (€)",
        september: "September - Price per Day (€)",
        october: "October - Price per Day (€)"
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
      selectTab: "Select section",
      // Search and filter translations
      search: "Search boats...",
      filters: "Filters",
      showFilters: "Show Filters",
      hideFilters: "Hide Filters",
      lengthRange: "Length Range (m)",
      minLength: "Min Length",
      maxLength: "Max Length",
      capacityRange: "Capacity Range",
      minCapacity: "Min Capacity",
      maxCapacity: "Max Capacity",
      priceRange: "Price Range (€/day)",
      minPrice: "Min Price",
      maxPrice: "Max Price",
      clearFilters: "Clear Filters",
      resultsFound: "boats found"
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
        monthly: "Preț pe Zi după Lună",
        may: "Mai - Preț pe Zi (€)",
        june: "Iunie - Preț pe Zi (€)",
        july: "Iulie - Preț pe Zi (€)",
        august: "August - Preț pe Zi (€)",
        september: "Septembrie - Preț pe Zi (€)",
        october: "Octombrie - Preț pe Zi (€)"
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
      selectTab: "Selectează secțiunea",
      // Search and filter translations
      search: "Caută bărci...",
      filters: "Filtre",
      showFilters: "Arată Filtrele",
      hideFilters: "Ascunde Filtrele",
      lengthRange: "Interval Lungime (m)",
      minLength: "Lungime Min",
      maxLength: "Lungime Max",
      capacityRange: "Interval Capacitate",
      minCapacity: "Capacitate Min",
      maxCapacity: "Capacitate Max",
      priceRange: "Interval Preț (€/zi)",
      minPrice: "Preț Min",
      maxPrice: "Preț Max",
      clearFilters: "Șterge Filtrele",
      resultsFound: "bărci găsite"
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
                {existingPhotos.map((photo, index) => {
                  const normalized = normalizeMediaItem(photo);
                  return (
                    <div key={`existing-${index}`} className="photoPreview">
                      {normalized?.type === 'pdf' ? (
                        <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', fontSize: '12px', textAlign: 'center', padding: '4px'}}>
                          📄 {normalized.name || 'PDF'}
                        </div>
                      ) : (
                        <img 
                          src={normalized?.url} 
                          alt={`Photo ${index}`}
                          style={{width: '100%', height: '100%', objectFit: 'cover'}}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(index, true)}
                        className="deleteButton"
                        aria-label="Delete media"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                
                {/* New photo previews */}
                {previewUrls.map((file, index) => (
                  <div key={`preview-${index}`} className="photoPreview">
                    <img 
                      src={file?.url} 
                      alt={`Preview ${index}`}
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(index, false)}
                      className="deleteButton"
                      aria-label="Delete media"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="formSection">
              <label className="formLabel">
                {language === 'en' ? 'Documents (PDF)' : 'Documente (PDF)'}
              </label>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleDocumentChange}
                className="fileInput"
              />
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <div key={`existing-doc-${idx}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="flex items-center gap-2 text-sm text-gray-800">
                      <span>📄</span>
                      {doc.name || `Document ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm">
                        {language === 'en' ? 'Open' : 'Deschide'}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(idx, true)}
                        style={styles.buttonIconDanger}
                        aria-label={t.delete}
                        title={t.delete}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {documentFiles.map((doc, idx) => (
                  <div key={`pending-doc-${idx}`} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <span>📄</span>
                      {doc.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(idx, false)}
                      style={styles.buttonIconDanger}
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                      </svg>
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
  
  const filteredBoats = getFilteredBoats();
  const hasActiveFilters = Boolean(
    searchTerm ||
    lengthFilter.min || lengthFilter.max ||
    capacityFilter.min || capacityFilter.max ||
    priceFilter.min || priceFilter.max
  );
  
  return (
    <div className="container">
      {/* Success Message Popup */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span style={{ fontWeight: '500' }}>{successMessage}</span>
          </div>
        </div>
      )}

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
                    <span>{t.uploadingPhotos}</span>
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
      
      {/* Boat List with Search and Filters */}
      {!isAddingBoat && !isEditingBoat && (
        <div>
          {/* Header with Add Button */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
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

          {/* Search and Filter Controls */}
          <div className="controlsRow">
            {/* Search Bar */}
            <div className="searchInputWrapper">
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="searchInput"
              />
              <div className="searchIcon">
                🔍
              </div>
            </div>

            {/* Filter Controls */}
            <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      {/* Minimal Filter Toggle Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: showFilters ? '#f3f4f6' : 'white',
          color: showFilters ? '#374151' : '#6b7280',
          border: '1px solid #d1d5db',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontWeight: '500',
          transition: 'all 0.2s',
          fontSize: '0.875rem',
          width: '100%',
          maxWidth: '200px'
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = showFilters ? '#e5e7eb' : '#f9fafb';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = showFilters ? '#f3f4f6' : 'white';
        }}
      >
        <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
        </svg>
        {showFilters ? t.hideFilters : t.showFilters}
      </button>

      {/* Results Count and Clear Button */}
      {filteredBoats.length > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: '#f9fafb',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          width: '100%'
        }}>
          <span style={{ 
            color: '#374151', 
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            {filteredBoats.length} {t.resultsFound}
          </span>
          
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchTerm('');
                setLengthFilter({ min: '', max: '' });
                setCapacityFilter({ min: '', max: '' });
                setPriceFilter({ min: '', max: '' });
              }}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              ✕ {t.clearFilters}
            </button>
          )}
        </div>
      )}
    </div>
  </div>

  {/* Enhanced Filter Panel */}
  {showFilters && (
    <div style={{
      backgroundColor: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '0.75rem',
      padding: '1rem',
      marginBottom: '1rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <svg style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
        </svg>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: '600', 
          margin: 0,
          color: '#374151'
        }}>
          {t.filters}
        </h3>
      </div>
      
      {/* Responsive Grid - Single column on mobile, multiple on desktop */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        {/* Length Range Filter */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.75rem', 
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            <span style={{ marginRight: '0.5rem' }}>📏</span>
            {t.lengthRange}
          </label>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <input
              type="number"
              placeholder={t.minLength}
              value={lengthFilter.min}
              onChange={(e) => setLengthFilter(prev => ({ ...prev, min: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <input
              type="number"
              placeholder={t.maxLength}
              value={lengthFilter.max}
              onChange={(e) => setLengthFilter(prev => ({ ...prev, max: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
        </div>

        {/* Capacity Range Filter */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.75rem', 
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            <span style={{ marginRight: '0.5rem' }}>👥</span>
            {t.capacityRange}
          </label>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <input
              type="number"
              placeholder={t.minCapacity}
              value={capacityFilter.min}
              onChange={(e) => setCapacityFilter(prev => ({ ...prev, min: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <input
              type="number"
              placeholder={t.maxCapacity}
              value={capacityFilter.max}
              onChange={(e) => setCapacityFilter(prev => ({ ...prev, max: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
        </div>

        {/* Price Range Filter */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.75rem', 
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            <span style={{ marginRight: '0.5rem' }}>💰</span>
            {t.priceRange}
          </label>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <input
              type="number"
              placeholder={t.minPrice}
              value={priceFilter.min}
              onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <input
              type="number"
              placeholder={t.maxPrice}
              value={priceFilter.max}
              onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(searchTerm || lengthFilter.min || lengthFilter.max || capacityFilter.min || capacityFilter.max || priceFilter.min || priceFilter.max) && (
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280', 
            margin: '0 0 0.5rem 0',
            fontWeight: '500'
          }}>
            Active Filters:
          </p>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.5rem'
          }}>
            {searchTerm && (
              <span style={{
                backgroundColor: '#ebf8ff',
                color: '#1e40af',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                border: '1px solid #bfdbfe',
                whiteSpace: 'nowrap'
              }}>
                Search: "{searchTerm.length > 15 ? searchTerm.substring(0, 15) + '...' : searchTerm}"
              </span>
            )}
            {(lengthFilter.min || lengthFilter.max) && (
              <span style={{
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                border: '1px solid #bbf7d0',
                whiteSpace: 'nowrap'
              }}>
                Length: {lengthFilter.min || '0'}m - {lengthFilter.max || '∞'}m
              </span>
            )}
            {(capacityFilter.min || capacityFilter.max) && (
              <span style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                border: '1px solid #fde68a',
                whiteSpace: 'nowrap'
              }}>
                Capacity: {capacityFilter.min || '0'} - {capacityFilter.max || '∞'}
              </span>
            )}
            {(priceFilter.min || priceFilter.max) && (
              <span style={{
                backgroundColor: '#fecaca',
                color: '#991b1b',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                border: '1px solid #fca5a5',
                whiteSpace: 'nowrap'
              }}>
                €{priceFilter.min || '0'} - €{priceFilter.max || '∞'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  
          )}
          
          {/* Boat Grid */}
          {filteredBoats.length === 0 ? (
            <div style={{textAlign: 'center', padding: '2.5rem 1rem', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'}}>
              <p style={{color: '#6b7280'}}>{boats.length === 0 ? t.boatList.noBoats : `No boats match your filters.`}</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredBoats.map((boat) => {
                const priceRange = getPriceRange(boat.pricing?.monthly);
                const lengthLabel = boat.length ? `${boat.length}m` : null;
                const capacityLabel = boat.capacity ? `${boat.capacity} ${language === 'en' ? 'people' : 'persoane'}` : null;
                const rangeLabel = priceRange
                  ? (priceRange.min === priceRange.max
                      ? `€${priceRange.min.toFixed(0)}/${language === 'en' ? 'day' : 'zi'}`
                      : `€${priceRange.min.toFixed(0)}-€${priceRange.max.toFixed(0)}/${language === 'en' ? 'day' : 'zi'}`)
                  : null;

                return (
                  <div
                    key={boat.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer flex flex-col"
                    onClick={() => { setSelectedBoat(boat); setSelectedBoatPhotoIndex(0); }}
                  >
                    <div className="relative h-44 bg-gray-100">
                      {getBoatPhotoUrl(boat) ? (
                        <img
                          src={getBoatPhotoUrl(boat)}
                          alt={getLocalizedContent(boat.name, language, t.noPhotos)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                          {t.noPhotos}
                        </div>
                      )}
                      {(lengthLabel || capacityLabel) && (
                        <div className="absolute bottom-2 left-2 flex gap-2">
                          {lengthLabel && (
                            <span className="bg-white/90 text-indigo-700 px-2 py-1 rounded text-xs font-medium shadow-sm">
                              {lengthLabel}
                            </span>
                          )}
                          {capacityLabel && (
                            <span className="bg-white/90 text-indigo-700 px-2 py-1 rounded text-xs font-medium shadow-sm">
                              {capacityLabel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex flex-col flex-grow">
                      <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                        {getLocalizedContent(boat.name, language)}
                      </h3>
                      <p className="text-sm text-gray-600 truncate mb-2">
                        {getLocalizedContent(boat.cruisingArea, language)}
                      </p>
                      {rangeLabel && (
                        <p className="text-indigo-600 font-semibold text-sm mb-3">{rangeLabel}</p>
                      )}

                      <div className="flex gap-2 mt-auto">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedBoat(boat); setSelectedBoatPhotoIndex(0); }}
                          className="flex-1 bg-indigo-50 text-indigo-700 rounded px-3 py-2 text-sm font-medium hover:bg-indigo-100 transition"
                        >
                          {t.view || 'View'}
                        </button>
                        {getBoatDocuments(boat).length > 0 && (
                          <a
                            href={getBoatDocuments(boat)[0].url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-center"
                            style={styles.buttonIcon}
                            aria-label={language === 'en' ? 'Download PDF' : 'Descarcă PDF'}
                            title={language === 'en' ? 'Download PDF' : 'Descarcă PDF'}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <path d="M9 13h6" />
                              <path d="M9 17h3" />
                              <path d="M12 11v6" />
                            </svg>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startEditingBoat(boat); }}
                          className="flex-1 bg-gray-100 text-gray-700 rounded px-3 py-2 text-sm font-medium hover:bg-gray-200 transition"
                        >
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(language === 'en' ? 'Are you sure you want to delete this boat?' : 'Ești sigur că vrei să ștergi această barcă?')) {
                              handleDeleteBoat(boat.id);
                            }
                          }}
                          style={styles.buttonIconDanger}
                          aria-label={t.delete}
                          title={t.delete}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedBoat && (() => {
        const mediaItems = (selectedBoat.photos || [])
          .map(normalizeMediaItem)
          .filter(Boolean);
        const documentItems = (selectedBoat.documents || []).map(normalizeMediaItem).filter(Boolean);
        const photoUrls = mediaItems.filter(item => item.type !== 'pdf' && item.url).map(item => item.url);
        const pdfItems = [
          ...mediaItems.filter(item => item.type === 'pdf' && item.url),
          ...documentItems
        ];
        const activePhoto = photoUrls[selectedBoatPhotoIndex] || photoUrls[0] || getBoatPhotoUrl(selectedBoat);
        const monthlyEntries = selectedBoat.pricing?.monthly
          ? Object.entries(selectedBoat.pricing.monthly).filter(([, val]) => val)
          : [];
        
        // Flatten amenities and features
        const allAmenities = [];
        
        // Helper to add translated features
        const addFeatures = (sourceObj, translationCategory) => {
          if (!sourceObj || typeof sourceObj !== 'object') return;
          Object.entries(sourceObj).forEach(([key, value]) => {
            // Check if value is true (boolean) and we have a translation
            if (value === true && t[translationCategory]?.[key]) {
              allAmenities.push(t[translationCategory][key]);
            }
          });
        };

        addFeatures(selectedBoat.amenities, 'amenities');
        addFeatures(selectedBoat.equipment, 'equipment');
        addFeatures(selectedBoat.waterSports, 'waterSports');

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedBoat(null);
                    setSelectedBoatPhotoIndex(0);
                  }}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {language === 'en' ? 'Back' : 'Înapoi'}
                </button>
                <div className="flex items-center gap-3">
                   <button
                    onClick={() => {
                      setSelectedBoat(null);
                      setSelectedBoatPhotoIndex(0);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-6 bg-gray-50 flex-grow">
                {/* Title & Location */}
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{getLocalizedContent(selectedBoat.name, language)}</h1>
                  {getLocalizedContent(selectedBoat.cruisingArea, language) && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {getLocalizedContent(selectedBoat.cruisingArea, language)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column */}
                  <div className="col-span-1 lg:col-span-2 space-y-6">
                    {/* Images */}
                    {(() => {
                      if (photoUrls.length === 0) return (
                        <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center text-gray-400 text-center px-4">
                          {pdfItems.length > 0 ? (language === 'en' ? 'No images available. See documents below.' : 'Nicio imagine disponibilă. Vezi documentele mai jos.') : t.noPhotos}
                        </div>
                      );

                      const activeUrl = photoUrls[selectedBoatPhotoIndex] || photoUrls[0];

                      return (
                        <div className="space-y-4">
                          <div className="bg-gray-100 rounded-lg overflow-hidden relative shadow-md group">
                            <img
                              src={activeUrl}
                              alt="Boat cover"
                              className="w-full h-64 sm:h-96 object-cover"
                            />
                            
                            {/* Navigation Arrows */}
                            {photoUrls.length > 1 && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newIndex = selectedBoatPhotoIndex === 0 ? photoUrls.length - 1 : selectedBoatPhotoIndex - 1;
                                    setSelectedBoatPhotoIndex(newIndex);
                                  }}
                                  className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/70 hover:bg-white shadow text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newIndex = selectedBoatPhotoIndex === photoUrls.length - 1 ? 0 : selectedBoatPhotoIndex + 1;
                                    setSelectedBoatPhotoIndex(newIndex);
                                  }}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/70 hover:bg-white shadow text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>

                          {/* Thumbnails */}
                          {photoUrls.length > 1 && (
                            <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
                              {photoUrls.map((url, idx) => (
                                <button
                                  key={`${url}-${idx}`}
                                  onClick={() => setSelectedBoatPhotoIndex(idx)}
                                  className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                                    idx === selectedBoatPhotoIndex ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  <img
                                    src={url}
                                    alt={`Thumbnail ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Description */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">{language === 'en' ? 'Description' : 'Descriere'}</h2>
                      <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                        {getLocalizedContent(selectedBoat.description, language) || (
                          <span className="text-gray-400 italic">No description available</span>
                        )}
                      </div>
                    </div>

                    {/* Documents */}
                    {pdfItems.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                          {language === 'en' ? 'Documents' : 'Documente'}
                        </h2>
                        <div className="space-y-2">
                          {pdfItems.map((file, idx) => (
                            <a
                              key={`${file.url}-${idx}`}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition"
                            >
                              <span className="flex items-center gap-2 text-gray-800">
                                <span className="text-lg">📄</span>
                                {file.name || `${language === 'en' ? 'Document' : 'Document'} ${idx + 1}`}
                              </span>
                              <span className="text-indigo-600 text-sm font-medium">
                                {language === 'en' ? 'Open PDF' : 'Deschide PDF'}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features/Amenities */}
                    {allAmenities.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">{language === 'en' ? 'Amenities' : 'Facilități'}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {allAmenities.map((item, idx) => (
                            <div key={idx} className="flex items-center p-2 bg-gray-50 rounded">
                              <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-700 font-medium">{getLocalizedContent(item, language)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Sticky Details */}
                  <div className="col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-6 space-y-6">
                      {/* Price - Show range or 'from' if we have monthly prices */}
                      <div>
                        {monthlyEntries.length > 0 ? (
                           <div>
                              <div className="text-sm text-gray-500 mb-1">{language === 'en' ? 'Prices from' : 'Prețuri de la'}</div>
                              <div className="text-3xl font-bold text-indigo-600">
                                €{Math.min(...monthlyEntries.map(([,val]) => parseFloat(val) || Infinity))}
                              </div>
                              <div className="text-gray-500 text-sm">
                                / {language === 'en' ? 'day' : 'zi'}
                              </div>
                           </div>
                        ) : (
                          <div className="text-gray-500 italic">
                             {language === 'en' ? 'Contact for price' : 'Contactați pentru preț'}
                          </div>
                        )}
                      </div>

                      <hr className="border-gray-100" />

                      {/* Key Specs */}
                      <div className="space-y-3">
                         {[
                          { label: language === 'en' ? 'Year' : 'An', value: selectedBoat.year || selectedBoat.specs?.year },
                          { label: language === 'en' ? 'Capacity' : 'Capacitate', value: selectedBoat.capacity ? `${selectedBoat.capacity} ${language === 'en' ? 'ppl' : 'pers'}` : null },
                          { label: language === 'en' ? 'Length' : 'Lungime', value: selectedBoat.length ? `${selectedBoat.length}m` : null },
                          { label: language === 'en' ? 'Engine' : 'Motor', value: selectedBoat.specs?.engine },
                          { label: language === 'en' ? 'Cabins' : 'Cabine', value: selectedBoat.specs?.cabins },
                          { label: language === 'en' ? 'Speed' : 'Viteză', value: selectedBoat.specs?.cruisingSpeed ? `${selectedBoat.specs.cruisingSpeed} kn` : null },
                         ].filter(item => item.value).map((spec, idx) => (
                           <div key={idx} className="flex justify-between items-center">
                             <span className="text-gray-600">{spec.label}</span>
                             <span className="font-medium text-gray-900 truncate max-w-[150px]">{spec.value}</span>
                           </div>
                         ))}
                      </div>

                      {/* Monthly Pricing */}
                      {monthlyEntries.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                           <h3 className="font-medium text-gray-900 mb-3">{language === 'en' ? 'Pricing' : 'Prețuri'}</h3>
                           <div className="space-y-2 text-sm">
                              {monthlyEntries.map(([month, val]) => (
                                <div key={month} className="flex justify-between">
                                  <span className="text-gray-600 capitalize">
                                    {month}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    €{val} / {language === 'en' ? 'day' : 'zi'}
                                  </span>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Boats;
