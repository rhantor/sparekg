'use client';
import { useState } from 'react';
import { mockOnboardingVideos } from '@/lib/mock-data';
import type { OnboardingVideo } from '@/lib/types';
import { FileText, GripVertical, Eye, EyeOff, Pencil, Plus, Video, Trash2 } from 'lucide-react';

export default function ContentPage() {
  const [videos, setVideos] = useState(mockOnboardingVideos);

  const toggleActive = (id: string) => {
    setVideos(prev => prev.map(v => v.videoId === id ? { ...v, isActive: !v.isActive } : v));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-400" /> Content Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage onboarding videos, FAQ, and public-facing content.</p>
      </div>

      {/* Onboarding Videos */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Video className="w-4 h-4 text-brand-400" /> Onboarding Videos</h3>
          <button className="btn btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Add Video</button>
        </div>
        <div className="space-y-3">
          {videos.map((v, i) => (
            <div key={v.videoId} className="bg-surface-100 rounded-xl p-4 flex items-center gap-4">
              <GripVertical className="w-4 h-4 text-gray-600 cursor-grab shrink-0" />
              <span className="text-xs font-bold text-gray-500 w-6">#{v.order}</span>
              <div className="w-16 h-10 rounded-lg bg-surface-300 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{v.titleEn}</p>
                <p className="text-xs text-gray-500 truncate">{v.titleBn}</p>
                <p className="text-xs text-gray-600 truncate mt-0.5">{v.descriptionEn}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(v.videoId)}
                  className={`btn text-xs py-1.5 ${v.isActive ? 'btn-success' : 'btn-ghost'}`}
                >
                  {v.isActive ? <><Eye className="w-3.5 h-3.5" /> Active</> : <><EyeOff className="w-3.5 h-3.5" /> Hidden</>}
                </button>
                <button className="btn btn-ghost text-xs py-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                <button className="btn btn-ghost text-xs py-1.5 text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section (placeholder) */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">FAQ Management</h3>
          <button className="btn btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Add FAQ</button>
        </div>
        <div className="text-center py-8 text-gray-500 text-sm">
          No FAQ entries yet. Add your first question to get started.
        </div>
      </div>

      {/* Prohibited Goods Policy */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Prohibited Goods Policy</h3>
          <span className="badge badge-info">v1.0</span>
        </div>
        <div className="bg-surface-100 rounded-xl p-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-red-400 mb-1.5">Hard-Prohibited (Server-Rejected)</p>
              <div className="flex flex-wrap gap-1.5">
                {['Currency/Gold', 'Firearms', 'Narcotics', 'Live Animals', 'Lithium Batteries >100Wh', 'Alcohol', 'Counterfeit Goods', 'Legal Documents'].map(item => (
                  <span key={item} className="badge badge-danger text-[0.6rem]">{item}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1.5">Soft-Restricted (Require Traveler Accept)</p>
              <div className="flex flex-wrap gap-1.5">
                {['Electronics w/ batteries', 'Cosmetics', 'Powdered foods/spices', 'Books', 'Religious items'].map(item => (
                  <span key={item} className="badge badge-warning text-[0.6rem]">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
