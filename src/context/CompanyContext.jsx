import React, { createContext, useState, useContext, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

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

  // Fetch companies and check if user is authorized
  useEffect(() => {
    const fetchCompaniesAndAuthorization = async () => {
      try {
        // Get current authenticated user
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          console.log('No authenticated user');
          setLoading(false);
          return;
        }
        console.log(`Authenticated user: ${user.email}`);

        // Fetch real companies from Firestore
        const companiesRef = collection(db, 'companies');
        const snapshot = await getDocs(companiesRef);
        const fetchedCompanies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Fetched companies:', fetchedCompanies);
        setCompanies(fetchedCompanies);

        // Check authorization first in authorized_users collection
        const authorizedUsersRef = collection(db, 'authorized_users');
        const authQuery = query(authorizedUsersRef, where("email", "==", user.email));
        const authSnapshot = await getDocs(authQuery);
        
        let foundRole = null;
        let foundCompanyId = null;
        
        if (!authSnapshot.empty) {
          const authData = authSnapshot.docs[0].data();
          console.log("Found in authorized_users:", authData);
          foundRole = authData.role;
          foundCompanyId = authData.companyId;
          console.log(`Found in authorized_users: Role=${foundRole}, Company=${foundCompanyId}`);
        }

        // Check user's company and role from users collection
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('User data from users collection:', userData);
          
          // If we found a role in authorized_users or users collection, use it
          const finalRole = foundRole || userData.role || null;
          if (finalRole) {
            setUserRole(finalRole);
            console.log(`User role set to: ${finalRole}`);
          }
          
          // Find the user's company in the fetched companies
          const userCompanyId = foundCompanyId || userData.companyId;
          const userCompany = fetchedCompanies.find(company => company.id === userCompanyId);
          
          if (userCompany) {
            console.log('Setting current company:', userCompany);
            setCurrentCompany(userCompany);
            setAuthorized(true);
          } else {
            console.log('User company not found in fetched companies');
            setAuthorized(false);
          }
        } else {
          console.log('User document not found in Firestore');
          setAuthorized(false);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching companies:', error);
        setLoading(false);
      }
    };

    fetchCompaniesAndAuthorization();
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