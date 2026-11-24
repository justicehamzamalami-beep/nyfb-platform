# Staging data validation — 24 November 2026

## Scope
Validation performed against the live Supabase production project and the isolated Neon branch `nyfb-migration-staging`. No production writes or cutover were performed.

## Verified application data
The following production tables have matching row counts and matching deterministic row fingerprints in Neon staging:

| Table | Supabase rows | Neon rows | Fingerprint |
|---|---:|---:|---|
| profiles | 32,960 | 32,960 | Match |
| members | 32,960 | 32,960 | Match |
| member_referrals | 26,891 | 26,891 | Match |
| reward_transactions | 45,816 | 45,816 | Match |
| member_bank_accounts | 9,271 | 9,271 | Match |
| member_nin_records | 30,735 | 30,735 | Match |
| user_notifications | 32,720 | 32,720 | Match |
| pvc_verifications | 32,960 | 32,960 | Match |

Fingerprints were calculated from each row's JSON representation using MD5-derived numeric checksums and summed across each table. Matching row counts and fingerprints provide strong evidence that these eight high-volume tables have been copied intact. This is not a substitute for a final cutover-time reconciliation.

## Authentication data
Previously verified in this staging branch:
- 32,960 compatibility `auth.users` UUID records.
- 32,960 Better Auth `user` records.
- 32,960 credential `account` records retaining bcrypt-formatted password hashes.

Password login has not yet been functionally tested through the application. Do not treat authentication migration as production-ready until the bcrypt verifier and session flow pass tests.

## Differences requiring review
The current Neon staging branch contains rows in `audit_logs` (316), `campus_mobilizers` (17), `site_content` (4), `support_groups` (20), and `welfare_applications` (68), while the corresponding Supabase source tables returned zero rows in the latest count snapshot. These rows have not been deleted or changed. Determine their origin and intended status before final reconciliation.

## Security and application readiness
- Supabase currently has RLS enabled on all 20 public tables.
- Neon staging currently has RLS disabled on the public tables and has no copied application triggers.
- The existing 58 Supabase RLS policies, trigger behavior, and database functions still need a deliberate port to the Better Auth/server-side authorization model.
- Do not expose Neon staging to public traffic or cut production over until access controls, application authorization, file storage, and end-to-end tests are complete.

## Operational rule
Keep Supabase production unchanged and serving users until the new application passes the migration acceptance checks. Repeat counts and fingerprints immediately before any eventual cutover to capture registrations and transactions created after this validation snapshot.
