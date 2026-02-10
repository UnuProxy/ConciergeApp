/**
 * Normalize and deduplicate authorized_users (Admin SDK).
 *
 * Creates/updates a canonical doc per user at:
 *   authorized_users/{lowercaseEmail}
 *
 * Fixes legacy companyId values that are actually company names (e.g. "Vip Concierge"),
 * and deletes duplicate legacy docs for the same email (optional, via --apply).
 *
 * Usage:
 *   node scripts/normalize-authorized-users.cjs          # dry-run (default)
 *   node scripts/normalize-authorized-users.cjs --apply
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

const lower = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const normalizeEmail = (v) => {
  const e = lower(v);
  return e && e.includes('@') ? e : null;
};

function defaultPermissionsForRole(role) {
  const r = lower(role);
  const isAdmin = ['admin', 'administrator', 'owner', 'manager', 'superadmin'].includes(r);
  return {
    clients: true,
    services: true,
    reservations: true,
    finance: isAdmin
  };
}

function scoreDoc(doc) {
  const s = doc.__resolvedCompanyIdValid ? 100 : 0;
  return (
    s +
    (doc.permissions && typeof doc.permissions === 'object' ? 10 : 0) +
    (doc.companyName ? 5 : 0) +
    (doc.role ? 2 : 0) +
    (doc.companyId ? 1 : 0)
  );
}

async function main() {
  console.log(`🔧 Normalizing authorized_users (${APPLY ? 'APPLY' : 'DRY-RUN'})`);

  const companiesSnap = await db.collection('companies').get();
  const companiesById = new Map();
  const companyIdByName = new Map();
  const companyIdByContactEmail = new Map();
  companiesSnap.forEach((d) => {
    const data = d.data() || {};
    companiesById.set(d.id, { id: d.id, ...data });
    if (typeof data.name === 'string' && data.name.trim()) {
      companyIdByName.set(lower(data.name), d.id);
    }
    if (typeof data.contactEmail === 'string' && data.contactEmail.trim()) {
      companyIdByContactEmail.set(lower(data.contactEmail), d.id);
    }
  });
  const validCompanyIds = new Set(companiesById.keys());
  const allowedCompanyIds = new Set(['company1', 'company2']);

  const authSnap = await db.collection('authorized_users').get();
  console.log(`- companies: ${companiesSnap.size}`);
  console.log(`- authorized_users docs: ${authSnap.size}`);

  const raw = authSnap.docs.map((d) => ({ ref: d.ref, id: d.id, ...d.data() }));
  const grouped = new Map(); // email -> docs[]

  for (const doc of raw) {
    const email = normalizeEmail(doc.email);
    if (!email) continue;
    if (!grouped.has(email)) grouped.set(email, []);
    grouped.get(email).push(doc);
  }

  const synonymToCompanyId = (text) => {
    const t = lower(text);
    if (!t) return null;
    if (t.includes('vip')) return 'company2';
    if (t.includes('lux')) return 'company1';
    return null;
  };

  let canonicalUpserts = 0;
  let deletions = 0;
  let unresolved = 0;

  for (const [email, docs] of grouped.entries()) {
    const normalizedDocs = docs.map((d) => {
      const companyIdRaw = typeof d.companyId === 'string' ? d.companyId.trim() : '';
      const companyNameRaw = typeof d.companyName === 'string' ? d.companyName.trim() : '';
      let resolvedCompanyId = companyIdRaw;

      const isAllowedCompanyId = (id) => !!id && allowedCompanyIds.has(id);
      const isCompanyIdAcceptable = (id) => !!id && validCompanyIds.has(id) && isAllowedCompanyId(id);
      const safeByName = (nameKey) => {
        const id = companyIdByName.get(lower(nameKey));
        return isCompanyIdAcceptable(id) ? id : null;
      };

      // Treat any company outside {company1, company2} as invalid (even if it exists in Firestore).
      if (resolvedCompanyId && !isCompanyIdAcceptable(resolvedCompanyId)) {
        const byName = safeByName(resolvedCompanyId);
        resolvedCompanyId = byName || synonymToCompanyId(resolvedCompanyId) || resolvedCompanyId;
      }

      if (resolvedCompanyId && !isCompanyIdAcceptable(resolvedCompanyId) && companyNameRaw) {
        const byName = safeByName(companyNameRaw);
        resolvedCompanyId = byName || synonymToCompanyId(companyNameRaw) || resolvedCompanyId;
      }

      // Last-resort: match company by contactEmail only when companyId/companyName are unusable.
      if (!isCompanyIdAcceptable(resolvedCompanyId)) {
        const byContactEmail = companyIdByContactEmail.get(email);
        if (isCompanyIdAcceptable(byContactEmail)) {
          resolvedCompanyId = byContactEmail;
        }
      }

      const resolvedCompanyIdValid = resolvedCompanyId && isCompanyIdAcceptable(resolvedCompanyId);
      const resolvedCompanyName =
        (resolvedCompanyIdValid && companiesById.get(resolvedCompanyId)?.name) ||
        companyNameRaw ||
        null;

      const role = typeof d.role === 'string' ? d.role.trim() : null;
      const permissions =
        d.permissions && typeof d.permissions === 'object'
          ? d.permissions
          : (role ? defaultPermissionsForRole(role) : null);

      return {
        ...d,
        email,
        companyId: resolvedCompanyId || null,
        companyName: resolvedCompanyName,
        role,
        permissions,
        __resolvedCompanyIdValid: !!resolvedCompanyIdValid
      };
    });

    // Pick the "best" doc for this email and use it as canonical.
    normalizedDocs.sort((a, b) => scoreDoc(b) - scoreDoc(a));
    const best = normalizedDocs[0];

    if (!best.companyId || !best.__resolvedCompanyIdValid || !best.role) {
      unresolved++;
      console.log(`- ⚠️  Unresolved mapping for ${email}:`, {
        companyId: best.companyId,
        companyName: best.companyName,
        role: best.role
      });
      continue;
    }

    const canonicalRef = db.collection('authorized_users').doc(email);
    const canonicalPayload = {
      email,
      companyId: best.companyId,
      companyName: best.companyName || null,
      role: best.role,
      permissions: best.permissions || defaultPermissionsForRole(best.role),
      active: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (best.createdAt) canonicalPayload.createdAt = best.createdAt;

    canonicalUpserts++;
    console.log(`- ${APPLY ? '🛠️' : '🧪'} canonical ${email}:`, {
      companyId: best.companyId,
      role: best.role
    });

    if (APPLY) {
      await canonicalRef.set(canonicalPayload, { merge: true });
    }

    // Delete duplicates (everything except canonical doc id) in apply mode.
    const duplicates = normalizedDocs.filter((d) => d.id !== email);
    if (duplicates.length) {
      console.log(`  - duplicates: ${duplicates.map((d) => d.id).join(', ')}`);
      if (APPLY) {
        await Promise.all(
          duplicates.map(async (d) => {
            await d.ref.delete();
            deletions++;
          })
        );
      }
    }
  }

  console.log('\n✅ Done');
  console.log(`- canonical upserts: ${canonicalUpserts}`);
  console.log(`- deletions: ${deletions}`);
  console.log(`- unresolved emails: ${unresolved}`);
  if (!APPLY) console.log('\nRun with `--apply` to write changes.');
}

main().catch((err) => {
  console.error('❌ Normalize failed:', err);
  process.exit(1);
});
