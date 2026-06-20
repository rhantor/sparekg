'use client';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Modal } from '@/components/ui/Modal';
import { Reveal } from '@/components/ui/Reveal';
import { explainerVideos } from '@/lib/marketing-samples';

const DEMO_EMBED = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
const TINTS = [
  'from-ocean/90 to-navy',
  'from-teal-600 to-navy',
  'from-navy-700 to-navy-900',
  'from-ocean-700 to-teal-700',
];

export function Videos() {
  const [openVideo, setOpenVideo] = useState<string | null>(null);

  return (
    <section id="videos" className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionHeader
            center
            label="Watch & Learn"
            title="See SpareKG in action"
            desc="Short explainers on how the platform benefits both travelers and senders."
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-16">
          {explainerVideos.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.08}>
              <button
                onClick={() => setOpenVideo(v.title)}
                className="group w-full text-left bg-white rounded-2xl border border-line overflow-hidden shadow-soft hover:shadow-float hover:-translate-y-1 transition-all"
              >
                <div className={`aspect-video flex items-center justify-center bg-gradient-to-br ${TINTS[i % TINTS.length]}`}>
                  <span className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 text-navy fill-navy ml-0.5" />
                  </span>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-navy text-sm mb-1">{v.title}</div>
                  <div className="text-xs text-ash">{v.duration}</div>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      <Modal open={openVideo !== null} onClose={() => setOpenVideo(null)} title={openVideo ?? ''} maxWidth={760}>
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
          <iframe
            className="w-full h-full"
            src={openVideo ? `${DEMO_EMBED}?autoplay=1` : ''}
            title={openVideo ?? 'video'}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      </Modal>
    </section>
  );
}
