// Cars component with inline styles and enhanced filtering
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useDatabase } from '../../context/DatabaseContext';
import { getCurrentLanguage } from "../../utils/languageHelper";
import { isAdminRole } from '../../utils/roleUtils';

// Normalize media items to a consistent shape for images and PDFs
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

// Helper to safely read first displayable image URL (ignores PDFs)
const getCarPhotoUrl = (car) => {
  const photos = car?.photos || [];
  for (const item of photos) {
    const media = normalizeMediaItem(item);
    if (media?.url && media.type !== 'pdf') return media.url;
  }
  if (car?.photoUrl) return car.photoUrl;
  return null;
};

const getCarDocuments = (car) => {
  const mediaDocs = (car?.photos || []).map(normalizeMediaItem).filter(item => item?.type === 'pdf');
  const explicitDocs = (car?.documents || []).map(normalizeMediaItem).filter(item => item?.type === 'pdf');
  return [...mediaDocs, ...explicitDocs];
};

// Enhanced styles with mobile responsiveness and new filter styles
const styles = {
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '12px'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  headerRow: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px'
  },
  helperText: {
    fontSize: '13px',
    color: '#4b5563',
    marginBottom: '12px',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    marginBottom: '16px',
    width: '100%'
  },

filterContainer: {
  background: '#fff',
  borderRadius: '6px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  padding: '8px',
  marginBottom: '12px',
  margin: '0 auto 12px auto' // Center it
},
searchBar: {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  marginBottom: '8px'
},
filterToggle: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '3px 0',
  cursor: 'pointer',
  borderBottom: '1px solid #e5e7eb'
},
filterToggleText: {
  fontSize: '11px',
  fontWeight: '500',
  color: '#374151'
},
filterContent: {
  padding: '6px 0'
},
filterGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)', // Fixed 6 columns max
  gap: '6px',
  marginBottom: '6px'
},
filterGridMobile: {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '8px',
  marginBottom: '12px'
},
filterGroup: {
  marginBottom: '6px'
},
filterLabel: {
  display: 'block',
  fontSize: '10px',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '2px'
},
filterSelect: {
  width: '100%',
  padding: '2px 6px',
  borderRadius: '3px',
  border: '1px solid #d1d5db',
  fontSize: '11px',
  backgroundColor: '#fff',
  minHeight: '24px'
},
filterInput: {
  width: '100%',
  padding: '2px 6px',
  borderRadius: '3px',
  border: '1px solid #d1d5db',
  fontSize: '11px',
  minHeight: '24px'
},
filterCheckboxGroup: {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px'
},
filterCheckbox: {
  display: 'flex',
  alignItems: 'center',
  fontSize: '10px',
  color: '#374151'
},
clearFiltersButton: {
  backgroundColor: '#f3f4f6',
  color: '#374151',
  fontWeight: '500',
  padding: '3px 6px',
  borderRadius: '3px',
  border: '1px solid #d1d5db',
  cursor: 'pointer',
  fontSize: '10px'
},
resultsCount: {
  fontSize: '10px',
  color: '#6b7280',
  marginTop: '3px',
  fontStyle: 'italic'
},
  // Existing styles continue...
  formSection: {
    marginBottom: '16px'
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: '4px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '16px',
    marginBottom: '12px',
    touchAction: 'manipulation'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '16px',
    marginBottom: '12px',
    minHeight: '100px'
  },
  fileInput: {
    marginBottom: '12px',
    width: '100%'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    color: '#4b5563',
    marginBottom: '12px',
    touchAction: 'manipulation'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginRight: '8px'
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: '500',
    padding: '11px 15px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    width: '100%',
    maxWidth: '250px',
    touchAction: 'manipulation'
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    fontWeight: '500',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    fontSize: '15px',
    touchAction: 'manipulation'
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
    color: '#b91c1c',
    fontWeight: '500',
    padding: '10px 14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    touchAction: 'manipulation'
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    margin: '12px 0'
  },
  toggleButton: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    fontWeight: '500',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    fontSize: '14px',
    touchAction: 'manipulation'
  },
  tabContainer: {
    display: 'flex',
    overflowX: 'auto',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '16px',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    paddingBottom: '4px'
  },
  tab: {
    padding: '10px 16px',
    marginRight: '8px',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    touchAction: 'manipulation'
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
    gap: '8px',
    marginTop: '12px'
  },
  photoPreview: {
    position: 'relative',
    height: '80px',
    width: '80px',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  deleteButton: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    touchAction: 'manipulation'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb'
  },
  sectionSubtitle: {
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '12px',
    marginTop: '16px'
  },
  carListContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  carCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  carImageContainer: {
    height: '180px',
    backgroundColor: '#f3f4f6'
  },
  carImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  carCardContent: {
    padding: '20px 20px 22px'
  },
  carCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#1f2937'
  },
  carCardDetails: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px'
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: '20px',
    gap: '12px',
    alignItems: 'center'
  },
  currencyInput: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  currencySymbol: {
    position: 'absolute',
    left: '12px',
    fontSize: '16px',
    color: '#6b7280'
  },
  currencyTextInput: {
    width: '100%',
    padding: '10px 12px 10px 24px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '16px'
  },
  placeholderImage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: '#f9fafb',
    color: '#9ca3af'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '16px',
    marginBottom: '12px',
    backgroundColor: '#fff',
    minHeight: '48px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    marginTop: '8px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease'
  },
  formCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb'
  },
  formContent: {
    padding: '16px'
  },
  formStepsIndicator: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
    padding: '0 16px'
  },
  formStep: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb'
  },
  formStepActive: {
    backgroundColor: '#3b82f6'
  },
  formNavigation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '24px',
    gap: '8px'
  },
  navButton: {
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    flex: '1',
    textAlign: 'center',
    touchAction: 'manipulation'
  },
  navButtonPrimary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
    marginBottom: '20px'
  },
  formGridDesktop: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px'
  }
};

