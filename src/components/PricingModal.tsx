import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SubscriptionOffer } from '@/components/SubscriptionOffer';
export default function PricingModal({ open, onOpenChange }: {open: boolean; onOpenChange: (open: boolean) => void}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-[420px] max-h-[90svh] overflow-y-auto p-4 rounded-2xl"><DialogHeader className="pr-5"><DialogTitle className="text-xl">Prepara tu próximo video con Pro</DialogTitle><DialogDescription>Elige una referencia con ventas reportadas y adapta el guion a tu voz antes de grabar.</DialogDescription></DialogHeader><SubscriptionOffer /></DialogContent></Dialog>;
}
