/**
 * Fix Photo Paths Script
 *
 * Problem: Villa photos are stored in `villas/shared/` but Firestore references point to `company2/villas/`
 * Solution: Update Firestore references to point to the correct storage paths
 *
 * Run with: npm run fix:photos
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import * as readline from 'readline';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7tM5PZaGXm4YMQyHCMAzAqFCELJJy6CU",
  authDomain: "conciergeapp-513ca.firebaseapp.com",
  projectId: "conciergeapp-513ca",
  storageBucket: "conciergeapp-513ca.firebasestorage.app",
  messagingSenderId: "845445283531",
  appId: "1:845445283531:web:8619efa0ebf8971d21654e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Helper to prompt for input
const prompt = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const extractFilenameFromPath = (path = '') => {
  if (!path) return null;
  const parts = path.split('/');
  return parts[parts.length - 1];
};

const extractPathFromUrl = (url = '') => {
  if (!url) return null;
  if (!url.startsWith('http')) return url;
  const parts = url.split('/o/');
  if (parts.length < 2) return null;
  const pathAndQuery = parts[1];
  return decodeURIComponent(pathAndQuery.split('?')[0] || '');
};

const buildStorageMap = async () => {
  console.log('📂 Building map of all files in Storage...\n');

  const fileMap = new Map(); // filename -> full path

  // Check common storage paths
  const pathsToCheck = [
    'villas/shared',
    'company1/villas',
    'company2/villas',
    'villas',
    'public/villas'
  ];

  for (const basePath of pathsToCheck) {
    try {
      const listRef = ref(storage, basePath);
      const result = await listAll(listRef);

      console.log(`  ✓ Found ${result.items.length} files in ${basePath}/`);

      for (const itemRef of result.items) {
        const filename = itemRef.name;
        fileMap.set(filename, itemRef.fullPath);
      }
    } catch (error) {
      if (error.code !== 'storage/object-not-found') {
        console.log(`  ⚠️  Could not access ${basePath}: ${error.message}`);
      }
    }
  }

  console.log(`\n📊 Total unique files found: ${fileMap.size}\n`);
  return fileMap;
};

const fixVillaPhotosPaths = async () => {
  console.log('🔧 Starting photo path fix...\n');

  try {
    // Build a map of all files in storage
    const storageFileMap = await buildStorageMap();

    if (storageFileMap.size === 0) {
      console.log('❌ No files found in Storage. Nothing to fix.');
      return;
    }

    // Fetch all villas
    const villasSnapshot = await getDocs(collection(db, 'villas'));
    console.log(`📊 Found ${villasSnapshot.size} villas to check\n`);

    let villasUpdated = 0;
    let photosFixed = 0;
    let photosRemoved = 0;

    for (const villaDoc of villasSnapshot.docs) {
      const villaData = villaDoc.data();
      const villaName = villaData.name || villaDoc.id;
      const photos = villaData.photos || [];

      if (!Array.isArray(photos) || photos.length === 0) {
        continue;
      }

      console.log(`\n📝 Checking villa: ${villaName} (${photos.length} photos)`);

      const fixedPhotos = [];
      let villaHasChanges = false;

      for (const photo of photos) {
        const currentPath = typeof photo === 'string'
          ? extractPathFromUrl(photo)
          : extractPathFromUrl(photo?.url) || photo?.path;

        if (!currentPath) {
          console.log(`  ⚠️  Skipping photo with no valid path`);
          continue;
        }

        const filename = extractFilenameFromPath(currentPath);

        if (!filename) {
          console.log(`  ⚠️  Could not extract filename from: ${currentPath}`);
          continue;
        }

        // Check if file exists at current path
        try {
          await getDownloadURL(ref(storage, currentPath));
          console.log(`  ✅ ${currentPath}`);
          fixedPhotos.push(photo);
        } catch (error) {
          // File not found at current path, try to find it
          if (storageFileMap.has(filename)) {
            const correctPath = storageFileMap.get(filename);
            console.log(`  🔧 Fixing: ${currentPath} -> ${correctPath}`);

            try {
              const newUrl = await getDownloadURL(ref(storage, correctPath));

              if (typeof photo === 'string') {
                fixedPhotos.push(newUrl);
              } else {
                fixedPhotos.push({
                  ...photo,
                  url: newUrl,
                  path: correctPath
                });
              }

              photosFixed++;
              villaHasChanges = true;
            } catch (urlError) {
              console.log(`  ❌ Failed to get URL for ${correctPath}: ${urlError.message}`);
              photosRemoved++;
              villaHasChanges = true;
            }
          } else {
            console.log(`  ❌ File not found anywhere: ${filename}`);
            photosRemoved++;
            villaHasChanges = true;
          }
        }
      }

      // Update the villa if any photos were fixed
      if (villaHasChanges) {
        try {
          await updateDoc(doc(db, 'villas', villaDoc.id), {
            photos: fixedPhotos
          });
          villasUpdated++;
          console.log(`  💾 Updated villa in Firestore`);
        } catch (updateError) {
          console.error(`  ❌ Failed to update villa:`, updateError.message);
        }
      } else {
        console.log(`  ✨ All photos are valid`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Villas checked: ${villasSnapshot.size}`);
    console.log(`🔧 Photos fixed: ${photosFixed}`);
    console.log(`🗑️  Photos removed: ${photosRemoved}`);
    console.log(`💾 Villas updated: ${villasUpdated}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
};

// Main function
const main = async () => {
  try {
    console.log('🔐 Firebase Authentication Required\n');
    const email = await prompt('Email: ');
    const password = await prompt('Password: ');

    console.log('\n🔑 Signing in...');
    await signInWithEmailAndPassword(auth, email.trim(), password);
    console.log('✅ Authenticated successfully!\n');

    await fixVillaPhotosPaths();

    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/invalid-credential') {
      console.error('\n❌ Invalid email or password');
    } else {
      console.error('\n❌ Script failed:', error.message || error);
    }
    process.exit(1);
  }
};

// Run the script
main();
