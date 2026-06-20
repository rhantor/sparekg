'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Plane, Lock, Mail, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please enter your name.');
    setLoading(true);
    const res = await register(email, password, name.trim());
    setLoading(false);
    if (res.ok) router.replace('/home');
    else setError(res.error || 'Could not create your account.');
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    const res = await loginWithGoogle();
    setGoogleLoading(false);
    if (res.ok) router.replace('/home');
    else if (res.error) setError(res.error);
  };

  const inputCls = 'w-full pl-11 pr-3 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal placeholder:text-ash/60';

  return (
    <div className="site min-h-screen flex items-center justify-center bg-gradient-to-b from-sand to-white px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy mb-4">
            <Plane className="w-7 h-7 text-teal-500" />
          </Link>
          <h1 className="font-display text-2xl font-semibold text-navy">Create your account</h1>
          <p className="text-sm text-ash mt-1">Join the SpareKG community — it&apos;s free</p>
        </div>

        <div className="bg-white rounded-2xl border border-line shadow-soft p-6 sm:p-7">
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-line font-medium text-navy hover:bg-sand transition-colors disabled:opacity-50 mb-5"
          >
            <GoogleIcon /> {googleLoading ? 'Connecting…' : 'Sign up with Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 h-px bg-line" />
            <span className="text-xs text-ash">or</span>
            <span className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className={inputCls} placeholder="Full name" required />
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputCls} placeholder="you@email.com" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`}
                placeholder="Password (min 6 characters)" required />
              <button type="button" onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ash hover:text-navy">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-500/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-[0.7rem] text-ash text-center mt-4">
            You&apos;ll verify your identity (KYC) before posting or bidding.
          </p>
        </div>

        <p className="text-center text-sm text-ash mt-6">
          Already have an account? <Link href="/login" className="font-semibold text-teal hover:text-teal-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
