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

type AITechnique = "MACHINE_LEARNING" | "DEEP_LEARNING" | "GENERATIVE_AI" | "AGENTIC_AI" | "NLP" | "COMPUTER_VISION" | "SPEECH_RECOGNITION" | "ROBOTICS" | "RULE_BASED" | "EXPERT_SYSTEM" | "STATISTICAL" | "OTHER";
type AISystemRole = "PROVIDER" | "DEPLOYER" | "IMPORTER" | "DISTRIBUTOR" | "USER";
type AISystemStatus = "DRAFT" | "DEVELOPMENT" | "TESTING" | "DEPLOYED" | "RETIRED";

const techniques = [
  { value: "MACHINE_LEARNING", label: "Machine Learning" },
  { value: "DEEP_LEARNING", label: "Deep Learning" },
  { value: "GENERATIVE_AI", label: "Generative AI" },
  { value: "AGENTIC_AI", label: "Agentic AI" },
  { value: "NLP", label: "Natural Language Processing" },
  { value: "COMPUTER_VISION", label: "Computer Vision" },
  { value: "SPEECH_RECOGNITION", label: "Speech Recognition" },
  { value: "ROBOTICS", label: "Robotics" },
  { value: "RULE_BASED", label: "Rule-Based" },
  { value: "EXPERT_SYSTEM", label: "Expert System" },
  { value: "STATISTICAL", label: "Statistical" },
  { value: "OTHER", label: "Other" },
];

const roles = [
  { value: "PROVIDER", label: "Provider" },
  { value: "DEPLOYER", label: "Deployer" },
  { value: "IMPORTER", label: "Importer" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "USER", label: "User" },
];

const statuses = [
  { value: "DRAFT", label: "Draft" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "TESTING", label: "Testing" },
  { value: "DEPLOYED", label: "Deployed" },
  { value: "RETIRED", label: "Retired" },
];

export default function NewAISystemPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    technique: AITechnique | "";
    role: AISystemRole | "";
    status: AISystemStatus;
    purpose: string;
    businessOwner: string;
    technicalOwner: string;
    processesPersonalData: boolean;
    vendorId: string;
  }>({
    name: "",
    description: "",
    technique: "",
    role: "",
    status: "DRAFT",
    purpose: "",
    businessOwner: "",
    technicalOwner: "",
    processesPersonalData: false,
    vendorId: "",
  });

  const { data: vendorsData } = trpc.vendor.list.useQuery(
    { organizationId: organization?.id ?? "", limit: 100 },
    { enabled: !!organization?.id }
  );
  const vendors = vendorsData?.items ?? [];

  const utils = trpc.useUtils();

  const createSystem = trpc.aiSystem.create.useMutation({
    onSuccess: (data) => {
      toast.success("AI system registered successfully");
      utils.aiSystem.list.invalidate();
      utils.aiSystem.getStats.invalidate();
      router.push(`/governance/ai-registry/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to register AI system");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.name || !formData.technique || !formData.role) return;

    setIsSubmitting(true);

    createSystem.mutate({
      organizationId: organization.id,
      name: formData.name,
      description: formData.description || undefined,
      technique: formData.technique as AITechnique,
      role: formData.role as AISystemRole,
      status: formData.status,
      purpose: formData.purpose || undefined,
      businessOwner: formData.businessOwner || undefined,
      technicalOwner: formData.technicalOwner || undefined,
      processesPersonalData: formData.processesPersonalData,
      vendorId: formData.vendorId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance/ai-registry">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Register AI System</h1>
          <p className="text-sm text-muted-foreground">
            Add a new AI system to the registry
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>System Details</CardTitle>
          <CardDescription>
            Provide information about the AI system being registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name & Technique */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">System Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Customer Support Chatbot"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technique">AI Technique *</Label>
                <Select
                  value={formData.technique}
                  onValueChange={(value) => setFormData({ ...formData, technique: value as AITechnique })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technique" />
                  </SelectTrigger>
                  <SelectContent>
                    {techniques.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this AI system does, its capabilities, and intended use..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Role & Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Organization Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as AISystemRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Your organization&apos;s role under the EU AI Act
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Lifecycle Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as AISystemStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select
                value={formData.vendorId}
                onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this system to a vendor from your vendor registry
              </p>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Intended Purpose</Label>
              <Textarea
                id="purpose"
                placeholder="Describe the intended purpose and use cases for this AI system..."
                rows={3}
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Required for high-risk systems under the EU AI Act (Art. 13)
              </p>
            </div>

            {/* Owners */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessOwner">Business Owner</Label>
                <Input
                  id="businessOwner"
                  placeholder="e.g., Product Team Lead"
                  value={formData.businessOwner}
                  onChange={(e) => setFormData({ ...formData, businessOwner: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technicalOwner">Technical Owner</Label>
                <Input
                  id="technicalOwner"
                  placeholder="e.g., ML Engineering Lead"
                  value={formData.technicalOwner}
                  onChange={(e) => setFormData({ ...formData, technicalOwner: e.target.value })}
                />
              </div>
            </div>

            {/* Personal Data */}
            <div className="flex items-center space-x-2">
              <Switch
                id="processesPersonalData"
                checked={formData.processesPersonalData}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, processesPersonalData: checked })
                }
              />
              <Label htmlFor="processesPersonalData">
                This system processes personal data
              </Label>
            </div>
            {formData.processesPersonalData && (
              <p className="text-xs text-muted-foreground ml-10">
                A DPIA or FRIA may be required. You can link this system to DPO Central data
                assets after creation.
              </p>
            )}

            {/* Error */}
            {createSystem.error && (
              <div className="text-sm text-destructive">
                Error: {createSystem.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/ai-registry">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.technique || !formData.role}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register System"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
