"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUserType } from "@/lib/use-user-type";
import { toast } from "sonner";
import type { UserType } from "@prisma/client";

const personas = [
  {
    type: "BUSINESS_USER" as UserType,
    icon: Building2,
    title: "Business User",
    description: "I need AI governance for my organization",
  },
  {
    type: "AI_GOVERNANCE_CONSULTANT" as UserType,
    icon: Briefcase,
    title: "AI Governance Consultant",
    description: "I advise multiple organizations on AI governance",
  },
] as const;

export function PersonaSelector() {
  const [selected, setSelected] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshSession } = useUserType();

  const setUserType = trpc.user.setUserType.useMutation({
    onSuccess: async () => {
      await refreshSession();
    },
  });

  const handleContinue = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await setUserType.mutateAsync({ userType: selected });
    } catch (error) {
      console.error("Failed to set user type:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo-negative.svg" alt="TODO.LAW" style={{ height: "28px", width: "auto" }} />
            <span className="text-lg tracking-tight" style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}>AI SENTINEL</span>
          </div>
          <h1 className="text-xl font-semibold">How will you use AI SENTINEL?</h1>
          <p className="text-sm text-muted-foreground">
            This helps us tailor your experience. You can change this later in settings.
          </p>
        </div>

        <div className="grid gap-3">
          {personas.map((persona) => {
            const Icon = persona.icon;
            const isSelected = selected === persona.type;
            return (
              <Card
                key={persona.type}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary ring-1 ring-primary"
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelected(persona.type)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className={`p-3 rounded-lg shrink-0 ${
                      isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">{persona.title}</p>
                    <p className="text-sm text-muted-foreground">{persona.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          className="w-full"
          disabled={!selected || isSubmitting}
          onClick={handleContinue}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
