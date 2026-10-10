# TokXray launch status — 2026-10-10

## Implemented in source, not released

Manual affiliate transfers replace Connect onboarding in the affiliate page and creator FAQ. The founder admin page can record completed external transfers in USD, with a unique bank reference. The database enforces founder authorization, $50 minimum, available balance, dispute holds and pending withdrawal reconciliation. Repeating the same reference and amount is idempotent. Recording does not send money. Funds paid in MXN must be reconciled to the USD liability by the owner.

Migration `20261010010000_manual_affiliate_settlements.sql` and its preceding September financial migrations are applied to the owned destination Supabase, not the old production backend. Automatic reservation is disabled and the payout worker requires explicit `AFFILIATE_PAYOUT_MODE=connect` plus the existing enable flag. Do not deploy only frontend and assume financial integration is complete. No real transfers were made.

The active catalogue analysis, script insights and variants now use Gemini directly in the owned Supabase. A real temporary-user smoke test passed password login, unpaid rejection (403), paid text analysis (200), MP4 video analysis (200), and a second request returning the shared cache. The temporary account was removed. Server quotas (5 new video analyses and 20 text calls per day), video leases, validated JSON, owned-media-only fetches and paid-only cached-analysis RPC protect the provider and premium data. Tools now accepts available catalogue links through `analyze-catalog-link`; new external TikTok downloads and personal uploads remain pending. Other legacy AI functions outside these active paths have not been migrated.

## New Kalodata source

Period: 2026-09-10 through 2026-10-09. 500 creators, 300 products, 2,000 video records. All video records include product IDs; 659 match the exported product catalog. New creator file has no email column. No outreach sent.

Normalized data and atomic dry-run/apply SQL: `outputs/2026-10-10/importacion/` (gitignored). October snapshot is now committed on the owned destination after a successful transactional dry run: 827 videos linked by product ID, 75 rows retaining prior media URLs, 27 product name collisions disambiguated without merging distinct IDs. The old production backend remains unchanged. A video URL/metadata row does not prove an MP4 is stored or playable.

## Hosting and release blockers

Production remains Lovable at tokxray.com. Vercel project `tokxray` has preview deployments only. GitHub PR #3 remains open. Owned destination `tnqvvfpzkjwgllwdwvte` is ACTIVE_HEALTHY in adbroll Pro, us-east-1. User explicitly approved USD 10/month. Fresh official Lovable backup restored: 47 public tables, 13 users, 14 identities, 10 password hashes, 5 subscription rows and 5,159 pre-import video rows. All 16,604 selected application/auth rows loaded in idempotent private batches; unaffected table counts match the backup. Auth sessions and one-time credentials intentionally are not reused. New October catalog increases total videos to 6,894. Application Storage objects are copied and their database URLs migrated. Active Gemini functions and core billing endpoints are deployed; Stripe secrets, OAuth/SMTP configuration and complete billing/registration verification remain pending before DNS switch. Do not cancel Lovable before migration is verified.

Stripe is still needed to collect customer subscriptions and attribute real paid invoices. Manual payouts remove the Connect requirement, not subscription checkout/webhook requirements. First commission choice remains unresolved ($7.50 vs $15 on first $15 payment); intended monthly price $29 USD and renewal commission 15% are not yet installed in the billing path, which still reflects the prior $30/30% configuration. No claims of production readiness.

## Opportunity algorithm

Current SQL view is a category/market percentile heuristic: 30% revenue, 25% creator count, 20% momentum, 15% per-sale commission, 10% ROAS. No predictive backtest or demonstrated sales lift. Missing data, small category samples and snapshots without comparable source periods remain unresolved. Latest UI hides unverified growth claims and labels indicator experimental. More data alone does not validate the model.


## Restore validation and remaining handoff

Backups and private manifests live outside the public GitHub repository at `~/.local/share/tokxray-migration/2026-10-10/`. Archive SHA and local SQL are retained there. PostgreSQL 17 client from the official Postgres.app distribution successfully read the pg_dump 18 zstd custom archive. Managed Supabase schemas/roles were not overwritten.

