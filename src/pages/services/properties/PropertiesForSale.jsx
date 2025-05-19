import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { 
  collection, query, where, getDocs, doc, deleteDoc 
} from 'firebase/firestore';

const PropertiesForSale = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState(null);
  const db = useDatabase();
  
  // Get language from localStorage or use default (English)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en';
  });
  
  // Listen for language changes
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
  
  // Translations
  const translations = {
    ro: {
      propertiesForSale: 'Proprietăți De Vânzare',
      addProperty: 'Adaugă Proprietate',
      allProperties: 'Toate Proprietățile',
      villas: 'Vile',
      landParcels: 'Terenuri',
      noPropertiesFound: 'Nu s-au găsit proprietăți',
      addYourFirstProperty: 'Adaugă prima proprietate',
      viewDetails: 'Vezi Detalii',
      beds: 'Dormitoare',
      baths: 'Băi',
      villa: 'Vilă',
      landParcel: 'Teren',
      confirmDeleteProperty: 'Sigur doriți să ștergeți această proprietate?',
      size: 'Suprafață',
      location: 'Locație'
    },
    en: {
      propertiesForSale: 'Properties For Sale',
      addProperty: 'Add Property',
      allProperties: 'All Properties',
      villas: 'Villas',
      landParcels: 'Land Parcels',
      noPropertiesFound: 'No properties found',
      addYourFirstProperty: 'Add your first property',
      viewDetails: 'View Details',
      beds: 'Beds',
      baths: 'Baths',
      villa: 'Villa',
      landParcel: 'Land Parcel',
      confirmDeleteProperty: 'Are you sure you want to delete this property?',
      size: 'Size',
      location: 'Location'
    }
  };
  
  // Current translation
  const t = translations[language];
  
  // Fetch properties from Firestore
  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        
        if (!db) {
          console.error("Database context not available");
          setLoading(false);
          return;
        }
        
        const companyId = db.companyId;
        
        if (!companyId) {
          console.error("No company ID found");
          setLoading(false);
          return;
        }
        
        const propertiesCollection = collection(db.firestore, 'properties');
        const q = query(propertiesCollection, where('companyId', '==', companyId));
        const snapshot = await getDocs(q);
        
        const fetchedProperties = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.name?.en || data.name?.ro || 'Unnamed Property',
            location: data.location || '',
            type: data.type || 'villa',
            price: parseFloat(data.pricing?.price || 0),
            size: parseFloat(data.size || 0),
            status: data.status || 'available',
            bedrooms: data.specs?.bedrooms ? parseInt(data.specs.bedrooms, 10) : null,
            bathrooms: data.specs?.bathrooms ? parseInt(data.specs.bathrooms, 10) : null,
            images: data.photos || []
          };
        });
        
        setProperties(fetchedProperties);
      } catch (error) {
        console.error("Error loading properties:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProperties();
  }, [db]);
  
  const filteredProperties = filter === 'all' 
    ? properties 
    : properties.filter(prop => prop.type === filter);
  
  const handleDeleteProperty = async (id) => {
    if (window.confirm(t.confirmDeleteProperty)) {
      try {
        if (!db) {
          console.error("Database context not available");
          return;
        }
        
        const docRef = doc(db.firestore, 'properties', id);
        await deleteDoc(docRef);
        
        setProperties(properties.filter(prop => prop.id !== id));
      } catch (error) {
        console.error("Error deleting property:", error);
      }
    }
  };
  
  // Function to get status color
  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'available':
        return 'bg-green-500';
      case 'pending':
      case 'under_offer':
        return 'bg-yellow-500';
      case 'sold':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  // Format price to handle millions
  const formatPrice = (price) => {
    return price?.toLocaleString();
  };
  
  // Simulate links for demo, replace with your actual router if needed
  const Link = ({ to, children, className }) => (
    <a href={to} className={className}>
      {children}
    </a>
  );
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
          <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-indigo-300 animate-spin absolute top-4 left-4"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gray-50 rounded-xl">
      {/* Header with add button - fixed for mobile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center">
          <svg className="mr-2 text-indigo-600 w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {t.propertiesForSale}
        </h1>
        <Link 
          to="/services/properties-for-sale/add" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 py-2 rounded-md font-medium flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-px"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t.addProperty}
        </Link>
      </div>
      
      {/* Filter tabs - scrollable on mobile */}
      <div className="flex overflow-x-auto pb-2 border-b border-gray-200 no-scrollbar">
        <button 
          className={`px-4 sm:px-6 py-3 font-medium transition-all duration-200 whitespace-nowrap ${filter === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setFilter('all')}
        >
          <svg className="inline-block mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {t.allProperties}
        </button>
        <button 
          className={`px-4 sm:px-6 py-3 font-medium transition-all duration-200 whitespace-nowrap ${filter === 'villa' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setFilter('villa')}
        >
          <svg className="inline-block mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {t.villas}
        </button>
        <button 
          className={`px-4 sm:px-6 py-3 font-medium transition-all duration-200 whitespace-nowrap ${filter === 'land' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setFilter('land')}
        >
          <svg className="inline-block mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          {t.landParcels}
        </button>
      </div>
      
      {/* Property grid */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg shadow-inner">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg mb-2">{t.noPropertiesFound}</p>
          <Link to="/services/properties-for-sale/add" className="mt-4 inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            {t.addYourFirstProperty}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProperties.map(property => (
            <div 
              key={property.id} 
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              onMouseEnter={() => setHoveredCard(property.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="h-48 overflow-hidden relative">
                {property.images && property.images.length > 0 ? (
                  <img 
                    src={property.images[0]} 
                    alt={property.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className={`absolute top-3 right-3 ${getStatusColor(property.status)} text-white px-3 py-1 rounded-full text-xs font-bold shadow-md`}>
                  {property.status}
                </div>
                <div className="absolute top-3 left-3 bg-white text-indigo-600 px-3 py-1 rounded-full text-xs font-bold shadow-md uppercase flex items-center">
                  {property.type === 'villa' ? (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg> 
                      {t.villa}
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg> 
                      {t.landParcel}
                    </>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-lg sm:text-xl mb-2 text-gray-800 truncate">{property.title}</h3>
                
                <div className="flex items-center mb-3 text-gray-600">
                  <svg className="w-4 h-4 text-indigo-500 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm truncate">{property.location}</p>
                </div>
                
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                  <span className="font-bold text-lg sm:text-xl text-indigo-600 flex items-center">
                    <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="truncate">{formatPrice(property.price)}</span>
                  </span>
                  <span className="text-sm text-gray-600 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    {property.size} m²
                  </span>
                </div>
                
                {property.type === 'villa' && (
                  <div className="flex space-x-4 sm:space-x-6 text-sm text-gray-700 mb-4">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 sm:mr-2 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      <span>
                        <span className="font-semibold">{property.bedrooms}</span> {t.beds}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 sm:mr-2 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>
                        <span className="font-semibold">{property.bathrooms}</span> {t.baths}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                  <Link 
                    to={`/services/properties-for-sale/${property.id}`}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-center font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {t.viewDetails}
                  </Link>
                  
                  <div className="flex space-x-1 justify-end sm:justify-start">
                    <Link 
                      to={`/services/properties-for-sale/edit/${property.id}`}
                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 flex items-center justify-center"
                      title="Edit property"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </Link>
                    <button 
                      onClick={() => handleDeleteProperty(property.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-200 flex items-center justify-center"
                      title="Delete property"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertiesForSale;