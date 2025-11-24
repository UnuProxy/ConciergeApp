// src/pages/users/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { useDatabase } from '../../context/DatabaseContext';

// Initialize Firebase
const db = getFirestore();

// Translation dictionary
const translations = {
  en: {
    title: 'Team Management',
    addUser: 'Add Team Member',
    userList: 'Team Members',
    email: 'Email Address',
    emailPlaceholder: 'Enter Gmail address',
    name: 'Name',
    namePlaceholder: 'Enter name (optional)',
    save: 'Add User',
    cancel: 'Cancel',
    noUsers: 'No team members found',
    loading: 'Loading...',
    role: 'Role',
    employee: 'Employee',
    admin: 'Administrator',
    addedBy: 'Added by',
    addedOn: 'Added on',
    noPermission: 'You don\'t have permission to access this page',
    accessRights: 'Access Rights',
    viewServices: 'View & manage shared services',
    viewReservations: 'View & manage reservations',
    viewClients: 'View & manage company clients',
    viewFinance: 'View finance information',
    success: 'User added successfully! They can now log in using their Gmail account.',
    error: 'Error adding user. Please try again.',
    searchPlaceholder: 'Search team members...',
    clearSearch: 'Clear',
    emailRequired: 'Email address is required',
    invalidEmail: 'Please enter a valid Gmail address',
    userExists: 'This user is already a team member',
    emailInstructions: 'The user will be able to log in using this Gmail address'
  },
  ro: {
    title: 'Gestionare Echipă',
    addUser: 'Adaugă Membru în Echipă',
    userList: 'Membrii Echipei',
    email: 'Adresă de Email',
    emailPlaceholder: 'Introduceți adresa Gmail',
    name: 'Nume',
    namePlaceholder: 'Introduceți numele (opțional)',
    save: 'Adaugă Utilizator',
    cancel: 'Anulează',
    noUsers: 'Nu s-au găsit membri în echipă',
    loading: 'Se încarcă...',
    role: 'Rol',
    employee: 'Angajat',
    admin: 'Administrator',
    addedBy: 'Adăugat de',
    addedOn: 'Adăugat în data de',
    noPermission: 'Nu aveți permisiunea de a accesa această pagină',
    accessRights: 'Drepturi de Acces',
    viewServices: 'Vizualizare & gestionare servicii partajate',
    viewReservations: 'Vizualizare & gestionare rezervări',
    viewClients: 'Vizualizare & gestionare clienți ai companiei',
    viewFinance: 'Vizualizare informații financiare',
    success: 'Utilizator adăugat cu succes! Acum se poate conecta folosind contul Gmail.',
    error: 'Eroare la adăugarea utilizatorului. Vă rugăm să încercați din nou.',
    searchPlaceholder: 'Caută membri...',
    clearSearch: 'Șterge',
    emailRequired: 'Adresa de email este obligatorie',
    invalidEmail: 'Vă rugăm să introduceți o adresă Gmail validă',
    userExists: 'Acest utilizator este deja membru în echipă',
    emailInstructions: 'Utilizatorul se va putea conecta folosind această adresă Gmail'
  }
};

// Allow common admin role variants to unlock the page
const adminRoles = ['admin', 'administrator', 'owner', 'manager', 'superadmin'];

function UserManagement() {
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'ro');
  const t = translations[language]; // Translation function
  
  // States
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    isAdmin: false,
    permissions: {
      services: true,
      reservations: true,
      clients: true,
      finance: false
    }
  });
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState({});
  
  // Get database context
  const { currentUser, companyInfo, userRole } = useDatabase();
  
  useEffect(() => {
    try {
      localStorage.setItem('appLanguage', language);
    } catch (err) {
      console.warn('Unable to persist language preference', err);
    }
  }, [language]);
  
  useEffect(() => {
    const handleStorage = () => {
      const newLang = localStorage.getItem('appLanguage');
      if (newLang && newLang !== language) {
        setLanguage(newLang);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [language]);
  
  // Check if current user is allowed to manage staff
  const roleLoading = userRole === null || userRole === undefined;
  const normalizedRole = (userRole || '').toString().trim().toLowerCase();
  const isAdmin = adminRoles.includes(normalizedRole);
  
  // Fetch users on component mount
  useEffect(() => {
    if (companyInfo && currentUser) {
      fetchUsers();
    }
  }, [companyInfo, currentUser]);
  
  // Filter users when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = users.filter(user => 
        (user.name && user.name.toLowerCase().includes(lowercasedSearch)) ||
        (user.email && user.email.toLowerCase().includes(lowercasedSearch)) ||
        (user.role && user.role.toLowerCase().includes(lowercasedSearch))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);
  
  // Function to fetch users
  const fetchUsers = async () => {
    if (!companyInfo || !currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Query users for this company
      const usersRef = collection(db, "authorized_users");
      const q = query(usersRef, where("companyId", "==", companyInfo.id));
      
      const querySnapshot = await getDocs(q);
      const usersData = [];
      
      querySnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      isAdmin: false,
      permissions: {
        services: true,
        reservations: true,
        clients: true,
        finance: false
      }
    });
    setFormErrors({});
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'isAdmin') {
        // If changing the admin status, update both it and the permissions
        setFormData(prev => ({
          ...prev,
          isAdmin: checked,
          // If user is admin, grant all permissions, otherwise keep finance off
          permissions: checked ? {
            services: true,
            reservations: true,
            clients: true,
            finance: true
          } : {
            ...prev.permissions,
            finance: false
          }
        }));
      } else if (name.startsWith('permissions.')) {
        // Update a specific permission
        const permission = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          permissions: {
            ...prev.permissions,
            [permission]: checked
          }
        }));
      } else {
        // For other checkboxes
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else {
      // For text inputs
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear errors for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Validate form
  const validateForm = async () => {
    const errors = {};
    
    // Check if email is present
    if (!formData.email.trim()) {
      errors.email = t.emailRequired;
      setFormErrors(errors);
      return false;
    }
    
    // Check if email is valid Gmail address
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!emailRegex.test(formData.email)) {
      errors.email = t.invalidEmail;
      setFormErrors(errors);
      return false;
    }
    
    // Check if user already exists
    try {
      const usersRef = collection(db, "authorized_users");
      const q = query(
        usersRef, 
        where("email", "==", formData.email),
        where("companyId", "==", companyInfo.id)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        errors.email = t.userExists;
        setFormErrors(errors);
        return false;
      }
    } catch (err) {
      console.error("Error checking existing user:", err);
      // Continue with form submission even if this check fails
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare user data
      const userData = {
        email: formData.email.toLowerCase().trim(),
        name: formData.name.trim() || formData.email.split('@')[0], // Use part before @ if no name provided
        companyId: companyInfo.id,
        companyName: companyInfo.name,
        createdBy: currentUser.uid,
        creatorName: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
        role: formData.isAdmin ? 'admin' : 'employee',
        permissions: {
          services: formData.permissions.services,
          reservations: formData.permissions.reservations,
          clients: formData.permissions.clients,
          finance: formData.isAdmin ? formData.permissions.finance : false // Only admins can have finance access
        },
        active: true
      };
      
      // Add user to Firestore
      const usersRef = collection(db, "authorized_users");
      await addDoc(usersRef, userData);
      
      // Reset form and show success message
      resetForm();
      setShowAddForm(false);
      setSuccess(t.success);
      
      // Refresh user list
      fetchUsers();
    } catch (err) {
      console.error("Error adding user:", err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  
  // If user is not an admin, show access denied message
  if (roleLoading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 text-center space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">{t.title}</h2>
        <p className="text-gray-500">{t.loading}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 text-center space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">{t.title}</h2>
        <p className="text-gray-600">{t.noPermission}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t.title}</h2>
        
        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="p-2 rounded border border-gray-300 w-full sm:w-auto"
        >
          <option value="ro">Română</option>
          <option value="en">English</option>
        </select>
      </div>
      
      {/* Error and Success messages */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
          {success}
        </div>
      )}
      
      {/* Add User Button */}
      {!showAddForm && (
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="mb-6 w-full sm:w-auto bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
        >
          {t.addUser}
        </button>
      )}
      
      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mb-6 border border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-700">{t.addUser}</h3>
          
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">
                {t.email}:
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={t.emailPlaceholder}
                className={`w-full py-2 px-3 border rounded-md ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.email ? (
                <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
              ) : (
                <p className="text-gray-500 text-sm mt-1">{t.emailInstructions}</p>
              )}
            </div>
            
            {/* Name */}
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">
                {t.name}:
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t.namePlaceholder}
                className="w-full py-2 px-3 border border-gray-300 rounded-md"
              />
            </div>
            
            {/* Admin Role Toggle */}
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="isAdmin"
                name="isAdmin"
                checked={formData.isAdmin}
                onChange={handleInputChange}
                className="mr-2 h-5 w-5"
              />
              <label htmlFor="isAdmin" className="font-medium text-gray-700">
                {t.admin}
              </label>
            </div>
            
            {/* Permissions */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">{t.accessRights}:</h4>
              
              <div className="space-y-3 pl-2">
                {/* Services access */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="permissions.services"
                    name="permissions.services"
                    checked={formData.permissions.services}
                    onChange={handleInputChange}
                    className="mr-2 h-5 w-5"
                  />
                  <label htmlFor="permissions.services" className="text-gray-700">
                    {t.viewServices}
                  </label>
                </div>
                
                {/* Reservations access */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="permissions.reservations"
                    name="permissions.reservations"
                    checked={formData.permissions.reservations}
                    onChange={handleInputChange}
                    className="mr-2 h-5 w-5"
                  />
                  <label htmlFor="permissions.reservations" className="text-gray-700">
                    {t.viewReservations}
                  </label>
                </div>
                
                {/* Clients access */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="permissions.clients"
                    name="permissions.clients"
                    checked={formData.permissions.clients}
                    onChange={handleInputChange}
                    className="mr-2 h-5 w-5"
                  />
                  <label htmlFor="permissions.clients" className="text-gray-700">
                    {t.viewClients}
                  </label>
                </div>
                
                {/* Finance access - only for admins */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="permissions.finance"
                    name="permissions.finance"
                    checked={formData.permissions.finance}
                    onChange={handleInputChange}
                    disabled={!formData.isAdmin}
                    className={`mr-2 h-5 w-5 ${!formData.isAdmin ? 'opacity-50' : ''}`}
                  />
                  <label 
                    htmlFor="permissions.finance" 
                    className={`text-gray-700 ${!formData.isAdmin ? 'opacity-50' : ''}`}
                  >
                    {t.viewFinance}
                  </label>
                </div>
              </div>
            </div>
            
            {/* Form Buttons */}
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors w-full sm:w-auto"
              >
                {t.cancel}
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
              >
                {loading ? t.loading : t.save}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Search */}
      <div className="mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full py-2 px-3 pl-10 border border-gray-300 rounded-md"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
        
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors w-full sm:w-auto"
          >
            {t.clearSearch}
          </button>
        )}
      </div>
      
      {/* Users List */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t.userList}</h3>
        
        {loading && (
          <div className="text-center py-8 text-gray-500">
            {t.loading}
          </div>
        )}
        
        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            {t.noUsers}
          </div>
        )}
        
        {/* Desktop Table View - Hidden on Mobile */}
        {!loading && filteredUsers.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left text-gray-600 font-semibold">{t.name}</th>
                  <th className="py-3 px-4 text-left text-gray-600 font-semibold">{t.email}</th>
                  <th className="py-3 px-4 text-left text-gray-600 font-semibold">{t.role}</th>
                  <th className="py-3 px-4 text-left text-gray-600 font-semibold">{t.addedBy}</th>
                  <th className="py-3 px-4 text-left text-gray-600 font-semibold">{t.addedOn}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{user.name}</td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      <span 
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.role === 'admin' ? t.admin : t.employee}
                      </span>
                    </td>
                    <td className="py-3 px-4">{user.creatorName}</td>
                    <td className="py-3 px-4">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Mobile Card View - Shown only on Mobile */}
        {!loading && filteredUsers.length > 0 && (
          <div className="md:hidden space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800">{user.name}</h4>
                  <span 
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-indigo-100 text-indigo-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role === 'admin' ? t.admin : t.employee}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-1">{user.email}</div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 grid grid-cols-2 gap-1">
                  <div>
                    <span className="font-medium">{t.addedBy}:</span> {user.creatorName}
                  </div>
                  <div>
                    <span className="font-medium">{t.addedOn}:</span> {formatDate(user.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
