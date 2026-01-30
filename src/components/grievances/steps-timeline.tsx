"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Check, Clock, AlertTriangle, SkipForward, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { GrievanceStep } from "@/types";

interface StepsTimelineProps {
  steps: GrievanceStep[];
  grievanceId: string;
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

export function StepsTimeline({ steps, grievanceId, onStepUpdate }: StepsTimelineProps) {
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<GrievanceStep | null>(null);

  const updateStepStatus = async (
    stepId: string,
    newStatus: string,
    stepNotes?: string
  ) => {
    setUpdatingStep(stepId);
    try {
      const response = await fetch(`/api/grievances/${grievanceId}/steps/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          notes: stepNotes,
          completedAt: newStatus === "COMPLETED" ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update step");
      }

      toast.success("Step updated successfully");
      onStepUpdate?.();
      setDialogOpen(false);
      setNotes("");
      setSelectedStep(null);
    } catch (error) {
      toast.error("Failed to update step");
    } finally {
      setUpdatingStep(null);
    }
  };

  const openCompleteDialog = (step: GrievanceStep) => {
    setSelectedStep(step);
    setNotes(step.notes || "");
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workflow Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Steps */}
          <div className="space-y-6">
            {steps
              .sort((a, b) => a.stepNumber - b.stepNumber)
              .map((step, index) => (
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
                          Step {step.stepNumber}: {step.name}
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
                      {step.deadline && (
                        <p>
                          Deadline: {format(new Date(step.deadline), "MMM d, yyyy")}
                        </p>
                      )}
                      {step.completedAt && (
                        <p>
                          Completed: {format(new Date(step.completedAt), "MMM d, yyyy")}
                        </p>
                      )}
                      {step.notes && (
                        <p className="italic">&quot;{step.notes}&quot;</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    {step.status !== "COMPLETED" && step.status !== "SKIPPED" && (
                      <div className="mt-3 flex gap-2">
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
                              <DialogTitle>Complete Step {step.stepNumber}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
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
                                    updateStepStatus(step.id, "COMPLETED", notes)
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
