# NYFB staging reconciliation and security gate

Checked: 2026-11-24  
Source: Supabase production project `nyfb-platform`  
Target: Neon branch `nyfb-migration-staging`

## Public data reconciliation

A live row-count comparison was run against all 20 production public tables. Every target count matched its source count at the time of the check.

| Table | Supabase | Neon staging |
|---|---:|---:|
| announcements | 0 | 0 |
| audit_logs | 316 | 316 |
| campus_mobilizers | 17 | 17 |
| coordinator_assignments | 0 | 0 |
| event_attendance | 0 | 0 |
| events | 0 | 0 |
| locations | 0 | 0 |
| member_bank_accounts | 9,271 | 9,271 |
| member_nin_records | 30,735 | 30,735 |
| member_referrals | 26,891 | 26,891 |
| members | 32,960 | 32,960 |
| profiles | 32,960 | 32,960 |
| pvc_verifications | 32,960 | 32,960 |
| reward_transactions | 45,816 | 45,816 |
| site_content | 4 | 4 |
| support_groups | 20 | 20 |
| task_submissions | 0 | 0 |
| user_notifications | 32,720 | 32,720 |
| volunteer_tasks | 0 | 0 |
| welfare_applications | 68 | 68 |

Identity checks also previously confirmed 32,960 matching auth UUIDs across the compatibility auth table and Better Auth users, 32,960 credential accounts with bcrypt hashes, and no missing profile/member mappings.

These are point-in-time count checks, not a continuous replication guarantee. Re-run the comparison after the final production write freeze or incremental catch-up before cutover.

## Critical security finding

- Supabase production currently has 58 RLS policies across all 20 public tables.
- Neon staging currently has **zero** public RLS policies.
- The application still has legacy Supabase-backed dashboard and API paths; only the Better Auth login/join path and session-context endpoint have been migrated.
- The current Neon application database connection is privileged. Do not assume enabling RLS alone protects data if the connection role owns tables or has BYPASSRLS.
- Bank account, NIN, PVC, member review, audit, coordinator scope, and admin actions must remain unavailable through the staging app until their server-side authorization has been ported and tested.

## Cutover blockers

1. Port and test authorization equivalent to the production 58 policies, including national-admin checks and state/LGA/ward coordinator scoping.
2. Use a least-privilege runtime database role and explicitly test RLS behavior; keep schema ownership/migration privileges separate.
3. Port every dashboard and API data path away from Supabase; no mixed production/staging writes.
4. Complete controlled login and signup tests, including bcrypt verification, duplicate-device rejection, referral behavior, and cleanup of transient signup fields.
5. Migrate and verify storage objects in the four existing Supabase buckets before changing file URLs.
6. Deploy only to the isolated staging Worker after secrets are configured, then test member, coordinator, and admin workflows.
7. Reconcile counts and key relationships again immediately before any cutover.

## Operational status

Production Supabase remains active and unchanged. No production DNS, deployment, or database cutover was performed as part of these checks.
