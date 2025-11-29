/**
 * Cleanup Script: Remove broken photo references from villas collection
 *
 * This script will:
 * 1. Fetch all villas from Firestore
 * 2. Check each photo path in Firebase Storage
 * 3. Remove photo references that return 404 (file not found)
 * 4. Update the villa documents with only valid photos
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import 'dotenv/config';

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length) {
  throw new Error(
    `Missing Firebase config in environment: ${missingEnvVars.join(', ')}. ` +
    'Add them to your .env file before running this script.'
  );
}

// Firebase configuration pulled from environment to avoid committing secrets
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const extractPathFromUrl = (url = '') => {
  if (!url) return null;
  if (!url.startsWith('http')) return url;
  const parts = url.split('/o/');
  if (parts.length < 2) return null;
  const pathAndQuery = parts[1];
  return decodeURIComponent(pathAndQuery.split('?')[0] || '');
};

const checkPhotoExists = async (photoPath) => {
  try {
    await getDownloadURL(ref(storage, photoPath));
    return true;
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return false;
    }
    console.error(`Error checking photo ${photoPath}:`, error.message);
    return false;
  }
};

const cleanupVillaPhotos = async () => {
  console.log('🔍 Starting cleanup of broken villa photo references...\n');

  try {
    // Fetch all villas
    const villasSnapshot = await getDocs(collection(db, 'villas'));
    console.log(`📊 Found ${villasSnapshot.size} villas to check\n`);

    let totalPhotosChecked = 0;
    let totalPhotosRemoved = 0;
    let villasUpdated = 0;

    for (const villaDoc of villasSnapshot.docs) {
      const villaData = villaDoc.data();
      const villaName = villaData.name || villaDoc.id;
      const photos = villaData.photos || [];

      if (!Array.isArray(photos) || photos.length === 0) {
        continue;
      }

      console.log(`\n📝 Checking villa: ${villaName} (${photos.length} photos)`);

      const validPhotos = [];
      const brokenPhotos = [];

      for (const photo of photos) {
        totalPhotosChecked++;
        const photoPath = typeof photo === 'string'
          ? extractPathFromUrl(photo)
          : extractPathFromUrl(photo?.url) || photo?.path;

        if (!photoPath) {
          console.log(`  ⚠️  Skipping photo with no valid path`);
          brokenPhotos.push(photo);
          continue;
        }

        const exists = await checkPhotoExists(photoPath);

        if (exists) {
          console.log(`  ✅ ${photoPath}`);
          validPhotos.push(photo);
        } else {
          console.log(`  ❌ ${photoPath} (NOT FOUND)`);
          brokenPhotos.push(photo);
          totalPhotosRemoved++;
        }
      }

      // Update the villa if any photos were broken
      if (brokenPhotos.length > 0) {
        try {
          await updateDoc(doc(db, 'villas', villaDoc.id), {
            photos: validPhotos
          });
          villasUpdated++;
          console.log(`  🔧 Updated villa: removed ${brokenPhotos.length} broken photo(s)`);
        } catch (updateError) {
          console.error(`  ❌ Failed to update villa:`, updateError.message);
        }
      } else {
        console.log(`  ✨ All photos are valid`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Villas checked: ${villasSnapshot.size}`);
    console.log(`📸 Photos checked: ${totalPhotosChecked}`);
    console.log(`🗑️  Photos removed: ${totalPhotosRemoved}`);
    console.log(`🔧 Villas updated: ${villasUpdated}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

// Run the cleanup
cleanupVillaPhotos()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
