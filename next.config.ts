import type { NextConfig } from "next";
import { readdirSync } from "node:fs";
import createNextIntlPlugin from "next-intl/plugin";
import { buildCommit, latestMigrationName } from "./src/lib/build-info";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Fixed at build for /api/health: the runtime image has neither the
  // migrations folder nor the git history (src/lib/build-info.ts).
  env: {
    AISENTINEL_LATEST_MIGRATION: latestMigrationName(readdirSync("prisma/migrations")) ?? "",
    AISENTINEL_BUILD_COMMIT: buildCommit(process.env) ?? "",
  },
  // Sovereign/self-hosted bundles (deploy/sovereign) build a standalone
  // server for Docker. Cloud (Vercel) builds leave this unset — same code,
  // posture switched by env only.
  ...(process.env.NEXT_OUTPUT_STANDALONE === "true"
    ? { output: "standalone" as const }
    : {}),
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
