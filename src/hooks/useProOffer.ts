import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Shops use exact Kalodata numeric IDs; do not accept arbitrary nested paths.
const contentPath = /^\/(?:app|products|shops(?:\/[0-9]+)?|ranking-creadores|creadores|favorites|settings|opportunities|tools|videos\/(?:product|creator)\/[a-zA-Z0-9-]+)$/;

export function proReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length > 2000 || /[\\\r\n]/.test(value)) return "/app";
  const [path] = value.split(/[?#]/);
  return contentPath.test(path) ? value : "/app";
}

export function useProOffer() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    navigate("/pricing", { state: { returnTo: proReturnTo(location.pathname + location.search) } });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [navigate, location.pathname, location.search]);
}
