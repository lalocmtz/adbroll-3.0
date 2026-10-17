import { Navigate, useLocation } from 'react-router-dom';
import { proReturnTo } from '@/hooks/useProOffer';

// Compatibility for older gated screens: every offer opens the same sales page.
export default function PricingModal({ open }: {open: boolean; onOpenChange: (open: boolean) => void}) {
  const location = useLocation();
  if (!open || location.pathname === '/pricing') return null;
  return <Navigate to="/pricing" state={{ returnTo: proReturnTo(location.pathname + location.search) }} />;
}
