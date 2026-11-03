import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Performa & Kompresi */
  compress: true, // Mengaktifkan kompresi Gzip/Brotli bawaan
  cacheComponents: true,
  partialPrefetching: true,

  /* Turbopack Loaders */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  /* Keamanan Tingkat Lanjut (Security Headers ISO 27001) */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN", // Mitigasi Clickjacking
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Mitigasi MIME-type sniffing
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        /* Cache Control untuk Aset Statis */
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

  /* Rewrite /uploads ke API serverless handler */
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/files/:path*",
      },
    ];
  },
};

export default nextConfig;
