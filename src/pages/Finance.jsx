import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, getFirestore, addDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

/**
 * Mobile App Interface Finance Component
 * Designed to mimic native mobile app UI patterns
 */
const Finance = () => {
  // State management
  const [reservations, setReservations] = useState([]);
  const [categoryPayments, setCategoryPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubView, setActiveSubView] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userId, setUserId] = useState(null);
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
      
      // Dashboard
      summary: 'Sumar',
      income: 'Venit',
      payments: 'Plăți',
      revenue: 'Profit',
      expensesTotal: 'Cheltuieli',
      netProfit: 'Profit Net',
      recentTransactions: 'Tranzacții Recente',
      viewAll: 'Vezi Toate',
      
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
      
      // Messages
      loading: 'Se încarcă...',
      paymentAdded: 'Plată adăugată cu succes!',
      expenseAdded: 'Cheltuială adăugată cu succes!',
      errorCompanyNotFound: 'Nu s-a găsit compania',
      errorValidation: 'Completează toate câmpurile',
      errorSaving: 'Eroare la salvare. Încearcă din nou.'
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
      
      // Dashboard
      summary: 'Summary',
      income: 'Income',
      payments: 'Payments',
      revenue: 'Revenue',
      expensesTotal: 'Expenses',
      netProfit: 'Net Profit',
      recentTransactions: 'Recent Transactions',
      viewAll: 'View All',
      
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
      
      // Messages
      loading: 'Loading...',
      paymentAdded: 'Payment added successfully!',
      expenseAdded: 'Expense added successfully!',
      errorCompanyNotFound: 'Company not found',
      errorValidation: 'Please fill all fields',
      errorSaving: 'Error saving. Please try again.'
    }
  };

  // Get translation
  const t = translations[language];

  // Firebase
  const db = getFirestore();
  const auth = getAuth();
  
  // Get user and company
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        setUserId(user.uid);
        
        try {
          const companiesRef = collection(db, 'companies');
          const q = query(companiesRef, where("contactEmail", "==", user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            setCompanyId(querySnapshot.docs[0].id);
          }
        } catch (error) {
          console.error("Error finding company:", error);
        }
      } else {
        setUserEmail(null);
        setUserId(null);
        setCompanyId(null);
      }
    });
    
    return () => unsubscribe();
  }, [auth, db]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;

      const isOwnedByCurrentUser = (record) => {
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
        
        const reservationsList = reservationsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdBy: data.createdBy,
            createdByEmail: data.createdByEmail,
            clientIncome: data.paidAmount || 0,
            service: data.accommodationType || 'Unknown',
            date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0] : '',
            description: `${data.accommodationType || 'Booking'} - ${data.checkIn || 'N/A'} to ${data.checkOut || 'N/A'}`
          };
        }).filter(isOwnedByCurrentUser);
        
        setReservations(reservationsList);
        
        // Fetch category payments
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
        }).filter(isOwnedByCurrentUser);
        
        setCategoryPayments(paymentsList);
        
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
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, companyId, userEmail, userId]);

  // Calculate summary data
  const categoryIncomeData = reservations.reduce((acc, r) => {
    const category = r.service;
    if (!acc[category]) {
      acc[category] = { income: 0, count: 0 };
    }
    acc[category].income += r.clientIncome;
    acc[category].count += 1;
    return acc;
  }, {});
  
  const categoryPaymentData = categoryPayments.reduce((acc, p) => {
    const category = p.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += p.amount;
    return acc;
  }, {});
  
  const categoryRevenueData = Object.keys(categoryIncomeData).map(category => {
    const income = categoryIncomeData[category].income;
    const payment = categoryPaymentData[category] || 0;
    const revenue = income - payment;
    const count = categoryIncomeData[category].count;
    
    return {
      category,
      income,
      payment,
      revenue,
      count,
      margin: income > 0 ? (revenue / income * 100) : 0
    };
  });
  
  const totalIncome = Object.values(categoryIncomeData).reduce((sum, data) => sum + data.income, 0);
  const totalPayments = Object.values(categoryPaymentData).reduce((sum, amount) => sum + amount, 0);
  const totalRevenue = totalIncome - totalPayments;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ro' ? 'ro-RO' : 'en-US');
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
      await addDoc(collection(db, 'expenses'), {
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
        id: `expense-${Date.now()}`,
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

  // Monthly data for reports
  const monthlyData = reservations.reduce((acc, r) => {
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
    acc[month].income += (r.clientIncome || 0);
    return acc;
  }, {});
  
  // Add payments to monthly data
  categoryPayments.forEach(payment => {
    if (!payment.date) return;
    
    const month = payment.date.substring(0, 7);
    if (monthlyData[month]) {
      monthlyData[month].payments += (payment.amount || 0);
    }
  });
  
  // Add expenses and calculate profits
  Object.keys(monthlyData).forEach(month => {
    monthlyData[month].revenue = monthlyData[month].income - monthlyData[month].payments;
    
    // Add expenses
    expenses.forEach(expense => {
      if (expense.date && expense.date.substring(0, 7) === month) {
        monthlyData[month].expenses += (expense.amount || 0);
      }
    });
    
    // Calculate profit
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

  // Render dashboard view
  const renderDashboard = () => (
    <div className="space-y-5 pb-20">
      {/* Summary Cards */}
      <div>
        <h2 className="text-lg font-bold mb-3">{t.summary}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-500 text-sm">{t.income}</span>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold">€{totalIncome.toLocaleString()}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-500 text-sm">{t.revenue}</span>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold">€{totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-500 text-sm">{t.expensesTotal}</span>
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold">€{totalExpenses.toLocaleString()}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-500 text-sm">{t.netProfit}</span>
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
            <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{netProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold">{t.recentTransactions}</h2>
          <button 
            onClick={() => navigate('transactions')}
            className="text-blue-600 text-sm font-medium"
          >
            {t.viewAll}
          </button>
        </div>
        
        <div className="p-4">
          {reservations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {t.noTransactions}
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.slice(0, 3).map(item => (
                <div key={item.id} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm capitalize">{item.service}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(item.date)}</div>
                  </div>
                  <div className="text-right font-bold">
                    €{item.clientIncome.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Category Summary */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold">{t.categoryOverview}</h2>
          <button 
            onClick={() => navigate('categories')}
            className="text-blue-600 text-sm font-medium"
          >
            {t.viewAll}
          </button>
        </div>
        
        <div className="p-4">
          {categoryRevenueData.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {t.noTransactions}
            </div>
          ) : (
            <div className="space-y-3">
              {categoryRevenueData.slice(0, 3).map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm capitalize">{item.category}</div>
                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {item.count}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">{t.income}</div>
                      <div className="font-medium">€{item.income.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t.margin}</div>
                      <div className="font-medium">{item.margin.toFixed(1)}%</div>
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

  // Render transactions view
  const renderTransactions = () => (
    <div className="space-y-4 pb-20">
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold">{t.transactions}</h2>
        </div>
        
        <div className="p-4">
          {reservations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">{t.noTransactions}</div>
          ) : (
            <div className="space-y-3">
              {reservations.map(item => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <div className="font-medium text-sm capitalize">{item.service}</div>
                    <div className="text-xs text-gray-500">{formatDate(item.date)}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 mb-2 line-clamp-1">{item.description}</div>
                  <div className="text-right font-bold text-lg">
                    €{item.clientIncome.toLocaleString()}
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="font-medium">{t.total}</div>
                  <div className="font-bold text-lg">€{totalIncome.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render categories view
  const renderCategories = () => {
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
              <h2 className="font-bold">{t.addPayment}</h2>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    value={newPayment.category}
                    onChange={(e) => setNewPayment({...newPayment, category: e.target.value})}
                  >
                    <option value="">{t.selectCategory}</option>
                    {Object.keys(categoryIncomeData).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.amount}</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.date}</label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                    placeholder={t.paymentPlaceholder}
                  />
                </div>
                
                <button
                  className="w-full mt-4 py-3 bg-blue-600 text-white font-medium rounded-lg"
                  onClick={handleAddPayment}
                >
                  {t.savePayment}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold">{t.categories}</h2>
          </div>
          
          <div className="p-4">
            {categoryRevenueData.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                {t.noTransactions}
              </div>
            ) : (
              <div className="space-y-3">
                {categoryRevenueData.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium capitalize">{item.category}</div>
                      <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {item.count}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500">{t.income}</div>
                        <div className="font-medium">€{item.income.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{t.payments}</div>
                        <div className="font-medium">€{item.payment.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{t.margin}</span>
                        <span className="font-medium">{item.margin.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{t.total}</div>
                    <div className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                      {reservations.length}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">{t.income}</div>
                      <div className="font-medium">€{totalIncome.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t.payments}</div>
                      <div className="font-medium">€{totalPayments.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold">{t.paymentHistory}</h2>
          </div>
          
          <div className="p-4">
            {categoryPayments.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                {t.noPayments}
              </div>
            ) : (
              <div className="space-y-3">
                {categoryPayments.map(item => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <div className="font-medium text-sm capitalize">{item.category}</div>
                      <div className="text-xs text-gray-500">{formatDate(item.date)}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 mb-2 line-clamp-1">{item.description}</div>
                    <div className="text-right font-bold">
                      €{item.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      <div className="space-y-4 pb-20">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold">{t.expenses}</h2>
          </div>
          
          <div className="p-4">
            {expenses.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                {t.noExpenses}
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(item => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <div className="font-medium text-sm capitalize">{getExpenseCategoryName(item.category)}</div>
                      <div className="text-xs text-gray-500">{formatDate(item.date)}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 mb-2 line-clamp-1">{item.description}</div>
                    <div className="text-right font-bold">
                      €{item.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{t.total}</div>
                    <div className="font-bold">€{totalExpenses.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold">{t.expensesByCategory}</h2>
          </div>
          
          <div className="p-4">
            {expenses.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                {t.noExpenses}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.keys(expenses.reduce((acc, expense) => {
                  const key = expense.category;
                  if (!acc[key]) {
                    acc[key] = 0;
                  }
                  acc[key] += expense.amount;
                  return acc;
                }, {})).map((category, index) => {
                  const amount = expenses
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
          <h2 className="font-bold">{t.financialSummary}</h2>
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
              <div className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                €{netProfit.toLocaleString()}
              </div>
              <div className="w-full bg-blue-100 mt-2 rounded-full h-2">
                <div 
                  className={`${netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'} h-2 rounded-full`}
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
                      <div className={`font-medium ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
      case 'categories':
        return renderCategories();
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
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow sticky top-0 z-20">
        <h1 className="text-lg font-bold">{t.financeTitle}</h1>
        <p className="text-xs text-gray-500 mb-1">{t.companyDashboard}</p>
      </div>
      
      {/* Main content area */}
      <div className="px-4 py-4">
        {getActiveView()}
      </div>
      
      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-5">
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
            onClick={() => navigate('categories')}
            className={`flex flex-col items-center justify-center py-2 ${activeTab === 'categories' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <span className="text-xs mt-1">{t.categories}</span>
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
      
      {/* Floating Action Button */}
      {renderFloatingActionButton()}
      
      {/* Toast notification */}
      <div className={`fixed bottom-20 left-4 right-4 bg-green-600 text-white rounded-lg px-4 py-3 shadow-lg transition-opacity duration-300 flex items-center z-20 ${toast.show ? 'opacity-100' : 'opacity-0'}`}>
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <div>{toast.message}</div>
      </div>
    </div>
  );
};

export default Finance;
