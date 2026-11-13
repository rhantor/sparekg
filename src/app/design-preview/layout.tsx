import type { Metadata } from 'next';
import { Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import '@/components/sky/sky.css';

// Loaded here only, so the fonts cost nothing on existing pages until the
// direction is approved and rolled out.
const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Design preview',
  // An internal review page with sample data — keep it out of search.
  robots: { index: false, follow: false },
};

export default function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className={`sky min-h-screen ${instrument.variable} ${jetbrains.variable}`}>{children}</div>;
}