function Cars() {
  const { companyInfo, userRole } = useDatabase();
  const userCompanyId = companyInfo?.id || null;
  const userCompanyName = companyInfo?.name || companyInfo?.id || '';

  const [cars, setCars] = useState([]);
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isEditingCar, setIsEditingCar] = useState(false);
  const [currentCar, setCurrentCar] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);
  const [successMessage, setSuccessMessage] = useState('');
  
  // NEW: Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    make: '',
    fuel: '',
    transmission: '',
    yearMin: '',
    yearMax: '',
    seatsMin: '',
    seatsMax: '',
    priceMin: '',
    priceMax: '',
    features: []
  });
  
  // Track window size for responsiveness
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Check if we're on mobile
  const isMobile = windowWidth <= 768;

  // Form data with comprehensive car details (existing code continues...)
  const [formData, setFormData] = useState({
    // Basic Information
    make: '',
    model: '',
    year: '',
    priceMonth: 'may',
    seats: '',
    doors: '',
    transmission: 'automatic', // automatic or manual
    fuel: 'petrol', // petrol, diesel, hybrid, electric
    description_en: '',
    description_ro: '',
    // Specifications
    specs: {
      engine: '',
      horsepower: '',
      topSpeed: '',
      acceleration: '', // 0-100 km/h
      consumption: '', // L/100km
      range: '', // km (especially for electric)
      luggage: '', // luggage capacity
    },
    // Daily price and monthly prices
    priceDaily: '',
    monthlyPrices: {
      may: '',
      june: '',
      july: '',
      august: '',
      september: '',
      october: ''
    },
    // Features
    features: {
      // Comfort
      airConditioning: false,
      leatherSeats: false,
      heatedSeats: false,
      sunroof: false,
      panoramicRoof: false,
      // Technology
      bluetooth: false,
      navigation: false,
      parkingSensors: false,
      reverseCamera: false,
      cruiseControl: false,
      // Safety
      abs: false,
      airbags: false,
      stabilityControl: false,
      tirePressureMonitor: false,
      // Convenience
      centralLocking: false,
      keylessEntry: false,
      powerWindows: false,
      powerMirrors: false
    },
    // Contact & Booking
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    pickupLocation_en: '',
    pickupLocation_ro: '',
    bookingNotes_en: '',
    bookingNotes_ro: ''
  });

  const getCheapestMonthlyPricing = (monthly = {}) => {
    let best = { month: null, price: null };
    Object.entries(monthly || {}).forEach(([month, val]) => {
      const price = parseFloat(val);
      if (!Number.isNaN(price) && price > 0) {
        if (best.price === null || price < best.price) {
          best = { month, price };
        }
      }
    });
    return best;
  };

  // Quick helper to drop a single month/price pair into monthlyPrices
  const addSeasonPrice = () => {};
  
  // Photos array
  const [existingPhotos, setExistingPhotos] = useState([]);
  
  // Current UI language
  const [language, setLanguage] = useState(getCurrentLanguage);
  
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

  // NEW: Filter and search functionality
  const getUniqueCarMakes = () => {
    const makes = cars.map(car => car.make).filter(Boolean);
    return [...new Set(makes)].sort();
  };

  const clearFilters = () => {
    setFilters({
      make: '',
      fuel: '',
      transmission: '',
      yearMin: '',
      yearMax: '',
      seatsMin: '',
      seatsMax: '',
      priceMin: '',
      priceMax: '',
      features: []
    });
    setSearchTerm('');
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleFeatureFilterChange = (feature, checked) => {
    setFilters(prev => ({
      ...prev,
      features: checked 
        ? [...prev.features, feature]
        : prev.features.filter(f => f !== feature)
    }));
  };

  const getFilteredCars = () => {
    let filtered = cars;

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(car => {
        const name = getLocalizedContent(car.name, language, '').toLowerCase();
        const make = (car.make || '').toLowerCase();
        const model = (car.model || '').toLowerCase();
        const description = getLocalizedContent(car.description, language, '').toLowerCase();
        
        return name.includes(search) || 
               make.includes(search) || 
               model.includes(search) || 
               description.includes(search);
      });
    }

    // Make filter
    if (filters.make) {
      filtered = filtered.filter(car => car.make === filters.make);
    }

    // Fuel filter
    if (filters.fuel) {
      filtered = filtered.filter(car => car.fuel === filters.fuel);
    }

    // Transmission filter
    if (filters.transmission) {
      filtered = filtered.filter(car => car.transmission === filters.transmission);
    }

    // Year range filter
    if (filters.yearMin) {
      filtered = filtered.filter(car => {
        const year = parseInt(car.year);
        return !isNaN(year) && year >= parseInt(filters.yearMin);
      });
    }
    if (filters.yearMax) {
      filtered = filtered.filter(car => {
        const year = parseInt(car.year);
        return !isNaN(year) && year <= parseInt(filters.yearMax);
      });
    }

    // Seats range filter
    if (filters.seatsMin) {
      filtered = filtered.filter(car => {
        const seats = parseInt(car.seats);
        return !isNaN(seats) && seats >= parseInt(filters.seatsMin);
      });
    }
    if (filters.seatsMax) {
      filtered = filtered.filter(car => {
        const seats = parseInt(car.seats);
        return !isNaN(seats) && seats <= parseInt(filters.seatsMax);
      });
    }

    // Price range filter (using daily price)
    if (filters.priceMin) {
      filtered = filtered.filter(car => {
        const price = parseFloat(car.pricing?.daily || 0);
        return price >= parseFloat(filters.priceMin);
      });
    }
    if (filters.priceMax) {
      filtered = filtered.filter(car => {
        const price = parseFloat(car.pricing?.daily || 0);
        return price <= parseFloat(filters.priceMax);
      });
    }

    // Features filter
    if (filters.features.length > 0) {
      filtered = filtered.filter(car => {
        return filters.features.every(feature => car.features?.[feature] === true);
      });
    }

    return filtered;
  };

  const filteredCars = getFilteredCars();
  const hasActiveFilters = Boolean(
    searchTerm ||
    filters.make ||
    filters.fuel ||
    filters.transmission ||
    filters.yearMin ||
    filters.yearMax ||
    filters.seatsMin ||
    filters.seatsMax ||
    filters.priceMin ||
    filters.priceMax ||
    (filters.features && filters.features.length > 0)
  );

  // Handle language changes
  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(getCurrentLanguage());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Fetch cars when company is resolved
  useEffect(() => {
    if (!userCompanyId) {
      setCars([]);
      return;
    }
    fetchCars();
  }, [userCompanyId]);
  
  // Fetch cars from Firestore
  const fetchCars = async () => {
    try {
      if (!userCompanyId) {
        setCars([]);
        return;
      }
      // Shared catalog: both companies can view all cars
      const carSnapshot = await getDocs(collection(db, "cars"));
      const carList = carSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCars(carList);
    } catch (error) {
      console.error("Error fetching cars:", error);
    }
  };

  const canManageCar = (car) => {
    if (!userCompanyId) return false;
    if (!car?.companyId) return isAdminRole(userRole);
    return car.companyId === userCompanyId;
  };

  // ALL OTHER EXISTING FUNCTIONS CONTINUE HERE...
  // (handleInputChange, toggleFeature, resetForm, handlePhotoChange, uploadPhotos, 
  //  prepareFormDataForSave, handleAddCar, handleUpdateCar, handleDeleteCar, 
  //  handleDeletePhoto, startEditingCar, navigation functions, etc.)

  // Enhanced input handler that can handle deeply nested objects
  const handleInputChange = (e, section = null, subSection = null) => {
    if (!e || !e.target) return;
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    if (!name) return;
    
    setFormData(prev => {
      // Handle price fields with number validation
      if (name.includes('price') && name !== 'priceMonth' && type !== 'checkbox') {
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
      make: '',
      model: '',
      year: '',
      priceMonth: 'may',
      seats: '',
      doors: '',
      transmission: 'automatic',
      fuel: 'petrol',
      description_en: '',
      description_ro: '',
      specs: {
        engine: '',
        horsepower: '',
        topSpeed: '',
        acceleration: '',
        consumption: '',
        range: '',
        luggage: '',
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
      features: {
        airConditioning: false,
        leatherSeats: false,
        heatedSeats: false,
        sunroof: false,
        panoramicRoof: false,
        bluetooth: false,
        navigation: false,
        parkingSensors: false,
        reverseCamera: false,
        cruiseControl: false,
        abs: false,
        airbags: false,
        stabilityControl: false,
        tirePressureMonitor: false,
        centralLocking: false,
        keylessEntry: false,
        powerWindows: false,
        powerMirrors: false
      },
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      pickupLocation_en: '',
      pickupLocation_ro: '',
      bookingNotes_en: '',
      bookingNotes_ro: ''
    });
    setExistingPhotos([]);
    setPhotoFiles([]);
    setPreviewUrls([]);
    setDocuments([]);
    setDocumentFiles([]);
    setActiveTab('basic');
    setShowAdvanced(false);
    setImageErrors({});
  };
  
  // Handle photo file selection (images only)
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
    
    // Create preview URLs and metadata
    const newPreviewUrls = filesArray.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  // Handle PDF document selection
  const handleDocumentChange = (e) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    setDocumentFiles(prev => [...prev, ...filesArray]);
  };
  
  // Upload PDF documents
  const uploadDocuments = async () => {
    if (documentFiles.length === 0) return [];
    setIsUploading(true);
    const uploadedDocs = [];

    try {
      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        if (!(file instanceof File) || file.type !== 'application/pdf') continue;

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `cars/docs/${timestamp}_${randomStr}_${safeFileName}`;

        try {
          const storageRef = ref(storage, fileName);
          const uploadTask = uploadBytesResumable(storageRef, file);
          await uploadTask;
          const downloadURL = await getDownloadURL(storageRef);
          uploadedDocs.push({
            url: downloadURL,
            path: fileName,
            type: 'pdf',
            name: file.name
          });
        } catch (err) {
          console.error("Error uploading document:", err);
        }
      }
    } catch (err) {
      console.error("Unexpected error during document uploads:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setDocumentFiles([]);
    }

    return uploadedDocs;
  };

  // Enhanced Upload photos with better error handling and retry logic
  const uploadPhotos = async () => {
    if (photoFiles.length === 0) return [];
    
    setIsUploading(true);
    const photoUrls = [];
    
    try {
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        if (!(file instanceof File)) continue;
        const isImage = file.type.startsWith('image/');
        if (!isImage) continue;
        
        // Create a unique filename that includes the service type
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        
        // Specifically use "cars" folder to match your storage rules
        const fileName = `cars/${timestamp}_${randomStr}_${safeFileName}`;
        
        try {
  // console.log(`Uploading to: ${fileName}`); // Removed for production
          const storageRef = ref(storage, fileName);
          
          const uploadTask = uploadBytesResumable(storageRef, file);
          
          await new Promise((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
              },
              (error) => {
                console.error("Upload error:", error);
                console.error("Error code:", error.code);
                console.error("Error message:", error.message);
                reject(error);
              },
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  photoUrls.push({
                    url: downloadURL,
                    path: fileName,
                    type: 'image',
                    name: file.name
                  });
                  resolve();
                } catch (urlError) {
                  console.error("Error getting download URL:", urlError);
                  reject(urlError);
                }
              }
            );
          });
        } catch (uploadError) {
          console.error(`Error uploading photo ${i + 1}/${photoFiles.length}:`, uploadError);
        }
      }
    } catch (error) {
      console.error("Unexpected error during uploads:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
    
    return photoUrls;
  };
  
  // Convert form data to structured format for database
  const prepareFormDataForSave = () => {
    const computedName = `${formData.make || ''} ${formData.model || ''}`.trim() || 'Car';
    const { month: cheapestMonth, price: cheapestPrice } = getCheapestMonthlyPricing(formData.monthlyPrices);
    const resolvedPriceMonth = formData.priceMonth || cheapestMonth || 'may';
    const resolvedDaily = formData.priceDaily || (cheapestPrice !== null ? String(cheapestPrice) : '');
    return {
      // Basic company association
      companyId: userCompanyId,
      companyName: userCompanyName,
      priceMonth: resolvedPriceMonth,
      // Localized fields
      name: {
        en: computedName,
        ro: computedName
      },
      description: {
        en: formData.description_en || '',
        ro: formData.description_ro || ''
      },
      pickupLocation: {
        en: formData.pickupLocation_en || '',
        ro: formData.pickupLocation_ro || ''
      },
      bookingNotes: {
        en: formData.bookingNotes_en || '',
        ro: formData.bookingNotes_ro || ''
      },
      // Basic car info
      make: formData.make || '',
      model: formData.model || '',
      year: formData.year || '',
      seats: formData.seats || '',
      doors: formData.doors || '',
      transmission: formData.transmission || 'automatic',
      fuel: formData.fuel || 'petrol',
      // Detailed specs
      specs: formData.specs,
      // Pricing
      pricing: {
        daily: resolvedDaily,
        monthly: {
          ...formData.monthlyPrices
        }
      },
      // Features
      features: formData.features,
      // Contact info
      contact: {
        name: formData.contactName || '',
        phone: formData.contactPhone || '',
        email: formData.contactEmail || ''
      }
    };
  };
  
  // Handle adding a new car
  const handleAddCar = async (e) => {
    if (e) e.preventDefault();
    try {
      if (!userCompanyId) {
        console.error("No company resolved for current user");
        return;
      }
      // Upload photos
      const photoUrls = await uploadPhotos();
      const docUrls = await uploadDocuments();
      
      // Prepare structured data for Firestore
      const carData = {
        ...prepareFormDataForSave(),
        photos: photoUrls,
        documents: docUrls,
        createdAt: new Date()
      };
      
      // Save to Firestore
      const carCollection = collection(db, "cars");
      await addDoc(carCollection, carData);
      
      // Show success message
      setSuccessMessage(language === 'en' ? 'Car successfully added!' : 'Mașina a fost adăugată cu succes!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reset form and fetch updated data
      resetForm();
      setIsAddingCar(false);
      fetchCars();
    } catch (error) {
      console.error("Error adding car: ", error);
    }
  };
  
  // Handle updating an existing car
  const handleUpdateCar = async (e) => {
    if (e) e.preventDefault();
    try {
      if (!userCompanyId) {
        console.error("No company resolved for current user");
        return;
      }
      if (!currentCar || !currentCar.id) {
        console.error("No current car selected for update");
        return;
      }
      if (currentCar.companyId && currentCar.companyId !== userCompanyId) {
        console.error("Attempted to update a car from another company");
        return;
      }
      
      // Get existing photos as an array
      let updatedPhotos = [...existingPhotos];
      let updatedDocuments = [...documents];
      
      // Upload any new photos
      const newPhotoUrls = await uploadPhotos();
      const newDocUrls = await uploadDocuments();
      
      // Combine existing photos with new ones
      updatedPhotos = [...updatedPhotos, ...newPhotoUrls];
      updatedDocuments = [...updatedDocuments, ...newDocUrls];
      
      // Prepare structured data for Firestore
      const carData = {
        ...prepareFormDataForSave(),
        photos: updatedPhotos,
        documents: updatedDocuments,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      const carDoc = doc(db, "cars", currentCar.id);
      await updateDoc(carDoc, carData);
      
      // Show success message
      setSuccessMessage(language === 'en' ? 'Car successfully updated!' : 'Mașina a fost actualizată cu succes!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reset form and fetch updated data
      resetForm();
      setIsEditingCar(false);
      setCurrentCar(null);
      fetchCars();
    } catch (error) {
      console.error("Error updating car: ", error);
    }
  };
  
  // Handle car deletion
  const handleDeleteCar = async (id) => {
    try {
      // Find the car to get its photos
      const carToDelete = cars.find(car => car.id === id);
      if (!canManageCar(carToDelete)) {
        console.error("Attempted to delete a car from another company");
        return;
      }
      
      // Delete photos from storage if they exist
      if (carToDelete.photos && carToDelete.photos.length > 0) {
        for (const photo of carToDelete.photos) {
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
      if (carToDelete.documents && carToDelete.documents.length > 0) {
        for (const docItem of carToDelete.documents) {
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
      
      // Delete the car document
      await deleteDoc(doc(db, "cars", id));
      
      // Refresh car list
      fetchCars();
    } catch (error) {
      console.error("Error deleting car: ", error);
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
  
  // Start editing a car
  const startEditingCar = (car) => {
    if (!canManageCar(car)) {
      console.error("Attempted to edit a car from another company");
      return;
    }
    setCurrentCar(car);
    const { month: cheapestMonth, price: cheapestPrice } = getCheapestMonthlyPricing(car.pricing?.monthly || {});
    
    // Extract data to flat form structure
    setFormData({
      make: car.make || '',
      model: car.model || '',
      year: car.year || '',
      priceMonth: car.priceMonth || Object.keys(car.pricing?.monthly || {}).find(m => car.pricing?.monthly?.[m]) || cheapestMonth || 'may',
      seats: car.seats || '',
      doors: car.doors || '',
      transmission: car.transmission || 'automatic',
      fuel: car.fuel || 'petrol',
      description_en: typeof car.description === 'string' ? car.description : (car.description?.en || ''),
      description_ro: typeof car.description === 'string' ? car.description : (car.description?.ro || ''),
      // Detailed specs
      specs: {
        engine: car.specs?.engine || '',
        horsepower: car.specs?.horsepower || '',
        topSpeed: car.specs?.topSpeed || '',
        acceleration: car.specs?.acceleration || '',
        consumption: car.specs?.consumption || '',
        range: car.specs?.range || '',
        luggage: car.specs?.luggage || ''
      },
      // Pricing
      priceDaily: car.pricing?.daily || (cheapestPrice !== null ? String(cheapestPrice) : ''),
      monthlyPrices: {
        may: car.pricing?.monthly?.may || '',
        june: car.pricing?.monthly?.june || '',
        july: car.pricing?.monthly?.july || '',
        august: car.pricing?.monthly?.august || '',
        september: car.pricing?.monthly?.september || '',
        october: car.pricing?.monthly?.october || '',
      },
      // Features are copied directly
      features: car.features || {
        airConditioning: false,
        leatherSeats: false,
        heatedSeats: false,
        sunroof: false,
        panoramicRoof: false,
        bluetooth: false,
        navigation: false,
        parkingSensors: false,
        reverseCamera: false,
        cruiseControl: false,
        abs: false,
        airbags: false,
        stabilityControl: false,
        tirePressureMonitor: false,
        centralLocking: false,
        keylessEntry: false,
        powerWindows: false,
        powerMirrors: false
      },
      // Contact info
      contactName: car.contact?.name || '',
      contactPhone: car.contact?.phone || '',
      contactEmail: car.contact?.email || '',
      pickupLocation_en: typeof car.pickupLocation === 'string' ? car.pickupLocation : (car.pickupLocation?.en || ''),
      pickupLocation_ro: typeof car.pickupLocation === 'string' ? car.pickupLocation : (car.pickupLocation?.ro || ''),
      bookingNotes_en: typeof car.bookingNotes === 'string' ? car.bookingNotes : (car.bookingNotes?.en || ''),
      bookingNotes_ro: typeof car.bookingNotes === 'string' ? car.bookingNotes : (car.bookingNotes?.ro || '')
    });
    
    // Set existing media
    setExistingPhotos((car.photos || []).map(normalizeMediaItem).filter(Boolean));
    setDocuments((car.documents || []).map(normalizeMediaItem).filter(Boolean));
    setDocumentFiles([]);
    setIsEditingCar(true);
  };
  
  // Handle tab navigation
  const navigateToNextTab = () => {
    const tabs = ['basic', 'specs', 'pricing', 'features', 'contact'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
      // Scroll to top of form
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  
  const navigateToPrevTab = () => {
    const tabs = ['basic', 'specs', 'pricing', 'features', 'contact'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
      // Scroll to top of form
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  
  // Get current tab index for steps indicator
  const getCurrentTabIndex = () => {
    const tabs = ['basic', 'specs', 'pricing', 'features', 'contact'];
    return tabs.indexOf(activeTab);
  };
  
  // Translations
  const translations = {
    en: {
      addCar: "Add Car",
      editCar: "Edit Car",
      carName: "Car Name",
      make: "Make",
      model: "Model",
      year: "Year",
      seats: "Number of Seats",
      doors: "Number of Doors",
      transmission: "Transmission",
      transmissionTypes: {
        automatic: "Automatic",
        manual: "Manual"
      },
      fuel: "Fuel Type",
      fuelTypes: {
        petrol: "Petrol",
        diesel: "Diesel",
        hybrid: "Hybrid",
        electric: "Electric"
      },
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
        engine: "Engine",
        horsepower: "Horsepower",
        topSpeed: "Top Speed (km/h)",
        acceleration: "Acceleration (0-100 km/h in seconds)",
        consumption: "Fuel Consumption (L/100km)",
        range: "Range (km)",
        luggage: "Luggage Capacity"
      },
      features: {
        title: "Features",
        comfort: "Comfort",
        airConditioning: "Air Conditioning",
        leatherSeats: "Leather Seats",
        heatedSeats: "Heated Seats",
        sunroof: "Sunroof",
        panoramicRoof: "Panoramic Roof",
        technology: "Technology",
        bluetooth: "Bluetooth",
        navigation: "Navigation System",
        parkingSensors: "Parking Sensors",
        reverseCamera: "Reverse Camera",
        cruiseControl: "Cruise Control",
        safety: "Safety",
        abs: "ABS",
        airbags: "Airbags",
        stabilityControl: "Stability Control",
        tirePressureMonitor: "Tire Pressure Monitor",
        convenience: "Convenience",
        centralLocking: "Central Locking",
        keylessEntry: "Keyless Entry",
        powerWindows: "Power Windows",
        powerMirrors: "Power Mirrors"
      },
      contact: {
        title: "Contact & Booking",
        name: "Contact Name",
        phone: "Contact Phone",
        email: "Contact Email",
        pickupLocation: "Pickup Location",
        bookingNotes: "Booking Notes"
      },
      formTabs: {
        basic: "Basic Info",
        specs: "Specifications",
        pricing: "Pricing",
        features: "Features",
        contact: "Contact"
      },
      // NEW: Filter translations
      search: {
        placeholder: "Search cars by name, make, model...",
        filters: "Filters",
        showFilters: "Show Filters",
        hideFilters: "Hide Filters",
        clearFilters: "Clear All Filters",
        resultsCount: "cars found"
      },
      filters: {
        make: "Make/Brand",
        fuel: "Fuel Type",
        transmission: "Transmission",
        year: "Year",
        yearMin: "Min Year",
        yearMax: "Max Year",
        seats: "Number of Seats",
        seatsMin: "Min Seats",
        seatsMax: "Max Seats",
        price: "Daily Price (€)",
        priceMin: "Min Price",
        priceMax: "Max Price",
        features: "Features",
        anyMake: "Any Make",
        anyFuel: "Any Fuel",
        anyTransmission: "Any Transmission"
      },
      photos: "Photos (Max: 24)",
      noPhotos: "No image",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      uploadingPhotos: "Uploading...",
      carList: {
        title: "Car Rentals",
        subtitle: "Car Listings",
        addNew: "Add New Car",
        noCars: "No cars available. Add your first car to get started!"
      },
      navigation: {
        next: "Next",
        previous: "Previous",
        back: "Back",
        finish: "Save Car",
      },
      quickForm: {
        subtitle: "",
        advancedIntro: ""
      },
      advancedToggle: {
        show: "Add optional details",
        hide: "Hide optional details"
      }
    },
    ro: {
      addCar: "Adaugă Mașină",
      editCar: "Editează Mașina",
      carName: "Numele Mașinii",
      make: "Marca",
      model: "Model",
      year: "An Fabricație",
      seats: "Număr de Locuri",
      doors: "Număr de Uși",
      transmission: "Transmisie",
      transmissionTypes: {
        automatic: "Automată",
        manual: "Manuală"
      },
      fuel: "Tip Combustibil",
      fuelTypes: {
        petrol: "Benzină",
        diesel: "Diesel",
        hybrid: "Hibrid",
        electric: "Electric"
      },
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
        engine: "Motor",
        horsepower: "Cai Putere",
        topSpeed: "Viteză Maximă (km/h)",
        acceleration: "Accelerație (0-100 km/h în secunde)",
        consumption: "Consum Combustibil (L/100km)",
        range: "Autonomie (km)",
        luggage: "Capacitate Portbagaj"
      },
      features: {
        title: "Dotări",
        comfort: "Confort",
        airConditioning: "Aer Condiționat",
        leatherSeats: "Scaune din Piele",
        heatedSeats: "Scaune Încălzite",
        sunroof: "Trapă",
        panoramicRoof: "Acoperiș Panoramic",
        technology: "Tehnologie",
        bluetooth: "Bluetooth",
        navigation: "Sistem de Navigație",
        parkingSensors: "Senzori de Parcare",
        reverseCamera: "Cameră Marșarier",
        cruiseControl: "Cruise Control",
        safety: "Siguranță",
        abs: "ABS",
        airbags: "Airbag-uri",
        stabilityControl: "Control Stabilitate",
        tirePressureMonitor: "Monitor Presiune Anvelope",
        convenience: "Confort",
        centralLocking: "Închidere Centralizată",
        keylessEntry: "Acces Fără Cheie",
        powerWindows: "Geamuri Electrice",
        powerMirrors: "Oglinzi Electrice"
      },
      contact: {
        title: "Contact și Rezervări",
        name: "Nume Contact",
        phone: "Telefon Contact",
        email: "Email Contact",
        pickupLocation: "Locație Preluare",
        bookingNotes: "Note Rezervare"
      },
      formTabs: {
        basic: "Informații Bază",
        specs: "Specificații",
        pricing: "Prețuri",
        features: "Dotări",
        contact: "Contact"
      },
      // NEW: Filter translations
      search: {
        placeholder: "Caută mașini după nume, marcă, model...",
        filters: "Filtre",
        showFilters: "Arată Filtrele",
        hideFilters: "Ascunde Filtrele",
        clearFilters: "Șterge Toate Filtrele",
        resultsCount: "mașini găsite"
      },
      filters: {
        make: "Marcă",
        fuel: "Tip Combustibil",
        transmission: "Transmisie",
        year: "An",
        yearMin: "An Minim",
        yearMax: "An Maxim",
        seats: "Număr Locuri",
        seatsMin: "Locuri Minime",
        seatsMax: "Locuri Maxime",
        price: "Preț Zilnic (€)",
        priceMin: "Preț Minim",
        priceMax: "Preț Maxim",
        features: "Dotări",
        anyMake: "Orice Marcă",
        anyFuel: "Orice Combustibil",
        anyTransmission: "Orice Transmisie"
      },
      photos: "Fotografii (Max: 24)",
      noPhotos: "Fără imagine",
      cancel: "Anulează",
      save: "Salvează",
      delete: "Șterge",
      edit: "Editează",
      uploadingPhotos: "Se încarcă...",
      carList: {
        title: "Închirieri Auto",
        subtitle: "Lista Mașinilor",
        addNew: "Adaugă Mașină Nouă",
        noCars: "Nu există mașini disponibile. Adaugă prima mașină pentru a începe!"
      },
      navigation: {
        next: "Următorul",
        previous: "Anterior",
        back: "Înapoi",
        finish: "Salvează Mașina",
      },
      quickForm: {
        subtitle: "",
        advancedIntro: ""
      },
      advancedToggle: {
        show: "Adaugă detalii opționale",
        hide: "Ascunde detaliile opționale"
      }
    }
  };
  
  const t = translations[language];
  
  // Enhanced image rendering for car cards with proper error handling
  const renderCarImage = (car) => {
    const imageUrl = getCarPhotoUrl(car);

    // Check if we have a previously recorded error for this car
    if (imageErrors[car.id]) {
      return (
        <div style={styles.placeholderImage}>
          <div className="text-center">
            <div className="text-4xl mb-2">🚗</div>
            <div>{getLocalizedContent(car.name, language, t.noPhotos)}</div>
          </div>
        </div>
      );
    }
    
    // If we have photos and no error yet, try to render the image
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={getLocalizedContent(car.name, language, t.noPhotos)}
          style={styles.carImage}
          onError={() => {
            console.error(`Failed to load image for car ${car.id}:`, imageUrl);
            setImageErrors(prev => ({...prev, [car.id]: true}));
          }}
        />
      );
    }
    
    // Fallback if no photos
    return (
      <div style={styles.placeholderImage}>
        <div className="text-center">
          <div className="text-4xl mb-2">🚗</div>
          <div>{getLocalizedContent(car.name, language, t.noPhotos)}</div>
        </div>
      </div>
    );
  };

  // Compact quick add form with only essential fields
  const renderQuickForm = () => {
    const gridStyle = isMobile ? styles.formGrid : styles.formGridDesktop;
    const monthLabels = language === 'en'
      ? { may: 'May', june: 'June', july: 'July', august: 'August', september: 'September', october: 'October' }
      : { may: 'Mai', june: 'Iunie', july: 'Iulie', august: 'August', september: 'Septembrie', october: 'Octombrie' };
    return (
      <div>
        <div style={gridStyle}>
          <div>
            <label style={styles.formLabel}>
              {t.make}
            </label>
            <input
              type="text"
              name="make"
              value={formData.make || ''}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.formLabel}>
              {t.model}
            </label>
            <input
              type="text"
              name="model"
              value={formData.model || ''}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
        </div>
        <div style={gridStyle}>
          <div>
            <label style={styles.formLabel}>
              {t.year}
            </label>
            <input
              type="number"
              name="year"
              value={formData.year || ''}
              onChange={handleInputChange}
              min="1900"
              max={new Date().getFullYear() + 1}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.formLabel}>
              {t.fuel}
            </label>
            <select
              name="fuel"
              value={formData.fuel || 'petrol'}
              onChange={handleInputChange}
              style={styles.select}
            >
              <option value="petrol">{t.fuelTypes.petrol}</option>
              <option value="diesel">{t.fuelTypes.diesel}</option>
              <option value="hybrid">{t.fuelTypes.hybrid}</option>
              <option value="electric">{t.fuelTypes.electric}</option>
            </select>
          </div>
        </div>
        <div style={styles.formSection}>
          <label style={styles.formLabel}>
            {t.photos}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            style={styles.fileInput}
          />
          <div style={styles.photosContainer}>
            {existingPhotos.map((photo, index) => {
              const normalizedPhoto = normalizeMediaItem(photo);
              return (
                <div key={`existing-${index}`} style={styles.photoPreview}>
                  {normalizedPhoto?.type === 'pdf' ? (
                    <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', fontSize: '12px', textAlign: 'center', padding: '4px'}}>
                      📄 {normalizedPhoto.name || 'PDF'}
                    </div>
                  ) : (
                    <img
                      src={normalizedPhoto?.url}
                      alt={`Photo ${index}`}
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(index, true)}
                    style={styles.deleteButton}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {previewUrls.map((file, index) => (
              <div key={`preview-${index}`} style={styles.photoPreview}>
                <img
                  src={file?.url}
                  alt={`Preview ${index}`}
                  style={{width: '100%', height: '100%', objectFit: 'cover'}}
                />
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(index, false)}
                  style={styles.deleteButton}
                >
                  ×
                </button>
              </div>
            ))}
            </div>
          <div style={styles.formSection}>
            <label style={styles.formLabel}>
              {language === 'en' ? 'Documents (PDF)' : 'Documente (PDF)'}
            </label>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleDocumentChange}
              style={styles.fileInput}
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
      </div>
    );
  };

  // NEW: Render the filter and search section
  const renderFiltersSection = () => {
    const filterGridStyle = isMobile ? styles.filterGridMobile : styles.filterGrid;
    const uniqueMakes = getUniqueCarMakes();

    return (
      <div style={styles.filterContainer}>
        {/* Search Bar */}
        <input
          type="text"
          placeholder={t.search.placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchBar}
        />

        {/* Filter Toggle */}
        <div 
  style={styles.filterToggle}
  onClick={() => setShowFilters(!showFilters)}
>
  <span style={styles.filterToggleText}>
    {showFilters ? t.search.hideFilters : t.search.showFilters}
  </span>
  <span style={{fontSize: '10px'}}>
    {showFilters ? '▲' : '▼'}
  </span>
</div>

        {/* Filter Content */}
        {showFilters && (
          <div style={styles.filterContent}>
            {/* Basic Filters Row */}
            <div style={filterGridStyle}>
              {/* Make Filter */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.make}</label>
                <select
                  value={filters.make}
                  onChange={(e) => handleFilterChange('make', e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">{t.filters.anyMake}</option>
                  {uniqueMakes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>

              {/* Fuel Filter */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.fuel}</label>
                <select
                  value={filters.fuel}
                  onChange={(e) => handleFilterChange('fuel', e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">{t.filters.anyFuel}</option>
                  <option value="petrol">{t.fuelTypes.petrol}</option>
                  <option value="diesel">{t.fuelTypes.diesel}</option>
                  <option value="hybrid">{t.fuelTypes.hybrid}</option>
                  <option value="electric">{t.fuelTypes.electric}</option>
                </select>
              </div>

              {/* Transmission Filter */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.transmission}</label>
                <select
                  value={filters.transmission}
                  onChange={(e) => handleFilterChange('transmission', e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">{t.filters.anyTransmission}</option>
                  <option value="automatic">{t.transmissionTypes.automatic}</option>
                  <option value="manual">{t.transmissionTypes.manual}</option>
                </select>
              </div>

              {/* Year Range */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.yearMin}</label>
                <input
                  type="number"
                  placeholder="1900"
                  value={filters.yearMin}
                  onChange={(e) => handleFilterChange('yearMin', e.target.value)}
                  style={styles.filterInput}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.yearMax}</label>
                <input
                  type="number"
                  placeholder={new Date().getFullYear().toString()}
                  value={filters.yearMax}
                  onChange={(e) => handleFilterChange('yearMax', e.target.value)}
                  style={styles.filterInput}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              {/* Seats Range */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.seatsMin}</label>
                <input
                  type="number"
                  placeholder="1"
                  value={filters.seatsMin}
                  onChange={(e) => handleFilterChange('seatsMin', e.target.value)}
                  style={styles.filterInput}
                  min="1"
                  max="20"
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.seatsMax}</label>
                <input
                  type="number"
                  placeholder="20"
                  value={filters.seatsMax}
                  onChange={(e) => handleFilterChange('seatsMax', e.target.value)}
                  style={styles.filterInput}
                  min="1"
                  max="20"
                />
              </div>

              {/* Price Range */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.priceMin}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                  style={styles.filterInput}
                  min="0"
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t.filters.priceMax}</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={filters.priceMax}
                  onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                  style={styles.filterInput}
                  min="0"
                />
              </div>
            </div>

            {/* Features Filter - Compact horizontal layout */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>{t.filters.features}</label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: isMobile ? '6px' : '12px',
                marginTop: '4px'
              }}>
                {[
                  { key: 'airConditioning', label: t.features.airConditioning },
                  { key: 'bluetooth', label: t.features.bluetooth },
                  { key: 'navigation', label: t.features.navigation },
                  { key: 'leatherSeats', label: t.features.leatherSeats },
                  { key: 'sunroof', label: t.features.sunroof },
                  { key: 'cruiseControl', label: t.features.cruiseControl }
                ].map(feature => (
                  <div key={feature.key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: '#374151',
                    whiteSpace: 'nowrap'
                  }}>
                    <input
                      type="checkbox"
                      id={`filter-${feature.key}`}
                      checked={filters.features.includes(feature.key)}
                      onChange={(e) => handleFeatureFilterChange(feature.key, e.target.checked)}
                      style={{marginRight: '4px', width: '14px', height: '14px'}}
                    />
                    <label htmlFor={`filter-${feature.key}`}>{feature.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Clear Filters Button */}
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '6px'}}>
              <button
                onClick={clearFilters}
                style={styles.clearFiltersButton}
              >
                {t.search.clearFilters}
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        {filteredCars.length > 0 && (
          <div style={styles.resultsCount}>
            {filteredCars.length} {t.search.resultsCount}
          </div>
        )}
      </div>
    );
  };
  
  // Form step indicators for mobile
  const renderFormSteps = () => {
    const tabs = ['basic', 'specs', 'pricing', 'features', 'contact'];
    const currentIndex = tabs.indexOf(activeTab);
    
    return (
      <div style={styles.formStepsIndicator}>
        {tabs.map((tab, index) => (
          <div
            key={tab}
            style={{
              ...styles.formStep,
              ...(index <= currentIndex ? styles.formStepActive : {})
            }}
          />
        ))}
      </div>
    );
  };
  
  // Mobile-friendly form navigation
  const renderFormNavigation = () => {
    const tabs = ['basic', 'specs', 'pricing', 'features', 'contact'];
    const currentIndex = tabs.indexOf(activeTab);
    const isLastTab = currentIndex === tabs.length - 1;
    const isFirstTab = currentIndex === 0;
    
    return (
      <div style={styles.formNavigation}>
        {!isFirstTab && (
          <div
            style={styles.navButton}
            onClick={navigateToPrevTab}
          >
            {t.navigation.previous}
          </div>
        )}
        
        {isLastTab ? (
          <div
            style={{
              ...styles.navButton,
              ...styles.navButtonPrimary
            }}
            onClick={isAddingCar ? handleAddCar : handleUpdateCar}
          >
            {t.navigation.finish}
          </div>
        ) : (
          <div
            style={{
              ...styles.navButton,
              ...styles.navButtonPrimary
            }}
            onClick={navigateToNextTab}
          >
            {t.navigation.next}
          </div>
        )}
      </div>
    );
  };
  
  // Tab navigation system for the form
  const renderFormTab = () => {
    const gridStyle = isMobile ? styles.formGrid : styles.formGridDesktop;
    
    switch(activeTab) {
      case 'basic':
        return (
          <div>
            <div style={gridStyle}>
              <div>
                <label style={styles.formLabel}>
                  {t.seats}
                </label>
                <input
                  type="number"
                  name="seats"
                  value={formData.seats || ''}
                  onChange={handleInputChange}
                  min="1"
                  max="20"
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.doors}
                </label>
                <input
                  type="number"
                  name="doors"
                  value={formData.doors || ''}
                  onChange={handleInputChange}
                  min="1"
                  max="8"
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.transmission}
                </label>
                <select
                  name="transmission"
                  value={formData.transmission || 'automatic'}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  <option value="automatic">{t.transmissionTypes.automatic}</option>
                  <option value="manual">{t.transmissionTypes.manual}</option>
                </select>
              </div>
            </div>
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.description}
              </label>
              <textarea
                name={`description_${language}`}
                value={formData[`description_${language}`] || ''}
                onChange={handleInputChange}
                rows="4"
                style={styles.textarea}
              />
            </div>
          </div>
        );
      case 'specs':
        return (
          <div>
            <h3 style={styles.sectionTitle}>{t.specs.title}</h3>
            <div style={gridStyle}>
              <div>
                <label style={styles.formLabel}>
                  {t.specs.engine}
                </label>
                <input
                  type="text"
                  name="engine"
                  value={formData.specs.engine || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.specs.horsepower}
                </label>
                <input
                  type="text"
                  name="horsepower"
                  value={formData.specs.horsepower || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.specs.topSpeed}
                </label>
                <input
                  type="text"
                  name="topSpeed"
                  value={formData.specs.topSpeed || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.specs.acceleration}
                </label>
                <input
                  type="text"
                  name="acceleration"
                  value={formData.specs.acceleration || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.specs.consumption}
                </label>
                <input
                  type="text"
                  name="consumption"
                  value={formData.specs.consumption || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.specs.range}
                </label>
                <input
                  type="text"
                  name="range"
                  value={formData.specs.range || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.specs.luggage}
                </label>
                <input
                  type="text"
                  name="luggage"
                  value={formData.specs.luggage || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
            </div>
          </div>
        );
      case 'pricing':
        return (
          <div>
            <h3 style={styles.sectionTitle}>{language === 'en' ? 'Pricing' : 'Prețuri'}</h3>
            <h4 style={styles.sectionSubtitle}>
              {t.price.monthly}
            </h4>
            <div style={gridStyle}>
              <div>
                <label style={styles.formLabel}>
                  {t.price.may}
                </label>
                <div style={styles.currencyInput}>
                  <span style={styles.currencySymbol}>
                    €
                  </span>
                  <input
                    type="text"
                    name="may"
                    value={formData.monthlyPrices.may || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    style={styles.currencyTextInput}
                  />
                </div>
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.price.june}
                </label>
                <div style={styles.currencyInput}>
                  <span style={styles.currencySymbol}>
                    €
                  </span>
                  <input
                    type="text"
                    name="june"
                    value={formData.monthlyPrices.june || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    style={styles.currencyTextInput}
                  />
                </div>
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.price.july}
                </label>
                <div style={styles.currencyInput}>
                  <span style={styles.currencySymbol}>
                    €
                  </span>
                  <input
                    type="text"
                    name="july"
                    value={formData.monthlyPrices.july || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    style={styles.currencyTextInput}
                  />
                </div>
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.price.august}
                </label>
                <div style={styles.currencyInput}>
                  <span style={styles.currencySymbol}>
                    €
                  </span>
                  <input
                    type="text"
                    name="august"
                    value={formData.monthlyPrices.august || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    style={styles.currencyTextInput}
                  />
                </div>
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.price.september}
                </label>
                <div style={styles.currencyInput}>
                  <span style={styles.currencySymbol}>
                    €
                  </span>
                  <input
                    type="text"
                    name="september"
                    value={formData.monthlyPrices.september || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    style={styles.currencyTextInput}
                  />
                </div>
              </div>
              <div>
                <label style={styles.formLabel}>
                  {t.price.october}
                </label>
                <div style={styles.currencyInput}>
                  <span style={styles.currencySymbol}>
                    €
                  </span>
                  <input
                    type="text"
                    name="october"
                    value={formData.monthlyPrices.october || ''}
                    onChange={(e) => handleInputChange(e, 'monthlyPrices')}
                    style={styles.currencyTextInput}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'features':
        return (
          <div>
            <h3 style={styles.sectionTitle}>{t.features.title}</h3>
            {/* Comfort */}
            <h4 style={styles.sectionSubtitle}>{t.features.comfort}</h4>
            <div style={gridStyle}>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="airConditioning"
                  checked={formData.features.airConditioning || false}
                  onChange={() => toggleFeature('features', 'airConditioning')}
                  style={styles.checkbox}
                />
                <label htmlFor="airConditioning">
                  {t.features.airConditioning}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="leatherSeats"
                  checked={formData.features.leatherSeats || false}
                  onChange={() => toggleFeature('features', 'leatherSeats')}
                  style={styles.checkbox}
                />
                <label htmlFor="leatherSeats">
                  {t.features.leatherSeats}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="heatedSeats"
                  checked={formData.features.heatedSeats || false}
                  onChange={() => toggleFeature('features', 'heatedSeats')}
                  style={styles.checkbox}
                />
                <label htmlFor="heatedSeats">
                  {t.features.heatedSeats}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="sunroof"
                  checked={formData.features.sunroof || false}
                  onChange={() => toggleFeature('features', 'sunroof')}
                  style={styles.checkbox}
                />
                <label htmlFor="sunroof">
                  {t.features.sunroof}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="panoramicRoof"
                  checked={formData.features.panoramicRoof || false}
                  onChange={() => toggleFeature('features', 'panoramicRoof')}
                  style={styles.checkbox}
                />
                <label htmlFor="panoramicRoof">
                  {t.features.panoramicRoof}
                </label>
              </div>
            </div>
            {/* Technology */}
            <h4 style={styles.sectionSubtitle}>{t.features.technology}</h4>
            <div style={gridStyle}>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="bluetooth"
                  checked={formData.features.bluetooth || false}
                  onChange={() => toggleFeature('features', 'bluetooth')}
                  style={styles.checkbox}
                />
                <label htmlFor="bluetooth">
                  {t.features.bluetooth}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="navigation"
                  checked={formData.features.navigation || false}
                  onChange={() => toggleFeature('features', 'navigation')}
                  style={styles.checkbox}
                />
                <label htmlFor="navigation">
                  {t.features.navigation}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="parkingSensors"
                  checked={formData.features.parkingSensors || false}
                  onChange={() => toggleFeature('features', 'parkingSensors')}
                  style={styles.checkbox}
                />
                <label htmlFor="parkingSensors">
                  {t.features.parkingSensors}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="reverseCamera"
                  checked={formData.features.reverseCamera || false}
                  onChange={() => toggleFeature('features', 'reverseCamera')}
                  style={styles.checkbox}
                />
                <label htmlFor="reverseCamera">
                  {t.features.reverseCamera}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="cruiseControl"
                  checked={formData.features.cruiseControl || false}
                  onChange={() => toggleFeature('features', 'cruiseControl')}
                  style={styles.checkbox}
                />
                <label htmlFor="cruiseControl">
                  {t.features.cruiseControl}
                </label>
              </div>
            </div>
            {/* Safety */}
            <h4 style={styles.sectionSubtitle}>{t.features.safety}</h4>
            <div style={gridStyle}>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="abs"
                  checked={formData.features.abs || false}
                  onChange={() => toggleFeature('features', 'abs')}
                  style={styles.checkbox}
                />
                <label htmlFor="abs">
                  {t.features.abs}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="airbags"
                  checked={formData.features.airbags || false}
                  onChange={() => toggleFeature('features', 'airbags')}
                  style={styles.checkbox}
                />
                <label htmlFor="airbags">
                  {t.features.airbags}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="stabilityControl"
                  checked={formData.features.stabilityControl || false}
                  onChange={() => toggleFeature('features', 'stabilityControl')}
                  style={styles.checkbox}
                />
                <label htmlFor="stabilityControl">
                  {t.features.stabilityControl}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="tirePressureMonitor"
                  checked={formData.features.tirePressureMonitor || false}
                  onChange={() => toggleFeature('features', 'tirePressureMonitor')}
                  style={styles.checkbox}
                />
                <label htmlFor="tirePressureMonitor">
                  {t.features.tirePressureMonitor}
                </label>
              </div>
            </div>
            {/* Convenience */}
            <h4 style={styles.sectionSubtitle}>{t.features.convenience}</h4>
            <div style={gridStyle}>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="centralLocking"
                  checked={formData.features.centralLocking || false}
                  onChange={() => toggleFeature('features', 'centralLocking')}
                  style={styles.checkbox}
                />
                <label htmlFor="centralLocking">
                  {t.features.centralLocking}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="keylessEntry"
                  checked={formData.features.keylessEntry || false}
                  onChange={() => toggleFeature('features', 'keylessEntry')}
                  style={styles.checkbox}
                />
                <label htmlFor="keylessEntry">
                  {t.features.keylessEntry}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="powerWindows"
                  checked={formData.features.powerWindows || false}
                  onChange={() => toggleFeature('features', 'powerWindows')}
                  style={styles.checkbox}
                />
                <label htmlFor="powerWindows">
                  {t.features.powerWindows}
                </label>
              </div>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="powerMirrors"
                  checked={formData.features.powerMirrors || false}
                  onChange={() => toggleFeature('features', 'powerMirrors')}
                  style={styles.checkbox}
                />
                <label htmlFor="powerMirrors">
                  {t.features.powerMirrors}
                </label>
              </div>
            </div>
          </div>
        );
      case 'contact':
        return (
          <div>
            <h3 style={styles.sectionTitle}>{t.contact.title}</h3>
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.contact.name}
              </label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName || ''}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.contact.phone}
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone || ''}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.contact.email}
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail || ''}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.contact.pickupLocation}
              </label>
              <input
                type="text"
                name={`pickupLocation_${language}`}
                value={formData[`pickupLocation_${language}`] || ''}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.contact.bookingNotes}
              </label>
              <textarea
                name={`bookingNotes_${language}`}
                value={formData[`bookingNotes_${language}`] || ''}
                onChange={handleInputChange}
                rows="4"
                style={styles.textarea}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div style={styles.container}>
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
            <span style={{ fontSize: '1.2rem' }}>✓</span>
            <span style={{ fontWeight: '500' }}>{successMessage}</span>
          </div>
        </div>
      )}

      {(isAddingCar || isEditingCar) && (
        <div style={styles.header}>
          <h1 style={styles.title}>{t.carList.title}</h1>
        </div>
      )}
      {!isAddingCar && !isEditingCar && (
        <div className="sr-only" aria-hidden="true">
          {t.carList.title}
        </div>
      )}
      
      {/* Add/Edit Forms */}
      {(isAddingCar || isEditingCar) && (
        <div style={styles.card}>
          <div style={styles.formCardHeader}>
            <h2 style={styles.subtitle}>
              {isAddingCar ? t.addCar : t.editCar}
            </h2>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAddingCar(false);
                setIsEditingCar(false);
                setCurrentCar(null);
              }}
              style={styles.buttonSecondary}
            >
              {t.cancel}
            </button>
          </div>

          <div style={styles.formContent}>
            {renderQuickForm()}

            <div style={styles.toggleRow}>
              <button
                type="button"
                onClick={() => {
                  setShowAdvanced(prev => {
                    const next = !prev;
                    if (!next) {
                      setActiveTab('basic');
                    }
                    return next;
                  });
                }}
                style={styles.toggleButton}
              >
                {showAdvanced ? t.advancedToggle.hide : t.advancedToggle.show}
              </button>
            </div>

            {showAdvanced && (
              <>
                {isMobile && renderFormSteps()}
                
                {!isMobile && (
                  <div style={styles.tabContainer}>
                    {Object.entries(t.formTabs).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        style={{
                          ...styles.tab,
                          ...(activeTab === key ? styles.activeTab : styles.inactiveTab)
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{marginTop: '8px'}}>
                  {renderFormTab()}
                </div>

                {isMobile && renderFormNavigation()}
              </>
            )}
            
            {/* Upload progress indicator */}
            {isUploading && (
              <div style={{marginTop: '16px'}}>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                  <div style={{width: '16px', height: '16px', marginRight: '8px', borderTop: '2px solid #3b82f6', borderRight: '2px solid transparent', borderBottom: '2px solid #3b82f6', borderLeft: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                  <span>{t.uploadingPhotos} {Math.round(uploadProgress)}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${uploadProgress}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
            {!isUploading && (
              <div style={{marginTop: '24px', display: 'flex', justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  onClick={isAddingCar ? handleAddCar : handleUpdateCar}
                  style={styles.buttonPrimary}
                >
                  {t.save}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Car List */}
      {!isAddingCar && !isEditingCar && (
        <div className="page-surface space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold heading-display">{t.carList.title}</h1>
              <div className="text-xs text-slate-500 mt-1">
                {filteredCars.length} {t.search.resultsCount}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAddingCar(true);
              }}
              className="btn-primary"
            >
              {t.carList.addNew}
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t.search.placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-premium input-premium--icon"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 21l-4.35-4.35m1.6-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="btn-soft"
              >
                {showFilters ? t.search.hideFilters : t.search.showFilters}
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-soft"
                >
                  {t.search.clearFilters}
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.make}</div>
                <select
                  value={filters.make}
                  onChange={(e) => handleFilterChange('make', e.target.value)}
                  className="input-premium"
                >
                  <option value="">{t.filters.anyMake}</option>
                  {getUniqueCarMakes().map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.fuel}</div>
                <select
                  value={filters.fuel}
                  onChange={(e) => handleFilterChange('fuel', e.target.value)}
                  className="input-premium"
                >
                  <option value="">{t.filters.anyFuel}</option>
                  <option value="petrol">{t.fuelTypes.petrol}</option>
                  <option value="diesel">{t.fuelTypes.diesel}</option>
                  <option value="hybrid">{t.fuelTypes.hybrid}</option>
                  <option value="electric">{t.fuelTypes.electric}</option>
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.transmission}</div>
                <select
                  value={filters.transmission}
                  onChange={(e) => handleFilterChange('transmission', e.target.value)}
                  className="input-premium"
                >
                  <option value="">{t.filters.anyTransmission}</option>
                  <option value="automatic">{t.transmissionTypes.automatic}</option>
                  <option value="manual">{t.transmissionTypes.manual}</option>
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.yearMin}</div>
                <input
                  type="number"
                  placeholder="1900"
                  value={filters.yearMin}
                  onChange={(e) => handleFilterChange('yearMin', e.target.value)}
                  className="input-premium"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.yearMax}</div>
                <input
                  type="number"
                  placeholder={new Date().getFullYear().toString()}
                  value={filters.yearMax}
                  onChange={(e) => handleFilterChange('yearMax', e.target.value)}
                  className="input-premium"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.seatsMin}</div>
                <input
                  type="number"
                  placeholder="1"
                  value={filters.seatsMin}
                  onChange={(e) => handleFilterChange('seatsMin', e.target.value)}
                  className="input-premium"
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.seatsMax}</div>
                <input
                  type="number"
                  placeholder="20"
                  value={filters.seatsMax}
                  onChange={(e) => handleFilterChange('seatsMax', e.target.value)}
                  className="input-premium"
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.priceMin}</div>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                  className="input-premium"
                  min="0"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.filters.priceMax}</div>
                <input
                  type="number"
                  placeholder="1000"
                  value={filters.priceMax}
                  onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                  className="input-premium"
                  min="0"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <div className="text-xs font-semibold text-slate-500">{t.filters.features}</div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                  {[
                    { key: 'airConditioning', label: t.features.airConditioning },
                    { key: 'bluetooth', label: t.features.bluetooth },
                    { key: 'navigation', label: t.features.navigation },
                    { key: 'leatherSeats', label: t.features.leatherSeats },
                    { key: 'sunroof', label: t.features.sunroof },
                    { key: 'cruiseControl', label: t.features.cruiseControl }
                  ].map(feature => (
                    <label key={feature.key} htmlFor={`filter-${feature.key}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`filter-${feature.key}`}
                        checked={filters.features.includes(feature.key)}
                        onChange={(e) => handleFeatureFilterChange(feature.key, e.target.checked)}
                      />
                      {feature.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {searchTerm && (
                <span className="chip">
                  "{searchTerm.length > 18 ? `${searchTerm.substring(0, 18)}...` : searchTerm}"
                </span>
              )}
              {filters.make && <span className="chip">{t.filters.make}: {filters.make}</span>}
              {filters.fuel && <span className="chip">{t.filters.fuel}: {t.fuelTypes[filters.fuel] || filters.fuel}</span>}
              {filters.transmission && <span className="chip">{t.filters.transmission}: {t.transmissionTypes[filters.transmission]}</span>}
              {(filters.yearMin || filters.yearMax) && (
                <span className="chip">
                  {t.filters.year}: {filters.yearMin || '1900'} - {filters.yearMax || new Date().getFullYear()}
                </span>
              )}
              {(filters.seatsMin || filters.seatsMax) && (
                <span className="chip">
                  {t.filters.seats}: {filters.seatsMin || '1'} - {filters.seatsMax || '20'}
                </span>
              )}
              {(filters.priceMin || filters.priceMax) && (
                <span className="chip">
                  {t.filters.price}: €{filters.priceMin || '0'} - €{filters.priceMax || '∞'}
                </span>
              )}
              {filters.features.length > 0 && (
                <span className="chip">{t.filters.features}: {filters.features.length}</span>
              )}
            </div>
          )}
          
          {filteredCars.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px 0', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'}}>
              <p style={{color: '#6b7280'}}>
                {cars.length === 0 ? t.carList.noCars : `No cars match your current filters.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredCars.map((car) => (
                <div key={car.id} className="card-premium overflow-hidden flex flex-col">
                  <div className="relative h-44 bg-gray-100">
                    {renderCarImage(car)}
                  </div>
                  <div className="p-3 flex flex-col flex-grow">
                    <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                      {getLocalizedContent(car.name, language)}
                    </h3>
                    <div className="text-sm text-gray-600">
                      <p className="mb-1">
                        {car.make} {car.model} {car.year && `(${car.year})`}
                      </p>
                      <p>{car.seats && `${car.seats} ${language === 'en' ? 'seats' : 'locuri'}`} • {car.transmission && t.transmissionTypes[car.transmission]}</p>
                      {(() => {
                        const monthlyEntries = car.pricing?.monthly
                          ? Object.entries(car.pricing.monthly).filter(([, val]) => val)
                          : [];
                        const cheapestMonthlyPrice = monthlyEntries.reduce((min, [, val]) => {
                          const price = parseFloat(val);
                          if (Number.isNaN(price)) return min;
                          if (min === null || price < min) return price;
                          return min;
                        }, null);
                        const displayPrice = car.pricing?.daily || (cheapestMonthlyPrice !== null ? cheapestMonthlyPrice : null);
                        if (!displayPrice) return null;
                        return (
                          <p className="mt-2 text-sm font-semibold text-gray-900">
                            €{displayPrice}/{language === 'en' ? 'day' : 'zi'}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedCar(car)}
                        className="flex-1 btn-soft"
                      >
                        {t.view || 'Vezi'}
                      </button>
                      {getCarDocuments(car).length > 0 && (
                        <a
                          href={getCarDocuments(car)[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-soft"
                          style={{ width: '44px', height: '44px', padding: 0 }}
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
                        onClick={() => startEditingCar(car)}
                        className="flex-1 btn-soft"
                      >
                        {t.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(language === 'en' ? 'Are you sure you want to delete this car?' : 'Ești sigur că vrei să ștergi această mașină?')) {
                            handleDeleteCar(car.id);
                          }
                        }}
                        className="btn-soft btn-soft-danger"
                        style={{ width: '44px', height: '44px', padding: 0 }}
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
              ))}
            </div>
          )}
        </div>
      )}
      {selectedCar && (
        <CarViewModal
          car={selectedCar}
          onClose={() => setSelectedCar(null)}
          language={language}
          t={t}
          getLocalizedContent={getLocalizedContent}
        />
      )}
    </div>
  );
}

export default Cars;

// View modal for cars (read-only overview)
function CarViewModal({ car, onClose, language, t, getLocalizedContent }) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  if (!car) return null;

  const mediaItems = [
    ...(car.photos || []).map(normalizeMediaItem).filter(Boolean),
    ...(car.photoUrl ? [normalizeMediaItem({ url: car.photoUrl, type: 'image' })] : [])
  ];
  const documentItems = (car.documents || []).map(normalizeMediaItem).filter(Boolean);
  const imageItems = mediaItems.filter(item => item.type !== 'pdf' && item.url);
  const pdfItems = [
    ...mediaItems.filter(item => item.type === 'pdf' && item.url),
    ...documentItems
  ];
  const photoUrls = imageItems.map(item => item.url);

  const monthlyEntries = car.pricing?.monthly
    ? Object.entries(car.pricing.monthly).filter(([, val]) => val)
    : [];
  const cheapestMonthlyPrice = monthlyEntries.reduce((min, [, val]) => {
    const price = parseFloat(val);
    if (Number.isNaN(price)) return min;
    if (min === null || price < min) return price;
    return min;
  }, null);
  const displayDailyPrice = car.pricing?.daily || (cheapestMonthlyPrice !== null ? cheapestMonthlyPrice : '0');

  // Flatten features for display
  const featuresList = [];
  if (car.features) {
    Object.entries(car.features).forEach(([key, value]) => {
      if (value && t.features[key]) {
        featuresList.push(t.features[key]);
      }
    });
  }

  const displayName = getLocalizedContent(car.name, language) || `${car.make || ''} ${car.model || ''}`;
  const displayLocation = getLocalizedContent(car.pickupLocation, language);
  const displayBookingNotes = getLocalizedContent(car.bookingNotes, language);
  const hasContactInfo = Boolean(car.contact?.name || car.contact?.phone || car.contact?.email);
  const hasBookingInfo = Boolean(displayLocation || displayBookingNotes);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t.navigation.back}
          </button>
          <div className="flex items-center gap-3">
             <button
              onClick={onClose}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{displayName}</h1>
            {displayLocation && (
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {displayLocation}
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
                    {pdfItems.length > 0 ? (language === 'en' ? 'No images available. See documents below.' : 'Nicio imagine disponibilă. Vezi documentele de mai jos.') : t.noPhotos}
                  </div>
                );

                const activeUrl = photoUrls[activePhotoIndex] || photoUrls[0];

                return (
                  <div className="space-y-4">
                    <div className="bg-gray-100 rounded-lg overflow-hidden relative shadow-md group">
                      <img
                        src={activeUrl}
                        alt="Car cover"
                        className="w-full h-64 sm:h-96 object-cover"
                      />
                      
                      {/* Navigation Arrows */}
                      {photoUrls.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newIndex = activePhotoIndex === 0 ? photoUrls.length - 1 : activePhotoIndex - 1;
                              setActivePhotoIndex(newIndex);
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
                              const newIndex = activePhotoIndex === photoUrls.length - 1 ? 0 : activePhotoIndex + 1;
                              setActivePhotoIndex(newIndex);
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
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                              idx === activePhotoIndex ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent opacity-70 hover:opacity-100'
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

              {/* Description */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.description}</h2>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                  {getLocalizedContent(car.description, language) || (
                    <span className="text-gray-400 italic">No description available</span>
                  )}
                </div>
              </div>

              {/* Features/Amenities */}
              {featuresList.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.features.title}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {featuresList.map((item, idx) => (
                      <div key={idx} className="flex items-center p-2 bg-gray-50 rounded">
                        <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Sticky Details */}
            <div className="col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-6 space-y-6">
                {/* Price */}
                <div>
                  <div className="text-3xl font-bold text-indigo-600 mb-1">
                    €{displayDailyPrice || '0'}
                  </div>
                  <div className="text-gray-500 text-sm">
                    / {language === 'en' ? 'day' : 'zi'}
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Key Specs */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t.seats}</span>
                    <span className="font-medium text-gray-900">{car.seats || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t.doors}</span>
                    <span className="font-medium text-gray-900">{car.doors || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t.transmission}</span>
                    <span className="font-medium text-gray-900">{t.transmissionTypes[car.transmission] || car.transmission || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t.fuel}</span>
                    <span className="font-medium text-gray-900">{t.fuelTypes[car.fuel] || car.fuel || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t.year}</span>
                    <span className="font-medium text-gray-900">{car.year || '-'}</span>
                  </div>
                </div>

                {/* Monthly Pricing */}
                {monthlyEntries.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                     <h3 className="font-medium text-gray-900 mb-3">{t.price.monthly}</h3>
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
                
                {/* Contact Info if available */}
                {(hasContactInfo || hasBookingInfo) && (
                   <div className="mt-4 pt-4 border-t border-gray-100">
                     <h3 className="font-medium text-gray-900 mb-3">{t.contact.title}</h3>
                     <div className="text-sm space-y-1">
                        {car.contact?.name && <p><span className="text-gray-600">{t.contact.name}:</span> {car.contact.name}</p>}
                        {car.contact?.phone && <p><span className="text-gray-600">{t.contact.phone}:</span> {car.contact.phone}</p>}
                        {car.contact?.email && <p><span className="text-gray-600">{t.contact.email}:</span> {car.contact.email}</p>}
                        {displayLocation && <p><span className="text-gray-600">{t.contact.pickupLocation}:</span> {displayLocation}</p>}
                        {displayBookingNotes && (
                          <p className="whitespace-pre-line">
                            <span className="text-gray-600">{t.contact.bookingNotes}:</span> {displayBookingNotes}
                          </p>
                        )}
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
}
