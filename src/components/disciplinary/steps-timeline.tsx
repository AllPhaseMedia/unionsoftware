"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Check, Clock, AlertTriangle, SkipForward, Loader2, CalendarIcon, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DisciplinaryStep {
  id: string;
  caseId: string;
  stepNumber: number;
  name: string;
  description: string | null;
  deadline: Date | string | null;
  completedAt: Date | string | null;
  completedById: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "SKIPPED";
  notes: string | null;
  completedBy?: { id: string; name: string } | null;
}

interface StepsTimelineProps {
  steps: DisciplinaryStep[];
  caseId: string;
  onStepUpdate?: () => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-gray-400" />,
  IN_PROGRESS: <Clock className="h-4 w-4 text-yellow-500" />,
  COMPLETED: <Check className="h-4 w-4 text-green-500" />,
  OVERDUE: <AlertTriangle className="h-4 w-4 text-red-500" />,
  SKIPPED: <SkipForward className="h-4 w-4 text-gray-400" />,
};

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  SKIPPED: "bg-gray-100 text-gray-500",
};

export function DisciplinaryStepsTimeline({ steps, caseId, onStepUpdate }: StepsTimelineProps) {
  const router = useRouter();
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<DisciplinaryStep | null>(null);
  const [completionDate, setCompletionDate] = useState<Date>(new Date());
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);
  const [editingCompletionDate, setEditingCompletionDate] = useState<string | null>(null);

  const refreshData = () => {
    router.refresh();
    onStepUpdate?.();
  };

  const updateStepStatus = async (
    stepId: string,
    newStatus: string,
    stepNotes?: string,
    customCompletedAt?: Date
  ) => {
    setUpdatingStep(stepId);
    try {
      const response = await fetch(`/api/disciplinary/${caseId}/steps/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          notes: stepNotes,
          completedAt: newStatus === "COMPLETED"
            ? (customCompletedAt || new Date()).toISOString()
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update step");
      }

      toast.success("Step updated successfully");
      refreshData();
      setDialogOpen(false);
      setNotes("");
      setSelectedStep(null);
      setCompletionDate(new Date());
    } catch (error) {
      toast.error("Failed to update step");
    } finally {
      setUpdatingStep(null);
    }
  };

  const updateDeadline = async (stepId: string, newDeadline: Date) => {
    setUpdatingStep(stepId);
    try {
      const response = await fetch(`/api/disciplinary/${caseId}/steps/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deadline: newDeadline.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update deadline");
      }

      toast.success("Deadline updated successfully");
      refreshData();
      setEditingDeadline(null);
    } catch (error) {
      toast.error("Failed to update deadline");
    } finally {
      setUpdatingStep(null);
    }
  };

  const updateCompletionDate = async (stepId: string, newCompletionDate: Date) => {
    setUpdatingStep(stepId);
    try {
      const response = await fetch(`/api/disciplinary/${caseId}/steps/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedAt: newCompletionDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update completion date");
      }

      toast.success("Completion date updated successfully");
      refreshData();
      setEditingCompletionDate(null);
    } catch (error) {
      toast.error("Failed to update completion date");
    } finally {
      setUpdatingStep(null);
    }
  };

  const resetStep = async (stepId: string) => {
    setUpdatingStep(stepId);
    try {
      const response = await fetch(`/api/disciplinary/${caseId}/steps/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PENDING",
          completedAt: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset step");
      }

      toast.success("Step reset successfully");
      refreshData();
    } catch (error) {
      toast.error("Failed to reset step");
    } finally {
      setUpdatingStep(null);
    }
  };

  const openCompleteDialog = (step: DisciplinaryStep) => {
    setSelectedStep(step);
    setNotes(step.notes || "");
    setCompletionDate(new Date());
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Process Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Steps */}
          <div className="space-y-6">
            {steps
              .sort((a, b) => a.stepNumber - b.stepNumber)
              .map((step) => (
                <div key={step.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      step.status === "COMPLETED"
                        ? "border-green-500 bg-green-50"
                        : step.status === "IN_PROGRESS"
                        ? "border-yellow-500 bg-yellow-50"
                        : step.status === "OVERDUE"
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {statusIcons[step.status]}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium">
                          {step.name}
                        </h4>
                        {step.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {step.description}
                          </p>
                        )}
                      </div>
                      <Badge className={statusColors[step.status]}>
                        {step.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="mt-2 text-sm text-gray-500 space-y-1">
                      {step.deadline ? (
                        <div className="flex items-center gap-1">
                          <span>Deadline: {format(new Date(step.deadline), "MMM d, yyyy")}</span>
                          <Popover
                            open={editingDeadline === step.id}
                            onOpenChange={(open) => setEditingDeadline(open ? step.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                className="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Edit deadline"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={new Date(step.deadline)}
                                onSelect={(date) => {
                                  if (date) {
                                    updateDeadline(step.id, date);
                                  }
                                }}
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">No deadline set</span>
                          <Popover
                            open={editingDeadline === step.id}
                            onOpenChange={(open) => setEditingDeadline(open ? step.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                className="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Set deadline"
                              >
                                <CalendarIcon className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    updateDeadline(step.id, date);
                                  }
                                }}
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                      {step.completedAt && (
                        <div className="flex items-center gap-1">
                          <span>Completed: {format(new Date(step.completedAt), "MMM d, yyyy")}</span>
                          <Popover
                            open={editingCompletionDate === step.id}
                            onOpenChange={(open) => setEditingCompletionDate(open ? step.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                className="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Edit completion date"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={new Date(step.completedAt)}
                                onSelect={(date) => {
                                  if (date) {
                                    updateCompletionDate(step.id, date);
                                  }
                                }}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                      {step.notes && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-xs font-medium text-amber-800 mb-1">Notes:</p>
                          <p className="text-sm text-amber-900 whitespace-pre-wrap">{step.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex gap-2">
                      {step.status !== "COMPLETED" && step.status !== "SKIPPED" && (
                        <>
                          {step.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStepStatus(step.id, "IN_PROGRESS")}
                              disabled={updatingStep === step.id}
                            >
                              {updatingStep === step.id && (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              )}
                              Start
                            </Button>
                          )}
                          <Dialog open={dialogOpen && selectedStep?.id === step.id} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => openCompleteDialog(step)}
                                disabled={updatingStep === step.id}
                              >
                                Complete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Complete: {step.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Completion Date</Label>
                                  <p className="text-xs text-gray-500">
                                    Set when this step was actually completed. Subsequent step deadlines will be calculated from this date.
                                  </p>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          !completionDate && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {completionDate ? (
                                          format(completionDate, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={completionDate}
                                        onSelect={(date) => date && setCompletionDate(date)}
                                        disabled={(date) =>
                                          date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="space-y-2">
                                  <Label>Notes (optional)</Label>
                                  <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes about this step..."
                                    rows={4}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      updateStepStatus(step.id, "COMPLETED", notes, completionDate)
                                    }
                                    disabled={updatingStep === step.id}
                                  >
                                    {updatingStep === step.id && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Mark Complete
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStepStatus(step.id, "SKIPPED")}
                            disabled={updatingStep === step.id}
                          >
                            Skip
                          </Button>
                        </>
                      )}
                      {(step.status === "COMPLETED" || step.status === "SKIPPED") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetStep(step.id)}
                          disabled={updatingStep === step.id}
                        >
                          {updatingStep === step.id ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-2 h-3 w-3" />
                          )}
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
