"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Minus,
  Shield,
  Globe,
  ExternalLink,
  Cpu,
  MapPin,
  Server,
  Plus,
  Building2,
  Brain,
  ShieldCheck,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import type { CatalogAIModel } from "@/lib/vendor-watch-types";

const MODEL_TYPE_COLORS: Record<string, string> = {
  "LLM": "bg-primary/20 text-primary",
  "Image Generation": "bg-purple-500/20 text-purple-400",
  "Speech": "bg-blue-500/20 text-blue-400",
  "Audio": "bg-blue-500/20 text-blue-400",
  "Embedding": "bg-green-500/20 text-green-400",
  "Code Generation": "bg-cyan-500/20 text-cyan-400",
  "Vision": "bg-orange-500/20 text-orange-400",
  "Multimodal": "bg-pink-500/20 text-pink-400",
};

function getModelTypeBadgeClass(type: string): string {
  return MODEL_TYPE_COLORS[type] || "bg-muted text-muted-foreground";
}

export default function VendorCatalogDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { organization } = useOrganization();

  const { data: entry, isLoading } = trpc.vendorCatalog.getBySlug.useQuery(
    { organizationId: organization?.id ?? "", slug },
    { enabled: !!organization?.id && !!slug }
  );

  if (isLoading || !organization?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vendor not found in catalog</p>
        <Link href="/governance/vendor-catalog">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const linkedVendorCount = entry._count?.vendors ?? 0;
  const aiModels = (entry.aiModels as CatalogAIModel[] | null) ?? [];

  // Check if any governance boolean is non-null
  const hasGovernanceData =
    entry.supportsExplainability != null ||
    entry.hasBiasMonitoring != null ||
    entry.hasModelCard != null ||
    entry.supportsAuditLogs != null ||
    entry.iso42001Certified != null ||
    entry.aiIncidentNotificationSLA ||
    entry.euAiActRole ||
    (entry.euAiActAnnexIIIDomains && entry.euAiActAnnexIIIDomains.length > 0);

  const governanceChecks = [
    { label: "Explainability", value: entry.supportsExplainability },
    { label: "Bias Monitoring", value: entry.hasBiasMonitoring },
    { label: "Model Cards", value: entry.hasModelCard },
    { label: "Audit Logs", value: entry.supportsAuditLogs },
    { label: "ISO 42001", value: entry.iso42001Certified },
  ];

  const externalLinks = [
    { label: "Website", url: entry.website, icon: Globe },
    { label: "Privacy Policy", url: entry.privacyPolicyUrl, icon: Shield },
    { label: "DPA", url: entry.dpaUrl, icon: Shield },
    { label: "Trust Center", url: entry.trustCenterUrl, icon: Shield },
    { label: "Security Page", url: entry.securityPageUrl, icon: Shield },
  ].filter((link) => link.url);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/governance/vendor-catalog">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold">{entry.name}</h1>
              {entry.isVerified && (
                <CheckCircle className="w-5 h-5 text-success" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{entry.category}</Badge>
              {entry.subcategory && (
                <Badge variant="outline" className="text-xs">
                  {entry.subcategory}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button className="self-start sm:self-auto" asChild>
          <Link href={`/governance/vendors/new?catalog=true&slug=${entry.slug}`}>
            <Plus className="w-4 h-4 mr-2" />
            Add to My Vendors
          </Link>
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {entry.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{entry.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {entry.gdprCompliant && (
                  <Badge className="bg-success/20 text-success">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    GDPR Compliant
                  </Badge>
                )}
                {entry.euAiActCompliant && (
                  <Badge className="bg-info/20 text-info">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    EU AI Act Compliant
                  </Badge>
                )}
                {entry.ccpaCompliant && (
                  <Badge className="bg-purple-500/20 text-purple-400">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    CCPA Compliant
                  </Badge>
                )}
                {entry.hipaaCompliant && (
                  <Badge className="bg-warning/20 text-warning">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    HIPAA Compliant
                  </Badge>
                )}
                {entry.supportsDsars && (
                  <Badge className="bg-success/20 text-success">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    DSAR Support
                  </Badge>
                )}
                {entry.hasDesignatedDpo && (
                  <Badge className="bg-success/20 text-success">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Designated DPO
                  </Badge>
                )}
                {entry.hasRecentBreach && (
                  <Badge className="bg-destructive/20 text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Recent Breach
                  </Badge>
                )}
                {entry.transferSafeguards && (
                  <Badge variant="outline">
                    Transfer: {entry.transferSafeguards}
                  </Badge>
                )}
                {!entry.gdprCompliant && !entry.euAiActCompliant && !entry.ccpaCompliant && !entry.hipaaCompliant && !entry.supportsDsars && !entry.hasDesignatedDpo && !entry.hasRecentBreach && !entry.transferSafeguards && (
                  <p className="text-sm text-muted-foreground">No compliance data available</p>
                )}
              </div>

              {/* Certifications */}
              {entry.certifications.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.certifications.map((cert) => (
                      <Badge key={cert} variant="outline" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Frameworks */}
              {entry.frameworks.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Frameworks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.frameworks.map((fw) => (
                      <Badge key={fw} variant="secondary" className="text-xs">
                        {fw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Capabilities */}
          {(entry.aiCapabilities.length > 0 || entry.modelHosting) && (
            <Card>
              <CardHeader>
                <CardTitle>AI Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {entry.aiCapabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.aiCapabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs">
                        <Cpu className="w-3 h-3 mr-1" />
                        {cap}
                      </Badge>
                    ))}
                  </div>
                )}
                {entry.modelHosting && (
                  <div className="flex items-center gap-2 text-sm">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Model Hosting:</span>
                    <span className="font-medium">{entry.modelHosting}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Models */}
          {aiModels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Models
                  <Badge variant="secondary" className="text-xs ml-1">
                    {aiModels.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {aiModels.map((model, i) => (
                    <div
                      key={`${model.name}-${i}`}
                      className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 border border-border/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{model.name}</p>
                        {model.source && (
                          <p className="text-xs text-muted-foreground truncate">{model.source}</p>
                        )}
                      </div>
                      <Badge className={`text-[10px] shrink-0 ml-2 ${getModelTypeBadgeClass(model.type)}`}>
                        {model.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Governance */}
          {hasGovernanceData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  AI Governance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {governanceChecks.map((check) => {
                    if (check.value == null) return null;
                    return (
                      <div key={check.label} className="flex items-center gap-2 text-sm">
                        {check.value ? (
                          <CheckCircle className="w-4 h-4 text-success shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span>{check.label}</span>
                      </div>
                    );
                  })}
                </div>

                {entry.aiIncidentNotificationSLA && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Incident SLA:</span>
                    <span className="font-medium">{entry.aiIncidentNotificationSLA}</span>
                  </div>
                )}

                {entry.dataProcessingTransparency && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Data Transparency:</span>
                    <span className="font-medium">{entry.dataProcessingTransparency}</span>
                  </div>
                )}

                {entry.euAiActRole && (
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">AI Act Role:</span>
                    <Badge variant="outline">{entry.euAiActRole}</Badge>
                  </div>
                )}

                {entry.euAiActAnnexIIIDomains && entry.euAiActAnnexIIIDomains.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Annex III Domains</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.euAiActAnnexIIIDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="text-xs">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Data Processing */}
          {(entry.dataLocations.length > 0 || entry.hasEuDataCenter !== null) && (
            <Card>
              <CardHeader>
                <CardTitle>Data Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {entry.dataLocations.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Data Locations:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.dataLocations.map((loc) => (
                        <Badge key={loc} variant="outline" className="text-xs">
                          {loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {entry.hasEuDataCenter && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>EU Data Center Available</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* External Links */}
          {externalLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>External Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {externalLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.label}
                      href={link.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1">{link.label}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Your Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Your Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold text-primary">{linkedVendorCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {linkedVendorCount === 1 ? "Linked vendor record" : "Linked vendor records"}
                  </p>
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link href={`/governance/vendors/new?catalog=true&slug=${entry.slug}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to My Vendors
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
