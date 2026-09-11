"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useUserType } from "@/lib/use-user-type";

export function OrganizationSetup() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setOrganization, refetchOrganizations } = useOrganization();
  const router = useRouter();
  const t = useTranslations("onboarding");
  // A consultant's first organization is their first client; more are added
  // later from My clients. Same flow, words that match what they are doing.
  const { isConsultant } = useUserType();

  const createOrg = trpc.organization.create.useMutation({
    onSuccess: (org) => {
      setOrganization(org);
      refetchOrganizations();
      // A new organization has nothing in it yet: the wizard is the next
      // useful screen, not an empty dashboard.
      router.push("/governance/quickstart");
    },
  });

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      // The server makes the slug unique; a name that yields too short a
      // slug (e.g. only non-Latin characters) still gets a valid one.
      const base = generateSlug(name);
      const slug = base.length >= 2 ? base.slice(0, 40) : "org";
      await createOrg.mutateAsync({ name: name.trim(), slug });
    } catch (error) {
      console.error("Failed to create organization:", error);
      toast.error(t("createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <img src="/logo-negative.svg" alt="TODO.LAW" style={{ height: "28px", width: "auto" }} />
            <span className="text-lg tracking-tight text-muted-foreground" style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}>AI SENTINEL</span>
          </div>
          <CardTitle>{t("welcomeTitle")}</CardTitle>
          <CardDescription>{isConsultant ? t("orgDescriptionClient") : t("orgDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">{isConsultant ? t("orgNameLabelClient") : t("orgNameLabel")}</Label>
              <Input
                id="org-name"
                placeholder={t("orgNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                t("createAndContinue")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
