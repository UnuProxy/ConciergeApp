import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, where, query } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db, storage } from '../../firebase/config';
import { useDatabase } from '../../context/DatabaseContext';

const monthKeys = [
  'january', 'february', 'march', 'april',
  'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december'
];

const monthLabels = {
  january: 'January',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  june: 'June',
  july: 'July',
  august: 'August',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December'
};

const seasonalMonthOrder = ['may', 'june', 'july', 'august', 'september', 'october'];

const seasonByMonth = {
  may: 'extraSeason',
  june: 'lowSeason',
  july: 'peakSeason',
  august: 'peakSeason',
  september: 'lowSeason',
  october: 'extraSeason'
};

const ensureStorageDownloadUrl = (url = '') => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('http')) return trimmed;
  if (trimmed.includes('alt=media')) return trimmed;
  return trimmed.includes('?') ? `${trimmed}&alt=media` : `${trimmed}?alt=media`;
};

const extractPathFromUrl = (url = '') => {
  if (!url.startsWith('http')) return url;
  const parts = url.split('/o/');
  if (parts.length < 2) return '';
  const pathAndQuery = parts[1];
  return decodeURIComponent(pathAndQuery.split('?')[0] || '');
};

const normalizeVillaPhotos = (photos = []) => {
  if (!Array.isArray(photos)) return [];
  return photos
    .map(photo => {
      if (!photo) return null;
      if (typeof photo === 'string') {
        const safeUrl = ensureStorageDownloadUrl(photo);
        return safeUrl ? { url: safeUrl, path: extractPathFromUrl(photo) || null } : null;
      }
      const safeUrl = ensureStorageDownloadUrl(photo.url || '');
      if (!safeUrl) return null;
      return {
        ...photo,
        url: safeUrl,
        path: photo.path || extractPathFromUrl(photo.url || '') || null
      };
    })
    .filter(Boolean);
};

const resolvePhotoDownloads = async (photos = [], storageInstance) => {
  const normalized = normalizeVillaPhotos(photos);
  // If the URL is already a public download link, avoid extra round-trips.
  const needsLookup = photo =>
    photo?.url &&
    !photo.url.includes('alt=media') &&
    storageInstance &&
    (photo.path || extractPathFromUrl(photo.url));

  const resolved = await Promise.all(
    normalized.map(async photo => {
      if (!photo?.url) return null;
      if (!needsLookup(photo)) return photo;

      const candidatePath = photo.path || extractPathFromUrl(photo.url);
      if (!candidatePath) return photo;

      try {
        const downloadUrl = await getDownloadURL(ref(storageInstance, candidatePath));
        return { ...photo, url: ensureStorageDownloadUrl(downloadUrl), path: candidatePath };
      } catch (err) {
        console.warn('Failed to fetch download URL for photo', candidatePath, err);
        return photo;
      }
    })
  );

  return resolved.filter(Boolean);
};

const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file for preview'));
    reader.readAsDataURL(file);
  });
};

const generateSafeFileName = (file) => {
  const original = file?.name || 'photo';
  const sanitized = original.replace(/[^a-zA-Z0-9._-]/g, '_');
  const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  return `${unique}_${sanitized}`;
};

const buildStoragePath = (file) => {
  const safeName = generateSafeFileName(file);
  const baseFolder = 'villas/shared';
  return `${baseFolder}/${safeName}`;
};

const buildBrochurePath = (file) => {
  const safeName = generateSafeFileName(file);
  // Use shared folder to avoid company-restricted paths
  const baseFolder = 'villas/shared/brochures';
  return `${baseFolder}/${safeName}`;
};

