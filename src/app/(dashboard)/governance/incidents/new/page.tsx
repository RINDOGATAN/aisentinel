"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

const incidentTypes = [
  { value: "HALLUCINATION", label: "Hallucination" },
  { value: "BIAS_DISCRIMINATION", label: "Bias/Discrimination" },
  { value: "MODEL_DRIFT", label: "Model Drift" },
  { value: "ADVERSARIAL_ATTACK", label: "Adversarial Attack" },
  { value: "PROMPT_INJECTION", label: "Prompt Injection" },
  { value: "UNAUTHORIZED_ACCESS", label: "Unauthorized Access" },
  { value: "SAFETY_FAILURE", label: "Safety Failure" },
  { value: "PERFORMANCE_DEGRADATION", label: "Performance Degradation" },
  { value: "DATA_POISONING", label: "Data Poisoning" },
  { value: "PRIVACY_VIOLATION", label: "Privacy Violation" },
  { value: "OTHER", label: "Other" },
];

const severities = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export default function NewIncidentPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    severity: "",
    aiSystemId: "",
    notificationRequired: false,
    dpoCentralIncidentId: "",
  });

  const utils = trpc.useUtils();

  const { data: systemsPages } = trpc.aiSystem.list.useInfiniteQuery(
    {
      organizationId: organization?.id ?? "",
      limit: 50,
    },
    {
      enabled: !!organization?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const aiSystems = systemsPages?.pages.flatMap((p) => p.items) ?? [];

  const createIncident = trpc.incident.create.useMutation({
    onSuccess: (data) => {
      toast.success("Incident reported successfully");
      utils.incident.list.invalidate();
      utils.incident.getStats.invalidate();
      router.push(`/governance/incidents/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to report incident");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.title || !formData.description || !formData.type || !formData.severity) return;

    setIsSubmitting(true);

    createIncident.mutate({
      organizationId: organization.id,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      severity: formData.severity,
      aiSystemId: formData.aiSystemId || undefined,
      notificationRequired: formData.notificationRequired,
      dpoCentralIncidentId: formData.dpoCentralIncidentId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance/incidents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Report Incident</h1>
          <p className="text-sm text-muted-foreground">
            Report a new AI incident for investigation and tracking
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
          <CardDescription>
            Provide information about the AI incident being reported
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Incident Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Chatbot generating harmful content"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the incident in detail: what happened, when it was detected, the impact observed..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Type & Severity */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Incident Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {severities.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI System */}
            <div className="space-y-2">
              <Label htmlFor="aiSystem">AI System (Optional)</Label>
              <Select
                value={formData.aiSystemId}
                onValueChange={(value) => setFormData({ ...formData, aiSystemId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select affected AI system" />
                </SelectTrigger>
                <SelectContent>
                  {aiSystems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this incident to a registered AI system
              </p>
            </div>

            {/* Notification Required */}
            <div className="flex items-center space-x-2">
              <Switch
                id="notificationRequired"
                checked={formData.notificationRequired}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notificationRequired: checked })
                }
              />
              <Label htmlFor="notificationRequired">
                Authority notification required (Art. 62)
              </Label>
            </div>
            {formData.notificationRequired && (
              <p className="text-xs text-muted-foreground ml-10">
                Serious incidents involving AI systems must be notified to market surveillance
                authorities under EU AI Act Article 62.
              </p>
            )}

            {/* DPO Central Incident ID */}
            <div className="space-y-2">
              <Label htmlFor="dpoCentralIncidentId">DPO Central Incident ID (Optional)</Label>
              <Input
                id="dpoCentralIncidentId"
                placeholder="e.g., inc_abc123..."
                value={formData.dpoCentralIncidentId}
                onChange={(e) =>
                  setFormData({ ...formData, dpoCentralIncidentId: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Link to a related incident in DPO Central for cross-platform traceability
              </p>
            </div>

            {/* Error */}
            {createIncident.error && (
              <div className="text-sm text-destructive">
                Error: {createIncident.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/incidents">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !formData.title ||
                  !formData.description ||
                  !formData.type ||
                  !formData.severity
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reporting...
                  </>
                ) : (
                  "Report Incident"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
