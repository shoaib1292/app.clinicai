// Registers the clinic subdomain proxy (src/proxy.ts) as the Next.js middleware.
// Enables `slug.clinicai.pk` -> /website/[slug] rewriting, plus CORS/auth/rate-limiting.
export { default } from './proxy'
