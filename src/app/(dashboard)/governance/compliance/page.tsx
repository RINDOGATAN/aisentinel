"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, ChevronDown, ChevronRight, Save, Loader2 } from "lucide-react";

const statusOptions = [
  { value: "NOT_ASSESSED", label: "Not Assessed", color: "bg-gray-500/20 text-gray-400" },
  { value: "COMPLIANT", label: "Compliant", color: "bg-green-500/20 text-green-400" },
  { value: "PARTIALLY_COMPLIANT", label: "Partial", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "NON_COMPLIANT", label: "Non-Compliant", color: "bg-red-500/20 text-red-400" },
  { value: "NOT_APPLICABLE", label: "N/A", color: "bg-gray-500/20 text-gray-500" },
];

export default function CompliancePage() {
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";

  const [selectedFrameworkId, setSelectedFrameworkId] = useState("");
  const [selectedSystemId, setSelectedSystemId] = useState("");
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
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedSystemId}
          onChange={(e) => setSelectedSystemId(e.target.value)}
          className="input-brutal flex-1"
        >
          <option value="">Select AI System...</option>
          {systemList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
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
                            isPending={updateMapping.isPending}
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
                                isPending={updateMapping.isPending}
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

interface MappingData {
  id?: string;
  status: string;
  evidence?: string | null;
  notes?: string | null;
}

function RequirementRow({
  reqId,
  mapping,
  orgId,
  systemId,
  onUpdate,
  isPending,
}: {
  reqId: string;
  mapping: MappingData | null;
  orgId: string;
  systemId: string;
  onUpdate: (data: { organizationId: string; aiSystemId: string; requirementId: string; status: "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE" | "NOT_ASSESSED"; evidence?: string; notes?: string }) => void;
  isPending: boolean;
}) {
  const [status, setStatus] = useState(mapping?.status ?? "NOT_ASSESSED");
  const [evidence, setEvidence] = useState(mapping?.evidence ?? "");
  const [notes, setNotes] = useState(mapping?.notes ?? "");
  const [dirty, setDirty] = useState(false);

  return (
    <div className="space-y-2">
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
      <Textarea
        placeholder="Evidence..."
        value={evidence}
        onChange={(e) => { setEvidence(e.target.value); setDirty(true); }}
        rows={2}
        className="text-sm"
      />
      <Textarea
        placeholder="Notes..."
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
        rows={1}
        className="text-sm"
      />
      {dirty && (
        <Button
          size="sm"
          onClick={() => {
            onUpdate({
              organizationId: orgId,
              aiSystemId: systemId,
              requirementId: reqId,
              status: status as "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE" | "NOT_ASSESSED",
              evidence,
              notes,
            });
            setDirty(false);
          }}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
          Save
        </Button>
      )}
    </div>
  );
}
