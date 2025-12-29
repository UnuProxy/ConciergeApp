import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { collection, getDocs, query, where, getFirestore, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

/**
 * Mobile App Interface Finance Component
 * Designed to mimic native mobile app UI patterns
 */
const Finance = () => {
  // State management
  const [reservations, setReservations] = useState([]);
  const [financeRecords, setFinanceRecords] = useState([]);
  const [categoryPayments, setCategoryPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [servicePage, setServicePage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubView, setActiveSubView] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [syncingFinance, setSyncingFinance] = useState(false);
  const [filters, setFilters] = useState({ service: 'all', startDate: '', endDate: '', timeRange: 'all', client: '' });
  const [updatingRecord, setUpdatingRecord] = useState(null);
  const [costDrafts, setCostDrafts] = useState({});
  const [showAllPending, setShowAllPending] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // Form states
  const [newExpense, setNewExpense] = useState({
    category: 'office',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  
  const [newPayment, setNewPayment] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  
  // Get language from localStorage
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'ro';
  });

  // Listen for language changes
  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('appLanguage') || 'ro');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Translations
  const translations = {
    ro: {
      // Page titles
      financeTitle: 'Finanțe',
      companyDashboard: 'Panou de Control',
      
      // Tab navigation
      dashboard: 'Panou',
      transactions: 'Tranzacții',
      categories: 'Categorii',
      expenses: 'Cheltuieli',
      reports: 'Rapoarte',
      
      // Action titles
      addExpense: 'Adaugă Cheltuială',
      addPayment: 'Adaugă Plată',
      back: 'Înapoi',
      deleteExpense: 'Șterge cheltuiala',
      
      // Dashboard
      summary: 'Sumar',
      income: 'Venit',
      payments: 'Plăți',
      revenue: 'Profit',
      expensesTotal: 'Cheltuieli',
      netProfit: 'Profit Net',
      grossProfit: 'Profit Brut',
      trueProfit: 'Profit Real',
      providerPayout: 'Plată Furnizor',
      pendingPayments: 'Plăți în așteptare',
      pendingRecords: 'Înregistrări în așteptare',
      pendingDotLabel: 'Necesită cost furnizor',
      paymentsToProvider: 'Plăți către furnizori',
      clientRevenue: 'Încasări clienți',
      providerCosts: 'Costuri furnizor',
      recentTransactions: 'Tranzacții Recente',
      viewAll: 'Vezi Toate',
      records: 'Înregistrări',
      
      // Transactions
      noTransactions: 'Nu există tranzacții',
      total: 'Total',
      date: 'Data',
      
      // Categories
      categoryOverview: 'Privire Generală',
      category: 'Categorie',
      margin: 'Marjă',
      noPayments: 'Nu există plăți',
      selectCategory: 'Selectează categoria',
      amount: 'Sumă (€)',
      description: 'Descriere',
      paymentPlaceholder: 'ex. Plată către proprietar',
      savePayment: 'Salvează Plată',
      payment: 'Plată',
      paymentHistory: 'Istoric Plăți',
      exportTitle: 'Export',
      exportMonth: 'Luna',
      exportCsv: 'Export CSV',
      exportXlsx: 'Export XLSX',
      exportEmpty: 'Nu există date pentru luna selectată',
      
      // Expenses
      noExpenses: 'Nu există cheltuieli',
      expenseCategory: 'Categorie',
      expenseAmount: 'Sumă (€)',
      expenseDescription: 'Descriere',
      expensePlaceholder: 'ex. Chirie birou',
      saveExpense: 'Salvează Cheltuială',
      
      // Expense categories
      office: 'Birou',
      utilities: 'Utilități',
      marketing: 'Marketing',
      salary: 'Salarii',
      travel: 'Transport',
      other: 'Altele',
      
      // Reports
      financialSummary: 'Sumar Financiar',
      monthlyOverview: 'Privire Lunară',
      noMonthlyData: 'Nu există date lunare',
      month: 'Luna',
      profit: 'Profit',
      serviceProfit: 'Profit pe serviciu',
      profitByService: 'Profit pe servicii',
      profitPerService: 'Profit pe serviciu',
      clientFilter: 'Client',
      
      // Messages
      loading: 'Se încarcă...',
      paymentAdded: 'Plată adăugată cu succes!',
      expenseAdded: 'Cheltuială adăugată cu succes!',
      errorCompanyNotFound: 'Nu s-a găsit compania',
      errorValidation: 'Completează toate câmpurile',
      errorSaving: 'Eroare la salvare. Încearcă din nou.',
      noFinancialData: 'Nu există date financiare de afișat',
      
      // Provider costs / filters
      providerCost: 'Cost furnizor',
      clientAmount: 'Încasare client',
      addCost: 'Adaugă cost',
      confirmPayment: 'Confirmă plata',
      enterProviderCost: 'Introdu costul furnizorului',
      providerCostPlaceholder: 'ex. 300',
      pending: 'În așteptare',
      settled: 'Confirmat',
      serviceType: 'Tip serviciu',
      dateFilters: 'Filtrează după dată',
      startDate: 'Data început',
      endDate: 'Data sfârșit',
      applyFilters: 'Aplică filtre',
      timeRange: 'Perioadă',
      allPeriods: 'Toată perioada',
      thisWeek: 'Săptămâna aceasta',
      thisMonth: 'Luna aceasta',
      thisYear: 'Anul acesta',
      customRange: 'Interval personalizat',
      clearFilters: 'Resetează',
      noPending: 'Nu există plăți în așteptare'
    },
    en: {
      // Page titles
      financeTitle: 'Finance',
      companyDashboard: 'Company Dashboard',
      
      // Tab navigation
      dashboard: 'Dashboard',
      transactions: 'Transactions',
      categories: 'Categories',
      expenses: 'Expenses',
      reports: 'Reports',
      
      // Action titles
      addExpense: 'Add Expense',
      addPayment: 'Add Payment',
      back: 'Back',
      deleteExpense: 'Delete expense',
      
      // Dashboard
      summary: 'Summary',
      income: 'Income',
      payments: 'Payments',
      revenue: 'Revenue',
      expensesTotal: 'Expenses',
      netProfit: 'Net Profit',
      grossProfit: 'Gross Profit',
      trueProfit: 'True Profit',
      providerPayout: 'Provider Payout',
      pendingPayments: 'Pending payments',
      pendingRecords: 'Pending records',
      pendingDotLabel: 'Provider cost required',
      paymentsToProvider: 'Provider payments',
      clientRevenue: 'Client revenue',
      providerCosts: 'Provider costs',
      recentTransactions: 'Recent Transactions',
      viewAll: 'View All',
      records: 'Records',
      
      // Transactions
      noTransactions: 'No transactions found',
      total: 'Total',
      date: 'Date',
      
      // Categories
      categoryOverview: 'Overview',
      category: 'Category',
      margin: 'Margin',
      noPayments: 'No payments found',
      selectCategory: 'Select category',
      amount: 'Amount (€)',
      description: 'Description',
      paymentPlaceholder: 'e.g. Payment to owner',
      savePayment: 'Save Payment',
      payment: 'Payment',
      paymentHistory: 'Payment History',
      exportTitle: 'Export',
      exportMonth: 'Month',
      exportCsv: 'Export CSV',
      exportXlsx: 'Export XLSX',
      exportEmpty: 'No data for selected month',
      
      // Expenses
      noExpenses: 'No expenses found',
      expenseCategory: 'Category',
      expenseAmount: 'Amount (€)',
      expenseDescription: 'Description',
      expensePlaceholder: 'e.g. Office rent',
      saveExpense: 'Save Expense',
      
      // Expense categories
      office: 'Office',
      utilities: 'Utilities',
      marketing: 'Marketing',
      salary: 'Salary',
      travel: 'Travel',
      other: 'Other',
      
      // Reports
      financialSummary: 'Financial Summary',
      monthlyOverview: 'Monthly Overview',
      noMonthlyData: 'No monthly data available',
      month: 'Month',
      profit: 'Profit',
      serviceProfit: 'Service profit',
      profitByService: 'Profit by service',
      profitPerService: 'Profit per service',
      clientFilter: 'Client',
      
      // Messages
      loading: 'Loading...',
      paymentAdded: 'Payment added successfully!',
      expenseAdded: 'Expense added successfully!',
      errorCompanyNotFound: 'Company not found',
      errorValidation: 'Please fill all fields',
      errorSaving: 'Error saving. Please try again.',
      noFinancialData: 'No financial data to display',
      
      // Provider costs / filters
      providerCost: 'Provider cost',
      clientAmount: 'Client charge',
      addCost: 'Add cost',
      confirmPayment: 'Confirm payment',
      enterProviderCost: 'Enter provider cost',
      providerCostPlaceholder: 'e.g. 300',
      pending: 'Pending',
      settled: 'Settled',
      serviceType: 'Service type',
      dateFilters: 'Filter by date',
      startDate: 'Start date',
      endDate: 'End date',
      applyFilters: 'Apply filters',
      timeRange: 'Time range',
      allPeriods: 'All time',
      thisWeek: 'This week',
      thisMonth: 'This month',
      thisYear: 'This year',
      customRange: 'Custom range',
      clearFilters: 'Reset',
      noPending: 'No pending payments'
    }
  };

  // Get translation
  const t = translations[language];

  // Firebase
  const db = getFirestore();
  const auth = getAuth();
  const formatCurrency = (value = 0) => `€${Number(value || 0).toLocaleString()}`;
  const getServiceLabel = (value, fallback = 'Unknown') => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value[language] || value.en || value.ro || Object.values(value)[0] || fallback;
    }
    return fallback;
  };
  const getClientDisplayName = (client, fallback = 'Client') => {
    if (!client) return fallback;
    if (typeof client.name === 'string') return client.name;
    const nameFromObj = client.name?.[language] || client.name?.en || client.name?.ro;
    const full = nameFromObj || client.fullName || client.companyName;
    if (full) return full;
    const composed = [client.firstName, client.lastName].filter(Boolean).join(' ');
    return composed || fallback;
  };
  const parseDateSafe = (input) => {
    if (!input) return null;
    if (input.seconds) {
      return new Date(input.seconds * 1000);
    }
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getMonthBounds = (monthStr) => {
    if (!monthStr) return null;
    const start = new Date(`${monthStr}-01T00:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { start, end };
  };

  // Remove finance records whose linked booking/client no longer exists.
  // Also purge all finance records if both bookings and clients are empty for this company.
  const pruneOrphanFinanceRecords = async (reservationsList, financeList, clientsList) => {
    const reservationMap = new Map(reservationsList.map(r => [r.id, r]));
    const clientIds = new Set(clientsList.map(c => c.id));
    const hasBookings = reservationMap.size > 0;
    const hasClients = clientIds.size > 0;

    const orphans = financeList.filter((record) => {
      // If we have absolutely no data, everything is an orphan
      const wipeAll = !hasBookings && !hasClients;
      if (wipeAll) return true;

      // 1. Check if linked booking exists
      if (record.bookingId && !reservationMap.has(record.bookingId)) {
        return true; // Booking deleted
      }

      // 2. Check if linked client exists (direct check)
      if (record.clientId && !clientIds.has(record.clientId)) {
        return true; // Client deleted
      }

      // 3. Deep check: Check if the booking's client still exists
      if (record.bookingId) {
        const booking = reservationMap.get(record.bookingId);
        if (booking && booking.clientId && !clientIds.has(booking.clientId)) {
          return true; // Booking exists, but its client is deleted
        }
      }

      return false;
    });

    if (orphans.length === 0) return financeList;

    try {
      console.log(`Pruning ${orphans.length} orphan finance records...`);
      await Promise.all(orphans.map(record => deleteDoc(doc(db, 'financeRecords', record.id))));
    } catch (error) {
      console.error('Error pruning orphan finance records:', error);
    }

    // Return filtered list for UI
    const orphanIds = new Set(orphans.map(o => o.id));
    return financeList.filter(r => !orphanIds.has(r.id));
  };

  // If there is no client or booking data at all, clear finance and category payments
  const wipeFinanceIfEmpty = async (reservationsList, clientsList, financeList, paymentsList) => {
    if (reservationsList.length === 0 && clientsList.length === 0) {
      try {
        if (financeList.length > 0) {
          await Promise.all(financeList.map(record => deleteDoc(doc(db, 'financeRecords', record.id))));
        }
        if (paymentsList.length > 0) {
          await Promise.all(paymentsList.map(payment => deleteDoc(doc(db, 'categoryPayments', payment.id))));
        }
        return { finance: [], payments: [] };
      } catch (error) {
        console.error('Error wiping finance/category payments:', error);
        return { finance: financeList, payments: paymentsList };
      }
    }
    return { finance: financeList, payments: paymentsList };
  };

  // Ensure each booking has a finance record with a pending provider cost
  // Also updates existing records if the booking amount changed
  const syncFinanceRecords = async (reservationsList, existingFinanceRecords = [], clientsList = []) => {
    if (!companyId || reservationsList.length === 0) return existingFinanceRecords;
    
    const clientIds = new Set(clientsList.map(c => c.id));
    
    // Map existing records for quick lookup by key
    const existingRecordMap = new Map();
    existingFinanceRecords.forEach(r => {
      const key = `${r.bookingId || 'none'}::${r.serviceKey || r.service || 'Unknown'}`;
      existingRecordMap.set(key, r);
    });

    const toCreate = [];
    const toUpdate = [];

    reservationsList.forEach(booking => {
      // Skip syncing if the client for this booking doesn't exist
      if (booking.clientId && !clientIds.has(booking.clientId)) return;

      const servicesArray = Array.isArray(booking.services) && booking.services.length > 0
        ? booking.services
        : [null];

      servicesArray.forEach((serviceItem, index) => {
        const serviceKey = serviceItem?.id || serviceItem?.serviceId || serviceItem?.type || serviceItem?.name || serviceItem?.title || `service-${index}`;
        const recordKey = `${booking.id || 'none'}::${serviceKey}`;
        
        const serviceLabel = getServiceLabel(
          serviceItem?.name || serviceItem?.title || serviceItem?.type || serviceItem?.serviceType || serviceItem?.service || booking.service || booking.accommodationType,
          'Unknown'
        );
        const rawAmount = [
          serviceItem?.price,
          serviceItem?.total,
          serviceItem?.amount,
          serviceItem?.clientPrice,
          serviceItem?.clientAmount,
          serviceItem?.rate,
          booking.clientIncome
        ].find(v => typeof v === 'number' && !Number.isNaN(v));

        const clientAmount = rawAmount ?? 0;
        
        // Get client name from booking or lookup from clients list
        const client = booking.clientId ? clientsList.find(c => c.id === booking.clientId) : null;
        const clientName = booking.clientName || getClientDisplayName(client, '');
        
        // Calculate expected data
        const payloadData = {
          bookingId: booking.id,
          clientId: booking.clientId,
          clientName,
          bookingServiceKey: serviceKey,
          serviceKey,
          service: serviceLabel,
          clientAmount,
          // Only take provider cost from booking if we don't already have a settled record
          // (We trust Finance record's settled cost over booking default unless it's new)
          providerCost: serviceItem?.providerCost ?? null,
          status: serviceItem?.providerCost ? 'settled' : 'pending',
          date: booking.date || new Date().toISOString().split('T')[0],
          description: serviceItem?.description || booking.description || '',
        };

        if (existingRecordMap.has(recordKey)) {
          // Check if update is needed (e.g. client price changed in booking or clientName missing)
          const existing = existingRecordMap.get(recordKey);
          
          // Update if clientAmount changed OR if clientName is missing/different
          const needsUpdate = existing.clientAmount !== clientAmount || 
                              (clientName && existing.clientName !== clientName);
          
          if (needsUpdate) {
             toUpdate.push({
               id: existing.id,
               ...payloadData,
               // Preserve existing provider cost/status if they were manually set in finance
               providerCost: existing.providerCost,
               status: existing.status
             });
          }
        } else {
          // New record needed
          toCreate.push(payloadData);
        }
      });
    });

    if ((toCreate.length === 0 && toUpdate.length === 0) || syncingFinance) return existingFinanceRecords;
    
    setSyncingFinance(true);
    try {
      // 1. Create new records
      const createdRecords = [];
      for (const payloadPartial of toCreate) {
        const payload = {
          companyId,
          createdBy: userId || null,
          createdByEmail: userEmail || null,
          createdAt: new Date(),
          ...payloadPartial
        };
        const ref = await addDoc(collection(db, 'financeRecords'), payload);
        createdRecords.push({
          id: ref.id,
          ...payload,
          profit: (payload.clientAmount || 0) - (payload.providerCost || 0)
        });
      }

      // 2. Update existing records (if price changed)
      const updatedIds = new Set();
      for (const updateData of toUpdate) {
        const { id, ...data } = updateData;
        const recordRef = doc(db, 'financeRecords', id);
        await updateDoc(recordRef, {
          clientAmount: data.clientAmount,
          service: data.service, // update name if changed
          updatedAt: new Date()
        });
        updatedIds.add(id);
      }

      // Merge results
      const updatedList = existingFinanceRecords.map(r => {
        if (updatedIds.has(r.id)) {
          const update = toUpdate.find(u => u.id === r.id);
          return { ...r, clientAmount: update.clientAmount, service: update.service };
        }
        return r;
      });

      const final = [...updatedList, ...createdRecords];
      setFinanceRecords(final);
      return final;
    } catch (error) {
      console.error('Error syncing finance records:', error);
      return existingFinanceRecords;
    } finally {
      setSyncingFinance(false);
    }
  };
  
  // Get user and company
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        setUserId(user.uid);
        
        try {
          let resolvedCompanyId = null;
          let resolvedUserRole = null;

          // Prefer the centralized authorized_users mapping used across the app
          const authorizedUsersRef = collection(db, 'authorized_users');
          const authorizedQuery = query(authorizedUsersRef, where('email', '==', user.email));
          const authorizedSnapshot = await getDocs(authorizedQuery);

          if (!authorizedSnapshot.empty) {
            const authorizedData = authorizedSnapshot.docs[0].data();
            if (authorizedData.companyId) {
              resolvedCompanyId = authorizedData.companyId;
            }
            resolvedUserRole = authorizedData.role || 'user';
          }

          // Fallback to companies collection using contactEmail (legacy behaviour)
          if (!authorizedSnapshot || authorizedSnapshot.empty) {
            const companiesRef = collection(db, 'companies');
            const companiesQuery = query(companiesRef, where('contactEmail', '==', user.email));
            const companySnapshot = await getDocs(companiesQuery);
            if (!companySnapshot.empty) {
              resolvedCompanyId = companySnapshot.docs[0].id;
            }
          }

          if (resolvedCompanyId) {
            setCompanyId(resolvedCompanyId);
            setUserRole(resolvedUserRole);
            setError(null);
            console.log("User role:", resolvedUserRole);
          } else {
            setError(t.errorCompanyNotFound);
          }
        } catch (error) {
          console.error("Error finding company:", error);
          setError(t.errorCompanyNotFound);
        }
      } else {
        setUserEmail(null);
        setUserId(null);
        setCompanyId(null);
        setUserRole(null);
      }

      setAuthChecked(true);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [auth, db, t.errorCompanyNotFound]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) {
        if (authChecked) {
          setLoading(false);
        }
        return;
      }

      const isOwnedByCurrentUser = (record) => {
        // Admins can see all records within their company
        if (userRole === 'admin') {
          return true;
        }
        
        const createdByMatch = record.createdBy && userId && record.createdBy === userId;
        const createdByEmailMatch = record.createdByEmail && userEmail && record.createdByEmail === userEmail;
        // Enforce ownership if metadata exists; allow legacy records without it
        if (record.createdBy || record.createdByEmail) {
          return createdByMatch || createdByEmailMatch;
        }
        return true;
      };
      
      try {
        setLoading(true);
        
        // Fetch reservations
        const reservationsRef = collection(db, 'reservations');
        const reservationsQuery = query(reservationsRef, where("companyId", "==", companyId));
        const reservationsSnapshot = await getDocs(reservationsQuery);
        
        const reservationsList = reservationsSnapshot.docs
          .map(doc => {
            const data = doc.data();
            const createdAtDate = data.createdAt ? new Date(data.createdAt.seconds * 1000) : null;
            const dateString = createdAtDate ? createdAtDate.toISOString().split('T')[0] : '';
            const serviceLabel = getServiceLabel(data.accommodationType || data.serviceType || 'Booking');
            return {
              id: doc.id,
              ...data,
              createdBy: data.createdBy,
              createdByEmail: data.createdByEmail,
              clientIncome: data.paidAmount ?? data.totalValue ?? data.totalAmount ?? 0,
              service: serviceLabel,
              services: data.services || data.selectedServices || data.bookingServices || [],
              date: dateString,
              description: `${serviceLabel} - ${data.checkIn || data.startDate || 'N/A'} to ${data.checkOut || data.endDate || 'N/A'}`
            };
          })
          .filter(r => r.status !== 'cancelled' && r.status !== 'declined'); // Exclude cancelled/declined bookings
        
        setReservations(reservationsList);

        // Fetch clients to validate finance records
        const clientsRef = collection(db, 'clients');
        const clientsQuery = query(clientsRef, where("companyId", "==", companyId));
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsList = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const clientMap = new Map(clientsList.map(c => [c.id, c]));
        
        // Fetch finance records for provider costs and profit tracking
        const financeRef = collection(db, 'financeRecords');
        const financeQuery = query(financeRef, where("companyId", "==", companyId));
        const financeSnapshot = await getDocs(financeQuery);
        const financeList = financeSnapshot.docs.map(doc => {
          const data = doc.data();
          const client = data.clientId ? clientMap.get(data.clientId) : null;
          const clientName = data.clientName || getClientDisplayName(client, '');
          const parsedDate = data.date
            ? (data.date.seconds ? new Date(data.date.seconds * 1000).toISOString().split('T')[0] : data.date)
            : '';
          const clientAmount = data.clientAmount ?? data.clientIncome ?? data.amount ?? 0;
          const providerCost = data.providerCost ?? null;
          const status = data.status || (providerCost !== null ? 'settled' : 'pending');
          return {
            id: doc.id,
            ...data,
            createdBy: data.createdBy,
            createdByEmail: data.createdByEmail,
            serviceKey: data.serviceKey || data.bookingServiceKey || data.service || data.category,
            service: getServiceLabel(data.service || data.category, 'Unknown'),
            clientAmount,
            providerCost,
            profit: data.profit ?? (clientAmount - (providerCost || 0)),
            status,
            date: parsedDate,
            clientName
          };
        });
        
        const cleanedFinance = await pruneOrphanFinanceRecords(reservationsList, financeList, clientsList);

        // Fetch category payments (legacy support)
        const paymentsRef = collection(db, 'categoryPayments');
        const paymentsQuery = query(paymentsRef, where("companyId", "==", companyId));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        const paymentsList = paymentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdBy: data.createdBy,
            createdByEmail: data.createdByEmail,
            category: data.category || 'Unknown',
            amount: data.amount || 0,
            date: data.date ? new Date(data.date.seconds * 1000).toISOString().split('T')[0] : '',
            description: data.description || ''
          };
        });

        const { finance: finalFinance, payments: finalPayments } = await wipeFinanceIfEmpty(
          reservationsList,
          clientsList,
          cleanedFinance,
          paymentsList
        );

        setFinanceRecords(finalFinance);
        setCategoryPayments(finalPayments);

        // Fetch expenses
        const expensesRef = collection(db, 'expenses');
        const expensesQuery = query(expensesRef, where("companyId", "==", companyId));
        const expensesSnapshot = await getDocs(expensesQuery);
        
        const expensesList = expensesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdBy: data.createdBy,
            createdByEmail: data.createdByEmail,
            amount: data.amount || 0,
            date: data.date ? new Date(data.date.seconds * 1000).toISOString().split('T')[0] : '',
            description: data.description || ''
          };
        }).filter(isOwnedByCurrentUser);
        
        setExpenses(expensesList);

        // Backfill finance records for bookings that do not have one yet
        await syncFinanceRecords(reservationsList, finalFinance, clientsList);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, companyId, userEmail, userId, authChecked]);

  // Calculate summary data based on finance records
  const serviceOptions = Array.from(new Set([
    ...financeRecords.map(r => getServiceLabel(r.service)),
    ...reservations.map(r => getServiceLabel(r.service))
  ].filter(Boolean)));

  const filteredFinanceRecords = financeRecords.filter(record => {
    const matchesService = filters.service === 'all' || record.service === filters.service;
    const recordDate = record.date ? new Date(record.date) : null;
    const startOk = !filters.startDate || (recordDate && recordDate >= new Date(filters.startDate));
    const endOk = !filters.endDate || (recordDate && recordDate <= new Date(filters.endDate));
    const matchesClient =
      !filters.client ||
      (record.clientName && record.clientName.toLowerCase().includes(filters.client.toLowerCase()));
    return matchesService && startOk && endOk && matchesClient;
  });

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = expense.date ? new Date(expense.date) : null;
    const startOk = !filters.startDate || (expenseDate && expenseDate >= new Date(filters.startDate));
    const endOk = !filters.endDate || (expenseDate && expenseDate <= new Date(filters.endDate));
    return startOk && endOk;
  });

  const serviceBreakdown = Object.values(filteredFinanceRecords.reduce((acc, r) => {
    const key = r.service || 'Unknown';
    if (!acc[key]) {
      acc[key] = { service: key, revenue: 0, cost: 0, count: 0 };
    }
    acc[key].revenue += (r.clientAmount || 0);
    acc[key].cost += (r.providerCost || 0);
    acc[key].count += 1;
    acc[key].profit = acc[key].revenue - acc[key].cost;
    acc[key].margin = acc[key].revenue > 0 ? (acc[key].profit / acc[key].revenue * 100) : 0;
    return acc;
  }, {}));
  
  // Reset transactions pagination when filters change
  useEffect(() => {
    setTransactionsPage(1);
  }, [filteredFinanceRecords.length]);

  // Reset service pagination when dataset changes
  useEffect(() => {
    setServicePage(1);
  }, [serviceBreakdown.length]);

  // Reset expenses pagination when dataset changes
  useEffect(() => {
    setExpensesPage(1);
  }, [filteredExpenses.length]);

  const pendingFinance = filteredFinanceRecords.filter(r => (r.status === 'pending') || r.providerCost === null);
  const totalClientRevenue = filteredFinanceRecords.reduce((sum, r) => sum + (r.clientAmount || 0), 0);
  const totalLegacyProviderPayments = categoryPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalProviderCosts = filteredFinanceRecords.reduce((sum, r) => sum + (r.providerCost || 0), 0) + totalLegacyProviderPayments;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfit = totalClientRevenue - totalProviderCosts;
  const totalRevenue = grossProfit;
  const netProfit = totalRevenue - totalExpenses;
  const totalIncome = totalClientRevenue;
  const totalPayments = totalProviderCosts;
  const trueProfit = netProfit;

  const buildMonthlyExportRows = () => {
    const bounds = getMonthBounds(exportMonth);
    if (!bounds) return [];
    const inRange = (date) => {
      const parsed = parseDateSafe(date);
      return parsed && parsed >= bounds.start && parsed < bounds.end;
    };

    const rows = [];

    financeRecords.forEach(record => {
      if (!inRange(record.date)) return;
      rows.push({
        Date: record.date || '',
        Type: 'financeRecord',
        Category: getServiceLabel(record.service, 'Finance'),
        Description: record.description || '',
        AmountIn: Number(record.clientAmount || 0),
        AmountOut: Number(record.providerCost || 0),
        Status: record.status || '',
        Source: 'financeRecords'
      });
    });

    categoryPayments.forEach(payment => {
      if (!inRange(payment.date)) return;
      rows.push({
        Date: payment.date || '',
        Type: 'categoryPayment',
        Category: getServiceLabel(payment.category, 'Payment'),
        Description: payment.description || '',
        AmountIn: 0,
        AmountOut: Number(payment.amount || 0),
        Status: payment.status || '',
        Source: 'categoryPayments'
      });
    });

    expenses.forEach(exp => {
      if (!inRange(exp.date)) return;
      rows.push({
        Date: exp.date || '',
        Type: 'expense',
        Category: getServiceLabel(exp.category, 'Expense'),
        Description: exp.description || '',
        AmountIn: 0,
        AmountOut: Number(exp.amount || 0),
        Status: 'expense',
        Source: 'expenses'
      });
    });

    return rows.sort((a, b) => {
      const ad = parseDateSafe(a.Date)?.getTime() || 0;
      const bd = parseDateSafe(b.Date)?.getTime() || 0;
      return ad - bd;
    });
  };

  const downloadCsv = (rows) => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'AmountIn', 'AmountOut', 'Status', 'Source'];
    const escape = (val) => {
      const str = (val ?? '').toString().replace(/"/g, '""');
      return `"${str}"`;
    };
    const csv = [headers.join(',')]
      .concat(rows.map(row => headers.map(h => escape(row[h])).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance-${exportMonth || 'all'}.csv`;
    link.click();
  };

  const downloadXlsx = (rows) => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'AmountIn', 'AmountOut', 'Status', 'Source'];
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finance');
    XLSX.writeFile(workbook, `finance-${exportMonth || 'all'}.xlsx`);
  };

  const handleExport = (format) => {
    const rows = buildMonthlyExportRows();
    if (!rows.length) {
      window.alert(t.exportEmpty);
      return;
    }
    setExporting(true);
    try {
      if (format === 'csv') {
        downloadCsv(rows);
      } else {
        downloadXlsx(rows);
      }
    } finally {
      setExporting(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ro' ? 'ro-RO' : 'en-US');
  };

  const toISODate = (dateObj) => dateObj.toISOString().split('T')[0];

  const applyTimeRange = (range) => {
    const today = new Date();
    let startDate = '';
    let endDate = '';

    switch (range) {
      case 'week': {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        startDate = toISODate(start);
        endDate = toISODate(today);
        break;
      }
      case 'month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = toISODate(start);
        endDate = toISODate(today);
        break;
      }
      case 'year': {
        const start = new Date(today.getFullYear(), 0, 1);
        startDate = toISODate(start);
        endDate = toISODate(today);
        break;
      }
      default:
        startDate = '';
        endDate = '';
    }

    setFilters(prev => ({
      ...prev,
      timeRange: range,
      startDate,
      endDate
    }));
  };

  const handleDateChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      timeRange: 'custom'
    }));
  };
  
  // Show toast message
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };
  
  // Add new payment
  const handleAddPayment = async () => {
    if (!companyId) {
      alert(t.errorCompanyNotFound);
      return;
    }
    
    if (!newPayment.category || !newPayment.amount) {
      alert(t.errorValidation);
      return;
    }
    
    try {
      await addDoc(collection(db, 'categoryPayments'), {
        companyId,
        createdBy: userId || null,
        createdByEmail: userEmail || null,
        category: newPayment.category,
        amount: parseFloat(newPayment.amount),
        date: new Date(newPayment.date),
        description: newPayment.description,
        createdAt: new Date()
      });
      
      const payment = {
        id: `payment-${Date.now()}`,
        companyId,
        createdBy: userId || null,
        createdByEmail: userEmail || null,
        ...newPayment,
        amount: parseFloat(newPayment.amount)
      };
      
      setCategoryPayments([...categoryPayments, payment]);
      
      setNewPayment({
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
      
      showToast(t.paymentAdded);
      setActiveSubView(null);
    } catch (error) {
      console.error("Error adding payment:", error);
      alert(t.errorSaving);
    }
  };
  
  // Add new expense
  const handleAddExpense = async () => {
    if (!companyId) {
      alert(t.errorCompanyNotFound);
      return;
    }
    
    if (!newExpense.category || !newExpense.amount) {
      alert(t.errorValidation);
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, 'expenses'), {
        companyId,
        createdBy: userId || null,
        createdByEmail: userEmail || null,
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
        date: new Date(newExpense.date),
        description: newExpense.description,
        createdAt: new Date()
      });
      
      const expense = {
        id: docRef.id,
        companyId,
        createdBy: userId || null,
        createdByEmail: userEmail || null,
        ...newExpense,
        amount: parseFloat(newExpense.amount)
      };
      
      setExpenses([...expenses, expense]);
      
      setNewExpense({
        category: 'office',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
      
      showToast(t.expenseAdded);
      setActiveSubView(null);
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(t.errorSaving);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId) => {
    if (!companyId || !expenseId) return;
    if (!window.confirm(language === 'en' ? 'Delete this expense?' : 'Ștergi această cheltuială?')) return;
    setDeletingExpenseId(expenseId);
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      showToast(t.deleteExpense);
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert(t.errorSaving);
    } finally {
      setDeletingExpenseId(null);
    }
  };

  // Add or confirm provider cost for a booking
  const handleProviderCostUpdate = async (recordId, costValue) => {
    if (!companyId) {
      alert(t.errorCompanyNotFound);
      return;
    }
    const numericCost = parseFloat(costValue);
    if (Number.isNaN(numericCost)) {
      alert(t.errorValidation);
      return;
    }
    const record = financeRecords.find(r => r.id === recordId);
    if (!record) return;
    
    setUpdatingRecord(recordId);
    try {
      const profitValue = (record.clientAmount || 0) - numericCost;
      const recordRef = doc(db, 'financeRecords', recordId);
      
      // 1. Update the Finance Record
      await updateDoc(recordRef, {
        providerCost: numericCost,
        status: 'settled',
        profit: profitValue,
        updatedAt: new Date()
      });

      // 2. Write-back to original Booking/Service if possible
      // This ensures data consistency across the app
      if (record.bookingId) {
        try {
           const bookingRef = doc(db, 'reservations', record.bookingId);
           const bookingSnap = await getDoc(bookingRef);
           
           if (bookingSnap.exists()) {
             const bookingData = bookingSnap.data();
             
             // If this finance record corresponds to a specific service in the booking array
             if (record.serviceKey && Array.isArray(bookingData.services)) {
               const updatedServices = bookingData.services.map(srv => {
                 // Try to match the service
                 const srvKey = srv.id || srv.serviceId || srv.type || srv.name || srv.title;
                 // Simple match or fallback to index if key logic matches sync logic
                 // For safety, we only update if we are reasonably sure
                 if (srvKey && record.serviceKey.includes(srvKey)) {
                   return { ...srv, providerCost: numericCost };
                 }
                 return srv;
               });
               
               await updateDoc(bookingRef, { services: updatedServices });
               console.log('Synced provider cost back to booking service:', record.bookingId);
             } 
             // If it's a simple single-service booking (legacy structure)
             else if (!record.serviceKey || record.serviceKey === 'booking') {
               await updateDoc(bookingRef, { providerCost: numericCost });
               console.log('Synced provider cost back to booking root:', record.bookingId);
             }
           }
        } catch (syncErr) {
           console.warn('Failed to sync provider cost back to booking:', syncErr);
           // Don't block the UI for this background sync
        }
      }
      
      setFinanceRecords(prev => prev.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          providerCost: numericCost,
          status: 'settled',
          profit: profitValue
        };
      }));
      
      showToast(t.confirmPayment);
    } catch (error) {
      console.error("Error updating provider cost:", error);
      alert(t.errorSaving);
    } finally {
      setUpdatingRecord(null);
    }
  };

  // Monthly data for reports based on finance records + provider costs
  const monthlyData = filteredFinanceRecords.reduce((acc, r) => {
    if (!r.date) return acc;
    
    const month = r.date.substring(0, 7);
    if (!acc[month]) {
      acc[month] = {
        month,
        income: 0,
        payments: 0,
        revenue: 0,
        expenses: 0,
        profit: 0
      };
    }
    acc[month].income += (r.clientAmount || 0);
    acc[month].payments += (r.providerCost || 0);
    return acc;
  }, {});
  
  // Add expenses and calculate profits
  Object.keys(monthlyData).forEach(month => {
    monthlyData[month].revenue = monthlyData[month].income - monthlyData[month].payments;
    
    filteredExpenses.forEach(expense => {
      if (expense.date && expense.date.substring(0, 7) === month) {
        monthlyData[month].expenses += (expense.amount || 0);
      }
    });
    
    monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].expenses;
  });
  
  // Format month name
  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    
    const monthNames = {
      ro: ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
           'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'],
      en: ['January', 'February', 'March', 'April', 'May', 'June',
           'July', 'August', 'September', 'October', 'November', 'December']
    };
    
    const [year, month] = monthStr.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    
    return `${monthNames[language][monthIndex]} ${year}`;
  };

  // Get expense category translation
  const getExpenseCategoryName = (category) => {
    switch(category) {
      case 'office': return t.office;
      case 'utilities': return t.utilities;
      case 'marketing': return t.marketing;
      case 'salary': return t.salary;
      case 'travel': return t.travel;
      default: return t.other;
    }
  };

  // Navigation helper
  const navigate = (tab, subView = null) => {
    setActiveTab(tab);
    setActiveSubView(subView);
    window.scrollTo(0, 0);
  };

  // Add floating action button
  const renderFloatingActionButton = () => {
    if (activeSubView !== null) return null;
    
    if (activeTab === 'expenses') {
      return (
        <button 
          onClick={() => setActiveSubView('add')}
          className="fixed right-4 bottom-24 bg-blue-600 text-white p-4 rounded-full shadow-lg z-10"
          aria-label={t.addExpense}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </button>
      );
    } else if (activeTab === 'categories') {
      return (
        <button 
          onClick={() => setActiveSubView('add')}
          className="fixed right-4 bottom-24 bg-blue-600 text-white p-4 rounded-full shadow-lg z-10"
          aria-label={t.addPayment}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </button>
      );
    }
    
    return null;
  };

  // Loading screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">{t.loading}</p>
      </div>
    );
  }

  if (authChecked && !companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-6 text-center">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700 font-medium mb-2">{t.errorCompanyNotFound}</p>
        {error && <p className="text-gray-500 text-sm">{error}</p>}
      </div>
    );
  }

  const hasFinancialData = financeRecords.length > 0 || reservations.length > 0 || categoryPayments.length > 0 || expenses.length > 0;

  if (!hasFinancialData) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        {/* Empty State Header */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-700 font-medium">{t.noFinancialData}</p>
          <p className="text-gray-500 text-sm mt-1 mb-6">{language === 'ro' ? 'Poți începe să adaugi cheltuieli chiar acum' : 'You can start adding expenses right now'}</p>
        </div>

        {/* Add Expense Form */}
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t.addExpense}
          </h3>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAddExpense(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.expenseCategory}</label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="office">{t.office}</option>
                <option value="utilities">{t.utilities}</option>
                <option value="marketing">{t.marketing}</option>
                <option value="salary">{t.salary}</option>
                <option value="travel">{t.travel}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.expenseAmount}</label>
              <input
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.date}</label>
              <input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.expenseDescription}</label>
              <input
                type="text"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                placeholder={t.expensePlaceholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !newExpense.amount}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t.saveExpense}
            </button>
          </form>
        </div>

        {/* Toast notification */}
        {toast.show && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  // Render dashboard view
  const renderDashboard = () => (
    <div className="space-y-6 pb-24">
      {/* Header and filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">{t.companyDashboard}</p>
            <h2 className="text-2xl font-semibold text-gray-900">{t.financeTitle}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>{pendingFinance.length} {t.pendingPayments}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder={t.clientFilter}
              value={filters.client}
              onChange={(e) => setFilters({ ...filters, client: e.target.value })}
            />
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={filters.service}
              onChange={(e) => setFilters({...filters, service: e.target.value})}
            >
              <option value="all">{t.serviceType}</option>
              {serviceOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input
              type="date"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={filters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              placeholder={t.startDate}
            />
            <input
              type="date"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={filters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              placeholder={t.endDate}
            />
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={filters.timeRange}
              onChange={(e) => applyTimeRange(e.target.value)}
            >
              <option value="all">{t.allPeriods}</option>
              <option value="week">{t.thisWeek}</option>
              <option value="month">{t.thisMonth}</option>
              <option value="year">{t.thisYear}</option>
            </select>
            <button
              className="px-3 py-2 bg-gray-100 text-sm rounded-lg"
              onClick={() => setFilters({ service: 'all', startDate: '', endDate: '', timeRange: 'all', client: '' })}
            >
              {t.clearFilters}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">{t.exportTitle}</span>
            <input
              type="month"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              aria-label={t.exportMonth}
            />
            <button
              className="px-3 py-2 bg-gray-100 text-sm rounded-lg disabled:opacity-60"
              onClick={() => handleExport('csv')}
              disabled={exporting}
            >
              {t.exportCsv}
            </button>
            <button
              className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-60"
              onClick={() => handleExport('xlsx')}
              disabled={exporting}
            >
              {t.exportXlsx}
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">{t.clientRevenue}</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalClientRevenue)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold">€</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">{t.providerPayout}</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalProviderCosts)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-semibold">↧</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">{t.grossProfit}</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(grossProfit)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-semibold">➕</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">{t.expensesTotal}</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-semibold">-</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">{t.trueProfit}</p>
              <p className={`text-2xl font-semibold mt-1 ${trueProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(trueProfit)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-semibold">✓</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">{t.pendingPayments}</p>
              <p className="text-2xl font-semibold mt-1">{pendingFinance.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending payments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t.pendingPayments}</h3>
            <p className="text-sm text-gray-500">{t.pendingDotLabel}</p>
          </div>
          <div className="text-sm bg-rose-50 text-rose-600 px-3 py-1 rounded-full">{pendingFinance.length} {t.pending}</div>
        </div>
        {pendingFinance.length === 0 ? (
          <div className="text-center text-gray-500 py-6">{t.noPending}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(showAllPending ? pendingFinance : pendingFinance.slice(0, 6)).map(item => (
              <div key={item.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    {item.clientName && (
                      <p className="text-xs font-semibold text-indigo-600 mb-1">{item.clientName}</p>
                    )}
                    <p className="text-sm font-semibold capitalize text-gray-900">{item.service}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(item.date)}</p>
                  </div>
                  <span className="h-3 w-3 rounded-full bg-rose-500 mt-1"></span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs text-gray-500">{t.clientAmount}</p>
                    <p className="font-semibold">{formatCurrency(item.clientAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{t.providerCost}</p>
                    <p className="font-semibold text-gray-900">{item.providerCost ? formatCurrency(item.providerCost) : '-'}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder={t.providerCostPlaceholder}
                    value={costDrafts[item.id] ?? ''}
                    onChange={(e) => setCostDrafts({...costDrafts, [item.id]: e.target.value})}
                  />
                  <button
                    className="px-4 py-2 btn-success text-sm rounded-lg"
                    onClick={() => handleProviderCostUpdate(item.id, costDrafts[item.id])}
                    disabled={updatingRecord === item.id}
                  >
                    {updatingRecord === item.id ? '...' : t.confirmPayment}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {pendingFinance.length > 6 && (
          <div className="text-center mt-4">
            <button
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg"
              onClick={() => setShowAllPending(!showAllPending)}
            >
              {showAllPending ? t.hideFilters || 'Show less' : t.viewAll}
            </button>
          </div>
        )}
      </div>

      {/* Profit by service */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t.profitByService}</h3>
          <div className="text-sm text-gray-500">{serviceBreakdown.length} {t.transactions}</div>
        </div>
        {serviceBreakdown.length === 0 ? (
          <div className="text-center text-gray-500 py-6">{t.noTransactions}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serviceBreakdown.map((item, index) => (
              <div key={index} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold capitalize text-gray-900">{item.service}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${item.margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                    {item.margin.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>{t.income}</span>
                    <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.providerCost}</span>
                    <span className="font-semibold">{formatCurrency(item.cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.profitPerService}</span>
                    <span className={`font-semibold ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(item.profit)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render transactions view
  const renderTransactions = () => {
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(filteredFinanceRecords.length / pageSize));
    const pageItems = filteredFinanceRecords.slice((transactionsPage - 1) * pageSize, transactionsPage * pageSize);

    return (
      <div className="space-y-4 pb-20">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="font-bold">{t.transactions}</h2>
              <input
                type="text"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-64"
                placeholder={t.clientFilter}
                value={filters.client}
                onChange={(e) => setFilters({ ...filters, client: e.target.value })}
              />
            </div>
          </div>
          
          <div className="p-4">
            {filteredFinanceRecords.length === 0 ? (
              <div className="py-8 text-center text-gray-500">{t.noTransactions}</div>
            ) : (
              <div className="space-y-3">
                {pageItems.map(item => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <div className="font-medium text-sm capitalize">{item.service}</div>
                      <div className="text-xs text-gray-500">{formatDate(item.date)}</div>
                    </div>
                    {item.clientName && <p className="text-xs font-semibold text-indigo-600">{item.clientName}</p>}
                    <div className="text-xs text-gray-500 mt-1 mb-2 line-clamp-1">{item.description}</div>
                    <div className="text-right font-bold text-lg">
                      {formatCurrency(item.clientAmount)}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {((transactionsPage - 1) * pageSize) + 1}-{Math.min(transactionsPage * pageSize, filteredFinanceRecords.length)} / {filteredFinanceRecords.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                      onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                      disabled={transactionsPage === 1}
                    >
                      ‹
                    </button>
                    <span className="text-sm text-gray-700">{transactionsPage}/{totalPages}</span>
                    <button
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                      onClick={() => setTransactionsPage(p => Math.min(totalPages, p + 1))}
                      disabled={transactionsPage === totalPages}
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{t.total}</div>
                    <div className="font-bold text-lg">{formatCurrency(totalClientRevenue)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderServiceCards = () => {
    const pageSize = 6;
    const totalPages = Math.max(1, Math.ceil(serviceBreakdown.length / pageSize));
    const pageItems = serviceBreakdown.slice((servicePage - 1) * pageSize, servicePage * pageSize);

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t.profitByService}</h3>
          <div className="text-sm text-gray-500">{serviceBreakdown.length} {t.transactions}</div>
        </div>
        {serviceBreakdown.length === 0 ? (
          <div className="text-center text-gray-500 py-6">{t.noTransactions}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pageItems.map((item, index) => (
                <div key={`${item.service}-${index}`} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold capitalize text-gray-900">{item.service}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${item.margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                      {item.margin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>{t.income}</span>
                      <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.providerCost}</span>
                      <span className="font-semibold">{formatCurrency(item.cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.profitPerService}</span>
                      <span className={`font-semibold ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(item.profit)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {serviceBreakdown.length > pageSize && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {((servicePage - 1) * pageSize) + 1}-{Math.min(servicePage * pageSize, serviceBreakdown.length)} / {serviceBreakdown.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                    onClick={() => setServicePage(p => Math.max(1, p - 1))}
                    disabled={servicePage === 1}
                  >
                    ‹
                  </button>
                  <span className="text-sm text-gray-700">{servicePage}/{totalPages}</span>
                  <button
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                    onClick={() => setServicePage(p => Math.min(totalPages, p + 1))}
                    disabled={servicePage === totalPages}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Categories view removed (profit moved to transactions)

  // Render expenses view
  const renderExpenses = () => {
    if (activeSubView === 'add') {
      return (
        <div className="pb-20">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center">
              <button 
                onClick={() => setActiveSubView(null)}
                className="mr-2"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <h2 className="font-bold">{t.addExpense}</h2>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.expenseCategory}</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    <option value="office">{t.office}</option>
                    <option value="utilities">{t.utilities}</option>
                    <option value="marketing">{t.marketing}</option>
                    <option value="salary">{t.salary}</option>
                    <option value="travel">{t.travel}</option>
                    <option value="other">{t.other}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.expenseAmount}</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.date}</label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.expenseDescription}</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder={t.expensePlaceholder}
                  />
                </div>
                
                <button
                  className="w-full mt-4 py-3 bg-blue-600 text-white font-medium rounded-lg"
                  onClick={handleAddExpense}
                >
                  {t.saveExpense}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6 pb-20">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h2 className="font-bold">{t.expenses}</h2>
              <button
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg"
                onClick={() => setActiveSubView('add')}
              >
                <span className="text-lg leading-none">+</span>
                <span>{t.addExpense || 'Add expense'}</span>
              </button>
            </div>
          </div>
          
          <div className="p-4">
            {filteredExpenses.length === 0 ? (
              <div className="py-8 text-center text-gray-500 flex flex-col items-center gap-3">
                <div>{t.noExpenses}</div>
                <button
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg"
                  onClick={() => setActiveSubView('add')}
                >
                  <span className="text-lg leading-none">+</span>
                  <span>{t.addExpense || 'Add expense'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
                >
                  {filteredExpenses
                    .slice((expensesPage - 1) * 9, expensesPage * 9)
                    .map(item => (
                      <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between">
                          <div className="font-medium text-sm capitalize">{getExpenseCategoryName(item.category)}</div>
                          <div className="text-xs text-gray-500">{formatDate(item.date)}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 mb-2 line-clamp-2">{item.description}</div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-right font-bold">
                            €{item.amount.toLocaleString()}
                          </div>
                          <button
                            className="text-xs text-rose-600 hover:text-rose-600 px-2 py-1 rounded"
                            onClick={() => handleDeleteExpense(item.id)}
                            disabled={deletingExpenseId === item.id}
                          >
                            {deletingExpenseId === item.id ? '...' : t.deleteExpense}
                          </button>
                        </div>
                      </div>
                    ))}
                  
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg col-span-full">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{t.total}</div>
                      <div className="font-bold">€{totalExpenses.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {filteredExpenses.length > 9 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {((expensesPage - 1) * 9) + 1}-{Math.min(expensesPage * 9, filteredExpenses.length)} / {filteredExpenses.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                        onClick={() => setExpensesPage(p => Math.max(1, p - 1))}
                        disabled={expensesPage === 1}
                      >
                        ‹
                      </button>
                      <span className="text-sm text-gray-700">
                        {expensesPage}/{Math.max(1, Math.ceil(filteredExpenses.length / 9))}
                      </span>
                      <button
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                        onClick={() => setExpensesPage(p => Math.min(Math.max(1, Math.ceil(filteredExpenses.length / 9)), p + 1))}
                        disabled={expensesPage === Math.max(1, Math.ceil(filteredExpenses.length / 9))}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold">{t.expensesByCategory}</h2>
          </div>
          
          <div className="p-4">
            {filteredExpenses.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                {t.noExpenses}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.keys(filteredExpenses.reduce((acc, expense) => {
                  const key = expense.category;
                  if (!acc[key]) {
                    acc[key] = 0;
                  }
                  acc[key] += expense.amount;
                  return acc;
                }, {})).map((category, index) => {
                  const amount = filteredExpenses
                    .filter(e => e.category === category)
                    .reduce((sum, e) => sum + e.amount, 0);
                  const percentage = totalExpenses > 0 ? amount / totalExpenses * 100 : 0;
                  
                  return (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium capitalize">{getExpenseCategoryName(category)}</div>
                        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500">{t.amount}</div>
                        <div className="font-medium">€{amount.toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render reports view
  const renderReports = () => (
    <div className="space-y-4 pb-20">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="font-bold">{t.financialSummary}</h2>
            <div className="flex flex-wrap gap-2 items-center justify-end">
              <input
                type="text"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder={t.clientFilter}
                value={filters.client}
                onChange={(e) => setFilters({ ...filters, client: e.target.value })}
              />
              <input
                type="date"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={filters.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                placeholder={t.startDate}
              />
              <input
                type="date"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={filters.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                placeholder={t.endDate}
              />
              <select
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={filters.timeRange}
                onChange={(e) => applyTimeRange(e.target.value)}
              >
                <option value="all">{t.allPeriods}</option>
                <option value="week">{t.thisWeek}</option>
                <option value="month">{t.thisMonth}</option>
                <option value="year">{t.thisYear}</option>
                <option value="custom">{t.customRange}</option>
              </select>
              <button
                className="px-3 py-2 bg-gray-100 text-sm rounded-lg"
                onClick={() => setFilters({ service: 'all', startDate: '', endDate: '', timeRange: 'all', client: '' })}
              >
                {t.clearFilters}
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">{t.income}</div>
              <div className="text-xl font-bold mt-1">€{totalIncome.toLocaleString()}</div>
              <div className="w-full bg-blue-100 mt-2 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-full"></div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">{t.payments}</div>
              <div className="text-xl font-bold mt-1">€{totalPayments.toLocaleString()}</div>
              <div className="w-full bg-blue-100 mt-2 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${totalIncome > 0 ? (totalPayments / totalIncome * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">{t.revenue}</div>
              <div className="text-xl font-bold mt-1">€{totalRevenue.toLocaleString()}</div>
              <div className="w-full bg-blue-100 mt-2 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${totalIncome > 0 ? (totalRevenue / totalIncome * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">{t.expensesTotal}</div>
              <div className="text-xl font-bold mt-1">€{totalExpenses.toLocaleString()}</div>
              <div className="w-full bg-blue-100 mt-2 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${totalRevenue > 0 ? (totalExpenses / totalRevenue * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-500">{t.netProfit}</div>
              <div className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                €{netProfit.toLocaleString()}
              </div>
              <div className="w-full bg-blue-100 mt-2 rounded-full h-2">
                <div 
                  className={`${netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'} h-2 rounded-full`}
                  style={{ width: `${totalRevenue > 0 ? Math.min(Math.abs(netProfit / totalRevenue * 100), 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold">{t.monthlyOverview}</h2>
        </div>
        
        <div className="p-4">
          {Object.keys(monthlyData).length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {t.noMonthlyData}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.values(monthlyData).map((data, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">{formatMonth(data.month)}</div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                    <div>
                      <div className="text-xs text-gray-500">{t.income}</div>
                      <div className="font-medium">€{data.income.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t.payments}</div>
                      <div className="font-medium">€{data.payments.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t.revenue}</div>
                      <div className="font-medium">€{data.revenue.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t.expensesTotal}</div>
                      <div className="font-medium">€{data.expenses.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">{t.profit}</div>
                      <div className={`font-medium ${data.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        €{data.profit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Get appropriate view based on active tab
  const getActiveView = () => {
    switch (activeTab) {
      case 'transactions':
        return renderTransactions();
      case 'expenses':
        return renderExpenses();
      case 'reports':
        return renderReports();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Main content area */}
      <div className="px-4 py-4">
        {getActiveView()}
      </div>
      
      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-4">
          <button 
            onClick={() => navigate('dashboard')}
            className={`flex flex-col items-center justify-center py-2 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
            <span className="text-xs mt-1">{t.dashboard}</span>
          </button>
          
          <button 
            onClick={() => navigate('transactions')}
            className={`flex flex-col items-center justify-center py-2 ${activeTab === 'transactions' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span className="text-xs mt-1">{t.transactions}</span>
          </button>
          
          <button 
            onClick={() => navigate('expenses')}
            className={`flex flex-col items-center justify-center py-2 ${activeTab === 'expenses' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-xs mt-1">{t.expenses}</span>
          </button>
          
          <button 
            onClick={() => navigate('reports')}
            className={`flex flex-col items-center justify-center py-2 ${activeTab === 'reports' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span className="text-xs mt-1">{t.reports}</span>
          </button>
        </div>
      </div>
      
      {/* Toast notification */}
      <div className={`fixed bottom-20 left-4 right-4 btn-success rounded-lg px-4 py-3 shadow-lg transition-opacity duration-300 flex items-center z-20 ${toast.show ? 'opacity-100' : 'opacity-0'}`}>
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <div>{toast.message}</div>
      </div>
    </div>
  );
};

export default Finance;
