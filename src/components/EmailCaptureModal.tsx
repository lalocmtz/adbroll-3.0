import PricingModal from '@/components/PricingModal';
// Legacy entry point uses account-first checkout, just like every other paywall.
export const EmailCaptureModal = ({open,onOpenChange}: {open:boolean;onOpenChange:(open:boolean)=>void;referralCode?:string|null;plan?:'pro'}) => <PricingModal open={open} onOpenChange={onOpenChange} />;