Restored legacy service policies exposed writes to unintended roles. Migration `20261010020000_restore_service_policy_boundaries.sql` limits all policies named Service role to that role, retains founder catalog editing, and prevents a creator application from self-approving paid access. Migration `20261010021000_preserve_video_paywall_grants.sql` explicitly removes destination default table-level SELECT so premium fields still require the entitlement RPC. Non-founder SQL regression checks passed: isolation of profiles/subscriptions/affiliate code records, no catalog writes, no self-approved creator entitlement and no direct premium field reads. Anonymous HTTP checks show public cards available and private user/financial records hidden.

Storage manifest: 3,392 application objects, 22,276,507,059 bytes (~20.75 GiB), excluding old database-export backups. `scripts/migrate-storage.py` dry run passed; source HEAD checks for a video and landing asset matched backup sizes. The script does not create buckets, migrate ownership metadata, or rewrite database URLs; those are explicit subsequent steps. Full destination reconciliation passed: 3,392 matching object sizes, zero missing objects, zero mismatches; all 8 original ownership records restored. Verified public Storage URLs in application text/JSON columns were rewritten atomically using the private manifest. All 3,214 videos with stored MP4s now point at the owned project; zero video MP4 URLs point at the old project. Three landing videos were checked in the Vercel browser with the new host, readyState 4 and no media error. Temporary copy worker was replaced with a 410 response and the local credential-bearing process stopped. Existing asset URLs in code now follow the configured Supabase host.

Supabase browser authentication works. Site URL and exact production/preview/local callback URLs are configured; global Storage limit is 256 MB. Gemini and the existing Apify API token are stored in the owned project. No new Apify run or subscription was purchased during migration. Stripe browser login now works for Adbroll (acct_1SbcpyL7UvJMc43Y); the separate MCP connector still requires reauthentication. Existing live secret key cannot be revealed again. A restricted billing key form is prepared but not submitted; browser-required approval to create persistent access is pending. SMTP/Resend and Google OAuth remain unconfigured. The connected Supabase tool permits database migration but not Storage uploads, secrets or Auth service configuration. Local Supabase CLI is authenticated to a different portfolio (not adbroll); do not use it to deploy to unrelated projects. Vercel production, DNS and Lovable subscription have not been changed. Vercel preview branch now uses the owned Supabase and loads the October catalogue. Core Gemini provider checks passed; billing, transactional email, new-user confirmation and Google sign-in still need end-to-end checks. The creator landing still advertises the prior financial terms and must be reconciled before launch.

## Registration regression fixed

Private affiliate-code tables remain private. `validate_referral_code(text)` exposes only a boolean to anonymous and signed-in callers, so registration, pricing and email capture can validate a creator code without listing owner IDs. Verified under the anonymous database role: known code accepted, invalid code rejected.

## Verification at migration handoff

Vercel preview commit `72a2e91` reached READY. Stable branch preview: https://tokxray-git-codex-mx-affiliate-launch-eduardocorona.vercel.app/ (Vercel account protection remains enabled). TypeScript check, 29 tests across 6 files and production build passed. Public referral registration visibly validates ALICIA without exposing private code-owner records. Core billing endpoints are deployed but cannot collect verified payments until Stripe credentials/webhook and intended commercial terms are installed and tested. The public domain has not been cut over.

## Domain preparation (October 10)

Added and verified `tokxray.com` and `www.tokxray.com` on the Vercel `tokxray` project; www redirects to the apex with 308. DNS still uses GoDaddy ns63/ns64.domaincontrol.com and 185.158.133.1 (old service). No DNS cutover performed. Vercel currently recommends apex A values 216.150.1.1 / 216.150.16.1 and www CNAME db10307e3dc200e0.vercel-dns-017.com. Recheck immediately before release. Keep mail MX/TXT records unchanged. Production deployment/env, billing and Auth verification must precede DNS cutover.

Prepared restricted Stripe key: Customers, Checkout Sessions and Customer Portal write; Charges and Refunds, Products, Coupons, Invoices, Prices and Subscriptions read. All other permissions none. Secret is intended only for owned Supabase server functions, never frontend/Vercel public variables. No key was created, rotated or revoked.
