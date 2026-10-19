"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Departments (business units): create them, give each an owner, a deputy
 * owner and an optional parent (one level of nesting, drawn as a tree), and
 * assign people to one or more of them. A member with no department assigned
 * sees the whole organization, exactly as before departments existed. Owners
 * and admins always see the whole organization, and nobody changes their own
 * access (both enforced by the businessUnit router).
 *
 * An owner or deputy can be a member or a colleague invited who has not
 * joined yet; the invitation's ownership passes to them when they accept.
 *
 * Managing departments is an OWNER/ADMIN/AI_OFFICER action, enforced server-side
 * in the businessUnit router; the card is only shown to those roles.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { departmentTree } from "@/lib/department-tree";
import { DepartmentMultiSelect } from "./department-multi-select";

const NONE = "__none__";

/** A person who can own a department, as a Select value: "m:<memberId>" or "i:<invitationId>". */
type Person = { kind: "member" | "invitation"; id: string; name: string; email: string };
const personValue = (kind: "member" | "invitation", id: string | null) =>
  id ? `${kind === "member" ? "m" : "i"}:${id}` : null;

/** The owner pair for a Select value (exported for tests). */
export function ownerFields(value: string, which: "owner" | "deputy") {
  const memberKey = which === "owner" ? "ownerId" : "deputyOwnerId";
  const inviteKey = which === "owner" ? "ownerInvitationId" : "deputyInvitationId";
  if (value.startsWith("m:")) return { [memberKey]: value.slice(2), [inviteKey]: null };
  if (value.startsWith("i:")) return { [memberKey]: null, [inviteKey]: value.slice(2) };
  return { [memberKey]: null, [inviteKey]: null };
}

type Department = {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string | null;
  ownerInvitationId: string | null;
  ownerName: string | null;
  ownerPending: boolean;
  deputyOwnerId: string | null;
  deputyInvitationId: string | null;
  deputyName: string | null;
  deputyPending: boolean;
  systemCount: number;
  memberCount: number;
};
type Member = {
  id: string;
  role: string;
  name: string | null;
  email: string;
  businessUnitIds: string[];
  locked: "self" | "role" | null;
};

