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

// Translation strings for Security component
const translations = {
  en: {
    title: 'Security',
    addNew: 'Add New Security',
    edit: 'Edit Security',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    rate: 'Rate per Hour',
    rateUnit: '€/h',
    bookings: 'Assignments',
    revenue: 'Revenue (€)',
    actions: 'Actions',
    searchPlaceholder: 'Search by name...',
    loading: 'Loading...',
    noFound: 'No security personnel found.',
    cancel: 'Cancel',
    addBtn: 'Add Security',
    updateBtn: 'Update Security',
    deleteConfirm: 'Are you sure you want to delete this security person?',
    managePermission: 'You can only manage security staff for your company.',
    manageOtherCompany: 'This security profile belongs to another company.',
    manageUnassigned: 'This profile is missing a company. Ask an admin to claim it before editing or deleting.',
    editButton: 'Edit',
    deleteButton: 'Delete'
  },
  ro: {
    title: 'Securitate',
    addNew: 'Adaugă personal securitate',
    edit: 'Editează securitate',
    name: 'Nume',
    email: 'Email',
    phone: 'Telefon',
    rate: 'Tarif pe oră',
    rateUnit: '€/h',
    bookings: 'Misiuni',
    revenue: 'Venit (€)',
    actions: 'Acțiuni',
    searchPlaceholder: 'Caută după nume...',
    loading: 'Se încarcă...',
    noFound: 'Nu s-au găsit persoane de securitate.',
    cancel: 'Anulează',
    addBtn: 'Adaugă securitate',
    updateBtn: 'Actualizează securitate',
    deleteConfirm: 'Sigur doriți să ștergeți această persoană?',
    managePermission: 'Puteți gestiona personalul de securitate doar pentru compania dvs.',
    manageOtherCompany: 'Acest profil aparține altei companii.',
    manageUnassigned: 'Acest profil nu are companie. Un admin trebuie să îl atribuie înainte de editare sau ștergere.',
    editButton: 'Editează',
    deleteButton: 'Șterge'
  }
};

function Security() {
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

  const [staff, setStaff] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', rate: 30 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Load security staff with assignment stats
  const loadStaff = async () => {
    if (!userCompanyId) {
      setStaff([]);
      setFiltered([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Security is a shared service - load all security staff for both companies
      const snap = await getDocs(collection(db, 'security'));
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const withStats = await Promise.all(
        raw.map(async s => {
          // Only query reservations for the user's company (company-private data)
          try {
            const assignSnap = await getDocs(
              query(
                collection(db, 'reservations'),
                where('companyId', '==', userCompanyId),
                where('securityId', '==', s.id),
                where('status', '==', 'confirmed')
              )
            );
            const assigns = assignSnap.docs.map(d => d.data());
            const totalRevenue = assigns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
            return { ...s, bookingCount: assigns.length, totalRevenue };
          } catch (err) {
            // If permission error, return security staff without stats
  // console.warn('Could not load stats for security staff:', s.id, err.message); // Removed for production
            return { ...s, bookingCount: 0, totalRevenue: 0 };
          }
        })
      );
      setStaff(withStats);
      setFiltered(withStats);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, [lang, userCompanyId]);

  // Filter by name
  useEffect(() => {
    setFiltered(
      !search.trim()
        ? staff
        : staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, staff]);

  // Add or update
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
        unit: 'hour',
        category: 'security',
        companyId: userCompanyId,
        createdAt: Timestamp.now()
      };
      if (editingId) await updateDoc(doc(db,'security',editingId), data);
      else await addDoc(collection(db,'security'), data);
      setForm({ name:'', email:'', phone:'', rate:30 });
      setEditingId(null);
      setSearch('');
      await loadStaff();
    } catch(err) {
      console.error(err);
      setError(err.message);
    } finally { setLoading(false); }
  };

  const canManage = security => {
    if (!userCompanyId) return false;
    // Admins can claim legacy security profiles that never had a companyId set
    if (!security?.companyId) return userRole === 'admin';
    return security.companyId === userCompanyId;
  };

  const manageReason = security => {
    if (!userCompanyId) return t.managePermission;
    if (!security?.companyId) return userRole === 'admin' ? '' : t.manageUnassigned;
    if (security.companyId !== userCompanyId) return t.manageOtherCompany;
    return '';
  };

  // Start editing
  const startEdit = s => {
    if (!canManage(s)) {
      setError(t.managePermission);
      return;
    }
    setForm({ name: s.name, email: s.email||'', phone: s.phone||'', rate: s.rate });
    setEditingId(s.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit
  const cancelEdit = () => { setForm({ name:'', email:'', phone:'', rate:30 }); setEditingId(null); };

  // Delete
  const handleDelete = async security => {
    if (!canManage(security)) {
      setError(manageReason(security) || t.managePermission);
      return;
    }
    if (!window.confirm(t.deleteConfirm)) return;
    setLoading(true); setError(null);
    try {
      await deleteDoc(doc(db,'security',security.id));
      await loadStaff();
    } catch(err) {
      console.error(err);
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">{t.title}</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
          <h2 className="text-lg md:text-xl font-semibold mb-4">{editingId? t.edit: t.addNew}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <input type="text" placeholder={t.name} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required className="border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200" />
            <input type="email" placeholder={t.email} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200" />
            <input type="tel" placeholder={t.phone} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200" />
            <div className="relative">
              <input type="number" step="0.5" placeholder={t.rate} value={form.rate} onChange={e=>setForm({...form,rate:parseFloat(e.target.value)})} required className="border p-2 md:p-3 rounded-md pr-12 focus:ring focus:ring-indigo-200" />
              <span className="absolute inset-y-0 right-3 flex items-center text-gray-500">{t.rateUnit}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">{editingId? t.updateBtn: t.addBtn}</button>
            {editingId && <button type="button" onClick={cancelEdit} className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition">{t.cancel}</button>}
          </div>
        </form>

        <div className="mb-6">
          <input type="text" placeholder={t.searchPlaceholder} value={search} onChange={e=>setSearch(e.target.value)} className="w-full sm:w-1/2 md:w-1/3 border p-2 md:p-3 rounded-md focus:ring focus:ring-indigo-200" />
        </div>

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
                <th className="px-4 py-2 text-center text-sm font-medium">{t.rate}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.bookings}</th>
                <th className="px-4 py-2 text-right text-sm font-medium">{t.revenue}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length ? filtered.map(s => (
                <tr key={s.id} className="even:bg-gray-50 hover:bg-gray-100">
                  <td className="px-4 py-2 text-sm">{s.name}</td>
                  <td className="px-4 py-2 text-sm">{s.email||'—'}</td>
                  <td className="px-4 py-2 text-sm">{s.phone||'—'}</td>
                  <td className="px-4 py-2 text-center text-sm">{s.rate}{t.rateUnit}</td>
                  <td className="px-4 py-2 text-center text-sm">{s.bookingCount}</td>
                  <td className="px-4 py-2 text-right text-sm">€{s.totalRevenue.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={()=>startEdit(s)}
                        disabled={!canManage(s)}
                        title={t.editButton}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canManage(s) ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={()=>handleDelete(s)}
                        disabled={!canManage(s)}
                        title={t.deleteButton}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canManage(s) ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">{t.noFound}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {filtered.length ? filtered.map(s => (
            <div key={s.id} className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{s.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={()=>startEdit(s)}
                    disabled={!canManage(s)}
                    title={manageReason(s) || t.editButton}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${canManage(s) ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={()=>handleDelete(s)}
                    disabled={!canManage(s)}
                    title={manageReason(s) || t.deleteButton}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${canManage(s) ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-sm"><span className="font-medium">{t.email}:</span> {s.email||'—'}</p>
              <p className="text-sm"><span className="font-medium">{t.phone}:</span> {s.phone||'—'}</p>
              <p className="text-sm"><span className="font-medium">{t.rate}:</span> {s.rate}{t.rateUnit}</p>
              <p className="text-sm"><span className="font-medium">{t.bookings}:</span> {s.bookingCount}</p>
              <p className="text-sm"><span className="font-medium">{t.revenue}:</span> €{s.totalRevenue.toFixed(2)}</p>
              {manageReason(s) && <p className="text-xs text-gray-500 mt-2">{manageReason(s)}</p>}
            </div>
          )) : (
            <p className="text-center text-gray-500">{t.noFound}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Security;
