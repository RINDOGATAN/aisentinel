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
  Shield,
  Globe,
  ExternalLink,
  Cpu,
  MapPin,
  Server,
  Plus,
  Building2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

export default function VendorCatalogDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { organization } = useOrganization();

  const { data: entry, isLoading } = trpc.vendorCatalog.getBySlug.useQuery(
    { organizationId: organization?.id ?? "", slug },
    { enabled: !!organization?.id && !!slug }
  );

  if (isLoading) {
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
                {!entry.gdprCompliant && !entry.euAiActCompliant && !entry.ccpaCompliant && !entry.hipaaCompliant && (
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
              <Link href={`/governance/vendors/new?catalog=true&slug=${entry.slug}`}>
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to My Vendors
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
