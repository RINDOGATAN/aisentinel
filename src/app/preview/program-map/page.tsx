// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Dev-only design preview for the governance map — renders the shared mock
 * fixture without a database, mirroring DPO Central's flow-map preview
 * pattern. 404s unless ENABLE_PREVIEW_ROUTES=true.
 */

import { notFound } from "next/navigation";
import { ProgramMap } from "@/components/governance/program/ProgramMap";
import { MOCK_PROGRAM_GRAPH } from "@/lib/program-map/__fixtures__/mock-graph";

export default function ProgramMapPreviewPage() {
  if (process.env.ENABLE_PREVIEW_ROUTES !== "true") notFound();

  return (
    <div className="min-h-screen bg-background p-8 space-y-4">
      <h1 className="text-lg font-semibold">Program map preview (mock data)</h1>
      <div className="max-w-6xl">
        <ProgramMap graph={MOCK_PROGRAM_GRAPH} />
      </div>
    </div>
  );
}
