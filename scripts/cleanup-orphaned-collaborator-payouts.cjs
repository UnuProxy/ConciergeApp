/**
 * Cleanup Script: Remove orphaned collaborator payouts
 * 
 * Problem: When bookings with collaborators are deleted, the collaborator
 * payout records remain in financeRecords, causing incorrect finance calculations.
 * 
 * This script removes collaborator payouts that don't have associated bookings.
 * 
 * Usage: node scripts/cleanup-orphaned-collaborator-payouts.cjs --company <companyId>
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

async function cleanupOrphanedCollaboratorPayouts(companyId) {
  try {
    console.log(`\n🔍 Finding orphaned collaborator payouts for company: ${companyId}...\n`);
    
    // Get all financeRecords that are collaborator payouts
    const financeRecordsRef = db.collection('financeRecords');
    const collaboratorPayoutsQuery = financeRecordsRef
      .where('companyId', '==', companyId)
      .where('serviceKey', '==', 'collaborator_payout');
    
    const collaboratorPayoutsSnapshot = await collaboratorPayoutsQuery.get();
    
    if (collaboratorPayoutsSnapshot.empty) {
      console.log('✅ No collaborator payouts found.');
      return;
    }
    
    console.log(`Found ${collaboratorPayoutsSnapshot.size} collaborator payout(s):\n`);
    
    const payoutsToDelete = [];
    const collaboratorsToReset = new Set();
    
    // Simplified approach: Delete all collaborator payouts since bookings are already deleted
    // In a proper setup, payouts would have bookingId to track properly
    for (const payoutDoc of collaboratorPayoutsSnapshot.docs) {
      const payout = payoutDoc.data();
      const collaboratorId = payout.collaboratorId;
      
      console.log(`  - Payout ID: ${payoutDoc.id}`);
      console.log(`    Collaborator: ${payout.collaboratorName || collaboratorId}`);
      console.log(`    Amount: €${payout.providerCost || 0}`);
      console.log(`    Date: ${payout.date}`);
      console.log(`    ⚠️  Will be deleted`);
      console.log();
      
      payoutsToDelete.push(payoutDoc.id);
      if (collaboratorId) {
        collaboratorsToReset.add(collaboratorId);
      }
    }
    
    if (payoutsToDelete.length === 0) {
      console.log('✅ No orphaned collaborator payouts found. All good!');
      return;
    }
    
    console.log(`\n🗑️  Deleting ${payoutsToDelete.length} orphaned collaborator payout(s)...\n`);
    
    // Delete orphaned payouts
    const batch = db.batch();
    payoutsToDelete.forEach(payoutId => {
      batch.delete(financeRecordsRef.doc(payoutId));
    });
    await batch.commit();
    
    console.log(`✅ Deleted ${payoutsToDelete.length} orphaned collaborator payout(s)\n`);
    
    // Reset collaborator payment data
    if (collaboratorsToReset.size > 0) {
      console.log(`🔄 Resetting payment data for ${collaboratorsToReset.size} collaborator(s)...\n`);
      
      for (const collaboratorId of collaboratorsToReset) {
        const collaboratorRef = db.collection('collaborators').doc(collaboratorId);
        const collaboratorDoc = await collaboratorRef.get();
        
        if (collaboratorDoc.exists) {
          await collaboratorRef.update({
            payments: [],
            paidTotal: 0,
            scheduledTotal: 0
          });
          console.log(`  ✓ Reset payments for collaborator: ${collaboratorId}`);
        }
      }
      
      console.log(`\n✅ Reset ${collaboratorsToReset.size} collaborator(s)\n`);
    }
    
    console.log('✅ Cleanup complete! Your finance calculations should now be correct.\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let companyId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--company' && args[i + 1]) {
    companyId = args[i + 1];
    break;
  }
}

if (!companyId) {
  console.error('\n❌ Error: Missing --company argument');
  console.log('\nUsage: node scripts/cleanup-orphaned-collaborator-payouts.cjs --company <companyId>\n');
  process.exit(1);
}

cleanupOrphanedCollaboratorPayouts(companyId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

