import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SubscriptionOffer } from '@/components/SubscriptionOffer';
export default function PricingModal({ open, onOpenChange }: {open: boolean; onOpenChange: (open: boolean) => void}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-[420px] max-h-[90svh] overflow-y-auto p-4 rounded-2xl"><DialogHeader className="pr-5"><DialogTitle className="text-xl">Tu próxima idea empieza aquí</DialogTitle><DialogDescription>Deja de grabar a ciegas. Encuentra referencias y crea con tu estilo.</DialogDescription></DialogHeader><SubscriptionOffer /></DialogContent></Dialog>;
}