function Villas() {
  const dbContext = useDatabase();
  const userCompanyId = dbContext?.companyId || dbContext?.companyInfo?.id || null;
  const userRole = dbContext?.userRole || dbContext?.role || dbContext?.currentUser?.role || null;
  const [villas, setVillas] = useState([]);
  const [isAddingVilla, setIsAddingVilla] = useState(false);
  const [isEditingVilla, setIsEditingVilla] = useState(false);
  const [currentVilla, setCurrentVilla] = useState(null);
  const [viewVilla, setViewVilla] = useState(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
const [brochureFile, setBrochureFile] = useState(null);
const [brochureUrl, setBrochureUrl] = useState('');
const clearBrochure = () => {
  setBrochureFile(null);
  setBrochureUrl('');
};
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
  const [bedroomFilter, setBedroomFilter] = useState('');
  const [bathroomFilter, setBathroomFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRates, setExpandedRates] = useState({});

  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name_en: '',
    name_ro: '',
    address_en: '',
    address_ro: '',
    bedrooms: '',
    bathrooms: '',
    description_en: '',
    description_ro: '',
    propertyLink: '',
    amenities_en: '',
    amenities_ro: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_notes_en: '',
    owner_notes_ro: '',
    owner_confidential: false,
  });
  
  const [priceConfigs, setPriceConfigs] = useState([{
    id: Date.now(),
    label_en: '',
    label_ro: '',
    price: '',
    type: 'weekly',
    month: '',
    dateRange_start: '',
    dateRange_end: '',
    conditions_minStay: '',
    conditions_minGuests: '',
    conditions_maxGuests: ''
  }]);
  
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'ro');
  const [formLanguage, setFormLanguage] = useState(() => localStorage.getItem('appLanguage') || 'ro');

  const toggleRates = (villaId) => {
    setExpandedRates((prev) => ({ ...prev, [villaId]: !prev[villaId] }));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('appLanguage') || 'ro';
      setLanguage(currentLang);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          await signInAnonymously(auth);
          console.log('Signed in anonymously for storage access');
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
    };
    initAuth();
  }, []);

  // Localized fallback helper: current language -> en -> ro -> string
  const getLoc = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[language] || value.en || value.ro || '';
  };

  useEffect(() => {
    fetchVillas();
    // Villas are shared across companies; no companyId filter needed
  }, [userCompanyId]);

  const fetchVillas = async () => {
    try {
      const villaCollection = collection(db, 'villas');
      const villaSnapshot = await getDocs(villaCollection);
      const villaList = await Promise.all(
        villaSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const photos = await resolvePhotoDownloads(data.photos, storage);
          return {
            id: doc.id,
            ...data,
            photos
          };
        })
      );
      setVillas(villaList);
    } catch (error) {
      console.error('Error fetching villas:', error);
    }
  };

  const handleInputChange = (e) => {
    if (!e || !e.target) return;
    const { name, value } = e.target;
    if (!name) return;

    const isPriceAmountField = name.startsWith('priceConfig_') && name.endsWith('_price');
    if (isPriceAmountField) {
      const numericValue = value.replace(/[^0-9.]/g, '');
      if (numericValue.split('.').length > 2) return;
      const parts = name.split('_');
      if (parts.length >= 3) {
        const index = parseInt(parts[1]);
        const newConfigs = [...priceConfigs];
        while (newConfigs.length <= index) {
          newConfigs.push({
            id: Date.now() + newConfigs.length,
            label_en: `Rate ${newConfigs.length + 1}`,
            label_ro: `Tarif ${newConfigs.length + 1}`,
            price: '',
            type: 'weekly',
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
      return;
    }

    if (name.startsWith('priceConfig_')) {
      const parts = name.split('_');
      if (parts.length >= 3) {
        const index = parseInt(parts[1]);
        const field = parts.slice(2).join('_');
        const newConfigs = [...priceConfigs];
        while (newConfigs.length <= index) {
          newConfigs.push({
            id: Date.now() + newConfigs.length,
            label_en: `Rate ${newConfigs.length + 1}`,
            label_ro: `Tarif ${newConfigs.length + 1}`,
            price: '',
            type: 'weekly',
            dateRange_start: '',
            dateRange_end: '',
            conditions_minStay: '',
            conditions_minGuests: '',
            conditions_maxGuests: ''
          });
        }
        newConfigs[index][field] = value;
        setPriceConfigs(newConfigs);
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmenitySuggestionClick = (amenity) => {
    const fieldName = `amenities_${language}`;
    setFormData(prev => {
      const currentValue = prev[fieldName] || '';
      const existingAmenities = currentValue.split(',').map(item => item.trim()).filter(Boolean);
      if (existingAmenities.some(item => item.toLowerCase() === amenity.toLowerCase())) {
        return prev;
      }
      const updatedValue = currentValue.trim()
        ? `${currentValue.trim()}, ${amenity}`
        : amenity;
      return { ...prev, [fieldName]: updatedValue };
    });
  };

  const amenitySuggestions = {
    en: ['Pool', 'Sauna', 'Tennis court', 'Jacuzzi', 'Gym', 'Cinema room', 'Wi-Fi', 'Air conditioning'],
    ro: ['Piscină', 'Saună', 'Teren de tenis', 'Jacuzzi', 'Sală de fitness', 'Cameră de cinema', 'Wi-Fi', 'Aer condiționat']
  };

  const addPriceConfiguration = () => {
    setPriceConfigs(prev => ([...prev, {
      id: Date.now(),
      label_en: '',
      label_ro: '',
      price: '',
      type: 'weekly',
      month: '',
      dateRange_start: '',
      dateRange_end: '',
      conditions_minStay: '',
      conditions_minGuests: '',
      conditions_maxGuests: ''
    }]));
  };

  const removePriceConfiguration = (index) => {
    if (priceConfigs.length <= 1) return;
    setPriceConfigs(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      name_en: '', name_ro: '',
      address_en: '', address_ro: '',
      bedrooms: '', bathrooms: '',
      description_en: '', description_ro: '',
      propertyLink: '',
      amenities_en: '', amenities_ro: '',
      owner_name: '', owner_email: '', owner_phone: '',
      owner_notes_en: '', owner_notes_ro: '',
      owner_confidential: false,
    });
    setPriceConfigs([{
      id: Date.now(),
      label_en: '',
      label_ro: '',
      price: '', type: 'weekly', month: '',
      dateRange_start: '', dateRange_end: '',
      conditions_minStay: '', conditions_minGuests: '', conditions_maxGuests: ''
    }]);
    setExistingPhotos([]);
    setPhotoFiles([]);
    setPreviewUrls([]);
    setBrochureFile(null);
    setBrochureUrl('');
  };

  const handlePhotoChange = async (e) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const currentPhotoCount = existingPhotos.length + photoFiles.length;
    const newTotalCount = currentPhotoCount + filesArray.length;
    if (newTotalCount > 24) {
      alert('You can only upload a maximum of 24 photos.');
      return;
    }
    setPhotoFiles(prev => [...prev, ...filesArray]);
    try {
      const newPreviewUrls = await Promise.all(filesArray.map(file => readFileAsDataURL(file)));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    } catch (previewError) {
      console.error('Error creating image previews:', previewError);
    }
  };

  const uploadPhotos = async () => {
    if (photoFiles.length === 0) return [];
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
        console.log('Signed in anonymously for photo upload');
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
    setIsUploading(true);
    const photoUrls = [];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const filePath = buildStoragePath(file);
      const storageRef = ref(storage, filePath);
      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          }, (error) => {
            console.error('Upload error:', error);
            reject(error);
          }, async () => {
            try {
              let downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const safeUrl = ensureStorageDownloadUrl(downloadURL);
              photoUrls.push({ url: safeUrl, path: filePath });
              resolve();
            } catch (urlError) {
              console.error('Error getting download URL:', urlError);
              reject(urlError);
            }
          });
        });
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }
    setIsUploading(false);
    setUploadProgress(0);
    return photoUrls;
  };
  
  const uploadBrochure = async () => {
    if (!brochureFile) return '';
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
    try {
      const filePath = buildBrochurePath(brochureFile);
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, brochureFile);
      await uploadTask;
      const downloadURL = await getDownloadURL(storageRef);
      return ensureStorageDownloadUrl(downloadURL);
    } catch (error) {
      console.error('Error uploading brochure:', error);
      // If upload fails (e.g., permissions), keep existing/manual URL
      return brochureUrl || '';
    }
  };

  const prepareFormDataForSave = () => {
    const monthlyPayload = {};
    priceConfigs.forEach(config => {
      if (config.month) {
        const normalized = config.month.toLowerCase();
        const numericValue = parseFloat(String(config.price || '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
        if (!Number.isNaN(numericValue)) {
          monthlyPayload[normalized] = {
            price: numericValue,
            type: config.type || 'weekly'
          };
        }
      }
    });
    const pricingPayload = currentVilla?.pricing ? { ...currentVilla.pricing } : {};
    if (Object.keys(monthlyPayload).length > 0) {
      pricingPayload.monthly = monthlyPayload;
    } else if (pricingPayload.monthly) {
      delete pricingPayload.monthly;
    }
    return {
      name: { en: formData.name_en || '', ro: formData.name_ro || '' },
      address: { en: formData.address_en || '', ro: formData.address_ro || '' },
      bedrooms: formData.bedrooms || '',
      bathrooms: formData.bathrooms || '',
      description: { en: formData.description_en || '', ro: formData.description_ro || '' },
      propertyLink: (formData.propertyLink || '').trim(),
      amenities: { en: formData.amenities_en || '', ro: formData.amenities_ro || '' },
      owner: {
        name: formData.owner_name || '',
        email: formData.owner_email || '',
        phone: formData.owner_phone || '',
        notes: { en: formData.owner_notes_en || '', ro: formData.owner_notes_ro || '' },
        confidential: !!formData.owner_confidential
      },
      priceConfigurations: priceConfigs.map(config => ({
        id: config.id,
        label: { en: config.label_en || '', ro: config.label_ro || '' },
        price: config.price || '',
        type: config.type || 'weekly',
        month: config.month || '',
        dateRange: { start: config.dateRange_start || '', end: config.dateRange_end || '' },
        conditions: {
          minStay: config.conditions_minStay || '',
          minGuests: config.conditions_minGuests || '',
          maxGuests: config.conditions_maxGuests || ''
        }
      })),
      pricing: pricingPayload
    };
  };

  const handleAddVilla = async (e) => {
    e.preventDefault();
    try {
      const photoUrls = await uploadPhotos();
      const brochureDownload = await uploadBrochure();
      const villaData = {
        ...prepareFormDataForSave(),
        photos: photoUrls,
        brochureUrl: brochureDownload || brochureUrl || '',
        companyId: userCompanyId,
        createdAt: new Date()
      };
      const villaCollection = collection(db, 'villas');
      await addDoc(villaCollection, villaData);
      
      setSuccessMessage(language === 'ro' ? 'Vila a fost adăugată cu succes!' : 'Villa successfully added!');
      setTimeout(() => setSuccessMessage(''), 3000);

      resetForm();
      setIsAddingVilla(false);
      fetchVillas();
    } catch (error) {
      console.error('Error adding villa: ', error);
    }
  };

  const handleUpdateVilla = async (e) => {
    e.preventDefault();
    try {
      if (!currentVilla || !currentVilla.id) {
        console.error('No current villa selected for update');
        return;
      }
      const newPhotoUrls = await uploadPhotos();
      const brochureDownload = await uploadBrochure();
      // Place newly uploaded photos first so cover updates when editing
      const updatedPhotos = newPhotoUrls.length ? [...newPhotoUrls, ...existingPhotos] : [...existingPhotos];
      const villaData = {
        ...prepareFormDataForSave(),
        photos: updatedPhotos,
        brochureUrl: brochureDownload || currentVilla.brochureUrl || brochureUrl || '',
        companyId: userCompanyId,
        updatedAt: new Date()
      };
      const villaDoc = doc(db, 'villas', currentVilla.id);
      await updateDoc(villaDoc, villaData);
      
      setSuccessMessage(language === 'ro' ? 'Vila a fost actualizată cu succes!' : 'Villa successfully updated!');
      setTimeout(() => setSuccessMessage(''), 3000);

      resetForm();
      setIsEditingVilla(false);
      setCurrentVilla(null);
      fetchVillas();
    } catch (error) {
      console.error('Error updating villa: ', error);
    }
  };

  const handleDeleteVilla = async (id) => {
    if (!window.confirm('Are you sure you want to delete this villa? This action cannot be undone.')) {
      return;
    }
    try {
      const villaToDelete = villas.find(villa => villa.id === id);
      if (villaToDelete?.photos?.length > 0) {
        for (const photo of villaToDelete.photos) {
          if (photo.path) {
            try {
              const storageRef = ref(storage, photo.path);
              await deleteObject(storageRef);
            } catch (error) {
              console.error('Error deleting image:', error);
            }
          }
        }
      }
      await deleteDoc(doc(db, 'villas', id));
      fetchVillas();
    } catch (error) {
      console.error('Error deleting villa: ', error);
    }
  };

  const handleDeletePhoto = async (index, isExistingPhoto = false) => {
    if (isExistingPhoto) {
      const photoToDelete = existingPhotos[index];
      setExistingPhotos(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
      if (photoToDelete?.path) {
        try {
          const storageRef = ref(storage, photoToDelete.path);
          await deleteObject(storageRef);
        } catch (error) {
          console.error('Error deleting image from storage:', error);
        }
      }
    } else {
      setPhotoFiles(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
      setPreviewUrls(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
    }
  };

  const startEditingVilla = (villa) => {
    setCurrentVilla(villa);
    setFormData({
      name_en: typeof villa.name === 'string' ? villa.name : (villa.name?.en || ''),
      name_ro: typeof villa.name === 'string' ? villa.name : (villa.name?.ro || ''),
      address_en: typeof villa.address === 'string' ? villa.address : (villa.address?.en || ''),
      address_ro: typeof villa.address === 'string' ? villa.address : (villa.address?.ro || ''),
      bedrooms: villa.bedrooms || '',
      bathrooms: villa.bathrooms || '',
      description_en: typeof villa.description === 'string' ? villa.description : (villa.description?.en || ''),
      description_ro: typeof villa.description === 'string' ? villa.description : (villa.description?.ro || ''),
      propertyLink: villa.propertyLink || villa.property_link || '',
      amenities_en: typeof villa.amenities === 'string' ? villa.amenities : (villa.amenities?.en || ''),
      amenities_ro: typeof villa.amenities === 'string' ? villa.amenities : (villa.amenities?.ro || ''),
      owner_name: villa.owner?.name || '',
      owner_email: villa.owner?.email || '',
      owner_phone: villa.owner?.phone || '',
      owner_notes_en: villa.owner?.notes?.en || '',
      owner_notes_ro: villa.owner?.notes?.ro || '',
      owner_confidential: !!villa.owner?.confidential,
    });
    setBrochureUrl(villa.brochureUrl || '');
    if (Array.isArray(villa.priceConfigurations) && villa.priceConfigurations.length > 0) {
      setPriceConfigs(villa.priceConfigurations.map(config => ({
        id: config.id || Date.now(),
        label_en: config.label?.en || '',
        label_ro: config.label?.ro || '',
        price: config.price || '',
        type: config.type || 'weekly',
        month: config.month || '',
        dateRange_start: config.dateRange?.start || '',
        dateRange_end: config.dateRange?.end || '',
        conditions_minStay: config.conditions?.minStay || '',
        conditions_minGuests: config.conditions?.minGuests || '',
        conditions_maxGuests: config.conditions?.maxGuests || ''
      })));
    } else {
      setPriceConfigs([{ id: Date.now(), label_en: 'Standard Rate', label_ro: 'Tarif Standard', price: villa.price || '', type: villa.priceType || 'weekly', dateRange_start: '', dateRange_end: '', conditions_minStay: '', conditions_minGuests: '', conditions_maxGuests: '' }]);
    }
    setExistingPhotos(normalizeVillaPhotos(villa.photos));
    setIsEditingVilla(true);
  };

  const normalizeText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (val.en) return String(val.en);
      if (val.ro) return String(val.ro);
      const first = Object.values(val).find(v => typeof v === 'string');
      return first ? String(first) : '';
    }
    return String(val);
  };

  const searchLower = (searchTerm || '').toLowerCase();

  const filteredVillas = villas.filter(villa => {
    const matchesSearch =
      normalizeText(villa.name).toLowerCase().includes(searchLower) ||
      normalizeText(villa.address).toLowerCase().includes(searchLower);
    const price = parseFloat(villa.priceConfigurations?.[0]?.price || villa.price || 0);
    const matchesPrice = (
      (!priceFilter.min || price >= parseFloat(priceFilter.min)) &&
      (!priceFilter.max || price <= parseFloat(priceFilter.max))
    );
    const matchesBedrooms = !bedroomFilter || villa.bedrooms === bedroomFilter;
    const matchesBathrooms = !bathroomFilter || villa.bathrooms === bathroomFilter;
    return matchesSearch && matchesPrice && matchesBedrooms && matchesBathrooms;
  });

  const translations = {
    ro: {
      title: 'Vile de Închiriat',
      addVilla: 'Adaugă Vilă',
      noVillas: 'Nu există vile',
      standardRate: 'Tarif Standard',
      uploadPhotos: 'Încarcă Poze',
      beds: 'Dormitoare',
      baths: 'Băi',
      address: 'Adresă',
      actions: 'Acțiuni',
      delete: 'Șterge',
      edit: 'Editează',
      view: 'Vezi',
      bedrooms: 'Dormitoare',
      bathrooms: 'Băi',
      propertyLink: 'Link proprietate',
      price: 'Preț',
      priceType: 'Tip preț',
      monthly: 'Lunar',
      nightly: 'Pe noapte'
    },
    en: {
      title: 'Rental Villas',
      addVilla: 'Add Villa',
      noVillas: 'No villas',
      standardRate: 'Standard Rate',
      uploadPhotos: 'Upload Photos',
      beds: 'Bedrooms',
      baths: 'Bathrooms',
      address: 'Address',
      actions: 'Actions',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      propertyLink: 'Property link',
      price: 'Price',
      priceType: 'Price type',
      monthly: 'Monthly',
      nightly: 'Nightly'
    }
  };

  const t = translations[language] || translations.ro;

  return (
    <div className="p-4">
      {/* Success Message Popup */}
      {successMessage && (
        <div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <button
          onClick={() => setIsAddingVilla(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {t.addVilla}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVillas.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">{t.noVillas}</div>
        ) : (
          filteredVillas.map((villa) => {
            const mainPhoto = villa.photos?.[0]?.url || villa.photos?.[0] || '';
            const displayName = villa.name?.[language] || villa.name?.en || villa.name?.ro || villa.name || 'Villa';
            const displayAddress = villa.address?.[language] || villa.address?.en || villa.address?.ro || villa.address || '';
            const standardRate = villa.priceConfigurations?.[0]?.price || villa.price || '';
            const bedrooms = villa.bedrooms || '-';
            const bathrooms = villa.bathrooms || '-';
            const seasonalRates = Array.isArray(villa.priceConfigurations)
              ? villa.priceConfigurations.slice(1).filter((pc) => pc.month)
              : [];
            const visibleRates = expandedRates[villa.id]
              ? seasonalRates
              : seasonalRates.slice(0, 2);
            const extraCount = Math.max(0, seasonalRates.length - 2);
            const showToggle = seasonalRates.length > 2;
            const formatType = (pc) => (pc.type === 'monthly' ? t.monthly : pc.type || 'week');

            return (
              <div key={villa.id} className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                {mainPhoto ? (
                  <img src={mainPhoto} alt={displayName} className="w-full h-52 object-cover" />
                ) : (
                  <div className="w-full h-52 bg-gray-100 flex items-center justify-center text-gray-400">
                    No photo
                  </div>
                )}
                <div className="p-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
                  <p className="text-sm text-gray-600 mt-1">{displayAddress}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-700 mt-3">
                    <span>{bedrooms} {t.bedrooms}</span>
                    <span>{bathrooms} {t.bathrooms}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-900 font-medium">
                    {t.standardRate}: €{standardRate} / {villa.priceConfigurations?.[0]?.type === 'monthly' ? t.monthly : 'week'}
                  </div>
                  {seasonalRates.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">
                        {language === 'ro' ? 'Tarife sezoniere' : 'Seasonal rates'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {visibleRates.map((pc) => (
                          <span
                            key={pc.id || pc.month}
                            className="px-2 py-1 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs"
                          >
                            {monthLabels[pc.month?.toLowerCase?.()] || pc.month}: €{pc.price} / {formatType(pc)}
                          </span>
                        ))}
                        {showToggle && (
                          <button
                            type="button"
                            onClick={() => toggleRates(villa.id)}
                            className="px-2 py-1 rounded-full border border-gray-200 text-gray-600 text-xs hover:border-indigo-200 hover:text-indigo-700"
                          >
                            {expandedRates[villa.id]
                              ? language === 'ro' ? 'Ascunde' : 'Hide'
                              : `+${extraCount} ${language === 'ro' ? 'încă' : 'more'}`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t flex items-center gap-3 flex-nowrap">
                  <button
                    onClick={() => {
                      setViewVilla({ ...villa, activePhotoIndex: 0 });
                      setIsDescriptionExpanded(false);
                    }}
                    className="flex-1 min-w-[96px] btn-soft bg-white border border-gray-200 text-gray-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    {t.view}
                  </button>
                  {villa.brochureUrl && (
                    <a
                      href={villa.brochureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 bg-white transition"
                      style={{width: '44px', height: '44px'}}
                      aria-label={language === 'ro' ? 'Descarcă PDF' : 'Download PDF'}
                      title={language === 'ro' ? 'Descarcă PDF' : 'Download PDF'}
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
                    onClick={() => startEditingVilla(villa)}
                    className="flex-1 min-w-[96px] btn-soft"
                  >
                    {t.edit}
                  </button>
                  <button
                    onClick={() => handleDeleteVilla(villa.id)}
                    className="inline-flex items-center justify-center rounded-md border border-red-200 text-red-600 hover:text-red-700 hover:border-red-300 bg-white transition"
                    style={{width: '44px', height: '44px'}}
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
            );
          })
        )}
      </div>
      {isAddingVilla && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t.addVilla}</h2>
            <form onSubmit={handleAddVilla} className="space-y-4">
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setFormLanguage('en')} className={`px-3 py-1 rounded ${formLanguage === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>EN</button>
                <button type="button" onClick={() => setFormLanguage('ro')} className={`px-3 py-1 rounded ${formLanguage === 'ro' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>RO</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name ({formLanguage.toUpperCase()})</label>
                  <input name={`name_${formLanguage}`} value={formData[`name_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address ({formLanguage.toUpperCase()})</label>
                  <input name={`address_${formLanguage}`} value={formData[`address_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bedrooms</label>
                  <input name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
                  <input name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Property Link</label>
                  <input name="propertyLink" value={formData.propertyLink} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Amenities ({formLanguage.toUpperCase()})</label>
                  <input name={`amenities_${formLanguage}`} value={formData[`amenities_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(amenitySuggestions[formLanguage] || []).map(a => (
                      <button
                        key={a}
                        type="button"
                        className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                        onClick={() => handleAmenitySuggestionClick(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Pricing</h4>
                  <button type="button" onClick={addPriceConfiguration} className="text-indigo-600 text-sm">+ Add price</button>
                </div>
                <div className="space-y-3">
                  {priceConfigs.map((config, index) => (
                    <div key={config.id} className="p-3 border rounded">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium">Price</label>
                          <input name={`priceConfig_${index}_price`} value={config.price} onChange={handleInputChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">Type</label>
                          <select name={`priceConfig_${index}_type`} value={config.type} onChange={handleInputChange} className="w-full border rounded px-2 py-1">
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium">Month</label>
                          <select name={`priceConfig_${index}_month`} value={config.month} onChange={handleInputChange} className="w-full border rounded px-2 py-1">
                            <option value="">Select month</option>
                            {monthKeys.map(m => (
                              <option key={m} value={m}>{monthLabels[m]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="text-right mt-2">
                        <button type="button" onClick={() => removePriceConfiguration(index)} className="text-red-600 text-sm">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Upload Photos</label>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="mt-1" />
                <label className="block text-sm font-medium text-gray-700 mt-4">PDF Brochure (optional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setBrochureFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {(brochureUrl || formData.brochureUrl) && (
                  <div className="flex items-center justify-between mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <a
                      href={brochureUrl || formData.brochureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 text-sm truncate"
                    >
                      {language === 'ro' ? 'Deschide broșura existentă' : 'Open current brochure'}
                    </a>
                    <button
                      type="button"
                      onClick={clearBrochure}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-red-200 text-red-600 hover:text-red-700 hover:border-red-300"
                      aria-label={language === 'ro' ? 'Șterge broșura' : 'Remove brochure'}
                      title={language === 'ro' ? 'Șterge broșura' : 'Remove brochure'}
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
                )}
                <label className="block text-sm font-medium text-gray-700 mt-2">Brochure URL (optional)</label>
                <input
                  type="url"
                  value={brochureUrl}
                  onChange={(e) => setBrochureUrl(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://..."
                />
                {brochureUrl && (
                  <div className="text-sm text-green-700 mt-1">
                    Brochure link saved
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {existingPhotos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img src={photo.url} alt="existing" className="w-full h-24 object-cover rounded" />
                      <button type="button" onClick={() => handleDeletePhoto(idx, true)} className="absolute top-1 right-1 bg-black/50 text-white rounded px-1 text-xs">✕</button>
                    </div>
                  ))}
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt="preview" className="w-full h-24 object-cover rounded" />
                      <button type="button" onClick={() => handleDeletePhoto(idx, false)} className="absolute top-1 right-1 bg-black/50 text-white rounded px-1 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { resetForm(); setIsAddingVilla(false); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditingVilla && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t.edit}</h2>
            <form onSubmit={handleUpdateVilla} className="space-y-4">
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setFormLanguage('en')} className={`px-3 py-1 rounded ${formLanguage === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>EN</button>
                <button type="button" onClick={() => setFormLanguage('ro')} className={`px-3 py-1 rounded ${formLanguage === 'ro' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>RO</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name ({formLanguage.toUpperCase()})</label>
                  <input name={`name_${formLanguage}`} value={formData[`name_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address ({formLanguage.toUpperCase()})</label>
                  <input name={`address_${formLanguage}`} value={formData[`address_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bedrooms</label>
                  <input name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
                  <input name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Property Link</label>
                  <input name="propertyLink" value={formData.propertyLink} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description ({formLanguage.toUpperCase()})</label>
                  <textarea name={`description_${formLanguage}`} value={formData[`description_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" rows={3} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Amenities ({formLanguage.toUpperCase()})</label>
                  <input name={`amenities_${formLanguage}`} value={formData[`amenities_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(amenitySuggestions[formLanguage] || []).map(a => (
                      <button
                        key={a}
                        type="button"
                        className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                        onClick={() => handleAmenitySuggestionClick(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Owner / Manager</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="owner_confidential_edit"
                      name="owner_confidential"
                      checked={formData.owner_confidential}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_confidential: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <label htmlFor="owner_confidential_edit" className="text-sm text-gray-700">
                      Confidential (admin only)
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Owner Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="owner_name"
                      value={formData.owner_name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Owner Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="owner_email"
                      value={formData.owner_email}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Owner Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="owner_phone"
                      value={formData.owner_phone}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Owner Notes ({formLanguage.toUpperCase()})</label>
                    <textarea
                      name={`owner_notes_${formLanguage}`}
                      value={formData[`owner_notes_${formLanguage}`]}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      rows={2}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These details are confidential and visible only to administrators.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Pricing</h4>
                  <button type="button" onClick={addPriceConfiguration} className="text-indigo-600 text-sm">+ Add price</button>
                </div>
                <div className="space-y-3">
                  {priceConfigs.map((config, index) => (
                    <div key={config.id} className="p-3 border rounded">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium">Price</label>
                          <input name={`priceConfig_${index}_price`} value={config.price} onChange={handleInputChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">Type</label>
                          <select name={`priceConfig_${index}_type`} value={config.type} onChange={handleInputChange} className="w-full border rounded px-2 py-1">
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium">Month</label>
                          <select name={`priceConfig_${index}_month`} value={config.month} onChange={handleInputChange} className="w-full border rounded px-2 py-1">
                            <option value="">Select month</option>
                            {monthKeys.map(m => (
                              <option key={m} value={m}>{monthLabels[m]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="text-right mt-2">
                        <button type="button" onClick={() => removePriceConfiguration(index)} className="text-red-600 text-sm">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Upload Photos</label>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="mt-1" />
                <label className="block text-sm font-medium text-gray-700 mt-4">PDF Brochure (optional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setBrochureFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {(brochureUrl || formData.brochureUrl) && (
                  <div className="flex items-center justify-between mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <a
                      href={brochureUrl || formData.brochureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 text-sm truncate"
                    >
                      {language === 'ro' ? 'Deschide broșura existentă' : 'Open current brochure'}
                    </a>
                    <button
                      type="button"
                      onClick={clearBrochure}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-red-200 text-red-600 hover:text-red-700 hover:border-red-300"
                      aria-label={language === 'ro' ? 'Șterge broșura' : 'Remove brochure'}
                      title={language === 'ro' ? 'Șterge broșura' : 'Remove brochure'}
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
                )}
                <label className="block text-sm font-medium text-gray-700 mt-2">Brochure URL (optional)</label>
                <input
                  type="url"
                  value={brochureUrl}
                  onChange={(e) => setBrochureUrl(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://..."
                />
                {brochureUrl && (
                  <div className="text-sm text-green-700 mt-1">
                    Brochure link saved
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {existingPhotos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img src={photo.url} alt="existing" className="w-full h-24 object-cover rounded" />
                      <button type="button" onClick={() => handleDeletePhoto(idx, true)} className="absolute top-1 right-1 bg-black/50 text-white rounded px-1 text-xs">✕</button>
                    </div>
                  ))}
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt="preview" className="w-full h-24 object-cover rounded" />
                      <button type="button" onClick={() => handleDeletePhoto(idx, false)} className="absolute top-1 right-1 bg-black/50 text-white rounded px-1 text-xs">✕</button>
                    </div>
                  ))}
                </div>
             </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { resetForm(); setIsEditingVilla(false); setCurrentVilla(null); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewVilla && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
              <button
                onClick={() => setViewVilla(null)}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {language === 'ro' ? 'Înapoi la Vile' : 'Back to Villas'}
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setViewVilla(null);
                    startEditingVilla(viewVilla);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t.edit}
                </button>
                <button
                  onClick={() => setViewVilla(null)}
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{getLoc(viewVilla.name) || 'Villa'}</h1>
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {getLoc(viewVilla.address)}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                  {/* Images */}
                  {(() => {
                    const photoUrls = (viewVilla.photos || [])
                      .map(p => (typeof p === 'string' ? p : p?.url))
                      .filter(Boolean);
                    
                    if (photoUrls.length === 0) return (
                      <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center text-gray-400">
                        No photos available
                      </div>
                    );

                    const activeIndex = viewVilla.activePhotoIndex || 0;
                    const activeUrl = photoUrls[activeIndex] || photoUrls[0];

                    return (
                      <div className="space-y-4">
                        <div className="bg-gray-100 rounded-lg overflow-hidden relative shadow-md group">
                          <img
                            src={activeUrl}
                            alt="Villa cover"
                            className="w-full h-64 sm:h-96 object-cover"
                          />
                          
                          {/* Navigation Arrows */}
                          {photoUrls.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newIndex = activeIndex === 0 ? photoUrls.length - 1 : activeIndex - 1;
                                  setViewVilla(prev => ({ ...prev, activePhotoIndex: newIndex }));
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
                                  const newIndex = activeIndex === photoUrls.length - 1 ? 0 : activeIndex + 1;
                                  setViewVilla(prev => ({ ...prev, activePhotoIndex: newIndex }));
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
                                onClick={() => setViewVilla(prev => ({ ...prev, activePhotoIndex: idx }))}
                                className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                                  idx === activeIndex ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent opacity-70 hover:opacity-100'
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
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.description || 'Description'}</h2>
                    <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                      {(() => {
                        const descriptionText = getLoc({ en: viewVilla.description_en, ro: viewVilla.description_ro }) || getLoc(viewVilla.description) || '';
                        const MAX_LENGTH = 300;
                        const shouldTruncate = descriptionText.length > MAX_LENGTH;
                        const displayText = isDescriptionExpanded ? descriptionText : (shouldTruncate ? descriptionText.slice(0, MAX_LENGTH) + '...' : descriptionText);
                        
                        if (!descriptionText) {
                          return <span className="text-gray-400 italic">No description available</span>;
                        }

                        return (
                          <>
                            {displayText}
                            {shouldTruncate && (
                              <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="block mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm focus:outline-none"
                              >
                                {isDescriptionExpanded 
                                  ? (language === 'ro' ? 'Arată mai puțin' : 'Read Less') 
                                  : (language === 'ro' ? 'Arată mai mult' : 'Read More')}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Amenities */}
                  {(() => {
                    const rawAmenities =
                      getLoc(viewVilla?.amenities) ||
                      viewVilla?.amenities_en ||
                      viewVilla?.amenities_ro ||
                      viewVilla?.amenities;

                    let amenitiesList = [];
                    if (Array.isArray(rawAmenities)) {
                      amenitiesList = rawAmenities;
                    } else if (rawAmenities && typeof rawAmenities === 'object') {
                      amenitiesList = Object.keys(rawAmenities).filter(key => rawAmenities[key]);
                    } else if (typeof rawAmenities === 'string') {
                      amenitiesList = rawAmenities.split(',').map(item => item.trim()).filter(Boolean);
                    }

                    if (amenitiesList.length > 0) {
                      return (
                        <div className="bg-white rounded-lg shadow-md p-6">
                          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.amenities_en ? t.amenities_en : 'Amenities'}</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {amenitiesList.map((item, idx) => (
                              <div key={idx} className="flex items-center p-2 bg-gray-50 rounded">
                                <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700 font-medium">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Owner Info (Admin Only) */}
                  {viewVilla.owner && (!viewVilla.owner.confidential || userRole === 'admin') && (
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-400">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                          {language === 'ro' ? 'Proprietar / Manager' : 'Owner / Manager'}
                        </h2>
                        {viewVilla.owner.confidential && (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                            {language === 'ro' ? 'Confidențial (doar admin)' : 'Confidential (admin only)'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{language === 'ro' ? 'Nume proprietar' : 'Owner Name'}</p>
                          <p className="font-medium text-gray-900">{getLoc(viewVilla.owner.name) || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{language === 'ro' ? 'Email proprietar' : 'Owner Email'}</p>
                          <p className="font-medium text-gray-900 break-all">{getLoc(viewVilla.owner.email) || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{language === 'ro' ? 'Telefon proprietar' : 'Owner Phone'}</p>
                          <p className="font-medium text-gray-900">{getLoc(viewVilla.owner.phone) || '-'}</p>
                        </div>
                        {viewVilla.owner.notes && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-500 mb-1">{language === 'ro' ? 'Note proprietar' : 'Owner Notes'}</p>
                            <div className="p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-line border">
                              {getLoc(viewVilla.owner.notes)}
                            </div>
                          </div>
                        )}
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
                        €{viewVilla.priceConfigurations?.[0]?.price || viewVilla.price || '0'}
                      </div>
                      <div className="text-gray-500 text-sm">
                        / {viewVilla.priceConfigurations?.[0]?.type || 'week'}
                      </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Key Specs */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t.bedrooms}</span>
                        <span className="font-medium text-gray-900">{viewVilla.bedrooms || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t.bathrooms}</span>
                        <span className="font-medium text-gray-900">{viewVilla.bathrooms || '-'}</span>
                      </div>
                    </div>

                    {/* Detailed Pricing */}
                    {(viewVilla.priceConfigurations && viewVilla.priceConfigurations.length > 0) && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <h3 className="font-medium text-gray-900 mb-3">{t.standardRate}</h3>
                        <div className="space-y-2 text-sm">
                          {viewVilla.priceConfigurations.map((pc, idx) => {
                            const monthLabel = pc.month ? (monthLabels[pc.month.toLowerCase?.()] || pc.month) : null;
                            const hasRange = pc.dateRange_start || pc.dateRange_end;
                            const dateRangeLabel = hasRange
                              ? `${pc.dateRange_start || '—'} → ${pc.dateRange_end || '—'}`
                              : null;
                            const typeLabel = pc.type === 'monthly' ? t.monthly : (pc.type || 'week');
                            const friendlyLabel =
                              monthLabel ||
                              dateRangeLabel ||
                              getLoc(pc.label) ||
                              pc.label_en ||
                              pc.label_ro ||
                              (idx === 0 ? t.standardRate : `${t.standardRate} ${idx + 1}`);

                            return (
                              <div key={pc.id || pc.label_en || pc.label_ro || pc.month || idx} className="flex justify-between">
                                <span className="text-gray-600">{friendlyLabel}</span>
                                <span className="font-medium text-gray-900">
                                  €{pc.price} / {typeLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4">
                      {viewVilla.propertyLink && (
                        <a 
                          href={viewVilla.propertyLink}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center font-medium transition-colors"
                        >
                          {t.propertyLink}
                        </a>
                      )}
                      
                      {viewVilla.brochureUrl && (
                         <a
                           href={viewVilla.brochureUrl}
                           target="_blank"
                           rel="noreferrer"
                           className="w-full py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center justify-center font-medium transition-colors"
                         >
                           <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                           </svg>
                           Download Brochure
                         </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Villas;
