// Sentry initialization for Adbroll.
//
// Respects VITE_SENTRY_DSN — when absent, init() is a no-op so local
// dev and preview builds stay free of noise. tracesSampleRate is
// conservative by default; bump via env when running load tests.

import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? "production";
const RELEASE = import.meta.env.VITE_APP_RELEASE as string | undefined;

export const initSentry = () => {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: RELEASE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Drop auth-expected 401s — Supabase fires them during session
      // refresh and they'd flood the inbox.
      if (event.exception?.values?.some((e) => /401|JWT expired/i.test(e.value ?? ""))) {
        return null;
      }
      return event;
    },
  });
};

export { Sentry };
