import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, query, updateDoc, addDoc, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useDatabase } from '../../context/DatabaseContext';
import { isAdminRole } from '../../utils/roleUtils';

const CORE_CONCIERGE_SERVICES = [
  { id: 'core-villa-rentals', name: 'Luxury villa rentals', price: 0, unit: 'service' },
  { id: 'core-yachts', name: 'Yacht & boat charters', price: 0, unit: 'service' },
  { id: 'core-cars', name: 'Premium car rentals', price: 0, unit: 'service' },
  { id: 'core-club-bookings', name: 'VIP club reservations', price: 0, unit: 'service' },
  { id: 'core-restaurants', name: 'Exclusive restaurant bookings', price: 0, unit: 'service' },
  { id: 'core-parties', name: 'Private party planning', price: 0, unit: 'service' },
  { id: 'core-chef', name: 'Private chef & gourmet catering', price: 0, unit: 'service' },
  { id: 'core-transfers', name: 'Private transfers', price: 0, unit: 'service' },
  { id: 'core-security', name: 'Bodyguard & private security', price: 0, unit: 'service' },
  { id: 'core-housekeeping', name: 'Housekeeping & cleaning', price: 0, unit: 'service' },
  { id: 'core-babysitting', name: 'Babysitting & nanny', price: 0, unit: 'service' },
  { id: 'core-spa', name: 'In-villa massage & spa', price: 0, unit: 'service' },
  { id: 'core-excursions', name: 'Excursions & activities', price: 0, unit: 'service' },
  { id: 'core-shopping', name: 'Personal shopping assistance', price: 0, unit: 'service' },
  { id: 'core-photo-video', name: 'Professional photo & video', price: 0, unit: 'service' },
  { id: 'core-romantic', name: 'Romantic event planning', price: 0, unit: 'service' },
  { id: 'core-medical', name: 'Private medical & doctor at home', price: 0, unit: 'service' },
  { id: 'core-groups', name: 'Group logistics coordination', price: 0, unit: 'service' },
  { id: 'core-property-mgmt', name: 'Property management', price: 0, unit: 'service' }
];

const EXCLUDED_CORE_SERVICE_IDS = new Set([
  'core-villa-rentals',
  'core-yachts',
  'core-cars',
  'core-chef',
  'core-security'
]);

const CORE_SERVICES_COLLECTION = 'concierge_core_services';

const sanitizeFileName = (name = 'file') => name.toLowerCase().replace(/[^a-z0-9._-]/g, '_');

const getLocalizedText = (value, language) => {
  if (!value) return '';
  if (typeof value === 'object') {
    return value[language] || value.en || value.ro || '';
  }
  return value;
};

const mergeCoreServices = (overrides = {}) => {
  const filtered = CORE_CONCIERGE_SERVICES.filter((service) => !EXCLUDED_CORE_SERVICE_IDS.has(service.id));
  const merged = filtered.map((base) => {
    const override = overrides[base.id];
    if (!override) return { ...base, category: 'concierge-core' };
    return {
      ...base,
      ...override,
      id: base.id,
      serviceId: base.id,
      category: 'concierge-core',
      name: override.name ?? base.name,
      description: override.description ?? base.description,
      price: override.price ?? base.price,
      unit: override.unit ?? base.unit,
      imageUrl: override.imageUrl ?? base.imageUrl
    };
  });

  const extras = Object.values(overrides).filter((override) => {
    const serviceId = override.serviceId || override.id;
    return !CORE_CONCIERGE_SERVICES.find((service) => service.id === serviceId);
  });

  extras.forEach((override) => {
    const serviceId = override.serviceId || override.id;
    merged.push({
      ...override,
      id: serviceId,
      serviceId,
      category: 'concierge-core',
      price: override.price ?? 0,
      unit: override.unit || 'service'
    });
  });

  return merged;
};

