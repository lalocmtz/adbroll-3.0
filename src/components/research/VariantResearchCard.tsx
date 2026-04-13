import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { Events, track, trackStandard } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface VariantResearchCardProps {
  headline?: string;
  subhead?: string;
  ctaLabel?: string;
  onDismiss?: () => void;
  className?: string;
  context?: string;
}

export const VariantResearchCard = ({
  headline = "¿Qué guion te funcionaría mejor?",
  subhead = "Nos tomamos 15 min en Zoom contigo para entender cómo grabas. A cambio, dos meses gratis.",
  ctaLabel = "Quiero participar",
  onDismiss,
  className,
  context = "dashboard",
}: VariantResearchCardProps) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
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
            track(Events.VariantResearchViewed, { context });
          }
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [context, dismissed, submitted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;
    track(Events.VariantResearchEmailSubmitted, {
      context,
      email: trimmed,
    });
    trackStandard("Lead", {
      source: "variant_research",
      context,
      email: trimmed,
    });
    setSubmitted(true);
  };

  const handleDismiss = () => {
    track(Events.VariantResearchDismissed, { context });
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
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground rounded-full p-1"
        aria-label="Descartar"
      >
        <X className="h-4 w-4" />
      </button>

      {submitted ? (
        <div className="py-2">
          <p className="text-sm font-semibold text-brand-pink">
            ¡Listo! Te escribimos hoy mismo.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Revisa tu correo: <span className="font-mono">{email}</span>
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="text-base md:text-lg font-semibold leading-tight">
              {headline}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1.5 pr-6">
              {subhead}
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2"
          >
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="brand" size="brand-md">
              {ctaLabel}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
};

export default VariantResearchCard;
