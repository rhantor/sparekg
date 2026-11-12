'use client';

/**
 * Last-resort boundary for a crash in the root layout itself (auth or theme
 * providers). It replaces the whole document, so it carries its own <html>,
 * <body> and inline styles — the app's stylesheet may be what failed.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f7f5f1', color: '#0b1d33' }}>
        <title>Something went wrong · SpareKG</title>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>SpareKG is having trouble</h1>
            <p style={{ color: '#5b6472', margin: '0 0 24px' }}>
              Something went wrong while loading the site. Please try again in a moment.
            </p>
            {error.digest && (
              <p style={{ color: '#5b6472', fontSize: 12, margin: '0 0 24px' }}>Reference: {error.digest}</p>
            )}
            <button
              onClick={() => unstable_retry()}
              style={{ background: '#0b1d33', color: '#fff', border: 0, borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
