import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, useLocation } from 'react-router-dom';
import { proReturnTo } from '@/hooks/useProOffer';
export const SubscriptionGate = ({children}: {children:React.ReactNode}) => {
  const {isPro,loading} = useSubscription();
  const location = useLocation();
  if (loading) return <p role="status" className="p-8 text-center">Comprobando tu acceso…</p>;
  return isPro ? <>{children}</> : <Navigate to="/pricing" replace state={{ returnTo: proReturnTo(location.pathname + location.search) }} />;
};
