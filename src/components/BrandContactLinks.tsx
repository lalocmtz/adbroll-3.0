import { Instagram, Mail, MessageCircle } from "lucide-react";

export const BRAND_CONTACT = {
  email: "contacto@tokxray.com",
  whatsapp: "https://wa.me/522213267653",
  phoneLabel: "+52 221 326 7653",
  instagram: "https://www.instagram.com/tokxrayoficial/",
  tiktok: "https://www.tiktok.com/@tokxrayoficial",
} as const;

export function BrandContactLinks({ className = "", socialOnly = false }: { className?: string; socialOnly?: boolean }) {
  const linkStyle = "inline-flex min-h-11 items-center gap-2 rounded px-1 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  return <nav aria-label="Redes y contacto" className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${className}`}>
    {!socialOnly && <>
      <a href={`mailto:${BRAND_CONTACT.email}`} className={linkStyle}><Mail aria-hidden="true" className="h-4 w-4 shrink-0" />{BRAND_CONTACT.email}</a>
      <a href={BRAND_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={linkStyle}><MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0" />WhatsApp · {BRAND_CONTACT.phoneLabel}</a>
    </>}
    <a href={BRAND_CONTACT.instagram} target="_blank" rel="noopener noreferrer" className={linkStyle} aria-label="Instagram de TokXray: @tokxrayoficial"><Instagram aria-hidden="true" className="h-4 w-4 shrink-0" />Instagram</a>
    <a href={BRAND_CONTACT.tiktok} target="_blank" rel="noopener noreferrer" className={linkStyle} aria-label="TikTok de TokXray: @tokxrayoficial"><svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" /></svg>TikTok</a>
  </nav>;
}
