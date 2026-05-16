'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    router.replace(isAuthenticated ? '/admin' : '/login');
  }, [isAuthenticated, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="shimmer w-10 h-10 rounded-full" />
    </div>
  );
}
