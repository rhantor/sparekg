import type { NextConfig } from "next";

// The Firebase auth handler normally lives on <project>.firebaseapp.com. Serving
// it through our own origin (below) is what lets NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
// be set to this site's own domain.
const FIREBASE_AUTH_ORIGIN = `https://${
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "sparekg"
}.firebaseapp.com`;

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      // Proxy Firebase's auth handler onto this origin.
      //
      // signInWithPopup opens <authDomain>/__/auth/handler and expects the
      // credential to be posted back to the opener. When authDomain is a
      // different origin from the app, that handoff depends on third-party
      // storage, which browsers partition on a deployed HTTPS site but not on
      // localhost — the popup completes at Google, then closes without ever
      // delivering the credential, and Firebase reports it as
      // auth/popup-closed-by-user. Serving the handler from our own origin
      // makes the whole flow first-party and removes that dependency.
      //
      // This only takes effect once NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set to
      // this site's domain; until then the rewrite is simply unused, so it is
      // safe to ship ahead of the switch.
      { source: "/__/auth/:path*", destination: `${FIREBASE_AUTH_ORIGIN}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `${FIREBASE_AUTH_ORIGIN}/__/firebase/:path*` },
    ];
  },
  async headers() {
    return [
      {
        // Allow Firebase signInWithPopup to talk back to the opener window.
        // Without this, a `same-origin` COOP severs window.opener and the
        // browser reports the popup as blocked/closed on deployed origins.
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
