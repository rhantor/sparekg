import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

/** The preview card shown when a SpareKG link is shared on WhatsApp, Facebook, etc. */
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PLANE =
  'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0b1d33 0%, #13304f 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={PLANE} />
          </svg>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 700 }}>
            Spare<span style={{ color: '#14b8a6' }}>KG</span>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, marginTop: 48, lineHeight: 1.15 }}>
          {SITE_TAGLINE}.
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.7)', marginTop: 24 }}>
          Send items from Malaysia to Bangladesh with verified travelers.
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#14b8a6', marginTop: 48 }}>
          Kuala Lumpur  →  Dhaka
        </div>
      </div>
    ),
    size,
  );
}
