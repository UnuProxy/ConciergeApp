// DEAD SIMPLE FIX - Just removes broken photo URLs from villas
// Run this in your browser console while logged into your app

(async function() {
  const { collection, getDocs, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');

  const db = window.db || getFirestore();

  console.log('🔧 Starting simple fix...');

  const villasSnapshot = await getDocs(collection(db, 'villas'));
  console.log(`Found ${villasSnapshot.size} villas`);

  let fixed = 0;

  for (const villaDoc of villasSnapshot.docs) {
    const data = villaDoc.data();
    const photos = data.photos || [];

    // Filter out company2/villas photos (the broken ones)
    const validPhotos = photos.filter(photo => {
      const url = typeof photo === 'string' ? photo : photo?.url;
      return url && !url.includes('company2/villas');
    });

    if (validPhotos.length !== photos.length) {
      await updateDoc(doc(db, 'villas', villaDoc.id), { photos: validPhotos });
      console.log(`✅ Fixed ${data.name}: ${photos.length} → ${validPhotos.length} photos`);
      fixed++;
    }
  }

  console.log(`✅ DONE! Fixed ${fixed} villas. Refresh your page.`);
})();
