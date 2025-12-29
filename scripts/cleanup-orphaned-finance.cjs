/**
 * Cleanup Orphaned Finance Records
 * 
 * This script removes orphaned records from:
 * - financeRecords (service payment tracking)
 * - categoryPayments (legacy payments)
 * - expenses (company expenses)
 * 
 * Run with: node scripts/cleanup-orphaned-finance.cjs --company YOUR_COMPANY_ID
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../server/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Delete ALL finance data for a specific company
async function deleteAllFinanceForCompany(companyId) {
  console.log(`\n🗑️  Deleting ALL finance data for company: ${companyId}\n`);

  let count = 0;

  // Delete financeRecords
  const financeSnapshot = await db.collection('financeRecords')
    .where('companyId', '==', companyId)
    .get();
  
  for (const doc of financeSnapshot.docs) {
    const d = doc.data();
    console.log(`  Deleting financeRecord: ${doc.id} | service: ${d.serviceType} | amount: €${d.clientAmount || d.amount || 0}`);
    await doc.ref.delete();
    count++;
  }
  console.log(`  → Deleted ${financeSnapshot.size} financeRecords\n`);

  // Delete categoryPayments
  const paymentsSnapshot = await db.collection('categoryPayments')
    .where('companyId', '==', companyId)
    .get();
  
  for (const doc of paymentsSnapshot.docs) {
    const d = doc.data();
    console.log(`  Deleting categoryPayment: ${doc.id} | category: ${d.category} | amount: €${d.amount || 0}`);
    await doc.ref.delete();
    count++;
  }
  console.log(`  → Deleted ${paymentsSnapshot.size} categoryPayments\n`);

  // Delete expenses
  const expensesSnapshot = await db.collection('expenses')
    .where('companyId', '==', companyId)
    .get();
  
  for (const doc of expensesSnapshot.docs) {
    const d = doc.data();
    console.log(`  Deleting expense: ${doc.id} | category: ${d.category} | amount: €${d.amount || 0}`);
    await doc.ref.delete();
    count++;
  }
  console.log(`  → Deleted ${expensesSnapshot.size} expenses\n`);

  // Reset collaborator payment data
  const collaboratorsSnapshot = await db.collection('collaborators')
    .where('companyId', '==', companyId)
    .get();
  
  let resetCount = 0;
  for (const doc of collaboratorsSnapshot.docs) {
    const d = doc.data();
    const hasPaymentData = (d.payments && d.payments.length > 0) || d.paidTotal > 0 || d.scheduledTotal > 0;
    
    if (hasPaymentData) {
      console.log(`  Resetting collaborator: ${doc.id} | name: ${d.name} | paidTotal: €${d.paidTotal || 0}`);
      await doc.ref.update({
        payments: [],
        paidTotal: 0,
        scheduledTotal: 0,
        totalCommission: 0,
        bookingCount: 0
      });
      resetCount++;
    }
  }
  console.log(`  → Reset ${resetCount} collaborators' payment data\n`);

  console.log(`✅ Total deleted: ${count} records, ${resetCount} collaborators reset`);
}

// Reset ONLY collaborator payment data
async function resetCollaboratorPayments(companyId) {
  console.log(`\n🔄 Resetting collaborator payment data for company: ${companyId}\n`);

  const collaboratorsSnapshot = await db.collection('collaborators')
    .where('companyId', '==', companyId)
    .get();
  
  let resetCount = 0;
  for (const doc of collaboratorsSnapshot.docs) {
    const d = doc.data();
    console.log(`  Resetting: ${d.name} | paidTotal: €${d.paidTotal || 0} | payments: ${(d.payments || []).length}`);
    await doc.ref.update({
      payments: [],
      paidTotal: 0,
      scheduledTotal: 0,
      totalCommission: 0,
      bookingCount: 0
    });
    resetCount++;
  }
  
  console.log(`\n✅ Reset ${resetCount} collaborators`);
}

// List all finance data (no deletion)
async function listAllFinanceData() {
  console.log('\n📊 Listing all finance data...\n');

  // financeRecords
  const financeSnapshot = await db.collection('financeRecords').get();
  console.log(`financeRecords (${financeSnapshot.size} total):`);
  if (financeSnapshot.size > 0) {
    financeSnapshot.docs.forEach(doc => {
      const d = doc.data();
      console.log(`  - ${doc.id} | company: ${d.companyId} | client: ${d.clientId} | service: ${d.serviceType} | amount: €${d.clientAmount || d.amount || 0}`);
    });
  } else {
    console.log('  (empty)');
  }

  // categoryPayments
  const paymentsSnapshot = await db.collection('categoryPayments').get();
  console.log(`\ncategoryPayments (${paymentsSnapshot.size} total):`);
  if (paymentsSnapshot.size > 0) {
    paymentsSnapshot.docs.forEach(doc => {
      const d = doc.data();
      console.log(`  - ${doc.id} | company: ${d.companyId} | category: ${d.category} | amount: €${d.amount || 0}`);
    });
  } else {
    console.log('  (empty)');
  }

  // expenses
  const expensesSnapshot = await db.collection('expenses').get();
  console.log(`\nexpenses (${expensesSnapshot.size} total):`);
  if (expensesSnapshot.size > 0) {
    expensesSnapshot.docs.forEach(doc => {
      const d = doc.data();
      console.log(`  - ${doc.id} | company: ${d.companyId} | category: ${d.category} | amount: €${d.amount || 0}`);
    });
  } else {
    console.log('  (empty)');
  }

  // Group by company
  const companyTotals = {};
  financeSnapshot.docs.forEach(doc => {
    const d = doc.data();
    if (!companyTotals[d.companyId]) companyTotals[d.companyId] = { finance: 0, payments: 0, expenses: 0 };
    companyTotals[d.companyId].finance++;
  });
  paymentsSnapshot.docs.forEach(doc => {
    const d = doc.data();
    if (!companyTotals[d.companyId]) companyTotals[d.companyId] = { finance: 0, payments: 0, expenses: 0 };
    companyTotals[d.companyId].payments++;
  });
  expensesSnapshot.docs.forEach(doc => {
    const d = doc.data();
    if (!companyTotals[d.companyId]) companyTotals[d.companyId] = { finance: 0, payments: 0, expenses: 0 };
    companyTotals[d.companyId].expenses++;
  });

  console.log('\n📈 Records by Company:');
  Object.entries(companyTotals).forEach(([companyId, totals]) => {
    console.log(`  ${companyId}: ${totals.finance} finance, ${totals.payments} payments, ${totals.expenses} expenses`);
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === '--company' && args[1]) {
    // Delete all finance data for specific company
    await deleteAllFinanceForCompany(args[1]);
  } else if (args[0] === '--collaborators' && args[1]) {
    // Reset only collaborator payments
    await resetCollaboratorPayments(args[1]);
  } else if (args[0] === '--list') {
    // Just list, don't delete
    await listAllFinanceData();
  } else {
    console.log('Usage:');
    console.log('  node scripts/cleanup-orphaned-finance.cjs --list');
    console.log('    → Shows all finance records\n');
    console.log('  node scripts/cleanup-orphaned-finance.cjs --company <companyId>');
    console.log('    → Deletes ALL finance records for a specific company\n');
    console.log('  node scripts/cleanup-orphaned-finance.cjs --collaborators <companyId>');
    console.log('    → Resets only collaborator payment data (payments, paidTotal, etc)\n');
    
    // Show current counts by default
    await listAllFinanceData();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

