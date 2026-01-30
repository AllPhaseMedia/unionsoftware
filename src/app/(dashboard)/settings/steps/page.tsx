"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { StepTemplate } from "@/types";

export default function StepsPage() {
  const [steps, setSteps] = useState<StepTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<StepTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    stepNumber: 1,
    name: "",
    description: "",
    defaultDays: "",
    isActive: true,
  });

  useEffect(() => {
    fetchSteps();
  }, []);

  const fetchSteps = async () => {
    try {
      const response = await fetch("/api/step-templates");
      const data = await response.json();
      setSteps((data.data || []).sort((a: StepTemplate, b: StepTemplate) => a.stepNumber - b.stepNumber));
    } catch (error) {
      toast.error("Failed to load steps");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (step?: StepTemplate) => {
    if (step) {
      setEditingStep(step);
      setFormData({
        stepNumber: step.stepNumber,
        name: step.name,
        description: step.description || "",
        defaultDays: step.defaultDays?.toString() || "",
        isActive: step.isActive,
      });
    } else {
      setEditingStep(null);
      const nextStepNumber = steps.length > 0
        ? Math.max(...steps.map(s => s.stepNumber)) + 1
        : 1;
      setFormData({
        stepNumber: nextStepNumber,
        name: "",
        description: "",
        defaultDays: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingStep
        ? `/api/step-templates/${editingStep.id}`
        : "/api/step-templates";
      const method = editingStep ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          defaultDays: formData.defaultDays ? parseInt(formData.defaultDays) : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingStep ? "Step updated" : "Step created");
      setIsDialogOpen(false);
      fetchSteps();
    } catch (error) {
      toast.error("Failed to save step");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflow Steps</h1>
          <p className="text-gray-500">Configure grievance workflow steps</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStep ? "Edit Step" : "Add Step"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stepNumber">Step Number *</Label>
                  <Input
                    id="stepNumber"
                    type="number"
                    min="1"
                    value={formData.stepNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, stepNumber: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultDays">Default Days</Label>
                  <Input
                    id="defaultDays"
                    type="number"
                    min="1"
                    value={formData.defaultDays}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultDays: e.target.value })
                    }
                    placeholder="Days to deadline"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Step 1 - Verbal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what happens in this step"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStep ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : steps.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No workflow steps configured. Add your first step.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[80px]">Step</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Days</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </TableCell>
                    <TableCell className="font-medium">{step.stepNumber}</TableCell>
                    <TableCell className="font-medium">{step.name}</TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate">
                      {step.description || "-"}
                    </TableCell>
                    <TableCell>{step.defaultDays || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={step.isActive ? "default" : "secondary"}>
                        {step.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(step)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
