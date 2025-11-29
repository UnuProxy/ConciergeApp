/**
 * Fix Photo Paths Script (Using Firebase Admin SDK)
 *
 * Problem: Villa photos are stored in `villas/shared/` but Firestore references point to `company2/villas/`
 * Solution: Update Firestore references to point to the correct storage paths
 *
 * This version uses Firebase Admin SDK which doesn't require user authentication
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin with default credentials
// This will use the Firebase CLI credentials automatically
const app = initializeApp({
  projectId: 'conciergeapp-513ca',
  storageBucket: 'conciergeapp-513ca.firebasestorage.app'
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

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
      const [files] = await bucket.getFiles({ prefix: basePath });

      console.log(`  ✓ Found ${files.length} files in ${basePath}/`);

      for (const file of files) {
        const filename = file.name.split('/').pop();
        if (filename) {
          fileMap.set(filename, file.name);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Could not access ${basePath}: ${error.message}`);
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
    const villasSnapshot = await db.collection('villas').get();
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
          const [exists] = await bucket.file(currentPath).exists();

          if (exists) {
            console.log(`  ✅ ${currentPath}`);
            fixedPhotos.push(photo);
          } else {
            throw new Error('File not found at current path');
          }
        } catch (error) {
          // File not found at current path, try to find it
          if (storageFileMap.has(filename)) {
            const correctPath = storageFileMap.get(filename);
            console.log(`  🔧 Fixing: ${currentPath} -> ${correctPath}`);

            try {
              const file = bucket.file(correctPath);
              const [exists] = await file.exists();

              if (exists) {
                // Get public URL
                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(correctPath)}?alt=media`;

                if (typeof photo === 'string') {
                  fixedPhotos.push(publicUrl);
                } else {
                  fixedPhotos.push({
                    ...photo,
                    url: publicUrl,
                    path: correctPath
                  });
                }

                photosFixed++;
                villaHasChanges = true;
              } else {
                console.log(`  ❌ File verification failed for ${correctPath}`);
                photosRemoved++;
                villaHasChanges = true;
              }
            } catch (urlError) {
              console.log(`  ❌ Failed to process ${correctPath}: ${urlError.message}`);
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
          await db.collection('villas').doc(villaDoc.id).update({
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
    console.log('🚀 Starting photo path fix using Firebase Admin SDK\n');

    await fixVillaPhotosPaths();

    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error.message || error);
    console.error('\nMake sure you are logged in with: firebase login');
    process.exit(1);
  }
};

// Run the script
main();
