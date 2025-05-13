import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDatabase } from '../../../context/DatabaseContext';
import { 
  getFirestore, collection, doc, getDoc, 
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  query, where, getDocs 
} from 'firebase/firestore';
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from 'firebase/storage';

function AddProperty() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const db = useDatabase();
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Direct language handling without hooks
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en';
  });
  
  useEffect(() => {
    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('appLanguage');
      if (currentLang && currentLang !== language) {
        setLanguage(currentLang);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [language]);
  
  // Translations object
  const translations = {
    ro: {
      editProperty: 'Editează Proprietatea',
      addNewProperty: 'Adaugă Proprietate Nouă',
      errorLoadingProperty: 'Eroare la încărcarea proprietății. Încercați din nou.',
      propertyType: 'Tipul Proprietății',
      villa: 'Vilă',
      landParcel: 'Teren',
      propertyTitle: 'Titlul Proprietății',
      location: 'Locație',
      price: 'Preț',
      size: 'Mărime',
      status: 'Status',
      available: 'Disponibilă',
      underOffer: 'Ofertă în Curs',
      sold: 'Vândută',
      villaDetails: 'Detalii Vilă',
      bedrooms: 'Dormitoare',
      bathrooms: 'Băi',
      yearBuilt: 'Anul Construcției',
      amenities: 'Facilități',
      swimmingPool: 'Piscină',
      garden: 'Grădină',
      parking: 'Parcare',
      seaView: 'Vedere la Mare',
      airConditioning: 'Aer Condiționat',
      heatingSystem: 'Sistem de Încălzire',
      terrace: 'Terasă',
      securitySystem: 'Sistem de Securitate',
      landDetails: 'Detalii Teren',
      zoning: 'Zonare',
      selectZoning: 'Selectează tipul de zonare',
      residential: 'Rezidențial',
      commercial: 'Comercial',
      agricultural: 'Agricol',
      mixed: 'Mixt',
      buildableArea: 'Suprafață Construibilă',
      terrain: 'Tip Teren',
      selectTerrain: 'Selectează tipul de teren',
      flat: 'Plat',
      sloped: 'Înclinat',
      hillside: 'Versant',
      oceanfront: 'La Malul Mării',
      description: 'Descriere',
      propertyImages: 'Imagini Proprietate',
      documents: 'Documente',
      uploadImages: 'Încarcă Imagini',
      uploadDocuments: 'Încarcă Documente',
      maxImagesNote: 'Încarcă până la 10 imagini (JPG, PNG)',
      documentFormatsNote: 'Formate suportate: PDF, DOC, DOCX',
      cancel: 'Anulează',
      saveProperty: 'Salvează Proprietatea',
      updateProperty: 'Actualizează Proprietatea',
      saving: 'Se salvează...',
      errorSavingProperty: 'Eroare la salvarea proprietății. Încercați din nou.',
      enterPropertyTitle: 'Introduceți titlul proprietății',
      enterLocation: 'Introduceți locația în Ibiza',
      enterPropertyDescription: 'Introduceți descrierea proprietății',
      errorUploadingImages: 'Eroare la încărcarea imaginilor. Încercați din nou.',
      errorUploadingDocuments: 'Eroare la încărcarea documentelor. Încercați din nou.',
      enterPrice: 'Introduceți prețul (ex: 1500000)'
    },
    en: {
      editProperty: 'Edit Property',
      addNewProperty: 'Add New Property',
      errorLoadingProperty: 'Error loading property. Please try again.',
      propertyType: 'Property Type',
      villa: 'Villa',
      landParcel: 'Land Parcel',
      propertyTitle: 'Property Title',
      location: 'Location',
      price: 'Price',
      size: 'Size',
      status: 'Status',
      available: 'Available',
      underOffer: 'Under Offer',
      sold: 'Sold',
      villaDetails: 'Villa Details',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      yearBuilt: 'Year Built',
      amenities: 'Amenities',
      swimmingPool: 'Swimming Pool',
      garden: 'Garden',
      parking: 'Parking',
      seaView: 'Sea View',
      airConditioning: 'Air Conditioning',
      heatingSystem: 'Heating System',
      terrace: 'Terrace',
      securitySystem: 'Security System',
      landDetails: 'Land Details',
      zoning: 'Zoning',
      selectZoning: 'Select zoning type',
      residential: 'Residential',
      commercial: 'Commercial',
      agricultural: 'Agricultural',
      mixed: 'Mixed',
      buildableArea: 'Buildable Area',
      terrain: 'Terrain',
      selectTerrain: 'Select terrain type',
      flat: 'Flat',
      sloped: 'Sloped',
      hillside: 'Hillside',
      oceanfront: 'Oceanfront',
      description: 'Description',
      propertyImages: 'Property Images',
      documents: 'Documents',
      uploadImages: 'Upload Images',
      uploadDocuments: 'Upload Documents',
      maxImagesNote: 'Upload up to 10 images (JPG, PNG)',
      documentFormatsNote: 'PDF, DOC, DOCX formats supported',
      cancel: 'Cancel',
      saveProperty: 'Save Property',
      updateProperty: 'Update Property',
      saving: 'Saving...',
      errorSavingProperty: 'Error saving property. Please try again.',
      enterPropertyTitle: 'Enter property title',
      enterLocation: 'Enter location in Ibiza',
      enterPropertyDescription: 'Enter property description',
      errorUploadingImages: 'Error uploading images. Please try again.',
      errorUploadingDocuments: 'Error uploading documents. Please try again.',
      enterPrice: 'Enter price (e.g. 1500000)'
    }
  };
  
  // Current translation object
  const t = translations[language];
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'villa', // Default to villa
    title: '',
    location: '',
    description: {
      en: '',
      ro: ''
    }, // Initialize as an object with language keys
    price: '',
    size: '',
    status: 'available',
    images: [],
    documents: [],
    
    // Villa-specific fields
    bedrooms: '',
    bathrooms: '',
    yearBuilt: '',
    amenities: [],
    
    // Land parcel-specific fields
    zoning: '',
    buildableArea: '',
    terrain: ''
  });
  
  
  // Amenities checkboxes
  const availableAmenities = [
    { id: 'pool', name: t.swimmingPool },
    { id: 'garden', name: t.garden },
    { id: 'parking', name: t.parking },
    { id: 'seaView', name: t.seaView },
    { id: 'airConditioning', name: t.airConditioning },
    { id: 'heatingSystem', name: t.heatingSystem },
    { id: 'terrace', name: t.terrace },
    { id: 'security', name: t.securitySystem }
  ];
  
  // Fetch property data if editing
  useEffect(() => {
    if (isEditing) {
      const fetchProperty = async () => {
        try {
          setLoading(true);
          
          if (!db) {
            console.error("Database context not available");
            setError("Database connection error");
            setLoading(false);
            return;
          }
          
          // Use Firebase v9 syntax directly
          const docRef = doc(db.firestore, 'properties', id);
          const propertyDoc = await getDoc(docRef);
          
          if (propertyDoc.exists()) {
            const data = propertyDoc.data();
            
            // Convert Firestore document to form format
            setFormData({
              type: data.type || 'villa',
              title: data.name?.en || data.name?.ro || '',
              location: data.location || '',
              
              // Properly preserve multilingual description structure
              description: {
                en: data.description?.en || '',
                ro: data.description?.ro || ''
              },
              
              price: data.pricing?.price?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '',
              size: data.size?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '',
              status: data.status || 'available',
              images: data.photos || [],
              documents: data.documents || [],
              
              // Villa-specific fields
              bedrooms: data.specs?.bedrooms || '',
              bathrooms: data.specs?.bathrooms || '',
              yearBuilt: data.specs?.year || '',
              
              // Convert boolean map to array for amenities
              amenities: Object.keys(data.amenities || {}).filter(key => data.amenities[key] === true),
              
              // Land-specific fields
              zoning: data.specs?.zoning || '',
              buildableArea: data.specs?.buildableArea || '',
              terrain: data.specs?.terrain || ''
            });
          }else {
            setError(t.errorLoadingProperty);
          }
        } catch (error) {
          console.error("Error loading property:", error);
          setError(t.errorLoadingProperty);
        } finally {
          setLoading(false);
        }
      };
      
      fetchProperty();
    }
  }, [id, isEditing, t.errorLoadingProperty, db]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle amenities
      if (name.startsWith('amenity-')) {
        const amenityId = name.replace('amenity-', '');
        setFormData(prev => ({
          ...prev,
          amenities: checked 
            ? [...prev.amenities, amenityId]
            : prev.amenities.filter(a => a !== amenityId)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Format numbers with thousands separators as you type
  const handleNumberChange = (e) => {
    const { name, value, selectionStart } = e.target;
    
    // Store cursor position
    const cursorPosition = selectionStart || 0;
    
    // Get the previous value before changes
    const previousValue = formData[name] || '';
    
    // Remove all non-numeric characters for processing
    const rawValue = value.replace(/[^\d.]/g, '');
    
    // Ensure there's only one decimal point
    const parts = rawValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? `.${parts.slice(1).join('')}` : '';
    
    // Format integer part with thousands separators
    const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    // Combine with decimal part
    const formattedValue = formattedIntegerPart + decimalPart;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
    
    // Calculate cursor position adjustment if needed
    // This will run on the next render to adjust the cursor position
    setTimeout(() => {
      if (e.target) {
        // Count how many thousands separators were added before the cursor
        const countSeparatorsBeforeCursor = (str, position) => {
          let count = 0;
          for (let i = 0; i < position; i++) {
            if (str[i] === ',') count++;
          }
          return count;
        };
        
        // Calculate new cursor position based on added/removed separators
        const prevSeparators = countSeparatorsBeforeCursor(previousValue, cursorPosition);
        const newSeparators = countSeparatorsBeforeCursor(formattedValue, cursorPosition + 1);
        const diff = newSeparators - prevSeparators;
        
        // Set cursor position, accounting for added/removed separators
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
      }
    }, 0);
  };
  
  // Helper function to format price for display elsewhere
  const formatPrice = (price) => {
    if (!price) return '';
    // Remove any existing formatting first
    const rawValue = price.toString().replace(/,/g, '');
    // Format with thousands separators
    const parts = rawValue.split('.');
    const formattedInteger = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? `${formattedInteger}.${parts[1]}` : formattedInteger;
  };
  
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    try {
      setSaving(true);
      
      if (!db) {
        console.error("Database context not available");
        setError("Database connection error");
        setSaving(false);
        return;
      }
      
      // Verify user is authenticated
      if (!db.currentUser) {
        console.error("User not authenticated");
        setError("You must be logged in to upload files");
        setSaving(false);
        return;
      }
      
      // Verify storage and company ID
      if (!db.storage || !db.companyId) {
        console.error("Storage or company ID not available:", {
          storage: !!db.storage,
          companyId: db.companyId
        });
        setError("Storage connection error");
        setSaving(false);
        return;
      }
      
      console.log("Authenticated user:", db.currentUser.uid);
      console.log("Company ID:", db.companyId);
      
      // Upload each file
      const uploadPromises = files.map(async (file) => {
        try {
          // Create a unique filename
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name}`;
          const path = `${db.companyId}/properties/photos/${fileName}`;
          
          console.log("Attempting to upload to path:", path);
          
          // Create storage reference using the Firebase v9 SDK directly
          const storageRef = ref(db.storage, path);
          
          // Upload file
          const uploadResult = await uploadBytes(storageRef, file);
          console.log("Upload successful:", uploadResult);
          
          // Get download URL
          const url = await getDownloadURL(uploadResult.ref);
          console.log("Download URL received:", url);
          
          return url;
        } catch (error) {
          console.error("Error uploading file:", error);
          console.error("Error code:", error.code);
          if (error.serverResponse) console.error("Server response:", error.serverResponse);
          throw error;
        }
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      console.log("All uploads completed, URLs:", uploadedUrls);
      
      // Update form data with new images
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
      setError(t.errorUploadingImages);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    try {
      setSaving(true);
      
      if (!db) {
        console.error("Database context not available");
        setError("Database connection error");
        setSaving(false);
        return;
      }
      
      // Verify user is authenticated
      if (!db.currentUser) {
        console.error("User not authenticated");
        setError("You must be logged in to upload files");
        setSaving(false);
        return;
      }
      
      // Verify storage and company ID
      if (!db.storage || !db.companyId) {
        console.error("Storage or company ID not available");
        setError("Storage connection error");
        setSaving(false);
        return;
      }
      
      console.log("Attempting document upload for company:", db.companyId);
      
      // Upload each file
      const uploadPromises = files.map(async (file) => {
        try {
          // Create a unique filename
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name}`;
          const path = `${db.companyId}/properties/documents/${fileName}`;
          
          console.log("Attempting to upload document to path:", path);
          
          // Create storage reference using the Firebase v9 SDK directly
          const storageRef = ref(db.storage, path);
          
          // Upload file
          const uploadResult = await uploadBytes(storageRef, file);
          console.log("Document upload successful");
          
          // Get download URL
          const url = await getDownloadURL(uploadResult.ref);
          
          return {
            name: file.name,
            url: url,
            type: file.type
          };
        } catch (error) {
          console.error("Error uploading document:", error);
          console.error("Error code:", error.code);
          if (error.serverResponse) console.error("Server response:", error.serverResponse);
          throw error;
        }
      });
      
      const uploadedDocs = await Promise.all(uploadPromises);
      console.log("All document uploads completed");
      
      // Update form data with new documents
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...uploadedDocs]
      }));
    } catch (error) {
      console.error("Error uploading documents:", error);
      setError(t.errorUploadingDocuments);
    } finally {
      setSaving(false);
    }
  };
  
  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };
  
  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (!db) {
        console.error("Database context not available");
        setError("Database connection error");
        setSaving(false);
        return;
      }
      
      // Make sure description is correctly structured as an object
      if (typeof formData.description === 'string') {
        // If for some reason description is still a string, convert it
        formData.description = {
          en: formData.description,
          ro: formData.description
        };
      }
      
      // Prepare the property data for Firestore
      const propertyData = {
        // Basic details in correct format
        name: { // Assuming title should be saved as name.en/name.ro
          en: formData.title,
          ro: formData.title
        },
        type: formData.type,
        location: formData.location,
        size: parseFloat(formData.size) || 0,
        status: formData.status,
        
        // Store price as a number - handle large numbers properly
        pricing: {
          price: Number(formData.price.replace(/,/g, '')) || 0,
          currency: 'EUR'
        },
        
        // Preserve the multilingual description structure
        description: {
          en: formData.description?.en || '',
          ro: formData.description?.ro || ''
        },
        
        // Specifications based on property type
        specs: formData.type === 'villa' 
          ? {
              // Villa specs
              bedrooms: parseInt(formData.bedrooms, 10) || 0,
              bathrooms: parseInt(formData.bathrooms, 10) || 0,
              year: parseInt(formData.yearBuilt, 10) || null
            }
          : {
              // Land specs
              zoning: formData.zoning || '',
              buildableArea: parseFloat(formData.buildableArea) || 0,
              terrain: formData.terrain || ''
            },
        
        // Convert amenities array to object of booleans
        amenities: availableAmenities.reduce((obj, amenity) => ({
          ...obj,
          [amenity.id]: formData.amenities.includes(amenity.id)
        }), {}),
        
        // Image and document URLs
        photos: formData.images,
        documents: formData.documents,
        
        // Update timestamps
        updatedAt: serverTimestamp()
      };
      
      // Add companyId if creating a new property
      if (!isEditing) {
        propertyData.companyId = db.companyId;
        propertyData.createdAt = serverTimestamp();
        propertyData.createdBy = db.currentUser?.uid;
      }
      
      console.log("Saving property data:", propertyData);
      
      if (isEditing) {
        // Update existing property
        const propertyRef = doc(db.firestore, 'properties', id);
        await updateDoc(propertyRef, propertyData);
      } else {
        // Create new property
        const propertiesCollection = collection(db.firestore, 'properties');
        await addDoc(propertiesCollection, propertyData);
      }
      
      console.log("Property saved successfully");
      
      // Navigate back to property list or detail page
      if (isEditing) {
        navigate(`/services/properties-for-sale/${id}`);
      } else {
        navigate('/services/properties-for-sale');
      }
    } catch (error) {
      console.error("Error saving property:", error);
      setError(t.errorSavingProperty);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit}>
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          {isEditing ? t.editProperty : t.addNewProperty}
        </h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Property Type */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">{t.propertyType}</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="type"
                value="villa"
                checked={formData.type === 'villa'}
                onChange={handleChange}
                className="h-5 w-5 text-indigo-600"
              />
              <span className="ml-2 text-gray-700">{t.villa}</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="type"
                value="land"
                checked={formData.type === 'land'}
                onChange={handleChange}
                className="h-5 w-5 text-indigo-600"
              />
              <span className="ml-2 text-gray-700">{t.landParcel}</span>
            </label>
          </div>
        </div>
        
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Title */}
          <div className="col-span-2">
            <label className="block text-gray-700 font-medium mb-2">{t.propertyTitle} *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t.enterPropertyTitle}
            />
          </div>
          
          {/* Location */}
          <div className="col-span-2">
            <label className="block text-gray-700 font-medium mb-2">{t.location} *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t.enterLocation}
            />
          </div>
          
          {/* Price - Modified to handle large numbers */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">{t.price} (€) *</label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleNumberChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t.enterPrice}
              inputMode="numeric"
            />
          </div>
          
          {/* Size with live formatting */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">{t.size} (m²) *</label>
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleNumberChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
          
          {/* Status */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">{t.status}</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="available">{t.available}</option>
              <option value="under_offer">{t.underOffer}</option>
              <option value="sold">{t.sold}</option>
            </select>
          </div>
        </div>
        
        {/* Type-specific fields */}
        {formData.type === 'villa' ? (
          // Villa specific fields
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t.villaDetails}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">{t.bedrooms}</label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">{t.bathrooms}</label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">{t.yearBuilt}</label>
                <input
                  type="number"
                  name="yearBuilt"
                  value={formData.yearBuilt}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="YYYY"
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
            
            {/* Amenities */}
            <div className="mt-4">
              <label className="block text-gray-700 font-medium mb-2">{t.amenities}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableAmenities.map(amenity => (
                  <label key={amenity.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name={`amenity-${amenity.id}`}
                      checked={formData.amenities.includes(amenity.id)}
                      onChange={handleChange}
                      className="h-5 w-5 text-indigo-600 rounded"
                    />
                    <span className="ml-2 text-gray-700">{amenity.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Land parcel specific fields
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t.landDetails}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">{t.zoning}</label>
                <select
                  name="zoning"
                  value={formData.zoning}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t.selectZoning}</option>
                  <option value="residential">{t.residential}</option>
                  <option value="commercial">{t.commercial}</option>
                  <option value="agricultural">{t.agricultural}</option>
                  <option value="mixed">{t.mixed}</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">{t.buildableArea} (m²)</label>
                <input
                  type="text"
                  name="buildableArea"
                  value={formData.buildableArea}
                  onChange={handleNumberChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">{t.terrain}</label>
                <select
                  name="terrain"
                  value={formData.terrain}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t.selectTerrain}</option>
                  <option value="flat">{t.flat}</option>
                  <option value="sloped">{t.sloped}</option>
                  <option value="hillside">{t.hillside}</option>
                  <option value="oceanfront">{t.oceanfront}</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Description */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">{t.description}</label>
          
          {/* English Description */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm mb-1">English</label>
            <textarea
              name="description_en"
              value={formData.description?.en || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                description: {
                  ...prev.description,
                  en: e.target.value
                }
              }))}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={language === 'en' ? t.enterPropertyDescription : "Enter property description in English"}
            ></textarea>
          </div>
          
          {/* Romanian Description */}
          <div>
            <label className="block text-gray-600 text-sm mb-1">Română</label>
            <textarea
              name="description_ro"
              value={formData.description?.ro || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                description: {
                  ...prev.description,
                  ro: e.target.value
                }
              }))}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={language === 'ro' ? t.enterPropertyDescription : "Introduceți descrierea proprietății în română"}
            ></textarea>
          </div>
        </div>
        
        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">{t.propertyImages}</label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center justify-center bg-white px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
              <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t.uploadImages}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={saving}
              />
            </label>
            <span className="text-sm text-gray-500">{t.maxImagesNote}</span>
          </div>
          
          {/* Image previews */}
          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative rounded-md overflow-hidden group">
                  <img
                    src={typeof image === 'string' ? image : image.url}
                    alt={`Property ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                    {typeof image === 'string' ? `Image ${index + 1}` : image.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Document Upload */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">{t.documents}</label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center justify-center bg-white px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
              <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t.uploadDocuments}
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleDocumentUpload}
                className="hidden"
                disabled={saving}
              />
            </label>
            <span className="text-sm text-gray-500">{t.documentFormatsNote}</span>
          </div>
          
          {/* Document list */}
          {formData.documents.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-800">{doc.name || `Document ${index + 1}`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocument(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/services/properties-for-sale')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.saving}
              </>
            ) : (
              isEditing ? t.updateProperty : t.saveProperty
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddProperty;