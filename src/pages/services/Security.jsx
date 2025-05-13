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
    editButton: 'Editează',
    deleteButton: 'Șterge'
  }
};

function Security() {
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

  const [staff, setStaff] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', rate: 30 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Load security staff with assignment stats
  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, 'security'));
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const withStats = await Promise.all(
        raw.map(async s => {
          const assignSnap = await getDocs(
            query(
              collection(db, 'reservations'),
              where('securityId', '==', s.id),
              where('status', '==', 'confirmed')
            )
          );
          const assigns = assignSnap.docs.map(d => d.data());
          const totalRevenue = assigns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
          return { ...s, bookingCount: assigns.length, totalRevenue };
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

  useEffect(() => { loadStaff(); }, [lang]);

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
      const data = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        rate: form.rate,
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

  // Start editing
  const startEdit = s => {
    setForm({ name: s.name, email: s.email||'', phone: s.phone||'', rate: s.rate });
    setEditingId(s.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit
  const cancelEdit = () => { setForm({ name:'', email:'', phone:'', rate:30 }); setEditingId(null); };

  // Delete
  const handleDelete = async id => {
    if (!window.confirm(t.deleteConfirm)) return;
    setLoading(true); setError(null);
    try {
      await deleteDoc(doc(db,'security',id));
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
              {filtered.length ? filtered.map(s => (
                <tr key={s.id} className="even:bg-gray-50 hover:bg-gray-100">
                  <td className="px-4 py-2 text-sm">{s.name}</td>
                  <td className="px-4 py-2 text-sm">{s.email||'—'}</td>
                  <td className="px-4 py-2 text-sm">{s.phone||'—'}</td>
                  <td className="px-4 py-2 text-center text-sm">{s.rate}{t.rateUnit}</td>
                  <td className="px-4 py-2 text-center text-sm">{s.bookingCount}</td>
                  <td className="px-4 py-2 text-right text-sm">€{s.totalRevenue.toFixed(2)}</td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <button onClick={()=>startEdit(s)} className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition text-xs">{t.editButton}</button>
                    <button onClick={()=>handleDelete(s.id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs">{t.deleteButton}</button>
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
                <div className="flex space-x-2">
                  <button onClick={()=>startEdit(s)} className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition text-xs">{t.editButton}</button>
                  <button onClick={()=>handleDelete(s.id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs">{t.deleteButton}</button>
                </div>
              </div>
              <p className="text-sm"><span className="font-medium">{t.email}:</span> {s.email||'—'}</p>
              <p className="text-sm"><span className="font-medium">{t.phone}:</span> {s.phone||'—'}</p>
              <p className="text-sm"><span className="font-medium">{t.rate}:</span> {s.rate}{t.rateUnit}</p>
              <p className="text-sm"><span className="font-medium">{t.bookings}:</span> {s.bookingCount}</p>
              <p className="text-sm"><span className="font-medium">{t.revenue}:</span> €{s.totalRevenue.toFixed(2)}</p>
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
