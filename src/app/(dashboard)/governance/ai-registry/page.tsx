"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Cpu,
  Plus,
  Search,
  ArrowRight,
  Loader2,
  Brain,
  Bot,
  Eye,
  Cog,
  Database,
} from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatRelativeTime } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  DEVELOPMENT: "border-info text-info",
  TESTING: "border-warning text-warning",
  DEPLOYED: "border-success text-success",
  RETIRED: "border-muted-foreground/50 text-muted-foreground/50",
};

const riskLevelColors: Record<string, string> = {
  UNACCEPTABLE: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  LIMITED: "bg-warning/20 text-warning",
  MINIMAL: "bg-success/20 text-success",
};

const techniqueLabels: Record<string, string> = {
  MACHINE_LEARNING: "Machine Learning",
  DEEP_LEARNING: "Deep Learning",
  GENERATIVE_AI: "Generative AI",
  AGENTIC_AI: "Agentic AI",
  NLP: "NLP",
  COMPUTER_VISION: "Computer Vision",
  SPEECH_RECOGNITION: "Speech Recognition",
  ROBOTICS: "Robotics",
  RULE_BASED: "Rule-Based",
  EXPERT_SYSTEM: "Expert System",
  STATISTICAL: "Statistical",
  OTHER: "Other",
};

const techniqueIcons: Record<string, React.ElementType> = {
  GENERATIVE_AI: Brain,
  AGENTIC_AI: Bot,
  COMPUTER_VISION: Eye,
  NLP: Brain,
  DEEP_LEARNING: Brain,
  MACHINE_LEARNING: Cog,
};

const roleLabels: Record<string, string> = {
  PROVIDER: "Provider",
  DEPLOYER: "Deployer",
  IMPORTER: "Importer",
  DISTRIBUTOR: "Distributor",
  USER: "User",
};

export default function AIRegistryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const debouncedSearch = useDebounce(searchQuery);
  const { organization } = useOrganization();

  const statusFilter = activeTab === "all" ? undefined : activeTab.toUpperCase();

  const { data: statsData, isLoading: statsLoading } = trpc.aiSystem.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const {
    data: systemsPages,
    isLoading: systemsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.aiSystem.list.useInfiniteQuery(
    {
      organizationId: organization?.id ?? "",
      search: debouncedSearch || undefined,
      status: statusFilter,
      limit: 20,
    },
    {
      enabled: !!organization?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }
  );

  const systems = systemsPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? { total: 0, draft: 0, deployed: 0, retired: 0 };
  const development = stats.total - stats.draft - stats.deployed - stats.retired;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">AI Registry</h1>
          <p className="text-sm text-muted-foreground">
            Inventory of all AI systems, models, and agents
          </p>
        </div>
        <Link href="/governance/ai-registry/new" className="flex-none">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Register AI System</span>
            <span className="sm:hidden">Register</span>
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Systems</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-muted-foreground">{stats.draft}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.deployed}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-muted-foreground/50">{stats.retired}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Retired</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search AI systems..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs sm:text-sm">
            Draft ({stats.draft})
          </TabsTrigger>
          <TabsTrigger value="development" className="text-xs sm:text-sm">
            Development
          </TabsTrigger>
          <TabsTrigger value="testing" className="text-xs sm:text-sm">
            Testing
          </TabsTrigger>
          <TabsTrigger value="deployed" className="text-xs sm:text-sm">
            Deployed ({stats.deployed})
          </TabsTrigger>
          <TabsTrigger value="retired" className="text-xs sm:text-sm">
            Retired ({stats.retired})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {systemsLoading && !systemsPages ? (
            <ListPageSkeleton />
          ) : systems.length > 0 ? (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {systems.map((system) => {
                  const Icon = techniqueIcons[system.technique] || Cpu;
                  const riskLevel = system.riskClassification?.riskLevel;

                  return (
                    <Link key={system.id} href={`/governance/ai-registry/${system.id}`}>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="pb-3 p-4 sm:p-6 sm:pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusColors[system.status] || ""}`}
                              >
                                {system.status}
                              </Badge>
                              {riskLevel && (
                                <Badge
                                  className={`text-xs ${riskLevelColors[riskLevel] || ""}`}
                                >
                                  {riskLevel}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardTitle className="mt-3 text-base sm:text-lg line-clamp-1">
                            {system.name}
                          </CardTitle>
                          {system.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {system.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <Badge variant="outline" className="text-xs">
                              {techniqueLabels[system.technique] || system.technique}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {roleLabels[system.role] || system.role}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{system._count?.models ?? 0} models</span>
                            <span>{system._count?.dataSources ?? 0} data sources</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Updated {formatRelativeTime(system.updatedAt)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
              {hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Cpu className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No AI systems found</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Start by registering your first AI system"}
                </p>
                {!searchQuery && (
                  <Link href="/governance/ai-registry/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Register AI System
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
