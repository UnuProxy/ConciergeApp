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
import { getCurrentLanguage } from "../../utils/languageHelper"; // Import the language helper
import { useDatabase } from '../../context/DatabaseContext';

// Translation strings for Chef component
const translations = {
  en: {
    title: 'Chefs',
    addNew: 'Add New Chef',
    edit: 'Edit Chef',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    rate: 'Rate per Hour',
    rateUnit: '€/h',
    bookings: 'Bookings',
    revenue: 'Revenue (€)',
    actions: 'Actions',
    searchPlaceholder: 'Search by name...',
    loading: 'Loading...',
    noFound: 'No chefs found.',
    cancel: 'Cancel',
    addBtn: 'Add Chef',
    updateBtn: 'Update Chef',
    deleteConfirm: 'Are you sure you want to delete this chef?',
    managePermission: 'You can only manage chefs for your company.',
    manageOtherCompany: 'This chef profile belongs to another company.',
    manageUnassigned: 'This profile is missing a company. Ask an admin to claim it before editing or deleting.',
    editButton: 'Edit',
    deleteButton: 'Delete'
  },
  ro: {
    title: 'Bucătari',
    addNew: 'Adaugă bucătar nou',
    edit: 'Editează bucătar',
    name: 'Nume',
    email: 'Email',
    phone: 'Telefon',
    rate: 'Tarif pe oră',
    rateUnit: '€/h',
    bookings: 'Rezervări',
    revenue: 'Venit (€)',
    actions: 'Acțiuni',
    searchPlaceholder: 'Caută după nume...',
    loading: 'Se încarcă...',
    noFound: 'Nu s-au găsit bucătari.',
    cancel: 'Anulează',
    addBtn: 'Adaugă bucătar',
    updateBtn: 'Actualizează bucătar',
    deleteConfirm: 'Sigur doriți să ștergeți acest bucătar?',
    managePermission: 'Puteți gestiona bucătarii doar pentru compania dvs.',
    manageOtherCompany: 'Acest profil aparține altei companii.',
    manageUnassigned: 'Acest profil nu are companie. Un admin trebuie să îl atribuie înainte de editare sau ștergere.',
    editButton: 'Editează',
    deleteButton: 'Șterge'
  }
};

