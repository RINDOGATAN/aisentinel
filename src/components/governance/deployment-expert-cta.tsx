"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Server, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { features } from "@/config/features";

const DISMISS_KEY = "ais-deployment-cta-dismissed";

export function DeploymentExpertCta() {
  const t = useTranslations("experts");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (features.expertDirectoryEnabled && localStorage.getItem(DISMISS_KEY) !== "1") {
      // SSR-safe mount-only reveal; localStorage cannot be read during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="border rounded-lg px-4 py-3 bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Server className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <span className="text-sm font-medium">{t("deploymentCtaTitle")}</span>
          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{t("deploymentCtaDescription")}</span>
          <p className="text-xs text-muted-foreground sm:hidden">{t("deploymentCtaDescription")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-7 sm:ml-0">
        <Link href="/governance/experts?specialization=Self-Hosting+%2F+Deployment">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            {t("deploymentCtaButton")}
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
