/**
 * `next dev` wired to the Firebase emulators instead of production.
 *
 * Start the emulators first (they hold all data in memory):
 *   npx firebase emulators:start --only auth,firestore,functions --project demo-sparekg
 * then:
 *   npm run dev:emulators          → http://localhost:3001
 *
 * Seed demo users and a deal with `node functions/test/seed-emulator.cjs`.
 * Environment variables win over .env.local, so the real project is untouched.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolved from this file rather than inherited: on Windows a shell can hand
// down the cwd with a lower-case drive letter, and Next's dev server then
// matches no routes at all (every page 404s).
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

const env = {
  ...process.env,
  NEXT_PUBLIC_USE_EMULATORS: 'true',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-sparekg',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-sparekg.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key',
  // Server-side Admin SDK (session cookie route) follows the emulators too.
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  GCLOUD_PROJECT: 'demo-sparekg',
};

const port = process.env.PORT || '3001';
const child = spawn(process.execPath, [nextBin, 'dev', '--port', port], { cwd: root, env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
