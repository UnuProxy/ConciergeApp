import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useDatabase } from '../../context/DatabaseContext';
import { getCurrentLanguage } from "../../utils/languageHelper"; // Import the language helper

// Translation strings
const translations = {
  en: {
    collaborators: 'Collaborators',
    addNew: 'Add New Collaborator',
    edit: 'Edit Collaborator',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    rate: 'Commission Rate',
    ratePct: 'Rate (%)',
    bookings: 'Bookings',
    commission: 'Commission (€)',
    due: 'Outstanding',
    paidLabel: 'Paid',
    actions: 'Actions',
    searchPlaceholder: 'Search by name...',
    loading: 'Loading...',
    noFound: 'No collaborators found.',
    cancel: 'Cancel',
    addBtn: 'Add Collaborator',
    updateBtn: 'Update Collaborator',
    deleteConfirm: 'Are you sure you want to delete this collaborator?',
    editButton: 'Edit',
    deleteButton: 'Delete',
    viewPayments: 'View payments',
    paymentStatus: 'Payment status',
    upToDate: 'Up to date',
    outstanding: 'Outstanding',
    ledgerTitle: 'Payment ledger',
    totalDue: 'Total due',
    paidThisMonth: 'Paid this month',
    scheduled: 'Scheduled',
    noPayments: 'No payments logged yet.',
    recordPayment: 'Record payment',
    close: 'Close',
    amount: 'Amount',
    date: 'Date',
    status: 'Status',
    method: 'Method',
    reference: 'Reference',
    note: 'Note',
    save: 'Save',
    cancelSmall: 'Cancel',
    paid: 'Paid',
    planned: 'Scheduled'
  },
  ro: {
    collaborators: 'Colaboratori',
    addNew: 'Adaugă colaborator nou',
    edit: 'Editează colaborator',
    name: 'Nume',
    email: 'Email',
    phone: 'Telefon',
    rate: 'Rată comision',
    ratePct: 'Rată (%)',
    bookings: 'Rezervări',
    commission: 'Comision (€)',
    due: 'Restant',
    paidLabel: 'Plătit',
    actions: 'Acțiuni',
    searchPlaceholder: 'Caută după nume...',
    loading: 'Se încarcă...',
    noFound: 'Nu s-au găsit colaboratori.',
    cancel: 'Anulează',
    addBtn: 'Adaugă colaborator',
    updateBtn: 'Actualizează colaborator',
    deleteConfirm: 'Sigur doriți să ștergeți acest colaborator?',
    editButton: 'Editează',
    deleteButton: 'Șterge',
    viewPayments: 'Vezi plăți',
    paymentStatus: 'Status plăți',
    upToDate: 'La zi',
    outstanding: 'Restanțe',
    ledgerTitle: 'Registru plăți',
    totalDue: 'Total de plată',
    paidThisMonth: 'Plătit luna asta',
    scheduled: 'Programat',
    noPayments: 'Nu există plăți înregistrate încă.',
    recordPayment: 'Înregistrează plată',
    close: 'Închide',
    amount: 'Sumă',
    date: 'Dată',
    status: 'Statut',
    method: 'Metodă',
    reference: 'Referință',
    note: 'Notă',
    save: 'Salvează',
    cancelSmall: 'Renunță',
    paid: 'Plătită',
    planned: 'Programată'
  }
};

