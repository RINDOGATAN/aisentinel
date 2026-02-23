"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-primary" />
          AI Incidents
        </h1>
        <p className="text-muted-foreground">Track AI-specific failures, severity, timeline & Art. 62 notifications</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            AI incident management for hallucinations, bias, model drift, adversarial attacks, and authority notifications will be available in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
