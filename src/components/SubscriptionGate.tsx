import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionOffer } from '@/components/SubscriptionOffer';
export const SubscriptionGate = ({children}: {children:React.ReactNode}) => {
  const {isPro,loading} = useSubscription();
  if (loading) return <p role="status" className="p-8 text-center">Comprobando tu acceso…</p>;
  return isPro ? <>{children}</> : <div className="max-w-md mx-auto p-4"><SubscriptionOffer /></div>;
};
