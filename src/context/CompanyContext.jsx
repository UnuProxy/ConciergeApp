import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, getDoc, doc, query, where, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Create the context
const CompanyContext = createContext();

// Custom hook to use the company context
export const useCompany = () => useContext(CompanyContext);

// Provider component
export const CompanyProvider = ({ children }) => {
  const [currentCompany, setCurrentCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null); // Initialize as null, not placeholder
  const debugForceCompanyId = import.meta.env.VITE_DEBUG_FORCE_COMPANY_ID || null;
  const debugForceCompanyName = import.meta.env.VITE_DEBUG_FORCE_COMPANY_NAME || debugForceCompanyId;
  const debugForceRole = import.meta.env.VITE_DEBUG_FORCE_ROLE || 'admin';

  // Fetch companies and check if user is authorized
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setAuthorized(false);
      setCompanies([]);
      setCurrentCompany(null);

      if (!user) {
        console.log('No authenticated user');
        setUserRole(null);
        setLoading(false);
        return;
      }

      console.log(`Authenticated user: ${user.email}`);

      try {
        // Step 1: Get primary user mapping from users/{uid} (allowed by rules for the signed-in user)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let resolvedRole = null;
        let resolvedCompanyId = null;
        let resolvedCompanyName = null;

        if (userDoc.exists()) {
          const userData = userDoc.data();
          resolvedRole = userData.role || null;
          resolvedCompanyId = userData.companyId || null;
          resolvedCompanyName = userData.companyName || null;
          console.log('User data from users collection:', userData);
        }

        // Step 2: Fallback to authorized_users only if we still do not have role/company
        if (!resolvedRole || !resolvedCompanyId) {
          const authorizedUsersRef = collection(db, 'authorized_users');
          const normalizedEmail = user.email?.toLowerCase();
          const authQuery = query(authorizedUsersRef, where('email', '==', normalizedEmail));
          const authSnapshot = await getDocs(authQuery);

          if (!authSnapshot.empty) {
            const authData = authSnapshot.docs[0].data();
            resolvedRole = resolvedRole || authData.role || null;
            resolvedCompanyId = resolvedCompanyId || authData.companyId || null;
            resolvedCompanyName = resolvedCompanyName || authData.companyName || null;
            console.log('Found in authorized_users:', authData);

            // If user doc missing, create it so rules can allow future reads
            if (!userDoc.exists() && resolvedCompanyId) {
              try {
                await setDoc(doc(db, 'users', user.uid), {
                  email: normalizedEmail,
                  companyId: resolvedCompanyId,
                  companyName: resolvedCompanyName || resolvedCompanyId,
                  role: resolvedRole || 'agent'
                }, { merge: true });
                console.log('Created users doc from authorized_users fallback');
              } catch (writeErr) {
                console.warn('Failed to create users doc from authorized_users:', writeErr);
              }
            }
          } else {
            console.log('No authorized_users entry for user email');
          }
        }

        // Step 3: Load only the user's company document (avoids full collection read if rules are restrictive)
        const preferredCompanyId = resolvedCompanyId || localStorage.getItem('lastCompanyId');
        if (preferredCompanyId) {
          try {
            const companyDocRef = doc(db, 'companies', preferredCompanyId);
            const companySnapshot = await getDoc(companyDocRef);
            if (companySnapshot.exists()) {
              const companyData = { id: preferredCompanyId, ...companySnapshot.data() };
              setCompanies([companyData]);
              setCurrentCompany(companyData);
              setAuthorized(true);
              console.log('Setting current company:', companyData);
            } else {
              console.log('User company not found in Firestore');
              setAuthorized(false);
            }
          } catch (companyError) {
            if (companyError?.code === 'permission-denied') {
              console.warn('Permission denied reading company doc, falling back to authorized_users data');
              if (resolvedCompanyName || resolvedCompanyId) {
                const fallbackCompany = {
                  id: preferredCompanyId,
                  name: resolvedCompanyName || preferredCompanyId
                };
                setCompanies([fallbackCompany]);
                setCurrentCompany(fallbackCompany);
                setAuthorized(true);
              } else {
                setAuthorized(false);
              }
            } else {
              throw companyError;
            }
          }
        } else {
          console.log('No companyId resolved for user');
          setAuthorized(false);
        }

        if (resolvedRole) {
          setUserRole(resolvedRole);
          console.log(`User role set to: ${resolvedRole}`);
        }
      } catch (error) {
        if (error?.code === 'permission-denied') {
          console.error('Permission denied while fetching company data. Ensure Firestore rules allow the signed-in user to read companies and users.', error);
          // Dev escape hatch to continue testing UI when rules are too strict
          if (debugForceCompanyId) {
            const fallbackCompany = { id: debugForceCompanyId, name: debugForceCompanyName || debugForceCompanyId };
            setCompanies([fallbackCompany]);
            setCurrentCompany(fallbackCompany);
            setAuthorized(true);
            setUserRole(debugForceRole);
            console.warn('DEBUG: Forced company/role applied from env vars.');
          }
        } else {
          console.error('Error fetching companies:', error);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const switchCompany = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      console.log(`Switching to company: ${company.name}`);
      setCurrentCompany(company);
      localStorage.setItem('lastCompanyId', companyId);
    }
  };

  // Manually update user role - can be called after fixes
  const updateUserRole = (role) => {
    console.log(`Manually updating user role to: ${role}`);
    setUserRole(role);
  };

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        companies,
        loading,
        authorized,
        userRole, // Make user role available to components
        switchCompany,
        updateUserRole // Add method to manually update role
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
