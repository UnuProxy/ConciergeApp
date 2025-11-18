import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Create context
const AuthContext = createContext();

// Hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

// Provider for auth context
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userCompany, setUserCompany] = useState(null);
  const [userRole, setUserRole] = useState(null); // Initialize as null, not placeholder
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Function to check and update existing users' roles
  async function updateExistingUserRoles() {
    try {
      console.log("FORCE UPDATING unujulian@gmail.com to ADMIN role");
      
      // 1. First, get all auth users with unujulian@gmail.com and update them
      const authUsersRef = collection(db, 'authorized_users');
      const authQuery = query(authUsersRef, where("email", "==", "unujulian@gmail.com"));
      const authSnapshot = await getDocs(authQuery);
      
      // Force update all matching documents in authorized_users
      if (!authSnapshot.empty) {
        for (const docRef of authSnapshot.docs) {
          console.log(`Updating authorized_users document: ${docRef.id}`);
          // Use setDoc to completely replace the document
          await setDoc(doc(db, 'authorized_users', docRef.id), {
            email: "unujulian@gmail.com",
            companyId: "company2",
            role: "admin",
            createdAt: serverTimestamp()
          });
        }
      } else {
        console.log("No authorized_users document found for unujulian@gmail.com");
        
        // Create a new authorized_user document if none exists
        await setDoc(doc(authUsersRef, 'unu_admin_fix'), {
          email: "unujulian@gmail.com",
          companyId: "company2",
          role: "admin",
          createdAt: serverTimestamp()
        });
      }
      
      // 2. Now update in users collection
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where("email", "==", "unujulian@gmail.com"));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        for (const docRef of userSnapshot.docs) {
          console.log(`Updating users document: ${docRef.id}`);
          // Update only the role field, preserving other user data
          await setDoc(doc(db, 'users', docRef.id), {
            ...docRef.data(),
            role: "admin",
            companyId: "company2"
          }, { merge: true });
        }
      }
      
      console.log("FORCE UPDATE COMPLETED");
    } catch (error) {
      console.error("Error in force update:", error);
      setError("Failed to update user roles: " + error.message);
    }
  }

  // Initialize authorized users collection
  async function initializeAuthorizedUsers() {
    try {
      console.log("Checking if authorized users need to be initialized...");
      const authorizedUsersRef = collection(db, 'authorized_users');
      const snapshot = await getDocs(authorizedUsersRef);
      
      if (snapshot.empty) {
        console.log("Creating initial authorized users...");
        
        // Company 1 admin
        await setDoc(doc(authorizedUsersRef, 'auth1'), {
          email: 'conciergeapp2025@gmail.com',
          companyId: 'company1',
          role: 'admin',
          createdAt: serverTimestamp()
        });
        
        // Company 1 agent
        await setDoc(doc(authorizedUsersRef, 'auth2'), {
          email: 'user1@example.com',
          companyId: 'company1',
          role: 'agent',
          createdAt: serverTimestamp()
        });
        
        // Company 2 admin
        await setDoc(doc(authorizedUsersRef, 'auth3'), {
          email: 'unujulian@gmail.com',
          companyId: 'company2',
          role: 'admin', // Ensuring this is admin
          createdAt: serverTimestamp()
        });
        
        // Company 2 agent (use a different email, not unujulian@gmail.com)
        await setDoc(doc(authorizedUsersRef, 'auth4'), {
          email: 'company2agent@example.com', // Replace with actual email for Company 2 agent
          companyId: 'company2',
          role: 'agent',
          createdAt: serverTimestamp()
        });
        
        console.log("Authorized users created successfully");
      } else {
        console.log("Authorized users already exist in database");
      }
    } catch (error) {
      console.error("Error initializing authorized users:", error);
      setError("Failed to initialize authorized users: " + error.message);
    }
  }

  // Initialize companies in Firestore
  async function initializeCompanies() {
    try {
      console.log("Checking if companies need to be initialized...");
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);
      
      if (snapshot.empty) {
        console.log("Creating initial companies...");
        // Create Company 1
        await setDoc(doc(companiesRef, 'company1'), {
          name: 'Luxury Concierge',
          contactEmail: 'conciergeapp2025@gmail.com',
          createdAt: serverTimestamp()
        });
        
        // Create Company 2
        await setDoc(doc(companiesRef, 'company2'), {
          name: 'VIP Services',
          contactEmail: 'unujulian@gmail.com', // Updated to use Company 2's admin email
          createdAt: serverTimestamp()
        });
        
        console.log("Companies created successfully");
      } else {
        console.log("Companies already exist in database");
      }
    } catch (error) {
      console.error("Error initializing companies:", error);
      setError("Failed to initialize companies: " + error.message);
    }
  }

  // Check if a user is authorized
  async function isAuthorizedUser(email) {
    try {
      console.log(`Checking if ${email} is authorized...`);
      const authorizedUsersRef = collection(db, 'authorized_users');
      const q = query(authorizedUsersRef, where("email", "==", email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log(`User ${email} is not authorized`);
        return { authorized: false };
      } else {
        const userData = snapshot.docs[0].data();
        console.log(`User ${email} is authorized for company ${userData.companyId} with role ${userData.role}`);
        return { 
          authorized: true, 
          companyId: userData.companyId,
          role: userData.role
        };
      }
    } catch (error) {
      console.error("Error checking user authorization:", error);
      throw error;
    }
  }

  // Sign in with Google
  async function loginWithGoogle() {
    try {
      setError(null);
      
      // First, ensure companies and authorized users exist in database
      await initializeCompanies();
      await initializeAuthorizedUsers();
      
      // Check and fix any existing user roles
      await updateExistingUserRoles();
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log("Google authentication successful for:", user.email);
      
      // Check if this email is authorized
      const { authorized, companyId, role } = await isAuthorizedUser(user.email);
      
      if (!authorized) {
        // User is not authorized
        setError("You do not have permission to access this application.");
        await signOut(auth);
        throw new Error("Unauthorized email address.");
      }
      
      // Check if this user already exists in our database
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.log("New user - company assignment");
        
        // Automatically assign the user to their authorized company
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          companyId: companyId,
          role: role,
          createdAt: serverTimestamp()
        });
        
        // Update local state with role
        setUserCompany(companyId);
        setUserRole(role);
        console.log(`Set userRole state to: ${role}`);
        
        // No need for company selection, already assigned
        return { newUser: false, user };
      }
      
      // Existing user
      console.log("Existing user found");
      return { newUser: false, user };
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      throw error;
    }
  }

  // Additional functions remain unchanged
  // Get available companies for selection
  async function getAvailableCompanies() {
    try {
      console.log("Fetching available companies");
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);
      
      const companies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Companies retrieved:", companies);
      return companies;
    } catch (error) {
      console.error("Error fetching companies:", error);
      setError("Failed to load companies: " + error.message);
      return [];
    }
  }

  // Assign user to company (for new users) - Now only used if manually assigning in admin panel
  async function assignUserToCompany(companyId, role = 'agent') {
    try {
      if (!currentUser) throw new Error("No user logged in");
      
      console.log(`Assigning user ${currentUser.uid} to company ${companyId}`);
      
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        companyId: companyId,
        role: role,
        createdAt: serverTimestamp()
      });
      
      // Update local state with role - important!
      setUserCompany(companyId);
      setUserRole(role);
      console.log(`Set userRole state to: ${role}`);
      
      console.log("User successfully assigned to company");
      return true;
    } catch (error) {
      console.error("Error assigning user to company:", error);
      setError("Failed to assign user to company: " + error.message);
      return false;
    }
  }

  // Logout function
  async function logout() {
    try {
      setError(null);
      await signOut(auth);
      console.log("User signed out");
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message);
      throw error;
    }
  }

  // Fetch user's company data
  async function fetchUserCompanyData(userId) {
    try {
      console.log(`Fetching company data for user ${userId}`);
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data:", userData);
        
        // Important: Check if role exists and update state
        if (userData.role) {
          setUserRole(userData.role);
          console.log(`Set userRole state to: ${userData.role}`);
        } else {
          // If no role, check authorized_users collection
          if (userData.email) {
            const authData = await isAuthorizedUser(userData.email);
            if (authData.authorized && authData.role) {
              setUserRole(authData.role);
              console.log(`Set userRole from authorized_users to: ${authData.role}`);
            }
          }
        }
        
        setUserCompany(userData.companyId);
        return userData;
      }
      
      console.log("No user document found");
      return null;
    } catch (error) {
      console.error("Error fetching user company data:", error);
      setError("Error fetching user data: " + error.message);
      return null;
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User authenticated:", user.email);
        let safePhotoURL = user.photoURL || '';
        if (safePhotoURL.includes('googleusercontent.com')) {
          safePhotoURL = safePhotoURL.replace(/=s\d+-c/, '=s96-c');
        }
        setCurrentUser({
          ...user,
          photoURL: safePhotoURL
        });
        const userData = await fetchUserCompanyData(user.uid);
        
        // If user exists in Firestore but no company assigned, they still need to select one
        if (!userData || !userData.companyId) {
          console.log("User has no company assigned");
          setUserCompany(null);
        }
        
        // Log the current role for debugging
        console.log("Current user role in Navbar:", userRole);
      } else {
        console.log("No user authenticated");
        setCurrentUser(null);
        setUserCompany(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Context values to provide
  const value = {
    currentUser,
    userCompany,
    userRole,
    loginWithGoogle,
    assignUserToCompany,
    getAvailableCompanies,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
