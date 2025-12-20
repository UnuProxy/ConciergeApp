import { useState, useEffect, useRef, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  orderBy,
  limit,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import React from 'react';
import ReactDOM from 'react-dom';
import { translations } from '../translations/bookingTranslations';
import { useLanguage } from '../utils/languageHelper';
import { v4 as uuidv4 } from 'uuid';

// Helper function to safely render text from language objects
function safeRender(value) {
  if (value && typeof value === 'object') {
    // Handle language objects
    if (value.en !== undefined || value.ro !== undefined) {
      return value.ro || value.en || '';
    }
    // Handle other objects
    return JSON.stringify(value);
  }
  return value;
}


// Status colors with enhanced styling
const statusColors = {
  confirmed: { cssClass: 'bg-green-100 text-green-800 border-green-200' },
  pending: { cssClass: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  cancelled: { cssClass: 'bg-red-100 text-red-800 border-red-200' },
  booked: { cssClass: 'bg-blue-100 text-blue-800 border-blue-200' }
};

// Payment status colors with enhanced styling
const paymentStatusColors = {
  paid: { cssClass: 'bg-green-100 text-green-800 border-green-200' },
  partiallyPaid: { cssClass: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  notPaid: { cssClass: 'bg-red-100 text-red-800 border-red-200' }
};

// Inline receipt strings must stay under Firestore doc size (~1MB).
const MAX_INLINE_RECEIPT_LENGTH = 900000; // ~900 KB buffer for other fields

const serviceTagStyles = {
  villa: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  villas: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'concierge-core': 'bg-amber-50 text-amber-700 border-amber-200',
  cars: 'bg-red-50 text-red-700 border-red-200',
  boats: 'bg-blue-50 text-blue-700 border-blue-200',
  yacht: 'bg-blue-50 text-blue-700 border-blue-200',
  chefs: 'bg-amber-50 text-amber-700 border-amber-200',
  shopping: 'bg-pink-50 text-pink-700 border-pink-200'
};

const getServiceTagClasses = (type) => {
  if (!type) return 'bg-gray-100 text-gray-700 border-gray-200';
  return serviceTagStyles[type] || 'bg-gray-100 text-gray-700 border-gray-200';
};

// Core concierge services available even without database records
const CORE_CONCIERGE_SERVICES = [
  { id: 'core-villa-rentals', name: { en: 'Luxury villa rentals', ro: 'Închirieri de vile de lux' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-yachts', name: { en: 'Yacht & boat charters', ro: 'Închirieri de iahturi & bărci' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-cars', name: { en: 'Premium car rentals', ro: 'Închirieri de mașini premium' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-club-bookings', name: { en: 'VIP club reservations', ro: 'Rezervări VIP în cluburi' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-restaurants', name: { en: 'Exclusive restaurant bookings', ro: 'Rezervări în restaurante exclusiviste' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-parties', name: { en: 'Private party planning', ro: 'Organizare petreceri private' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-chef', name: { en: 'Private chef & gourmet catering', ro: 'Chef privat & catering gourmet' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-transfers', name: { en: 'Private transfers', ro: 'Transferuri private' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-security', name: { en: 'Bodyguard & private security', ro: 'Bodyguard & securitate privată' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-housekeeping', name: { en: 'Housekeeping & cleaning', ro: 'Servicii de menaj & housekeeping' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-babysitting', name: { en: 'Babysitting & nanny', ro: 'Servicii de babysitting & nanny' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-spa', name: { en: 'In-villa massage & spa', ro: 'Masaj & spa la vilă' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-excursions', name: { en: 'Excursions & activities', ro: 'Organizare de excursii & activități' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-shopping', name: { en: 'Personal shopping assistance', ro: 'Asistență personală pentru cumpărături' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-photo-video', name: { en: 'Professional photo & video', ro: 'Servicii foto & video profesionale' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-romantic', name: { en: 'Romantic event planning', ro: 'Planificare evenimente romantice' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-medical', name: { en: 'Private medical & doctor at home', ro: 'Servicii medicale private & doctor la domiciliu' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-groups', name: { en: 'Group logistics coordination', ro: 'Organizare logistică pentru grupuri mari' }, price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-property-mgmt', name: { en: 'Property management', ro: 'Management de proprietăți' }, price: 0, unit: 'service', category: 'concierge-core' },
];

// Hide items already covered by dedicated categories (villas, cars, boats, chefs, restaurants, excursions/tours, massages, shopping)
const EXCLUDED_CORE_SERVICE_IDS = new Set([
  'core-villa-rentals',
  'core-yachts',
  'core-cars',
  'core-chef',
  'core-restaurants',
  'core-excursions',
  'core-spa',
  'core-shopping'
]);
const CORE_CONCIERGE_SERVICES_FILTERED = CORE_CONCIERGE_SERVICES.filter(
  (service) => !EXCLUDED_CORE_SERVICE_IDS.has(service.id)
);

// Enhanced category icon components
const CategoryIcon = ({ type, size = "small" }) => {
  const sizeClass = size === "large" ? "w-8 h-8" : "w-5 h-5";
  
  switch(type) {
    case 'concierge-core':
      return (
        <svg className={`${sizeClass} text-amber-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 17l-5.878 3.09 1.122-6.545L2 8.91l6.561-.954L12 2.5l3.439 5.456L22 8.91l-5.244 4.635 1.122 6.545z" />
        </svg>
      );
    case 'villas':
      return (
        <svg className={`${sizeClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7m-14 0l2 2m5-7l2 2m0 0l2 2m-2-2l2-2" />
        </svg>
      );
    case 'boats':
    case 'yacht':
      return (
        <svg className={`${sizeClass} text-indigo-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'cars':
    case 'car':
      return (
        <svg className={`${sizeClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      );
    case 'chef':
    case 'chefs':
      return (
        <svg className={`${sizeClass} text-amber-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case 'shopping':
      return (
        <svg className={`${sizeClass} text-pink-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    default:
      return (
        <svg className={`${sizeClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
  }
};

// Enhanced payment icon components
const PaymentIcon = ({ type, size = "small" }) => {
  const sizeClass = size === "large" ? "w-8 h-8" : "w-5 h-5";
  
  switch(type) {
    case 'cash':
      return (
        <svg className={`${sizeClass} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      );
    case 'card':
      return (
        <svg className={`${sizeClass} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'bankTransfer':
      return (
        <svg className={`${sizeClass} text-indigo-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      );
    case 'crypto':
      return (
        <svg className={`${sizeClass} text-amber-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 11V9a2 2 0 00-2-2m2 4v4a2 2 0 104 0v-1m-4-3H9m2 0h4m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={`${sizeClass} text-gray-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

// Compute per-service payment summary based on recorded payments
const getServicePaymentInfo = (service, payments = [], safeRenderFn = (v) => v) => {
  const total = ((parseFloat(service?.price || 0) * parseInt(service?.quantity || 1))) || 0;
  
  // 1. If service has explicit payment data, use it as primary
  if (service?.amountPaid !== undefined) {
    const paid = parseFloat(service.amountPaid || 0);
    const due = Math.max(0, total - paid);
    return { total, paid, due };
  }

  // 2. Fallback to calculating from history only if explicit data is missing
  let paid = 0;
  const serviceId = service?.id || service?.templateId || null;
  
  if (serviceId) {
    payments.forEach((payment) => {
      if (payment.serviceId === serviceId) {
        paid += parseFloat(payment.amount || 0);
      }
    });
  }
  
  const due = Math.max(0, total - paid);
  return { total, paid, due };
};

// Helper to derive payment context (overall or per service)
const getPaymentContext = (client, service, paymentHistory = [], safeRenderFn = (v) => v) => {
  if (service) {
    const { total, paid, due } = getServicePaymentInfo(service, paymentHistory, safeRenderFn);
    return { total, paid, due };
  }
  
  // For clients, STRICTLY use the sums from all bookings if available
  if (client?.bookings?.length > 0) {
    let totalVal = 0;
    let totalPaid = 0;
    client.bookings.forEach(b => {
      totalVal += b.totalValue || 0;
      totalPaid += b.paidAmount || 0;
    });
    return {
      total: totalVal,
      paid: totalPaid,
      due: Math.max(0, totalVal - totalPaid)
    };
  }

  return {
    total: client?.totalValue || 0,
    paid: client?.paidAmount || 0,
    due: client?.dueAmount || 0
  };
};

// IMPROVED SERVICE SELECTION COMPONENT
const ServiceSelectionPanel = ({ onServiceAdded, onCancel, userCompanyId, t }) => {
  const [step, setStep] = useState('category');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');
  
  // Form state for custom service
  const [serviceData, setServiceData] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    quantity: 1,
    unit: 'hourly',
    date: new Date().toISOString().split('T')[0],
    status: 'confirmed',
    notes: '',
    selectedMonth: '',
    monthlyOptions: [],
    paymentStatus: 'unpaid', // NEW: Track payment status
    amountPaid: 0 // NEW: Track amount paid for this service
  });

  // Fetch categories first
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        // Define standard categories
        const standardCategories = [
          { id: 'concierge-core', name: t.conciergeCore || 'Concierge Essentials', icon: 'concierge-core' },
          { id: 'villas', name: t.villas || 'Villas', icon: 'villas' },
          { id: 'cars', name: t.cars || 'Cars', icon: 'cars' },
          { id: 'boats', name: t.boats || 'Boats & Yachts', icon: 'boats' },
          { id: 'chefs', name: t.chefs || 'Chefs', icon: 'chefs' },
          { id: 'restaurants', name: t.restaurants || 'Restaurants', icon: 'restaurants' },
          { id: 'tours', name: t.tours || 'Tours', icon: 'tours' },
          { id: 'massages', name: t.massages || 'Massages', icon: 'massages' },
          { id: 'shopping', name: t.shopping || 'Shopping', icon: 'shopping' },
          { id: 'custom', name: t.customService || 'Custom Service', icon: 'services' }
        ];
        
        setCategories(standardCategories);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(t.failedToLoadCategories || 'Failed to load service categories');
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [userCompanyId, t]);

const getServiceThumbnail = (service) => {
  const pickFromArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    // prefer object with url
    const objWithUrl = arr.find((p) => p && typeof p === 'object' && p.url);
      if (objWithUrl?.url) return objWithUrl.url;
      const firstString = arr.find((p) => typeof p === 'string' && p.trim() !== '');
      return firstString || null;
    };

  return (
    service.thumbnail ||
    service.imageUrl ||
    service.image ||
    pickFromArray(service.photos) ||
    pickFromArray(service.images) ||
    null
  );
};

  // Fetch services for selected category
  useEffect(() => {
    const fetchServices = async () => {
      if (!selectedCategory || selectedCategory.id === 'custom') return;

      if (selectedCategory.id === 'concierge-core') {
        setServices(CORE_CONCIERGE_SERVICES_FILTERED);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log(`Fetching services for category ${selectedCategory.id} and company ${userCompanyId}...`);
        
        // Create a query to fetch services from the selected category
        const serviceQuery = query(
          collection(db, 'services'),
          where('companyId', '==', userCompanyId),
          where('category', '==', selectedCategory.id),
          where('active', '==', true)
        );
          
        const serviceSnapshot = await getDocs(serviceQuery);
        const servicesData = [];

        const resolveName = (data, fallbackId) => {
          return data?.name?.en
            || data?.name_en
            || (typeof data?.name === 'string' ? data.name : '')
            || data?.name_ro
            || data?.title
            || data?.label
            || fallbackId;
        };

        const resolveDescription = (data) => {
          return data?.description?.en
            || data?.description_en
            || (typeof data?.description === 'string' ? data.description : '')
            || data?.description_ro
            || '';
        };
        
        serviceSnapshot.forEach(doc => {
          const data = doc.data();
          servicesData.push({
            id: doc.id,
            ...data,
            priceConfigurations: data.priceConfigurations || []
          });
        });
        
        console.log(`Found ${servicesData.length} services in 'services' collection`);
        
        // If this is a standard category, also try to fetch from its dedicated collection
        if (['cars', 'boats', 'villas', 'chefs', 'security'].includes(selectedCategory.id)) {
          try {
            console.log(`Fetching from dedicated '${selectedCategory.id}' collection...`);
            
            const dedicatedQuery = query(
              collection(db, selectedCategory.id)
            );
            
            const dedicatedSnapshot = await getDocs(dedicatedQuery);
            const dedicatedCount = dedicatedSnapshot.size;
            
            console.log(`Found ${dedicatedCount} items in '${selectedCategory.id}' collection`);
            
            dedicatedSnapshot.forEach(doc => {
              const data = doc.data();
              
              const priceConfig = Array.isArray(data.priceConfigurations) && data.priceConfigurations.length > 0
                ? data.priceConfigurations[0]
                : null;
              let price = 0;
              if (selectedCategory.id === 'villas' && priceConfig) {
                price = parseFloat(priceConfig.price || 0);
              } else {
                price = parseFloat(data.price || 0);
              }
              const resolvedUnit = (() => {
                if (selectedCategory.id === 'villas' && priceConfig?.type) {
                  const type = priceConfig.type.toString().toLowerCase();
                  if (type.includes('week')) return 'weekly';
                  if (type.includes('night')) return 'nightly';
                  if (type.includes('day')) return 'daily';
                }
                if (data.unit) {
                  return data.unit;
                }
                return selectedCategory.id === 'villas' ? 'weekly'
                  : (selectedCategory.id === 'cars' || selectedCategory.id === 'boats' ? 'daily' : 'service');
              })();
              
              console.log(`Processing item: ${doc.id}`, {
                name: data.name?.en || data.name || doc.id,
                price: price
              });
              
              servicesData.push({
                id: doc.id,
                name: resolveName(data, doc.id),
                displayName: data.name_en || data.name?.en || data.name_ro || data.name || resolveName(data, doc.id),
                description: resolveDescription(data),
                category: selectedCategory.id,
                price: price,
                unit: resolvedUnit,
                priceConfigurations: data.priceConfigurations || [],
                brand: data.brand || '',
                model: data.model || '',
                bedrooms: data.bedrooms || '',
                bathrooms: data.bathrooms || '',
                address: typeof data.address === 'object' ? data.address.en : data.address || '',
                photos: data.photos || data.images || [],
                images: data.images || [],
                thumbnail: data.thumbnail || data.image || data.imageUrl || null,
                imageUrl: data.imageUrl || null
              });
            });
          } catch (err) {
            console.error(`Error fetching from ${selectedCategory.id} collection:`, err);
          }
        }
        
        const asPlainText = (value, fallback = '') => {
          if (!value) return fallback;
          if (typeof value === 'string') return value;
          if (typeof value === 'object') {
            return value.en || value.ro || Object.values(value)[0] || fallback;
          }
          return `${value}` || fallback;
        };

        const normalizedServices = servicesData.map(svc => {
          const resolvedName = asPlainText(svc.displayName, '') || asPlainText(svc.name, '') || resolveName(svc, svc.id);
          return {
            ...svc,
            name: resolvedName,
            displayName: resolvedName,
            description: asPlainText(svc.description, '') || resolveDescription(svc)
          };
        });

        normalizedServices.sort((a, b) => {
          const nameA = (typeof a.name === 'object' ? a.name.en : a.name) || '';
          const nameB = (typeof b.name === 'object' ? b.name.en : b.name) || '';
          return nameA.localeCompare(nameB);
        });
        
        console.log(`Total services after merging collections: ${servicesData.length}`);
        setServices(normalizedServices);
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching ${selectedCategory?.id} services:`, err);
        setServices([]);
        setLoading(false);
      }
    };
    
    fetchServices();
  }, [selectedCategory, userCompanyId, t]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setServiceData(prev => ({ 
      ...prev, 
      category: category.id,
      paymentStatus: 'unpaid',
      amountPaid: 0
    }));
    setServiceSearch('');
    
    if (category.id === 'custom') {
      setStep('custom');
    } else {
      setStep('services');
    }
  };

  const handleServiceSelect = (service) => {
    const monthlyOptions = Array.isArray(service.priceConfigurations)
      ? service.priceConfigurations
          .filter((pc) => pc && pc.price)
          .map((pc) => ({
            month: pc.month || '',
            price: parseFloat(pc.price) || 0,
            type: pc.type || service.unit || 'service'
          }))
      : [];
    const defaultMonthly = monthlyOptions[0] || null;
    const resolvedPrice = service.price && Number(service.price) > 0
      ? service.price
      : (defaultMonthly ? defaultMonthly.price : 0);
    const resolvedUnit = defaultMonthly?.type || service.unit || 'hourly';

    setServiceData({
      ...serviceData,
      name: typeof service.name === 'object' ? service.name.en : service.name,
      description: typeof service.description === 'object' ? service.description.en : service.description || '',
      category: selectedCategory.id,
      price: resolvedPrice || 0,
      unit: resolvedUnit,
      date: new Date().toISOString().split('T')[0],
      brand: service.brand || '',
      model: service.model || '',
      quantity: 1,
      status: 'confirmed',
      templateId: service.id,
      selectedMonth: defaultMonthly?.month || '',
      monthlyOptions,
      // RESET payment status for new selection
      paymentStatus: 'unpaid',
      amountPaid: 0
    });
    
    setStep('details');
  };

  const handleAddCustom = () => {
    setServiceData(prev => ({
      ...prev,
      name: '',
      description: '',
      price: 0,
      quantity: 1,
      paymentStatus: 'unpaid',
      amountPaid: 0
    }));
    setStep('custom');
  };

  const handleSubmit = () => {
    const totalPrice = serviceData.price * serviceData.quantity;
    
    // EXPLICIT CALCULATION: If unpaid, amountPaid MUST be 0. No exceptions.
    let amountPaid = 0;
    if (serviceData.paymentStatus === 'paid') {
      amountPaid = totalPrice;
    } else if (serviceData.paymentStatus === 'partiallyPaid') {
      amountPaid = parseFloat(serviceData.amountPaid || 0);
    }
    
    const newService = {
      type: serviceData.category,
      name: serviceData.name,
      description: serviceData.description || '',
      date: serviceData.date,
      month: serviceData.selectedMonth || null,
      price: serviceData.price,
      quantity: serviceData.quantity,
      unit: serviceData.unit,
      totalValue: totalPrice,
      status: 'confirmed',
      templateId: serviceData.templateId || null,
      brand: serviceData.brand || '',
      model: serviceData.model || '',
      notes: serviceData.notes || '',
      createdAt: new Date(),
      companyId: userCompanyId,
      paymentStatus: serviceData.paymentStatus,
      amountPaid: amountPaid
    };
    
    onServiceAdded(newService);
  };

  // RENDER CATEGORY SELECTION
  const renderCategorySelection = () => (
    <div className="bg-white">
      <h4 className="text-lg font-medium mb-4 text-gray-900">{t.selectServiceCategory || 'Select Service Category'}</h4>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category)}
              className="p-4 md:p-3 border border-gray-300 rounded-lg flex flex-col items-center hover:bg-blue-50 hover:border-blue-300 transition-colors bg-white"
            >
              <CategoryIcon type={category.icon} size="large" />
              <span className="mt-2 text-center text-gray-900">{category.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // RENDER SERVICES LIST
const renderServicesList = () => (
  <div className="bg-white">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium text-gray-900">{selectedCategory?.name} {t.servicesTitle || 'Services'}</h4>
        <button 
          onClick={() => setStep('category')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
      </div>

      <div className="mb-3">
        <label className="block text-sm text-gray-700 mb-1">{t.search || 'Search'}</label>
        <input
          type="text"
          value={serviceSearch}
          onChange={(e) => setServiceSearch(e.target.value)}
          placeholder={t.searchServices || 'Search services...'}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
        />
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {services.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {services
                .filter((service) => {
                  if (!serviceSearch.trim()) return true;
                  const q = serviceSearch.toLowerCase();
                  const name = (service.displayName || service.name || '').toString().toLowerCase();
                  const desc = (service.description || '').toString().toLowerCase();
                  const brand = (service.brand || '').toString().toLowerCase();
                  const model = (service.model || '').toString().toLowerCase();
                  return name.includes(q) || desc.includes(q) || brand.includes(q) || model.includes(q);
                })
                .map((service, index) => {
                const displayName = (() => {
                  if (service.displayName) return service.displayName;
                  if (typeof service.name === 'object') {
                    return service.name.en || service.name.ro || Object.values(service.name)[0] || t.unnamedService || 'Unnamed';
                  }
                  return service.name || t.unnamedService || 'Unnamed';
                })();

                const displayDesc = service.brand && service.model
                  ? `${service.brand} ${service.model}`
                  : service.brand
                    ? service.brand
                    : service.model
                      ? service.model
                      : (typeof service.description === 'object' ? (service.description.en || service.description.ro) : service.description);

                const priceOptions = Array.isArray(service.priceConfigurations)
                  ? service.priceConfigurations.filter((pc) => pc && pc.price)
                  : [];
                const cheapestMonthly = priceOptions.reduce((min, pc) => {
                  const priceVal = parseFloat(pc.price);
                  if (Number.isNaN(priceVal)) return min;
                  if (!min || priceVal < min.price) return { price: priceVal, unit: pc.type || service.unit || 'service' };
                  return min;
                }, null);
                const hasPrice = service.price && Number(service.price) > 0;
                const effectivePrice = hasPrice
                  ? { price: Number(service.price), unit: service.unit || 'item' }
                  : cheapestMonthly;
                const displayPrice = effectivePrice
                  ? `${effectivePrice.price.toLocaleString()} € / ${effectivePrice.unit || 'item'}`
                  : (t.priceOnRequest || 'Price on request');

                const descriptionSnippet = displayDesc && displayDesc.length > 120
                  ? `${displayDesc.slice(0, 117)}…`
                  : displayDesc;

                const thumbnail = getServiceThumbnail(service);

                return (
                  <button
                    key={service.id || index}
                    onClick={() => handleServiceSelect(service)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition-colors bg-white"
                  >
                    <div className="flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{displayName}</div>
                        {descriptionSnippet && (
                          <div
                            className="text-sm text-gray-600 mt-1"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {descriptionSnippet}
                          </div>
                        )}
                        <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                          {displayPrice}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg mb-4">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
              </svg>
              <p className="text-gray-500">{t.noServicesFound || `No ${selectedCategory?.name.toLowerCase()} found`}</p>
            </div>
          )}
          
          <button
            onClick={handleAddCustom}
            className="w-full p-3 mt-4 border border-dashed border-gray-300 rounded-lg text-center hover:bg-gray-50 transition-colors bg-white"
          >
            <div className="font-medium text-blue-600">+ {t.addCustom || 'Add Custom'} {selectedCategory?.name}</div>
          </button>
        </>
      )}
    </div>
  );

  // RENDER SERVICE DETAILS FORM
  const renderServiceDetailsForm = () => (
    <div className="bg-white">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          {serviceData.name ? `${serviceData.name}` : t.serviceDetails || 'Service Details'}
        </h4>
        <button 
          onClick={() => setStep('services')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.date || 'Date'}</label>
          <input
            type="date"
            value={serviceData.date}
            onChange={(e) => setServiceData({...serviceData, date: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        {serviceData.monthlyOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.month || 'Month'}</label>
            <select
              value={serviceData.selectedMonth}
              onChange={(e) => {
                const month = e.target.value;
                const picked = serviceData.monthlyOptions.find((opt) => opt.month === month);
                setServiceData({
                  ...serviceData,
                  selectedMonth: month,
                  price: picked ? picked.price : serviceData.price,
                  unit: picked?.type || serviceData.unit
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {serviceData.monthlyOptions.map((opt) => (
                <option key={`${opt.month}-${opt.price}`} value={opt.month}>
                  {(opt.month || t.month || 'Month')}: €{opt.price} / {opt.type || serviceData.unit}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.quantity || 'Quantity'}</label>
            <input
              type="number"
              min="1"
              value={serviceData.quantity}
              onChange={(e) => setServiceData({...serviceData, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.pricePerUnit || 'Price per'} {serviceData.unit}</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={serviceData.price === 0 || serviceData.price === '0' ? '' : serviceData.price}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setServiceData({...serviceData, price: ''});
                    return;
                  }
                  const numeric = parseFloat(raw);
                  setServiceData({...serviceData, price: isNaN(numeric) ? '' : numeric});
                }}
                onFocus={(e) => {
                  if (serviceData.price === 0 || serviceData.price === '0') {
                    setServiceData({ ...serviceData, price: '' });
                  }
                }}
                className="w-full pl-8 p-2 bg-white border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">€</span>
              </div>
            </div>
          </div>
        </div>
        
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.totalAmount || 'Total Amount'}</label>
            <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-md font-medium text-blue-700">
            {(serviceData.price * serviceData.quantity || 0).toLocaleString()} €
            </div>
          </div>
        
        {/* PAYMENT STATUS SECTION */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.paymentStatus || 'Payment Status'} *
            </label>
            <select
              value={serviceData.paymentStatus}
              onChange={(e) => {
                const status = e.target.value;
                setServiceData({
                  ...serviceData, 
                  paymentStatus: status,
                  amountPaid: status === 'paid' ? (serviceData.price * serviceData.quantity) : 0
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="unpaid">{t.unpaid || 'Not Paid'}</option>
              <option value="partiallyPaid">{t.partiallyPaid || 'Partially Paid'}</option>
              <option value="paid">{t.paid || 'Fully Paid'}</option>
            </select>
          </div>
          
          {serviceData.paymentStatus === 'partiallyPaid' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.amountPaid || 'Amount Paid'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={serviceData.price * serviceData.quantity}
                  step="0.01"
                  value={serviceData.amountPaid}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    if (rawValue === '') {
                      setServiceData({
                        ...serviceData, 
                        amountPaid: ''
                      });
                      return;
                    }
                    const value = parseFloat(rawValue);
                    const maxAmount = serviceData.price * serviceData.quantity;
                    setServiceData({
                      ...serviceData, 
                      amountPaid: isNaN(value) ? '' : Math.min(value, maxAmount)
                    });
                  }}
                  onFocus={(e) => {
                    if (serviceData.amountPaid === 0 || serviceData.amountPaid === '0') {
                      setServiceData({ ...serviceData, amountPaid: '' });
                    }
                  }}
                  className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">€</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t.remaining || 'Remaining'}: {((serviceData.price * serviceData.quantity) - (serviceData.amountPaid || 0)).toFixed(2)} €
              </p>
            </div>
          )}
          
          {serviceData.paymentStatus === 'paid' && (
            <div className="flex items-center text-sm text-green-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t.serviceFullyPaid || 'Service will be marked as fully paid'}
            </div>
          )}
          
          {serviceData.paymentStatus === 'unpaid' && (
            <div className="flex items-center text-sm text-amber-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {t.serviceNotPaid || 'Service will be marked as not paid'}
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.notes || 'Notes (optional)'}</label>
          <textarea
            value={serviceData.notes}
            onChange={(e) => setServiceData({...serviceData, notes: e.target.value})}
            placeholder={t.addSpecialRequirements || "Add any special requirements or information"}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          ></textarea>
        </div>
        
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
          >
            {t.cancel || 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            disabled={!serviceData.name || serviceData.price <= 0}
          >
            {t.addToBooking || 'Add to Booking'}
          </button>
        </div>
      </div>
    </div>
  );

  // RENDER CUSTOM SERVICE FORM
  const renderCustomForm = () => (
    <div className="bg-white">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium text-gray-900">{t.customService || 'Custom Service'}</h4>
        <button 
          onClick={() => selectedCategory?.id === 'custom' ? setStep('category') : setStep('services')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.serviceName || 'Service Name*'}
          </label>
          <input
            type="text"
            value={serviceData.name}
            onChange={(e) => setServiceData({...serviceData, name: e.target.value})}
            placeholder={t.enterServiceName || "Enter service name"}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.description || 'Description'}
          </label>
          <textarea
            value={serviceData.description}
            onChange={(e) => setServiceData({...serviceData, description: e.target.value})}
            placeholder={t.enterServiceDescription || "Enter service description"}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.date || 'Date'}</label>
          <input
            type="date"
            value={serviceData.date}
            onChange={(e) => setServiceData({...serviceData, date: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.price || 'Price*'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={serviceData.price === 0 || serviceData.price === '0' ? '' : serviceData.price}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setServiceData({...serviceData, price: ''});
                    return;
                  }
                  const numeric = parseFloat(raw);
                  setServiceData({...serviceData, price: isNaN(numeric) ? '' : numeric});
                }}
                onFocus={(e) => {
                  if (serviceData.price === 0 || serviceData.price === '0') {
                    setServiceData({ ...serviceData, price: '' });
                  }
                }}
                className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">€</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.unit || 'Unit'}
            </label>
            <select
              value={serviceData.unit}
              onChange={(e) => setServiceData({...serviceData, unit: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="hourly">{t.hourly || 'Hourly'}</option>
              <option value="daily">{t.daily || 'Daily'}</option>
              <option value="nightly">{t.nightly || 'Nightly'}</option>
              <option value="item">{t.item || 'Item'}</option>
              <option value="service">{t.service || 'Service'}</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.quantity || 'Quantity'}
            </label>
            <input
              type="number"
              min="1"
              value={serviceData.quantity}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setServiceData({...serviceData, quantity: ''});
                  return;
                }
                const numeric = parseInt(raw);
                setServiceData({...serviceData, quantity: isNaN(numeric) ? '' : numeric});
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.totalAmount || 'Total Amount'}
            </label>
            <div className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md font-medium text-gray-900">
              {(serviceData.price * serviceData.quantity).toLocaleString()} €
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.notes || 'Notes (optional)'}
          </label>
          <textarea
            value={serviceData.notes}
            onChange={(e) => setServiceData({...serviceData, notes: e.target.value})}
            placeholder={t.addSpecialRequirements || "Any special requirements or information"}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          ></textarea>
        </div>
        
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
          >
            {t.cancel || 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            disabled={!serviceData.name || serviceData.price <= 0}
          >
            {t.addToBooking || 'Add to Booking'}
          </button>
        </div>
      </div>
    </div>
  );

  // MAIN COMPONENT RENDER
  return (
    <div className="p-4 bg-white min-h-full">
      {step === 'category' && renderCategorySelection()}
      {step === 'services' && renderServicesList()}
      {step === 'details' && renderServiceDetailsForm()}
      {step === 'custom' && renderCustomForm()}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

// IMPROVED SHOPPING EXPENSE FORM
const ShoppingExpenseForm = ({ onAddShopping, onCancel, userCompanyId, t }) => {
  const [shoppingData, setShoppingData] = useState({
    store: '',
    items: '',
    date: new Date().toISOString().split('T')[0],
    price: '',
    lastMarkupApplied: null,
    receipt: false,
    notes: '',
    receiptFile: null,
    receiptPreview: '',
    paymentStatus: 'unpaid', // NEW: Payment tracking
    amountPaid: 0 // NEW: Amount paid
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleReceiptChange = async (file) => {
    if (!file) {
      setShoppingData(prev => ({ ...prev, receiptFile: null, receiptPreview: '' }));
      return;
    }

    const isSupported = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isSupported) {
      setError(t.unsupportedFileType || 'Please upload an image or PDF');
      return;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      setError(null);
      setShoppingData(prev => ({
        ...prev,
        receiptFile: file,
        receiptPreview: typeof dataUrl === 'string' ? dataUrl : '',
        receipt: true // mark receipt available when a file is attached
      }));
    } catch (err) {
      console.error('Receipt preview error:', err);
      setError(t.failedToLoadReceipt || 'Unable to load receipt preview');
    }
  };

  const applyMarkup = (percentage) => {
    const base = parseFloat(shoppingData.basePrice || shoppingData.price);
    if (Number.isNaN(base)) return;
    // Prevent multiple presses compounding; always apply to original base
    const updated = parseFloat((base * (1 + percentage / 100)).toFixed(2));
    setShoppingData(prev => ({
      ...prev,
      price: updated.toString(),
      basePrice: shoppingData.basePrice || shoppingData.price,
      lastMarkupApplied: percentage
    }));
  };
  
  const handleSubmit = async () => {
    if (!shoppingData.store.trim()) {
      setError(t.pleaseEnterStore || "Please enter a store name");
      return;
    }
    
    if (!shoppingData.items.trim()) {
      setError(t.pleaseEnterItems || "Please enter items purchased");
      return;
    }
    
    const numericPrice = parseFloat(shoppingData.price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setError(t.pleaseEnterValidAmount || "Please enter a valid amount");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const buildReceiptAttachment = () => {
        if (!shoppingData.receiptFile || !shoppingData.receiptPreview) return null;
        const tooLarge = shoppingData.receiptPreview.length > MAX_INLINE_RECEIPT_LENGTH;
        const safePreview = tooLarge
          ? shoppingData.receiptPreview.slice(0, MAX_INLINE_RECEIPT_LENGTH)
          : shoppingData.receiptPreview;
        return {
          name: shoppingData.receiptFile.name,
          type: shoppingData.receiptFile.type,
          size: shoppingData.receiptFile.size,
          dataUrl: safePreview,
          truncated: tooLarge
        };
      };

      const newExpense = {
        type: 'shopping',
        name: `${t.shoppingAt || 'Shopping at'} ${shoppingData.store}`,
        description: shoppingData.items,
        date: shoppingData.date,
        price: numericPrice,
        quantity: 1,
        unit: 'item',
        store: shoppingData.store,
        hasReceipt: shoppingData.receipt || !!shoppingData.receiptFile,
        notes: shoppingData.notes || '',
        totalValue: numericPrice,
        status: 'confirmed',
        createdAt: new Date(),
        companyId: userCompanyId,
        receiptAttachment: buildReceiptAttachment(),
        paymentStatus: shoppingData.paymentStatus || 'unpaid',
        amountPaid: shoppingData.paymentStatus === 'paid' ? numericPrice : (parseFloat(shoppingData.amountPaid) || 0)
      };
      
      await onAddShopping(newExpense);
      setShoppingData({
        store: '',
        items: '',
        date: new Date().toISOString().split('T')[0],
        price: '',
        receipt: false,
        notes: '',
        receiptFile: null,
        receiptPreview: ''
      });
      setIsSubmitting(false);
    } catch (err) {
      console.error("Error adding shopping expense:", err);
      setError(err.message || t.failedToAddShopping || "Failed to add shopping expense");
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-4 bg-white min-h-full">
      <h4 className="text-lg font-medium mb-4 text-gray-900">{t.addShoppingExpense || 'Add Shopping Expense'}</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.storeName || 'Store Name*'}
          </label>
          <input
            type="text"
            value={shoppingData.store}
            onChange={(e) => setShoppingData({...shoppingData, store: e.target.value})}
            placeholder={t.storeNamePlaceholder || "E.g. Gucci, Supermarket, Pharmacy"}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.itemsPurchased || 'Items Purchased*'}
          </label>
          <textarea
            value={shoppingData.items}
            onChange={(e) => setShoppingData({...shoppingData, items: e.target.value})}
            placeholder={t.itemsPurchasedPlaceholder || "List of items purchased"}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            required
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.date || 'Date'}
          </label>
          <input
            type="date"
            value={shoppingData.date}
            onChange={(e) => setShoppingData({...shoppingData, date: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.totalAmount || 'Total Amount*'}
          </label>
          <div className="space-y-2">
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={shoppingData.price}
                onChange={(e) => setShoppingData({...shoppingData, price: e.target.value})}
                onFocus={(e) => {
                  if (e.target.value === '0') {
                    setShoppingData(prev => ({ ...prev, price: '' }));
                  }
                }}
                className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">€</span>
              </div>
            </div>
            <div className="flex gap-2">
              {[10, 20, 30].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyMarkup(pct)}
                  className="flex-1 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-800"
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.paymentStatus || 'Payment Status'} *
            </label>
            <select
              value={shoppingData.paymentStatus}
              onChange={(e) => {
                const status = e.target.value;
                setShoppingData({
                  ...shoppingData, 
                  paymentStatus: status,
                  amountPaid: status === 'paid' ? shoppingData.price : 0
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="unpaid">{t.unpaid || 'Not Paid'}</option>
              <option value="partiallyPaid">{t.partiallyPaid || 'Partially Paid'}</option>
              <option value="paid">{t.paid || 'Fully Paid'}</option>
            </select>
          </div>
          
          {shoppingData.paymentStatus === 'partiallyPaid' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.amountPaid || 'Amount Paid'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={parseFloat(shoppingData.price) || 0}
                  step="0.01"
                  value={shoppingData.amountPaid}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    if (rawValue === '') {
                      setShoppingData({ ...shoppingData, amountPaid: '' });
                      return;
                    }
                    const value = parseFloat(rawValue);
                    const maxAmount = parseFloat(shoppingData.price) || 0;
                    setShoppingData({
                      ...shoppingData, 
                      amountPaid: isNaN(value) ? '' : Math.min(value, maxAmount)
                    });
                  }}
                  onFocus={(e) => {
                    if (shoppingData.amountPaid === 0 || shoppingData.amountPaid === '0') {
                      setShoppingData({ ...shoppingData, amountPaid: '' });
                    }
                  }}
                  className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">€</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t.remaining || 'Remaining'}: {((parseFloat(shoppingData.price) || 0) - (parseFloat(shoppingData.amountPaid) || 0)).toFixed(2)} €
              </p>
            </div>
          )}
          
          {shoppingData.paymentStatus === 'paid' && (
            <div className="flex items-center text-sm text-green-600 mb-4">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t.serviceFullyPaid || 'Expense will be marked as fully paid'}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              {t.receiptAvailable || 'Receipt available'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasReceipt"
                checked={shoppingData.receipt}
                onChange={(e) => setShoppingData({...shoppingData, receipt: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hasReceipt" className="text-xs text-gray-600">
                {t.receiptCheckbox || 'Mark if receipt exists'}
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => handleReceiptChange(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-700"
            />
          </div>
          {shoppingData.receiptFile && (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
              <div className="text-gray-700 truncate">
                {shoppingData.receiptFile.name}
              </div>
              <button
                type="button"
                onClick={() => handleReceiptChange(null)}
                className="text-red-600 hover:text-red-700 text-xs font-medium"
              >
                {t.remove || 'Remove'}
              </button>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.notes || 'Notes (optional)'}
          </label>
          <textarea
            value={shoppingData.notes}
            onChange={(e) => setShoppingData({...shoppingData, notes: e.target.value})}
            placeholder={t.additionalNotes || "Additional notes"}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          ></textarea>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
            disabled={isSubmitting}
          >
            {t.cancel || 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-colors"
            disabled={isSubmitting || !shoppingData.store || !shoppingData.items || Number.isNaN(parseFloat(shoppingData.price)) || parseFloat(shoppingData.price) <= 0}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t.adding || 'Adding...'}
              </div>
            ) : (
              t.addShoppingExpense || 'Add Shopping Expense'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// CLIENT CARD COMPONENT
const ClientCard = ({ client, onViewDetails, onOpenPayment, onOpenService, onOpenShopping }) => {
  // Get translations from the context
  const language = localStorage.getItem('appLanguage') || 'en';
  
  // Translations for the component
  const translations = {
    en: {
      paid: "Paid",
      partiallyPaid: "Partially Paid",
      notPaid: "Not Paid",
      guests: "guests",
      paymentProgress: "Payment Progress",
      servicesAndExtras: "Services & Extras",
      more: "more",
      details: "Details",
      pay: "Pay",
      service: "Service",
      shop: "Shop",
      today: "Today",
      tomorrow: "Tomorrow",
      inDays: "In",
      days: "days",
      yesterday: "Yesterday",
      daysAgo: "days ago"
    },
    ro: {
      paid: "Plătit",
      partiallyPaid: "Parțial Plătit",
      notPaid: "Neplătit",
      guests: "oaspeți",
      paymentProgress: "Progres Plată",
      servicesAndExtras: "Servicii și Extra",
      more: "mai multe",
      details: "Detalii",
      pay: "Plătește",
      service: "Serviciu",
      shop: "Cumpărături",
      today: "Astăzi",
      tomorrow: "Mâine",
      inDays: "În",
      days: "zile",
      yesterday: "Ieri",
      daysAgo: "zile în urmă"
    }
  };
  
  const t = translations[language];
  
  // Get check-in date from the earliest upcoming booking if it exists
  const earliestBooking = [...client.bookings].sort((a, b) => 
    new Date(a.checkIn || 0) - new Date(b.checkIn || 0)
  )[0] || {};
  const villaName = earliestBooking?.accommodationType
    ? safeRender(earliestBooking.accommodationType)
    : '';
  
  // Helper functions
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'ro-RO', {
      day: '2-digit',
      month: '2-digit'
    });
  };
  
  // Helper function to get client name
  const getClientName = (clientId) => {
    if (!clientDetails[clientId]) return '';
    return safeRender(clientDetails[clientId].name) || '';
  };
  
  const formatBookingRange = (booking) => {
    if (!booking) return '';
    const start = formatShortDate(booking.checkIn);
    const end = formatShortDate(booking.checkOut || booking.checkIn);
    if (start && end && start !== end) {
      return `${start} → ${end}`;
    }
    return start || end || '';
  };
  
  const getQuickGuestSummary = (booking) => {
    if (!booking) return '';
    if (booking.guests) {
      return `${booking.guests} ${t.guests}`;
    }
    if (booking.accommodationType) {
      return safeRender(booking.accommodationType);
    }
    if (booking.category) {
      return safeRender(booking.category);
    }
    return '';
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed':
        return t.confirmed;
      case 'pending':
        return t.pending;
      case 'cancelled':
        return t.cancelled;
      case 'booked':
        return t.booked;
      default:
        return safeRender(status);
    }
  };
  
  const getStatusBadgeClass = (status) => {
    return statusColors[status]?.cssClass || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getDaysLeft = (date) => {
    if (!date) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(date);
    checkInDate.setHours(0, 0, 0, 0);
    const diffTime = checkInDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return t.today;
    } else if (diffDays === 1) {
      return t.tomorrow;
    } else if (diffDays > 1) {
      return `${t.inDays} ${diffDays} ${t.days}`;
    } else if (diffDays === -1) {
      return t.yesterday;
    } else if (diffDays < -1) {
      return `${Math.abs(diffDays)} ${t.daysAgo}`;
    } else {
      return '';
    }
  };
  
  const getClientInitials = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const getPaymentStatusText = (status) => {
    if (!status) return '';
    
    switch(status) {
      case 'paid': return t.paid;
      case 'partiallyPaid': return t.partiallyPaid;
      case 'notPaid': return t.notPaid;
      default: return safeRender(status);
    }
  };
  
  const getPaymentStatusBadgeClass = (status) => {
    const paymentStatusColors = {
      paid: { cssClass: 'bg-green-100 text-green-800 border-green-200' },
      partiallyPaid: { cssClass: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      notPaid: { cssClass: 'bg-red-100 text-red-800 border-red-200' }
    };
    return paymentStatusColors[status]?.cssClass || 'bg-gray-100 text-gray-800';
  };
  
  const getBorderColorClass = (status) => {
    if (status === 'paid') return 'border-green-500';
    if (status === 'partiallyPaid') return 'border-yellow-500';
    return 'border-red-500';
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden border-l-4 w-full max-w-full ${getBorderColorClass(client.paymentStatus)}`}>
      {/* Client header with avatar and details */}
      <div className="p-4">
        <div className="flex justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
              client.paymentStatus === 'paid' ? 'bg-green-500' : 
              client.paymentStatus === 'partiallyPaid' ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}>
              {getClientInitials(client.clientName)}
            </div>
            <div className="ml-3 truncate flex-1 min-w-0">
              <h3 className="font-medium leading-tight truncate">{safeRender(client.clientName)}</h3>
              <div className="flex items-center mt-1 flex-wrap gap-1">
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(client.paymentStatus)}`}>
                  {getPaymentStatusText(client.paymentStatus)}
                </div>
                
                {earliestBooking.checkIn && (
                  <div className="ml-2 text-xs text-gray-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16"></path>
                    </svg>
                    {formatShortDate(earliestBooking.checkIn)}
                    {earliestBooking.checkOut && ` - ${formatShortDate(earliestBooking.checkOut)}`}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{client.totalValue.toLocaleString()} €</div>
            {client.paymentStatus !== 'paid' && (
              <div className="text-xs text-red-600 font-medium mt-1">
                {getDaysLeft(earliestBooking.checkIn)}
              </div>
            )}
          </div>
        </div>
        
        {/* Payment progress bar */}
        {client.totalValue > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-gray-600">{t.paymentProgress}</span>
              <div className="flex gap-2 items-center">
                {client.paidAmount > client.totalValue && (
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    +{ (client.paidAmount - client.totalValue).toLocaleString() } € Credit
                  </span>
                )}
                <span className="font-medium">{client.paidAmount.toLocaleString()} / {client.totalValue.toLocaleString()} €</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  client.paidAmount >= client.totalValue ? 'bg-green-500' : 
                  client.paidAmount > 0 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (client.paidAmount / client.totalValue) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Services summary */}
        {(villaName || client.services.length > 0) && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-gray-600">{t.servicesAndExtras}</div>
            {villaName && (
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-3 py-1 rounded-full border font-semibold ${getServiceTagClasses('villa')}`}>
                  {villaName}
                </span>
                <span className="uppercase tracking-wide text-[0.65rem] text-gray-500">
                  {t.primaryResidence || 'Villa'}
                </span>
              </div>
            )}
            {client.services.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {client.services
                  .filter(service => {
                    const serviceName = safeRender(service.name || '');
                    if (!serviceName || !villaName) return true;
                    return serviceName.trim().toLowerCase() !== villaName.trim().toLowerCase();
                  })
                  .map((service, idx) => (
                    <span
                      key={`${service.name}-${idx}`}
                      className={`px-2 py-1 rounded-full border ${getServiceTagClasses(service.type)}`}
                    >
                      {safeRender(service.name)}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Action buttons - FIXED with direct prop callbacks */}
      <div className="grid grid-cols-4 border-t bg-gray-50">
  <button 
    className="flex flex-col items-center justify-center py-3 text-gray-700 hover:bg-gray-100 transition-colors active:bg-gray-200"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Details button clicked for client:', client.clientId);
      onViewDetails?.(client.clientId);
    }}
  >
    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span className="text-xs font-medium">{t.details}</span>
  </button>
  
  <button 
    className={`flex flex-col items-center justify-center py-3 transition-colors active:bg-gray-200 ${
      client.paymentStatus === 'paid' 
        ? 'text-green-700 bg-green-50'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Pay button clicked for client:', client.clientName, 'Due amount:', client.dueAmount);
      if (client.paymentStatus !== 'paid') {
        onOpenPayment?.(client);
      }
    }}
    disabled={client.paymentStatus === 'paid'}
  >
    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
    <span className="text-xs font-medium">{client.paymentStatus === 'paid' ? t.paid : t.pay}</span>
  </button>
  
  <button 
    className="flex flex-col items-center justify-center py-3 text-gray-700 hover:bg-gray-100 transition-colors active:bg-gray-200"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Service button clicked for client:', client.clientName);
      onOpenService?.(client);
    }}
  >
    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
    <span className="text-xs font-medium">{t.service}</span>
  </button>
  
  <button 
    className="flex flex-col items-center justify-center py-3 text-gray-700 hover:bg-gray-100 transition-colors active:bg-gray-200"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Shop button clicked for client:', client.clientName);
      onOpenShopping?.(client);
    }}
  >
    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
    <span className="text-xs font-medium">{t.shop}</span>
  </button>
</div>
    </div>
  );
};

// MAIN BOOKINGS COMPONENT
const UpcomingBookings = () => {
  // Auth state and company association
  const [userCompanyId, setUserCompanyId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // RECALCULATE FUNCTION - Strictly sums all services to fix broken balances
  const handleRecalculateTotals = async (client) => {
    if (!client || !client.bookings || client.bookings.length === 0) return;
    
    try {
      showNotificationMessage(t.recalculating || 'Recalculating totals...');
      console.log("🔄 Recalculating for client:", client.clientName);
      
      const updatedBookings = await Promise.all(client.bookings.map(async (booking) => {
        const bookingRef = doc(db, 'reservations', booking.id);
        const bookingSnap = await getDoc(bookingRef);
        
        if (!bookingSnap.exists()) return booking;
        
        const data = bookingSnap.data();
        let services = Array.isArray(data.services) ? [...data.services] : [];
        const paymentHistory = Array.isArray(data.paymentHistory) ? data.paymentHistory : [];
        
        // 1. Calculate total value of services (Source of Truth for Total)
        let totalValue = 0;
        services.forEach(s => {
          totalValue += (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
        });
        
        // 2. Calculate total paid from history (Source of Truth for Payments)
        const totalPaidFromHistory = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        // 3. Fallback for baseAmount if no services
        if (services.length === 0 && data.baseAmount) {
          totalValue = data.baseAmount;
        }
        
        // 4. Update each service's payment status based on history STRICTLY by ID
        services = services.map(s => {
          const sTotal = (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
          let sPaid = 0;
          
          if (s.id) {
            paymentHistory.forEach(p => {
              if (p.serviceId === s.id) sPaid += parseFloat(p.amount || 0);
            });
          }
          
          let sStatus = 'unpaid';
          if (sPaid >= sTotal && sTotal > 0) sStatus = 'paid';
          else if (sPaid > 0) sStatus = 'partiallyPaid';
          
          return {
            ...s,
            amountPaid: sPaid,
            paymentStatus: sStatus
          };
        });
        
        // 5. Booking-level status
        let paymentStatus = 'notPaid';
        if (totalPaidFromHistory >= totalValue && totalValue > 0) paymentStatus = 'paid';
        else if (totalPaidFromHistory > 0) paymentStatus = 'partiallyPaid';
        
        console.log(`Booking ${booking.id} healed: Paid ${totalPaidFromHistory} / Total ${totalValue}`);
        
        const updateData = {
          totalValue,
          totalAmount: totalValue,
          paidAmount: totalPaidFromHistory,
          paymentStatus,
          services,
          updatedAt: serverTimestamp()
        };
        
        await updateDoc(bookingRef, updateData);
        return { id: booking.id, ...data, ...updateData };
      }));
      
      // Update local state
      setClientGroups(prev => {
        const updated = { ...prev[client.clientId] };
        updated.bookings = updatedBookings;
        
        let globalTotalVal = 0;
        let globalTotalPaid = 0;
        updatedBookings.forEach(b => {
          globalTotalVal += b.totalValue || 0;
          globalTotalPaid += b.paidAmount || 0;
        });
        
        updated.totalValue = globalTotalVal;
        updated.paidAmount = globalTotalPaid;
        updated.dueAmount = Math.max(0, globalTotalVal - globalTotalPaid);
        updated.paymentStatus = globalTotalPaid >= globalTotalVal && globalTotalVal > 0 ? 'paid' : (globalTotalPaid > 0 ? 'partiallyPaid' : 'notPaid');
        
        return { ...prev, [client.clientId]: updated };
      });
      
      showNotificationMessage(t.recalculateSuccess || 'Totals recalculated successfully');
    } catch (err) {
      console.error('Recalculation error:', err);
      showNotificationMessage('Recalculation failed', 'error');
    }
  };
  
  const { language } = useLanguage();
  const t = useMemo(() => translations[language] || translations.en, [language]);
  const formatCurrency = (value = 0) => {
    try {
      return new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'ro-RO', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(value || 0);
    } catch (err) {
      console.warn('Currency format fallback', err);
      return `${(value || 0).toLocaleString()} €`;
    }
  };

  
  // Navigation and responsive design
  const navigate = useNavigate();
  const isDesktop = useMediaQuery({ minWidth: 768 });
  
  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [clientGroups, setClientGroups] = useState({});
  const [clientDetails, setClientDetails] = useState({});
  const clientList = useMemo(() => Object.values(clientGroups), [clientGroups]);
  
  // Simplified UI states (declare before dependent hooks)
  const getStoredTimeFilter = () => {
    if (typeof window === 'undefined') return 'active';
    const validFilters = ['active', 'upcoming', 'past'];
    try {
      const stored = localStorage.getItem('reservationsTimeFilter');
      return validFilters.includes(stored) ? stored : 'active';
    } catch (err) {
      console.warn('Unable to read stored time filter', err);
      return 'active';
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState(getStoredTimeFilter); // Default to showing active stays
  const [sortOption, setSortOption] = useState('date');

  const getTodayStart = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const normalizeDateValue = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const isBookingInactive = (booking = {}) =>
    booking?.status === 'cancelled' || booking?.cancelled === true || booking?.active === false;

  const getBookingTimeBucket = (booking, today = getTodayStart()) => {
    if (!booking || isBookingInactive(booking)) return null;
    const checkIn = normalizeDateValue(booking.checkIn);
    const checkOut = normalizeDateValue(booking.checkOut || booking.checkIn);
    if (!checkIn || !checkOut) return null;
    
    if (checkIn > today) return 'upcoming';
    if (checkIn <= today && checkOut >= today) return 'active';
    if (checkOut < today) return 'past';
    return null;
  };
  
  const summaryStats = useMemo(() => {
    const today = getTodayStart();
    
    let upcoming = 0;
    let active = 0;
    let past = 0;
    const seenBookings = new Set();
    
    bookings.forEach(booking => {
      if (!booking || seenBookings.has(booking.id)) return;
      seenBookings.add(booking.id);
      const bucket = getBookingTimeBucket(booking, today);
      if (bucket === 'upcoming') upcoming += 1;
      else if (bucket === 'active') active += 1;
      else if (bucket === 'past') past += 1;
    });
    
    const totals = clientList.reduce(
      (acc, client) => {
        acc.totalRevenue += client.totalValue || 0;
        acc.outstanding += client.dueAmount || 0;
        return acc;
      },
      { totalRevenue: 0, outstanding: 0 }
    );
    
    return {
      totalClients: clientList.length,
      totalBookings: bookings.length,
      upcoming,
      active,
      past,
      totalRevenue: totals.totalRevenue,
      outstanding: totals.outstanding
    };
  }, [bookings, clientList]);
  const { quickUpcoming, quickPast } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const parseDate = (value) => {
      if (!value) return null;
      const date = value instanceof Date ? new Date(value) : new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      date.setHours(0, 0, 0, 0);
      return date;
    };
    
    const upcomingList = bookings
      .filter((booking) => {
        const checkIn = parseDate(booking.checkIn);
        return checkIn && checkIn >= today;
      })
      .sort((a, b) => {
        const aDate = parseDate(a.checkIn);
        const bDate = parseDate(b.checkIn);
        return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
      });
    
    const pastList = bookings
      .filter((booking) => {
        const checkOut = parseDate(booking.checkOut || booking.checkIn);
        return checkOut && checkOut < today;
      })
      .sort((a, b) => {
        const aDate = parseDate(a.checkOut || a.checkIn);
        const bDate = parseDate(b.checkOut || b.checkIn);
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
      });
    
    return {
      quickUpcoming: upcomingList.slice(0, 4),
      quickPast: pastList.slice(0, 4)
    };
  }, [bookings]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('reservationsTimeFilter', timeFilter);
    } catch (err) {
      console.warn('Unable to persist time filter', err);
    }
  }, [timeFilter]);

  const filterTabs = useMemo(
    () => [
      { id: 'active', label: t.activeNow, count: summaryStats.active, icon: 'clock' },
      { id: 'upcoming', label: t.upcoming, count: summaryStats.upcoming, icon: 'calendar' },
      { id: 'past', label: t.past, count: summaryStats.past, icon: 'history' }
    ],
    [t, summaryStats]
  );
  const renderTabIcon = (type) => {
    switch (type) {
      case 'calendar':
        return (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'clock':
        return (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'history':
        return (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m-3-13a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        );
      default:
        return (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
    }
  };
  const filteredClients = useMemo(
    () => getFilteredClients(),
    [clientGroups, timeFilter, sortOption, searchQuery]
  );

  const visibleBookingCount = useMemo(
    () => {
      const today = getTodayStart();
      return filteredClients.reduce((total, client) => {
        const bookingsForFilter = (client.bookings || []).filter(
          (booking) => getBookingTimeBucket(booking, today) === timeFilter
        );
        return total + bookingsForFilter.length;
      }, 0);
    },
    [filteredClients, timeFilter]
  );
  
  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro-RO', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).format(new Date());
    } catch {
      return '';
    }
  }, [language]);
  
  // Modal states
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetContent, setBottomSheetContent] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [paymentTargetService, setPaymentTargetService] = useState(null);
  const bottomSheetRef = useRef(null);
  const bookingListAnchorId = 'booking-results';
  
  // Payment form state
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'cash',
    notes: '',
    receiptNumber: '',
    createdAt: new Date(),
    modifiedAt: new Date()
  });
  
  // Notification states
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  
  const handleQuickFilterJump = (targetFilter) => {
    setTimeFilter(targetFilter);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const anchor = document.getElementById(bookingListAnchorId);
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  };
  
  const getPanelClientName = (clientId) => {
    if (!clientId) return '';
    const client = clientDetails[clientId];
    return client ? safeRender(client.name) : '';
  };
  
  const formatBookingRangeForPanel = (booking) => {
    if (!booking) return '';
    const start = formatShortDate(booking.checkIn);
    const end = formatShortDate(booking.checkOut || booking.checkIn);
    if (start && end && start !== end) {
      return `${start} → ${end}`;
    }
    return start || end || '';
  };
  
  const getQuickPanelGuestSummary = (booking) => {
    if (!booking) return '';
    if (booking.guests) return `${booking.guests} ${t.guests}`;
    if (booking.accommodationType) return safeRender(booking.accommodationType);
    if (booking.category) return safeRender(booking.category);
    return '';
  };

  
  function renderQuickBookingPanel(title, emptyText, list, filterKey) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">{t.heroSnapshot}</p>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => handleQuickFilterJump(filterKey)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            {t.viewAll}
          </button>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((booking) => (
              <li key={booking.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {safeRender(booking.clientName) || getPanelClientName(booking.clientId) || t.unknownClient}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBookingRangeForPanel(booking)}
                    {getQuickPanelGuestSummary(booking) && ` • ${getQuickPanelGuestSummary(booking)}`}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusBadgeClass(booking.status)}`}>
                  {getStatusText(booking.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  

useEffect(() => {
  if (!showBottomSheet || !bottomSheetRef.current) return;

  const modal = bottomSheetRef.current;
  const header = modal.querySelector('.bottom-sheet-header');
  if (!header) return;

  let startY = 0;
  let dragging = false;

  const handleTouchStart = (e) => {
    dragging = true;
    startY = e.touches[0].clientY;
    modal.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      modal.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = (e) => {
    if (!dragging) return;
    dragging = false;
    modal.style.transition = 'transform 0.25s ease-out';

    const deltaY = e.changedTouches[0].clientY - startY;
    if (deltaY > 140) {
      closeBottomSheet();
    } else {
      modal.style.transform = 'translateY(0)';
    }
  };

  header.addEventListener('touchstart', handleTouchStart, { passive: true });
  header.addEventListener('touchmove', handleTouchMove, { passive: true });
  header.addEventListener('touchend', handleTouchEnd, { passive: true });
  header.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  return () => {
    header.removeEventListener('touchstart', handleTouchStart);
    header.removeEventListener('touchmove', handleTouchMove);
    header.removeEventListener('touchend', handleTouchEnd);
    header.removeEventListener('touchcancel', handleTouchEnd);
    modal.style.transform = 'translateY(0)';
    modal.style.transition = '';
  };
}, [showBottomSheet]);
  
  // Helper functions for status text
  const getStatusText = (status) => {
    if (!status) return '';
    
    switch(status) {
      case 'confirmed': return t.confirmed;
      case 'pending': return t.pending;
      case 'cancelled': return t.cancelled;
      case 'booked': return t.booked;
      default: return safeRender(status);
    }
  };
  
  const getPaymentStatusText = (status) => {
    if (!status) return '';
    
    switch(status) {
      case 'paid': return t.paid;
      case 'partiallyPaid': return t.partiallyPaid;
      case 'notPaid': return t.notPaid;
      default: return safeRender(status);
    }
  };
  
  const getStatusBadgeClass = (status) => {
    return statusColors[status]?.cssClass || 'bg-gray-100 text-gray-800';
  };
  
  const getPaymentStatusBadgeClass = (status) => {
    return paymentStatusColors[status]?.cssClass || 'bg-gray-100 text-gray-800';
  };
  
  const getBorderColorClass = (status) => {
    if (status === 'paid') return 'border-green-500';
    if (status === 'partiallyPaid') return 'border-yellow-500';
    return 'border-red-500';
  };
  
  // 1. USER AUTHENTICATION AND COMPANY ASSOCIATION
  useEffect(() => {
    const fetchUserAuthorizationDetails = async () => {
      try {
        setAuthLoading(true);
        
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Prefer users/{uid} first (allowed by rules)
        let companyId = null;
        let role = null;

        const userDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          companyId = userData.companyId || null;
          role = userData.role || null;
        }

        // Fallback to authorized_users by lowercase email
        if (!companyId || !role) {
          const authorizedUsersRef = collection(db, 'authorized_users');
          const authorizedQuery = query(
            authorizedUsersRef,
            where('email', '==', user.email.toLowerCase())
          );
          
          const authorizedSnapshot = await getDocs(authorizedQuery);
          
          if (!authorizedSnapshot.empty) {
            const authorizedUserData = authorizedSnapshot.docs[0].data();
            companyId = companyId || authorizedUserData.companyId || null;
            role = role || authorizedUserData.role || null;
          }
        }
        
        if (!companyId) {
          throw new Error(t.noCompanyAssociation);
        }
        
        console.log(`User authenticated with company: ${companyId}, role: ${role}`);
        
        setUserCompanyId(companyId);
        setUserRole(role);
        setAuthLoading(false);
        return { companyId, role };
      } catch (err) {
        console.error('Error fetching user authorization:', err);
        setAuthError(err.message);
        setAuthLoading(false);
        return null;
      }
    };
    
    fetchUserAuthorizationDetails();
  }, []);
  
  // 2. FETCH BOOKING DATA WITH COMPANY FILTERING
  useEffect(() => {
    if (authLoading || authError || !userCompanyId) {
      return;
    }
    const fetchBookingsData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching data for company: ${userCompanyId}`);
        
        if (!userCompanyId) {
          throw new Error("No company ID available - cannot load data");
        }
        
        // Fetch bookings with strict company filtering
        const bookingsQuery = query(
          collection(db, 'reservations'),
          where('companyId', '==', userCompanyId)
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = [];
        const clientIds = new Set();
        const clientNameFallbacks = {};
        
        bookingsSnapshot.forEach((doc) => {
          const data = doc.data();
          // Double-check company ID as an extra security measure
          if (data.companyId === userCompanyId) {
            // Convert all timestamp fields to JavaScript dates
            const processedData = {
              id: doc.id,
              ...data,
              checkIn: data.checkIn?.toDate?.() || data.checkIn,
              checkOut: data.checkOut?.toDate?.() || data.checkOut,
              createdAt: data.createdAt?.toDate?.() || data.createdAt
            };
            bookingsData.push(processedData);
            if (data.clientId) {
              clientIds.add(data.clientId);
              if (data.clientName && !clientNameFallbacks[data.clientId]) {
                clientNameFallbacks[data.clientId] = data.clientName;
              }
            }
          } else {
            console.warn(`Booking ${doc.id} has wrong company ID: ${data.companyId} vs ${userCompanyId}`);
          }
        });

        // Keep only current or future bookings; drop finished stays
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeOrUpcomingBookings = bookingsData.filter((booking) => {
          const checkIn = booking.checkIn ? new Date(booking.checkIn) : null;
          const checkOut = booking.checkOut ? new Date(booking.checkOut) : checkIn;
          if (!checkIn) return false;
          checkIn.setHours(0, 0, 0, 0);
          if (checkOut) checkOut.setHours(0, 0, 0, 0);
          return checkOut >= today;
        });
        
        setBookings(activeOrUpcomingBookings);
        
        // Fetch client details with company filtering
        const clientDetailsObj = {};
        for (const clientId of clientIds) {
          try {
            const clientDoc = await getDoc(doc(db, 'clients', clientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data();
              // Only add client if it belongs to this company
              if (clientData.companyId === userCompanyId) {
                clientDetailsObj[clientId] = clientData;
              } else {
                console.warn(`Client ${clientId} has wrong company ID: ${clientData.companyId} vs ${userCompanyId}`);
              }
            }
          } catch (err) {
            // Handle permission errors gracefully by falling back to booking-provided name
            const permDenied =
              err?.code === 'permission-denied' ||
              err?.code === 'PERMISSION_DENIED' ||
              (typeof err?.message === 'string' && err.message.toLowerCase().includes('permission'));
            if (permDenied) {
              console.warn(`Permission denied reading client ${clientId}; using booking fallback name.`);
              clientDetailsObj[clientId] = { name: clientNameFallbacks[clientId] || 'Client' };
            } else {
              console.error(`Error fetching client ${clientId}:`, err);
            }
          }
        }
        
        setClientDetails(clientDetailsObj);
        
        // Group bookings by client
        const groups = {};
        activeOrUpcomingBookings.forEach(booking => {
          const clientId = booking.clientId || 'unknown';
          const clientName =
            clientDetailsObj[clientId]?.name ||
            booking.clientName ||
            'Unknown Client';
          
          if (!groups[clientId]) {
            groups[clientId] = {
              clientId,
              clientName,
              bookings: [],
              services: [],
              offers: [],
              totalValue: 0,
              paidAmount: 0,
              dueAmount: 0,
              paymentStatus: 'notPaid',
              paymentHistory: [],
              lastActivity: null
            };
          }
          
          // Extract all payment history
          if (booking.paymentHistory && booking.paymentHistory.length > 0) {
            booking.paymentHistory.forEach(payment => {
              // Convert timestamps to dates
              const processedPayment = {
                ...payment,
                date: payment.date?.toDate?.() || payment.date
              };
              groups[clientId].paymentHistory.push({
                ...processedPayment,
                bookingId: booking.id
              });
            });
          }
          
          // Extract all services - FIXED: properly extract services and handle dates
          const bookingServices = Array.isArray(booking.services)
            ? booking.services
            : (Array.isArray(booking.extras) ? booking.extras : []);
          
          // 1. CALCULATE TOTAL VALUE (Sum of all services)
          const serviceTotalForBooking = bookingServices.reduce((sum, svc) => {
            const price = parseFloat(svc?.price || 0);
            const qty = parseInt(svc?.quantity || 1);
            return sum + (price * qty);
          }, 0);
          
          // 2. CALCULATE TOTAL PAID FROM HISTORY (The absolute Source of Truth)
          const paymentHistory = Array.isArray(booking.paymentHistory) ? booking.paymentHistory : [];
          const totalPaidFromHistory = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          
          // 3. MAP PAYMENTS TO SERVICES (By ID)
          // We don't automatically allocate money here. 
          // We only count payments that explicitly have this serviceId.
          const servicesWithPayments = bookingServices.map(svc => {
            const svcId = svc.id || svc.templateId;
            let svcPaid = 0;
            if (svcId) {
              paymentHistory.forEach(p => {
                if (p.serviceId === svcId) svcPaid += parseFloat(p.amount || 0);
              });
            }
            // Preserve stored amountPaid if no history matches (for transition)
            const finalSvcPaid = svcPaid > 0 ? svcPaid : (parseFloat(svc.amountPaid) || 0);
            
            return {
              ...svc,
              amountPaid: finalSvcPaid,
              paymentStatus: finalSvcPaid >= (parseFloat(svc.price || 0) * parseInt(svc.quantity || 1)) ? 'paid' : (finalSvcPaid > 0 ? 'partiallyPaid' : 'unpaid')
            };
          });

          // 4. CALCULATE UNALLOCATED CREDIT
          // This is money the client paid that isn't tied to any specific service yet
          const allocatedPaid = servicesWithPayments.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
          const unallocatedCredit = Math.max(0, totalPaidFromHistory - allocatedPaid);

          // 5. DEFINE BOOKING TOTALS
          const bookingTotalValue = serviceTotalForBooking || booking.totalValue || booking.totalAmount || 0;
          const bookingPaidAmount = totalPaidFromHistory;
          
          // Add unallocated credit info to the booking object for UI
          const enrichedBooking = {
            ...booking,
            services: servicesWithPayments,
            totalValue: bookingTotalValue,
            paidAmount: bookingPaidAmount,
            unallocatedCredit: unallocatedCredit
          };

          groups[clientId].totalValue += bookingTotalValue;
          groups[clientId].paidAmount += bookingPaidAmount;
          groups[clientId].dueAmount += Math.max(0, bookingTotalValue - bookingPaidAmount);
          groups[clientId].bookings.push(enrichedBooking);
          
          if (bookingServices.length > 0) {
            servicesWithPayments.forEach((service, serviceIndex) => {
              groups[clientId].services.push({
                ...service,
                bookingId: booking.id
              });
            });
          }
          
          // Track last activity (either booking date or last payment)
          const bookingDate = booking.createdAt || booking.checkIn || new Date();
          const lastPaymentDate = booking.lastPaymentDate?.toDate?.() || booking.lastPaymentDate;
          
          if (!groups[clientId].lastActivity || 
             (bookingDate && new Date(bookingDate) > new Date(groups[clientId].lastActivity))) {
            groups[clientId].lastActivity = bookingDate;
          }
          
          if (lastPaymentDate && 
             (!groups[clientId].lastActivity || new Date(lastPaymentDate) > new Date(groups[clientId].lastActivity))) {
            groups[clientId].lastActivity = lastPaymentDate;
          }
        });
        
        // Set payment status for each client group
        Object.values(groups).forEach(group => {
          if (group.paidAmount >= group.totalValue && group.totalValue > 0) {
            group.paymentStatus = 'paid';
          } else if (group.paidAmount > 0) {
            group.paymentStatus = 'partiallyPaid';
          } else {
            group.paymentStatus = 'notPaid';
          }
          
          // Sort payment history by date (newest first)
          group.paymentHistory.sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0);
          });
          
          // Sort services by date (newest first) - FIXED: add this sorting
          group.services.sort((a, b) => {
            return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
          });
        });
        
        setClientGroups(groups);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching booking data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    // Call the function to fetch booking data
    fetchBookingsData();
    
  }, [userCompanyId, authLoading, authError, t]);
  
  // Helper function for date formatting
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'ro-RO', {
      day: '2-digit',
      month: '2-digit'
    });
  };
  
  // Helper function to format long date
  const formatLongDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Helper function to format date with day name
  const formatDateWithDay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'ro-RO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long', 
      year: 'numeric'
    });
  };
  
  // Helper function to get days left text
  const getDaysLeft = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(date);
    checkInDate.setHours(0, 0, 0, 0);
    const diffTime = checkInDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return t.today;
    } else if (diffDays === 1) {
      return t.tomorrow;
    } else if (diffDays > 1) {
      return `${t.inDays} ${diffDays} ${t.days}`;
    } else if (diffDays === -1) {
      return t.yesterday;
    } else if (diffDays < -1) {
      return `${Math.abs(diffDays)} ${t.daysAgo}`;
    } else {
      return '';
    }
  };
  
  // Helper function to generate avatar from client name
  const getClientInitials = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Show notification message
  const showNotificationMessage = (message, type = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const handleDownloadReceipt = (service) => {
    const attachment = service?.receiptAttachment;
    if (!attachment) {
      showNotificationMessage(t.noReceiptAvailable || 'No receipt attached', 'error');
      return;
    }
    if (!attachment.dataUrl) {
      showNotificationMessage(t.receiptNotStored || 'Receipt preview not stored (file too large). Please reattach.', 'error');
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = attachment.dataUrl;
      const ext = attachment.type?.includes('pdf') ? 'pdf' : 'png';
      const safeName = (attachment.name || 'receipt').replace(/[^a-z0-9._-]/gi, '_');
      link.download = safeName.endsWith(ext) ? safeName : `${safeName}.${ext}`;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Receipt download failed', err);
      showNotificationMessage(t.receiptDownloadFailed || 'Failed to download receipt', 'error');
    }
  };
  
  // Filter clients based on time and search filters
  function getFilteredClients() {
    const today = getTodayStart();
    const getBookingsForFilter = (client) =>
      (client.bookings || []).filter(
        (booking) => getBookingTimeBucket(booking, today) === timeFilter
      );
    
    return Object.values(clientGroups).filter(client => {
      const bookingsForFilter = getBookingsForFilter(client);
      if (bookingsForFilter.length === 0) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        // Check if client name matches
        const nameMatch = safeRender(client.clientName).toLowerCase().includes(query);
        // Check if any booking details match
        const bookingMatch = bookingsForFilter.some(booking =>
          (booking.accommodationType && safeRender(booking.accommodationType).toLowerCase().includes(query)) ||
          (booking.status && booking.status.toLowerCase().includes(query))
        );
        // Check if any service details match - FIXED: search in services too
        const serviceMatch = client.services.some(service =>
          (service.name && safeRender(service.name).toLowerCase().includes(query)) ||
          (service.type && service.type.toLowerCase().includes(query))
        );
        
        if (!nameMatch && !bookingMatch && !serviceMatch) return false;
      }
    
      return true;
    }).sort((a, b) => {
      // Sort by selected option
      if (sortOption === 'date') {
        // Get earliest check-in date for each client
        const getEarliestDate = (client) => {
          const bookingsForFilter = getBookingsForFilter(client);
          if (!bookingsForFilter.length) return new Date(9999, 11, 31);
          return bookingsForFilter.reduce((earliest, booking) => {
            const checkIn = normalizeDateValue(booking.checkIn);
            if (!checkIn) return earliest;
            if (!earliest || checkIn < earliest) return checkIn;
            return earliest;
          }, null) || new Date(9999, 11, 31);
        };
        const dateA = getEarliestDate(a);
        const dateB = getEarliestDate(b);
        return dateA - dateB;
      } else if (sortOption === 'client') {
        return safeRender(a.clientName).localeCompare(safeRender(b.clientName));
      } else if (sortOption === 'lastActivity') {
        const dateA = a.lastActivity ? new Date(a.lastActivity) : new Date(0);
        const dateB = b.lastActivity ? new Date(b.lastActivity) : new Date(0);
        return dateB - dateA; // Most recent first
      } else if (sortOption === 'value') {
        return b.totalValue - a.totalValue; // Highest value first
      }
      return 0;
    });
  }
  
  // Bottom sheet handling
const showBottomSheetWithContent = (content, item, secondaryItem = null) => {
  const allowedContent = ['client-details','quick-payment','edit-payment','add-service','edit-service','add-shopping'];
  if (!allowedContent.includes(content)) {
    console.warn('Attempted to open unsupported bottom sheet content:', content);
    return;
  }
  document.body.style.overflow = 'hidden';
  console.log('showBottomSheetWithContent called with:', { 
    content, 
    item: item ? { clientId: item.clientId, clientName: item.clientName } : null, 
    secondaryItem 
  });
  
  // Validate inputs
  if (!content) {
    console.error('No content type provided to showBottomSheetWithContent');
    return;
  }
  
  if (!item) {
    console.error('No item provided to showBottomSheetWithContent');
    return;
  }
  
  // Set state immediately - don't use setTimeout delays
  setBottomSheetContent(content);
  setSelectedItem(item);
  
  if (content === 'edit-payment') {
    setSelectedPayment(secondaryItem);
    setPaymentData({
      amount: secondaryItem?.amount || 0,
      method: secondaryItem?.method || 'cash',
      notes: secondaryItem?.notes || '',
      receiptNumber: secondaryItem?.receiptNumber || '',
      createdAt: secondaryItem?.date || new Date(),
      modifiedAt: new Date()
    });
  } else if (content === 'edit-service') {
    setSelectedService(secondaryItem);
  } else if (content === 'quick-payment') {
    setPaymentData({
      amount: item?.dueAmount || 0,
      method: 'cash',
      notes: '',
      receiptNumber: '',
      createdAt: new Date(),
      modifiedAt: new Date()
    });
  }
  
  // Show the modal
  setShowBottomSheet(true);
  
  console.log('Bottom sheet state updated:', { 
    content, 
    showBottomSheet: true,
    selectedItemName: item?.clientName 
  });
};

// 2. FIXED: Close function (around line 790)
const closeBottomSheet = () => {
  console.log('Closing bottom sheet');
  setShowBottomSheet(false);
  document.body.style.overflow = '';
  setTimeout(() => {
    setBottomSheetContent(null);
    setSelectedItem(null);
    setSelectedPayment(null);
    setSelectedService(null);
    setPaymentTargetService(null);
    setPaymentData({
      amount: 0,
      method: 'cash',
      notes: '',
      receiptNumber: '',
      createdAt: new Date(),
      modifiedAt: new Date()
    });
    console.log('Bottom sheet state cleared');
  }, 300);
};

// 3. FIXED: Click handlers (around line 800)
const viewClientDetails = (clientId) => {
  console.log('viewClientDetails called with clientId:', clientId);
  const client = clientGroups[clientId];
  console.log('Found client:', client);
  if (client) {
    showBottomSheetWithContent('client-details', client);
  } else {
    console.error('Client not found for ID:', clientId);
  }
};

const openPaymentModal = (client, service = null) => {
  console.log('openPaymentModal called with client:', client, 'service:', service);
  if (client) {
    setPaymentTargetService(service);
    // Pre-fill amount with service total if provided, otherwise client's due amount
    const context = getPaymentContext(client, service, client.paymentHistory || [], safeRender);
    const defaultAmount = context.due || 0;
    setPaymentData({
      amount: defaultAmount,
      method: 'cash',
      notes: '',
      receiptNumber: '',
      createdAt: new Date(),
      modifiedAt: new Date()
    });
    showBottomSheetWithContent('quick-payment', client);
  } else {
    console.error('No client provided to openPaymentModal');
  }
};

const openEditPaymentModal = (client, payment) => {
  console.log('openEditPaymentModal called with:', { client, payment });
  if (client && payment) {
    showBottomSheetWithContent('edit-payment', client, payment);
  } else {
    console.error('Missing client or payment data');
  }
};

const openAddServiceModal = (client) => {
  console.log('openAddServiceModal called with client:', client);
  if (client) {
    showBottomSheetWithContent('add-service', client);
  } else {
    console.error('No client provided to openAddServiceModal');
  }
};

const openEditServiceModal = (client, service) => {
  console.log('openEditServiceModal called with:', { client, service });
  if (client && service) {
    showBottomSheetWithContent('edit-service', client, service);
  } else {
    console.error('Missing client or service data');
  }
};

const openAddShoppingModal = (client) => {
  console.log('openAddShoppingModal called with client:', client);
  if (client) {
    showBottomSheetWithContent('add-shopping', client);
  } else {
    console.error('No client provided to openAddShoppingModal');
  }
};


// 4. FIXED: renderMainContent function (around line 1200)
const renderMainContent = (filteredClients) => {
  if (filteredClients.length === 0) {
    const emptyMessage =
      timeFilter === 'upcoming' ? t.noUpcomingBookings :
      timeFilter === 'active' ? t.noActiveBookings :
      t.noPastBookings;

    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M3 21h18M5 21V5m14 0v16"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-700 mb-2">{t.noBookingsFound}</h3>
        <p className="text-gray-500">{emptyMessage}</p>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-500">
            {t.tryChangingSearch}
          </p>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {filteredClients.map(client => (
        <ClientCard 
          key={client.clientId} 
          client={client} 
          onViewDetails={(clientId) => {
            console.log('ClientCard onViewDetails called with:', clientId);
            viewClientDetails(clientId);
          }}
          onOpenPayment={(client) => {
            console.log('ClientCard onOpenPayment called with:', client);
            openPaymentModal(client);
          }}
          onOpenService={(client) => {
            console.log('ClientCard onOpenService called with:', client);
            openAddServiceModal(client);
          }}
          onOpenShopping={(client) => {
            console.log('ClientCard onOpenShopping called with:', client);
            openAddShoppingModal(client);
          }}
        />
      ))}
    </div>
  );
};



// 6. FIXED: Bottom Sheet JSX (replace the entire bottom sheet section around line 1400)
{showBottomSheet && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
    <div 
      className="bg-white rounded-t-2xl md:rounded-xl w-full md:max-w-lg max-h-[90vh] md:max-h-[90vh] overflow-hidden animate-slide-up flex flex-col"
      ref={bottomSheetRef}
    >
      {/* Bottom Sheet Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white z-10 bottom-sheet-header">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 md:hidden"></div>
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900">
            {bottomSheetContent === 'client-details' && (t.clientDetails || 'Client Details')}
            {bottomSheetContent === 'quick-payment' && (t.addPayment || 'Add Payment')}
            {bottomSheetContent === 'edit-payment' && (t.editPayment || 'Edit Payment')}
            {bottomSheetContent === 'add-service' && (t.addService || 'Add Service')}
            {bottomSheetContent === 'edit-service' && (t.serviceDetails || 'Service Details')}
            {bottomSheetContent === 'add-shopping' && (t.addShoppingExpense || 'Add Shopping Expense')}
            {!bottomSheetContent && `Modal (Debug: content="${bottomSheetContent}")`}
          </h3>
          <button 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            onClick={closeBottomSheet}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        {/* Debug Info */}
        <div className="mt-1 text-xs text-gray-500">
          Content: {bottomSheetContent} | Item: {selectedItem?.clientName || 'None'}
        </div>
      </div>
      
      {/* Bottom Sheet Content */}
      <div className="flex-1 overflow-y-auto bg-white" style={{WebkitOverflowScrolling: 'touch'}}>
        
        {/* CLIENT DETAILS */}
        {bottomSheetContent === 'client-details' && selectedItem && (
          <div className="p-4 bg-white space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">{safeRender(selectedItem.clientName)}</h2>
              <p className="text-gray-600">{t.totalValue || 'Total'}: {selectedItem.totalValue.toLocaleString()} €</p>
              <p className="text-gray-600">{t.amountDue || 'Due'}: {selectedItem.dueAmount.toLocaleString()} €</p>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusBadgeClass(selectedItem.paymentStatus)}`}>
                {getPaymentStatusText(selectedItem.paymentStatus)}
              </div>
              <div className="mt-2">
                <button 
                  onClick={() => handleRecalculateTotals(selectedItem)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center justify-center mx-auto gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recalculate Balances
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t">
              <button 
                className="py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                onClick={() => {
                  closeBottomSheet();
                  setTimeout(() => openAddServiceModal(selectedItem), 100);
                }}
              >
                {t.addService || 'Add Service'}
              </button>
              <button 
                className={`py-3 rounded-lg font-medium ${
                  selectedItem.paymentStatus === 'paid'
                    ? 'bg-gray-200 text-gray-500'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                onClick={() => {
                  closeBottomSheet();
                  setTimeout(() => openPaymentModal(selectedItem), 100);
                }}
                disabled={selectedItem.paymentStatus === 'paid'}
              >
                {t.addPayment || 'Add Payment'}
              </button>
            </div>
          </div>
        )}
        
        {/* PAYMENT FORM */}
        {(bottomSheetContent === 'quick-payment' || bottomSheetContent === 'edit-payment') && selectedItem && (
          <div className="p-4 bg-white space-y-4">
            {(() => {
              const paymentContext = getPaymentContext(selectedItem, paymentTargetService, selectedItem.paymentHistory || [], safeRender);
              return (
                <div className="text-center border-b pb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {paymentTargetService ? (t.service || 'Service') : (t.client || 'Client')}:{' '}
                    {paymentTargetService ? safeRender(paymentTargetService.name) : safeRender(selectedItem.clientName)}
                  </h2>
                  <p className="text-red-600 font-bold text-xl">
                    {t.amountDue || 'Due'}: {paymentContext.due.toLocaleString()} €
                  </p>
                  {paymentTargetService && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700">
                      <span>{t.client || 'Client'}:</span>
                      <span className="font-medium">{safeRender(selectedItem.clientName)}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentAmount || 'Payment Amount'} *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={paymentData.amount || ''}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-3 text-gray-500 font-medium">€</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={closeBottomSheet}
                className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={() => handleQuickPayment(selectedItem, paymentData.amount)}
                disabled={!paymentData.amount || paymentData.amount <= 0}
                className="flex-2 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium"
              >
                {t.completePayment || 'Complete Payment'}
              </button>
            </div>
          </div>
        )}
        
        {/* SERVICE SELECTION */}
        {bottomSheetContent === 'add-service' && selectedItem && (
          <div className="bg-white">
            <ServiceSelectionPanel 
              onServiceAdded={handleServiceSelectionAdd}  
              onCancel={closeBottomSheet}
              userCompanyId={userCompanyId}
              t={t}
            />
          </div>
        )}

        
        {/* SHOPPING FORM */}
        {bottomSheetContent === 'add-shopping' && selectedItem && (
          <div className="bg-white">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{t.addShoppingExpense || 'Add Shopping Expense'} for {safeRender(selectedItem.clientName)}</h2>
            </div>
            <ShoppingExpenseForm
              onAddShopping={handleShoppingFormSubmit}
              onCancel={closeBottomSheet}
              userCompanyId={userCompanyId}
              t={t}
            />
          </div>
        )}

        {/* Debug fallback */}
        {!['client-details', 'quick-payment', 'edit-payment', 'add-service', 'edit-service', 'add-shopping'].includes(bottomSheetContent) && (
          <div className="p-4 bg-white">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Modal Debug</h3>
              <div className="bg-gray-100 p-3 rounded text-left text-sm">
                <p><strong>Content:</strong> "{bottomSheetContent}"</p>
                <p><strong>Item:</strong> {selectedItem ? selectedItem.clientName : 'Missing'}</p>
                <p><strong>Show:</strong> {showBottomSheet ? 'True' : 'False'}</p>
              </div>
              <button onClick={closeBottomSheet} className="px-4 py-2 bg-blue-500 text-white rounded">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
  
  // FIXED: Improved booking deletion function
  const handleDeleteBooking = async (client, booking) => {
    if (!client || !booking || !booking.id) {
      console.error("Missing client or booking data");
      return false;
    }
    
    // Show confirmation dialog with more details to prevent accidental deletion
    if (!window.confirm(`${t.deleteBookingConfirm} ${client.clientName}?\n\n${t.deleteBookingWarning}`)) {
      return false;
    }
    
    try {
      console.log("Deleting booking:", booking.id, "for company:", userCompanyId);
      
      // Verify this booking belongs to the user's company
      const bookingRef = doc(db, 'reservations', booking.id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      
      // Security check: Verify company ID
      if (bookingData.companyId !== userCompanyId) {
        throw new Error('You are not authorized to delete this booking');
      }

      // 1. Delete associated finance records first
      const financeQuery = query(
        collection(db, 'financeRecords'),
        where('bookingId', '==', booking.id)
      );
      const financeDocs = await getDocs(financeQuery);
      
      if (!financeDocs.empty) {
        console.log(`Deleting ${financeDocs.size} finance records for booking ${booking.id}`);
        const deletePromises = financeDocs.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }

      // 2. Delete the booking document from Firestore
      await deleteDoc(bookingRef);
      
      // Update local state: remove the booking from bookings array
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      
      // Update clientGroups: remove the booking from the client's bookings array
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // Remove the booking
        updatedGroup.bookings = updatedGroup.bookings.filter(b => b.id !== booking.id);
        
        // Remove services associated with this booking
        updatedGroup.services = updatedGroup.services.filter(
          service => service.bookingId !== booking.id
        );
        
        // Remove payments associated with this booking
        updatedGroup.paymentHistory = updatedGroup.paymentHistory.filter(
          payment => payment.bookingId !== booking.id
        );
        
        // If client has no more bookings, remove the client group
        if (updatedGroup.bookings.length === 0) {
          const newGroups = { ...prev };
          delete newGroups[clientId];
          return newGroups;
        }
        
        // Otherwise, recalculate totals from remaining bookings
        updatedGroup.totalValue = 0;
        updatedGroup.paidAmount = 0;
        
        updatedGroup.bookings.forEach(booking => {
          updatedGroup.totalValue += booking.totalValue || 0;
          updatedGroup.paidAmount += booking.paidAmount || 0;
        });
        
        updatedGroup.dueAmount = Math.max(0, updatedGroup.totalValue - updatedGroup.paidAmount);
        
        // Update payment status
        if (updatedGroup.paidAmount >= updatedGroup.totalValue) {
          updatedGroup.paymentStatus = 'paid';
        } else if (updatedGroup.paidAmount > 0) {
          updatedGroup.paymentStatus = 'partiallyPaid';
        } else {
          updatedGroup.paymentStatus = 'notPaid';
        }
        
        return { ...prev, [clientId]: updatedGroup };
      });
      
      // Show success notification
      showNotificationMessage(t.bookingDeletedSuccess || 'Booking successfully deleted');
      closeBottomSheet();
      return true;
    } catch (err) {
      console.error('Error deleting booking:', err);
      showNotificationMessage(`${t.error}: ${err.message}`, 'error');
      throw err;
    }
  };
  
  // FIXED: Improved service deletion function
  const handleDeleteService = async (client, service) => {
    if (!service || !client || !service.bookingId) {
      console.error("Missing client, service, or booking ID");
      return false;
    }
    
    // Show confirmation dialog
    if (!window.confirm(`${t.deleteServiceConfirm} "${service.name}"?`)) {
      return false;
    }
    
    try {
      console.log("Deleting service from booking:", service.bookingId);
      
      // Verify this booking belongs to the user's company
      const bookingRef = doc(db, 'reservations', service.bookingId);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      
      // Security check: Verify company ID
      if (bookingData.companyId !== userCompanyId) {
        throw new Error('You are not authorized to modify this booking');
      }
      
      // Find the service in services array - FIXED: better service identification
      const services = bookingData.services || [];
      let serviceIndex = -1;
      
      // First try to find by direct comparison
      if (service.id) {
        serviceIndex = services.findIndex(s => s.id === service.id);
      }
      
      // If not found by id, try to find by name + date/createdAt
      if (serviceIndex === -1) {
        serviceIndex = services.findIndex(s => {
          // Convert timestamps for comparison
          const sCreatedAt = s.createdAt?.toDate?.() ? s.createdAt.toDate() : s.createdAt;
          const serviceCreatedAt = service.createdAt instanceof Date ? service.createdAt : new Date(service.createdAt);
          
          // Match by name and creation time if available
          return s.name === service.name && 
                 ((sCreatedAt && serviceCreatedAt && 
                   Math.abs(new Date(sCreatedAt).getTime() - serviceCreatedAt.getTime()) < 1000) || 
                  (s.type === service.type && s.price === service.price && s.quantity === service.quantity));
        });
      }
      
      if (serviceIndex === -1) {
        throw new Error('Service not found in booking');
      }
      
      // Calculate the total to subtract
      const serviceTotal = services[serviceIndex].price * services[serviceIndex].quantity;
      
      // Remove the service from array
      services.splice(serviceIndex, 1);
      
      // Calculate new booking total
      const currentTotal = bookingData.totalValue || 0;
      const newBookingTotal = Math.max(0, currentTotal - serviceTotal);
      
      // Update booking in Firestore
      await updateDoc(bookingRef, {
        services,
        totalValue: newBookingTotal,
        updatedAt: serverTimestamp()
      });
      
      console.log("Service deleted successfully, updating local state");
      
      // Update local state
      setBookings(prev => {
        return prev.map(booking => {
          if (booking.id === service.bookingId) {
            // Remove the service from this booking
            const updatedServices = (booking.services || []).filter((s, idx) => idx !== serviceIndex);
            
            return {
              ...booking,
              services: updatedServices,
              totalValue: Math.max(0, booking.totalValue - serviceTotal)
            };
          }
          return booking;
        });
      });
      
      // Update client groups
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // Update the booking
        updatedGroup.bookings = updatedGroup.bookings.map(b => {
          if (b.id === service.bookingId) {
            // Create updated services array
            const updatedBookingServices = Array.isArray(b.services) 
              ? b.services.filter((s, idx) => !(s.name === service.name && 
                                              s.price === service.price &&
                                              s.quantity === service.quantity))
              : [];
              
            return {
              ...b,
              services: updatedBookingServices,
              totalValue: Math.max(0, b.totalValue - serviceTotal)
            };
          }
          return b;
        });
        
        // Remove the service from client's services array - FIXED: better service identification
        updatedGroup.services = updatedGroup.services.filter(s => {
          if (s.bookingId !== service.bookingId) return true;
          if (s.id && s.id === service.id) return false;
          
          const sCreatedAt = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt);
          const serviceCreatedAt = service.createdAt instanceof Date ? service.createdAt : new Date(service.createdAt);
          
          // Keep if it's not the service we're deleting
          return !(s.name === service.name && 
                  Math.abs(sCreatedAt.getTime() - serviceCreatedAt.getTime()) < 1000);
        });
        
        // Update client totals
        const totalValue = Math.max(0, updatedGroup.totalValue - serviceTotal);
        updatedGroup.totalValue = totalValue;
        updatedGroup.dueAmount = Math.max(0, totalValue - updatedGroup.paidAmount);
        
        // Update client payment status
        if (updatedGroup.paidAmount >= totalValue) {
          updatedGroup.paymentStatus = 'paid';
        } else if (updatedGroup.paidAmount > 0) {
          updatedGroup.paymentStatus = 'partiallyPaid';
        } else {
          updatedGroup.paymentStatus = 'notPaid';
        }
        
        return { ...prev, [clientId]: updatedGroup };
      });
      
      showNotificationMessage(t.serviceDeletedSuccess || 'Service deleted successfully');
      closeBottomSheet();
      return true;
    } catch (err) {
      console.error('Error deleting service:', err);
      showNotificationMessage(t.serviceDeleteFailed || 'Service deletion failed: ' + err.message, 'error');
      return false;
    }
  };
  
  // FIXED: Enhanced shopping expense handler - fixed total calculation
  const handleAddShoppingExpense = async (client, shoppingExpense) => {
    if (!client || !shoppingExpense) {
      console.error("Missing client or shopping data");
      return false;
    }
    
    // Find the most recent booking
    let targetBooking = null;
    if (client.bookings.length > 0) {
      targetBooking = [...client.bookings].sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      })[0];
    } else {
      showNotificationMessage(t.noBookingFound || "No booking found for this client", "error");
      return false;
    }
    
    try {
      console.log("Adding shopping expense to booking:", targetBooking.id);
      
      // Verify this booking belongs to the user's company
      const bookingRef = doc(db, 'reservations', targetBooking.id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error(t.bookingNotFound || 'Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      
      // Security check: Verify company ID
      if (bookingData.companyId !== userCompanyId) {
        throw new Error(t.notAuthorizedToModify || 'You are not authorized to modify this booking');
      }
      
      // Calculate total values - FIXED: preserve paid amounts
      const currentTotal = bookingData.totalValue || 0;
      const newTotal = currentTotal + shoppingExpense.totalValue;
      const paidAmount = bookingData.paidAmount || 0; // Preserve paid amount
      
      // Create a services array if it doesn't exist
      const services = Array.isArray(bookingData.services) ? [...bookingData.services] : [];
      
      // Add the shopping expense to services array with regular Date instead of serverTimestamp
      const currentDate = new Date();
      const sanitizedReceipt = shoppingExpense.receiptAttachment ? {
        name: shoppingExpense.receiptAttachment.name || 'receipt',
        type: shoppingExpense.receiptAttachment.type || 'image',
        size: shoppingExpense.receiptAttachment.size || 0,
        dataUrl: shoppingExpense.receiptAttachment.dataUrl && shoppingExpense.receiptAttachment.dataUrl.length > 0
          ? shoppingExpense.receiptAttachment.dataUrl.slice(0, MAX_INLINE_RECEIPT_LENGTH)
          : null,
        truncated: shoppingExpense.receiptAttachment.truncated || false
      } : null;
      
      // Create service object WITHOUT serverTimestamp - add a unique ID
      const newService = {
        ...shoppingExpense,
        receiptAttachment: sanitizedReceipt,
        id: 'shopping_' + Date.now(), // Add a unique ID
        createdAt: currentDate
      };
      
      services.push(newService);
      
      // Update the booking in Firestore - only use serverTimestamp for top-level fields
      await updateDoc(bookingRef, {
        services: services,
        totalValue: newTotal,
        totalAmount: newTotal, // keep legacy field in sync so reloads calculate correctly
        // KEEP paidAmount unchanged
        updatedAt: serverTimestamp()
      });
      
      // Update local state - FIXED: preserve paid amount in bookings state
      setBookings(prev => {
        return prev.map(booking => {
          if (booking.id === targetBooking.id) {
            // Create updated services array including the new shopping expense
            const updatedServices = Array.isArray(booking.services) 
              ? [...booking.services, newService]
              : [newService];
              
            return {
              ...booking,
              services: updatedServices,
              totalValue: newTotal,
              totalAmount: newTotal,
              // Maintain the existing paidAmount
              paidAmount: booking.paidAmount || 0
            };
          }
          return booking;
        });
      });
      
      // Update client groups - FIXED: preserve paid amounts in client state
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // Update the booking
        updatedGroup.bookings = updatedGroup.bookings.map(b => {
          if (b.id === targetBooking.id) {
            return {
              ...b,
              services: Array.isArray(b.services) ? [...b.services, newService] : [newService],
              totalValue: newTotal,
              // Maintain paid amount
              paidAmount: b.paidAmount || 0
            };
          }
          return b;
        });
        
        // Add the service to client's services array
        updatedGroup.services = [...updatedGroup.services, {
          ...newService,
          bookingId: targetBooking.id
        }];
        
        // Update client totals - FIXED: preserve paid amount
        const oldTotalValue = updatedGroup.totalValue;
        updatedGroup.totalValue += shoppingExpense.totalValue;
        
        // Keep paidAmount the same
        const paidAmount = updatedGroup.paidAmount;
        updatedGroup.dueAmount = Math.max(0, updatedGroup.totalValue - paidAmount);
        
        // Update client payment status
        if (paidAmount >= updatedGroup.totalValue) {
          updatedGroup.paymentStatus = 'paid';
        } else if (paidAmount > 0) {
          updatedGroup.paymentStatus = 'partiallyPaid';
        } else {
          updatedGroup.paymentStatus = 'notPaid';
        }
        
        // Update last activity timestamp
        updatedGroup.lastActivity = new Date();
        
        return { ...prev, [clientId]: updatedGroup };
      });

      // Keep selected item (open modal) in sync so progress bar reflects new total
      setSelectedItem(prev => {
        if (!prev || prev.clientId !== client.clientId) return prev;
        const paidAmountSafe = prev.paidAmount || 0;
        const updatedTotal = (prev.totalValue || 0) + shoppingExpense.totalValue;
        const updatedDue = Math.max(0, updatedTotal - paidAmountSafe);
        const nextPaymentStatus = paidAmountSafe >= updatedTotal
          ? 'paid'
          : paidAmountSafe > 0
            ? 'partiallyPaid'
            : 'notPaid';

        return {
          ...prev,
          services: [...(prev.services || []), { ...newService, bookingId: targetBooking.id }],
          totalValue: updatedTotal,
          dueAmount: updatedDue,
          paymentStatus: nextPaymentStatus
        };
      });
      
      console.log('Successfully added shopping expense to booking:', targetBooking.id);
      showNotificationMessage(t.shoppingExpenseSuccess || "Shopping expense added successfully");
      return true;
    } catch (err) {
      console.error('Error adding shopping expense:', err);
      showNotificationMessage(t.failedAddShopping || "Error adding shopping expense: " + err.message, "error");
      return false;
    }
  };
  
  // FIXED: Enhanced service adding function with preserved paid amounts
  const handleQuickServiceAdd = async (client, serviceData) => {
    if (!client || !serviceData) {
      console.error("Missing client or service data");
      return false;
    }
    
    // Find the most recent booking
    let targetBooking = null;
    if (client.bookings.length > 0) {
      targetBooking = [...client.bookings].sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      })[0];
    } else {
      showNotificationMessage(t.noBookingFound || "No booking found for this client", "error");
      return false;
    }
    
    try {
      console.log("Adding service to booking:", targetBooking.id);
      
      // Verify this booking belongs to the user's company
      const bookingRef = doc(db, 'reservations', targetBooking.id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error(t.bookingNotFound || 'Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      
      // Security check: Verify company ID
      if (bookingData.companyId !== userCompanyId) {
        throw new Error(t.notAuthorizedToModify || 'You are not authorized to modify this booking');
      }
      
      // Prepare the service data with computed values - use Date instead of serverTimestamp
      const currentDate = new Date();
      const preparedService = {
        ...serviceData,
        id: serviceData.type + '_' + Date.now(), // Add a unique ID
        createdAt: currentDate,
        companyId: userCompanyId,
        status: serviceData.status || 'confirmed',
        totalValue: parseFloat(serviceData.price) * parseInt(serviceData.quantity),
        // EXPLICITLY preserve payment tracking fields
        paymentStatus: serviceData.paymentStatus || 'unpaid',
        amountPaid: serviceData.amountPaid || 0
      };
      
      // Calculate total values for the booking
      const currentTotal = bookingData.totalValue || 0;
      const newTotal = currentTotal + preparedService.totalValue;
      const currentPaidAmount = bookingData.paidAmount || 0;
      
      // Add the service's paid amount to booking's total paid
      const servicePaidAmount = preparedService.amountPaid || 0;
      const newPaidAmount = currentPaidAmount + servicePaidAmount;
      
      // Calculate new payment status for the booking
      let newPaymentStatus;
      if (newPaidAmount >= newTotal) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partiallyPaid';
      } else {
        newPaymentStatus = 'notPaid';
      }
      
      // Create a services array if it doesn't exist
      const services = Array.isArray(bookingData.services) ? [...bookingData.services] : [];
      
      // Add the service to services array
      services.push(preparedService);
      
      // Update the booking in Firestore - UPDATE paidAmount and paymentStatus
      await updateDoc(bookingRef, {
        services: services,
        totalValue: newTotal,
        totalAmount: newTotal,
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state with new paid amount
      setBookings(prev => {
        return prev.map(booking => {
          if (booking.id === targetBooking.id) {
            // Create updated services array including the new service
            const updatedServices = Array.isArray(booking.services) 
              ? [...booking.services, preparedService]
              : [preparedService];
              
            return {
              ...booking,
              services: updatedServices,
              totalValue: newTotal,
              totalAmount: newTotal,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus
            };
          }
          return booking;
        });
      });
      
      // Update client groups with STRICT recalculation
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // 1. Update the booking with new service
        updatedGroup.bookings = updatedGroup.bookings.map(b => {
          if (b.id === targetBooking.id) {
            const updatedServices = Array.isArray(b.services) ? [...b.services, preparedService] : [preparedService];
            
            // STRICT RECALCULATION for the booking
            let bookingTotal = 0;
            let bookingPaid = 0;
            
            updatedServices.forEach(s => {
              bookingTotal += (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
              if (s.paymentStatus === 'paid') {
                bookingPaid += (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
              } else if (s.paymentStatus === 'partiallyPaid') {
                bookingPaid += parseFloat(s.amountPaid || 0);
              }
            });
            
            let bookingStatus = 'notPaid';
            if (bookingPaid >= bookingTotal) bookingStatus = 'paid';
            else if (bookingPaid > 0) bookingStatus = 'partiallyPaid';

            return {
              ...b,
              services: updatedServices,
              totalValue: bookingTotal,
              totalAmount: bookingTotal,
              paidAmount: bookingPaid,
              paymentStatus: bookingStatus
            };
          }
          return b;
        });
        
        // 2. Update client's global services array
        updatedGroup.services = [...updatedGroup.services, {
          ...preparedService,
          bookingId: targetBooking.id
        }];
        
        // 3. STRICT GLOBAL RECALCULATION for the client group
        // This is vital to fix the 15,630 / 15,395 error
        let totalVal = 0;
        let totalPaid = 0;
        
        updatedGroup.bookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        updatedGroup.totalValue = totalVal;
        updatedGroup.paidAmount = totalPaid;
        updatedGroup.dueAmount = Math.max(0, totalVal - totalPaid);
        
        // Update client payment status
        if (totalPaid >= totalVal) {
          updatedGroup.paymentStatus = 'paid';
        } else if (totalPaid > 0) {
          updatedGroup.paymentStatus = 'partiallyPaid';
        } else {
          updatedGroup.paymentStatus = 'notPaid';
        }
        
        // Update last activity timestamp
        updatedGroup.lastActivity = new Date();
        
        return { ...prev, [clientId]: updatedGroup };
      });

      // Keep selected item (open modal) in sync so progress bar reflects new total
      setSelectedItem(prev => {
        if (!prev || prev.clientId !== client.clientId) return prev;
        const paidAmountSafe = prev.paidAmount || 0;
        const updatedTotal = (prev.totalValue || 0) + preparedService.totalValue;
        const updatedDue = Math.max(0, updatedTotal - paidAmountSafe);
        const nextPaymentStatus = paidAmountSafe >= updatedTotal
          ? 'paid'
          : paidAmountSafe > 0
            ? 'partiallyPaid'
            : 'notPaid';

        return {
          ...prev,
          services: [...(prev.services || []), { ...preparedService, bookingId: targetBooking.id }],
          totalValue: updatedTotal,
          dueAmount: updatedDue,
          paymentStatus: nextPaymentStatus
        };
      });
      
      console.log('Successfully added service to booking:', targetBooking.id);
      showNotificationMessage(t.serviceAddedSuccess || "Service added successfully");
      return true;
    } catch (err) {
      console.error('Error adding service:', err);
      showNotificationMessage(t.failedAddService || "Error adding service: " + err.message, "error");
      return false;
    }
  };
  
  // Handle add service from selection panel
 async function handleServiceSelectionAdd(service) {
  if (!selectedItem) {
    showNotificationMessage(t.noClientSelected || 'No client selected', 'error');
    return;
  }
  
  try {
    // Call the enhanced service add function
    const success = await handleQuickServiceAdd(selectedItem, service);
    
    if (success) {
      showNotificationMessage(t.serviceAddedSuccess || 'Service added successfully');
      closeBottomSheet();
    }
  } catch (err) {
    console.error('Error adding service:', err);
    showNotificationMessage(err.message || t.failedAddService || 'Failed to add service', 'error');
  }
}

  
  // Handle add shopping expense from form
async function handleShoppingFormSubmit(shoppingExpense) {
  if (!selectedItem) {
    showNotificationMessage(t.noClientSelected || 'No client selected', 'error');
    return;
  }
  
  try {
    // Call the enhanced shopping expense add function
    const success = await handleAddShoppingExpense(selectedItem, shoppingExpense);
    
    if (success) {
      showNotificationMessage(t.shoppingExpenseSuccess || 'Shopping expense added successfully');
      closeBottomSheet();
    }
  } catch (err) {
    console.error('Error adding shopping expense:', err);
    showNotificationMessage(err.message || t.failedAddShopping || 'Failed to add shopping expense', 'error');
  }
}

  
  // PAYMENT HANDLING
  const handleQuickPayment = async (client, amount, targetServiceOverride = null, overrides = {}) => {
    if (!amount || amount <= 0 || !client) return;
    // Find the booking to update
    const targetBooking = client.bookings[0]; // Usually update the first booking
    if (!targetBooking) return;
    
    try {
      // First, verify this booking belongs to the user's company
      const bookingRef = doc(db, 'reservations', targetBooking.id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error(t.bookingNotFound || 'Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      
      // Security check: Verify company ID
      if (bookingData.companyId !== userCompanyId) {
        throw new Error(t.notAuthorizedToModify || 'You are not authorized to modify this booking');
      }
      
      const targetService = targetServiceOverride || paymentTargetService;
      const now = new Date();
      const payment = {
        id: uuidv4(),
        amount,
        method: overrides.method ?? paymentData.method,
        notes: overrides.notes ?? paymentData.notes,
        receiptNumber: overrides.receiptNumber ?? paymentData.receiptNumber,
        serviceId: targetService?.id || null,
        serviceName: targetService ? safeRender(targetService.name || targetService) : null,
        bookingId: targetBooking.id,
        date: now,
        createdAt: now,
        createdBy: auth.currentUser?.uid || 'unknown',
        companyId: userCompanyId // Add company ID to payment record
      };
      
      const currentPaid = bookingData.paidAmount || 0;
      const newPaidAmount = currentPaid + amount;
      const bookingTotal = bookingData.totalValue || 0;
      
      // Determine new payment status
      let newPaymentStatus = 'notPaid';
      if (newPaidAmount >= bookingTotal) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partiallyPaid';
      }
      
      // Add payment to history if it exists
      const paymentHistory = bookingData.paymentHistory || [];
      paymentHistory.push(payment);
      
      // 3. Update Firestore
      const updatedServices = (bookingData.services || []).map(s => {
        if (targetService && s.id === targetService.id) {
          const currentServicePaid = parseFloat(s.amountPaid || 0);
          const nextServicePaid = currentServicePaid + amount;
          const serviceTotal = parseFloat(s.price || 0) * parseInt(s.quantity || 1);
          
          let nextServiceStatus = 'unpaid';
          if (nextServicePaid >= serviceTotal) nextServiceStatus = 'paid';
          else if (nextServicePaid > 0) nextServiceStatus = 'partiallyPaid';
          
          return {
            ...s,
            amountPaid: nextServicePaid,
            paymentStatus: nextServiceStatus
          };
        }
        return s;
      });

      await updateDoc(bookingRef, {
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
        lastPaymentDate: serverTimestamp(),
        lastPaymentMethod: payment.method,
        paymentHistory,
        services: updatedServices
      });
      
      // Update local state
      setBookings(prev => {
        return prev.map(booking => {
          if (booking.id === targetBooking.id) {
            return {
              ...booking,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus,
              lastPaymentDate: new Date(),
              lastPaymentMethod: payment.method,
              paymentHistory: [...(booking.paymentHistory || []), payment],
              services: updatedServices
            };
          }
          return booking;
        });
      });
      
      // Update client groups
      setClientGroups(prev => {
        const clientId = targetBooking.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        updatedGroup.bookings = updatedGroup.bookings.map(b => {
          if (b.id === targetBooking.id) {
            return {
              ...b,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus,
              lastPaymentDate: new Date(),
              lastPaymentMethod: payment.method,
              services: updatedServices
            };
          }
          return b;
        });
        
        // STRICT GLOBAL RECALCULATION for the client group
        // This fixes the "paidAmount > totalValue" error by resetting everything to actual sums
        let totalVal = 0;
        let totalPaid = 0;
        
        updatedGroup.bookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        updatedGroup.totalValue = totalVal;
        updatedGroup.paidAmount = totalPaid;
        updatedGroup.dueAmount = Math.max(0, totalVal - totalPaid);
        
        if (totalPaid >= totalVal) {
          updatedGroup.paymentStatus = 'paid';
        } else if (totalPaid > 0) {
          updatedGroup.paymentStatus = 'partiallyPaid';
        } else {
          updatedGroup.paymentStatus = 'notPaid';
        }
        
        // Add payment to client's payment history
        updatedGroup.paymentHistory = [
          {
            ...payment,
            bookingId: targetBooking.id
          },
          ...updatedGroup.paymentHistory
        ];
        
        // Update last activity
        updatedGroup.lastActivity = new Date();
        
        return { ...prev, [clientId]: updatedGroup };
      });

      // Keep selected client (modal + progress bar) in sync with the payment
      setSelectedItem(prev => {
        if (!prev || prev.clientId !== targetBooking.clientId) return prev;
        const updatedPaid = (prev.paidAmount || 0) + payment.amount;
        const updatedDue = Math.max(0, (prev.totalValue || 0) - updatedPaid);
        const updatedStatus = updatedPaid >= (prev.totalValue || 0)
          ? 'paid'
          : updatedPaid > 0
            ? 'partiallyPaid'
            : 'notPaid';
        return {
          ...prev,
          paidAmount: updatedPaid,
          dueAmount: updatedDue,
          paymentStatus: updatedStatus,
          lastPaymentDate: new Date(),
          paymentHistory: [{ ...payment, bookingId: targetBooking.id }, ...(prev.paymentHistory || [])]
        };
      });
      
      showNotificationMessage(t.paymentSuccess || 'Payment processed successfully');
      closeBottomSheet();
    } catch (err) {
      console.error('Error processing quick payment:', err);
      showNotificationMessage(t.paymentFailed || 'Payment update failed: ' + err.message, 'error');
    }
  };
   

    

  // Render main content based on loaded data
 
  
  // Auth error state
  if (authError) {
    return (
      <div className="bookings-page">
        <section className="booking-hero page-surface">
          <div className="booking-hero__top">
            <div>
              <h1>{t.bookingManager}</h1>
              <p className="booking-hero__subtitle">{t.authError}</p>
            </div>
          </div>
          <div className="booking-alert booking-alert--error">
            <p>{safeRender(authError)}</p>
            <button 
              className="pill"
              onClick={() => auth.signOut().then(() => navigate('/login'))}
            >
              {t.signOut}
            </button>
          </div>
        </section>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="bookings-page">
        <section className="booking-hero page-surface booking-hero--loading">
          <div className="booking-hero__top">
            <div>
              <h1>{t.bookingManager}</h1>
            </div>
          </div>
          <div className="booking-loading">
            <div className="booking-loading__spinner" />
            <p>{t.loading}</p>
          </div>
        </section>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bookings-page">
        <section className="booking-hero page-surface">
          <div className="booking-hero__top">
            <div>
              <h1>{t.bookingManager}</h1>
              <p className="booking-hero__subtitle">{t.error}</p>
            </div>
          </div>
          <div className="booking-alert booking-alert--error">
            <p>{t.errorLoading} {safeRender(error)}</p>
          </div>
        </section>
      </div>
    );
  }
  
  // Main component render
  return (
    <div className="bookings-page">
      <section className="page-surface booking-headline">
        <div className="booking-headline__titleRow">
          <div>
            <h1 className="booking-headline__title">{t.bookingManager}</h1>
            {todayLabel && (
              <span className="booking-headline__muted">{todayLabel}</span>
            )}
          </div>
        </div>

        <div className="booking-filters__row mt-6">
          <label className="booking-field">
            <span>{t.search}</span>
            <div className="booking-search">
              <svg className="booking-search__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                placeholder={t.search}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </label>
          <label className="booking-field booking-field--small">
            <span>{t.sortBy}</span>
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
              <option value="date">{t.sortByDate}</option>
              <option value="client">{t.sortByClientName}</option>
              <option value="lastActivity">{t.sortByRecentActivity}</option>
              <option value="totalValue">{t.sortByValue}</option>
            </select>
          </label>
        </div>

        <div className="booking-filter-tabs mt-4">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              className={`booking-tab ${timeFilter === tab.id ? 'booking-tab--active' : ''}`}
              onClick={() => setTimeFilter(tab.id)}
            >
              <span className="booking-tab__icon">{renderTabIcon(tab.icon)}</span>
              <div>
                <p>{tab.label}</p>
                <small>{tab.count} {t.bookings}</small>
              </div>
            </button>
          ))}
        </div>

        <div className="booking-filters__info">
          <span>{t.found} <strong>{visibleBookingCount}</strong> {t.bookings}</span>
          <span className="text-sm text-gray-500">({filteredClients.length} {t.clients})</span>
          {searchQuery && <span>{t.matching} "{searchQuery}"</span>}
        </div>
      </section>

      <div id={bookingListAnchorId} className="booking-results page-surface">
        {renderMainContent(filteredClients)}
      </div>

      {(quickUpcoming.length > 0 || quickPast.length > 0) && (
        <section className="booking-hero page-surface" style={{ marginTop: '1.5rem' }}>
          <div className="booking-hero__top">
            <div>
              <h2>{t.atAGlance || 'At a glance'}</h2>
              <p className="booking-hero__subtitle">{t.quickInsights || 'Fast overview of arrivals and departures.'}</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {renderQuickBookingPanel(t.upcomingHighlight, t.noUpcomingBookings, quickUpcoming, 'upcoming')}
            {renderQuickBookingPanel(t.pastHighlight, t.noPastBookings, quickPast, 'past')}
          </div>
        </section>
      )}

      {/* Bottom Sheet with Enhanced Content */}
    {showBottomSheet && (
  <BottomSheetPortal>
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
    <div 
      className="bg-white rounded-t-2xl md:rounded-xl w-full md:max-w-lg max-h-[90vh] md:max-h-[90vh] overflow-hidden animate-slide-up flex flex-col"
      ref={bottomSheetRef}
    >
      {/* Bottom Sheet Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white z-10 bottom-sheet-header">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 md:hidden"></div>
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900">
            {bottomSheetContent === 'client-details' && (t.clientDetails || 'Client Details')}
            {bottomSheetContent === 'quick-payment' && (t.addPayment || 'Add Payment')}
            {bottomSheetContent === 'edit-payment' && (t.editPayment || 'Edit Payment')}
            {bottomSheetContent === 'add-service' && (t.addService || 'Add Service')}
            {bottomSheetContent === 'edit-service' && (t.serviceDetails || 'Service Details')}
            {bottomSheetContent === 'add-shopping' && (t.addShoppingExpense || 'Add Shopping Expense')}
          </h3>
          <button 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            onClick={closeBottomSheet}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Bottom Sheet Content */}
      <div className="flex-1 overflow-y-auto bg-white" style={{WebkitOverflowScrolling: 'touch'}}>
        
        {/* CLIENT DETAILS */}
        {bottomSheetContent === 'client-details' && selectedItem && (
          <div className="p-4 bg-white space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">{safeRender(selectedItem.clientName)}</h2>
              <p className="text-gray-600">{t.totalValue || 'Total'}: {selectedItem.totalValue.toLocaleString()} €</p>
              <p className="text-gray-600">{t.amountDue || 'Due'}: {selectedItem.dueAmount.toLocaleString()} €</p>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusBadgeClass(selectedItem.paymentStatus)}`}>
                {getPaymentStatusText(selectedItem.paymentStatus)}
              </div>
              <div className="mt-2">
                <button 
                  onClick={() => handleRecalculateTotals(selectedItem)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center justify-center mx-auto gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recalculate Balances
                </button>
              </div>
            </div>
            
            {/* Bookings Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">{t.bookings || 'Bookings'} ({selectedItem.bookings.length})</h3>
              {selectedItem.bookings.map((booking, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{safeRender(booking.accommodationType)}</p>
                      <p className="text-sm text-gray-600">{formatShortDate(booking.checkIn)} - {formatShortDate(booking.checkOut)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{(booking.totalValue || 0).toLocaleString()} €</p>
                      <div className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </div>
                    </div>
                  </div>
                  
                  {/* UNALLOCATED CREDIT DISPLAY */}
                  {booking.unallocatedCredit > 0 && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs flex justify-between items-center">
                      <span className="text-emerald-700 font-medium">Unallocated Balance (Credit):</span>
                      <span className="text-emerald-800 font-bold">{booking.unallocatedCredit.toLocaleString()} €</span>
                    </div>
                  )}

                  <button 
                    className="w-full py-1 px-2 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 mt-2"
                    onClick={() => handleDeleteBooking(selectedItem, booking)}
                  >
                    {t.deleteBooking || 'Delete Booking'}
                  </button>
                </div>
              ))}
            </div>

            {/* Services Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">{t.servicesAndExtras || 'Services & Extras'} ({selectedItem.services.length})</h3>
              {selectedItem.services.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">{t.noAdditionalServices || 'No additional services'}</p>
                </div>
              ) : (
                selectedItem.services.map((service, idx) => {
                  const ctx = getPaymentContext(selectedItem, service, selectedItem.paymentHistory || [], safeRender);
                  const isPaidOut = ctx.due <= 0;
                  return (
                  <div 
                    key={idx} 
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    {(() => {
                      const { total, paid, due } = getServicePaymentInfo(service, selectedItem.paymentHistory || [], safeRender);
                      const status =
                        due <= 0 ? 'paid' :
                        paid > 0 ? 'partial' : 'unpaid';
                      const statusStyles = status === 'paid'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-red-100 text-red-800 border-red-200';
                      const statusLabel = status === 'paid'
                        ? (t.paid || 'Paid')
                        : status === 'partial'
                          ? (t.partiallyPaid || 'Partially Paid')
                          : (t.notPaid || 'Not Paid');
                      return (
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{safeRender(service.name)}</p>
                            <p className="text-sm text-gray-600">{formatShortDate(service.date)}</p>
                          </div>
                          <div className="text-right space-y-2">
                            <p className="font-semibold text-gray-900">{total.toLocaleString()} €</p>
                            <div className={`inline-block px-2 py-0.5 rounded-full text-xs border ${statusStyles}`}>
                              {statusLabel}
                            </div>
                            <p className="text-xs text-green-700">{t.paid || 'Paid'}: {paid.toLocaleString()} €</p>
                            <p className={`text-xs ${due <= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {t.amountDue || 'Due'}: {due.toLocaleString()} €
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      {service.receiptAttachment && (
                        <div className="flex items-center gap-2 text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded px-2 py-1">
                          <span className="font-medium">{t.receipt || 'Receipt'}:</span>
                          <span className="truncate max-w-[140px]" title={service.receiptAttachment.name || 'receipt'}>
                            {service.receiptAttachment.name || 'receipt'}
                          </span>
                          {service.receiptAttachment.dataUrl ? (
                            <button
                              className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700 hover:bg-blue-100"
                              onClick={() => handleDownloadReceipt(service)}
                            >
                              {t.download || 'Download'}
                            </button>
                          ) : (
                            <span className="text-red-600 text-[11px]">
                              {t.receiptNotStored || 'Not stored (too large)'}
                            </span>
                          )}
                          {service.receiptAttachment.truncated && service.receiptAttachment.dataUrl && (
                            <span className="text-amber-600 text-[11px]">
                              {t.receiptTruncated || 'Preview truncated due to size'}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {t.paymentStatus || 'Payment Status'}
                      </div>
                      <div className="flex gap-2 mt-3 w-full">
                        <button
                          className="flex-1 py-2 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:border-gray-300"
                          onClick={() => openEditServiceModal(selectedItem, service)}
                        >
                          {t.editService || 'Edit Service'}
                        </button>
                        <button
                          className={`flex-1 py-2 border rounded text-sm ${
                            isPaidOut
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                          }`}
                          onClick={() => openPaymentModal(selectedItem, service)}
                          disabled={isPaidOut}
                        >
                          {t.addPayment || 'Add Payment'}
                        </button>
                        {!isPaidOut && (
                          <button
                            className="flex-1 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 hover:bg-blue-100"
                            onClick={() => {
                              if (ctx.due > 0) {
                                handleQuickPayment(selectedItem, ctx.due, service, { method: 'cash' });
                              }
                            }}
                          >
                            {t.markPaid || 'Mark Paid'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })
              )}
            </div>

            {/* Payment History Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">{t.paymentHistory || 'Payment History'} ({selectedItem.paymentHistory.length})</h3>
              {selectedItem.paymentHistory.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">{t.noPaymentsRecorded || 'No payments recorded'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItem.paymentHistory.map((payment, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{(payment.amount || 0).toLocaleString()} €</p>
                          <p className="text-sm text-gray-600">{formatLongDate(payment.date)}</p>
                          {payment.serviceName && (
                            <p className="text-xs text-blue-600 mt-1">{safeRender(payment.serviceName)}</p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">{payment.method}</span>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-green-50 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">{t.paymentsTotal || 'Total Payments'}:</span>
                      <span className="font-bold text-green-800">{selectedItem.paidAmount.toLocaleString()} €</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t">
              <button 
                className="py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                onClick={() => {
                  closeBottomSheet();
                  setTimeout(() => openAddServiceModal(selectedItem), 300);
                }}
              >
                {t.addService || 'Add Service'}
              </button>
              <button 
                className={`py-3 rounded-lg font-medium ${
                  selectedItem.paymentStatus === 'paid'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                onClick={() => {
                  if (selectedItem.paymentStatus !== 'paid') {
                    closeBottomSheet();
                    setTimeout(() => openPaymentModal(selectedItem), 300);
                  }
                }}
                disabled={selectedItem.paymentStatus === 'paid'}
              >
                {selectedItem.paymentStatus === 'paid' ? t.paid : (t.addPayment || 'Add Payment')}
              </button>
            </div>
          </div>
        )}
        
        {/* PAYMENT FORM */}
        {(bottomSheetContent === 'quick-payment' || bottomSheetContent === 'edit-payment') && selectedItem && (
          <div className="p-4 bg-white space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t.client || 'Client'}: {safeRender(selectedItem.clientName)}</h2>
              <p className="text-red-600 font-bold text-xl">{t.amountDue || 'Due'}: {selectedItem.dueAmount.toLocaleString()} €</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentAmount || 'Payment Amount'} *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={paymentData.amount || ''}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-3 text-gray-500 font-medium">€</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const ctx = getPaymentContext(selectedItem, paymentTargetService, selectedItem.paymentHistory || [], safeRender);
                    setPaymentData({...paymentData, amount: ctx.due});
                  }}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  {t.fullAmount || 'Full Amount'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ctx = getPaymentContext(selectedItem, paymentTargetService, selectedItem.paymentHistory || [], safeRender);
                    setPaymentData({...paymentData, amount: Math.round(ctx.due / 2)});
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  {t.half || 'Half'}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentMethod || 'Payment Method'} *</label>
              <div className="grid grid-cols-2 gap-2">
                {['cash', 'card', 'bankTransfer', 'crypto'].map((method) => (
                  <button 
                    key={method}
                    type="button" 
                    onClick={() => setPaymentData({...paymentData, method})}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      paymentData.method === method 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {method === 'cash' ? (t.cash || 'Cash') : 
                       method === 'card' ? (t.card || 'Card') : 
                       method === 'bankTransfer' ? (t.transfer || 'Transfer') : 
                       (t.crypto || 'Crypto')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.receiptNumber || 'Receipt Number'} ({t.optional || 'optional'})</label>
              <input
                type="text"
                value={paymentData.receiptNumber || ''}
                onChange={(e) => setPaymentData({...paymentData, receiptNumber: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder={t.enterReceiptNumber || 'Enter receipt number if available'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.notes || 'Notes'} ({t.optional || 'optional'})</label>
              <textarea
                value={paymentData.notes || ''}
                onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                rows={3}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 resize-none"
                placeholder={t.addPaymentDetails || 'Add payment details or reference'}
              ></textarea>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={closeBottomSheet}
                className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={() => handleQuickPayment(selectedItem, paymentData.amount)}
                disabled={!paymentData.amount || paymentData.amount <= 0}
                className="flex-2 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                {t.completePayment || 'Complete Payment'}
              </button>
            </div>
          </div>
        )}
        
        {/* SERVICE SELECTION */}
        {bottomSheetContent === 'add-service' && selectedItem && (
          <div className="bg-white">
            <ServiceSelectionPanel 
              onServiceAdded={handleServiceSelectionAdd}
              onCancel={closeBottomSheet}
              userCompanyId={userCompanyId}
              t={t}
            />
          </div>
        )}
        
        {/* SERVICE DETAILS */}
        {bottomSheetContent === 'edit-service' && selectedItem && selectedService && (
          <div className="p-4 bg-white space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900">{safeRender(selectedService.name)}</h2>
              <p className="text-xl font-bold text-gray-900">{((selectedService.price || 0) * (selectedService.quantity || 1)).toLocaleString()} €</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm"><span className="text-gray-500">{t.date || 'Date'}:</span> <span className="text-gray-900">{formatShortDate(selectedService.date)}</span></p>
              <p className="text-sm"><span className="text-gray-500">{t.quantity || 'Quantity'}:</span> <span className="text-gray-900">{selectedService.quantity} × {(selectedService.price || 0).toLocaleString()} €</span></p>
              {selectedService.notes && (
                <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">
                  <span className="font-medium">{t.notes || 'Notes'}:</span> {safeRender(selectedService.notes)}
                </div>
              )}
            </div>
            
            <button
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              onClick={() => handleDeleteService(selectedItem, selectedService)}
            >
              {t.deleteService || 'Delete Service'}
            </button>
          </div>
        )}
        
        {/* SHOPPING FORM */}
        {bottomSheetContent === 'add-shopping' && selectedItem && (
          <div className="bg-white">
            <ShoppingExpenseForm
            onAddShopping={handleShoppingFormSubmit}  // ✅ This function exists
            onCancel={closeBottomSheet}
            userCompanyId={userCompanyId}
            t={t}
          />
          </div>
        )}

      </div>
    </div>
  </div>
  </BottomSheetPortal>
)}
      
      {/* Enhanced Toast Notification */}
      {showNotification && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-md shadow-lg z-50 animate-fade-in-up flex items-center ${
          notificationType === 'success' ? 'bg-green-600 text-white' : 
          notificationType === 'error' ? 'bg-red-600 text-white' : 
          'bg-yellow-600 text-white'
        }`}>
          {notificationType === 'success' && (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          )}
          {notificationType === 'error' && (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          )}
          {safeRender(notificationMessage)}
        </div>
      )}
      
    </div>
  );
};


  

export default UpcomingBookings;
const BottomSheetPortal = ({ children }) => ReactDOM.createPortal(children, document.body);
