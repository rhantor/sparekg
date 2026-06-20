import { cookies } from 'next/headers';
import { createSessionCookie, SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/auth-server';

/**
 * POST /api/auth/session
 * Body: { idToken }. Verifies the Firebase ID token and stores an httpOnly
 * session cookie so the server can authenticate subsequent requests.
 */
export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== 'string') {
      return Response.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const sessionCookie = await createSessionCookie(idToken);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to create session cookie:', error);
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }
}

/** DELETE /api/auth/session — clears the session cookie (logout). */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ success: true });
}
