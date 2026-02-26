"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  ListTodo,
  Bell,
  Search,
  Plus,
  User,
  Calendar,
  Send,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const severityColors: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  MEDIUM: "bg-warning/20 text-warning",
  LOW: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  REPORTED: "border-warning text-warning",
  INVESTIGATING: "border-info text-info",
  MITIGATING: "border-warning text-warning",
  RESOLVED: "border-success text-success",
  CLOSED: "border-muted-foreground text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  HALLUCINATION: "Hallucination",
  BIAS_DISCRIMINATION: "Bias/Discrimination",
  MODEL_DRIFT: "Model Drift",
  ADVERSARIAL_ATTACK: "Adversarial Attack",
  PROMPT_INJECTION: "Prompt Injection",
  UNAUTHORIZED_ACCESS: "Unauthorized Access",
  SAFETY_FAILURE: "Safety Failure",
  PERFORMANCE_DEGRADATION: "Performance Degradation",
  DATA_POISONING: "Data Poisoning",
  PRIVACY_VIOLATION: "Privacy Violation",
  OTHER: "Other",
};

const notificationStatusColors: Record<string, string> = {
  PENDING: "border-warning text-warning",
  SENT: "border-success text-success",
  ACKNOWLEDGED: "border-info text-info",
};

const statusTransitions: Record<string, string[]> = {
  REPORTED: ["INVESTIGATING"],
  INVESTIGATING: ["MITIGATING"],
  MITIGATING: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
};

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { organization } = useOrganization();

  // Dialog states
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);

  // Timeline form
  const [timelineAction, setTimelineAction] = useState("");
  const [timelineDescription, setTimelineDescription] = useState("");

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Notification form
  const [notifAuthority, setNotifAuthority] = useState("");
  const [notifType, setNotifType] = useState("");
  const [notifDueBy, setNotifDueBy] = useState("");

  // Root cause form
  const [rootCauseCategory, setRootCauseCategory] = useState("");
  const [rootCauseDescription, setRootCauseDescription] = useState("");
  const [impactDescription, setImpactDescription] = useState("");
  const [rootCauseInitialized, setRootCauseInitialized] = useState(false);

  const utils = trpc.useUtils();

  const { data: incident, isLoading } = trpc.incident.getById.useQuery(
    { organizationId: organization?.id ?? "", id },
    { enabled: !!organization?.id && !!id }
  );

  useEffect(() => {
    if (!rootCauseInitialized && incident) {
      setRootCauseCategory(incident.rootCauseCategory ?? "");
      setRootCauseDescription(incident.rootCauseDescription ?? "");
      setImpactDescription(incident.impactDescription ?? "");
      setRootCauseInitialized(true);
    }
  }, [incident, rootCauseInitialized]);

  const updateIncident = trpc.incident.update.useMutation({
    onSuccess: () => {
      toast.success("Incident updated");
      utils.incident.getById.invalidate({ organizationId: organization?.id ?? "", id });
      utils.incident.list.invalidate();
      utils.incident.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update incident");
    },
  });

  const addTimelineEntry = trpc.incident.addTimelineEntry.useMutation({
    onSuccess: () => {
      toast.success("Timeline entry added");
      utils.incident.getById.invalidate({ organizationId: organization?.id ?? "", id });
      setShowTimelineDialog(false);
      setTimelineAction("");
      setTimelineDescription("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add timeline entry");
    },
  });

  const addTask = trpc.incident.addTask.useMutation({
    onSuccess: () => {
      toast.success("Task added");
      utils.incident.getById.invalidate({ organizationId: organization?.id ?? "", id });
      setShowTaskDialog(false);
      setTaskTitle("");
      setTaskAssignedTo("");
      setTaskDueDate("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add task");
    },
  });

  const updateTask = trpc.incident.updateTask.useMutation({
    onSuccess: () => {
      utils.incident.getById.invalidate({ organizationId: organization?.id ?? "", id });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update task");
    },
  });

  const addNotification = trpc.incident.addNotification.useMutation({
    onSuccess: () => {
      toast.success("Notification added");
      utils.incident.getById.invalidate({ organizationId: organization?.id ?? "", id });
      setShowNotificationDialog(false);
      setNotifAuthority("");
      setNotifType("");
      setNotifDueBy("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add notification");
    },
  });

  const updateNotification = trpc.incident.updateNotification.useMutation({
    onSuccess: () => {
      toast.success("Notification updated");
      utils.incident.getById.invalidate({ organizationId: organization?.id ?? "", id });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update notification");
    },
  });

  if (isLoading || !organization?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Incident not found</p>
        <Link href="/governance/incidents">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Incidents
          </Button>
        </Link>
      </div>
    );
  }

  const nextStatuses = statusTransitions[incident.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/governance/incidents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">{incident.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  className={severityColors[incident.severity] || ""}
                >
                  {incident.severity}
                </Badge>
                <Badge
                  variant="outline"
                  className={statusColors[incident.status] || ""}
                >
                  {incident.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Transition Buttons */}
      {nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((nextStatus) => (
            <Button
              key={nextStatus}
              variant="outline"
              size="sm"
              onClick={() =>
                updateIncident.mutate({
                  organizationId: organization?.id ?? "",
                  id: incident.id,
                  status: nextStatus,
                })
              }
              disabled={updateIncident.isPending}
            >
              {updateIncident.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Move to {nextStatus}
            </Button>
          ))}
        </div>
      )}

      {/* Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {incident.description && (
              <p className="text-muted-foreground">{incident.description}</p>
            )}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium text-sm">
                  {typeLabels[incident.type] || incident.type}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI System</p>
                <p className="font-medium text-sm">
                  {incident.aiSystem ? (
                    <Link
                      href={`/governance/ai-registry/${incident.aiSystem.id}`}
                      className="text-primary hover:underline"
                    >
                      {incident.aiSystem.name}
                    </Link>
                  ) : (
                    "Not linked"
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reported By</p>
                <p className="font-medium text-sm">{incident.reportedBy || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reported At</p>
                <p className="font-medium text-sm">{formatDate(incident.reportedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notification Required</p>
                <p className="font-medium text-sm">
                  {incident.notificationRequired ? "Yes (Art. 62)" : "No"}
                </p>
              </div>
              {incident.resolvedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Resolved At</p>
                  <p className="font-medium text-sm">{formatDate(incident.resolvedAt)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-primary">{incident.timeline?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Timeline Entries</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{incident.tasks?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Tasks</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{incident.notifications?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Notifications</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium text-sm">{formatRelativeTime(incident.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="timeline" className="text-xs sm:text-sm">
            Timeline ({incident.timeline?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs sm:text-sm">
            Tasks ({incident.tasks?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm">
            Notifications ({incident.notifications?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="root-cause" className="text-xs sm:text-sm">
            Root Cause
          </TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>Chronological record of incident activity</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTimelineDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </CardHeader>
            <CardContent>
              {incident.timeline && incident.timeline.length > 0 ? (
                <div className="space-y-3">
                  {incident.timeline.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 bg-muted/50"
                    >
                      <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{entry.action}</p>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {entry.performedBy && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {entry.performedBy}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(entry.performedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No timeline entries yet</p>
                  <p className="text-sm">Add entries to track incident progress</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Action items for incident resolution</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTaskDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {incident.tasks && incident.tasks.length > 0 ? (
                <div className="space-y-3">
                  {incident.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-muted/50"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateTask.mutate({
                            organizationId: organization?.id ?? "",
                            taskId: task.id,
                            status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
                          })
                        }
                        className="shrink-0"
                      >
                        <CheckCircle2
                          className={`w-5 h-5 ${
                            task.status === "COMPLETED"
                              ? "text-success"
                              : "text-muted-foreground hover:text-primary"
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm ${
                            task.status === "COMPLETED"
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {task.assignedTo && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {task.assignedTo}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          task.status === "COMPLETED"
                            ? "border-success text-success"
                            : "border-warning text-warning"
                        }`}
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks yet</p>
                  <p className="text-sm">Add tasks to track resolution actions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Authority Notifications</CardTitle>
                <CardDescription>
                  Art. 62 notifications to market surveillance authorities
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNotificationDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Notification
              </Button>
            </CardHeader>
            <CardContent>
              {incident.notifications && incident.notifications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Authority</th>
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">Due By</th>
                        <th className="pb-2 pr-4 font-medium">Sent At</th>
                        <th className="pb-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incident.notifications.map((notif) => (
                        <tr key={notif.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">{notif.authority}</td>
                          <td className="py-3 pr-4">{notif.notificationType}</td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                notificationStatusColors[notif.status] || ""
                              }`}
                            >
                              {notif.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">{formatDate(notif.dueBy)}</td>
                          <td className="py-3 pr-4">{formatDate(notif.sentAt)}</td>
                          <td className="py-3">
                            {notif.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateNotification.mutate({
                                    organizationId: organization?.id ?? "",
                                    notificationId: notif.id,
                                    status: "SENT",
                                    sentAt: new Date().toISOString(),
                                  })
                                }
                                disabled={updateNotification.isPending}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Mark Sent
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications yet</p>
                  <p className="text-sm">
                    Add authority notification records for Art. 62 compliance
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Root Cause Tab */}
        <TabsContent value="root-cause" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Root Cause Analysis</CardTitle>
              <CardDescription>
                Document the root cause, category, and impact of the incident
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rootCauseCategory">Root Cause Category</Label>
                <Input
                  id="rootCauseCategory"
                  placeholder="e.g., Training Data Quality, Model Architecture, Configuration Error"
                  value={rootCauseCategory}
                  onChange={(e) => setRootCauseCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rootCauseDescription">Root Cause Description</Label>
                <Textarea
                  id="rootCauseDescription"
                  placeholder="Describe the root cause of the incident in detail..."
                  rows={4}
                  value={rootCauseDescription}
                  onChange={(e) => setRootCauseDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="impactDescription">Impact Description</Label>
                <Textarea
                  id="impactDescription"
                  placeholder="Describe the impact of the incident: affected users, business impact, regulatory implications..."
                  rows={4}
                  value={impactDescription}
                  onChange={(e) => setImpactDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    updateIncident.mutate({
                      organizationId: organization?.id ?? "",
                      id: incident.id,
                      rootCauseCategory: rootCauseCategory || null,
                      rootCauseDescription: rootCauseDescription || null,
                      impactDescription: impactDescription || null,
                    })
                  }
                  disabled={updateIncident.isPending}
                >
                  {updateIncident.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Root Cause
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Timeline Entry Dialog */}
      <Dialog open={showTimelineDialog} onOpenChange={setShowTimelineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Timeline Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="timeline-action">Action *</Label>
              <Input
                id="timeline-action"
                placeholder="e.g., Escalated to ML team"
                value={timelineAction}
                onChange={(e) => setTimelineAction(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline-description">Description</Label>
              <Textarea
                id="timeline-description"
                placeholder="Provide additional details about this action..."
                rows={3}
                value={timelineDescription}
                onChange={(e) => setTimelineDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTimelineDialog(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!timelineAction || addTimelineEntry.isPending}
              onClick={() =>
                addTimelineEntry.mutate({
                  organizationId: organization?.id ?? "",
                  incidentId: incident.id,
                  action: timelineAction,
                  description: timelineDescription || undefined,
                })
              }
            >
              {addTimelineEntry.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                placeholder="e.g., Review model training data"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assigned-to">Assigned To</Label>
              <Input
                id="task-assigned-to"
                placeholder="e.g., ML Engineering Team"
                value={taskAssignedTo}
                onChange={(e) => setTaskAssignedTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTaskDialog(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!taskTitle || addTask.isPending}
              onClick={() =>
                addTask.mutate({
                  organizationId: organization?.id ?? "",
                  incidentId: incident.id,
                  title: taskTitle,
                  assignedTo: taskAssignedTo || undefined,
                  dueDate: taskDueDate || undefined,
                })
              }
            >
              {addTask.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Authority Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notif-authority">Authority *</Label>
              <Input
                id="notif-authority"
                placeholder="e.g., National AI Office, Data Protection Authority"
                value={notifAuthority}
                onChange={(e) => setNotifAuthority(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-type">Notification Type *</Label>
              <Input
                id="notif-type"
                placeholder="e.g., Art. 62 Serious Incident Report"
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-due-by">Due By</Label>
              <Input
                id="notif-due-by"
                type="date"
                value={notifDueBy}
                onChange={(e) => setNotifDueBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNotificationDialog(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!notifAuthority || !notifType || addNotification.isPending}
              onClick={() =>
                addNotification.mutate({
                  organizationId: organization?.id ?? "",
                  incidentId: incident.id,
                  authority: notifAuthority,
                  notificationType: notifType,
                  dueBy: notifDueBy || undefined,
                })
              }
            >
              {addNotification.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
