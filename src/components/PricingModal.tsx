import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SubscriptionOffer } from '@/components/SubscriptionOffer';
export default function PricingModal({ open, onOpenChange }: {open: boolean; onOpenChange: (open: boolean) => void}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-[420px] max-h-[90svh] overflow-y-auto p-4 rounded-2xl border-white/10 bg-brand-ink text-brand-mist"><DialogHeader className="pr-5"><DialogTitle className="text-xl">Deja de adivinar qué vende</DialogTitle><DialogDescription className="text-brand-mist/65">Encuentra qué está vendiendo, entiende el guion y crea tu versión. Dale más intención a tu próximo video.</DialogDescription></DialogHeader><SubscriptionOffer /></DialogContent></Dialog>;
}
