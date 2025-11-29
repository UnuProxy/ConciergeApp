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
  const results = [];

  for (const photo of normalized) {
    if (!photo?.url) continue;

    const candidatePath = photo.path || extractPathFromUrl(photo.url);
    if (!candidatePath) {
      results.push(photo);
      continue;
    }

    try {
      const downloadUrl = await getDownloadURL(ref(storageInstance, candidatePath));
      results.push({ ...photo, url: ensureStorageDownloadUrl(downloadUrl), path: candidatePath });
    } catch (err) {
      console.warn('Failed to fetch download URL for photo', candidatePath, err);
      results.push(photo);
    }
  }

  return results;
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
  const [villas, setVillas] = useState([]);
  const [isAddingVilla, setIsAddingVilla] = useState(false);
  const [isEditingVilla, setIsEditingVilla] = useState(false);
  const [currentVilla, setCurrentVilla] = useState(null);
  const [viewVilla, setViewVilla] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [brochureFile, setBrochureFile] = useState(null);
  const [brochureUrl, setBrochureUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
  const [bedroomFilter, setBedroomFilter] = useState('');
  const [bathroomFilter, setBathroomFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
  });
  
  const [priceConfigs, setPriceConfigs] = useState([{
    id: Date.now(),
    label_en: 'Standard Rate',
    label_ro: 'Tarif Standard',
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

  useEffect(() => {
    fetchVillas();
  }, [userCompanyId]);

  const fetchVillas = async () => {
    if (!userCompanyId) {
      console.warn('No companyId resolved; skipping villa fetch.');
      setVillas([]);
      return;
    }
    try {
      const villaCollection = collection(db, 'villas');
      const villaQuery = query(villaCollection, where('companyId', '==', userCompanyId));
      const villaSnapshot = await getDocs(villaQuery);
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
      label_en: `Rate ${prev.length + 1}`,
      label_ro: `Tarif ${prev.length + 1}`,
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
    });
    setPriceConfigs([{
      id: Date.now(),
      label_en: 'Standard Rate',
      label_ro: 'Tarif Standard',
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
        notes: { en: formData.owner_notes_en || '', ro: formData.owner_notes_ro || '' }
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
      const updatedPhotos = [...existingPhotos, ...newPhotoUrls];
      const villaData = {
        ...prepareFormDataForSave(),
        photos: updatedPhotos,
        brochureUrl: brochureDownload || currentVilla.brochureUrl || brochureUrl || '',
        companyId: userCompanyId,
        updatedAt: new Date()
      };
      const villaDoc = doc(db, 'villas', currentVilla.id);
      await updateDoc(villaDoc, villaData);
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
      name_en: villa.name?.en || '',
      name_ro: villa.name?.ro || '',
      address_en: villa.address?.en || '',
      address_ro: villa.address?.ro || '',
      bedrooms: villa.bedrooms || '',
      bathrooms: villa.bathrooms || '',
      description_en: villa.description?.en || '',
      description_ro: villa.description?.ro || '',
      propertyLink: villa.propertyLink || villa.property_link || '',
      amenities_en: villa.amenities?.en || '',
      amenities_ro: villa.amenities?.ro || '',
      owner_name: villa.owner?.name || '',
      owner_email: villa.owner?.email || '',
      owner_phone: villa.owner?.phone || '',
      owner_notes_en: villa.owner?.notes?.en || '',
      owner_notes_ro: villa.owner?.notes?.ro || '',
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
                  {Array.isArray(villa.priceConfigurations) && villa.priceConfigurations.length > 1 && (
                    <div className="mt-1 text-xs text-gray-700 space-y-0.5">
                      {villa.priceConfigurations
                        .filter(pc => pc.month)
                        .map((pc) => (
                          <div key={pc.id || pc.month}>
                            {monthLabels[pc.month?.toLowerCase?.()] || pc.month}: €{pc.price} / {pc.type || 'week'}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="p-4 border-t flex items-center gap-3">
                  <button
                    onClick={() => setViewVilla(villa)}
                    className="flex-1 btn-soft bg-white border border-gray-200 text-gray-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    {t.view}
                  </button>
                  <button
                    onClick={() => startEditingVilla(villa)}
                    className="flex-1 btn-soft"
                  >
                    {t.edit}
                  </button>
                  {villa.brochureUrl && (
                    <a
                      href={villa.brochureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 bg-white transition"
                      title="Download brochure"
                    >
                      ⇩
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteVilla(villa.id)}
                    className="flex-1 btn-soft btn-soft-danger"
                  >
                    {t.delete}
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Owner Notes ({formLanguage.toUpperCase()})</label>
                  <textarea name={`owner_notes_${formLanguage}`} value={formData[`owner_notes_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" rows={2} />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium">Label (EN)</label>
                          <input name={`priceConfig_${index}_label_en`} value={config.label_en} onChange={handleInputChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">Label (RO)</label>
                          <input name={`priceConfig_${index}_label_ro`} value={config.label_ro} onChange={handleInputChange} className="w-full border rounded px-2 py-1" />
                        </div>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Owner Notes ({formLanguage.toUpperCase()})</label>
                  <textarea name={`owner_notes_${formLanguage}`} value={formData[`owner_notes_${formLanguage}`]} onChange={handleInputChange} className="w-full border rounded px-3 py-2" rows={2} />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium">Label (EN)</label>
                          <input name={`priceConfig_${index}_label_en`} value={config.label_en} onChange={handleInputChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">Label (RO)</label>
                          <input name={`priceConfig_${index}_label_ro`} value={config.label_ro} onChange={handleInputChange} className="w-full border rounded px-2 py-1" />
                        </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start p-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{viewVilla.name?.[language] || viewVilla.name?.en || viewVilla.name?.ro || viewVilla.name || 'Villa'}</h2>
                <p className="text-sm text-gray-600">{viewVilla.address?.[language] || viewVilla.address?.en || viewVilla.address?.ro || viewVilla.address || ''}</p>
              </div>
              <button
                onClick={() => setViewVilla(null)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {viewVilla.photos && viewVilla.photos.length > 0 && (
              <div className="w-full">
                <img
                  src={viewVilla.photos[0].url || viewVilla.photos[0]}
                  alt="Villa cover"
                  className="w-full h-72 object-cover"
                />
              </div>
            )}

            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-4 text-gray-700 text-sm pb-3 border-b">
                <span>{viewVilla.bedrooms || '-'} {t.bedrooms}</span>
                <span>{viewVilla.bathrooms || '-'} {t.bathrooms}</span>
                {viewVilla.propertyLink && (
                  <a href={viewVilla.propertyLink} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800">
                    {t.propertyLink}
                  </a>
                )}
              </div>

              {(viewVilla.priceConfigurations && viewVilla.priceConfigurations.length > 0) && (
                <div className="pb-3 border-b">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.standardRate}</h4>
                  <div className="space-y-1 text-sm text-gray-700">
                    {viewVilla.priceConfigurations.map((pc) => {
                      const monthLabel = pc.month ? (monthLabels[pc.month.toLowerCase?.()] || pc.month) : null;
                      return (
                        <div key={pc.id || pc.label_en || pc.label_ro || pc.month}>
                          {(pc.label_en || pc.label_ro || monthLabel || t.standardRate)}: €{pc.price} / {pc.type || 'week'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(viewVilla.description_en || viewVilla.description_ro) && (
                <div className="pb-3 border-b">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.description || 'Description'}</h4>
                  <p className="text-sm text-gray-700">
                    {viewVilla[`description_${language}`] || viewVilla.description_en || viewVilla.description_ro || ''}
                  </p>
                </div>
              )}

              {(viewVilla.amenities_en || viewVilla.amenities_ro) && (
                <div className="pb-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.amenities_en ? t.amenities_en : 'Amenities'}</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {viewVilla[`amenities_${language}`] || viewVilla.amenities_en || viewVilla.amenities_ro || ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Villas;
