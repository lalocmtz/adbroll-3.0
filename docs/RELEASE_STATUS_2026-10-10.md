# TokXray launch status — 2026-10-10

## Public on Vercel with owned Supabase; paid activation verification remains

Manual affiliate transfers replace Connect onboarding in the affiliate page and creator FAQ. The founder admin page can record completed external transfers in USD, with a unique bank reference. The database enforces founder authorization, $50 minimum, available balance, dispute holds and pending withdrawal reconciliation. Repeating the same reference and amount is idempotent. Recording does not send money. Funds paid in MXN must be reconciled to the USD liability by the owner.

Migration `20261010010000_manual_affiliate_settlements.sql` and its preceding September financial migrations are applied to the owned destination Supabase, not the old production backend. Automatic reservation is disabled and the payout worker requires explicit `AFFILIATE_PAYOUT_MODE=connect` plus the existing enable flag. Do not deploy only frontend and assume financial integration is complete. No real transfers were made.

The active catalogue analysis, script insights and variants now use Gemini directly in the owned Supabase. A real temporary-user smoke test passed password login, unpaid rejection (403), paid text analysis (200), MP4 video analysis (200), and a second request returning the shared cache. The temporary account was removed. Server quotas (5 new video analyses and 20 text calls per day), video leases, validated JSON, owned-media-only fetches and paid-only cached-analysis RPC protect the provider and premium data. Tools now accepts available catalogue links through `analyze-catalog-link`; new external TikTok downloads and personal uploads remain pending. Other legacy AI functions outside these active paths have not been migrated.

## New Kalodata source

Period: 2026-09-10 through 2026-10-09. 500 creators, 300 products, 2,000 video records. All video records include product IDs; 659 match the exported product catalog. New creator file has no email column. No outreach sent.

Normalized data and atomic dry-run/apply SQL: `outputs/2026-10-10/importacion/` (gitignored). October snapshot is now committed on the owned destination after a successful transactional dry run: 827 videos linked by product ID, 75 rows retaining prior media URLs, 27 product name collisions disambiguated without merging distinct IDs. The old production backend remains unchanged. A video URL/metadata row does not prove an MP4 is stored or playable.

## Hosting and release blockers

Public DNS now points tokxray.com and www.tokxray.com at Vercel. A READY production deployment uses the owned Supabase environment. HTTPS returns 200 from Vercel and www redirects to the apex with 308. GitHub PR #3 remains open. Owned destination `tnqvvfpzkjwgllwdwvte` is ACTIVE_HEALTHY in adbroll Pro, us-east-1. User explicitly approved USD 10/month. Fresh official Lovable backup restored: 47 public tables, 13 users, 14 identities, 10 password hashes, 5 subscription rows and 5,159 pre-import video rows. All 16,604 selected application/auth rows loaded in idempotent private batches; unaffected table counts match the backup. Auth sessions and one-time credentials intentionally are not reused. New October catalog increases total videos to 6,894. Application Storage objects are copied and their database URLs migrated. Active Gemini functions and core billing endpoints are deployed; Google OAuth is configured and a real browser login succeeded; SMTP is configured and both confirmation and recovery deliveries are verified; full paid activation/cancellation verification remains pending. Do not cancel Lovable before migration is verified.

Stripe collects customer subscriptions; affiliate payouts are manual. The owner confirmed USD 15 of the first eligible payment for a new referred customer, then 15% of renewals (USD 4.35 on USD 29), weekly manual settlements with a USD 50 minimum. New referred customers pay USD 15 once, then USD 29/month. Source, creator landing and the owned database implement policy `2026-10-10`; historical subscriptions preserve their prior commission rule.

## Opportunity algorithm

Current SQL view is a category/market percentile heuristic: 30% revenue, 25% creator count, 20% momentum, 15% per-sale commission, 10% ROAS. No predictive backtest or demonstrated sales lift. Missing data, small category samples and snapshots without comparable source periods remain unresolved. Latest UI hides unverified growth claims and labels indicator experimental. More data alone does not validate the model.


## Restore validation and remaining handoff

Backups and private manifests live outside the public GitHub repository at `~/.local/share/tokxray-migration/2026-10-10/`. Archive SHA and local SQL are retained there. PostgreSQL 17 client from the official Postgres.app distribution successfully read the pg_dump 18 zstd custom archive. Managed Supabase schemas/roles were not overwritten.

Restored legacy service policies exposed writes to unintended roles. Migration `20261010020000_restore_service_policy_boundaries.sql` limits all policies named Service role to that role, retains founder catalog editing, and prevents a creator application from self-approving paid access. Migration `20261010021000_preserve_video_paywall_grants.sql` explicitly removes destination default table-level SELECT so premium fields still require the entitlement RPC. Non-founder SQL regression checks passed: isolation of profiles/subscriptions/affiliate code records, no catalog writes, no self-approved creator entitlement and no direct premium field reads. Anonymous HTTP checks show public cards available and private user/financial records hidden.