// Main component
function Collaborators() {
  const { companyId, loading: dbLoading, error: dbError } = useDatabase();
  // Use global language from localStorage instead of local state
  const [lang, setLang] = useState(getCurrentLanguage);
  const t = translations[lang];

  // Add event listener to update language when it changes globally
  useEffect(() => {
    const handleStorageChange = () => {
      setLang(getCurrentLanguage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [colls, setColls] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', commissionRate: 15 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'paid',
    method: 'transfer',
    reference: '',
    note: ''
  });

  const formatCurrency = value => {
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? numeric : 0;
    return new Intl.NumberFormat(lang === 'ro' ? 'ro-RO' : 'en-US', { style: 'currency', currency: 'EUR' }).format(
      safeValue
    );
  };

  const getPaymentMeta = collab => {
    const payments = Array.isArray(collab?.payments) ? collab.payments : [];
    const paidTotalFromPayments = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const scheduledTotalFromPayments = payments
      .filter(p => p.status === 'scheduled')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const paidTotal = Number.isFinite(collab?.paidTotal) ? Number(collab.paidTotal) : paidTotalFromPayments;
    const scheduledTotal = Number.isFinite(collab?.scheduledTotal)
      ? Number(collab.scheduledTotal)
      : scheduledTotalFromPayments;

    const outstanding = Math.max(Number(collab?.totalCommission || 0) - paidTotal, 0);
    const pressureThreshold = Math.max(Number(collab?.totalCommission || 0) * 0.25, 50);
    const badgeClass =
      outstanding === 0 ? 'bg-emerald-500' : outstanding >= pressureThreshold ? 'bg-rose-500' : 'bg-amber-500';
    const statusLabel = outstanding === 0 ? t.upToDate : t.outstanding;

    return { paidTotal, scheduledTotal, outstanding, badgeClass, statusLabel };
  };

  const getLedgerItems = collab => (Array.isArray(collab?.payments) ? collab.payments : []);

  const formatDate = input => {
    if (!input) return '—';
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Load collaborators with booking stats
  const loadCollaborators = async () => {
    if (!companyId) {
      setError('Missing company context. Please re-login.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(
        query(collection(db, 'collaborators'), where('companyId', '==', companyId))
      );
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const withStats = await Promise.all(
        raw.map(async c => {
          const bookingSnap = await getDocs(
            query(
              collection(db, 'reservations'),
              where('companyId', '==', companyId),
              where('collaboratorId', '==', c.id),
              where('status', '==', 'confirmed')
            )
          );
          const bookings = bookingSnap.docs.map(d => d.data());
          const totalCommission = bookings.reduce(
            (sum, b) => sum + b.totalAmount * c.commissionRate,
            0
          );
          return { ...c, bookingCount: bookings.length, totalCommission };
        })
      );
      setColls(withStats);
      setFiltered(withStats);
    } catch (err) {
      console.error(err);
      setError(`${t.collaborators}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadCollaborators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, companyId]);

  // Filter by name search
  useEffect(() => {
    setFiltered(
      !search.trim()
        ? colls
        : colls.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, colls]);

  // Add or update collaborator
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!companyId) {
        throw new Error('Missing company context. Please re-login.');
      }
      const data = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        commissionRate: form.commissionRate / 100,
        companyId,
        createdAt: Timestamp.now()
      };
      if (editingId) {
        await updateDoc(doc(db, 'collaborators', editingId), data);
      } else {
        await addDoc(collection(db, 'collaborators'), data);
      }
      setForm({ name: '', email: '', phone: '', commissionRate: 15 });
      setEditingId(null);
      setSearch('');
      await loadCollaborators();
    } catch (err) {
      console.error(err);
      setError(t[editingId ? 'updateBtn' : 'addBtn'] + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initiate edit
  const startEdit = c => {
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      commissionRate: c.commissionRate * 100
    });
    setEditingId(c.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel editing
  const cancelEdit = () => {
    setForm({ name: '', email: '', phone: '', commissionRate: 15 });
    setEditingId(null);
  };

  const openLedger = collab => {
    setSelectedCollab(collab);
    setShowPaymentForm(false);
    setPaymentForm({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'paid',
      method: 'transfer',
      reference: '',
      note: ''
    });
  };

  const closeLedger = () => setSelectedCollab(null);

  const selectedMeta = selectedCollab ? getPaymentMeta(selectedCollab) : null;
  const selectedLedgerItems = selectedCollab ? getLedgerItems(selectedCollab) : [];

  const handlePaymentSubmit = async e => {
    e.preventDefault();
    if (!selectedCollab) return;
    if (!companyId) {
      setError('Missing company context. Please re-login.');
      return;
    }
    setLoading(true);
    try {
      const cleanAmount = Number(paymentForm.amount);
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
        throw new Error('Amount must be a positive number.');
      }

      const existingPayments = Array.isArray(selectedCollab.payments) ? selectedCollab.payments : [];
      const newPayment = {
        amount: cleanAmount,
        date: paymentForm.date,
        status: paymentForm.status,
        method: paymentForm.method,
        reference: paymentForm.reference,
        note: paymentForm.note,
        createdAt: Timestamp.now()
      };
      const updatedPayments = [newPayment, ...existingPayments];

      const paidTotal = updatedPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const scheduledTotal = updatedPayments
        .filter(p => p.status === 'scheduled')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      await updateDoc(doc(db, 'collaborators', selectedCollab.id), {
        payments: updatedPayments,
        paidTotal,
        scheduledTotal
      });

      // Mirror collaborator payout into Finance as a provider cost
      await addDoc(collection(db, 'financeRecords'), {
        companyId,
        collaboratorId: selectedCollab.id,
        collaboratorName: selectedCollab.name,
        serviceKey: 'collaborator_payout',
        service: { en: 'Collaborator payout', ro: 'Plată colaborator' },
        clientAmount: 0,
        providerCost: cleanAmount,
        status: paymentForm.status === 'paid' ? 'settled' : 'pending',
        date: paymentForm.date,
        description: paymentForm.note || paymentForm.reference || `Payout to ${selectedCollab.name}`,
        createdAt: Timestamp.now()
      });

      // Also log in legacy payments for Finance summaries
      await addDoc(collection(db, 'categoryPayments'), {
        companyId,
        category: { en: 'Collaborator payout', ro: 'Plată colaborator' },
        amount: cleanAmount,
        date: Timestamp.fromDate(new Date(paymentForm.date)),
        description: paymentForm.note || paymentForm.reference || `Payout to ${selectedCollab.name}`,
        createdAt: Timestamp.now()
      });

      await loadCollaborators();
      // Refresh selected collaborator locally to keep panel in sync
      setSelectedCollab(prev =>
        prev && prev.id === selectedCollab.id
          ? { ...prev, payments: updatedPayments, paidTotal, scheduledTotal }
          : prev
      );
      setShowPaymentForm(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to save payment.');
    } finally {
      setLoading(false);
    }
  };

  // Delete collaborator
  const handleDelete = async id => {
    if (!window.confirm(t.deleteConfirm)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'collaborators', id));
      await loadCollaborators();
    } catch (err) {
      console.error(err);
      setError(t.deleteConfirm + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">{t.collaborators}</h1>

        {/* Add/Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
          <h2 className="text-lg md:text-xl font-semibold mb-4">
            {editingId ? t.edit : t.addNew}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder={t.name}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              className="border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200"
            />
            <input
              type="email"
              placeholder={t.email}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200"
            />
            <input
              type="tel"
              placeholder={t.phone}
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200"
            />
            <div className="relative">
              <input
                type="number"
                step="0.1"
                placeholder={t.rate}
                value={form.commissionRate}
                onChange={e => setForm({ ...form, commissionRate: parseFloat(e.target.value) })}
                required
                className="border p-2 md:p-3 rounded-md pr-10 focus:ring focus:ring-indigo-200"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-gray-500">%</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              {editingId ? t.updateBtn : t.addBtn}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition"
              >
                {t.cancel}
              </button>
            )}
          </div>
        </form>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-1/2 md:w-1/3 border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200"
          />
        </div>

        {/* Status Indicators */}
        {loading && <p className="text-center text-gray-600 mb-4">{t.loading}</p>}
        {error && <p className="text-center text-rose-600 mb-4">{error}</p>}

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">{t.name}</th>
                <th className="px-4 py-2 text-left text-sm font-medium">{t.email}</th>
                <th className="px-4 py-2 text-left text-sm font-medium">{t.phone}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.ratePct}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.bookings}</th>
                <th className="px-4 py-2 text-right text-sm font-medium">{`${t.due} / ${t.paidLabel}`}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map(c => {
                  const paymentMeta = getPaymentMeta(c);
                  return (
                    <tr key={c.id} className="even:bg-gray-50 hover:bg-gray-100">
                      <td className="px-4 py-2 text-sm">{c.name}</td>
                      <td className="px-4 py-2 text-sm">{c.email || '—'}</td>
                      <td className="px-4 py-2 text-sm">{c.phone || '—'}</td>
                      <td className="px-4 py-2 text-center text-sm">{(c.commissionRate * 100).toFixed(1)}%</td>
                      <td className="px-4 py-2 text-center text-sm">{c.bookingCount}</td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="text-gray-900 font-semibold text-sm">
                          {t.due}: {formatCurrency(getPaymentMeta(c).outstanding)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.paidLabel}: {formatCurrency(getPaymentMeta(c).paidTotal || 0)}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openLedger(c)}
                            className="w-8 h-8 relative flex items-center justify-center bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            title={`${t.viewPayments} • ${paymentMeta.statusLabel}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${paymentMeta.badgeClass} ring-2 ring-white`} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            className="w-8 h-8 flex items-center justify-center bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                            title={t.editButton}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                            title={t.deleteButton}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">{t.noFound}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {filtered.length > 0 ? (
            filtered.map(c => {
              const paymentMeta = getPaymentMeta(c);
              return (
                <div key={c.id} className="bg-white shadow rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openLedger(c)}
                        className="w-9 h-9 relative flex items-center justify-center bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        title={`${t.viewPayments} • ${paymentMeta.statusLabel}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${paymentMeta.badgeClass} ring-2 ring-white`} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => startEdit(c)}
                        className="w-9 h-9 flex items-center justify-center bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                        title={t.editButton}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                        title={t.deleteButton}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm"><span className="font-medium">{t.email}:</span> {c.email || '—'}</p>
                  <p className="text-sm"><span className="font-medium">{t.phone}:</span> {c.phone || '—'}</p>
                  <p className="text-sm"><span className="font-medium">{t.ratePct}:</span> {(c.commissionRate * 100).toFixed(1)}%</p>
                  <p className="text-sm"><span className="font-medium">{t.bookings}:</span> {c.bookingCount}</p>
                  <p className="text-sm">
                    <span className="font-medium">{t.due}:</span> {formatCurrency(getPaymentMeta(c).outstanding)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{t.paidLabel}:</span> {formatCurrency(getPaymentMeta(c).paidTotal || 0)}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500">{t.noFound}</p>
          )}
        </div>

        {selectedCollab && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={closeLedger} />
            <aside className="absolute right-0 top-16 md:top-20 h-[calc(100%-4rem)] md:h-[calc(100%-5rem)] w-full md:w-[480px] bg-white shadow-2xl p-6 overflow-y-auto rounded-t-2xl md:rounded-none">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t.paymentStatus}</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{selectedCollab.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${selectedMeta?.badgeClass?.replace('500', '100') || 'bg-slate-100'} text-slate-700`}>
                      <span className={`w-2 h-2 rounded-full ${selectedMeta?.badgeClass || 'bg-slate-400'}`} />
                      {selectedMeta?.statusLabel || t.paymentStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedCollab.email || '—'} • {selectedCollab.phone || '—'}
                  </p>
                </div>
                <button onClick={closeLedger} className="text-sm text-gray-500 hover:text-gray-700">{t.close}</button>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium mb-2">{t.ledgerTitle}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                    <p className="text-xs text-gray-500">{t.totalDue}</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedMeta?.outstanding || 0)}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                    <p className="text-xs text-gray-500">{t.paidThisMonth}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(
                        selectedLedgerItems
                          .filter(item => {
                            if (!item?.date) return false;
                            const itemDate = new Date(item.date);
                            const now = new Date();
                            return (
                              !Number.isNaN(itemDate.getTime()) &&
                              itemDate.getMonth() === now.getMonth() &&
                              itemDate.getFullYear() === now.getFullYear() &&
                              item.status === 'paid'
                            );
                          })
                          .reduce((sum, item) => sum + Number(item.amount || 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                    <p className="text-xs text-gray-500">{t.scheduled}</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedMeta?.scheduledTotal || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-800">{t.viewPayments}</p>
                <button
                  onClick={() => setShowPaymentForm(prev => !prev)}
                  className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                >
                  {t.recordPayment}
                </button>
              </div>

              {showPaymentForm && (
                <form onSubmit={handlePaymentSubmit} className="mb-4 space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-sm text-gray-700 flex flex-col gap-1">
                      {t.amount}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="border rounded-md p-2 focus:ring focus:ring-indigo-200"
                      />
                    </label>
                    <label className="text-sm text-gray-700 flex flex-col gap-1">
                      {t.date}
                      <input
                        type="date"
                        required
                        value={paymentForm.date}
                        onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                        className="border rounded-md p-2 focus:ring focus:ring-indigo-200"
                      />
                    </label>
                    <label className="text-sm text-gray-700 flex flex-col gap-1">
                      {t.status}
                      <select
                        value={paymentForm.status}
                        onChange={e => setPaymentForm({ ...paymentForm, status: e.target.value })}
                        className="border rounded-md p-2 focus:ring focus:ring-indigo-200"
                      >
                        <option value="paid">{t.paid}</option>
                        <option value="scheduled">{t.planned}</option>
                      </select>
                    </label>
                    <label className="text-sm text-gray-700 flex flex-col gap-1">
                      {t.method}
                      <input
                        type="text"
                        value={paymentForm.method}
                        onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                        className="border rounded-md p-2 focus:ring focus:ring-indigo-200"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-sm text-gray-700 flex flex-col gap-1">
                      {t.reference}
                      <input
                        type="text"
                        value={paymentForm.reference}
                        onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                        className="border rounded-md p-2 focus:ring focus:ring-indigo-200"
                      />
                    </label>
                    <label className="text-sm text-gray-700 flex flex-col gap-1">
                      {t.note}
                      <input
                        type="text"
                        value={paymentForm.note}
                        onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                        className="border rounded-md p-2 focus:ring focus:ring-indigo-200"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button type="button" onClick={() => setShowPaymentForm(false)} className="text-sm text-gray-600 hover:text-gray-800">
                      {t.cancelSmall}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
                      disabled={loading}
                    >
                      {t.save}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {selectedLedgerItems.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-lg p-4 text-sm text-gray-600">
                    {t.noPayments}
                  </div>
                ) : (
                  selectedLedgerItems.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{formatCurrency(item.amount || 0)}</p>
                          <p className="text-xs text-gray-500">{item.reference || t.bookings}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-gray-700 capitalize">
                            {item.status === 'paid' ? t.paid : item.status === 'scheduled' ? t.planned : item.status || t.paymentStatus}
                          </span>
                        </div>
                      </div>
                      {item.note && <p className="text-xs text-gray-500 mt-2">{item.note}</p>}
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default Collaborators;
