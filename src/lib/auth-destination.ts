const destinations = new Set(["/app", "/affiliates", "/pricing", "/settings", "/canjear"]);
export function authDestination(value: string | null): string {
  return value && destinations.has(value) ? value : "/app";
}
export function authCallbackUrl(destination: string): string {
  return `${window.location.origin}/auth/continue?redirect=${encodeURIComponent(authDestination(destination))}`;
}
