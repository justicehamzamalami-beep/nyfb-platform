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
- Supabase Auth users: 32,960

Production Supabase remains the active source of truth. No member records, NINs, bank details, password hashes, sessions, or files have been copied to Neon.

## Not yet complete

1. Authentication: Managed Neon Auth cannot import existing Supabase password hashes. However, current Better Auth supports custom password verification; a self-managed Better Auth setup can be tested with a bcrypt-compatible verifier (for example bcryptjs) against imported Supabase bcrypt hashes. Preserve UUIDs by using the existing UUID string as the Better Auth user ID and maintaining the auth.users compatibility row / mapping. Existing Supabase sessions are not portable, so users may need to sign in again at cutover, but a password reset should not be required if bcrypt verification and credential import pass staging tests. Do not disable existing login until then.
2. Data: bulk transfer, row-count reconciliation, FK validation, sequence alignment, and incremental/delta sync are pending.
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
