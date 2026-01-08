// src/context/DatabaseContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection, doc, getDoc, query, where, getDocs, setDoc,
  serverTimestamp, addDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase/config';

// Create the context
const DatabaseContext = createContext();

// Custom hook for using the database context
export const useDatabase = () => useContext(DatabaseContext);

// Provider component
export const DatabaseProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const debugForceCompanyId = import.meta.env.VITE_DEBUG_FORCE_COMPANY_ID || null;
  const debugForceCompanyName = import.meta.env.VITE_DEBUG_FORCE_COMPANY_NAME || debugForceCompanyId;
  const debugForceRole = import.meta.env.VITE_DEBUG_FORCE_ROLE || 'admin';

  // Get authentication and company info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(true);
        
        try {
  // console.log("Current user:", user.email); // Removed for production
          // Always try the signed-in user's document first (rules allow self-reads)
          const userDocRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDocRef);
          let userData = userSnapshot.exists() ? userSnapshot.data() : null;
          let fallbackCompanyName = userData?.companyName || null;

          // Fallback to authorized_users if no user doc or missing required fields
          if (!userData?.companyId || !userData?.role) {
            const usersRef = collection(db, "authorized_users");
            const emailQuery = query(usersRef, where("email", "==", user.email.toLowerCase()));
            const emailSnapshot = await getDocs(emailQuery);

            if (!emailSnapshot.empty) {
              const fallbackData = emailSnapshot.docs[0].data();
              userData = {
                ...userData,
                companyId: userData?.companyId || fallbackData.companyId,
                role: userData?.role || fallbackData.role,
                companyName: userData?.companyName || fallbackData.companyName
              };
              fallbackCompanyName = fallbackCompanyName || fallbackData.companyName || null;
  // console.log("User found via authorized_users:", emailSnapshot.docs[0].id); // Removed for production

              // If user doc missing, create/merge it so future reads succeed
              if (!userSnapshot.exists() && userData.companyId) {
                try {
                  await setDoc(doc(db, "users", user.uid), {
                    email: user.email.toLowerCase(),
                    companyId: userData.companyId,
                    companyName: userData.companyName || userData.companyId,
                    role: userData.role || "agent"
                  }, { merge: true });
  // console.log("Created users doc from authorized_users fallback"); // Removed for production
                } catch (writeErr) {
  // console.warn("Failed to create users doc from authorized_users:", writeErr); // Removed for production
                }
              }
            }
          }

          if (userData?.companyId && userData?.role) {
  // console.log("User data:", userData); // Removed for production

            const resolvedRole = userData.role || "employee";
            setUserRole(resolvedRole);
  // console.log("Setting userRole state to:", resolvedRole); // Removed for production
            
            const companyId = userData.companyId;
            try {
              const companyDocRef = doc(db, "companies", companyId);
              const companySnapshot = await getDoc(companyDocRef);
              
              if (companySnapshot.exists()) {
  // console.log("Company found:", companyId); // Removed for production
                setCompanyInfo({
                  id: companyId,
                  ...companySnapshot.data()
                });
              } else {
                console.error("Company not found:", companyId);
                setError("Company not found. Please contact your administrator.");
              }
            } catch (companyError) {
              if (companyError?.code === "permission-denied") {
  // console.warn("Permission denied reading company doc, falling back to authorized_users data"); // Removed for production
                if (companyId) {
                  setCompanyInfo({
                    id: companyId,
                    name: fallbackCompanyName || companyId
                  });
                }
              } else {
                throw companyError;
              }
            }
          } else {
            console.error("User not found in users or authorized_users");
            setError("Your account is not authorized. Please contact your administrator.");
          }
        } catch (error) {
          if (error?.code === "permission-denied") {
            console.error("Permission denied when fetching user/company data:", error);
            setError("You do not have permission to access your data. Please ensure your account is whitelisted.");
            // Dev escape hatch to continue testing UI when rules are too strict
            if (debugForceCompanyId) {
              setUserRole(debugForceRole);
              setCompanyInfo({
                id: debugForceCompanyId,
                name: debugForceCompanyName || debugForceCompanyId
              });
  // console.warn("DEBUG: Forced company/role applied from env vars."); // Removed for production
            }
          } else {
            console.error("Error fetching user or company data:", error);
            setError("Error loading your data. Please try again.");
          }
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setCompanyInfo(null);
        setUserRole(null); // Reset userRole on logout
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Helper function for file uploads - centralizes storage access logic
  const uploadFile = async (file, folder) => {
    if (!file) throw new Error("No file provided");
    if (!currentUser) throw new Error("User not authenticated");

  // console.log("Starting upload process"); // Removed for production
    
    // Create sanitized filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    
    // Create a more permissive path for testing
    const path = `public/${folder}/${filename}`;
  // console.log("Upload path:", path); // Removed for production
    
    // Create storage reference
    const storageRef = ref(storage, path);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
  // console.log("Upload successful"); // Removed for production
    
    // Get download URL
    const url = await getDownloadURL(snapshot.ref);
    
    return {
      url: url,
      name: file.name,
      path: path
    };
  };

  return (
    <DatabaseContext.Provider 
      value={{ 
        // User and application state
        currentUser,
        companyInfo,
        loading,
        error,
        userRole,
        
        // Raw Firebase services
        auth,
        firestore: db,
        storage,
        
        // Company info
        companyId: companyInfo?.id,
        companyName: companyInfo?.name,
        
        // Helper functions
        uploadFile,
        
        // Firestore helpers
        collection: (path) => collection(db, path),
        doc: (path, id) => id ? doc(db, path, id) : doc(db, path),
        getDoc,
        getDocs,
        query,
        where,
        addDoc,
        updateDoc,
        deleteDoc,
        
        // Firebase field values
        serverTimestamp
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export default DatabaseProvider;
