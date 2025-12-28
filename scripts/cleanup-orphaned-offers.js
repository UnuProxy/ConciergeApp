/**
 * Cleanup Script for Orphaned Offers
 * 
 * This script finds and deletes offers that belong to clients that no longer exist.
 * Run this once to clean up your database from old offers.
 * 
 * Usage:
 *   node scripts/cleanup-orphaned-offers.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../server/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupOrphanedOffers() {
  try {
    console.log('🔍 Starting cleanup of orphaned offers...\n');

    // Get all offers
    const offersSnapshot = await db.collection('offers').get();
    console.log(`📊 Found ${offersSnapshot.size} total offers\n`);

    // Get all clients
    const clientsSnapshot = await db.collection('clients').get();
    const clientIds = new Set();
    clientsSnapshot.forEach(doc => clientIds.add(doc.id));
    console.log(`👥 Found ${clientIds.size} active clients\n`);

    // Find orphaned offers
    const orphanedOffers = [];
    const offersByCompany = {};

    offersSnapshot.forEach(doc => {
      const offer = doc.data();
      const companyId = offer.companyId || 'unknown';
      
      if (!offersByCompany[companyId]) {
        offersByCompany[companyId] = { total: 0, orphaned: 0 };
      }
      offersByCompany[companyId].total++;

      if (!offer.clientId || !clientIds.has(offer.clientId)) {
        orphanedOffers.push({
          id: doc.id,
          clientId: offer.clientId,
          clientName: offer.clientName,
          companyId: companyId,
          totalValue: offer.totalValue,
          createdAt: offer.createdAt
        });
        offersByCompany[companyId].orphaned++;
      }
    });

    console.log('📈 Offers by Company:');
    Object.entries(offersByCompany).forEach(([companyId, stats]) => {
      console.log(`   ${companyId}: ${stats.total} total, ${stats.orphaned} orphaned`);
    });
    console.log('');

    if (orphanedOffers.length === 0) {
      console.log('✅ No orphaned offers found! Database is clean.\n');
      process.exit(0);
    }

    console.log(`⚠️  Found ${orphanedOffers.length} orphaned offers:\n`);
    orphanedOffers.forEach((offer, index) => {
      const date = offer.createdAt?.toDate?.() || 'Unknown date';
      console.log(`   ${index + 1}. ${offer.clientName || 'Unknown'} (${offer.clientId || 'no ID'})`);
      console.log(`      Company: ${offer.companyId}`);
      console.log(`      Value: €${offer.totalValue || 0}`);
      console.log(`      Created: ${date}`);
      console.log('');
    });

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(`\n❓ Delete these ${orphanedOffers.length} orphaned offers? (yes/no): `, async (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        console.log('\n🗑️  Deleting orphaned offers...\n');

        const batch = db.batch();
        orphanedOffers.forEach(offer => {
          const offerRef = db.collection('offers').doc(offer.id);
          batch.delete(offerRef);
        });

        await batch.commit();
        console.log(`✅ Successfully deleted ${orphanedOffers.length} orphaned offers!\n`);
      } else {
        console.log('\n❌ Cleanup cancelled. No offers were deleted.\n');
      }

      readline.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedOffers();







