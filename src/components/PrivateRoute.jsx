// src/components/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { currentUser, userCompany, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return null;
  }

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in but hasn't selected a company, redirect to company selection
  // Unless they're already on the company selection page
  if (!userCompany && location.pathname !== '/select-company') {
    return <Navigate to="/select-company" state={{ from: location }} replace />;
  }

  return children;
}