Storage manifest: 3,392 application objects, 22,276,507,059 bytes (~20.75 GiB), excluding old database-export backups. `scripts/migrate-storage.py` dry run passed; source HEAD checks for a video and landing asset matched backup sizes. The script does not create buckets, migrate ownership metadata, or rewrite database URLs; those are explicit subsequent steps. Full destination reconciliation passed: 3,392 matching object sizes, zero missing objects, zero mismatches; all 8 original ownership records restored. Verified public Storage URLs in application text/JSON columns were rewritten atomically using the private manifest. All 3,214 videos with stored MP4s now point at the owned project; zero video MP4 URLs point at the old project. Three landing videos were checked in the Vercel browser with the new host, readyState 4 and no media error. Temporary copy worker was replaced with a 410 response and the local credential-bearing process stopped. Existing asset URLs in code now follow the configured Supabase host.

Supabase browser authentication works. Site URL and exact production/preview/local callback URLs are configured; global Storage limit is 256 MB. Gemini and the existing Apify API token are stored in the owned project. No new Apify run or subscription was purchased during migration. Stripe browser login works for Adbroll (acct_1SbcpyL7UvJMc43Y); the separate MCP connector requires reauthentication. The owner completed key verification and supplied a restricted live key, now saved only in owned Supabase secrets. Google OAuth is enabled and publicly available. Resend is signed in and the TokXray sending domain is verified; the owner-provided SMTP credential is saved and delivery is verified. Local Supabase CLI is authenticated to a different portfolio; do not use it for this project. Vercel production now uses the owned backend. Website DNS now points to Vercel; three email DNS records were added. The Lovable subscription remains unchanged.

## Registration regression fixed

Private affiliate-code tables remain private. `validate_referral_code(text)` exposes only a boolean to anonymous and signed-in callers, so registration, pricing and email capture can validate a creator code without listing owner IDs. Verified under the anonymous database role: known code accepted, invalid code rejected.

## Verification at migration handoff

Vercel preview commit `72a2e91` reached READY. Stable branch preview: https://tokxray-git-codex-mx-affiliate-launch-eduardocorona.vercel.app/ (Vercel account protection remains enabled). TypeScript check, 29 tests across 6 files and production build passed. Public referral registration visibly validates ALICIA without exposing private code-owner records. This earlier preview verification predates the live Stripe configuration described below. Current billing credentials and commercial policy are installed, with checkout amount/attribution and portal checks passing; an actual paid activation is still unverified. The public domain was subsequently cut over and verified on October 10.

## Domain preparation (October 10)

Added and verified `tokxray.com` and `www.tokxray.com` on the Vercel `tokxray` project; www redirects to the apex with 308. DNS still uses GoDaddy ns63/ns64.domaincontrol.com and 185.158.133.1 (old service). This was the pre-cutover state; see the completed cutover below. Vercel currently recommends apex A values 216.150.1.1 / 216.150.16.1 and www CNAME db10307e3dc200e0.vercel-dns-017.com. Recheck immediately before release. Keep mail MX/TXT records unchanged. Production deployment/env, billing and Auth verification must precede DNS cutover.

Restricted Stripe key stored: Customers, Checkout Sessions and Customer Portal write; Charges and Refunds, Products, Coupons, Invoices, Prices and Subscriptions read. No transfer or payout access. No existing key was rotated or revoked.

GoDaddy browser access is verified. All nine current DNS records were backed up privately to `godaddy-dns-before.json`. Both apex and www are A records pointing at the old service with 600-second TTL. No MX records are present. This backup predates the addition of the three Resend email-authentication records. The apex/www website records were subsequently changed to Vercel as documented below.

## Final commercial policy installed (October 10)

- Live product `prod_VIBznzFL4oQUmI`, new monthly USD 29 price `price_1UP4aqL7UvJMc43YKXS8HQcb`; legacy USD 30 price retained for existing subscribers.
- Coupon `TWl9kb1R`: USD 14 off once, restricted to TokXray Pro, producing a USD 15 first payment. Applied only to valid direct referrals and first subscriptions.
- Live webhook `we_1UP4hNL7UvJMc43Y743F5sXC` targets owned Supabase; seven checkout/invoice/subscription/refund/dispute event types. Signing secret stored in Supabase. Stripe snapshot version 2025-11-17.clover; invoices/subscriptions are retrieved through the SDK's pinned 2023-10-16 API before business logic.
- Migration `20261010040000_launch_commission_policy.sql` applied. New RPC credits up to USD 15 once per referred customer and 15% of later payments, capped by actual net cash. Invoice deduplication, serialized customer locks and initial-bonus uniqueness prevent retries/resubscriptions from repeating the incentive. Refunded initial payments do not reset bonus eligibility. Existing commission RPC remains unchanged.
- Updated create-checkout and stripe-webhook deployed (v7), customer-portal (v8). Portal now supplies the user's JWT to profile RLS; previously it queried anonymously and could not find the customer.
- Live API smoke test creates temporary disposable customers and expires Checkout sessions without charging. Standard checkout returned USD 29; valid ALICIA referral returned USD 15 with policy/referral metadata; repeated request reused the session. The corrected customer portal returned 200. Temporary Supabase users and Stripe customers were removed. Unsigned webhook requests return 400. This does not prove a real payment/webhook delivery end to end.
- PGlite financial regression suite passed: legacy and new commissions, refunds, retries, manual settlement authorization/minimums and resubscription behavior. 30 frontend/unit tests across six files, TypeScript checking and the production build passed. Build warnings remain for the unset Meta pixel, old Browserslist data and bundle size.
- Remaining release check: a real paid-user activation/cancellation smoke test. Transactional email delivery, Google OAuth, Vercel production and the public domain are verified. Recent playable video coverage remains limited to 75 October records until additional downloads complete. Do not describe metadata-only records as published playable videos.


