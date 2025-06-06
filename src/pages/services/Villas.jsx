// Updated Villas component with PDF generation functionality
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db, storage } from '../../firebase/config';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function Villas() {
  const [villas, setVillas] = useState([]);
  const [isAddingVilla, setIsAddingVilla] = useState(false);
  const [isEditingVilla, setIsEditingVilla] = useState(false);
  const [currentVilla, setCurrentVilla] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [currentPdfVilla, setCurrentPdfVilla] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
  const [bedroomFilter, setBedroomFilter] = useState('');
  const [bathroomFilter, setBathroomFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Enhanced image loading function that handles Firebase Storage URLs better
 const loadImageAsBase64 = async (url) => {
  if (!url) return null;
  
  console.log("Loading image from:", url);
  
  // Method 1: Try direct loading (should work now with CORS fixed)
  try {
    const directResult = await loadImageDirectly(url);
    if (directResult) {
      console.log("✅ Image loaded via direct method");
      return directResult;
    }
  } catch (error) {
    console.warn("Direct method failed, trying proxy...");
  }
  
  // Method 2: Fallback to proxy if direct fails
  try {
    const proxyResult = await loadImageViaProxy(url);
    if (proxyResult) {
      console.log("✅ Image loaded via proxy");
      return proxyResult;
    }
  } catch (error) {
    console.warn("Proxy method also failed");
  }
  
  console.warn("❌ All image loading methods failed");
  return null;
};

const loadImageDirectly = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Optimize for PDF
        const maxSize = 600;
        let { width, height } = this;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(this, 0, 0, width, height);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      } catch (canvasError) {
        reject(canvasError);
      }
    };
    
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
    
    // Timeout after 6 seconds
    setTimeout(() => reject(new Error('Timeout')), 6000);
  });
};

