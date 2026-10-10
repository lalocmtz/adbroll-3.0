import { cn } from "@/lib/utils";
interface BrandLogoProps { tone?: "light" | "dark"; className?: string; size?: "sm" | "md" | "lg"; iconOnly?: boolean; }
const sizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };
const marks = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" };
/** Shared original TokXray mark across the catalogue, onboarding and billing. */
export const BrandLogo = ({tone="light",className,size="md",iconOnly=false}: BrandLogoProps) => <span aria-label="TokXray" className={cn("inline-flex items-center gap-2 font-display font-extrabold tracking-tight leading-none", sizes[size],tone === "light" ? "text-brand-mist" : "text-brand-ink",className)}>
  <img src="/brand/tokxray-social-1024.png" alt="" width={40} height={40} className={cn("rounded-lg shrink-0",marks[size])} />
  {!iconOnly && <span>Tok<span className="text-brand-pink">Xray</span></span>}
</span>;