## Google authentication and recovery (October 10)

The owner explicitly authorized the Google User Data Policy, OAuth credential creation and storing the credential in owned Supabase. Google Cloud project `tokxray-auth-2026` is external and In production. The web client permits `https://tokxray.com` and the owned Supabase Auth callback. Google provider is enabled, nonce checks remain enabled, and only basic profile/email are requested. A real login returned the owner to `/app` with the correct account. The consent screen currently displays the Supabase Auth hostname; customized Google branding is a separate optional step.

Vercel production deployment `dpl_3u37Fz1pe97dVymGhmm3m1TbTm8q` is READY at commit `19c8881`, with the owned project URL, project ID and publishable key installed in production. Server secrets remain in Supabase, never Vercel frontend variables. `/recuperar-cuenta` and `/actualizar-contrasena` now provide a password recovery/reset flow with password validation, mismatch handling and local sign-out after updating. 33 tests across seven files, TypeScript and the production build passed. SMTP was subsequently completed and both recovery and signup-confirmation messages were delivered.

The catalogue header no longer labels imported snapshots as today's sales or shows a fabricated three-day activity streak. It explicitly identifies the latest imported report and does not claim real-time data.

Resend domain `tokxray.com` (`d5f5d4f9-7f1e-42ac-80c1-d55cb241585b`) was added. GoDaddy now contains `resend._domainkey` TXT and the `rsend`/`send` CNAME records supplied by Resend. Existing website, verification and DMARC records remain intact. The owner supplied an existing Resend credential, which was stored in Supabase SMTP. No new paid email plan was purchased.

Resend verified the domain and its sending DNS on October 10. Confirmation and recovery templates are saved in Spanish with TokXray branding; source copies are in `supabase/templates/`. The prepared credential form was not submitted by the agent; the owner supplied a credential directly.


## Completed SMTP and public-domain cutover

The user-provided Resend credential is stored only in owned Supabase Auth SMTP: `smtp.resend.com`, port 465, sender `TokXray <no-reply@tokxray.com>`, 60-second per-user interval. Reloading the dashboard confirms the credential is saved/hidden and custom SMTP is enabled. Resend reports Delivered for the owner's recovery message and a new disposable QA account's signup confirmation. Do not deploy the legacy generic `send-email` endpoint merely because SMTP is configured; the frontend no longer calls it at signup.

GoDaddy apex A records: `216.150.1.1` and `216.150.16.1`, TTL 600. www CNAME: `db10307e3dc200e0.vercel-dns-017.com.`, TTL 600. Nameservers and existing email/DMARC/verification records were retained. Vercel reports `misconfigured: false`. Certificate `cert_BNLY48mdeC42BV1ABsb7UpsH` covers both domains with automatic renewal. Public HTTPS returned 200 with `server: Vercel`; www returned 308 to the apex.

Browser verification on the public domain passed: landing → creator landing → registration; ALICIA referral validation; Google login → `/auth/continue` → `/affiliates`; owner account, editable-code controls and current commission/manual-payout policy render correctly. Founder access remains intact.

Signup confirmation can open on a different device. `AuthContinue` now first uses the referral code submitted in signup metadata and otherwise falls back to browser attribution; the server continues to validate ownership and eligibility. Added regressions for cross-device confirmation, Google browser attribution, a subsequent unrelated referral link and unauthenticated callbacks. Latest checks: 37 tests in eight files, TypeScript and production build pass. The test signup creates a free profile and an automatic affiliate code before confirmation, without granting paid access.

Outstanding: actual charge → signed webhook → paid access → affiliate ledger and cancellation validation requires a real checkout completed by the owner. Previous API checks verified correct USD 29/15 totals, attribution, session reuse and portal access without charging. Do not claim a real paid activation has been tested. Recent video coverage remains 75 retained October media rows, and external video uploads/download intake remains incomplete. Lovable cancellation has not been performed.

Final production deployment `dpl_7ubr5aS5DDd4JKx1DZmGunvVM4tR` reached READY at commit `004db8d`. A normal public Auth signup for an owner-controlled disposable email alias returned an unconfirmed free user and generated a unique affiliate code. Resend delivered the confirmation; opening its link on tokxray.com reached the affiliate dashboard. SQL then confirmed email verification, free plan and preserved ALICIA attribution. The QA session was signed out and its exact temporary Auth user was removed with an ID/email/no-Stripe-customer guard. No checkout, charge, subscription or commission was created by this registration test.
