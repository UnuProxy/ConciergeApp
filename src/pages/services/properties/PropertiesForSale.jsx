import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const PropertiesForSale = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
  const [sizeFilter, setSizeFilter] = useState({ min: '', max: '' });
  const [bedroomFilter, setBedroomFilter] = useState('');
  const [bathroomFilter, setBathroomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const db = useDatabase();
  const navigate = useNavigate();
  const [language] = useState(
    localStorage.getItem('appLanguage') || 'en'
  );

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
      deleteConfirm: 'Are you sure you want to delete this property?',
      search: "Search properties...",
      filters: "Filters",
      showFilters: "Show Filters",
      hideFilters: "Hide Filters",
      priceRange: "Price Range",
      minPrice: "Min Price",
      maxPrice: "Max Price",
      sizeRange: "Size Range (m²)",
      minSize: "Min Size",
      maxSize: "Max Size",
      anyBedrooms: "Any Bedrooms",
      anyBathrooms: "Any Bathrooms",
      anyStatus: "Any Status",
      clearFilters: "Clear Filters",
      resultsFound: "properties found",
      size: "Size"
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
      deleteConfirm: 'Sigur doriți să ștergeți această proprietate?',
      search: "Caută proprietăți...",
      filters: "Filtre",
      showFilters: "Arată Filtrele",
      hideFilters: "Ascunde Filtrele",
      priceRange: "Interval de Preț",
      minPrice: "Preț Min",
      maxPrice: "Preț Max",
      sizeRange: "Interval Suprafață (m²)",
      minSize: "Suprafață Min",
      maxSize: "Suprafață Max",
      anyBedrooms: "Orice Dormitoare",
      anyBathrooms: "Orice Băi",
      anyStatus: "Orice Status",
      clearFilters: "Șterge Filtrele",
      resultsFound: "proprietăți găsite",
      size: "Suprafață"
    }
  };
  const t = translations[language] || translations.en;

  useEffect(() => {
    const fetchProperties = async () => {
      if (!db?.firestore || !db?.companyId) {
        setLoading(false);
        return;
      }
      try {
        const propertiesRef = collection(db.firestore, 'properties');
        const q = propertiesRef;
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title:
              data.name?.[language] ||
              data.name?.en ||
              data.name?.ro ||
              'Unnamed Property',
            location: data.location || '',
            type: data.type || 'villa',
            price: parseFloat(data.pricing?.price || 0),
            size: parseFloat(data.size || 0),
            status: data.status || 'available',
            bedrooms: parseInt(data.specs?.bedrooms || '0', 10),
            bathrooms: parseInt(data.specs?.bathrooms || '0', 10),
            images: data.photos || []
          };
        });
        setProperties(fetched);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [db, language]);

  // Enhanced filtering logic for properties
  const getFilteredProperties = () => {
    let filtered = properties;

    // Apply type filter first (existing functionality)
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === activeFilter);
    }

    return filtered.filter(property => {
      // Search term filter (title and location)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = property.title.toLowerCase().includes(searchLower);
        const locationMatch = property.location.toLowerCase().includes(searchLower);
        
        if (!titleMatch && !locationMatch) {
          return false;
        }
      }

      // Price filter
      if (priceFilter.min || priceFilter.max) {
        const propertyPrice = property.price || 0;
        
        if (priceFilter.min && propertyPrice < parseFloat(priceFilter.min)) {
          return false;
        }
        
        if (priceFilter.max && propertyPrice > parseFloat(priceFilter.max)) {
          return false;
        }
      }

      // Size filter
      if (sizeFilter.min || sizeFilter.max) {
        const propertySize = property.size || 0;
        
        if (sizeFilter.min && propertySize < parseFloat(sizeFilter.min)) {
          return false;
        }
        
        if (sizeFilter.max && propertySize > parseFloat(sizeFilter.max)) {
          return false;
        }
      }

      // Bedroom filter (only for villas)
      if (bedroomFilter && property.type === 'villa') {
        if (bedroomFilter === '5+') {
          if (property.bedrooms < 5) return false;
        } else if (property.bedrooms !== parseInt(bedroomFilter)) {
          return false;
        }
      }

      // Bathroom filter (only for villas)
      if (bathroomFilter && property.type === 'villa') {
        if (bathroomFilter === '4+') {
          if (property.bathrooms < 4) return false;
        } else if (property.bathrooms !== parseInt(bathroomFilter)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter && property.status !== statusFilter) {
        return false;
      }

      return true;
    });
  };

  const formatPrice = price => {
    if (price >= 1_000_000) {
      const millions = price / 1_000_000;
      return millions.toLocaleString(
        language === 'ro' ? 'ro-RO' : 'en-US',
        { minimumFractionDigits: 0, maximumFractionDigits: 3 }
      );
    }
    return price.toLocaleString(
      language === 'ro' ? 'ro-RO' : 'en-US'
    );
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm(t.deleteConfirm)) {
      try {
        await deleteDoc(doc(db.firestore, 'properties', id));
        setProperties(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error('Error deleting property:', err);
      }
    }
  };

  const getStatusColor = status => {
    switch (status.toLowerCase()) {
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

  const getStatusLabel = status => {
    switch (status.toLowerCase()) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pb-20 min-h-screen overflow-x-hidden">
      {/* Header with Add Property Button */}
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <button
          onClick={() => navigate('/services/properties-for-sale/add')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          {t.addProperty}
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="px-4 mb-4">
        {/* Search Bar and Controls Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                🔍
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Minimal Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded border font-medium transition-colors text-sm ${
                showFilters 
                  ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              {showFilters ? t.hideFilters : t.showFilters}
            </button>

            {/* Results Count and Clear Button */}
            <div className="flex items-center justify-between sm:justify-center gap-3 bg-gray-100 px-4 py-2 rounded-lg border">
              <span className="text-gray-700 text-sm font-medium whitespace-nowrap">
                {getFilteredProperties().length} {t.resultsFound}
              </span>
              
              {(searchTerm || priceFilter.min || priceFilter.max || sizeFilter.min || sizeFilter.max || bedroomFilter || bathroomFilter || statusFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPriceFilter({ min: '', max: '' });
                    setSizeFilter({ min: '', max: '' });
                    setBedroomFilter('');
                    setBathroomFilter('');
                    setStatusFilter('');
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                >
                  ✕ {t.clearFilters}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Filter Panel */}
        {showFilters && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 mb-4 shadow-sm">
            <div className="flex items-center mb-6 pb-3 border-b border-gray-200">
              <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">
                {t.filters}
              </h3>
            </div>
            
            {/* Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Price Range Filter */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <label className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                  <span className="mr-2">💰</span>
                  {t.priceRange} (€)
                </label>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <input
                    type="number"
                    placeholder={t.minPrice}
                    value={priceFilter.min}
                    onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-0 outline-none text-sm"
                  />
                  <span className="text-gray-500 font-medium hidden sm:block">—</span>
                  <input
                    type="number"
                    placeholder={t.maxPrice}
                    value={priceFilter.max}
                    onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-0 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Size Range Filter */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <label className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                  <span className="mr-2">📐</span>
                  {t.sizeRange}
                </label>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <input
                    type="number"
                    placeholder={t.minSize}
                    value={sizeFilter.min}
                    onChange={(e) => setSizeFilter(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-0 outline-none text-sm"
                  />
                  <span className="text-gray-500 font-medium hidden sm:block">—</span>
                  <input
                    type="number"
                    placeholder={t.maxSize}
                    value={sizeFilter.max}
                    onChange={(e) => setSizeFilter(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-0 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <label className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                  <span className="mr-2">📊</span>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-0 outline-none text-sm bg-white"
                >
                  <option value="">{t.anyStatus}</option>
                  <option value="available">{t.available}</option>
                  <option value="pending">{t.pending}</option>
                  <option value="under_offer">{t.underOffer}</option>
                  <option value="sold">{t.sold}</option>
                </select>
              </div>

              {/* Bedrooms Filter - Only show when villa type is active or all types */}
              {(activeFilter === 'all' || activeFilter === 'villa') && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <label className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                    <span className="mr-2">🛏️</span>
                    {t.beds}
                  </label>
                  <select
                    value={bedroomFilter}
                    onChange={(e) => setBedroomFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-0 outline-none text-sm bg-white"
                  >
                    <option value="">{t.anyBedrooms}</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </select>
                </div>
              )}

              {/* Bathrooms Filter - Only show when villa type is active or all types */}
              {(activeFilter === 'all' || activeFilter === 'villa') && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <label className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                    <span className="mr-2">🚿</span>
                    {t.baths}
                  </label>
                  <select
                    value={bathroomFilter}
                    onChange={(e) => setBathroomFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-0 outline-none text-sm bg-white"
                  >
                    <option value="">{t.anyBathrooms}</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </select>
                </div>
              )}
            </div>

            {/* Active Filters Summary */}
            {(searchTerm || priceFilter.min || priceFilter.max || sizeFilter.min || sizeFilter.max || bedroomFilter || bathroomFilter || statusFilter) && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2 font-medium">
                  Active Filters:
                </p>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs border border-blue-200">
                      Search: "{searchTerm.length > 15 ? searchTerm.substring(0, 15) + '...' : searchTerm}"
                    </span>
                  )}
                  {(priceFilter.min || priceFilter.max) && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs border border-green-200">
                      €{priceFilter.min || '0'} - €{priceFilter.max || '∞'}
                    </span>
                  )}
                  {(sizeFilter.min || sizeFilter.max) && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs border border-yellow-200">
                      {sizeFilter.min || '0'}m² - {sizeFilter.max || '∞'}m²
                    </span>
                  )}
                  {bedroomFilter && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs border border-blue-200">
                      {bedroomFilter} Bed
                    </span>
                  )}
                  {bathroomFilter && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs border border-red-200">
                      {bathroomFilter} Bath
                    </span>
                  )}
                  {statusFilter && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs border border-purple-200">
                      {getStatusLabel(statusFilter)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-4">
        <div className="flex -mb-px overflow-x-auto">
          {[
            { key: 'all', label: t.all },
            { key: 'villa', label: t.villas },
            { key: 'land', label: t.land }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`mr-8 py-4 whitespace-nowrap flex-shrink-0 ${
                activeFilter === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium'
                  : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property Grid or Empty State */}
      {getFilteredProperties().length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-gray-500 mb-4">{t.noProperties}</p>
          <button onClick={() => navigate('/services/properties-for-sale/add')} className="bg-indigo-600 text-white px-6 py-2 rounded-md">
            {t.addProperty}
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {getFilteredProperties().map(prop => (
              <div
                key={prop.id}
                onClick={() => navigate(`/services/properties-for-sale/${prop.id}`)}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200 max-w-sm mx-auto"
              >
                <div className="relative h-40 md:h-44">
                  {prop.images.length > 0 ? (
                    <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 text-indigo-600 font-medium text-sm bg-white/90 px-2 py-1 rounded">
                    {prop.type === 'villa' ? t.villa : t.landParcel}
                  </div>
                  <div className={`absolute top-2 right-2 ${getStatusColor(prop.status)} text-white px-2 py-1 rounded text-xs font-medium`}>
                    {getStatusLabel(prop.status)}
                  </div>
                </div>

                <div className="p-3">
                  <h2 className="text-base md:text-lg font-semibold mb-2 truncate">{prop.title}</h2>
                  <div className="flex items-center text-gray-600 mb-3 min-w-0">
                    <svg className="w-4 h-4 text-indigo-600 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate text-sm">{prop.location}</span>
                  </div>

                  <div className="border-t border-gray-100 my-3" />

                  <div className="flex justify-between items-center mb-3 gap-2">
                    <div className="text-indigo-600 text-lg font-bold flex items-center min-w-0">
                      <span className="mr-1">€</span>
                      <span className="truncate">{formatPrice(prop.price)}</span>
                    </div>
                    <div className="flex items-center text-gray-600 flex-shrink-0">
                      <svg className="w-4 h-4 text-indigo-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                      <span className="text-sm">{prop.size} m<sup>2</sup></span>
                    </div>
                  </div>

                  {prop.type === 'villa' && (
                    <div className="flex gap-4 mb-3">
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 text-indigo-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                        <span className="text-sm">{prop.bedrooms} {t.beds}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 text-indigo-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="text-sm">{prop.bathrooms} {t.baths}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/services/properties-for-sale/edit/${prop.id}`); }}
                      className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      aria-label="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={e => handleDelete(prop.id, e)}
                      className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                      aria-label="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesForSale;
