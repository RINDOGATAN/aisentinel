"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";

export default function OversightPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Eye className="w-6 h-6 text-primary" />
          Human Oversight
        </h1>
        <p className="text-muted-foreground">Approval gates, decision logging & Art. 14 compliance</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <Eye className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Human oversight gates for pre-deploy, post-deploy, periodic reviews, and incident-triggered approvals will be available in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
