"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Search, CheckCircle, X, Shield, Globe, Cpu } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { suggestTechniqueFromCapabilities } from "@/lib/ai-technique-mapping";

type VendorRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type VendorStatus = "ACTIVE" | "UNDER_REVIEW" | "APPROVED" | "SUSPENDED" | "TERMINATED";

const aiTechniques = [
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

const aiRoles = [
  { value: "PROVIDER", label: "Provider" },
  { value: "DEPLOYER", label: "Deployer" },
  { value: "IMPORTER", label: "Importer" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "USER", label: "User" },
];

const riskLevels = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const statuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "TERMINATED", label: "Terminated" },
];

type CatalogVendor = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  website: string | null;
  isVerified: boolean;
  gdprCompliant: boolean | null;
  euAiActCompliant: boolean | null;
  certifications: string[];
  frameworks: string[];
  aiCapabilities: string[];
  privacyPolicyUrl: string | null;
  trustCenterUrl: string | null;
  dpaUrl: string | null;
  securityPageUrl: string | null;
};

function NewVendorForm() {
  const t = useTranslations("vendorsNew");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCatalogMode = searchParams.get("catalog") === "true";
  const slugParam = searchParams.get("slug");
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Catalog search state
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCatalogVendor, setSelectedCatalogVendor] = useState<CatalogVendor | null>(null);
  const debouncedCatalogQuery = useDebounce(catalogQuery, 300);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<{
    name: string;
    website: string;
    description: string;
    contactName: string;
    contactEmail: string;
    riskLevel: VendorRiskLevel | "";
    status: VendorStatus;
    contractStartDate: string;
    contractExpiryDate: string;
    dpoCentralVendorId: string;
    notes: string;
  }>({
    name: "",
    website: "",
    description: "",
    contactName: "",
    contactEmail: "",
    riskLevel: "",
    status: "UNDER_REVIEW",
    contractStartDate: "",
    contractExpiryDate: "",
    dpoCentralVendorId: "",
    notes: "",
  });

  // "Also register as AI System" state
  const [createSystem, setCreateSystem] = useState(false);
  const [systemData, setSystemData] = useState({
    systemName: "",
    systemRole: "DEPLOYER",
    systemTechnique: "",
    systemPurpose: "",
  });

  // Auto-fetch catalog entry if slug param is present
  const { data: slugCatalogEntry } = trpc.vendorCatalog.getBySlug.useQuery(
    { organizationId: organization?.id ?? "", slug: slugParam ?? "" },
    { enabled: isCatalogMode && !!organization?.id && !!slugParam && !selectedCatalogVendor }
  );

  // Auto-select catalog vendor when fetched via slug param
  useEffect(() => {
    if (slugCatalogEntry && !selectedCatalogVendor) {
      handleSelectCatalogVendor(slugCatalogEntry as CatalogVendor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugCatalogEntry]);

  // Catalog search query
  const { data: catalogResults, isLoading: catalogLoading } =
    trpc.vendorCatalog.search.useQuery(
      { organizationId: organization?.id ?? "", query: debouncedCatalogQuery, limit: 10 },
      { enabled: isCatalogMode && !!organization?.id && debouncedCatalogQuery.length >= 2 }
    );

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show dropdown when results arrive
  useEffect(() => {
    if (catalogResults && catalogResults.length > 0 && debouncedCatalogQuery.length >= 2) {
      setShowDropdown(true);
    }
  }, [catalogResults, debouncedCatalogQuery]);

  const handleSelectCatalogVendor = (vendor: CatalogVendor) => {
    setSelectedCatalogVendor(vendor);
    setShowDropdown(false);
    setCatalogQuery("");

    // Auto-fill form
    setFormData((prev) => ({
      ...prev,
      name: vendor.name,
      description: vendor.description || prev.description,
      website: vendor.website || prev.website,
    }));

    // Pre-fill system data from catalog
    setSystemData((prev) => ({
      ...prev,
      systemName: vendor.name,
      systemTechnique: suggestTechniqueFromCapabilities(vendor.aiCapabilities || []) || prev.systemTechnique,
    }));
  };

  const handleClearCatalogVendor = () => {
    setSelectedCatalogVendor(null);
    setFormData({
      name: "",
      website: "",
      description: "",
      contactName: "",
      contactEmail: "",
      riskLevel: "",
      status: "UNDER_REVIEW",
      contractStartDate: "",
      contractExpiryDate: "",
      dpoCentralVendorId: "",
      notes: "",
    });
    setSystemData({ systemName: "", systemRole: "DEPLOYER", systemTechnique: "", systemPurpose: "" });
    setCreateSystem(false);
  };

  const utils = trpc.useUtils();

  const createVendor = trpc.vendor.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("toastSuccess"));
      utils.vendor.list.invalidate();
      utils.vendor.getStats.invalidate();
      router.push(`/governance/vendors/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
      setIsSubmitting(false);
    },
  });

  const createVendorWithSystem = trpc.vendor.createWithSystem.useMutation({
    onSuccess: (data) => {
      if (data.system) {
        toast.success(t("toastSuccessWithSystem"));
        utils.aiSystem.list.invalidate();
        utils.aiSystem.getStats.invalidate();
      } else {
        toast.success(t("toastSuccess"));
      }
      utils.vendor.list.invalidate();
      utils.vendor.getStats.invalidate();
      router.push(`/governance/vendors/${data.vendor.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.name) return;

    setIsSubmitting(true);

    const vendorFields = {
      organizationId: organization.id,
      name: formData.name,
      website: formData.website || undefined,
      description: formData.description || undefined,
      contactName: formData.contactName || undefined,
      contactEmail: formData.contactEmail || undefined,
      riskLevel: (formData.riskLevel || undefined) as VendorRiskLevel | undefined,
      status: formData.status as VendorStatus,
      contractStartDate: formData.contractStartDate || undefined,
      contractExpiryDate: formData.contractExpiryDate || undefined,
      dpoCentralVendorId: formData.dpoCentralVendorId || undefined,
      notes: formData.notes || undefined,
      catalogSlug: selectedCatalogVendor?.slug || undefined,
    };

    if (createSystem && systemData.systemName) {
      createVendorWithSystem.mutate({
        ...vendorFields,
        createSystem: true,
        systemName: systemData.systemName,
        systemRole: systemData.systemRole || undefined,
        systemTechnique: systemData.systemTechnique || undefined,
        systemPurpose: systemData.systemPurpose || undefined,
      });
    } else {
      createVendor.mutate(vendorFields);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance/vendors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Catalog Search Card */}
      {isCatalogMode && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Search className="w-5 h-5 text-primary" />
              {t("catalogSearchTitle")}
            </CardTitle>
            <CardDescription>
              {t("catalogSearchDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCatalogVendor ? (
              <div className="border border-primary/30 rounded-md p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{selectedCatalogVendor.name}</h4>
                    {selectedCatalogVendor.isVerified && (
                      <CheckCircle className="w-4 h-4 text-success" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleClearCatalogVendor}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {selectedCatalogVendor.category}
                </Badge>
                {selectedCatalogVendor.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedCatalogVendor.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {selectedCatalogVendor.gdprCompliant && (
                    <Badge className="bg-success/20 text-success text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      GDPR
                    </Badge>
                  )}
                  {selectedCatalogVendor.euAiActCompliant && (
                    <Badge className="bg-info/20 text-info text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      EU AI Act
                    </Badge>
                  )}
                  {selectedCatalogVendor.certifications.map((cert) => (
                    <Badge key={cert} variant="outline" className="text-xs">
                      {cert}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {selectedCatalogVendor.website && (
                    <a
                      href={selectedCatalogVendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Globe className="w-3 h-3" />
                      Website
                    </a>
                  )}
                  {selectedCatalogVendor.privacyPolicyUrl && (
                    <a
                      href={selectedCatalogVendor.privacyPolicyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Shield className="w-3 h-3" />
                      Privacy Policy
                    </a>
                  )}
                  {selectedCatalogVendor.trustCenterUrl && (
                    <a
                      href={selectedCatalogVendor.trustCenterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Shield className="w-3 h-3" />
                      Trust Center
                    </a>
                  )}
                  {selectedCatalogVendor.dpaUrl && (
                    <a
                      href={selectedCatalogVendor.dpaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Shield className="w-3 h-3" />
                      DPA
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Vendor details have been auto-filled in the form below. Review and adjust before saving.
                </p>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("catalogSearchPlaceholder")}
                    className="pl-9"
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    onFocus={() => {
                      if (catalogResults && catalogResults.length > 0) {
                        setShowDropdown(true);
                      }
                    }}
                  />
                  {catalogLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {showDropdown && catalogResults && catalogResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-y-auto">
                    {catalogResults.map((vendor) => (
                      <button
                        key={vendor.id}
                        type="button"
                        className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                        onClick={() => handleSelectCatalogVendor(vendor as CatalogVendor)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{vendor.name}</span>
                            {vendor.isVerified && (
                              <CheckCircle className="w-3.5 h-3.5 text-success" />
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {vendor.category}
                          </Badge>
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          {vendor.gdprCompliant && (
                            <Badge className="bg-success/20 text-success text-[10px] px-1.5 py-0">
                              GDPR
                            </Badge>
                          )}
                          {vendor.euAiActCompliant && (
                            <Badge className="bg-info/20 text-info text-[10px] px-1.5 py-0">
                              EU AI Act
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && catalogResults && catalogResults.length === 0 && debouncedCatalogQuery.length >= 2 && !catalogLoading && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
                    {t("catalogNoResults", { query: debouncedCatalogQuery })}
                  </div>
                )}
              </div>
            )}

            {!selectedCatalogVendor && (
              <p className="text-xs text-muted-foreground">
                Or{" "}
                <Link href="/governance/vendors/new" className="text-primary hover:underline">
                  skip catalog search
                </Link>{" "}
                and fill in vendor details manually.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
          <CardDescription>
            {t("formDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t("labelVendorName")} *</Label>
              <Input
                id="name"
                placeholder={t("placeholderVendorName")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">{t("labelWebsite")}</Label>
              <Input
                id="website"
                placeholder="e.g., https://example.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("labelDescription")}</Label>
              <Textarea
                id="description"
                placeholder="Describe the vendor, their AI services, and the nature of the relationship..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Contact Name & Email */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">{t("labelContactName")}</Label>
                <Input
                  id="contactName"
                  placeholder="e.g., John Smith"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">{t("labelContactEmail")}</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="e.g., contact@vendor.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>

            {/* Risk Level & Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="riskLevel">{t("labelRiskLevel")}</Label>
                <Select
                  value={formData.riskLevel}
                  onValueChange={(value) => setFormData({ ...formData, riskLevel: value as VendorRiskLevel })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    {riskLevels.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t("labelStatus")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as VendorStatus })}
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

            {/* Contract Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contractStartDate">{t("labelContractStartDate")}</Label>
                <Input
                  id="contractStartDate"
                  type="date"
                  value={formData.contractStartDate}
                  onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractExpiryDate">{t("labelContractExpiryDate")}</Label>
                <Input
                  id="contractExpiryDate"
                  type="date"
                  value={formData.contractExpiryDate}
                  onChange={(e) => setFormData({ ...formData, contractExpiryDate: e.target.value })}
                />
              </div>
            </div>

            {/* DPO Central Vendor ID */}
            <div className="space-y-2">
              <Label htmlFor="dpoCentralVendorId">{t("labelDpoCentralVendorId")}</Label>
              <Input
                id="dpoCentralVendorId"
                placeholder="e.g., clx1234567890"
                value={formData.dpoCentralVendorId}
                onChange={(e) => setFormData({ ...formData, dpoCentralVendorId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Link this vendor to a record in DPO Central for privacy management integration.
              </p>
            </div>

            {/* Register as AI System Toggle */}
            <div className="border rounded-md p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="createSystem"
                  checked={createSystem}
                  onCheckedChange={(checked) => {
                    setCreateSystem(checked);
                    if (checked && !systemData.systemName) {
                      setSystemData((prev) => ({ ...prev, systemName: formData.name }));
                    }
                  }}
                />
                <div className="flex-1">
                  <Label htmlFor="createSystem" className="flex items-center gap-2 cursor-pointer">
                    <Cpu className="w-4 h-4 text-primary" />
                    {t("toggleCreateSystem")}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("toggleCreateSystemHelp")}
                  </p>
                </div>
              </div>

              {createSystem && (
                <div className="space-y-4 pl-0 sm:pl-10">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">{t("labelSystemName")} *</Label>
                    <Input
                      id="systemName"
                      placeholder="e.g., OpenAI GPT-4 Integration"
                      value={systemData.systemName}
                      onChange={(e) => setSystemData({ ...systemData, systemName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="systemRole">{t("labelOrganizationRole")}</Label>
                      <Select
                        value={systemData.systemRole}
                        onValueChange={(value) => setSystemData({ ...systemData, systemRole: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {aiRoles.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Your org&apos;s role under the EU AI Act
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="systemTechnique">{t("labelAiTechnique")}</Label>
                      <Select
                        value={systemData.systemTechnique}
                        onValueChange={(value) => setSystemData({ ...systemData, systemTechnique: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select technique" />
                        </SelectTrigger>
                        <SelectContent>
                          {aiTechniques.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systemPurpose">{t("labelIntendedPurpose")}</Label>
                    <Textarea
                      id="systemPurpose"
                      placeholder="Describe the intended purpose of the AI system..."
                      rows={2}
                      value={systemData.systemPurpose}
                      onChange={(e) => setSystemData({ ...systemData, systemPurpose: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t("labelNotes")}</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this vendor relationship..."
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Error */}
            {(createVendor.error || createVendorWithSystem.error) && (
              <div className="text-sm text-destructive">
                Error: {(createVendor.error || createVendorWithSystem.error)?.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/vendors">
                <Button variant="outline" type="button">
                  {tc("cancel")}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || (createSystem && !systemData.systemName)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {tc("saving")}
                  </>
                ) : createSystem ? (
                  t("submitAddVendorAndSystem")
                ) : (
                  t("submitAddVendor")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewVendorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <NewVendorForm />
    </Suspense>
  );
}
