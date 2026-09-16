import type { MetadataRoute } from 'next';
import { allRouteSlugs } from '@/lib/routes';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/flights`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/assistant`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
  const routePages: MetadataRoute.Sitemap = allRouteSlugs().map((slug) => ({
    url: `${SITE_URL}/flights/${slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }));
  return [...staticPages, ...routePages];
}
