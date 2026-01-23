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


// Status colors - refined, premium look
const statusColors = {
  confirmed: { cssClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { cssClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { cssClass: 'bg-slate-100 text-slate-500 border-slate-200' },
  booked: { cssClass: 'bg-sky-50 text-sky-700 border-sky-200' }
};

// Payment status colors - softer palette (unpaid is neutral, not alarming red)
const paymentStatusColors = {
  paid: { cssClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  partiallyPaid: { cssClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  notPaid: { cssClass: 'bg-slate-100 text-slate-500 border-slate-200' }
};

// Inline receipt strings must stay under Firestore doc size (~1MB).
const MAX_INLINE_RECEIPT_LENGTH = 900000; // ~900 KB buffer for other fields

const serviceTagStyles = {
  villa: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  villas: 'bg-violet-50 text-violet-700 border-violet-200',
  'concierge-core': 'bg-amber-50 text-amber-700 border-amber-200',
  cars: 'bg-rose-50 text-rose-700 border-rose-200',
  boats: 'bg-blue-50 text-blue-700 border-blue-200',
  yacht: 'bg-blue-50 text-blue-700 border-blue-200',
  chefs: 'bg-amber-50 text-amber-700 border-amber-200',
  shopping: 'bg-pink-50 text-pink-700 border-pink-200'
};

const getUnitDisplayLabel = (unit, t, category = '') => {
  const normalized = (unit || '').toLowerCase();
  
  // Explicit unit checks
  if (normalized.includes('week')) return t.perWeek;
  if (normalized.includes('month')) return t.perMonth;
  if (normalized.includes('hour')) return t.perHour;
  if (normalized.includes('day')) return t.perDay;
  if (normalized.includes('night')) return t.perNight;
  if (normalized.includes('service')) return t.perService;
  
  // Default fallbacks based on common patterns
  if (normalized === 'h') return t.perHour;
  if (normalized === 'd') return t.perDay;
  
  // Category-based intelligent defaults if unit is missing or generic
  if (category === 'chefs' || category === 'security' || category === 'nannies' || category === 'chef') {
    return t.perHour;
  }
  if (category === 'villas' || category === 'cars' || category === 'boats') {
    return t.perDay;
  }
  
  return ''; // Return empty instead of wrong unit
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
        <svg className={`${sizeClass} text-rose-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <svg className={`${sizeClass} text-emerald-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Compute per-service payment summary based on recorded payments
const getServicePaymentInfo = (service, payments = [], safeRenderFn = (v) => v) => {
  const explicitTotal = toNumber(service?.totalValue);
  const unitPrice = toNumber(service?.price);
  const quantity = toNumber(service?.quantity) || 1;
  const total = explicitTotal > 0 ? explicitTotal : (unitPrice * quantity);
  
  // ONLY use the stored amountPaid - this is set correctly when service is added or paid
  // DO NOT use name matching - multiple services can have the same name!
  const storedPaid = toNumber(service?.amountPaid);
  
  // Cross-check with payment history by BOTH serviceId AND bookingId
  // This prevents the bug where payments are double-counted across bookings with same serviceId
  let paidFromHistory = 0;
  const serviceId = service?.id || null;
  const serviceBookingId = service?.bookingId || null;
  
  if (serviceId && Array.isArray(payments) && payments.length > 0) {
    payments.forEach((payment) => {
      // STRICT: Match by serviceId AND bookingId (if available) to prevent cross-booking double-counting
      const paymentMatchesService = payment.serviceId && payment.serviceId === serviceId;
      const paymentMatchesBooking = !serviceBookingId || !payment.bookingId || payment.bookingId === serviceBookingId;
      
      if (paymentMatchesService && paymentMatchesBooking) {
        paidFromHistory += toNumber(payment.amount || 0);
      }
    });
  }

  // Prefer explicit payment history when present, otherwise trust stored amountPaid
  const paidRaw = paidFromHistory > 0 ? paidFromHistory : storedPaid;
  const paid = total > 0 ? Math.min(total, paidRaw) : paidRaw;
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
const ServiceSelectionPanel = ({ onServiceAdded, onCancel, userCompanyId, t, formError, bookings = [] }) => {
  // If multiple bookings, start with booking selection; otherwise go straight to category
  const hasMultipleBookings = bookings && bookings.length > 1;
  const [step, setStep] = useState(hasMultipleBookings ? 'booking' : 'category');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');
  
  // Track selected booking (default to most recent if only one)
  const defaultBooking = bookings?.length > 0 
    ? [...bookings].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]
    : null;
  const [selectedBooking, setSelectedBooking] = useState(defaultBooking);
  
  // Get booking date constraints from selected booking
  const bookingCheckIn = selectedBooking?.checkIn;
  const bookingCheckOut = selectedBooking?.checkOut;
  const minDate = bookingCheckIn ? new Date(bookingCheckIn).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const maxDate = bookingCheckOut ? new Date(bookingCheckOut).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  // Initialize service dates to booking check-in date (or today if not available)
  const initialDate = minDate;
  
  // Form state for custom service
  const [serviceData, setServiceData] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    quantity: 1,
    unit: 'hourly',
    date: initialDate,
    startDate: initialDate, // Initialize to booking start date
    endDate: initialDate,   // Initialize to booking start date
    status: 'confirmed',
    notes: '',
    selectedMonth: '',
    monthlyOptions: [],
    paymentStatus: 'unpaid', // Track payment status
    amountPaid: 0 // Track amount paid for this service
  });
  
  // Update service dates when booking selection changes
  useEffect(() => {
    if (selectedBooking) {
      const newMinDate = selectedBooking.checkIn ? new Date(selectedBooking.checkIn).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      setServiceData(prev => ({
        ...prev,
        date: newMinDate,
        startDate: newMinDate,
        endDate: newMinDate
      }));
    }
  }, [selectedBooking]);

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
  // console.log(`Fetching services for category ${selectedCategory.id} and company ${userCompanyId}...`); // Removed for production
        
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
        
  // console.log(`Found ${servicesData.length} services in 'services' collection`); // Removed for production
        
        // If this is a standard category, also try to fetch from its dedicated collection
        if (['cars', 'boats', 'villas', 'chefs', 'security'].includes(selectedCategory.id)) {
          try {
  // console.log(`Fetching from dedicated '${selectedCategory.id}' collection...`); // Removed for production
            
            const dedicatedQuery = query(
              collection(db, selectedCategory.id)
            );
            
            const dedicatedSnapshot = await getDocs(dedicatedQuery);
            const dedicatedCount = dedicatedSnapshot.size;
            
  // console.log(`Found ${dedicatedCount} items in '${selectedCategory.id}' collection`); // Removed for production
            
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
              
              // console.log(`Processing item: ${doc.id}`, { name: data.name?.en || data.name || doc.id, price: price });
              
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
        
  // console.log(`Total services after merging collections: ${servicesData.length}`); // Removed for production
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
    
    // Intelligent unit default based on category
    const categoryDefaultUnit = (selectedCategory.id === 'chefs' || selectedCategory.id === 'chef' || selectedCategory.id === 'security' || selectedCategory.id === 'nannies') ? 'hour' : 'day';
    const resolvedUnit = defaultMonthly?.type || service.unit || categoryDefaultUnit;

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
      startDate: serviceData.startDate || serviceData.date,
      endDate: serviceData.endDate || serviceData.startDate || serviceData.date,
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
      amountPaid: amountPaid,
      // Include the selected booking ID so we know which booking to add this to
      targetBookingId: selectedBooking?.id || null
    };
    
    onServiceAdded(newService);
  };

  // RENDER BOOKING SELECTION (when client has multiple bookings)
  const renderBookingSelection = () => (
    <div className="bg-white">
      {formError && (
        <div className="mb-3 px-3 py-2 rounded-md border border-rose-200 bg-rose-50 text-rose-600 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {safeRender(formError)}
        </div>
      )}
      <h4 className="text-lg font-medium mb-2 text-gray-900">{t.selectBooking || 'Select Booking'}</h4>
      <p className="text-sm text-gray-600 mb-4">{t.selectBookingDescription || 'Choose which booking to add this service to:'}</p>
      
      <div className="space-y-3">
        {bookings.map((booking, index) => {
          const checkIn = booking.checkIn ? new Date(booking.checkIn) : null;
          const checkOut = booking.checkOut ? new Date(booking.checkOut) : null;
          const isSelected = selectedBooking?.id === booking.id;
          const accommodationName = safeRender(booking.accommodationType || booking.propertyName || booking.villaName || `Booking ${index + 1}`);
          const isLocked = String(booking?.status || '').toLowerCase() === 'booked';
          
          // Check if booking is current (today is within dates)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isCurrent = checkIn && checkOut && today >= checkIn && today <= checkOut;
          const isUpcoming = checkIn && today < checkIn;
          
          return (
            <button
              key={booking.id}
              onClick={() => {
                if (isLocked) return;
                setSelectedBooking(booking);
                setStep('category');
              }}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : isLocked
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
              disabled={isLocked}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{accommodationName}</span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full uppercase tracking-wide">
                        {t.currentBooking || 'Current'}
                      </span>
                    )}
                    {isUpcoming && !isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
                        {t.upcoming || 'UPCOMING'}
                      </span>
                    )}
                    {isLocked && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-500 rounded-full">
                        {t.booked || 'BOOKED'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {checkIn?.toLocaleDateString() || '?'} → {checkOut?.toLocaleDateString() || '?'}
                    </span>
                  </div>
                  {booking.services?.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {booking.services.length} {booking.services.length === 1 ? (t.service || 'service') : (t.services || 'services')}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{(booking.totalValue || 0).toLocaleString()} €</div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-blue-500 ml-auto mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <button
          onClick={onCancel}
          className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
        >
          {t.cancel || 'Cancel'}
        </button>
      </div>
    </div>
  );

  // RENDER CATEGORY SELECTION
  const renderCategorySelection = () => (
    <div className="bg-white">
      {formError && (
        <div className="mb-3 px-3 py-2 rounded-md border border-rose-200 bg-rose-50 text-rose-600 text-sm">
          {safeRender(formError)}
        </div>
      )}
      
      {/* Show selected booking info when there are multiple bookings */}
      {hasMultipleBookings && selectedBooking && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-blue-700 font-medium">{t.addingTo || 'Adding to'}:</span>
              <span className="ml-2 font-semibold text-blue-900">
                {safeRender(selectedBooking.accommodationType || selectedBooking.propertyName || 'Booking')}
              </span>
              <span className="ml-2 text-sm text-blue-600">
                ({new Date(selectedBooking.checkIn).toLocaleDateString()} → {new Date(selectedBooking.checkOut).toLocaleDateString()})
              </span>
            </div>
            <button
              onClick={() => setStep('booking')}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {t.change || 'Change'}
            </button>
          </div>
        </div>
      )}
      
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
      {/* Form Error Display */}
      {formError && (
        <div className="mb-3 px-3 py-2 rounded-md border border-rose-200 bg-rose-50 text-rose-600 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {safeRender(formError)}
        </div>
      )}
      
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
        {/* Booking Date Range Notice */}
        {bookingCheckIn && bookingCheckOut && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {t.bookingPeriod || 'Booking Period'}
            </div>
            <p className="text-amber-700 text-sm mt-1">
              {t.serviceDatesMustBeWithin || 'Service dates must be within'}: <strong>{new Date(bookingCheckIn).toLocaleDateString()} → {new Date(bookingCheckOut).toLocaleDateString()}</strong>
            </p>
          </div>
        )}
        
        {/* Service Dates - Start and End */}
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <label className="flex items-center gap-2 text-sm font-medium text-indigo-800 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16" />
            </svg>
            {t.serviceDates || 'Service Dates'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t.startDate || 'Start Date'}</label>
              <input
                type="date"
                value={serviceData.startDate || serviceData.date}
                min={minDate}
                max={maxDate}
                onChange={(e) => setServiceData({
                  ...serviceData, 
                  startDate: e.target.value,
                  date: e.target.value, // Keep date in sync for backwards compatibility
                  endDate: serviceData.endDate && serviceData.endDate >= e.target.value ? serviceData.endDate : e.target.value // Default end to start if not set or if end is before new start
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t.endDate || 'End Date'}</label>
              <input
                type="date"
                value={serviceData.endDate || serviceData.startDate || serviceData.date}
                min={serviceData.startDate || serviceData.date || minDate}
                max={maxDate}
                onChange={(e) => setServiceData({...serviceData, endDate: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              />
            </div>
          </div>
          {serviceData.startDate && serviceData.endDate && (
            <p className="text-xs text-indigo-600 mt-2 font-medium">
              📅 {(() => {
                const start = new Date(serviceData.startDate);
                const end = new Date(serviceData.endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                return days === 1 ? '1 day' : `${days} days`;
              })()}
            </p>
          )}
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
                  {(opt.month || t.month || 'Month')}: €{opt.price} {getUnitDisplayLabel(opt.type || serviceData.unit, t, serviceData.category)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.pricePerUnit || 'Price'} {getUnitDisplayLabel(serviceData.unit, t, serviceData.category)}</label>
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
                    // Allow any positive value - validation happens on submit
                    setServiceData({
                      ...serviceData, 
                      amountPaid: isNaN(value) ? '' : Math.max(0, value)
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
              {serviceData.price > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {t.remaining || 'Remaining'}: {Math.max(0, (serviceData.price * serviceData.quantity) - (parseFloat(serviceData.amountPaid) || 0)).toFixed(2)} €
                </p>
              )}
              {serviceData.price <= 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {t.enterPriceFirst || 'Enter the service price first'}
                </p>
              )}
            </div>
          )}
          
          {serviceData.paymentStatus === 'paid' && (
            <div className="flex items-center text-sm text-emerald-600">
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
      {/* Form Error Display */}
      {formError && (
        <div className="mb-3 px-3 py-2 rounded-md border border-rose-200 bg-rose-50 text-rose-600 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {safeRender(formError)}
        </div>
      )}
      
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
        {/* Booking Date Range Notice */}
        {bookingCheckIn && bookingCheckOut && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {t.bookingPeriod || 'Booking Period'}
            </div>
            <p className="text-amber-700 text-sm mt-1">
              {t.serviceDatesMustBeWithin || 'Service dates must be within'}: <strong>{new Date(bookingCheckIn).toLocaleDateString()} → {new Date(bookingCheckOut).toLocaleDateString()}</strong>
            </p>
          </div>
        )}
        
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
        
        {/* Service Dates - Start and End */}
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <label className="flex items-center gap-2 text-sm font-medium text-indigo-800 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16" />
            </svg>
            {t.serviceDates || 'Service Dates'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t.startDate || 'Start Date'}</label>
              <input
                type="date"
                value={serviceData.startDate || serviceData.date}
                min={minDate}
                max={maxDate}
                onChange={(e) => setServiceData({
                  ...serviceData, 
                  startDate: e.target.value,
                  date: e.target.value,
                  endDate: serviceData.endDate && serviceData.endDate >= e.target.value ? serviceData.endDate : e.target.value
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t.endDate || 'End Date'}</label>
              <input
                type="date"
                value={serviceData.endDate || serviceData.startDate || serviceData.date}
                min={serviceData.startDate || serviceData.date || minDate}
                max={maxDate}
                onChange={(e) => setServiceData({...serviceData, endDate: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              />
            </div>
          </div>
          {serviceData.startDate && serviceData.endDate && (
            <p className="text-xs text-indigo-600 mt-2 font-medium">
              📅 {(() => {
                const start = new Date(serviceData.startDate);
                const end = new Date(serviceData.endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                return days === 1 ? '1 day' : `${days} days`;
              })()}
            </p>
          )}
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
      {step === 'booking' && renderBookingSelection()}
      {step === 'category' && renderCategorySelection()}
      {step === 'services' && renderServicesList()}
      {step === 'details' && renderServiceDetailsForm()}
      {step === 'custom' && renderCustomForm()}
      
      {error && (
        <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-md">
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
                  step="0.01"
                  value={shoppingData.amountPaid}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    if (rawValue === '') {
                      setShoppingData({ ...shoppingData, amountPaid: '' });
                      return;
                    }
                    const value = parseFloat(rawValue);
                    // Allow any positive value - validation happens on submit
                    setShoppingData({
                      ...shoppingData, 
                      amountPaid: isNaN(value) ? '' : Math.max(0, value)
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
              {parseFloat(shoppingData.price) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {t.remaining || 'Remaining'}: {Math.max(0, (parseFloat(shoppingData.price) || 0) - (parseFloat(shoppingData.amountPaid) || 0)).toFixed(2)} €
                </p>
              )}
              {parseFloat(shoppingData.price) <= 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {t.enterPriceFirst || 'Enter the expense amount first'}
                </p>
              )}
            </div>
          )}
          
          {shoppingData.paymentStatus === 'paid' && (
            <div className="flex items-center text-sm text-emerald-600 mb-4">
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
                className="text-rose-600 hover:text-rose-700 text-xs font-medium"
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
          <div className="p-3 bg-rose-50 text-rose-600 rounded-md">
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
const ClientCard = ({ client, onViewDetails, onOpenService, onOpenShopping, disableServiceActions = false, timeFilter }) => {
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
      daysAgo: "days ago",
      perDay: "per day",
      perNight: "per night",
      perWeek: "per week",
      perMonth: "per month",
      perHour: "per hour",
      perService: "per service",
      pricePerUnit: "Price",
      editDates: "Edit Dates",
      editBooking: "Edit Booking",
      editBookingDates: "Edit Booking Dates",
      updateBooking: "Update Booking",
      updatingBooking: "Updating booking...",
      bookingUpdatedSuccess: "Booking updated successfully",
      serviceOutsideBooking: "Service dates must stay within the booking period.",
      bookingPeriod: "Booking Period",
      serviceDatesMustBeWithin: "Service dates must be within",
      selectBooking: "Select Booking",
      selectBookingDescription: "Choose which booking to add this service to:",
      currentBooking: "CURRENT",
      addingTo: "Adding to",
      change: "Change",
      pastBookingReadOnly: "Past bookings are read-only."
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
      daysAgo: "zile în urmă",
      perDay: "pe zi",
      perNight: "pe noapte",
      perWeek: "pe săptămână",
      perMonth: "pe lună",
      perHour: "pe oră",
      perService: "pe serviciu",
      pricePerUnit: "Preț",
      editDates: "Editează Datele",
      editBooking: "Editează Rezervarea",
      editBookingDates: "Editează Datele Rezervării",
      updateBooking: "Actualizează Rezervarea",
      updatingBooking: "Se actualizează rezervarea...",
      bookingUpdatedSuccess: "Rezervare actualizată cu succes",
      serviceOutsideBooking: "Serviciul trebuie programat în perioada rezervării.",
      bookingPeriod: "Perioada Rezervării",
      serviceDatesMustBeWithin: "Datele serviciului trebuie să fie în intervalul",
      selectBooking: "Selectează Rezervarea",
      selectBookingDescription: "Alege la care rezervare vrei să adaugi acest serviciu:",
      currentBooking: "ÎN CURS",
      addingTo: "Adaugă la",
      change: "Schimbă",
      pastBookingReadOnly: "Rezervările trecute sunt doar pentru vizualizare."
    }
  };
  
  const t = translations[language];
  
  // Helper functions
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'ro-RO', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const normalizeCardDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return new Date(value);
    if (value?.toDate) return new Date(value.toDate());
    if (value?.seconds) return new Date(value.seconds * 1000);
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const direct = new Date(trimmed);
      if (!Number.isNaN(direct.getTime())) {
        direct.setHours(0, 0, 0, 0);
        return direct;
      }
      const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        const parsed = new Date(year, month, day);
        if (!Number.isNaN(parsed.getTime())) {
          parsed.setHours(0, 0, 0, 0);
          return parsed;
        }
      }
      return null;
    }
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) return null;
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  };

  const buildBookingRangeLabel = (bookings = []) => {
    if (!bookings.length) return '';
    const starts = bookings.map(b => normalizeCardDate(b.checkIn)).filter(Boolean);
    const ends = bookings.map(b => normalizeCardDate(b.checkOut || b.checkIn)).filter(Boolean);
    if (!starts.length || !ends.length) return '';
    const startDate = new Date(Math.min(...starts.map(d => d.getTime())));
    const endDate = new Date(Math.max(...ends.map(d => d.getTime())));
    const startLabel = formatShortDate(startDate);
    const endLabel = formatShortDate(endDate);
    if (!startLabel && !endLabel) return '';
    if (!endLabel || startLabel === endLabel) return startLabel || endLabel || '';
    return `${startLabel} - ${endLabel}`;
  };

  const getProgressContext = (bookings = []) => {
    if (!bookings.length) {
      return { focusBookings: [], headerBooking: null, label: '' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalized = bookings
      .map(booking => {
        const start = normalizeCardDate(booking.checkIn);
        const end = normalizeCardDate(booking.checkOut || booking.checkIn);
        if (!start || !end) return null;
        return { ...booking, _start: start, _end: end };
      })
      .filter(Boolean)
      .sort((a, b) => a._start - b._start);

    if (!normalized.length) {
      return { focusBookings: [], headerBooking: null, label: '' };
    }

    const active = normalized.filter(booking => today >= booking._start && today <= booking._end);
    if (active.length) {
      return {
        focusBookings: active,
        headerBooking: active[0],
        label: buildBookingRangeLabel(active)
      };
    }

    const upcoming = normalized.filter(booking => booking._start > today);
    if (upcoming.length) {
      const nextStart = upcoming[0]._start.getTime();
      const sameDay = upcoming.filter(booking => booking._start.getTime() === nextStart);
      return {
        focusBookings: sameDay,
        headerBooking: sameDay[0],
        label: buildBookingRangeLabel(sameDay)
      };
    }

    const last = normalized[normalized.length - 1];
    return {
      focusBookings: [last],
      headerBooking: last,
      label: buildBookingRangeLabel([last])
    };
  };

  const sumBookingPayments = (bookings = []) => {
    return bookings.reduce(
      (acc, booking) => {
        acc.total += toNumber(booking?.totalValue || 0);
        acc.paid += toNumber(booking?.paidAmount || 0);
        return acc;
      },
      { total: 0, paid: 0 }
    );
  };

  // Get check-in date from the earliest upcoming booking if it exists
  const progressContext = getProgressContext(client.bookings || []);
  const focusBookings = progressContext.focusBookings.length
    ? progressContext.focusBookings
    : (progressContext.headerBooking ? [progressContext.headerBooking] : []);
  const displayBookings =
    timeFilter === 'past' || timeFilter === 'custom'
      ? (client.bookings || [])
      : (focusBookings.length ? focusBookings : (client.bookings || []));
  const earliestBooking = [...displayBookings].sort((a, b) => 
    new Date(a.checkIn || 0) - new Date(b.checkIn || 0)
  )[0] || {};
  const villaName = earliestBooking?.accommodationType
    ? safeRender(earliestBooking.accommodationType)
    : '';
  const { total: focusTotal, paid: focusPaid } = sumBookingPayments(focusBookings);
  const progressTotal = focusBookings.length ? focusTotal : toNumber(client.totalValue);
  const progressPaid = focusBookings.length ? focusPaid : toNumber(client.paidAmount);
  const progressStatus = progressTotal > 0
    ? (progressPaid >= progressTotal ? 'paid' : (progressPaid > 0 ? 'partiallyPaid' : 'notPaid'))
    : (client.paymentStatus || 'notPaid');
  const displayStatus = client.bookings.length > 1 ? progressStatus : (client.paymentStatus || progressStatus);
  const progressLabel = client.bookings.length > 1 ? progressContext.label : '';
  const headerBooking = client.bookings.length > 1 ? (progressContext.headerBooking || earliestBooking) : earliestBooking;
  const displayTotalValue = client.bookings.length > 1 ? progressTotal : client.totalValue;
  
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

  function isServiceWithinBooking(service, booking) {
    if (!service || !booking) return true;
    const checkIn = booking.checkIn ? new Date(booking.checkIn) : null;
    const checkOut = booking.checkOut ? new Date(booking.checkOut) : null;
    if (!checkIn || !checkOut) return true;

    const start = new Date(service.startDate || service.date);
    const end = new Date(service.endDate || service.startDate || service.date || start);
    if (Number.isNaN(start) || Number.isNaN(end)) return true;

    [start, end, checkIn, checkOut].forEach(d => d.setHours(0, 0, 0, 0));
    return start >= checkIn && end <= checkOut;
  }

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
      paid: { cssClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      partiallyPaid: { cssClass: 'bg-amber-50 text-amber-700 border-amber-200' },
      notPaid: { cssClass: 'bg-slate-100 text-slate-500 border-slate-200' }
    };
    return paymentStatusColors[status]?.cssClass || 'bg-slate-100 text-slate-500';
  };
  
  const getBorderColorClass = (status) => {
    if (status === 'paid') return 'border-emerald-400';
    if (status === 'partiallyPaid') return 'border-amber-400';
    return 'border-slate-300';
  };

  const hideServiceButton = (() => {
    if (disableServiceActions) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookings = Array.isArray(client.bookings) ? client.bookings : [];
    if (!bookings.length) return false;
    return bookings.every((booking) => {
      const checkOut = normalizeCardDate(booking.checkOut || booking.checkIn);
      if (!checkOut) return false;
      return checkOut < today;
    });
  })();
  const actionGridCols = hideServiceButton ? 'grid-cols-2' : 'grid-cols-3';
  
  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden border-l-4 w-full max-w-full ${getBorderColorClass(displayStatus)}`}>
      {/* Client header with avatar and details */}
      <div className="p-4">
        <div className="flex justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
              displayStatus === 'paid' ? 'bg-emerald-500' : 
              displayStatus === 'partiallyPaid' ? 'bg-amber-500' : 
              'bg-slate-400'
            }`}>
              {getClientInitials(client.clientName)}
            </div>
            <div className="ml-3 truncate flex-1 min-w-0">
              <h3 className="font-medium leading-tight truncate">{safeRender(client.clientName)}</h3>
              <div className="flex items-center mt-1 flex-wrap gap-1">
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(displayStatus)}`}>
                  {getPaymentStatusText(displayStatus)}
                </div>

                {client.bookings.length > 1 && (
                  <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold border border-purple-200">
                    📅 {client.bookings.length} {language === 'ro' ? 'rezervări' : 'bookings'}
                  </span>
                )}
              </div>
              {headerBooking.checkIn && (
                <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-md">
                  <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16"></path>
                  </svg>
                  {formatShortDate(headerBooking.checkIn)}
                  <span className="text-slate-500">→</span>
                  {formatShortDate(headerBooking.checkOut || headerBooking.checkIn)}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{displayTotalValue.toLocaleString()} €</div>
            {displayStatus !== 'paid' && (
              <div className="text-xs text-rose-600 font-medium mt-1">
                {getDaysLeft(headerBooking.checkIn)}
              </div>
            )}
          </div>
        </div>
        
        {/* Payment progress bar */}
        {progressTotal > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-gray-600">
                {t.paymentProgress}
                {progressLabel && <span className="ml-1 text-[10px] text-gray-400">({progressLabel})</span>}
              </span>
              <div className="flex gap-2 items-center">
                <span className="font-medium">{progressPaid.toLocaleString()} / {progressTotal.toLocaleString()} €</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  progressPaid >= progressTotal ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 
                  progressPaid > 0 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 
                  'bg-slate-300'
                }`}
                style={{ width: `${Math.min(100, (progressPaid / progressTotal) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Services summary - GROUPED BY BOOKING */}
        {displayBookings && displayBookings.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-gray-600">{t.servicesAndExtras}</div>
            
            {/* Show services grouped by booking when there are multiple bookings */}
            {displayBookings.length > 1 ? (
              // Multiple bookings - show each booking's services separately
              <div className="space-y-3">
                {[...displayBookings]
                  .sort((a, b) => new Date(a.checkIn || 0) - new Date(b.checkIn || 0))
                  .map((booking, bookingIdx) => {
                    const bookingServices = booking.services || [];
                    if (bookingServices.length === 0) return null;
                    
                    // Format booking dates
                    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : null;
                    const checkOutDate = booking.checkOut ? new Date(booking.checkOut) : null;
                    const formatDate = (d) => d ? formatShortDate(d) : '';
                    const isToday = checkInDate && checkInDate.toDateString() === new Date().toDateString();
                    const isTomorrow = checkInDate && checkInDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                    const bookingLabel = isToday
                      ? (language === 'ro' ? 'Azi' : 'Today')
                      : isTomorrow
                        ? (language === 'ro' ? 'Mâine' : 'Tomorrow')
                        : `${t.booking || 'Booking'} ${bookingIdx + 1}`;
                    
                    return (
                      <div 
                        key={booking.id || bookingIdx}
                        className={`p-2 rounded-lg border ${
                          isToday 
                            ? 'bg-amber-50 border-amber-200' 
                            : isTomorrow 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {/* Booking date header */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isToday 
                              ? 'bg-amber-200 text-amber-800' 
                              : isTomorrow 
                                ? 'bg-blue-200 text-blue-800' 
                                : 'bg-gray-200 text-gray-700'
                          }`}>
                            {bookingLabel}
                          </span>
                        </div>
                        
                        {/* Services for this booking - with dates */}
                        <div className="flex flex-wrap gap-1.5">
                          {bookingServices.map((service, idx) => {
                            const serviceStart = service.startDate || booking.checkIn;
                            const serviceEnd = service.endDate || booking.checkOut || serviceStart;
                            const serviceStartLabel = serviceStart ? formatShortDate(serviceStart) : '';
                            const serviceEndLabel = serviceEnd ? formatShortDate(serviceEnd) : '';
                            const showEnd = serviceEndLabel && serviceStartLabel && serviceEndLabel !== serviceStartLabel;
                            const dateTitle = serviceStartLabel
                              ? `${serviceStartLabel}${showEnd ? ` → ${serviceEndLabel}` : ''}`
                              : '';

                            return (
                              <div
                                key={`${booking.id}-${service.id || idx}`}
                                className={`px-2 py-0.5 rounded-full border text-xs ${getServiceTagClasses(service.type || service.category)} flex items-center gap-1`}
                                title={dateTitle}
                              >
                                <span>{safeRender(service.name)}</span>
                                {serviceStartLabel && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-white border border-slate-300 px-1.5 py-0.5 rounded-full">
                                    <svg className="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16" />
                                    </svg>
                                    {serviceStartLabel}
                                    {showEnd && <>→{serviceEndLabel}</>}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              // Single booking - show services normally
              <>
                {villaName && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-3 py-1 rounded-full border font-semibold ${getServiceTagClasses('villa')}`}>
                      {villaName}
                    </span>
                  </div>
                )}
                {(displayBookings[0]?.services || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(displayBookings[0]?.services || [])
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
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Action buttons - FIXED with direct prop callbacks */}
      <div className={`grid ${actionGridCols} border-t bg-gray-50`}>
  <button 
    className="flex flex-col items-center justify-center py-3 text-gray-700 hover:bg-gray-100 transition-colors active:bg-gray-200"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
  // console.log('Details button clicked for client:', client.clientId); // Removed for production
      onViewDetails?.(client);
    }}
  >
    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span className="text-xs font-medium">{t.details}</span>
  </button>
  
  {!hideServiceButton && (
    <button 
      className="flex flex-col items-center justify-center py-3 text-gray-700 hover:bg-gray-100 transition-colors active:bg-gray-200"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
  // console.log('Service button clicked for client:', client.clientName); // Removed for production
        onOpenService?.(client);
      }}
    >
      <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span className="text-xs font-medium">{t.service}</span>
    </button>
  )}
  
  <button 
    className="flex flex-col items-center justify-center py-3 text-gray-700 hover:bg-gray-100 transition-colors active:bg-gray-200"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
  // console.log('Shop button clicked for client:', client.clientName); // Removed for production
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
  // NOW WITH DUPLICATE PAYMENT CLEANUP - removes duplicate payments that were created by bugs
  const handleRecalculateTotals = async (client) => {
    if (!client || !client.bookings || client.bookings.length === 0) return;
    
    try {
      showNotificationMessage(t.recalculating || 'Recalculating and cleaning duplicates...');
  // console.log("🔄 Recalculating Source of Truth for client:", client.clientName); // Removed for production
      
      const updatedBookings = await Promise.all(client.bookings.map(async (booking) => {
        const bookingRef = doc(db, 'reservations', booking.id);
        const bookingSnap = await getDoc(bookingRef);
        
        if (!bookingSnap.exists()) return booking;
        
        const data = bookingSnap.data();
        const services = Array.isArray(data.services) ? [...data.services] : [];
        let paymentHistory = Array.isArray(data.paymentHistory) ? [...data.paymentHistory] : [];
        
        // STEP 0: CLEAN UP DUPLICATE PAYMENTS
        // A duplicate is a payment with same serviceId AND same amount AND within 60 seconds of another
        // We keep only one payment per service that covers the full service amount
        const cleanedPaymentHistory = [];
        const seenPayments = new Map(); // Key: serviceId+amount, Value: payment object
        
        paymentHistory.forEach(payment => {
          const serviceId = payment.serviceId || 'general';
          const amount = parseFloat(payment.amount || 0);
          const paymentKey = `${serviceId}_${amount}`;
          const paymentDate = payment.date?.toDate?.() || payment.date || new Date(payment.createdAt || 0);
          
          if (seenPayments.has(paymentKey)) {
            // Check if this is a real duplicate (within 60 seconds)
            const existing = seenPayments.get(paymentKey);
            const existingDate = existing.date?.toDate?.() || existing.date || new Date(existing.createdAt || 0);
            const timeDiff = Math.abs(new Date(paymentDate) - new Date(existingDate));
            
            // If within 60 seconds, it's likely a duplicate - skip it
            if (timeDiff < 60000) {
  // console.log(`⚠️ Removing duplicate payment: ${amount}€ for service ${serviceId}`); // Removed for production
              return; // Skip this duplicate
            }
          }
          
          // Not a duplicate - keep it
          seenPayments.set(paymentKey, payment);
          cleanedPaymentHistory.push(payment);
        });
        
        const duplicatesRemoved = paymentHistory.length - cleanedPaymentHistory.length;
        if (duplicatesRemoved > 0) {
  // console.log(`🧹 Removed ${duplicatesRemoved} duplicate payment(s) from booking ${booking.id}`); // Removed for production
        }
        
        paymentHistory = cleanedPaymentHistory;
        
        // STEP 0.5: FIX DATA INCONSISTENCY - Create missing payment records for services with amountPaid but no payment
        // This fixes the bug where services show as "Paid" but progress bar shows money due
        services.forEach((service, svcIdx) => {
          const serviceId = service.id;
          const serviceAmountPaid = parseFloat(service.amountPaid || 0);
          const serviceTotal = parseFloat(service.price || 0) * parseInt(service.quantity || 1);
          
          if (serviceAmountPaid > 0 && serviceId) {
            // Check if there's a matching payment in history
            const paymentsForService = paymentHistory.filter(p => p.serviceId === serviceId);
            const totalPaidInHistory = paymentsForService.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            
            // If service shows paid but no payment record exists, create one
            if (totalPaidInHistory < serviceAmountPaid) {
              const missingAmount = serviceAmountPaid - totalPaidInHistory;
  // console.log(`🔧 Creating missing payment record: ${missingAmount}€ for service ${service.name || serviceId}`); // Removed for production
              
              paymentHistory.push({
                id: `recovery-${Date.now()}-${svcIdx}-${Math.random().toString(36).substr(2, 9)}`,
                amount: missingAmount,
                method: 'data-recovery',
                notes: `Auto-created to sync service payment (was: ${serviceAmountPaid}€ paid, history had: ${totalPaidInHistory}€)`,
                serviceId: serviceId,
                serviceName: typeof service.name === 'object' ? (service.name.en || service.name.ro || 'Service') : (service.name || 'Service'),
                date: new Date(),
                createdAt: new Date(),
                createdBy: 'system-recovery'
              });
            }
          }
        });
        
        // 1. CALCULATE TOTAL FROM SERVICES (The only source of truth for price)
        let totalValue = services.reduce((sum, s) => {
          return sum + (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
        }, 0);
        
        // 2. CALCULATE PAID FROM CLEANED HISTORY (The only source of truth for money received)
        const totalPaidFromHistory = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        // 3. Update each service's payment status based on history (STRICT ID + BOOKING Allocation)
        let remainingPayments = [...paymentHistory];
        
        const servicesWithExplicitPayments = services.map(s => {
          const sId = s.id || null;
          const sTotal = (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
          
          let sPaid = 0;
          
          remainingPayments = remainingPayments.filter(p => {
            // Match by serviceId AND ensure payment belongs to this booking
            // This prevents cross-booking payment matching when services share IDs
            const matchesServiceId = sId && p.serviceId && p.serviceId === sId;
            const matchesBooking = !p.bookingId || p.bookingId === booking.id;
            
            if (matchesServiceId && matchesBooking) {
              sPaid += parseFloat(p.amount || 0);
              return false;
            }
            return true;
          });
          
          return {
            ...s,
            amountPaid: sPaid,
            sTotal
          };
        });

        // Pass 3: Auto-allocation of Surplus
        let surplusMoney = remainingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        const updatedServices = servicesWithExplicitPayments.map(svc => {
          const currentDue = Math.max(0, svc.sTotal - svc.amountPaid);
          let autoAllocated = 0;
          
          if (surplusMoney > 0 && currentDue > 0) {
            autoAllocated = Math.min(surplusMoney, currentDue);
            surplusMoney -= autoAllocated;
          }
          
          const finalPaid = svc.amountPaid + autoAllocated;
          const sStatus = finalPaid >= svc.sTotal && svc.sTotal > 0 ? 'paid' : (finalPaid > 0 ? 'partiallyPaid' : 'unpaid');
          
          return {
            ...svc,
            amountPaid: finalPaid,
            paymentStatus: sStatus
          };
        });
        
        // 4. Booking-level status
        let paymentStatus = 'notPaid';
        if (totalPaidFromHistory >= totalValue && totalValue > 0) paymentStatus = 'paid';
        else if (totalPaidFromHistory > 0) paymentStatus = 'partiallyPaid';
        
        const updateData = {
          totalValue,
          totalAmount: totalValue,
          paidAmount: totalPaidFromHistory,
          paymentStatus,
          services: updatedServices,
          paymentHistory: paymentHistory, // SAVE THE CLEANED PAYMENT HISTORY (duplicates removed)
          updatedAt: serverTimestamp()
        };
        
        await updateDoc(bookingRef, updateData);
        return { ...data, id: booking.id, ...updateData, paymentHistory };
      }));
      
      // Update local state: bookings
      setBookings(prev => {
        return prev.map(b => {
          const updated = updatedBookings.find(ub => ub.id === b.id);
          return updated ? { ...b, ...updated } : b;
        });
      });
      
      // Update local state: clientGroups
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        updatedGroup.bookings = updatedBookings;
        
        // Recalculate group totals from all bookings
        let globalTotalVal = 0;
        let globalTotalPaid = 0;
        const allServices = [];
        const allPayments = [];
        
        updatedBookings.forEach(b => {
          globalTotalVal += b.totalValue || 0;
          globalTotalPaid += b.paidAmount || 0;
          if (Array.isArray(b.services)) b.services.forEach(s => allServices.push({ ...s, bookingId: b.id }));
          if (Array.isArray(b.paymentHistory)) b.paymentHistory.forEach(p => allPayments.push({ ...p, bookingId: b.id }));
        });
        
        updatedGroup.totalValue = globalTotalVal;
        updatedGroup.paidAmount = globalTotalPaid;
        updatedGroup.dueAmount = Math.max(0, globalTotalVal - globalTotalPaid);
        updatedGroup.paymentStatus = globalTotalPaid >= globalTotalVal && globalTotalVal > 0 ? 'paid' : (globalTotalPaid > 0 ? 'partiallyPaid' : 'notPaid');
        updatedGroup.services = allServices;
        updatedGroup.paymentHistory = allPayments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        
        return { ...prev, [clientId]: updatedGroup };
      });

      // Update local state: selectedItem (modal + progress bar)
      setSelectedItem(prev => {
        if (!prev || prev.clientId !== client.clientId) return prev;
        
        let totalVal = 0;
        let totalPaid = 0;
        const allServices = [];
        const allPayments = [];
        
        updatedBookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
          if (Array.isArray(b.services)) b.services.forEach(s => allServices.push({ ...s, bookingId: b.id }));
          if (Array.isArray(b.paymentHistory)) b.paymentHistory.forEach(p => allPayments.push({ ...p, bookingId: b.id }));
        });

        return {
          ...prev,
          bookings: updatedBookings,
          services: allServices,
          paymentHistory: allPayments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
          totalValue: totalVal,
          paidAmount: totalPaid,
          dueAmount: Math.max(0, totalVal - totalPaid),
          paymentStatus: totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid')
        };
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
  // console.warn('Currency format fallback', err); // Removed for production
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
  // console.warn('Unable to read stored time filter', err); // Removed for production
      return 'active';
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState(getStoredTimeFilter); // Default to showing active stays
  const [sortOption, setSortOption] = useState('date');
  
  // Date filter state
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const getTodayStart = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const parseDateValue = (value) => {
    if (!value) return null;
    if (value instanceof Date) return new Date(value);
    if (value?.toDate) return new Date(value.toDate());
    if (typeof value === 'number') return new Date(value);
    if (value?.seconds) return new Date(value.seconds * 1000);
    if (typeof value !== 'string') return new Date(value);
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) return direct;
    const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const normalizeDateValue = (value) => {
    const date = parseDateValue(value);
    if (!date || Number.isNaN(date.getTime())) return null;
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

  const isPastBookingList = (bookings = []) => {
    if (!Array.isArray(bookings) || bookings.length === 0) return false;
    const today = getTodayStart();
    return bookings.every((booking) => {
      const checkOut = normalizeDateValue(booking?.checkOut || booking?.checkIn);
      if (!checkOut) return false;
      return checkOut < today;
    });
  };

  const isBookingLocked = (booking) => {
    const status = String(booking?.status || '').toLowerCase();
    return status === 'booked';
  };

  const hasUnlockedBooking = (bookings = []) => {
    if (!Array.isArray(bookings) || bookings.length === 0) return false;
    return bookings.some((booking) => !isBookingLocked(booking));
  };

  const getClientDetailsBookingSortInfo = (booking, today = getTodayStart()) => {
    const checkIn = normalizeDateValue(booking?.checkIn);
    const checkOut = normalizeDateValue(booking?.checkOut || booking?.checkIn);
    if (!checkIn || !checkOut) {
      return { rank: 99, checkIn: new Date(0), checkOut: new Date(0) };
    }
    const isToday = checkIn.getTime() === today.getTime();
    const isActive = checkIn < today && checkOut >= today;
    const isUpcoming = checkIn > today;
    const rank = isToday ? 0 : (isActive ? 1 : (isUpcoming ? 2 : 3));
    return { rank, checkIn, checkOut };
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
  // console.warn('Unable to persist time filter', err); // Removed for production
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
    [clientGroups, timeFilter, sortOption, searchQuery, dateFilterStart, dateFilterEnd]
  );

  const visibleBookingCount = useMemo(
    () => {
      const today = getTodayStart();
      
      // For custom date filter, count all bookings in the date range
      if (timeFilter === 'custom') {
        const startDate = dateFilterStart ? new Date(dateFilterStart) : null;
        const endDate = dateFilterEnd ? new Date(dateFilterEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        return filteredClients.reduce((total, client) => {
          const bookingsInRange = (client.bookings || []).filter(booking => {
            const checkIn = normalizeDateValue(booking.checkIn);
            const checkOut = normalizeDateValue(booking.checkOut);
            if (!checkIn) return false;
            
            const bookingStart = checkIn;
            const bookingEnd = checkOut || checkIn;
            
            if (startDate && endDate) {
              return bookingStart <= endDate && bookingEnd >= startDate;
            } else if (startDate) {
              return bookingEnd >= startDate;
            } else if (endDate) {
              return bookingStart <= endDate;
            }
            return true;
          });
          return total + bookingsInRange.length;
        }, 0);
      }
      
      // Standard time bucket filter
      return filteredClients.reduce((total, client) => {
        const bookingsForFilter = (client.bookings || []).filter(
          (booking) => getBookingTimeBucket(booking, today) === timeFilter
        );
        return total + bookingsForFilter.length;
      }, 0);
    },
    [filteredClients, timeFilter, dateFilterStart, dateFilterEnd]
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
  const [isEditingServiceDates, setIsEditingServiceDates] = useState(false);
  const [editServiceDates, setEditServiceDates] = useState({ startDate: '', endDate: '' });
  const [selectedBookingToEdit, setSelectedBookingToEdit] = useState(null);
  const [editBookingDates, setEditBookingDates] = useState({ checkIn: '', checkOut: '' });
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
  
  // Prevent double-click on payment buttons
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Notification states
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  const [serviceFormError, setServiceFormError] = useState('');
  
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
    return paymentStatusColors[status]?.cssClass || 'bg-slate-100 text-slate-500';
  };
  
  const getBorderColorClass = (status) => {
    if (status === 'paid') return 'border-emerald-400';
    if (status === 'partiallyPaid') return 'border-amber-400';
    return 'border-slate-300';
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
        
  // console.log(`User authenticated with company: ${companyId}, role: ${role}`); // Removed for production
        
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
  // console.log(`Fetching data for company: ${userCompanyId}`); // Removed for production
        
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
  // console.warn(`Booking ${doc.id} has wrong company ID: ${data.companyId} vs ${userCompanyId}`); // Removed for production
          }
        });

        // Keep all bookings so past stays can be displayed in the Past filter.
        setBookings(bookingsData);
        
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
  // console.warn(`Client ${clientId} has wrong company ID: ${clientData.companyId} vs ${userCompanyId}`); // Removed for production
              }
            }
          } catch (err) {
            // Handle permission errors gracefully by falling back to booking-provided name
            const permDenied =
              err?.code === 'permission-denied' ||
              err?.code === 'PERMISSION_DENIED' ||
              (typeof err?.message === 'string' && err.message.toLowerCase().includes('permission'));
            if (permDenied) {
  // console.warn(`Permission denied reading client ${clientId}; using booking fallback name.`); // Removed for production
              clientDetailsObj[clientId] = { name: clientNameFallbacks[clientId] || 'Client' };
            } else {
              console.error(`Error fetching client ${clientId}:`, err);
            }
          }
        }
        
        setClientDetails(clientDetailsObj);
        
        // Group bookings by client
        const groups = {};
        bookingsData.forEach(booking => {
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
          
          const paymentHistory = Array.isArray(booking.paymentHistory) ? booking.paymentHistory : [];

          const getServiceTotalValue = (svc) => {
            const explicit = toNumber(svc?.totalValue);
            if (explicit > 0) return explicit;
            const price = toNumber(svc?.price);
            const qty = toNumber(svc?.quantity) || 1;
            return price * qty;
          };

          // 1. CALCULATE TOTAL VALUE (Sum of all services)
          const serviceTotalForBooking = bookingServices.reduce((sum, svc) => {
            return sum + getServiceTotalValue(svc);
          }, 0);

          // 2. PRESERVE SERVICE PAYMENT DATA, BUT CLAMP TO SERVICE TOTAL
          const finalServices = bookingServices.map(svc => {
            const svcTotal = getServiceTotalValue(svc);
            const storedAmountPaid = toNumber(svc.amountPaid || 0);

            let paidFromHistory = 0;
            const sId = svc.id || null;
            if (sId && paymentHistory.length > 0) {
              paymentHistory.forEach(payment => {
                const matchesService = payment.serviceId && payment.serviceId === sId;
                const matchesBooking = !svc.bookingId || !payment.bookingId || payment.bookingId === svc.bookingId;
                if (matchesService && matchesBooking) {
                  paidFromHistory += toNumber(payment.amount || 0);
                }
              });
            }

            const paidRaw = paidFromHistory > 0 ? paidFromHistory : storedAmountPaid;
            const safePaid = svcTotal > 0 ? Math.min(svcTotal, paidRaw) : paidRaw;

            let status = svc.paymentStatus || 'unpaid';
            if (safePaid >= svcTotal && svcTotal > 0) status = 'paid';
            else if (safePaid > 0) status = 'partiallyPaid';
            else status = 'unpaid';

            return {
              ...svc,
              amountPaid: safePaid,
              paymentStatus: status,
              svcTotal
            };
          });

          // 3. DEFINE BOOKING TOTALS
          const bookingTotalValue = serviceTotalForBooking > 0
            ? serviceTotalForBooking
            : toNumber(booking.totalValue || booking.totalAmount || 0);

          const totalPaidFromHistory = paymentHistory.reduce((sum, p) => sum + toNumber(p.amount || 0), 0);
          const totalAllocatedToServices = finalServices.reduce((sum, s) => sum + toNumber(s.amountPaid || 0), 0);
          const bookingPaidAmount = bookingServices.length > 0
            ? Math.min(totalAllocatedToServices, bookingTotalValue)
            : Math.min(totalPaidFromHistory || toNumber(booking.paidAmount || 0), bookingTotalValue);

          const enrichedBooking = {
            ...booking,
            services: finalServices,
            totalValue: bookingTotalValue,
            paidAmount: bookingPaidAmount,
            unallocatedCredit: 0
          };

          groups[clientId].totalValue += bookingTotalValue;
          groups[clientId].paidAmount += bookingPaidAmount;
          groups[clientId].dueAmount += Math.max(0, bookingTotalValue - bookingPaidAmount);
          groups[clientId].bookings.push(enrichedBooking);
          
          if (bookingServices.length > 0) {
            finalServices.forEach((service, serviceIndex) => {
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
    
    // Handle Firestore Timestamp objects
    const dateValue = dateStr?.toDate?.() || dateStr;
    const date = new Date(dateValue);
    
    // Check for invalid date
    if (isNaN(date.getTime())) {
  // console.warn('Invalid date encountered:', dateStr); // Removed for production
      return ''; // Return empty string instead of "Invalid Date"
    }
    
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
    }, type === 'error' ? 5000 : 3000);
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
    const splitUpcoming = timeFilter === 'upcoming';
    
    // Custom date filter function
    const getBookingsForDateRange = (client) => {
      if (!dateFilterStart && !dateFilterEnd) return client.bookings || [];
      
      const startDate = dateFilterStart ? new Date(dateFilterStart) : null;
      const endDate = dateFilterEnd ? new Date(dateFilterEnd) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999); // Include the entire end day
      
      return (client.bookings || []).filter(booking => {
        const checkIn = normalizeDateValue(booking.checkIn);
        const checkOut = normalizeDateValue(booking.checkOut);
        if (!checkIn) return false;
        
        // Check if booking overlaps with the date range
        // Booking overlaps if: checkIn <= endDate AND checkOut >= startDate
        const bookingStart = checkIn;
        const bookingEnd = checkOut || checkIn;
        
        if (startDate && endDate) {
          return bookingStart <= endDate && bookingEnd >= startDate;
        } else if (startDate) {
          return bookingEnd >= startDate;
        } else if (endDate) {
          return bookingStart <= endDate;
        }
        return true;
      });
    };
    
    const getBookingsForFilter = (client) => {
      // If custom date filter is active, use date range filter
      if (timeFilter === 'custom') {
        return getBookingsForDateRange(client);
      }
      // Otherwise use standard time bucket filter
      return (client.bookings || []).filter(
        (booking) => getBookingTimeBucket(booking, today) === timeFilter
      );
    };
    
    const buildFilteredClient = (client, bookingsForFilter) => {
      const filteredServices = [];
      bookingsForFilter.forEach(booking => {
        if (Array.isArray(booking.services)) {
          booking.services.forEach(service => {
            filteredServices.push({ ...service, bookingId: booking.id });
          });
        }
      });

      const totalValue = bookingsForFilter.reduce((sum, booking) => sum + (booking.totalValue || 0), 0);
      const paidAmount = bookingsForFilter.reduce((sum, booking) => sum + (booking.paidAmount || 0), 0);
      const dueAmount = Math.max(0, totalValue - paidAmount);
      const paymentStatus = totalValue > 0
        ? (paidAmount >= totalValue ? 'paid' : (paidAmount > 0 ? 'partiallyPaid' : 'notPaid'))
        : (client.paymentStatus || 'notPaid');

      const lastActivity = bookingsForFilter.reduce((latest, booking) => {
        const candidate = booking.lastPaymentDate?.toDate?.() || booking.lastPaymentDate || booking.createdAt || booking.checkIn;
        if (!candidate) return latest;
        const candidateDate = new Date(candidate);
        if (!latest || candidateDate > latest) return candidateDate;
        return latest;
      }, null);

      return {
        ...client,
        bookings: bookingsForFilter,
        services: filteredServices,
        totalValue,
        paidAmount,
        dueAmount,
        paymentStatus,
        lastActivity: lastActivity || client.lastActivity
      };
    };

    const results = [];

    Object.values(clientGroups).forEach(client => {
      const bookingsForFilter = getBookingsForFilter(client);
      if (bookingsForFilter.length === 0) return;

      const addFilteredClient = (filteredClient) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          // Check if client name matches
          const nameMatch = safeRender(filteredClient.clientName).toLowerCase().includes(query);
          // Check if any booking details match
          const bookingMatch = filteredClient.bookings.some(booking =>
            (booking.accommodationType && safeRender(booking.accommodationType).toLowerCase().includes(query)) ||
            (booking.status && booking.status.toLowerCase().includes(query))
          );
          // Check if any service details match
          const serviceMatch = filteredClient.services.some(service =>
            (service.name && safeRender(service.name).toLowerCase().includes(query)) ||
            (service.type && safeRender(service.type).toLowerCase().includes(query))
          );

          if (!nameMatch && !bookingMatch && !serviceMatch) return;
        }
        results.push(filteredClient);
      };

      if (splitUpcoming) {
        bookingsForFilter.forEach((booking, bookingIdx) => {
          const singleClient = buildFilteredClient(client, [booking]);
          singleClient.clientId = `${client.clientId}-${booking.id || bookingIdx}`;
          singleClient.baseClientId = client.clientId;
          singleClient.focusBookingId = booking.id || null;
          addFilteredClient(singleClient);
        });
      } else {
        const filteredClient = buildFilteredClient(client, bookingsForFilter);
        addFilteredClient(filteredClient);
      }
    });

    return results
      .sort((a, b) => {
        // Sort by selected option
        if (sortOption === 'date') {
          const getEarliestDate = (client) => {
            if (!client.bookings.length) return new Date(9999, 11, 31);
            return client.bookings.reduce((earliest, booking) => {
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
  const allowedContent = ['client-details','quick-payment','edit-payment','add-service','edit-service','add-shopping', 'edit-booking'];
  if (!allowedContent.includes(content)) {
  // console.warn('Attempted to open unsupported bottom sheet content:', content); // Removed for production
    return;
  }
  document.body.style.overflow = 'hidden';
  // console.log('showBottomSheetWithContent called with:', { content, item: item ? { clientId: item.clientId, clientName: item.clientName } : null, secondaryItem });
  
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
  
  // Clear any previous service form errors when opening add-service
  if (content === 'add-service') {
    setServiceFormError('');
  }
  
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
    const startDate = secondaryItem?.startDate || secondaryItem?.date || '';
    const endDate = secondaryItem?.endDate || secondaryItem?.startDate || secondaryItem?.date || '';
    setEditServiceDates({ startDate, endDate });
    setIsEditingServiceDates(false);
  } else if (content === 'edit-booking') {
    setSelectedBookingToEdit(secondaryItem);
    setEditBookingDates({
      checkIn: secondaryItem?.checkIn || '',
      checkOut: secondaryItem?.checkOut || ''
    });
  }
  
  // Show the modal
  setShowBottomSheet(true);
  
  // console.log('Bottom sheet state updated:', { content, showBottomSheet: true, selectedItemName: item?.clientName });
};

// 2. FIXED: Close function (around line 790)
const closeBottomSheet = () => {
  // console.log('Closing bottom sheet'); // Removed for production
  setShowBottomSheet(false);
  document.body.style.overflow = '';
  setTimeout(() => {
    setBottomSheetContent(null);
    setSelectedItem(null);
    setSelectedPayment(null);
    setSelectedService(null);
    setIsEditingServiceDates(false);
    setEditServiceDates({ startDate: '', endDate: '' });
    setPaymentTargetService(null);
    setPaymentData({
      amount: 0,
      method: 'cash',
      notes: '',
      receiptNumber: '',
      createdAt: new Date(),
      modifiedAt: new Date()
    });
  // console.log('Bottom sheet state cleared'); // Removed for production
  }, 300);
};

// 3. FIXED: Click handlers (around line 800)
const viewClientDetails = (clientOrId) => {
  // console.log('viewClientDetails called with:', clientOrId); // Removed for production
  const client = typeof clientOrId === 'string' ? clientGroups[clientOrId] : clientOrId;
  // console.log('Found client:', client); // Removed for production
  if (client) {
    const bookingIds = (client.bookings || []).map((b) => b?.id).filter(Boolean);
    const paymentHistory = Array.isArray(client.paymentHistory)
      ? client.paymentHistory.filter((payment) => {
          if (!bookingIds.length) return true;
          if (!payment.bookingId) return true;
          return bookingIds.includes(payment.bookingId);
        })
      : client.paymentHistory;
    showBottomSheetWithContent('client-details', { ...client, paymentHistory });
  } else {
    console.error('Client not found for ID:', clientOrId);
  }
};

const openPaymentModal = (client, service = null) => {
  // console.log('openPaymentModal called with client:', client, 'service:', service); // Removed for production
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
  // console.log('openEditPaymentModal called with:', { client, payment }); // Removed for production
  if (client && payment) {
    showBottomSheetWithContent('edit-payment', client, payment);
  } else {
    console.error('Missing client or payment data');
  }
};

const openAddServiceModal = (client) => {
  // console.log('openAddServiceModal called with client:', client); // Removed for production
  if (client) {
    if (isPastBookingList(client.bookings) || timeFilter === 'past' || !hasUnlockedBooking(client.bookings)) {
      return;
    }
    showBottomSheetWithContent('add-service', client);
  } else {
    console.error('No client provided to openAddServiceModal');
  }
};

const openEditServiceModal = (client, service) => {
  // console.log('openEditServiceModal called with:', { client, service }); // Removed for production
  if (client && service) {
    showBottomSheetWithContent('edit-service', client, service);
  } else {
    console.error('Missing client or service data');
  }
};

const openEditBookingModal = (client, booking) => {
  // console.log('openEditBookingModal called with:', { client, booking }); // Removed for production
  if (client && booking) {
    showBottomSheetWithContent('edit-booking', client, booking);
  } else {
    console.error('Missing client or booking data');
  }
};

const handleUpdateBookingDates = async () => {
  if (!selectedBookingToEdit || !selectedItem) return;
  
  try {
    showNotificationMessage(t.updatingBooking || 'Updating booking...');
    
    const bookingRef = doc(db, 'reservations', selectedBookingToEdit.id);
    await updateDoc(bookingRef, {
      checkIn: editBookingDates.checkIn,
      checkOut: editBookingDates.checkOut,
      updatedAt: serverTimestamp()
    });
    
    // Update local state: bookings
    setBookings(prev => prev.map(b => {
      if (b.id === selectedBookingToEdit.id) {
        return { ...b, checkIn: editBookingDates.checkIn, checkOut: editBookingDates.checkOut };
      }
      return b;
    }));
    
    // Update local state: clientGroups
    setClientGroups(prev => {
      const clientId = selectedItem.clientId;
      if (!prev[clientId]) return prev;
      
      const updatedGroup = { ...prev[clientId] };
      updatedGroup.bookings = updatedGroup.bookings.map(b => {
        if (b.id === selectedBookingToEdit.id) {
          return { ...b, checkIn: editBookingDates.checkIn, checkOut: editBookingDates.checkOut };
        }
        return b;
      });
      
      return { ...prev, [clientId]: updatedGroup };
    });
    
    // Update local state: selectedItem (modal)
    setSelectedItem(prev => {
      if (!prev) return null;
      return {
        ...prev,
        bookings: prev.bookings.map(b => {
          if (b.id === selectedBookingToEdit.id) {
            return { ...b, checkIn: editBookingDates.checkIn, checkOut: editBookingDates.checkOut };
          }
          return b;
        })
      };
    });
    
    showNotificationMessage(t.bookingUpdatedSuccess || 'Booking updated successfully');
    setBottomSheetContent('client-details'); // Go back to details
  } catch (err) {
    console.error('Error updating booking:', err);
    showNotificationMessage('Failed to update booking', 'error');
  }
};

const handleUpdateServiceDates = async () => {
  if (!selectedItem || !selectedService) return;

  const startDate = editServiceDates.startDate || selectedService.startDate || selectedService.date || '';
  const endDate = editServiceDates.endDate || editServiceDates.startDate || selectedService.endDate || selectedService.startDate || selectedService.date || '';

  if (!startDate || !endDate) {
    showNotificationMessage(t.serviceDatesRequired || 'Select service dates', 'error');
    return;
  }

  const resolveServiceBooking = () => {
    if (selectedService.bookingId) {
      return selectedItem.bookings?.find(b => b.id === selectedService.bookingId) || null;
    }
    return (selectedItem.bookings || []).find(b => Array.isArray(b.services) && b.services.some(s => {
      if (s?.id && selectedService?.id) return s.id === selectedService.id;
      return s?.name === selectedService?.name && s?.price === selectedService?.price && s?.quantity === selectedService?.quantity;
    })) || null;
  };

  const booking = resolveServiceBooking();
  if (!booking) {
    showNotificationMessage(t.bookingNotFound || 'Booking not found', 'error');
    return;
  }

  try {
    showNotificationMessage(t.updatingBooking || 'Updating booking...');

    const bookingRef = doc(db, 'reservations', booking.id);
    const bookingDoc = await getDoc(bookingRef);
    if (!bookingDoc.exists()) {
      throw new Error(t.bookingNotFound || 'Booking not found');
    }

    const bookingData = bookingDoc.data();
    if (bookingData.companyId !== userCompanyId) {
      throw new Error(t.notAuthorizedToModify || 'You are not authorized to modify this booking');
    }

  const parseDate = (value) => {
    if (!value) return null;
    const raw = value?.toDate?.() || value;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  const checkIn = parseDate(bookingData.checkIn);
  const checkOut = parseDate(bookingData.checkOut || bookingData.checkIn);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const isAccommodationService = ['villas', 'villa', 'accommodation'].includes(
    String(selectedService?.category || selectedService?.type || '').toLowerCase()
  );

  if (start && end && start > end) {
    showNotificationMessage(t.serviceDatesInvalid || 'End date must be after start date', 'error');
    return;
  }

  if (!isAccommodationService && checkIn && checkOut && start && end && (start < checkIn || end > checkOut)) {
    showNotificationMessage(t.serviceOutsideBooking || 'Service dates must stay within the booking period.', 'error');
    return;
  }

    const services = Array.isArray(bookingData.services) ? bookingData.services : [];
    let didUpdate = false;
    const updatedServices = services.map(svc => {
      const matchesId = svc?.id && selectedService?.id && svc.id === selectedService.id;
      const svcCreatedAt = svc?.createdAt?.toDate?.() || svc?.createdAt;
      const targetCreatedAt = selectedService?.createdAt?.toDate?.() || selectedService?.createdAt;
      const matchesFallback = !matchesId &&
        svc?.name === selectedService?.name &&
        svc?.price === selectedService?.price &&
        svc?.quantity === selectedService?.quantity &&
        (!svcCreatedAt || !targetCreatedAt || Math.abs(new Date(svcCreatedAt).getTime() - new Date(targetCreatedAt).getTime()) < 1000);

      if (!matchesId && !matchesFallback) return svc;

      didUpdate = true;
      return {
        ...svc,
        startDate,
        endDate,
        date: startDate
      };
    });

    if (!didUpdate) {
      throw new Error(t.serviceNotFound || 'Service not found in booking');
    }

  const bookingDateUpdates = isAccommodationService
    ? { checkIn: startDate, checkOut: endDate }
    : {};
  await updateDoc(bookingRef, {
    services: updatedServices,
    ...bookingDateUpdates,
    updatedAt: serverTimestamp()
  });

  setBookings(prev => prev.map(b => (
    b.id === booking.id ? { ...b, services: updatedServices, ...bookingDateUpdates } : b
  )));

    setClientGroups(prev => {
      const clientId = selectedItem.clientId;
      if (!prev[clientId]) return prev;
      const updatedGroup = { ...prev[clientId] };
  updatedGroup.bookings = updatedGroup.bookings.map(b => (
    b.id === booking.id ? { ...b, services: updatedServices, ...bookingDateUpdates } : b
  ));
      const allServices = [];
      updatedGroup.bookings.forEach(b => {
        if (Array.isArray(b.services)) {
          b.services.forEach(s => allServices.push({ ...s, bookingId: b.id }));
        }
      });
      updatedGroup.services = allServices;
      return { ...prev, [clientId]: updatedGroup };
    });

    setSelectedItem(prev => {
      if (!prev || prev.clientId !== selectedItem.clientId) return prev;
  const updatedBookings = (prev.bookings || []).map(b => (
    b.id === booking.id ? { ...b, services: updatedServices, ...bookingDateUpdates } : b
  ));
      const updatedServicesList = (prev.services || []).map(svc => {
        const matches = svc?.id && selectedService?.id
          ? svc.id === selectedService.id
          : svc?.name === selectedService?.name && svc?.bookingId === selectedService?.bookingId;
        if (!matches) return svc;
        return { ...svc, startDate, endDate, date: startDate };
      });
      return {
        ...prev,
        bookings: updatedBookings,
        services: updatedServicesList
      };
    });

    setSelectedService(prev => prev ? { ...prev, startDate, endDate, date: startDate } : prev);
    setIsEditingServiceDates(false);
    showNotificationMessage(t.serviceDatesUpdatedSuccess || 'Service dates updated successfully');
  } catch (err) {
    console.error('Error updating service dates:', err);
    showNotificationMessage(t.serviceDateUpdateFailed || `Service date update failed: ${err.message}`, 'error');
  }
};

const openAddShoppingModal = (client) => {
  // console.log('openAddShoppingModal called with client:', client); // Removed for production
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
      {filteredClients.map(client => {
        const disableServiceActions =
          timeFilter === 'past' ||
          isPastBookingList(client.bookings) ||
          !hasUnlockedBooking(client.bookings);
        return (
          <ClientCard 
            key={client.clientId} 
            client={client} 
            timeFilter={timeFilter}
            disableServiceActions={disableServiceActions}
            onViewDetails={(clientData) => {
  // console.log('ClientCard onViewDetails called with:', clientData); // Removed for production
              viewClientDetails(clientData);
            }}
            onOpenService={(client) => {
  // console.log('ClientCard onOpenService called with:', client); // Removed for production
              openAddServiceModal(client);
            }}
            onOpenShopping={(client) => {
  // console.log('ClientCard onOpenShopping called with:', client); // Removed for production
              openAddShoppingModal(client);
            }}
          />
        );
      })}
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
            {bottomSheetContent === 'edit-booking' && (t.editBooking || 'Edit Booking')}
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
        {bottomSheetContent === 'client-details' && selectedItem && (() => {
          const disableAddService =
            timeFilter === 'past' ||
            isPastBookingList(selectedItem.bookings) ||
            !hasUnlockedBooking(selectedItem.bookings);

          return (
            <div className="p-4 bg-white space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">{safeRender(selectedItem.clientName)}</h2>
                <p className="text-gray-600">{t.totalValue || 'Total'}: {selectedItem.totalValue.toLocaleString()} €</p>
                <p className="text-gray-600">{t.amountDue || 'Due'}: {selectedItem.dueAmount.toLocaleString()} €</p>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusBadgeClass(selectedItem.paymentStatus)}`}>
                  {getPaymentStatusText(selectedItem.paymentStatus)}
                </div>
              </div>
              
              {!disableAddService && (
                <div className="pt-4 border-t">
                  <button 
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                    onClick={() => {
                      closeBottomSheet();
                      setTimeout(() => openAddServiceModal(selectedItem), 100);
                    }}
                  >
                    {t.addService || 'Add Service'}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        
        {/* PAYMENT FORM */}
        {(bottomSheetContent === 'quick-payment' || bottomSheetContent === 'edit-payment') && selectedItem && (
          <div className="p-4 bg-white space-y-4">
            {(() => {
              const paymentContext = getPaymentContext(selectedItem, paymentTargetService, selectedItem.paymentHistory || [], safeRender);
              const clientDue = Math.max(0, (selectedItem.totalValue || 0) - (selectedItem.paidAmount || 0));
              const maxDue = paymentTargetService ? paymentContext.due : clientDue;
              const isAlreadyFullyPaid = maxDue <= 0;
              
              return (
                <>
                  <div className="text-center border-b pb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {paymentTargetService ? (t.service || 'Service') : (t.client || 'Client')}:{' '}
                      {paymentTargetService ? safeRender(paymentTargetService.name) : safeRender(selectedItem.clientName)}
                    </h2>
                    
                    {isAlreadyFullyPaid ? (
                      <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-emerald-700 font-semibold text-lg flex items-center gap-2">
                          <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                          {t.alreadyFullyPaid || 'Already Fully Paid!'}
                        </p>
                        <p className="text-emerald-600 text-sm mt-1 ml-7">{t.noPaymentNeeded || 'No additional payment is needed for this booking.'}</p>
                      </div>
                    ) : (
                      <p className="text-rose-600 font-bold text-xl">
                        {t.amountDue || 'Due'}: {paymentContext.due.toLocaleString()} €
                      </p>
                    )}
                    
                    {paymentTargetService && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700">
                        <span>{t.client || 'Client'}:</span>
                        <span className="font-medium">{safeRender(selectedItem.clientName)}</span>
                      </div>
                    )}
                  </div>

                  {!isAlreadyFullyPaid && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentAmount || 'Payment Amount'} *</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={paymentData.amount || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              // Cap at client's due amount to prevent overpayment
                          setPaymentData({...paymentData, amount: Math.min(val, maxDue)});
                        }}
                            max={maxDue}
                            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                            placeholder="0.00"
                          />
                          <span className="absolute left-3 top-3 text-gray-500 font-medium">€</span>
                        </div>
                        {paymentData.amount > maxDue && (
                          <p className="text-amber-600 text-xs mt-1">⚠️ {t.maxPaymentWarning || 'Maximum payment is'} {maxDue.toLocaleString()} €</p>
                        )}
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
                          disabled={!paymentData.amount || paymentData.amount <= 0 || isProcessingPayment}
                          className="flex-2 py-3 btn-success disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none rounded-xl font-semibold"
                        >
                          {isProcessingPayment ? (t.processing || 'Processing...') : (t.completePayment || 'Complete Payment')}
                        </button>
                      </div>
                    </>
                  )}
                  
                  {isAlreadyFullyPaid && (
                    <div className="flex justify-center">
                      <button
                        onClick={closeBottomSheet}
                        className="py-3 px-8 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                      >
                        {t.close || 'Close'}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
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
              formError={serviceFormError}
              bookings={selectedItem.bookings || []}
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
  // console.log("Deleting booking:", booking.id, "for company:", userCompanyId); // Removed for production
      
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
        where('companyId', '==', userCompanyId),
        where('bookingId', '==', booking.id)
      );
      const financeDocs = await getDocs(financeQuery);
      
      if (!financeDocs.empty) {
  // console.log(`Deleting ${financeDocs.size} finance records for booking ${booking.id}`); // Removed for production
        const deletePromises = financeDocs.docs
          .filter(fDoc => fDoc.data()?.companyId === userCompanyId)
          .map(fDoc => deleteDoc(fDoc.ref));
        await Promise.all(deletePromises);
      }

      // 2. Delete associated category payments
      const categoryPaymentsQuery = query(
        collection(db, 'categoryPayments'),
        where('companyId', '==', userCompanyId),
        where('bookingId', '==', booking.id)
      );
      const categoryPaymentsDocs = await getDocs(categoryPaymentsQuery);
      
      if (!categoryPaymentsDocs.empty) {
        const deleteCategoryPaymentsPromises = categoryPaymentsDocs.docs
          .filter(cpDoc => cpDoc.data()?.companyId === userCompanyId)
          .map(cpDoc => deleteDoc(cpDoc.ref));
        await Promise.all(deleteCategoryPaymentsPromises);
      }

      // 3. Delete associated expenses
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('companyId', '==', userCompanyId),
        where('bookingId', '==', booking.id)
      );
      const expensesDocs = await getDocs(expensesQuery);
      
      if (!expensesDocs.empty) {
        const deleteExpensesPromises = expensesDocs.docs
          .filter(eDoc => eDoc.data()?.companyId === userCompanyId)
          .map(eDoc => deleteDoc(eDoc.ref));
        await Promise.all(deleteExpensesPromises);
      }

      // 3b. If booking has a collaborator, clean up payout records only if no other bookings remain
      if (bookingData.collaboratorId) {
        const collaboratorBookingsQuery = query(
          collection(db, 'reservations'),
          where('companyId', '==', userCompanyId),
          where('collaboratorId', '==', bookingData.collaboratorId)
        );
        const collaboratorBookingsSnapshot = await getDocs(collaboratorBookingsQuery);
        const hasOtherBookings = collaboratorBookingsSnapshot.docs.some(docSnap => docSnap.id !== booking.id);

        if (!hasOtherBookings) {
          // Delete financeRecords for this collaborator's payouts
          const collaboratorPayoutsQuery = query(
            collection(db, 'financeRecords'),
            where('companyId', '==', userCompanyId),
            where('collaboratorId', '==', bookingData.collaboratorId),
            where('serviceKey', '==', 'collaborator_payout')
          );
          const collaboratorPayoutsDocs = await getDocs(collaboratorPayoutsQuery);
          
          if (!collaboratorPayoutsDocs.empty) {
            const deleteCollaboratorPayoutsPromises = collaboratorPayoutsDocs.docs
              .filter(cpDoc => cpDoc.data()?.companyId === userCompanyId)
              .map(cpDoc => deleteDoc(cpDoc.ref));
            await Promise.all(deleteCollaboratorPayoutsPromises);
          }
          
          // Also reset the collaborator's payment data
          const collaboratorRef = doc(db, 'collaborators', bookingData.collaboratorId);
          const collaboratorDoc = await getDoc(collaboratorRef);
          if (collaboratorDoc.exists()) {
            await updateDoc(collaboratorRef, {
              payments: [],
              paidTotal: 0,
              scheduledTotal: 0
            });
          }
        }
      }

      // 4. Delete the booking document from Firestore
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
    
    // Show confirmation dialog - use safeRender for multilingual service names
    const serviceName = safeRender(service.name || service.type || 'service');
    if (!window.confirm(`${t.deleteServiceConfirm} "${serviceName}"?`)) {
      return false;
    }
    
    try {
  // console.log("Deleting service from booking:", service.bookingId); // Removed for production
      
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
      
      // 1. Prepare updated services and payment history
      const services = Array.isArray(bookingData.services) ? [...bookingData.services] : [];
      let serviceIndex = -1;
      
      // Better service identification
      if (service.id) {
        serviceIndex = services.findIndex(s => s.id === service.id);
      }
      
      if (serviceIndex === -1) {
        serviceIndex = services.findIndex(s => {
          const sCreatedAt = s.createdAt?.toDate?.() ? s.createdAt.toDate() : s.createdAt;
          const serviceCreatedAt = service.createdAt instanceof Date ? service.createdAt : new Date(service.createdAt);
          return s.name === service.name && 
                 ((sCreatedAt && serviceCreatedAt && Math.abs(new Date(sCreatedAt).getTime() - serviceCreatedAt.getTime()) < 1000) || 
                  (s.type === service.type && s.price === service.price && s.quantity === service.quantity));
        });
      }
      
      if (serviceIndex === -1) {
        throw new Error('Service not found in booking');
      }
      
      // Remove the service
      const deletedService = services.splice(serviceIndex, 1)[0];
      
      // 2. Also remove associated payments from history to prevent "phantom credit"
      const paymentHistory = Array.isArray(bookingData.paymentHistory) 
        ? bookingData.paymentHistory.filter(p => p.serviceId !== service.id)
        : [];
        
      // 3. Recalculate totals and use Rocket Science Allocation for remaining services
      let newTotal = 0;
      services.forEach(s => {
        newTotal += (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
      });
      
      const newPaidAmount = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      // STRICT ID-ONLY matching for services - NO name matching (services can share names!)
      let remainingPaymentsForAllocation = [...paymentHistory];
      const servicesWithExplicitPayments = services.map(s => {
        const sId = s.id || null;
        const sTotal = (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
        
        let sPaid = 0;
        remainingPaymentsForAllocation = remainingPaymentsForAllocation.filter(p => {
          // ONLY match by exact service ID
          if (sId && p.serviceId && p.serviceId === sId) {
            sPaid += parseFloat(p.amount || 0);
            return false;
          }
          return true;
        });
        return { ...s, amountPaid: sPaid, sTotal };
      });

      // Pass 3: Auto-allocation of Surplus
      let surplusMoney = remainingPaymentsForAllocation.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const updatedServices = servicesWithExplicitPayments.map(svc => {
        const currentDue = Math.max(0, svc.sTotal - svc.amountPaid);
        let autoAllocated = 0;
        if (surplusMoney > 0 && currentDue > 0) {
          autoAllocated = Math.min(surplusMoney, currentDue);
          surplusMoney -= autoAllocated;
        }
        const finalPaid = svc.amountPaid + autoAllocated;
        return {
          ...svc,
          amountPaid: finalPaid,
          paymentStatus: finalPaid >= svc.sTotal && svc.sTotal > 0 ? 'paid' : (finalPaid > 0 ? 'partiallyPaid' : 'unpaid')
        };
      });
      
      let newPaymentStatus = 'notPaid';
      if (newPaidAmount >= newTotal && newTotal > 0) newPaymentStatus = 'paid';
      else if (newPaidAmount > 0) newPaymentStatus = 'partiallyPaid';
      
      // 4. Update booking in Firestore
      await updateDoc(bookingRef, {
        services: updatedServices,
        paymentHistory,
        totalValue: newTotal,
        totalAmount: newTotal,
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
        updatedAt: serverTimestamp()
      });
      
  // console.log("Service and associated payments deleted, updating local state"); // Removed for production
      
      // Update local state: bookings
      setBookings(prev => {
        return prev.map(booking => {
          if (booking.id === service.bookingId) {
            return {
              ...booking,
              services,
              paymentHistory,
              totalValue: newTotal,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus
            };
          }
          return booking;
        });
      });
      
      // Update local state: clientGroups
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // Update the booking within the group
        updatedGroup.bookings = updatedGroup.bookings.map(b => {
          if (b.id === service.bookingId) {
            return {
              ...b,
              services,
              paymentHistory,
              totalValue: newTotal,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus
            };
          }
          return b;
        });
        
        // Remove from flattened services
        updatedGroup.services = updatedGroup.services.filter(s => {
          if (s.id && service.id) return s.id !== service.id;
          return s.name !== service.name || s.bookingId !== service.bookingId;
        });
        
        // Update group payment history
        updatedGroup.paymentHistory = Array.isArray(updatedGroup.paymentHistory)
          ? updatedGroup.paymentHistory.filter(p => p.serviceId !== service.id || p.bookingId !== service.bookingId)
          : [];
          
        // Recalculate group totals
        let totalVal = 0;
        let totalPaid = 0;
        updatedGroup.bookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        updatedGroup.totalValue = totalVal;
        updatedGroup.paidAmount = totalPaid;
        updatedGroup.dueAmount = Math.max(0, totalVal - totalPaid);
        updatedGroup.paymentStatus = totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid');
        
        return { ...prev, [clientId]: updatedGroup };
      });

      // Update local state: selectedItem (modal + progress bar)
      setSelectedItem(prev => {
        if (!prev || prev.clientId !== client.clientId) return prev;
        
        const updatedServices = (prev.services || []).filter(s => {
          if (s.id && service.id) return s.id !== service.id;
          return s.name !== service.name || s.bookingId !== service.bookingId;
        });
        
        const updatedPaymentHistory = (prev.paymentHistory || []).filter(p => {
          return p.serviceId !== service.id || p.bookingId !== service.bookingId;
        });

        // Also update the specific booking inside selectedItem
        const updatedBookings = (prev.bookings || []).map(b => {
          if (b.id === service.bookingId) {
            return {
              ...b,
              services: services,
              paymentHistory: paymentHistory,
              totalValue: newTotal,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus
            };
          }
          return b;
        });
        
        // RECALCULATE TOTALS FROM BOOKINGS (Source of Truth)
        let totalVal = 0;
        let totalPaid = 0;
        updatedBookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        return {
          ...prev,
          bookings: updatedBookings,
          services: updatedServices,
          paymentHistory: updatedPaymentHistory,
          totalValue: totalVal,
          paidAmount: totalPaid,
          dueAmount: Math.max(0, totalVal - totalPaid),
          paymentStatus: totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid')
        };
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
  // console.log("Adding shopping expense to booking:", targetBooking.id); // Removed for production
      
      const bookingRef = doc(db, 'reservations', targetBooking.id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error(t.bookingNotFound || 'Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      
      if (bookingData.companyId !== userCompanyId) {
        throw new Error(t.notAuthorizedToModify || 'You are not authorized to modify this booking');
      }
      
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
      
      const newService = {
        ...shoppingExpense,
        receiptAttachment: sanitizedReceipt,
        id: 'shopping_' + Date.now(),
        createdAt: currentDate,
        totalValue: parseFloat(shoppingExpense.price || 0) * parseInt(shoppingExpense.quantity || 1),
        paymentStatus: shoppingExpense.paymentStatus || 'unpaid',
        amountPaid: parseFloat(shoppingExpense.amountPaid || 0)
      };
      
      // 1. Prepare updated collections
      const services = Array.isArray(bookingData.services) ? [...bookingData.services, newService] : [newService];
      const paymentHistory = Array.isArray(bookingData.paymentHistory) ? [...bookingData.paymentHistory] : [];
      
      // 2. Add payment record if the expense was pre-paid
      if (newService.amountPaid > 0) {
        paymentHistory.push({
          id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          amount: newService.amountPaid,
          method: 'cash',
          notes: `Initial payment for ${newService.name}`,
          serviceId: newService.id,
          serviceName: newService.name,
          bookingId: targetBooking.id,
          date: currentDate,
          createdAt: currentDate,
          createdBy: auth.currentUser?.uid || 'unknown',
          companyId: userCompanyId
        });
      }

      // 3. STRICT RECALCULATION FROM ARRAYS
      const newTotal = services.reduce((sum, s) => sum + (parseFloat(s.price || 0) * parseInt(s.quantity || 1)), 0);
      const newPaidAmount = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      let newPaymentStatus = 'notPaid';
      if (newPaidAmount >= newTotal && newTotal > 0) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partiallyPaid';
      }

      // Update Firestore
      await updateDoc(bookingRef, {
        services: services,
        paymentHistory: paymentHistory,
        totalValue: newTotal,
        totalAmount: newTotal,
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state: bookings
      setBookings(prev => prev.map(booking => {
        if (booking.id === targetBooking.id) {
          return {
            ...booking,
            services,
            paymentHistory,
            totalValue: newTotal,
            paidAmount: newPaidAmount,
            paymentStatus: newPaymentStatus
          };
        }
        return booking;
      }));
      
      // Update local state: clientGroups
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // Update the booking within the group
        updatedGroup.bookings = updatedGroup.bookings.map(b => {
          if (b.id === targetBooking.id) {
            return {
              ...b,
              services,
              paymentHistory,
              totalValue: newTotal,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus
            };
          }
          return b;
        });
        
        // Refresh flattened services and history
        const allServices = [];
        const allPayments = [];
        updatedGroup.bookings.forEach(b => {
          if (Array.isArray(b.services)) b.services.forEach(s => allServices.push({ ...s, bookingId: b.id }));
          if (Array.isArray(b.paymentHistory)) b.paymentHistory.forEach(p => allPayments.push({ ...p, bookingId: b.id }));
        });
        
        updatedGroup.services = allServices;
        updatedGroup.paymentHistory = allPayments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        
        // Recalculate group totals
        let totalVal = 0;
        let totalPaid = 0;
        updatedGroup.bookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        updatedGroup.totalValue = totalVal;
        updatedGroup.paidAmount = totalPaid;
        updatedGroup.dueAmount = Math.max(0, totalVal - totalPaid);
        updatedGroup.paymentStatus = totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid');
        
        updatedGroup.lastActivity = new Date();
        return { ...prev, [clientId]: updatedGroup };
      });

      // Update local state: selectedItem (modal + progress bar)
      setSelectedItem(prev => {
        if (!prev || prev.clientId !== client.clientId) return prev;
        
        const updatedServices = [...(prev.services || []), { ...newService, bookingId: targetBooking.id }];
        const updatedHistory = newService.amountPaid > 0 
          ? [{ ...paymentHistory[paymentHistory.length - 1], bookingId: targetBooking.id }, ...(prev.paymentHistory || [])]
          : (prev.paymentHistory || []);

        // Also update the specific booking inside selectedItem
        const updatedBookings = (prev.bookings || []).map(b => {
          if (b.id === targetBooking.id) {
            return {
              ...b,
              services,
              paymentHistory,
              totalValue: newTotal,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus
            };
          }
          return b;
        });
          
        // RECALCULATE TOTALS FROM BOOKINGS (Source of Truth)
        let totalVal = 0;
        let totalPaid = 0;
        updatedBookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        return {
          ...prev,
          bookings: updatedBookings,
          services: updatedServices,
          paymentHistory: updatedHistory,
          totalValue: totalVal,
          paidAmount: totalPaid,
          dueAmount: Math.max(0, totalVal - totalPaid),
          paymentStatus: totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid')
        };
      });
      
  // console.log('Successfully added shopping expense to booking:', targetBooking.id); // Removed for production
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

    const isWithinBooking = (service, booking) => {
      if (!service || !booking) return true;
      const checkIn = booking.checkIn ? new Date(booking.checkIn) : null;
      const checkOut = booking.checkOut ? new Date(booking.checkOut) : null;
      if (!checkIn || !checkOut) return true;
      const start = new Date(service.startDate || service.date);
      const end = new Date(service.endDate || service.startDate || service.date || start);
      if (Number.isNaN(start) || Number.isNaN(end)) return true;
      [start, end, checkIn, checkOut].forEach(d => d.setHours(0, 0, 0, 0));
      return start >= checkIn && end <= checkOut;
    };
    
    // Find the target booking - use the one specified by the user, or fall back to most recent
    let targetBooking = null;
    if (client.bookings.length > 0) {
      // If service has a targetBookingId (user selected a specific booking), use that
      if (serviceData.targetBookingId) {
        targetBooking = client.bookings.find(b => b.id === serviceData.targetBookingId);
        if (!targetBooking) {
  // console.warn("Specified booking not found, falling back to most recent"); // Removed for production
        }
      }
      // Fall back to most recent booking if no specific booking was selected or found
      if (!targetBooking) {
        targetBooking = [...client.bookings].sort((a, b) => {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        })[0];
      }
    } else {
      showNotificationMessage(t.noBookingFound || "No booking found for this client", "error");
      return false;
    }
    
    try {
  // console.log("Adding service to booking:", targetBooking.id); // Removed for production
      
      const bookingRef = doc(db, 'reservations', targetBooking.id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error(t.bookingNotFound || 'Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      
      if (bookingData.companyId !== userCompanyId) {
        throw new Error(t.notAuthorizedToModify || 'You are not authorized to modify this booking');
      }

      // Guard: service dates must be within booking window
      if (!isWithinBooking(serviceData, bookingData)) {
        const msg = t.serviceOutsideBooking || 'Service dates must stay within the booking period.';
        setServiceFormError(msg);
        return false;
      }
      
      const currentDate = new Date();
      // CRITICAL: Always generate unique ID and include bookingId to prevent cross-booking issues
      const preparedService = {
        ...serviceData,
        id: serviceData.type + '_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
        bookingId: targetBooking.id, // Link service to specific booking
        createdAt: currentDate,
        companyId: userCompanyId,
        status: serviceData.status || 'confirmed',
        totalValue: parseFloat(serviceData.price) * parseInt(serviceData.quantity),
        paymentStatus: serviceData.paymentStatus || 'unpaid',
        amountPaid: parseFloat(serviceData.amountPaid || 0)
      };
      
      // 1. Prepare updated collections
      const services = Array.isArray(bookingData.services) ? [...bookingData.services, preparedService] : [preparedService];
      const paymentHistory = Array.isArray(bookingData.paymentHistory) ? [...bookingData.paymentHistory] : [];
      
      // 2. Add payment record if the new service was pre-paid
      if (preparedService.amountPaid > 0) {
        paymentHistory.push({
          id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          amount: preparedService.amountPaid,
          method: 'cash',
          notes: `Initial payment for ${preparedService.name}`,
          serviceId: preparedService.id,
          serviceName: preparedService.name,
          bookingId: targetBooking.id,
          date: currentDate,
          createdAt: currentDate,
          createdBy: auth.currentUser?.uid || 'unknown',
          companyId: userCompanyId
        });
      }

      // 3. STRICT RECALCULATION FROM ARRAYS (Source of Truth)
      const newTotal = services.reduce((sum, s) => sum + (parseFloat(s.price || 0) * parseInt(s.quantity || 1)), 0);
      const newPaidAmount = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      let newPaymentStatus = 'notPaid';
      if (newPaidAmount >= newTotal && newTotal > 0) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partiallyPaid';
      }
      
      // Update Firestore
      await updateDoc(bookingRef, {
        services: services,
        paymentHistory: paymentHistory,
        totalValue: newTotal,
        totalAmount: newTotal,
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state: bookings
      setBookings(prev => prev.map(booking => {
        if (booking.id === targetBooking.id) {
          return {
            ...booking,
            services,
            paymentHistory,
            totalValue: newTotal,
            paidAmount: newPaidAmount,
            paymentStatus: newPaymentStatus
          };
        }
        return booking;
      }));
      
      // Update local state: clientGroups
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // Update the booking within the group
        updatedGroup.bookings = updatedGroup.bookings.map(b => {
          if (b.id === targetBooking.id) {
            return {
              ...b,
              services,
              paymentHistory,
              totalValue: newTotal,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus
            };
          }
          return b;
        });
        
        // Refresh flattened services and history
        const allServices = [];
        const allPayments = [];
        updatedGroup.bookings.forEach(b => {
          if (Array.isArray(b.services)) b.services.forEach(s => allServices.push({ ...s, bookingId: b.id }));
          if (Array.isArray(b.paymentHistory)) b.paymentHistory.forEach(p => allPayments.push({ ...p, bookingId: b.id }));
        });
        
        updatedGroup.services = allServices;
        updatedGroup.paymentHistory = allPayments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        
        // Recalculate group totals
        let totalVal = 0;
        let totalPaid = 0;
        updatedGroup.bookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        updatedGroup.totalValue = totalVal;
        updatedGroup.paidAmount = totalPaid;
        updatedGroup.dueAmount = Math.max(0, totalVal - totalPaid);
        updatedGroup.paymentStatus = totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid');
        
        updatedGroup.lastActivity = new Date();
        return { ...prev, [clientId]: updatedGroup };
      });

      // Update local state: selectedItem (modal + progress bar)
      setSelectedItem(prev => {
        if (!prev || prev.clientId !== client.clientId) return prev;
        
        // Instead of incremental update, rebuild from the newly updated group/booking
        const updatedServices = [...(prev.services || []), { ...preparedService, bookingId: targetBooking.id }];
        const updatedHistory = preparedService.amountPaid > 0 
          ? [{ ...paymentHistory[paymentHistory.length - 1], bookingId: targetBooking.id }, ...(prev.paymentHistory || [])]
          : (prev.paymentHistory || []);

        // Also update the specific booking inside selectedItem
        const updatedBookings = (prev.bookings || []).map(b => {
          if (b.id === targetBooking.id) {
            return {
              ...b,
              services,
              paymentHistory,
              totalValue: newTotal,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus
            };
          }
          return b;
        });
          
        // RECALCULATE TOTALS FROM BOOKINGS (Source of Truth)
        let totalVal = 0;
        let totalPaid = 0;
        updatedBookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        return {
          ...prev,
          bookings: updatedBookings,
          services: updatedServices,
          paymentHistory: updatedHistory,
          totalValue: totalVal,
          paidAmount: totalPaid,
          dueAmount: Math.max(0, totalVal - totalPaid),
          paymentStatus: totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid')
        };
      });
      
  // console.log('Successfully added service to booking:', targetBooking.id); // Removed for production
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
    const success = await handleQuickServiceAdd(selectedItem, service);
    
    if (success) {
      setServiceFormError('');
      showNotificationMessage(t.serviceAddedSuccess || 'Service added successfully');
      closeBottomSheet();
    } else if (!success) {
      // keep modal open; any specific error should already be set
    }
  } catch (err) {
    console.error('Error adding service:', err);
    setServiceFormError(err.message || t.failedAddService || 'Failed to add service');
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
    
    // CRITICAL: Prevent double-click/double-submission
    if (isProcessingPayment) {
  // console.warn('⚠️ Payment already in progress, ignoring duplicate request'); // Removed for production
      return;
    }
    
    // CRITICAL: Check if booking is already fully paid or overpaid
    const clientTotalDue = Math.max(0, (client.totalValue || 0) - (client.paidAmount || 0));
    if (clientTotalDue <= 0) {
  // console.warn('⚠️ Client already fully paid, no payment needed'); // Removed for production
      showNotificationMessage(t.alreadyFullyPaid || 'This booking is already fully paid', 'warning');
      closeBottomSheet();
      return;
    }
    
    // Cap payment at what's actually due to prevent overpayment
    if (amount > clientTotalDue) {
  // console.log(`📝 Capping payment from ${amount}€ to ${clientTotalDue}€ (client's actual due)`); // Removed for production
      amount = clientTotalDue;
    }
    
    setIsProcessingPayment(true);
    
    // Find the specific service we're paying for
    const targetService = targetServiceOverride || paymentTargetService;
    
    // SAFETY CHECK: If paying for a specific service, verify it's not already fully paid
    if (targetService) {
      const serviceTotal = (parseFloat(targetService.price || 0) * parseInt(targetService.quantity || 1));
      const servicePaid = parseFloat(targetService.amountPaid || 0);
      const serviceDue = Math.max(0, serviceTotal - servicePaid);
      
      if (serviceDue <= 0 && serviceTotal > 0) {
  // console.warn('⚠️ Attempted to pay for already-paid service:', targetService.name); // Removed for production
        showNotificationMessage(t.serviceAlreadyPaid || 'This service is already fully paid', 'warning');
        setIsProcessingPayment(false); // Reset flag before returning
        return;
      }
      
      // Cap the payment at what's actually due
      if (amount > serviceDue && serviceDue > 0) {
  // console.log(`📝 Capping payment from ${amount} to ${serviceDue} (what's actually due)`); // Removed for production
        amount = serviceDue;
      }
    }
    
    // Find the correct booking to update - preferably from the service itself
    const targetBookingId = targetService?.bookingId || (client.bookings[0]?.id);
    const targetBooking = client.bookings.find(b => b.id === targetBookingId) || client.bookings[0];
    
    if (!targetBooking) {
      setIsProcessingPayment(false); // Reset flag before returning
      return;
    }
    
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
      
      const bookingTotal = bookingData.totalValue || 0;
      
      // Add payment to history
      const paymentHistory = Array.isArray(bookingData.paymentHistory) ? [...bookingData.paymentHistory] : [];
      paymentHistory.push(payment);
      
      const newPaidAmount = paymentHistory.reduce((sum, p) => sum + toNumber(p.amount || 0), 0);
      
      // Determine new payment status for the booking
      let newPaymentStatus = 'notPaid';
      if (newPaidAmount >= bookingTotal && bookingTotal > 0) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partiallyPaid';
      }
      
      // 3. Update Services with Rocket Science Allocation
      const services = Array.isArray(bookingData.services) ? [...bookingData.services] : [];
      let remainingPayments = [...paymentHistory];
      
      // STRICT ID + BOOKING matching - NO name matching (services can share names!)
      const servicesWithExplicitPayments = services.map(s => {
        const sId = s.id || null;
        const sTotal = (parseFloat(s.price || 0) * parseInt(s.quantity || 1));
        
        let sPaid = 0;
        remainingPayments = remainingPayments.filter(p => {
          // Match by serviceId AND ensure payment belongs to this booking
          const matchesServiceId = sId && p.serviceId && p.serviceId === sId;
          const matchesBooking = !p.bookingId || p.bookingId === targetBooking.id;
          
          if (matchesServiceId && matchesBooking) {
            sPaid += parseFloat(p.amount || 0);
            return false; // Remove from pool so it's not double-counted
          }
          return true;
        });
        
        return { ...s, amountPaid: sPaid, sTotal };
      });

      // Pass 3: Auto-allocation of Surplus
      let surplusMoney = remainingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const updatedServices = servicesWithExplicitPayments.map(svc => {
        const currentDue = Math.max(0, svc.sTotal - svc.amountPaid);
        let autoAllocated = 0;
        if (surplusMoney > 0 && currentDue > 0) {
          autoAllocated = Math.min(surplusMoney, currentDue);
          surplusMoney -= autoAllocated;
        }
        const finalPaid = svc.amountPaid + autoAllocated;
        return {
          ...svc,
          amountPaid: finalPaid,
          paymentStatus: finalPaid >= svc.sTotal && svc.sTotal > 0 ? 'paid' : (finalPaid > 0 ? 'partiallyPaid' : 'unpaid')
        };
      });

      // Update Firestore
      await updateDoc(bookingRef, {
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
        lastPaymentDate: serverTimestamp(),
        lastPaymentMethod: payment.method,
        paymentHistory,
        services: updatedServices
      });
      
      // 4. Update local state: bookings
      // CRITICAL FIX: Use the prepared paymentHistory, NOT spread + add (which causes duplicates)
      setBookings(prev => {
        return prev.map(booking => {
          if (booking.id === targetBooking.id) {
            return {
              ...booking,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus,
              lastPaymentDate: new Date(),
              lastPaymentMethod: payment.method,
              paymentHistory: paymentHistory, // Use the prepared array, not [...old, payment]
              services: updatedServices
            };
          }
          return booking;
        });
      });
      
      // 5. Update local state: clientGroups
      setClientGroups(prev => {
        const clientId = targetBooking.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // Update the booking within the group
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
        
        // Update the flattened services array for the group
        updatedGroup.services = updatedGroup.services.map(s => {
          if (s.bookingId === targetBooking.id) {
            const updated = updatedServices.find(us => {
              if (s.id && us.id) return s.id === us.id;
              return s.name === us.name && s.type === us.type && s.price === us.price;
            });
            return updated ? { ...updated, bookingId: targetBooking.id } : s;
          }
          return s;
        });
        
        // Recalculate group totals
        let totalVal = 0;
        let totalPaid = 0;
        updatedGroup.bookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });
        
        updatedGroup.totalValue = totalVal;
        updatedGroup.paidAmount = totalPaid;
        updatedGroup.dueAmount = Math.max(0, totalVal - totalPaid);
        updatedGroup.paymentStatus = totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid');
        
        // Update group payment history
        updatedGroup.paymentHistory = [
          { ...payment, bookingId: targetBooking.id },
          ...(updatedGroup.paymentHistory || [])
        ];
        
        updatedGroup.lastActivity = new Date();
        return { ...prev, [clientId]: updatedGroup };
      });

      // 6. Update local state: selectedItem (modal + progress bar)
      setSelectedItem(prev => {
        if (!prev || prev.clientId !== targetBooking.clientId) return prev;
        
        // CRITICAL: Update the services array in the selectedItem so the UI reflects the payment
        const updatedItemServices = (prev.services || []).map(s => {
          if (s.bookingId === targetBooking.id) {
            const updated = updatedServices.find(us => {
              if (s.id && us.id) return s.id === us.id;
              return s.name === us.name && s.type === us.type && s.price === us.price;
            });
            return updated ? { ...updated, bookingId: targetBooking.id } : s;
          }
          return s;
        });

        const updatedItemBookings = (prev.bookings || []).map(b => {
          if (b.id === targetBooking.id) {
            return {
              ...b,
              paidAmount: newPaidAmount,
              paymentStatus: newPaymentStatus,
              services: updatedServices
            };
          }
          return b;
        });

        // RECALCULATE TOTALS FROM BOOKINGS (Source of Truth)
        let totalVal = 0;
        let totalPaid = 0;
        updatedItemBookings.forEach(b => {
          totalVal += b.totalValue || 0;
          totalPaid += b.paidAmount || 0;
        });

        return {
          ...prev,
          bookings: updatedItemBookings,
          services: updatedItemServices,
          paidAmount: totalPaid,
          dueAmount: Math.max(0, totalVal - totalPaid),
          paymentStatus: totalPaid >= totalVal && totalVal > 0 ? 'paid' : (totalPaid > 0 ? 'partiallyPaid' : 'notPaid'),
          lastPaymentDate: new Date(),
          paymentHistory: [{ ...payment, bookingId: targetBooking.id }, ...(prev.paymentHistory || [])]
        };
      });
      
      showNotificationMessage(t.paymentSuccess || 'Payment processed successfully');
      
      // CRITICAL: Close the modal immediately to prevent double-payments
      closeBottomSheet();
      
      // Reset payment form data
      setPaymentData({
        amount: 0,
        method: 'cash',
        notes: '',
        receiptNumber: '',
        createdAt: new Date(),
        modifiedAt: new Date()
      });
      setPaymentTargetService(null);
      
      // Reset processing flag after successful completion
      setIsProcessingPayment(false);
    } catch (err) {
      console.error('Error processing quick payment:', err);
      // Reset processing flag on error
      setIsProcessingPayment(false);
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
              onClick={() => {
                setTimeFilter(tab.id);
                setShowDateFilter(false);
              }}
            >
              <span className="booking-tab__icon">{renderTabIcon(tab.icon)}</span>
              <div>
                <p>{tab.label}</p>
                <small>{tab.count} {t.bookings}</small>
              </div>
            </button>
          ))}
          
          {/* Custom Date Filter Toggle Button */}
          <button
            className={`booking-tab ${timeFilter === 'custom' || showDateFilter ? 'booking-tab--active' : ''}`}
            onClick={() => {
              if (showDateFilter) {
                // If already showing, hide it and go back to active
                setShowDateFilter(false);
                if (timeFilter === 'custom' && !dateFilterStart && !dateFilterEnd) {
                  setTimeFilter('active');
                }
              } else {
                // Show the date filter
                setShowDateFilter(true);
                if (dateFilterStart || dateFilterEnd) {
                  setTimeFilter('custom');
                }
              }
            }}
          >
            <span className="booking-tab__icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                {showDateFilter && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />}
              </svg>
            </span>
            <div>
              <p>{t.dateFilter}</p>
              <small>{showDateFilter ? (t.hideDateFilter) : (t.showDateFilter)}</small>
            </div>
          </button>
        </div>
        
        {/* Date Range Filter - Collapsible */}
        {showDateFilter && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                📅 {t.dateFilter}
              </h4>
              <button
                onClick={() => setShowDateFilter(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
                title={t.hideDateFilter}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.fromDate}
                </label>
                <input
                  type="date"
                  value={dateFilterStart}
                  onChange={(e) => {
                    setDateFilterStart(e.target.value);
                    setTimeFilter('custom');
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.toDate}
                </label>
                <input
                  type="date"
                  value={dateFilterEnd}
                  onChange={(e) => {
                    setDateFilterEnd(e.target.value);
                    setTimeFilter('custom');
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDateFilterStart(today);
                    setDateFilterEnd(today);
                    setTimeFilter('custom');
                  }}
                  className="px-3 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t.today}
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
                    setDateFilterStart(startOfWeek.toISOString().split('T')[0]);
                    setDateFilterEnd(endOfWeek.toISOString().split('T')[0]);
                    setTimeFilter('custom');
                  }}
                  className="px-3 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t.thisWeek}
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    setDateFilterStart(startOfMonth.toISOString().split('T')[0]);
                    setDateFilterEnd(endOfMonth.toISOString().split('T')[0]);
                    setTimeFilter('custom');
                  }}
                  className="px-3 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t.thisMonth}
                </button>
                {(dateFilterStart || dateFilterEnd) && (
                  <button
                    onClick={() => {
                      setDateFilterStart('');
                      setDateFilterEnd('');
                      setTimeFilter('active');
                    }}
                    className="px-3 py-2.5 text-sm bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors font-medium"
                  >
                    {t.clearFilter}
                  </button>
                )}
              </div>
            </div>
            
            {(dateFilterStart || dateFilterEnd) && (
              <div className="mt-3 text-sm text-blue-700 bg-blue-100 p-2 rounded">
                📅 {t.showingBookingsFrom}{' '}
                <strong>{dateFilterStart || '...'}</strong>{' '}
                {t.to}{' '}
                <strong>{dateFilterEnd || '...'}</strong>
              </div>
            )}
          </div>
        )}

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
            </div>
            
            {/* Bookings & Associated Services Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2 flex justify-between items-center">
                <span>{t.bookings || 'Bookings'} ({selectedItem.bookings.length})</span>
              </h3>
              
              {/* Sort bookings by check-in date (earliest first) for clear differentiation */}
              {[...selectedItem.bookings]
                .sort((a, b) => {
                  const today = getTodayStart();
                  const aInfo = getClientDetailsBookingSortInfo(a, today);
                  const bInfo = getClientDetailsBookingSortInfo(b, today);
                  if (aInfo.rank !== bInfo.rank) return aInfo.rank - bInfo.rank;
                  if (aInfo.rank === 1) return bInfo.checkIn.getTime() - aInfo.checkIn.getTime();
                  if (aInfo.rank === 3) return bInfo.checkOut.getTime() - aInfo.checkOut.getTime();
                  return aInfo.checkIn.getTime() - bInfo.checkIn.getTime();
                })
                .map((booking, idx) => (
                <div key={booking.id || idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Booking Header */}
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🏠</span>
                          <p className="font-bold text-gray-900">{safeRender(booking.accommodationType)}</p>
                        </div>
                        <p className="text-sm text-slate-700 font-semibold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-flex items-center gap-1 shadow-sm">
                          📅 {new Date(booking.checkIn).toLocaleDateString(language === 'en' ? 'en-GB' : 'ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })} → {new Date(booking.checkOut).toLocaleDateString(language === 'en' ? 'en-GB' : 'ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600 text-lg">{(booking.totalValue || 0).toLocaleString()} €</p>
                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </div>
                      </div>
                    </div>
                    
                  </div>
                  {(() => {
                    const rawNotes =
                      booking?.notes ??
                      booking?.specialNotes ??
                      booking?.specialRequests ??
                      booking?.reservationNotes ??
                      booking?.additionalNotes ??
                      booking?.note;
                    const notesText = safeRender(rawNotes || '').trim();
                    if (!notesText) return null;
                    return (
                      <div className="px-3 pt-2">
                        <div className="inline-flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                          <span className="mt-0.5 text-amber-500">📝</span>
                          <span className="leading-relaxed">
                            <span className="font-semibold">{t.notes || 'Notes'}:</span>{' '}
                            <span className="whitespace-pre-line">{notesText}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Services for THIS Booking */}
                  <div className="p-3 space-y-3 bg-white">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16" />
                      </svg>
                      {t.serviceSchedule || 'Service Schedule'}
                    </h4>
                    
                    {(!booking.services || booking.services.length === 0) ? (
                      <p className="text-xs text-gray-400 italic py-2 text-center bg-gray-50 rounded border border-dashed border-gray-200">
                        {t.noAdditionalServices || 'No additional services for this booking'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {/* Sort services chronologically by startDate for timeline view */}
                        {[...booking.services]
                          .sort((a, b) => {
                            const dateA = new Date(a.startDate || a.date || 0);
                            const dateB = new Date(b.startDate || b.date || 0);
                            return dateA - dateB;
                          })
                          .map((service, sIdx) => {
                          const ctx = getPaymentContext(selectedItem, service, selectedItem.paymentHistory || [], safeRender);
                          const isPaidOut = ctx.due <= 0;
                          const { total, paid, due } = getServicePaymentInfo(service, selectedItem.paymentHistory || [], safeRender);
                          
                          const status = due <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
                          const statusStyles = status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : status === 'partial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200';
                          
                          const statusLabel = status === 'paid' ? (t.paid || 'Paid') : (status === 'partial' ? (t.partiallyPaid || 'Partially Paid') : (t.notPaid || 'Not Paid'));

                          // Check if service is today, tomorrow, or upcoming
                          const serviceStartDate = new Date(service.startDate || service.date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          serviceStartDate.setHours(0, 0, 0, 0);
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          
                          const isToday = serviceStartDate.getTime() === today.getTime();
                          const isTomorrow = serviceStartDate.getTime() === tomorrow.getTime();
                          const isPast = serviceStartDate < today;
                          const dateChipClass = 'bg-slate-50 border-slate-200 text-slate-700';
                          
                          // Determine card styling based on urgency - refined premium look
                          const urgencyBorder = isToday
                            ? 'border-l-2 border-l-slate-400 bg-white'
                            : isTomorrow
                              ? 'border-l-2 border-l-slate-300 bg-white'
                              : isPast
                                ? 'border-l-2 border-l-slate-200 bg-white opacity-80'
                                : 'border-l-2 border-l-slate-200 bg-white';

                          return (
                            <div key={sIdx} className={`p-3 border rounded-lg hover:bg-white hover:border-slate-300 transition-all ${urgencyBorder}`}>
                              {/* Urgency indicator badge */}
                              {(isToday || isTomorrow) && (
                                <div className="text-[10px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-slate-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  {isToday ? (t.today || 'Today') : (t.tomorrow || 'Tomorrow')}
                                </div>
                              )}
                              
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{safeRender(service.name)}</p>
                                  {/* Service Dates - Show date range if available */}
                                  <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${dateChipClass}`}>
                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16" />
                                    </svg>
                                    {service.startDate && service.endDate ? (
                                      <>
                                        <span>{formatShortDate(service.startDate)}</span>
                                        <span className="opacity-70">→</span>
                                        <span>{formatShortDate(service.endDate)}</span>
                                        {(() => {
                                          const start = new Date(service.startDate);
                                          const end = new Date(service.endDate);
                                          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                                          return days > 0 && (
                                            <span className="ml-1 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                                              {days === 1 ? '1 day' : `${days} days`}
                                            </span>
                                          );
                                        })()}
                                      </>
                                    ) : service.startDate ? (
                                      <span>{formatShortDate(service.startDate)}</span>
                                    ) : (
                                      <span>{formatShortDate(service.date)}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-900 text-sm">{total.toLocaleString()} €</p>
                                  <div className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusStyles} uppercase tracking-tighter`}>
                                    {statusLabel}
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-between items-center text-[10px] border-t border-gray-100 pt-2 mt-2 text-slate-500">
                                <span>{t.paid || 'Paid'}: <span className="text-slate-700 font-semibold">{paid.toLocaleString()} €</span></span>
                                <span className={due <= 0 ? 'text-slate-500' : 'text-rose-600 font-semibold'}>
                                  {t.amountDue || 'Due'}: {due.toLocaleString()} €
                                </span>
                              </div>

                              {/* Service Actions */}
                              <div className="flex gap-1.5 mt-3">
                                <button
                                  className="p-1.5 bg-white border border-gray-200 rounded shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center flex-1"
                                  title={t.editService || 'Edit'}
                                  onClick={() => openEditServiceModal(selectedItem, { ...service, bookingId: booking.id })}
                                >
                                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span className="text-[10px] font-bold uppercase">{t.edit || 'Edit'}</span>
                                </button>
                                
                                {!isPaidOut && (
                                  <button
                                    className={`p-1.5 border rounded shadow-sm transition-all flex items-center justify-center flex-[2] ${
                                      isProcessingPayment 
                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                                        : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                    }`}
                                    disabled={isProcessingPayment}
                                    onClick={() => {
                                      if (!isProcessingPayment) {
                                        openPaymentModal(selectedItem, { ...service, bookingId: booking.id });
                                      }
                                    }}
                                  >
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v8m-4-4h8" />
                                    </svg>
                                    <span className="text-[10px] font-bold uppercase">{isProcessingPayment ? '...' : (t.addPayment || 'Add Payment')}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Booking Footer Actions */}
                  <div className="p-2 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
                    <button 
                      className="py-1.5 px-3 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-50 uppercase tracking-tight flex items-center gap-1 transition-colors border border-indigo-100"
                      onClick={() => openEditBookingModal(selectedItem, booking)}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16" />
                      </svg>
                      {t.editDates || 'Edit Dates'}
                    </button>
                    <button 
                      className="py-1.5 px-3 text-rose-600 rounded-lg text-[10px] font-semibold hover:bg-rose-50 uppercase tracking-wide flex items-center gap-1 transition-colors"
                      onClick={() => handleDeleteBooking(selectedItem, booking)}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {t.deleteBooking || 'Delete Booking'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Orphan Services Section (Optional - only show if there are services not linked to a booking displayed above) */}
            {(() => {
              const bookingIds = selectedItem.bookings.map(b => b.id);
              const orphanServices = selectedItem.services.filter(s => !s.bookingId || !bookingIds.includes(s.bookingId));
              
              if (orphanServices.length === 0) return null;
              
              return (
                <div className="space-y-3 pt-2">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">{t.generalServices || 'General Services & Extras'} ({orphanServices.length})</h3>
                  <div className="space-y-2">
                    {orphanServices.map((service, idx) => {
                      const ctx = getPaymentContext(selectedItem, service, selectedItem.paymentHistory || [], safeRender);
                      const isPaidOut = ctx.due <= 0;
                      const { total, paid, due } = getServicePaymentInfo(service, selectedItem.paymentHistory || [], safeRender);
                      
                      const status = due <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
                      const statusStyles = status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200');
                      const statusLabel = status === 'paid' ? (t.paid || 'Paid') : (status === 'partial' ? (t.partiallyPaid || 'Partially Paid') : (t.notPaid || 'Not Paid'));

                      return (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{safeRender(service.name)}</p>
                              <p className="text-xs text-gray-600">{formatShortDate(service.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 text-sm">{total.toLocaleString()} €</p>
                              <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles}`}>
                                {statusLabel}
                              </div>
                            </div>
                          </div>
                          
                          {/* Reuse Actions for Orphan Services */}
                          <div className="flex gap-2 mt-3">
                            <button className="flex-1 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-700" onClick={() => openEditServiceModal(selectedItem, { ...service, bookingId: service.bookingId })}>{t.edit || 'Edit'}</button>
                            {!isPaidOut && (
                              <button
                                className={`flex-[2] py-1.5 border rounded text-xs font-bold ${
                                  isProcessingPayment 
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-50 border-blue-200 text-blue-700'
                                }`}
                                disabled={isProcessingPayment}
                                onClick={() => {
                                  if (!isProcessingPayment) {
                                    openPaymentModal(selectedItem, { ...service, bookingId: service.bookingId });
                                  }
                                }}
                              >
                                {isProcessingPayment ? '...' : (t.addPayment || 'Add Payment')}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Payment History Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 border-b pb-2">{t.paymentHistory || 'Payment History'} ({selectedItem.paymentHistory.length})</h3>
              {selectedItem.paymentHistory.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">{t.noPaymentsRecorded || 'No payments recorded'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItem.paymentHistory.map((payment, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{(payment.amount || 0).toLocaleString()} €</p>
                          <p className="text-[10px] text-gray-500">{formatLongDate(payment.date)}</p>
                          {payment.serviceName && (
                            <p className="text-[10px] text-blue-600 font-medium mt-1 uppercase tracking-tight flex items-center gap-1">
                              <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                              {safeRender(payment.serviceName)}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="text-[10px] text-gray-600 mt-1 italic">
                              {safeRender(payment.notes)}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-white border border-gray-200 text-gray-700 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">{payment.method}</span>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 mt-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-emerald-700 text-sm uppercase tracking-wide">{t.paymentsTotal || 'Total Paid'}:</span>
                      <span className="font-black text-emerald-700 text-lg">{selectedItem.paidAmount.toLocaleString()} €</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t sticky bottom-0 bg-white pb-2">
              {(() => {
                const disableAddService =
                  timeFilter === 'past' ||
                  isPastBookingList(selectedItem.bookings) ||
                  !hasUnlockedBooking(selectedItem.bookings);
                if (disableAddService) return null;
                return (
                  <button 
                    className="w-full py-3 btn-primary rounded-xl font-semibold active:scale-[0.98] transition-all"
                    onClick={() => {
                      closeBottomSheet();
                      setTimeout(() => openAddServiceModal(selectedItem), 300);
                    }}
                  >
                    {t.addService || 'Add Service'}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
        
        {/* PAYMENT FORM */}
        {(bottomSheetContent === 'quick-payment' || bottomSheetContent === 'edit-payment') && selectedItem && (() => {
          const paymentContext = getPaymentContext(selectedItem, paymentTargetService, selectedItem.paymentHistory || [], safeRender);
          const clientDue = Math.max(0, (selectedItem.totalValue || 0) - (selectedItem.paidAmount || 0));
          const maxDue = paymentTargetService ? paymentContext.due : clientDue;
          const isAlreadyFullyPaid = maxDue <= 0;
          const optionalLabel = t.optional || 'optional';
          const withOptionalLabel = (label) => {
            const labelText = String(label || '');
            if (!optionalLabel || !labelText) return labelText;
            const lowerLabel = labelText.toLowerCase();
            const lowerOptional = String(optionalLabel).toLowerCase();
            return lowerLabel.includes(lowerOptional)
              ? labelText
              : `${labelText} (${optionalLabel})`;
          };
          
          return (
            <div className="p-4 bg-white space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {paymentTargetService ? (t.service || 'Service') : (t.client || 'Client')}:{' '}
                  {paymentTargetService ? safeRender(paymentTargetService.name) : safeRender(selectedItem.clientName)}
                </h2>
                
                {isAlreadyFullyPaid ? (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-emerald-700 font-bold text-lg">✅ {t.alreadyFullyPaid || 'Already Fully Paid!'}</p>
                    <p className="text-emerald-600 text-sm mt-1">{t.noPaymentNeeded || 'No additional payment is needed.'}</p>
                  </div>
                ) : (
                  <p className="text-rose-600 font-bold text-xl">{t.amountDue || 'Due'}: {maxDue.toLocaleString()} €</p>
                )}
              </div>

              {!isAlreadyFullyPaid && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentAmount || 'Payment Amount'} *</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={paymentData.amount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPaymentData({...paymentData, amount: Math.min(val, maxDue)});
                        }}
                        max={maxDue}
                        className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        placeholder="0.00"
                      />
                      <span className="absolute left-3 top-3 text-gray-500 font-medium">€</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentData({...paymentData, amount: maxDue})}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        {t.fullAmount || 'Full Amount'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentData({...paymentData, amount: Math.round(maxDue / 2)})}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{withOptionalLabel(t.receiptNumber || 'Receipt Number')}</label>
                    <input
                      type="text"
                      value={paymentData.receiptNumber || ''}
                      onChange={(e) => setPaymentData({...paymentData, receiptNumber: e.target.value})}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder={t.enterReceiptNumber || 'Enter receipt number if available'}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{withOptionalLabel(t.notes || 'Notes')}</label>
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
                      className="flex-1 py-3 btn-ghost rounded-xl font-medium"
                    >
                      {t.cancel || 'Cancel'}
                    </button>
                    <button
                      onClick={() => handleQuickPayment(selectedItem, paymentData.amount)}
                      disabled={!paymentData.amount || paymentData.amount <= 0 || isProcessingPayment}
                      className="flex-2 py-3 btn-success disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none rounded-xl font-semibold"
                    >
                      {isProcessingPayment ? (t.processing || 'Processing...') : (t.completePayment || 'Complete Payment')}
                    </button>
                  </div>
                </>
              )}
              
              {isAlreadyFullyPaid && (
                <div className="flex justify-center">
                  <button
                    onClick={closeBottomSheet}
                    className="py-3 px-8 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                  >
                    {t.close || 'Close'}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* SERVICE SELECTION */}
        {bottomSheetContent === 'add-service' && selectedItem && (
          <div className="bg-white">
            <ServiceSelectionPanel 
              onServiceAdded={handleServiceSelectionAdd}
              onCancel={closeBottomSheet}
              userCompanyId={userCompanyId}
              t={t}
              formError={serviceFormError}
              bookings={selectedItem.bookings || []}
            />
          </div>
        )}
        
        {/* EDIT BOOKING DATES */}
        {bottomSheetContent === 'edit-booking' && selectedItem && selectedBookingToEdit && (
          <div className="p-4 bg-white space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t.editBookingDates || 'Edit Booking Dates'}</h2>
              <p className="text-sm text-gray-600">{safeRender(selectedBookingToEdit.accommodationType)} - {safeRender(selectedItem.clientName)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.checkIn || 'Check-in'} *</label>
                <input
                  type="date"
                  value={editBookingDates.checkIn}
                  onChange={(e) => setEditBookingDates({...editBookingDates, checkIn: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.checkOut || 'Check-out'} *</label>
                <input
                  type="date"
                  value={editBookingDates.checkOut}
                  onChange={(e) => setEditBookingDates({...editBookingDates, checkOut: e.target.value})}
                  min={editBookingDates.checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setBottomSheetContent('client-details')}
                className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleUpdateBookingDates}
                disabled={!editBookingDates.checkIn || !editBookingDates.checkOut}
                className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium shadow-md transition-all"
              >
                {t.updateBooking || 'Update Booking'}
              </button>
            </div>
          </div>
        )}

        {/* SERVICE DETAILS */}
        {bottomSheetContent === 'edit-service' && selectedItem && selectedService && (
          <div className="p-4 bg-white space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900">{safeRender(selectedService.name)}</h2>
              <p className="text-xl font-bold text-gray-900">{((selectedService.price || 0) * (selectedService.quantity || 1)).toLocaleString()} €</p>
            </div>
            
            <div className="space-y-3">
              {/* Service Dates - Display date range */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-800 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 21h18M5 21V5m14 0v16" />
                  </svg>
                  {t.serviceDates || 'Service Dates'}
                </div>
                {selectedService.startDate && selectedService.endDate ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-indigo-700">{formatShortDate(selectedService.startDate)}</span>
                    <span className="text-indigo-400">→</span>
                    <span className="font-bold text-indigo-700">{formatShortDate(selectedService.endDate)}</span>
                    {(() => {
                      const start = new Date(selectedService.startDate);
                      const end = new Date(selectedService.endDate);
                      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                      return (
                        <span className="ml-2 px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-full text-xs font-bold">
                          {days === 1 ? '1 day' : `${days} days`}
                        </span>
                      );
                    })()}
                  </div>
                ) : selectedService.startDate ? (
                  <span className="font-bold text-indigo-700">{formatShortDate(selectedService.startDate)}</span>
                ) : (
                  <span className="text-gray-600">{formatShortDate(selectedService.date)}</span>
                )}
              </div>

              <div className="space-y-3">
                {isEditingServiceDates ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.startDate || 'Start Date'}</label>
                        <input
                          type="date"
                          value={editServiceDates.startDate}
                          onChange={(e) => setEditServiceDates(prev => ({ ...prev, startDate: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.endDate || 'End Date'}</label>
                        <input
                          type="date"
                          value={editServiceDates.endDate}
                          onChange={(e) => setEditServiceDates(prev => ({ ...prev, endDate: e.target.value }))}
                          min={editServiceDates.startDate || new Date().toISOString().split('T')[0]}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md font-medium"
                        onClick={() => {
                          const startDate = selectedService.startDate || selectedService.date || '';
                          const endDate = selectedService.endDate || selectedService.startDate || selectedService.date || '';
                          setEditServiceDates({ startDate, endDate });
                          setIsEditingServiceDates(false);
                        }}
                      >
                        {t.cancel || 'Cancel'}
                      </button>
                      <button
                        type="button"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-300"
                        onClick={handleUpdateServiceDates}
                        disabled={!editServiceDates.startDate || !editServiceDates.endDate}
                      >
                        {t.updateServiceDates || 'Update Dates'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="w-full py-2 bg-white border border-indigo-200 text-indigo-700 rounded-md font-medium hover:bg-indigo-50"
                    onClick={() => setIsEditingServiceDates(true)}
                  >
                    {t.editDates || 'Edit Dates'}
                  </button>
                )}
              </div>
              
              <p className="text-sm"><span className="text-gray-500">{t.quantity || 'Quantity'}:</span> <span className="text-gray-900">{selectedService.quantity} × {(selectedService.price || 0).toLocaleString()} €</span></p>
              {selectedService.notes && (
                <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">
                  <span className="font-medium">{t.notes || 'Notes'}:</span> {safeRender(selectedService.notes)}
                </div>
              )}
            </div>
            
            <button
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium"
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
      
      {/* Enhanced Toast Notification - fixed top so it's always visible over modals */}
      {showNotification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-md shadow-xl z-[120] animate-fade-in-up flex items-center max-w-md text-sm sm:text-base ${
          notificationType === 'success' ? 'bg-emerald-600 text-white' : 
          notificationType === 'error' ? 'bg-rose-600 text-white' : 
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
