import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { useDatabase } from "../../context/DatabaseContext";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { drawServiceIcon } from '../../utils/pdfIconUtils';
import { getCurrentLanguage } from "../../utils/languageHelper";

// Helper function to safely render multilingual content
function safeRender(value, lang) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value !== null) {
    // If it's a multilingual object
    if (value.ro !== undefined || value.en !== undefined) {
      return value[lang] || value.en || value.ro || '';
    }
    // Other objects
    return JSON.stringify(value);
  }
  return value;
}

// Override React.createElement to handle language objects within spans
const originalCreateElement = React.createElement;
React.createElement = function(type, props, ...children) {
  // Only process span elements
  if (type === 'span') {
    // Process each child
    const processedChildren = children.map(child => {
      // Check if this child is a language object
      if (child !== null && 
          typeof child === 'object' && 
          !React.isValidElement(child) &&
          (child.en !== undefined || child.ro !== undefined)) {
        // Convert language object to string
        return child.ro || child.en || '';
      }
      return child;
    });
    return originalCreateElement(type, props, ...processedChildren);
  }
  return originalCreateElement(type, props, ...children);
};

// Initialize Firestore
const db = getFirestore();

// Helper function to extract a localized string if the value is an object
function getLocalizedText(value, language) {
  return safeRender(value, language);
}

const seasonalMonthOrder = ['may', 'june', 'july', 'august', 'september', 'october'];
const seasonByMonth = {
  may: 'extraSeason',
  june: 'lowSeason',
  july: 'peakSeason',
  august: 'peakSeason',
  september: 'lowSeason',
  october: 'extraSeason'
};

const seasonalMonthSet = new Set(seasonalMonthOrder);

const normalizeUnitType = (unit = '', fallback = 'week') => {
  const normalized = unit.toString().toLowerCase();
  if (normalized.includes('week')) return 'week';
  if (normalized.includes('month')) return 'month';
  if (normalized.includes('night')) return 'night';
  if (normalized.includes('day')) return 'day';
  return fallback;
};

const toNumericPrice = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object' && value !== null) {
    if (value.price !== undefined) {
      return toNumericPrice(value.price);
    }
  }
  return 0;
};

// Core concierge services available even without database records
const CORE_CONCIERGE_SERVICES = [
  { id: 'core-villa-rentals', name: 'Luxury villa rentals', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-yachts', name: 'Yacht & boat charters', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-cars', name: 'Premium car rentals', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-club-bookings', name: 'VIP club reservations', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-restaurants', name: 'Exclusive restaurant bookings', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-parties', name: 'Private party planning', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-chef', name: 'Private chef & gourmet catering', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-transfers', name: 'Private transfers', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-security', name: 'Bodyguard & private security', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-housekeeping', name: 'Housekeeping & cleaning', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-babysitting', name: 'Babysitting & nanny', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-spa', name: 'In-villa massage & spa', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-excursions', name: 'Excursions & activities', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-shopping', name: 'Personal shopping assistance', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-photo-video', name: 'Professional photo & video', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-romantic', name: 'Romantic event planning', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-medical', name: 'Private medical & doctor at home', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-groups', name: 'Group logistics coordination', price: 0, unit: 'service', category: 'concierge-core' },
  { id: 'core-property-mgmt', name: 'Property management', price: 0, unit: 'service', category: 'concierge-core' },
];
const EXCLUDED_CORE_SERVICE_IDS = new Set(['core-villa-rentals', 'core-yachts', 'core-cars', 'core-chef', 'core-security']);
const CORE_CONCIERGE_SERVICES_FILTERED = CORE_CONCIERGE_SERVICES.filter(
  (service) => !EXCLUDED_CORE_SERVICE_IDS.has(service.id)
);

const formatSeasonalMonthLabel = (monthKey, language, t) => {
  try {
    const monthDate = new Date(`${monthKey} 1, 2020`);
    const locale = language === 'ro' ? 'ro-RO' : 'en-GB';
    const monthName = monthDate.toLocaleString(locale, { month: 'long' });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const seasonLabel = seasonByMonth[monthKey] ? t[seasonByMonth[monthKey]] || '' : '';
    return seasonLabel ? `${capitalized} (${seasonLabel})` : capitalized;
  } catch {
    return monthKey;
  }
};

const resolveMonthlyPrice = (entry) => {
  const numeric = toNumericPrice(entry);
  return numeric > 0 ? numeric : null;
};

const resolveMonthlyUnit = (entry, fallback = 'nightly') => {
  if (entry && typeof entry === 'object' && entry.type) {
    return normalizeUnitType(entry.type, fallback);
  }
  return normalizeUnitType(fallback, fallback);
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

const getMonthlyOptionsForService = (service, language, t) => {
  if (!service.originalPricing?.monthly) return [];
  return Object.entries(service.originalPricing.monthly)
    .map(([month, value]) => {
      const normalized = month.toLowerCase();
      if (!seasonalMonthSet.has(normalized)) return null;
      const price = resolveMonthlyPrice(value);
      if (price === null) return null;
      const type = resolveMonthlyUnit(value, service.unit || 'nightly');
      return {
        month: normalized,
        price,
        type,
        label: formatSeasonalMonthLabel(normalized, language, t)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const idxA = seasonalMonthOrder.indexOf(a.month);
      const idxB = seasonalMonthOrder.indexOf(b.month);
      if (idxA === -1 && idxB === -1) return a.month.localeCompare(b.month);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
};

const removeUndefinedFields = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedFields(item))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    const sanitized = {};
    Object.entries(value).forEach(([key, val]) => {
      if (val === undefined) return;
      const cleaned = removeUndefinedFields(val);
      if (cleaned !== undefined) {
        sanitized[key] = cleaned;
      }
    });
    return sanitized;
  }
  return value === undefined ? undefined : value;
};


// Translation dictionary
const translations = {
  en: {
    title: 'Existing Clients',
    search: 'Search clients...',
    filterAll: 'All Clients',
    filterActive: 'Active',
    filterInactive: 'Inactive',
    filterVip: 'VIP',
    noClientsFound: 'No clients found.',
    clientDetails: 'Client Details',
    contactInfo: 'Contact Information',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    nationality: 'Nationality',
    clientSince: 'Client Since',
    preferredLanguage: 'Preferred Language',
    stayInfo: 'Stay Information',
    currentStay: 'Current Stay',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    accommodationType: 'Accommodation Type',
    past: 'Past Stays',
    upcoming: 'Upcoming Reservations',
    preferences: 'Preferences',
    dietaryRestrictions: 'Dietary Restrictions',
    transportPreferences: 'Transport Preferences',
    specialRequests: 'Special Requests',
    notes: 'Notes',
    editClient: 'Edit Client',
    deleteClient: 'Delete Client',
    createReservation: 'Create New Reservation',
    noClientSelected: 'No Client Selected',
    confirmDeleteOffer: 'Are you sure you want to delete this offer?', 
    cannotDeleteBookedOffer: 'Cannot delete an offer that has been converted to a booking.',
    collaborator: 'Collaborator',
    selectCollaborator: 'Select collaborator (optional)',
    noCollaborators: 'No collaborators found',
    offerDeletedSuccess: 'Offer deleted successfully.',
    deleteOffer: 'Delete Offer',
    selectClient: 'Select a client from the list to view their details.',
    confirmDelete: 'Are you sure you want to delete this client?',
    addClient: 'Add Client',
    from: 'From',
    to: 'To',
    actions: 'Actions',
    servicesAndOffers: 'Services & Offers',
    createNewOffer: 'Create New Offer',
    offerHistory: 'Offer History',
    noPreviousOffers: 'No previous offers for this client.',
    offerTotal: 'Total Value:',
    offerItems: 'Items:',
    viewDetails: 'View Details',
    duplicateOffer: 'Duplicate Offer',
    offerStatus: 'Status',
    sendOffer: 'Send Offer',
    generatePdf: 'Generate PDF',
    viewProperty: 'View property',
    conciergeCore: 'Core Concierge Services',
    villas: 'Villas & Accommodations',
    cars: 'Cars & Transportation',
    boats: 'Boats & Yachts',
    nannies: 'Nannies & Childcare',
    chefs: 'Chefs',
    excursions: 'Excursions & Activities',
    discount: 'Discount',
    discountAmount: 'Discount Amount',
    discountType: 'Discount Type',
    percentage: 'Percentage',
    fixedAmount: 'Fixed Amount',
    applyDiscount: 'Apply Discount',
    subtotal: 'Subtotal',
    addToOffer: 'Add to Offer',
    addCustomPrompt: 'Set a price and details before adding this service.',
    currentOfferItems: 'Current Offer Items',
    noItemsAdded: 'No items added to this offer yet.',
    addedToOfferNotice: 'added to offer',
    service: 'Service',
    rate: 'Rate',
    quantity: 'Quantity',
    total: 'Total',
    additionalNotes: 'Additional Notes',
    addCustomService: 'Add custom service',
    customName: 'Service name',
    customPrice: 'Price',
    customQuantity: 'Qty',
    customDescription: 'Description',
    addCustom: 'Add custom',
    customUnit: 'Unit',
    unitService: 'Service',
    unitDay: 'Per day',
    unitHour: 'Per hour',
    selectMonthLabel: 'Select season',
    useStandardRate: 'Use standard rate',
    peakSeason: 'Peak Season',
    lowSeason: 'Low Season',
    extraSeason: 'Extra Season',
    cancel: 'Cancel',
    addNotesPlaceholder: 'Add any special instructions or details for this offer...',
    offerSentSuccess: 'Offer sent successfully to',
    pdfGeneratedSuccess: 'PDF generated successfully',
    reservationDetails: 'New Reservation Details',
    startDate: 'Start Date',
    endDate: 'End Date',
    guests: 'Number of Guests',
    reservationType: 'Reservation Type',
    additionalServices: 'Additional Services',
    submitReservation: 'Submit Reservation',
    reservationCreatedSuccess: 'Reservation created successfully for',
    quickBookingMode: 'Instant booking mode',
    quickBookingInstructions: 'Select a client to open the booking form and add services immediately.',
    price: 'Price',
    unit: 'Unit',
    selectAccommodation: 'Select Accommodation',
    selectTransport: 'Select Transport',
    adults: 'Adults',
    children: 'Children',
    specialNotes: 'Special Notes',
    notesForReservation: 'Add any special requirements or notes for this reservation...',
    loading: 'Loading...',
    loadingServices: 'Loading services...',
    error: 'An error occurred. Please try again.',
    companyLabel: 'Viewing clients for company:',
    noCompanyAccess: 'You do not have access to any company. Please contact an administrator.',
    errorFetchingClients: 'Error loading clients. Please try again.',
    noServicesFound: 'No services found in this category.',
    location: 'Location',
    maxGuests: 'Capacity',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    amenities: 'Amenities',
    model: 'Model',
    year: 'Year',
    length: 'Length',
    boatCapacity: 'Capacity',
    dailyPrice: 'Daily Price',
    weeklyPrice: 'Weekly Price',
    monthlyPrice: 'Monthly Price',
    perDay: 'per day',
    perNight: 'per night',
    perWeek: 'per week',
    perMonth: 'per month',
    perHour: 'per hour',
    perService: 'per service',
    filterByPrice: 'Filter by price',
    minPrice: 'Min price',
    maxPrice: 'Max price',
    apply: 'Apply',
    reset: 'Reset',
    saveChanges: 'Save Changes',
    clientUpdatedSuccess: 'Client information updated successfully.',
    editClientDetails: 'Edit Client Details',
    personalInfo: 'Personal Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    fullName: 'Full Name',
    status: 'Status',
    isVip: 'VIP Client',
    yes: 'Yes',
    no: 'No',
    backToList: 'Back to list',
    backToDetails: 'Back to details',
    mobileMenu: 'Menu',
    save: 'Save',
    offerFor: 'Offer for',
    generatedOn: 'Generated on',
    validUntil: 'Valid until',
    offerNumber: 'Offer #',
    pdfGenerating: 'Generating PDF...',
    companyPhone: 'Phone',
    companyEmail: 'Email',
    companyWebsite: 'Website',
    companyAddress: 'Address',
    serviceName: 'Service',
    servicePrice: 'Price',
    serviceQuantity: 'Qty',
    serviceTotal: 'Total',
    security: 'Security',
    thank: 'Thank you for choosing',
    offerTerms: 'Terms and conditions',
    saveOffer: 'Save Offer',
    viewOfferDetails: 'View Details',
    editOffer: 'Edit Offer',
    offerSavedSuccess: 'Offer saved successfully for',
    updateOffer: 'Update Offer',
    paymentMethod: 'Payment Method',
    paymentMethods: {
      cash: 'Cash',
      transfer: 'Bank Transfer',
      crypto: 'Cryptocurrency',
      link: 'Payment Link'
    },
    selectPaymentMethod: 'Select Payment Method',
    createBookingFromOffer: 'Create Booking from Offer',
    servicesToIncludeInBooking: 'Services to Include in Booking',
    includeAll: 'Include All',
    selectAll: 'Select All',
    additionalInformation: 'Additional Information',
    markAllAsDepositPaid: 'Mark All as Deposit Paid',
    markAllAsFullyPaid: 'Mark All as Fully Paid',
    amountPaid: 'Amount Paid',
    serviceDates: 'Service Dates',
    paymentStatus: 'Payment Status',
    unpaid: 'Unpaid',
    depositPaid: 'Deposit Paid', 
    fullyPaid: 'Fully Paid',
    of: 'of',
    createBooking: 'Create Booking',
    convertToBooking: 'Convert to Booking'
  },
  ro: {
    title: 'Clienți Existenți',
    search: 'Caută clienți...',
    filterAll: 'Toți Clienții',
    filterActive: 'Activi',
    filterInactive: 'Inactivi',
    filterVip: 'VIP',
    noClientsFound: 'Nu s-au găsit clienți.',
    security: 'Securitate & Protecție',
    clientDetails: 'Detalii Client',
    contactInfo: 'Informații de Contact',
    email: 'Adresă de Email',
    phone: 'Număr de Telefon',
    address: 'Adresă',
    nationality: 'Naționalitate',
    deleteOffer: 'Șterge Oferta',
    offerDeletedSuccess: 'Oferta a fost ștearsă cu succes.',
    cannotDeleteBookedOffer: 'Nu se poate șterge o ofertă care a fost convertită în rezervare.',
    confirmDeleteOffer: 'Sigur doriți să ștergeți această ofertă?',
    clientSince: 'Client din',
    preferredLanguage: 'Limba Preferată',
    stayInfo: 'Informații despre Sejur',
    currentStay: 'Sejurul Curent',
    checkIn: 'Data Sosirii',
    checkOut: 'Data Plecării',
    accommodationType: 'Tipul de Cazare',
    past: 'Sejururi Anterioare',
    upcoming: 'Rezervări Viitoare',
    preferences: 'Preferințe',
    dietaryRestrictions: 'Restricții Alimentare',
    transportPreferences: 'Preferințe Transport',
    specialRequests: 'Cereri Speciale',
    notes: 'Observații',
    editClient: 'Editează Client',
    deleteClient: 'Șterge Client',
    createReservation: 'Creează Rezervare Nouă',
    collaborator: 'Colaborator',
    selectCollaborator: 'Selectează colaborator (opțional)',
    noCollaborators: 'Nu există colaboratori',
    noClientSelected: 'Niciun Client Selectat',
    selectClient: 'Selectează un client din listă pentru a vedea detaliile.',
    confirmDelete: 'Ești sigur că dorești să ștergi acest client?',
    addClient: 'Adaugă Client',
    from: 'De la',
    to: 'Până la',
    actions: 'Acțiuni',
    servicesAndOffers: 'Servicii și Oferte',
    createNewOffer: 'Creează Ofertă Nouă',
    offerHistory: 'Istoric Oferte',
    noPreviousOffers: 'Nu există oferte anterioare pentru acest client.',
    offerTotal: 'Valoare Totală:',
    offerItems: 'Articole:',
    viewDetails: 'Vezi Detalii',
    duplicateOffer: 'Duplică Oferta',
    offerStatus: 'Status',
    sendOffer: 'Trimite Oferta',
    generatePdf: 'Generează PDF',
    viewProperty: 'Deschide proprietatea',
    conciergeCore: 'Servicii Concierge Principale',
    villas: 'Vile și Cazări',
    cars: 'Mașini și Transport',
    boats: 'Bărci și Iahturi',
    nannies: 'Bone și Îngrijire Copii',
    chefs: 'Bucatari',
    excursions: 'Excursii și Activități',
    discount: 'Reducere',
    discountAmount: 'Valoare Reducere',
    discountType: 'Tip Reducere',
    percentage: 'Procentuală',
    fixedAmount: 'Sumă Fixă',
    applyDiscount: 'Aplică Reducerea',
    subtotal: 'Subtotal',
    addToOffer: 'Adaugă la Ofertă',
    addCustomPrompt: 'Setează prețul și detaliile înainte de a adăuga serviciul.',
    currentOfferItems: 'Articole în Oferta Curentă',
    noItemsAdded: 'Nu a fost adăugat niciun articol la această ofertă.',
    addedToOfferNotice: 'adăugat în ofertă',
    service: 'Serviciu',
    rate: 'Tarif',
    quantity: 'Cantitate',
    total: 'Total',
    selectMonthLabel: 'Selectează sezonul',
    useStandardRate: 'Folosește tariful standard',
    peakSeason: 'Sezon de vârf',
    lowSeason: 'Sezon redus',
    extraSeason: 'Sezon extra',
    additionalNotes: 'Note Suplimentare',
    addCustomService: 'Adaugă serviciu personalizat',
    customName: 'Nume serviciu',
    customPrice: 'Preț',
    customQuantity: 'Cant.',
    customDescription: 'Descriere',
    addCustom: 'Adaugă personalizat',
    customUnit: 'Unitate',
    unitService: 'Serviciu',
    unitDay: 'Pe zi',
    unitHour: 'Pe oră',
    cancel: 'Anulează',
    addNotesPlaceholder: 'Adaugă instrucțiuni speciale sau detalii pentru această ofertă...',
    offerSentSuccess: 'Oferta a fost trimisă cu succes către',
    pdfGeneratedSuccess: 'PDF-ul a fost generat cu succes',
    reservationDetails: 'Detalii Rezervare Nouă',
    startDate: 'Data Începerii',
    endDate: 'Data Încheierii',
    guests: 'Număr de Oaspeți',
    reservationType: 'Tipul Rezervării',
    additionalServices: 'Servicii Suplimentare',
    submitReservation: 'Trimite Rezervare',
    reservationCreatedSuccess: 'Rezervare creată cu succes pentru',
    quickBookingMode: 'Mod rezervare rapidă',
    quickBookingInstructions: 'Selectează un client pentru a deschide formularul de rezervare și a adăuga servicii imediat.',
    price: 'Preț',
    unit: 'Unitate',
    selectAccommodation: 'Selectează Cazare',
    selectTransport: 'Selectează Transport',
    adults: 'Adulți',
    children: 'Copii',
    specialNotes: 'Note Speciale',
    notesForReservation: 'Adaugă cerințe speciale sau note pentru această rezervare...',
    loading: 'Se încarcă...',
    loadingServices: 'Se încarcă serviciile...',
    error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    companyLabel: 'Vizualizați clienții companiei:',
    noCompanyAccess: 'Nu aveți acces la nicio companie. Vă rugăm să contactați un administrator.',
    errorFetchingClients: 'Eroare la încărcarea clienților. Vă rugăm să încercați din nou.',
    noServicesFound: 'Nu s-au găsit servicii în această categorie.',
    location: 'Locație',
    maxGuests: 'Capacitate',
    bedrooms: 'Dormitoare',
    bathrooms: 'Băi',
    amenities: 'Facilități',
    model: 'Model',
    year: 'An',
    length: 'Lungime',
    boatCapacity: 'Capacitate',
    dailyPrice: 'Preț zilnic',
    weeklyPrice: 'Preț săptămânal',
    monthlyPrice: 'Preț lunar',
    perDay: 'pe zi',
    perNight: 'pe noapte',
    perWeek: 'pe săptămână',
    perMonth: 'pe lună',
    perHour: 'pe oră',
    perService: 'pe serviciu',
    filterByPrice: 'Filtrează după preț',
    minPrice: 'Preț minim',
    maxPrice: 'Preț maxim',
    apply: 'Aplică',
    reset: 'Resetează',
    saveChanges: 'Salvează Modificările',
    clientUpdatedSuccess: 'Informațiile clientului au fost actualizate cu succes.',
    editClientDetails: 'Editează Detaliile Clientului',
    personalInfo: 'Informații Personale',
    firstName: 'Prenume',
    lastName: 'Nume',
    fullName: 'Nume Complet',
    status: 'Status',
    isVip: 'Client VIP',
    yes: 'Da',
    no: 'Nu',
    backToList: 'Înapoi la listă',
    backToDetails: 'Înapoi la detalii',
    mobileMenu: 'Meniu',
    save: 'Salvează',
    offerFor: 'Ofertă pentru',
    generatedOn: 'Generată la',
    validUntil: 'Valabilă până la',
    offerNumber: 'Oferta #',
    pdfGenerating: 'Se generează PDF...',
    companyPhone: 'Telefon',
    companyEmail: 'Email',
    companyWebsite: 'Website',
    companyAddress: 'Adresă',
    serviceName: 'Serviciu',
    servicePrice: 'Preț',
    serviceQuantity: 'Cant.',
    serviceTotal: 'Total',
    thank: 'Vă mulțumim că ați ales',
    offerTerms: 'Termeni și condiții',
    saveOffer: 'Salvează Oferta',
    viewOfferDetails: 'Vezi Detalii',
    editOffer: 'Editează Oferta',
    offerSavedSuccess: 'Oferta a fost salvată cu succes pentru',
    updateOffer: 'Actualizează Oferta',
    paymentMethod: 'Metodă de Plată',
    paymentMethods: {
      cash: 'Numerar',
      transfer: 'Transfer Bancar',
      crypto: 'Criptomonedă',
      link: 'Link de Plată'
    },
    selectPaymentMethod: 'Selectează Metoda de Plată',
    createBookingFromOffer: 'Creează Rezervare din Ofertă',
    servicesToIncludeInBooking: 'Servicii de Inclus în Rezervare',
    includeAll: 'Include Toate',
    selectAll: 'Selectează Tot',
    additionalInformation: 'Informații Suplimentare',
    markAllAsDepositPaid: 'Marchează Toate ca Avans Plătit',
    markAllAsFullyPaid: 'Marchează Toate ca Plătite Integral',
    amountPaid: 'Suma Plătită',
    serviceDates: 'Datele Serviciului',
    paymentStatus: 'Status Plată',
    unpaid: 'Neplătit',
    depositPaid: 'Avans Plătit',
    fullyPaid: 'Plătit Integral',
    of: 'din',
    createBooking: 'Creează Rezervare',
    convertToBooking: 'Convertește în Rezervare'
  }
};

function ExistingClients() {
  const location = useLocation();
  const navigate = useNavigate();
  // Function to extract image URLs from service data
 // Function to extract image URLs from service data
const extractImageUrl = (data) => {
  console.log(`Extracting image for service:`, data.name?.en || data.name || 'Unknown', data.photos);
  
  // Priority 1: Check photos array (your main structure)
  if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
    // Handle Firestore object structure with url property
    const photoWithUrl = data.photos.find(photo => 
      photo && typeof photo === 'object' && photo.url && typeof photo.url === 'string' && photo.url.trim() !== '');
    
    if (photoWithUrl) {
      console.log(`Found image in photos array:`, photoWithUrl.url);
      return photoWithUrl.url;
    }
    
    // Fallback to string URLs directly in the array
    const firstValidPhoto = data.photos.find(photo => typeof photo === 'string' && photo.trim() !== '');
    if (firstValidPhoto) {
      console.log(`Found string image in photos array:`, firstValidPhoto);
      return firstValidPhoto;
    }
  }
  
  // Priority 2: Check imageUrl field
  if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.trim() !== '') {
    console.log(`Found imageUrl:`, data.imageUrl);
    return data.imageUrl;
  } 
  
  // Priority 3: Check image field
  if (data.image && typeof data.image === 'string' && data.image.trim() !== '') {
    console.log(`Found image field:`, data.image);
    return data.image;
  }
  
  // Priority 4: Check thumbnail field
  if (data.thumbnail && typeof data.thumbnail === 'string' && data.thumbnail.trim() !== '') {
    console.log(`Found thumbnail:`, data.thumbnail);
    return data.thumbnail;
  }
  
  // Priority 5: Check images array
  if (data.images && Array.isArray(data.images) && data.images.length > 0) {
    // First check if images contains objects with url property
    const imageWithUrl = data.images.find(img => 
      img && typeof img === 'object' && img.url && typeof img.url === 'string' && img.url.trim() !== '');
    
    if (imageWithUrl) {
      console.log(`Found image in images array:`, imageWithUrl.url);
      return imageWithUrl.url;
    }
    
    // Fallback to string URLs
    const firstValidImage = data.images.find(img => typeof img === 'string' && img.trim() !== '');
    if (firstValidImage) {
      console.log(`Found string image in images array:`, firstValidImage);
      return firstValidImage;
    }
  }
  
  console.log(`No image found for service:`, data.name?.en || data.name || 'Unknown');
  return null;
};

  const [language, setLanguage] = useState(getCurrentLanguage); 
  const t = translations[language]; // Translation function
  
  // Use the database context
  const { currentUser, companyInfo, loading: contextLoading, error: contextError } = useDatabase();
  
  // Client states
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentEditingOffer, setCurrentEditingOffer] = useState(null);
  const [reservationFromOffer, setReservationFromOffer] = useState(null);
  const [assignedUserName, setAssignedUserName] = useState('-');
  const [usersData, setUsersData] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Mobile UI states
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentView, setCurrentView] = useState('list'); 
  const [selectedItems, setSelectedItems] = useState([]);
  const [bookingShortcutActive, setBookingShortcutActive] = useState(false);
  const [autoReservationQueued, setAutoReservationQueued] = useState(false);
  
  // Modals and UI states
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [showCreateReservation, setShowCreateReservation] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedSeasonMonths, setSelectedSeasonMonths] = useState({});
  
  // Offer states
  const [selectedCategory, setSelectedCategory] = useState('villas');
  const [offerItems, setOfferItems] = useState([]);
  const [offerNotes, setOfferNotes] = useState('');
  const [offersHistory, setOffersHistory] = useState([]);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [discountValue, setDiscountValue] = useState(0);
  const [availableServices, setAvailableServices] = useState({});
  const [loadingServices, setLoadingServices] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [teamMembersError, setTeamMembersError] = useState(null);
  const [offerNotice, setOfferNotice] = useState('');
  const [customService, setCustomService] = useState({
    name: '',
    price: '',
    quantity: 1,
    description: ''
  });
  const [customServiceOpen, setCustomServiceOpen] = useState(false);
  const [pendingService, setPendingService] = useState(null);
  const [customServiceUnit, setCustomServiceUnit] = useState('service');
  
  // Price filter states
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState(0);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState(Infinity);
  const [imageErrors, setImageErrors] = useState({});
  
  // Reservation states
  const [reservationData, setReservationData] = useState({
    startDate: '',
    endDate: '',
    adults: 1,
    children: 0,
    accommodationType: '',
    transport: '',
    notes: '',
    collaboratorId: ''
  });
  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);

  // Load collaborators for the current company to allow booking attribution
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!companyInfo?.id) {
        setCollaborators([]);
        return;
      }
      setCollaboratorsLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'collaborators'), where('companyId', '==', companyInfo.id))
        );
        setCollaborators(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error loading collaborators:', err);
      } finally {
        setCollaboratorsLoading(false);
      }
    };

    fetchCollaborators();
  }, [companyInfo]);

  const fetchUsersBatch = async (userIds) => {
  if (!userIds || userIds.length === 0) return;
  
  // Filter out IDs we already have and invalid IDs
  const idsToFetch = userIds.filter(id => 
    id && typeof id === 'string' && id.length > 0 && !usersData[id]
  );
  
  if (idsToFetch.length === 0) return;
  
  try {
    setUsersLoading(true);
    
    // Fetch each user in parallel
    const userPromises = idsToFetch.map(async (userId) => {
      try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return { 
            id: userId, 
            displayName: userData.displayName || userData.name || userData.email || 'User' 
          };
        } else {
          console.log(`User with ID ${userId} not found`);
          return { id: userId, displayName: userId.slice(0, 8) + '...' };
        }
      } catch (err) {
        console.error(`Error fetching user ${userId}:`, err);
        return { id: userId, displayName: userId.slice(0, 8) + '...' };
      }
    });
    
    const fetchedUsers = await Promise.all(userPromises);
    
    // Update the users data state
    const newUsersData = { ...usersData };
    fetchedUsers.forEach(user => {
      newUsersData[user.id] = user.displayName;
    });
    
    setUsersData(newUsersData);
  } catch (error) {
    console.error("Error in batch user fetch:", error);
  } finally {
    setUsersLoading(false);
  }
};


  // Handler for deleting an offer
  const handleDeleteOffer = async (offer) => {
    if (!offer || !companyInfo) return;
    
    if (window.confirm(t.confirmDeleteOffer)) {
      try {
        // Check if this is a booked offer
        if (offer.status === 'booked') {
          alert(t.cannotDeleteBookedOffer);
          return;
        }
        
        // Delete the offer from Firestore
        const offerRef = doc(db, "offers", offer.id);
        await deleteDoc(offerRef);
        
        // Update the UI
        setOffersHistory(prev => prev.filter(o => o.id !== offer.id));
        
        alert(t.offerDeletedSuccess);
      } catch (error) {
        console.error("Error deleting offer:", error);
        setError(t.error);
      }
    }
  };
  
  // Edit client states
  const [editClientData, setEditClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    nationality: '',
    status: 'active',
    isVip: false,
    clientType: 'regular',
    preferredLanguage: '',
    leadSource: '',
    leadStatus: 'new',
    assignedTo: '',
    assignedToName: '',
    followUpDate: '',
    conversionPotential: 'medium',
    budget: '',
    startDate: '',
    endDate: '',
    propertyTypes: {
      villas: false,
      apartments: false,
      hotels: false
    },
    activities: '',
    adults: 1,
    children: 0,
    isPreviousClient: false,
    dietaryRestrictions: '',
    transportPreferences: '',
    specialRequests: '',
    notes: '',
    contactPersons: [{ name: '', email: '', phone: '' }]
  });
  
  // Service categories for offerings (memoized to prevent infinite re-render)
  const serviceCategories = useMemo(() => [
    { id: 'concierge-core', name: t.conciergeCore, icon: '⭐', collection: null, staticServices: CORE_CONCIERGE_SERVICES_FILTERED },
    { id: 'villas', name: t.villas, icon: '🏠', collection: 'villas' },
    { id: 'boats', name: t.boats, icon: '🛥️', collection: 'boats' },
    { id: 'cars', name: t.cars, icon: '🚗', collection: 'cars' },
    { id: 'security', name: t.security, icon: '🔒', collection: 'security' },
    { id: 'nannies', name: t.nannies, icon: '👶', collection: 'services', filter: 'nannies' },
    { id: 'chefs', name: t.chefs, icon: '🍽️', collection: 'chefs' },
    { id: 'excursions', name: t.excursions, icon: '🏔️', collection: 'services', filter: 'excursions' },
  ], [t]);
  
  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (location.state?.startBookingFlow) {
      setBookingShortcutActive(true);
      setAutoReservationQueued(true);
      if (isMobile) {
        setCurrentView('list');
      }
      navigate(location.pathname + location.search, { replace: true });
    }
  }, [location, navigate, isMobile]);

  useEffect(() => {
    const resolveAssignee = async () => {
      if (!selectedClient) {
        setAssignedUserName('-');
        return;
      }

      if (selectedClient.assignedToName) {
        setAssignedUserName(selectedClient.assignedToName);
        return;
      }

      const matchedTeamMember = teamMembers.find(
        (member) =>
          member.id === selectedClient.assignedTo ||
          (member.email && selectedClient.assignedTo && member.email.toLowerCase() === selectedClient.assignedTo.toLowerCase())
      );

      if (matchedTeamMember) {
        setAssignedUserName(matchedTeamMember.name || matchedTeamMember.email || '-');
        return;
      }

      if (selectedClient.assignedTo) {
        const name = await getUserName(selectedClient.assignedTo);
        setAssignedUserName(name);
        return;
      }

      setAssignedUserName('-');
    };

    resolveAssignee();
  }, [selectedClient, teamMembers]);

  // Handle language changes
  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(getCurrentLanguage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Fetch clients for the current company
  // Replace your existing client fetching useEffect with this enhanced version
useEffect(() => {
  const fetchClients = async () => {
    if (!companyInfo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching clients for company:", companyInfo.id);
      const clientsRef = collection(db, "clients");
      const q = query(clientsRef, where("companyId", "==", companyInfo.id));
      const querySnapshot = await getDocs(q);
      
      // Log the raw data for debugging
      console.log("Raw client data from Firestore:", 
        querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      );
      
      const clientsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Special handling for createdAt timestamp
        const createdAt = data.createdAt ? 
          (data.createdAt instanceof Date ? 
            data.createdAt : 
            new Date(data.createdAt.seconds * 1000)) : 
          null;
        
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt,
          // Ensure these fields exist even if null/undefined
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          nationality: data.nationality || '',
          status: data.status || 'active',
          isVip: data.isVip !== undefined ? data.isVip : (data.clientType === 'vip'),
          clientType: data.clientType || (data.isVip ? 'vip' : 'regular'),
          preferredLanguage: data.preferredLanguage || '',
          assignedToName: data.assignedToName || '',
          // Include additional fields that might not be in your component yet
          activities: data.activities || '',
          budget: data.budget || '',
          leadSource: data.leadSource || '',
          leadStatus: data.leadStatus || '',
          conversionPotential: data.conversionPotential || '',
          assignedTo: data.assignedTo || '',
          followUpDate: data.followUpDate || '',
          isPreviousClient: data.isPreviousClient || false,
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          adults: data.adults || 0,
          children: data.children || 0,
          propertyTypes: data.propertyTypes || {},
          contactPersons: data.contactPersons || []
        };
      });
      
      // Sort clients by name
      clientsData.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
      
      console.log("Processed clients with all fields:", clientsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setError(t.errorFetchingClients);
    } finally {
      setLoading(false);
    }
  };
  
  fetchClients();
}, [companyInfo, t.errorFetchingClients]);
  
  // Fetch services for the current company
  useEffect(() => {
    const fetchServices = async () => {
      if (!companyInfo) return;
      
      setLoadingServices(true);
      console.log("Fetching services for company:", companyInfo.id);
      
      try {
        const services = {};
        
        // Fetch all service types based on serviceCategories
        for (const category of serviceCategories) {
          try {
            // Provide built-in concierge options without needing Firestore records
            if (category.staticServices) {
              services[category.id] = category.staticServices;
              continue;
            }
            
            if (!category.collection) {
              services[category.id] = [];
              continue;
            }
            
            // Create a reference to the collection
            const collectionRef = collection(db, category.collection);
            let queryRef = collectionRef;
            
            // If there's a filter, apply it (for service subcategories)
            if (category.filter) {
              queryRef = query(collectionRef, where("type", "==", category.filter));
            }
            
            const snapshot = await getDocs(queryRef);
            console.log(`Found ${snapshot.docs.length} items in ${category.collection}${category.filter ? ` with type ${category.filter}` : ''}`);
            
            // Process the data based on collection type
            if (category.id === 'villas') {
  services[category.id] = snapshot.docs.map(doc => {
    const data = doc.data();
    
    console.log(`Processing villa: ${data.name?.en || data.name || 'Unknown'}`);
    console.log('Raw villa data structure:', JSON.stringify(data, null, 2));
    
    const imageUrl = extractImageUrl(data);
    
    // ENHANCED VILLA PRICING - Handle seasonal pricing
    let priceValue = 0;
    let unit = 'day';
    let selectedPriceSource = 'none';
    const currentMonth = new Date().getMonth() + 1;
    const monthNames = {
      1: 'january',
      2: 'february', 
      3: 'march',
      4: 'april',
      5: 'may',
      6: 'june',
      7: 'july',
      8: 'august',
      9: 'september',
      10: 'october',
      11: 'november',
      12: 'december'
    };
    
    const monthlyFromConfigs = {};
    if (Array.isArray(data.priceConfigurations)) {
      data.priceConfigurations.forEach(cfg => {
        if (!cfg?.month || !cfg?.price) return;
        const normalized = cfg.month.toLowerCase();
        if (!seasonalMonthSet.has(normalized)) return;
        const numeric = toNumericPrice(cfg.price);
        if (numeric > 0) {
          monthlyFromConfigs[normalized] = {
            price: numeric,
            type: normalizeUnitType(cfg.type || 'week', 'week')
          };
        }
      });
    }

    const monthlyFromPricing = {};
    if (data.pricing?.monthly) {
      Object.entries(data.pricing.monthly).forEach(([month, value]) => {
        const normalized = month.toLowerCase();
        if (!seasonalMonthSet.has(normalized)) return;
        const numeric = toNumericPrice(value);
        if (numeric > 0) {
          const inferredType =
            typeof value === 'object' && value?.type
              ? value.type
              : 'week';
          monthlyFromPricing[normalized] = {
            price: numeric,
            type: normalizeUnitType(inferredType, 'week')
          };
        }
      });
    }

    const combinedMonthlyPricing = {
      ...monthlyFromPricing,
      ...monthlyFromConfigs
    };
    
    // Priority 1: Daily price from pricing.daily
    if (data.pricing?.daily && parseFloat(data.pricing.daily) > 0) {
      priceValue = parseFloat(data.pricing.daily);
      unit = 'day';
      selectedPriceSource = 'pricing.daily';
    }
    // Priority 2: Monthly seasonal pricing
    else if (Object.keys(combinedMonthlyPricing).length > 0) {
      const currentMonthName = monthNames[currentMonth];
      const monthlyPrice = combinedMonthlyPricing[currentMonthName];
      if (monthlyPrice?.price > 0) {
        priceValue = monthlyPrice.price;
        unit = normalizeUnitType(monthlyPrice.type || 'week', 'week');
        selectedPriceSource = `monthly.${currentMonthName}`;
      } else {
        const availableMonths = Object.keys(combinedMonthlyPricing);
        for (const month of availableMonths) {
          const monthPrice = combinedMonthlyPricing[month];
          if (monthPrice?.price > 0) {
            priceValue = monthPrice.price;
            unit = normalizeUnitType(monthPrice.type || 'week', 'week');
            selectedPriceSource = `monthly.${month}`;
            break;
          }
        }
      }
    }
    // Priority 3: Check price configurations (your current structure)
    else if (data.priceConfigurations && data.priceConfigurations.length > 0) {
      const priceConfig = data.priceConfigurations[0];
      priceValue = parseFloat(priceConfig.price) || 0;
      unit = priceConfig.type || 'day';
      selectedPriceSource = 'priceConfigurations';
    }
    // Priority 4: Direct price field
    else if (data.price && parseFloat(data.price) > 0) {
      priceValue = parseFloat(data.price);
      unit = 'day';
      selectedPriceSource = 'price';
    }
    // Priority 5: Daily price field
    else if (data.dailyPrice && parseFloat(data.dailyPrice) > 0) {
      priceValue = parseFloat(data.dailyPrice);
      unit = 'day';
      selectedPriceSource = 'dailyPrice';
    }
    
    console.log(`Villa pricing for ${data.name?.en || 'Unknown'}:`, {
      selectedPrice: priceValue,
      selectedUnit: unit,
      selectedPriceSource: selectedPriceSource,
      hasPricingStructure: !!data.pricing,
      hasPriceConfigurations: !!data.priceConfigurations
    });
    
    return {
      id: doc.id,
      ...data,
      price: priceValue,
      dailyPrice: priceValue,
      unit: unit,
      category: category.id,
      companyId: companyInfo.id,
      imageUrl: imageUrl,
      priceSource: selectedPriceSource,
      propertyLink: data.propertyLink || data.property_link || '',
      // Store original pricing structures for month selector
      originalPricing: {
        ...data.pricing,
        monthly: combinedMonthlyPricing
      },
      originalPriceConfigurations: data.priceConfigurations
    };
  });
} else if (category.id === 'boats') {
  services[category.id] = snapshot.docs.map(doc => {
    const data = doc.data();
    
    // Use the image extraction function for boats
    const imageUrl = extractImageUrl(data);
    
    // HANDLE YOUR ACTUAL FIRESTORE PRICING STRUCTURE
    let priceValue = 0;
    let unit = 'day';
    let selectedPriceSource = 'none';
    
    // Get current month to determine seasonal pricing
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    // Map month numbers to month names in your structure
    const monthNames = {
      1: 'january',
      2: 'february', 
      3: 'march',
      4: 'april',
      5: 'may',
      6: 'june',
      7: 'july',
      8: 'august',
      9: 'september',
      10: 'october',
      11: 'november',
      12: 'december'
    };
    
    // Priority 1: Daily price from pricing.daily
    if (data.pricing?.daily && parseFloat(data.pricing.daily) > 0) {
      priceValue = parseFloat(data.pricing.daily);
      unit = 'day';
      selectedPriceSource = 'pricing.daily';
    }
    
    // Priority 2: Current month seasonal price
    else if (data.pricing?.monthly) {
      const currentMonthName = monthNames[currentMonth];
      const currentMonthPrice = data.pricing.monthly[currentMonthName];
      
      if (currentMonthPrice && parseFloat(currentMonthPrice) > 0) {
        priceValue = parseFloat(currentMonthPrice);
        unit = 'day';
        selectedPriceSource = `pricing.monthly.${currentMonthName}`;
      }
      
      // If no current month price, try to find any available seasonal price
      else {
        const availableMonths = Object.keys(data.pricing.monthly);
        for (const month of availableMonths) {
          const monthPrice = data.pricing.monthly[month];
          if (monthPrice && parseFloat(monthPrice) > 0) {
            priceValue = parseFloat(monthPrice);
            unit = 'day';
            selectedPriceSource = `pricing.monthly.${month}`;
            break;
          }
        }
      }
    }
    
    // Priority 3: Fallback to standard price fields
    if (priceValue === 0) {
      if (data.price && parseFloat(data.price) > 0) {
        priceValue = parseFloat(data.price);
        unit = data.unit || 'day';
        selectedPriceSource = 'price';
      }
      else if (data.dailyPrice && parseFloat(data.dailyPrice) > 0) {
        priceValue = parseFloat(data.dailyPrice);
        unit = 'day';
        selectedPriceSource = 'dailyPrice';
      }
      else if (data.rate && parseFloat(data.rate) > 0) {
        priceValue = parseFloat(data.rate);
        unit = data.rateUnit || 'day';
        selectedPriceSource = 'rate';
      }
      // Only use hourly as last resort
      else if (data.hourlyRate && parseFloat(data.hourlyRate) > 0) {
        priceValue = parseFloat(data.hourlyRate);
        unit = 'hour';
        selectedPriceSource = 'hourlyRate';
      }
    }
    
    // DEBUG: Log the pricing data found
    console.log(`Boat pricing for ${data.name?.en || data.name || 'Unknown'}:`, {
      rawPricingData: data.pricing,
      currentMonth: currentMonth,
      currentMonthName: monthNames[currentMonth],
      currentMonthPrice: data.pricing?.monthly?.[monthNames[currentMonth]],
      selectedPrice: priceValue,
      selectedUnit: unit,
      selectedPriceSource: selectedPriceSource,
      availableMonthlyPrices: data.pricing?.monthly ? Object.keys(data.pricing.monthly).filter(month => 
        data.pricing.monthly[month] && parseFloat(data.pricing.monthly[month]) > 0
      ) : []
    });
    
    return {
      id: doc.id,
      ...data,
      price: priceValue,
      dailyPrice: priceValue,
      hourlyRate: parseFloat(data.hourlyRate || 0) || 0,
      unit: unit,
      category: category.id,
      companyId: companyInfo.id,
      imageUrl: imageUrl,
      priceSource: selectedPriceSource,
      // Store the original pricing structure for reference
      originalPricing: data.pricing,
      // Extract seasonal pricing in a flat structure for easy access
      seasonalPricing: data.pricing?.monthly ? {
        may: parseFloat(data.pricing.monthly.may || 0),
        june: parseFloat(data.pricing.monthly.june || 0),
        july: parseFloat(data.pricing.monthly.july || 0),
        august: parseFloat(data.pricing.monthly.august || 0),
        september: parseFloat(data.pricing.monthly.september || 0),
        october: parseFloat(data.pricing.monthly.october || 0)
      } : {}
    };
  });
} else if (category.id === 'cars') {
  services[category.id] = snapshot.docs.map(doc => {
    const data = doc.data();
    
    const imageUrl = extractImageUrl(data);
    
    // ENHANCED CAR PRICING - Handle seasonal pricing
    let priceValue = 0;
    let unit = 'day';
    let selectedPriceSource = 'none';
    
    // Priority 1: Daily price from pricing.daily
    if (data.pricing?.daily && parseFloat(data.pricing.daily) > 0) {
      priceValue = parseFloat(data.pricing.daily);
      unit = 'day';
      selectedPriceSource = 'pricing.daily';
    }
    // Priority 2: Check pricing structure daily
    else if (data.pricing?.dailyRate && parseFloat(data.pricing.dailyRate) > 0) {
      priceValue = parseFloat(data.pricing.dailyRate);
      unit = 'day';
      selectedPriceSource = 'pricing.dailyRate';
    }
    // Priority 3: Check for pricing.daily nested
    else if (data.pricing && data.pricing.daily && parseFloat(data.pricing.daily) > 0) {
      priceValue = parseFloat(data.pricing.daily);
      unit = 'day';
      selectedPriceSource = 'pricing.daily';
    }
    // Priority 4: Direct rate field
    else if (data.rate && parseFloat(data.rate) > 0) {
      priceValue = parseFloat(data.rate);
      unit = 'day';
      selectedPriceSource = 'rate';
    }
    // Priority 5: Direct price field
    else if (data.price && parseFloat(data.price) > 0) {
      priceValue = parseFloat(data.price);
      unit = data.unit || 'day';
      selectedPriceSource = 'price';
    }
    // Priority 6: Daily rate field
    else if (data.dailyRate && parseFloat(data.dailyRate) > 0) {
      priceValue = parseFloat(data.dailyRate);
      unit = 'day';
      selectedPriceSource = 'dailyRate';
    }
    
    console.log(`Car pricing for ${data.make} ${data.model}:`, {
      selectedPrice: priceValue,
      selectedUnit: unit,
      selectedPriceSource: selectedPriceSource,
      hasPricingStructure: !!data.pricing
    });
    
    return {
      id: doc.id,
      ...data,
      price: priceValue,
      dailyRate: priceValue,
      unit: unit,
      category: category.id,
      companyId: companyInfo.id,
      imageUrl: imageUrl,
      priceSource: selectedPriceSource,
      // Store original pricing for month selector
      originalPricing: data.pricing
    };
  });
} else if (category.id === 'security') {
              services[category.id] = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // Use the image extraction for security services too
                const imageUrl = extractImageUrl(data);
                
                // First check for rate field, then fall back to price
                const priceValue = data.rate !== undefined ? data.rate : 
                                  (data.price !== undefined ? data.price : 0);
                                  
                return {
                  id: doc.id,
                  ...data,
                  price: parseFloat(priceValue) || 0,
                  unit: data.unit || 'hour',
                  category: category.id,
                  companyId: companyInfo.id,
                  imageUrl: imageUrl
                };
              });
            } else {
              // Generic processing for other service types
              services[category.id] = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // Use image extraction for all service types
                const imageUrl = extractImageUrl(data);
                
                // Check for multiple possible price fields
                const priceValue = data.rate !== undefined ? data.rate : 
                                 (data.price !== undefined ? data.price : 
                                 (data.dailyRate !== undefined ? data.dailyRate : 
                                 (data.hourlyRate !== undefined ? data.hourlyRate : 0)));
                                 
                // Intelligent unit default based on category
                let unit = data.unit;
                if (!unit) {
                  if (category.id === 'chefs' || category.id === 'security' || category.id === 'nannies' || category.id === 'chef') {
                    unit = 'hour';
                  } else {
                    unit = 'day';
                  }
                }
                                  
                return {
                  id: doc.id,
                  ...data,
                  price: parseFloat(priceValue) || 0,
                  unit: unit,
                  category: category.id,
                  companyId: companyInfo.id,
                  imageUrl: imageUrl
                };
              });
            }
          } catch (error) {
            console.error(`Error fetching ${category.id}:`, error);
            services[category.id] = [];
          }
        }
        
        console.log("All services:", services);
