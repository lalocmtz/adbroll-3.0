# TokXray launch status — 2026-10-10

## Implemented in source, not released

Manual affiliate transfers replace Connect onboarding in the affiliate page and creator FAQ. The founder admin page can record completed external transfers in USD, with a unique bank reference. The database enforces founder authorization, $50 minimum, available balance, dispute holds and pending withdrawal reconciliation. Repeating the same reference and amount is idempotent. Recording does not send money. Funds paid in MXN must be reconciled to the USD liability by the owner.

Migration `20261010010000_manual_affiliate_settlements.sql` and its preceding September financial migrations are applied to the owned destination Supabase, not the old production backend. Automatic reservation is disabled and the payout worker requires explicit `AFFILIATE_PAYOUT_MODE=connect` plus the existing enable flag. Do not deploy only frontend and assume financial integration is complete. No real transfers were made.

Tools analysis now rejects provider errors, empty insights/variants and failed history saves instead of falsely displaying completion. It still uses `transcribe-assemblyai`, `analyze-script-insights` and `generate-script-variants`. The latter two use Lovable AI gateway. Direct Gemini shared caching remains pending; prior Gemini CLI pilot was not end-to-end validation.

## New Kalodata source

Period: 2026-09-10 through 2026-10-09. 500 creators, 300 products, 2,000 video records. All video records include product IDs; 659 match the exported product catalog. New creator file has no email column. No outreach sent.

Normalized data and atomic dry-run/apply SQL: `outputs/2026-10-10/importacion/` (gitignored). October snapshot is now committed on the owned destination after a successful transactional dry run: 827 videos linked by product ID, 75 rows retaining prior media URLs, 27 product name collisions disambiguated without merging distinct IDs. The old production backend remains unchanged. A video URL/metadata row does not prove an MP4 is stored or playable.

## Hosting and release blockers

Production remains Lovable at tokxray.com. Vercel project `tokxray` has preview deployments only. GitHub PR #3 remains open. Owned destination `tnqvvfpzkjwgllwdwvte` is ACTIVE_HEALTHY in adbroll Pro, us-east-1. User explicitly approved USD 10/month. Fresh official Lovable backup restored: 47 public tables, 13 users, 14 identities, 10 password hashes, 5 subscription rows and 5,159 pre-import video rows. All 16,604 selected application/auth rows loaded in idempotent private batches; unaffected table counts match the backup. Auth sessions and one-time credentials intentionally are not reused. New October catalog increases total videos to 6,894. Storage objects, provider credentials, OAuth/SMTP configuration, deployed Edge Functions and complete end-to-end verification remain pending before DNS switch. Do not cancel Lovable before migration is verified.

Stripe is still needed to collect customer subscriptions and attribute real paid invoices. Manual payouts remove the Connect requirement, not subscription checkout/webhook requirements. First commission choice remains unresolved ($7.50 vs $15 on first $15 payment); intended monthly price $29 USD and renewal commission 15% are not yet installed in the billing path, which still reflects the prior $30/30% configuration. No claims of production readiness.

## Opportunity algorithm

Current SQL view is a category/market percentile heuristic: 30% revenue, 25% creator count, 20% momentum, 15% per-sale commission, 10% ROAS. No predictive backtest or demonstrated sales lift. Missing data, small category samples and snapshots without comparable source periods remain unresolved. Latest UI hides unverified growth claims and labels indicator experimental. More data alone does not validate the model.


## Restore validation and remaining handoff

Backups and private manifests live outside the public GitHub repository at `~/.local/share/tokxray-migration/2026-10-10/`. Archive SHA and local SQL are retained there. PostgreSQL 17 client from the official Postgres.app distribution successfully read the pg_dump 18 zstd custom archive. Managed Supabase schemas/roles were not overwritten.

Restored legacy service policies exposed writes to unintended roles. Migration `20261010020000_restore_service_policy_boundaries.sql` limits all policies named Service role to that role, retains founder catalog editing, and prevents a creator application from self-approving paid access. Migration `20261010021000_preserve_video_paywall_grants.sql` explicitly removes destination default table-level SELECT so premium fields still require the entitlement RPC. Non-founder SQL regression checks passed: isolation of profiles/subscriptions/affiliate code records, no catalog writes, no self-approved creator entitlement and no direct premium field reads. Anonymous HTTP checks show public cards available and private user/financial records hidden.

Storage manifest: 3,392 application objects, 22,276,507,059 bytes (~20.75 GiB), excluding old database-export backups. `scripts/migrate-storage.py` dry run passed; source HEAD checks for a video and landing asset matched backup sizes. The script does not create buckets, migrate ownership metadata, or rewrite database URLs; those are explicit subsequent steps. No application objects uploaded yet. Existing asset URLs in code now follow the configured Supabase host.

Chrome is waiting for the owner to sign into Supabase through GitHub. The connected Supabase tool permits database migration but not Storage uploads, secrets or Auth service configuration. Local Supabase CLI is authenticated to a different portfolio (not adbroll); do not use it to deploy to unrelated projects. Vercel production, DNS and Lovable subscription have not been changed. Gemini gateway replacement and real provider end-to-end checks remain open.
