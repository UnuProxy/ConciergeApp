# Nuclear Option - Fresh Start

If you want to just start completely fresh:

## 1. Create New Storage Bucket
```bash
# Create a new bucket in Firebase Console
# Name it: conciergeapp-v2
```

## 2. Update your config
In `src/firebase/config.js`:
```js
storageBucket: "conciergeapp-v2.firebasestorage.app"
```

## 3. Delete all broken villas
Run in browser console:
```js
const { collection, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
const db = window.db;
const villas = await getDocs(collection(db, 'villas'));
for (const villa of villas.docs) {
  if ((villa.data().photos || []).some(p => (p.url || p).includes('company2'))) {
    await deleteDoc(doc(db, 'villas', villa.id));
    console.log('Deleted', villa.data().name);
  }
}
```

## 4. Re-upload everything fresh
- Upload villas with correct company paths
- Everything works from day 1
