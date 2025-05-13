// Updated Villas component without language toggle, using global settings
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db, storage } from '../../firebase/config';

function Villas() {
  const [villas, setVillas] = useState([]);
  const [isAddingVilla, setIsAddingVilla] = useState(false);
  const [isEditingVilla, setIsEditingVilla] = useState(false);
  const [currentVilla, setCurrentVilla] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  
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
    // Price will be handled separately
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
      photos: "Photos (Max: 24)"
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
      photos: "Fotografii (Max: 24)"
    }
  };
  
  const t = translations[language];
  
  return (
    <div>
      {/* Villa List */}
      <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
        {t.rentalVillas}
      </h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem' }}>
          {t.villaListings}
        </h2>
        <button
          onClick={() => setIsAddingVilla(true)}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem' }}
        >
          {t.addNewVilla}
        </button>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {villas.map(villa => (
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
    </div>
  );
}

export default Villas;