import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthGate({ children, fallback = null }) {
  const { authReady } = useAuth();

  if (!authReady) {
    return fallback;
  }

  return children;
}