console.log("=== IMAGE DEBUG ===");
Object.entries(services).forEach(([category, items]) => {
  console.log(`${category}: ${items.length} items`);
  items.forEach(item => {
    console.log(`  - ${item.name?.en || item.name}: ${item.imageUrl || 'NO IMAGE'}`);
  });
});
console.log("=== END DEBUG ===");
setAvailableServices(services);
      } catch (error) {
        console.error("Error fetching services:", error);
        setError(t.error);
      } finally {
        setLoadingServices(false);
      }
    };
    
    fetchServices();
  }, [companyInfo, serviceCategories, t.error]);
  
  // Fetch offer history when a client is selected
  useEffect(() => {
  const fetchOfferHistory = async () => {
      if (!selectedClient || !companyInfo) return;
      
      try {
        const offersRef = collection(db, "offers");
        const baseQuery = query(
          offersRef,
          where("clientId", "==", selectedClient.id),
          where("companyId", "==", companyInfo.id)
        );
        
        let querySnapshot = await getDocs(baseQuery);
        
        // Fallback: if nothing is found (older offers may miss companyId), try without company filter
        if (querySnapshot.empty) {
          const fallbackQuery = query(
            offersRef,
            where("clientId", "==", selectedClient.id)
          );
          querySnapshot = await getDocs(fallbackQuery);
        }
        
        const offersData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          let createdAt = '';
          if (data.createdAt) {
            if (data.createdAt instanceof Date) {
              createdAt = data.createdAt.toISOString().split('T')[0];
            } else if (data.createdAt.seconds) {
              createdAt = new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0];
            } else if (typeof data.createdAt === 'string') {
              createdAt = data.createdAt;
            }
          }
            
          return {
            id: doc.id,
            ...data,
            createdAt
          };
        });
        
        offersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOffersHistory(offersData);
      } catch (error) {
        console.warn("Offer history unavailable:", error?.message || error);
        setOffersHistory([]);
      }
    };
    
    fetchOfferHistory();
  }, [selectedClient, companyInfo]);

  // Fetch team members for assignment dropdown
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!companyInfo?.id) return;
      
      setLoadingTeamMembers(true);
      setTeamMembersError(null);
      try {
        const companyFilter = where('companyId', '==', companyInfo.id);
        
        let usersRef = collection(db, "authorized_users");
        let querySnapshot = await getDocs(query(usersRef, companyFilter));
        
        if (querySnapshot.empty) {
          usersRef = collection(db, "users");
          querySnapshot = await getDocs(query(usersRef, companyFilter));
        }
        
        const members = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          const displayName = (userData.name || userData.displayName || '').trim();
          members.push({
            id: doc.id,
            name: displayName || userData.email || doc.id,
            email: userData.email || '',
            role: userData.role || ''
          });
        });
        
        setTeamMembers(members);
      } catch (error) {
        console.warn("Team members unavailable:", error?.message || error);
        setTeamMembers([]);
        setTeamMembersError(error?.message || 'Unable to load team');
      } finally {
        setLoadingTeamMembers(false);
      }
    };
    
    fetchTeamMembers();
  }, [companyInfo]);
  
  // Handle navigation from other pages with clientId in state
  useEffect(() => {
    if (location.state?.clientId && clients.length > 0 && !selectedClient) {
      const clientToSelect = clients.find(c => c.id === location.state.clientId);
      if (clientToSelect) {
        handleSelectClient(clientToSelect);
        // On mobile, navigate to details view
        if (isMobile) {
          setCurrentView('details');
        }
        // Clear the location state to prevent re-selection on component updates
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, clients, selectedClient, isMobile]);
  
  // Fetch real-time reservations and finances for the selected client
  useEffect(() => {
    const fetchClientReservationsAndFinances = async () => {
      if (!selectedClient || !companyInfo) {
        console.log("Skipping reservation fetch - missing client or company info");
        return;
      }
      
      try {
        console.log("🔍 Fetching reservations for client:", selectedClient.name, selectedClient.id);
        console.log("Company ID:", companyInfo.id);
        
        // Fetch all reservations for this client from the reservations collection
        const reservationsQuery = query(
          collection(db, "reservations"),
          where("companyId", "==", companyInfo.id),
          where("clientId", "==", selectedClient.id)
        );
        
        const reservationsSnapshot = await getDocs(reservationsQuery);
        console.log(`✅ Found ${reservationsSnapshot.docs.length} reservations for client ${selectedClient.name}`);
        
        if (reservationsSnapshot.docs.length > 0) {
          console.log("Reservation data:", reservationsSnapshot.docs.map(doc => doc.data()));
        }
        
        // If no reservations found with clientId, try alternative queries
        let alternativeReservations = [];
        if (reservationsSnapshot.docs.length === 0) {
          console.log("🔍 No reservations found with clientId, trying alternative search by clientName...");
          
          // Try searching by clientName
          const altQuery = query(
            collection(db, "reservations"),
            where("companyId", "==", companyInfo.id),
            where("clientName", "==", selectedClient.name)
          );
          
          const altSnapshot = await getDocs(altQuery);
          console.log(`Found ${altSnapshot.docs.length} reservations by clientName`);
          
          if (altSnapshot.docs.length > 0) {
            console.log("⚠️ Warning: Reservations found by clientName but not clientId. Update them to include clientId.");
            alternativeReservations = altSnapshot.docs;
          }
        }
        
        const docsToProcess = reservationsSnapshot.docs.length > 0 
          ? reservationsSnapshot.docs 
          : alternativeReservations;
        
        const allReservations = docsToProcess.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Categorize reservations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingReservations = [];
        const pastStays = [];
        let currentStay = null;
        
        allReservations.forEach(res => {
          const checkIn = res.checkIn?.toDate ? res.checkIn.toDate() : new Date(res.checkIn);
          const checkOut = res.checkOut?.toDate ? res.checkOut.toDate() : new Date(res.checkOut);
          
          // Current stay: check-in is in the past, check-out is in the future
          if (checkIn <= today && checkOut >= today) {
            currentStay = {
              id: res.id,
              checkIn: res.checkIn,
              checkOut: res.checkOut,
              accommodationType: res.accommodationType,
              totalAmount: res.totalAmount || res.baseAmount,
              paymentStatus: res.paymentStatus,
              status: res.status
            };
          }
          // Upcoming: check-in is in the future
          else if (checkIn > today) {
            upcomingReservations.push({
              id: res.id,
              checkIn: res.checkIn,
              checkOut: res.checkOut,
              accommodationType: res.accommodationType,
              totalAmount: res.totalAmount || res.baseAmount,
              paymentStatus: res.paymentStatus,
              status: res.status
            });
          }
          // Past: check-out is in the past
          else if (checkOut < today) {
            pastStays.push({
              id: res.id,
              checkIn: res.checkIn,
              checkOut: res.checkOut,
              accommodationType: res.accommodationType,
              totalAmount: res.totalAmount || res.baseAmount,
              paymentStatus: res.paymentStatus,
              status: res.status
            });
          }
        });
        
        // Sort upcoming by check-in date (ascending)
        upcomingReservations.sort((a, b) => {
          const dateA = a.checkIn?.toDate?.() || new Date(a.checkIn);
          const dateB = b.checkIn?.toDate?.() || new Date(b.checkIn);
          return dateA - dateB;
        });
        
        // Sort past stays by check-out date (descending)
        pastStays.sort((a, b) => {
          const dateA = a.checkOut?.toDate?.() || new Date(a.checkOut);
          const dateB = b.checkOut?.toDate?.() || new Date(b.checkOut);
          return dateB - dateA;
        });
        
        // Update the selected client with fresh reservation data
        setSelectedClient(prev => ({
          ...prev,
          upcomingReservations,
          pastStays,
          currentStay
        }));
        
        console.log("Updated client with reservations:", {
          upcoming: upcomingReservations.length,
          past: pastStays.length,
          current: currentStay ? 'Yes' : 'No'
        });
        
      } catch (error) {
        console.error("Error fetching client reservations:", error);
      }
    };
    
    fetchClientReservationsAndFinances();
  }, [selectedClient?.id, companyInfo?.id]);
  
  // Initialize edit client data when a client is selected
  useEffect(() => {
    if (selectedClient) {
      setEditClientData({
        name: selectedClient.name || '',
        email: selectedClient.email || '',
        phone: selectedClient.phone || '',
        address: typeof selectedClient.address === 'object' 
          ? getLocalizedText(selectedClient.address, language) 
          : selectedClient.address || '',
        nationality: typeof selectedClient.nationality === 'object' 
          ? getLocalizedText(selectedClient.nationality, language) 
          : selectedClient.nationality || '',
        status: selectedClient.status || 'active',
        isVip: selectedClient.isVip || false,
        clientType: selectedClient.clientType || (selectedClient.isVip ? 'vip' : 'regular'),
        preferredLanguage: selectedClient.preferredLanguage || '',
        leadSource: selectedClient.leadSource || '',
        leadStatus: selectedClient.leadStatus || 'new',
        assignedTo: selectedClient.assignedTo || '',
        assignedToName: selectedClient.assignedToName || '',
        followUpDate: selectedClient.followUpDate || '',
        conversionPotential: selectedClient.conversionPotential || 'medium',
        budget: selectedClient.budget || '',
        startDate: selectedClient.startDate || '',
        endDate: selectedClient.endDate || '',
        propertyTypes: {
          villas: selectedClient.propertyTypes?.villas || false,
          apartments: selectedClient.propertyTypes?.apartments || false,
          hotels: selectedClient.propertyTypes?.hotels || false
        },
        activities: selectedClient.activities || '',
        adults: selectedClient.adults || 1,
        children: selectedClient.children || 0,
        isPreviousClient: selectedClient.isPreviousClient || false,
        dietaryRestrictions: selectedClient.dietaryRestrictions || '',
        transportPreferences: selectedClient.transportPreferences || '',
        specialRequests: selectedClient.specialRequests || '',
        notes: selectedClient.notes || '',
        contactPersons: Array.isArray(selectedClient.contactPersons) && selectedClient.contactPersons.length > 0
          ? selectedClient.contactPersons.map(cp => ({
              name: cp.name || '',
              email: cp.email || '',
              phone: cp.phone || ''
            }))
          : [{ name: '', email: '', phone: '' }]
      });
    }
  }, [selectedClient, language]);
  
  // Filter clients based on search term and filter
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      (client.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (client.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (client.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
    if (filter === 'all') return matchesSearch;
    if (filter === 'active') return matchesSearch && client.status === 'active';
    if (filter === 'inactive') return matchesSearch && client.status === 'inactive';
    if (filter === 'vip') return matchesSearch && client.isVip;
    
    return matchesSearch;
  });
  
  // Calculate total price of all services (after discounts)
  const calculateServicesTotal = (services) => {
    let total = 0;
    
    if (services) {
      Object.values(services).forEach(categoryItems => {
        categoryItems.forEach(item => {
          if (item.included) {
            if (item.discountValue) {
              total += calculateItemPrice(item);
            } else {
              total += ((item.originalPrice || item.price) * item.quantity);
            }
          }
        });
      });
    }
    
    return total;
  };

  // Calculate total from a flat services array
  const calculateServicesArrayTotal = (items = []) => {
    return items.reduce((sum, item) => {
      if (!item.included) return sum;
      if (item.discountValue) return sum + calculateItemPrice(item);
      return sum + ((item.price || 0) * (item.quantity || 0));
    }, 0);
  };

  // Keep only services that belong to the current offer (avoid leaking items from other offers)
  const filterServicesForOffer = (services, offerId) => {
    if (!services || !offerId) return {};
    const filtered = {};
    Object.entries(services).forEach(([category, items]) => {
      const safeItems = items
        .filter(item => !item.offerId || item.offerId === offerId)
        .map(item => ({ ...item }));
      if (safeItems.length) {
        filtered[category] = safeItems;
      }
    });
    return filtered;
  };
  
  // Filter services by price
  const filteredServices = (availableServices[selectedCategory] || []).filter(service => {
    const price = parseFloat(service.price);
    return price >= appliedMinPrice && price <= appliedMaxPrice;
  });
  const fetchAdminUserFromDb = async (companyId) => {
  try {
    console.log(`Fetching admin user for company: ${companyId}`);
    
    const usersRef = collection(db, "users");
    const adminQuery = query(
      usersRef,
      where("companyId", "==", companyId),
      where("role", "==", "admin")
    );
    
    const adminSnapshot = await getDocs(adminQuery);
    
    if (!adminSnapshot.empty) {
      const adminDoc = adminSnapshot.docs[0];
      const adminData = adminDoc.data();
      console.log("Found admin user:", adminData);
      
      return {
        name: adminData.displayName || adminData.name || '',
        email: adminData.email || '',
        phone: adminData.phone || '',
        website: adminData.website || '',
        address: adminData.address || ''
      };
    } else {
      console.warn(`No admin user found for company ${companyId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching admin user:", error);
    return null;
  }
};

const fetchCompanyAdminForPdf = async (companyId) => {
  try {
    console.log(`Getting PDF info for company: ${companyId}`);
    
    // Fetch both company details and admin user
    const [companyDetails, adminUser] = await Promise.all([
      fetchCompanyDetailsFromDb(companyId),
      fetchAdminUserFromDb(companyId)
    ]);
    
    console.log("Company details from DB:", companyDetails);
    console.log("Admin user from DB:", adminUser);
    
    // Combine the information, preferring admin user details where available
    const pdfInfo = {
      companyName: companyDetails?.name || `Company ${companyId}`,
      contactName: adminUser?.name || companyDetails?.name || `Company ${companyId}`,
      email: adminUser?.email || companyDetails?.email || '',
      phone: adminUser?.phone || companyDetails?.phone || '',
      website: adminUser?.website || companyDetails?.website || '',
      address: adminUser?.address || companyDetails?.address || '',
      logoUrl: companyDetails?.logoUrl || companyInfo?.logoUrl || null
    };
    
    console.log("Final PDF info:", pdfInfo);
    return pdfInfo;
    
  } catch (error) {
    console.error("Error getting PDF company info:", error);
    
    // Fallback to current companyInfo if database fetch fails
    return {
      companyName: companyInfo?.name || `Company ${companyId}`,
      contactName: companyInfo?.name || `Company ${companyId}`,
      email: companyInfo?.email || '',
      phone: companyInfo?.phone || '',
      website: companyInfo?.website || '',
      address: companyInfo?.address || '',
      logoUrl: companyInfo?.logoUrl || null
    };
  }
};
  // Handle converting an offer to a reservation
  const handleConvertOfferToReservation = async (offer) => {
    if (!offer || !selectedClient || !companyInfo || !currentUser) return;
    
    try {
      // First, check if this offer has already been converted to a reservation
      if (offer.status === 'booked') {
        alert('This offer has already been converted to a reservation.');
        return;
      }
      
      // Create basic reservation data from the offer
      const reservationData = {
        clientId: selectedClient.id,
        companyId: companyInfo.id,
        offerId: offer.id,
        checkIn: new Date().toISOString().split('T')[0], // Default to today
        checkOut: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 7 days later
        adults: 2,
        children: 0,
        accommodationType: '',
        notes: '',
        status: 'confirmed',
        baseAmount: offer.totalValue,
        totalAmount: offer.totalValue,
        totalPaid: 0,
        paymentStatus: 'unpaid',
        extras: [],
        collaboratorId: ''
      };
      
      // Transform offer items to include payment tracking for each service
      const servicesWithPayment = {};
      
      // Group items by category
      offer.items.forEach(item => {
        const category = item.category || 'other';
        if (!servicesWithPayment[category]) {
          servicesWithPayment[category] = [];
        }
        servicesWithPayment[category].push({
          ...item,
          included: true,
          // Add payment tracking properties
          paymentStatus: 'unpaid',
          amountPaid: 0,
          startDate: reservationData.checkIn,
          endDate: reservationData.checkOut,
          offerId: offer.id
        });
      });
      
      // Look for accommodation in the offer items
      const accommodationItem = offer.items.find(item => 
        item.category === 'villas' || 
        (typeof item.name === 'string' && 
         (item.name.toLowerCase().includes('villa') || 
          item.name.toLowerCase().includes('room') || 
          item.name.toLowerCase().includes('apartment')))
      );
      
      if (accommodationItem) {
        reservationData.accommodationType = typeof accommodationItem.name === 'object' 
          ? getLocalizedText(accommodationItem.name, language) 
          : accommodationItem.name;
      }
      
      // Set state to show conversion form
      setReservationFromOffer({
        offer: offer,
        reservationData: reservationData,
        services: servicesWithPayment
      });
      
      // On mobile devices, switch to the reservation form view
      if (isMobile) {
        setCurrentView('reservation-from-offer');
      }
      
    } catch (error) {
      console.error("Error preparing offer conversion:", error);
      setError(t.error || "An error occurred");
    }
  };
  
  // Handle form input changes for reservation from offer
  const handleReservationFromOfferChange = (e) => {
    const { name, value } = e.target;
    setReservationFromOffer(prev => ({
      ...prev,
      reservationData: {
        ...prev.reservationData,
        [name]: value
      }
    }));
  };
  
  // Finalize creating a reservation from an offer
  const handleFinalizeReservationFromOffer = async (e) => {
    e.preventDefault();
    
    if (!reservationFromOffer || !selectedClient || !companyInfo || !currentUser) {
      return;
    }
    
    try {
      const { offer, reservationData, services } = reservationFromOffer;
      
      // Extract included services and calculate booking dates from service dates
      const includedServices = [];
      let hasAccommodation = false;
      let totalPaid = 0;
      let earliestStartDate = null;
      let latestEndDate = null;
      
      const servicesForThisOffer = filterServicesForOffer(services, offer.id);
      
      if (servicesForThisOffer && Object.keys(servicesForThisOffer).length) {
        Object.entries(servicesForThisOffer).forEach(([category, items]) => {
          items.forEach(item => {
            if (item.included) {
              // Add payment information
              totalPaid += parseFloat(item.amountPaid || 0);
              
              // Get service dates (use today as fallback if not set)
              const serviceStartDate = item.startDate || new Date().toISOString().split('T')[0];
              const serviceEndDate = item.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              
              // Track earliest start and latest end dates for booking
              if (!earliestStartDate || serviceStartDate < earliestStartDate) {
                earliestStartDate = serviceStartDate;
              }
              if (!latestEndDate || serviceEndDate > latestEndDate) {
                latestEndDate = serviceEndDate;
              }
              
              // Add this service to the included services
              includedServices.push({
                ...item,
                id: item.id || `${category}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
                startDate: serviceStartDate,
                endDate: serviceEndDate,
                paymentStatus: item.paymentStatus || 'unpaid',
                amountPaid: parseFloat(item.amountPaid || 0)
              });
              
              // Check if we have at least one accommodation
              if (category === 'villas' || 
                 (typeof item.name === 'string' && 
                  (item.name.toLowerCase().includes('villa') || 
                   item.name.toLowerCase().includes('room') || 
                   item.name.toLowerCase().includes('apartment')))) {
                hasAccommodation = true;
              }
            }
          });
        });
      
      } else {
        // If services weren't explicitly selected, include all from the offer
        offer.items.forEach(item => {
          // Get service dates from item or use defaults
          const serviceStartDate = item.startDate || new Date().toISOString().split('T')[0];
          const serviceEndDate = item.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          // Track earliest start and latest end dates for booking
          if (!earliestStartDate || serviceStartDate < earliestStartDate) {
            earliestStartDate = serviceStartDate;
          }
          if (!latestEndDate || serviceEndDate > latestEndDate) {
            latestEndDate = serviceEndDate;
          }
          
          includedServices.push({
            ...item,
            id: item.id || `${item.category || 'service'}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
            included: true,
            startDate: serviceStartDate,
            endDate: serviceEndDate,
            paymentStatus: 'unpaid',
            amountPaid: 0,
            offerId: offer.id
          });
          
          // Check if we have at least one accommodation
          if (item.category === 'villas' || 
             (typeof item.name === 'string' && 
              (item.name.toLowerCase().includes('villa') || 
               item.name.toLowerCase().includes('room') || 
               item.name.toLowerCase().includes('apartment')))) {
            hasAccommodation = true;
          }
        });
      }
      
      // Calculate booking dates from service dates (earliest start, latest end)
      const bookingCheckIn = earliestStartDate || new Date().toISOString().split('T')[0];
      const bookingCheckOut = latestEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Determine main accommodation type
      let mainAccommodationType = "Various Services";
      if (hasAccommodation) {
        // Find the first accommodation item
        const accommodationItem = includedServices.find(item => 
          item.category === 'villas' || 
          (typeof item.name === 'string' && 
           (item.name.toLowerCase().includes('villa') || 
            item.name.toLowerCase().includes('room') || 
            item.name.toLowerCase().includes('apartment')))
        );
        
        if (accommodationItem) {
          mainAccommodationType = typeof accommodationItem.name === 'object' 
            ? getLocalizedText(accommodationItem.name, language) 
            : accommodationItem.name;
        }
      }
      
      // Determine overall payment status
      // Total should reflect the services we are actually including in this booking
      const totalAmount = calculateServicesArrayTotal(includedServices);
      let overallPaymentStatus = 'unpaid';
      
      if (totalAmount > 0) {
        if (totalPaid >= totalAmount) {
          overallPaymentStatus = 'paid';
        } else if (totalPaid > 0) {
          overallPaymentStatus = 'partially_paid';
        }
      }

      // Build initial payment history entries based on pre-paid services (so per-service payments show up)
      const conversionPaymentDate = new Date();
      const initialPaymentHistory = includedServices
        .filter(item => (parseFloat(item.amountPaid) || 0) > 0)
        .map((item, idx) => ({
          id: `offer-payment-${Date.now()}-${idx}`,
          amount: parseFloat(item.amountPaid) || 0,
          method: 'offer-conversion',
          notes: 'Imported from offer conversion',
          serviceId: item.id,
          serviceName: typeof item.name === 'object' ? getLocalizedText(item.name, language) : item.name,
          date: conversionPaymentDate,
          createdAt: conversionPaymentDate,
          createdBy: currentUser.uid
        }));
      
      // Save reservation to Firestore - using dates calculated from service dates
      const reservationsRef = collection(db, "reservations");
      const docRef = await addDoc(reservationsRef, {
        clientId: selectedClient.id,
        companyId: companyInfo.id,
        offerId: offer.id,
        checkIn: bookingCheckIn,
        checkOut: bookingCheckOut,
        adults: parseInt(reservationData.adults) || 2,
        children: parseInt(reservationData.children) || 0,
        accommodationType: mainAccommodationType,
        notes: reservationData.notes,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        status: 'confirmed',
        collaboratorId: reservationData.collaboratorId || null,
        baseAmount: totalAmount,
        totalAmount: totalAmount,
        totalPaid: totalPaid,
        paidAmount: totalPaid,
        paymentStatus: overallPaymentStatus,
        services: includedServices,
        paymentHistory: initialPaymentHistory,
        lastPaymentDate: initialPaymentHistory.length ? conversionPaymentDate : null,
        lastPaymentMethod: initialPaymentHistory.length ? 'offer-conversion' : null
      });
      
      // Update the offer status to 'booked'
      const offerRef = doc(db, "offers", offer.id);
      await updateDoc(offerRef, { 
        status: 'booked',
        updatedAt: new Date(),
        updatedBy: currentUser.uid
      });
      
      // Update offer history in UI
      setOffersHistory(prev => prev.map(o => 
        o.id === offer.id ? { ...o, status: 'booked' } : o
      ));
      
      // Create a UI-friendly reservation object
      const uiReservation = {
        id: docRef.id,
        checkIn: reservationData.checkIn,
        checkOut: reservationData.checkOut,
        accommodationType: mainAccommodationType,
        offerReference: offer.id.slice(-5), // Add reference to the original offer
        totalAmount: totalAmount,
        paymentStatus: overallPaymentStatus,
        totalPaid: totalPaid
      };
      
      // Update client with new reservation
      const clientRef = doc(db, "clients", selectedClient.id);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const upcomingReservations = clientDoc.data().upcomingReservations || [];
        await updateDoc(clientRef, { 
          upcomingReservations: [...upcomingReservations, uiReservation] 
        });
        
        // Update client in UI
        const updatedClient = {
          ...selectedClient,
          upcomingReservations: [...(selectedClient.upcomingReservations || []), uiReservation]
        };
        
        setSelectedClient(updatedClient);
        setClients(prev => prev.map(client => 
          client.id === selectedClient.id ? updatedClient : client
        ));
      }
      
      // Reset form and show success message
      setReservationFromOffer(null);
      
      if (isMobile) {
        setCurrentView('details');
      }
      
      alert(`Booking created successfully from offer #${offer.id.slice(-5)}`);
      
    } catch (error) {
      console.error("Error creating reservation from offer:", error);
      setError(t.error || "An error occurred");
    }
  };
  
  // Handle client selection
  // Enhanced handleSelectClient function that ensures all client fields are present
const handleSelectClient = async (client) => {
  try {
    // Fetch the complete client document from Firestore to ensure all fields
    const clientRef = doc(db, "clients", client.id);
    const clientDoc = await getDoc(clientRef);
    
    if (clientDoc.exists()) {
      const data = clientDoc.data();
      console.log("Full client data from Firestore:", { id: clientDoc.id, ...data });
      
      // Process any timestamps
      const createdAt = data.createdAt ? 
        (data.createdAt instanceof Date ? 
          data.createdAt : 
          new Date(data.createdAt.seconds * 1000)) : 
        null;
      
      // Create a complete client object with all available fields
      const completeClient = {
        id: clientDoc.id,
        ...data,
        createdAt: createdAt,
        // Ensure these basic fields exist
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        nationality: data.nationality || '',
        status: data.status || 'active',
        isVip: data.isVip || false,
        preferredLanguage: data.preferredLanguage || '',
        // Include additional fields
        activities: data.activities || '',
        budget: data.budget || '',
        leadSource: data.leadSource || '',
        leadStatus: data.leadStatus || '',
        conversionPotential: data.conversionPotential || '',
        assignedTo: data.assignedTo || '',
        followUpDate: data.followUpDate || '',
        isPreviousClient: data.isPreviousClient || false,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        adults: data.adults || 0,
        children: data.children || 0,
        propertyTypes: data.propertyTypes || {},
        contactPersons: data.contactPersons || [],
        // Ensure reservation arrays exist
        upcomingReservations: data.upcomingReservations || [],
        pastStays: data.pastStays || [],
        currentStay: data.currentStay || null
      };
      
      console.log("Complete processed client:", completeClient);
      setSelectedClient(completeClient);
    } else {
      console.warn("Client document not found for ID:", client.id);
      setSelectedClient(client);
    }
    
    setShowCreateOffer(false);
    setShowCreateReservation(false);
    setShowEditClient(false);
    
    if (autoReservationQueued) {
      setShowCreateReservation(true);
      handleCancelQuickBooking();
      if (isMobile) {
        setCurrentView('reservation');
      }
    } else if (isMobile) {
      setCurrentView('details');
    }
  } catch (error) {
    console.error("Error fetching complete client:", error);
    setSelectedClient(client);
  }
};
  
  // Apply discount to selected items
  const handleApplyDiscount = () => {
    if (selectedItems.length === 0) return;
    
    setOfferItems(prev => prev.map(item => {
      if (selectedItems.includes(item.id)) {
        return {
          ...item,
          discountType,
          discountValue
        };
      }
      return item;
    }));
    
    // Clear selection after applying
    setSelectedItems([]);
  };
  
  // Calculate price for an individual item after its discount
  // IMPORTANT: Always use originalPrice (not price) to avoid double-discounting
  const calculateItemPrice = (item) => {
    const basePrice = item.originalPrice || item.price;
    if (!item.discountValue) return basePrice * item.quantity;
    
    const itemTotal = basePrice * item.quantity;
    if (item.discountType === 'percentage') {
      const discountAmount = itemTotal * (item.discountValue / 100);
      return Math.max(itemTotal - discountAmount, 0);
    } else {
      return Math.max(itemTotal - item.discountValue, 0);
    }
  };
  
  // Handle back to list on mobile
  const handleBackToList = () => {
    if (isMobile) {
      setCurrentView('list');
    }
  };
  
  // Handle back to details on mobile
  const handleBackToDetails = () => {
    if (isMobile) {
      setCurrentView('details');
      setShowCreateOffer(false);
      setShowCreateReservation(false);
      setShowEditClient(false);
    }
  };
  
  // Handle client deletion
  const handleDeleteClient = async () => {
    if (!selectedClient || !companyInfo) return;
    
    if (window.confirm(t.confirmDelete)) {
      try {
        if (selectedClient.companyId !== companyInfo.id) {
          throw new Error("Not authorized to delete this client");
        }
        
        // 1. Find and delete all bookings for this client
        const bookingsQuery = query(
          collection(db, "reservations"),
          where("companyId", "==", companyInfo.id),
          where("clientId", "==", selectedClient.id)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        // For each booking, delete its finance records then the booking itself
        const deleteBookingsPromises = bookingsSnapshot.docs.map(async (bookingDoc) => {
          // Skip bookings that don't belong to this company to avoid permission errors
          const bookingData = bookingDoc.data();
          if (bookingData?.companyId !== companyInfo.id) {
            console.warn("Skipping booking from another company:", bookingDoc.id);
            return null;
          }
          
          // Delete finance records for this booking
          const financeQuery = query(
            collection(db, "financeRecords"),
            where("companyId", "==", companyInfo.id),
            where("bookingId", "==", bookingDoc.id)
          );
          const financeSnapshot = await getDocs(financeQuery);
          const deleteFinancePromises = financeSnapshot.docs
            .filter(fDoc => fDoc.data()?.companyId === companyInfo.id)
            .map(fDoc => deleteDoc(fDoc.ref));
          await Promise.all(deleteFinancePromises);
          
          // Delete the booking
          return deleteDoc(bookingDoc.ref);
        });
        
        await Promise.all(deleteBookingsPromises);
        
        // 2. Delete any finance records directly tied to this client (safety cleanup)
        const clientFinanceQuery = query(
          collection(db, "financeRecords"),
          where("companyId", "==", companyInfo.id),
          where("clientId", "==", selectedClient.id)
        );
        const clientFinanceSnapshot = await getDocs(clientFinanceQuery);
        const deleteClientFinancePromises = clientFinanceSnapshot.docs
          .filter(fDoc => fDoc.data()?.companyId === companyInfo.id)
          .map(fDoc => deleteDoc(fDoc.ref));
        await Promise.all(deleteClientFinancePromises);
        
        // 3. Delete all offers for this client
        const offersQuery = query(
          collection(db, "offers"),
          where("companyId", "==", companyInfo.id),
          where("clientId", "==", selectedClient.id)
        );
        const offersSnapshot = await getDocs(offersQuery);
        const deleteOffersPromises = offersSnapshot.docs
          .filter(oDoc => oDoc.data()?.companyId === companyInfo.id)
          .map(oDoc => deleteDoc(oDoc.ref));
        await Promise.all(deleteOffersPromises);
        
        console.log(`Deleted ${offersSnapshot.docs.length} offers for client ${selectedClient.name}`);
        
        // 4. Delete the client document
        const clientRef = doc(db, "clients", selectedClient.id);
        await deleteDoc(clientRef);
        
        setClients(prev => prev.filter(client => client.id !== selectedClient.id));
        setSelectedClient(null);
        
        // On mobile, switch to list view after deletion
        if (isMobile) {
          setCurrentView('list');
        }
      } catch (error) {
        console.error("Error deleting client:", error);
        setError(t.error);
      }
    }
  };
  
  // Handle editing client
  const handleEditClient = () => {
    if (isMobile) {
      setCurrentView('edit');
    }
    setShowEditClient(true);
  };
  
  // Handle saving client changes
  const handleSaveClient = async () => {
    if (!selectedClient || !companyInfo) return;
    
    try {
      const clientRef = doc(db, "clients", selectedClient.id);
      const selectedAssignee = teamMembers.find(member => member.id === editClientData.assignedTo);
      
      // Prepare data for update
      const updatedData = {
        ...editClientData,
        clientType: editClientData.clientType || (editClientData.isVip ? 'vip' : 'regular'),
        isVip: editClientData.clientType === 'vip' || editClientData.isVip,
        assignedToName: selectedAssignee?.name || editClientData.assignedToName || '',
        // Handle multilingual fields
        address: typeof selectedClient.address === 'object' 
          ? { ...selectedClient.address, [language]: editClientData.address } 
          : editClientData.address,
        nationality: typeof selectedClient.nationality === 'object' 
          ? { ...selectedClient.nationality, [language]: editClientData.nationality } 
          : editClientData.nationality,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid
      };
      
      await updateDoc(clientRef, updatedData);
      
      // Update the client in the state
      const updatedClient = {
        ...selectedClient,
        ...updatedData
      };
      
      setSelectedClient(updatedClient);
      setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));
      
      // Close the edit form
      setShowEditClient(false);
      if (isMobile) {
        setCurrentView('details');
      }
      
      alert(t.clientUpdatedSuccess);
    } catch (error) {
      console.error("Error updating client:", error);
      setError(t.error);
    }
  };
  
  // Handle edit form input changes
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditClientData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'clientType') {
        updated.isVip = value === 'vip';
      }

      if (name === 'assignedTo') {
        const assignee = teamMembers.find(member => member.id === value);
        updated.assignedToName = assignee?.name || '';
      }

      // Numeric fields
      if (name === 'adults' || name === 'children' || name === 'budget') {
        updated[name] = value === '' ? '' : Number(value);
      }

      return updated;
    });
  };

  const handleEditPropertyTypeChange = (e) => {
    const { name, checked } = e.target;
    const [, property] = name.split('.');
    setEditClientData(prev => ({
      ...prev,
      propertyTypes: {
        ...prev.propertyTypes,
        [property]: checked
      }
    }));
  };

  const handleEditContactChange = (index, e) => {
    const { name, value } = e.target;
    setEditClientData(prev => {
      const updatedContacts = [...prev.contactPersons];
      updatedContacts[index] = {
        ...updatedContacts[index],
        [name]: value
      };
      return { ...prev, contactPersons: updatedContacts };
    });
  };

  const addEditContactPerson = () => {
    setEditClientData(prev => ({
      ...prev,
      contactPersons: [...prev.contactPersons, { name: '', email: '', phone: '' }]
    }));
  };

  const removeEditContactPerson = (index) => {
    setEditClientData(prev => ({
      ...prev,
      contactPersons: prev.contactPersons.filter((_, i) => i !== index)
    }));
  };

  // Auto-hide offer notifications
  useEffect(() => {
    if (!offerNotice) return;
    const timer = setTimeout(() => setOfferNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [offerNotice]);
  
  // Add service to offer
  const handleAddToOffer = (service, forceStayOfferView = false) => {
    if (!service) return;

    // For core concierge services, require manual price/details entry
    if (service.category === 'concierge-core') {
      const nameText = typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name;
      setCustomService({
        name: nameText || '',
        price: '',
        quantity: 1,
        description: ''
      });
      setCustomServiceUnit('service');
      setPendingService(service);
      setCustomServiceOpen(true);
      setOfferNotice(t.addCustomPrompt || 'Set price and details to add this service.');
      if (isMobile || forceStayOfferView) {
        setCurrentView('offer');
      }
      return;
    }
    
    const selectedMonthKey = selectedSeasonMonths[service.id] || 'daily';
    const monthOptions = getMonthlyOptionsForService(service, language, t);
    const selectedMonthOption = selectedMonthKey !== 'daily'
      ? monthOptions.find(option => option.month === selectedMonthKey)
      : null;
    
    const lineItemId = selectedMonthOption
      ? `${service.id}-${selectedMonthOption.month}`
      : service.id;
    
    const basePrice = selectedMonthOption
      ? selectedMonthOption.price
      : toNumericPrice(service.originalPricing?.daily || service.price);
    
    const priceToUse = basePrice > 0 ? basePrice : 0;
    const unitForItem = selectedMonthOption
      ? selectedMonthOption.type
      : (service.unit || (service.category === 'chefs' || service.category === 'chef' || service.category === 'security' || service.category === 'nannies' ? 'hour' : 'day'));
    
    const existingItem = offerItems.find(item => item.id === lineItemId);
    
    if (existingItem) {
      setOfferItems(prev => prev.map(item => 
        item.id === lineItemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      return;
    }
    
    const newItem = {
      id: lineItemId,
      serviceId: service.id,
      name: service.name,
      category: service.category,
      price: priceToUse,
      originalPrice: priceToUse,
      unit: unitForItem,
      quantity: 1,
      discountType: 'percentage',
      discountValue: 0,
      hasCustomDiscount: false,
      selectedMonth: selectedMonthOption ? selectedMonthOption.month : null,
      selectedMonthLabel: selectedMonthOption ? selectedMonthOption.label : null,
      propertyLink: service.propertyLink || '',
      imageUrl: service.imageUrl,
      model: service.model,
      length: service.length,
      capacity: service.capacity
    };
    
    setOfferItems(prev => [...prev, newItem]);
    const nameText = typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name;
    setOfferNotice(`${nameText || 'Service'} ${t.addedToOfferNotice || 'added to offer'}`);
    
    if (isMobile) {
      setTimeout(() => setCurrentView('cart'), 300);
    }
  };
  
  // Remove service from offer
  const handleRemoveFromOffer = (serviceId) => {
    setOfferItems(prev => prev.filter(item => item.id !== serviceId));
  };
  const handleCustomServiceChange = (e) => {
    const { name, value } = e.target;
    setCustomService(prev => ({ ...prev, [name]: name === 'quantity' ? value.replace(/[^0-9]/g, '') : value }));
  };

  const handleAddCustomService = () => {
    const price = parseFloat(customService.price);
    const quantity = Math.max(1, parseInt(customService.quantity, 10) || 1);
    if (!customService.name || Number.isNaN(price)) {
      setOfferNotice(t.addCustomService);
      return;
    }
    const id = `custom-${Date.now()}`;
    const newItem = {
      id,
      serviceId: id,
      name: customService.name,
      category: pendingService?.category || 'custom',
      price: price,
      originalPrice: price,
      unit: 'service',
      customUnit: customServiceUnit,
      quantity,
      discountType: 'percentage',
      discountValue: 0,
      hasCustomDiscount: false,
      selectedMonth: null,
      selectedMonthLabel: null,
      propertyLink: '',
      imageUrl: '',
      description: customService.description || ''
    };
    setOfferItems(prev => [...prev, newItem]);
    setOfferNotice(`${customService.name} ${t.addedToOfferNotice || 'added to offer'}`);
    setCustomService({ name: '', price: '', quantity: 1, description: '' });
    setCustomServiceUnit('service');
    setCustomServiceOpen(false);
    setPendingService(null);
  };
  
  // Update quantity in offer
  const handleQuantityChange = (serviceId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setOfferItems(prev => prev.map(item => 
      item.id === serviceId ? { ...item, quantity: newQuantity } : item
    ));
  };
  
  // Calculate subtotal (before discount)
  const calculateSubtotal = () => offerItems.reduce((total, item) => total + ((item.originalPrice || item.price) * item.quantity), 0);
  
  // Calculate discount amount
  const calculateDiscountAmount = (subtotal) => {
    return discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
  };
  
  // Calculate total price (after discount)
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount(subtotal);
    return Math.max(subtotal - discountAmount, 0);
  };
  
  // Apply price filter
  const handleApplyPriceFilter = () => {
    setAppliedMinPrice(minPrice === '' ? 0 : parseFloat(minPrice));
    setAppliedMaxPrice(maxPrice === '' ? Infinity : parseFloat(maxPrice));
    setShowPriceFilter(false);
  };
  
  // Reset price filter
  const handleResetPriceFilter = () => {
    setMinPrice('');
    setMaxPrice('');
    setAppliedMinPrice(0);
    setAppliedMaxPrice(Infinity);
    setShowPriceFilter(false);
  };
  
  // Send/save offer
  const handleSaveOffer = async () => {
    if (!selectedClient || !companyInfo || !currentUser) return;
    
    if (offerItems.length === 0) {
      alert('Please add at least one service to the offer.');
      return;
    }
    
    try {
      const rawOfferData = {
        clientId: selectedClient.id,
        companyId: companyInfo.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        items: offerItems, // This now includes the discountType and discountValue for each item
        totalValue: calculateTotal(),
        notes: offerNotes,
        subtotal: calculateSubtotal(),
        status: 'draft',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      };
      const offerData = removeUndefinedFields(rawOfferData);
      
      let docRef;
      let offerWithId;
      
      if (currentEditingOffer) {
        // Update existing offer
        docRef = doc(db, "offers", currentEditingOffer.id);
        await updateDoc(docRef, {
          ...offerData,
          updatedAt: new Date(),
          updatedBy: currentUser.uid
        });
        
        offerWithId = {
          id: currentEditingOffer.id,
          ...offerData,
          createdAt: currentEditingOffer.createdAt
        };
        
        // Update offers history
        setOffersHistory(prev => prev.map(offer => 
          offer.id === currentEditingOffer.id ? offerWithId : offer
        ));
        
        alert(`${t.updateOffer} ${selectedClient.name}`);
      } else {
        // Create new offer
        docRef = await addDoc(collection(db, "offers"), offerData);
        const displayDate = new Date().toISOString().split('T')[0];
        
        offerWithId = {
          id: docRef.id,
          ...offerData,
          createdAt: displayDate
        };
        
        setOffersHistory(prev => [offerWithId, ...prev]);
        alert(`${t.offerSavedSuccess} ${selectedClient.name}`);
      }
      
      // Reset form
      setCurrentEditingOffer(null);
      setOfferItems([]);
      setOfferNotes('');
      setDiscountType('percentage');
      setDiscountValue(0);
      setShowCreateOffer(false);
      
      if (isMobile) {
        setCurrentView('details');
      }
    } catch (error) {
      console.error("Error saving offer:", error);
      setError(t.error);
    }
  };
  
  // View offer details
  const handleViewOfferDetails = (offer) => {
    if (!offer) return;
    
    // Set current editing offer
    setCurrentEditingOffer(offer);
    
    // Load offer data into form
    setOfferItems(offer.items);
    setOfferNotes(offer.notes || '');
    setDiscountType(offer.discountType || 'percentage');
    setDiscountValue(offer.discountValue || 0);
    
    // Show create/edit offer modal
    setShowCreateOffer(true);
    if (isMobile) {
      setCurrentView('offer');
    }
  };
  
  
  
  // Generate PDF for offer with enhanced luxury design - UPDATED for generic company use
const generateOfferPdf = async (offer) => {
  if (!offer || !companyInfo) return;
  
  // ALWAYS use English for PDF as requested
  const pdfLocale = 'en-GB';
  const pdfStrings = translations.en;
  
  const currencyFormatter = new Intl.NumberFormat(pdfLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  });
  const formatCurrency = (value = 0) => currencyFormatter.format(value || 0);
  
  setIsGeneratingPdf(true);
  
  try {
    // Pre-load all images that will be needed
    const imageCache = {};
    
    // Process all items to pre-fetch images
    for (const currentItem of offer.items) {
      if (currentItem.imageUrl) {
        try {
          console.log(`Pre-loading image for item: ${currentItem.id || 'unknown'}`);
          const imageData = await fetchImageWithAuth(currentItem.imageUrl, currentItem.id || 'unknown');
          if (imageData) {
            imageCache[currentItem.imageUrl] = imageData;
            console.log(`Successfully loaded image for item: ${currentItem.id || 'unknown'}`);
          }
        } catch (error) {
          console.error(`Failed to pre-load image for item: ${currentItem.id || 'unknown'}`, error);
        }
      }
    }
    
    // Create the PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Set up luxury fonts
    doc.setFont("helvetica", "bold");
    
    // Add a luxury background touch - subtle gold gradient at the top
    doc.setFillColor(250, 246, 231); // Very light gold
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFillColor(248, 242, 220); // Slightly darker gold
    doc.rect(0, 40, 210, 5, 'F');
    
    // Add company logo if available, otherwise use company name
    if (companyInfo.logoUrl && imageCache[companyInfo.logoUrl]) {
      try {
        // Add company logo in a tasteful size
        doc.addImage(imageCache[companyInfo.logoUrl], 'JPEG', 85, 10, 40, 20, undefined, 'FAST');
      } catch (logoError) {
        console.error("Error adding company logo:", logoError);
        // Fall back to text if logo fails
        doc.setFontSize(28);
        doc.setTextColor(32, 32, 64);
        doc.text(companyInfo.name, 105, 22, { align: 'center' });
      }
    } else {
      // No logo, use text
      doc.setFontSize(28);
      doc.setTextColor(32, 32, 64); // Deep navy blue
      doc.text(companyInfo.name, 105, 22, { align: 'center' });
    }
    
    // Add elegant divider
    doc.setDrawColor(180, 160, 120); // Gold tone
    doc.setLineWidth(0.5);
    doc.line(40, 32, 170, 32);
    
    // ONLY SHOW COMPANY CONTACT INFORMATION IF IT HAS ACTUAL VALUES
    const hasValidPhone = companyInfo.phone && companyInfo.phone.trim() !== '' && companyInfo.phone !== '-';
    const hasValidEmail = companyInfo.email && companyInfo.email.trim() !== '' && companyInfo.email !== '-';
    const hasValidWebsite = companyInfo.website && companyInfo.website.trim() !== '' && companyInfo.website !== '-';
    
    if (hasValidPhone || hasValidEmail || hasValidWebsite) {
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 90);
      doc.setFont("helvetica", "normal");
      
      // Contact info in a horizontal layout to appear more elegant
      const contactInfoY = 38;
      const contactParts = [];
      
      if (hasValidPhone) contactParts.push(`Tel: ${companyInfo.phone}`);
      if (hasValidEmail) contactParts.push(`Email: ${companyInfo.email}`);
      if (hasValidWebsite) contactParts.push(`Web: ${companyInfo.website}`);
      
      // Display contact parts with separators
      if (contactParts.length > 0) {
        const contactText = contactParts.join(' | ');
        doc.text(contactText, 105, contactInfoY, { align: 'center' });
      }
    }
    
    // Add offer title with luxury styling
    doc.setFontSize(18);
    doc.setTextColor(32, 32, 64); // Deep navy blue
    doc.setFont("helvetica", "bold");
    doc.text(`EXCLUSIVE OFFER #${offer.id.slice(-5)}`, 105, 55, { align: 'center' });
    
    // Decorative line under the title
    doc.setDrawColor(180, 160, 120); // Gold tone
    doc.setLineWidth(0.3);
    doc.line(65, 58, 145, 58);
    
    // Add offer information in a more elegant layout
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 70);
    doc.setFont("helvetica", "normal");
    
    const clientNameY = 68;
    doc.setFont("helvetica", "bold");
    doc.text(`PREPARED FOR:`, 30, clientNameY);
    doc.setFont("helvetica", "normal");
    doc.text(`${offer.clientName}`, 80, clientNameY);
    
    const dateY = 75;
    doc.setFont("helvetica", "bold");
    doc.text(`CREATED:`, 30, dateY);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 80, dateY);
    
    const validY = 82;
    doc.setFont("helvetica", "bold");
    doc.text(`VALID UNTIL:`, 30, validY);
    doc.setFont("helvetica", "normal");
    
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    doc.text(`${validUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 80, validY);
    
    // Add decorative touch
    doc.setDrawColor(180, 160, 120); // Gold tone
    doc.setLineWidth(0.3);
    doc.line(20, 90, 190, 90);
    
    // Add a touch of luxury with a small decorative element
    doc.setDrawColor(180, 160, 120); // Gold tone
    doc.setLineWidth(0.7);
    doc.line(20, 91, 20, 93);
    doc.line(190, 91, 190, 93);
    
    // Add offer items section title with more luxury
    doc.setFontSize(14);
    doc.setTextColor(32, 32, 64); // Deep navy blue
    doc.setFont("helvetica", "bold");
    doc.text("EXCLUSIVE SERVICES", 105, 100, { align: 'center' });
    
    // Instead of using a traditional table, we'll create a visual display of services
    let currentY = 110; // Starting Y position for services

    // Process the services for the PDF
    for (let i = 0; i < offer.items.length; i++) {
      const item = offer.items[i];
      
      // Check if we need to add a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
        
        // Add a small header on the new page
        doc.setFillColor(250, 246, 231); // Very light gold
        doc.rect(0, 0, 210, 20, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(32, 32, 64);
        doc.setFont("helvetica", "normal");
        doc.text(`EXCLUSIVE OFFER #${offer.id.slice(-5)} - Continued`, 105, 10, { align: 'center' });
        
        doc.setDrawColor(180, 160, 120); // Gold tone
        doc.setLineWidth(0.3);
        doc.line(20, 15, 190, 15);
        
        currentY = 25; // Start content a bit lower
      }
      
      // Get the item name
      let name = typeof item.name === 'object' ? 
        (item.name.en || item.name.ro || 'Service') : 
        (item.name || 'Service');
      
      // Create elegant card for this service
      doc.setDrawColor(220, 220, 230);
      doc.setLineWidth(0.3);
      doc.setFillColor(250, 250, 252);
      doc.roundedRect(20, currentY, 170, 45, 2, 2, 'FD');
      
      // Add image background
      doc.setFillColor(240, 240, 240);
      doc.rect(25, currentY + 5, 50, 35, 'F');
      
      // Try to use the actual image if available in cache
      let imageDisplayed = false;
      if (item.imageUrl && imageCache[item.imageUrl]) {
        try {
          doc.addImage(imageCache[item.imageUrl], 'JPEG', 25, currentY + 5, 50, 35, undefined, 'FAST');
          if (item.category === 'villas' && item.propertyLink) {
            doc.link(25, currentY + 5, 50, 35, { url: item.propertyLink });
          }
          imageDisplayed = true;
        } catch (imgError) {
          console.error(`Error adding image for item ${item.id || 'unknown'}:`, imgError);
          // Will fall back to icon
        }
      }
      
      // If no image was displayed, show the icon
      if (!imageDisplayed) {
        // Draw elegant vector icon for the service category
        const iconX = 25;
        const iconY = currentY + 5;
        const iconW = 50;
        const iconH = 35;
        
        // Add subtle background
        doc.setFillColor(245, 247, 250); 
        doc.setDrawColor(220, 220, 230);
        doc.roundedRect(iconX, iconY, iconW, iconH, 2, 2, 'FD');
        
        // Draw the category-specific icon
        try {
          drawServiceIcon(doc, iconX, iconY, iconW, iconH, item.category);
        } catch (err) {
          console.error('Error drawing icon:', err);
          // Fallback just in case
          doc.setFontSize(14);
          doc.setTextColor(150, 150, 160);
          doc.text("?", iconX + iconW/2, iconY + iconH/2, { align: 'center' });
        }
      }
      
      // Service details
      doc.setFontSize(11);
      doc.setTextColor(32, 32, 64);
      doc.setFont("helvetica", "bold");
      doc.text(name, 80, currentY + 10);
      
      // Add additional details based on item category
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 110);
      doc.setFont("helvetica", "normal");
      
      let detailsText = '';
      
      if (item.category === 'villas') {
        const location = item.location || item.address || '';
        const bedrooms = item.bedrooms ? `${item.bedrooms} bedrooms` : '';
        const capacity = item.capacity ? `${item.capacity} guests max` : '';
        
        if (location || bedrooms || capacity) {
          detailsText = [location, bedrooms, capacity].filter(Boolean).join(' • ');
        }
      } 
      else if (item.category === 'cars') {
        const model = item.model || item.make || '';
        const year = item.year ? `${item.year}` : '';
        
        if (model || year) {
          detailsText = [model, year].filter(Boolean).join(' • ');
        }
      }
      else if (item.category === 'boats') {
        const model = item.model || '';
        const length = item.length ? `${item.length}m` : '';
        const capacity = item.capacity ? `${item.capacity} guests max` : '';
        
        if (model || length || capacity) {
          detailsText = [model, length, capacity].filter(Boolean).join(' • ');
        }
      }
      
      let infoY = currentY + 17;
      if (detailsText) {
        doc.text(detailsText, 80, infoY);
        infoY += 7;
      }
      
      if (item.category === 'villas' && item.propertyLink) {
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246);
        doc.setFont("helvetica", "normal");
        doc.textWithLink('View property', 80, infoY, { url: item.propertyLink });
        doc.setTextColor(100, 100, 110);
        infoY += 8;
      }
      
      const englishSeasonLabel = item.selectedMonth
        ? formatSeasonalMonthLabel(item.selectedMonth, 'en', translations.en)
        : null; // Don't use saved labels as they might be in Romanian
      
      if (englishSeasonLabel) {
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.setFont("helvetica", "normal");
        doc.text(englishSeasonLabel, 80, infoY);
        doc.setTextColor(100, 100, 110);
        infoY += 7;
      }
      
      // Price and quantity - FIXED SPACING AND FORMAT
      const unitInfo = item.unit ? getUnitDisplayLabel(item.unit, pdfStrings, item.category) : '';
      const priceLineY = infoY;
      doc.setFontSize(9);
      doc.setTextColor(32, 32, 64);
      const unitDescriptor = unitInfo ? ` / ${unitInfo}` : '';
      // Use more standard Quantity x Price format
      doc.text(`${item.quantity} × ${formatCurrency(item.price)}${unitDescriptor}`, 80, priceLineY);
      
      // Show if there's a discount
      if (item.discountValue > 0) {
        const discountText = item.discountType === 'percentage' 
          ? `${item.discountValue}% discount applied` 
          : `${formatCurrency(item.discountValue)} discount applied`;
        doc.setFontSize(8);
        doc.setTextColor(180, 70, 70);
        doc.text(discountText, 80, priceLineY + 7);
      }
      
      // Total for this item
      doc.setFontSize(11);
      doc.setTextColor(32, 32, 64);
      doc.setFont("helvetica", "bold");
      
      const basePrice = item.originalPrice || item.price;
      const itemTotal = item.discountValue
        ? (item.discountType === 'percentage' 
            ? (basePrice * item.quantity) * (1 - item.discountValue/100) 
            : (basePrice * item.quantity) - item.discountValue)
        : (basePrice * item.quantity);
        
      doc.text(formatCurrency(itemTotal), 180, priceLineY, { align: 'right' });
      
      // Move down for the next service
      currentY += 55;
    }
    
    // Add totals with luxury styling
    currentY += 5;
    
    // Check if we need to add a new page for totals
    if (currentY > 240) {
      doc.addPage();
      currentY = 30;
      
      // Add a small header on the new page
      doc.setFillColor(250, 246, 231); // Very light gold
      doc.rect(0, 0, 210, 20, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(32, 32, 64);
      doc.setFont("helvetica", "normal");
      doc.text(`EXCLUSIVE OFFER #${offer.id.slice(-5)} - Summary`, 105, 10, { align: 'center' });
      
      doc.setDrawColor(180, 160, 120); // Gold tone
      doc.setLineWidth(0.3);
      doc.line(20, 15, 190, 15);
    }
    
    // Add a separator line above totals
    doc.setDrawColor(180, 160, 120); // Gold tone
    doc.setLineWidth(0.3);
    doc.line(120, currentY - 5, 190, currentY - 5);
    
    // Subtotal
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 70);
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal:`, 150, currentY, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(offer.subtotal), 190, currentY, { align: 'right' });
    
    // Discount if applicable
    let finalY = currentY;
    if (offer.discountValue > 0) {
      finalY += 7;
      const discountAmount = offer.discountType === 'percentage' 
        ? (offer.subtotal * (offer.discountValue / 100)) 
        : offer.discountValue;
      
      const discountText = offer.discountType === 'percentage' 
        ? `Discount (${offer.discountValue}%):` 
        : `Discount:`;
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 70, 70); // Red color for discount
      doc.text(discountText, 150, finalY, { align: 'right' });
      
      doc.setFont("helvetica", "bold");
      doc.text(`-${formatCurrency(discountAmount)}`, 190, finalY, { align: 'right' });
    }
    
    // Total
    finalY += 10;
    doc.setDrawColor(180, 160, 120); // Gold tone
    doc.setLineWidth(0.5);
    doc.line(120, finalY - 3, 190, finalY - 3);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(32, 32, 64); // Deep navy blue
    doc.text(`TOTAL:`, 150, finalY + 5, { align: 'right' });
    
    doc.setFontSize(14);
    doc.text(formatCurrency(offer.totalValue), 190, finalY + 5, { align: 'right' });
    
    // Add notes with better styling
    if (offer.notes) {
      const notesY = finalY + 20;
      
      // Check if we need a new page for notes
      if (notesY > 240) {
        doc.addPage();
        
        // Add a small header on the new page
        doc.setFillColor(250, 246, 231); // Very light gold
        doc.rect(0, 0, 210, 20, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(32, 32, 64);
        doc.setFont("helvetica", "normal");
        doc.text(`EXCLUSIVE OFFER #${offer.id.slice(-5)} - Notes`, 105, 10, { align: 'center' });
        
        doc.setDrawColor(180, 160, 120); // Gold tone
        doc.setLineWidth(0.3);
        doc.line(20, 15, 190, 15);
        
        finalY = 20;
      }
      
      doc.setFontSize(11);
      doc.setTextColor(32, 32, 64);
      doc.setFont("helvetica", "bold");
      doc.text("ADDITIONAL NOTES", 20, finalY + 20);
      
      doc.setDrawColor(180, 160, 120); // Gold tone
      doc.setLineWidth(0.3);
      doc.line(20, finalY + 22, 80, finalY + 22);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 70);
      
      // Handle multiline notes
      const splitNotes = doc.splitTextToSize(offer.notes, 170);
      doc.text(splitNotes, 20, finalY + 30);
    }
    
    // Add elegant footer
    const footerY = doc.internal.pageSize.height - 20;
    
    // Add decorative line
    doc.setDrawColor(180, 160, 120); // Gold tone
    doc.setLineWidth(0.3);
    doc.line(20, footerY - 15, 190, footerY - 15);
    
    // Ornamental touch
    doc.setDrawColor(180, 160, 120); // Gold tone
    doc.setLineWidth(0.7);
    doc.line(20, footerY - 14, 20, footerY - 12);
    doc.line(190, footerY - 14, 190, footerY - 12);
    
    // Thank you text - GENERIC VERSION
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(32, 32, 64);
    doc.text(`Thank you for choosing ${companyInfo.name} for your luxury experience.`, 105, footerY - 8, { align: 'center' });
    
    // Terms and contact - ONLY SHOW IF VALID CONTACT INFO EXISTS
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 110);
    doc.text(`This offer is subject to our standard terms and conditions.`, 105, footerY - 3, { align: 'center' });
    
    // Only show contact info if there are actual valid values - otherwise skip this line entirely
    const hasValidFooterPhone = companyInfo.phone && companyInfo.phone.trim() !== '' && companyInfo.phone !== '-';
    const hasValidFooterEmail = companyInfo.email && companyInfo.email.trim() !== '' && companyInfo.email !== '-';
    
    if (hasValidFooterPhone || hasValidFooterEmail) {
      const contactInfo = [];
      if (hasValidFooterPhone) contactInfo.push(companyInfo.phone);
      if (hasValidFooterEmail) contactInfo.push(companyInfo.email);
      
      doc.text(`For any inquiries, please contact us at ${contactInfo.join(' or ')}`, 105, footerY, { align: 'center' });
    }
    
    // Save the PDF
    doc.save(`Luxury_Offer_${offer.id.slice(-5)}_${offer.clientName}.pdf`);
    
    console.log("Luxury PDF offer generated successfully");
    alert("Luxury PDF offer generated successfully.");
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("An error occurred while generating the PDF. Please try again.");
  } finally {
    setIsGeneratingPdf(false);
  }
};
  
  // Function to fetch image - works with or without Firebase SDK
  const fetchImageWithAuth = async (url, itemId = 'unknown') => {
  if (!url) return null;
  
  try {
    console.log(`Attempting to fetch image for item ${itemId}: ${url}`);
    
    // For Firebase Storage URLs, try direct approach without proxy
    if (url.includes('firebasestorage.googleapis.com')) {
      console.log(`Attempting direct fetch for Firebase image: ${url}`);
      
      // Use Image element with canvas conversion
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            console.log(`Successfully converted image to base64 for item ${itemId}`);
            resolve(dataURL);
          } catch (canvasError) {
            console.error(`Canvas conversion failed for item ${itemId}:`, canvasError);
            reject(canvasError);
          }
        };
        
        img.onerror = (error) => {
          console.error(`Image load failed for item ${itemId}:`, error);
          reject(new Error('Image load failed'));
        };
        
        img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        
        setTimeout(() => {
          reject(new Error('Image load timeout'));
        }, 10000);
      });
    }
    
    // For non-Firebase URLs, use direct fetch
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error loading image for item ${itemId}:`, error);
    return null;
  }
};
  
  // Handle reservation form input changes
  const handleReservationChange = (e) => {
    const { name, value } = e.target;
    setReservationData(prev => ({ ...prev, [name]: value }));
  };
  
  // Create reservation
  const handleCreateReservation = async (e) => {
    e.preventDefault();
    
    if (!selectedClient || !companyInfo || !currentUser) return;
    
    if (!reservationData.startDate || !reservationData.endDate || !reservationData.accommodationType) {
      alert('Please fill in all required fields.');
      return;
    }
    
    try {
      const newReservation = {
        clientId: selectedClient.id,
        companyId: companyInfo.id,
        checkIn: reservationData.startDate,
        checkOut: reservationData.endDate,
        adults: parseInt(reservationData.adults) || 1,
        children: parseInt(reservationData.children) || 0,
        accommodationType: reservationData.accommodationType,
        transport: reservationData.transport,
        notes: reservationData.notes,
        collaboratorId: reservationData.collaboratorId || null,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        status: 'confirmed'
      };
      
      const reservationsRef = collection(db, "reservations");
      const docRef = await addDoc(reservationsRef, newReservation);
      
      const uiReservation = {
        id: docRef.id,
        checkIn: reservationData.startDate,
        checkOut: reservationData.endDate,
        accommodationType: reservationData.accommodationType
      };
      
      const clientRef = doc(db, "clients", selectedClient.id);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const upcomingReservations = clientDoc.data().upcomingReservations || [];
        await updateDoc(clientRef, { upcomingReservations: [...upcomingReservations, uiReservation] });
        
        const updatedClient = {
          ...selectedClient,
          upcomingReservations: [...(selectedClient.upcomingReservations || []), uiReservation]
        };
        
        setSelectedClient(updatedClient);
        setClients(prev => prev.map(client => client.id === selectedClient.id ? updatedClient : client));
      }
      
      setReservationData({ startDate: '', endDate: '', adults: 1, children: 0, accommodationType: '', transport: '', notes: '', collaboratorId: '' });
      setShowCreateReservation(false);
      
      if (isMobile) {
        setCurrentView('details');
      }
      
      alert(`${t.reservationCreatedSuccess} ${selectedClient.name}`);
    } catch (error) {
      console.error("Error creating reservation:", error);
      setError(t.error);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };
const [userCache, setUserCache] = useState({});
const [loadingUsers, setLoadingUsers] = useState(false);

// Function to get user details by ID or email
const getUserName = async (userId) => {
  if (!userId) return '-';
  
  if (userCache[userId]) {
    return userCache[userId];
  }

  const teamMember = teamMembers.find(
    (member) =>
      member.id === userId ||
      (member.email && member.email.toLowerCase() === userId.toLowerCase())
  );

  if (teamMember) {
    const resolvedName = teamMember.name || teamMember.email || 'User';
    setUserCache(prev => ({ ...prev, [userId]: resolvedName }));
    return resolvedName;
  }
  
  try {
    setLoadingUsers(true);

    const fetchUserData = async (collectionName) => {
      // Try by document ID first
      const userRef = doc(db, collectionName, userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) return userDoc.data();

      // If the ID looks like an email, try querying by email as well
      if (userId.includes('@')) {
        const emailQuery = query(
          collection(db, collectionName),
          where('email', '==', userId.toLowerCase())
        );
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          return emailSnapshot.docs[0].data();
        }
      }

      return null;
    };

    const userData = (await fetchUserData("users")) || (await fetchUserData("authorized_users"));

    if (userData) {
      const userName = userData.displayName || userData.name || userData.fullName || userData.email || 'User';
      
      setUserCache(prev => ({
        ...prev,
        [userId]: userName
      }));
      
      return userName;
    }

    console.log(`User with ID ${userId} not found in users or authorized_users`);
    return userId.slice(0, 8) + '...'; // Show truncated ID if user not found
  } catch (error) {
    console.warn("User lookup failed:", error?.message || error);
    return userId.slice(0, 8) + '...'; // Show truncated ID on error
  } finally {
    setLoadingUsers(false);
  }
};
  // Render status badge
  const renderStatusBadge = (status, isVip) => {
    if (isVip) {
      return <span className="inline-block px-2 py-1 text-xs font-medium uppercase rounded bg-amber-100 text-amber-800">VIP</span>;
    }
    
    if (status === 'active') {
      return <span className="inline-block px-2 py-1 text-xs font-medium uppercase rounded bg-green-100 text-green-800">{t.filterActive}</span>;
    } else {
      return <span className="inline-block px-2 py-1 text-xs font-medium uppercase rounded bg-gray-100 text-gray-700">{t.filterInactive}</span>;
    }
  };
  
  // Render offer status badge
  const renderOfferStatusBadge = (status) => {
    if (status === 'accepted') {
      return <span className="inline-block px-2 py-1 text-xs font-medium uppercase rounded bg-green-100 text-green-800">{status.toUpperCase()}</span>;
    } else if (status === 'declined') {
      return <span className="inline-block px-2 py-1 text-xs font-medium uppercase rounded bg-red-100 text-red-800">{status.toUpperCase()}</span>;
    } else if (status === 'booked') {
      return <span className="inline-block px-2 py-1 text-xs font-medium uppercase rounded bg-green-700 text-white">BOOKED</span>;
    } else {
      return <span className="inline-block px-2 py-1 text-xs font-medium uppercase rounded bg-amber-100 text-amber-800">{status.toUpperCase()}</span>;
    }
  };
  
  // Generate PDF for a specific offer
  const handleGeneratePdf = (offer) => {
    generateOfferPdf(offer);
  };
  
  // Show create offer view
  const handleShowCreateOffer = () => {
    // Reset form data
    setCurrentEditingOffer(null);
    setOfferItems([]);
    setOfferNotes('');
    setDiscountType('percentage');
    setDiscountValue(0);
    
    setShowCreateOffer(true);
    if (isMobile) {
      setCurrentView('offer');
    }
  };
  
  // Show create reservation view
  const handleShowCreateReservation = () => {
    setShowCreateReservation(true);
    if (isMobile) {
      setCurrentView('reservation');
    }
  };
  
  const handleCancelQuickBooking = () => {
    setBookingShortcutActive(false);
    setAutoReservationQueued(false);
  };
  
  // Render service card based on category
  const renderServiceCard = (service) => {
    // Common image rendering function to maintain consistency across all card types
    const renderImage = (service, height = "h-48") => (
  <div className={`${height} bg-gray-50 flex items-center justify-center overflow-hidden relative rounded-t-lg`}> 
    {((service.imageUrl || (service.photos && service.photos.length > 0)) && !imageErrors[service.id]) ? (
      <img 
        src={service.imageUrl || (service.photos && service.photos[0])} 
        alt={typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name}
        className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
        style={{
          objectFit: 'cover',
          objectPosition: 'center'
        }}
        onError={(e) => {
          console.error(`Failed to load image for ${typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name}:`, service.imageUrl || (service.photos && service.photos[0]));
          setImageErrors(prev => ({...prev, [service.id]: true}));
        }}
        onLoad={() => {
          console.log(`Successfully loaded image for ${typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name}`);
          // Clear any previous error
          setImageErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[service.id];
            return newErrors;
          });
        }}
      />
    ) : (
      <div className="text-center p-4 text-sm font-medium text-gray-500 flex items-center justify-center h-full w-full">
        <div>
          <div className="text-3xl mb-2">
            {service.category === 'villas' ? '🏠' :
             service.category === 'boats' ? '🛥️' :
             service.category === 'cars' ? '🚗' :
             service.category === 'concierge-core' ? '⭐' :
             service.category === 'security' ? '🔒' :
             service.category === 'nannies' ? '👶' :
             service.category === 'chefs' ? '🍽️' :
             service.category === 'excursions' ? '🏔️' : '✨'}
          </div>
          <div className="text-xs">
            {typeof service.name === 'object'
              ? getLocalizedText(service.name, language)
              : service.name}
          </div>
          {!service.imageUrl && (
            <div className="text-xs text-gray-400 mt-1">No image available</div>
          )}
          {service.imageUrl && imageErrors[service.id] && (
            <div className="text-xs text-red-400 mt-1">Image failed to load</div>
          )}
        </div>
      </div>
    )}
  </div>
);
  
    switch (service.category) {
      case 'villas':
        return (
          <div key={service.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            {renderImage(service, "h-32")}
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                {typeof service.name === 'object'
                  ? getLocalizedText(service.name, language)
                  : service.name}
              </h3>
              <div className="flex flex-col gap-2 mb-4 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{t.location}:</span>
                  <span className="text-gray-700 max-w-[60%] text-right">
                    {typeof service.address === 'object'
                      ? getLocalizedText(service.address, language)
                      : service.address || service.location || '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{t.bedrooms}:</span>
                  <span className="text-gray-700">{service.bedrooms || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{t.maxGuests}:</span>
                  <span className="text-gray-700">{service.capacity || '-'} {service.capacity ? t.guests.toLowerCase() : ''}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <div>
                  <span className="text-indigo-600 font-semibold">
                    € {service.dailyPrice || service.price}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">{t.perDay}</span>
                </div>
                <button 
                  onClick={() => handleAddToOffer(service)}
                  className="bg-indigo-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {t.addToOffer}
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'boats':
        return (
          <div key={service.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm h-full flex flex-col">
            {renderImage(service, "h-40")}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                {typeof service.name === 'object'
                  ? getLocalizedText(service.name, language)
                  : service.name}
              </h3>
              <div className="flex flex-col gap-2 mb-4 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{t.model}:</span>
                  <span className="text-gray-700">{service.model || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{t.year}:</span>
                  <span className="text-gray-700">{service.specs?.year || service.year || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{t.boatCapacity}:</span>
                  <span className="text-gray-700">{service.capacity || '-'} {service.capacity ? t.guests.toLowerCase() : ''}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <div>
                  <span className="text-indigo-600 font-semibold">
                    € {service.pricing?.daily || service.hourlyRate || service.price}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">/{service.unit || 'hour'}</span>
                </div>
                <button 
                  onClick={() => handleAddToOffer(service)}
                  className="bg-indigo-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {t.addToOffer}
                </button>
              </div>
            </div>
          </div>
        );
  
      case 'cars':
        return (
          <div key={service.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm h-full flex flex-col">
            {renderImage(service, "h-40")}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                {typeof service.name === 'object'
                  ? getLocalizedText(service.name, language)
                  : service.name}
              </h3>
              <div className="flex flex-col gap-2 mb-4 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{t.model}:</span>
                  <span className="text-gray-700">{service.model || service.make || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{t.year}:</span>
                  <span className="text-gray-700">{service.year || '-'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <div>
                  <span className="text-indigo-600 font-semibold">
                    € {service.dailyRate || service.price}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">/{service.unit || 'day'}</span>
                </div>
                <button 
                  onClick={() => handleAddToOffer(service)}
                  className="bg-indigo-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {t.addToOffer}
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div key={service.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm h-full flex flex-col">
            {renderImage(service, "h-32")}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                {typeof service.name === 'object'
                  ? getLocalizedText(service.name, language)
                  : service.name}
              </h3>
              {service.description && (
                <p className="text-sm text-gray-500 mb-4 flex-1">
                  {typeof service.description === 'object'
                    ? getLocalizedText(service.description, language)
                    : service.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-auto">
                <div>
                  <span className="text-indigo-600 font-semibold">
                    € {service.price}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">/{service.unit || 'day'}</span>
                </div>
                <button 
                  onClick={() => handleAddToOffer(service)}
                  className="bg-indigo-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {t.addToOffer}
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-4 font-sans max-w-7xl mx-auto">
      {/* Header with language toggle */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row justify-between items-center'} mb-6`}>
        <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/clients/add')}
            className="bg-indigo-600 text-white border-0 rounded-md py-2 px-4 text-sm font-medium cursor-pointer hover:bg-indigo-700 transition-colors"
          >
            {t.addClient}
          </button>
          {isMobile && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="bg-gray-100 text-gray-800 border border-gray-200 rounded-md py-2 px-3 text-xs font-medium cursor-pointer hover:bg-gray-200"
            >
              {t.mobileMenu} ☰
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobile && showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setShowMobileMenu(false)}
            aria-hidden="true"
          />
          <div className="fixed top-16 left-4 right-4 z-40 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto max-h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="font-semibold text-gray-900">{t.mobileMenu || 'Menu'}</div>
              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <div className="p-3 space-y-2">
              <button 
                onClick={() => {
                  navigate('/clients/add');
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 text-left border border-indigo-200 rounded-lg bg-indigo-50 text-indigo-700 font-medium text-sm"
              >
                {t.addClient}
              </button>
              <button 
                onClick={() => {
                  setCurrentView('list');
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg bg-white text-sm"
              >
                {t.title}
              </button>
              {selectedClient && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                    {t.clientDetails || 'Client Details'}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2 text-sm text-gray-800">
                    <div className="flex justify-between"><span className="text-gray-500">Lead</span><span className="font-medium capitalize">{selectedClient.leadStatus || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="font-medium">{selectedClient.leadSource || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Guests</span><span className="font-medium">{(selectedClient.adults || 0) + 'A / ' + (selectedClient.children || 0) + 'C'}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Company Information Banner */}
      {companyInfo && (
        <div className="bg-blue-50 p-3 rounded-md mb-6 flex items-center">
      <span className="font-medium text-blue-800 mr-2">{t.companyLabel}</span>
      <span className="font-bold text-blue-900">{companyInfo.name}</span>
    </div>
  )}
  
  {bookingShortcutActive && (
    <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-3 rounded-md mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold">{t.quickBookingMode}</p>
        <p className="text-sm text-indigo-700">{t.quickBookingInstructions}</p>
      </div>
      <button
        type="button"
        onClick={handleCancelQuickBooking}
        className="px-3 py-1 rounded-full border border-indigo-200 bg-white text-sm font-medium text-indigo-700"
      >
        {t.cancel}
      </button>
    </div>
  )}
      
      {/* Error message */}
      {(error || contextError) && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-6">
          {error || contextError}
        </div>
      )}
      
      {/* No company access message */}
      {!contextLoading && !companyInfo && (
        <div className="bg-amber-100 text-amber-800 p-3 rounded-md mb-6 text-center">
          {t.noCompanyAccess}
        </div>
      )}
      
      {/* Loading indicator */}
      {(loading || contextLoading) && (
        <div className="bg-gray-50 p-8 rounded-lg mb-6 border border-gray-200 text-center text-gray-600">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
          <p className="text-sm text-gray-500">{t.loading}</p>
        </div>
      )}
      
      {/* PDF Generation loading indicator */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center justify-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-gray-500">{t.pdfGenerating}</p>
          </div>
        </div>
      )}
      
     {/* Main content */}
     {!loading && !contextLoading && companyInfo && (
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-6 ${isMobile ? 'h-auto' : 'h-[calc(100vh-10rem)]'} overflow-hidden`}>
          {/* Left column - Client list (Only visible on desktop or mobile 'list' view) */}
          {(!isMobile || (isMobile && currentView === 'list')) && (
            <div className={`${isMobile ? 'w-full mb-4' : 'w-3/10'} bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col`}>
              <div className="p-4 border-b border-gray-200">
                {/* Search input */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full py-3 pl-10 pr-4 rounded-md border border-gray-300 text-sm"
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                </div>
                
                {/* Filter dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className="flex items-center justify-between w-full p-3 bg-gray-50 border border-gray-300 rounded-md text-sm"
                  >
                    <span>
                      {filter === 'all' ? t.filterAll : 
                      filter === 'active' ? t.filterActive :
                      filter === 'inactive' ? t.filterInactive : t.filterVip}
                    </span>
                    <span className="text-gray-500 text-xs">{showFilter ? '▲' : '▼'}</span>
                  </button>
                  {showFilter && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                      <button 
                        onClick={() => {
                          setFilter('all');
                          setShowFilter(false);
                        }}
                        className="block w-full py-3 px-3 text-left border-b border-gray-100 hover:bg-gray-50 text-sm"
                      >
                        {t.filterAll}
                      </button>
                      <button 
                        onClick={() => {
                          setFilter('active');
                          setShowFilter(false);
                        }}
                        className="block w-full py-3 px-3 text-left border-b border-gray-100 hover:bg-gray-50 text-sm"
                      >
                        {t.filterActive}
                      </button>
                      <button 
                        onClick={() => {
                          setFilter('inactive');
                          setShowFilter(false);
                        }}
                        className="block w-full py-3 px-3 text-left border-b border-gray-100 hover:bg-gray-50 text-sm"
                      >
                        {t.filterInactive}
                      </button>
                      <button 
                        onClick={() => {
                          setFilter('vip');
                          setShowFilter(false);
                        }}
                        className="block w-full py-3 px-3 text-left hover:bg-gray-50 text-sm"
                      >
                        {t.filterVip}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Client List */}
              <div className="flex-1 overflow-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">{t.noClientsFound}</div>
                ) : (
                  <ul className="list-none m-0 p-0">
                    {filteredClients.map(client => (
                      <li 
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${selectedClient?.id === client.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">{client.name}</h3>
                            <p className="text-xs text-gray-600 mb-1">{client.email}</p>
                            <p className="text-xs text-gray-500">{client.phone}</p>
                          </div>
                          <div>
                            {renderStatusBadge(client.status, client.isVip)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          
          {/* Right column - Client details & Modals */}
          {/* Only visible on desktop or mobile 'details', 'offer', 'reservation', 'edit' view */}
          {(!isMobile || (isMobile && currentView !== 'list')) && (
            <div className={`${isMobile ? 'w-full' : 'w-7/10'} bg-white rounded-lg shadow-sm border border-gray-200 ${isMobile ? 'h-auto' : 'h-full'} overflow-hidden flex flex-col`}>
              {/* Edit Client Modal */}
              {showEditClient && selectedClient && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800">{t.editClientDetails}</h2>
                    {isMobile && (
                      <button 
                        onClick={handleBackToDetails}
                        className="bg-gray-100 text-gray-600 border-none rounded-md py-2 px-3 text-xs mr-4 cursor-pointer"
                      >
                        {t.backToDetails}
                      </button>
                    )}
                    {!isMobile && (
                      <button 
                        onClick={() => setShowEditClient(false)}
                        className="bg-transparent border-none text-gray-500 text-xl cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4 overflow-auto flex-1">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                      <h3 className="text-sm font-semibold text-gray-800 mb-4">{t.personalInfo}</h3>
                      
                      <div className="mb-4">
                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.fullName} *</label>
                          <input
                            type="text"
                            name="name"
                            value={editClientData.name}
                            onChange={handleEditChange}
                            required
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.email} *</label>
                          <input
                            type="email"
                            name="email"
                            value={editClientData.email}
                            onChange={handleEditChange}
                            required
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.phone}</label>
                          <input
                            type="tel"
                            name="phone"
                            value={editClientData.phone}
                            onChange={handleEditChange}
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.status}</label>
                          <select
                            name="status"
                            value={editClientData.status}
                            onChange={handleEditChange}
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                          >
                            <option value="active">{t.filterActive}</option>
                            <option value="inactive">{t.filterInactive}</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.isVip}</label>
                          <div className="flex items-center">
                            <select
                              name="clientType"
                              value={editClientData.clientType}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                            >
                              <option value="regular">{t.regularClient || 'Client obișnuit'}</option>
                              <option value="vip">{t.vipClient || 'Client VIP'}</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.address}</label>
                          <input
                            type="text"
                            name="address"
                            value={editClientData.address}
                            onChange={handleEditChange}
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.nationality}</label>
                          <input
                            type="text"
                            name="nationality"
                            value={editClientData.nationality}
                            onChange={handleEditChange}
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.preferredLanguage}</label>
                          <select
                            name="preferredLanguage"
                            value={editClientData.preferredLanguage}
                            onChange={handleEditChange}
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                          >
                            <option value="">{t.selectOption || '-'}</option>
                            <option value="Russian">{language === 'ro' ? 'Rusă' : 'Russian'}</option>
                            <option value="English">English</option>
                            <option value="Romanian">Română</option>
                            <option value="Spanish">Español</option>
                            <option value="French">Français</option>
                            <option value="German">Deutsch</option>
                            <option value="Italian">Italiano</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-4">{t.leadInfo || 'Lead Information'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.leadSource || 'Lead Source'}</label>
                            <select
                              name="leadSource"
                              value={editClientData.leadSource}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                            >
                              <option value="">{t.selectOption || 'Select'}</option>
                              <option value="website">{t.website || 'Website'}</option>
                              <option value="referral">{t.referral || 'Referral'}</option>
                              <option value="socialMedia">{t.socialMedia || 'Social Media'}</option>
                              <option value="directContact">{t.directContact || 'Direct Contact'}</option>
                              <option value="other">{t.other || 'Other'}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.leadStatus || 'Lead Status'}</label>
                            <select
                              name="leadStatus"
                              value={editClientData.leadStatus}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                            >
                              <option value="new">{t.new || 'New'}</option>
                              <option value="contacted">{t.contacted || 'Contacted'}</option>
                              <option value="qualified">{t.qualified || 'Qualified'}</option>
                              <option value="negotiation">{t.negotiation || 'Negotiation'}</option>
                              <option value="lost">{t.lost || 'Lost'}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.assignedTo || 'Assigned To'}</label>
                            <select
                              name="assignedTo"
                              value={editClientData.assignedTo}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                            >
                              <option value="">{t.selectOption || 'Select'}</option>
                              {teamMembers.map(member => (
                                <option key={member.id} value={member.id}>
                                  {member.name || member.email || member.id}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.followUpDate || 'Follow-up Date'}</label>
                            <input
                              type="date"
                              name="followUpDate"
                              value={editClientData.followUpDate}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.conversionPotential || 'Conversion Potential'}</label>
                            <select
                              name="conversionPotential"
                              value={editClientData.conversionPotential}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                            >
                              <option value="low">{t.low || 'Low'}</option>
                              <option value="medium">{t.medium || 'Medium'}</option>
                              <option value="high">{t.high || 'High'}</option>
                              <option value="veryHigh">{t.veryHigh || 'Very High'}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.previousClient || 'Previous Client'}</label>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name="isPreviousClient"
                                  value="true"
                                  checked={editClientData.isPreviousClient === true}
                                  onChange={(e) => setEditClientData(prev => ({ ...prev, isPreviousClient: e.target.value === 'true' }))}
                                  className="mr-2"
                                />
                                {t.yes || 'Yes'}
                              </label>
                              <label className="flex items-center text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name="isPreviousClient"
                                  value="false"
                                  checked={editClientData.isPreviousClient === false}
                                  onChange={(e) => setEditClientData(prev => ({ ...prev, isPreviousClient: e.target.value === 'false' }))}
                                  className="mr-2"
                                />
                                {t.no || 'No'}
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-4">{t.interests || 'Interests'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.budget || 'Budget'}</label>
                            <input
                              type="number"
                              name="budget"
                              value={editClientData.budget}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                              min="0"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-2">{t.startDate || 'Start Date'}</label>
                              <input
                                type="date"
                                name="startDate"
                                value={editClientData.startDate}
                                onChange={handleEditChange}
                                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-2">{t.endDate || 'End Date'}</label>
                              <input
                                type="date"
                                name="endDate"
                                value={editClientData.endDate}
                                onChange={handleEditChange}
                                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-sm font-medium text-gray-600 mb-2">{t.propertyTypes || 'Property Types'}</span>
                            <div className="flex flex-col gap-2">
                              <label className="flex items-center text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  name="propertyTypes.villas"
                                  checked={editClientData.propertyTypes.villas}
                                  onChange={handleEditPropertyTypeChange}
                                  className="mr-2"
                                />
                                {t.villas || 'Villas'}
                              </label>
                              <label className="flex items-center text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  name="propertyTypes.apartments"
                                  checked={editClientData.propertyTypes.apartments}
                                  onChange={handleEditPropertyTypeChange}
                                  className="mr-2"
                                />
                                {t.apartments || 'Apartments'}
                              </label>
                              <label className="flex items-center text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  name="propertyTypes.hotels"
                                  checked={editClientData.propertyTypes.hotels}
                                  onChange={handleEditPropertyTypeChange}
                                  className="mr-2"
                                />
                                {t.hotels || 'Hotels'}
                              </label>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-2">{t.adults || 'Adults'}</label>
                              <input
                                type="number"
                                name="adults"
                                value={editClientData.adults}
                                onChange={handleEditChange}
                                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-2">{t.children || 'Children'}</label>
                              <input
                                type="number"
                                name="children"
                                value={editClientData.children}
                                onChange={handleEditChange}
                                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-600 mb-2">{t.activities || 'Activities'}</label>
                          <textarea
                            name="activities"
                            value={editClientData.activities}
                            onChange={handleEditChange}
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm resize-vertical min-h-20"
                            placeholder={t.activityPlaceholder || ''}
                          ></textarea>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-4">{t.preferences || 'Preferences'}</h3>
                        
                        <div className="mb-4">
                          <div className="w-full">
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.dietaryRestrictions}</label>
                            <input
                              type="text"
                              name="dietaryRestrictions"
                              value={editClientData.dietaryRestrictions}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="w-full">
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.transportPreferences}</label>
                            <input
                              type="text"
                              name="transportPreferences"
                              value={editClientData.transportPreferences}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="w-full">
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.specialRequests}</label>
                            <input
                              type="text"
                              name="specialRequests"
                              value={editClientData.specialRequests}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="w-full">
                            <label className="block text-sm font-medium text-gray-600 mb-2">{t.notes}</label>
                            <textarea
                              name="notes"
                              value={editClientData.notes}
                              onChange={handleEditChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm resize-vertical min-h-20"
                            ></textarea>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-4">{t.contactPersons || 'Contact Persons'}</h3>
                        <div className="space-y-4">
                          {editClientData.contactPersons.map((contact, index) => (
                            <div key={index} className="p-3 bg-white border border-gray-200 rounded-md">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.contactName || 'Name'}</label>
                                  <input
                                    type="text"
                                    name="name"
                                    value={contact.name}
                                    onChange={(e) => handleEditContactChange(index, e)}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.contactEmail || 'Email'}</label>
                                  <input
                                    type="email"
                                    name="email"
                                    value={contact.email}
                                    onChange={(e) => handleEditContactChange(index, e)}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.contactPhone || 'Phone'}</label>
                                  <input
                                    type="text"
                                    name="phone"
                                    value={contact.phone}
                                    onChange={(e) => handleEditContactChange(index, e)}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                  />
                                </div>
                              </div>
                              {editClientData.contactPersons.length > 1 && (
                                <div className="text-right mt-2">
                                  <button
                                    type="button"
                                    onClick={() => removeEditContactPerson(index)}
                                    className="text-sm text-red-500 hover:underline"
                                  >
                                    {t.removeContact || 'Remove'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addEditContactPerson}
                            className="text-sm text-indigo-600 font-medium"
                          >
                            {t.addContact || 'Add Contact'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                    {!isMobile && (
                      <button 
                        onClick={() => setShowEditClient(false)} 
                        className="py-2.5 px-4 bg-gray-100 text-gray-600 border-none rounded-md text-sm font-medium cursor-pointer"
                      >
                        {t.cancel}
                      </button>
                    )}
                    <button 
                      onClick={handleSaveClient}
                      className="py-2.5 px-4 bg-indigo-600 text-white border-none rounded-md text-sm font-medium cursor-pointer"
                    >
                      {t.saveChanges}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Create Offer Modal */}
{showCreateOffer && selectedClient && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className={`bg-white rounded-lg shadow-xl ${isMobile ? 'w-full h-full m-0' : 'w-full max-w-5xl h-5/6 m-4'} flex flex-col relative`}>
      
      {/* Header */}
      <div className={`flex justify-between items-center ${isMobile ? 'p-4' : 'p-6'} border-b border-gray-200 bg-gray-50 flex-shrink-0`}>
        <div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800`}>
            {currentEditingOffer ? t.editOffer : t.createNewOffer}
          </h2>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
            {t.offerFor} {selectedClient.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Cart Toggle Button */}
          {isMobile && offerItems.length > 0 && (
            <button
              onClick={() => setCurrentView(currentView === 'cart' ? 'offer' : 'cart')}
              className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center relative"
            >
              🛒
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {offerItems.length}
              </span>
            </button>
          )}
          <button 
            onClick={() => setShowCreateOffer(false)}
            className={`bg-gray-100 hover:bg-gray-200 text-gray-600 border-none rounded-full ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center ${isMobile ? 'text-lg' : 'text-xl'} cursor-pointer`}
          >
            ✕
          </button>
        </div>
      </div>
      {offerNotice && (
        <div className="absolute top-4 right-4 bg-emerald-500 text-white text-sm px-4 py-2 rounded-md shadow-lg ring-2 ring-emerald-200 flex items-center gap-2 transition-opacity duration-200">
          <span className="text-lg">✅</span>
          <span className="font-semibold">{offerNotice}</span>
        </div>
      )}
      {isMobile && customServiceOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-2xl p-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <span>➕</span> {t.addCustomService}
              </h4>
              <button
                onClick={() => {
                  setCustomServiceOpen(false);
                  setPendingService(null);
                }}
                className="text-gray-500 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                name="name"
                value={customService.name}
                onChange={handleCustomServiceChange}
                placeholder={t.customName}
                className="w-full p-3 border border-gray-300 rounded text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  name="price"
                  value={customService.price}
                  onChange={handleCustomServiceChange}
                  placeholder={t.customPrice}
                  className="w-1/2 p-3 border border-gray-300 rounded text-sm"
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  name="quantity"
                  value={customService.quantity}
                  onChange={handleCustomServiceChange}
                  placeholder={t.customQuantity}
                  className="w-1/2 p-3 border border-gray-300 rounded text-sm"
                  min="1"
                />
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="unit-mobile"
                    value="service"
                    checked={customServiceUnit === 'service'}
                    onChange={() => setCustomServiceUnit('service')}
                  />
                  {t.unitService}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="unit-mobile"
                    value="day"
                    checked={customServiceUnit === 'day'}
                    onChange={() => setCustomServiceUnit('day')}
                  />
                  {t.unitDay}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="unit-mobile"
                    value="hour"
                    checked={customServiceUnit === 'hour'}
                    onChange={() => setCustomServiceUnit('hour')}
                  />
                  {t.unitHour}
                </label>
              </div>
              <textarea
                name="description"
                value={customService.description}
                onChange={handleCustomServiceChange}
                placeholder={t.customDescription}
                className="w-full p-3 border border-gray-300 rounded text-sm resize-vertical min-h-24"
              ></textarea>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomServiceOpen(false);
                    setPendingService(null);
                  }}
                  className="flex-1 py-3 rounded-md border border-gray-300 text-gray-700 text-sm font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomService}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-md text-sm font-semibold"
                >
                  {t.addCustom}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart View */}
      {isMobile && currentView === 'cart' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-800">Cart Items</h3>
              <button
                onClick={() => setCurrentView('offer')}
                className="text-indigo-600 text-sm font-medium"
              >
                Continue with Offer
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {offerItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl text-gray-300 mb-2">🛒</div>
                <p className="text-sm text-gray-500">No items in cart</p>
              </div>
            ) : (
              <div className="space-y-4">
                {offerItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-sm text-gray-900 flex-1 mr-2">
                        {typeof item.name === 'object'
                          ? getLocalizedText(item.name, language)
                          : item.name}
                      </h4>
                      <button 
                        onClick={() => setOfferItems(prev => prev.filter(i => i.id !== item.id))}
                        className="text-red-500 hover:text-red-700 text-lg"
                      >
                        ✕
                      </button>
                    </div>
                    {item.selectedMonthLabel && (
                      <p className="text-xs text-gray-500 mb-2">
                        {item.selectedMonthLabel}
                      </p>
                    )}
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              setOfferItems(prev => prev.map(i => 
                                i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
                              ));
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-lg font-bold"
                        >
                          −
                        </button>
                        <span className="mx-3 text-lg font-medium min-w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => {
                            setOfferItems(prev => prev.map(i => 
                              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                            ));
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-lg font-bold"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          € {(item.price * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          € {item.price.toFixed(2)} each
                        </div>
                      </div>
                    </div>

                    {/* Custom Discount Section - MOBILE */}
                    

{/* Fixed Custom Discount Section - Mobile Version */}
<div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-medium text-gray-700">Custom Discount:</span>
    <div className="flex gap-1">
      <button
        onClick={() => {
          setOfferItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              discountType: 'percentage',
              discountValue: i.discountValue || 0,
              hasCustomDiscount: true
            } : i
          ));
        }}
        className={`px-3 py-1 text-sm rounded ${
          item.discountType === 'percentage' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-white border border-gray-300'
        }`}
      >
        %
      </button>
      <button
        onClick={() => {
          setOfferItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              discountType: 'fixed',
              discountValue: i.discountValue || 0,
              hasCustomDiscount: true
            } : i
          ));
        }}
        className={`px-3 py-1 text-sm rounded ${
          item.discountType === 'fixed' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-white border border-gray-300'
        }`}
      >
        €
      </button>
    </div>
  </div>
  
  <div className="flex gap-2 items-center">
    {/* FIXED INPUT FIELD - Mobile Friendly */}
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*\.?[0-9]*"
      value={item.discountValue || ''}
      placeholder="0"
      onFocus={(e) => {
        // Clear the field when focused if it's 0
        if (e.target.value === '0' || e.target.value === 0) {
          e.target.value = '';
          // Also update the state
          setOfferItems(prev => prev.map(i => 
            i.id === item.id ? { ...i, discountValue: 0 } : i
          ));
        }
        // Select all text for easy replacement
        e.target.select();
      }}
      onChange={(e) => {
        let value = e.target.value;
        
        // Allow empty string
        if (value === '') {
          setOfferItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              discountValue: 0,
              hasCustomDiscount: false,
              price: i.originalPrice
            } : i
          ));
          return;
        }
        
        // Only allow numbers and decimal point
        value = value.replace(/[^0-9.]/g, '');
        
        // Prevent multiple decimal points
        const parts = value.split('.');
        if (parts.length > 2) {
          value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        const discountValue = parseFloat(value) || 0;
        
        setOfferItems(prev => prev.map(i => 
          i.id === item.id ? { 
            ...i, 
            discountValue: discountValue,
            hasCustomDiscount: discountValue > 0
            // DO NOT modify price - discount is applied in calculateItemPrice
          } : i
        ));
      }}
      onBlur={(e) => {
        // If field is empty on blur, set to 0
        if (e.target.value === '') {
          setOfferItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              discountValue: 0,
              hasCustomDiscount: false
            } : i
          ));
        }
      }}
      className="flex-1 p-3 text-lg border border-gray-300 rounded text-center bg-white"
      style={{
        WebkitAppearance: 'none',
        MozAppearance: 'textfield'
      }}
    />
    <span className="text-sm text-gray-700 font-medium min-w-6">
      {item.discountType === 'percentage' ? '%' : '€'}
    </span>
  </div>
  
  {/* Quick Discount Buttons */}
  <div className="mt-2 flex gap-2">
    <button
      onClick={() => {
        const quickDiscount = item.discountType === 'percentage' ? 10 : 100;
        setOfferItems(prev => prev.map(i => 
          i.id === item.id ? { 
            ...i, 
            discountValue: quickDiscount,
            hasCustomDiscount: true
          } : i
        ));
      }}
      className="flex-1 py-2 bg-blue-100 text-blue-800 rounded text-sm font-medium"
    >
      {item.discountType === 'percentage' ? '10%' : '€100'}
    </button>
    <button
      onClick={() => {
        const quickDiscount = item.discountType === 'percentage' ? 20 : 200;
        setOfferItems(prev => prev.map(i => 
          i.id === item.id ? { 
            ...i, 
            discountValue: quickDiscount,
            hasCustomDiscount: true
          } : i
        ));
      }}
      className="flex-1 py-2 bg-blue-100 text-blue-800 rounded text-sm font-medium"
    >
      {item.discountType === 'percentage' ? '20%' : '€200'}
    </button>
    <button
      onClick={() => {
        setOfferItems(prev => prev.map(i => 
          i.id === item.id ? { 
            ...i, 
            discountValue: 0,
            hasCustomDiscount: false
          } : i
        ));
      }}
      className="flex-1 py-2 bg-gray-100 text-gray-600 rounded text-sm font-medium"
    >
      Clear
    </button>
  </div>
  
  {/* Show discounted price */}
  {item.hasCustomDiscount && item.discountValue > 0 && (
    <div className="mt-2 flex items-center justify-between text-sm">
      <span className="text-gray-500 line-through">
        Original: € {(item.originalPrice * item.quantity).toFixed(2)}
      </span>
      <span className="font-bold text-green-600">
        After discount: €{calculateItemPrice(item).toFixed(2)}
      </span>
    </div>
  )}
