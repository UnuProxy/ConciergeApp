import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useLanguage } from '../utils/languageHelper';
import OffersOverview from '../components/OffersOverview';

const DASHBOARD_TRANSLATIONS = {
  en: {
    greetings: {
      morning: 'Good Morning',
      afternoon: 'Good Afternoon',
      evening: 'Good Evening'
    },
    loading: 'Loading Elite Dashboard...',
    labels: {
      activeRequests: 'Active Requests',
      currentWeek: 'Current week',
      pending: 'Pending',
      requiresAttention: 'Requires attention',
      todayRevenue: 'Today Revenue',
      revenueStatus: 'Revenue Status',
      activeStatus: 'Active',
      pendingStatus: 'Pending',
      todayPerformance: "Today's performance",
      vipClients: 'VIP Clients',
      totalPortfolio: 'Total portfolio',
      offersFollowup: 'Offers to follow up',
      offersSubtitle: 'Follow up on pending offers',
      commandCenter: 'Command Center',
      administrator: 'Administrator',
      access: 'Access',
      at: 'at'
    },
    roles: {
      admin: 'Administrator',
      manager: 'Manager',
      user: 'User',
      employee: 'Employee',
      agent: 'Agent'
    },
    actions: {
      reservations: 'Reservations',
      luxuryBookings: 'Luxury Bookings',
      vipClients: 'VIP Clients',
      clientRelations: 'Client Relations',
      conciergeServices: 'Concierge Services',
      servicePortfolio: 'Service Portfolio',
      propertyPortfolio: 'Property Portfolio',
      villasEstates: 'Villas & Estates',
      fleetManagement: 'Fleet Management',
      yachtsVehicles: 'Yachts & Vehicles',
      financialControl: 'Financial Control',
      revenueAnalytics: 'Revenue Analytics',
      currentBookings: 'Current Bookings',
      clientDirectory: 'Client Directory',
      serviceRequests: 'Service Requests',
      availableProperties: 'Available Properties'
    },
    sections: {
      executiveControl: 'Executive Control',
      userManagement: 'User Management',
      teamAccessControl: 'Team access control',
      financialOverview: 'Financial Overview',
      systemControl: 'System Control',
      platformConfiguration: 'Platform configuration',
      recentActivity: 'Recent Activity',
      vipArrivals: 'VIP Arrivals'
    },
    empty: {
      noRecentActivity: 'No recent activity',
      noUpcomingArrivals: 'No upcoming arrivals'
    },
    timeAgo: {
      justNow: 'Just now',
      oneMinute: '1 min ago',
      minutes: '{count}m ago',
      oneHour: '1h ago',
      hours: '{count}h ago',
      oneDay: '1d ago',
      days: '{count}d ago'
    },
    priorityLabels: {
      urgent: 'Urgent',
      high: 'High priority',
      normal: 'Normal'
    },
    statusLabels: {
      paid: 'Paid',
      partiallyPaid: 'Partially paid',
      partially_paid: 'Partially paid',
      pending: 'Pending',
      notPaid: 'Not paid',
      cancelled: 'Cancelled',
      confirmed: 'Confirmed'
    },
    misc: {
      unknownClient: 'Unknown client',
      moreServices: '+{count} more'
    }
  },
  ro: {
    greetings: {
      morning: 'Bună dimineața',
      afternoon: 'Bună ziua',
      evening: 'Bună seara'
    },
    loading: 'Se încarcă tabloul de bord...',
    labels: {
      activeRequests: 'Solicitări active',
      currentWeek: 'Săptămâna curentă',
      pending: 'În așteptare',
      requiresAttention: 'Necesită atenție',
      todayRevenue: 'Venituri azi',
      revenueStatus: 'Stare venituri',
      activeStatus: 'Activ',
      pendingStatus: 'În așteptare',
      todayPerformance: 'Performanța de azi',
      vipClients: 'Clienți VIP',
      totalPortfolio: 'Portofoliu total',
      offersFollowup: 'Oferte de urmărit',
      offersSubtitle: 'Urmărește ofertele rămase în așteptare',
      commandCenter: 'Centru de comandă',
      administrator: 'Administrator',
      access: 'Acces',
      at: 'la'
    },
    roles: {
      admin: 'Administrator',
      manager: 'Manager',
      user: 'Utilizator',
      employee: 'Angajat',
      agent: 'Agent'
    },
    actions: {
      reservations: 'Rezervări',
      luxuryBookings: 'Rezervări luxury',
      vipClients: 'Clienți VIP',
      clientRelations: 'Relații clienți',
      conciergeServices: 'Servicii Concierge',
      servicePortfolio: 'Portofoliu servicii',
      propertyPortfolio: 'Portofoliu proprietăți',
      villasEstates: 'Vile & Proprietăți',
      fleetManagement: 'Administrare flotă',
      yachtsVehicles: 'Iahturi & Vehicule',
      financialControl: 'Control financiar',
      revenueAnalytics: 'Analiză venituri',
      currentBookings: 'Rezervări curente',
      clientDirectory: 'Agenda clienților',
      serviceRequests: 'Solicitări servicii',
      availableProperties: 'Proprietăți disponibile'
    },
    sections: {
      executiveControl: 'Control executiv',
      userManagement: 'Administrare utilizatori',
      teamAccessControl: 'Control acces echipă',
      financialOverview: 'Prezentare financiară',
      systemControl: 'Control sistem',
      platformConfiguration: 'Configurare platformă',
      recentActivity: 'Activitate recentă',
      vipArrivals: 'Sosiri VIP'
    },
    empty: {
      noRecentActivity: 'Nu există activitate recentă',
      noUpcomingArrivals: 'Nu există sosiri viitoare'
    },
    timeAgo: {
      justNow: 'Chiar acum',
      oneMinute: 'Acum 1 minut',
      minutes: 'Acum {count} minute',
      oneHour: 'Acum 1 oră',
      hours: 'Acum {count} ore',
      oneDay: 'Acum 1 zi',
      days: 'Acum {count} zile'
    },
    priorityLabels: {
      urgent: 'Urgent',
      high: 'Prioritar',
      normal: 'Normal'
    },
    statusLabels: {
      paid: 'Plătit',
      partiallyPaid: 'Parțial plătit',
      partially_paid: 'Parțial plătit',
      pending: 'În așteptare',
      notPaid: 'Neplătit',
      cancelled: 'Anulat',
      confirmed: 'Confirmat'
    },
    misc: {
      unknownClient: 'Client necunoscut',
      moreServices: '+{count} mai multe'
    }
  }
};

function Dashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';
  const t = DASHBOARD_TRANSLATIONS[language] || DASHBOARD_TRANSLATIONS.en;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [userCompanyId, setUserCompanyId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    quickStats: {
      activeRequests: 0,
      pendingBookings: 0,
      todayRevenue: 0
    },
    recentActivity: [],
    upcomingBookings: [],
    offers: []
  });
  const [offersLoading, setOffersLoading] = useState(true);

  const formatCount = (template, count) => {
    if (!template) return `+${count}`;
    return template.replace('{count}', count);
  };

  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const getLocalizedValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      return value[language] || value.en || value.ro || '';
    }
    return '';
  };

  const getClientDisplayName = (client) => {
    if (!client) return '';
    const fromName = getLocalizedValue(client.name);
    if (fromName) return fromName;
    const full = getLocalizedValue(client.fullName) || getLocalizedValue(client.companyName);
    if (full) return full;
    const composed = [client.firstName, client.lastName].filter(Boolean).join(' ');
    return composed;
  };

  const isGenericServiceLabel = (label) => {
    if (!label) return false;
    const normalized = String(label).trim().toLowerCase();
    return normalized === 'various services' || normalized === 'check-in';
  };

  const extractServiceItems = (servicesField) => {
    if (Array.isArray(servicesField)) return servicesField;
    if (servicesField && typeof servicesField === 'object') {
      return Object.values(servicesField).flatMap(value => (
        Array.isArray(value) ? value : value ? [value] : []
      ));
    }
    return [];
  };

  const getServiceItemName = (serviceItem) => {
    if (!serviceItem) return '';
    if (typeof serviceItem === 'string') return serviceItem;
    return (
      getLocalizedValue(serviceItem.name) ||
      getLocalizedValue(serviceItem.title) ||
      getLocalizedValue(serviceItem.type) ||
      getLocalizedValue(serviceItem.serviceType) ||
      getLocalizedValue(serviceItem.service) ||
      getLocalizedValue(serviceItem.category)
    );
  };

  const getServiceItemTotal = (serviceItem) => {
    if (!serviceItem) return 0;
    const explicitTotal = toNumber(serviceItem.totalValue || serviceItem.totalAmount);
    if (explicitTotal > 0) return explicitTotal;
    const unitPrice = toNumber(serviceItem.price || serviceItem.clientAmount || serviceItem.amount);
    const quantity = Math.max(1, toNumber(serviceItem.quantity || 1));
    return unitPrice * quantity;
  };

  const getServiceNamesFromBooking = (booking) => {
    if (!booking) return [];
    const services = [
      ...extractServiceItems(booking.services),
      ...extractServiceItems(booking.selectedServices),
      ...extractServiceItems(booking.bookingServices)
    ];
    const names = services.map(getServiceItemName).filter(Boolean);
    return [...new Set(names)];
  };

  const formatServiceSummary = (names) => {
    if (!names.length) return '';
    if (names.length <= 2) return names.join(', ');
    const extraLabel = formatCount(t.misc.moreServices, names.length - 2);
    return `${names.slice(0, 2).join(', ')} ${extraLabel}`.trim();
  };

  const getBookingServiceSummary = (booking) => {
    if (!booking) return t.actions.reservations;
    const accommodationLabel = getLocalizedValue(booking.accommodationType);
    if (accommodationLabel && !isGenericServiceLabel(accommodationLabel)) {
      return accommodationLabel;
    }
    const serviceNames = getServiceNamesFromBooking(booking);
    if (serviceNames.length > 0) {
      return formatServiceSummary(serviceNames);
    }
    const directLabel = [
      booking.serviceType,
      booking.service,
      booking.category,
      booking.propertyName,
      booking.villaName,
      booking.serviceName
    ].map(getLocalizedValue).find(label => label && !isGenericServiceLabel(label));
    if (directLabel) return directLabel;
    return accommodationLabel || t.actions.reservations;
  };

  const getBookingTotalValue = (booking) => {
    if (!booking) return 0;
    const direct = toNumber(
      booking.totalValue ??
      booking.totalAmount ??
      booking.baseAmount ??
      booking.clientAmount ??
      booking.clientIncome ??
      booking.amount ??
      0
    );
    if (direct > 0) return direct;
    const services = [
      ...extractServiceItems(booking.services),
      ...extractServiceItems(booking.selectedServices),
      ...extractServiceItems(booking.bookingServices)
    ];
    if (services.length > 0) {
      return services.reduce((sum, serviceItem) => sum + getServiceItemTotal(serviceItem), 0);
    }
    return 0;
  };

  const normalizePaymentStatus = (status) => {
    if (!status) return '';
    const raw = String(status).trim().toLowerCase();
    if (!raw) return '';
    if (raw === 'paid') return 'paid';
    if (raw === 'partiallypaid' || raw === 'partially_paid' || raw === 'partial') return 'partiallyPaid';
    if (raw === 'notpaid' || raw === 'not_paid' || raw === 'unpaid') return 'notPaid';
    if (raw === 'pending') return 'pending';
    return status;
  };

  const getBookingPaidAmount = (booking) => {
    if (!booking) return 0;
    const direct = toNumber(
      booking.paidAmount ??
      booking.totalPaid ??
      booking.amountPaid ??
      booking.clientPaidAmount ??
      0
    );
    const historyTotal = Array.isArray(booking.paymentHistory)
      ? booking.paymentHistory.reduce((sum, payment) => sum + toNumber(payment.amount || 0), 0)
      : 0;
    const services = [
      ...extractServiceItems(booking.services),
      ...extractServiceItems(booking.selectedServices),
      ...extractServiceItems(booking.bookingServices)
    ];
    const servicesPaid = services.length > 0
      ? services.reduce((sum, serviceItem) => sum + toNumber(serviceItem?.amountPaid || 0), 0)
      : 0;
    return Math.max(direct, historyTotal, servicesPaid);
  };

  const getBookingPaymentStatus = (booking) => {
    if (!booking) return 'pending';
    const total = getBookingTotalValue(booking);
    const paid = getBookingPaidAmount(booking);
    if (total > 0) {
      if (paid >= total) return 'paid';
      if (paid > 0) return 'partiallyPaid';
      return 'notPaid';
    }
    return normalizePaymentStatus(booking.paymentStatus) || 'pending';
  };

  const getBookingClientName = (booking, clientsById) => {
    if (!booking) return t.misc.unknownClient;
    const direct = getLocalizedValue(booking.clientName) ||
      getLocalizedValue(booking.client?.name) ||
      getLocalizedValue(booking.client?.fullName);
    if (direct) return direct;
    if (booking.clientId && clientsById?.has(booking.clientId)) {
      return getClientDisplayName(clientsById.get(booking.clientId)) || t.misc.unknownClient;
    }
    return t.misc.unknownClient;
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Get user authorization and company info
  useEffect(() => {
    const fetchUserAuth = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          setLoading(false);
          return;
        }

        // Prefer users/{uid} (allowed by rules); fallback to authorized_users with lowercase email
        let userData = null;
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          userData = userDocSnap.data();
        } else {
          const authorizedUsersRef = collection(db, 'authorized_users');
          const authorizedQuery = query(
            authorizedUsersRef,
            where('email', '==', user.email.toLowerCase())
          );
          
          const authorizedSnapshot = await getDocs(authorizedQuery);
          
          if (authorizedSnapshot.empty) {
            console.error('User not authorized');
            navigate('/login');
            setLoading(false);
            return;
          }
  
          const authorizedUserDoc = authorizedSnapshot.docs[0];
          userData = authorizedUserDoc.data();
        }

        if (!userData?.companyId) {
          console.error('No company assigned to user');
          navigate('/login');
          setLoading(false);
          return;
        }

        setUserInfo(userData);
        setUserCompanyId(userData.companyId);
        
      } catch (error) {
        console.error('Error fetching user auth:', error);
        setLoading(false);
      }
    };

    fetchUserAuth();
  }, [navigate]);

  // If we still don't have a company ID after auth init, stop loading so we render the fallback UI
  useEffect(() => {
    if (userCompanyId === null && auth.currentUser) {
      setLoading(false);
    }
  }, [userCompanyId]);

  // Fetch offers data separately and validate clients exist
  useEffect(() => {
    if (!userCompanyId) return;

    const fetchOffers = async () => {
      try {
        setOffersLoading(true);
        
        // Fetch all offers for this company
        const offersQuery = query(
          collection(db, 'offers'),
          where('companyId', '==', userCompanyId)
        );
        const offersSnapshot = await getDocs(offersQuery);
        const allOffers = offersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Fetch all clients to validate offers
        const clientsQuery = query(
          collection(db, 'clients'),
          where('companyId', '==', userCompanyId)
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientIds = new Set(clientsSnapshot.docs.map(doc => doc.id));
        
        // Filter out offers from deleted clients
        const validOffers = allOffers.filter(offer => 
          offer.clientId && clientIds.has(offer.clientId)
        );
        
        // Log orphaned offers for cleanup
        const orphanedOffers = allOffers.filter(offer => 
          !offer.clientId || !clientIds.has(offer.clientId)
        );
        
        if (orphanedOffers.length > 0) {
  // console.log(`Found ${orphanedOffers.length} orphaned offers from deleted clients`); // Removed for production
        }
        
        setDashboardData(prev => ({
          ...prev,
          offers: validOffers
        }));
      } catch (error) {
        console.error('Error fetching offers:', error);
        setDashboardData(prev => ({
          ...prev,
          offers: []
        }));
      } finally {
        setOffersLoading(false);
      }
    };

    fetchOffers();
  }, [userCompanyId]);

  // Fetch dashboard data
  useEffect(() => {
    if (!userCompanyId) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
    
        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('companyId', '==', userCompanyId)
        );
        const clientsQuery = query(
          collection(db, 'clients'),
          where('companyId', '==', userCompanyId)
        );
        const [reservationsSnapshot, clientsSnapshot] = await Promise.all([
          getDocs(reservationsQuery),
          getDocs(clientsQuery)
        ]);
        const reservations = [];
        const clientsById = new Map(clientsSnapshot.docs.map(doc => [doc.id, doc.data()]));
        let todayRevenue = 0;
        let pendingCount = 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        reservationsSnapshot.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          reservations.push(data);
          
          const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
          if (createdAt >= today) {
            todayRevenue += getBookingTotalValue(data);
          }
          
          if (data.status === 'pending' || data.paymentStatus === 'notPaid') {
            pendingCount++;
          }
        });

        const recentActivity = [...reservations]
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 6)
          .map(item => {
            const createdAt = item.createdAt?.toDate?.() || new Date(item.createdAt || Date.now());
            const bookingStatus = item.status || 'confirmed';
            const clientName = getBookingClientName(item, clientsById);
            const serviceSummary = getBookingServiceSummary(item);
            return {
              id: item.id,
              type: 'booking',
              client: clientName,
              accommodationType: serviceSummary,
              bookingStatus,
              status: getBookingPaymentStatus(item),
              value: getBookingTotalValue(item),
              createdAt
            };
          });

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const upcomingBookings = reservations
          .filter(booking => {
            if (!booking.checkIn) return false;
            const checkInDate = booking.checkIn.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn);
            if (checkInDate < today) return false;
            const client = booking.clientId ? clientsById.get(booking.clientId) : null;
            const isVip = client?.isVip || client?.clientType === 'vip' || booking.isVip || booking.clientType === 'vip';
            return Boolean(isVip);
          })
          .sort((a, b) => {
            const dateA = a.checkIn.toDate ? a.checkIn.toDate() : new Date(a.checkIn);
            const dateB = b.checkIn.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
            return dateA - dateB;
          })
          .slice(0, 3)
          .map(booking => {
            const checkInDate = booking.checkIn.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn);
            const isToday = checkInDate.toDateString() === today.toDateString();
            const isTomorrow = checkInDate.toDateString() === tomorrow.toDateString();
            const clientName = getBookingClientName(booking, clientsById);
            const serviceSummary = getBookingServiceSummary(booking);
            const title = [serviceSummary, clientName].filter(Boolean).join(' - ');
            
            return {
              id: booking.id,
              title,
              checkInDate,
              priority: isToday ? 'urgent' : isTomorrow ? 'high' : 'normal',
              value: getBookingTotalValue(booking),
              type: 'checkin'
            };
          });

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const activeRequests = reservations.filter(booking => {
          const createdAt = booking.createdAt?.toDate?.() || new Date(booking.createdAt);
          return createdAt >= weekAgo && (booking.status === 'confirmed' || booking.status === 'pending');
        }).length;

        setDashboardData({
          quickStats: {
            activeRequests,
            pendingBookings: pendingCount,
            todayRevenue
          },
          recentActivity,
          upcomingBookings
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // If permission or data issues, render an empty dashboard instead of a blank screen
        setDashboardData({
          quickStats: { activeRequests: 0, pendingBookings: 0, todayRevenue: 0 },
          recentActivity: [],
          upcomingBookings: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userCompanyId, language]);

  const formatRelative = (template, count) => template.replace('{count}', count);

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return t.timeAgo.justNow;
    if (diffInMinutes === 1) return t.timeAgo.oneMinute;
    if (diffInMinutes < 60) return formatRelative(t.timeAgo.minutes, diffInMinutes);
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return t.timeAgo.oneHour;
    if (diffInHours < 24) return formatRelative(t.timeAgo.hours, diffInHours);
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return t.timeAgo.oneDay;
    return formatRelative(t.timeAgo.days, diffInDays);
  };

  // Premium Icons - Perfectly matched to functions
  const IconReservations = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );

  const IconVIPClients = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  );

  const IconConciergeServices = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  const IconPropertyPortfolio = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );

  const IconFinancialControl = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  // Premium action sets - mobile optimized
  const buildAdminActions = () => [
    {
      title: t.actions.reservations,
      subtitle: t.actions.luxuryBookings,
      action: () => navigate('/reservations'),
      icon: IconReservations,
      primary: true
    },
    {
      title: t.actions.vipClients,
      subtitle: t.actions.clientRelations,
      action: () => navigate('/clients/existing'),
      icon: IconVIPClients,
      primary: true
    },
    {
      title: t.actions.financialControl,
      subtitle: t.actions.revenueAnalytics,
      action: () => navigate('/finance'),
      icon: IconFinancialControl,
      primary: true
    }
  ];

  const buildEmployeeActions = () => [
    {
      title: t.actions.reservations,
      subtitle: t.actions.currentBookings,
      action: () => navigate('/reservations'),
      icon: IconReservations,
      primary: true
    },
    {
      title: t.actions.vipClients,
      subtitle: t.actions.clientDirectory,
      action: () => navigate('/clients/existing'),
      icon: IconVIPClients,
      primary: true
    },
    {
      title: t.actions.conciergeServices,
      subtitle: t.actions.serviceRequests,
      action: () => navigate('/services/villas'),
      icon: IconConciergeServices,
      primary: false
    }
  ];

  const quickActions = userInfo?.role === 'admin' ? buildAdminActions() : buildEmployeeActions();

  const roleLabel = t.roles[userInfo?.role] || (userInfo?.role ? userInfo.role : t.roles.user);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return t.greetings.morning;
    if (hour < 17) return t.greetings.afternoon;
    return t.greetings.evening;
  };

  const formatCurrency = (amount = 0) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `€${amount || 0}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!userCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.labels.commandCenter}</h2>
          <p className="text-gray-600 mb-4">No company selected or access missing.</p>
          <button
            onClick={() => navigate('/select-company')}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Go to company selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        {/* Mobile-Optimized Premium Header */}
        <div className="mb-8 lg:mb-16">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-start mb-4">
                <div className="w-1 h-12 lg:h-16 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full mr-4 lg:mr-6 flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extralight text-gray-900 mb-2 tracking-tight leading-tight">
                    {getGreeting()}
                  </h1>
                  <p className="text-gray-600 text-base lg:text-xl font-light">
                    {userInfo?.name && `${userInfo.name} • `}{userInfo?.companyName}
                  </p>
                </div>
              </div>
              
              {/* Mobile-Friendly Role Badge */}
              <div className="flex items-center">
                <div className={`px-4 py-2 rounded-full border ${
                  userInfo?.role === 'admin' 
                    ? 'bg-amber-50 border-amber-200 text-amber-800' 
                    : 'bg-gray-100 border-gray-300 text-gray-700'
                } backdrop-blur-sm`}>
                  <span className="text-sm font-medium tracking-wide uppercase">
                    {roleLabel} {t.labels.access}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-left lg:text-right">
              <div className="text-3xl lg:text-5xl font-extralight text-gray-900 mb-2">
                {currentTime.toLocaleTimeString(locale, { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              <div className="text-gray-500 font-light text-sm lg:text-base">
                {currentTime.toLocaleDateString(locale, { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-First Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 lg:mb-16">
          <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="text-gray-500 text-xs lg:text-sm font-medium mb-2 lg:mb-3 tracking-wide uppercase">{t.labels.activeRequests}</div>
            <div className="text-3xl lg:text-4xl font-extralight text-gray-900 mb-1 lg:mb-2">{dashboardData.quickStats.activeRequests}</div>
            <div className="text-gray-400 text-xs lg:text-sm">{t.labels.currentWeek}</div>
          </div>
          
          <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="text-gray-500 text-xs lg:text-sm font-medium mb-2 lg:mb-3 tracking-wide uppercase">{t.labels.pending}</div>
            <div className="text-3xl lg:text-4xl font-extralight text-gray-900 mb-1 lg:mb-2">{dashboardData.quickStats.pendingBookings}</div>
            <div className="text-gray-400 text-xs lg:text-sm">{t.labels.requiresAttention}</div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl lg:rounded-3xl p-4 lg:p-8 shadow-sm border border-amber-200 hover:shadow-lg transition-all duration-300">
            <div className="text-amber-700 text-xs lg:text-sm font-medium mb-2 lg:mb-3 tracking-wide uppercase">
              {userInfo?.role === 'admin' ? t.labels.todayRevenue : t.labels.revenueStatus}
            </div>
            <div className="text-3xl lg:text-4xl font-extralight text-gray-900 mb-1 lg:mb-2">
              {userInfo?.role === 'admin' 
                ? formatCurrency(dashboardData.quickStats.todayRevenue)
                : dashboardData.quickStats.todayRevenue > 0 ? t.labels.activeStatus : t.labels.pendingStatus
              }
            </div>
            <div className="text-amber-600 text-xs lg:text-sm">{t.labels.todayPerformance}</div>
          </div>
        </div>

        {/* Mobile-Optimized Quick Actions */}
        <div className="mb-8 lg:mb-16">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 lg:mb-12">
            <h2 className="text-2xl lg:text-3xl font-extralight text-gray-900 mb-2 sm:mb-0">{t.labels.commandCenter}</h2>
            {userInfo?.role === 'admin' && (
              <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                <span className="text-amber-700 text-sm font-medium tracking-wide">{t.labels.administrator}</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className={`group relative overflow-hidden rounded-2xl lg:rounded-3xl p-6 lg:p-8 transition-all duration-500 transform hover:-translate-y-1 ${
                    action.primary 
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-xl' 
                      : 'bg-white border border-gray-200 text-gray-900 hover:border-gray-300 hover:shadow-lg'
                  } touch-manipulation`}
                >
                  <div className="relative z-10">
                    <div className="mb-4 lg:mb-6">
                      <IconComponent className={`w-8 h-8 lg:w-12 lg:h-12 ${action.primary ? 'text-white' : 'text-gray-600'} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                    <h3 className="text-lg lg:text-xl font-light mb-1 lg:mb-2 text-left leading-tight">{action.title}</h3>
                    <p className={`text-sm ${action.primary ? 'text-white/80' : 'text-gray-500'} text-left font-light hidden sm:block`}>
                      {action.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Offers Overview Section - Full Width */}
        <div className="mb-8 lg:mb-16">
          <OffersOverview 
            offers={dashboardData.offers} 
            loading={offersLoading}
            language={language}
            onRefresh={() => {
              // Trigger offers refresh
              const fetchOffers = async () => {
                try {
                  setOffersLoading(true);
                  const offersQuery = query(
                    collection(db, 'offers'),
                    where('companyId', '==', userCompanyId)
                  );
                  const offersSnapshot = await getDocs(offersQuery);
                  const offers = offersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));
                  
                  setDashboardData(prev => ({
                    ...prev,
                    offers
                  }));
                } catch (error) {
                  console.error('Error fetching offers:', error);
                } finally {
                  setOffersLoading(false);
                }
              };
              fetchOffers();
            }}
          />
        </div>

        {/* Mobile-First Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Recent Activity */}
          <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-200">
            <h3 className="text-xl lg:text-2xl font-extralight text-gray-900 mb-6 lg:mb-8">{t.sections.recentActivity}</h3>
            
            <div className="space-y-4 lg:space-y-6">
              {dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 lg:p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-300">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-100 rounded-xl flex items-center justify-center mr-4 lg:mr-6 flex-shrink-0">
                        <span className="text-amber-600 text-lg lg:text-xl">€</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-gray-900 font-medium mb-1 truncate text-sm lg:text-base">{activity.client}</h4>
                        <p className="text-gray-600 text-xs lg:text-sm truncate">
                          {`${activity.accommodationType || t.actions.reservations} - ${
                            t.statusLabels[activity.bookingStatus] ||
                            t.statusLabels[activity.bookingStatus?.toLowerCase?.()] ||
                            activity.bookingStatus ||
                            ''
                          }`}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">{getTimeAgo(activity.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-amber-600 font-medium text-sm lg:text-base">
                        {formatCurrency(activity.value)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full mt-2 ${
                        activity.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        activity.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {t.statusLabels[activity.status] || t.statusLabels[activity.status?.toLowerCase?.()] || activity.status}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 lg:py-16">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                    <IconReservations className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-light">{t.empty.noRecentActivity}</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming VIP Arrivals */}
          <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-200">
            <h3 className="text-xl lg:text-2xl font-extralight text-gray-900 mb-6 lg:mb-8">{t.sections.vipArrivals}</h3>
            
            <div className="space-y-4 lg:space-y-6">
              {dashboardData.upcomingBookings.length > 0 ? (
                dashboardData.upcomingBookings.map((booking) => (
                  <div key={booking.id} className={`p-4 lg:p-6 rounded-2xl border-l-4 ${
                    booking.priority === 'urgent' ? 'bg-rose-50 border-rose-500' :
                    booking.priority === 'high' ? 'bg-amber-50 border-amber-500' :
                    'bg-gray-50 border-gray-400'
                    } transition-all duration-300 hover:shadow-sm`}>
                    {(() => {
                      const formattedDate = booking.checkInDate
                        ? booking.checkInDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
                        : booking.date;
                      const formattedTime = booking.checkInDate
                        ? booking.checkInDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                        : booking.time;
                      const priorityLabel = t.priorityLabels[booking.priority] || booking.priority;
                      return (
                      <div className="flex justify-between items-start mb-3 lg:mb-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-900 font-medium mb-2 text-sm lg:text-base leading-tight">{booking.title}</h4>
                          <p className="text-gray-600 text-xs lg:text-sm">{formattedDate} {t.labels.at} {formattedTime}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-amber-600 font-medium text-sm lg:text-lg">
                            {formatCurrency(booking.value)}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full mt-2 ${
                            booking.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                            booking.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {priorityLabel}
                          </div>
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 lg:py-16">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                    <IconPropertyPortfolio className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-light">{t.empty.noUpcomingArrivals}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
