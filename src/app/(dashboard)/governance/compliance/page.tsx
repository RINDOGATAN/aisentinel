"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Scale,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
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
import { Checkbox } from "@/components/ui/checkbox";

const statusOptions = [
  { value: "NOT_ASSESSED", label: "Not Assessed", color: "bg-gray-500/20 text-gray-400" },
  { value: "COMPLIANT", label: "Compliant", color: "bg-success/20 text-success" },
  { value: "PARTIALLY_COMPLIANT", label: "Partial", color: "bg-warning/20 text-warning" },
  { value: "NON_COMPLIANT", label: "Non-Compliant", color: "bg-destructive/20 text-destructive" },
  { value: "NOT_APPLICABLE", label: "N/A", color: "bg-gray-500/20 text-gray-500" },
];

const evidenceTypeConfig: Record<string, { label: string; icon: typeof Shield }> = {
  POLICY: { label: "Policy", icon: Shield },
  DOCUMENT: { label: "Document", icon: FileText },
  TEST_RESULT: { label: "Test Result", icon: TestTube },
  MONITORING: { label: "Monitoring", icon: Activity },
  AUDIT: { label: "Audit", icon: ClipboardCheck },
  TRAINING: { label: "Training", icon: GraduationCap },
  APPROVAL: { label: "Approval", icon: ThumbsUp },
  OTHER: { label: "Other", icon: MoreHorizontal },
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
  const rows: string[][] = [["Code", "Title", "Status", "Notes", "Evidence Count"]];

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

export default function CompliancePage() {
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const searchParams = useSearchParams();

  const [selectedFrameworkId, setSelectedFrameworkId] = useState("");
  const [selectedSystemId, setSelectedSystemId] = useState(searchParams.get("systemId") || "");
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());

  const { data: frameworks } = trpc.compliance.listFrameworks.useQuery();
  const { data: systems } = trpc.aiSystem.list.useQuery(
    { organizationId: orgId, limit: 50 },
    { enabled: !!orgId }
  );

  const { data: matrix, refetch: refetchMatrix } = trpc.compliance.getMatrix.useQuery(
    { organizationId: orgId, aiSystemId: selectedSystemId, frameworkId: selectedFrameworkId },
    { enabled: !!orgId && !!selectedSystemId && !!selectedFrameworkId }
  );

  const updateMapping = trpc.compliance.updateMapping.useMutation({
    onSuccess: (result) => {
      refetchMatrix();
      if (result.propagatedCount > 0) {
        // A simple alert is fine for now — could use toast in the future
        console.log(`Propagated to ${result.propagatedCount} linked requirements`);
      }
    },
  });

  const addEvidence = trpc.compliance.addEvidence.useMutation({
    onSuccess: () => refetchMatrix(),
  });

  const removeEvidence = trpc.compliance.removeEvidence.useMutation({
    onSuccess: () => refetchMatrix(),
  });

  const systemList = systems?.items ?? [];

  const toggleExpand = (id: string) => {
    const next = new Set(expandedReqs);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedReqs(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Compliance
          </h1>
          <p className="text-muted-foreground">Map AI system compliance against regulatory frameworks</p>
        </div>
        {matrix && matrix.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportComplianceCSV(matrix as Parameters<typeof exportComplianceCSV>[0])}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select AI System..." />
          </SelectTrigger>
          <SelectContent>
            {systemList.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {frameworks && frameworks.length > 0 && (
        <Tabs
          value={selectedFrameworkId || frameworks[0]?.id}
          onValueChange={setSelectedFrameworkId}
        >
          <TabsList className="overflow-x-auto">
            {frameworks.map((fw) => (
              <TabsTrigger key={fw.id} value={fw.id}>
                {fw.name} ({fw._count.requirements})
              </TabsTrigger>
            ))}
          </TabsList>

          {frameworks.map((fw) => (
            <TabsContent key={fw.id} value={fw.id}>
              {!selectedSystemId ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Select an AI system above to view its compliance matrix.
                  </CardContent>
                </Card>
              ) : !matrix ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    Loading compliance matrix...
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {matrix.map((req) => (
                    <Card key={req.id}>
                      <CardHeader className="p-4 cursor-pointer" onClick={() => toggleExpand(req.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {req.children && req.children.length > 0 ? (
                              expandedReqs.has(req.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            ) : <div className="w-4" />}
                            <span className="font-mono text-sm text-primary">{req.code}</span>
                            <span className="font-medium">{req.title}</span>
                          </div>
                          {req.mapping && (
                            <Badge className={statusOptions.find(s => s.value === req.mapping?.status)?.color}>
                              {statusOptions.find(s => s.value === req.mapping?.status)?.label}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      {expandedReqs.has(req.id) && (
                        <CardContent className="p-4 pt-0 space-y-4">
                          {req.description && (
                            <p className="text-sm text-muted-foreground">{req.description}</p>
                          )}

                          <RequirementRow
                            reqId={req.id}
                            mapping={req.mapping}
                            orgId={orgId}
                            systemId={selectedSystemId}
                            onUpdate={(data) => updateMapping.mutate(data)}
                            onAddEvidence={(data) => addEvidence.mutate(data)}
                            onRemoveEvidence={(data) => removeEvidence.mutate(data)}
                            isUpdatePending={updateMapping.isPending}
                            isEvidencePending={addEvidence.isPending || removeEvidence.isPending}
                          />

                          {req.children?.map((child) => (
                            <div key={child.id} className="ml-6 pl-4 border-l border-border space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono text-xs text-primary">{child.code}</span>
                                  <span className="ml-2 text-sm">{child.title}</span>
                                </div>
                                {child.mapping && (
                                  <Badge className={statusOptions.find(s => s.value === child.mapping?.status)?.color}>
                                    {statusOptions.find(s => s.value === child.mapping?.status)?.label}
                                  </Badge>
                                )}
                              </div>
                              <RequirementRow
                                reqId={child.id}
                                mapping={child.mapping}
                                orgId={orgId}
                                systemId={selectedSystemId}
                                onUpdate={(data) => updateMapping.mutate(data)}
                                onAddEvidence={(data) => addEvidence.mutate(data)}
                                onRemoveEvidence={(data) => removeEvidence.mutate(data)}
                                isUpdatePending={updateMapping.isPending}
                                isEvidencePending={addEvidence.isPending || removeEvidence.isPending}
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
    </div>
  );
}

type StatusValue = "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE" | "NOT_ASSESSED";
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
}: {
  reqId: string;
  mapping: MappingData | null;
  orgId: string;
  systemId: string;
  onUpdate: (data: { organizationId: string; aiSystemId: string; requirementId: string; status: StatusValue; notes?: string; propagateToLinked?: boolean }) => void;
  onAddEvidence: (data: { organizationId: string; aiSystemId: string; requirementId: string; type: EvidenceTypeValue; title: string; url?: string; description?: string }) => void;
  onRemoveEvidence: (data: { organizationId: string; evidenceId: string }) => void;
  isUpdatePending: boolean;
  isEvidencePending: boolean;
}) {
  const [status, setStatus] = useState(mapping?.status ?? "NOT_ASSESSED");
  const [notes, setNotes] = useState(mapping?.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [propagate, setPropagate] = useState(true);

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
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatus(opt.value); setDirty(true); }}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              status === opt.value ? opt.color + " border-current" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Evidence section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Evidence ({evidenceItems.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Evidence
          </Button>
        </div>

        {evidenceItems.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">No evidence attached</p>
        ) : (
          <div className="space-y-1">
            {evidenceItems.map((item) => {
              const config = evidenceTypeConfig[item.type] ?? evidenceTypeConfig.OTHER;
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
                        {config.label}
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
                    <button
                      className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveEvidence({ organizationId: orgId, evidenceId: item.id })}
                      disabled={isEvidencePending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <Textarea
        placeholder="Notes..."
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
        rows={1}
        className="text-sm"
      />

      {/* Cross-framework links */}
      {crossMappings && crossMappings.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            Linked across frameworks ({crossMappings.length})
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
                <span className="font-medium">{cm.frameworkCode === "EU_AI_ACT" ? "EU" : cm.frameworkCode === "NIST_AI_RMF" ? "NIST" : "ISO"}</span>
                <span>{cm.code}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Save (status + notes) */}
      {dirty && (
        <div className="space-y-2">
          {crossMappings && crossMappings.filter((cm) => cm.relationship === "equivalent").length > 0 &&
            (status === "COMPLIANT" || status === "PARTIALLY_COMPLIANT") && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={propagate}
                  onCheckedChange={(v) => setPropagate(!!v)}
                />
                Also apply to {crossMappings.filter((cm) => cm.relationship === "equivalent").length} equivalent requirement{crossMappings.filter((cm) => cm.relationship === "equivalent").length !== 1 ? "s" : ""} across frameworks
              </label>
            )}
          <Button
            size="sm"
            onClick={() => {
              onUpdate({
                organizationId: orgId,
                aiSystemId: systemId,
                requirementId: reqId,
                status: status as StatusValue,
                notes,
                propagateToLinked: propagate,
              });
              setDirty(false);
            }}
            disabled={isUpdatePending}
          >
            {isUpdatePending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
            Save
          </Button>
        </div>
      )}

      {/* Add Evidence Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as EvidenceTypeValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(evidenceTypeConfig).map(([value, { label, icon: TypeIcon }]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <TypeIcon className="w-3.5 h-3.5" />
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Risk Management Policy RMS-001"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Additional details about this evidence..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { resetForm(); setShowAddDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAddEvidence} disabled={!newTitle.trim() || isEvidencePending}>
              {isEvidencePending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
