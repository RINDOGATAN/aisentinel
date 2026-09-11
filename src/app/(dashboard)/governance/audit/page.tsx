"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The audit trail, readable and exportable.
 *
 * Written by the actions themselves; this page only reads. Restricted to
 * owners, admins and AI officers (enforced server-side in audit.list), because
 * it is a record about colleagues as much as about systems.
 *
 * The recorded detail is shown verbatim rather than prettified: a trail that
 * has been rewritten for presentation is worth less than one that has not.
 */

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ScrollText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

const READER_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];
const ALL = "ALL";

/** Codes are shown as written; only the separators are made readable. */
function humanizeCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function detailOf(changes: unknown, metadata: unknown): string {
  const parts: string[] = [];
  if (changes && typeof changes === "object") parts.push(JSON.stringify(changes));
  if (metadata && typeof metadata === "object") parts.push(JSON.stringify(metadata));
  return parts.join(" · ");
}

export default function AuditTrailPage() {
  const t = useTranslations("audit");
  const { organization, userRole } = useOrganization();
  const orgId = organization?.id ?? "";
  const canRead = userRole !== null && READER_ROLES.includes(userRole);

  const [action, setAction] = useState<string>(ALL);
  const [entityType, setEntityType] = useState<string>(ALL);
  const [actor, setActor] = useState<string>(ALL);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const filters = useMemo(
    () => ({
      action: action === ALL ? undefined : action,
      entityType: entityType === ALL ? undefined : entityType,
      userId: actor === ALL ? undefined : actor,
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      // An end date means the whole of that day.
      to: to ? new Date(`${to}T23:59:59.999`) : undefined,
    }),
    [action, entityType, actor, from, to],
  );

  const { data: facets } = trpc.audit.facets.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId && canRead },
  );

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage } =
    trpc.audit.list.useInfiniteQuery(
      { organizationId: orgId, ...filters },
      {
        enabled: !!orgId && canRead,
        getNextPageParam: (last) => last.nextCursor,
      },
    );

  const entries = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.entries),
    [data],
  );

  const filtered =
    action !== ALL || entityType !== ALL || actor !== ALL || !!from || !!to;

  const exportHref = () => {
    const p = new URLSearchParams({ organizationId: orgId });
    if (filters.action) p.set("action", filters.action);
    if (filters.entityType) p.set("entityType", filters.entityType);
    if (filters.userId) p.set("userId", filters.userId);
    if (filters.from) p.set("from", filters.from.toISOString());
    if (filters.to) p.set("to", filters.to.toISOString());
    return `/api/export/audit-log?${p.toString()}`;
  };

  if (!canRead) {
    return (
      <div className="max-w-4xl">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("restricted")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <a href={exportHref()}>
            <Download className="w-4 h-4 mr-1.5" />
            {t("export")}
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("filters.action")}</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.all")}</SelectItem>
                {(facets?.actions ?? []).map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {humanizeCode(a.value)} ({a.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("filters.entityType")}</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.all")}</SelectItem>
                {(facets?.entityTypes ?? []).map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.value} ({e.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("filters.actor")}</Label>
            <Select value={actor} onValueChange={setActor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.all")}</SelectItem>
                {(facets?.actors ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name ?? a.email ?? a.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="audit-from">
              {t("filters.from")}
            </Label>
            <Input
              id="audit-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="audit-to">
              {t("filters.to")}
            </Label>
            <Input
              id="audit-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {facets && (
          <span>{t("showing", { count: entries.length, total: facets.total })}</span>
        )}
        {facets?.earliest && (
          <span>
            {t("since", { date: new Date(facets.earliest).toLocaleDateString() })}
          </span>
        )}
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAction(ALL);
              setEntityType(ALL);
              setActor(ALL);
              setFrom("");
              setTo("");
            }}
          >
            {t("filters.clear")}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("exportHint")}</p>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {filtered ? t("emptyFiltered") : t("empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium whitespace-nowrap">{t("columns.when")}</th>
                    <th className="p-3 font-medium">{t("columns.who")}</th>
                    <th className="p-3 font-medium">{t("columns.action")}</th>
                    <th className="p-3 font-medium">{t("columns.entity")}</th>
                    <th className="p-3 font-medium">{t("columns.detail")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const detail = detailOf(e.changes, e.metadata);
                    return (
                      <tr key={e.id} className="border-b last:border-0 align-top">
                        <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          {e.actorName ?? e.actorEmail ?? (
                            <span className="text-muted-foreground italic">
                              {t("actorRemoved")}
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">{humanizeCode(e.action)}</td>
                        <td className="p-3 text-xs">
                          <div>{e.entityType}</div>
                          <div className="text-muted-foreground font-mono">{e.entityId}</div>
                        </td>
                        <td className="p-3 text-xs font-mono break-all max-w-md">
                          {detail || (
                            <span className="text-muted-foreground italic font-sans">
                              {t("noDetail")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetching}>
            {isFetching && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
