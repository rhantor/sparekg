'use client';
import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Mail, AlertCircle, MailCheck, ArrowLeft } from 'lucide-react';
import { AuthShell } from '@/components/sky/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      const code = (err as { code?: string }).code || '';
      setError(code === 'auth/invalid-email' ? 'Please enter a valid email address.' : 'Could not send the reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a reset link"
      footer={
        <Link href="/login" className="inline-flex items-center justify-center gap-1.5 hover:text-navy">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      }
    >
          {sent ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
                <MailCheck className="w-6 h-6 text-teal" />
              </div>
              <p className="text-navy font-medium mb-1">Check your inbox</p>
              <p className="text-sm text-ash">
                If an account exists for <strong className="text-navy">{email}</strong>, a reset link is on its way.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-3 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal placeholder:text-ash/60"
                  placeholder="you@email.com" required />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-500/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
    </AuthShell>
  );
}
