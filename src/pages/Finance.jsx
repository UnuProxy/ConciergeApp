import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, getFirestore, addDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Finance = () => {
  // State for component data
  const [reservations, setReservations] = useState([]);
  const [categoryPayments, setCategoryPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  const [companyId, setCompanyId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get language from localStorage or use default (Romanian)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'ro';
  });

  // Listen for language changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('appLanguage') || 'ro';
      setLanguage(currentLang);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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

  // Translations
  const translations = {
    ro: {
      // Page titles
      financeManagement: 'Gestionare Financiară',
      companyDashboard: 'Panou de Control',
      dashboard: 'Panou Principal',
      transactions: 'Tranzacții',
      categoryPayments: 'Plăți pe Categorii',
      expenses: 'Cheltuieli',
      reports: 'Rapoarte',
      loading: 'Se încarcă...',
      
      // Summary cards
      totalIncome: 'Venit Total',
      paymentsTotal: 'Plăți Totale',
      revenue: 'Venit Net',
      expensesTotal: 'Cheltuieli Totale',
      netProfit: 'Profit Net',
      
      // Dashboard view
      monthlyTrends: 'Tendințe Lunare',
      incomeByCategory: 'Venit pe Categorii',
      expensesByCategory: 'Cheltuieli pe Categorii',
      recentTransactions: 'Tranzacții Recente',
      viewAll: 'Vezi Toate',
      
      // Transactions view
      transactionsTitle: 'Tranzacții',
      date: 'Data',
      service: 'Serviciu',
      description: 'Descriere',
      income: 'Venit',
      noTransactions: 'Nu s-au găsit tranzacții.',
      total: 'Total',
      
      // Category view
      categoryOverview: 'Privire de Ansamblu pe Categorii',
      category: 'Categorie',
      transactionCount: 'Număr Tranzacții',
      payments: 'Plăți',
      margin: 'Marjă',
      addCategoryPayment: 'Adaugă Plată pe Categorie',
      selectCategory: 'Selectează Categoria',
      amountInput: 'Sumă (€)',
      paymentDescription: 'Descriere Plată',
      paymentPlaceholder: 'ex. Plată către proprietarul vilei',
      addPayment: 'Adaugă Plată',
      paymentHistory: 'Istoric Plăți',
      noPayments: 'Nu s-au găsit plăți.',
      
      
      // Expenses view
      addNewExpense: 'Adaugă Cheltuială Nouă',
      expenseCategory: 'Categorie Cheltuială',
      expenseAmount: 'Sumă (€)',
      expenseDate: 'Data',
      expenseDescription: 'Descriere',
      expensePlaceholder: 'ex. Plată chirie birou',
      addExpense: 'Adaugă Cheltuială',
      noExpenses: 'Nu s-au găsit cheltuieli.',
      expenseTotal: 'Total Cheltuieli',
      
      // Reports view
      monthlyOverview: 'Privire de Ansamblu Lunară',
      month: 'Luna',
      profit: 'Profit',
      noMonthlyData: 'Nu există date lunare disponibile.',
      financialSummary: 'Rezumat Financiar',
      metric: 'Indicator',
      amountValue: 'Sumă',
      percentage: 'Procent',
      grossRevenue: 'Venit Brut',
      
      // Expense categories
      office: 'Birou',
      utilities: 'Utilități',
      marketing: 'Marketing',
      salary: 'Salarii',
      travel: 'Transport',
      other: 'Altele',
      
      // Messages
      noCompanyFound: 'Nu s-a găsit nicio companie pentru utilizatorul curent',
      selectCategoryAndAmount: 'Vă rugăm să selectați o categorie și să introduceți o sumă',
      paymentAddedSuccess: 'Plata a fost adăugată cu succes!',
      paymentAddedError: 'Eroare la adăugarea plății. Vă rugăm să încercați din nou.',
      expenseAddedSuccess: 'Cheltuiala a fost adăugată cu succes!',
      expenseAddedError: 'Eroare la adăugarea cheltuielii. Vă rugăm să încercați din nou.',
      menu: 'Meniu',
      
      // Help text
      dashboardHelp: 'Vizualizare generală a finanțelor companiei',
      transactionsHelp: 'Lista tuturor rezervărilor și veniturilor',
      categoriesHelp: 'Gestionare plăți pe categorii de servicii',
      expensesHelp: 'Adăugare și vizualizare cheltuieli',
      reportsHelp: 'Rapoarte financiare detaliate',
    },
    en: {
      // Page titles
      financeManagement: 'Finance Management',
      companyDashboard: 'Company Dashboard',
      dashboard: 'Main Dashboard',
      transactions: 'Transactions',
      categoryPayments: 'Category Payments',
      expenses: 'Expenses',
      reports: 'Reports',
      loading: 'Loading...',
      
      // Summary cards
      totalIncome: 'Total Income',
      paymentsTotal: 'Total Payments',
      revenue: 'Revenue',
      expensesTotal: 'Total Expenses',
      netProfit: 'Net Profit',
      
      // Dashboard view
      monthlyTrends: 'Monthly Trends',
      incomeByCategory: 'Income by Category',
      expensesByCategory: 'Expenses by Category',
      recentTransactions: 'Recent Transactions',
      viewAll: 'View All',
      
      // Transactions view
      transactionsTitle: 'Transactions',
      date: 'Date',
      service: 'Service',
      description: 'Description',
      income: 'Income',
      noTransactions: 'No transactions found.',
      total: 'Total',
      
      // Category view
      categoryOverview: 'Category Overview',
      category: 'Category',
      transactionCount: 'Transactions',
      payments: 'Payments',
      margin: 'Margin',
      addCategoryPayment: 'Add Category Payment',
      selectCategory: 'Select Category',
      amountInput: 'Amount (€)',
      paymentDescription: 'Description',
      paymentPlaceholder: 'e.g. Payment to villa owner',
      addPayment: 'Add Payment',
      paymentHistory: 'Payment History',
      noPayments: 'No payments found.',
     
      
      // Expenses view
      addNewExpense: 'Add New Expense',
      expenseCategory: 'Category',
      expenseAmount: 'Amount (€)',
      expenseDate: 'Date',
      expenseDescription: 'Description',
      expensePlaceholder: 'e.g. Office rent payment',
      addExpense: 'Add Expense',
      noExpenses: 'No expenses found.',
      expenseTotal: 'Total Expenses',
      
      // Reports view
      monthlyOverview: 'Monthly Overview',
      month: 'Month',
      profit: 'Profit',
      noMonthlyData: 'No monthly data available.',
      financialSummary: 'Financial Summary',
      metric: 'Metric',
      amountValue: 'Amount',
      percentage: 'Percentage',
      grossRevenue: 'Gross Revenue',
      
      // Expense categories
      office: 'Office',
      utilities: 'Utilities',
      marketing: 'Marketing',
      salary: 'Salary',
      travel: 'Travel',
      other: 'Other',
      
      // Messages
      noCompanyFound: 'No company found for current user',
      selectCategoryAndAmount: 'Please select a category and enter an amount',
      paymentAddedSuccess: 'Payment added successfully!',
      paymentAddedError: 'Error adding payment. Please try again.',
      expenseAddedSuccess: 'Expense added successfully!',
      expenseAddedError: 'Error adding expense. Please try again.',
      menu: 'Menu',
      
      // Help text
      dashboardHelp: 'Overview of your company finances',
      transactionsHelp: 'List of all bookings and income',
      categoriesHelp: 'Manage payments for service categories',
      expensesHelp: 'Add and view company expenses',
      reportsHelp: 'Detailed financial reports',
    }
  };

  // Get current translation
  const t = translations[language];

  // Reference to Firestore database
  const db = getFirestore();
  const auth = getAuth();
  
  // Get current user and their company ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        
        // Find company that matches the user's email
        try {
          const companiesRef = collection(db, 'companies');
          const q = query(companiesRef, where("contactEmail", "==", user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Get the first company that matches (there should only be one)
            const companyDoc = querySnapshot.docs[0];
            setCompanyId(companyDoc.id);
            console.log(`Found company: ${companyDoc.id} for user: ${user.email}`);
          } else {
            console.error("No company found for this user email");
          }
        } catch (error) {
          console.error("Error finding company:", error);
        }
      } else {
        setUserEmail(null);
        setCompanyId(null);
      }
    });
    
    return () => unsubscribe();
  }, [auth, db]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return; // Only fetch if we have a company ID
      
      try {
        setLoading(true);
        console.log(`Fetching data for company: ${companyId}`);
        
        // Fetch reservations
        const reservationsRef = collection(db, 'reservations');
        const reservationsQuery = query(reservationsRef, where("companyId", "==", companyId));
        const reservationsSnapshot = await getDocs(reservationsQuery);
        
        const reservationsList = reservationsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            clientIncome: data.paidAmount || 0,
            service: data.accommodationType || 'Unknown',
            date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0] : '',
            description: `${data.accommodationType || 'Booking'} - Check In: ${data.checkIn || 'N/A'}, Check Out: ${data.checkOut || 'N/A'}`
          };
        });
        
        setReservations(reservationsList);
        
        // Fetch category payments
        try {
          const paymentsRef = collection(db, 'categoryPayments');
          const paymentsQuery = query(paymentsRef, where("companyId", "==", companyId));
          const paymentsSnapshot = await getDocs(paymentsQuery);
          
          const paymentsList = paymentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              category: data.category || 'Unknown',
              amount: data.amount || 0,
              date: data.date ? new Date(data.date.seconds * 1000).toISOString().split('T')[0] : '',
              description: data.description || ''
            };
          });
          
          setCategoryPayments(paymentsList);
        } catch (error) {
          console.error("Error fetching category payments:", error);
          setCategoryPayments([]);
        }
        
        // Fetch expenses
        try {
          const expensesRef = collection(db, 'expenses');
          const expensesQuery = query(expensesRef, where("companyId", "==", companyId));
          const expensesSnapshot = await getDocs(expensesQuery);
          
          const expensesList = expensesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              amount: data.amount || 0,
              date: data.date ? new Date(data.date.seconds * 1000).toISOString().split('T')[0] : '',
              description: data.description || ''
            };
          });
          
          setExpenses(expensesList);
        } catch (error) {
          console.error("Error fetching expenses:", error);
          setExpenses([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, companyId]);

  // Group reservations by category
  const categoryIncomeData = reservations.reduce((acc, r) => {
    const category = r.service;
    if (!acc[category]) {
      acc[category] = {
        income: 0,
        count: 0
      };
    }
    acc[category].income += r.clientIncome;
    acc[category].count += 1;
    return acc;
  }, {});
  
  // Add payments by category
  const categoryPaymentData = categoryPayments.reduce((acc, p) => {
    const category = p.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += p.amount;
    return acc;
  }, {});
  
  // Calculate revenue by category
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
  
  // Calculate totals
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
  
  // Show success message
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowAddSuccess(true);
    setTimeout(() => {
      setShowAddSuccess(false);
    }, 3000);
  };
  
  // Handle adding a new payment
  const handleAddPayment = async () => {
    try {
      if (!companyId) {
        alert(t.noCompanyFound);
        return;
      }
      
      if (!newPayment.category || !newPayment.amount) {
        alert(t.selectCategoryAndAmount);
        return;
      }
      
      try {
        // Create a new document in categoryPayments collection
        await addDoc(collection(db, 'categoryPayments'), {
          companyId,
          category: newPayment.category,
          amount: parseFloat(newPayment.amount),
          date: new Date(newPayment.date),
          description: newPayment.description,
          createdAt: new Date()
        });
        
        // Also add to state for immediate UI update
        const payment = {
          id: `payment-${Date.now()}`,
          companyId,
          ...newPayment,
          amount: parseFloat(newPayment.amount)
        };
        
        setCategoryPayments([...categoryPayments, payment]);
        
        // Reset form
        setNewPayment({
          category: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
        });
        
        // Show success message
        showSuccessMessage(t.paymentAddedSuccess);
      } catch (error) {
        console.error("Error saving payment to Firestore:", error);
        alert(t.paymentAddedError);
      }
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };
  
  // Handle adding a new expense
  const handleAddExpense = async () => {
    try {
      if (!companyId) {
        alert(t.noCompanyFound);
        return;
      }
      
      if (!newExpense.category || !newExpense.amount) {
        alert(t.selectCategoryAndAmount);
        return;
      }
      
      try {
        // Save to Firestore
        await addDoc(collection(db, 'expenses'), {
          companyId,
          category: newExpense.category,
          amount: parseFloat(newExpense.amount),
          date: new Date(newExpense.date),
          description: newExpense.description,
          createdAt: new Date()
        });
        
        // Update local state
        const expense = {
          id: `expense-${Date.now()}`,
          companyId,
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        };
        
        setExpenses([...expenses, expense]);
        
        // Reset form
        setNewExpense({
          category: 'office',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
        });
        
        // Show success message
        showSuccessMessage(t.expenseAddedSuccess);
      } catch (error) {
        console.error("Error saving expense to Firestore:", error);
        alert(t.expenseAddedError);
      }
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  // Data for monthly overview
  const monthlyData = reservations.reduce((acc, r) => {
    if (!r.date) return acc;
    
    const month = r.date.substring(0, 7);
    if (!acc[month]) {
      acc[month] = {
        month,
        income: 0,
        payments: 0,
        revenue: 0,
        expenses: 0
      };
    }
    acc[month].income += (r.clientIncome || 0);
    return acc;
  }, {});
  
  // Add category payments to monthly data
  categoryPayments.forEach(payment => {
    if (!payment.date) return;
    
    const month = payment.date.substring(0, 7);
    if (monthlyData[month]) {
      monthlyData[month].payments += (payment.amount || 0);
    }
  });
  
  // Calculate revenue for each month
  Object.keys(monthlyData).forEach(month => {
    monthlyData[month].revenue = monthlyData[month].income - monthlyData[month].payments;
  });
  
  // Add expenses to monthly data
  expenses.forEach(expense => {
    if (!expense.date) return;
    
    const month = expense.date.substring(0, 7);
    if (monthlyData[month]) {
      monthlyData[month].expenses += (expense.amount || 0);
    }
  });
  
  // Format month name
  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    
    const monthNames = {
      ro: ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
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

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Render loading spinner
  const renderLoading = () => (
    <div className="flex flex-col justify-center items-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
      <div className="text-lg text-gray-600">{t.loading}</div>
    </div>
  );

  // Render dashboard view
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center">
          <div className="bg-blue-100 rounded-full p-3 mb-3">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">{t.totalIncome}</p>
          <p className="text-2xl font-bold text-gray-800">€{totalIncome.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center">
          <div className="bg-red-100 rounded-full p-3 mb-3">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">{t.paymentsTotal}</p>
          <p className="text-2xl font-bold text-gray-800">€{totalPayments.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center">
          <div className="bg-green-100 rounded-full p-3 mb-3">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">{t.revenue}</p>
          <p className="text-2xl font-bold text-gray-800">€{totalRevenue.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center">
          <div className="bg-orange-100 rounded-full p-3 mb-3">
            <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">{t.expensesTotal}</p>
          <p className="text-2xl font-bold text-gray-800">€{totalExpenses.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center">
          <div className="bg-purple-100 rounded-full p-3 mb-3">
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">{t.netProfit}</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            €{netProfit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Category Overview */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t.categoryOverview}</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.category}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.transactionCount}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.income}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.payments}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.revenue}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.margin}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoryRevenueData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 capitalize">{data.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{data.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.income.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.payment.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{data.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalIncome.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalPayments.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalRevenue.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">
                  {totalIncome > 0 ? `${(totalRevenue / totalIncome * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">{t.recentTransactions}</h3>
          <button 
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors"
            onClick={() => setViewMode('transactions')}
          >
            {t.viewAll}
          </button>
        </div>
        <div className="overflow-x-auto">
          {reservations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">{t.noTransactions}</div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.date}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.service}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500 hidden md:table-cell">{t.description}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.income}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.slice(0, 5).map(reservation => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(reservation.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{reservation.service}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate hidden md:table-cell">{reservation.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">€{reservation.clientIncome.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // Render transactions view
  const renderTransactions = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-800">{t.transactionsTitle}</h2>
        <p className="text-gray-500 mt-1">
          {t.transactionsHelp}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        {reservations.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">{t.noTransactions}</div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.date}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.service}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500 hidden md:table-cell">{t.description}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.income}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservations.map(reservation => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(reservation.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{reservation.service}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs hidden md:table-cell">{reservation.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">€{reservation.clientIncome.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalIncome.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );

  // Render category payments view
  const renderCategoryPayments = () => (
    <div className="space-y-6">
      {/* Category Overview */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">{t.categoryOverview}</h2>
          <p className="text-gray-500 mt-1">
            {t.categoriesHelp}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.category}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.transactionCount}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.income}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.payments}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.revenue}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.margin}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoryRevenueData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 capitalize">{data.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{data.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.income.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.payment.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{data.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalIncome.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalPayments.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalRevenue.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">
                  {totalIncome > 0 ? `${(totalRevenue / totalIncome * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* Add Category Payment Form */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">{t.addCategoryPayment}</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.category}</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.amountInput}</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.date}</label>
              <input
                type="date"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newPayment.date}
                onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentDescription}</label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newPayment.description}
                onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                placeholder={t.paymentPlaceholder}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium text-sm transition-colors"
              onClick={handleAddPayment}
            >
              {t.addPayment}
            </button>
          </div>
        </div>
      </div>
      
      {/* Payment History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">{t.paymentHistory}</h2>
        </div>
        
        <div className="overflow-x-auto">
          {categoryPayments.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">{t.noPayments}</div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.date}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.category}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500 hidden md:table-cell">{t.description}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.amount}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(payment.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{payment.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs hidden md:table-cell">{payment.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">€{payment.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.paymentsTotal}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalPayments.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // Render expenses view
  const renderExpenses = () => (
    <div className="space-y-6">
      {/* Add New Expense */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">{t.addNewExpense}</h2>
          <p className="text-gray-500 mt-1">
            {t.expensesHelp}
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.expenseCategory}</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.expenseAmount}</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.expenseDate}</label>
              <input
                type="date"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newExpense.date}
                onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.expenseDescription}</label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newExpense.description}
              onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              placeholder={t.expensePlaceholder}
            />
          </div>
          
          <div className="flex justify-end">
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium text-sm transition-colors"
              onClick={handleAddExpense}
            >
              {t.addExpense}
            </button>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">{t.expenses}</h2>
        </div>
        
        <div className="overflow-x-auto">
          {expenses.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">{t.noExpenses}</div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.date}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.category}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500 hidden md:table-cell">{t.description}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.amount}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(expense.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{getExpenseCategoryName(expense.category)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs hidden md:table-cell">{expense.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">€{expense.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.expenseTotal}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{totalExpenses.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
      
      {/* Expenses by Category */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t.expensesByCategory}</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.category}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.amount}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.percentage}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 capitalize">
                        {getExpenseCategoryName(category)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        €{amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.total}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">
                    €{totalExpenses.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Render reports view
  const renderReports = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t.financialSummary}</h2>
          <p className="text-gray-500 mt-1">
            {t.reportsHelp}
          </p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.metric}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.amountValue}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.percentage}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.totalIncome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{totalIncome.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">100%</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.paymentsTotal}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{totalPayments.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{totalIncome > 0 ? `${(totalPayments / totalIncome * 100).toFixed(1)}%` : '0%'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.grossRevenue}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{totalRevenue.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{totalIncome > 0 ? `${(totalRevenue / totalIncome * 100).toFixed(1)}%` : '0%'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.expensesTotal}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{totalExpenses.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{totalRevenue > 0 ? `${(totalExpenses / totalRevenue * 100).toFixed(1)}%` : '0%'}</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{t.netProfit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">€{netProfit.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 text-right">{totalRevenue > 0 ? `${(netProfit / totalRevenue * 100).toFixed(1)}%` : '0%'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Monthly Overview */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t.monthlyOverview}</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            {Object.keys(monthlyData).length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">{t.noMonthlyData}</div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500">{t.month}</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.income}</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.payments}</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.revenue}</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.expenses}</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500">{t.profit}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(monthlyData).map((data, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatMonth(data.month)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.income.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.payments.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.revenue.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">€{data.expenses.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        €{(data.revenue - data.expenses).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render appropriate view based on viewMode
  const renderContent = () => {
    if (loading) {
      return renderLoading();
    }

    switch (viewMode) {
      case 'dashboard':
        return renderDashboard();
      case 'transactions':
        return renderTransactions();
      case 'categories':
        return renderCategoryPayments();
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
      {/* Success Alert */}
      <div className={`fixed bottom-8 right-8 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300 ${showAddSuccess ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center">
          <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          {successMessage}
        </div>
      </div>

      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800">{t.financeManagement}</h1>
          <p className="text-gray-500 mt-1">{t.companyDashboard}</p>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-40">
        <button
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg"
          onClick={toggleMobileMenu}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30" onClick={toggleMobileMenu}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">{t.menu}</h2>
              <button 
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                onClick={toggleMobileMenu}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <nav className="space-y-4">
              <button 
                className={`w-full flex items-center px-4 py-3 rounded-lg ${viewMode === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => { setViewMode('dashboard'); toggleMobileMenu(); }}
              >
                <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">{t.dashboard}</div>
                  <div className="text-xs text-gray-500">{t.dashboardHelp}</div>
                </div>
              </button>
              <button 
                className={`w-full flex items-center px-4 py-3 rounded-lg ${viewMode === 'transactions' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => { setViewMode('transactions'); toggleMobileMenu(); }}
              >
                <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">{t.transactions}</div>
                  <div className="text-xs text-gray-500">{t.transactionsHelp}</div>
                </div>
              </button>
              <button 
                className={`w-full flex items-center px-4 py-3 rounded-lg ${viewMode === 'categories' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => { setViewMode('categories'); toggleMobileMenu(); }}
              >
                <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">{t.categoryPayments}</div>
                  <div className="text-xs text-gray-500">{t.categoriesHelp}</div>
                </div>
              </button>
              <button 
                className={`w-full flex items-center px-4 py-3 rounded-lg ${viewMode === 'expenses' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => { setViewMode('expenses'); toggleMobileMenu(); }}
              >
                <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">{t.expenses}</div>
                  <div className="text-xs text-gray-500">{t.expensesHelp}</div>
                </div>
              </button>
              <button 
                className={`w-full flex items-center px-4 py-3 rounded-lg ${viewMode === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => { setViewMode('reports'); toggleMobileMenu(); }}
              >
                <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">{t.reports}</div>
                  <div className="text-xs text-gray-500">{t.reportsHelp}</div>
                </div>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Desktop Navigation */}
        <div className="hidden md:flex bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <button
            className={`flex flex-col items-center py-4 px-8 transition-colors ${
              viewMode === 'dashboard'
                ? 'text-blue-600 bg-blue-50 border-b-4 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-b-4 border-transparent'
            }`}
            onClick={() => setViewMode('dashboard')}
          >
            <svg className="h-6 w-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
            {t.dashboard}
          </button>
          <button
            className={`flex flex-col items-center py-4 px-8 transition-colors ${
              viewMode === 'transactions'
                ? 'text-blue-600 bg-blue-50 border-b-4 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-b-4 border-transparent'
            }`}
            onClick={() => setViewMode('transactions')}
          >
            <svg className="h-6 w-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            {t.transactions}
          </button>
          <button
            className={`flex flex-col items-center py-4 px-8 transition-colors ${
              viewMode === 'categories'
                ? 'text-blue-600 bg-blue-50 border-b-4 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-b-4 border-transparent'
            }`}
            onClick={() => setViewMode('categories')}
          >
            <svg className="h-6 w-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            {t.categoryPayments}
          </button>
          <button
            className={`flex flex-col items-center py-4 px-8 transition-colors ${
              viewMode === 'expenses'
                ? 'text-blue-600 bg-blue-50 border-b-4 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-b-4 border-transparent'
            }`}
            onClick={() => setViewMode('expenses')}
          >
            <svg className="h-6 w-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {t.expenses}
          </button>
          <button
            className={`flex flex-col items-center py-4 px-8 transition-colors ${
              viewMode === 'reports'
                ? 'text-blue-600 bg-blue-50 border-b-4 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-b-4 border-transparent'
            }`}
            onClick={() => setViewMode('reports')}
          >
            <svg className="h-6 w-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            {t.reports}
          </button>
        </div>

        {/* Content */}
        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Finance;