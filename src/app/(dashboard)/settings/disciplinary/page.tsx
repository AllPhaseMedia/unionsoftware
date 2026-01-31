"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Loader2,
  GripVertical,
  Trash2,
  ListChecks,
  FileText,
  Hash,
  Save,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface DisciplinaryStepTemplate {
  id: string;
  stepNumber: number;
  name: string;
  description: string | null;
  defaultDeadlineDays: number | null;
  isActive: boolean;
}

interface DisciplinarySnippet {
  id: string;
  name: string;
  content: string;
  category: "INVESTIGATION" | "INTERVIEW" | "RESOLUTION" | "GENERAL";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CaseNumberSettings {
  prefix: string;
  includeYear: boolean;
  separator: string;
  nextNumber: number;
  padding: number;
}

export default function DisciplinarySettingsPage() {
  // Steps state
  const [steps, setSteps] = useState<DisciplinaryStepTemplate[]>([]);
  const [isStepsLoading, setIsStepsLoading] = useState(true);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<DisciplinaryStepTemplate | null>(null);
  const [isStepSaving, setIsStepSaving] = useState(false);
  const [stepFormData, setStepFormData] = useState({
    stepNumber: 1,
    name: "",
    description: "",
    defaultDays: "",
    isActive: true,
  });

  // Snippets state
  const [snippets, setSnippets] = useState<DisciplinarySnippet[]>([]);
  const [isSnippetsLoading, setIsSnippetsLoading] = useState(true);
  const [isSnippetDialogOpen, setIsSnippetDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<DisciplinarySnippet | null>(null);
  const [isSnippetSaving, setIsSnippetSaving] = useState(false);
  const [snippetToDelete, setSnippetToDelete] = useState<DisciplinarySnippet | null>(null);
  const [deleteSnippetDialogOpen, setDeleteSnippetDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [snippetFormData, setSnippetFormData] = useState({
    name: "",
    content: "",
    category: "GENERAL" as "INVESTIGATION" | "INTERVIEW" | "RESOLUTION" | "GENERAL",
    isActive: true,
  });

  // Case number settings state
  const [caseNumberSettings, setCaseNumberSettings] = useState<CaseNumberSettings>({
    prefix: "DC",
    includeYear: true,
    separator: "-",
    nextNumber: 1,
    padding: 4,
  });
  const [isCaseNumberLoading, setIsCaseNumberLoading] = useState(true);
  const [isCaseNumberSaving, setIsCaseNumberSaving] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchSteps();
    fetchSnippets();
    fetchCaseNumberSettings();
  }, []);

  // Steps functions
  const fetchSteps = async () => {
    try {
      const response = await fetch("/api/settings/disciplinary/steps");
      const data = await response.json();
      setSteps((data.data || []).sort((a: DisciplinaryStepTemplate, b: DisciplinaryStepTemplate) => a.stepNumber - b.stepNumber));
    } catch (error) {
      toast.error("Failed to load steps");
    } finally {
      setIsStepsLoading(false);
    }
  };

  const handleOpenStepDialog = (step?: DisciplinaryStepTemplate) => {
    if (step) {
      setEditingStep(step);
      setStepFormData({
        stepNumber: step.stepNumber,
        name: step.name,
        description: step.description || "",
        defaultDays: step.defaultDeadlineDays?.toString() || "",
        isActive: step.isActive,
      });
    } else {
      setEditingStep(null);
      const nextStepNumber = steps.length > 0
        ? Math.max(...steps.map(s => s.stepNumber)) + 1
        : 1;
      setStepFormData({
        stepNumber: nextStepNumber,
        name: "",
        description: "",
        defaultDays: "",
        isActive: true,
      });
    }
    setIsStepDialogOpen(true);
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStepSaving(true);

    try {
      const url = editingStep
        ? `/api/settings/disciplinary/steps`
        : "/api/settings/disciplinary/steps";
      const method = "PUT";

      const body = editingStep
        ? {
            id: editingStep.id,
            stepNumber: stepFormData.stepNumber,
            name: stepFormData.name,
            description: stepFormData.description,
            defaultDeadlineDays: stepFormData.defaultDays ? parseInt(stepFormData.defaultDays) : null,
            isActive: stepFormData.isActive,
          }
        : {
            create: true,
            stepNumber: stepFormData.stepNumber,
            name: stepFormData.name,
            description: stepFormData.description,
            defaultDeadlineDays: stepFormData.defaultDays ? parseInt(stepFormData.defaultDays) : null,
            isActive: stepFormData.isActive,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingStep ? "Step updated" : "Step created");
      setIsStepDialogOpen(false);
      fetchSteps();
    } catch (error) {
      toast.error("Failed to save step");
    } finally {
      setIsStepSaving(false);
    }
  };

  // Snippets functions
  const fetchSnippets = async () => {
    try {
      const res = await fetch("/api/settings/disciplinary/snippets");
      if (!res.ok) throw new Error("Failed to fetch snippets");
      const data = await res.json();
      setSnippets(data.data || []);
    } catch (err) {
      toast.error("Failed to load snippets");
    } finally {
      setIsSnippetsLoading(false);
    }
  };

  const handleOpenSnippetDialog = (snippet?: DisciplinarySnippet) => {
    if (snippet) {
      setEditingSnippet(snippet);
      setSnippetFormData({
        name: snippet.name,
        content: snippet.content,
        category: snippet.category,
        isActive: snippet.isActive,
      });
    } else {
      setEditingSnippet(null);
      setSnippetFormData({
        name: "",
        content: "",
        category: "GENERAL",
        isActive: true,
      });
    }
    setIsSnippetDialogOpen(true);
  };

  const handleSnippetSubmit = async () => {
    if (!snippetFormData.name.trim() || !snippetFormData.content.trim()) {
      toast.error("Name and content are required");
      return;
    }

    try {
      setIsSnippetSaving(true);

      const url = editingSnippet
        ? `/api/settings/disciplinary/snippets/${editingSnippet.id}`
        : "/api/settings/disciplinary/snippets";
      const method = editingSnippet ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snippetFormData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save snippet");
      }

      toast.success(editingSnippet ? "Snippet updated" : "Snippet created");
      await fetchSnippets();
      setIsSnippetDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save snippet");
    } finally {
      setIsSnippetSaving(false);
    }
  };

