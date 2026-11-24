# Better Auth and registration integration — staging

Date: 24 November 2026

## Implemented on migration/neon-staging

- Added Better Auth server configuration using the Neon Hyperdrive binding.
- Added the Better Auth `/api/auth/*` route.
- Added a Better Auth browser client.
- Switched the staging login form to Better Auth and server-side role routing.
- Switched the staging join form to Better Auth.
- Added a shared server-side authorization context that verifies Better Auth sessions, loads the user's role and coordinator assignments, and provides reusable national-admin, approved-member, own-record and state/LGA/ward-scope checks. The session-context route now uses this shared helper.
- Configured bcrypt password verification for existing migrated password hashes; new passwords continue to be stored as bcrypt.
- Added optional registration fields to Better Auth with private response handling for NIN, referral code and the one-device registration token.
- Added a Neon trigger that creates the UUID compatibility record, profile, pending member record, optional NIN record, PVC verification row and referral entry when a new Better Auth user is inserted.
- Added a second trigger that clears one-time sensitive signup values (NIN, browser key and referral code) from the Better Auth user row after they have been copied into the appropriate protected NYFB records.
- Enforced one account per browser/device using a SHA-256 digest of the registration token in a private table.
- Added a staging CI workflow trigger. Staging pushes build the app but are explicitly prevented from deploying to the production Worker.


- Added a national-admin-only pending-members API with bounded pagination and a minimal application view (no NIN or bank details).
- Added a national-admin-only membership review API. Approval/rejection and the applicant notification are committed in one database transaction; repeated review attempts are rejected. Rejection requires a recorded reason. This is an API foundation and has not yet been exercised end-to-end in a deployed staging Worker.

## Identity and relationship reconciliation

Latest Neon staging check:
- 32,960 compatibility auth UUIDs.
- 32,960 Better Auth users.
- All 32,960 Better Auth user IDs match compatibility auth UUIDs.
- All 32,960 credential accounts are linked to a Better Auth user and contain bcrypt-formatted hashes.
- No Better Auth users are missing a profile or member row.
- No member rows are missing their corresponding Better Auth user.

## Data count reconciliation (24 November 2026)

A fresh read-only comparison of all 20 public business tables on Supabase production and Neon staging found zero row-count differences. This confirms table-level count parity at the time of the check; it does not yet prove every field, relationship, file object or concurrent write is identical.

## Not yet verified

- The OpenNext staging build now passes on GitHub Actions (run 45356627069). The workflow intentionally skipped deployment.
- No end-to-end login has been tested using an actual member password; build success does not validate password verification at runtime.
- No end-to-end signup has been completed in the staging application.
- The new database registration trigger has been installed, but its complete browser-to-database path still requires a controlled test.
- Neon currently has zero public-schema RLS policies. The 58 Supabase policies remain an explicit security blocker: the shared authorization helper is a foundation, not a complete policy replacement. Each API route and database operation must enforce its matching rule before that feature is enabled.
- Dashboard queries and all data workflows have not yet been ported.
- The staging Worker has not been deployed and no production cutover has occurred.
- Cloudflare Worker secrets, including a generated Better Auth secret and staging base URL, must be configured before runtime testing.
- Existing Supabase-backed dashboard and admin screens remain to be migrated.

## Safety boundary

Do not deploy this branch to the public NYFB domain or change the production Worker. Keep Supabase production active until staging build, auth, signup, authorization, privacy, admin/member workflows, storage and final data reconciliation all pass.
