import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

/**
 * Makes SpareKG installable as a PWA (blueprint §4.10: web first, app-store
 * wrapper later). Icons come from scripts/generate-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — send with travelers`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    // Signed-in users land on their dashboard; the app layout sends anyone
    // signed out to the login page.
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f5f1',
    theme_color: '#0b1d33',
    categories: ['travel', 'shopping', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
