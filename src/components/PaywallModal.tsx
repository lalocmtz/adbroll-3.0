import PricingModal from '@/components/PricingModal';
export const PaywallModal = ({open,onClose}: {open: boolean; onClose: () => void; feature?: string}) => <PricingModal open={open} onOpenChange={value => {if (!value) onClose();}} />;
export default PaywallModal;
