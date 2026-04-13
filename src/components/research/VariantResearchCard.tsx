import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { Events, track, trackStandard } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface VariantResearchCardProps {
  headline?: string;
  subhead?: string;
  ctaLabel?: string;
  onDismiss?: () => void;
  className?: string;
  context?: string;
  loggedIn?: boolean;
  market?: string;
}

// SHA-256 hash for PII-safe analytics — mirrors what Meta Pixel's
// Advanced Matching expects for `em` and avoids shipping raw emails
// into PostHog / ad networks (GDPR / LFPDPPP compliance).
const hashEmail = async (email: string): Promise<string | null> => {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  try {
    const buf = new TextEncoder().encode(email);
    const digest = await window.crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
};

export const VariantResearchCard = ({
  headline = "¿Qué tipo de guion te funciona mejor?",
  subhead = "15 min en Zoom para ver cómo grabas. Te regalamos 2 meses gratis.",
  ctaLabel = "Quiero participar",
  onDismiss,
  className,
  context = "dashboard",
  loggedIn,
  market,
}: VariantResearchCardProps) => {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewFiredRef = useRef(false);

  useEffect(() => {
    if (dismissed || submitted) return;
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !viewFiredRef.current) {
            viewFiredRef.current = true;
            track(Events.VariantResearchViewed, {
              context,
              logged_in: loggedIn,
              market,
            });
          }
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [context, dismissed, submitted, loggedIn, market]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Ingresa un correo válido");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const email_hash = await hashEmail(trimmed);
    const domain = trimmed.split("@")[1] || null;

    track(Events.VariantResearchEmailSubmitted, {
      context,
      email_hash,
      email_domain: domain,
      logged_in: loggedIn,
      market,
    });
    trackStandard("Lead", {
      source: "variant_research",
      context,
      email_hash,
    });

    setSubmittedEmail(trimmed);
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const handleDismiss = () => {
    track(Events.VariantResearchDismissed, {
      context,
      logged_in: loggedIn,
      market,
    });
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <Card
      ref={cardRef}
      className={cn(
        "relative overflow-hidden border-brand-pink/20 bg-gradient-to-br from-brand-pink/5 via-transparent to-brand-cyan/5",
        "p-5 md:p-6",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground rounded-full p-2 min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0"
        aria-label="Descartar"
      >
        <X className="h-4 w-4" />
      </button>

      {submitted ? (
        <div className="py-2">
          <p className="text-sm font-semibold text-brand-pink">
            ¡Listo! Te contactamos en las próximas 24 horas.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Revisa tu correo: <span className="font-mono">{submittedEmail}</span>
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 pr-10">
            <h3 className="text-base md:text-lg font-semibold leading-tight">
              {headline}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
              {subhead}
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2"
            noValidate
          >
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              variant="brand"
              size="brand-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando
                </>
              ) : (
                ctaLabel
              )}
            </Button>
          </form>
          {error && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </Card>
  );
};

export default VariantResearchCard;
