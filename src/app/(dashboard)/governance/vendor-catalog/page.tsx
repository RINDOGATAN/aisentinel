"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Loader2,
  Lock,
  Database,
  CheckCircle,
  Shield,
  Globe,
  Cpu,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { EnableFeatureModal } from "@/components/premium/enable-feature-modal";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function VendorCatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const debouncedSearch = useDebounce(searchQuery);
  const { organization } = useOrganization();

  const { data: accessData, isLoading: accessLoading } =
    trpc.vendorCatalog.checkAccess.useQuery(
      { organizationId: organization?.id ?? "" },
      { enabled: !!organization?.id }
    );

  const hasAccess = accessData?.hasAccess;

  const { data: stats, isLoading: statsLoading } = trpc.vendorCatalog.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id && hasAccess === true }
  );

  const { data: categories, isLoading: categoriesLoading } = trpc.vendorCatalog.listCategories.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id && hasAccess === true }
  );

  const { data: catalogItems, isLoading: catalogLoading } =
    trpc.vendorCatalog.search.useQuery(
      {
        organizationId: organization?.id ?? "",
        query: debouncedSearch || undefined,
        category: activeCategory === "all" ? undefined : activeCategory,
        limit: 40,
      },
      { enabled: !!organization?.id && hasAccess === true }
    );

  const initialLoading = hasAccess === true && (statsLoading || categoriesLoading);

  // Loading state
  if (accessLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Premium gate
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              AI Vendor Catalog
              <Badge className="bg-primary/20 text-primary">Premium</Badge>
            </h1>
            <p className="text-muted-foreground">
              Browse pre-audited AI vendors from the Vendor.Watch database
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto rounded-lg">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Premium Feature</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The AI Vendor Catalog gives you access to a curated database of
              pre-audited AI vendors with compliance data, certifications, and
              risk assessments — making vendor due diligence faster and more reliable.
            </p>
            <Button onClick={() => setShowModal(true)} className="mt-4">
              <Lock className="w-4 h-4 mr-2" />
              Enable AI Vendor Catalog
            </Button>
          </CardContent>
        </Card>

        {showModal && organization && (
          <EnableFeatureModal
            open={showModal}
            onClose={() => setShowModal(false)}
            organizationId={organization.id}
            skillPackageId="com.todolaw.aisentinel.vendor-catalog"
            skillName="AI Vendor Catalog"
            skillDescription="Browse pre-audited AI vendors with compliance data, certifications, and risk assessments from the Vendor.Watch database."
          />
        )}
      </div>
    );
  }

  // Show skeleton while initial data loads (prevents flash of empty stats/cards)
  if (initialLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">AI Vendor Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Browse pre-audited AI vendors from the Vendor.Watch database
          </p>
        </div>
        <ListPageSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">AI Vendor Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Browse pre-audited AI vendors from the Vendor.Watch database
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {stats?.total ?? 0}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Total Vendors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-info">
              {stats?.categories ?? 0}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-success">
              {stats?.verified ?? 0}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Verified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-warning">
              {stats?.euAiActCompliant ?? 0}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              EU AI Act Compliant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All
          </TabsTrigger>
          {categories?.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {catalogLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : catalogItems && catalogItems.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {catalogItems.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/governance/vendor-catalog/${vendor.slug}`}
                >
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base sm:text-lg line-clamp-1">
                            {vendor.name}
                          </h3>
                          {vendor.isVerified && (
                            <CheckCircle className="w-4 h-4 text-success shrink-0" />
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {vendor.category}
                        </Badge>
                        {vendor.subcategory && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {vendor.subcategory}
                          </Badge>
                        )}
                      </div>
                      {vendor.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
                          {vendor.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {vendor.gdprCompliant && (
                          <Badge className="bg-success/20 text-success text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            GDPR
                          </Badge>
                        )}
                        {vendor.euAiActCompliant && (
                          <Badge className="bg-info/20 text-info text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            EU AI Act
                          </Badge>
                        )}
                        {vendor.certifications.slice(0, 3).map((cert) => (
                          <Badge key={cert} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                        {vendor.certifications.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{vendor.certifications.length - 3}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {vendor.aiCapabilities.slice(0, 4).map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Cpu className="w-2.5 h-2.5 mr-0.5" />
                            {cap}
                          </Badge>
                        ))}
                      </div>
                      {vendor.website && (
                        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span className="truncate">{vendor.website.replace(/^https?:\/\//, "")}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No vendors found</p>
                <p className="text-sm">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "No vendors in this category yet"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
