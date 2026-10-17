# Transcription and translation repair — 15 October 2026

## Confirmed causes

- The active catalogue modal invoked the undeployed `download-tiktok-video` function when media was missing. It now uses the deployed `catalog-download` job flow, polls boundedly and uses the returned catalogue ID.
- Saved-script RPC failures were console-only; processing errors vanished with the transient toast. Persistent errors and explicit retries now appear in both modal layouts.
- Pending requests could overwrite another selected video/history entry. Request invalidation now protects modal and Tools results.
- Translation had no active UI and its old backend depended on Lovable. `translate-script` now uses the authenticated, Pro-gated Gemini integration and existing text quota. English/Spanish results remain separate from the original transcript.

## Release

- Source commit: `673948acbac4ca4c87624c4e3ffdc18f69a9af5b`.
- Vercel production deployment: `dpl_3vwfrLrMBEmttkGjKt6D1SR1b5ue`, READY; aliases include `tokxray.com` and `www.tokxray.com`.
- Supabase project: `tnqvvfpzkjwgllwdwvte`; `translate-script` v1 ACTIVE, JWT verification enabled. Shared helpers included in deployment.
- 197 tests across 29 files passed; TypeScript, production build and diff checks passed.

## Live verification

- Generated a previously absent transcript for `https://www.tiktok.com/@emiliocampos244/video/7684426412110908692` using the normal authenticated catalogue UI. A 1,482-character transcript was saved with Gemini analysis and variants.
- Pasted that public URL into Tools: download readiness, shared analysis, segmented transcript and history save succeeded.
- Verified analysis and three variant tabs render.
- After production deployment, repeated Tools flow successfully, translated the script to English, copied it and returned to the intact original.
- Opened the same video from its catalogue card after deployment: saved transcript loaded; English translation and copy succeeded in the modal too.
- Evidence: `output/traduccion-verificada-2026-10-15.png` and `output/traduccion-catalogo-verificada-2026-10-15.png`.

## Boundaries

- These checks verify the repaired flows, not every catalogue video or every platform feature. The exact failing user URL was requested but not supplied during this repair.
- Videos without audible dialogue cannot yield a spoken transcript; unavailable/private TikTok media and provider quota failures remain possible and now surface a persistent error.
- No additional API subscription was needed. Existing Pro checks and daily quotas remain in place. Translation reuses results within the current view; it does not persist translations across page reloads.
- The missing-media branch is covered by regression tests (polling, returned ID, failure and cancellation); the live URL tested already had owned media. No new bulk download was launched.
- No pricing, Stripe, commissions or payment data changed in this repair.