function Chef() {
  // Use global language from localStorage instead of local state
  const [lang, setLang] = useState(getCurrentLanguage);
  const t = translations[lang];
  const dbContext = useDatabase();
  const userCompanyId = dbContext?.companyId || dbContext?.companyInfo?.id || null;
  const userRole = dbContext?.userRole || null;

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

  const [chefs, setChefs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', rate: 50 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Load chefs with booking stats
  const loadChefs = async () => {
    if (!userCompanyId) {
      setChefs([]);
      setFiltered([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Chefs are shared services - load all chefs for both companies
      const snap = await getDocs(collection(db, 'chefs'));
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const withStats = await Promise.all(
        raw.map(async chef => {
          // Only query reservations for the user's company (company-private data)
          try {
            const reservationSnap = await getDocs(
              query(
                collection(db, 'reservations'),
                where('companyId', '==', userCompanyId),
                where('chefId', '==', chef.id),
                where('status', '==', 'confirmed')
              )
            );
            const bookings = reservationSnap.docs.map(d => d.data());
            const totalRevenue = bookings.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
            return { ...chef, bookingCount: bookings.length, totalRevenue };
          } catch (err) {
            // If permission error, return chef without stats
            console.warn('Could not load stats for chef:', chef.id, err.message);
            return { ...chef, bookingCount: 0, totalRevenue: 0 };
          }
        })
      );
      setChefs(withStats);
      setFiltered(withStats);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChefs();
  }, [lang, userCompanyId]);

  // Filter by name
  useEffect(() => {
    if (!search.trim()) setFiltered(chefs);
    else setFiltered(chefs.filter(c => c.name.toLowerCase().includes(search.toLowerCase())));
  }, [search, chefs]);

  const canManage = chef => {
    if (!userCompanyId) return false;
    // Admins can claim legacy chef profiles that never had a companyId set
    if (!chef?.companyId) return userRole === 'admin';
    return chef.companyId === userCompanyId;
  };

  const manageReason = chef => {
    if (!userCompanyId) return t.managePermission;
    if (!chef?.companyId) return userRole === 'admin' ? '' : t.manageUnassigned;
    if (chef.companyId !== userCompanyId) return t.manageOtherCompany;
    return '';
  };

  // Add or update chef
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!userCompanyId) {
        setError('No company selected. Please refresh and try again.');
        return;
      }
      const data = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        rate: form.rate,
        companyId: userCompanyId,
        createdAt: Timestamp.now()
      };
      if (editingId) {
        await updateDoc(doc(db, 'chefs', editingId), data);
      } else {
        await addDoc(collection(db, 'chefs'), data);
      }
      setForm({ name: '', email: '', phone: '', rate: 50 });
      setEditingId(null);
      setSearch('');
      await loadChefs();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start editing
  const startEdit = c => {
    if (!canManage(c)) {
      setError(manageReason(c) || t.managePermission);
      return;
    }
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', rate: c.rate });
    setEditingId(c.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel editing
  const cancelEdit = () => {
    setForm({ name: '', email: '', phone: '', rate: 50 });
    setEditingId(null);
  };

  // Delete chef
  const handleDelete = async chef => {
    if (!canManage(chef)) {
      setError(manageReason(chef) || t.managePermission);
      return;
    }
    if (!window.confirm(t.deleteConfirm)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'chefs', chef.id));
      await loadChefs();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">{t.title}</h1>

        {/* Form */}
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
                step="0.5"
                placeholder={t.rate}
                value={form.rate}
                onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) })}
                required
                className="border p-2 md:p-3 rounded-md pr-12 focus:ring focus:ring-indigo-200"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-gray-500">{t.rateUnit}</span>
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

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-1/2 md:w-1/3 border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200"
          />
        </div>

        {/* Status */}
        {loading && <p className="text-center text-gray-600 mb-4">{t.loading}</p>}
        {error && <p className="text-center text-red-600 mb-4">{error}</p>}

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">{t.name}</th>
                <th className="px-4 py-2 text-left text-sm font-medium">{t.email}</th>
                <th className="px-4 py-2 text-left text-sm font-medium">{t.phone}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.rate}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.bookings}</th>
                <th className="px-4 py-2 text-right text-sm font-medium">{t.revenue}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length ? (
                filtered.map(c => (
                  <tr key={c.id} className="even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-4 py-2 text-sm">{c.name}</td>
                    <td className="px-4 py-2 text-sm">{c.email||'—'}</td>
                    <td className="px-4 py-2 text-sm">{c.phone||'—'}</td>
                    <td className="px-4 py-2 text-center text-sm">{c.rate}{t.rateUnit}</td>
                    <td className="px-4 py-2 text-center text-sm">{c.bookingCount}</td>
                    <td className="px-4 py-2 text-right text-sm">€{c.totalRevenue.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center space-x-2">
                      <button
                        onClick={()=>startEdit(c)}
                        disabled={!canManage(c)}
                        title={manageReason(c)}
                        className={`px-2 py-1 text-white rounded transition text-xs ${canManage(c) ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-gray-300 cursor-not-allowed'}`}
                      >
                        {t.editButton}
                      </button>
                      <button
                        onClick={()=>handleDelete(c)}
                        disabled={!canManage(c)}
                        title={manageReason(c)}
                        className={`px-2 py-1 text-white rounded transition text-xs ${canManage(c) ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}
                      >
                        {t.deleteButton}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">{t.noFound}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {filtered.length ? (
            filtered.map(c => (
              <div key={c.id} className="bg-white shadow rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">{c.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={()=>startEdit(c)}
                      disabled={!canManage(c)}
                      title={manageReason(c)}
                      className={`px-2 py-1 text-white rounded transition text-xs ${canManage(c) ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                      {t.editButton}
                    </button>
                    <button
                      onClick={()=>handleDelete(c)}
                      disabled={!canManage(c)}
                      title={manageReason(c)}
                      className={`px-2 py-1 text-white rounded transition text-xs ${canManage(c) ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                      {t.deleteButton}
                    </button>
                  </div>
                </div>
                <p className="text-sm"><span className="font-medium">{t.email}:</span> {c.email||'—'}</p>
                <p className="text-sm"><span className="font-medium">{t.phone}:</span> {c.phone||'—'}</p>
                <p className="text-sm"><span className="font-medium">{t.rate}:</span> {c.rate}{t.rateUnit}</p>
                <p className="text-sm"><span className="font-medium">{t.bookings}:</span> {c.bookingCount}</p>
                <p className="text-sm"><span className="font-medium">{t.revenue}:</span> €{c.totalRevenue.toFixed(2)}</p>
                {manageReason(c) && <p className="text-xs text-gray-500 mt-2">{manageReason(c)}</p>}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">{t.noFound}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chef;
