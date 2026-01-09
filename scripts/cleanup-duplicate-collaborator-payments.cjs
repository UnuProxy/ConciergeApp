/**
 * Cleanup Script: Remove duplicate collaborator payouts from categoryPayments
 * 
 * Problem: The old code was creating collaborator payouts in BOTH:
 * - financeRecords (with serviceKey: 'collaborator_payout')
 * - categoryPayments (with category: 'Collaborator payout')
 * 
 * This caused double-counting. Now we only use financeRecords.
 * This script removes the duplicates from categoryPayments.
 * 
 * Usage: node scripts/cleanup-duplicate-collaborator-payments.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../server/serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const isCollaboratorPayout = (category) => {
  if (!category) return false;
  const categoryText = typeof category === 'object' 
    ? (category.en || category.ro || '')
    : String(category);
  return categoryText.toLowerCase().includes('collaborator') || 
         categoryText.toLowerCase().includes('colaborator');
};

async function cleanupDuplicateCollaboratorPayments() {
  try {
    console.log('\n🔍 Finding duplicate collaborator payouts in categoryPayments...\n');
    
    const categoryPaymentsRef = db.collection('categoryPayments');
    const snapshot = await categoryPaymentsRef.get();
    
    if (snapshot.empty) {
      console.log('✅ No categoryPayments found.');
      return;
    }
    
    const collaboratorPayouts = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (isCollaboratorPayout(data.category)) {
        collaboratorPayouts.push({
          id: doc.id,
          ...data,
          amount: data.amount || 0,
          date: data.date?.toDate?.() || data.date
        });
      }
    });
    
    if (collaboratorPayouts.length === 0) {
      console.log('✅ No collaborator payouts found in categoryPayments. Nothing to clean up!');
      return;
    }
    
    console.log(`Found ${collaboratorPayouts.length} collaborator payout(s) in categoryPayments:\n`);
    
    collaboratorPayouts.forEach(payment => {
      console.log(`  - ${payment.id}`);
      console.log(`    Amount: €${payment.amount}`);
      console.log(`    Date: ${payment.date}`);
      console.log(`    Description: ${payment.description || 'N/A'}`);
      console.log();
    });
    
    console.log('These are duplicates (already tracked in financeRecords) and will be deleted.\n');
    
    // Delete them
    const batch = db.batch();
    collaboratorPayouts.forEach(payment => {
      batch.delete(categoryPaymentsRef.doc(payment.id));
    });
    
    await batch.commit();
    
    console.log(`✅ Successfully deleted ${collaboratorPayouts.length} duplicate collaborator payout(s)!\n`);
    console.log('Your Finance calculations should now be correct.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDuplicateCollaboratorPayments()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