export function DepartmentsCard({ organizationId }: { organizationId: string }) {
  const t = useTranslations("departments");
  const utils = trpc.useUtils();
  const { data } = trpc.businessUnit.manage.useQuery({ organizationId });
  const departments = (data?.departments ?? []) as Department[];
  const members = (data?.members ?? []) as Member[];
  const { data: peopleData } = trpc.team.people.useQuery({ organizationId });
  const people = (peopleData ?? []) as Person[];
  const refresh = () => {
    void utils.businessUnit.manage.invalidate({ organizationId });
    void utils.businessUnit.listForScope.invalidate({ organizationId });
  };

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>(NONE);
  const [owner, setOwner] = useState<string>(NONE);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const create = trpc.businessUnit.create.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      setName("");
      setParentId(NONE);
      setOwner(NONE);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.businessUnit.remove.useMutation({
    onSuccess: () => {
      toast.success(t("deleted"));
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  // Only top-level departments can be a parent (one level of nesting).
  const parents = departments.filter((d) => d.parentId === null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Existing departments */}
        <div className="space-y-2">
          {departments.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
          {departmentTree(departments).map(({ department: d, depth }) => (
            <div
              key={d.id}
              data-testid="department-row"
              data-depth={depth}
              className={`flex flex-wrap items-center gap-3 p-2 rounded border border-border ${depth === 1 ? "ml-4 sm:ml-6 border-l-2 border-l-primary/40" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{d.name}</p>
                <p className="text-xs text-muted-foreground break-words">
                  {t("counts", { systems: d.systemCount, members: d.memberCount })}
                  {d.ownerName ? ` · ${t("ownedBy", { name: d.ownerName })}${d.ownerPending ? ` (${t("pendingShort")})` : ""}` : ""}
                  {d.deputyName ? ` · ${t("deputyBy", { name: d.deputyName })}${d.deputyPending ? ` (${t("pendingShort")})` : ""}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => setEditing(d)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("delete")}
                disabled={remove.isPending}
                onClick={() => setDeleting(d)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* New department */}
        <div className="space-y-2">
          <Label htmlFor="new-department-name" className="text-sm font-medium">
            {t("addLabel")}
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="new-department-name"
              value={name}
              placeholder={t("namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="sm:w-44" aria-label={t("parent")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("noParent")}</SelectItem>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PersonSelect
              people={people}
              value={owner}
              onChange={setOwner}
              noneLabel={t("noOwner")}
              ariaLabel={t("owner")}
              className="sm:w-44"
            />
            <Button
              disabled={!name.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  organizationId,
                  name: name.trim(),
                  parentId: parentId === NONE ? null : parentId,
                  ...ownerFields(owner, "owner"),
                })
              }
            >
              {create.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              {t("add")}
            </Button>
          </div>
        </div>

        {departments.length > 0 && (
          <>
            <Separator />
            <MemberAccess organizationId={organizationId} members={members} departments={departments} onChanged={refresh} />
          </>
        )}
      </CardContent>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting ? t("deleteConfirm", { name: deleting.name }) : ""}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (deleting) remove.mutate({ organizationId, id: deleting.id });
                setDeleting(null);
              }}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <EditDepartmentDialog
          organizationId={organizationId}
          department={editing}
          parents={parents.filter((p) => p.id !== editing.id)}
          people={people}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </Card>
  );
}

function MemberAccess({
  organizationId,
  members,
  departments,
  onChanged,
}: {
  organizationId: string;
  members: Member[];
  departments: Department[];
  onChanged: () => void;
}) {
  const t = useTranslations("departments");
  const setScope = trpc.businessUnit.setMemberDepartments.useMutation({
    onSuccess: () => {
      toast.success(t("access.saved"));
      onChanged();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t("access.title")}</p>
        <p className="text-sm text-muted-foreground">{t("access.description")}</p>
      </div>
      {members.map((m) => {
        const label = m.name ?? m.email;
        return (
          <div
            key={m.id}
            className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-border p-2"
            data-testid="member-access"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{label}</p>
              {m.locked && (
                <p className="text-xs text-muted-foreground">
                  {m.locked === "self" ? t("access.selfLocked") : t("access.roleLocked")}
                </p>
              )}
            </div>
            <DepartmentMultiSelect
              departments={departments}
              value={m.businessUnitIds}
              disabled={!!m.locked || setScope.isPending}
              onChange={(next) => setScope.mutate({ organizationId, memberId: m.id, businessUnitIds: next })}
              ariaLabel={t("access.choose", { name: label })}
              className="sm:w-56"
            />
          </div>
        );
      })}
    </div>
  );
}

/** Owner or deputy: a member, or a colleague invited who has not joined yet. */
function PersonSelect({
  people,
  value,
  onChange,
  noneLabel,
  ariaLabel,
  className,
  exclude,
}: {
  people: Person[];
  value: string;
  onChange: (value: string) => void;
  noneLabel: string;
  ariaLabel: string;
  className?: string;
  exclude?: string;
}) {
  const t = useTranslations("departments");
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {people
          .filter((p) => personValue(p.kind, p.id) !== exclude)
          .map((p) => {
            const v = personValue(p.kind, p.id)!;
            return (
              <SelectItem key={v} value={v}>
                {p.kind === "invitation" ? t("invitedName", { name: p.name }) : p.name}
              </SelectItem>
            );
          })}
      </SelectContent>
    </Select>
  );
}

function EditDepartmentDialog({
  organizationId,
  department,
  parents,
  people,
  onClose,
  onSaved,
}: {
  organizationId: string;
  department: Department;
  parents: Department[];
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("departments");
  const [name, setName] = useState(department.name);
  const [parentId, setParentId] = useState<string>(department.parentId ?? NONE);
  const [owner, setOwner] = useState<string>(
    personValue("member", department.ownerId) ?? personValue("invitation", department.ownerInvitationId) ?? NONE,
  );
  const [deputy, setDeputy] = useState<string>(
    personValue("member", department.deputyOwnerId) ??
      personValue("invitation", department.deputyInvitationId) ??
      NONE,
  );
  const sameAsOwner = owner !== NONE && owner === deputy;

  const update = trpc.businessUnit.update.useMutation({
    onSuccess: () => {
      toast.success(t("updated"));
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="edit-department-name">{t("name")}</Label>
            <Input
              id="edit-department-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("parent")}</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("noParent")}</SelectItem>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("owner")}</Label>
            <PersonSelect
              people={people}
              value={owner}
              onChange={setOwner}
              noneLabel={t("noOwner")}
              ariaLabel={t("owner")}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label>{t("deputy")}</Label>
            <PersonSelect
              people={people}
              value={deputy}
              onChange={setDeputy}
              noneLabel={t("noDeputy")}
              ariaLabel={t("deputy")}
              className="w-full"
              exclude={owner === NONE ? undefined : owner}
            />
            {sameAsOwner && <p className="text-xs text-destructive">{t("sameOwner")}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!name.trim() || update.isPending || sameAsOwner}
            onClick={() =>
              update.mutate({
                organizationId,
                id: department.id,
                name: name.trim(),
                parentId: parentId === NONE ? null : parentId,
                ...ownerFields(owner, "owner"),
                ...ownerFields(deputy, "deputy"),
              })
            }
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
