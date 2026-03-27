"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MapPin,
  Mail,
  Award,
  Loader2,
  CheckCircle2,
  Globe,
  Send,
  Check,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/use-debounce";
import { features } from "@/config/features";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ExpertProfile } from "@/server/services/dealroom/client";

const PAGE_SIZE = 20;

export default function ExpertsPage() {
  const t = useTranslations("experts");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  useEffect(() => {
    if (!features.expertDirectoryEnabled) {
      router.replace("/governance");
    }
  }, [router]);

  if (!features.expertDirectoryEnabled) return null;

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("query") ?? ""
  );
  const [specialization, setSpecialization] = useState<string>(
    searchParams.get("specialization") ?? ""
  );
  const [country, setCountry] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [expertType, setExpertType] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebounce(searchQuery);

  // Contact dialog state
  const [contactExpert, setContactExpert] = useState<ExpertProfile | null>(null);
  const [contactForm, setContactForm] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterCompany: "",
    subject: "",
    message: "",
  });
  const [contactSent, setContactSent] = useState(false);

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (contactExpert) {
      setContactForm((prev) => ({
        ...prev,
        requesterName: session?.user?.name ?? prev.requesterName,
        requesterEmail: session?.user?.email ?? prev.requesterEmail,
      }));
      setContactSent(false);
    }
  }, [contactExpert, session]);

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, specialization, country, language, expertType]);

  const { data: filters } = trpc.experts.listFilters.useQuery();

  const { data: searchResult, isLoading } = trpc.experts.search.useQuery({
    query: debouncedSearch || undefined,
    specialization: specialization && specialization !== "all" ? specialization : undefined,
    country: country && country !== "all" ? country : undefined,
    language: language && language !== "all" ? language : undefined,
    expertType:
      expertType && expertType !== "all"
        ? (expertType as "legal" | "technical" | "deployment")
        : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const contactMutation = trpc.experts.contact.useMutation({
    onSuccess: () => setContactSent(true),
  });

  const experts = searchResult?.results ?? [];
  const total = searchResult?.total ?? 0;
  const hasMore = offset + PAGE_SIZE < total;

  const hasFilters =
    debouncedSearch ||
    (specialization && specialization !== "all") ||
    (country && country !== "all") ||
    (language && language !== "all") ||
    (expertType && expertType !== "all");

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactExpert) return;
    contactMutation.mutate({
      expertId: contactExpert.id,
      requesterName: contactForm.requesterName,
      requesterEmail: contactForm.requesterEmail,
      requesterCompany: contactForm.requesterCompany || undefined,
      subject: contactForm.subject,
      message: contactForm.message || undefined,
    });
  }

  function closeContactDialog() {
    setContactExpert(null);
    setContactForm({
      requesterName: "",
      requesterEmail: "",
      requesterCompany: "",
      subject: "",
      message: "",
    });
    setContactSent(false);
    contactMutation.reset();
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={specialization} onValueChange={setSpecialization}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("filterSpecialization")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              {filters?.specializations.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={expertType} onValueChange={setExpertType}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder={t("filterExpertType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {filters?.expertTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder={t("filterCountry")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {filters?.countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder={t("filterLanguage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {filters?.languages.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result count */}
      {!isLoading && total > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {Math.min(offset + PAGE_SIZE, total)} of {total} expert{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : experts.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((expert) => (
              <Card key={expert.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {expert.name ?? "Unnamed Expert"}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {expert.title ?? "AI Governance Expert"}
                      </p>
                      {expert.firm && (
                        <p className="text-xs text-primary truncate">{expert.firm}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {expert.expertTypes.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] capitalize">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      {expert.acceptingClients && (
                        <span className="flex items-center gap-1 text-[10px] text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          {t("available")}
                        </span>
                      )}
                    </div>
                  </div>

                  {expert.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{expert.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {expert.specializations.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex flex-col gap-0.5">
                      {(expert.location.city || expert.location.country) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[expert.location.city, expert.location.country]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                      {expert.jurisdictions.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {expert.jurisdictions.join(", ")}
                        </span>
                      )}
                    </div>
                    {expert.certifications.length > 0 && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Award className="w-3 h-3" />
                        {expert.certifications.join(", ")}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={!expert.acceptingClients}
                    onClick={() => setContactExpert(expert)}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {expert.acceptingClients ? t("contactExpert") : t("notAcceptingClients")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {(hasMore || offset > 0) && (
            <div className="flex items-center justify-center gap-3 pt-2">
              {offset > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  {t("previous")}
                </Button>
              )}
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  {t("next")}
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? t("emptyWithFilters")
              : t("emptyNoFilters")}
          </p>
        </div>
      )}

      {/* Contact Expert Dialog */}
      <Dialog open={!!contactExpert} onOpenChange={(open) => { if (!open) closeContactDialog(); }}>
        <DialogContent className="sm:max-w-md">
          {contactSent ? (
            <div className="py-6 text-center">
              <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-success" />
              </div>
              <DialogHeader className="items-center">
                <DialogTitle>Request Sent</DialogTitle>
                <DialogDescription>
                  Your message has been delivered to {contactExpert?.name ?? "the expert"}.
                  They will respond to {contactForm.requesterEmail} directly.
                </DialogDescription>
              </DialogHeader>
              <Button
                variant="outline"
                size="sm"
                className="mt-6"
                onClick={closeContactDialog}
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("contactDialogTitle", { name: contactExpert?.name ?? "Expert" })}</DialogTitle>
                <DialogDescription>
                  {contactExpert?.firm ? `${contactExpert.firm} — ` : ""}
                  Your request will be sent to the expert&apos;s inbox.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleContactSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-xs">Name *</Label>
                    <Input
                      id="contact-name"
                      required
                      value={contactForm.requesterName}
                      onChange={(e) =>
                        setContactForm((f) => ({ ...f, requesterName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email" className="text-xs">Email *</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      required
                      value={contactForm.requesterEmail}
                      onChange={(e) =>
                        setContactForm((f) => ({ ...f, requesterEmail: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-company" className="text-xs">Company</Label>
                  <Input
                    id="contact-company"
                    value={contactForm.requesterCompany}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, requesterCompany: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-subject" className="text-xs">Subject *</Label>
                  <Input
                    id="contact-subject"
                    required
                    placeholder={
                      contactExpert?.expertTypes.includes("deployment")
                        ? "AI Sentinel deployment assistance"
                        : "AI governance consultation"
                    }
                    value={contactForm.subject}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, subject: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-message" className="text-xs">Message</Label>
                  <Textarea
                    id="contact-message"
                    rows={3}
                    placeholder="Describe what you need help with..."
                    value={contactForm.message}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, message: e.target.value }))
                    }
                  />
                </div>
                {contactMutation.error && (
                  <p className="text-sm text-destructive">
                    {contactMutation.error.message}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeContactDialog}
                  >
                    {tc("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={contactMutation.isPending}
                    className="gap-2"
                  >
                    {contactMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send Request
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
