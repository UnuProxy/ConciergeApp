// Cars component with inline styles
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, storage } from '../../firebase/config';
import { getCurrentLanguage } from "../../utils/languageHelper";

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
  carListContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  carCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  carImageContainer: {
    height: '200px',
    backgroundColor: '#f3f4f6'
  },
  carImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  carCardContent: {
    padding: '16px'
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
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    marginBottom: '12px',
    backgroundColor: '#fff'
  }
};

function Cars() {
  const [cars, setCars] = useState([]);
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isEditingCar, setIsEditingCar] = useState(false);
  const [currentCar, setCurrentCar] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [activeTab, setActiveTab] = useState('basic'); // For form navigation
  const [imageErrors, setImageErrors] = useState({}); // Track image loading errors
  
  // Form data with comprehensive car details
  const [formData, setFormData] = useState({
    // Basic Information
    name_en: '',
    name_ro: '',
    make: '',
    model: '',
    year: '',
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

  // Enhanced authentication useEffect that properly sets up auth state listener
  useEffect(() => {
    const auth = getAuth();
    
    // Setup auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Only sign in anonymously if no user is signed in
        signInAnonymously(auth)
          .then(() => {
            console.log("Signed in anonymously for storage access");
          })
          .catch((error) => {
            console.error("Anonymous auth error:", error);
          });
      } else {
        console.log("User is already authenticated", user.uid);
      }
    });
    
    // Clean up listener on component unmount
    return () => unsubscribe();
  }, []);
  
  // Add this useEffect below your other useEffects
  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(getCurrentLanguage());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Fetch cars on component mount
  useEffect(() => {
    fetchCars();
  }, []);
  
  // Fetch cars from Firestore
  const fetchCars = async () => {
    try {
      const carCollection = collection(db, "cars");
      const carSnapshot = await getDocs(carCollection);
      const carList = carSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCars(carList);
    } catch (error) {
      console.error("Error fetching cars:", error);
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
      make: '',
      model: '',
      year: '',
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
    setActiveTab('basic');
    setImageErrors({});
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
  
  // Enhanced Upload photos to Firebase Storage with better error handling and retry logic
  const uploadPhotos = async () => {
    if (photoFiles.length === 0) return [];
    
    setIsUploading(true);
    const photoUrls = [];
    
    try {
      // Get current auth instance and ensure we have a user
      const auth = getAuth();
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
          console.log("Signed in anonymously for upload");
          
          // Allow time for auth to propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (authError) {
          console.error("Auth error during upload:", authError);
          setIsUploading(false);
          return [];
        }
      }
      
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        if (!(file instanceof File)) continue;
        
        // Create a unique filename that includes the service type
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        
        // Specifically use "cars" folder to match your storage rules
        const fileName = `cars/${timestamp}_${randomStr}_${safeFileName}`;
        
        try {
          console.log(`Uploading to: ${fileName}`);
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
                    path: fileName
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
    return {
      // Basic company association
      companyId: 'just_enjoy_ibiza',
      companyName: 'Just Enjoy Ibiza',
      // Localized fields
      name: {
        en: formData.name_en || '',
        ro: formData.name_ro || ''
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
        daily: formData.priceDaily || '',
        monthly: formData.monthlyPrices
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
    e.preventDefault();
    try {
      // Upload photos
      const photoUrls = await uploadPhotos();
      
      // Prepare structured data for Firestore
      const carData = {
        ...prepareFormDataForSave(),
        photos: photoUrls,
        createdAt: new Date()
      };
      
      // Save to Firestore
      const carCollection = collection(db, "cars");
      await addDoc(carCollection, carData);
      
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
    e.preventDefault();
    try {
      if (!currentCar || !currentCar.id) {
        console.error("No current car selected for update");
        return;
      }
      
      // Get existing photos as an array
      let updatedPhotos = [...existingPhotos];
      
      // Upload any new photos
      const newPhotoUrls = await uploadPhotos();
      
      // Combine existing photos with new ones
      updatedPhotos = [...updatedPhotos, ...newPhotoUrls];
      
      // Prepare structured data for Firestore
      const carData = {
        ...prepareFormDataForSave(),
        photos: updatedPhotos,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      const carDoc = doc(db, "cars", currentCar.id);
      await updateDoc(carDoc, carData);
      
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
        URL.revokeObjectURL(updated[index]); // Clean up URL
        updated.splice(index, 1);
        return updated;
      });
    }
  };
  
  // Start editing a car
  const startEditingCar = (car) => {
    setCurrentCar(car);
    
    // Extract data to flat form structure
    setFormData({
      name_en: car.name?.en || '',
      name_ro: car.name?.ro || '',
      make: car.make || '',
      model: car.model || '',
      year: car.year || '',
      seats: car.seats || '',
      doors: car.doors || '',
      transmission: car.transmission || 'automatic',
      fuel: car.fuel || 'petrol',
      description_en: car.description?.en || '',
      description_ro: car.description?.ro || '',
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
      priceDaily: car.pricing?.daily || '',
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
      pickupLocation_en: car.pickupLocation?.en || '',
      pickupLocation_ro: car.pickupLocation?.ro || '',
      bookingNotes_en: car.bookingNotes?.en || '',
      bookingNotes_ro: car.bookingNotes?.ro || ''
    });
    
    // Set existing photos
    setExistingPhotos(car.photos || []);
    setIsEditingCar(true);
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
    }
  };
  
  const t = translations[language];
  
  // Enhanced image rendering for car cards with proper error handling
  const renderCarImage = (car) => {
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
    if (car.photos && car.photos.length > 0 && car.photos[0].url) {
      return (
        <img
          src={car.photos[0].url}
          alt={getLocalizedContent(car.name, language, t.noPhotos)}
          style={styles.carImage}
          onError={(e) => {
            console.error(`Failed to load image for car ${car.id}:`, car.photos[0].url);
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
  
  // Tab navigation system for the form
  const renderFormTab = () => {
    switch(activeTab) {
      case 'basic':
        return (
          <div>
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                {t.carName}
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
            <div style={styles.twoColumnGrid}>
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
            </div>
            <div style={styles.twoColumnGrid}>
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
            <h3 style={styles.sectionTitle}>{t.features.title}</h3>
            {/* Comfort */}
            <h4 style={styles.sectionSubtitle}>{t.features.comfort}</h4>
            <div style={styles.twoColumnGrid}>
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
            <div style={styles.twoColumnGrid}>
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
            <div style={styles.twoColumnGrid}>
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
            <div style={styles.twoColumnGrid}>
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
      <div style={styles.header}>
        <h1 style={styles.title}>{t.carList.title}</h1>
      </div>
      
      {/* Add/Edit Forms */}
      {(isAddingCar || isEditingCar) && (
        <div style={styles.card}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb'}}>
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
          <form onSubmit={isAddingCar ? handleAddCar : handleUpdateCar} style={{padding: '20px'}}>
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
      
      {/* Car List */}
      {!isAddingCar && !isEditingCar && (
        <div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 style={styles.subtitle}>{t.carList.subtitle}</h2>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAddingCar(true);
              }}
              style={styles.buttonPrimary}
            >
              {t.carList.addNew}
            </button>
          </div>
          
          {cars.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px 0', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'}}>
              <p style={{color: '#6b7280'}}>{t.carList.noCars}</p>
            </div>
          ) : (
            <div style={styles.carListContainer}>
              {cars.map((car) => (
                <div key={car.id} style={styles.carCard}>
                  {/* Car image or placeholder with error handling */}
                  <div style={styles.carImageContainer}>
                    {renderCarImage(car)}
                  </div>
                  
                  {/* Car details */}
                  <div style={styles.carCardContent}>
                    <h3 style={styles.carCardTitle}>
                      {getLocalizedContent(car.name, language)}
                    </h3>
                    <div style={styles.carCardDetails}>
                      <p style={{marginBottom: '4px'}}>
                        {car.make} {car.model} {car.year && `(${car.year})`}
                      </p>
                      <p>{car.seats && `${car.seats} ${language === 'en' ? 'seats' : 'locuri'}`} • {car.transmission && t.transmissionTypes[car.transmission]}</p>
                    </div>
                    <div style={styles.buttonRow}>
                      <button
                        type="button"
                        onClick={() => startEditingCar(car)}
                        style={styles.buttonSecondary}
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

export default Cars;