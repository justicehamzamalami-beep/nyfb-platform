# NYFB Neon migration staging

Created 2026-11-24 for the staged migration from Supabase/Vercel to Cloudflare Workers + Neon PostgreSQL.

## Current staging resources

- Neon project: `lucky-grass-31563239`
- Neon staging branch: `br-icy-shape-be31r9ck`
- Neon read-write endpoint: `ep-holy-truth-beh4jg1v` (0.25 CU min/max; account default suspend behavior)
- Cloudflare Hyperdrive binding: `HYPERDRIVE`
- Hyperdrive config ID: `4f39eda77da444768ea9e026ac44f732`
- Hyperdrive points to the direct Neon staging hostname, not the pooled hostname.
- Staging Worker configuration is in `wrangler.jsonc` on branch `migration/neon-staging`.

## Schema baseline

`0001-public-schema.sql` records the extracted production public schema:
- 20 public tables
- 204 columns
- 96 constraints
- 63 indexes
- 2 public enum types
- 1 public sequence

The baseline was applied to the isolated Neon staging branch and verified by listing all 20 public tables. It includes a minimal `auth.users(id uuid)` compatibility table only so the existing public foreign-key relationships can be represented. This is not an authentication migration.

## Production inventory (counts only; no personal data copied)

- profiles: 32,960
- members: 32,960
- member_referrals: 26,891
- reward_transactions: 45,816
- member_bank_accounts: 9,271
- member_nin_records: 30,735
- user_notifications: 32,720
- pvc_verifications: 32,960
- audit_logs: 316
- campus_mobilizers: 17
- site_content: 4
- support_groups: 20
- welfare_applications: 68
- Supabase Auth users: 32,960

## Staging data transfer status (2026-11-24)

The 13 production tables containing records have been copied to the isolated Neon staging branch. All counts match the production source for the checked tables. The seven remaining public tables are empty in production and their schema exists in staging. The complete 32,960 Better Auth user rows and 32,960 credential account rows were imported while preserving the original UUIDs and bcrypt password hashes. A sorted digest comparison confirms the imported password hashes match the Supabase source exactly. Foreign-key orphan checks for profiles, members, bank accounts, NIN records, PVC records, referrals, rewards, and notifications all returned zero. The `member_number_seq` sequence was aligned to production's last value (202122).

This is a staging copy only. Production Supabase remains the active source of truth. No production traffic has been redirected. A snapshot of the data is not yet an ongoing replication stream; changes made in Supabase after the export must be captured in a final delta sync before any cutover.

## Not yet complete

1. Authentication: imported bcrypt credentials are verified to match byte-for-byte, but Better Auth login must still be tested in the actual Cloudflare Worker runtime. Use Better Auth custom password `verify` with bcryptjs and `hash` with bcryptjs for newly created/changed passwords. Existing Supabase sessions are not portable, so users will need to sign in again at cutover; a password reset should not be required if the runtime test passes.
2. Data: initial bulk transfer and row-count/FK checks are complete for all non-empty public tables. A final delta sync and a cutover reconciliation are still required.
3. Security: production has 58 RLS policies across 20 tables. Equivalent authorization must be implemented and tested before any app cutover. This baseline does not copy RLS policies or privileged triggers/functions.
4. Storage: production has public member photos and site media, plus private national ID and offline-status buckets. Cloudflare R2 is not activated on the connected Cloudflare account yet; the API returns an instruction to enable R2 in the dashboard. Create buckets and migrate files only after activation. Keep private ID files private.
5. App code: this branch is staging-only. Existing production app and Supabase configuration have not been changed. Build and test a Neon data layer and auth flow before deployment.

## Safety gates before production

- Verify all table counts and key relationships against source.
- Verify password login with a test account and preserve existing UUIDs.
- Test member, coordinator, and national-admin permissions.
- Test bank/NIN/PVC privacy and file access controls.
- Test registration, approval, referrals, rewards, notifications, profile updates, exports, and uploads.
- Confirm backup/restore and rollback plan.
- Only then plan a controlled cutover.
