import { Navigate, useLocation } from 'react-router-dom';

export default function Unlock() {
  const location = useLocation();
  return <Navigate to={`/pricing${location.search}`} replace state={location.state} />;
}
