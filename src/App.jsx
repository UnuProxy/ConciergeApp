// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { DatabaseProvider } from './context/DatabaseContext'
import { CompanyProvider } from './context/CompanyContext' // Import CompanyProvider
import { TranslationProvider } from './components/TranslationProvider'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
// Client pages
import AddClient from './pages/clients/AddClient'
import ExistingClients from './pages/clients/ExistingClients'
import Collaborators from './pages/clients/Collaborators'
// Service pages
import Villas from './pages/services/Villas'
import Boats from './pages/services/Boats'
import Cars from './pages/services/Cars'
import Security from './pages/services/Security'
import Chef from './pages/services/Chef'
import CoreConcierge from './pages/services/CoreConcierge';
// Reservations & Finance
import UpcomingBookings from './pages/UpcomingBookings'
import Finance from './pages/Finance'
// Auth
import Login from './pages/Login'
import SelectCompany from './pages/SelectCompany'
import PrivateRoute from './components/PrivateRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
// User Management
import UserManagement from './pages/users/UserManagement'
import PropertiesForSale from './pages/services/properties/PropertiesForSale';
import AddProperty from './pages/services/properties/AddProperty';
import PropertyDetail from './pages/services/properties/PropertyDetail';
import PropertyShare from './pages/services/properties/PropertyShare';

// NEW: Import splash screen components
import './styles/splashAnimations.css'

// Layout wrapper for all protected routes
function ProtectedLayout({ children, sidebarOpen, setSidebarOpen }) {
  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="app-shell__content">
        <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="app-shell__main">
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // PWA: Disable service worker registration and aggressively unregister any existing one
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Unregister any existing service workers and clear caches to avoid intercepting fetches
    navigator.serviceWorker.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if (window.caches?.keys) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }, [])

  // EXISTING: Your main app with all routes
  return (
    <AuthProvider>
      {/* Add CompanyProvider here - needs to come after AuthProvider */}
      <CompanyProvider>
        <DatabaseProvider>
          <TranslationProvider defaultLanguage="en">
            <Router>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/select-company" element={<SelectCompany />} />
                
                {/* Protected */}
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <ProtectedLayout
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                      >
                        <Dashboard />
                      </ProtectedLayout>
                    </PrivateRoute>
                  }
                />
                
                <Route
                  path="/clients/*"
                  element={
                    <PrivateRoute>
                      <ProtectedLayout
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                      >
                        <Routes>
                          <Route path="add" element={<AddClient />} />
                          <Route path="existing" element={<ExistingClients />} />
                          <Route path="collaborators" element={<Collaborators />} />
                        </Routes>
                      </ProtectedLayout>
                    </PrivateRoute>
                  }
                />
                
                <Route
                  path="/services/*"
                  element={
                    <PrivateRoute>
                      <ProtectedLayout
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                      >
                        <Routes>
                          <Route path="villas" element={<Villas />} />
                          <Route path="core-concierge" element={<CoreConcierge />} />
                          <Route path="boats" element={<Boats />} />
                          <Route path="cars" element={<Cars />} />
                          <Route path="security" element={<Security />} />
                          <Route path="chef" element={<Chef />} />
                          
                          {/* Add these new routes */}
                          <Route path="properties-for-sale" element={<PropertiesForSale />} />
                          <Route path="properties-for-sale/add" element={<AddProperty />} />
                          <Route path="properties-for-sale/:id" element={<PropertyDetail />} />
                          <Route path="properties-for-sale/edit/:id" element={<AddProperty />} />
                        </Routes>
                      </ProtectedLayout>
                    </PrivateRoute>
                  }
                />

                <Route path="/share/property/:token" element={<PropertyShare />} />
                
                <Route
                  path="/reservations"
                  element={
                    <PrivateRoute>
                      <ProtectedLayout
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                      >
                        <UpcomingBookings />
                      </ProtectedLayout>
                    </PrivateRoute>
                  }
                />
                
                <Route
                  path="/finance"
                  element={
                    <PrivateRoute>
                      <RoleProtectedRoute requiredRole="admin">
                        <ProtectedLayout
                          sidebarOpen={sidebarOpen}
                          setSidebarOpen={setSidebarOpen}
                        >
                          <Finance />
                        </ProtectedLayout>
                      </RoleProtectedRoute>
                    </PrivateRoute>
                  }
                />
                
                <Route
                  path="/settings"
                  element={
                    <PrivateRoute>
                      <ProtectedLayout
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                      >
                        <Settings />
                      </ProtectedLayout>
                    </PrivateRoute>
                  }
                />
                
                {/* User Management Routes */}
                <Route
                  path="/users/manage"
                  element={
                    <PrivateRoute>
                      <ProtectedLayout
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                      >
                        <UserManagement />
                      </ProtectedLayout>
                    </PrivateRoute>
                  }
                />
                
                {/* Catch‑all → dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </TranslationProvider>
        </DatabaseProvider>
      </CompanyProvider>
    </AuthProvider>
  )
}

export default App
