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

  const normalizeCompanyKey = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed.toLowerCase() : null;
  };

  const isAdminRoleValue = (role) => {
    const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
    return ["admin", "administrator", "owner", "manager", "superadmin"].includes(normalized);
  };

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
                role: userData?.role || fallbackData.role
              };
  // console.log("User found via authorized_users:", emailSnapshot.docs[0].id); // Removed for production

              // If user doc missing, create/merge it so future reads succeed
              if (!userSnapshot.exists() && userData.companyId) {
                try {
                  await setDoc(doc(db, "users", user.uid), {
                    email: user.email.toLowerCase(),
                    companyId: userData.companyId,
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
	            
		            const rawCompanyId = typeof userData.companyId === 'string' ? userData.companyId.trim() : null;
		            const rawCompanyName = typeof userData.companyName === 'string' ? userData.companyName.trim() : null;
		            const rawCompanyFallback = typeof userData.company === 'string' ? userData.company.trim() : null;

		            try {
		              const companiesRef = collection(db, "companies");

	              const resolveCompany = async (identifier) => {
	                const key = normalizeCompanyKey(identifier);
	                if (!key) return null;

	                // 1) Assume identifier is the company document id.
	                const directRef = doc(db, "companies", identifier);
	                const directSnap = await getDoc(directRef);
	                if (directSnap.exists()) {
	                  return { id: identifier, data: directSnap.data(), resolvedFrom: "id" };
	                }

	                // 2) Legacy/UX case: identifier is the company name.
	                const nameQ = query(companiesRef, where("name", "==", identifier));
	                const nameSnap = await getDocs(nameQ);
	                if (!nameSnap.empty) {
	                  const match = nameSnap.docs[0];
	                  return { id: match.id, data: match.data(), resolvedFrom: "name" };
	                }

	                // 3) Case-insensitive match (small company list: safe to scan).
	                const allSnap = await getDocs(companiesRef);
	                const match = allSnap.docs.find((d) => {
	                  const data = d.data();
	                  return normalizeCompanyKey(d.id) === key || normalizeCompanyKey(data?.name) === key;
	                });
	                if (match) {
	                  return { id: match.id, data: match.data(), resolvedFrom: "scan" };
	                }

	                return null;
	              };

		              const resolvedById = rawCompanyId ? await resolveCompany(rawCompanyId) : null;
		              const resolvedByName = rawCompanyName ? await resolveCompany(rawCompanyName) : null;
		              const resolvedByFallback = !resolvedById && !resolvedByName && rawCompanyFallback
		                ? await resolveCompany(rawCompanyFallback)
		                : null;

		              // Admin convenience: match by company contact email (helps correct bad stored companyId).
		              let resolvedByEmail = null;
		              if (isAdminRoleValue(resolvedRole) && user.email) {
		                const email = user.email.toLowerCase();
		                const emailQ = query(companiesRef, where("contactEmail", "==", email));
		                const emailSnap = await getDocs(emailQ);
		                if (!emailSnap.empty) {
		                  const match = emailSnap.docs[0];
		                  resolvedByEmail = { id: match.id, data: match.data(), resolvedFrom: "contactEmail" };
		                }
		              }

		              let resolvedCompany =
		                resolvedByEmail ||
		                resolvedByName ||
		                resolvedById ||
		                resolvedByFallback;

		              if (import.meta.env.DEV && resolvedById && resolvedByName && resolvedById.id !== resolvedByName.id) {
		                console.warn("User company mismatch:", {
		                  userCompanyId: rawCompanyId,
		                  userCompanyName: rawCompanyName,
		                  resolvedId: resolvedById.id,
		                  resolvedName: resolvedByName.id
		                });
		              }

		              if (resolvedCompany) {
		                if (import.meta.env.DEV && resolvedCompany.resolvedFrom !== "id") {
		                  // Helps diagnose mismatched company ids (e.g., user records storing company name instead of doc id).
		                  console.warn(
		                    "Resolved company via fallback:",
		                    { input: rawCompanyId || rawCompanyName || rawCompanyFallback, resolvedId: resolvedCompany.id, via: resolvedCompany.resolvedFrom }
		                  );
		                }

	                setCompanyInfo({
	                  id: resolvedCompany.id,
	                  ...resolvedCompany.data
	                });

	                // If we resolved via name/email, the stored companyId might be a name.
	                // Try to heal missing user docs (safe) but avoid writes that rules disallow.
	                if (!userSnapshot.exists() && resolvedCompany.id) {
	                  try {
	                    await setDoc(doc(db, "users", user.uid), {
	                      email: user.email?.toLowerCase(),
	                      companyId: resolvedCompany.id,
	                      role: userData.role || "agent"
	                    }, { merge: true });
	                  } catch {
	                    // Ignore: rules may block some environments; we can still render UI.
	                  }
	                }
		              } else if (rawCompanyId && isAdminRoleValue(resolvedRole)) {
		                // Last-resort: if an admin is assigned to a companyId that doesn't exist,
		                // create a minimal company doc so the app can proceed.
		                try {
		                  await setDoc(doc(db, "companies", rawCompanyId), {
		                    name: rawCompanyId,
		                    contactEmail: user.email?.toLowerCase() || null,
		                    createdAt: serverTimestamp()
		                  }, { merge: true });

		                  setCompanyInfo({
		                    id: rawCompanyId,
		                    name: rawCompanyId,
		                    contactEmail: user.email?.toLowerCase() || null
		                  });
		                } catch (createErr) {
		                  console.error("Company not found and could not be created:", rawCompanyId, createErr);
		                  setError("Company not found. Please contact your administrator.");
		                }
		              } else {
		                console.error("Company not found:", rawCompanyId || rawCompanyName || rawCompanyFallback);
		                setError("Company not found. Please contact your administrator.");
		              }
		            } catch (companyError) {
	              if (companyError?.code === "permission-denied") {
	  // console.warn("Permission denied reading company doc, falling back to authorized_users data"); // Removed for production
	                if (companyId) {
                  setCompanyInfo({
                    id: companyId,
                    name: companyId
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
