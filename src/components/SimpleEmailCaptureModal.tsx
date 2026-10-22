import PricingModal from '@/components/PricingModal';
interface SimpleEmailCaptureModalProps { open: boolean; onOpenChange: (open: boolean) => void; feature?: string; onSuccess?: () => void; redirectOnSuccess?: boolean; }
export const SimpleEmailCaptureModal = ({ open, onOpenChange }: SimpleEmailCaptureModalProps) => <PricingModal open={open} onOpenChange={onOpenChange} />;
