import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDatabase } from '../../../context/DatabaseContext';
import { 
  doc, getDoc, deleteDoc, 
  collection, query, where, getDocs 
} from 'firebase/firestore';

function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const db = useDatabase();
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Direct language handling
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en';
  });
  
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
  
  // Translations object
  const translations = {
    ro: {
      error: 'Eroare',
      propertyNotFound: 'Proprietatea nu a fost găsită',
      backToProperties: 'Înapoi la Proprietăți',
      errorLoadingProperty: 'Eroare la încărcarea proprietății. Încercați din nou.',
      edit: 'Editează',
      delete: 'Șterge',
      description: 'Descriere',
      noDescriptionAvailable: 'Nicio descriere disponibilă',
      documents: 'Documente',
      document: 'Document',
      amenities: 'Facilități',
      propertyType: 'Tipul Proprietății',
      villa: 'Vilă',
      landParcel: 'Teren',
      status: 'Status',
      available: 'Disponibilă',
      underOffer: 'Ofertă în Curs',
      sold: 'Vândută',
      totalSize: 'Suprafața Totală',
      bedrooms: 'Dormitoare',
      bathrooms: 'Băi',
      yearBuilt: 'Anul Construcției',
      zoning: 'Zonare',
      buildableArea: 'Suprafață Construibilă',
      terrain: 'Tip Teren',
      contactAboutProperty: 'Contactează despre Proprietate',
      scheduleViewing: 'Programează o Vizionare',
      shareProperty: 'Distribuie Proprietatea',
      confirmDeleteProperty: 'Sigur doriți să ștergeți această proprietate?',
      errorDeletingProperty: 'Eroare la ștergerea proprietății. Încercați din nou.'
    },
    en: {
      error: 'Error',
      propertyNotFound: 'Property not found',
      backToProperties: 'Back to Properties',
      errorLoadingProperty: 'Error loading property. Please try again.',
      edit: 'Edit',
      delete: 'Delete',
      description: 'Description',
      noDescriptionAvailable: 'No description available',
      documents: 'Documents',
      document: 'Document',
      amenities: 'Amenities',
      propertyType: 'Property Type',
      villa: 'Villa',
      landParcel: 'Land Parcel',
      status: 'Status',
      available: 'Available',
      underOffer: 'Under Offer',
      sold: 'Sold',
      totalSize: 'Total Size',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      yearBuilt: 'Year Built',
      zoning: 'Zoning',
      buildableArea: 'Buildable Area',
      terrain: 'Terrain',
      contactAboutProperty: 'Contact About Property',
      scheduleViewing: 'Schedule Viewing',
      shareProperty: 'Share Property',
      confirmDeleteProperty: 'Are you sure you want to delete this property?',
      errorDeletingProperty: 'Error deleting property. Please try again.'
    }
  };
  
  // Current translations
  const t = translations[language];
  
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        
        if (!db) {
          console.error("Database context not available");
          setError("Database connection error");
          setLoading(false);
          return;
        }
        
        // Use Firebase v9 syntax directly
        const docRef = doc(db.firestore, 'properties', id);
        const propertyDoc = await getDoc(docRef);
        
        if (propertyDoc.exists()) {
          const data = propertyDoc.data();
          
          // Convert Firestore document to display format
          setProperty({
            id: propertyDoc.id,
            title: data.name?.en || data.name?.ro || 'Unnamed Property',
            location: data.location || '',
            type: data.type || 'villa',
            price: parseFloat(data.pricing?.price || 0),
            size: parseFloat(data.size || 0),
            status: data.status || 'available',
            description: data.description?.en || data.description?.ro || '',
            images: data.photos || [],
            documents: data.documents || [],
            
            // Villa-specific fields
            bedrooms: data.specs?.bedrooms ? parseInt(data.specs.bedrooms, 10) : null,
            bathrooms: data.specs?.bathrooms ? parseInt(data.specs.bathrooms, 10) : null,
            yearBuilt: data.specs?.year ? parseInt(data.specs.year, 10) : null,
            
            // Convert boolean map to array for amenities
            amenities: Object.keys(data.amenities || {}).filter(key => data.amenities[key] === true),
            
            // Land-specific fields
            zoning: data.specs?.zoning || '',
            buildableArea: data.specs?.buildableArea ? parseFloat(data.specs.buildableArea) : null,
            terrain: data.specs?.terrain || '',
            
            // Timestamps
            createdAt: data.createdAt?.toDate?.(),
            updatedAt: data.updatedAt?.toDate?.()
          });
        } else {
          setError(t.propertyNotFound);
        }
      } catch (err) {
        console.error("Error fetching property:", err);
        setError(t.errorLoadingProperty);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperty();
  }, [id, t.propertyNotFound, t.errorLoadingProperty, db]);
  
  const handleDelete = async () => {
    if (window.confirm(t.confirmDeleteProperty)) {
      try {
        if (!db) {
          console.error("Database context not available");
          alert("Database connection error");
          return;
        }
        
        // Delete the property document
        const docRef = doc(db.firestore, 'properties', id);
        await deleteDoc(docRef);
        
        // Redirect back to the list
        navigate('/services/properties-for-sale');
      } catch (err) {
        console.error("Error deleting property:", err);
        alert(t.errorDeletingProperty);
      }
    }
  };
  
  // Format price to handle millions properly
  const formatPrice = (price) => {
    if (!price) return '';
    return price.toLocaleString();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (error || !property) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">{t.error}</h2>
        <p>{error || t.propertyNotFound}</p>
        <Link to="/services/properties-for-sale" className="mt-4 inline-block text-indigo-600 hover:underline">
          {t.backToProperties}
        </Link>
      </div>
    );
  }
  
  // Get amenity names from translation
  const getAmenityName = (amenityId) => {
    const amenityMap = {
      pool: language === 'ro' ? 'Piscină' : 'Swimming Pool',
      garden: language === 'ro' ? 'Grădină' : 'Garden',
      parking: language === 'ro' ? 'Parcare' : 'Parking',
      seaView: language === 'ro' ? 'Vedere la Mare' : 'Sea View',
      airConditioning: language === 'ro' ? 'Aer Condiționat' : 'Air Conditioning',
      heatingSystem: language === 'ro' ? 'Sistem de Încălzire' : 'Heating System',
      terrace: language === 'ro' ? 'Terasă' : 'Terrace',
      security: language === 'ro' ? 'Sistem de Securitate' : 'Security System'
    };
    
    return amenityMap[amenityId] || amenityId;
  };
  
  // Get terrain/zoning names
  const getZoningName = (zoning) => {
    const zoningMap = {
      residential: language === 'ro' ? 'Rezidențial' : 'Residential',
      commercial: language === 'ro' ? 'Comercial' : 'Commercial',
      agricultural: language === 'ro' ? 'Agricol' : 'Agricultural',
      mixed: language === 'ro' ? 'Mixt' : 'Mixed'
    };
    
    return zoningMap[zoning] || zoning;
  };
  
  const getTerrainName = (terrain) => {
    const terrainMap = {
      flat: language === 'ro' ? 'Plat' : 'Flat',
      sloped: language === 'ro' ? 'Înclinat' : 'Sloped',
      hillside: language === 'ro' ? 'Versant' : 'Hillside',
      oceanfront: language === 'ro' ? 'La Malul Mării' : 'Oceanfront'
    };
    
    return terrainMap[terrain] || terrain;
  };
  
  return (
    <div className="w-full px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Back to Properties link at the top */}
      <div className="mb-4">
        <Link to="/services/properties-for-sale" className="text-indigo-600 hover:underline flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t.backToProperties}
        </Link>
      </div>
      
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">{property.title}</h1>
          <p className="text-gray-600">{property.location}</p>
        </div>
        <div className="flex space-x-3">
          <Link 
            to={`/services/properties-for-sale/edit/${id}`}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {t.edit}
          </Link>
          <button 
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t.delete}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Left column - Images and details */}
        <div className="col-span-1 lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Image gallery */}
          {property.images && property.images.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg overflow-hidden relative">
                <img 
                  src={property.images[activeImageIndex]} 
                  alt={property.title}
                  className="w-full h-48 sm:h-64 object-cover"
                />
                
                {/* Navigation arrows */}
                {property.images.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActiveImageIndex(prev => (prev === 0 ? property.images.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-70 hover:bg-opacity-100 shadow"
                      aria-label="Previous image"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setActiveImageIndex(prev => (prev === property.images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-70 hover:bg-opacity-100 shadow"
                      aria-label="Next image"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              
              {/* Thumbnails - scrollable on mobile */}
              {property.images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto py-2 no-scrollbar">
                  {property.images.map((image, index) => (
                    <div 
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`cursor-pointer rounded-md overflow-hidden w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 ${index === activeImageIndex ? 'ring-2 ring-indigo-600' : ''}`}
                    >
                      <img 
                        src={image} 
                        alt={`Thumbnail ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center h-48 sm:h-64">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Property description */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t.description}</h2>
            <div className="prose max-w-none">
              {property.description ? (
                <p className="text-gray-700">{property.description}</p>
              ) : (
                <p className="text-gray-500 italic">{t.noDescriptionAvailable}</p>
              )}
            </div>
          </div>
          
          {/* Documents */}
          {property.documents && property.documents.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t.documents}</h2>
              <div className="space-y-3">
                {property.documents.map((doc, index) => (
                  <a 
                    key={index}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-indigo-600 truncate">{doc.name || `${t.document} ${index + 1}`}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* Type-specific details */}
          {property.type === 'villa' && property.amenities && property.amenities.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t.amenities}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      {getAmenityName(amenity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right column - Key details (sticky on desktop, regular on mobile) */}
        <div className="col-span-1 space-y-4 sm:space-y-6">
          {/* Price and key details card */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:sticky lg:top-6">
            <div className="mb-4 sm:mb-6">
              <span className="text-2xl sm:text-3xl font-bold text-indigo-600">{formatPrice(property.price)} €</span>
              <span className="text-gray-500 ml-2 text-sm sm:text-base block sm:inline-block mt-1 sm:mt-0">
                {property.size && `(${Math.round(property.price / property.size).toLocaleString()} €/m²)`}
              </span>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Property type */}
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">{t.propertyType}</span>
                <span className="font-medium text-gray-800">
                  {property.type === 'villa' ? t.villa : t.landParcel}
                </span>
              </div>
              
              {/* Status */}
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">{t.status}</span>
                <span className={`font-medium ${
                  property.status === 'available' ? 'text-green-600' : 
                  property.status === 'under_offer' ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {property.status === 'available' ? t.available :
                   property.status === 'under_offer' ? t.underOffer : 
                   t.sold}
                </span>
              </div>
              
              {/* Size */}
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">{t.totalSize}</span>
                <span className="font-medium text-gray-800">{property.size} m²</span>
              </div>
              
              {/* Villa specific details */}
              {property.type === 'villa' && (
                <>
                  {property.bedrooms && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">{t.bedrooms}</span>
                      <span className="font-medium text-gray-800">{property.bedrooms}</span>
                    </div>
                  )}
                  
                  {property.bathrooms && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">{t.bathrooms}</span>
                      <span className="font-medium text-gray-800">{property.bathrooms}</span>
                    </div>
                  )}
                  
                  {property.yearBuilt && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">{t.yearBuilt}</span>
                      <span className="font-medium text-gray-800">{property.yearBuilt}</span>
                    </div>
                  )}
                </>
              )}
              
              {/* Land specific details */}
              {property.type === 'land' && (
                <>
                  {property.zoning && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">{t.zoning}</span>
                      <span className="font-medium text-gray-800">{getZoningName(property.zoning)}</span>
                    </div>
                  )}
                  
                  {property.buildableArea && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">{t.buildableArea}</span>
                      <span className="font-medium text-gray-800">{property.buildableArea} m²</span>
                    </div>
                  )}
                  
                  {property.terrain && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">{t.terrain}</span>
                      <span className="font-medium text-gray-800">{getTerrainName(property.terrain)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Contact buttons - stacked on mobile, spacing adjusted */}
            <div className="mt-4 sm:mt-6 space-y-3">
              <button className="w-full py-2 sm:py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {t.contactAboutProperty}
              </button>
              
              <button className="w-full py-2 sm:py-3 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t.scheduleViewing}
              </button>
              
              <button className="w-full py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t.shareProperty}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetail;