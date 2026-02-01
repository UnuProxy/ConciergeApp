// src/components/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { currentUser, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return null;
  }

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
