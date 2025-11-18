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
import { translations } from '../translations/bookingTranslations';
import { useLanguage } from '../utils/languageHelper';

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

// Enhanced category icon components
const CategoryIcon = ({ type, size = "small" }) => {
  const sizeClass = size === "large" ? "w-8 h-8" : "w-5 h-5";
  
  switch(type) {
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

// IMPROVED SERVICE SELECTION COMPONENT
const ServiceSelectionPanel = ({ onServiceAdded, onCancel, userCompanyId, t }) => {
  const [step, setStep] = useState('category');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
    notes: ''
  });

  // Fetch categories first
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        // Define standard categories
        const standardCategories = [
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

  // Fetch services for selected category
  useEffect(() => {
    const fetchServices = async () => {
      if (!selectedCategory || selectedCategory.id === 'custom') return;
      
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
        
        serviceSnapshot.forEach(doc => {
          servicesData.push({
            id: doc.id,
            ...doc.data()
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
              
              let price = 0;
              if (selectedCategory.id === 'villas' && data.priceConfigurations && data.priceConfigurations.length > 0) {
                price = parseFloat(data.priceConfigurations[0].price || 0);
              } else {
                price = parseFloat(data.price || 0);
              }
              
              console.log(`Processing item: ${doc.id}`, {
                name: data.name?.en || data.name || doc.id,
                price: price
              });
              
              servicesData.push({
                id: doc.id,
                name: data.name?.en || data.name || doc.id,
                description: data.description?.en || data.description || '',
                category: selectedCategory.id,
                price: price,
                unit: selectedCategory.id === 'villas' ? 'nightly' : 
                      selectedCategory.id === 'cars' || selectedCategory.id === 'boats' ? 'daily' : 'service',
                brand: data.brand || '',
                model: data.model || '',
                bedrooms: data.bedrooms || '',
                bathrooms: data.bathrooms || '',
                address: typeof data.address === 'object' ? data.address.en : data.address || ''
              });
            });
          } catch (err) {
            console.error(`Error fetching from ${selectedCategory.id} collection:`, err);
          }
        }
        
        servicesData.sort((a, b) => {
          const nameA = (typeof a.name === 'object' ? a.name.en : a.name) || '';
          const nameB = (typeof b.name === 'object' ? b.name.en : b.name) || '';
          return nameA.localeCompare(nameB);
        });
        
        console.log(`Total services after merging collections: ${servicesData.length}`);
        setServices(servicesData);
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
    setServiceData(prev => ({ ...prev, category: category.id }));
    
    if (category.id === 'custom') {
      setStep('custom');
    } else {
      setStep('services');
    }
  };

  const handleServiceSelect = (service) => {
    setServiceData({
      ...serviceData,
      name: typeof service.name === 'object' ? service.name.en : service.name,
      description: typeof service.description === 'object' ? service.description.en : service.description || '',
      category: selectedCategory.id,
      price: service.price || 0,
      unit: service.unit || 'hourly',
      date: new Date().toISOString().split('T')[0],
      brand: service.brand || '',
      model: service.model || '',
      quantity: 1,
      status: 'confirmed',
      templateId: service.id
    });
    
    setStep('details');
  };

  const handleAddCustom = () => {
    setStep('custom');
  };

  const handleSubmit = () => {
    const totalPrice = serviceData.price * serviceData.quantity;
    
    const newService = {
      type: serviceData.category,
      name: serviceData.name,
      description: serviceData.description || '',
      date: serviceData.date,
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
      companyId: userCompanyId
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
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {services.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {services.map((service, index) => (
                <button
                  key={service.id || index}
                  onClick={() => handleServiceSelect(service)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition-colors bg-white"
                >
                  <div className="font-medium text-gray-900">
                    {typeof service.name === 'object' ? service.name.en : service.name}
                  </div>
                  
                  {(service.description || service.brand || service.model) && (
                    <div className="text-sm text-gray-600 mt-1">
                      {service.brand && service.model ? `${service.brand} ${service.model}` :
                       service.brand ? service.brand :
                       service.model ? service.model :
                       typeof service.description === 'object' ? service.description.en : service.description}
                    </div>
                  )}
                  
                  <div className="mt-2 text-blue-600 font-medium">
                    {service.price?.toLocaleString() || 0} € / {service.unit || 'item'}
                  </div>
                </button>
              ))}
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
                value={serviceData.price}
                className="w-full pl-8 p-2 bg-gray-50 border border-gray-300 rounded-md"
                readOnly
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
            {(serviceData.price * serviceData.quantity).toLocaleString()} €
          </div>
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
            disabled={serviceData.price <= 0}
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
                value={serviceData.price}
                onChange={(e) => setServiceData({...serviceData, price: parseFloat(e.target.value) || 0})}
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
              onChange={(e) => setServiceData({...serviceData, quantity: parseInt(e.target.value) || 1})}
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
    price: 0,
    receipt: false,
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async () => {
    if (!shoppingData.store.trim()) {
      setError(t.pleaseEnterStore || "Please enter a store name");
      return;
    }
    
    if (!shoppingData.items.trim()) {
      setError(t.pleaseEnterItems || "Please enter items purchased");
      return;
    }
    
    if (shoppingData.price <= 0) {
      setError(t.pleaseEnterValidAmount || "Please enter a valid amount");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const newExpense = {
        type: 'shopping',
        name: `${t.shoppingAt || 'Shopping at'} ${shoppingData.store}`,
        description: shoppingData.items,
        date: shoppingData.date,
        price: shoppingData.price,
        quantity: 1,
        unit: 'item',
        store: shoppingData.store,
        hasReceipt: shoppingData.receipt,
        notes: shoppingData.notes || '',
        totalValue: shoppingData.price,
        status: 'confirmed',
        createdAt: new Date(),
        companyId: userCompanyId
      };
      
      await onAddShopping(newExpense);
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
          <div className="relative">
            <input
              type="number"
              value={shoppingData.price}
              onChange={(e) => setShoppingData({...shoppingData, price: parseFloat(e.target.value) || 0})}
              className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
              required
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">€</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="hasReceipt"
            checked={shoppingData.receipt}
            onChange={(e) => setShoppingData({...shoppingData, receipt: e.target.checked})}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="hasReceipt" className="ml-2 block text-sm text-gray-700">
            {t.receiptAvailable || 'Receipt available'}
          </label>
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
            disabled={isSubmitting || !shoppingData.store || !shoppingData.items || shoppingData.price <= 0}
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
  
  // Helper functions
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'ro-RO', {
      day: '2-digit',
      month: '2-digit'
    });
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
              <span className="font-medium">{client.paidAmount.toLocaleString()} / {client.totalValue.toLocaleString()} €</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  client.paymentStatus === 'paid' ? 'bg-green-500' : 
                  client.paymentStatus === 'partiallyPaid' ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (client.paidAmount / client.totalValue) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Services summary */}
        {client.services.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-600 mb-1">{t.servicesAndExtras}</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {client.services.slice(0, 3).map((service, idx) => (
                <div key={idx} className="px-2 py-1 bg-gray-100 rounded-md">
                  {safeRender(service.name)}
                </div>
              ))}
              {client.services.length > 3 && (
                <div className="px-2 py-1 bg-gray-100 rounded-md text-gray-500">
                  +{client.services.length - 3} {t.more}
                </div>
              )}
            </div>
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
  const summaryStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let upcoming = 0;
    let active = 0;
    let past = 0;
    
    bookings.forEach(booking => {
      if (!booking.checkIn) return;
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut || booking.checkIn);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      if (checkIn > today) {
        upcoming += 1;
      } else if (checkIn <= today && checkOut >= today) {
        active += 1;
      } else if (checkOut < today) {
        past += 1;
      }
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
  const filterTabs = useMemo(
    () => [
      { id: 'upcoming', label: t.upcoming, count: summaryStats.upcoming, icon: 'calendar' },
      { id: 'active', label: t.activeNow, count: summaryStats.active, icon: 'clock' },
      { id: 'past', label: t.past, count: summaryStats.past, icon: 'history' },
      { id: 'all', label: t.all, count: summaryStats.totalClients, icon: 'list' }
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
  
  // Simplified UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('upcoming'); // Default to upcoming
  const [sortOption, setSortOption] = useState('date');
  
  // Modal states
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetContent, setBottomSheetContent] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const bottomSheetRef = useRef(null);
  
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
  

useEffect(() => {
  if (showBottomSheet && bottomSheetRef.current) {
    const modal = bottomSheetRef.current;
    const header = modal.querySelector('.bottom-sheet-header');
    
    if (header) {
      const handleTouchStart = (e) => {
        const startY = e.touches[0].clientY;
        
        const handleTouchMove = (e) => {
          const currentY = e.touches[0].clientY;
          const deltaY = currentY - startY;
          
          if (deltaY > 0) {
            modal.style.transform = `translateY(${deltaY}px)`;
            modal.style.transition = 'none';
          }
        };
        
        const handleTouchEnd = (e) => {
          modal.style.transition = 'transform 0.3s ease-out';
          const endY = e.changedTouches[0].clientY;
          const deltaY = endY - startY;
          
          if (deltaY > 100) {
            closeBottomSheet();
          } else {
            modal.style.transform = 'translateY(0)';
          }
        };
        
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        
        return () => {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        };
      };
      
      header.addEventListener('touchstart', handleTouchStart);
      return () => header.removeEventListener('touchstart', handleTouchStart);
    }
  }
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
        
        // Check if the user exists in the authorized_users collection
        const authorizedUsersRef = collection(db, 'authorized_users');
        const authorizedQuery = query(
          authorizedUsersRef,
          where('email', '==', user.email)
        );
        
        const authorizedSnapshot = await getDocs(authorizedQuery);
        
        if (authorizedSnapshot.empty) {
          throw new Error(t.userNotAuthorized);
        }
        
        const authorizedUserDoc = authorizedSnapshot.docs[0];
        const authorizedUserData = authorizedUserDoc.data();
        
        // Set the company ID and role from authorized_users
        const companyId = authorizedUserData.companyId;
        const role = authorizedUserData.role;
        
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
            }
          } else {
            console.warn(`Booking ${doc.id} has wrong company ID: ${data.companyId} vs ${userCompanyId}`);
          }
        });
        
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
                console.warn(`Client ${clientId} has wrong company ID: ${clientData.companyId} vs ${userCompanyId}`);
              }
            }
          } catch (err) {
            console.error(`Error fetching client ${clientId}:`, err);
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
          
          const totalValue = booking.totalValue || booking.totalAmount || 0;
          const paidAmount = booking.paidAmount || booking.totalPaid || 0;
          
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
          if (booking.services && booking.services.length > 0) {
            booking.services.forEach(service => {
              // Process service date and createdAt fields
              const processedService = {
                ...service,
                date: service.date?.toDate?.() || service.date,
                createdAt: service.createdAt?.toDate?.() || service.createdAt || new Date()
              };
              
              groups[clientId].services.push({
                ...processedService,
                bookingId: booking.id
              });
            });
          }
          
          groups[clientId].bookings.push(booking);
          groups[clientId].totalValue += totalValue;
          groups[clientId].paidAmount += paidAmount;
          groups[clientId].dueAmount += Math.max(0, totalValue - paidAmount);
          
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
  
  // Helper function to get client name
  const getClientName = (clientId) => {
    if (!clientDetails[clientId]) return '';
    return safeRender(clientDetails[clientId].name) || '';
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
  
  // Filter clients based on time and search filters
  const getFilteredClients = () => {
    return Object.values(clientGroups).filter(client => {
      // Time filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (timeFilter === 'upcoming') {
        // Show clients with check-in date today or in the future
        const hasUpcomingBooking = client.bookings.some(booking => {
          if (!booking.checkIn) return false;
          const checkIn = new Date(booking.checkIn);
          checkIn.setHours(0, 0, 0, 0);
          return checkIn >= today;
        });
        if (!hasUpcomingBooking) return false;
      } else if (timeFilter === 'active') {
        // Show clients with active bookings (checked in but not checked out)
        const hasActiveBooking = client.bookings.some(booking => {
          if (!booking.checkIn || !booking.checkOut) return false;
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          checkIn.setHours(0, 0, 0, 0);
          checkOut.setHours(0, 0, 0, 0);
          return checkIn <= today && checkOut >= today;
        });
        if (!hasActiveBooking) return false;
      } else if (timeFilter === 'past') {
        // Show clients with past bookings
        const hasPastBooking = client.bookings.some(booking => {
          if (!booking.checkOut) return false;
          const checkOut = new Date(booking.checkOut);
          checkOut.setHours(0, 0, 0, 0);
          return checkOut < today;
        });
        if (!hasPastBooking) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        // Check if client name matches
        const nameMatch = safeRender(client.clientName).toLowerCase().includes(query);
        // Check if any booking details match
        const bookingMatch = client.bookings.some(booking =>
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
          if (!client.bookings.length) return new Date(9999, 11, 31);
          return client.bookings.reduce((earliest, booking) => {
            if (!booking.checkIn) return earliest;
            const checkIn = new Date(booking.checkIn);
            return checkIn < earliest ? checkIn : earliest;
          }, new Date(9999, 11, 31));
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
  };
  
  // Bottom sheet handling
  const showBottomSheetWithContent = (content, item, secondaryItem = null) => {
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
  setTimeout(() => {
    setBottomSheetContent(null);
    setSelectedItem(null);
    setSelectedPayment(null);
    setSelectedService(null);
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

const openPaymentModal = (client) => {
  console.log('openPaymentModal called with client:', client);
  if (client) {
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
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M3 21h18M5 21V5m14 0v16"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-700 mb-2">{t.noBookingsFound}</h3>
        <p className="text-gray-500">
          {timeFilter === 'upcoming' ? t.noUpcomingBookings :
           timeFilter === 'active' ? t.noActiveBookings :
           timeFilter === 'past' ? t.noPastBookings :
           t.noMatchingBookings}
        </p>
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
      
      // Delete the booking document from Firestore
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
      
      // Create service object WITHOUT serverTimestamp - add a unique ID
      const newService = {
        ...shoppingExpense,
        id: 'shopping_' + Date.now(), // Add a unique ID
        createdAt: currentDate
      };
      
      services.push(newService);
      
      // Update the booking in Firestore - only use serverTimestamp for top-level fields
      await updateDoc(bookingRef, {
        services: services,
        totalValue: newTotal,
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
        updatedGroup.dueAmount = updatedGroup.totalValue - paidAmount;
        
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
        totalValue: parseFloat(serviceData.price) * parseInt(serviceData.quantity)
      };
      
      // Calculate total values for the booking
      const currentTotal = bookingData.totalValue || 0;
      const newTotal = currentTotal + preparedService.totalValue;
      const paidAmount = bookingData.paidAmount || 0; // Preserve paid amount
      
      // Create a services array if it doesn't exist
      const services = Array.isArray(bookingData.services) ? [...bookingData.services] : [];
      
      // Add the service to services array
      services.push(preparedService);
      
      // Update the booking in Firestore - only use serverTimestamp for top-level fields
      await updateDoc(bookingRef, {
        services: services,
        totalValue: newTotal,
        // KEEP paidAmount unchanged
        updatedAt: serverTimestamp()
      });
      
      // Update local state - FIXED: preserve paid amount
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
              // Maintain the existing paidAmount
              paidAmount: booking.paidAmount || 0
            };
          }
          return booking;
        });
      });
      
      // Update client groups - FIXED: preserve paid amount
      setClientGroups(prev => {
        const clientId = client.clientId;
        if (!prev[clientId]) return prev;
        
        const updatedGroup = { ...prev[clientId] };
        
        // Update the booking
        updatedGroup.bookings = updatedGroup.bookings.map(b => {
          if (b.id === targetBooking.id) {
            return {
              ...b,
              services: Array.isArray(b.services) ? [...b.services, preparedService] : [preparedService],
              totalValue: newTotal,
              // Maintain paid amount
              paidAmount: b.paidAmount || 0
            };
          }
          return b;
        });
        
        // Add the service to client's services array
        updatedGroup.services = [...updatedGroup.services, {
          ...preparedService,
          bookingId: targetBooking.id
        }];
        
        // Update client totals - FIXED: preserve paid amount
        const oldTotalValue = updatedGroup.totalValue;
        updatedGroup.totalValue += preparedService.totalValue;
        
        // Keep paidAmount the same
        const paidAmount = updatedGroup.paidAmount;
        updatedGroup.dueAmount = updatedGroup.totalValue - paidAmount;
        
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
 const handleServiceSelectionAdd = async (service) => {
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
};

  
  // Handle add shopping expense from form
 const handleShoppingFormSubmit = async (shoppingExpense) => {
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
};

  
  // PAYMENT HANDLING
  const handleQuickPayment = async (client, amount) => {
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
      
      const payment = {
        amount,
        method: paymentData.method,
        notes: paymentData.notes,
        receiptNumber: paymentData.receiptNumber,
        date: new Date(),
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
      
      // Update booking in Firestore
      await updateDoc(bookingRef, {
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
        lastPaymentDate: serverTimestamp(),
        lastPaymentMethod: payment.method,
        paymentHistory
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
              paymentHistory: [...(booking.paymentHistory || []), payment]
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
              lastPaymentMethod: payment.method
            };
          }
          return b;
        });
        
        const paidAmount = updatedGroup.paidAmount + payment.amount;
        updatedGroup.paidAmount = paidAmount;
        updatedGroup.dueAmount = Math.max(0, updatedGroup.totalValue - paidAmount);
        
        if (paidAmount >= updatedGroup.totalValue) {
          updatedGroup.paymentStatus = 'paid';
        } else if (paidAmount > 0) {
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
              <p className="booking-hero__eyebrow">{t.viewingDataFor} <span>{safeRender(userCompanyId) || '—'}</span></p>
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
              <p className="booking-hero__eyebrow">{t.viewingDataFor} <span>{safeRender(userCompanyId) || '—'}</span></p>
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
              <p className="booking-hero__eyebrow">{t.viewingDataFor} <span>{safeRender(userCompanyId) || '—'}</span></p>
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
      <section className="booking-hero page-surface">
        <div className="booking-hero__top">
          <div>
            <p className="booking-hero__eyebrow">{t.viewingDataFor} <span>{safeRender(userCompanyId) || '—'}</span></p>
            <h1>{t.bookingManager}</h1>
            <p className="booking-hero__subtitle">{t.heroSubtitle}</p>
          </div>
          <div className="pill booking-hero__summary">
            <span className="status-dot" />
            {summaryStats.totalClients} {t.clients}
          </div>
        </div>
        <div className="booking-stats-grid">
          <div className="booking-stat">
            <p>{t.totalRevenueLabel}</p>
            <h3>{formatCurrency(summaryStats.totalRevenue)}</h3>
            <span>{t.outstandingBalanceLabel}: {formatCurrency(summaryStats.outstanding)}</span>
          </div>
          <div className="booking-stat">
            <p>{t.totalBookingsLabel}</p>
            <h3>{summaryStats.totalBookings}</h3>
            <span>{t.upcomingTripsLabel}: {summaryStats.upcoming}</span>
          </div>
          <div className="booking-stat">
            <p>{t.activeBookingsLabel}</p>
            <h3>{summaryStats.active}</h3>
            <span>{t.past}: {summaryStats.past}</span>
          </div>
        </div>
      </section>

      <section className="booking-panel">
        <div className="booking-filters surface-card">
          <div className="booking-filters__row">
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

          <div className="booking-filter-tabs">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                className={`booking-tab ${timeFilter === tab.id ? 'booking-tab--active' : ''}`}
                onClick={() => setTimeFilter(tab.id)}
              >
                <span className="booking-tab__icon">{renderTabIcon(tab.icon)}</span>
                <div>
                  <p>{tab.label}</p>
                  <small>{tab.count} {tab.id === 'all' ? t.clients : t.bookings}</small>
                </div>
              </button>
            ))}
          </div>

          <div className="booking-filters__info">
            <span>{t.found} <strong>{filteredClients.length}</strong> {t.bookings}</span>
            {searchQuery && <span>{t.matching} "{searchQuery}"</span>}
          </div>
        </div>

        <div className="booking-results page-surface">
          {renderMainContent(filteredClients)}
        </div>
      </section>

      {/* Bottom Sheet with Enhanced Content */}
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
            
            {/* Bookings Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">{t.bookings || 'Bookings'} ({selectedItem.bookings.length})</h3>
              {selectedItem.bookings.map((booking, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
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
                selectedItem.services.map((service, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => openEditServiceModal(selectedItem, service)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{safeRender(service.name)}</p>
                        <p className="text-sm text-gray-600">{formatShortDate(service.date)}</p>
                      </div>
                      <p className="font-medium text-gray-900">{((service.price || 0) * (service.quantity || 1)).toLocaleString()} €</p>
                    </div>
                  </div>
                ))
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
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      onClick={() => openEditPaymentModal(selectedItem, payment)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{(payment.amount || 0).toLocaleString()} €</p>
                          <p className="text-sm text-gray-600">{formatLongDate(payment.date)}</p>
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
                  onClick={() => setPaymentData({...paymentData, amount: selectedItem.dueAmount})}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  {t.fullAmount || 'Full Amount'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentData({...paymentData, amount: Math.round(selectedItem.dueAmount / 2)})}
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

        {/* Fallback for unknown content */}
        {!['client-details', 'quick-payment', 'edit-payment', 'add-service', 'edit-service', 'add-shopping'].includes(bottomSheetContent) && (
          <div className="p-4 bg-white text-center">
            <p className="text-gray-500">Unknown content type: {bottomSheetContent}</p>
            <button 
              onClick={closeBottomSheet}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
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
