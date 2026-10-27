"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One AI system's compliance matrix: a tab per framework that has at least
 * one requirement for the system (the others are counted in one line that
 * leads to where the organization's places are declared), each requirement
 * with its status, notes and evidence. The system's page holds it (its
 * Evidence tab); the evidence step lists the systems and links there.
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useOrganization } from "@/lib/organization-context";
import { useExportDownload } from "@/components/governance/use-export-download";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Shield,
  TestTube,
  Activity,
  ClipboardCheck,
  GraduationCap,
  ThumbsUp,
  MoreHorizontal,
  Download,
  Link2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { frameworkName, frameworkShort, requirementCode, requirementDescription, requirementTitle } from "@/config/framework-display";
import type { AdmtScopeState } from "@/config/admt-rules";
import { STATUS_CHIP } from "@/components/ui/status-note";


const statusOptionKeys: Record<string, { labelKey: string; color: string }> = {
  NOT_ASSESSED: { labelKey: "statusNotAssessed", color: "bg-gray-500/20 text-gray-400" },
  COMPLIANT: { labelKey: "statusCompliant", color: STATUS_CHIP.good },
  PARTIALLY_COMPLIANT: { labelKey: "statusPartial", color: STATUS_CHIP.warning },
  NON_COMPLIANT: { labelKey: "statusNonCompliant", color: STATUS_CHIP.danger },
  NOT_APPLICABLE: { labelKey: "statusNotApplicable", color: "bg-gray-500/20 text-gray-500" },
};

const statusOptionValues = ["NOT_ASSESSED", "COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT", "NOT_APPLICABLE"];

const evidenceTypeKeys: Record<string, { labelKey: string; icon: typeof Shield }> = {
  POLICY: { labelKey: "evidencePolicy", icon: Shield },
  DOCUMENT: { labelKey: "evidenceDocument", icon: FileText },
  TEST_RESULT: { labelKey: "evidenceTestResult", icon: TestTube },
  MONITORING: { labelKey: "evidenceMonitoring", icon: Activity },
  AUDIT: { labelKey: "evidenceAudit", icon: ClipboardCheck },
  TRAINING: { labelKey: "evidenceTraining", icon: GraduationCap },
  APPROVAL: { labelKey: "evidenceApproval", icon: ThumbsUp },
  OTHER: { labelKey: "evidenceOther", icon: MoreHorizontal },
};

interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  url?: string | null;
  description?: string | null;
  addedAt: string | Date;
}

interface MappingData {
  id?: string;
  status: string;
  evidence?: string | null;
  notes?: string | null;
  evidenceItems?: EvidenceItem[];
}