function CoreConcierge() {
  const { companyInfo, userRole } = useDatabase();
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'ro');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const isAdmin = isAdminRole(userRole);

  useEffect(() => {
    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('appLanguage');
      if (currentLang && currentLang !== language) {
        setLanguage(currentLang);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [language]);

  const loadServices = async () => {
    if (!companyInfo?.id) {
      setServices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const coreOverrides = {};
      const coreRef = collection(db, CORE_SERVICES_COLLECTION);
      const coreQuery = query(coreRef, where('companyId', '==', companyInfo.id));
      const snapshot = await getDocs(coreQuery);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const serviceId = data.serviceId || docSnap.id;
        coreOverrides[serviceId] = { ...data, docId: docSnap.id };
      });
      setServices(mergeCoreServices(coreOverrides));
    } catch (err) {
      console.error('Error loading core services:', err);
      setError(language === 'ro' ? 'Nu s-au putut încărca serviciile.' : 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [companyInfo?.id]);

  const openEditor = (service) => {
    if (!service) return;
    const nameValue = typeof service.name === 'object' ? service.name : { en: service.name || '' };
    const descValue = typeof service.description === 'object' ? service.description : { en: service.description || '' };
    const fallbackName = typeof service.name === 'string' ? service.name : (service.name?.en || '');
    setDraft({
      serviceId: service.id,
      docId: service.docId || '',
      fallbackName,
      name_en: nameValue?.en || fallbackName || '',
      name_ro: nameValue?.ro || '',
      description_en: descValue?.en || '',
      description_ro: descValue?.ro || '',
      price: service.price ?? '',
      unit: service.unit || 'service',
      imageUrl: service.imageUrl || '',
      imagePath: service.imagePath || ''
    });
    setImageFile(null);
    setUploadProgress(0);
    setNotice('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setDraft(null);
    setImageFile(null);
    setUploadProgress(0);
    setNotice('');
  };

  const uploadImage = (file, serviceId) => new Promise((resolve, reject) => {
    if (!file || !companyInfo?.id || !serviceId) {
      resolve({ url: '', path: '' });
      return;
    }
    const safeName = sanitizeFileName(file.name || 'image');
    const path = `concierge-core/${companyInfo.id}/${serviceId}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed', (snapshot) => {
      const progress = snapshot.totalBytes ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
      setUploadProgress(Math.round(progress));
    }, reject, async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      resolve({ url, path });
    });
  });

  const handleSave = async () => {
    if (!draft || !companyInfo?.id) return;
    setSaving(true);
    setNotice('');
    try {
      const payload = {
        companyId: companyInfo.id,
        serviceId: draft.serviceId,
        name: { en: (draft.name_en || draft.fallbackName || '').trim(), ro: (draft.name_ro || '').trim() },
        description: { en: (draft.description_en || '').trim(), ro: (draft.description_ro || '').trim() },
        price: draft.price === '' ? 0 : Number(draft.price),
        unit: draft.unit || 'service',
        imageUrl: (draft.imageUrl || '').trim(),
        imagePath: draft.imagePath || '',
        updatedAt: serverTimestamp()
      };

      if (imageFile) {
        const uploaded = await uploadImage(imageFile, draft.serviceId);
        if (uploaded?.url) {
          if (draft.imagePath) {
            try {
              await deleteObject(ref(storage, draft.imagePath));
            } catch (err) {
              console.warn('Failed to remove old image:', err);
            }
          }
          payload.imageUrl = uploaded.url;
          payload.imagePath = uploaded.path;
        }
      }

      if (draft.docId) {
        await updateDoc(doc(db, CORE_SERVICES_COLLECTION, draft.docId), payload);
      } else {
        const docRef = await addDoc(collection(db, CORE_SERVICES_COLLECTION), {
          ...payload,
          createdAt: serverTimestamp()
        });
        payload.docId = docRef.id;
      }

      setNotice(language === 'ro' ? 'Serviciu salvat.' : 'Service saved.');
      await loadServices();
      closeEditor();
    } catch (err) {
      console.error('Error saving core service:', err);
      setNotice(language === 'ro' ? 'Nu s-a putut salva.' : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    if (!draft?.docId) return;
    setSaving(true);
    setNotice('');
    try {
      await deleteDoc(doc(db, CORE_SERVICES_COLLECTION, draft.docId));
      if (draft.imagePath) {
        try {
          await deleteObject(ref(storage, draft.imagePath));
        } catch (err) {
          console.warn('Failed to remove image:', err);
        }
      }
      setNotice(language === 'ro' ? 'Setările au fost resetate.' : 'Overrides reset.');
      await loadServices();
      closeEditor();
    } catch (err) {
      console.error('Error clearing override:', err);
      setNotice(language === 'ro' ? 'Nu s-a putut reseta.' : 'Failed to reset.');
    } finally {
      setSaving(false);
    }
  };

  const t = useMemo(() => ({
    title: language === 'ro' ? 'Servicii Concierge' : 'Core Concierge Services',
    subtitle: language === 'ro'
      ? 'Administrează serviciile principale și imaginile lor.'
      : 'Manage core services and their imagery.',
    edit: language === 'ro' ? 'Editează' : 'Edit',
    save: language === 'ro' ? 'Salvează' : 'Save',
    cancel: language === 'ro' ? 'Renunță' : 'Cancel',
    reset: language === 'ro' ? 'Resetează' : 'Reset',
    noServices: language === 'ro' ? 'Nu sunt servicii disponibile.' : 'No services available.'
  }), [language]);

  return (
    <div className="p-4 font-sans max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
        <p className="text-sm text-gray-500">{t.subtitle}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">{error}</div>
      ) : services.length === 0 ? (
        <div className="p-6 rounded-lg border border-gray-200 bg-white text-gray-500 text-sm">{t.noServices}</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const nameText = getLocalizedText(service.name, language) || service.name || 'Service';
            const priceValue = Number(service.price || 0);
            return (
              <div key={service.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="h-40 bg-gray-100">
                  {service.imageUrl ? (
                    <img src={service.imageUrl} alt={nameText} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{nameText}</h3>
                  {service.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-3">
                      {getLocalizedText(service.description, language)}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between">
                    {priceValue > 0 ? (
                      <span className="text-indigo-600 font-semibold text-sm">€ {priceValue}</span>
                    ) : (
                      <span className="text-xs text-gray-400">Price on request</span>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditor(service)}
                        className="text-xs py-2 px-3 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        {t.edit}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editorOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
              <button type="button" onClick={closeEditor} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Name (EN)</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={draft.name_en}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name_en: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Name (RO)</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={draft.name_ro}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name_ro: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description (EN)</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 text-sm min-h-[90px]"
                    value={draft.description_en}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description_en: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description (RO)</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 text-sm min-h-[90px]"
                    value={draft.description_ro}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description_ro: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Price (€)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={draft.price}
                    onChange={(e) => setDraft((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={draft.unit}
                    onChange={(e) => setDraft((prev) => ({ ...prev, unit: e.target.value }))}
                  >
                    <option value="service">Per service</option>
                    <option value="day">Per day</option>
                    <option value="hour">Per hour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Image URL (optional)</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={draft.imageUrl}
                  onChange={(e) => setDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              {uploadProgress > 0 && (
                <div className="text-xs text-gray-500">Uploading… {uploadProgress}%</div>
              )}
              {notice && (
                <div className="text-xs text-emerald-600">{notice}</div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="flex gap-2">
                {draft.docId && (
                  <button
                    type="button"
                    onClick={handleClearOverride}
                    className="text-xs py-2 px-3 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                    disabled={saving}
                  >
                    {t.reset}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="text-xs py-2 px-3 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                  disabled={saving}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-xs py-2 px-4 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoreConcierge;
