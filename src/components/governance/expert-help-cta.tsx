"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useUserType } from "@/lib/use-user-type";
import { features } from "@/config/features";

type CtaContext =
  | "assessment"
  | "incident"
  | "high-risk"
  | "general"
  | "quickstart";

const contextHeadings: Record<CtaContext, string> = {
  assessment: "Need help with your assessment?",
  incident: "Need expert help with this incident?",
  "high-risk": "Managing high-risk AI systems?",
  general: "Need AI governance guidance?",
  quickstart: "New to the EU AI Act?",
};

const contextBodies: Record<CtaContext, string> = {
  assessment: "Connect with a certified AI governance expert who can guide you through conformity assessments and compliance requirements.",
  incident: "An AI governance expert can help you investigate, remediate, and document this incident according to regulatory requirements.",
  "high-risk": "Get expert guidance on managing high-risk AI systems, including conformity assessments, risk mitigation, and ongoing compliance.",
  general: "Browse our directory of certified AI governance professionals who can help with your compliance and risk management needs.",
  quickstart: "Connect with an EU AI Act expert who can help you understand your obligations and build a compliance roadmap.",
};

const contextQueries: Partial<Record<CtaContext, string>> = {
  assessment: "conformity assessment",
  incident: "incident response",
  "high-risk": "AI risk management",
  quickstart: "EU AI Act",
};

export function ExpertHelpCta({ context }: { context: CtaContext }) {
  const { isBusinessUser } = useUserType();

  if (!isBusinessUser || !features.expertDirectoryEnabled) return null;

  const query = contextQueries[context];
  const href = query
    ? `/governance/experts?query=${encodeURIComponent(query)}`
    : "/governance/experts";

  return (
    <Card className="border border-primary">
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="p-2 rounded-lg bg-muted shrink-0">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium">{contextHeadings[context]}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{contextBodies[context]}</p>
        </div>
        <Link href={href}>
          <Button variant="outline" size="sm" className="shrink-0 gap-2">
            <Search className="w-3.5 h-3.5" />
            Find Expert
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
