import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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
import { auth, db, initAuth, googleSignIn } from '../firebase/config';

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
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState(null);
  
  // Function to check and update existing users' roles
  async function updateExistingUserRoles() {
    try {
  // console.log("FORCE UPDATING unujulian@gmail.com to ADMIN role"); // Removed for production
      
      // 1. First, get all auth users with unujulian@gmail.com and update them
      const authUsersRef = collection(db, 'authorized_users');
      const authQuery = query(authUsersRef, where("email", "==", "unujulian@gmail.com"));
      const authSnapshot = await getDocs(authQuery);
      
      // Force update all matching documents in authorized_users
      if (!authSnapshot.empty) {
        for (const docRef of authSnapshot.docs) {
  // console.log(`Updating authorized_users document: ${docRef.id}`); // Removed for production
          // Use setDoc to completely replace the document
          await setDoc(doc(db, 'authorized_users', docRef.id), {
            email: "unujulian@gmail.com",
            companyId: "company2",
            role: "admin",
            createdAt: serverTimestamp()
          });
        }
      } else {
  // console.log("No authorized_users document found for unujulian@gmail.com"); // Removed for production
        
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
  // console.log(`Updating users document: ${docRef.id}`); // Removed for production
          // Update only the role field, preserving other user data
          await setDoc(doc(db, 'users', docRef.id), {
            ...docRef.data(),
            role: "admin",
            companyId: "company2"
          }, { merge: true });
        }
      }
      
  // console.log("FORCE UPDATE COMPLETED"); // Removed for production
    } catch (error) {
      console.error("Error in force update:", error);
      setError("Failed to update user roles: " + error.message);
    }
  }

  // Initialize authorized users collection
  async function initializeAuthorizedUsers() {
    try {
  // console.log("Checking if authorized users need to be initialized..."); // Removed for production
      const authorizedUsersRef = collection(db, 'authorized_users');
      const snapshot = await getDocs(authorizedUsersRef);
      
      if (snapshot.empty) {
  // console.log("Creating initial authorized users..."); // Removed for production
        
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
        
  // console.log("Authorized users created successfully"); // Removed for production
      } else {
  // console.log("Authorized users already exist in database"); // Removed for production
      }
    } catch (error) {
      console.error("Error initializing authorized users:", error);
      setError("Failed to initialize authorized users: " + error.message);
    }
  }

  // Initialize companies in Firestore
  async function initializeCompanies() {
    try {
  // console.log("Checking if companies need to be initialized..."); // Removed for production
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);
      
      if (snapshot.empty) {
  // console.log("Creating initial companies..."); // Removed for production
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
        
  // console.log("Companies created successfully"); // Removed for production
      } else {
  // console.log("Companies already exist in database"); // Removed for production
      }
    } catch (error) {
      console.error("Error initializing companies:", error);
      setError("Failed to initialize companies: " + error.message);
    }
  }

  // Check if a user is authorized
  async function isAuthorizedUser(email, uid = null) {
    try {
      const normalizedEmail = email?.toLowerCase();

      // First check authorized_users collection (prefer deterministic doc id: email)
      if (normalizedEmail) {
        const directSnap = await getDoc(doc(db, 'authorized_users', normalizedEmail));
        if (directSnap.exists()) {
          const userData = directSnap.data();
          return {
            authorized: true,
            companyId: userData.companyId,
            role: userData.role,
            permissions: userData.permissions || null,
            companyName: userData.companyName || null
          };
        }
      }

      // Fallback: query by email (legacy docs)
      const authorizedUsersRef = collection(db, 'authorized_users');
      const q = query(authorizedUsersRef, where("email", "==", normalizedEmail));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        return {
          authorized: true,
          companyId: userData.companyId,
          role: userData.role,
          permissions: userData.permissions || null,
          companyName: userData.companyName || null
        };
      }

      // If not in authorized_users, check users collection if uid is provided
      if (uid) {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.email?.toLowerCase() === normalizedEmail) {
            return {
              authorized: true,
              companyId: userData.companyId,
              role: userData.role
            };
          }
        }
      }

      return { authorized: false };
    } catch (error) {
      console.error("Error checking user authorization:", error);
      throw error;
    }
  }

  // Sign in with Google
  async function loginWithGoogle() {
    try {
      setError(null);
      const { didRedirect, result } = await googleSignIn();
      return { didRedirect, user: result?.user || null };
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle unauthorized domain error specifically
      if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/unauthorized-continue-uri') {
        const currentDomain = window.location.hostname;
        setError(`Domain "${currentDomain}" is not authorized. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else {
        setError(error.message);
      }
      throw error;
    }
  }

  // Additional functions remain unchanged
  // Get available companies for selection
  async function getAvailableCompanies() {
    try {
  // console.log("Fetching available companies"); // Removed for production
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);
      
      const companies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
  // console.log("Companies retrieved:", companies); // Removed for production
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
      
  // console.log(`Assigning user ${currentUser.uid} to company ${companyId}`); // Removed for production
      
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
  // console.log(`Set userRole state to: ${role}`); // Removed for production
      
  // console.log("User successfully assigned to company"); // Removed for production
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
  // console.log("User signed out"); // Removed for production
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message);
      throw error;
    }
  }

  // Fetch user's company data
  async function fetchUserCompanyData(userId) {
    try {
  // console.log(`Fetching company data for user ${userId}`); // Removed for production
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
  // console.log("User data:", userData); // Removed for production
        
        // Important: Check if role exists and update state
        if (userData.role) {
          setUserRole(userData.role);
  // console.log(`Set userRole state to: ${userData.role}`); // Removed for production
        } else {
          // If no role, check authorized_users collection
          if (userData.email) {
            const authData = await isAuthorizedUser(userData.email, userId);
            if (authData.authorized && authData.role) {
              setUserRole(authData.role);
  // console.log(`Set userRole from authorized_users to: ${authData.role}`); // Removed for production
            }
          }
        }
        
        setUserCompany(userData.companyId);
        return userData;
      }
      
  // console.log("No user document found"); // Removed for production
      return null;
    } catch (error) {
      console.error("Error fetching user company data:", error);
      setError("Error fetching user data: " + error.message);
      return null;
    }
  }

  // Listen for auth state changes
  useEffect(() => {
  // console.log("Setting up auth state listener"); // Removed for production
    let unsubscribe = null;
    let isMounted = true;

    (async () => {
      try {
        await initAuth();
      } catch (error) {
        console.error("Auth init error:", error);
      }

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!isMounted) return;
        try {
          if (user) {
            const { authorized, companyId, role, permissions, companyName } = await isAuthorizedUser(user.email, user.uid);

            if (!authorized) {
              const errorMsg = `Access denied: ${user.email} is not authorized. Please contact your administrator.`;
              console.error('Authorization failed:', errorMsg);
              setError(errorMsg);
              await signOut(auth);
              setCurrentUser(null);
              setUserCompany(null);
              setUserRole(null);
              return;
            }

            setError(null);
            let safePhotoURL = user.photoURL || '';
            if (safePhotoURL.includes('googleusercontent.com')) {
              safePhotoURL = safePhotoURL.replace(/=s\\d+-c/, '=s96-c');
            }
            setCurrentUser({
              ...user,
              photoURL: safePhotoURL
            });

            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const userDocData = userDoc.exists() ? userDoc.data() : null;
            const needsCompany = !userDocData?.companyId && !!companyId;
            const needsRole = !userDocData?.role && !!role;
            const needsPermissions = !userDocData?.permissions && !!permissions;
            const needsCompanyName = !userDocData?.companyName && !!companyName;
            const companyMismatch = !!companyId && userDocData?.companyId && userDocData.companyId !== companyId;
            const roleMismatch = !!role && userDocData?.role && userDocData.role !== role;
            const isNewUserDoc = !userDoc.exists();

            if (isNewUserDoc || needsCompany || needsRole || needsPermissions || needsCompanyName || companyMismatch || roleMismatch) {
              const userPayload = {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                ...(companyId ? { companyId } : {}),
                ...(role ? { role } : {}),
                ...(permissions ? { permissions } : {}),
                ...(companyName ? { companyName } : {})
              };

              if (isNewUserDoc) {
                userPayload.createdAt = serverTimestamp();
              }

              await setDoc(userDocRef, userPayload, { merge: true });
            }

            if (companyId) {
              setUserCompany(companyId);
            }
            if (role) {
              setUserRole(role);
            }

            const userData = await fetchUserCompanyData(user.uid);

            // If user exists in Firestore but no company assigned
            if ((!userData || !userData.companyId) && !companyId) {
  // console.log("User has no company assigned"); // Removed for production
              setUserCompany(null);
            }

          } else {
            setCurrentUser(null);
            setUserCompany(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error handling auth state:", error);
          const message = error?.code ? `${error.code}: ${error.message}` : error?.message;
          setError(message || "Failed to load authentication state.");
        } finally {
          setLoading(false);
          setAuthReady(true);
        }
      });
    })();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  // Context values to provide
  const value = {
    currentUser,
    userCompany,
    userRole,
    authReady,
    loading,
    loginWithGoogle,
    assignUserToCompany,
    getAvailableCompanies,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
