/**
 * Sync users/{uid} docs from authorized_users mappings (Admin SDK).
 *
 * Why: Firestore security rules use users/{uid}.companyId + role. If these are wrong
 * (e.g. legacy values like "VIP Services" instead of "company2"), reads will fail with
 * "Missing or insufficient permissions" even when authorized_users is correct.
 *
 * Usage:
 *   node scripts/sync-users-company-role-from-authorized-users.cjs        # dry-run (default)
 *   node scripts/sync-users-company-role-from-authorized-users.cjs --apply
 */

const admin = require('firebase-admin');
const path = require('path');

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');

const serviceAccount = require(path.join(__dirname, '..', 'server', 'serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();
const auth = admin.auth();

const toLowerEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : null);

async function getCompanyName(companyId) {
  if (!companyId) return null;
  try {
    const snap = await db.collection('companies').doc(companyId).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return typeof data.name === 'string' ? data.name : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`🔎 Syncing users from authorized_users (${APPLY ? 'APPLY' : 'DRY-RUN'})`);

  const authorizedSnap = await db.collection('authorized_users').get();
  console.log(`- authorized_users docs: ${authorizedSnap.size}`);

  let updated = 0;
  let skipped = 0;
  let missingAuthUser = 0;
  let missingUsersDoc = 0;

  for (const docSnap of authorizedSnap.docs) {
    const data = docSnap.data() || {};
    const email = toLowerEmail(data.email);
    const companyId = typeof data.companyId === 'string' ? data.companyId.trim() : null;
    const role = typeof data.role === 'string' ? data.role.trim() : null;
    const permissions = data.permissions && typeof data.permissions === 'object' ? data.permissions : null;

    if (!email || !companyId || !role) {
      skipped++;
      continue;
    }

    let uid = null;
    try {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
    } catch {
      missingAuthUser++;
    }

    // If we can resolve uid, update users/{uid}. Also update any users docs found by email field.
    const userDocRefs = [];
    if (uid) {
      userDocRefs.push(db.collection('users').doc(uid));
    }

    const usersByEmailSnap = await db.collection('users').where('email', '==', email).get();
    usersByEmailSnap.forEach((u) => userDocRefs.push(u.ref));

    const uniqueRefs = Array.from(new Set(userDocRefs.map((r) => r.path))).map((p) => db.doc(p));

    if (!uniqueRefs.length) {
      missingUsersDoc++;
      continue;
    }

    const companyName =
      (typeof data.companyName === 'string' && data.companyName.trim()) ||
      (await getCompanyName(companyId)) ||
      null;

    for (const ref of uniqueRefs) {
      const beforeSnap = await ref.get();
      const before = beforeSnap.exists ? beforeSnap.data() || {} : {};

      const nextPayload = {
        email,
        companyId,
        role
      };
      if (companyName) nextPayload.companyName = companyName;
      if (permissions) nextPayload.permissions = permissions;

      const needsUpdate =
        !beforeSnap.exists ||
        toLowerEmail(before.email) !== email ||
        before.companyId !== companyId ||
        before.role !== role ||
        (permissions && JSON.stringify(before.permissions || null) !== JSON.stringify(permissions)) ||
        (companyName && before.companyName !== companyName);

      if (!needsUpdate) continue;

      updated++;
      console.log(`- ${APPLY ? '🛠️' : '🧪'} ${ref.path}:`, {
        email,
        companyId: { from: before.companyId || null, to: companyId },
        role: { from: before.role || null, to: role }
      });

      if (APPLY) {
        await ref.set(nextPayload, { merge: true });
      }
    }
  }

  console.log('\n✅ Done');
  console.log(`- updated: ${updated}`);
  console.log(`- skipped (missing email/companyId/role): ${skipped}`);
  console.log(`- missing Auth user (by email): ${missingAuthUser}`);
  console.log(`- missing users doc(s): ${missingUsersDoc}`);
  if (!APPLY) {
    console.log('\nRun with `--apply` to write changes.');
  }
}

main().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});