function exportComplianceCSV(
  matrixData: Array<{
    code: string;
    title: string;
    mapping: MappingData | null;
    children?: Array<{ code: string; title: string; mapping: MappingData | null }>;
  }>
) {
  const rows: string[][] = [["Code", "Title", "Status", "Notes", "Evidence count"]];

  for (const req of matrixData) {
    const status = req.mapping?.status ?? "NOT_ASSESSED";
    const notes = (req.mapping?.notes ?? "").replace(/"/g, '""');
    const evidenceCount = req.mapping?.evidenceItems?.length ?? 0;
    rows.push([req.code, `"${req.title}"`, status, `"${notes}"`, String(evidenceCount)]);

    if (req.children) {
      for (const child of req.children) {
        const cStatus = child.mapping?.status ?? "NOT_ASSESSED";
        const cNotes = (child.mapping?.notes ?? "").replace(/"/g, '""');
        const cEvidence = child.mapping?.evidenceItems?.length ?? 0;
        rows.push([child.code, `"${child.title}"`, cStatus, `"${cNotes}"`, String(cEvidence)]);
      }
    }
  }

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `compliance-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * The frameworks with at least one requirement for the system, in their usual
 * order: one already mapped to it, or one in scope for it (the counts scoped
 * by the system's ADMT and regime rules). A state framework of a place the
 * organization has not declared scopes to zero and is left out.
 */
export function frameworksWithRequirements<F extends { id: string }>(
  all: readonly F[],
  mapped: readonly { frameworkId: string }[],
  inScope: readonly { frameworkId: string; count: number }[],
): F[] {
  const ids = new Set([
    ...mapped.map((m) => m.frameworkId),
    ...inScope.filter((c) => c.count > 0).map((c) => c.frameworkId),
  ]);
  return all.filter((f) => ids.has(f.id));
}

/**
 * The number on a framework's tab: its requirements in scope for this
 * organisation. A framework with none in scope is shown only because rows were
 * recorded against it before the scope changed (the scope rules never remove
 * a row someone worked on), and its tab counts those rows instead of a zero.
 */
export function tabCount(
  scopedCount: number | undefined,
  seeded: number,
  mapped: readonly { frameworkId: string; compliant: number; partial: number; nonCompliant: number; notApplicable: number; notAssessed: number }[] | undefined,
  frameworkId: string,
): number {
  if (scopedCount === undefined) return seeded;
  if (scopedCount > 0) return scopedCount;
  const row = mapped?.find((m) => m.frameworkId === frameworkId);
  return row ? row.compliant + row.partial + row.nonCompliant + row.notApplicable + row.notAssessed : 0;
}

export function ComplianceMatrix({ aiSystemId }: { aiSystemId: string }) {
  const t = useTranslations("compliance");
  const locale = useLocale();
  const tc = useTranslations("common");
  const { organization, canWrite, canDecide } = useOrganization();
  const { download } = useExportDownload();
  const orgId = organization?.id ?? "";
  const selectedSystemId = aiSystemId;

  // The tab the person picked; until then the first framework, which the tab
  // strip already shows as selected (the matrix query needs a real id).
  const [pickedFrameworkId, setSelectedFrameworkId] = useState("");
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());

  const { data: allFrameworks } = trpc.compliance.listFrameworks.useQuery();
  // Only the frameworks with at least one requirement for this system; the
  // rest (laws of places not declared, frameworks the system's risk level
  // does not reach) are counted in one line.
  const { data: systemScorecard } = trpc.compliance.getSystemScorecard.useQuery(
    { organizationId: orgId, aiSystemId: selectedSystemId },
    { enabled: !!orgId && !!selectedSystemId }
  );
  // California ADMT applicability is decided by the rules layer, per system.
  // Its tags both filter the matrix and drive the scope banner; without them
  // the tab would list every seeded requirement for every system regardless of
  // whether the regime reaches it.
  const { data: admtScope } = trpc.admt.getScope.useQuery(
    { organizationId: orgId, aiSystemId: selectedSystemId },
    { enabled: !!orgId && !!selectedSystemId }
  );


  // Only three of the seven states are answers; the rest mean nobody has
  // decided yet. An undetermined scope must not be scoped down to nothing —
  // that would render "we do not know" as "none of this applies to you" — so
  // its tags are withheld and every requirement stands until someone decides.
  const admtScopeResolved =
    admtScope?.scope.state === "OUT_OF_SCOPE_NO_CA_NEXUS" ||
    admtScope?.scope.state === "ARTICLE_10_ONLY" ||
    admtScope?.scope.state === "ARTICLE_10_AND_11";
  const admtTags = admtScopeResolved ? admtScope.scope.tags : undefined;

  // The regime frameworks (GDPR, Colorado, Texas, Washington) resolve their own
  // scope per system. Same rule as California: only a resolved state narrows
  // the matrix — an UNDETERMINED regime keeps every requirement visible, so
  // "nobody has answered yet" never renders as "none of this applies".
  const { data: regimeScope } = trpc.regimes.getScope.useQuery(
    { organizationId: orgId, aiSystemId: selectedSystemId },
    { enabled: !!orgId && !!selectedSystemId }
  );

  const regimeScopeTags = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const scope of regimeScope?.scopes ?? []) {
      if (scope.state === "UNDETERMINED") continue;
      map[scope.framework] = scope.tags;
    }
    return map;
  }, [regimeScope]);

  const { data: frameworkCounts } = trpc.compliance.getFrameworkCounts.useQuery(
    {
      organizationId: orgId,
      applicabilityTags: admtTags,
      scopedFrameworkCode: "CA_CCPA_ADMT",
      scopes: regimeScopeTags,
      aiSystemId: selectedSystemId,
    },
    { enabled: !!orgId }
  );

  const frameworks = useMemo(
    () =>
      allFrameworks && systemScorecard && frameworkCounts
        ? frameworksWithRequirements(allFrameworks, systemScorecard.frameworks, frameworkCounts)
        : undefined,
    [allFrameworks, systemScorecard, frameworkCounts],
  );
  const hiddenFrameworks = allFrameworks && frameworks ? allFrameworks.length - frameworks.length : 0;
  const selectedFrameworkId =
    (pickedFrameworkId && frameworks?.some((f) => f.id === pickedFrameworkId) ? pickedFrameworkId : "") ||
    frameworks?.[0]?.id ||
    "";

  const selectedFramework = frameworks?.find((f) => f.id === selectedFrameworkId)
    ?? frameworks?.[0];
  const isAdmtFramework = selectedFramework?.code === "CA_CCPA_ADMT";

  const { data: matrix, refetch: refetchMatrix } = trpc.compliance.getMatrix.useQuery(
    {
      organizationId: orgId,
      aiSystemId: selectedSystemId,
      frameworkId: selectedFrameworkId,
      // Only scoped frameworks pass tags; everything else keeps its full matrix.
      applicabilityTags: isAdmtFramework
        ? admtTags
        : selectedFramework
          ? regimeScopeTags[selectedFramework.code]
          : undefined,
    },
    { enabled: !!orgId && !!selectedSystemId && !!selectedFrameworkId }
  );

  // Every save surfaces its outcome: a silent failure reads as the form
  // "stalling". A status is saved on click, and its confirmation offers to
  // put the previous status back; notes keep their Save button.
  const updateMapping = trpc.compliance.updateMapping.useMutation({
    // Propagation to linked requirements is reflected by the matrix refetch.
    onSuccess: () => refetchMatrix(),
    onError: (err) => toast.error(err.message),
  });
  const saveMapping: SaveMapping = (data, undoStatus, onFailed) =>
    updateMapping.mutate(data, {
      onError: () => onFailed?.(),
      onSuccess: (res) => {
        const message =
          res.propagatedCount > 0
            ? t("mappingSavedPropagated", { count: res.propagatedCount })
            : undoStatus !== undefined
              ? t("statusSaved", { status: t(statusOptionKeys[data.status].labelKey) })
              : t("mappingSaved");
        toast.success(
          message,
          undoStatus !== undefined && undoStatus !== data.status
            ? {
                action: {
                  label: t("undo"),
                  onClick: () =>
                    saveMapping({ ...data, status: undoStatus, notes: undefined, propagateToLinked: false }),
                },
              }
            : undefined,
        );
      },
    });

  const addEvidence = trpc.compliance.addEvidence.useMutation({
    onSuccess: () => {
      toast.success(t("evidenceAdded"));
      refetchMatrix();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeEvidence = trpc.compliance.removeEvidence.useMutation({
    onSuccess: () => {
      toast.success(t("evidenceRemoved"));
      refetchMatrix();
    },
    onError: (err) => toast.error(err.message),
  });

  // Several requirements at once (approver roles): the ones ticked, or every
  // one still without a status in the framework shown.
  const [selectedReqs, setSelectedReqs] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string, checked: boolean) =>
    setSelectedReqs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  const unsetIds = useMemo(() => (matrix ? unsetRequirementIds(matrix) : []), [matrix]);
  const bulkSetStatus = trpc.compliance.bulkSetStatus.useMutation({
    onSuccess: (res, vars) => {
      toast.success(
        t("bulkDone", { count: res.updated, status: bulkStatusLabel(t, vars.status) }),
      );
      setSelectedReqs(new Set());
      refetchMatrix();
    },
    onError: (err) => toast.error(err.message),
  });
  const applyBulk = (status: BulkStatus, requirementIds: string[], onlyUnset: boolean) => {
    if (requirementIds.length === 0 || bulkSetStatus.isPending) return;
    bulkSetStatus.mutate({ organizationId: orgId, aiSystemId: selectedSystemId, requirementIds, status, onlyUnset });
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedReqs);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedReqs(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("matrixIntro")}</p>
        {matrix && matrix.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {tc("export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  const fw = frameworks?.find((f) => f.id === (selectedFrameworkId || frameworks[0]?.id));
                  if (fw && selectedSystemId && organization?.id) {
                    void download(
                      `/api/export/compliance-summary?organizationId=${organization.id}&aiSystemId=${selectedSystemId}&frameworkId=${fw.id}`,
                    );
                  }
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("downloadPdf")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportComplianceCSV(matrix as Parameters<typeof exportComplianceCSV>[0])}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t("exportCsv")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {frameworks && frameworks.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("noFrameworkForSystem")}</CardContent>
        </Card>
      )}

      {frameworks && frameworks.length > 0 && (
        <Tabs
          value={selectedFrameworkId || frameworks[0]?.id}
          onValueChange={(id) => {
            setSelectedFrameworkId(id);
            setSelectedReqs(new Set());
          }}
        >
          {/* Nine frameworks with long names do not fit a phone: the bar
              scrolls inside itself and the tabs keep their width, rather than
              shrinking until one covers the next and cannot be tapped. */}
          <TabsList className="w-full max-w-full justify-start overflow-x-auto">
            {frameworks.map((fw) => {
              // Prefer the org-scoped count: a scoped framework must not
              // advertise requirements that do not reach this organization.
              const scoped = frameworkCounts?.find(
                (c) => c.frameworkId === fw.id,
              );
              return (
                <TabsTrigger key={fw.id} value={fw.id} className="flex-none">
                  {frameworkName(fw.code, fw.name, locale)} (
                  {tabCount(scoped?.count, fw._count.requirements, systemScorecard?.frameworks, fw.id)})
                </TabsTrigger>
              );
            })}
          </TabsList>

          {frameworks.map((fw) => (
            <TabsContent key={fw.id} value={fw.id}>
              {fw.code === "CA_CCPA_ADMT" && selectedSystemId && admtScope && (
                <AdmtScopeBanner state={admtScope.scope.state} />
              )}
              {frameworkCounts?.find((c) => c.frameworkId === fw.id)?.count === 0 && (
                <p className="mb-3 text-xs text-muted-foreground" data-testid="framework-kept-only">
                  {t("frameworkKeptOnly")}
                </p>
              )}
              {!matrix ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    {t("loadingMatrix")}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {canDecide && matrix.length > 0 && (
                    <BulkStatusBar
                      selectedCount={selectedReqs.size}
                      unsetCount={unsetIds.length}
                      pending={bulkSetStatus.isPending}
                      onApplySelected={(status) => applyBulk(status, [...selectedReqs], false)}
                      onApplyUnset={(status) => applyBulk(status, unsetIds, true)}
                    />
                  )}
                  {matrix.map((req) => (
                    <Card key={req.id}>
                      <CardHeader className="p-4 cursor-pointer" onClick={() => toggleExpand(req.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {canDecide && (
                              <Checkbox
                                checked={selectedReqs.has(req.id)}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={(checked) => toggleSelected(req.id, checked === true)}
                                aria-label={t("bulkSelect", { code: requirementCode(fw.code, req.code, locale) })}
                              />
                            )}
                            {req.children && req.children.length > 0 ? (
                              expandedReqs.has(req.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            ) : <div className="w-4" />}
                            <span className="font-mono text-sm text-primary">{requirementCode(fw.code, req.code, locale)}</span>
                            <span className="font-medium">{requirementTitle(fw.code, req.code, req.title, locale)}</span>
                          </div>
                          {req.mapping && (
                            <Badge className={statusOptionKeys[req.mapping?.status ?? ""]?.color}>
                              {statusOptionKeys[req.mapping?.status ?? ""] ? t(statusOptionKeys[req.mapping?.status ?? ""].labelKey) : req.mapping?.status}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      {expandedReqs.has(req.id) && (
                        <CardContent className="p-4 pt-0 space-y-4">
                          {req.description && (
                            <p className="text-sm text-muted-foreground">{requirementDescription(fw.code, req.code, req.description, locale)}</p>
                          )}

                          <RequirementRow
                            reqId={req.id}
                            mapping={req.mapping}
                            orgId={orgId}
                            systemId={selectedSystemId}
                            onUpdate={saveMapping}
                            onAddEvidence={(data) => addEvidence.mutate(data)}
                            onRemoveEvidence={(data) => removeEvidence.mutate(data)}
                            isUpdatePending={updateMapping.isPending}
                            isEvidencePending={addEvidence.isPending || removeEvidence.isPending}
                            canWrite={canWrite}
                          />

                          {req.children?.map((child) => (
                            <div key={child.id} className="ml-6 pl-4 border-l border-border space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {canDecide && (
                                    <Checkbox
                                      checked={selectedReqs.has(child.id)}
                                      onCheckedChange={(checked) => toggleSelected(child.id, checked === true)}
                                      aria-label={t("bulkSelect", { code: requirementCode(fw.code, child.code, locale) })}
                                    />
                                  )}
                                  <span className="font-mono text-xs text-primary">{requirementCode(fw.code, child.code, locale)}</span>
                                  <span className="ml-2 text-sm">{requirementTitle(fw.code, child.code, child.title, locale)}</span>
                                </div>
                                {child.mapping && (
                                  <Badge className={statusOptionKeys[child.mapping?.status ?? ""]?.color}>
                                    {statusOptionKeys[child.mapping?.status ?? ""] ? t(statusOptionKeys[child.mapping?.status ?? ""].labelKey) : child.mapping?.status}
                                  </Badge>
                                )}
                              </div>
                              <RequirementRow
                                reqId={child.id}
                                mapping={child.mapping}
                                orgId={orgId}
                                systemId={selectedSystemId}
                                onUpdate={saveMapping}
                                onAddEvidence={(data) => addEvidence.mutate(data)}
                                onRemoveEvidence={(data) => removeEvidence.mutate(data)}
                                isUpdatePending={updateMapping.isPending}
                                isEvidencePending={addEvidence.isPending || removeEvidence.isPending}
                                canWrite={canWrite}
                              />
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {hiddenFrameworks > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="frameworks-not-shown">
          {t("frameworksNotShown", { count: hiddenFrameworks })}{" "}
          <Link href="/governance/settings" className="text-primary underline-offset-4 hover:underline">
            {t("frameworksNotShownLink")}
          </Link>
        </p>
      )}
    </div>
  );
}

/** The statuses the bulk action can set (compliance.bulkSetStatus). Not applicable first: the usual case. */
const BULK_STATUSES = ["NOT_APPLICABLE", "COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT"] as const;
type BulkStatus = (typeof BULK_STATUSES)[number];
/** "Not applicable" in full: the matrix badge abbreviates it. */
function bulkStatusLabel(t: (key: string) => string, status: BulkStatus): string {
  return status === "NOT_APPLICABLE" ? t("bulkNotApplicable") : t(statusOptionKeys[status].labelKey);
}

/** The requirements in a matrix (parents and children) with no status yet. */
export function unsetRequirementIds(
  matrix: ReadonlyArray<{
    id: string;
    mapping: { status: string } | null;
    children?: ReadonlyArray<{ id: string; mapping: { status: string } | null }>;
  }>,
): string[] {
  const unset = (m: { status: string } | null) => (m?.status ?? "NOT_ASSESSED") === "NOT_ASSESSED";
  const out: string[] = [];
  for (const req of matrix) {
    if (unset(req.mapping)) out.push(req.id);
    for (const child of req.children ?? []) if (unset(child.mapping)) out.push(child.id);
  }
  return out;
}

function BulkStatusBar({
  selectedCount,
  unsetCount,
  pending,
  onApplySelected,
  onApplyUnset,
}: {
  selectedCount: number;
  unsetCount: number;
  pending: boolean;
  onApplySelected: (status: BulkStatus) => void;
  onApplyUnset: (status: BulkStatus) => void;
}) {
  const t = useTranslations("compliance");
  const [status, setStatus] = useState<BulkStatus>("NOT_APPLICABLE");
  return (
    <Card data-testid="bulk-status">
      <CardContent className="flex flex-wrap items-center gap-2 p-3">
        <span className="text-sm text-muted-foreground">{t("bulkLabel")}</span>
        <Select value={status} onValueChange={(v) => setStatus(v as BulkStatus)}>
          <SelectTrigger className="w-full sm:w-44" aria-label={t("bulkStatusLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BULK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {bulkStatusLabel(t, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || selectedCount === 0}
          onClick={() => onApplySelected(status)}
        >
          {t("bulkApplySelected", { count: selectedCount })}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || unsetCount === 0}
          onClick={() => onApplyUnset(status)}
        >
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("bulkApplyUnset", { count: unsetCount })}
        </Button>
      </CardContent>
    </Card>
  );
}

type StatusValue = "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE" | "NOT_ASSESSED";
type MappingUpdate = { organizationId: string; aiSystemId: string; requirementId: string; status: StatusValue; notes?: string; propagateToLinked?: boolean };
/**
 * Save a mapping. With `undoStatus`, the confirmation offers to put that status
 * back; `onFailed` runs when the save is refused.
 */
type SaveMapping = (data: MappingUpdate, undoStatus?: StatusValue, onFailed?: () => void) => void;
type EvidenceTypeValue = "POLICY" | "DOCUMENT" | "TEST_RESULT" | "MONITORING" | "AUDIT" | "TRAINING" | "APPROVAL" | "OTHER";

function RequirementRow({
  reqId,
  mapping,
  orgId,
  systemId,
  onUpdate,
  onAddEvidence,
  onRemoveEvidence,
  isUpdatePending,
  isEvidencePending,
  canWrite,
}: {
  reqId: string;
  mapping: MappingData | null;
  orgId: string;
  systemId: string;
  onUpdate: SaveMapping;
  onAddEvidence: (data: { organizationId: string; aiSystemId: string; requirementId: string; type: EvidenceTypeValue; title: string; url?: string; description?: string }) => void;
  onRemoveEvidence: (data: { organizationId: string; evidenceId: string }) => void;
  isUpdatePending: boolean;
  isEvidencePending: boolean;
  /** Viewers (and read-only pilot organizations) see the record without the controls. */
  canWrite: boolean;
}) {
  const t = useTranslations("compliance");
  const locale = useLocale();
  const tc = useTranslations("common");
  const savedStatus = (mapping?.status ?? "NOT_ASSESSED") as StatusValue;
  const [status, setStatus] = useState<StatusValue>(savedStatus);
  const [notes, setNotes] = useState(mapping?.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  // An undo, or another tab's save, arrives through the refetched mapping.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(savedStatus);
  }, [savedStatus]);

  const base = { organizationId: orgId, aiSystemId: systemId, requirementId: reqId };
  const pickStatus = (value: StatusValue) => {
    if (value === status || isUpdatePending) return;
    setStatus(value);
    onUpdate({ ...base, status: value }, savedStatus, () => setStatus(savedStatus));
  };

  const { data: crossMappings } = trpc.compliance.getCrossMappedRequirements.useQuery(
    { organizationId: orgId, requirementId: reqId },
    { enabled: !!orgId }
  );

  // Add evidence form state
  const [newType, setNewType] = useState<EvidenceTypeValue>("DOCUMENT");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const evidenceItems = mapping?.evidenceItems ?? [];

  const resetForm = () => {
    setNewType("DOCUMENT");
    setNewTitle("");
    setNewUrl("");
    setNewDescription("");
  };

  const handleAddEvidence = () => {
    if (!newTitle.trim()) return;
    onAddEvidence({
      organizationId: orgId,
      aiSystemId: systemId,
      requirementId: reqId,
      type: newType,
      title: newTitle.trim(),
      url: newUrl.trim() || undefined,
      description: newDescription.trim() || undefined,
    });
    resetForm();
    setShowAddDialog(false);
  };

  return (
    <div className="space-y-3">
      {/* Status pills */}
      <div className="flex flex-wrap gap-1">
        {statusOptionValues.map((value) => {
          const opt = statusOptionKeys[value];
          return (
            <button
              key={value}
              disabled={!canWrite}
              aria-pressed={status === value}
              onClick={() => pickStatus(value as StatusValue)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                status === value ? opt.color + " border-current" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Evidence section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("evidenceCount", { count: evidenceItems.length })}
          </span>
          {canWrite && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              {t("addEvidence")}
            </Button>
          )}
        </div>

        {evidenceItems.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">{t("noEvidenceAttached")}</p>
        ) : (
          <div className="space-y-1">
            {evidenceItems.map((item) => {
              const config = evidenceTypeKeys[item.type] ?? evidenceTypeKeys.OTHER;
              const Icon = config.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50 group"
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                        {tc(config.labelKey)}
                      </Badge>
                      <span className="text-sm truncate">{item.title}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {canWrite && (
                      <button
                        className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveEvidence({ organizationId: orgId, evidenceId: item.id })}
                        disabled={isEvidencePending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <Textarea
        placeholder={t("notesPlaceholder")}
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
        readOnly={!canWrite}
        rows={1}
        className="text-sm"
      />

      {/* Cross-framework links */}
      {crossMappings && crossMappings.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            {t("linkedAcrossFrameworks", { count: crossMappings.length })}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {crossMappings.map((cm) => (
              <span
                key={cm.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                  cm.relationship === "equivalent"
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-border text-muted-foreground"
                }`}
                title={cm.notes ?? undefined}
              >
                <span className="font-medium">{frameworkShort(cm.frameworkCode, locale)}</span>
                <span>{requirementCode(cm.frameworkCode, cm.code, locale)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* The status was saved on click. Applying it to the equivalent
          requirements of other frameworks is a separate, explicit step. */}
      {canWrite &&
        status === savedStatus &&
        (status === "COMPLIANT" || status === "PARTIALLY_COMPLIANT") &&
        crossMappings &&
        crossMappings.filter((cm) => cm.relationship === "equivalent").length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isUpdatePending}
            onClick={() => onUpdate({ ...base, status, propagateToLinked: true })}
          >
            <Link2 className="w-3 h-3 mr-1" />
            {t("alsoApplyToEquivalent", {
              count: crossMappings.filter((cm) => cm.relationship === "equivalent").length,
            })}
          </Button>
        )}

      {/* Save (notes) */}
      {notesDirty && (
        <Button
          size="sm"
          onClick={() => {
            onUpdate({ ...base, status, notes });
            setNotesDirty(false);
          }}
          disabled={isUpdatePending}
        >
          {isUpdatePending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
          {t("saveNotes")}
        </Button>
      )}

      {/* Add Evidence Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addEvidenceDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("typeLabel")}</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as EvidenceTypeValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(evidenceTypeKeys).map(([value, { labelKey, icon: TypeIcon }]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <TypeIcon className="w-3.5 h-3.5" />
                        {tc(labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("titleLabel")}</Label>
              <Input
                placeholder={t("titlePlaceholder")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("urlLabel")}</Label>
              <Input
                placeholder={t("urlPlaceholder")}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("descriptionLabel")}</Label>
              <Textarea
                placeholder={t("descriptionPlaceholder")}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { resetForm(); setShowAddDialog(false); }}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleAddEvidence} disabled={!newTitle.trim() || isEvidencePending}>
              {isEvidencePending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
              {tc("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Scope banner for the California ADMT tab.
 *
 * The copy discipline matters more than the styling: an undetermined state is
 * rendered neutrally and names the question that would resolve it. It is never
 * dressed up as "does not apply", because telling an organization that
 * California is irrelevant when nobody has checked is the failure this whole
 * feature exists to prevent.
 */
function AdmtScopeBanner({ state }: { state: AdmtScopeState }) {
  const t = useTranslations("admt");

  const tone =
    state === "ARTICLE_10_AND_11"
      ? "border-warning bg-warning/10"
      : state === "ARTICLE_10_ONLY"
        ? "border-success bg-success/10"
        : state === "JURISDICTION_CONFLICT"
          ? "border-destructive bg-destructive/10"
          : state === "OUT_OF_SCOPE_NO_CA_NEXUS"
            ? "border-border bg-background"
            : "border-border bg-muted/40";

  const needsSettings =
    state === "JURISDICTION_UNDECLARED" ||
    state === "COVERED_BUSINESS_NOT_ASSESSED" ||
    state === "JURISDICTION_CONFLICT";

  return (
    <div className={`rounded-md border p-3 mb-4 space-y-1 ${tone}`}>
      <p className="text-sm font-medium">{t(`state.${state}`)}</p>
      <p className="text-xs">{t(`stateDetail.${state}`)}</p>
      {needsSettings && (
        <Link
          href="/governance/settings"
          className="text-xs text-primary hover:underline inline-block"
        >
          {t("ui.resolveLink")}
        </Link>
      )}
    </div>
  );
}