</div>

                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Cart Total */}
          {offerItems.length > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-indigo-600">
                  € {offerItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
                </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content - Services View */}
      {(!isMobile || currentView === 'offer') && (
        <div className={`flex-1 flex ${isMobile ? 'flex-col' : 'flex-row'} overflow-hidden min-h-0`}>
          
          {/* Categories - Mobile: Horizontal scroll, Desktop: Left Sidebar */}
          {isMobile ? (
            <div className="bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Service Categories
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {serviceCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors min-w-16 ${
                        selectedCategory === category.id 
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span className="text-xs text-center font-medium leading-tight">{category.name}</span>
                      <span className="text-xs text-gray-500">
                        {availableServices[category.id]?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Service Categories
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {serviceCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 p-4 text-left border-b border-gray-200 transition-colors ${
                      selectedCategory === category.id 
                        ? 'bg-indigo-50 border-l-4 border-l-indigo-600 text-indigo-700' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className="text-xs text-gray-500">
                        {availableServices[category.id]?.length || 0} services
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Center - Services Grid */}
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* Services Header */}
            <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-gray-200 bg-white flex-shrink-0`}>
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-row'} justify-between items-${isMobile ? 'start' : 'center'}`}>
                <div>
                  <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-800`}>
                    {serviceCategories.find(c => c.id === selectedCategory)?.name}
                  </h3>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                    {(() => {
                      const services = availableServices[selectedCategory] || [];
                      const filtered = services.filter(service => {
                        const price = parseFloat(service.dailyPrice || service.price || service.rate || 0);
                        return price >= appliedMinPrice && price <= appliedMaxPrice;
                      });
                      return filtered.length;
                    })()} services available
                  </p>
                </div>
                
                {/* Price Filter */}
                {['villas', 'boats', 'cars'].includes(selectedCategory) && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowPriceFilter(!showPriceFilter)}
                      className={`flex items-center gap-2 ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'} bg-white border border-gray-300 rounded-lg hover:bg-gray-50`}
                    >
                      <span>💰</span>
                      <span>{t.filterByPrice}</span>
                      <span>{showPriceFilter ? '▲' : '▼'}</span>
                    </button>
                    
                    {showPriceFilter && (
                      <div className={`absolute ${isMobile ? 'top-full left-0 right-0' : 'top-full right-0'} mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 ${isMobile ? 'w-full' : 'w-72'}`}>
                        <div className="flex gap-4 mb-4">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-2">{t.minPrice}</label>
                            <input
                              type="number"
                              value={minPrice}
                              onChange={(e) => setMinPrice(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              placeholder="0"
                              min="0"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-2">{t.maxPrice}</label>
                            <input
                              type="number"
                              value={maxPrice}
                              onChange={(e) => setMaxPrice(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              placeholder="∞"
                              min="0"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={handleResetPriceFilter}
                            className="py-2 px-3 bg-gray-100 text-gray-600 border-none rounded-md text-xs font-medium cursor-pointer"
                          >
                            {t.reset}
                          </button>
                          <button 
                            onClick={handleApplyPriceFilter}
                            className="py-2 px-3 bg-indigo-600 text-white border-none rounded-md text-xs font-medium cursor-pointer"
                          >
                            {t.apply}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Services Grid - FIXED WITH PROPER SCROLLING */}
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4'}`} style={{minHeight: 0}}>
              {loadingServices ? (
                <div className="flex flex-col items-center justify-center h-full min-h-48">
                  <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500">{t.loadingServices}</p>
                </div>
              ) : (() => {
                const services = availableServices[selectedCategory] || [];
                const filteredServices = services.filter(service => {
                  const price = parseFloat(service.dailyPrice || service.price || service.rate || 0);
                  return price >= appliedMinPrice && price <= appliedMaxPrice;
                });
                
                return filteredServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-48">
                    <div className="text-6xl text-gray-300 mb-4">📦</div>
                    <p className="text-gray-500 text-lg">{t.noServicesFound}</p>
                  </div>
                ) : (
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                    {filteredServices.map(service => {
                      const monthOptions = getMonthlyOptionsForService(service, language, t);
                      const selectedMonthKey = selectedSeasonMonths[service.id] || 'daily';
                      const selectedMonthOption = selectedMonthKey !== 'daily'
                        ? monthOptions.find(option => option.month === selectedMonthKey)
                        : null;
                      const baseDailyRate = toNumericPrice(service.originalPricing?.daily || service.price || 0);
                      const displayPrice = selectedMonthOption ? selectedMonthOption.price : baseDailyRate;
                      const displayUnitLabel = selectedMonthOption
                        ? getUnitDisplayLabel(selectedMonthOption.type, t, service.category)
                        : getUnitDisplayLabel(service.unit || '', t, service.category);
                      const selectSeasonLabel = t.selectMonthLabel || 'Select season';
                      const useStandardLabel = t.useStandardRate || 'Use standard rate';
                      const priceIsAvailable = displayPrice && displayPrice > 0;
                      // Enhanced Service Card Component
                      return (
                        <div key={service.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                          
                          {/* Service Image */}
                          <div className={`${isMobile ? 'h-40' : 'h-48'} bg-gray-100 relative overflow-hidden rounded-t-xl`}>
                            {((service.imageUrl || (service.photos && service.photos.length > 0)) && !imageErrors[service.id]) ? (
                              <img 
                                src={service.imageUrl || (service.photos && service.photos[0])} 
                                alt={typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name}
                                className="w-full h-full object-cover"
                                onError={() => setImageErrors(prev => ({...prev, [service.id]: true}))}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                                <div className="text-center">
                                  <div className="text-3xl mb-2 opacity-60">
                                    {service.category === 'villas' ? '🏠' :
                                     service.category === 'boats' ? '🛥️' :
                                     service.category === 'cars' ? '🚗' :
                                     service.category === 'concierge-core' ? '⭐' :
                                     service.category === 'security' ? '🔒' :
                                     service.category === 'nannies' ? '👶' :
                                     service.category === 'chefs' ? '🍽️' :
                                     service.category === 'excursions' ? '🏔️' : '✨'}
                                  </div>
                                  <p className="text-gray-500 font-medium text-xs">No image</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Category Badge */}
                            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                              {serviceCategories.find(c => c.id === selectedCategory)?.name}
                            </div>
                          </div>
                          
                          {/* Service Details */}
                          <div className="p-4">
                            
                            {/* Service Name */}
                            <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 mb-2 line-clamp-2`}>
                              {typeof service.name === 'object'
                                ? getLocalizedText(service.name, language)
                                : service.name}
                            </h4>
                            
                            {/* Service-specific details */}
                            <div className="space-y-1 mb-3 text-xs text-gray-600">
                              {service.category === 'villas' && (
  <>
    {service.address && (
      <div className="flex items-center gap-1">
        <span>📍</span>
        <span className="truncate">
          {typeof service.address === 'object'
            ? getLocalizedText(service.address, language)
            : service.address}
        </span>
      </div>
    )}
    <div className="flex gap-4">
      {service.bedrooms && (
        <span>🛏️ {service.bedrooms} bed</span>
      )}
      {service.capacity && (
        <span>👥 {service.capacity} guests</span>
      )}
    </div>
    
    {/* ADD MONTH SELECTOR FOR VILLAS */}
    {monthOptions.length > 0 && (
      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
        <label className="block text-xs font-medium text-green-800 mb-1">
          📅 {selectSeasonLabel}
        </label>
        <select
        value={selectedMonthKey}
          onChange={(e) => {
            setSelectedSeasonMonths(prev => ({
              ...prev,
              [service.id]: e.target.value
            }));
          }}
          className="w-full p-1 text-xs border border-green-300 rounded bg-white"
        >
          <option value="daily">
            {useStandardLabel} (€{baseDailyRate.toLocaleString(undefined, { minimumFractionDigits: 0 })})
          </option>
          {monthOptions.map(option => (
            <option key={option.month} value={option.month}>
              {option.label} (€{option.price.toLocaleString(undefined, { minimumFractionDigits: 0 })})
            </option>
          ))}
        </select>
      </div>
    )}
  </>
)}
                              
                              {service.category === 'cars' && (
  <div className="space-y-1">
    <div>🚗 {service.make} {service.model}</div>
    {service.year && <div>📅 {service.year}</div>}
    
    {/* ADD MONTH SELECTOR FOR CARS */}
    {monthOptions.length > 0 && (
      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
        <label className="block text-xs font-medium text-orange-800 mb-1">
          📅 {selectSeasonLabel}
        </label>
        <select
        value={selectedMonthKey}
          onChange={(e) => {
            setSelectedSeasonMonths(prev => ({
              ...prev,
              [service.id]: e.target.value
            }));
          }}
          className="w-full p-1 text-xs border border-orange-300 rounded bg-white"
        >
          <option value="daily">
            {useStandardLabel} (€{baseDailyRate.toLocaleString(undefined, { minimumFractionDigits: 0 })})
          </option>
          {monthOptions.map(option => (
            <option key={option.month} value={option.month}>
              {option.label} (€{option.price.toLocaleString(undefined, { minimumFractionDigits: 0 })})
            </option>
          ))}
        </select>
      </div>
    )}
  </div>
)}
                              
                              {service.category === 'boats' && (
  <div className="space-y-1">
    {service.model && <div>🛥️ {service.model}</div>}
    <div className="flex gap-4">
      {service.length && <span>📏 {service.length}m</span>}
      {service.capacity && <span>👥 {service.capacity} guests</span>}
    </div>
    
    {/* ADD MONTH SELECTOR HERE */}
    {monthOptions.length > 0 && (
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
        <label className="block text-xs font-medium text-blue-800 mb-1">
          📅 {selectSeasonLabel}
        </label>
        <select
        value={selectedMonthKey}
          onChange={(e) => {
            setSelectedSeasonMonths(prev => ({
              ...prev,
              [service.id]: e.target.value
            }));
          }}
          className="w-full p-1 text-xs border border-blue-300 rounded bg-white"
        >
          <option value="daily">
            {useStandardLabel} (€{baseDailyRate.toLocaleString(undefined, { minimumFractionDigits: 0 })})
          </option>
          {monthOptions.map(option => (
            <option key={option.month} value={option.month}>
              {option.label} (€{option.price.toLocaleString(undefined, { minimumFractionDigits: 0 })})
            </option>
          ))}
        </select>
      </div>
    )}
  </div>
)}
                            </div>
                            
                            {/* Price and Actions Row */}
                            <div className="flex items-center justify-between">
  <div>
    <div className="text-lg font-bold text-indigo-600">
      {priceIsAvailable
        ? `€${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
        : (language === 'ro' ? 'Preț la cerere' : 'Price on request')}
    </div>
    {priceIsAvailable && (
      <div className="text-xs text-gray-500">
        {displayUnitLabel}
        {selectedMonthOption && (
          <span className="ml-1 text-gray-600">
            ({selectedMonthOption.label})
          </span>
        )}
      </div>
    )}
  </div>
  
  <button 
    onClick={() => handleAddToOffer(service, true)}
    className={`bg-indigo-600 hover:bg-indigo-700 text-white ${isMobile ? 'text-xs py-2 px-3' : 'text-sm py-2 px-4'} rounded-lg transition-colors font-medium`}
  >
    {t.addToOffer}
  </button>
</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Sidebar - Current Offer (Desktop only) */}
          {!isMobile && (
            <div className="w-72 bg-gray-50 border-l border-gray-200 flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {t.currentOfferItems}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {offerItems.length} {offerItems.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              
              {/* Offer Items List + Custom Service + Summary - ALL SCROLLABLE TOGETHER */}
              <div className="flex-1 overflow-y-auto p-4" style={{minHeight: 0}}>
                {offerItems.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl text-gray-300 mb-2">🛒</div>
                    <p className="text-sm text-gray-500">{t.noItemsAdded}</p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {offerItems.map(item => (
                      <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm text-gray-900 flex-1 mr-2 line-clamp-2">
                            {typeof item.name === 'object'
                              ? getLocalizedText(item.name, language)
                              : item.name}
                          </h4>
                          <button 
                            onClick={() => setOfferItems(prev => prev.filter(i => i.id !== item.id))}
                            className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                        {item.selectedMonthLabel && (
                          <p className="text-xs text-gray-500 mb-2">
                            {item.selectedMonthLabel}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                        )}
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (item.quantity > 1) {
                                  setOfferItems(prev => prev.map(i => 
                                    i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
                                  ));
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs"
                            >
                              −
                            </button>
                            <span className="mx-2 text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => {
                                setOfferItems(prev => prev.map(i => 
                                  i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                                ));
                              }}
                              className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            €{(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>

                        {/* Custom Discount Section - DESKTOP VERSION */}
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs font-medium text-gray-700">Discount:</span>
    <div className="flex gap-1">
      <button
        onClick={() => {
          setOfferItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              discountType: 'percentage',
              discountValue: i.discountValue || 0,
              hasCustomDiscount: true
            } : i
          ));
        }}
        className={`px-2 py-1 text-xs rounded ${
          item.discountType === 'percentage' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-white border border-gray-300'
        }`}
      >
        %
      </button>
      <button
        onClick={() => {
          setOfferItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              discountType: 'fixed',
              discountValue: i.discountValue || 0,
              hasCustomDiscount: true
            } : i
          ));
        }}
        className={`px-2 py-1 text-xs rounded ${
          item.discountType === 'fixed' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-white border border-gray-300'
        }`}
      >
        €
      </button>
    </div>
  </div>
  
  <div className="flex gap-2 items-center">
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*\.?[0-9]*"
      value={item.discountValue || ''}
      placeholder="0"
      onFocus={(e) => {
        if (e.target.value === '0' || e.target.value === 0) {
          e.target.value = '';
        }
        e.target.select();
      }}
      onChange={(e) => {
        let value = e.target.value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
          value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        const discountValue = parseFloat(value) || 0;
        setOfferItems(prev => prev.map(i => 
          i.id === item.id ? { 
            ...i, 
            discountValue: discountValue,
            hasCustomDiscount: discountValue > 0
            // DO NOT modify price - discount is applied in calculateItemPrice
          } : i
        ));
      }}
      className="flex-1 p-1.5 text-xs border border-gray-300 rounded text-center"
      style={{
        WebkitAppearance: 'none',
        MozAppearance: 'textfield'
      }}
    />
    <span className="text-xs text-gray-700 font-medium">
      {item.discountType === 'percentage' ? '%' : '€'}
    </span>
  </div>
  
  {/* Show discounted price - Desktop */}
  {item.hasCustomDiscount && item.discountValue > 0 && (
    <div className="mt-2 flex items-center justify-between text-xs">
      <span className="text-gray-500 line-through">
        Original: €{(item.originalPrice * item.quantity).toFixed(2)}
      </span>
      <span className="font-bold text-green-600">
        After: € {calculateItemPrice(item).toFixed(2)}
      </span>
    </div>
  )}
</div>
                        
                        {/* Price breakdown */}
                        <div className="text-xs text-gray-500 mt-2">
                          € {(item.originalPrice || item.price).toFixed(2)} × {item.quantity} = €{calculateItemPrice(item).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Service - Now inside scrollable area */}
                <div className="border-t border-gray-200 pt-4 pb-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <span>➕</span> {t.addCustomService}
                    </h4>
                    {!customServiceOpen && (
                      <button
                        type="button"
                        onClick={() => setCustomServiceOpen(true)}
                        className="text-xs text-indigo-600 font-medium"
                      >
                        {t.addCustom}
                      </button>
                    )}
                  </div>
                  
                  {customServiceOpen && (
                    <>
                      <input
                        type="text"
                        name="name"
                        value={customService.name}
                        onChange={handleCustomServiceChange}
                        placeholder={t.customName}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          name="price"
                          value={customService.price}
                          onChange={handleCustomServiceChange}
                          placeholder={t.customPrice}
                          className="w-1/2 p-2 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
                        />
                        <input
                          type="number"
                          name="quantity"
                          value={customService.quantity}
                          onChange={handleCustomServiceChange}
                          placeholder={t.customQuantity}
                          className="w-1/2 p-2 border border-gray-300 rounded text-sm"
                          min="1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 text-xs text-gray-700">
                          <input
                            type="radio"
                            name="unit"
                            value="service"
                            checked={customServiceUnit === 'service'}
                            onChange={() => setCustomServiceUnit('service')}
                          />
                          {t.unitService}
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-700">
                          <input
                            type="radio"
                            name="unit"
                            value="day"
                            checked={customServiceUnit === 'day'}
                            onChange={() => setCustomServiceUnit('day')}
                          />
                          {t.unitDay}
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-700">
                          <input
                            type="radio"
                            name="unit"
                            value="hour"
                            checked={customServiceUnit === 'hour'}
                            onChange={() => setCustomServiceUnit('hour')}
                          />
                          {t.unitHour}
                        </label>
                      </div>
                      <textarea
                        name="description"
                        value={customService.description}
                        onChange={handleCustomServiceChange}
                        placeholder={t.customDescription}
                        className="w-full p-2 border border-gray-300 rounded text-sm resize-vertical min-h-20"
                      ></textarea>
                      <button
                        type="button"
                        onClick={handleAddCustomService}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md text-sm font-semibold mb-2"
                      >
                        {t.addCustom}
                      </button>
                    </>
                  )}
                </div>

                {/* Offer Summary - Now inside scrollable area to ensure it's always accessible */}
                {offerItems.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 pb-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t.subtotal}:</span>
                        <span>€{offerItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>{t.total}:</span>
                        <span>€{offerItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row'} justify-between items-center ${isMobile ? 'p-4' : 'p-6'} border-t border-gray-200 bg-gray-50 flex-shrink-0`}>
        
        {/* Mobile: Show offer summary */}
        {isMobile && offerItems.length > 0 && currentView === 'offer' && (
          <div className="w-full bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                {offerItems.length} {offerItems.length === 1 ? 'item' : 'items'} in cart
              </span>
              <span className="font-semibold text-lg text-indigo-600">
                €{offerItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
        
        <div className={`flex items-center gap-4 ${isMobile ? 'w-full' : ''}`}>
          <button 
            onClick={() => setShowCreateOffer(false)}
            className={`${isMobile ? 'flex-1' : ''} px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors`}
          >
            {t.cancel}
          </button>
          
          {!isMobile && (
            <div className="text-sm text-gray-600">
              {offerItems.length} {offerItems.length === 1 ? 'item' : 'items'} • €{offerItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
            </div>
          )}
          
          <button 
            onClick={handleSaveOffer}
            disabled={offerItems.length === 0}
            className={`${isMobile ? 'flex-1' : ''} px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium ${
              offerItems.length === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-indigo-700'
            } transition-colors`}
          >
            {currentEditingOffer ? t.updateOffer : t.saveOffer}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
              
              {/* Create Reservation Modal */}
              {showCreateReservation && selectedClient && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {t.reservationDetails} - {selectedClient.name}
                    </h2>
                    {isMobile && (
                      <button 
                        onClick={handleBackToDetails}
                        className="bg-gray-100 text-gray-600 border-none rounded-md py-2 px-3 text-xs mr-4 cursor-pointer"
                      >
                        {t.backToDetails}
                      </button>
                    )}
                    {!isMobile && (
                      <button 
                        onClick={() => setShowCreateReservation(false)}
                        className="bg-transparent border-none text-gray-500 text-xl cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  <form onSubmit={handleCreateReservation} className="p-4 flex flex-col gap-4 overflow-auto flex-1">
                    <div className={`flex flex-wrap gap-4 ${isMobile ? 'flex-col' : ''}`}>
                      <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.startDate} *
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          value={reservationData.startDate}
                          onChange={handleReservationChange}
                          required
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.endDate} *
                        </label>
                        <input
                          type="date"
                          name="endDate"
                          value={reservationData.endDate}
                          onChange={handleReservationChange}
                          required
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className={`flex flex-wrap gap-4 ${isMobile ? 'flex-col' : ''}`}>
                      <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.adults}
                        </label>
                        <input
                          type="number"
                          name="adults"
                          value={reservationData.adults}
                          onChange={handleReservationChange}
                          min="1"
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.children}
                        </label>
                        <input
                          type="number"
                          name="children"
                          value={reservationData.children}
                          onChange={handleReservationChange}
                          min="0"
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className={`flex flex-wrap gap-4 ${isMobile ? 'flex-col' : ''}`}>
                      <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.accommodationType} *
                        </label>
                        <select
                          name="accommodationType"
                          value={reservationData.accommodationType}
                          onChange={handleReservationChange}
                          required
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">{t.selectAccommodation}</option>
                          <option value="Hotel">Hotel</option>
                          <option value="Vilă">Vilă</option>
                          <option value="Apartament">Apartament</option>
                        </select>
                      </div>
                      <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.transportPreferences}
                        </label>
                        <select
                          name="transport"
                          value={reservationData.transport}
                          onChange={handleReservationChange}
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">{t.selectTransport}</option>
                          <option value="Șofer Personal">Șofer Personal</option>
                          <option value="Transport în Comun">Transport în Comun</option>
                          <option value="Autoturism Închiriat">Autoturism Închiriat</option>
                          <option value="Taxi">Taxi</option>
                        </select>
                      </div>
                    </div>

                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {t.collaborator}
                      </label>
                      <select
                        name="collaboratorId"
                        value={reservationData.collaboratorId}
                        onChange={handleReservationChange}
                        className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                      >
                        <option value="">{t.selectCollaborator}</option>
                        {collaborators.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.email || 'Unnamed collaborator'}
                          </option>
                        ))}
                      </select>
                      {!collaboratorsLoading && collaborators.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">{t.noCollaborators}</p>
                      )}
                    </div>
                    
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {t.specialNotes}
                      </label>
                      <textarea
                        name="notes"
                        value={reservationData.notes}
                        onChange={handleReservationChange}
                        className="w-full p-2.5 border border-gray-300 rounded-md text-sm resize-vertical min-h-24"
                        placeholder={t.notesForReservation}
                      ></textarea>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-4">
                      {!isMobile && (
                        <button 
                          type="button" 
                          onClick={() => setShowCreateReservation(false)} 
                          className="py-2.5 px-4 bg-gray-100 text-gray-600 border-none rounded-md text-sm font-medium cursor-pointer"
                        >
                          {t.cancel}
                        </button>
                      )}
                      <button 
                        type="submit" 
                        className="py-2.5 px-4 bg-indigo-600 text-white border-none rounded-md text-sm font-medium cursor-pointer"
                      >
                        {t.submitReservation}
                      </button>
                    </div>
                  </form>
                </div>
              )}{/* Offer to Reservation Modal */}
              {reservationFromOffer && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className={`font-semibold text-gray-800 ${isMobile ? 'text-base' : 'text-xl'}`}>
                      {t.createBookingFromOffer} #{reservationFromOffer.offer.id.slice(-5)}
                    </h2>
                    {isMobile && (
                      <button 
                        onClick={() => {
                          setReservationFromOffer(null);
                          setCurrentView('details');
                        }}
                        className="bg-gray-100 text-gray-600 border-none rounded-md py-2 px-2 text-xs cursor-pointer"
                        type="button" 
                      >
                        {t.backToDetails}
                      </button>
                    )}
                    {!isMobile && (
                      <button 
                        onClick={() => setReservationFromOffer(null)}
                        className="bg-transparent border-none text-gray-500 text-xl cursor-pointer"
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  <div className={`p-${isMobile ? '3' : '4'} flex flex-col gap-${isMobile ? '4' : '6'} overflow-auto flex-1`}>
                    {/* Services Section - Each service has its own dates */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-base font-semibold text-gray-800 mb-4">
                        {t.servicesToIncludeInBooking}
                      </h3>
                      
                      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} justify-between items-center mb-4 gap-2`}>
                        <div className={`${isMobile ? 'w-full mb-2' : ''}`}>
                          <button
                            type="button"
                            onClick={() => {
                              // Toggle selection of all services
                              const updatedItems = {...reservationFromOffer};
                              Object.keys(updatedItems.services).forEach(category => {
                                updatedItems.services[category] = updatedItems.services[category].map(item => ({
                                  ...item,
                                  included: true
                                }));
                              });
                              setReservationFromOffer(updatedItems);
                            }}
                            className={`bg-gray-100 border-none rounded-md text-xs cursor-pointer ${isMobile ? 'w-full py-2.5 px-3' : 'py-2 px-3'}`}
                          >
                            {t.selectAll}
                          </button>
                        </div>
                        <div className={`flex ${isMobile ? 'flex-col w-full' : 'flex-row'} gap-2`}>
                          <button
                            type="button"
                            onClick={() => {
                              // Mark all services as deposit paid
                              const updatedItems = {...reservationFromOffer};
                              Object.keys(updatedItems.services).forEach(category => {
                                updatedItems.services[category] = updatedItems.services[category].map(item => ({
                                  ...item,
                                  paymentStatus: 'partially_paid',
                                  amountPaid: calculateItemPrice(item) * 0.5
                                }));
                              });
                              
                              // Update overall reservation payment status
                              updatedItems.reservationData.paymentStatus = 'partially_paid';
                              updatedItems.reservationData.totalPaid = calculateServicesTotal(updatedItems.services) * 0.5;
                              
                              setReservationFromOffer(updatedItems);
                            }}
                            className={`bg-amber-100 text-amber-800 border-none rounded-md text-xs cursor-pointer ${isMobile ? 'w-full py-2.5 px-3' : 'py-2 px-3'}`}
                          >
                            {t.markAllAsDepositPaid} (50%)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Mark all services as fully paid
                              const updatedItems = {...reservationFromOffer};
                              Object.keys(updatedItems.services).forEach(category => {
                                updatedItems.services[category] = updatedItems.services[category].map(item => ({
                                  ...item,
                                  paymentStatus: 'paid',
                                  amountPaid: calculateItemPrice(item)
                                }));
                              });
                              
                              // Update overall reservation payment status
                              updatedItems.reservationData.paymentStatus = 'paid';
                              updatedItems.reservationData.totalPaid = calculateServicesTotal(updatedItems.services);
                              
                              setReservationFromOffer(updatedItems);
                            }}
                            className={`bg-green-100 text-green-800 border-none rounded-md text-xs cursor-pointer ${isMobile ? 'w-full py-2.5 px-3' : 'py-2 px-3'}`}
                          >
                            {t.markAllAsFullyPaid}
                          </button>
                        </div>
                      </div>
                      
                      {/* Group items by category */}
                      {(() => {
                        // Group items by category
                        const groupedItems = reservationFromOffer.services || {};
                        if (Object.keys(groupedItems).length === 0 && reservationFromOffer.offer.items) {
                          // If services weren't explicitly categorized, do it now
                          reservationFromOffer.offer.items.forEach(item => {
                            const category = item.category || 'other';
                            if (!groupedItems[category]) {
                              groupedItems[category] = [];
                            }
                            groupedItems[category].push({...item, included: true});
                          });
                        }
                        
                        return Object.entries(groupedItems).map(([category, items]) => (
                          <div key={category} className="mb-6">
                            <div className={`flex justify-between items-center mb-3 ${isMobile ? 'flex-wrap' : ''}`}>
                              <h4 className={`text-sm font-semibold text-gray-600 m-0 capitalize ${isMobile ? 'mb-2' : ''}`}>
                                {category === 'villas' ? t.villas : 
                                category === 'cars' ? t.cars : 
                                category === 'boats' ? t.boats : 
                                category === 'nannies' ? t.nannies : 
                                category === 'catering' ? t.catering : 
                                category === 'excursions' ? t.excursions : 
                                category}
                              </h4>
                              <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-end' : ''}`}>
                                <span className="text-xs text-gray-500">
                                  {t.includeAll}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={items.every(item => item.included)}
                                  onChange={(e) => {
                                    // Update all items in this category
                                    const updatedItems = {...reservationFromOffer};
                                    updatedItems.services = updatedItems.services || {};
                                    updatedItems.services[category] = items.map(item => ({
                                      ...item,
                                      included: e.target.checked
                                    }));
                                    setReservationFromOffer(updatedItems);
                                  }}
                                  className={`cursor-pointer ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`}
                                />
                              </div>
                            </div>
                            
                            {/* List of items in this category */}
                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                              {items.map((item, index) => (
                                <div 
                                  key={item.id || index}
                                  className={`
                                    p-${isMobile ? '3.5 px-2.5' : '3'}
                                    flex flex-col
                                    ${index < items.length - 1 ? 'border-b border-gray-200' : ''}
                                    ${item.included ? 'bg-white' : 'bg-gray-50 opacity-75'}
                                  `}
                                >
                                  <div className={`
                                    flex 
                                    ${isMobile ? 'flex-col' : 'flex-row'} 
                                    justify-between
                                    ${item.included ? 'mb-3' : ''}
                                    ${isMobile ? 'gap-3' : ''}
                                  `}>
                                    <div className="flex-1">
                                      <div className={`
                                        text-sm
                                        font-medium
                                        mb-1
                                        ${item.included ? 'text-gray-900' : 'text-gray-500'}
                                        flex items-center
                                      `}>
                                        <input 
                                          type="checkbox"
                                          checked={item.included}
                                          onChange={(e) => {
                                            // Update this specific item
                                            const updatedItems = {...reservationFromOffer};
                                            const itemIndex = items.findIndex(i => i.id === item.id);
                                            if (itemIndex !== -1) {
                                              updatedItems.services = updatedItems.services || {};
                                              updatedItems.services[category] = [...items];
                                              updatedItems.services[category][itemIndex] = {
                                                ...items[itemIndex],
                                                included: e.target.checked
                                              };
                                              setReservationFromOffer(updatedItems);
                                            }
                                          }}
                                          className={`cursor-pointer mr-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`}
                                        />
                                        {typeof item.name === 'object' ? getLocalizedText(item.name, language) : item.name}
                                      </div>
                                      <div className="text-xs text-gray-500 flex flex-wrap gap-2 ml-6">
                                        <span>€ {(item.originalPrice || item.price).toFixed(2)} {item.unit ? `/${item.unit}` : ''}</span>
                                        <span>× {item.quantity}</span>
                                        {item.discountValue ? (
                                          <>
                                            <span>= € {((item.originalPrice || item.price) * item.quantity).toFixed(2)}</span>
                                            <span className="text-red-600">
                                              - € {item.discountType === 'percentage' 
                                                ? (((item.originalPrice || item.price) * item.quantity) * (item.discountValue / 100)).toFixed(2)
                                                : item.discountValue.toFixed(2)}
                                              {item.discountType === 'percentage' ? ` (${item.discountValue}%)` : ''}
                                            </span>
                                            <span className="font-medium text-green-700">= € {calculateItemPrice(item).toFixed(2)}</span>
                                          </>
                                        ) : (
                                          <span>= € {(item.price * item.quantity).toFixed(2)}</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Date adjustment for this item if needed */}
                                    {['villas', 'cars', 'boats'].includes(category) && item.included && (
                                      <div className={`
                                        flex flex-col 
                                        ${isMobile ? 'ml-6' : 'mr-4'}
                                        gap-1
                                        ${isMobile ? 'items-start mt-2' : 'items-center'}
                                      `}>
                                        <div className="text-xs text-gray-500">
                                          {t.serviceDates}
                                        </div>
                                        <div className={`
                                          flex 
                                          ${isMobile ? 'flex-col w-full' : 'flex-row'} 
                                          gap-${isMobile ? '2' : '1'}
                                        `}>
                                          <input
                                            type="date"
                                            value={item.startDate || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => {
                                              // Update this service's start date
                                              const updatedItems = {...reservationFromOffer};
                                              const itemIndex = items.findIndex(i => i.id === item.id);
                                              if (itemIndex !== -1) {
                                                updatedItems.services = updatedItems.services || {};
                                                updatedItems.services[category] = [...items];
                                                updatedItems.services[category][itemIndex] = {
                                                  ...items[itemIndex],
                                                  startDate: e.target.value
                                                };
                                                setReservationFromOffer(updatedItems);
                                              }
                                            }}
                                            className={`
                                              border border-gray-300 rounded-md
                                              p-1.5
                                              text-sm
                                              ${isMobile ? 'w-full min-h-10' : 'w-30'}
                                            `}
                                          />
                                          <input
                                            type="date"
                                            value={item.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                            onChange={(e) => {
                                              // Update this service's end date
                                              const updatedItems = {...reservationFromOffer};
                                              const itemIndex = items.findIndex(i => i.id === item.id);
                                              if (itemIndex !== -1) {
                                                updatedItems.services = updatedItems.services || {};
                                                updatedItems.services[category] = [...items];
                                                updatedItems.services[category][itemIndex] = {
                                                  ...items[itemIndex],
                                                  endDate: e.target.value
                                                };
                                                setReservationFromOffer(updatedItems);
                                              }
                                            }}
                                            className={`
                                              border border-gray-300 rounded-md
                                              p-1.5
                                              text-sm
                                              ${isMobile ? 'w-full min-h-10' : 'w-30'}
                                            `}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Payment tracking section - only show if item is included */}
                                  {item.included && (
                                    <div className="ml-6 bg-gray-50 p-3 rounded-md mt-2">
                                      <div className={`
                                        flex
                                        mb-2
                                        flex-wrap
                                        gap-2
                                        ${isMobile ? 'flex-col items-start' : 'items-center'}
                                      `}>
                                        <div className={`
                                          text-xs 
                                          font-medium 
                                          text-gray-600 
                                          mr-2
                                          ${isMobile ? 'mb-1' : ''}
                                        `}>
                                          {t.paymentStatus}:
                                        </div>
                                        <div className={`
                                          flex 
                                          gap-2
                                          ${isMobile ? 'w-full justify-between' : ''}
                                        `}>
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              // Update payment status
                                              const updatedItems = {...reservationFromOffer};
                                              const itemIndex = items.findIndex(i => i.id === item.id);
                                              if (itemIndex !== -1) {
                                                updatedItems.services = updatedItems.services || {};
                                                updatedItems.services[category] = [...items];
                                                updatedItems.services[category][itemIndex] = {
                                                  ...items[itemIndex],
                                                  paymentStatus: 'unpaid',
                                                  amountPaid: 0
                                                };
                                                setReservationFromOffer(updatedItems);
                                              }
                                            }}
                                            className={`
                                              py-${isMobile ? '2' : '1'} px-3
                                              rounded text-xs
                                              border-none
                                              ${item.paymentStatus === 'unpaid' ? 'bg-gray-200 font-semibold' : 'bg-transparent'}
                                              cursor-pointer
                                              ${isMobile ? 'flex-1' : ''}
                                            `}
                                          >
                                            {t.unpaid}
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              // Update payment status
                                              const updatedItems = {...reservationFromOffer};
                                              const itemIndex = items.findIndex(i => i.id === item.id);
                                              if (itemIndex !== -1) {
                                                const itemTotal = calculateItemPrice(item);
                                                  
                                                updatedItems.services = updatedItems.services || {};
                                                updatedItems.services[category] = [...items];
                                                updatedItems.services[category][itemIndex] = {
                                                  ...items[itemIndex],
                                                  paymentStatus: 'partially_paid',
                                                  amountPaid: parseFloat((itemTotal * 0.5).toFixed(2))
                                                };
                                                setReservationFromOffer(updatedItems);
                                              }
                                            }}
                                            className={`
                                              py-${isMobile ? '2' : '1'} px-3
                                              rounded text-xs
                                              border-none
                                              ${item.paymentStatus === 'partially_paid' ? 'bg-amber-100 text-amber-800 font-semibold' : 'bg-transparent'}
                                              cursor-pointer
                                              ${isMobile ? 'flex-1' : ''}
                                            `}
                                          >
                                            {t.depositPaid}
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              // Update payment status
                                              const updatedItems = {...reservationFromOffer};
                                              const itemIndex = items.findIndex(i => i.id === item.id);
                                              if (itemIndex !== -1) {
                                                const itemTotal = calculateItemPrice(item);
                                                  
                                                updatedItems.services = updatedItems.services || {};
                                                updatedItems.services[category] = [...items];
                                                updatedItems.services[category][itemIndex] = {
                                                  ...items[itemIndex],
                                                  paymentStatus: 'paid',
                                                  amountPaid: itemTotal
                                                };
                                                setReservationFromOffer(updatedItems);
                                              }
                                            }}
                                            className={`
                                              py-${isMobile ? '2' : '1'} px-3
                                              rounded text-xs
                                              border-none
                                              ${item.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 font-semibold' : 'bg-transparent'}
                                              cursor-pointer
                                              ${isMobile ? 'flex-1' : ''}
                                            `}
                                          >
                                            {t.fullyPaid}
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Amount paid input */}
                                      <div className={`
                                        flex
                                        flex-wrap
                                        gap-2
                                        ${isMobile ? 'flex-col items-start' : 'items-center'}
                                      `}>
                                        <div className={`
                                          text-xs 
                                          font-medium 
                                          text-gray-600 
                                          mr-2
                                          ${isMobile ? 'mb-1' : ''}
                                        `}>
                                          {t.amountPaid}:
                                        </div>
                                        <div className={`
                                          relative 
                                          ${isMobile ? 'w-full' : 'w-30'}
                                        `}>
                                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">€</span>
                                          <input
                                            type="number"
                                            value={item.amountPaid === 0 || item.amountPaid === undefined ? '' : item.amountPaid}
                                            placeholder="0"
                                            onFocus={(e) => {
                                              if (e.target.value === '0') {
                                                e.target.value = '';
                                              }
                                            }}
                                            onChange={(e) => {
                                              // Update amount paid
                                              const updatedItems = {...reservationFromOffer};
                                              const itemIndex = items.findIndex(i => i.id === item.id);
                                              if (itemIndex !== -1) {
                                                const rawValue = e.target.value;
                                                const newAmount = rawValue === '' ? 0 : parseFloat(rawValue) || 0;
                                                const itemTotal = calculateItemPrice(item);
                                                  
                                                let paymentStatus = 'unpaid';
                                                if (newAmount >= itemTotal) {
                                                  paymentStatus = 'paid';
                                                } else if (newAmount > 0) {
                                                  paymentStatus = 'partially_paid';
                                                }
                                                
                                                updatedItems.services = updatedItems.services || {};
                                                updatedItems.services[category] = [...items];
                                                updatedItems.services[category][itemIndex] = {
                                                  ...items[itemIndex],
                                                  paymentStatus,
                                                  amountPaid: rawValue === '' ? '' : newAmount
                                                };
                                                setReservationFromOffer(updatedItems);
                                              }
                                            }}
                                            onBlur={(e) => {
                                              // On blur, set to 0 if empty
                                              if (e.target.value === '') {
                                                const updatedItems = {...reservationFromOffer};
                                                const itemIndex = items.findIndex(i => i.id === item.id);
                                                if (itemIndex !== -1) {
                                                  updatedItems.services = updatedItems.services || {};
                                                  updatedItems.services[category] = [...items];
                                                  updatedItems.services[category][itemIndex] = {
                                                    ...items[itemIndex],
                                                    paymentStatus: 'unpaid',
                                                    amountPaid: 0
                                                  };
                                                  setReservationFromOffer(updatedItems);
                                                }
                                              }
                                            }}
                                            className={`
                                              border border-gray-300 rounded-md
                                              p-1.5
                                              pl-6
                                              w-full
                                              text-xs
                                              ${isMobile ? 'min-h-10' : ''}
                                            `}
                                            min="0"
                                            step="0.01"
                                          />
                                        </div>
                                        <div className="text-xs text-gray-500 ml-2">
                                          {t.of} € {calculateItemPrice(item).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                    
                    {/* Additional Notes Section */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-base font-semibold text-gray-800 mb-4">
                        {t.additionalInformation}
                      </h3>
                      
                      <div className="w-full mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.collaborator}
                        </label>
                        <select
                          name="collaboratorId"
                          value={reservationFromOffer.reservationData.collaboratorId || ''}
                          onChange={handleReservationFromOfferChange}
                          className={`
                            w-full p-2.5 border border-gray-300 rounded-md
                            text-sm bg-white
                            ${isMobile ? 'min-h-11' : ''}
                          `}
                        >
                          <option value="">{t.selectCollaborator}</option>
                          {collaborators.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name || c.email || 'Unnamed collaborator'}
                            </option>
                          ))}
                        </select>
                        {!collaboratorsLoading && collaborators.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">{t.noCollaborators}</p>
                        )}
                      </div>

                      <div className="w-full mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.notes}
                        </label>
                        <textarea
                          name="notes"
                          value={reservationFromOffer.reservationData.notes}
                          onChange={handleReservationFromOfferChange}
                          className={`
                            w-full p-3 border border-gray-300 rounded-md
                            text-${isMobile ? 'base' : 'sm'}
                            resize-vertical min-h-24
                          `}
                          placeholder={t.notesForReservation}
                        ></textarea>
                      </div>
                      
                      {/* Payment Method Dropdown */}
                      <div className="w-full mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.paymentMethod}
                        </label>
                        <select
                          name="paymentMethod"
                          value={reservationFromOffer.reservationData.paymentMethod || ''}
                          onChange={handleReservationFromOfferChange}
                          className={`
                            w-full p-2.5 border border-gray-300 rounded-md
                            text-sm bg-white
                            ${isMobile ? 'min-h-11' : ''}
                          `}
                        >
                          <option value="">{t.selectPaymentMethod}</option>
                          <option value="cash">{t.paymentMethods?.cash}</option>
                          <option value="transfer">{t.paymentMethods?.transfer}</option>
                          <option value="crypto">{t.paymentMethods?.crypto}</option>
                          <option value="link">{t.paymentMethods?.link}</option>
                        </select>
                      </div>
                      
                      {(reservationFromOffer.reservationData.paymentStatus === 'partially_paid' || 
                        reservationFromOffer.reservationData.paymentStatus === 'paid') && (
                        <div className="w-full mb-4">
                          <label className="block text-sm font-medium text-gray-600 mb-2">
                            {t.amountPaid}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                            <input
                              type="number"
                              name="totalPaid"
                              value={reservationFromOffer.reservationData.totalPaid || '0'}
                              onChange={handleReservationFromOfferChange}
                              className={`
                                w-full p-2.5 pl-6 border border-gray-300 rounded-md
                                text-sm
                                ${isMobile ? 'min-h-11' : ''}
                              `}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      {!isMobile && (
                        <button 
                          type="button"
                          onClick={() => setReservationFromOffer(null)} 
                          className="py-2.5 px-4 bg-gray-100 text-gray-600 border-none rounded-md text-sm font-medium cursor-pointer"
                        >
                          {t.cancel}
                        </button>
                      )}
                      <button 
                        onClick={handleFinalizeReservationFromOffer}
                        className={`
                          py-${isMobile ? '3' : '2.5'} px-4 
                          bg-green-600 text-white 
                          border-none rounded-md 
                          text-${isMobile ? 'base' : 'sm'} 
                          font-medium cursor-pointer
                          ${isMobile ? 'w-full' : ''}
                        `}
                        type="button"
                      >
                        {t.createBooking}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Client Details View */}
              {selectedClient && !showCreateOffer && !showCreateReservation && !showEditClient && !reservationFromOffer && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      {isMobile && (
                        <button 
                          onClick={handleBackToList}
                          className="bg-gray-100 text-gray-600 border-none rounded-md py-2 px-3 text-xs cursor-pointer"
                        >
                          {t.backToList}
                        </button>
                      )}
                      <h2 className="text-xl font-semibold text-gray-800">{selectedClient.name}</h2>
                      {renderStatusBadge(selectedClient.status, selectedClient.isVip)}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleEditClient} 
                        className="bg-gray-200 border-none rounded-md p-2 text-base cursor-pointer"
                        title={t.editClient}
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={handleDeleteClient} 
                        className="bg-red-100 text-red-500 border-none rounded-md p-2 text-base cursor-pointer"
                        title={t.deleteClient}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 overflow-auto flex-1">
                    {/* Contact Information */}
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        {t.contactInfo}
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">{t.email}</p>
                            <p className="text-sm text-gray-900 break-words">{selectedClient.email || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">{t.phone}</p>
                            <p className="text-sm text-gray-900 break-words">{selectedClient.phone || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">{t.address}</p>
                            <p className="text-sm text-gray-900">
                              {typeof selectedClient.address === 'object'
                                ? getLocalizedText(selectedClient.address, language)
                                : selectedClient.address || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">{t.nationality}</p>
                            <p className="text-sm text-gray-900">
                              {typeof selectedClient.nationality === 'object'
                                ? getLocalizedText(selectedClient.nationality, language)
                                : selectedClient.nationality || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">{t.clientSince}</p>
                            <p className="text-sm text-gray-900">
                              {selectedClient.createdAt ? 
                                (typeof selectedClient.createdAt === 'string' ? 
                                  formatDate(selectedClient.createdAt) : 
                                  (selectedClient.createdAt.seconds ? 
                                    formatDate(new Date(selectedClient.createdAt.seconds * 1000)) : 
                                    formatDate(selectedClient.createdAt))) : 
                                selectedClient.clientSince ? 
                                  formatDate(selectedClient.clientSince) : 
                                  '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">{t.preferredLanguage}</p>
                            <p className="text-sm text-gray-900">{selectedClient.preferredLanguage || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lead Information Section */}
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Informații Lead
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
                          {/* Lead Source */}
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Sursa Potențialului Client</p>
                            <p className="text-sm text-gray-900 capitalize">{selectedClient.leadSource || '-'}</p>
                          </div>
                          
                          {/* Lead Stage */}
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Stadiul Potențialului Client</p>
                            <p className="text-sm text-gray-900 capitalize">{selectedClient.leadStatus || '-'}</p>
                          </div>
                          
                          {/* Assigned To */}
                          <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Responsabil</p>
                          <p className="text-sm text-gray-900">
                            {loadingUsers ? (
                              <span className="inline-block w-4 h-4 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></span>
                            ) : (
                              selectedClient.assignedToName || assignedUserName
                            )}
                          </p>
                        </div>
                          
                          {/* Follow Up Date */}
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Data Recontactării</p>
                            <p className="text-sm text-gray-900">{selectedClient.followUpDate ? formatDate(selectedClient.followUpDate) : '-'}</p>
                          </div>
                          
                          {/* Conversion Potential */}
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Potențial de Conversie</p>
                            <p className="text-sm text-gray-900 capitalize">{selectedClient.conversionPotential || '-'}</p>
                          </div>
                          
                          {/* Previous Client */}
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Client Anterior</p>
                            <p className="text-sm text-gray-900">
                              {selectedClient.isPreviousClient ? 'Da' : 'Nu'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Interests and Travel Details */}
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Interese și Date de Călătorie
                      </h3>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
                          {/* Budget */}
                          <div>
                            <p className="text-xs text-blue-700 font-medium mb-1">Buget Estimativ</p>
                            <p className="text-sm text-blue-900">
                              {selectedClient.budget ? `€${selectedClient.budget}` : '-'}
                            </p>
                          </div>
                          
                          {/* Trip Dates */}
                          <div>
                            <p className="text-xs text-blue-700 font-medium mb-1">Date de Călătorie</p>
                            <p className="text-sm text-blue-900">
                              {selectedClient.startDate ? formatDate(selectedClient.startDate) : '-'} - {' '}
                              {selectedClient.endDate ? formatDate(selectedClient.endDate) : '-'}
                            </p>
                          </div>
                          
                          {/* Group Size */}
                          <div>
                            <p className="text-xs text-blue-700 font-medium mb-1">Mărimea Grupului</p>
                            <p className="text-sm text-blue-900">
                              {selectedClient.adults || 0} Adulți, {selectedClient.children || 0} Copii
                            </p>
                          </div>
                          
                          {/* Property Types */}
                          <div className={isMobile ? '' : 'col-span-2'}>
                            <p className="text-xs text-blue-700 font-medium mb-1">Tipuri de Proprietăți de Interes</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedClient.propertyTypes?.villas && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">Vile</span>
                              )}
                              {selectedClient.propertyTypes?.apartments && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">Apartamente</span>
                              )}
                              {selectedClient.propertyTypes?.hotels && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">Hoteluri</span>
                              )}
                              {!selectedClient.propertyTypes?.villas && 
                              !selectedClient.propertyTypes?.apartments && 
                              !selectedClient.propertyTypes?.hotels && 
                                <span className="text-sm text-blue-900">-</span>
                              }
                            </div>
                          </div>
                          
                          {/* Activities */}
                          <div className={isMobile ? '' : 'col-span-3'}>
                            <p className="text-xs text-blue-700 font-medium mb-1">Activități de Interes</p>
                            <p className="text-sm text-blue-900 whitespace-pre-line">
                              {selectedClient.activities || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Current Stay */}
                    {selectedClient.currentStay && (
                      <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          {t.currentStay}
                        </h3>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
                            <div>
                              <p className="text-xs text-blue-700 font-medium mb-1">{t.checkIn}</p>
                              <p className="text-sm text-blue-900">{formatDate(selectedClient.currentStay.checkIn)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-blue-700 font-medium mb-1">{t.checkOut}</p>
                              <p className="text-sm text-blue-900">{formatDate(selectedClient.currentStay.checkOut)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-blue-700 font-medium mb-1">{t.accommodationType}</p>
                              <p className="text-sm text-blue-900">{selectedClient.currentStay.accommodationType}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Notes */}
                    {selectedClient.notes && (
                      <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Observații
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selectedClient.notes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Additional Contact Persons */}
                    {selectedClient.contactPersons && selectedClient.contactPersons.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Persoane de Contact Adiționale
                        </h3>
                        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                          {selectedClient.contactPersons.map((contact, index) => (
                            <div 
                              key={`contact-${index}`}
                              className={`p-3 ${index < selectedClient.contactPersons.length - 1 ? 'border-b border-gray-200' : ''}`}
                            >
                              <div className="font-medium text-sm mb-1">{contact.name || 'Contact'}</div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                {contact.email && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-400">✉️</span>
                                    <span>{contact.email}</span>
                                  </div>
                                )}
                                {contact.phone && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-400">📱</span>
                                    <span>{contact.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Past Stays */}
                    {selectedClient.pastStays && selectedClient.pastStays.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          {t.past}
                        </h3>
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3`}>
                          {selectedClient.pastStays.map((stay, index) => (
                            <div key={stay.id || `past-stay-${index}`} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">{t.from}</span>
                                  <span className="text-sm text-gray-900 font-medium">{formatDate(stay.checkIn)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">{t.to}</span>
                                  <span className="text-sm text-gray-900 font-medium">{formatDate(stay.checkOut)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">{t.accommodationType}</span>
                                  <span className="text-sm text-gray-900 font-medium">{stay.accommodationType}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Upcoming Reservations */}
                    {selectedClient.upcomingReservations && selectedClient.upcomingReservations.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          {t.upcoming}
                        </h3>
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3`}>
                          {selectedClient.upcomingReservations.map((res, index) => (
                            <div key={res.id || `upcoming-res-${index}`} className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-green-700">{t.from}</span>
                                  <span className="text-sm text-green-900 font-medium">{formatDate(res.checkIn)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-green-700">{t.to}</span>
                                  <span className="text-sm text-green-900 font-medium">{formatDate(res.checkOut)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-green-700">{t.accommodationType}</span>
                                  <span className="text-sm text-green-900 font-medium">{res.accommodationType}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Offer History */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {t.offerHistory}
                        </h3>
                        <button 
                          onClick={handleShowCreateOffer}
                          className="bg-indigo-600 text-white text-xs font-medium py-2 px-3 rounded-md"
                        >
                          {t.createNewOffer}
                        </button>
                      </div>
                      
                      {offersHistory.length === 0 ? (
                        <div className="bg-gray-50 p-4 text-center text-sm text-gray-500 rounded-lg border border-gray-200">
                          {t.noPreviousOffers}
                        </div>
                      ) : (
                        <div
                          className="grid gap-4"
                          style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))' }}
                        >
                          {offersHistory.map(offer => (
                            <div key={offer.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm translate-y-0 hover:-translate-y-0.5 transition-transform min-h-[320px]">
                              <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center min-h-[60px]">
                                <div>
                                  <div className="text-xs font-semibold text-gray-600">#{offer.id.slice(-5)}</div>
                                  <div className="text-xs text-gray-500 mt-1">{offer.createdAt}</div>
                                </div>
                                {renderOfferStatusBadge(offer.status)}
                              </div>
                              <div className="p-3 space-y-3">
                                <div className="flex justify-between mb-2">
                                  <span className="text-xs text-gray-500">{t.offerTotal}</span>
                                  <span className="text-sm font-medium text-gray-900">€ {offer.totalValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between mb-3">
                                  <span className="text-xs text-gray-500">{t.offerItems}</span>
                                  <span className="text-sm font-medium text-gray-900">{offer.items.length}</span>
                                </div>
                                
                                {/* Show top 3 services */}
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="text-xs text-gray-500 mb-2">
                                    Top services:
                                  </div>
                                  <ul className="m-0 p-0 list-none text-xs space-y-1">
                                    {offer.items.slice(0, 3).map((item, idx) => (
                                      <li key={idx} className="flex justify-between py-1">
                                        <span className={`text-gray-700 ${item.discountValue ? 'font-semibold' : ''}`}>
                                          {typeof item.name === 'object' 
                                            ? getLocalizedText(item.name, language) 
                                            : item.name}
                                          {item.quantity > 1 && ` × ${item.quantity}`}
                                        </span>
                                        <span className="text-gray-600">
                                          {item.discountValue > 0 ? (
                                            <span className="text-red-600">
                                              € {(item.discountType === 'percentage' 
                                                ? ((item.originalPrice || item.price) * item.quantity) * (1 - item.discountValue/100) 
                                                : ((item.originalPrice || item.price) * item.quantity) - item.discountValue).toFixed(2)}
                                            </span>
                                          ) : (
                                            `€${((item.originalPrice || item.price) * item.quantity).toFixed(2)}`
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                    {offer.items.length > 3 && (
                                      <li className="text-center text-xs text-gray-500 italic pt-1">
                                        + {offer.items.length - 3} more services
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                                <div className="flex flex-wrap justify-between gap-2 p-3 bg-gray-50 border-t border-gray-200">
                                  <button 
                                    onClick={() => handleViewOfferDetails(offer)} 
                                    className="text-indigo-700 hover:text-indigo-900 text-xs font-semibold underline py-1.5 px-2 bg-indigo-50 border border-indigo-200 rounded transition-colors"
                                  >
                                    {t.viewOfferDetails}
                                  </button>
                                  <div className="flex gap-2">
                                    {offer.status !== 'booked' && (
                                      <>
                                        <button 
                                          onClick={() => handleConvertOfferToReservation(offer)} 
                                          className="bg-green-600 text-white text-xs font-medium py-1.5 px-2 rounded border-none cursor-pointer"
                                        >
                                          {t.convertToBooking}
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteOffer(offer)}
                                          className="bg-red-100 text-red-600 text-xs font-medium py-1.5 px-2 rounded border-none cursor-pointer"
                                        >
                                          {t.deleteOffer}
                                        </button>
                                      </>
                                    )}
                                    <button 
                                      onClick={() => handleGeneratePdf(offer)}
                                      className="bg-gray-100 text-gray-600 text-xs font-medium py-1 px-2 rounded border-none cursor-pointer"
                                    >
                                      {t.generatePdf}
                                    </button>
                                  </div>
                                </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-center mt-4 mb-6">
                      <button 
                        onClick={handleShowCreateOffer}
                        className="bg-indigo-600 text-white font-medium py-3 px-6 rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
                      >
                        {t.createNewOffer}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* No Client Selected State */}
              {!selectedClient && !showCreateOffer && !showCreateReservation && !showEditClient && !reservationFromOffer && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                  <div className="text-5xl text-gray-300 mb-4">👤</div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">{t.noClientSelected}</h3>
                  <p className="text-sm text-gray-500">{t.selectClient}</p>
                </div>
              )}
              
              {/* Mobile view for offer to reservation conversion */}
              {isMobile && currentView === 'reservation-from-offer' && reservationFromOffer && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-base font-semibold text-gray-800">
                      {t.createBookingFromOffer} #{reservationFromOffer.offer.id.slice(-5)}
                    </h2>
                    <button 
                      onClick={() => {
                        setReservationFromOffer(null);
                        setCurrentView('details');
                      }}
                      className="bg-gray-100 text-gray-600 border-none rounded-md py-2 px-2 text-xs cursor-pointer"
                    >
                      {t.backToDetails}
                    </button>
                  </div>
                  
                  <form onSubmit={handleFinalizeReservationFromOffer} className="p-4 flex flex-col gap-4 overflow-auto flex-1">
                    {/* Info: Booking dates are auto-calculated from service dates */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        ℹ️ {language === 'ro' 
                          ? 'Datele rezervării vor fi calculate automat din datele serviciilor din ofertă.'
                          : 'Booking dates will be auto-calculated from service dates in the offer.'}
                      </p>
                      {reservationFromOffer.offer?.items && (
                        <p className="text-xs text-blue-600 mt-1">
                          {language === 'ro' ? 'Servicii:' : 'Services:'} {reservationFromOffer.offer.items.length}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.adults}
                        </label>
                        <input
                          type="number"
                          name="adults"
                          value={reservationFromOffer.reservationData.adults}
                          onChange={handleReservationFromOfferChange}
                          min="1"
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.children}
                        </label>
                        <input
                          type="number"
                          name="children"
                          value={reservationFromOffer.reservationData.children}
                          onChange={handleReservationFromOfferChange}
                          min="0"
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.accommodationType} *
                        </label>
                        <input
                          type="text"
                          name="accommodationType"
                          value={reservationFromOffer.reservationData.accommodationType}
                          onChange={handleReservationFromOfferChange}
                          required
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.collaborator}
                        </label>
                        <select
                          name="collaboratorId"
                          value={reservationFromOffer.reservationData.collaboratorId || ''}
                          onChange={handleReservationFromOfferChange}
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">{t.selectCollaborator}</option>
                          {collaborators.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name || c.email || 'Unnamed collaborator'}
                            </option>
                          ))}
                        </select>
                        {!collaboratorsLoading && collaborators.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">{t.noCollaborators}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {t.notes}
                      </label>
                      <textarea
                        name="notes"
                        value={reservationFromOffer.reservationData.notes}
                        onChange={handleReservationFromOfferChange}
                        className="w-full p-2.5 border border-gray-300 rounded-md text-sm resize-vertical min-h-24"
                        placeholder={t.notesForReservation}
                      ></textarea>
                    </div>
                    
                    <div className="mt-4">
                      <button 
                        type="submit" 
                        className="w-full py-3 px-4 bg-green-600 text-white border-none rounded-md text-base font-medium cursor-pointer"
                      >
                        {t.createBooking}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExistingClients;
