"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUserType } from "@/lib/use-user-type";
import { toast } from "sonner";
import type { UserType } from "@prisma/client";

// In-house counsel, compliance leads and DPOs are governance professionals
// too, so the choice is framed by whose AI is governed, not by job title.
// Enum values predate the wording.
const personas = [
  {
    type: "BUSINESS_USER" as UserType,
    icon: Building2,
    titleKey: "personaOwnTitle",
    descriptionKey: "personaOwnDescription",
  },
  {
    type: "AI_GOVERNANCE_CONSULTANT" as UserType,
    icon: Briefcase,
    titleKey: "personaClientsTitle",
    descriptionKey: "personaClientsDescription",
  },
] as const;

export function PersonaSelector() {
  const [selected, setSelected] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshSession } = useUserType();
  const t = useTranslations("onboarding");

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
      toast.error(t("genericError"));
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
          <h1 className="text-xl font-semibold">{t("personaTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("personaSubtitle")}</p>
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
                    <p className="font-medium">{t(persona.titleKey)}</p>
                    <p className="text-sm text-muted-foreground">{t(persona.descriptionKey)}</p>
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
              {t("settingUp")}
            </>
          ) : (
            t("continue")
          )}
        </Button>
      </div>
    </div>
  );
}
