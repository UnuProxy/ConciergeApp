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
    actions: 'Actions',
    searchPlaceholder: 'Search by name...',
    loading: 'Loading...',
    noFound: 'No collaborators found.',
    cancel: 'Cancel',
    addBtn: 'Add Collaborator',
    updateBtn: 'Update Collaborator',
    deleteConfirm: 'Are you sure you want to delete this collaborator?',
    editButton: 'Edit',
    deleteButton: 'Delete'
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
    actions: 'Acțiuni',
    searchPlaceholder: 'Caută după nume...',
    loading: 'Se încarcă...',
    noFound: 'Nu s-au găsit colaboratori.',
    cancel: 'Anulează',
    addBtn: 'Adaugă colaborator',
    updateBtn: 'Actualizează colaborator',
    deleteConfirm: 'Sigur doriți să ștergeți acest colaborator?',
    editButton: 'Editează',
    deleteButton: 'Șterge'
  }
};

// Main component
function Collaborators() {
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

  // Load collaborators with booking stats
  const loadCollaborators = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, 'collaborators'));
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const withStats = await Promise.all(
        raw.map(async c => {
          const bookingSnap = await getDocs(
            query(
              collection(db, 'reservations'),
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
    loadCollaborators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

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
      const data = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        commissionRate: form.commissionRate / 100,
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
        {error && <p className="text-center text-red-600 mb-4">{error}</p>}

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
                <th className="px-4 py-2 text-right text-sm font-medium">{t.commission}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map(c => (
                  <tr key={c.id} className="even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-4 py-2 text-sm">{c.name}</td>
                    <td className="px-4 py-2 text-sm">{c.email || '—'}</td>
                    <td className="px-4 py-2 text-sm">{c.phone || '—'}</td>
                    <td className="px-4 py-2 text-center text-sm">{(c.commissionRate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-center text-sm">{c.bookingCount}</td>
                    <td className="px-4 py-2 text-right text-sm">€{c.totalCommission.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center space-x-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition text-xs"
                      >{t.editButton}</button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs"
                      >{t.deleteButton}</button>
                    </td>
                  </tr>
                ))
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
            filtered.map(c => (
              <div key={c.id} className="bg-white shadow rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">{c.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition text-xs"
                    >{t.editButton}</button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs"
                    >{t.deleteButton}</button>
                  </div>
                </div>
                <p className="text-sm"><span className="font-medium">{t.email}:</span> {c.email || '—'}</p>
                <p className="text-sm"><span className="font-medium">{t.phone}:</span> {c.phone || '—'}</p>
                <p className="text-sm"><span className="font-medium">{t.ratePct}:</span> {(c.commissionRate * 100).toFixed(1)}%</p>
                <p className="text-sm"><span className="font-medium">{t.bookings}:</span> {c.bookingCount}</p>
                <p className="text-sm"><span className="font-medium">{t.commission}:</span> €{c.totalCommission.toFixed(2)}</p>
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

export default Collaborators;