const loadImageViaProxy = async (url) => {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  const response = await fetch(proxyUrl, {
    method: 'GET',
    headers: { 'Accept': 'image/*' }
  });
  
  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status}`);
  }
  
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to convert blob'));
    reader.readAsDataURL(blob);
  });
};
  
  // Use a simple flat form structure to avoid nesting problems
  const [formData, setFormData] = useState({
    name_en: '',
    name_ro: '',
    address_en: '',
    address_ro: '',
    bedrooms: '',
    bathrooms: '',
    description_en: '',
    description_ro: '',
    amenities_en: '',
    amenities_ro: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_notes_en: '',
    owner_notes_ro: '',
  });
  
  // Handle price configurations separately
  const [priceConfigs, setPriceConfigs] = useState([{
    id: Date.now(),
    label_en: 'Standard Rate',
    label_ro: 'Tarif Standard',
    price: '',
    type: 'nightly',
    dateRange_start: '',
    dateRange_end: '',
    conditions_minStay: '',
    conditions_minGuests: '',
    conditions_maxGuests: ''
  }]);
  
  // Photos array
  const [existingPhotos, setExistingPhotos] = useState([]);
  
  // Get language from localStorage or use default (Romanian)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'ro';
  });

  // Listen for language changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('appLanguage') || 'ro';
      setLanguage(currentLang);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Helper function to safely get localized content
  const getLocalizedContent = (obj, lang, fallback = '') => {
  if (!obj) return fallback;
  
  // If it's already a string, return it
  if (typeof obj === 'string') return obj || fallback;
  
  // If it's not an object, convert to string
  if (typeof obj !== 'object') return String(obj) || fallback;
  
  // Try the requested language first
  if (obj[lang] && obj[lang].trim()) return obj[lang];
  
  // Try the other language as fallback
  const otherLang = lang === 'en' ? 'ro' : 'en';
  if (obj[otherLang] && obj[otherLang].trim()) return obj[otherLang];
  
  // Try common field variations
  const langVariations = [
    `${lang}`,
    `text_${lang}`,
    `content_${lang}`,
    `description_${lang}`,
    `name_${lang}`,
    `address_${lang}`,
    `amenities_${lang}`
  ];
  
  for (const variation of langVariations) {
    if (obj[variation] && obj[variation].trim()) {
      return obj[variation];
    }
  }
  
  // Last resort: return any non-empty value
  const values = Object.values(obj).filter(val => 
    val && typeof val === 'string' && val.trim()
  );
  
  return values.length > 0 ? values[0] : fallback;
};
  
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
  
  // Fetch villas on component mount
  useEffect(() => {
    fetchVillas();
  }, []);
  
  // Fetch villas from Firestore
  const fetchVillas = async () => {
    try {
      const villaCollection = collection(db, "villas");
      const villaSnapshot = await getDocs(villaCollection);
      const villaList = villaSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVillas(villaList);
    } catch (error) {
      console.error("Error fetching villas:", error);
    }
  };
  
  // Ultra simple input handler that just works
  const handleInputChange = (e) => {
    if (!e || !e.target) return;
    
    const { name, value } = e.target;
    if (!name) return;
    
    // For price fields, restrict to numbers and decimals
    if (name.includes('price')) {
      const numericValue = value.replace(/[^0-9.]/g, '');
      if (numericValue.split('.').length > 2) return; // Prevent multiple decimal points
      
      // Handle price config fields differently
      if (name.startsWith('priceConfig_')) {
        const parts = name.split('_');
        if (parts.length >= 3) {
          const index = parseInt(parts[1]);
          // Make a copy of the price configs array
          const newConfigs = [...priceConfigs];
          // Ensure the index exists
          while (newConfigs.length <= index) {
            newConfigs.push({
              id: Date.now() + newConfigs.length,
              label_en: `Rate ${newConfigs.length + 1}`,
              label_ro: `Tarif ${newConfigs.length + 1}`,
              price: '',
              type: 'nightly',
              dateRange_start: '',
              dateRange_end: '',
              conditions_minStay: '',
              conditions_minGuests: '',
              conditions_maxGuests: ''
            });
          }
          newConfigs[index].price = numericValue;
          setPriceConfigs(newConfigs);
        }
      }
      return;
    }
    
    // Handle price config fields
    if (name.startsWith('priceConfig_')) {
      const parts = name.split('_');
      if (parts.length >= 3) {
        const index = parseInt(parts[1]);
        const field = parts.slice(2).join('_');
        
        // Make a copy of the price configs array
        const newConfigs = [...priceConfigs];
        // Ensure the index exists
        while (newConfigs.length <= index) {
          newConfigs.push({
            id: Date.now() + newConfigs.length,
            label_en: `Rate ${newConfigs.length + 1}`,
            label_ro: `Tarif ${newConfigs.length + 1}`,
            price: '',
            type: 'nightly',
            dateRange_start: '',
            dateRange_end: '',
            conditions_minStay: '',
            conditions_minGuests: '',
            conditions_maxGuests: ''
          });
        }
        
        // Update the specific field
        newConfigs[index][field] = value;
        setPriceConfigs(newConfigs);
      }
      return;
    }
    
    // For all other simple fields, just update formData directly
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Add a new price configuration
  const addPriceConfiguration = () => {
    setPriceConfigs(prev => [
      ...prev,
      {
        id: Date.now(),
        label_en: `Rate ${prev.length + 1}`,
        label_ro: `Tarif ${prev.length + 1}`,
        price: '',
        type: 'nightly',
        dateRange_start: '',
        dateRange_end: '',
        conditions_minStay: '',
        conditions_minGuests: '',
        conditions_maxGuests: ''
      }
    ]);
  };
  
  // Remove a price configuration
  const removePriceConfiguration = (index) => {
    if (priceConfigs.length <= 1) return;
    setPriceConfigs(prev => prev.filter((_, i) => i !== index));
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name_en: '',
      name_ro: '',
      address_en: '',
      address_ro: '',
      bedrooms: '',
      bathrooms: '',
      description_en: '',
      description_ro: '',
      amenities_en: '',
      amenities_ro: '',
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      owner_notes_en: '',
      owner_notes_ro: '',
    });
    setPriceConfigs([{
      id: Date.now(),
      label_en: 'Standard Rate',
      label_ro: 'Tarif Standard',
      price: '',
      type: 'nightly',
      dateRange_start: '',
      dateRange_end: '',
      conditions_minStay: '',
      conditions_minGuests: '',
      conditions_maxGuests: ''
    }]);
    setExistingPhotos([]);
    setPhotoFiles([]);
    setPreviewUrls([]);
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
    const fileName = `villas/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    try {
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
            reject(error);
          },
          async () => {
            try {
              // Get download URL with proper token
              let downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Ensure URL has alt=media parameter for better CORS compatibility
              if (!downloadURL.includes('alt=media')) {
                downloadURL = downloadURL.includes('?') 
                  ? downloadURL + '&alt=media'
                  : downloadURL + '?alt=media';
              }
              
              photoUrls.push({
                url: downloadURL,
                path: fileName
              });
              
              console.log("✅ Photo uploaded successfully:", fileName);
              resolve();
            } catch (urlError) {
              console.error("❌ Error getting download URL:", urlError);
              reject(urlError);
            }
          }
        );
      });
    } catch (error) {
      console.error("❌ Error uploading photo:", error);
    }
  }
  
  setIsUploading(false);
  setUploadProgress(0);
  return photoUrls;
};
  
  // Convert flattened form data to structured format for database
  const prepareFormDataForSave = () => {
    // Convert flat form data to nested structure
    return {
      name: {
        en: formData.name_en || '',
        ro: formData.name_ro || ''
      },
      address: {
        en: formData.address_en || '',
        ro: formData.address_ro || ''
      },
      bedrooms: formData.bedrooms || '',
      bathrooms: formData.bathrooms || '',
      description: {
        en: formData.description_en || '',
        ro: formData.description_ro || ''
      },
      amenities: {
        en: formData.amenities_en || '',
        ro: formData.amenities_ro || ''
      },
      owner: {
        name: formData.owner_name || '',
        email: formData.owner_email || '',
        phone: formData.owner_phone || '',
        notes: {
          en: formData.owner_notes_en || '',
          ro: formData.owner_notes_ro || ''
        }
      },
      // Convert price configs to proper nested structure
      priceConfigurations: priceConfigs.map(config => ({
        id: config.id,
        label: {
          en: config.label_en || '',
          ro: config.label_ro || ''
        },
        price: config.price || '',
        type: config.type || 'nightly',
        dateRange: {
          start: config.dateRange_start || '',
          end: config.dateRange_end || ''
        },
        conditions: {
          minStay: config.conditions_minStay || '',
          minGuests: config.conditions_minGuests || '',
          maxGuests: config.conditions_maxGuests || ''
        }
      }))
    };
  };
  
  // Handle add villa form submission
  const handleAddVilla = async (e) => {
    e.preventDefault();
    
    try {
      // Upload photos
      const photoUrls = await uploadPhotos();
      
      // Prepare nested data structure for Firestore
      const villaData = {
        ...prepareFormDataForSave(),
        photos: photoUrls,
        createdAt: new Date()
      };
      
      // Save to Firestore
      const villaCollection = collection(db, "villas");
      await addDoc(villaCollection, villaData);
      
      // Reset form and fetch updated data
      resetForm();
      setIsAddingVilla(false);
      fetchVillas();
    } catch (error) {
      console.error("Error adding villa: ", error);
    }
  };
  
  // Handle update villa form submission
  const handleUpdateVilla = async (e) => {
    e.preventDefault();
    
    try {
      if (!currentVilla || !currentVilla.id) {
        console.error("No current villa selected for update");
        return;
      }
      
      // Upload any new photos
      const newPhotoUrls = await uploadPhotos();
      
      // Combine existing photos with new ones
      const updatedPhotos = [...existingPhotos, ...newPhotoUrls];
      
      // Prepare nested data structure for Firestore
      const villaData = {
        ...prepareFormDataForSave(),
        photos: updatedPhotos,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      const villaDoc = doc(db, "villas", currentVilla.id);
      await updateDoc(villaDoc, villaData);
      
      // Reset form and fetch updated data
      resetForm();
      setIsEditingVilla(false);
      setCurrentVilla(null);
      fetchVillas();
    } catch (error) {
      console.error("Error updating villa: ", error);
    }
  };
  
  // Handle villa deletion
  const handleDeleteVilla = async (id) => {
    try {
      // Find the villa to get its photos
      const villaToDelete = villas.find(villa => villa.id === id);
      
      // Delete photos from storage if they exist
      if (villaToDelete.photos && villaToDelete.photos.length > 0) {
        for (const photo of villaToDelete.photos) {
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
      
      // Delete the villa document
      await deleteDoc(doc(db, "villas", id));
      
      // Refresh villa list
      fetchVillas();
    } catch (error) {
      console.error("Error deleting villa: ", error);
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
  
  // Start editing a villa
  const startEditingVilla = (villa) => {
    setCurrentVilla(villa);
    
    // Extract data to flat form structure
    setFormData({
      name_en: villa.name?.en || '',
      name_ro: villa.name?.ro || '',
      address_en: villa.address?.en || '',
      address_ro: villa.address?.ro || '',
      bedrooms: villa.bedrooms || '',
      bathrooms: villa.bathrooms || '',
      description_en: villa.description?.en || '',
      description_ro: villa.description?.ro || '',
      amenities_en: villa.amenities?.en || '',
      amenities_ro: villa.amenities?.ro || '',
      owner_name: villa.owner?.name || '',
      owner_email: villa.owner?.email || '',
      owner_phone: villa.owner?.phone || '',
      owner_notes_en: villa.owner?.notes?.en || '',
      owner_notes_ro: villa.owner?.notes?.ro || '',
    });
    
    // Extract price configurations
    if (Array.isArray(villa.priceConfigurations) && villa.priceConfigurations.length > 0) {
      setPriceConfigs(
        villa.priceConfigurations.map(config => ({
          id: config.id || Date.now(),
          label_en: config.label?.en || '',
          label_ro: config.label?.ro || '',
          price: config.price || '',
          type: config.type || 'nightly',
          dateRange_start: config.dateRange?.start || '',
          dateRange_end: config.dateRange?.end || '',
          conditions_minStay: config.conditions?.minStay || '',
          conditions_minGuests: config.conditions?.minGuests || '',
          conditions_maxGuests: config.conditions?.maxGuests || ''
        }))
      );
    } else {
      // If no price configs, create a default one
      setPriceConfigs([{
        id: Date.now(),
        label_en: 'Standard Rate',
        label_ro: 'Tarif Standard',
        price: villa.price || '',
        type: villa.priceType || 'nightly',
        dateRange_start: '',
        dateRange_end: '',
        conditions_minStay: '',
        conditions_minGuests: '',
        conditions_maxGuests: ''
      }]);
    }
    
    // Set existing photos
    setExistingPhotos(villa.photos || []);
    
    setIsEditingVilla(true);
  };
  
  // Start PDF generation process
  const startGeneratePDF = (villa) => {
    setCurrentPdfVilla(villa);
    setIsGeneratingPDF(true);
  };

  


// ============================================================================
// LUXURY MINIMAL DESIGN SYSTEM
// ============================================================================

const getEnhancedLuxuryDesignSystem = () => ({
  colors: {
    primary: [15, 23, 42],        // Sophisticated slate
    accent: [161, 140, 111],      // Warm champagne gold
    text: [51, 51, 51],           // Rich charcoal
    lightText: [120, 120, 120],   // Elegant gray
    background: [255, 255, 255],  // Pure white
    subtle: [248, 250, 252],      // Whisper gray
    line: [229, 231, 235]         // Minimal divider
  },
  fonts: {
    display: { size: 32, weight: 'bold' },      // Larger for mobile
    title: { size: 24, weight: 'bold' },        // Increased
    heading: { size: 16, weight: 'bold' },      // Larger headings
    subheading: { size: 14, weight: 'normal' }, // Better readability
    body: { size: 12, weight: 'normal' },       // Increased body text
    caption: { size: 10, weight: 'normal' },    // Better captions
    micro: { size: 9, weight: 'normal' }        // Readable micro text
  },
  spacing: {
    section: 25,      // More generous section spacing
    element: 15,      // Better element spacing
    text: 8,          // Better line spacing
    margin: 25        // Page margins
  }
});

// ============================================================================
// ENHANCED COVER PAGE - Mobile Optimized
// ============================================================================

const createEnhancedCoverPage = async (doc, villa, villaName, designSystem) => {
  const { colors, fonts, spacing } = designSystem;
  const pageWidth = 210;
  const pageHeight = 297;
  
  // Clean white background
  doc.setFillColor(...colors.background);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let currentY = spacing.margin;
  
  // Minimal top accent line
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.8);
  doc.line(spacing.margin, currentY, pageWidth - spacing.margin, currentY);
  currentY += 15;
  
  // Brand name - more prominent
  doc.setFontSize(fonts.caption.size);
  doc.setTextColor(...colors.lightText);
  doc.setFont('helvetica', 'normal');
  doc.text('IBIZA LUXURY COLLECTION', spacing.margin, currentY);
  currentY += 20;
  
  // Villa name - much larger and bold
  doc.setFontSize(fonts.display.size);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  
  const nameLines = doc.splitTextToSize(villaName, pageWidth - (spacing.margin * 2));
  nameLines.forEach((line, index) => {
    doc.text(line, spacing.margin, currentY + (index * 10));
  });
  currentY += (nameLines.length * 10) + 10;
  
  // Location - larger and more prominent
  const location = getLocalizedContent(villa.address, 'en', 'Ibiza, Balearic Islands');
  doc.setFontSize(fonts.subheading.size);
  doc.setTextColor(...colors.accent);
  doc.setFont('helvetica', 'normal');
  doc.text(location.toUpperCase(), spacing.margin, currentY);
  currentY += spacing.section;
  
  // HERO IMAGE - Much larger and more prominent
  if (villa.photos && villa.photos.length > 0) {
    try {
      console.log("Loading hero image for enhanced PDF");
      const imgData = await loadImageAsBase64(villa.photos[0].url);
      
      if (imgData) {
        // Much larger hero image - almost full width
        const imgWidth = pageWidth - (spacing.margin * 2);
        const imgHeight = 120; // Increased height for better visibility
        const imgX = spacing.margin;
        
        // Add subtle shadow effect with multiple rectangles
        doc.setFillColor(200, 200, 200);
        doc.rect(imgX + 2, currentY + 2, imgWidth, imgHeight, 'F');
        doc.setFillColor(220, 220, 220);
        doc.rect(imgX + 1, currentY + 1, imgWidth, imgHeight, 'F');
        
        // Main image
        doc.addImage(imgData, 'JPEG', imgX, currentY, imgWidth, imgHeight);
        
        // Elegant border
        doc.setDrawColor(...colors.line);
        doc.setLineWidth(0.5);
        doc.rect(imgX, currentY, imgWidth, imgHeight);
        
        currentY += imgHeight + spacing.section;
      } else {
        // Enhanced placeholder
        const imgWidth = pageWidth - (spacing.margin * 2);
        const imgHeight = 120;
        const imgX = spacing.margin;
        
        doc.setFillColor(...colors.subtle);
        doc.rect(imgX, currentY, imgWidth, imgHeight, 'F');
        
        doc.setDrawColor(...colors.line);
        doc.setLineWidth(0.5);
        doc.rect(imgX, currentY, imgWidth, imgHeight);
        
        doc.setFontSize(fonts.subheading.size);
        doc.setTextColor(...colors.lightText);
        doc.text('VILLA PHOTOGRAPHY', imgX + (imgWidth / 2), currentY + (imgHeight / 2), { align: 'center' });
        
        currentY += imgHeight + spacing.section;
      }
    } catch (err) {
      console.error("Error loading hero image:", err);
      // Same enhanced placeholder code
      const imgWidth = pageWidth - (spacing.margin * 2);
      const imgHeight = 120;
      const imgX = spacing.margin;
      
      doc.setFillColor(...colors.subtle);
      doc.rect(imgX, currentY, imgWidth, imgHeight, 'F');
      
      doc.setDrawColor(...colors.line);
      doc.setLineWidth(0.5);
      doc.rect(imgX, currentY, imgWidth, imgHeight);
      
      doc.setFontSize(fonts.subheading.size);
      doc.setTextColor(...colors.lightText);
      doc.text('VILLA PHOTOGRAPHY', imgX + (imgWidth / 2), currentY + (imgHeight / 2), { align: 'center' });
      
      currentY += imgHeight + spacing.section;
    }
  }
  
  // Property details - larger cards with better spacing
  const details = [
    { icon: '🛏️', label: 'BEDROOMS', value: villa.bedrooms || '—' },
    { icon: '🚿', label: 'BATHROOMS', value: villa.bathrooms || '—' },
    { icon: '💰', label: 'STARTING FROM', value: villa.priceConfigurations?.[0]?.price ? `€${villa.priceConfigurations[0].price}` : 'UPON REQUEST' }
  ];
  
  // Create cards layout
  const cardWidth = (pageWidth - (spacing.margin * 2) - 20) / 3;
  const cardHeight = 40;
  
  details.forEach((detail, index) => {
    const cardX = spacing.margin + (index * (cardWidth + 10));
    
    // Card background
    doc.setFillColor(...colors.subtle);
    doc.rect(cardX, currentY, cardWidth, cardHeight, 'F');
    
    // Card border
    doc.setDrawColor(...colors.line);
    doc.setLineWidth(0.3);
    doc.rect(cardX, currentY, cardWidth, cardHeight);
    
    // Icon
    doc.setFontSize(fonts.subheading.size);
    doc.text(detail.icon, cardX + 5, currentY + 12);
    
    // Label
    doc.setFontSize(fonts.caption.size);
    doc.setTextColor(...colors.lightText);
    doc.setFont('helvetica', 'normal');
    doc.text(detail.label, cardX + 5, currentY + 20);
    
    // Value
    doc.setFontSize(fonts.subheading.size);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    const valueLines = doc.splitTextToSize(detail.value, cardWidth - 10);
    valueLines.forEach((line, lineIndex) => {
      doc.text(line, cardX + 5, currentY + 28 + (lineIndex * 6));
    });
    
    doc.setFont('helvetica', 'normal');
  });
  
  currentY += cardHeight + spacing.section;
  
  // Description preview - if available
  const description = getLocalizedContent(villa.description, 'en', '');
  if (description.trim()) {
    doc.setFontSize(fonts.heading.size);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('VILLA OVERVIEW', spacing.margin, currentY);
    currentY += 12;
    
    doc.setFontSize(fonts.body.size);
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'normal');
    
    // Show only first 300 characters on cover
    const preview = description.length > 300 ? description.substring(0, 300) + '...' : description;
    const descLines = doc.splitTextToSize(preview, pageWidth - (spacing.margin * 2));
    
    descLines.forEach((line, index) => {
      if (currentY + (index * 6) < 250) { // Don't overflow page
        doc.text(line, spacing.margin, currentY + (index * 6));
      }
    });
  }
  
  // Enhanced footer
  const footerY = pageHeight - 30;
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.8);
  doc.line(spacing.margin, footerY, pageWidth - spacing.margin, footerY);
  
  doc.setFontSize(fonts.micro.size);
  doc.setTextColor(...colors.lightText);
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}`, spacing.margin, footerY + 8);
  
  doc.setTextColor(...colors.accent);
  doc.setFont('helvetica', 'bold');
  doc.text('IBIZA-LUXURY-COLLECTION.COM', pageWidth - spacing.margin, footerY + 8, { align: 'right' });
};

// ============================================================================
// ENHANCED DETAILS PAGE - Better Typography and Spacing
// ============================================================================

const createEnhancedDetailsPage = (doc, villa, designSystem) => {
  const { colors, fonts, spacing } = designSystem;
  const pageWidth = 210;
  
  addEnhancedHeader(doc, 'VILLA DETAILS', designSystem);
  
  let currentY = 60;
  
  // Essential info cards - fix icons and data fetching
  const essentials = [
    { 
      icon: '🛏️', // This should display properly now
      label: 'BEDROOMS', 
      value: villa.bedrooms ? villa.bedrooms.toString() : 'Not specified' 
    },
    { 
      icon: '🚿', // This should display properly now
      label: 'BATHROOMS', 
      value: villa.bathrooms ? villa.bathrooms.toString() : 'Not specified' 
    },
    { 
      icon: '📍', // This should display properly now
      label: 'LOCATION', 
      value: getLocalizedContent(villa.address, 'en', 'Ibiza') 
    }
  ];
  
  essentials.forEach((item, index) => {
    const cardY = currentY + (index * 20);
    const cardHeight = 15;
    
    // Card background
    doc.setFillColor(...colors.subtle);
    doc.rect(spacing.margin, cardY, pageWidth - (spacing.margin * 2), cardHeight, 'F');
    
    // Icon - try different approach for better compatibility
    doc.setFontSize(fonts.subheading.size);
    doc.setTextColor(...colors.accent);
    
    // Use simple symbols instead of emoji if icons don't work
    let iconText = item.icon;
    if (item.label === 'BEDROOMS') iconText = '🛏️';
    if (item.label === 'BATHROOMS') iconText = '🚿'; 
    if (item.label === 'LOCATION') iconText = '📍';
    
    try {
      doc.text(iconText, spacing.margin + 5, cardY + 10);
    } catch (iconError) {
      // Fallback to simple bullets if emojis don't work
      doc.setFillColor(...colors.accent);
      doc.circle(spacing.margin + 7, cardY + 7, 1.5, 'F');
    }
    
    // Label
    doc.setFontSize(fonts.subheading.size);
    doc.setTextColor(...colors.lightText);
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, spacing.margin + 20, cardY + 10);
    
    // Value
    doc.setFontSize(fonts.subheading.size);
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, spacing.margin + 80, cardY + 10);
  });
  
  currentY += (essentials.length * 20) + spacing.section;
  
  // Description - fix data fetching with proper fallback
  let description = '';
  
  // Try multiple ways to get description
  if (villa.description) {
    if (typeof villa.description === 'object') {
      description = villa.description.en || villa.description.ro || '';
    } else if (typeof villa.description === 'string') {
      description = villa.description;
    }
  }
  
  // Also try individual language fields as fallback
  if (!description) {
    description = villa.description_en || villa.description_ro || '';
  }
  
  if (description && description.trim()) {
    doc.setFontSize(fonts.title.size);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', spacing.margin, currentY);
    
    currentY += 18;
    
    doc.setFontSize(fonts.body.size);
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'normal');
    
    const descLines = doc.splitTextToSize(description, pageWidth - (spacing.margin * 2));
    descLines.forEach((line, index) => {
      doc.text(line, spacing.margin, currentY + (index * 7));
    });
    
    currentY += (descLines.length * 7) + spacing.section;
  }
  
  // Amenities - fix data fetching with proper fallback
  let amenities = '';
  
  // Try multiple ways to get amenities
  if (villa.amenities) {
    if (typeof villa.amenities === 'object') {
      amenities = villa.amenities.en || villa.amenities.ro || '';
    } else if (typeof villa.amenities === 'string') {
      amenities = villa.amenities;
    }
  }
  
  // Also try individual language fields as fallback
  if (!amenities) {
    amenities = villa.amenities_en || villa.amenities_ro || '';
  }
  
  if (amenities && amenities.trim()) {
    if (currentY > 220) {
      doc.addPage();
      addEnhancedHeader(doc, 'VILLA DETAILS', designSystem);
      currentY = 60;
    }
    
    doc.setFontSize(fonts.title.size);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('AMENITIES & FEATURES', spacing.margin, currentY);
    
    currentY += 18;
    
    if (amenities.includes(',')) {
      const amenityList = amenities.split(',').map(item => item.trim()).filter(item => item);
      
      // Create two-column layout for amenities
      const midPoint = Math.ceil(amenityList.length / 2);
      const leftColumn = amenityList.slice(0, midPoint);
      const rightColumn = amenityList.slice(midPoint);
      
      const leftX = spacing.margin;
      const rightX = pageWidth / 2 + 10;
      
      leftColumn.forEach((amenity, index) => {
        const y = currentY + (index * 8);
        
        // Bullet point
        doc.setFillColor(...colors.accent);
        doc.circle(leftX + 3, y - 1, 1, 'F');
        
        doc.setFontSize(fonts.body.size);
        doc.setTextColor(...colors.text);
        doc.text(amenity, leftX + 8, y);
      });
      
      rightColumn.forEach((amenity, index) => {
        const y = currentY + (index * 8);
        
        // Bullet point
        doc.setFillColor(...colors.accent);
        doc.circle(rightX + 3, y - 1, 1, 'F');
        
        doc.setFontSize(fonts.body.size);
        doc.setTextColor(...colors.text);
        doc.text(amenity, rightX + 8, y);
      });
      
      currentY += Math.max(leftColumn.length, rightColumn.length) * 8;
    } else {
      doc.setFontSize(fonts.body.size);
      doc.setTextColor(...colors.text);
      const amenityLines = doc.splitTextToSize(amenities, pageWidth - (spacing.margin * 2));
      amenityLines.forEach((line, index) => {
        doc.text(line, spacing.margin, currentY + (index * 7));
      });
      currentY += amenityLines.length * 7;
    }
  }
  
  addEnhancedFooter(doc, villa, designSystem);
};

// ============================================================================
// ENHANCED PHOTOS PAGE - Much Larger Images
// ============================================================================

const createEnhancedPhotosPage = async (doc, villa, designSystem) => {
  const { colors, fonts, spacing } = designSystem;
  const pageWidth = 210;
  const pageHeight = 297;
  
  addEnhancedHeader(doc, 'VILLA PHOTOGRAPHY', designSystem);
  
  if (!villa.photos || villa.photos.length === 0) {
    const noPhotoY = pageHeight / 2;
    
    // Create a nice "no photos" section
    doc.setFillColor(...colors.subtle);
    doc.rect(spacing.margin, noPhotoY - 30, pageWidth - (spacing.margin * 2), 60, 'F');
    
    doc.setFontSize(fonts.heading.size);
    doc.setTextColor(...colors.lightText);
    doc.text('Photography portfolio available upon request', pageWidth / 2, noPhotoY, { align: 'center' });
    
    addEnhancedFooter(doc, villa, designSystem);
    return;
  }
  
  let currentY = 60; // Start after header
  
  // FEATURED IMAGE - Very large and prominent
  try {
    console.log("Loading featured image for enhanced photos page");
    const imgData = await loadImageAsBase64(villa.photos[0].url);
    
    if (imgData) {
      const imgWidth = pageWidth - (spacing.margin * 2);
      const imgHeight = 110; // Large featured image
      const imgX = spacing.margin;
      
      // Add photo caption above
      doc.setFontSize(fonts.caption.size);
      doc.setTextColor(...colors.lightText);
      doc.text('FEATURED VIEW', imgX, currentY - 5);
      
      // Shadow effect
      doc.setFillColor(200, 200, 200);
      doc.rect(imgX + 2, currentY + 2, imgWidth, imgHeight, 'F');
      
      // Main image
      doc.addImage(imgData, 'JPEG', imgX, currentY, imgWidth, imgHeight);
      
      // Elegant border
      doc.setDrawColor(...colors.line);
      doc.setLineWidth(0.5);
      doc.rect(imgX, currentY, imgWidth, imgHeight);
      
      currentY += imgHeight + spacing.section;
    }
  } catch (err) {
    console.error("Error loading featured photo:", err);
    currentY += spacing.element;
  }
  
  // ADDITIONAL PHOTOS - Larger grid layout (2x2 instead of small thumbnails)
  if (villa.photos.length > 1) {
    const additionalPhotos = villa.photos.slice(1, 5); // Show up to 4 additional photos
    
    if (additionalPhotos.length > 0) {
      // Section title
      doc.setFontSize(fonts.heading.size);
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('ADDITIONAL VIEWS', spacing.margin, currentY);
      currentY += 15;
      
      // Calculate grid layout
      const photosPerRow = 2;
      const photoSpacing = 10;
      const availableWidth = pageWidth - (spacing.margin * 2);
      const photoWidth = (availableWidth - photoSpacing) / photosPerRow;
      const photoHeight = 65; // Much larger than before
      
      for (let i = 0; i < additionalPhotos.length; i++) {
        const row = Math.floor(i / photosPerRow);
        const col = i % photosPerRow;
        
        const x = spacing.margin + (col * (photoWidth + photoSpacing));
        const y = currentY + (row * (photoHeight + photoSpacing));
        
        try {
          console.log(`Loading additional photo ${i + 2}`);
          const imgData = await loadImageAsBase64(additionalPhotos[i].url);
          
          if (imgData) {
            // Shadow
            doc.setFillColor(220, 220, 220);
            doc.rect(x + 1, y + 1, photoWidth, photoHeight, 'F');
            
            // Image
            doc.addImage(imgData, 'JPEG', x, y, photoWidth, photoHeight);
            
            // Border
            doc.setDrawColor(...colors.line);
            doc.setLineWidth(0.3);
            doc.rect(x, y, photoWidth, photoHeight);
          } else {
            // Placeholder
            doc.setFillColor(...colors.subtle);
            doc.rect(x, y, photoWidth, photoHeight, 'F');
            
            doc.setDrawColor(...colors.line);
            doc.setLineWidth(0.3);
            doc.rect(x, y, photoWidth, photoHeight);
            
            doc.setFontSize(fonts.caption.size);
            doc.setTextColor(...colors.lightText);
            doc.text('IMAGE', x + (photoWidth / 2), y + (photoHeight / 2), { align: 'center' });
          }
        } catch (err) {
          console.error(`Error loading photo ${i + 2}:`, err);
          // Placeholder for failed images
          doc.setFillColor(...colors.subtle);
          doc.rect(x, y, photoWidth, photoHeight, 'F');
          
          doc.setDrawColor(...colors.line);
          doc.setLineWidth(0.3);
          doc.rect(x, y, photoWidth, photoHeight);
        }
      }
      
      // Calculate how much space we used
      const rows = Math.ceil(additionalPhotos.length / photosPerRow);
      currentY += (rows * (photoHeight + photoSpacing));
    }
  }
  
  addEnhancedFooter(doc, villa, designSystem);
};

// ============================================================================
// ENHANCED PRICING PAGE - Better Tables and Layout
// ============================================================================

const createEnhancedPricingPage = (doc, villa, designSystem) => {
  const { colors, fonts, spacing } = designSystem;
  const pageWidth = 210;
  
  addEnhancedHeader(doc, 'RATES & RESERVATIONS', designSystem);
  
  let currentY = 70;
  
  // Elegant intro section
  doc.setFillColor(...colors.subtle);
  doc.rect(spacing.margin, currentY, pageWidth - (spacing.margin * 2), 25, 'F');
  
  doc.setFontSize(fonts.subheading.size);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('EXCLUSIVE LUXURY RATES', pageWidth / 2, currentY + 10, { align: 'center' });
  
  doc.setFontSize(fonts.body.size);
  doc.setTextColor(...colors.lightText);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium accommodations for discerning guests', pageWidth / 2, currentY + 18, { align: 'center' });
  
  currentY += 40;
  
  // Enhanced pricing table
  if (villa.priceConfigurations && villa.priceConfigurations.length > 0) {
    villa.priceConfigurations.forEach((config, index) => {
      const rateName = getLocalizedContent(config.label, 'en', 'Standard Rate');
      const rowHeight = 45;
      
      // Rate card
      doc.setFillColor(...colors.background);
      doc.rect(spacing.margin, currentY, pageWidth - (spacing.margin * 2), rowHeight, 'F');
      
      doc.setDrawColor(...colors.line);
      doc.setLineWidth(0.5);
      doc.rect(spacing.margin, currentY, pageWidth - (spacing.margin * 2), rowHeight);
      
      // Rate name
      doc.setFontSize(fonts.heading.size);
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(rateName.toUpperCase(), spacing.margin + 10, currentY + 15);
      
      // Price - large and prominent
      doc.setFontSize(fonts.title.size);
      doc.setTextColor(...colors.accent);
      doc.setFont('helvetica', 'bold');
      doc.text(`€${config.price || 0}`, pageWidth - spacing.margin - 10, currentY + 18, { align: 'right' });
      
      // Period
      doc.setFontSize(fonts.body.size);
      doc.setTextColor(...colors.lightText);
      doc.setFont('helvetica', 'normal');
      const period = config.type === 'nightly' ? 'per night' : 
                    config.type === 'weekly' ? 'per week' : 'per month';
      doc.text(period, pageWidth - spacing.margin - 10, currentY + 28, { align: 'right' });
      
      // Conditions - if any
      let conditionsText = [];
      if (config.conditions?.minStay) conditionsText.push(`Min. ${config.conditions.minStay} nights`);
      if (config.conditions?.minGuests) conditionsText.push(`Min. ${config.conditions.minGuests} guests`);
      if (config.conditions?.maxGuests) conditionsText.push(`Max. ${config.conditions.maxGuests} guests`);
      
      if (conditionsText.length > 0) {
        doc.setFontSize(fonts.caption.size);
        doc.setTextColor(...colors.lightText);
        doc.text(conditionsText.join(' • '), spacing.margin + 10, currentY + 35);
      }
      
      currentY += rowHeight + 10;
    });
  } else {
    // No pricing available
    doc.setFillColor(...colors.subtle);
    doc.rect(spacing.margin, currentY, pageWidth - (spacing.margin * 2), 30, 'F');
    
    doc.setFontSize(fonts.subheading.size);
    doc.setTextColor(...colors.text);
    doc.text('Bespoke rates available upon consultation', pageWidth / 2, currentY + 20, { align: 'center' });
    
    currentY += 40;
  }
  
  // Enhanced contact section
  currentY += 20;
  
  doc.setFillColor(...colors.primary);
  doc.rect(spacing.margin, currentY, pageWidth - (spacing.margin * 2), 50, 'F');
  
  doc.setFontSize(fonts.heading.size);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCIERGE RESERVATIONS', pageWidth / 2, currentY + 15, { align: 'center' });
  
  doc.setFontSize(fonts.body.size);
  doc.setFont('helvetica', 'normal');
  doc.text('reservations@ibiza-luxury-collection.com', pageWidth / 2, currentY + 25, { align: 'center' });
  doc.text('+34 971 123 456', pageWidth / 2, currentY + 35, { align: 'center' });
  
  doc.setFontSize(fonts.caption.size);
  doc.text('Available 24/7 for your convenience', pageWidth / 2, currentY + 43, { align: 'center' });
  
  addEnhancedFooter(doc, villa, designSystem);
};

// ============================================================================
// ENHANCED HELPER FUNCTIONS
// ============================================================================

const addEnhancedHeader = (doc, title, designSystem) => {
  const { colors, fonts, spacing } = designSystem;
  const pageWidth = 210;
  
  // Header background
  doc.setFillColor(...colors.subtle);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Accent line
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(1);
  doc.line(spacing.margin, 35, pageWidth - spacing.margin, 35);
  
  // Title
  doc.setFontSize(fonts.title.size);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(title, spacing.margin, 25);
  
  // Brand
  doc.setFontSize(fonts.caption.size);
  doc.setTextColor(...colors.lightText);
  doc.setFont('helvetica', 'normal');
  doc.text('IBIZA LUXURY COLLECTION', pageWidth - spacing.margin, 25, { align: 'right' });
};

const addEnhancedFooter = (doc, villa, designSystem) => {
  const { colors, fonts, spacing } = designSystem;
  const pageWidth = 210;
  const pageHeight = 297;
  
  const footerY = pageHeight - 25;
  
  // Footer background
  doc.setFillColor(...colors.subtle);
  doc.rect(0, footerY - 5, pageWidth, 30, 'F');
  
  // Accent line
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.5);
  doc.line(spacing.margin, footerY, pageWidth - spacing.margin, footerY);
  
  doc.setFontSize(fonts.micro.size);
  doc.setTextColor(...colors.lightText);
  
  const villaName = getLocalizedContent(villa.name, 'en', 'Luxury Villa');
  doc.text(villaName, spacing.margin, footerY + 8);
  
  doc.setFont('helvetica', 'bold');
  doc.text('IBIZA-LUXURY-COLLECTION.COM', pageWidth - spacing.margin, footerY + 8, { align: 'right' });
};

// ============================================================================
// MAIN ENHANCED PDF GENERATION
// ============================================================================

const generateEnhancedVillaPDF = async () => {
  if (!currentPdfVilla) return;
  
  const villaName = getLocalizedContent(currentPdfVilla.name, 'en', 'Luxury Villa');
  const villa = currentPdfVilla;
  
  try {
    setIsGeneratingPDF(true);
    
    console.log("🏛️ Generating enhanced luxury villa portfolio...");
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    doc.setProperties({
      title: `${villaName} - Enhanced Luxury Portfolio`,
      subject: `Premium Villa Collection - ${villaName}`,
      author: 'Ibiza Luxury Collection',
      keywords: 'luxury, villa, ibiza, exclusive, premium, mobile-optimized',
      creator: 'Ibiza Luxury Collection'
    });
    
    const designSystem = getEnhancedLuxuryDesignSystem();
    
    console.log("📄 Creating enhanced cover page...");
    await createEnhancedCoverPage(doc, villa, villaName, designSystem);
    
    console.log("📋 Adding enhanced details page...");
    doc.addPage();
    createEnhancedDetailsPage(doc, villa, designSystem);
    
    console.log("📸 Adding enhanced photography...");
    if (villa.photos && villa.photos.length > 0) {
      doc.addPage();
      await createEnhancedPhotosPage(doc, villa, designSystem);
    }
    
    console.log("💰 Adding enhanced pricing...");
    doc.addPage();
    createEnhancedPricingPage(doc, villa, designSystem);
    
    // Enhanced page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(...designSystem.colors.lightText);
      doc.setFontSize(8);
      doc.text(`${i-1}`, 105, 285, { align: 'center' });
    }
    
    const cleanName = villaName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const filename = `${cleanName}_Enhanced_Mobile_Portfolio.pdf`;
    
    doc.save(filename);
    
    console.log("✨ Enhanced mobile-optimized portfolio saved!");
    
    setIsGeneratingPDF(false);
    setCurrentPdfVilla(null);
    
  } catch (error) {
    console.error("❌ Error generating enhanced portfolio:", error);
    alert("There was an error generating the portfolio. Please try again.");
    setIsGeneratingPDF(false);
    setCurrentPdfVilla(null);
  }
};


  const getFilteredVillas = () => {
    return villas.filter(villa => {
      // Search term filter (name and address)
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = getLocalizedContent(villa.name, language, '').toLowerCase().includes(searchLower);
      const addressMatch = getLocalizedContent(villa.address, language, '').toLowerCase().includes(searchLower);
      
      if (searchTerm && !nameMatch && !addressMatch) {
        return false;
      }
      
      // Bedroom filter
      if (bedroomFilter && villa.bedrooms !== parseInt(bedroomFilter)) {
        return false;
      }
      
      // Bathroom filter
      if (bathroomFilter && villa.bathrooms !== parseInt(bathroomFilter)) {
        return false;
      }
      
      // Price filter
      if (priceFilter.min || priceFilter.max) {
        const villaPrice = villa.priceConfigurations && villa.priceConfigurations.length > 0 
          ? parseFloat(villa.priceConfigurations[0].price) || 0 
          : 0;
        
        if (priceFilter.min && villaPrice < parseFloat(priceFilter.min)) {
          return false;
        }
        
        if (priceFilter.max && villaPrice > parseFloat(priceFilter.max)) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // Translations (minimal version)
  const translations = {
    en: {
      addVilla: "Add Villa",
      editVilla: "Edit Villa",
      villaName: "Villa Name",
      address: "Address",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      description: "Description",
      amenities: "Amenities",
      owner: "Owner",
      email: "Email",
      phone: "Phone",
      notes: "Notes",
      price: "Price",
      type: "Type",
      cancel: "Cancel",
      save: "Save",
      rentalVillas: "Rental Villas",
      villaListings: "Villa Listings",
      addNewVilla: "Add New Villa",
      noImage: "No image",
      edit: "Edit",
      delete: "Delete",
      uploading: "Uploading...",
      updateVilla: "Update Villa",
      priceOptions: "Price Options",
      addPriceOption: "Add Price Option",
      priceLabel: "Price Label",
      perNight: "Per Night",
      perWeek: "Per Week",
      perMonth: "Per Month",
      dateRange: "Date Range (Optional)",
      startDate: "Start Date",
      endDate: "End Date",
      conditions: "Conditions (Optional)",
      minStay: "Min. Stay (Nights)",
      minGuests: "Min. Guests",
      maxGuests: "Max. Guests",
      photos: "Photos (Max: 24)",
      generatePDF: "Generate PDF",
      villaDetails: "Villa Details",
      generatePDFTitle: "Generate PDF for Villa",
      downloadPDF: "Download PDF",
      pdfGeneration: "PDF Generation",
      generating: "Generating PDF...",
      pdfVillaInfo: "Villa Information Document",
      pdfRates: "Rate Information",
      search: "Search villas...",
      filters: "Filters",
      showFilters: "Show Filters",
      hideFilters: "Hide Filters",
      priceRange: "Price Range",
      minPrice: "Min €",
      maxPrice: "Max €",
      anyBedrooms: "Any Bedrooms",
      anyBathrooms: "Any Bathrooms",
      resultsFound: "results found",
      clearFilters: "Clear All"
    },
    ro: {
      addVilla: "Adaugă Vilă",
      editVilla: "Editează Vila",
      villaName: "Numele Vilei",
      address: "Adresă",
      bedrooms: "Dormitoare",
      bathrooms: "Băi",
      description: "Descriere",
      amenities: "Facilități",
      owner: "Proprietar",
      email: "Email",
      phone: "Telefon",
      notes: "Note",
      price: "Preț",
      type: "Tip",
      cancel: "Anulează",
      save: "Salvează",
      rentalVillas: "Vile de Închiriat",
      villaListings: "Lista Vilelor",
      addNewVilla: "Adaugă Vilă Nouă",
      noImage: "Fără imagine",
      edit: "Editează",
      delete: "Șterge",
      uploading: "Se încarcă...",
      updateVilla: "Actualizează Vilă",
      priceOptions: "Opțiuni de Preț",
      addPriceOption: "Adaugă Opțiune de Preț",
      priceLabel: "Etichetă Preț",
      perNight: "Pe Noapte", 
      perWeek: "Pe Săptămână",
      perMonth: "Pe Lună",
      dateRange: "Interval de Date (Opțional)",
      startDate: "Data de Început",
      endDate: "Data de Sfârșit",
      conditions: "Condiții (Opțional)",
      minStay: "Ședere Min. (Nopți)",
      minGuests: "Oaspeți Min.",
      maxGuests: "Oaspeți Max.",
      photos: "Fotografii (Max: 24)",
      generatePDF: "Generează PDF",
      villaDetails: "Detalii Vilă",
      generatePDFTitle: "Generează PDF pentru Vilă",
      downloadPDF: "Descarcă PDF",
      pdfGeneration: "Generare PDF",
      generating: "Se generează PDF...",
      pdfVillaInfo: "Document de Informații Vilă",
      pdfRates: "Informații despre Tarife",
      search: "Caută vile...",
      filters: "Filtre",
      showFilters: "Arată Filtrele",
      hideFilters: "Ascunde Filtrele",
      priceRange: "Interval de Preț",
      minPrice: "Min €",
      maxPrice: "Max €",
      anyBedrooms: "Orice Dormitoare",
      anyBathrooms: "Orice Băi",
      resultsFound: "rezultate găsite",
      clearFilters: "Șterge Tot"
    }
  };
  
  const t = translations[language];
  
  return (
    <div>
      
      
      {/* Villa List */}
      <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
        {t.rentalVillas}
      </h1>
      
      <div style={{ marginBottom: '1.5rem' }}>
        {/* Header with Add Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
    <h2 style={{ fontSize: '1.2rem' }}>
      {t.villaListings}
    </h2>
    <button
      onClick={() => setIsAddingVilla(true)}
      style={{ 
        padding: '0.75rem 1.5rem', 
        backgroundColor: '#4F46E5', 
        color: 'white', 
        border: 'none', 
        borderRadius: '0.5rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
      }}
      onMouseOver={(e) => e.target.style.backgroundColor = '#4338CA'}
      onMouseOut={(e) => e.target.style.backgroundColor = '#4F46E5'}
    >
      {t.addNewVilla}
    </button>
  </div>

        {/* Search and Filter Controls Row - Responsive */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'flex-start', 
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Search Bar - Limited width on desktop */}
          <div style={{ 
            flex: window.innerWidth < 768 ? 'none' : '1',
            width: window.innerWidth < 768 ? '100%' : 'auto',
            maxWidth: window.innerWidth >= 768 ? '400px' : 'none',
            minWidth: window.innerWidth >= 768 ? '300px' : 'auto'
          }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
              {/* Search Icon */}
              <div style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF',
                pointerEvents: 'none'
              }}>
                🔍
              </div>
            </div>
          </div>

          {/* Controls Row - Stack on mobile */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            width: window.innerWidth < 768 ? '100%' : 'auto'
          }}>
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #D1D5DB',
                fontWeight: '500',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'colors 0.2s',
                backgroundColor: showFilters ? '#F3F4F6' : 'white',
                color: showFilters ? '#374151' : '#6B7280'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = showFilters ? '#E5E7EB' : '#F9FAFB'}
              onMouseOut={(e) => e.target.style.backgroundColor = showFilters ? '#F3F4F6' : 'white'}
            >
              <span>🔽</span>
              {showFilters ? t.hideFilters : t.showFilters}
            </button>

            {/* Results Count and Clear Button */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              backgroundColor: '#F9FAFB',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #E5E7EB',
              width: window.innerWidth < 768 ? '100%' : 'auto',
              justifyContent: window.innerWidth < 768 ? 'space-between' : 'center'
            }}>
              <span style={{ 
                color: '#374151', 
                fontSize: '0.875rem',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>
                {getFilteredVillas().length} {t.resultsFound}
              </span>
              
              {(searchTerm || priceFilter.min || priceFilter.max || bedroomFilter || bathroomFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPriceFilter({ min: '', max: '' });
                    setBedroomFilter('');
                    setBathroomFilter('');
                  }}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#DC2626'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#EF4444'}
                >
                  ✕ {t.clearFilters}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Filter Panel - Mobile Responsive */}
        {showFilters && (
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #E5E7EB',
            borderRadius: '0.75rem',
            padding: window.innerWidth < 768 ? '1rem' : '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid #E5E7EB'
            }}>
              <span style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: '#6B7280' }}>🔽</span>
              <h3 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                margin: 0,
                color: '#374151'
              }}>
                {t.filters}
              </h3>
            </div>
            
            {/* Responsive Grid - Single column on mobile */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: window.innerWidth < 768 ? '1rem' : '1.5rem'
            }}>
              {/* Price Range Filter - Responsive */}
              <div style={{
                backgroundColor: '#F9FAFB',
                padding: window.innerWidth < 768 ? '0.75rem' : '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #E5E7EB'
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
                  {t.priceRange} (€)
                </label>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  alignItems: 'center',
                  flexDirection: window.innerWidth < 480 ? 'column' : 'row'
                }}>
                  <input
                    type="number"
                    placeholder={t.minPrice}
                    value={priceFilter.min}
                    onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
                    style={{
                      flex: 1,
                      width: window.innerWidth < 480 ? '100%' : 'auto',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                    onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                  />
                  <span style={{ 
                    color: '#6B7280', 
                    fontWeight: '500',
                    display: window.innerWidth < 480 ? 'none' : 'block'
                  }}>—</span>
                  <input
                    type="number"
                    placeholder={t.maxPrice}
                    value={priceFilter.max}
                    onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
                    style={{
                      flex: 1,
                      width: window.innerWidth < 480 ? '100%' : 'auto',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                    onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                  />
                </div>
              </div>

              {/* Bedrooms Filter */}
              <div style={{
                backgroundColor: '#F9FAFB',
                padding: window.innerWidth < 768 ? '0.75rem' : '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #E5E7EB'
              }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '0.75rem', 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  <span style={{ marginRight: '0.5rem' }}>🛏️</span>
                  {t.bedrooms}
                </label>
                <select
                  value={bedroomFilter}
                  onChange={(e) => setBedroomFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                >
                  <option value="">{t.anyBedrooms}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5+</option>
                </select>
              </div>

              {/* Bathrooms Filter */}
              <div style={{
                backgroundColor: '#F9FAFB',
                padding: window.innerWidth < 768 ? '0.75rem' : '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #E5E7EB'
              }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '0.75rem', 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  <span style={{ marginRight: '0.5rem' }}>🚿</span>
                  {t.bathrooms}
                </label>
                <select
                  value={bathroomFilter}
                  onChange={(e) => setBathroomFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                >
                  <option value="">{t.anyBathrooms}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
              </div>
            </div>

            {/* Active Filters Summary - Better mobile layout */}
            {(searchTerm || priceFilter.min || priceFilter.max || bedroomFilter || bathroomFilter) && (
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid #E5E7EB'
              }}>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#6B7280', 
                  margin: '0 0 0.5rem 0',
                  fontWeight: '500'
                }}>
                  Active Filters:
                </p>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '0.5rem',
                  justifyContent: window.innerWidth < 768 ? 'flex-start' : 'flex-start'
                }}>
                  {searchTerm && (
                    <span style={{
                      backgroundColor: '#EBF8FF',
                      color: '#1E40AF',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      border: '1px solid #BFDBFE',
                      whiteSpace: 'nowrap'
                    }}>
                      Search: "{searchTerm.length > 15 ? searchTerm.substring(0, 15) + '...' : searchTerm}"
                    </span>
                  )}
                  {(priceFilter.min || priceFilter.max) && (
                    <span style={{
                      backgroundColor: '#F0FDF4',
                      color: '#15803D',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      border: '1px solid #BBF7D0',
                      whiteSpace: 'nowrap'
                    }}>
                      €{priceFilter.min || '0'} - €{priceFilter.max || '∞'}
                    </span>
                  )}
                  {bedroomFilter && (
                    <span style={{
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      border: '1px solid #FDE68A',
                      whiteSpace: 'nowrap'
                    }}>
                      {bedroomFilter} Bed
                    </span>
                  )}
                  {bathroomFilter && (
                    <span style={{
                      backgroundColor: '#FECACA',
                      color: '#991B1B',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      border: '1px solid #FCA5A5',
                      whiteSpace: 'nowrap'
                    }}>
                      {bathroomFilter} Bath
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {getFilteredVillas().map(villa => (
          <div key={villa.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {/* Villa photo */}
            <div style={{ height: '200px', backgroundColor: '#f3f4f6' }}>
              {villa.photos && villa.photos.length > 0 ? (
                <img 
                  src={villa.photos[0].url} 
                  alt={getLocalizedContent(villa.name, language, 'Villa')} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  {t.noImage}
                </div>
              )}
            </div>
            
            {/* Villa details */}
            <div style={{ padding: '1rem' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {getLocalizedContent(villa.name, language)}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                {getLocalizedContent(villa.address, language)}
              </p>
              
              {/* Beds & Baths */}
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ marginRight: '1rem' }}>
                  {villa.bedrooms || 0} {t.bedrooms}
                </span>
                <span>
                  {villa.bathrooms || 0} {t.bathrooms}
                </span>
              </div>
              
              {/* Price */}
              {villa.priceConfigurations && villa.priceConfigurations.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  {villa.priceConfigurations.map((config, idx) => (
                    <div key={config.id || idx} style={{ fontSize: '0.875rem' }}>
                      <strong>{getLocalizedContent(config.label, language, `Rate ${idx+1}`)}: </strong>
                      €{config.price || 0}
                      /{config.type === 'nightly' 
                        ? (language === 'en' ? 'night' : 'noapte')
                        : config.type === 'weekly'
                          ? (language === 'en' ? 'week' : 'săptămână')
                          : (language === 'en' ? 'month' : 'lună')
                      }
                    </div>
                  ))}
                </div>
              )}
              
              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                      setCurrentPdfVilla(villa);
                      setIsGeneratingPDF(true);
                      generateEnhancedVillaPDF();
                    }}
                >
                  {t.generatePDF}
                </button>
                <button
                  onClick={() => startEditingVilla(villa)}
                  style={{ 
                    marginRight: '0.5rem',
                    padding: '0.375rem 0.75rem', 
                    backgroundColor: '#10B981', 
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem'
                  }}
                >
                  {t.edit}
                </button>
                <button
                  onClick={() => handleDeleteVilla(villa.id)}
                  style={{ 
                    padding: '0.375rem 0.75rem', 
                    backgroundColor: '#EF4444', 
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem'
                  }}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Add/Edit Form Modal */}
      {(isAddingVilla || isEditingVilla) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {isAddingVilla ? t.addVilla : t.editVilla}
            </h2>
            
            <form onSubmit={isAddingVilla ? handleAddVilla : handleUpdateVilla}>
              {/* Basic Information */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {t.villaName}
                </label>
                <input
                  type="text"
                  name={`name_${language}`}
                  value={formData[`name_${language}`] || ''}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {t.address}
                </label>
                <input
                  type="text"
                  name={`address_${language}`}
                  value={formData[`address_${language}`] || ''}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    {t.bedrooms}
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms || ''}
                    onChange={handleInputChange}
                    required
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    {t.bathrooms}
                  </label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms || ''}
                    onChange={handleInputChange}
                    required
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {t.description}
                </label>
                <textarea
                  name={`description_${language}`}
                  value={formData[`description_${language}`] || ''}
                  onChange={handleInputChange}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem'
                  }}
                ></textarea>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {t.amenities}
                </label>
                <input
                  type="text"
                  name={`amenities_${language}`}
                  value={formData[`amenities_${language}`] || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              {/* Owner Section */}
              <div style={{ 
                marginBottom: '1.5rem',
                border: '1px solid #E5E7EB',
                borderRadius: '0.375rem',
                padding: '1rem'
              }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                  {t.owner}
                </h3>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    {t.owner}
                  </label>
                  <input
                    type="text"
                    name="owner_name"
                    value={formData.owner_name || ''}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      {t.email}
                    </label>
                    <input
                      type="email"
                      name="owner_email"
                      value={formData.owner_email || ''}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      {t.phone}
                    </label>
                    <input
                      type="tel"
                      name="owner_phone"
                      value={formData.owner_phone || ''}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    {t.notes}
                  </label>
                  <textarea
                    name={`owner_notes_${language}`}
                    value={formData[`owner_notes_${language}`] || ''}
                    onChange={handleInputChange}
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem'
                    }}
                  ></textarea>
                </div>
              </div>
              
              {/* Price Configurations */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <label style={{ fontWeight: 'medium' }}>
                    {t.priceOptions}
                  </label>
                  <button
                    type="button"
                    onClick={addPriceConfiguration}
                    style={{
                      backgroundColor: '#4F46E5',
                      color: 'white',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    {t.addPriceOption}
                  </button>
                </div>
                
                {priceConfigs.map((config, index) => (
                  <div 
                    key={config.id} 
                    style={{ 
                      border: '1px solid #E5E7EB', 
                      borderRadius: '0.375rem',
                      padding: '1rem',
                      marginBottom: '1rem',
                      position: 'relative'
                    }}
                  >
                    {priceConfigs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePriceConfiguration(index)}
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          backgroundColor: '#EF4444',
                          color: 'white',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        ×
                      </button>
                    )}
                    
                    {/* Price Label */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        {t.priceLabel}
                      </label>
                      <input
                        type="text"
                        name={`priceConfig_${index}_label_${language}`}
                        value={config[`label_${language}`] || ''}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #D1D5DB',
                          borderRadius: '0.375rem'
                        }}
                      />
                    </div>
                    
                    {/* Price Amount and Type */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          {t.price}
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ 
                            position: 'absolute', 
                            left: '0.75rem', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none' 
                          }}>€</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*\.?[0-9]*"
                            name={`priceConfig_${index}_price`}
                            value={config.price || ''}
                            onChange={handleInputChange}
                            required
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              paddingLeft: '1.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem'
                            }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          {t.type}
                        </label>
                        <select
                          name={`priceConfig_${index}_type`}
                          value={config.type || 'nightly'}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.375rem'
                          }}
                        >
                          <option value="nightly">{t.perNight}</option>
                          <option value="weekly">{t.perWeek}</option>
                          <option value="monthly">{t.perMonth}</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Date Range */}
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontWeight: 'medium', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        {t.dateRange}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                            {t.startDate}
                          </label>
                          <input
                            type="date"
                            name={`priceConfig_${index}_dateRange_start`}
                            value={config.dateRange_start || ''}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                            {t.endDate}
                          </label>
                          <input
                            type="date"
                            name={`priceConfig_${index}_dateRange_end`}
                            value={config.dateRange_end || ''}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Conditions */}
                    <div>
                      <p style={{ fontWeight: 'medium', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        {t.conditions}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                            {t.minStay}
                          </label>
                          <input
                            type="number"
                            name={`priceConfig_${index}_conditions_minStay`}
                            value={config.conditions_minStay || ''}
                            onChange={handleInputChange}
                            min="0"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                            {t.minGuests}
                          </label>
                          <input
                            type="number"
                            name={`priceConfig_${index}_conditions_minGuests`}
                            value={config.conditions_minGuests || ''}
                            onChange={handleInputChange}
                            min="0"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                            {t.maxGuests}
                          </label>
                          <input
                            type="number"
                            name={`priceConfig_${index}_conditions_maxGuests`}
                            value={config.conditions_maxGuests || ''}
                            onChange={handleInputChange}
                            min="0"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Photos */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {t.photos}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem'
                  }}
                />
                
                {/* Photo previews */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  {/* Existing photos */}
                  {existingPhotos.map((photo, index) => (
                    <div key={`existing-${index}`} style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <img 
                        src={photo.url} 
                        alt={`Photo ${index}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.25rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(index, true)}
                        style={{
                          position: 'absolute',
                          top: '0.25rem',
                          right: '0.25rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.8)',
                          color: 'white',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {/* New photo previews */}
                  {previewUrls.map((url, index) => (
                    <div key={`preview-${index}`} style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <img 
                        src={url} 
                        alt={`Preview ${index}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.25rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(index, false)}
                        style={{
                          position: 'absolute',
                          top: '0.25rem',
                          right: '0.25rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.8)',
                          color: 'white',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Form buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAddingVilla(false);
                    setIsEditingVilla(false);
                    setCurrentVilla(null);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white'
                  }}
                >
                  {t.cancel}
                </button>
                
                <button
                  type="submit"
                  disabled={isUploading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: isUploading ? '#9CA3AF' : '#4F46E5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: isUploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isUploading 
                    ? t.uploading
                    : (isAddingVilla 
                      ? t.addVilla
                      : t.updateVilla
                    )
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* PDF Generation Modal */}
      {isGeneratingPDF && currentPdfVilla && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {t.generatePDFTitle}
            </h2>
            
            {/* Hidden content for PDF generation */}
            <div id="pdf-content" style={{ padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
              {/* PDF Header */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', color: '#004C99', marginBottom: '0.5rem' }}>
                  Ibiza Luxury Villas
                </h1>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {t.pdfVillaInfo}
                </p>
              </div>
              
              {/* Villa Basic Info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', borderBottom: '2px solid #004C99', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  {t.villaDetails}: {getLocalizedContent(currentPdfVilla.name, language)}
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p><strong>{t.address}:</strong> {getLocalizedContent(currentPdfVilla.address, language)}</p>
                    <p><strong>{t.bedrooms}:</strong> {currentPdfVilla.bedrooms || 0}</p>
                    <p><strong>{t.bathrooms}:</strong> {currentPdfVilla.bathrooms || 0}</p>
                  </div>
                  
                  {currentPdfVilla.photos && currentPdfVilla.photos.length > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <img 
                        src={currentPdfVilla.photos[0].url} 
                        alt={getLocalizedContent(currentPdfVilla.name, language)} 
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Description */}
              {getLocalizedContent(currentPdfVilla.description, language) && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    {t.description}
                  </h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>
                    {getLocalizedContent(currentPdfVilla.description, language)}
                  </p>
                </div>
              )}
              
              {/* Amenities */}
              {getLocalizedContent(currentPdfVilla.amenities, language) && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    {t.amenities}
                  </h3>
                  <p>
                    {getLocalizedContent(currentPdfVilla.amenities, language)}
                  </p>
                </div>
              )}
              
              {/* Pricing */}
              {currentPdfVilla.priceConfigurations && currentPdfVilla.priceConfigurations.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    {t.pdfRates}
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'left' }}>
                          {t.priceLabel}
                        </th>
                        <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'left' }}>
                          {t.price}
                        </th>
                        <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'left' }}>
                          {t.conditions}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPdfVilla.priceConfigurations.map((config, idx) => (
                        <tr key={config.id || idx}>
                          <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>
                            {getLocalizedContent(config.label, language, `Rate ${idx+1}`)}
                          </td>
                          <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>
                            €{config.price || 0}
                            /{config.type === 'nightly' 
                              ? (language === 'en' ? 'night' : 'noapte')
                              : config.type === 'weekly'
                                ? (language === 'en' ? 'week' : 'săptămână')
                                : (language === 'en' ? 'month' : 'lună')
                            }
                          </td>
                          <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>
                            {config.conditions?.minStay && (
                              <div>
                                {t.minStay}: {config.conditions.minStay}
                              </div>
                            )}
                            {config.conditions?.minGuests && (
                              <div>
                                {t.minGuests}: {config.conditions.minGuests}
                              </div>
                            )}
                            {config.conditions?.maxGuests && (
                              <div>
                                {t.maxGuests}: {config.conditions.maxGuests}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Contact Info */}
              {currentPdfVilla.owner && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    {t.owner}
                  </h3>
                  <div>
                    {currentPdfVilla.owner.name && (
                      <p><strong>{t.owner}:</strong> {currentPdfVilla.owner.name}</p>
                    )}
                    {currentPdfVilla.owner.email && (
                      <p><strong>{t.email}:</strong> {currentPdfVilla.owner.email}</p>
                    )}
                    {currentPdfVilla.owner.phone && (
                      <p><strong>{t.phone}:</strong> {currentPdfVilla.owner.phone}</p>
                    )}
                    {getLocalizedContent(currentPdfVilla.owner?.notes, language) && (
                      <p><strong>{t.notes}:</strong> {getLocalizedContent(currentPdfVilla.owner.notes, language)}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <p>Ibiza Luxury Villas - {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            {/* PDF buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsGeneratingPDF(false);
                  setCurrentPdfVilla(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white'
                }}
              >
                {t.cancel}
              </button>
              
              <button
  type="button"
  onClick={generateEnhancedVillaPDF}  // ← Changed function name
  style={{
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem'
  }}
>
  {t.downloadPDF}
</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Villas;