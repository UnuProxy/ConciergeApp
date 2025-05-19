import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const PropertiesForSaleMobile = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const db = useDatabase();
  const navigate = useNavigate();
  
  // Language handling
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en';
  });
  
  // Translations
  const translations = {
    en: {
      title: 'Properties For Sale',
      addProperty: 'Add Property',
      all: 'All',
      villas: 'Villas',
      land: 'Land',
      noProperties: 'No properties found',
      beds: 'beds',
      baths: 'baths',
      villa: 'Villa',
      landParcel: 'Land',
      available: 'Available',
      pending: 'Pending',
      sold: 'Sold',
      underOffer: 'Under Offer',
      viewDetails: 'View Details',
      deleteConfirm: 'Are you sure you want to delete this property?'
    },
    ro: {
      title: 'Proprietăți De Vânzare',
      addProperty: 'Adaugă Proprietate',
      all: 'Toate',
      villas: 'Vile',
      land: 'Terenuri',
      noProperties: 'Nu s-au găsit proprietăți',
      beds: 'dormitoare',
      baths: 'băi',
      villa: 'Vilă',
      landParcel: 'Teren',
      available: 'Disponibil',
      pending: 'În așteptare',
      sold: 'Vândut',
      underOffer: 'Sub ofertă',
      viewDetails: 'Vezi Detalii',
      deleteConfirm: 'Sigur doriți să ștergeți această proprietate?'
    }
  };
  
  // Current translation
  const t = translations[language] || translations.en;
  
  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      if (!db?.firestore || !db?.companyId) {
        setLoading(false);
        return;
      }
      
      try {
        const propertiesRef = collection(db.firestore, 'properties');
        const q = query(propertiesRef, where('companyId', '==', db.companyId));
        const snapshot = await getDocs(q);
        
        const fetchedProperties = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.name?.[language] || data.name?.en || data.name?.ro || 'Unnamed Property',
            location: data.location || '',
            type: data.type || 'villa',
            price: parseFloat(data.pricing?.price || 0),
            size: parseFloat(data.size || 0),
            status: data.status || 'available',
            bedrooms: data.specs?.bedrooms ? parseInt(data.specs.bedrooms, 10) : 0,
            bathrooms: data.specs?.bathrooms ? parseInt(data.specs.bathrooms, 10) : 0,
            images: data.photos || []
          };
        });
        
        setProperties(fetchedProperties);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, [db, language]);
  
  // Filter properties
  const filteredProperties = activeFilter === 'all' 
    ? properties 
    : properties.filter(prop => prop.type === activeFilter);
  
  // Format price to handle millions
  const formatPrice = (price) => {
    // If price is in millions (1000000 or more)
    if (price >= 1000000) {
      const millions = price / 1000000;
      // Format with up to 3 decimal places if needed
      return millions.toLocaleString(language === 'ro' ? 'ro-RO' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
      });
    }
    // Normal formatting for smaller numbers
    return price.toLocaleString(language === 'ro' ? 'ro-RO' : 'en-US');
  };
  
  // Handle property deletion
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    
    if (window.confirm(t.deleteConfirm)) {
      try {
        await deleteDoc(doc(db.firestore, 'properties', id));
        setProperties(prev => prev.filter(property => property.id !== id));
      } catch (error) {
        console.error('Error deleting property:', error);
      }
    }
  };
  
  // Navigate to property detail page
  const goToPropertyDetail = (id) => {
    navigate(`/services/properties-for-sale/${id}`);
  };
  
  // Navigate to edit property page
  const goToEditProperty = (id, e) => {
    e.stopPropagation();
    navigate(`/services/properties-for-sale/edit/${id}`);
  };
  
  // Navigate to add property page
  const goToAddProperty = () => {
    navigate('/services/properties-for-sale/add');
  };
  
  // Get status color
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
  
  // Get status label
  const getStatusLabel = (status) => {
    switch(status.toLowerCase()) {
      case 'available':
        return t.available;
      case 'pending':
        return t.pending;
      case 'under_offer':
        return t.underOffer;
      case 'sold':
        return t.sold;
      default:
        return status;
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 pb-20">
      {/* Add Property Button */}
      <div className="p-4">
        <button
          onClick={goToAddProperty}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t.addProperty}
        </button>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 px-4">
        <div className="flex -mb-px">
          <button
            onClick={() => setActiveFilter('all')}
            className={`mr-8 py-4 ${activeFilter === 'all' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium' 
              : 'text-gray-500'
            }`}
          >
            {t.all}
          </button>
          <button
            onClick={() => setActiveFilter('villa')}
            className={`mr-8 py-4 ${activeFilter === 'villa' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium' 
              : 'text-gray-500'
            }`}
          >
            {t.villas}
          </button>
          <button
            onClick={() => setActiveFilter('land')}
            className={`py-4 ${activeFilter === 'land' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium' 
              : 'text-gray-500'
            }`}
          >
            {t.land}
          </button>
        </div>
      </div>
      
      {/* Property Cards */}
      {filteredProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-gray-500 mb-4">{t.noProperties}</p>
          <button
            onClick={goToAddProperty}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md"
          >
            {t.addProperty}
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {filteredProperties.map(property => (
            <div
              key={property.id}
              onClick={() => goToPropertyDetail(property.id)}
              className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer"
            >
              {/* Property Image */}
              <div className="relative h-48">
                {property.images && property.images.length > 0 ? (
                  <img 
                    src={property.images[0]} 
                    alt={property.title} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-3 left-3 text-indigo-600 font-semibold">
                  {property.type === 'villa' ? t.villa : t.landParcel}
                </div>
                
                {/* Status Badge */}
                <div className={`absolute top-3 right-3 ${getStatusColor(property.status)} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                  {getStatusLabel(property.status)}
                </div>
              </div>
              
              {/* Property Info */}
              <div className="p-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{property.title}</h2>
                
                <div className="flex items-center text-gray-600 mb-4">
                  <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-600">{property.location}</span>
                </div>
                
                <div className="border-t border-gray-100 my-4"></div>
                
                <div className="flex justify-between items-center mb-4">
                  {/* Price */}
                  <div className="text-indigo-600 text-2xl font-bold flex items-center">
                    <span className="mr-1">€</span>
                    {formatPrice(property.price)}
                  </div>
                  
                  {/* Size */}
                  <div className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 text-indigo-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <span>{property.size} m<sup>2</sup></span>
                  </div>
                </div>
                
                {/* Beds and Baths */}
                {property.type === 'villa' && (
                  <div className="flex mb-4">
                    <div className="flex items-center mr-6 text-gray-700">
                      <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      <span>{property.bedrooms} {t.beds}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>{property.bathrooms} {t.baths}</span>
                    </div>
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={(e) => goToEditProperty(property.id, e)}
                    className="p-4 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center"
                    aria-label="Edit"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(property.id, e)}
                    className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertiesForSaleMobile;