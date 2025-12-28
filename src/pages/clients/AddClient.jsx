import React, { useState, useEffect, useRef } from 'react';
import { 
  getFirestore, 
  collection, 
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useDatabase } from "../../context/DatabaseContext";
import { getCurrentLanguage } from "../../utils/languageHelper"; // Import the language helper

// Initialize Firebase
const db = getFirestore();
const auth = getAuth();

// Translation dictionary
const translations = {
  en: {
    title: 'Add Potential Client',
    clientInfo: 'Client Information',
    leadSource: 'Lead Source',
    leadStatus: 'Lead Status',
    assignedTo: 'Assigned To',
    followUpDate: 'Follow-up Date',
    conversionPotential: 'Conversion Potential',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    additionalDetails: 'Additional Details',
    address: 'Address',
    nationality: 'Nationality',
    preferredLanguage: 'Preferred Language',
    clientType: 'Client Type',
    vipClient: 'VIP Client',
    regularClient: 'Normal Client',
    selectLanguage: 'Select Language',
    selectOption: 'Select...',
    notes: 'Notes',
    notesPlaceholder: 'Any additional details or special requests...',
    contactPersons: 'Contact Persons',
    contactName: 'Contact Name',
    contactEmail: 'Contact Email',
    contactPhone: 'Contact Phone',
    addContact: 'Add Contact Person',
    removeContact: 'Remove Contact',
    saveClient: 'Save Client',
    website: 'Website',
    referral: 'Referral',
    socialMedia: 'Social Media',
    directContact: 'Direct Contact',
    other: 'Other',
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    negotiation: 'Negotiation',
    lost: 'Lost',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    veryHigh: 'Very High',
    saving: 'Saving...',
    errorSaving: 'Error saving client. Please try again.',
    successSaving: 'Client saved successfully!',
    companyLabel: 'Adding client to company:',
    loading: 'Loading...',
    loadingTeamMembers: 'Loading team members...',
    noTeamMembers: 'No team members found.',
    errorLoadingTeamMembers: 'Error loading team members.',
    noCompanyAccess: 'You do not have access to any company. Please contact an administrator.',
    interests: 'Interests',
    budget: 'Budget Range (€)',
    travelDates: 'Potential Travel Dates',
    startDate: 'Start Date',
    endDate: 'End Date',
    propertyTypes: 'Property Types of Interest',
    villas: 'Villas',
    apartments: 'Apartments',
    hotels: 'Hotels',
    activities: 'Activities of Interest',
    activityPlaceholder: 'e.g., boat trips, guided tours, chef services...',
    groupSize: 'Group Size',
    adults: 'Adults',
    children: 'Children',
    previousClient: 'Previous Client',
    yes: 'Yes',
    no: 'No',
    leadInfo: 'Lead Information' // Added missing translation
  },
  ro: {
    title: 'Adaugă Client Potențial',
    clientInfo: 'Informații Client',
    leadSource: 'Sursa Potențialului Client',
    leadStatus: 'Stadiul Potențialului Client',
    assignedTo: 'Responsabil',
    followUpDate: 'Data Recontactării',
    conversionPotential: 'Potențial de Conversie',
    name: 'Nume',
    email: 'Adresă de Email',
    phone: 'Număr de Telefon',
    additionalDetails: 'Detalii Suplimentare',
    address: 'Adresă',
    nationality: 'Naționalitate',
    preferredLanguage: 'Limba Preferată',
    clientType: 'Tip client',
    vipClient: 'Client VIP',
    regularClient: 'Client obișnuit',
    selectLanguage: 'Selectează Limba',
    selectOption: 'Selectează...',
    notes: 'Observații',
    notesPlaceholder: 'Orice detalii suplimentare sau cereri speciale...',
    contactPersons: 'Persoane de Contact',
    contactName: 'Numele Persoanei de Contact',
    contactEmail: 'Adresa de Email a Contactului',
    contactPhone: 'Numărul de Telefon al Contactului',
    addContact: 'Adaugă Persoană de Contact',
    removeContact: 'Elimină Persoana de Contact',
    saveClient: 'Salvează Clientul',
    website: 'Site Web',
    referral: 'Recomandare',
    socialMedia: 'Rețele Sociale',
    directContact: 'Contact Direct',
    other: 'Altele',
    new: 'Nou',
    contacted: 'Contactat',
    qualified: 'Calificat',
    negotiation: 'În Negociere',
    lost: 'Pierdut',
    low: 'Scăzut',
    medium: 'Mediu',
    high: 'Ridicat',
    veryHigh: 'Foarte Ridicat',
    saving: 'Se salvează...',
    errorSaving: 'Eroare la salvarea clientului. Vă rugăm să încercați din nou.',
    successSaving: 'Clientul a fost salvat cu succes!',
    companyLabel: 'Adăugare client la compania:',
    loading: 'Se încarcă...',
    loadingTeamMembers: 'Se încarcă membrii echipei...',
    noTeamMembers: 'Nu s-au găsit membri ai echipei.',
    errorLoadingTeamMembers: 'Eroare la încărcarea membrilor echipei.',
    noCompanyAccess: 'Nu aveți acces la nicio companie. Vă rugăm să contactați un administrator.',
    interests: 'Interese',
    budget: 'Buget Estimativ (€)',
    travelDates: 'Date Potențiale de Călătorie',
    startDate: 'Data de Început',
    endDate: 'Data de Sfârșit',
    propertyTypes: 'Tipuri de Proprietăți de Interes',
    villas: 'Vile',
    apartments: 'Apartamente',
    hotels: 'Hoteluri',
    activities: 'Activități de Interes',
    activityPlaceholder: 'ex., excursii cu barca, tururi ghidate, servicii de bucătar...',
    groupSize: 'Mărimea Grupului',
    adults: 'Adulți',
    children: 'Copii',
    previousClient: 'Client Anterior',
    yes: 'Da',
    no: 'Nu',
    leadInfo: 'Informații Lead' // Added missing translation
  }
};

