import React, { useState, useEffect, useMemo } from 'react';
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
  deleteDoc 
} from 'firebase/firestore';
import { useDatabase } from "../../context/DatabaseContext";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
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
    offerDeletedSuccess: 'Offer deleted successfully.',
    deleteOffer: 'Delete Offer',
    selectClient: 'Select a client from the list to view their details.',
    confirmDelete: 'Are you sure you want to delete this client?',
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
    currentOfferItems: 'Current Offer Items',
    noItemsAdded: 'No items added to this offer yet.',
    service: 'Service',
    rate: 'Rate',
    quantity: 'Quantity',
    total: 'Total',
    additionalNotes: 'Additional Notes',
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
    perWeek: 'per week',
    perMonth: 'per month',
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
    noClientSelected: 'Niciun Client Selectat',
    selectClient: 'Selectează un client din listă pentru a vedea detaliile.',
    confirmDelete: 'Ești sigur că dorești să ștergi acest client?',
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
    currentOfferItems: 'Articole în Oferta Curentă',
    noItemsAdded: 'Nu a fost adăugat niciun articol la această ofertă.',
    service: 'Serviciu',
    rate: 'Tarif',
    quantity: 'Cantitate',
    total: 'Total',
    additionalNotes: 'Note Suplimentare',
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
    perWeek: 'pe săptămână',
    perMonth: 'pe lună',
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
  // Function to extract image URLs from service data
  const extractImageUrl = (data) => {
    // Check all possible image field names in order of preference
    if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.trim() !== '') {
      return data.imageUrl;
    } 
    
    if (data.image && typeof data.image === 'string' && data.image.trim() !== '') {
      return data.image;
    }
    
    if (data.thumbnail && typeof data.thumbnail === 'string' && data.thumbnail.trim() !== '') {
      return data.thumbnail;
    }
    
    // Check for photos array - handling Firestore object structure
    if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      // First check if photos contains objects with url property (Firestore format)
      const photoWithUrl = data.photos.find(photo => 
        photo && typeof photo === 'object' && photo.url && typeof photo.url === 'string');
      
      if (photoWithUrl) {
        return photoWithUrl.url;
      }
      
      // Fallback to check for string URLs directly in the array
      const firstValidPhoto = data.photos.find(photo => typeof photo === 'string' && photo.trim() !== '');
      if (firstValidPhoto) return firstValidPhoto;
    }
    
    // Check for images array
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      // First check if images contains objects with url property
      const imageWithUrl = data.images.find(img => 
        img && typeof img === 'object' && img.url && typeof img.url === 'string');
      
      if (imageWithUrl) {
        return imageWithUrl.url;
      }
      
      // Fallback to string URLs
      const firstValidImage = data.images.find(img => typeof img === 'string' && img.trim() !== '');
      if (firstValidImage) return firstValidImage;
    }
    
    // If no image found, return null
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
  
  // Modals and UI states
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [showCreateReservation, setShowCreateReservation] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Offer states
  const [selectedCategory, setSelectedCategory] = useState('villas');
  const [offerItems, setOfferItems] = useState([]);
  const [offerNotes, setOfferNotes] = useState('');
  const [offersHistory, setOffersHistory] = useState([]);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [discountValue, setDiscountValue] = useState(0);
  const [availableServices, setAvailableServices] = useState({});
  const [loadingServices, setLoadingServices] = useState(false);
  
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
    notes: ''
  });

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
    preferredLanguage: '',
    dietaryRestrictions: '',
    transportPreferences: '',
    specialRequests: '',
    notes: ''
  });
  
  // Service categories for offerings (memoized to prevent infinite re-render)
  const serviceCategories = useMemo(() => [
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
    if (selectedClient?.assignedTo) {
      const fetchUserName = async () => {
        const name = await getUserName(selectedClient.assignedTo);
        setAssignedUserName(name);
      };
      
      fetchUserName();
    } else {
      setAssignedUserName('-');
    }
  }, [selectedClient]);

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
          isVip: data.isVip || false,
          preferredLanguage: data.preferredLanguage || '',
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
                
                // Debugging logs
                console.log(`Processing villa: ${data.name?.en || data.name || 'Unknown'}`);
                console.log('Raw data structure:', JSON.stringify(data, null, 2));
                
                if (data.photos) {
                  console.log('Photos array:', data.photos);
                  console.log('Photos array type:', Array.isArray(data.photos) ? 'Array' : typeof data.photos);
                  console.log('Photos array length:', data.photos.length);
                  
                  // Check first photo if it exists
                  if (data.photos.length > 0) {
                    console.log('First photo structure:', data.photos[0]);
                    console.log('First photo URL:', data.photos[0]?.url);
                  }
                }
                
                // Extract image URL using our helper function
                const imageUrl = extractImageUrl(data);
                console.log('Extracted image URL:', imageUrl);
                
                const priceConfig = data.priceConfigurations && data.priceConfigurations.length > 0 
                                  ? data.priceConfigurations[0] 
                                  : null;
                
                return {
                  id: doc.id,
                  ...data,
                  price: priceConfig ? parseFloat(priceConfig.price) || 0 : (data.price ? parseFloat(data.price) : 0),
                  dailyPrice: priceConfig ? parseFloat(priceConfig.price) || 0 : (data.dailyPrice ? parseFloat(data.dailyPrice) : 0),
                  unit: priceConfig ? priceConfig.type || 'day' : 'day',
                  category: category.id,
                  companyId: companyInfo.id,
                  imageUrl: imageUrl
                };
              });
            } else if (category.id === 'boats') {
              services[category.id] = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // Also use the image extraction function for boats
                const imageUrl = extractImageUrl(data);
                
                // Check for multiple possible price fields
                const priceValue = data.rate !== undefined ? data.rate : 
                                 (data.price !== undefined ? data.price : 
                                 (data.hourlyRate !== undefined ? data.hourlyRate : 0));
                                 
                return {
                  id: doc.id,
                  ...data,
                  price: parseFloat(priceValue) || 0,
                  hourlyRate: parseFloat(data.hourlyRate || priceValue) || 0,
                  unit: 'hour',
                  category: category.id,
                  companyId: companyInfo.id,
                  imageUrl: imageUrl
                };
              });
            } else if (category.id === 'cars') {
              services[category.id] = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // Use the image extraction function for cars too
                const imageUrl = extractImageUrl(data);
                
                // For cars, price might be in pricing.daily or other formats
                let priceValue = 0;
                
                // Check for pricing structure first
                if (data.pricing && data.pricing.daily) {
                  priceValue = data.pricing.daily;
                } 
                // Then check for direct price fields
                else if (data.rate !== undefined) {
                  priceValue = data.rate;
                } else if (data.price !== undefined) {
                  priceValue = data.price;
                } else if (data.dailyRate !== undefined) {
                  priceValue = data.dailyRate;
                }
                
                return {
                  id: doc.id,
                  ...data,
                  price: parseFloat(priceValue) || 0,
                  dailyRate: parseFloat(priceValue) || 0,
                  unit: 'day',
                  category: category.id,
                  companyId: companyInfo.id,
                  imageUrl: imageUrl,
                  // Include additional car info for display
                  make: data.make || '',
                  model: data.model || '',
                  year: data.year || ''
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
                                 
                return {
                  id: doc.id,
                  ...data,
                  price: parseFloat(priceValue) || 0,
                  unit: data.unit || 'day',
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
        const q = query(
          offersRef, 
          where("clientId", "==", selectedClient.id),
          where("companyId", "==", companyInfo.id)
        );
        
        const querySnapshot = await getDocs(q);
        const offersData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const createdAt = data.createdAt ? 
            (data.createdAt instanceof Date ? 
              data.createdAt.toISOString().split('T')[0] : 
              new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0]) : 
            '';
            
          return {
            id: doc.id,
            ...data,
            createdAt
          };
        });
        
        offersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOffersHistory(offersData);
      } catch (error) {
        console.error("Error fetching offer history:", error);
      }
    };
    
    fetchOfferHistory();
  }, [selectedClient, companyInfo]);
  
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
        preferredLanguage: selectedClient.preferredLanguage || '',
        dietaryRestrictions: selectedClient.dietaryRestrictions || '',
        transportPreferences: selectedClient.transportPreferences || '',
        specialRequests: selectedClient.specialRequests || '',
        notes: selectedClient.notes || ''
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
              total += (item.price * item.quantity);
            }
          }
        });
      });
    }
    
    return total;
  };
  
  // Filter services by price
  const filteredServices = (availableServices[selectedCategory] || []).filter(service => {
    const price = parseFloat(service.price);
    return price >= appliedMinPrice && price <= appliedMaxPrice;
  });
  
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
        extras: []
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
          endDate: reservationData.checkOut
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
      
      // Validate required fields
      if (!reservationData.checkIn || !reservationData.checkOut) {
        alert('Please fill all required fields');
        return;
      }
      
      // Extract included services
      const includedServices = [];
      let hasAccommodation = false;
      let totalPaid = 0;
      
      if (services) {
        Object.entries(services).forEach(([category, items]) => {
          items.forEach(item => {
            if (item.included) {
              // Add payment information
              totalPaid += parseFloat(item.amountPaid || 0);
              
              // Add this service to the included services
              includedServices.push({
                ...item,
                startDate: item.startDate || reservationData.checkIn,
                endDate: item.endDate || reservationData.checkOut,
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
          includedServices.push({
            ...item,
            included: true,
            startDate: reservationData.checkIn,
            endDate: reservationData.checkOut,
            paymentStatus: 'unpaid',
            amountPaid: 0
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
      const totalAmount = calculateServicesTotal(services);
      let overallPaymentStatus = 'unpaid';
      
      if (totalPaid >= totalAmount) {
        overallPaymentStatus = 'paid';
      } else if (totalPaid > 0) {
        overallPaymentStatus = 'partially_paid';
      }
      
      // Save reservation to Firestore
      const reservationsRef = collection(db, "reservations");
      const docRef = await addDoc(reservationsRef, {
        clientId: selectedClient.id,
        companyId: companyInfo.id,
        offerId: offer.id,
        checkIn: reservationData.checkIn,
        checkOut: reservationData.checkOut,
        adults: parseInt(reservationData.adults) || 2,
        children: parseInt(reservationData.children) || 0,
        accommodationType: mainAccommodationType,
        notes: reservationData.notes,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        status: 'confirmed',
        baseAmount: totalAmount,
        totalAmount: totalAmount,
        totalPaid: totalPaid,
        paymentStatus: overallPaymentStatus,
        services: includedServices
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
    
    // On mobile, switch to details view when a client is selected
    if (isMobile) {
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
  const calculateItemPrice = (item) => {
    if (!item.discountValue) return item.price * item.quantity;
    
    const itemTotal = item.price * item.quantity;
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
      
      // Prepare data for update
      const updatedData = {
        ...editClientData,
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
    setEditClientData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Add service to offer
  const handleAddToOffer = (service) => {
    const existingItem = offerItems.find(item => item.id === service.id);
    
    if (existingItem) {
      setOfferItems(prev => prev.map(item => 
        item.id === service.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setOfferItems(prev => [...prev, { 
        ...service, 
        quantity: 1, 
        discountType: null,
        discountValue: 0,
        isSelected: false // For checkbox selection
      }]);
    }
  };
  
  // Remove service from offer
  const handleRemoveFromOffer = (serviceId) => {
    setOfferItems(prev => prev.filter(item => item.id !== serviceId));
  };
  
  // Update quantity in offer
  const handleQuantityChange = (serviceId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setOfferItems(prev => prev.map(item => 
      item.id === serviceId ? { ...item, quantity: newQuantity } : item
    ));
  };
  
  // Calculate subtotal (before discount)
  const calculateSubtotal = () => offerItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  
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
      const offerData = {
        clientId: selectedClient.id,
        companyId: companyInfo.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        items: offerItems, // This now includes the discountType and discountValue for each item
        totalValue: calculateTotal(),
        notes: offerNotes,
        subtotal: calculateSubtotal(),
        status: 'draft',
        createdAt: new Date(),
        createdBy: currentUser.uid
      };
      
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
  
  
  // Generate PDF for offer with enhanced luxury design
  const generateOfferPdf = async (offer) => {
    if (!offer || !companyInfo) return;
    
    
    setIsGeneratingPdf(true);
    
    try {
      // Pre-load all images that will be needed
      const imageCache = {};
      
      // Process all items to pre-fetch images
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
      
      // Add company contact information in an elegant, centered layout
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 90);
      doc.setFont("helvetica", "normal");
      
      // Contact info in a horizontal layout to appear more elegant
      const contactInfoY = 38;
      doc.text(`Tel: ${companyInfo.phone || '-'}`, 60, contactInfoY, { align: 'right' });
      doc.text(`|`, 65, contactInfoY, { align: 'center' });
      doc.text(`Email: ${companyInfo.email || '-'}`, 105, contactInfoY, { align: 'center' });
      doc.text(`|`, 145, contactInfoY, { align: 'center' });
      doc.text(`Web: ${companyInfo.website || '-'}`, 150, contactInfoY, { align: 'left' });
      
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
      // This approach works better with the luxury style and allows for images
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
        doc.rect(25, currentY + 5, 35, 35, 'F');
        
        // Try to use the actual image if available in cache
        let imageDisplayed = false;
        if (item.imageUrl && imageCache[item.imageUrl]) {
          try {
            doc.addImage(imageCache[item.imageUrl], 'JPEG', 25, currentY + 5, 35, 35, undefined, 'FAST');
            imageDisplayed = true;
          } catch (imgError) {
            console.error(`Error adding image for item ${item.id || 'unknown'}:`, imgError);
            // Will fall back to icon
          }
        }
        
        // If no image was displayed, show the icon
        if (!imageDisplayed) {
          // Display category icon
          let icon = '✦'; // Default
          if (item.category === 'villas') icon = '🏠';
          else if (item.category === 'boats') icon = '🛥️';
          else if (item.category === 'cars') icon = '🚗';
          else if (item.category === 'security') icon = '🔒';
          else if (item.category === 'nannies') icon = '👶';
          else if (item.category === 'chefs') icon = '🍽️';
          else if (item.category === 'excursions') icon = '🏔️';
          
          doc.setFontSize(16);
          doc.setTextColor(100, 100, 110);
          doc.text(icon, 42.5, currentY + 25, { align: 'center' });
        }
        
        // Service details
        doc.setFontSize(11);
        doc.setTextColor(32, 32, 64);
        doc.setFont("helvetica", "bold");
        doc.text(name, 65, currentY + 10);
        
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
        
        if (detailsText) {
          doc.text(detailsText, 65, currentY + 17);
        }
        
        // Price and quantity
        const unitInfo = item.unit ? `per ${item.unit}` : '';
        doc.setFontSize(9);
        doc.text(`€${item.price.toFixed(2)} ${unitInfo} × ${item.quantity}`, 65, currentY + 25);
        
        // Show if there's a discount
        if (item.discountValue > 0) {
          doc.setTextColor(180, 70, 70);
          const discountText = item.discountType === 'percentage' 
            ? `${item.discountValue}% discount applied` 
            : `€${item.discountValue} discount applied`;
          doc.text(discountText, 65, currentY + 32);
        }
        
        // Total for this item
        doc.setFontSize(11);
        doc.setTextColor(32, 32, 64);
        doc.setFont("helvetica", "bold");
        
        const itemTotal = item.discountValue
          ? (item.discountType === 'percentage' 
              ? (item.price * item.quantity) * (1 - item.discountValue/100) 
              : (item.price * item.quantity) - item.discountValue)
          : (item.price * item.quantity);
          
        doc.text(`€${itemTotal.toFixed(2)}`, 180, currentY + 25, { align: 'right' });
        
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
      doc.text(`€${offer.subtotal.toFixed(2)}`, 190, currentY, { align: 'right' });
      
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
        doc.text(`-€${discountAmount.toFixed(2)}`, 190, finalY, { align: 'right' });
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
      doc.text(`€${offer.totalValue.toFixed(2)}`, 190, finalY + 5, { align: 'right' });
      
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
      
      // Thank you text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(32, 32, 64);
      doc.text(`Thank you for choosing ${companyInfo.name} for your luxury experience.`, 105, footerY - 8, { align: 'center' });
      
      // Terms and contact
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 110);
      doc.text(`This offer is subject to our standard terms and conditions.`, 105, footerY - 3, { align: 'center' });
      doc.text(`For any inquiries, please contact us at ${companyInfo.phone || '-'} or ${companyInfo.email || '-'}`, 105, footerY, { align: 'center' });
      
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
      
      // For Firebase Storage URLs, use the proxy
      if (url.includes('firebasestorage.googleapis.com')) {
        const proxyUrl = `http://localhost:3000/image-proxy?url=${encodeURIComponent(url)}`;
        console.log(`Using proxy: ${proxyUrl}`);
        
        const response = await fetch(proxyUrl, {
          mode: 'cors',
          credentials: 'omit', // Important: don't send credentials
        });
        
        if (!response.ok) {
          throw new Error(`Proxy request failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      // For non-Firebase URLs
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
      
      setReservationData({ startDate: '', endDate: '', adults: 1, children: 0, accommodationType: '', transport: '', notes: '' });
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

// Function to get user details by ID
const getUserName = async (userId) => {
  if (!userId) return '-';
  
  // Check if we already have this user in cache
  if (userCache[userId]) {
    return userCache[userId];
  }
  
  try {
    setLoadingUsers(true);
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const userName = userData.displayName || userData.name || userData.email || 'User';
      
      // Update the cache
      setUserCache(prev => ({
        ...prev,
        [userId]: userName
      }));
      
      return userName;
    } else {
      console.log(`User with ID ${userId} not found`);
      return userId.slice(0, 8) + '...'; // Show truncated ID if user not found
    }
  } catch (error) {
    console.error("Error fetching user:", error);
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
  
  // Render service card based on category
  const renderServiceCard = (service) => {
    // Common image rendering function to maintain consistency across all card types
    const renderImage = (service, height = "h-48") => (
      <div className={`${height} bg-gray-50 flex items-center justify-center overflow-hidden relative`}> 
        {((service.imageUrl || (service.photos && service.photos.length > 0)) && !imageErrors[service.id]) ? (
          <img 
            src={service.imageUrl || (service.photos && service.photos[0])} 
            alt={typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name}
            className="w-full h-full object-cover absolute inset-0"
            onError={(e) => {
              console.error(`Failed to load image for ${typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name}:`, service.imageUrl || (service.photos && service.photos[0]));
              console.log("Image load error:", e);
              setImageErrors(prev => ({...prev, [service.id]: true}));
            }}
          />
        ) : (
          <div className="text-center p-4 text-sm font-medium text-gray-500 flex items-center justify-center h-full w-full">
            <div>
              <div className="text-3xl mb-2">
                {service.category === 'villas' ? '🏠' :
                 service.category === 'boats' ? '🛥️' :
                 service.category === 'cars' ? '🚗' :
                 service.category === 'security' ? '🔒' :
                 service.category === 'nannies' ? '👶' :
                 service.category === 'chefs' ? '🍽️' :
                 service.category === 'excursions' ? '🏔️' : '✨'}
              </div>
              <div>
                {typeof service.name === 'object'
                  ? getLocalizedText(service.name, language)
                  : service.name}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  
    switch (service.category) {
      case 'villas':
        return (
          <div key={service.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm h-full flex flex-col">
            {renderImage(service, "h-48")}
            <div className="p-4 flex-1 flex flex-col">
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
                    €{service.dailyPrice || service.price}
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
                    €{service.pricing?.daily || service.hourlyRate || service.price}
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
                    €{service.dailyRate || service.price}
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
                    €{service.price}
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
        <div className="flex items-center gap-4">
          {isMobile && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="bg-indigo-600 text-white border-0 rounded-md py-2 px-3 text-xs font-medium cursor-pointer"
            >
              {t.mobileMenu} ☰
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobile && showMobileMenu && (
        <div className="absolute top-full right-0 z-20 bg-white border border-gray-200 rounded-md shadow-lg w-48">
          <button 
            onClick={() => {
              setCurrentView('list');
              setShowMobileMenu(false);
            }}
            className="block w-full px-4 py-3 text-left border-b border-gray-200 bg-transparent text-sm"
          >
            {t.title}
          </button>
          {/* Client Details - Additional Information */}
{selectedClient && (
  <>
    {/* Lead Information */}
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Lead Information
      </h3>
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
          {/* Lead Status */}
          {selectedClient.leadStatus && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Lead Status</p>
              <p className="text-sm text-gray-900 capitalize">{selectedClient.leadStatus || '-'}</p>
            </div>
          )}
          
          {/* Lead Source */}
          {selectedClient.leadSource && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Lead Source</p>
              <p className="text-sm text-gray-900 capitalize">{selectedClient.leadSource || '-'}</p>
            </div>
          )}
          
          {/* Conversion Potential */}
          {selectedClient.conversionPotential && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Conversion Potential</p>
              <p className="text-sm text-gray-900 capitalize">{selectedClient.conversionPotential || '-'}</p>
            </div>
          )}
          
          {/* Assigned To */}
          {selectedClient.assignedTo && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Assigned To</p>
              <p className="text-sm text-gray-900">{selectedClient.assignedTo || '-'}</p>
            </div>
          )}
          
          {/* Follow-up Date */}
          {selectedClient.followUpDate && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Follow-up Date</p>
              <p className="text-sm text-gray-900">{selectedClient.followUpDate || '-'}</p>
            </div>
          )}
          
          {/* Is Previous Client */}
          {selectedClient.isPreviousClient !== undefined && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Previous Client</p>
              <p className="text-sm text-gray-900">{selectedClient.isPreviousClient ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* Trip Details */}
    {(selectedClient.startDate || selectedClient.endDate || selectedClient.adults || 
      selectedClient.children || selectedClient.budget || selectedClient.activities) && (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Trip Details
        </h3>
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
            {/* Trip Dates */}
            {(selectedClient.startDate || selectedClient.endDate) && (
              <div>
                <p className="text-xs text-indigo-700 font-medium mb-1">Trip Dates</p>
                <p className="text-sm text-indigo-900">
                  {selectedClient.startDate ? formatDate(selectedClient.startDate) : '-'} to {selectedClient.endDate ? formatDate(selectedClient.endDate) : '-'}
                </p>
              </div>
            )}
            
            {/* Guests */}
            {(selectedClient.adults !== undefined || selectedClient.children !== undefined) && (
              <div>
                <p className="text-xs text-indigo-700 font-medium mb-1">Guests</p>
                <p className="text-sm text-indigo-900">
                  {selectedClient.adults || 0} Adults, {selectedClient.children || 0} Children
                </p>
              </div>
            )}
            
            {/* Budget */}
            {selectedClient.budget && (
              <div>
                <p className="text-xs text-indigo-700 font-medium mb-1">Budget</p>
                <p className="text-sm text-indigo-900">€{selectedClient.budget}</p>
              </div>
            )}
            
            {/* Activities */}
            {selectedClient.activities && (
              <div className={isMobile ? '' : 'col-span-2'}>
                <p className="text-xs text-indigo-700 font-medium mb-1">Requested Activities</p>
                <p className="text-sm text-indigo-900">{selectedClient.activities}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    
    {/* Property Preferences */}
    {selectedClient.propertyTypes && (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Accommodation Preferences
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedClient.propertyTypes).map(([type, isSelected]) => 
              isSelected ? (
                <span key={type} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                  {type}
                </span>
              ) : null
            )}
            {Object.values(selectedClient.propertyTypes || {}).every(v => !v) && (
              <span className="text-sm text-gray-500">No preferences specified</span>
            )}
          </div>
        </div>
      </div>
    )}
    
    {/* Additional Contact Persons */}
    {selectedClient.contactPersons && selectedClient.contactPersons.length > 0 && (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Additional Contacts
        </h3>
        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
          {selectedClient.contactPersons.map((contact, index) => (
            <div 
              key={`contact-${index}`}
              className={`p-3 ${index < selectedClient.contactPersons.length - 1 ? 'border-b border-gray-200' : ''}`}
            >
              <div className="font-medium text-sm mb-1">{contact.name || 'Unnamed Contact'}</div>
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
  </>
)}
        </div>
      )}
      
      {/* Company Information Banner */}
      {companyInfo && (
        <div className="bg-blue-50 p-3 rounded-md mb-6 flex items-center">
          <span className="font-medium text-blue-800 mr-2">{t.companyLabel}</span>
          <span className="font-bold text-blue-900">{companyInfo.name}</span>
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
                            <input
                              type="checkbox"
                              name="isVip"
                              checked={editClientData.isVip}
                              onChange={handleEditChange}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-600">
                              {editClientData.isVip ? t.yes : t.no}
                            </span>
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
                            <option value="">-</option>
                            <option value="ro">Română</option>
                            <option value="en">English</option>
                            <option value="fr">Français</option>
                            <option value="de">Deutsch</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-800 mb-4">{t.preferences}</h3>
                      
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
    <div className={`bg-white rounded-lg shadow-xl w-full h-full ${isMobile ? 'm-0' : 'max-w-7xl max-h-full m-4'} flex flex-col`}>
      
      {/* Header */}
      <div className={`flex justify-between items-center ${isMobile ? 'p-4' : 'p-6'} border-b border-gray-200 bg-gray-50 flex-shrink-0`}>
        <div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-semibold text-gray-800`}>
            {t.createNewOffer}
          </h2>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
            {t.offerFor} {selectedClient.name}
          </p>
        </div>
        <button 
          onClick={() => setShowCreateOffer(false)}
          className={`bg-gray-100 hover:bg-gray-200 text-gray-600 border-none rounded-full ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center ${isMobile ? 'text-lg' : 'text-xl'} cursor-pointer`}
        >
          ✕
        </button>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex ${isMobile ? 'flex-col' : 'flex-row'} overflow-hidden`}>
        
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
                    className={`flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors min-w-20 ${
                      selectedCategory === category.id 
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <span className="text-xs text-center font-medium">{category.name}</span>
                    <span className="text-xs text-gray-500">
                      {availableServices[category.id]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col">
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
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <div className="font-medium">{category.name}</div>
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
          <div className={`${isMobile ? 'p-4' : 'p-6'} border-b border-gray-200 bg-white flex-shrink-0`}>
            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row'} justify-between items-${isMobile ? 'start' : 'center'}`}>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800`}>
                  {serviceCategories.find(c => c.id === selectedCategory)?.name}
                </h3>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
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
                    className={`flex items-center gap-2 ${isMobile ? 'px-3 py-2' : 'px-4 py-2'} bg-white border border-gray-300 rounded-lg ${isMobile ? 'text-xs' : 'text-sm'} hover:bg-gray-50`}
                  >
                    <span>💰</span>
                    <span>{t.filterByPrice}</span>
                    <span>{showPriceFilter ? '▲' : '▼'}</span>
                  </button>
                  
                  {showPriceFilter && (
                    <div className={`absolute ${isMobile ? 'top-full left-0 right-0' : 'top-full right-0'} mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 ${isMobile ? 'w-full' : 'w-80'}`}>
                      <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-2">{t.minPrice}</label>
                          <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
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
                            className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                            placeholder="∞"
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setMinPrice('');
                            setMaxPrice('');
                            setAppliedMinPrice(0);
                            setAppliedMaxPrice(Infinity);
                            setShowPriceFilter(false);
                          }}
                          className="py-2 px-3 bg-gray-100 text-gray-600 border-none rounded-md text-xs font-medium cursor-pointer"
                        >
                          {t.reset}
                        </button>
                        <button 
                          onClick={() => {
                            setAppliedMinPrice(minPrice === '' ? 0 : parseFloat(minPrice));
                            setAppliedMaxPrice(maxPrice === '' ? Infinity : parseFloat(maxPrice));
                            setShowPriceFilter(false);
                          }}
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

          {/* Services Grid - WIDE LANDSCAPE CARDS */}
          <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-8'}`}>
            {loadingServices ? (
              <div className="flex flex-col items-center justify-center h-full">
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
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-6xl text-gray-300 mb-4">📦</div>
                  <p className="text-gray-500 text-lg">{t.noServicesFound}</p>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1">
                  {filteredServices.map(service => (
                    <div key={service.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] w-full max-w-5xl mx-auto">
                      
                      {/* HORIZONTAL LAYOUT - Image + Content Side by Side */}
                      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
                        
                        {/* Service Image - WIDER BUT SHORTER */}
                        <div className={`${isMobile ? 'h-48' : 'w-2/5 h-64'} bg-gray-100 relative overflow-hidden flex-shrink-0`}>
                          {((service.imageUrl || (service.photos && service.photos.length > 0)) && !imageErrors[service.id]) ? (
                            <img 
                              src={service.imageUrl || (service.photos && service.photos[0])} 
                              alt={typeof service.name === 'object' ? getLocalizedText(service.name, language) : service.name}
                              className="w-full h-full object-cover"
                              onError={() => setImageErrors(prev => ({...prev, [service.id]: true}))}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
                              <div className="text-center">
                                <div className="text-6xl mb-2 opacity-60">
                                  {service.category === 'villas' ? '🏠' :
                                   service.category === 'boats' ? '🛥️' :
                                   service.category === 'cars' ? '🚗' :
                                   service.category === 'security' ? '🔒' :
                                   service.category === 'nannies' ? '👶' :
                                   service.category === 'chefs' ? '🍽️' :
                                   service.category === 'excursions' ? '🏔️' : '✨'}
                                </div>
                                <p className="text-gray-500 font-medium text-sm">No image available</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Floating Category Badge */}
                          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-700 shadow-lg">
                            {serviceCategories.find(c => c.id === selectedCategory)?.name}
                          </div>
                        </div>
                        
                        {/* Service Details - RIGHT SIDE OF IMAGE */}
                        <div className={`${isMobile ? 'p-6' : 'flex-1 p-8'} flex flex-col justify-between`}>
                          
                          {/* Top Section - Title and Details */}
                          <div>
                            <h4 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                              {typeof service.name === 'object'
                                ? getLocalizedText(service.name, language)
                                : service.name}
                            </h4>
                            
                            {/* Service-specific details - HORIZONTAL LAYOUT */}
                            {service.category === 'villas' && (
                              <div className="space-y-2 text-gray-600 mb-6">
                                {service.address && (
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">📍</span>
                                    <span className="text-base">
                                      {typeof service.address === 'object'
                                        ? getLocalizedText(service.address, language)
                                        : service.address}
                                    </span>
                                  </div>
                                )}
                                <div className="flex gap-8">
                                  {service.bedrooms && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">🛏️</span>
                                      <span className="text-base font-medium">{service.bedrooms} bedrooms</span>
                                    </div>
                                  )}
                                  {service.capacity && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">👥</span>
                                      <span className="text-base font-medium">{service.capacity} guests</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {service.category === 'cars' && (
                              <div className="space-y-2 text-gray-600 mb-6">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">🚗</span>
                                  <span className="text-base font-medium">{service.make} {service.model}</span>
                                </div>
                                {service.year && (
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">📅</span>
                                    <span className="text-base">{service.year}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {service.category === 'boats' && (
                              <div className="space-y-2 text-gray-600 mb-6">
                                <div className="flex gap-8">
                                  {service.model && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">🛥️</span>
                                      <span className="text-base font-medium">{service.model}</span>
                                    </div>
                                  )}
                                  {service.length && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">📏</span>
                                      <span className="text-base font-medium">{service.length}m</span>
                                    </div>
                                  )}
                                </div>
                                {service.capacity && (
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">👥</span>
                                    <span className="text-base">{service.capacity} guests</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Bottom Section - Price, Discount, Button in Horizontal Layout */}
                          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row gap-6'} items-end`}>
                            
                            {/* Price Section - COMPACT */}
                            <div className="flex-shrink-0">
                              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-indigo-600">
                                    €{service.dailyPrice || service.price || service.rate || 0}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    /{service.unit || 'day'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* DISCOUNT SECTION - COMPACT HORIZONTAL */}
                            <div className="flex-1">
                              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                    <span className="text-lg">💰</span>
                                    {t.discount}
                                  </h5>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const newServices = {...availableServices};
                                        const categoryServices = newServices[selectedCategory];
                                        const serviceIndex = categoryServices.findIndex(s => s.id === service.id);
                                        if (serviceIndex !== -1) {
                                          categoryServices[serviceIndex] = {
                                            ...categoryServices[serviceIndex],
                                            discountType: 'percentage',
                                            discountValue: categoryServices[serviceIndex].discountValue || 0
                                          };
                                          setAvailableServices(newServices);
                                        }
                                      }}
                                      className={`px-3 py-1 text-sm rounded-lg font-semibold ${
                                        service.discountType === 'percentage' 
                                          ? 'bg-indigo-600 text-white' 
                                          : 'bg-white text-gray-600 border border-gray-300'
                                      }`}
                                    >
                                      %
                                    </button>
                                    <button
                                      onClick={() => {
                                        const newServices = {...availableServices};
                                        const categoryServices = newServices[selectedCategory];
                                        const serviceIndex = categoryServices.findIndex(s => s.id === service.id);
                                        if (serviceIndex !== -1) {
                                          categoryServices[serviceIndex] = {
                                            ...categoryServices[serviceIndex],
                                            discountType: 'fixed',
                                            discountValue: categoryServices[serviceIndex].discountValue || 0
                                          };
                                          setAvailableServices(newServices);
                                        }
                                      }}
                                      className={`px-3 py-1 text-sm rounded-lg font-semibold ${
                                        service.discountType === 'fixed' 
                                          ? 'bg-indigo-600 text-white' 
                                          : 'bg-white text-gray-600 border border-gray-300'
                                      }`}
                                    >
                                      €
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="flex gap-3 items-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={service.discountValue || 0}
                                    onChange={(e) => {
                                      const newServices = {...availableServices};
                                      const categoryServices = newServices[selectedCategory];
                                      const serviceIndex = categoryServices.findIndex(s => s.id === service.id);
                                      if (serviceIndex !== -1) {
                                        categoryServices[serviceIndex] = {
                                          ...categoryServices[serviceIndex],
                                          discountValue: parseFloat(e.target.value) || 0
                                        };
                                        setAvailableServices(newServices);
                                      }
                                    }}
                                    className="flex-1 p-2 text-base border border-gray-300 rounded-lg"
                                    placeholder="0"
                                  />
                                  <span className="text-sm text-gray-700 font-semibold">
                                    {service.discountType === 'percentage' ? '%' : '€'}
                                  </span>
                                </div>
                                
                                {/* Show discounted price - INLINE */}
                                {service.discountValue > 0 && (
                                  <div className="mt-3 flex items-center justify-between text-sm">
                                    <span className="text-gray-500 line-through">
                                      €{service.dailyPrice || service.price || service.rate || 0}
                                    </span>
                                    <span className="text-xl font-bold text-green-600">
                                      €{service.discountType === 'percentage' 
                                        ? ((service.dailyPrice || service.price || service.rate || 0) * (1 - service.discountValue/100)).toFixed(2)
                                        : Math.max((service.dailyPrice || service.price || service.rate || 0) - service.discountValue, 0).toFixed(2)
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Add to Offer Button - COMPACT */}
                            <div className="flex-shrink-0">
                              <button 
                                onClick={() => {
                                  const originalPrice = service.dailyPrice || service.price || service.rate || 0;
                                  const discountedPrice = service.discountValue > 0 
                                    ? (service.discountType === 'percentage' 
                                        ? originalPrice * (1 - service.discountValue/100)
                                        : Math.max(originalPrice - service.discountValue, 0))
                                    : originalPrice;
                                  
                                  const existingItem = offerItems.find(item => item.id === service.id);
                                  
                                  if (existingItem) {
                                    setOfferItems(prev => prev.map(item => 
                                      item.id === service.id 
                                        ? { ...item, quantity: item.quantity + 1 } 
                                        : item
                                    ));
                                  } else {
                                    setOfferItems(prev => [...prev, { 
                                      ...service,
                                      price: discountedPrice,
                                      originalPrice: originalPrice,
                                      discountType: service.discountType || null,
                                      discountValue: service.discountValue || 0,
                                      hasDiscount: service.discountValue > 0,
                                      quantity: 1,
                                      isSelected: false
                                    }]);
                                  }
                                }}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
                              >
                                <span className="text-xl">🛒</span>
                                Add to Offer
                                {service.discountValue > 0 && (
                                  <span className="text-sm">
                                    (€{service.discountType === 'percentage' 
                                      ? ((service.dailyPrice || service.price || service.rate || 0) * (1 - service.discountValue/100)).toFixed(2)
                                      : Math.max((service.dailyPrice || service.price || service.rate || 0) - service.discountValue, 0).toFixed(2)
                                    })
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Sidebar - Current Offer (Desktop only) */}
        {!isMobile && (
          <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {t.currentOfferItems}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {offerItems.length} {offerItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            
            {/* Offer Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              {offerItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl text-gray-300 mb-2">🛒</div>
                  <p className="text-sm text-gray-500">{t.noItemsAdded}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offerItems.map(item => (
                    <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm text-gray-900 flex-1 mr-2">
                          {typeof item.name === 'object'
                            ? getLocalizedText(item.name, language)
                            : item.name}
                        </h4>
                        <button 
                          onClick={() => setOfferItems(prev => prev.filter(i => i.id !== item.id))}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                      
                      {/* Show discount info if applied */}
                      {item.hasDiscount && (
                        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Original:</span>
                            <span className="line-through text-gray-500">€{item.originalPrice}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-green-700">
                              Discount ({item.discountType === 'percentage' ? `${item.discountValue}%` : `€${item.discountValue}`}):
                            </span>
                            <span className="text-green-700">€{item.price.toFixed(2)}</span>
                          </div>
                        </div>
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
                      
                      {/* Price breakdown */}
                      <div className="text-xs text-gray-500">
                        €{item.price.toFixed(2)} × {item.quantity} = €{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Offer Summary */}
            {offerItems.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t.subtotal}:</span>
                    <span>€{offerItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>{t.discount}:</span>
                      <span>-€{(() => {
                        const subtotal = offerItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                        return discountType === 'percentage' 
                          ? (subtotal * (discountValue / 100)).toFixed(2)
                          : discountValue.toFixed(2);
                      })()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>{t.total}:</span>
                    <span>€{(() => {
                      const subtotal = offerItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                      const globalDiscountAmount = discountValue > 0 
                        ? (discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue)
                        : 0;
                      return Math.max(subtotal - globalDiscountAmount, 0).toFixed(2);
                    })()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row'} justify-between items-center ${isMobile ? 'p-4' : 'p-6'} border-t border-gray-200 bg-gray-50`}>
        
        {/* Mobile: Show offer summary */}
        {isMobile && offerItems.length > 0 && (
          <div className="w-full bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                {offerItems.length} {offerItems.length === 1 ? 'item' : 'items'}
              </span>
              <span className="font-semibold text-lg text-indigo-600">
                €{(() => {
                  const subtotal = offerItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                  const globalDiscountAmount = discountValue > 0 
                    ? (discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue)
                    : 0;
                  return Math.max(subtotal - globalDiscountAmount, 0).toFixed(2);
                })()}
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
              {offerItems.length} {offerItems.length === 1 ? 'item' : 'items'} • €{(() => {
                const subtotal = offerItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                const globalDiscountAmount = discountValue > 0 
                  ? (discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue)
                  : 0;
                return Math.max(subtotal - globalDiscountAmount, 0).toFixed(2);
              })()}
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
                    {/* Booking Overview Section */}
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
                                  amountPaid: item.discountValue ? 
                                    calculateItemPrice(item) * 0.5 : 
                                    (item.price * item.quantity) * 0.5
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
                                  amountPaid: item.discountValue ? 
                                    calculateItemPrice(item) : 
                                    (item.price * item.quantity)
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
                                        <span>€{item.price.toFixed(2)} {item.unit ? `/${item.unit}` : ''}</span>
                                        <span>× {item.quantity}</span>
                                        <span>= €{item.discountValue ? 
                                          calculateItemPrice(item).toFixed(2) : 
                                          (item.price * item.quantity).toFixed(2)}</span>
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
                                            value={item.startDate || reservationFromOffer.reservationData.checkIn}
                                            onChange={(e) => {
                                              // Update this specific item's dates
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
                                            value={item.endDate || reservationFromOffer.reservationData.checkOut}
                                            onChange={(e) => {
                                              // Update this specific item's dates
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
                                                const itemTotal = item.discountValue ? 
                                                  calculateItemPrice(item) : 
                                                  (item.price * item.quantity);
                                                  
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
                                                const itemTotal = item.discountValue ? 
                                                  calculateItemPrice(item) : 
                                                  (item.price * item.quantity);
                                                  
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
                                            value={item.amountPaid || 0}
                                            onChange={(e) => {
                                              // Update amount paid
                                              const updatedItems = {...reservationFromOffer};
                                              const itemIndex = items.findIndex(i => i.id === item.id);
                                              if (itemIndex !== -1) {
                                                const newAmount = parseFloat(e.target.value) || 0;
                                                const itemTotal = item.discountValue ? 
                                                  calculateItemPrice(item) : 
                                                  (item.price * item.quantity);
                                                  
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
                                                  amountPaid: newAmount
                                                };
                                                setReservationFromOffer(updatedItems);
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
                                          {t.of} €{item.discountValue ? 
                                            calculateItemPrice(item).toFixed(2) : 
                                            (item.price * item.quantity).toFixed(2)}
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
                      
                      <div className="w-full mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.paymentStatus}
                        </label>
                        <select
                          name="paymentStatus"
                          value={reservationFromOffer.reservationData.paymentStatus || 'unpaid'}
                          onChange={handleReservationFromOfferChange}
                          className={`
                            w-full p-2.5 border border-gray-300 rounded-md
                            text-sm bg-white
                            ${isMobile ? 'min-h-11' : ''}
                          `}
                        >
                          <option value="unpaid">{t.unpaid}</option>
                          <option value="partially_paid">{t.depositPaid}</option>
                          <option value="paid">{t.fullyPaid}</option>
                        </select>
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
                            <p className="text-sm text-gray-900">{selectedClient.email || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">{t.phone}</p>
                            <p className="text-sm text-gray-900">{selectedClient.phone || '-'}</p>
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
                              assignedUserName
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
                              {selectedClient.propertyTypes?.apartamente && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">Apartamente</span>
                              )}
                              {selectedClient.propertyTypes?.hoteluri && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">Hoteluri</span>
                              )}
                              {!selectedClient.propertyTypes?.villas && 
                              !selectedClient.propertyTypes?.apartamente && 
                              !selectedClient.propertyTypes?.hoteluri && 
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
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-4`}>
                          {offersHistory.map(offer => (
                            <div key={offer.id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <div>
                                  <div className="text-xs font-semibold text-gray-600">#{offer.id.slice(-5)}</div>
                                  <div className="text-xs text-gray-500 mt-1">{offer.createdAt}</div>
                                </div>
                                {renderOfferStatusBadge(offer.status)}
                              </div>
                              <div className="p-3">
                                <div className="flex justify-between mb-2">
                                  <span className="text-xs text-gray-500">{t.offerTotal}</span>
                                  <span className="text-sm font-medium text-gray-900">€{offer.totalValue.toFixed(2)}</span>
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
                                  <ul className="m-0 p-0 list-none text-xs">
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
                                              €{(item.discountType === 'percentage' 
                                                ? (item.price * item.quantity) * (1 - item.discountValue/100) 
                                                : (item.price * item.quantity) - item.discountValue).toFixed(2)}
                                            </span>
                                          ) : (
                                            `€${(item.price * item.quantity).toFixed(2)}`
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
                              <div className="flex justify-end gap-2 p-3 bg-gray-50 border-t border-gray-200">
                                <button 
                                  onClick={() => handleViewOfferDetails(offer)} 
                                  className="text-gray-600 hover:text-gray-900 text-xs underline py-1 px-2 bg-transparent border-none cursor-pointer"
                                >
                                  {t.viewOfferDetails}
                                </button>
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
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-center mt-4 mb-6">
                      <button 
                        onClick={handleShowCreateReservation}
                        className="bg-indigo-600 text-white font-medium py-3 px-6 rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
                      >
                        {t.createReservation}
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
                    <div className="flex flex-col gap-4">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.startDate} *
                        </label>
                        <input
                          type="date"
                          name="checkIn"
                          value={reservationFromOffer.reservationData.checkIn}
                          onChange={handleReservationFromOfferChange}
                          required
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {t.endDate} *
                        </label>
                        <input
                          type="date"
                          name="checkOut"
                          value={reservationFromOffer.reservationData.checkOut}
                          onChange={handleReservationFromOfferChange}
                          required
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
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
