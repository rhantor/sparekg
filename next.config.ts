import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