function AddClient() {
  // Get the language from localStorage (via helper) instead of using local state
  const [language, setLanguage] = useState(getCurrentLanguage);
  const t = translations[language]; // Translation function
  
  // Add event listener to update the language when it changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(getCurrentLanguage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // States for saving and feedback
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  
  // State for team members
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [teamMembersError, setTeamMembersError] = useState(null);
  
  // Get database context
  const { currentUser, companyInfo, loading: contextLoading, error: contextError } = useDatabase();

  // Client data
  const [clientData, setClientData] = useState({
    // Basic information
    name: '',
    email: '',
    phone: '',
    address: '',
    nationality: '',
    preferredLanguage: '',
    clientType: 'regular',
    assignedToName: '',
    isVip: false,
    
    // Lead information
    leadSource: '',
    leadStatus: 'new',
    assignedTo: '',
    followUpDate: '',
    conversionPotential: 'medium',
    
    // Additional information
    notes: '',
    
    // Interest information
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
    
    // Contact persons
    contactPersons: [{ name: '', email: '', phone: '' }],
  });

  // Fetch team members when the component loads
  useEffect(() => {
    if (companyInfo) {
      fetchTeamMembers();
    }
  }, [companyInfo]);

  // Function to fetch team members from database
  const fetchTeamMembers = async () => {
    setLoadingTeamMembers(true);
    setTeamMembersError(null);
    
    try {
      // Only list teammates from the same company to avoid cross-company assignment
      if (!companyInfo?.id) {
        setTeamMembers([]);
        return;
      }

      const companyFilter = where('companyId', '==', companyInfo.id);

      // Try to fetch from authorized_users collection
      let usersRef = collection(db, "authorized_users");
      let querySnapshot = await getDocs(query(usersRef, companyFilter));
      
      // If no results, try the users collection
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
          name: displayName || userData.email || 'Team member',
          email: userData.email || '',
          role: userData.role || ''
        });
      });
      
      console.log("Fetched team members:", members.length);
      setTeamMembers(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      setTeamMembersError(t.errorLoadingTeamMembers);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  // Function to handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setClientData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Function to handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    const [category, item] = name.split('.');
    
    setClientData((prevData) => ({
      ...prevData,
      [category]: {
        ...prevData[category],
        [item]: checked
      }
    }));
  };

  // Function to handle radio button changes
  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    const boolValue = value === 'true';
    
    setClientData(prevData => ({
      ...prevData,
      [name]: boolValue
    }));
  };

  // Function to handle changes in contact persons
  const handleContactChange = (index, e) => {
    const { name, value } = e.target;
    const newContacts = [...clientData.contactPersons];
    newContacts[index][name] = value;
    setClientData((prevData) => ({ ...prevData, contactPersons: newContacts }));
  };

  // Function to add a new contact person
  const addContactPerson = () => {
    setClientData((prevData) => ({
      ...prevData,
      contactPersons: [...prevData.contactPersons, { name: '', email: '', phone: '' }],
    }));
  };

  // Function to remove a contact person
  const removeContactPerson = (index) => {
    const newContacts = clientData.contactPersons.filter((_, i) => i !== index);
    setClientData((prevData) => ({ ...prevData, contactPersons: newContacts }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if company information is available
    if (!companyInfo) {
      setError("Company information not available. Please reload the page.");
      return;
    }
    
    // Check if user is authenticated
    if (!currentUser) {
      setError("You must be logged in to add clients.");
      return;
    }
    
    console.log("Starting client save...");
    console.log("Company info:", companyInfo);
    
    // Start saving process
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Prepare client data with necessary fields
      const selectedAssignee = teamMembers.find(member => member.id === clientData.assignedTo);
      const clientToSave = {
        ...clientData,
        type: 'lead', // Always 'lead' since we're only adding potential clients
        clientType: clientData.clientType || 'regular',
        isVip: clientData.clientType === 'vip',
        assignedToName: selectedAssignee?.name || '',
        companyId: companyInfo.id,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        status: 'active', // Default status for new clients
      };
      
      console.log("Client data to save:", clientToSave);
      
      // Add to Firestore clients collection
      const clientsRef = collection(db, "clients");
      const docRef = await addDoc(clientsRef, clientToSave);
      
      console.log("Client saved successfully with ID:", docRef.id);
      
      // Reset form
      setClientData({
        name: '',
        email: '',
        phone: '',
        address: '',
        nationality: '',
        preferredLanguage: '',
        clientType: 'regular',
        assignedToName: '',
        isVip: false,
        leadSource: '',
        leadStatus: 'new',
        assignedTo: '',
        followUpDate: '',
        conversionPotential: 'medium',
        notes: '',
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
        contactPersons: [{ name: '', email: '', phone: '' }],
      });
      
      // Show success message
      setSuccess(true);
      // Show floating toast feedback
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      setToast({ type: 'success', message: t.successSaving });
      toastTimerRef.current = setTimeout(() => setToast(null), 4000);
      
      // Reset success after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error("Error saving client:", error);
      setError(t.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 font-sans">
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white shadow-lg border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700">
            ✓
          </span>
          <div className="font-medium">{toast.message}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-emerald-600 hover:text-emerald-800"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6 text-gray-800">{t.title}</h1>
      
      {/* Loading indicator */}
      {contextLoading && (
        <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-600 mb-6">
          {t.loading}
        </div>
      )}
      
      {/* Error messages */}
      {(error || contextError) && (
        <div className="bg-rose-50 text-rose-600 p-3 rounded-md mb-6">
          {error || contextError}
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md mb-6">
          {t.successSaving}
        </div>
      )}
      
      {/* Company Information Banner */}
      {companyInfo && (
        <div className="bg-gray-100 p-3 rounded-md mb-6 flex items-center">
          <span className="font-medium text-gray-600 mr-2">{t.companyLabel}</span>
          <span className="font-bold text-gray-800">{companyInfo.name}</span>
        </div>
      )}
      
      {/* No company access message */}
      {!contextLoading && !companyInfo && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-md mb-6 text-center">
          {t.noCompanyAccess}
        </div>
      )}
      
      {/* Only show form when not loading and company info is available */}
      {!contextLoading && companyInfo && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            {/* Basic Client Information */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-600">{t.clientInfo}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.name}:</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={clientData.name} 
                    onChange={handleChange} 
                    required 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.email}:</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={clientData.email} 
                    onChange={handleChange} 
                    required 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.phone}:</label>
                  <input 
                    type="text" 
                    name="phone" 
                    value={clientData.phone} 
                    onChange={handleChange} 
                    required 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.address}:</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={clientData.address} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.nationality}:</label>
                  <input 
                    type="text" 
                    name="nationality" 
                    value={clientData.nationality} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.preferredLanguage}:</label>
                  <select 
                    name="preferredLanguage" 
                    value={clientData.preferredLanguage} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base"
                  >
                    <option value="">{t.selectOption}</option>
                    <option value="Russian">{language === 'ro' ? 'Rusă' : 'Russian'}</option>
                    <option value="English">English</option>
                    <option value="Romanian">Română</option>
                    <option value="Spanish">Español</option>
                    <option value="French">Français</option>
                    <option value="German">Deutsch</option>
                    <option value="Italian">Italiano</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.clientType}:</label>
                  <select
                    name="clientType"
                    value={clientData.clientType}
                    onChange={handleChange}
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base"
                  >
                    <option value="vip">{t.vipClient}</option>
                    <option value="regular">{t.regularClient}</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Lead Information */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-600">{t.leadInfo}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.leadSource}:</label>
                  <select 
                    name="leadSource" 
                    value={clientData.leadSource} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base"
                  >
                    <option value="">{t.selectOption}</option>
                    <option value="website">{t.website}</option>
                    <option value="referral">{t.referral}</option>
                    <option value="socialMedia">{t.socialMedia}</option>
                    <option value="directContact">{t.directContact}</option>
                    <option value="other">{t.other}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.leadStatus}:</label>
                  <select 
                    name="leadStatus" 
                    value={clientData.leadStatus} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base"
                  >
                    <option value="new">{t.new}</option>
                    <option value="contacted">{t.contacted}</option>
                    <option value="qualified">{t.qualified}</option>
                    <option value="negotiation">{t.negotiation}</option>
                    <option value="lost">{t.lost}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.assignedTo}:</label>
                  <select 
                    name="assignedTo" 
                    value={clientData.assignedTo} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base"
                    disabled={loadingTeamMembers}
                  >
                    <option value="">{t.selectOption}</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name || member.email || member.id}</option>
                    ))}
                  </select>
                  
                  {/* Loading message */}
                  {loadingTeamMembers && (
                    <div className="text-sm text-gray-500 mt-1">
                      {t.loadingTeamMembers}
                    </div>
                  )}
                  
                  {/* Error message */}
                  {teamMembersError && (
                    <div className="text-sm text-rose-500 mt-1">
                      {teamMembersError}
                    </div>
                  )}
                  
                  {/* No team members message */}
                  {!loadingTeamMembers && !teamMembersError && teamMembers.length === 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      {t.noTeamMembers}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.followUpDate}:</label>
                  <input 
                    type="date" 
                    name="followUpDate" 
                    value={clientData.followUpDate} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.conversionPotential}:</label>
                  <select 
                    name="conversionPotential" 
                    value={clientData.conversionPotential} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base"
                  >
                    <option value="low">{t.low}</option>
                    <option value="medium">{t.medium}</option>
                    <option value="high">{t.high}</option>
                    <option value="veryHigh">{t.veryHigh}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.previousClient}:</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isPreviousClient"
                        value="true"
                        checked={clientData.isPreviousClient === true}
                        onChange={handleRadioChange}
                        className="mr-1.5"
                      />
                      {t.yes}
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isPreviousClient"
                        value="false"
                        checked={clientData.isPreviousClient === false}
                        onChange={handleRadioChange}
                        className="mr-1.5"
                      />
                      {t.no}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Interest Information */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-600">{t.interests}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.budget}:</label>
                  <input 
                    type="text" 
                    name="budget" 
                    value={clientData.budget} 
                    onChange={handleChange} 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block mb-1.5 font-medium text-gray-600">{t.travelDates}:</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">{t.startDate}:</label>
                      <input 
                        type="date" 
                        name="startDate" 
                        value={clientData.startDate} 
                        onChange={handleChange} 
                        className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">{t.endDate}:</label>
                      <input 
                        type="date" 
                        name="endDate" 
                        value={clientData.endDate} 
                        onChange={handleChange} 
                        className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.propertyTypes}:</label>
                  <div className="space-y-2 mt-1">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="propertyTypes.villas"
                        checked={clientData.propertyTypes.villas}
                        onChange={handleCheckboxChange}
                        className="mr-2"
                      />
                      {t.villas}
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="propertyTypes.apartments"
                        checked={clientData.propertyTypes.apartments}
                        onChange={handleCheckboxChange}
                        className="mr-2"
                      />
                      {t.apartments}
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="propertyTypes.hotels"
                        checked={clientData.propertyTypes.hotels}
                        onChange={handleCheckboxChange}
                        className="mr-2"
                      />
                      {t.hotels}
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.activities}:</label>
                  <textarea
                    name="activities"
                    value={clientData.activities}
                    onChange={handleChange}
                    placeholder={t.activityPlaceholder}
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base resize-y h-24"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block mb-1.5 font-medium text-gray-600">{t.groupSize}:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">{t.adults}:</label>
                      <input 
                        type="number" 
                        min="1" 
                        name="adults" 
                        value={clientData.adults} 
                        onChange={handleChange} 
                        className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">{t.children}:</label>
                      <input 
                        type="number" 
                        min="0" 
                        name="children" 
                        value={clientData.children} 
                        onChange={handleChange} 
                        className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Notes */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-600">{t.notes}</h3>
              <textarea
                name="notes"
                value={clientData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base resize-y"
                placeholder={t.notesPlaceholder}>
              </textarea>
            </div>
            
            {/* Contact Persons */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-600">{t.contactPersons}</h3>
              {clientData.contactPersons.map((contact, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-md mb-4 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-1.5 font-medium text-gray-600">{t.contactName}:</label>
                      <input 
                        type="text" 
                        name="name" 
                        value={contact.name} 
                        onChange={(e) => handleContactChange(index, e)} 
                        className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5 font-medium text-gray-600">{t.contactEmail}:</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={contact.email} 
                        onChange={(e) => handleContactChange(index, e)} 
                        className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5 font-medium text-gray-600">{t.contactPhone}:</label>
                      <input 
                        type="text" 
                        name="phone" 
                        value={contact.phone} 
                        onChange={(e) => handleContactChange(index, e)} 
                        className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-base" 
                      />
                    </div>
                  </div>
                  {clientData.contactPersons.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeContactPerson(index)} 
                      className="mt-3 py-2 px-4 bg-rose-500 text-white border-none rounded-md cursor-pointer font-medium transition-colors hover:bg-rose-600"
                    >
                      {t.removeContact}
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button" 
                onClick={addContactPerson} 
                className="py-2 px-4 btn-success border-none rounded-md cursor-pointer font-medium transition-colors hover:bg-emerald-600"
              >
                {t.addContact}
              </button>
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit" 
              className={`py-3 px-6 bg-indigo-600 text-white border-none rounded-md font-bold text-base transition-colors mt-4 hover:bg-indigo-700 ${saving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={saving}
            >
              {saving ? t.saving : t.saveClient}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default AddClient;
