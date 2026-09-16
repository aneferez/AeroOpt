// Absolute site origin, used for canonical URLs, Open Graph tags, and the
// sitemap. Set NEXT_PUBLIC_SITE_URL to your production domain at build time.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aeroopt.example').replace(/\/$/, '');
export const SITE_NAME = 'AeroOpt';
