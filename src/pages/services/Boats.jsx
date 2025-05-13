// Boats component with updated pricing structure - inline styles
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db, storage } from '../../firebase/config';

// Common styles for reuse
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a202c'
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px'
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    marginBottom: '20px'
  },
  form: {
    padding: '24px',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  formSection: {
    marginBottom: '20px'
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
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    marginBottom: '12px'
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    marginBottom: '12px',
    minHeight: '100px'
  },
  fileInput: {
    marginBottom: '12px'
  },
  flexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '8px'
  },
  checkbox: {
    marginRight: '8px'
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer'
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    cursor: 'pointer'
  },
  buttonDanger: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer'
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px' 
  },
  tab: {
    padding: '8px 16px',
    marginRight: '12px',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer'
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
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '14px'
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(45%, 1fr))',
    gap: '16px',
    marginBottom: '20px'
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
  boatListContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  boatCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  boatImageContainer: {
    height: '200px',
    backgroundColor: '#f3f4f6'
  },
  boatImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  boatCardContent: {
    padding: '16px'
  },
  boatCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#1f2937'
  },
  boatCardDetails: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px'
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '16px'
  },
  currencyInput: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  currencySymbol: {
    position: 'absolute',
    left: '12px',
    fontSize: '14px',
    color: '#6b7280'
  },
  currencyTextInput: {
    width: '100%',
    padding: '8px 12px 8px 24px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
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
    marginLeft: '24px',
    marginTop: '8px',
    marginBottom: '16px'
  }
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
      switchLanguage: "Switch to Romanian"
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
      switchLanguage: "Schimbă în Engleză"
    }
  };
  
  const t = translations[language];
  
  // Tab navigation system for the form
  const renderFormTab = () => {
    switch(activeTab) {
      case 'basic':
        return (
          <div>
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.boatName}
              </label>
              <input
                type="text"
                name={`name_${language}`}
                value={formData[`name_${language}`] || ''}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>
            
            <div style={styles.twoColumnGrid}>
              <div>
                <label style={styles.formLabel}>
                  {t.length}
                </label>
                <input
                  type="number"
                  name="length"
                  value={formData.length || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  style={styles.input}
                />
              </div>
              
              <div>
                <label style={styles.formLabel}>
                  {t.capacity}
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity || ''}
                  onChange={handleInputChange}
                  min="0"
                  style={styles.input}
                />
              </div>
            </div>
            
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.cruisingArea}
              </label>
              <input
                type="text"
                name={`cruisingArea_${language}`}
                value={formData[`cruisingArea_${language}`] || ''}
                onChange={handleInputChange}
                style={styles.input}
              />
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
              
              {/* Photo previews */}
              <div style={styles.photosContainer}>
                {/* Existing photos */}
                {existingPhotos.map((photo, index) => (
                  <div key={`existing-${index}`} style={styles.photoPreview}>
                    <img 
                      src={photo.url} 
                      alt={`Photo ${index}`}
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(index, true)}
                      style={styles.deleteButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {/* New photo previews */}
                {previewUrls.map((url, index) => (
                  <div key={`preview-${index}`} style={styles.photoPreview}>
                    <img 
                      src={url} 
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
            </div>
          </div>
        );
      
      case 'specs':
        return (
          <div>
            <h3 style={styles.sectionTitle}>{t.specs.title}</h3>
            <div style={styles.twoColumnGrid}>
              <div>
                <label style={styles.formLabel}>
                  {t.specs.year}
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.specs.year || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  min="1900"
                  max={new Date().getFullYear()}
                  style={styles.input}
                />
              </div>
              
              <div>
                <label style={styles.formLabel}>
                  {t.specs.class}
                </label>
                <input
                  type="text"
                  name="class"
                  value={formData.specs.class || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              
              <div>
                <label style={styles.formLabel}>
                  {t.specs.cruisingSpeed}
                </label>
                <input
                  type="number"
                  name="cruisingSpeed"
                  value={formData.specs.cruisingSpeed || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  min="0"
                  style={styles.input}
                />
              </div>
              
              <div>
                <label style={styles.formLabel}>
                  {t.specs.maxSpeed}
                </label>
                <input
                  type="number"
                  name="maxSpeed"
                  value={formData.specs.maxSpeed || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  min="0"
                  style={styles.input}
                />
              </div>
              
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
                  {t.specs.horsePower}
                </label>
                <input
                  type="text"
                  name="horsePower"
                  value={formData.specs.horsePower || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              
              <div>
                <label style={styles.formLabel}>
                  {t.specs.cabins}
                </label>
                <input
                  type="text"
                  name="cabins"
                  value={formData.specs.cabins || ''}
                  onChange={(e) => handleInputChange(e, 'specs')}
                  style={styles.input}
                />
              </div>
              
              <div>
                <label style={styles.formLabel}>
                  {t.specs.crew}
                </label>
                <input
                  type="text"
                  name="crew"
                  value={formData.specs.crew || ''}
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
            
            <div style={{marginBottom: '20px'}}>
              <label style={styles.formLabel}>
                {t.price.daily}
              </label>
              <div style={styles.currencyInput}>
                <span style={styles.currencySymbol}>
                  €
                </span>
                <input
                  type="text"
                  name="priceDaily"
                  value={formData.priceDaily || ''}
                  onChange={handleInputChange}
                  style={styles.currencyTextInput}
                />
              </div>
            </div>
            
            <h4 style={styles.sectionSubtitle}>
              {t.price.monthly}
            </h4>
            
            <div style={styles.twoColumnGrid}>
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
            {/* Equipment Section */}
            <div style={{marginBottom: '30px'}}>
              <h3 style={styles.sectionTitle}>{t.equipment.title}</h3>
              <div style={styles.twoColumnGrid}>
                {/* Left Column */}
                <div>
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="tenders"
                      checked={formData.equipment.tenders || false}
                      onChange={() => toggleFeature('equipment', 'tenders')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="tenders">
                      {t.equipment.tenders}
                    </label>
                  </div>
                  
                  {formData.equipment.tenders && (
                    <div style={styles.nestedInput}>
                      <label style={styles.formLabel}>
                        {t.equipment.tenderCount}
                      </label>
                      <input
                        type="number"
                        name="tenderCount"
                        value={formData.equipment.tenderCount || ''}
                        onChange={(e) => handleInputChange(e, 'equipment')}
                        min="0"
                        style={styles.input}
                      />
                    </div>
                  )}
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="deckJacuzzi"
                      checked={formData.equipment.deckJacuzzi || false}
                      onChange={() => toggleFeature('equipment', 'deckJacuzzi')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="deckJacuzzi">
                      {t.equipment.deckJacuzzi}
                    </label>
                  </div>
                  
                  {formData.equipment.deckJacuzzi && (
                    <div style={styles.nestedInput}>
                      <label style={styles.formLabel}>
                        {t.equipment.deckJacuzziCount}
                      </label>
                      <input
                        type="number"
                        name="deckJacuzziCount"
                        value={formData.equipment.deckJacuzziCount || ''}
                        onChange={(e) => handleInputChange(e, 'equipment')}
                        min="0"
                        style={styles.input}
                      />
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div>
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="pool"
                      checked={formData.equipment.pool || false}
                      onChange={() => toggleFeature('equipment', 'pool')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="pool">
                      {t.equipment.pool}
                    </label>
                  </div>
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="antiJellyfishPool"
                      checked={formData.equipment.antiJellyfishPool || false}
                      onChange={() => toggleFeature('equipment', 'antiJellyfishPool')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="antiJellyfishPool">
                      {t.equipment.antiJellyfishPool}
                    </label>
                  </div>
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="aquapark"
                      checked={formData.equipment.aquapark || false}
                      onChange={() => toggleFeature('equipment', 'aquapark')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="aquapark">
                      {t.equipment.aquapark}
                    </label>
                  </div>
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="inflatablePlatform"
                      checked={formData.equipment.inflatablePlatform || false}
                      onChange={() => toggleFeature('equipment', 'inflatablePlatform')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="inflatablePlatform">
                      {t.equipment.inflatablePlatform}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Water Sports */}
            <div style={{marginBottom: '30px'}}>
              <h3 style={styles.sectionTitle}>{t.waterSports.title}</h3>
              <div style={styles.twoColumnGrid}>
                {/* Left Column */}
                <div>
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="jetSkis"
                      checked={formData.waterSports.jetSkis || false}
                      onChange={() => toggleFeature('waterSports', 'jetSkis')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="jetSkis">
                      {t.waterSports.jetSkis}
                    </label>
                  </div>
                  
                  {formData.waterSports.jetSkis && (
                    <div style={styles.nestedInput}>
                      <label style={styles.formLabel}>
                        {t.waterSports.jetSkiCount}
                      </label>
                      <input
                        type="number"
                        name="jetSkiCount"
                        value={formData.waterSports.jetSkiCount || ''}
                        onChange={(e) => handleInputChange(e, 'waterSports')}
                        min="0"
                        style={styles.input}
                      />
                    </div>
                  )}
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="seabobs"
                      checked={formData.waterSports.seabobs || false}
                      onChange={() => toggleFeature('waterSports', 'seabobs')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="seabobs">
                      {t.waterSports.seabobs}
                    </label>
                  </div>
                  
                  {formData.waterSports.seabobs && (
                    <div style={styles.nestedInput}>
                      <label style={styles.formLabel}>
                        {t.waterSports.seabobCount}
                      </label>
                      <input
                        type="number"
                        name="seabobCount"
                        value={formData.waterSports.seabobCount || ''}
                        onChange={(e) => handleInputChange(e, 'waterSports')}
                        min="0"
                        style={styles.input}
                      />
                    </div>
                  )}
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="paddleboards"
                      checked={formData.waterSports.paddleboards || false}
                      onChange={() => toggleFeature('waterSports', 'paddleboards')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="paddleboards">
                      {t.waterSports.paddleboards}
                    </label>
                  </div>
                  
                  {formData.waterSports.paddleboards && (
                    <div style={styles.nestedInput}>
                      <label style={styles.formLabel}>
                        {t.waterSports.paddleboardCount}
                      </label>
                      <input
                        type="number"
                        name="paddleboardCount"
                        value={formData.waterSports.paddleboardCount || ''}
                        onChange={(e) => handleInputChange(e, 'waterSports')}
                        min="0"
                        style={styles.input}
                      />
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div>
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="wakeboard"
                      checked={formData.waterSports.wakeboard || false}
                      onChange={() => toggleFeature('waterSports', 'wakeboard')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="wakeboard">
                      {t.waterSports.wakeboard}
                    </label>
                  </div>
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="waterSkis"
                      checked={formData.waterSports.waterSkis || false}
                      onChange={() => toggleFeature('waterSports', 'waterSkis')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="waterSkis">
                      {t.waterSports.waterSkis}
                    </label>
                  </div>
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="snorkelingGear"
                      checked={formData.waterSports.snorkelingGear || false}
                      onChange={() => toggleFeature('waterSports', 'snorkelingGear')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="snorkelingGear">
                      {t.waterSports.snorkelingGear}
                    </label>
                  </div>
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="fishingGear"
                      checked={formData.waterSports.fishingGear || false}
                      onChange={() => toggleFeature('waterSports', 'fishingGear')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="fishingGear">
                      {t.waterSports.fishingGear}
                    </label>
                  </div>
                  
                  <div style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id="inflatables"
                      checked={formData.waterSports.inflatables || false}
                      onChange={() => toggleFeature('waterSports', 'inflatables')}
                      style={styles.checkbox}
                    />
                    <label htmlFor="inflatables">
                      {t.waterSports.inflatables}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Amenities */}
            <div style={{marginBottom: '30px'}}>
              <h3 style={styles.sectionTitle}>{t.amenities.title}</h3>
              
              {/* Entertainment */}
              <h4 style={styles.sectionSubtitle}>{t.amenities.entertainment}</h4>
              <div style={styles.twoColumnGrid}>
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="wifi"
                    checked={formData.amenities.wifi || false}
                    onChange={() => toggleFeature('amenities', 'wifi')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="wifi">
                    {t.amenities.wifi}
                  </label>
                </div>
                
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="satelliteTV"
                    checked={formData.amenities.satelliteTV || false}
                    onChange={() => toggleFeature('amenities', 'satelliteTV')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="satelliteTV">
                    {t.amenities.satelliteTV}
                  </label>
                </div>
                
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="appleTV"
                    checked={formData.amenities.appleTV || false}
                    onChange={() => toggleFeature('amenities', 'appleTV')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="appleTV">
                    {t.amenities.appleTV}
                  </label>
                </div>
                
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="sonos"
                    checked={formData.amenities.sonos || false}
                    onChange={() => toggleFeature('amenities', 'sonos')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="sonos">
                    {t.amenities.sonos}
                  </label>
                </div>
                
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="indoorCinema"
                    checked={formData.amenities.indoorCinema || false}
                    onChange={() => toggleFeature('amenities', 'indoorCinema')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="indoorCinema">
                    {t.amenities.indoorCinema}
                  </label>
                </div>
                
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="outdoorCinema"
                    checked={formData.amenities.outdoorCinema || false}
                    onChange={() => toggleFeature('amenities', 'outdoorCinema')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="outdoorCinema">
                    {t.amenities.outdoorCinema}
                  </label>
                </div>
              </div>
              
              {/* Comfort & Deck */}
              <div style={styles.twoColumnGrid}>
                <div>
                  <h4 style={styles.sectionSubtitle}>{t.amenities.comfort}</h4>
                  <div>
                    <div style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        id="airConditioning"
                        checked={formData.amenities.airConditioning || false}
                        onChange={() => toggleFeature('amenities', 'airConditioning')}
                        style={styles.checkbox}
                      />
                      <label htmlFor="airConditioning">
                        {t.amenities.airConditioning}
                      </label>
                    </div>
                    
                    <div style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        id="heating"
                        checked={formData.amenities.heating || false}
                        onChange={() => toggleFeature('amenities', 'heating')}
                        style={styles.checkbox}
                      />
                      <label htmlFor="heating">
                        {t.amenities.heating}
                      </label>
                    </div>
                    
                    <div style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        id="stabilizers"
                        checked={formData.amenities.stabilizers || false}
                        onChange={() => toggleFeature('amenities', 'stabilizers')}
                        style={styles.checkbox}
                      />
                      <label htmlFor="stabilizers">
                        {t.amenities.stabilizers}
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 style={styles.sectionSubtitle}>{t.amenities.deck}</h4>
                  <div>
                    <div style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        id="outdoorBar"
                        checked={formData.amenities.outdoorBar || false}
                        onChange={() => toggleFeature('amenities', 'outdoorBar')}
                        style={styles.checkbox}
                      />
                      <label htmlFor="outdoorBar">
                        {t.amenities.outdoorBar}
                      </label>
                    </div>
                    
                    <div style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        id="outdoorDining"
                        checked={formData.amenities.outdoorDining || false}
                        onChange={() => toggleFeature('amenities', 'outdoorDining')}
                        style={styles.checkbox}
                      />
                      <label htmlFor="outdoorDining">
                        {t.amenities.outdoorDining}
                      </label>
                    </div>
                    
                    <div style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        id="bbq"
                        checked={formData.amenities.bbq || false}
                        onChange={() => toggleFeature('amenities', 'bbq')}
                        style={styles.checkbox}
                      />
                      <label htmlFor="bbq">
                        {t.amenities.bbq}
                      </label>
                    </div>
                    
                    <div style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        id="sunpads"
                        checked={formData.amenities.sunpads || false}
                        onChange={() => toggleFeature('amenities', 'sunpads')}
                        style={styles.checkbox}
                      />
                      <label htmlFor="sunpads">
                        {t.amenities.sunpads}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Indoor */}
              <h4 style={styles.sectionSubtitle}>{t.amenities.indoor}</h4>
              <div style={styles.twoColumnGrid}>
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="formalDining"
                    checked={formData.amenities.formalDining || false}
                    onChange={() => toggleFeature('amenities', 'formalDining')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="formalDining">
                    {t.amenities.formalDining}
                  </label>
                </div>
                
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="wineStorage"
                    checked={formData.amenities.wineStorage || false}
                    onChange={() => toggleFeature('amenities', 'wineStorage')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="wineStorage">
                    {t.amenities.wineStorage}
                  </label>
                </div>
                
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="gym"
                    checked={formData.amenities.gym || false}
                    onChange={() => toggleFeature('amenities', 'gym')}
                    style={styles.checkbox}
                  />
                  <label htmlFor="gym">
                    {t.amenities.gym}
                  </label>
                </div>
                
                <div style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="spa"
                    checked={formData.amenities.spa || false}
                    onChange={() => toggleFeature('amenities', 'spa')}
                    style={styles.checkbox}
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
            <h3 style={styles.sectionTitle}>{t.crew.title}</h3>
            
            <div style={styles.twoColumnGrid}>
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="captain"
                  checked={formData.crew.captain || false}
                  onChange={() => toggleFeature('crew', 'captain')}
                  style={styles.checkbox}
                />
                <label htmlFor="captain">
                  {t.crew.captain}
                </label>
              </div>
              
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="chef"
                  checked={formData.crew.chef || false}
                  onChange={() => toggleFeature('crew', 'chef')}
                  style={styles.checkbox}
                />
                <label htmlFor="chef">
                  {t.crew.chef}
                </label>
              </div>
              
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="deckhand"
                  checked={formData.crew.deckhand || false}
                  onChange={() => toggleFeature('crew', 'deckhand')}
                  style={styles.checkbox}
                />
                <label htmlFor="deckhand">
                  {t.crew.deckhand}
                </label>
              </div>
              
              <div style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="steward"
                  checked={formData.crew.steward || false}
                  onChange={() => toggleFeature('crew', 'steward')}
                  style={styles.checkbox}
                />
                <label htmlFor="steward">
                  {t.crew.steward}
                </label>
              </div>
            </div>
            
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.crew.included}
              </label>
              <textarea
                name={`included_${language}`}
                value={formData.crew[`included_${language}`] || ''}
                onChange={(e) => handleInputChange(e, 'crew')}
                rows="4"
                style={styles.textarea}
              />
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
      <div style={styles.header}>
        <h1 style={styles.title}>{t.boatList.title}</h1>
        
      </div>
      
      {/* Add/Edit Forms */}
      {(isAddingBoat || isEditingBoat) && (
        <div style={styles.card}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb'}}>
            <h2 style={styles.subtitle}>
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
              style={styles.buttonSecondary}
            >
              {t.cancel}
            </button>
          </div>
          
          {/* Tab navigation */}
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
          
          {/* Form content based on active tab */}
          <form onSubmit={isAddingBoat ? handleAddBoat : handleUpdateBoat} style={{padding: '20px'}}>
            {renderFormTab()}
            
            {/* Submit button */}
            <div style={{marginTop: '30px', display: 'flex', justifyContent: 'flex-end'}}>
              {isUploading ? (
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{width: '20px', height: '20px', marginRight: '10px', borderTop: '2px solid #3b82f6', borderRight: '2px solid transparent', borderBottom: '2px solid #3b82f6', borderLeft: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                  <span>{t.uploadingPhotos} {Math.round(uploadProgress)}%</span>
                </div>
              ) : (
                <button
                  type="submit"
                  style={styles.buttonPrimary}
                >
                  {t.save}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      
      {/* Boat List */}
      {!isAddingBoat && !isEditingBoat && (
        <div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 style={styles.subtitle}>{t.boatList.subtitle}</h2>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAddingBoat(true);
              }}
              style={styles.buttonPrimary}
            >
              {t.boatList.addNew}
            </button>
          </div>
          
          {boats.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px 0', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'}}>
              <p style={{color: '#6b7280'}}>{t.boatList.noBoats}</p>
            </div>
          ) : (
            <div style={styles.boatListContainer}>
              {boats.map((boat) => (
                <div key={boat.id} style={styles.boatCard}>
                  {/* Boat image or placeholder */}
                  <div style={styles.boatImageContainer}>
                    {boat.photos && boat.photos.length > 0 ? (
                      <img
                        src={boat.photos[0].url}
                        alt={getLocalizedContent(boat.name, language, t.noPhotos)}
                        style={styles.boatImage}
                      />
                    ) : (
                      <div style={styles.placeholderImage}>
                        {t.noPhotos}
                      </div>
                    )}
                  </div>
                  
                  {/* Boat details */}
                  <div style={styles.boatCardContent}>
                    <h3 style={styles.boatCardTitle}>
                      {getLocalizedContent(boat.name, language)}
                    </h3>
                    
                    <div style={styles.boatCardDetails}>
                      <p style={{marginBottom: '4px'}}>
                        {boat.length ? `${boat.length}m • ` : ''}
                        {boat.capacity ? `${boat.capacity} ${language === 'en' ? 'people' : 'persoane'}` : ''}
                      </p>
                      <p>{getLocalizedContent(boat.cruisingArea, language)}</p>
                    </div>
                    
                    <div style={styles.buttonRow}>
                      <button
                        type="button"
                        onClick={() => startEditingBoat(boat)}
                        style={styles.buttonSecondary}
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
                        style={styles.buttonDanger}
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