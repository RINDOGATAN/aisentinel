import type { NextConfig } from "next";
import { readdirSync } from "node:fs";
import createNextIntlPlugin from "next-intl/plugin";
import { buildCommit, latestMigrationName } from "./src/lib/build-info";
import { securityHeaders } from "./src/lib/security-headers";

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
        headers: securityHeaders({ dev: process.env.NODE_ENV === "development" }),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
