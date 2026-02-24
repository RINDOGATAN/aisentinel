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
import { ArrowLeft, Loader2, Search, CheckCircle, X, Shield, Globe } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCatalogMode = searchParams.get("catalog") === "true";
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Catalog search state
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCatalogVendor, setSelectedCatalogVendor] = useState<CatalogVendor | null>(null);
  const debouncedCatalogQuery = useDebounce(catalogQuery, 300);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
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

  // Catalog search query
  const { data: catalogResults, isLoading: catalogLoading } =
    trpc.vendorCatalog.search.useQuery(
      { query: debouncedCatalogQuery, limit: 10 },
      { enabled: isCatalogMode && debouncedCatalogQuery.length >= 2 }
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
  };

  const utils = trpc.useUtils();

  const createVendor = trpc.vendor.create.useMutation({
    onSuccess: (data) => {
      toast.success("Vendor added successfully");
      utils.vendor.list.invalidate();
      utils.vendor.getStats.invalidate();
      router.push(`/governance/vendors/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add vendor");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.name) return;

    setIsSubmitting(true);

    createVendor.mutate({
      organizationId: organization.id,
      name: formData.name,
      website: formData.website || undefined,
      description: formData.description || undefined,
      contactName: formData.contactName || undefined,
      contactEmail: formData.contactEmail || undefined,
      riskLevel: formData.riskLevel || undefined,
      status: formData.status,
      contractStartDate: formData.contractStartDate || undefined,
      contractExpiryDate: formData.contractExpiryDate || undefined,
      dpoCentralVendorId: formData.dpoCentralVendorId || undefined,
      notes: formData.notes || undefined,
    });
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
          <h1 className="text-xl sm:text-2xl font-semibold">Add Vendor</h1>
          <p className="text-sm text-muted-foreground">
            Register a new third-party AI vendor
          </p>
        </div>
      </div>

      {/* Catalog Search Card */}
      {isCatalogMode && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Search className="w-5 h-5 text-primary" />
              AI Vendor Catalog
            </CardTitle>
            <CardDescription>
              Search pre-audited AI vendors from the Vendor.Watch database to auto-fill vendor details
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
                    placeholder="Search AI vendors (e.g., OpenAI, Anthropic, Google)..."
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
                    No vendors found for &quot;{debouncedCatalogQuery}&quot;
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
          <CardTitle>Vendor Details</CardTitle>
          <CardDescription>
            Provide information about the third-party AI vendor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input
                id="name"
                placeholder="e.g., OpenAI, Anthropic, Google Cloud AI"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="e.g., https://example.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
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
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  placeholder="e.g., John Smith"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
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
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select
                  value={formData.riskLevel}
                  onValueChange={(value) => setFormData({ ...formData, riskLevel: value })}
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
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
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
                <Label htmlFor="contractStartDate">Contract Start Date</Label>
                <Input
                  id="contractStartDate"
                  type="date"
                  value={formData.contractStartDate}
                  onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractExpiryDate">Contract Expiry Date</Label>
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
              <Label htmlFor="dpoCentralVendorId">DPO Central Vendor ID</Label>
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

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this vendor relationship..."
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Error */}
            {createVendor.error && (
              <div className="text-sm text-destructive">
                Error: {createVendor.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/vendors">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Vendor"
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
