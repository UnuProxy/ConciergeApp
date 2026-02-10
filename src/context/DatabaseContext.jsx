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
  const [permissions, setPermissions] = useState(null);
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

  const normalizePermissions = (rawPermissions, roleValue) => {
    const isAdmin = isAdminRoleValue(roleValue);
    const base = {
      clients: true,
      services: true,
      reservations: true,
      finance: false
    };

    if (rawPermissions && typeof rawPermissions === 'object') {
      const normalized = {
        ...base,
        clients: typeof rawPermissions.clients === 'boolean' ? rawPermissions.clients : base.clients,
        services: typeof rawPermissions.services === 'boolean' ? rawPermissions.services : base.services,
        reservations: typeof rawPermissions.reservations === 'boolean' ? rawPermissions.reservations : base.reservations,
        finance: typeof rawPermissions.finance === 'boolean' ? rawPermissions.finance : base.finance
      };
      // Admins default to full access unless explicitly disabled (rare).
      return isAdmin ? { ...normalized, finance: normalized.finance === false ? false : true } : normalized;
    }

    return isAdmin ? { ...base, finance: true } : base;
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
          let fallbackAuthorizedData = null;

          // Fallback to authorized_users if no user doc or missing required fields
          if (!userData?.companyId || !userData?.role) {
            let fallbackSnap = null;
            const normalizedEmail = user.email.toLowerCase();
            // Prefer deterministic doc id: authorized_users/{email}
            const direct = await getDoc(doc(db, "authorized_users", normalizedEmail));
            if (direct.exists()) {
              fallbackSnap = { data: () => direct.data() };
            } else {
              const usersRef = collection(db, "authorized_users");
              const emailQuery = query(usersRef, where("email", "==", normalizedEmail));
              const emailSnapshot = await getDocs(emailQuery);
              if (!emailSnapshot.empty) fallbackSnap = emailSnapshot.docs[0];
            }

            if (fallbackSnap) {
              const fallbackData = fallbackSnap.data();
              fallbackAuthorizedData = fallbackData;
              userData = {
                ...userData,
                companyId: userData?.companyId || fallbackData.companyId,
                role: userData?.role || fallbackData.role,
                permissions: userData?.permissions || fallbackData.permissions,
                companyName: userData?.companyName || fallbackData.companyName
              };
  // console.log("User found via authorized_users:", emailSnapshot.docs[0].id); // Removed for production

              // If user doc missing, create/merge it so future reads succeed
              if (!userSnapshot.exists() && userData.companyId) {
                try {
                  await setDoc(doc(db, "users", user.uid), {
                    email: normalizedEmail,
                    companyId: userData.companyId,
                    role: userData.role || "agent",
                    ...(userData.permissions ? { permissions: userData.permissions } : {}),
                    ...(userData.companyName ? { companyName: userData.companyName } : {})
                  }, { merge: true });
  // console.log("Created users doc from authorized_users fallback"); // Removed for production
                } catch (writeErr) {
  // console.warn("Failed to create users doc from authorized_users:", writeErr); // Removed for production
                }
              }
            }
          } else if (!userData?.permissions || !userData?.companyName) {
            // If the user doc exists but is missing optional fields, try to hydrate from authorized_users.
            try {
              const normalizedEmail = user.email.toLowerCase();
              let fallbackData = null;
              const direct = await getDoc(doc(db, "authorized_users", normalizedEmail));
              if (direct.exists()) {
                fallbackData = direct.data();
              } else {
                const usersRef = collection(db, "authorized_users");
                const emailQuery = query(usersRef, where("email", "==", normalizedEmail));
                const emailSnapshot = await getDocs(emailQuery);
                if (!emailSnapshot.empty) fallbackData = emailSnapshot.docs[0].data();
              }

              if (fallbackData) {
                fallbackAuthorizedData = fallbackData;
                userData = {
                  ...userData,
                  permissions: userData?.permissions || fallbackData.permissions,
                  companyName: userData?.companyName || fallbackData.companyName
                };
              }
            } catch {
              // Ignore: app can still run without permissions/companyName hydration.
            }
          }

	          if (userData?.companyId && userData?.role) {
	  // console.log("User data:", userData); // Removed for production

	            const resolvedRole = userData.role || "employee";
	            setUserRole(resolvedRole);
              const resolvedPermissions = normalizePermissions(userData?.permissions, resolvedRole);
              setPermissions(resolvedPermissions);

              // Heal users/{uid} with permissions/companyName if allowed by rules.
              if (userSnapshot.exists()) {
                const needsPermissions = !userData?.permissions && !!(fallbackAuthorizedData?.permissions);
                const needsCompanyName = !userData?.companyName && !!(fallbackAuthorizedData?.companyName);
                if (needsPermissions || needsCompanyName) {
                  try {
                    await setDoc(userDocRef, {
                      ...(needsPermissions ? { permissions: fallbackAuthorizedData.permissions } : {}),
                      ...(needsCompanyName ? { companyName: fallbackAuthorizedData.companyName } : {})
                    }, { merge: true });
                  } catch {
                    // Ignore: permissions can still be derived from authorized_users in-memory.
                  }
                }
              }
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

		              let resolvedCompany =
		                resolvedById ||
		                resolvedByName ||
		                resolvedByFallback;

		              // Last-resort fallback: if companyId/name couldn't be resolved, try matching by contactEmail.
		              // Important: never override an explicit companyId (prevents cross-company mixing).
		              if (!resolvedCompany && isAdminRoleValue(resolvedRole) && user.email) {
		                const email = user.email.toLowerCase();
		                const emailQ = query(companiesRef, where("contactEmail", "==", email));
		                const emailSnap = await getDocs(emailQ);
		                if (!emailSnap.empty) {
		                  const match = emailSnap.docs[0];
		                  resolvedCompany = { id: match.id, data: match.data(), resolvedFrom: "contactEmail" };
		                }
		              }

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
		              } else {
		                console.error("Company not found:", rawCompanyId || rawCompanyName || rawCompanyFallback);
		                setError("Company not found. Please contact your administrator.");
		              }
		            } catch (companyError) {
	              if (companyError?.code === "permission-denied") {
	  // console.warn("Permission denied reading company doc, falling back to authorized_users data"); // Removed for production
	                const fallbackCompanyId = rawCompanyId || rawCompanyName || rawCompanyFallback;
	                if (fallbackCompanyId) {
                    setCompanyInfo({
                      id: fallbackCompanyId,
                      name: rawCompanyName || fallbackCompanyId
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
              setPermissions(normalizePermissions(null, debugForceRole));
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
        setPermissions(null);
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
        permissions,
        
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
