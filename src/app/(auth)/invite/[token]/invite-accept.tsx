"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

const ROLE_KEY = {
  OWNER: "roleOwner",
  ADMIN: "roleAdmin",
  AI_OFFICER: "roleAiOfficer",
  MEMBER: "roleMember",
  VIEWER: "roleViewer",
} as const;

export function InviteAccept({ token, email }: { token: string; email: string | null }) {
  const t = useTranslations("invite");
  const tn = useTranslations("nav");
  const router = useRouter();
  const utils = trpc.useUtils();
  const { setOrganization } = useOrganization();
  const preview = trpc.team.preview.useQuery({ token }, { retry: false, refetchOnWindowFocus: false });

  const accept = trpc.team.accept.useMutation({
    onSuccess: async (result) => {
      toast.success(t("accepted", { organization: preview.data?.organizationName ?? "" }));
      // The list held before joining is out of date: read it again.
      await utils.organization.list.invalidate();
      const list = await utils.organization.list.fetch(undefined, { staleTime: 0 });
      const joined = list.find((o) => o.id === result.organizationId);
      if (joined) setOrganization(joined);
      router.replace("/governance");
    },
    onError: (err) => toast.error(err.message),
  });

  const info = preview.data;
  let body: React.ReactNode;
  if (preview.isLoading) {
    body = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {t("loading")}
      </p>
    );
  } else if (preview.isError || !info) {
    body = <p className="text-sm text-muted-foreground">{t("invalid")}</p>;
  } else if (info.state === "expired") {
    body = <p className="text-sm text-muted-foreground">{t("expired")}</p>;
  } else if (info.state !== "pending") {
    body = (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("used")}</p>
        <Button variant="outline" onClick={() => router.replace("/governance")}>
          {t("toDashboard")}
        </Button>
      </div>
    );
  } else if (!info.forThisAccount) {
    body = (
      <div className="space-y-3">
        <p className="text-sm">{t("otherAccount")}</p>
        {email && <p className="text-xs text-muted-foreground break-all">{email}</p>}
        <Button
          variant="outline"
          onClick={() => void signOut({ callbackUrl: `/sign-in?callbackUrl=${encodeURIComponent(`/invite/${token}`)}` })}
        >
          {t("switchAccount")}
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        <p className="text-sm">
          {t("lead", { organization: info.organizationName, role: tn(ROLE_KEY[info.role]) })}
        </p>
        <Button disabled={accept.isPending || accept.isSuccess} onClick={() => accept.mutate({ token })} className="gap-1.5">
          {accept.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="size-4" aria-hidden="true" />
          )}
          {t("accept")}
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md" data-testid="invite-accept">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {info?.organizationName && info.state === "pending" && <CardDescription>{info.organizationName}</CardDescription>}
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
