import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function KycSuccessPage() {
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal/10 mb-6">
        <CheckCircle2 className="w-8 h-8 text-teal" />
      </div>
      <h1 className="font-display text-2xl font-semibold text-navy mb-3">Identity submitted</h1>
      <p className="text-ash leading-relaxed mb-8">
        Thanks — your documents are in the review queue. Verification usually completes within a few
        hours. We&apos;ll update your account status once a reviewer has checked your submission.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/profile" className="px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">
          Back to Profile
        </Link>
        <Link href="/home" className="px-5 py-2.5 rounded-xl border border-line text-navy font-semibold hover:border-navy/25 transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  );
}
