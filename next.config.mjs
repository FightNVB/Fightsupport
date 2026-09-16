/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable the X-Powered-By header to avoid leaking framework info
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/api/admin/discipline/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/api/admin/beheer/talentstatus/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/api/admin/algemeen/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/api/admin/sportscholen/fightcrew",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
