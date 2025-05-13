// src/context/DatabaseContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getFirestore, collection, doc, getDoc, query, where, getDocs,
  serverTimestamp, addDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  
  // Initialize Firebase services
  const db = getFirestore();
  const auth = getAuth();
  const storage = getStorage();

  // Function to fetch user data and set role
  const fetchUserData = async (user) => {
    try {
      // First, check if user is an authorized user
      const usersRef = collection(db, "authorized_users");
      
      // Debug the email we're searching for
      console.log("Current user email:", user.email);
      
      // Make sure we're using lowercase for consistent matching
      const q = query(usersRef, where("email", "==", user.email.toLowerCase()));
      
      const querySnapshot = await getDocs(q);
      
      // Debug the query results
      console.log("Query results size:", querySnapshot.size);
      
      if (querySnapshot.empty) {
        console.error("User not found in authorized_users collection");
        setError("User not authorized for any company");
        setLoading(false);
        return;
      }
      
      // Get the first user document (there should only be one)
      const userData = querySnapshot.docs[0].data();
      
      // Debug the user data
      console.log("User data:", JSON.stringify(userData, null, 2));
      console.log("User role from database:", userData.role);
      
      // Set user role directly from database
      setUserRole(userData.role || "employee");
      
      console.log("Setting userRole state to:", userData.role || "employee");
      
      return userData;
    }
    catch (error) {
      console.error("Error fetching user data:", error);
      setError("Error fetching user information");
      setLoading(false);
      return null;
    }
  };

  // Get authentication and company info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(true);
        
        try {
          console.log("Current user:", user.email);
          
          // First try to get user from authorized_users collection using UID
          const userDocRef = doc(db, "authorized_users", user.uid);
          let userSnapshot = await getDoc(userDocRef);
          let userData;
          
          // If not found by UID, try finding by email
          if (!userSnapshot.exists()) {
            console.log("User not found by UID, trying email...");
            const usersRef = collection(db, "authorized_users");
            const emailQuery = query(usersRef, where("email", "==", user.email.toLowerCase()));
            const emailSnapshot = await getDocs(emailQuery);
            
            if (!emailSnapshot.empty) {
              userSnapshot = emailSnapshot.docs[0];
              userData = userSnapshot.data();
              console.log("User found by email:", userSnapshot.id);
            }
          } else {
            userData = userSnapshot.data();
          }
          
          if (userData) {
            console.log("User data:", userData);
            
            // Set the user role
            setUserRole(userData.role || "employee");
            console.log("Setting userRole state to:", userData.role || "employee");
            
            const companyId = userData.companyId;
            
            if (companyId) {
              // Get company information
              const companyDocRef = doc(db, "companies", companyId);
              const companySnapshot = await getDoc(companyDocRef);
              
              if (companySnapshot.exists()) {
                console.log("Company found:", companyId);
                setCompanyInfo({
                  id: companyId,
                  ...companySnapshot.data()
                });
              } else {
                console.error("Company not found:", companyId);
                setError("Company not found. Please contact your administrator.");
              }
            } else {
              console.error("No companyId found for user");
              setError("No company association found for your account.");
            }
          } else {
            console.error("User not found in authorized_users");
            setError("Your account is not authorized. Please contact your administrator.");
          }
        } catch (error) {
          console.error("Error fetching user or company data:", error);
          setError("Error loading your data. Please try again.");
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

    console.log("Starting upload process");
    
    // Create sanitized filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    
    // Create a more permissive path for testing
    const path = `public/${folder}/${filename}`;
    console.log("Upload path:", path);
    
    // Create storage reference
    const storageRef = ref(storage, path);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    console.log("Upload successful");
    
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