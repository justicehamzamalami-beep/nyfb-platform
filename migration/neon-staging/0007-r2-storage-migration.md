# R2 storage migration plan

Date: 24 November 2026
Environment: isolated staging only

## Current source inventory

Read-only inventory from the live Supabase Storage catalog:

| Source bucket | Visibility | Objects | Bytes |
|---|---:|---:|---:|
| nyfb-member-photos | Public | 9,075 | 8,363,593,461 |
| nyfb-national-ids | Private | 0 | 0 |
| nyfb-offline-status | Private | 1 | 4,014,599 |
| nyfb-site-media | Public | 2 | 667,012 |
| **Total** | | **9,078** | **8,368,275,072** |

The member-photo bucket contains JPEG, PNG and WebP images. The largest observed object is about 5.2 MB. The national-ID bucket currently has no objects. The offline-status object is JSON and remains private.

This is catalog metadata only. No object bytes have been copied or deleted.

## Staging bindings prepared

`wrangler.jsonc` now declares four isolated staging bindings:

- `MEMBER_PHOTOS` → `nyfb-member-photos-staging`
- `NATIONAL_IDS` → `nyfb-national-ids-staging`
- `OFFLINE_STATUS` → `nyfb-offline-status-staging`
- `SITE_MEDIA` → `nyfb-site-media-staging`

These buckets have not yet been created. Cloudflare's R2 API currently returns error 10042 and explicitly requires R2 to be enabled in the Cloudflare Dashboard. The API integration cannot activate the account feature.

## Migration rules

1. Keep all Supabase buckets and objects intact during migration and validation.
2. Create the four staging buckets only after R2 activation. Copy a small, non-sensitive sample first; do not copy NIN/identity documents into staging.
3. Use a server-side transfer process with narrowly scoped read access to Supabase Storage and write access only to the staging R2 buckets. Never expose service-role or R2 secret credentials in browser code or Git.
4. Preserve object keys, content types, cache metadata where appropriate, and record source path, destination key, byte size, checksum and transfer result in a manifest. Verify destination checksums and object counts.
5. Keep member photos and site media separate. Keep identity documents and offline status private; do not enable public bucket access for private buckets.
6. Update the application to read/write through authenticated Worker routes and R2 bindings. Public site media can use a controlled custom domain after access rules are reviewed; private objects must be served only after authorization.
7. Run a final delta sync while the source remains live, then compare every object and test real member/admin workflows before any production switch.
8. Only after sign-off should the production Worker use production R2 buckets. Do not remove Supabase storage until rollback and retention requirements are satisfied.

## Current blockers

- R2 is not enabled on the Cloudflare account (API error 10042).
- The four staging buckets cannot be created until the account owner enables R2 in the Dashboard.
- No R2 object has been created, and no Supabase object has been downloaded or deleted.
- A secure source-to-R2 transfer credential and transfer runner still need to be provisioned.
- Storage-serving UI/API routes are not yet switched from Supabase.

## Cost and capacity note

The source catalog contains approximately 8.37 GB of objects before any additional headroom or future growth. Check current R2 pricing and account-specific free-tier eligibility before copying the full photo library. Do not assume that transfer, storage, class A/B operations, or public delivery are all free.
