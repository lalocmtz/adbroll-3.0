# TokXray launch status — 2026-10-10

## Implemented in source, not released

Manual affiliate transfers replace Connect onboarding in the affiliate page and creator FAQ. The founder admin page can record completed external transfers in USD, with a unique bank reference. The database enforces founder authorization, $50 minimum, available balance, dispute holds and pending withdrawal reconciliation. Repeating the same reference and amount is idempotent. Recording does not send money. Funds paid in MXN must be reconciled to the USD liability by the owner.

Migration `20261010010000_manual_affiliate_settlements.sql` requires the preceding September financial migrations. Automatic reservation is disabled and the payout worker requires explicit `AFFILIATE_PAYOUT_MODE=connect` plus the existing enable flag. Do not deploy only frontend and assume financial integration is complete. No real transfers were made.

Tools analysis now rejects provider errors, empty insights/variants and failed history saves instead of falsely displaying completion. It still uses `transcribe-assemblyai`, `analyze-script-insights` and `generate-script-variants`. The latter two use Lovable AI gateway. Direct Gemini shared caching remains pending; prior Gemini CLI pilot was not end-to-end validation.

## New Kalodata source

Period: 2026-09-10 through 2026-10-09. 500 creators, 300 products, 2,000 video records. All video records include product IDs; 659 match the exported product catalog. New creator file has no email column. No outreach sent.

Normalized data and atomic dry-run/apply SQL: `outputs/2026-10-10/importacion/` (gitignored). Only staged first 500 creator rows and 100 product rows before the Lovable connector began returning INVALID_ARGUMENT, including for SELECT 1. No public October snapshot import committed. Old public snapshot remains in place. A video URL/metadata row does not prove an MP4 is stored or playable.

## Hosting and release blockers

Production remains Lovable at tokxray.com. Vercel project `tokxray` has preview deployments only. GitHub PR #3 remains open. Backend project `gcntnilurlulejwwtpaa` remains Lovable-managed; no independently owned TokXray Supabase project exists. Need destination organization confirmation required by Supabase tools, exact project cost approval, database/storage/functions/auth migration and complete restore verification before DNS switch. Do not cancel Lovable before migration is verified.

Stripe is still needed to collect customer subscriptions and attribute real paid invoices. Manual payouts remove the Connect requirement, not subscription checkout/webhook requirements. First commission choice remains unresolved ($7.50 vs $15 on first $15 payment); intended monthly price $29 USD and renewal commission 15% are not yet installed in the billing path, which still reflects the prior $30/30% configuration. No claims of production readiness.

## Opportunity algorithm

Current SQL view is a category/market percentile heuristic: 30% revenue, 25% creator count, 20% momentum, 15% per-sale commission, 10% ROAS. No predictive backtest or demonstrated sales lift. Missing data, small category samples and snapshots without comparable source periods remain unresolved. Latest UI hides unverified growth claims and labels indicator experimental. More data alone does not validate the model.
