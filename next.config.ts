import type { NextConfig } from "next";
const staticExport = process.env.NEXT_STATIC_EXPORT === "true";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.COMPLYRA_BUILD_DIR || ".next",
  ...(staticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
      }
    : {}),
  serverExternalPackages: ["oracledb", "nodemailer"],
  ...(staticExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
                },
                {
                  key: "Permissions-Policy",
                  value: "camera=(), microphone=(), geolocation=(), payment=()",
                },
                ...(process.env.NODE_ENV === "production"
                  ? [
                      {
                        key: "Strict-Transport-Security",
                        value: "max-age=31536000",
                      },
                    ]
                  : []),
              ],
            },
          ];
        },
      }),
};
export default nextConfig;
