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
      apartments: 'Apartments',
      land: 'Land',
      noProperties: 'No properties found',
      beds: 'beds',
      baths: 'baths',
      villa: 'Villa',
      apartment: 'Apartment',
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
      statusLabel: "Status",
      clearFilters: "Clear Filters",
      resultsFound: "properties found",
      size: "Size",
      livingArea: "Living area",
      gardenArea: "Garden/outdoor"
    },
    ro: {
      title: 'Proprietăți De Vânzare',
      addProperty: 'Adaugă Proprietate',
      all: 'Toate',
      villas: 'Vile',
      apartments: 'Apartamente',
      land: 'Terenuri',
      noProperties: 'Nu s-au găsit proprietăți',
      beds: 'dormitoare',
      baths: 'băi',
      villa: 'Vilă',
      apartment: 'Apartament',
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
      statusLabel: "Status",
      clearFilters: "Șterge Filtrele",
      resultsFound: "proprietăți găsite",
      size: "Suprafață",
      livingArea: "Suprafață utilă",
      gardenArea: "Curte/Grădină"
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
            livingArea: parseFloat(data.specs?.livingArea || 0),
            gardenArea: parseFloat(data.specs?.gardenArea || 0),
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

      // Bedroom filter (only for residential types)
      if (bedroomFilter && (property.type === 'villa' || property.type === 'apartment')) {
        const beds = parseInt(property.bedrooms || '0', 10);
        if (Number.isNaN(beds)) return false;

        const threshold = parseInt(bedroomFilter, 10);
        const isPlus = bedroomFilter.toString().includes('+');
        if (isPlus) {
          if (beds < threshold) return false;
        } else if (beds !== threshold) {
          return false;
        }
      }

      // Bathroom filter (only for residential types)
      if (bathroomFilter && (property.type === 'villa' || property.type === 'apartment')) {
        const baths = parseInt(property.bathrooms || '0', 10);
        if (Number.isNaN(baths)) return false;

        const threshold = parseInt(bathroomFilter, 10);
        const isPlus = bathroomFilter.toString().includes('+');
        if (isPlus) {
          if (baths < threshold) return false;
        } else if (baths !== threshold) {
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
    const formattedMillions = millions.toLocaleString(
      language === 'ro' ? 'ro-RO' : 'en-US',
      { minimumFractionDigits: 0, maximumFractionDigits: 1 }
    );
    return `${formattedMillions}M`; // ← Added "M" suffix
  }
  if (price >= 1_000) {
    const thousands = price / 1_000;
    const formattedThousands = thousands.toLocaleString(
      language === 'ro' ? 'ro-RO' : 'en-US',
      { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    );
    return `${formattedThousands}K`; // ← Added "K" suffix
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
        return 'bg-emerald-500';
      case 'pending':
      case 'under_offer':
        return 'bg-yellow-500';
      case 'sold':
        return 'bg-rose-500';
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

  const filteredProperties = getFilteredProperties();
  const hasActiveFilters = Boolean(
    searchTerm ||
    priceFilter.min ||
    priceFilter.max ||
    sizeFilter.min ||
    sizeFilter.max ||
    bedroomFilter ||
    bathroomFilter ||
    statusFilter
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="page-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold heading-display">{t.title}</h1>
            <div className="text-xs text-slate-500 mt-1">
              {filteredProperties.length} {t.resultsFound}
            </div>
          </div>
          <button
            onClick={() => navigate('/services/properties-for-sale/add')}
            className="btn-primary"
          >
            {t.addProperty}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium input-premium--icon"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 21l-4.35-4.35m1.6-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-soft"
              type="button"
            >
              {showFilters ? t.hideFilters : t.showFilters}
            </button>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPriceFilter({ min: '', max: '' });
                  setSizeFilter({ min: '', max: '' });
                  setBedroomFilter('');
                  setBathroomFilter('');
                  setStatusFilter('');
                }}
                className="btn-soft"
                type="button"
              >
                {t.clearFilters}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: t.all },
            { key: 'villa', label: t.villas },
            { key: 'apartment', label: t.apartments },
            { key: 'land', label: t.land }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={activeFilter === tab.key ? 'chip' : 'chip chip-toggle'}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">{t.priceRange}</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={t.minPrice}
                  value={priceFilter.min}
                  onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
                  className="input-premium"
                />
                <input
                  type="number"
                  placeholder={t.maxPrice}
                  value={priceFilter.max}
                  onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
                  className="input-premium"
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">{t.sizeRange}</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={t.minSize}
                  value={sizeFilter.min}
                  onChange={(e) => setSizeFilter(prev => ({ ...prev, min: e.target.value }))}
                  className="input-premium"
                />
                <input
                  type="number"
                  placeholder={t.maxSize}
                  value={sizeFilter.max}
                  onChange={(e) => setSizeFilter(prev => ({ ...prev, max: e.target.value }))}
                  className="input-premium"
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">{t.statusLabel}</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-premium"
              >
                <option value="">{t.anyStatus}</option>
                <option value="available">{t.available}</option>
                <option value="pending">{t.pending}</option>
                <option value="under_offer">{t.underOffer}</option>
                <option value="sold">{t.sold}</option>
              </select>
            </div>
            {(activeFilter === 'all' || activeFilter === 'villa' || activeFilter === 'apartment') && (
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.beds}</div>
                <select
                  value={bedroomFilter}
                  onChange={(e) => setBedroomFilter(e.target.value)}
                  className="input-premium"
                >
                  <option value="">{t.anyBedrooms}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5+">5+</option>
                </select>
              </div>
            )}
            {(activeFilter === 'all' || activeFilter === 'villa' || activeFilter === 'apartment') && (
              <div>
                <div className="text-xs font-semibold text-slate-500">{t.baths}</div>
                <select
                  value={bathroomFilter}
                  onChange={(e) => setBathroomFilter(e.target.value)}
                  className="input-premium"
                >
                  <option value="">{t.anyBathrooms}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4+">4+</option>
                </select>
              </div>
            )}
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {searchTerm && (
              <span className="chip">
                "{searchTerm.length > 18 ? `${searchTerm.substring(0, 18)}...` : searchTerm}"
              </span>
            )}
            {(priceFilter.min || priceFilter.max) && (
              <span className="chip">
                €{priceFilter.min || '0'} - €{priceFilter.max || '∞'}
              </span>
            )}
            {(sizeFilter.min || sizeFilter.max) && (
              <span className="chip">
                {sizeFilter.min || '0'}m² - {sizeFilter.max || '∞'}m²
              </span>
            )}
            {bedroomFilter && <span className="chip">{bedroomFilter} {t.beds}</span>}
            {bathroomFilter && <span className="chip">{bathroomFilter} {t.baths}</span>}
            {statusFilter && <span className="chip">{getStatusLabel(statusFilter)}</span>}
          </div>
        )}
      </div>

      {filteredProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-slate-500 mb-4">{t.noProperties}</p>
          <button onClick={() => navigate('/services/properties-for-sale/add')} className="btn-primary">
            {t.addProperty}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProperties.map(prop => (
            <div
              key={prop.id}
              onClick={() => navigate(`/services/properties-for-sale/${prop.id}`)}
              className="card-premium overflow-hidden cursor-pointer flex flex-col"
            >
              <div className="relative h-44 flex-shrink-0">
                {prop.images.length > 0 ? (
                  <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                    {language === 'ro' ? 'Fără foto' : 'No photo'}
                  </div>
                )}
                {/* Image area intentionally clean */}
              </div>

              <div className="p-3 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-gray-900 line-clamp-2">
                    {prop.title}
                  </h2>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="chip bg-white text-slate-900 border-slate-900/15 shadow-sm">
                      {prop.type === 'villa'
                        ? t.villa
                        : prop.type === 'apartment'
                          ? t.apartment
                          : t.landParcel}
                    </span>
                    <span
                      className={`chip ${
                        prop.status === 'available'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : prop.status === 'under_offer'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : prop.status === 'pending'
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-rose-600 text-white border-rose-600'
                      }`}
                    >
                      {getStatusLabel(prop.status)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-slate-500 text-sm mb-2">
                  <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{prop.location}</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  €{formatPrice(prop.price)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {prop.livingArea > 0 && (
                    <span className="chip">{prop.livingArea} m<sup>2</sup> {t.livingArea}</span>
                  )}
                  {prop.gardenArea > 0 && (
                    <span className="chip">{prop.gardenArea} m<sup>2</sup> {t.gardenArea}</span>
                  )}
                  {prop.livingArea <= 0 && prop.gardenArea <= 0 && (
                    <span className="chip">{prop.size} m<sup>2</sup></span>
                  )}
                </div>
                {(prop.type === 'villa' || prop.type === 'apartment') && (
                  <div className="mt-2 text-sm text-slate-600 flex gap-4">
                    <span>{prop.bedrooms} {t.beds}</span>
                    <span>{prop.bathrooms} {t.baths}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/services/properties-for-sale/edit/${prop.id}`); }}
                    className="btn-soft"
                    style={{ width: '40px', height: '40px', padding: 0 }}
                    aria-label="Edit"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={e => handleDelete(prop.id, e)}
                    className="btn-soft btn-soft-danger"
                    style={{ width: '40px', height: '40px', padding: 0 }}
                    aria-label="Delete"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

export default PropertiesForSale;