  const handleDeleteSnippet = async () => {
    if (!snippetToDelete) return;

    try {
      setIsSnippetSaving(true);
      const res = await fetch(`/api/settings/disciplinary/snippets/${snippetToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete snippet");

      await fetchSnippets();
      setDeleteSnippetDialogOpen(false);
      setSnippetToDelete(null);
      toast.success("Snippet deleted");
    } catch (err) {
      toast.error("Failed to delete snippet");
    } finally {
      setIsSnippetSaving(false);
    }
  };

  const filteredSnippets = snippets.filter(
    (s) => categoryFilter === "all" || s.category === categoryFilter
  );

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "INVESTIGATION":
        return "Investigation";
      case "INTERVIEW":
        return "Interview";
      case "RESOLUTION":
        return "Resolution";
      case "GENERAL":
        return "General";
      default:
        return category;
    }
  };

  // Case number settings functions
  const fetchCaseNumberSettings = async () => {
    try {
      const response = await fetch("/api/settings/disciplinary/case-number");
      const data = await response.json();
      if (data.success && data.data) {
        setCaseNumberSettings(data.data);
      }
    } catch (error) {
      toast.error("Failed to load case number settings");
    } finally {
      setIsCaseNumberLoading(false);
    }
  };

  const saveCaseNumberSettings = async () => {
    setIsCaseNumberSaving(true);
    try {
      const response = await fetch("/api/settings/disciplinary/case-number", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseNumberSettings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Case number settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsCaseNumberSaving(false);
    }
  };

  const generatePreviewCaseNumber = () => {
    const { prefix, includeYear, separator, nextNumber, padding } = caseNumberSettings;
    const year = String(new Date().getFullYear()).slice(-2);
    const paddedNumber = String(nextNumber).padStart(padding, "0");

    if (includeYear) {
      return `${prefix}${separator}${year}${separator}${paddedNumber}`;
    }
    return `${prefix}${separator}${paddedNumber}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Disciplinary Settings</h1>
        <p className="text-gray-500">Configure workflow steps, text snippets, and case number format</p>
      </div>

      <Tabs defaultValue="steps" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="steps" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Workflow Steps
          </TabsTrigger>
          <TabsTrigger value="snippets" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Text Snippets
          </TabsTrigger>
          <TabsTrigger value="case-number" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Case Number
          </TabsTrigger>
        </TabsList>

        {/* Workflow Steps Tab */}
        <TabsContent value="steps" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Configure the steps in your disciplinary workflow</p>
            <Button onClick={() => handleOpenStepDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isStepsLoading ? (
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
                        <TableCell>{step.defaultDeadlineDays || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={step.isActive ? "default" : "secondary"}>
                            {step.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenStepDialog(step)}
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
        </TabsContent>

        {/* Text Snippets Tab */}
        <TabsContent value="snippets" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Manage preset text for disciplinary case documentation</p>
            <div className="flex items-center gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="INVESTIGATION">Investigation</SelectItem>
                  <SelectItem value="INTERVIEW">Interview</SelectItem>
                  <SelectItem value="RESOLUTION">Resolution</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => handleOpenSnippetDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Snippet
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isSnippetsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Preview</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSnippets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No snippets found. Create your first snippet to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSnippets.map((snippet) => (
                        <TableRow key={snippet.id}>
                          <TableCell className="font-medium">{snippet.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getCategoryLabel(snippet.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-gray-500">
                            {snippet.content.substring(0, 100)}
                            {snippet.content.length > 100 && "..."}
                          </TableCell>
                          <TableCell>
                            <Badge variant={snippet.isActive ? "default" : "outline"}>
                              {snippet.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenSnippetDialog(snippet)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSnippetToDelete(snippet);
                                  setDeleteSnippetDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Case Number Format Tab */}
        <TabsContent value="case-number" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Configure the format for disciplinary case numbers</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Format Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isCaseNumberLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="prefix">Prefix</Label>
                      <Input
                        id="prefix"
                        value={caseNumberSettings.prefix}
                        onChange={(e) =>
                          setCaseNumberSettings({ ...caseNumberSettings, prefix: e.target.value })
                        }
                        placeholder="DC"
                        maxLength={10}
                      />
                      <p className="text-xs text-gray-500">The letters that appear at the start (e.g., DC, DISC, D)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="separator">Separator</Label>
                      <Input
                        id="separator"
                        value={caseNumberSettings.separator}
                        onChange={(e) =>
                          setCaseNumberSettings({ ...caseNumberSettings, separator: e.target.value })
                        }
                        placeholder="-"
                        maxLength={3}
                      />
                      <p className="text-xs text-gray-500">Character between parts (e.g., -, /, .)</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="includeYear">Include Year</Label>
                        <p className="text-xs text-gray-500">Add current year to case number</p>
                      </div>
                      <Switch
                        id="includeYear"
                        checked={caseNumberSettings.includeYear}
                        onCheckedChange={(checked) =>
                          setCaseNumberSettings({ ...caseNumberSettings, includeYear: checked })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextNumber">Next Number</Label>
                      <Input
                        id="nextNumber"
                        type="number"
                        min="1"
                        value={caseNumberSettings.nextNumber}
                        onChange={(e) =>
                          setCaseNumberSettings({ ...caseNumberSettings, nextNumber: parseInt(e.target.value) || 1 })
                        }
                      />
                      <p className="text-xs text-gray-500">The next sequential number to be assigned</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="padding">Number Padding</Label>
                      <Select
                        value={String(caseNumberSettings.padding)}
                        onValueChange={(value) =>
                          setCaseNumberSettings({ ...caseNumberSettings, padding: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 digits (01)</SelectItem>
                          <SelectItem value="3">3 digits (001)</SelectItem>
                          <SelectItem value="4">4 digits (0001)</SelectItem>
                          <SelectItem value="5">5 digits (00001)</SelectItem>
                          <SelectItem value="6">6 digits (000001)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Minimum digits for the number portion</p>
                    </div>

                    <Button onClick={saveCaseNumberSettings} disabled={isCaseNumberSaving} className="w-full">
                      {isCaseNumberSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Settings
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">Next case number will be:</p>
                  <p className="text-3xl font-mono font-bold text-primary">
                    {generatePreviewCaseNumber()}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <h4 className="font-medium">Format breakdown:</h4>
                  <ul className="space-y-1 text-gray-500">
                    <li>
                      <span className="font-medium text-gray-700">Prefix:</span> {caseNumberSettings.prefix}
                    </li>
                    {caseNumberSettings.includeYear && (
                      <li>
                        <span className="font-medium text-gray-700">Year:</span> {String(new Date().getFullYear()).slice(-2)}
                      </li>
                    )}
                    <li>
                      <span className="font-medium text-gray-700">Number:</span> {String(caseNumberSettings.nextNumber).padStart(caseNumberSettings.padding, "0")}
                    </li>
                    <li>
                      <span className="font-medium text-gray-700">Separator:</span> &quot;{caseNumberSettings.separator}&quot;
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 text-sm">
                  <h4 className="font-medium text-blue-900 mb-1">Note</h4>
                  <p className="text-blue-700">
                    The &quot;Next Number&quot; will automatically increment each time a new disciplinary case is created.
                    Only change this if you need to reset or adjust the sequence.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Step Dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStep ? "Edit Step" : "Add Step"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStepSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stepNumber">Step Number *</Label>
                <Input
                  id="stepNumber"
                  type="number"
                  min="1"
                  value={stepFormData.stepNumber}
                  onChange={(e) =>
                    setStepFormData({ ...stepFormData, stepNumber: parseInt(e.target.value) })
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
                  value={stepFormData.defaultDays}
                  onChange={(e) =>
                    setStepFormData({ ...stepFormData, defaultDays: e.target.value })
                  }
                  placeholder="Days to deadline"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stepName">Name *</Label>
              <Input
                id="stepName"
                value={stepFormData.name}
                onChange={(e) =>
                  setStepFormData({ ...stepFormData, name: e.target.value })
                }
                placeholder="e.g., Investigation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stepDescription">Description</Label>
              <Textarea
                id="stepDescription"
                value={stepFormData.description}
                onChange={(e) =>
                  setStepFormData({ ...stepFormData, description: e.target.value })
                }
                placeholder="Describe what happens in this step"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="stepIsActive">Active</Label>
              <Switch
                id="stepIsActive"
                checked={stepFormData.isActive}
                onCheckedChange={(checked) =>
                  setStepFormData({ ...stepFormData, isActive: checked })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStepDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isStepSaving}>
                {isStepSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingStep ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Snippet Dialog */}
      <Dialog open={isSnippetDialogOpen} onOpenChange={setIsSnippetDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSnippet ? "Edit Snippet" : "Add Snippet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="snippetName">Name *</Label>
                <Input
                  id="snippetName"
                  value={snippetFormData.name}
                  onChange={(e) =>
                    setSnippetFormData({ ...snippetFormData, name: e.target.value })
                  }
                  placeholder="e.g., Standard Investigation Notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="snippetCategory">Category *</Label>
                <Select
                  value={snippetFormData.category}
                  onValueChange={(value) =>
                    setSnippetFormData({
                      ...snippetFormData,
                      category: value as "INVESTIGATION" | "INTERVIEW" | "RESOLUTION" | "GENERAL",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVESTIGATION">Investigation</SelectItem>
                    <SelectItem value="INTERVIEW">Interview</SelectItem>
                    <SelectItem value="RESOLUTION">Resolution</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="snippetContent">Content *</Label>
              <Textarea
                id="snippetContent"
                value={snippetFormData.content}
                onChange={(e) =>
                  setSnippetFormData({ ...snippetFormData, content: e.target.value })
                }
                rows={8}
                placeholder="Enter the snippet text..."
              />
              <p className="text-xs text-gray-500">
                Tip: You can use placeholders like [MEMBER NAME], [DATE], etc. that you&apos;ll replace when using the snippet.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="snippetIsActive"
                checked={snippetFormData.isActive}
                onCheckedChange={(checked) =>
                  setSnippetFormData({ ...snippetFormData, isActive: checked })
                }
              />
              <Label htmlFor="snippetIsActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSnippetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSnippetSubmit} disabled={isSnippetSaving}>
              {isSnippetSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSnippet ? "Save Changes" : "Create Snippet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Snippet Dialog */}
      <Dialog open={deleteSnippetDialogOpen} onOpenChange={setDeleteSnippetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Snippet</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete &quot;{snippetToDelete?.name}&quot;? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteSnippetDialogOpen(false);
                setSnippetToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSnippet} disabled={isSnippetSaving}>
              {isSnippetSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
