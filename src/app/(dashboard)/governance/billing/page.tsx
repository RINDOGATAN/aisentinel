"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, CreditCard, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { EnableFeatureModal } from "@/components/premium/enable-feature-modal";
import { EnableMultipleFeaturesModal } from "@/components/premium/enable-multiple-features-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { features } from "@/config/features";
import { formatPrice } from "@/lib/currency";

export default function BillingPage() {
  const { organization } = useOrganization();
  const [enableSkill, setEnableSkill] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [enableSkills, setEnableSkills] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cancelSkill, setCancelSkill] = useState<{
    entitlementId: string;
    name: string;
  } | null>(null);

  const { data: status, isLoading: statusLoading } =
    trpc.billing.getSubscriptionStatus.useQuery(
      { organizationId: organization?.id ?? "" },
      { enabled: !!organization?.id }
    );

  const { data: plans, isLoading: plansLoading } =
    trpc.billing.getAvailablePlans.useQuery(
      { organizationId: organization?.id ?? "" },
      { enabled: !!organization?.id }
    );

  const utils = trpc.useUtils();

  const cancelFeature = trpc.billing.cancelFeature.useMutation({
    onSuccess: () => {
      setCancelSkill(null);
      utils.billing.getSubscriptionStatus.invalidate();
      utils.billing.getAvailablePlans.invalidate();
    },
  });

  if (statusLoading || plansLoading || !organization) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const entitlements = status?.entitlements ?? [];
  const entitlementsBySkill = new Map(
    entitlements.map((e) => [e.skillId, e])
  );

  const addOnRows = (plans ?? []).map((pkg) => {
    const entitlement = entitlementsBySkill.get(pkg.skillId);
    const isActive = !!entitlement || pkg.isEntitled;
    return {
      id: pkg.id,
      skillId: pkg.skillId,
      name: pkg.name,
      description: pkg.description,
      priceAmount: pkg.priceAmount,
      purchasable: !!pkg.stripePriceId,
      isActive,
      entitlementId: entitlement?.id ?? null,
      stripeSubscriptionId: entitlement?.stripeSubscriptionId ?? null,
      licenseType: entitlement?.licenseType ?? null,
      renewsAt: entitlement?.expiresAt
        ? new Date(entitlement.expiresAt).toLocaleDateString()
        : null,
    };
  });

  const inactiveRows = addOnRows.filter((r) => !r.isActive);
  const activeCount = addOnRows.filter((r) => r.isActive).length;
  const monthlyTotal = activeCount * 9;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEnableSelected = () => {
    const selected = inactiveRows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({ id: r.id, name: r.name }));
    if (selected.length === 1) {
      setEnableSkill(selected[0]);
    } else if (selected.length > 1) {
      setEnableSkills(selected);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Billing
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your premium add-on features
        </p>
      </div>

      {/* Summary */}
      {activeCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Active Features</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Monthly Total</p>
              <p className="text-2xl font-bold">{formatPrice(monthlyTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-2xl font-bold capitalize">{status?.plan ?? "free"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add-on features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add-on Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {addOnRows.map((row) => (
            <div
              key={row.id}
              className={`flex items-center gap-4 rounded-lg border p-4 ${
                row.isActive ? "border-primary/20 bg-primary/5" : "border-border"
              }`}
            >
              {/* Checkbox for inactive purchasable rows */}
              {features.selfServiceUpgrade && !row.isActive && row.purchasable && (
                <Checkbox
                  checked={selectedIds.has(row.id)}
                  onCheckedChange={() => toggleSelect(row.id)}
                  aria-label={`Select ${row.name}`}
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  {row.isActive && (
                    <Badge variant="secondary" className="bg-[#66b280]/20 text-[#66b280] text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                {row.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {row.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {row.isActive ? (
                  <>
                    {row.renewsAt ? (
                      <span className="text-xs text-muted-foreground">
                        Renews {row.renewsAt}
                      </span>
                    ) : row.licenseType === "PERPETUAL" ? (
                      <Badge variant="secondary" className="text-xs">
                        Included
                      </Badge>
                    ) : null}
                    {features.selfServiceUpgrade &&
                      row.stripeSubscriptionId &&
                      row.entitlementId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive text-xs"
                          onClick={() =>
                            setCancelSkill({
                              entitlementId: row.entitlementId!,
                              name: row.name,
                            })
                          }
                        >
                          Cancel
                        </Button>
                      )}
                  </>
                ) : (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {formatPrice((row.priceAmount ?? 900) / 100)}/mo
                    </span>
                    {features.selfServiceUpgrade && row.purchasable ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEnableSkill({ id: row.id, name: row.name })
                        }
                      >
                        Enable
                      </Button>
                    ) : !row.purchasable ? (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Selection summary */}
          {features.selfServiceUpgrade && selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 mt-4">
              <p className="text-sm text-muted-foreground">
                {selectedIds.size} feature{selectedIds.size !== 1 ? "s" : ""} selected
                &mdash; {formatPrice(selectedIds.size * 9)}/month
              </p>
              <Button size="sm" onClick={handleEnableSelected}>
                Enable Selected ({selectedIds.size})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel confirmation */}
      {cancelSkill && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm">
              Cancel <span className="font-semibold">{cancelSkill.name}</span>?
              You&apos;ll lose access immediately and receive a prorated credit.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelSkill(null)}
                disabled={cancelFeature.isPending}
              >
                Keep Feature
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  cancelFeature.mutate({
                    organizationId: organization.id,
                    entitlementId: cancelSkill.entitlementId,
                  })
                }
                disabled={cancelFeature.isPending}
              >
                {cancelFeature.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Confirm Cancellation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enable single feature modal */}
      {enableSkill && (
        <EnableFeatureModal
          open={!!enableSkill}
          onClose={() => setEnableSkill(null)}
          organizationId={organization.id}
          skillPackageId={enableSkill.id}
          skillName={enableSkill.name}
        />
      )}

      {/* Enable multiple features modal */}
      {enableSkills && (
        <EnableMultipleFeaturesModal
          open={!!enableSkills}
          onClose={() => {
            setEnableSkills(null);
            setSelectedIds(new Set());
          }}
          organizationId={organization.id}
          skills={enableSkills}
        />
      )}
    </div>
  );
}
