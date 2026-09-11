"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

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
  Network,
  Layers,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import type { CatalogAIModel } from "@/lib/vendor-watch-types";
import { parseSubprocessors, summarizeSupplyChain } from "@/lib/supply-chain";
import { SubprocessorTable } from "@/components/supply-chain/subprocessor-table";

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
  const t = useTranslations("vendorCatalogDetail");
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
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Link href="/governance/vendor-catalog">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToCatalog")}
          </Button>
        </Link>
      </div>
    );
  }

  const linkedVendorCount = entry._count?.vendors ?? 0;
  const aiModels = (entry.aiModels as CatalogAIModel[] | null) ?? [];
  const subprocessors = parseSubprocessors(entry.subprocessors);
  const supplyChain = summarizeSupplyChain(subprocessors);
  const dependents = entry.dependents ?? [];
  const yourDependents = entry.yourDependents ?? [];
  const yourDependentSlugs = new Set(yourDependents.map((v) => v.catalogSlug));

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
    { label: t("governanceExplainability"), value: entry.supportsExplainability },
    { label: t("governanceBiasMonitoring"), value: entry.hasBiasMonitoring },
    { label: t("governanceModelCards"), value: entry.hasModelCard },
    { label: t("governanceAuditLogs"), value: entry.supportsAuditLogs },
    { label: "ISO 42001", value: entry.iso42001Certified },
  ];

  const externalLinks = [
    { label: t("linkWebsite"), url: entry.website, icon: Globe },
    { label: t("linkPrivacyPolicy"), url: entry.privacyPolicyUrl, icon: Shield },
    { label: t("linkDpa"), url: entry.dpaUrl, icon: Shield },
    { label: t("linkTrustCenter"), url: entry.trustCenterUrl, icon: Shield },
    { label: t("linkSecurityPage"), url: entry.securityPageUrl, icon: Shield },
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
            {t("addToMyVendors")}
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
                <CardTitle>{t("descriptionTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{entry.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>{t("complianceTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {entry.gdprCompliant && (
                  <Badge className="bg-success/20 text-success">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    {t("badgeGdprCompliant")}
                  </Badge>
                )}
                {entry.euAiActCompliant && (
                  <Badge className="bg-info/20 text-info">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    {t("badgeEuAiActCompliant")}
                  </Badge>
                )}
                {entry.ccpaCompliant && (
                  <Badge className="bg-purple-500/20 text-purple-400">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    {t("badgeCcpaCompliant")}
                  </Badge>
                )}
                {entry.hipaaCompliant && (
                  <Badge className="bg-warning/20 text-warning">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    {t("badgeHipaaCompliant")}
                  </Badge>
                )}
                {entry.supportsDsars && (
                  <Badge className="bg-success/20 text-success">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    {t("badgeDsarSupport")}
                  </Badge>
                )}
                {entry.hasDesignatedDpo && (
                  <Badge className="bg-success/20 text-success">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    {t("badgeDesignatedDpo")}
                  </Badge>
                )}
                {entry.hasRecentBreach && (
                  <Badge className="bg-destructive/20 text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    {t("badgeRecentBreach")}
                  </Badge>
                )}
                {entry.transferSafeguards && (
                  <Badge variant="outline">
                    {t("transferSafeguards", { safeguards: entry.transferSafeguards })}
                  </Badge>
                )}
                {!entry.gdprCompliant && !entry.euAiActCompliant && !entry.ccpaCompliant && !entry.hipaaCompliant && !entry.supportsDsars && !entry.hasDesignatedDpo && !entry.hasRecentBreach && !entry.transferSafeguards && (
                  <p className="text-sm text-muted-foreground">{t("noComplianceData")}</p>
                )}
              </div>

              {/* Certifications */}
              {entry.certifications.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{t("certificationsTitle")}</p>
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
                  <p className="text-sm font-medium mb-2">{t("frameworksTitle")}</p>
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
                <CardTitle>{t("aiCapabilitiesTitle")}</CardTitle>
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
                    <span className="text-muted-foreground">{t("labelModelHosting")}</span>
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
                  {t("aiModelsTitle")}
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

          {/* Supply chain */}
          {subprocessors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  {t("supplyChainTitle")}
                  <Badge variant="secondary" className="text-xs ml-1">
                    {supplyChain.total}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("supplyChainSubtitle")}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{t("supplyChainLinked", { count: supplyChain.linked, total: supplyChain.total })}</span>
                  {supplyChain.locations.slice(0, 6).map((loc) => (
                    <Badge key={loc.location} variant="outline" className="text-[10px]">
                      {loc.location} · {loc.count}
                    </Badge>
                  ))}
                </div>
                <SubprocessorTable
                  rows={subprocessors}
                  labels={{
                    inCatalog: t("supplyChainInCatalog"),
                    governed: "",
                    viewSource: t("supplyChainViewSource"),
                    showAll: (count) => t("supplyChainShowAll", { count }),
                    showLess: t("supplyChainShowLess"),
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* AI Governance */}
          {hasGovernanceData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  {t("aiGovernanceTitle")}
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
                    <span className="text-muted-foreground">{t("labelIncidentSla")}</span>
                    <span className="font-medium">{entry.aiIncidentNotificationSLA}</span>
                  </div>
                )}

                {entry.dataProcessingTransparency && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("labelDataTransparency")}</span>
                    <span className="font-medium">{entry.dataProcessingTransparency}</span>
                  </div>
                )}

                {entry.euAiActRole && (
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("labelAiActRole")}</span>
                    <Badge variant="outline">{entry.euAiActRole}</Badge>
                  </div>
                )}

                {entry.euAiActAnnexIIIDomains && entry.euAiActAnnexIIIDomains.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t("annexIiiDomainsTitle")}</p>
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
                <CardTitle>{t("dataProcessingTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {entry.dataLocations.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">{t("labelDataLocations")}</span>
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
                    <span>{t("euDataCenterAvailable")}</span>
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
                <CardTitle>{t("externalLinksTitle")}</CardTitle>
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

          {/* Used as a subprocessor by */}
          {dependents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  {t("dependentsTitle")}
                  <Badge variant="secondary" className="text-xs ml-1">
                    {dependents.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dependentsSubtitle", { name: entry.name })}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {yourDependents.length > 0 && (
                  <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-primary">
                      {t("dependentsYourVendorsTitle", { name: entry.name })}
                    </p>
                    <ul className="space-y-1">
                      {yourDependents.map((v) => (
                        <li key={v.id}>
                          <Link href={`/governance/vendors/${v.id}`} className="text-sm hover:underline">
                            {v.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ul className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {dependents.map((d) => (
                    <li key={d.slug} className="flex items-center justify-between gap-2">
                      <Link
                        href={`/governance/vendor-catalog/${d.slug}`}
                        className="text-sm truncate hover:underline"
                      >
                        {d.name}
                      </Link>
                      <span className="flex items-center gap-1 shrink-0">
                        {yourDependentSlugs.has(d.slug) && (
                          <Badge className="bg-success/20 text-success text-[10px]">{t("dependentsYours")}</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Your Organization */}
          <Card>
            <CardHeader>
              <CardTitle>{t("yourOrganizationTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold text-primary">{linkedVendorCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("linkedVendorRecords", { count: linkedVendorCount })}
                  </p>
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link href={`/governance/vendors/new?catalog=true&slug=${entry.slug}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("addToMyVendors")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
