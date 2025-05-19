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

// Simple helper to safely render text that might be a language object
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

// Simplified status colors with enhanced styling
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

// Company indicator component with direct string rendering
const CompanyIndicator = ({ companyId, t }) => (
  <div className="text-sm text-gray-500 mb-2">
    <span>{t.viewingDataFor}</span> <span className="font-medium">{safeRender(companyId) || ''}</span>
  </div>
);

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
  // Fetch categories first - FIXED: added this missing function
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
        
        // You could also fetch categories from Firestore if needed
        // For now, we'll use the standard categories
        
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
            
            // Fix query to just filter by companyId
            const dedicatedQuery = query(
              collection(db, selectedCategory.id),
              where('companyId', '==', userCompanyId)
            );
            
            const dedicatedSnapshot = await getDocs(dedicatedQuery);
            const dedicatedCount = dedicatedSnapshot.size;
            
            console.log(`Found ${dedicatedCount} items in '${selectedCategory.id}' collection`);
            
            dedicatedSnapshot.forEach(doc => {
              const data = doc.data();
              
              // Debug information
              console.log(`Processing item: ${doc.id}`, {
                name: data.name?.en || data.name || doc.id,
                price: data.price
              });
              
              // Convert collection items to service format
              servicesData.push({
                id: doc.id,
                name: data.name?.en || data.name || doc.id,
                description: data.description?.en || data.description || '',
                category: selectedCategory.id,
                price: parseFloat(data.price || 0),
                unit: selectedCategory.id === 'villas' ? 'nightly' : 
                      selectedCategory.id === 'cars' || selectedCategory.id === 'boats' ? 'daily' : 'service',
                brand: data.brand || '',
                model: data.model || ''
              });
            });
          } catch (err) {
            console.error(`Error fetching from ${selectedCategory.id} collection:`, err);
            // Continue anyway - this is just a bonus attempt
          }
        }
        
        // Sort services by name
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
    // Pre-fill form with service data
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
    // Calculate total price
    const totalPrice = serviceData.price * serviceData.quantity;
    
    // Create service object
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
    
    // Send back to parent component
    onServiceAdded(newService);
  };
  // RENDER CATEGORY SELECTION
  const renderCategorySelection = () => (
    <div>
      <h4 className="text-lg font-medium mb-4">{t.selectServiceCategory || 'Select Service Category'}</h4>
      
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
            className="p-4 md:p-3 border rounded-lg flex flex-col items-center hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
              <CategoryIcon type={category.icon} size="large" />
              <span className="mt-2 text-center">{category.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
  // RENDER SERVICES LIST
  const renderServicesList = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium">{selectedCategory?.name} {t.servicesTitle || 'Services'}</h4>
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
                  className="w-full p-3 border rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="font-medium">
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
          
          {/* Always show "Add Custom" button */}
          <button
            onClick={handleAddCustom}
            className="w-full p-3 mt-4 border border-dashed rounded-lg text-center hover:bg-gray-50 transition-colors"
          >
            <div className="font-medium text-blue-600">+ {t.addCustom || 'Add Custom'} {selectedCategory?.name}</div>
          </button>
        </>
      )}
    </div>
  );
  // RENDER SERVICE DETAILS FORM
  const renderServiceDetailsForm = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium">
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium">{t.customService || 'Custom Service'}</h4>
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.date || 'Date'}</label>
          <input
            type="date"
            value={serviceData.date}
            onChange={(e) => setServiceData({...serviceData, date: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.totalAmount || 'Total Amount'}
            </label>
            <div className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md font-medium">
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
    <div className="p-4">
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
      
      // Create shopping expense object
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
      
      // Send to parent component
      await onAddShopping(newExpense);
      setIsSubmitting(false);
    } catch (err) {
      console.error("Error adding shopping expense:", err);
      setError(err.message || t.failedToAddShopping || "Failed to add shopping expense");
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-4">
      <h4 className="text-lg font-medium mb-4">{t.addShoppingExpense || 'Add Shopping Expense'}</h4>
      
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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

// CLIENT CARD COMPONENT - Previously missing
const ClientCard = ({ client }) => {
  // Get translations from the context
  const language = localStorage.getItem('appLanguage') || 'ro';
  
  // Translations for the component
  const translations = {
    ro: {
      // General
      viewingDataFor: "Vizualizare date pentru compania:",
      bookingManager: "Manager Rezervări",
      loading: "Se încarcă rezervările...",
      error: "Eroare",
      errorLoading: "Eroare la încărcarea rezervărilor:",
      
      // Authentication errors
      authError: "Eroare de autentificare",
      userNotAuthenticated: "Utilizatorul nu este autentificat",
      userNotAuthorized: "Utilizatorul nu este autorizat să acceseze această aplicație",
      noCompanyAssociation: "Utilizatorul nu are asociere cu o companie",
      signOut: "Deconectare",
      
      // Filters & Search
      search: "Caută client, rezervare...",
      sortBy: "Sortează după",
      sortByDate: "Sortează după Dată",
      sortByClientName: "Sortează după Numele Clientului",
      sortByRecentActivity: "Sortează după Activitate Recentă",
      sortByValue: "Sortează după Valoare",
      
      // Tab filters
      upcoming: "Viitoare",
      activeNow: "Active Acum",
      past: "Trecute",
      all: "Toate",
      
      // Results
      found: "S-au găsit",
      bookings: "rezervări",
      booking: "rezervare",
      matching: "care se potrivesc cu",
      
      // Empty states
      noBookingsFound: "Nu s-au găsit rezervări",
      noUpcomingBookings: "Nu există rezervări viitoare programate.",
      noActiveBookings: "Nu există rezervări active în acest moment.",
      noPastBookings: "Nu există rezervări trecute de afișat.",
      noMatchingBookings: "Nu există rezervări care să corespundă criteriilor de căutare.",
      tryChangingSearch: "Încercați să modificați interogarea de căutare",
      
      // Client Card
      guests: "oaspeți",
      paymentProgress: "Progres Plată",
      servicesAndExtras: "Servicii și Extra",
      more: "mai multe",
      
      // Action buttons
      details: "Detalii",
      paid: "Plătit",
      pay: "Plătește",
      service: "Serviciu",
      shop: "Cumpărături",
      
      // Bottom Sheet Titles
      clientDetails: "Detalii Client",
      addPayment: "Adaugă Plată",
      editPayment: "Editează Plată",
      addService: "Adaugă Serviciu",
      serviceDetails: "Detalii Serviciu",
      addShoppingExpense: "Adaugă Cheltuieli Cumpărături",
      
      // Client Details
      clientId: "ID Client:",
      contactInformation: "Informații de Contact",
      totalValue: "Valoare totală",
      checkIn: "Check-in:",
      checkOut: "Check-out:",
      deleteBooking: "Șterge Rezervarea",
      noAdditionalServices: "Fără servicii adiționale",
      paymentHistory: "Istoric Plăți",
      noPaymentsRecorded: "Nu există plăți înregistrate",
      addToBooking: "Adaugă la Rezervare",
      paymentsTotal: "Total Plăți",
      
      // Payments
      client: "Client:",
      amountDue: "Sumă de plată:",
      paymentAmount: "Suma Plății",
      paymentMethod: "Metoda de Plată",
      cash: "Numerar",
      card: "Card",
      transfer: "Transfer",
      crypto: "Crypto",
      receiptNumber: "Număr Chitanță (opțional)",
      enterReceiptNumber: "Introduceți numărul chitanței dacă este disponibil",
      notes: "Note (opțional)",
      addPaymentDetails: "Adăugați detalii de plată sau referință",
      completePayment: "Finalizează Plata",
      
      // Services
      date: "Data:",
      quantity: "Cantitate",
      deleteService: "Șterge Serviciul",
      
      // Shopping Form
      storeName: "Numele Magazinului*",
      storeNamePlaceholder: "Ex. Gucci, Supermarket, Farmacie",
      itemsPurchased: "Articole Cumpărate*",
      itemsPurchasedPlaceholder: "Lista articolelor cumpărate",
      totalAmount: "Suma Totală*",
      receiptAvailable: "Chitanță disponibilă",
      additionalNotes: "Note adiționale",
      cancel: "Anulează",
      adding: "Se adaugă...",
      shoppingAt: "Cumpărături la",
      
      // Messages
      noClientSelected: "Niciun client selectat",
      serviceAddedSuccess: "Serviciu adăugat cu succes",
      failedAddService: "Eroare la adăugarea serviciului",
      shoppingExpenseSuccess: "Cheltuială de cumpărături adăugată cu succes",
      failedAddShopping: "Eroare la adăugarea cheltuielii de cumpărături",
      paymentSuccess: "Plată procesată cu succes",
      noClientsFound: "Nu s-au găsit clienți",
      pleaseEnterStore: "Vă rugăm să introduceți numele magazinului",
      pleaseEnterItems: "Vă rugăm să introduceți articolele cumpărate",
      pleaseEnterValidAmount: "Vă rugăm să introduceți o sumă validă",
      // Add these new translation keys here
      bookingDeletedSuccess: "Rezervare ștearsă cu succes",
      serviceDeletedSuccess: "Serviciu șters cu succes",
      serviceDeleteFailed: "Ștergerea serviciului a eșuat",
      bookingNotFound: "Rezervarea nu a fost găsită",
      notAuthorizedToModify: "Nu sunteți autorizat să modificați această rezervare",
      noBookingFound: "Nu s-a găsit nicio rezervare pentru acest client",
      paymentFailed: "Plata a eșuat",
      
      // Confirmation messages
      deleteBookingConfirm: "Sigur doriți să ștergeți rezervarea pentru",
      deleteBookingWarning: "Această acțiune va elimina definitiv toate serviciile, plățile și detaliile rezervării. Această acțiune nu poate fi anulată.",
      deleteServiceConfirm: "Sigur doriți să ștergeți serviciul",
      
      // Service Selection
      selectServiceCategory: "Selectați Categoria de Servicii",
      servicesTitle: "Servicii",
      customService: "Serviciu Personalizat",
      serviceName: "Numele Serviciului*",
      description: "Descriere",
      pricePerUnit: "Preț per",
      serviceTotalAmount: "Suma Totală",
      hourly: "Orar",
      daily: "Zilnic",
      nightly: "Nocturn",
      item: "Articol",
      noServicesFound: "Nu s-au găsit servicii",
      addCustom: "Adaugă personalizat",
      enterServiceName: "Introduceți numele serviciului",
      enterServiceDescription: "Introduceți descrierea serviciului",
      price: "Preț*",
      unit: "Unitate",
      addSpecialRequirements: "Adăugați cerințe sau informații speciale",
      failedToLoadCategories: "Nu s-au putut încărca categoriile de servicii",
      
      // Categories
      villas: "Vile",
      cars: "Mașini",
      boats: "Bărci și Iahturi",
      chefs: "Bucătari",
      restaurants: "Restaurante",
      tours: "Tururi",
      massages: "Masaje",
      shopping: "Cumpărături",
      
      // Payment Status
      partiallyPaid: "Parțial Plătit",
      notPaid: "Neplătit",
      
      // Booking Status
      confirmed: "Confirmat",
      pending: "În așteptare",
      cancelled: "Anulat",
      booked: "Rezervat",
      
      // Time indicators
      today: "Astăzi",
      tomorrow: "Mâine",
      inDays: "În",
      days: "zile",
      yesterday: "Ieri",
      daysAgo: "zile în urmă"
    },
    en: {
      // General
      viewingDataFor: "Viewing data for company:",
      bookingManager: "Booking Manager",
      loading: "Loading bookings...",
      error: "Error",
      errorLoading: "Error loading bookings:",
      
      // Authentication errors
      authError: "Authentication Error",
      userNotAuthenticated: "User not authenticated",
      userNotAuthorized: "User not authorized to access this application",
      noCompanyAssociation: "User has no company association",
      signOut: "Sign Out",
      
      // Filters & Search
      search: "Search client, booking...",
      sortBy: "Sort by",
      sortByDate: "Sort by Date",
      sortByClientName: "Sort by Client Name",
      sortByRecentActivity: "Sort by Recent Activity",
      sortByValue: "Sort by Value",
      
      // Tab filters
      upcoming: "Upcoming",
      activeNow: "Active Now",
      past: "Past",
      all: "All",
      
      // Results
      found: "Found",
      bookings: "bookings",
      booking: "booking",
      matching: "matching",
      
      // Empty states
      noBookingsFound: "No bookings found",
      noUpcomingBookings: "There are no upcoming bookings scheduled.",
      noActiveBookings: "There are no active bookings at the moment.",
      noPastBookings: "There are no past bookings to display.",
      noMatchingBookings: "There are no bookings that match your search criteria.",
      tryChangingSearch: "Try changing your search query",
      
      // Client Card
      guests: "guests",
      paymentProgress: "Payment Progress",
      servicesAndExtras: "Services & Extras",
      more: "more",
      
      // Action buttons
      details: "Details",
      paid: "Paid",
      pay: "Pay",
      service: "Service",
      shop: "Shop",
      
      // Bottom Sheet Titles
      clientDetails: "Client Details",
      addPayment: "Add Payment",
      editPayment: "Edit Payment",
      addService: "Add Service",
      serviceDetails: "Service Details",
      addShoppingExpense: "Add Shopping Expense",
      
      // Client Details
      clientId: "Client ID:",
      contactInformation: "Contact Information",
      totalValue: "Total value",
      checkIn: "Check-in:",
      checkOut: "Check-out:",
      deleteBooking: "Delete Booking",
      noAdditionalServices: "No additional services",
      paymentHistory: "Payment History",
      noPaymentsRecorded: "No payments recorded",
      addToBooking: "Add to Booking",
      paymentsTotal: "Total Payments",
      
      // Payments
      client: "Client:",
      amountDue: "Amount Due:",
      paymentAmount: "Payment Amount",
      paymentMethod: "Payment Method",
      cash: "Cash",
      card: "Card",
      transfer: "Transfer",
      crypto: "Crypto",
      receiptNumber: "Receipt Number (optional)",
      enterReceiptNumber: "Enter receipt number if available",
      notes: "Notes (optional)",
      addPaymentDetails: "Add payment details or reference",
      completePayment: "Complete Payment",
      
      // Services
      date: "Date:",
      quantity: "Quantity",
      deleteService: "Delete Service",
      
      // Shopping Form
      storeName: "Store Name*",
      storeNamePlaceholder: "E.g. Gucci, Supermarket, Pharmacy",
      itemsPurchased: "Items Purchased*",
      itemsPurchasedPlaceholder: "List of items purchased",
      totalAmount: "Total Amount*",
      receiptAvailable: "Receipt available",
      additionalNotes: "Additional notes",
      cancel: "Cancel",
      adding: "Adding...",
      shoppingAt: "Shopping at",
      
      // Messages
      noClientSelected: "No client selected",
      serviceAddedSuccess: "Service added successfully",
      failedAddService: "Failed to add service",
      shoppingExpenseSuccess: "Shopping expense added successfully",
      failedAddShopping: "Failed to add shopping expense",
      paymentSuccess: "Payment processed successfully",
      noClientsFound: "No clients found",
      pleaseEnterStore: "Please enter a store name",
      pleaseEnterItems: "Please enter items purchased",
      pleaseEnterValidAmount: "Please enter a valid amount",
      // Add these new translation keys here
      bookingDeletedSuccess: "Booking successfully deleted",
      serviceDeletedSuccess: "Service deleted successfully",
      serviceDeleteFailed: "Service deletion failed",
      bookingNotFound: "Booking not found",
      notAuthorizedToModify: "You are not authorized to modify this booking",
      noBookingFound: "No booking found for this client",
      paymentFailed: "Payment failed",
      
      // Confirmation messages
      deleteBookingConfirm: "Are you sure you want to delete the booking for",
      deleteBookingWarning: "This will permanently remove all services, payments, and booking details. This action cannot be undone.",
      deleteServiceConfirm: "Are you sure you want to delete the service",
      
      // Service Selection
      selectServiceCategory: "Select Service Category",
      servicesTitle: "Services",
      customService: "Custom Service",
      serviceName: "Service Name*",
      description: "Description",
      pricePerUnit: "Price per",
      serviceTotalAmount: "Total Amount",
      hourly: "Hourly",
      daily: "Daily",
      nightly: "Nightly",
      item: "Item",
      noServicesFound: "No services found",
      addCustom: "Add Custom",
      enterServiceName: "Enter service name",
      enterServiceDescription: "Enter service description",
      price: "Price*",
      unit: "Unit",
      addSpecialRequirements: "Add any special requirements or information",
      failedToLoadCategories: "Failed to load service categories",
      
      // Categories
      villas: "Villas",
      cars: "Cars",
      boats: "Boats & Yachts",
      chefs: "Chefs",
      restaurants: "Restaurants",
      tours: "Tours",
      massages: "Massages",
      shopping: "Shopping",
      
      // Payment Status
      partiallyPaid: "Partially Paid",
      notPaid: "Not Paid",
      
      // Booking Status
      confirmed: "Confirmed",
      pending: "Pending",
      cancelled: "Cancelled",
      booked: "Booked",
      
      // Time indicators
      today: "Today",
      tomorrow: "Tomorrow",
      inDays: "In",
      days: "days",
      yesterday: "Yesterday",
      daysAgo: "days ago"
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
    return paymentStatusColors[status]?.cssClass || 'bg-gray-100 text-gray-800';
  };
  
  const getBorderColorClass = (status) => {
    if (status === 'paid') return 'border-green-500';
    if (status === 'partiallyPaid') return 'border-yellow-500';
    return 'border-red-500';
  };
  
  // Return to main component scope to use its functions
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
      
      {/* Action buttons - call parent component functions */}
      <div className="flex border-t bg-gray-50">
  <button 
    className="flex-1 py-3 md:py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center"
    onClick={() => window.viewClientDetails(client.clientId)}
  >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t.details}
        </button>
        
        <button 
          className={`flex-1 py-2 text-center text-sm font-medium transition-colors flex items-center justify-center ${
            client.paymentStatus === 'paid' 
              ? 'text-green-700 bg-green-50'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => client.paymentStatus !== 'paid' ? window.openPaymentModal(client) : null}
          disabled={client.paymentStatus === 'paid'}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
          {client.paymentStatus === 'paid' ? t.paid : t.pay}
        </button>
        
        <button 
          className="flex-1 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center"
          onClick={() => window.openAddServiceModal(client)}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t.service}
        </button>
        
        <button 
          className="flex-1 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center"
          onClick={() => window.openAddShoppingModal(client)}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {t.shop}
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
  
  // Language handling
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'ro';
  });
  // Listen for language changes from settings page
  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(localStorage.getItem('appLanguage') || 'ro');
    };
    
    window.addEventListener('storage', handleLanguageChange);
    return () => window.removeEventListener('storage', handleLanguageChange);
  }, []);
  // Translations for the component
  const translations = {
    ro: {
      // General
      viewingDataFor: "Vizualizare date pentru compania:",
      bookingManager: "Manager Rezervări",
      loading: "Se încarcă rezervările...",
      error: "Eroare",
      errorLoading: "Eroare la încărcarea rezervărilor:",
      
      // Authentication errors
      authError: "Eroare de autentificare",
      userNotAuthenticated: "Utilizatorul nu este autentificat",
      userNotAuthorized: "Utilizatorul nu este autorizat să acceseze această aplicație",
      noCompanyAssociation: "Utilizatorul nu are asociere cu o companie",
      signOut: "Deconectare",
      
      // Filters & Search
      search: "Caută client, rezervare...",
      sortBy: "Sortează după",
      sortByDate: "Sortează după Dată",
      sortByClientName: "Sortează după Numele Clientului",
      sortByRecentActivity: "Sortează după Activitate Recentă",
      sortByValue: "Sortează după Valoare",
      
      // Tab filters
      upcoming: "Viitoare",
      activeNow: "Active Acum",
      past: "Trecute",
      all: "Toate",
      
      // Results
      found: "S-au găsit",
      bookings: "rezervări",
      booking: "rezervare",
      matching: "care se potrivesc cu",
      
      // Empty states
      noBookingsFound: "Nu s-au găsit rezervări",
      noUpcomingBookings: "Nu există rezervări viitoare programate.",
      noActiveBookings: "Nu există rezervări active în acest moment.",
      noPastBookings: "Nu există rezervări trecute de afișat.",
      noMatchingBookings: "Nu există rezervări care să corespundă criteriilor de căutare.",
      tryChangingSearch: "Încercați să modificați interogarea de căutare",
      
      // Client Card
      guests: "oaspeți",
      paymentProgress: "Progres Plată",
      servicesAndExtras: "Servicii și Extra",
      more: "mai multe",
      
      // Action buttons
      details: "Detalii",
      paid: "Plătit",
      pay: "Plătește",
      service: "Serviciu",
      shop: "Cumpărături",
      
      // Bottom Sheet Titles
      clientDetails: "Detalii Client",
      addPayment: "Adaugă Plată",
      editPayment: "Editează Plată",
      addService: "Adaugă Serviciu",
      serviceDetails: "Detalii Serviciu",
      
      // Client Details
      clientId: "ID Client:",
      contactInformation: "Informații de Contact",
      totalValue: "Valoare totală",
      checkIn: "Check-in:",
      checkOut: "Check-out:",
      deleteBooking: "Șterge Rezervarea",
      noAdditionalServices: "Fără servicii adiționale",
      paymentHistory: "Istoric Plăți",
      noPaymentsRecorded: "Nu există plăți înregistrate",
      addToBooking: "Adaugă la Rezervare",
      
      // Payments
      client: "Client:",
      amountDue: "Sumă de plată:",
      paymentAmount: "Suma Plății",
      paymentMethod: "Metoda de Plată",
      cash: "Numerar",
      card: "Card",
      transfer: "Transfer",
      crypto: "Crypto",
      receiptNumber: "Număr Chitanță (opțional)",
      enterReceiptNumber: "Introduceți numărul chitanței dacă este disponibil",
      notes: "Note (opțional)",
      addPaymentDetails: "Adăugați detalii de plată sau referință",
      completePayment: "Finalizează Plata",
      
      // Services
      date: "Data:",
      quantity: "Cantitate",
      deleteService: "Șterge Serviciul",
      
      // Shopping Form
      storeName: "Numele Magazinului*",
      storeNamePlaceholder: "Ex. Gucci, Supermarket, Farmacie",
      itemsPurchased: "Articole Cumpărate*",
      itemsPurchasedPlaceholder: "Lista articolelor cumpărate",
      totalAmount: "Suma Totală*",
      receiptAvailable: "Chitanță disponibilă",
      additionalNotes: "Note adiționale",
      cancel: "Anulează",
      // Fix: Removed duplicate key "addShoppingExpense" here
      adding: "Se adaugă...",
      shoppingAt: "Cumpărături la",
      addShoppingExpense: "Adaugă Cheltuială Cumpărături", // Only one instance of this key
      
      // Messages
      noClientSelected: "Niciun client selectat",
      serviceAddedSuccess: "Serviciu adăugat cu succes",
      failedAddService: "Eroare la adăugarea serviciului",
      shoppingExpenseSuccess: "Cheltuială de cumpărături adăugată cu succes",
      failedAddShopping: "Eroare la adăugarea cheltuielii de cumpărături",
      paymentSuccess: "Plată procesată cu succes",
      noClientsFound: "Nu s-au găsit clienți",
      pleaseEnterStore: "Vă rugăm să introduceți numele magazinului",
      pleaseEnterItems: "Vă rugăm să introduceți articolele cumpărate",
      pleaseEnterValidAmount: "Vă rugăm să introduceți o sumă validă",
      
      // Confirmation messages
      deleteBookingConfirm: "Sigur doriți să ștergeți rezervarea pentru",
      deleteBookingWarning: "Această acțiune va elimina definitiv toate serviciile, plățile și detaliile rezervării. Această acțiune nu poate fi anulată.",
      deleteServiceConfirm: "Sigur doriți să ștergeți serviciul",
      
      // Service Selection
      selectServiceCategory: "Selectați Categoria de Servicii",
      servicesTitle: "Servicii",
      customService: "Serviciu Personalizat",
      serviceName: "Numele Serviciului*",
      description: "Descriere",
      pricePerUnit: "Preț per",
      serviceTotalAmount: "Suma Totală",
      hourly: "Orar",
      daily: "Zilnic",
      nightly: "Nocturn",
      item: "Articol",
      noServicesFound: "Nu s-au găsit servicii",
      addCustom: "Adaugă personalizat",
      enterServiceName: "Introduceți numele serviciului",
      enterServiceDescription: "Introduceți descrierea serviciului",
      price: "Preț*",
      unit: "Unitate",
      addSpecialRequirements: "Adăugați cerințe sau informații speciale",
      failedToLoadCategories: "Nu s-au putut încărca categoriile de servicii",
      
      // Categories
      villas: "Vile",
      cars: "Mașini",
      boats: "Bărci și Iahturi",
      chefs: "Bucătari",
      restaurants: "Restaurante",
      tours: "Tururi",
      massages: "Masaje",
      shopping: "Cumpărături",
      
      // Payment Status
      partiallyPaid: "Parțial Plătit",
      notPaid: "Neplătit",
      
      // Booking Status
      confirmed: "Confirmat",
      pending: "În așteptare",
      cancelled: "Anulat",
      booked: "Rezervat",
      
      // Time indicators
      today: "Astăzi",
      tomorrow: "Mâine",
      inDays: "În",
      days: "zile",
      yesterday: "Ieri",
      daysAgo: "zile în urmă"
    },
    en: {
      // General
      viewingDataFor: "Viewing data for company:",
      bookingManager: "Booking Manager",
      loading: "Loading bookings...",
      error: "Error",
      errorLoading: "Error loading bookings:",
      
      // Authentication errors
      authError: "Authentication Error",
      userNotAuthenticated: "User not authenticated",
      userNotAuthorized: "User not authorized to access this application",
      noCompanyAssociation: "User has no company association",
      signOut: "Sign Out",
      
      // Filters & Search
      search: "Search client, booking...",
      sortBy: "Sort by",
      sortByDate: "Sort by Date",
      sortByClientName: "Sort by Client Name",
      sortByRecentActivity: "Sort by Recent Activity",
      sortByValue: "Sort by Value",
      
      // Tab filters
      upcoming: "Upcoming",
      activeNow: "Active Now",
      past: "Past",
      all: "All",
      
      // Results
      found: "Found",
      bookings: "bookings",
      booking: "booking",
      matching: "matching",
      
      // Empty states
      noBookingsFound: "No bookings found",
      noUpcomingBookings: "There are no upcoming bookings scheduled.",
      noActiveBookings: "There are no active bookings at the moment.",
      noPastBookings: "There are no past bookings to display.",
      noMatchingBookings: "There are no bookings that match your search criteria.",
      tryChangingSearch: "Try changing your search query",
      
      // Client Card
      guests: "guests",
      paymentProgress: "Payment Progress",
      servicesAndExtras: "Services & Extras",
      more: "more",
      
      // Action buttons
      details: "Details",
      paid: "Paid",
      pay: "Pay",
      service: "Service",
      shop: "Shop",
      
      // Bottom Sheet Titles
      clientDetails: "Client Details",
      addPayment: "Add Payment",
      editPayment: "Edit Payment",
      addService: "Add Service",
      serviceDetails: "Service Details",
      
      // Client Details
      clientId: "Client ID:",
      contactInformation: "Contact Information",
      totalValue: "Total value",
      checkIn: "Check-in:",
      checkOut: "Check-out:",
      deleteBooking: "Delete Booking",
      noAdditionalServices: "No additional services",
      paymentHistory: "Payment History",
      noPaymentsRecorded: "No payments recorded",
      addToBooking: "Add to Booking",
      
      // Payments
      client: "Client:",
      amountDue: "Amount Due:",
      paymentAmount: "Payment Amount",
      paymentMethod: "Payment Method",
      cash: "Cash",
      card: "Card",
      transfer: "Transfer",
      crypto: "Crypto",
      receiptNumber: "Receipt Number (optional)",
      enterReceiptNumber: "Enter receipt number if available",
      notes: "Notes (optional)",
      addPaymentDetails: "Add payment details or reference",
      completePayment: "Complete Payment",
      
      // Services
      date: "Date:",
      quantity: "Quantity",
      deleteService: "Delete Service",
      
      // Shopping Form
      storeName: "Store Name*",
      storeNamePlaceholder: "E.g. Gucci, Supermarket, Pharmacy",
      itemsPurchased: "Items Purchased*",
      itemsPurchasedPlaceholder: "List of items purchased",
      totalAmount: "Total Amount*",
      receiptAvailable: "Receipt available",
      additionalNotes: "Additional notes",
      cancel: "Cancel",
      // Fix: Removed duplicate key "addShoppingExpense" here
      adding: "Adding...",
      shoppingAt: "Shopping at",
      addShoppingExpense: "Add Shopping Expense", // Only one instance of this key
      
      // Messages
      noClientSelected: "No client selected",
      serviceAddedSuccess: "Service added successfully",
      failedAddService: "Failed to add service",
      shoppingExpenseSuccess: "Shopping expense added successfully",
      failedAddShopping: "Failed to add shopping expense",
      paymentSuccess: "Payment processed successfully",
      noClientsFound: "No clients found",
      pleaseEnterStore: "Please enter a store name",
      pleaseEnterItems: "Please enter items purchased",
      pleaseEnterValidAmount: "Please enter a valid amount",
      
      // Confirmation messages
      deleteBookingConfirm: "Are you sure you want to delete the booking for",
      deleteBookingWarning: "This will permanently remove all services, payments, and booking details. This action cannot be undone.",
      deleteServiceConfirm: "Are you sure you want to delete the service",
      
      // Service Selection
      selectServiceCategory: "Select Service Category",
      servicesTitle: "Services",
      customService: "Custom Service",
      serviceName: "Service Name*",
      description: "Description",
      pricePerUnit: "Price per",
      serviceTotalAmount: "Total Amount",
      hourly: "Hourly",
      daily: "Daily",
      nightly: "Nightly",
      item: "Item",
      noServicesFound: "No services found",
      addCustom: "Add Custom",
      enterServiceName: "Enter service name",
      enterServiceDescription: "Enter service description",
      price: "Price*",
      unit: "Unit",
      addSpecialRequirements: "Add any special requirements or information",
      failedToLoadCategories: "Failed to load service categories",
      
      // Categories
      villas: "Villas",
      cars: "Cars",
      boats: "Boats & Yachts",
      chefs: "Chefs",
      restaurants: "Restaurants",
      tours: "Tours",
      massages: "Massages",
      shopping: "Shopping",
      
      // Payment Status
      partiallyPaid: "Partially Paid",
      notPaid: "Not Paid",
      
      // Booking Status
      confirmed: "Confirmed",
      pending: "Pending",
      cancelled: "Cancelled",
      booked: "Booked",
      
      // Time indicators
      today: "Today",
      tomorrow: "Tomorrow",
      inDays: "In",
      days: "days",
      yesterday: "Yesterday",
      daysAgo: "days ago"
    }
  };
  // Get current translations
  const t = useMemo(() => translations[language], [language]);
  
  // Navigation and responsive design
  const navigate = useNavigate();
  const isDesktop = useMediaQuery({ minWidth: 768 });
  
  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [clientGroups, setClientGroups] = useState({});
  const [clientDetails, setClientDetails] = useState({});
  
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
  
  // Enhanced mobile touch handling for bottom sheet
  useEffect(() => {
    if (showBottomSheet && bottomSheetRef.current) {
      const element = bottomSheetRef.current;
      
      const handleTouchStart = (e) => {
        const startY = e.touches[0].clientY;
        let startTop = element.getBoundingClientRect().top;
        
        const handleTouchMove = (e) => {
          const currentY = e.touches[0].clientY;
          const deltaY = currentY - startY;
          
          if (deltaY > 0) {
            element.style.transform = `translateY(${deltaY}px)`;
            element.style.transition = 'none';
          }
        };
        
        const handleTouchEnd = (e) => {
          element.style.transition = 'transform 0.3s ease-out';
          const endY = e.changedTouches[0].clientY;
          const deltaY = endY - startY;
          
          if (deltaY > 100) {
            closeBottomSheet();
          } else {
            element.style.transform = 'translateY(0)';
          }
        };
        
        element.addEventListener('touchmove', handleTouchMove);
        element.addEventListener('touchend', handleTouchEnd);
        
        return () => {
          element.removeEventListener('touchmove', handleTouchMove);
          element.removeEventListener('touchend', handleTouchEnd);
        };
      };
      
      element.addEventListener('touchstart', handleTouchStart);
      return () => element.removeEventListener('touchstart', handleTouchStart);
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
      } else if (sortOption === 'totalValue') {
        return b.totalValue - a.totalValue; // Highest value first
      }
      return 0;
    });
  };
  
  // Bottom sheet handling
  const showBottomSheetWithContent = (content, item, secondaryItem = null) => {
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
    
    setShowBottomSheet(true);
  };
  
  const closeBottomSheet = () => {
    setShowBottomSheet(false);
    setTimeout(() => {
      setBottomSheetContent(null);
      setSelectedItem(null);
      setSelectedPayment(null);
      setSelectedService(null);
    }, 300);
  };
  
  // Click handlers
  const viewClientDetails = (clientId) => {
    const client = clientGroups[clientId];
    if (client) {
      showBottomSheetWithContent('client-details', client);
    }
  };
  
  const openPaymentModal = (client) => {
    if (client) {
      const dueAmount = client.dueAmount;
      setPaymentData({
        amount: dueAmount,
        method: 'cash',
        notes: '',
        receiptNumber: '',
        createdAt: new Date(),
        modifiedAt: new Date()
      });
      showBottomSheetWithContent('quick-payment', client);
    }
  };
  
  const openEditPaymentModal = (client, payment) => {
    if (client && payment) {
      showBottomSheetWithContent('edit-payment', client, payment);
    }
  };
  
  const openAddServiceModal = (client) => {
    if (client) {
      showBottomSheetWithContent('add-service', client);
    }
  };
  
  const openEditServiceModal = (client, service) => {
    if (client && service) {
      showBottomSheetWithContent('edit-service', client, service);
    }
  };
  
  const openAddShoppingModal = (client) => {
    if (client) {
      showBottomSheetWithContent('add-shopping', client);
    }
  };
  
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
   
    useEffect(() => {
      window.upcomingBookingsInstance = {
        viewClientDetails,
        openPaymentModal,
        openAddServiceModal,
        openAddShoppingModal
      };
      return () => {
        delete window.upcomingBookingsInstance;
      };
    }, [viewClientDetails, openPaymentModal, openAddServiceModal, openAddShoppingModal]);
    

  // Render main content based on loaded data
  const renderMainContent = () => {
    const filteredClients = getFilteredClients();
    
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
          <ClientCard key={client.clientId} client={client} />
        ))}
      </div>
    );
  };
  
  // Auth error state
  if (authError) {
    return (
      <div className="p-4 md:p-6 w-full max-w-screen-sm mx-auto bg-gray-50 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t.authError}</h2>
        </div>
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          <p className="font-medium">{t.authError}</p>
          <p>{safeRender(authError)}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            onClick={() => auth.signOut().then(() => navigate('/login'))}
          >
            {t.signOut}
          </button>
          {!isDesktop && <div className="h-24"></div>}
        </div>
      </div>
    );
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <CompanyIndicator companyId={userCompanyId} t={t} />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t.bookingManager}</h2>
        </div>
        <div className="flex justify-center items-center p-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-4 text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <CompanyIndicator companyId={userCompanyId} t={t} />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t.bookingManager}</h2>
        </div>
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          <p className="font-medium">{t.error}</p>
          <p>{t.errorLoading} {safeRender(error)}</p>
        </div>
      </div>
    );
  }
  
  // Main component render
  return (
    <div className="p-4 md:p-6 w-full max-w-screen-sm mx-auto bg-gray-50">
      <CompanyIndicator companyId={userCompanyId} t={t} />
      
      {/* Header with title and search */}
      <div className="mb-6">
  <div className="flex flex-col md:flex-row md:justify-between md:items-center">
    <h2 className="text-2xl font-bold mb-4 md:mb-0">{t.bookingManager}</h2>
    
    <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
      {/* Search */}
      <div className="relative w-full md:w-64">
        <input
          type="text"
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 md:py-2 border border-gray-300 rounded-md text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg className="absolute left-3 top-3.5 md:top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      
      {/* Sort by */}
      <select 
        className="w-full md:w-auto p-3 md:p-2 border border-gray-300 rounded-md text-base md:text-sm"
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
      >
              <option value="date">{t.sortByDate}</option>
              <option value="client">{t.sortByClientName}</option>
              <option value="lastActivity">{t.sortByRecentActivity}</option>
              <option value="totalValue">{t.sortByValue}</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Time-based filter tabs - made more intuitive with clear highlighting */}
      <div className="flex overflow-x-auto mb-6 border overflow-hidden rounded-lg bg-white">
  <button
    className={`flex-1 py-3 px-2 md:px-4 font-medium text-center transition-colors whitespace-nowrap ${timeFilter === 'upcoming' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
    onClick={() => setTimeFilter('upcoming')}
  >
    <div className="flex items-center justify-center">
      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="text-sm">{t.upcoming}</span>
    </div>
  </button>
        <button
          className={`flex-1 py-3 px-2 md:px-4 font-medium text-center transition-colors whitespace-nowrap ${timeFilter === 'active' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
          onClick={() => setTimeFilter('active')}
        >
          <div className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.activeNow}
          </div>
        </button>
        <button
          className={`flex-1 py-3 px-2 md:px-4 font-medium text-center transition-colors whitespace-nowrap ${timeFilter === 'past' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
          onClick={() => setTimeFilter('past')}
        >
          <div className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.past}
          </div>
        </button>
        <button
          className={`flex-1 py-3 px-2 md:px-4 font-medium text-center transition-colors whitespace-nowrap ${timeFilter === 'all' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
          onClick={() => setTimeFilter('all')}
        >
          <div className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {t.all}
          </div>
        </button>
      </div>
      
      {/* Results count */}
      <div className="mb-4">
        <div className="text-sm text-gray-600">
          {t.found} <span className="font-medium">{getFilteredClients().length}</span> {t.bookings}
          {timeFilter !== 'all' && ` (${timeFilter === 'upcoming' ? t.upcoming : timeFilter === 'active' ? t.activeNow : t.past})`}
          {searchQuery && ` ${t.matching} "${searchQuery}"`}
        </div>
      </div>
      
      {/* Main content */}
      <div className="mb-6">
        {renderMainContent()}
      </div>
      
      {/* Bottom Sheet with Enhanced Content */}
      {showBottomSheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center md:items-center">
  <div 
    className="bg-white rounded-t-xl md:rounded-xl w-full md:max-w-lg h-[85vh] md:h-auto max-h-[90vh] overflow-y-auto animate-slide-up"
    ref={bottomSheetRef}
  >
            {/* Bottom Sheet Header */}
            <div className="p-4 border-b sticky top-0 bg-white z-10">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 md:hidden"></div>
              <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {bottomSheetContent === 'client-details' ? t.clientDetails :
                bottomSheetContent === 'quick-payment' ? t.addPayment :
                bottomSheetContent === 'edit-payment' ? t.editPayment :
                bottomSheetContent === 'add-service' ? t.addService :
                bottomSheetContent === 'edit-service' ? t.serviceDetails :
                bottomSheetContent === 'add-shopping' ? t.addShoppingExpense : ''}
              </h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={closeBottomSheet}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Bottom Sheet Content */}
            <div>
              {/* CLIENT DETAILS VIEW */}
              {bottomSheetContent === 'client-details' && selectedItem && (
                <div className="p-4 text-gray-700">
                  {/* Client Header with Total Value */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold ${selectedItem.paymentStatus === 'paid' ? 'bg-green-500' : selectedItem.paymentStatus === 'partiallyPaid' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                        {getClientInitials(selectedItem.clientName)}
                      </div>
                      <div className="ml-3 min-w-0 flex-1 truncate">
  <h3 className="font-medium leading-tight truncate">{safeRender(client.clientName)}</h3>
                        <p className="text-sm text-gray-600">{t.clientId} {selectedItem.clientId.substring(0, 8)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{selectedItem.totalValue.toLocaleString()} €</div>
                      <p className="text-sm text-gray-600">{t.totalValue}</p>
                    </div>
                  </div>
                  
                  {/* Client Contact Information */}
                  {clientDetails[selectedItem.clientId] && (
                    <div className="mb-4 pb-4 border-b">
                      <h4 className="font-medium mb-2 text-gray-700">{t.contactInformation}</h4>
                      <div className="space-y-2">
                        {clientDetails[selectedItem.clientId].email && (
                          <div className="flex items-center text-sm">
                            <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <span>{safeRender(clientDetails[selectedItem.clientId].email)}</span>
                          </div>
                        )}
                        {clientDetails[selectedItem.clientId].phone && (
                          <div className="flex items-center text-sm">
                            <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            <span>{safeRender(clientDetails[selectedItem.clientId].phone)}</span>
                          </div>
                        )}
                        {clientDetails[selectedItem.clientId].address && (
                          <div className="flex items-start text-sm">
                            <svg className="w-5 h-5 mr-2 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span>{safeRender(clientDetails[selectedItem.clientId].address)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                        
                  {/* Bookings Summary - WITH DELETE BUTTON */}
                  <div className="mb-4 pb-4 border-b">
                    <h4 className="font-medium mb-2 text-gray-700">{t.bookings} ({selectedItem.bookings.length})</h4>
                    <div className="space-y-3">
                      {selectedItem.bookings.map((booking, idx) => (
                        <div key={booking.id || idx} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              {booking.accommodationType?.toLowerCase().includes('vil') 
                                ? <CategoryIcon type="villas" />
                                : booking.accommodationType?.toLowerCase().includes('boa') || 
                                  booking.accommodationType?.toLowerCase().includes('yac')
                                  ? <CategoryIcon type="yacht" />
                                : booking.accommodationType?.toLowerCase().includes('car')
                                  ? <CategoryIcon type="car" />
                                : <CategoryIcon type="services" />
                              }
                              <span className="font-medium ml-2">{safeRender(booking.accommodationType)}</span>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                              {getStatusText(booking.status)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">{t.checkIn}</span> {formatShortDate(booking.checkIn)}
                            </div>
                            <div>
                              <span className="text-gray-600">{t.checkOut}</span> {formatShortDate(booking.checkOut)}
                            </div>
                            <div>
                              <span className="text-gray-600">{t.guests}</span> {booking.guests || 'N/A'}
                            </div>
                            <div>
                              <span className="text-gray-600">{t.totalValue}</span> {booking.totalValue?.toLocaleString() || 0} €
                            </div>
                          </div>
                    
                          {/* DELETE BOOKING BUTTON */}
                          <div className="mt-3 flex justify-end">
                            <button 
                              className="py-1 px-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center"
                              onClick={() => handleDeleteBooking(selectedItem, booking)}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                              {t.deleteBooking}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
            
                  {/* Services List */}
                  <div className="mb-4 pb-4 border-b">
                    <h4 className="font-medium mb-2 text-gray-700">{t.servicesAndExtras} ({selectedItem.services.length})</h4>
                    {selectedItem.services.length === 0 ? (
                      <div className="text-center py-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                        {t.noAdditionalServices}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedItem.services.map((service, idx) => (
                          <div 
                            key={idx} 
                            className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                            onClick={() => openEditServiceModal(selectedItem, service)}
                          >
                            <div className="flex items-center">
                              <CategoryIcon type={service.type || "services"} />
                              <div className="ml-2">
                                <div className="font-medium text-sm">{safeRender(service.name)}</div>
                                <div className="text-xs text-gray-500">{formatShortDate(service.date)}</div>
                              </div>
                            </div>
                            <div className="text-sm font-medium">
                              {service.price * service.quantity} €
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Payment History */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 text-gray-700">{t.paymentHistory} ({selectedItem.paymentHistory.length})</h4>
                    {selectedItem.paymentHistory.length === 0 ? (
                      <div className="text-center py-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                        {t.noPaymentsRecorded}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedItem.paymentHistory.map((payment, idx) => (
                          <div 
                            key={idx} 
                            className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                            onClick={() => openEditPaymentModal(selectedItem, payment)}
                          >
                            <div className="flex items-center">
                              <PaymentIcon type={payment.method} />
                              <div className="ml-2">
                                <div className="font-medium text-sm">{payment.amount.toLocaleString()} €</div>
                                <div className="text-xs text-gray-500">{formatLongDate(payment.date)}</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {payment.method}
                              </span>
                              <svg className="w-5 h-5 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                      className="py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center"
                      onClick={() => {
                        closeBottomSheet();
                        openAddServiceModal(selectedItem);
                      }}
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      {t.addService}
                    </button>
                    
                    <button 
                      className={`py-2 px-4 rounded-lg font-medium flex items-center justify-center ${
                        selectedItem.paymentStatus === 'paid'
                          ? 'bg-gray-200 text-gray-500'
                          : 'bg-green-500 text-white hover:bg-green-600 transition-colors'
                      }`}
                      onClick={() => {
                        closeBottomSheet();
                        if (selectedItem.paymentStatus !== 'paid') {
                          openPaymentModal(selectedItem);
                        }
                      }}
                      disabled={selectedItem.paymentStatus === 'paid'}
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
                      </svg>
                      {t.addPayment}
                    </button>
                  </div>
                </div>
              )}
              
              {/* PAYMENT FORM */}
              {(bottomSheetContent === 'quick-payment' || bottomSheetContent === 'edit-payment') && selectedItem && (
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{t.client}</p>
                      <p className="text-gray-700">{safeRender(selectedItem.clientName)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{t.amountDue}</p>
                      <p className="text-lg font-semibold text-red-600">{selectedItem.dueAmount.toLocaleString()} €</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.paymentAmount}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                        className="w-full pl-8 pr-4 py-3 md:py-2 border border-gray-300 rounded-md text-base md:text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">€</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.paymentMethod}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <button 
                        type="button" 
                        onClick={() => setPaymentData({...paymentData, method: 'cash'})}
                        className={`flex flex-col items-center justify-center p-2 border rounded-md ${paymentData.method === 'cash' ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
                      >
                        <PaymentIcon type="cash" size="large" />
                        <span className="mt-1 text-xs">{t.cash}</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setPaymentData({...paymentData, method: 'card'})}
                        className={`flex flex-col items-center justify-center p-2 border rounded-md ${paymentData.method === 'card' ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
                      >
                        <PaymentIcon type="card" size="large" />
                        <span className="mt-1 text-xs">{t.card}</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setPaymentData({...paymentData, method: 'bankTransfer'})}
                        className={`flex flex-col items-center justify-center p-2 border rounded-md ${paymentData.method === 'bankTransfer' ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
                      >
                        <PaymentIcon type="bankTransfer" size="large" />
                        <span className="mt-1 text-xs">{t.transfer}</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setPaymentData({...paymentData, method: 'crypto'})}
                        className={`flex flex-col items-center justify-center p-2 border rounded-md ${paymentData.method === 'crypto' ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
                      >
                        <PaymentIcon type="crypto" size="large" />
                        <span className="mt-1 text-xs">{t.crypto}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.receiptNumber}
                    </label>
                    <input
                      type="text"
                      value={paymentData.receiptNumber}
                      onChange={(e) => setPaymentData({...paymentData, receiptNumber: e.target.value})}
                      placeholder={t.enterReceiptNumber}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.notes}
                    </label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                      placeholder={t.addPaymentDetails}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                  </div>
                  
                  <button
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    onClick={() => handleQuickPayment(selectedItem, paymentData.amount)}
                    disabled={paymentData.amount <= 0}
                  >
                    {t.completePayment}
                  </button>
                </div>
              )}
              
              {/* SERVICE SELECTION */}
              {bottomSheetContent === 'add-service' && (
                <ServiceSelectionPanel 
                  onServiceAdded={handleServiceSelectionAdd}
                  onCancel={closeBottomSheet}
                  userCompanyId={userCompanyId}
                  t={t}
                />
              )}
              
              {/* SERVICE DETAILS */}
              {bottomSheetContent === 'edit-service' && selectedItem && selectedService && (
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <CategoryIcon type={selectedService.type || "services"} />
                      <span className="ml-2 font-medium capitalize">{selectedService.type}</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(selectedService.status || 'confirmed')}`}>
                      {getStatusText(selectedService.status || 'confirmed')}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{safeRender(selectedService.name)}</h4>
                    <div className="text-lg font-bold">{(selectedService.price * selectedService.quantity).toLocaleString()} €</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">
                      {t.date} {formatShortDate(selectedService.date)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedService.quantity} × {selectedService.price.toLocaleString()} € / {selectedService.unit}
                    </div>
                    {selectedService.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded border text-sm">
                        {safeRender(selectedService.notes)}
                      </div>
                    )}
                  </div>
                  
                  <button
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                    onClick={() => handleDeleteService(selectedItem, selectedService)}
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    {t.deleteService}
                  </button>
                </div>
              )}
              
              {/* SHOPPING EXPENSE FORM */}
              {bottomSheetContent === 'add-shopping' && (
                <ShoppingExpenseForm
                  onAddShopping={handleShoppingFormSubmit}
                  onCancel={closeBottomSheet}
                  userCompanyId={userCompanyId}
                  t={t}
                />
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
      
      {/* Mobile navigation */}
      {!isDesktop && (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-10" style={{paddingBottom: 'var(--sat-bottom, 0px)'}}>
          <div className="grid grid-cols-4 h-16">
            <button
              className="flex flex-col items-center justify-center"
              onClick={() => setTimeFilter('upcoming')}
            >
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs mt-1">{t.upcoming}</span>
            </button>
            
            <button
              className="flex flex-col items-center justify-center"
              onClick={() => {
                const clients = getFilteredClients();
                if (clients.length > 0) {
                  openPaymentModal(clients[0]);
                } else {
                  showNotificationMessage(t.noClientsFound, 'error');
                }
              }}
            >
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span className="text-xs mt-1">{t.pay}</span>
            </button>
            
            <button
              className="flex flex-col items-center justify-center"
              onClick={() => {
                const clients = getFilteredClients();
                if (clients.length > 0) {
                  openAddServiceModal(clients[0]);
                } else {
                  showNotificationMessage(t.noClientsFound, 'error');
                }
              }}
            >
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-xs mt-1">{t.service}</span>
            </button>
            
            <button
              className="flex flex-col items-center justify-center"
              onClick={() => {
                const clients = getFilteredClients();
                if (clients.length > 0) {
                  openAddShoppingModal(clients[0]);
                } else {
                  showNotificationMessage(t.noClientsFound, 'error');
                }
              }}
            >
              <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="text-xs mt-1">{t.shop}</span>
            </button>
          </div>
          
          {/* Add padding to prevent content from being hidden behind the menu */}
          <div className="h-16"></div>
        </div>
      )}
    </div>
  );
};

// Make the functions available in the global window object for clientCard to access
window.viewClientDetails = (clientId) => {
  // Implemented by the ClientCard component to call back to the main component
  if (typeof window.upcomingBookingsInstance?.viewClientDetails === 'function') {
    window.upcomingBookingsInstance.viewClientDetails(clientId);
  }
};

window.openPaymentModal = (client) => {
  if (typeof window.upcomingBookingsInstance?.openPaymentModal === 'function') {
    window.upcomingBookingsInstance.openPaymentModal(client);
  }
};

window.openAddServiceModal = (client) => {
  if (typeof window.upcomingBookingsInstance?.openAddServiceModal === 'function') {
    window.upcomingBookingsInstance.openAddServiceModal(client);
  }
};

window.openAddShoppingModal = (client) => {
  if (typeof window.upcomingBookingsInstance?.openAddShoppingModal === 'function') {
    window.upcomingBookingsInstance.openAddShoppingModal(client);
  }
};

export default UpcomingBookings;