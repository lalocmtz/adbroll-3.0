import { useEffect, useState, useCallback } from "react";
import { Copy, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Events,
  clearMark,
  mark,
  measureSince,
  track,
  trackStandard,
  trackViewContent,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type GuionVariantKey = "transcrito" | "ia_optimizado" | "agresivo";

export interface GuionVariant {
  key: GuionVariantKey;
  label: string;
  description?: string;
  body: string;
}

interface GuionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId?: string;
  productName?: string;
  creatorHandle?: string | null;
  variants: GuionVariant[];
  defaultVariant?: GuionVariantKey;
}

const MARK_KEY = "guion.demo.opened";

export const GuionModal = ({
  open,
  onOpenChange,
  videoId,
  productName,
  creatorHandle,
  variants,
  defaultVariant = "ia_optimizado",
}: GuionModalProps) => {
  const [active, setActive] = useState<GuionVariantKey>(defaultVariant);
  const [copiedKey, setCopiedKey] = useState<GuionVariantKey | null>(null);

  useEffect(() => {
    if (!open) return;
    mark(MARK_KEY);
    track(Events.GuionModalOpened, {
      video_id: videoId,
      product_name: productName,
      creator_handle: creatorHandle,
      default_variant: defaultVariant,
    });
    // Meta Pixel: opening a premium script is high-intent content viewing.
    trackViewContent("guion", videoId);
    setActive(defaultVariant);
    return () => {
      clearMark(MARK_KEY);
      setCopiedKey(null);
    };
  }, [open, videoId, productName, creatorHandle, defaultVariant]);

  const handleVariantChange = useCallback(
    (value: string) => {
      const key = value as GuionVariantKey;
      setActive(key);
      track(Events.GuionVariantSelected, {
        video_id: videoId,
        variant: key,
        time_to_select_ms: measureSince(MARK_KEY),
      });
    },
    [videoId],
  );

  const handleCopy = useCallback(
    async (variant: GuionVariant) => {
      try {
        await navigator.clipboard.writeText(variant.body);
      } catch {
        return;
      }
      setCopiedKey(variant.key);
      track(Events.GuionCopied, {
        video_id: videoId,
        variant: variant.key,
        char_count: variant.body.length,
        time_to_copy_ms: measureSince(MARK_KEY),
      });
      trackStandard("Customize", {
        content_type: "guion",
        content_id: videoId,
        variant: variant.key,
      });
      setTimeout(() => {
        setCopiedKey((current) => (current === variant.key ? null : current));
      }, 1800);
    },
    [videoId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight">
                Guion listo para grabar
              </DialogTitle>
              {productName && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {productName}
                  {creatorHandle ? ` · ${creatorHandle}` : null}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground rounded-full p-1 -m-1"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <Tabs
          value={active}
          onValueChange={handleVariantChange}
          className="w-full"
        >
          <TabsList className="w-full rounded-none border-b bg-transparent justify-start gap-2 px-6 h-auto py-2">
            {variants.map((variant) => (
              <TabsTrigger
                key={variant.key}
                value={variant.key}
                className="text-xs data-[state=active]:bg-brand-pink data-[state=active]:text-white rounded-full px-3 py-1"
              >
                {variant.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {variants.map((variant) => (
            <TabsContent
              key={variant.key}
              value={variant.key}
              className="px-6 pb-6 pt-4 m-0"
            >
              {variant.description && (
                <p className="text-xs text-muted-foreground mb-3">
                  {variant.description}
                </p>
              )}
              <pre
                className={cn(
                  "whitespace-pre-wrap text-sm leading-relaxed font-sans",
                  "max-h-[50vh] overflow-y-auto",
                  "bg-muted/30 rounded-lg p-4 border",
                )}
              >
                {variant.body}
              </pre>
              <div className="flex items-center justify-between mt-4 gap-3">
                <p className="text-[11px] text-muted-foreground">
                  {variant.body.length} caracteres
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={copiedKey === variant.key ? "cyber" : "brand"}
                  onClick={() => handleCopy(variant)}
                  className="gap-2"
                >
                  {copiedKey === variant.key ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar guion
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default GuionModal;
