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
    
    try {
      // First, try to fetch the image as a blob
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Convert blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read blob as base64'));
        };
        reader.readAsDataURL(blob);
      });
      
    } catch (fetchError) {
      console.warn("Fetch method failed, trying canvas method:", fetchError);
      
      // Fallback to canvas method
      try {
        const img = new Image();
        
        return new Promise((resolve, reject) => {
          img.onload = function() {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              
              const dataURL = canvas.toDataURL('image/jpeg', 0.9);
              resolve(dataURL);
            } catch (err) {
              console.error("Canvas error:", err);
              reject(err);
            }
          };
          
          img.onerror = function(e) {
            console.error("Image load error:", e);
            reject(new Error(`Failed to load image: ${url}`));
          };
          
          // Set crossOrigin BEFORE setting src
          img.crossOrigin = 'anonymous';
          img.src = url;
        });
      } catch (canvasError) {
        console.error("Canvas method also failed:", canvasError);
        return null;
      }
    }
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
    if (typeof obj === 'string') return obj;
    if (typeof obj !== 'object') return String(obj);
    if (obj[lang]) return obj[lang];
    
    // Try the other language if current one is missing
    const otherLang = lang === 'en' ? 'ro' : 'en';
    if (obj[otherLang]) return obj[otherLang];
    
    return fallback;
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
      const fileName = `villas/${Date.now()}_${file.name}`;
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

  // Enhanced cover page with luxury design
  const addCoverPage = async (doc, villa, villaName, colors, fontSizes) => {
    // Luxury gradient background
    doc.setFillColor(250, 250, 250);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Add elegant header border
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, 210, 8, 'F');
    
    // Gold accent line
    doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.rect(0, 8, 210, 2, 'F');
    
    // Company logo area with elegant typography
    doc.setFontSize(32);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('IBIZA', 105, 35, { align: 'center' });
    
    doc.setFontSize(24);
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('LUXURY VILLAS', 105, 45, { align: 'center' });
    
    // Decorative elements
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(1);
    doc.line(70, 50, 140, 50);
    
    // Main villa image with luxury frame
    if (villa.photos && villa.photos.length > 0) {
      try {
        console.log("Loading cover image:", villa.photos[0].url);
        const imgData = await loadImageAsBase64(villa.photos[0].url);
        
        if (imgData) {
          // Create luxury frame
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(20, 65, 170, 130, 5, 5, 'F');
          
          // Shadow effect
          doc.setFillColor(0, 0, 0, 0.1);
          doc.roundedRect(22, 67, 170, 130, 5, 5, 'F');
          
          // Gold frame border
          doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
          doc.setLineWidth(3);
          doc.roundedRect(20, 65, 170, 130, 5, 5, 'S');
          
          // Add the image
          doc.addImage(imgData, 'JPEG', 25, 70, 160, 120);
          
          console.log("Cover image added successfully");
        } else {
          throw new Error("Image data is null");
        }
      } catch (err) {
        console.error("Error loading cover image:", err);
        
        // Luxury placeholder
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(20, 65, 170, 130, 5, 5, 'F');
        
        doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.setLineWidth(3);
        doc.roundedRect(20, 65, 170, 130, 5, 5, 'S');
        
        // Elegant placeholder icon
        doc.setFontSize(48);
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text('🏖️', 105, 135, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
        doc.text('Villa Photography', 105, 150, { align: 'center' });
      }
    }
    
    // Villa name with luxury styling
    doc.setFontSize(28);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont('helvetica', 'bold');
    
    // Handle long villa names
    const nameLines = doc.splitTextToSize(villaName, 160);
    let nameStartY = 215;
    if (nameLines.length > 1) {
      nameStartY = 210;
    }
    doc.text(nameLines, 105, nameStartY, { align: 'center' });
    
    // Location with elegant styling
    const addressText = getLocalizedContent(villa.address, 'en', 'Ibiza, Spain');
    doc.setFontSize(16);
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFont('helvetica', 'italic');
    doc.text(addressText, 105, nameStartY + 15, { align: 'center' });
    
    // Luxury property highlights in elegant boxes
    const highlights = [];
    if (villa.bedrooms) highlights.push({ icon: '🛏️', label: 'Bedrooms', value: villa.bedrooms });
    if (villa.bathrooms) highlights.push({ icon: '🛁', label: 'Bathrooms', value: villa.bathrooms });
    
    // Add main price if available
    if (villa.priceConfigurations && villa.priceConfigurations.length > 0) {
      const mainPrice = villa.priceConfigurations[0];
      highlights.push({ 
        icon: '💎', 
        label: 'Starting from', 
        value: `€${mainPrice.price}/night` 
      });
    }
    
    if (highlights.length > 0) {
      const boxWidth = 50;
      const boxHeight = 40;
      const spacing = 10;
      const totalWidth = (boxWidth * highlights.length) + (spacing * (highlights.length - 1));
      let startX = (210 - totalWidth) / 2;
      
      highlights.forEach((highlight, index) => {
        // Luxury box with gradient effect
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(startX, 245, boxWidth, boxHeight, 3, 3, 'F');
        
        // Gold border
        doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.setLineWidth(1);
        doc.roundedRect(startX, 245, boxWidth, boxHeight, 3, 3, 'S');
        
        // Icon
        doc.setFontSize(16);
        doc.text(highlight.icon, startX + (boxWidth/2), 255, { align: 'center' });
        
        // Value
        doc.setFontSize(12);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(String(highlight.value), startX + (boxWidth/2), 268, { align: 'center' });
        
        // Label
        doc.setFontSize(8);
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
        doc.setFont('helvetica', 'normal');
        doc.text(highlight.label, startX + (boxWidth/2), 278, { align: 'center' });
        
        startX += boxWidth + spacing;
      });
    }
    
    // Elegant footer
    doc.setFontSize(10);
    doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 20, 290);
    doc.text('www.ibizaluxuryvillas.com', 190, 290, { align: 'right' });
  };

  // Enhanced photos page with better layout
  const addPhotosPage = async (doc, villa, colors, fontSizes) => {
    addPageHeader(doc, 'Villa Gallery', colors, fontSizes);
    
    if (villa.photos && villa.photos.length > 0) {
      const margin = 15;
      const gutter = 8;
      const availableWidth = 210 - (margin * 2);
      
      // For luxury layout, use different arrangements based on photo count
      if (villa.photos.length === 1) {
        // Single large photo
        const photoHeight = 160;
        const yPos = 40;
        
        try {
          console.log("Loading single photo:", villa.photos[0].url);
          const imgData = await loadImageAsBase64(villa.photos[0].url);
          
          if (imgData) {
            // Luxury frame
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin - 5, yPos - 5, availableWidth + 10, photoHeight + 10, 5, 5, 'F');
            
            doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.setLineWidth(2);
            doc.roundedRect(margin - 5, yPos - 5, availableWidth + 10, photoHeight + 10, 5, 5, 'S');
            
            doc.addImage(imgData, 'JPEG', margin, yPos, availableWidth, photoHeight);
            console.log("Single photo added successfully");
          }
        } catch (err) {
          console.error("Error loading single photo:", err);
          addPhotoPlaceholder(doc, margin, yPos, availableWidth, photoHeight, colors, '1');
        }
        
      } else if (villa.photos.length <= 4) {
        // Grid layout for 2-4 photos
        const photosPerRow = villa.photos.length === 2 ? 2 : 2;
        const photoWidth = (availableWidth - gutter) / photosPerRow;
        const photoHeight = photoWidth * 0.75;
        
        let yPos = 40;
        let photoIndex = 0;
        
        for (let row = 0; row < Math.ceil(villa.photos.length / photosPerRow); row++) {
          for (let col = 0; col < photosPerRow && photoIndex < villa.photos.length; col++) {
            const xPos = margin + (col * (photoWidth + gutter));
            const currentYPos = yPos + (row * (photoHeight + gutter));
            
            try {
              console.log(`Loading photo ${photoIndex + 1}:`, villa.photos[photoIndex].url);
              const imgData = await loadImageAsBase64(villa.photos[photoIndex].url);
              
              if (imgData) {
                // Luxury frame for each photo
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(xPos - 2, currentYPos - 2, photoWidth + 4, photoHeight + 4, 3, 3, 'F');
                
                doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
                doc.setLineWidth(1);
                doc.roundedRect(xPos - 2, currentYPos - 2, photoWidth + 4, photoHeight + 4, 3, 3, 'S');
                
                doc.addImage(imgData, 'JPEG', xPos, currentYPos, photoWidth, photoHeight);
                console.log(`Photo ${photoIndex + 1} added successfully`);
              } else {
                throw new Error("Image data is null");
              }
            } catch (err) {
              console.error(`Error loading photo ${photoIndex + 1}:`, err);
              addPhotoPlaceholder(doc, xPos, currentYPos, photoWidth, photoHeight, colors, `${photoIndex + 1}`);
            }
            
            photoIndex++;
          }
        }
      } else {
        // For many photos, use a more compact grid
        const photosPerRow = 3;
        const photoWidth = (availableWidth - (gutter * (photosPerRow - 1))) / photosPerRow;
        const photoHeight = photoWidth * 0.75;
        
        let yPos = 40;
        const maxPhotosToShow = 9; // Show up to 9 photos
        
        for (let i = 0; i < Math.min(maxPhotosToShow, villa.photos.length); i++) {
          const row = Math.floor(i / photosPerRow);
          const col = i % photosPerRow;
          
          const xPos = margin + (col * (photoWidth + gutter));
          const currentYPos = yPos + (row * (photoHeight + gutter));
          
          // Check if we need a new page
          if (currentYPos + photoHeight > 260) {
            doc.addPage();
            addPageHeader(doc, 'Villa Gallery (Continued)', colors, fontSizes);
            yPos = 40;
            // Recalculate position for new page
            const newRow = row - Math.floor((260 - 40) / (photoHeight + gutter));
            const newCurrentYPos = yPos + (newRow * (photoHeight + gutter));
            
            try {
              console.log(`Loading photo ${i + 1}:`, villa.photos[i].url);
              const imgData = await loadImageAsBase64(villa.photos[i].url);
              
              if (imgData) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(xPos - 1, newCurrentYPos - 1, photoWidth + 2, photoHeight + 2, 2, 2, 'F');
                
                doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
                doc.setLineWidth(0.5);
                doc.roundedRect(xPos - 1, newCurrentYPos - 1, photoWidth + 2, photoHeight + 2, 2, 2, 'S');
                
                doc.addImage(imgData, 'JPEG', xPos, newCurrentYPos, photoWidth, photoHeight);
                console.log(`Photo ${i + 1} added successfully`);
              }
            } catch (err) {
              console.error(`Error loading photo ${i + 1}:`, err);
              addPhotoPlaceholder(doc, xPos, newCurrentYPos, photoWidth, photoHeight, colors, `${i + 1}`);
            }
          } else {
            try {
              console.log(`Loading photo ${i + 1}:`, villa.photos[i].url);
              const imgData = await loadImageAsBase64(villa.photos[i].url);
              
              if (imgData) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(xPos - 1, currentYPos - 1, photoWidth + 2, photoHeight + 2, 2, 2, 'F');
                
                doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
                doc.setLineWidth(0.5);
                doc.roundedRect(xPos - 1, currentYPos - 1, photoWidth + 2, photoHeight + 2, 2, 2, 'S');
                
                doc.addImage(imgData, 'JPEG', xPos, currentYPos, photoWidth, photoHeight);
                console.log(`Photo ${i + 1} added successfully`);
              }
            } catch (err) {
              console.error(`Error loading photo ${i + 1}:`, err);
              addPhotoPlaceholder(doc, xPos, currentYPos, photoWidth, photoHeight, colors, `${i + 1}`);
            }
          }
        }
        
        // Add note if there are more photos
        if (villa.photos.length > maxPhotosToShow) {
          doc.setFontSize(10);
          doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
          doc.text(`+ ${villa.photos.length - maxPhotosToShow} more photos available`, 105, 250, { align: 'center' });
        }
      }
    }
    
    addPageFooter(doc, villa, colors, fontSizes);
  };

  // Helper function to add luxury photo placeholder
  const addPhotoPlaceholder = (doc, x, y, width, height, colors, photoNumber) => {
    // Elegant placeholder
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');
    
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, width, height, 3, 3, 'S');
    
    // Camera icon and text
    doc.setFontSize(Math.min(width / 8, 14));
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.text('📷', x + width/2, y + height/2 - 5, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
    doc.text(`Photo ${photoNumber}`, x + width/2, y + height/2 + 8, { align: 'center' });
    doc.text('Loading...', x + width/2, y + height/2 + 16, { align: 'center' });
  };

  // Helper function to add price and booking page
  const addPriceAndBookingPage = (doc, villa, colors, fontSizes) => {
    // Header
    addPageHeader(doc, 'Price & Booking Information', colors, fontSizes);
    
    // Current vertical position tracker
    let yPos = 40;
    
    // Pricing section
    if (villa.priceConfigurations && villa.priceConfigurations.length > 0) {
      doc.setFontSize(fontSizes.sectionTitle);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Rate Information', 20, yPos);
      
      // Gold underline
      doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setLineWidth(0.5);
      doc.line(20, yPos + 2, 80, yPos + 2);
      
      yPos += 15;
      
      // Price table header
      const colWidths = [60, 30, 80];
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
      const tableX = 20;
      
      // Draw table header
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(tableX, yPos - 6, tableWidth, 8, 'F');
      
      doc.setFontSize(fontSizes.small);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      
      let xOffset = tableX;
      doc.text('Rate Label', xOffset + 4, yPos);
      xOffset += colWidths[0];
      
      doc.text('Price', xOffset + 4, yPos);
      xOffset += colWidths[1];
      
      doc.text('Conditions', xOffset + 4, yPos);
      
      yPos += 6;
      
      // Draw table rows
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont('helvetica', 'normal');
      
      let evenRow = true;
      villa.priceConfigurations.forEach((config, idx) => {
        // Check if we need to start a new page
        if (yPos > 260) {
          doc.addPage();
          addPageHeader(doc, 'Price & Booking Information', colors, fontSizes);
          yPos = 40;
          
          // Redraw table header on new page
          doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.rect(tableX, yPos - 6, tableWidth, 8, 'F');
          
          doc.setFontSize(fontSizes.small);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          
          let xOffset = tableX;
          doc.text('Rate Label', xOffset + 4, yPos);
          xOffset += colWidths[0];
          
          doc.text('Price', xOffset + 4, yPos);
          xOffset += colWidths[1];
          
          doc.text('Conditions', xOffset + 4, yPos);
          
          yPos += 6;
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.setFont('helvetica', 'normal');
        }
        
        // Row background (alternating)
        if (evenRow) {
          doc.setFillColor(250, 250, 250);
          doc.rect(tableX, yPos - 5, tableWidth, 16, 'F');
        }
        evenRow = !evenRow;
        
        // Row text
        let rowHeight = 16;
        xOffset = tableX;
        
        // Rate label
        const label = getLocalizedContent(config.label, 'en', `Rate ${idx+1}`);
        const labelLines = doc.splitTextToSize(label, colWidths[0] - 8);
        doc.text(labelLines, xOffset + 4, yPos);
        xOffset += colWidths[0];
        
        // Price value
        const priceText = `€${config.price || 0}/night`;
        doc.text(priceText, xOffset + 4, yPos);
        xOffset += colWidths[1];
        
        // Conditions
        let conditionsText = '';
        if (config.conditions) {
          if (config.conditions.minStay) {
            conditionsText += `Min. Stay: ${config.conditions.minStay}\n`;
          }
          if (config.conditions.minGuests) {
            conditionsText += `Min. Guests: ${config.conditions.minGuests}\n`;
          }
          if (config.conditions.maxGuests) {
            conditionsText += `Max. Guests: ${config.conditions.maxGuests}`;
          }
        }
        
        if (conditionsText.trim()) {
          const conditionLines = doc.splitTextToSize(conditionsText, colWidths[2] - 8);
          doc.text(conditionLines, xOffset + 4, yPos);
          
          // Adjust row height if needed
          const conditionHeight = conditionLines.length * 5 + 6;
          if (conditionHeight > rowHeight) {
            rowHeight = conditionHeight;
          }
        }
        
        // Date range (if available)
        if (config.dateRange && (config.dateRange.start || config.dateRange.end)) {
          let dateRangeText = '';
          if (config.dateRange.start && config.dateRange.end) {
            dateRangeText = `${config.dateRange.start} - ${config.dateRange.end}`;
          } else if (config.dateRange.start) {
            dateRangeText = `From ${config.dateRange.start}`;
          } else if (config.dateRange.end) {
            dateRangeText = `Until ${config.dateRange.end}`;
          }
          
          if (dateRangeText) {
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.setFontSize(fontSizes.small - 1);
            doc.text(dateRangeText, tableX + 4, yPos + 5);
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            doc.setFontSize(fontSizes.small);
          }
        }
        
        yPos += rowHeight;
      });
      
      // Table border
      doc.setDrawColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
      doc.setLineWidth(0.3);
      doc.rect(tableX, yPos - villa.priceConfigurations.length * 16 - 6, tableWidth, villa.priceConfigurations.length * 16 + 6);
      
      yPos += 15;
    }
    
    // Booking information/call to action
    if (yPos < 220) {
      // Decorative separator
      doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setLineWidth(1);
      doc.line(60, yPos, 150, yPos);
      yPos += 15;
      
      // Call to action
      doc.setFontSize(fontSizes.sectionTitle);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Ready to Experience Luxury?', 105, yPos, { align: 'center' });
      yPos += 10;
      
      doc.setFontSize(fontSizes.normal);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont('helvetica', 'normal');
      doc.text('Contact us to book this exceptional villa and start your perfect Ibiza getaway.', 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Contact box
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(50, yPos, 110, 40, 3, 3, 'FD');
      
      doc.setFontSize(fontSizes.normal);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Ibiza Luxury Villas', 105, yPos + 10, { align: 'center' });
      
      doc.setFontSize(fontSizes.small);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont('helvetica', 'normal');
      doc.text('Email: bookings@ibizaluxuryvillas.com', 105, yPos + 20, { align: 'center' });
      doc.text('Phone: +34 971 123 456', 105, yPos + 30, { align: 'center' });
    }
    
    // Add page footer
    addPageFooter(doc, villa, colors, fontSizes);
  };

  // Helper function to add main information page
  const addMainInfoPage = (doc, villa, colors, fontSizes) => {
    // Header section
    addPageHeader(doc, 'Villa Details', colors, fontSizes);
    
    // Current vertical position tracker
    let yPos = 40;
    
    // Villa description section
    if (villa.description) {
      const descriptionText = getLocalizedContent(villa.description, 'en', '');
      if (descriptionText.trim()) {
        doc.setFontSize(fontSizes.sectionTitle);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Description', 20, yPos);
        
        // Gold underline
        doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.setLineWidth(0.5);
        doc.line(20, yPos + 2, 80, yPos + 2);
        
        yPos += 10;
        
        // Description text with word wrapping
        doc.setFontSize(fontSizes.normal);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFont('helvetica', 'normal');
        
        const descriptionLines = doc.splitTextToSize(descriptionText, 170);
        doc.text(descriptionLines, 20, yPos);
        
        // Update position based on text height
        yPos += (descriptionLines.length * 6) + 15;
      }
    }
    
    // Amenities section
    if (villa.amenities) {
      const amenitiesText = getLocalizedContent(villa.amenities, 'en', '');
      if (amenitiesText.trim()) {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          addPageHeader(doc, 'Villa Details', colors, fontSizes);
          yPos = 40;
        }
        
        doc.setFontSize(fontSizes.sectionTitle);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Amenities', 20, yPos);
        
        // Gold underline
        doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.setLineWidth(0.5);
        doc.line(20, yPos + 2, 80, yPos + 2);
        
        yPos += 10;
        
        // Format amenities as a bulleted list if they contain commas
        doc.setFontSize(fontSizes.normal);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFont('helvetica', 'normal');
        
        if (amenitiesText.includes(',')) {
          const amenitiesList = amenitiesText.split(',').map(item => item.trim()).filter(item => item);
          amenitiesList.forEach((amenity, index) => {
            // Check if we need a new page
            if (yPos > 270) {
              doc.addPage();
              addPageHeader(doc, 'Villa Details', colors, fontSizes);
              yPos = 40;
            }
            
            // Draw bullet point
            doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.circle(22, yPos - 1.5, 1, 'F');
            
            // Amenity text
            const wrappedAmenity = doc.splitTextToSize(amenity, 160);
            doc.text(wrappedAmenity, 25, yPos);
            
            // Update position
            yPos += (wrappedAmenity.length * 6) + 4;
          });
        } else {
          // Just show as regular text if no commas
          const amenityLines = doc.splitTextToSize(amenitiesText, 170);
          doc.text(amenityLines, 20, yPos);
          yPos += (amenityLines.length * 6) + 15;
        }
      }
    }
    
    // Owner information in a stylish box (if available)
    if (villa.owner && (villa.owner.name || villa.owner.email || villa.owner.phone)) {
      // Check if we need a new page
      if (yPos > 220) {
        doc.addPage();
        addPageHeader(doc, 'Villa Details', colors, fontSizes);
        yPos = 40;
      }
      
      // Owner info box
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setLineWidth(0.5);
      
      // Determine box height based on content
      const boxHeight = villa.owner.notes ? 70 : 50;
      doc.roundedRect(20, yPos, 170, boxHeight, 3, 3, 'FD');
      
      // Owner section title
      doc.setFontSize(fontSizes.sectionTitle);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Owner', 25, yPos + 10);
      
      // Owner details
      let ownerYPos = yPos + 20;
      doc.setFontSize(fontSizes.normal);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont('helvetica', 'normal');
      
      if (villa.owner.name) {
        doc.text(`Owner: ${villa.owner.name}`, 25, ownerYPos);
        ownerYPos += 8;
      }
      
      if (villa.owner.email) {
        doc.text(`Email: ${villa.owner.email}`, 25, ownerYPos);
        ownerYPos += 8;
      }
      
      if (villa.owner.phone) {
        doc.text(`Phone: ${villa.owner.phone}`, 25, ownerYPos);
        ownerYPos += 8;
      }
      
      // Owner notes
      if (villa.owner.notes) {
        const notesText = getLocalizedContent(villa.owner.notes, 'en', '');
        if (notesText.trim()) {
          doc.text(`Notes: ${notesText}`, 25, ownerYPos);
        }
      }
      
      // Update position
      yPos += boxHeight + 15;
    }
    
    // Add page footer
    addPageFooter(doc, villa, colors, fontSizes);
  };

  // Helper function to add page header
  const addPageHeader = (doc, title, colors, fontSizes) => {
    // Gold decorative line at top
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 15, 190, 15);
    
    // Page title
    doc.setFontSize(fontSizes.sectionTitle);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, 25);
    
    // Right aligned page title
    doc.text('Ibiza Luxury Villas', 190, 25, { align: 'right' });
  };

  // Helper function to add page footer
  const addPageFooter = (doc, villa, colors, fontSizes) => {
    // Footer separator line
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 280, 190, 280);
    
    // Footer text
    doc.setFontSize(fontSizes.small);
    doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
    doc.setFont('helvetica', 'normal');
    
    // Left side - villa name
    const villaName = getLocalizedContent(villa.name, 'en', 'Villa');
    doc.text(villaName, 20, 288);
    
    // Right side - contact
    doc.text('www.ibizaluxuryvillas.com', 190, 288, { align: 'right' });
  };
  
  // This is the only new function we're adding - no conflicts with existing code
  const addAmenitiesPage = (doc, villa, colors, fontSizes) => {
    // Add page heading
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, 210, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(fontSizes.subheader);
    doc.text('LUXURY AMENITIES', 105, 13, { align: 'center' });
    
    // Start content area
    let currentY = 40;
    
    // Group amenities by category (if available)
    const amenities = villa.amenities || [];
    
    // Create a two-column layout for amenities
    const columnWidth = 85;
    const leftColX = 20;
    const rightColX = 115;
    
    // Prepare amenities list
    const amenitiesList = Array.isArray(amenities) ? amenities : 
                           (typeof amenities === 'string' ? amenities.split(',').map(a => a.trim()) : []);
    
    if (amenitiesList.length === 0) {
      // No amenities available
      doc.setTextColor(...colors.text);
      doc.setFontSize(fontSizes.normal);
      doc.text('Amenities information not available', 105, 150, { align: 'center' });
      return;
    }
    
    // Split amenities into two columns
    const midPoint = Math.ceil(amenitiesList.length / 2);
    const leftColAmenities = amenitiesList.slice(0, midPoint);
    const rightColAmenities = amenitiesList.slice(midPoint);
    
    // Draw left column
    doc.setTextColor(...colors.text);
    doc.setFontSize(fontSizes.normal);
    leftColAmenities.forEach((amenity, index) => {
      doc.text(`• ${amenity}`, leftColX, currentY + (index * 10));
    });
    
    // Draw right column
    rightColAmenities.forEach((amenity, index) => {
      doc.text(`• ${amenity}`, rightColX, currentY + (index * 10));
    });
    
    // Add elegant footer note
    doc.setTextColor(...colors.lightText);
    doc.setFontSize(fontSizes.small);
    doc.text('Additional amenities may be available upon request', 105, 270, { align: 'center' });
  };
  
  // Handle PDF generation
  const generateVillaPDF = async () => {
    if (!currentPdfVilla) return;
    
    // Always use English for PDF generation regardless of current UI language
    const pdfLanguage = 'en';
    const villaName = getLocalizedContent(currentPdfVilla.name, pdfLanguage, 'Villa');
    const villa = currentPdfVilla;
    
    try {
      // Set loading state
      setIsGeneratingPDF(true);
      
      // Create PDF with premium quality settings
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      // Set document properties for better metadata
      doc.setProperties({
        title: `${villaName} - Ibiza Luxury Villas`,
        subject: `Luxury Villa Details - ${villaName}`,
        author: 'Ibiza Luxury Villas',
        keywords: 'luxury, villa, ibiza, rental, premium, exclusive',
        creator: 'Ibiza Luxury Villas PDF Generator'
      });
      
      // Premium style constants for sophisticated design
      const colors = {
        primary: [0, 45, 114],       // Deep blue
        secondary: [190, 167, 94],   // Gold accent
        text: [45, 41, 38],          // Rich dark for text
        lightText: [96, 96, 96],     // Light gray for secondary text
        background: [252, 250, 248], // Warm white background
        borders: [230, 215, 185]     // Subtle cream for borders
      };
      
      const fontSizes = {
        header: 28,
        subheader: 18,
        sectionTitle: 16,
        normal: 12,
        small: 10
      };
      
      // ---- Create cover page ----
      await addCoverPage(doc, villa, villaName, colors, fontSizes);
      
      // ---- Create interior pages ----
      // Main information page
      doc.addPage();
      addMainInfoPage(doc, villa, colors, fontSizes);
      
      // Photos page (if available)
      if (villa.photos && villa.photos.length > 0) {
        doc.addPage();
        await addPhotosPage(doc, villa, colors, fontSizes);
      }
      
      // Price and booking information
      doc.addPage();
      addPriceAndBookingPage(doc, villa, colors, fontSizes);
      
      // Add amenities page if villa has amenities
      if (villa.amenities && villa.amenities.length > 0) {
        doc.addPage();
        addAmenitiesPage(doc, villa, colors, fontSizes);
      }
      
      // Add page numbers to all pages except the cover
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(...colors.lightText);
        doc.setFontSize(8);
        doc.text(`Page ${i-1} of ${pageCount-1}`, 105, 285, { align: 'center' });
      }
      
      // Save the PDF with a clean filename
      doc.save(`${villaName.replace(/\s+/g, '_')}_luxury_villa.pdf`);
      
      // Close the PDF modal
      setIsGeneratingPDF(false);
      setCurrentPdfVilla(null);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("There was an error generating the PDF. Please try again.");
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
                  onClick={() => startGeneratePDF(villa)}
                  style={{ 
                    marginRight: '0.5rem',
                    padding: '0.375rem 0.75rem', 
                    backgroundColor: '#3B82F6', 
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem'
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
                onClick={generateVillaPDF}
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