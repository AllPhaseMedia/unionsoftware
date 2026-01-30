"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  CalendarIcon,
  FileText,
  GripVertical,
  Trash2,
  ListChecks,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { StepTemplate, Contract, ContractArticle } from "@/types";

// Types
interface TextSnippet {
  id: string;
  name: string;
  content: string;
  category: "DESCRIPTION" | "RELIEF_REQUESTED";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContractWithArticles extends Contract {
  articles: ContractArticle[];
}

export default function GrievanceSettingsPage() {
  // Steps state
  const [steps, setSteps] = useState<StepTemplate[]>([]);
  const [isStepsLoading, setIsStepsLoading] = useState(true);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<StepTemplate | null>(null);
  const [isStepSaving, setIsStepSaving] = useState(false);
  const [stepFormData, setStepFormData] = useState({
    stepNumber: 1,
    name: "",
    description: "",
    defaultDays: "",
    isActive: true,
  });

  // Snippets state
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [isSnippetsLoading, setIsSnippetsLoading] = useState(true);
  const [isSnippetDialogOpen, setIsSnippetDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<TextSnippet | null>(null);
  const [isSnippetSaving, setIsSnippetSaving] = useState(false);
  const [snippetToDelete, setSnippetToDelete] = useState<TextSnippet | null>(null);
  const [deleteSnippetDialogOpen, setDeleteSnippetDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [snippetFormData, setSnippetFormData] = useState({
    name: "",
    content: "",
    category: "DESCRIPTION" as "DESCRIPTION" | "RELIEF_REQUESTED",
    isActive: true,
  });

  // Contracts state
  const [contracts, setContracts] = useState<ContractWithArticles[]>([]);
  const [isContractsLoading, setIsContractsLoading] = useState(true);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithArticles | null>(null);
  const [editingArticle, setEditingArticle] = useState<ContractArticle | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isContractSaving, setIsContractSaving] = useState(false);
  const [contractFormData, setContractFormData] = useState({
    name: "",
    effectiveDate: new Date(),
    expirationDate: new Date(),
    isActive: true,
  });
  const [articleFormData, setArticleFormData] = useState({
    articleNumber: "",
    title: "",
    content: "",
  });

  // Fetch all data on mount
  useEffect(() => {
    fetchSteps();
    fetchSnippets();
    fetchContracts();
  }, []);

  // Steps functions
  const fetchSteps = async () => {
    try {
      const response = await fetch("/api/step-templates");
      const data = await response.json();
      setSteps((data.data || []).sort((a: StepTemplate, b: StepTemplate) => a.stepNumber - b.stepNumber));
    } catch (error) {
      toast.error("Failed to load steps");
    } finally {
      setIsStepsLoading(false);
    }
  };

  const handleOpenStepDialog = (step?: StepTemplate) => {
    if (step) {
      setEditingStep(step);
      setStepFormData({
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
        ? `/api/step-templates/${editingStep.id}`
        : "/api/step-templates";
      const method = editingStep ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stepFormData,
          defaultDays: stepFormData.defaultDays ? parseInt(stepFormData.defaultDays) : null,
        }),
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
      const res = await fetch("/api/snippets");
      if (!res.ok) throw new Error("Failed to fetch snippets");
      const data = await res.json();
      setSnippets(data.data || []);
    } catch (err) {
      toast.error("Failed to load snippets");
    } finally {
      setIsSnippetsLoading(false);
    }
  };

  const handleOpenSnippetDialog = (snippet?: TextSnippet) => {
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
        category: "DESCRIPTION",
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
        ? `/api/snippets/${editingSnippet.id}`
        : "/api/snippets";
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
      const res = await fetch(`/api/snippets/${snippetToDelete.id}`, {
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
      case "DESCRIPTION":
        return "Description";
      case "RELIEF_REQUESTED":
        return "Relief Requested";
      default:
        return category;
    }
  };

  // Contracts functions
  const fetchContracts = async () => {
    try {
      const response = await fetch("/api/contracts");
      const data = await response.json();
      setContracts(data.data || []);
    } catch (error) {
      toast.error("Failed to load contracts");
    } finally {
      setIsContractsLoading(false);
    }
  };

  const handleOpenContractDialog = (contract?: ContractWithArticles) => {
    if (contract) {
      setEditingContract(contract);
      setContractFormData({
        name: contract.name,
        effectiveDate: new Date(contract.effectiveDate),
        expirationDate: new Date(contract.expirationDate),
        isActive: contract.isActive,
      });
    } else {
      setEditingContract(null);
      setContractFormData({
        name: "",
        effectiveDate: new Date(),
        expirationDate: new Date(),
        isActive: true,
      });
    }
    setIsContractDialogOpen(true);
  };

  const handleOpenArticleDialog = (contractId: string, article?: ContractArticle) => {
    setSelectedContractId(contractId);
    if (article) {
      setEditingArticle(article);
      setArticleFormData({
        articleNumber: article.articleNumber,
        title: article.title,
        content: article.content,
      });
    } else {
      setEditingArticle(null);
      setArticleFormData({
        articleNumber: "",
        title: "",
        content: "",
      });
    }
    setIsArticleDialogOpen(true);
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsContractSaving(true);

    try {
      const url = editingContract
        ? `/api/contracts/${editingContract.id}`
        : "/api/contracts";
      const method = editingContract ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractFormData),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingContract ? "Contract updated" : "Contract created");
      setIsContractDialogOpen(false);
      fetchContracts();
    } catch (error) {
      toast.error("Failed to save contract");
    } finally {
      setIsContractSaving(false);
    }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) return;
    setIsContractSaving(true);

    try {
      const url = editingArticle
        ? `/api/contracts/${selectedContractId}/articles/${editingArticle.id}`
        : `/api/contracts/${selectedContractId}/articles`;
      const method = editingArticle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleFormData),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingArticle ? "Article updated" : "Article created");
      setIsArticleDialogOpen(false);
      fetchContracts();
    } catch (error) {
      toast.error("Failed to save article");
    } finally {
      setIsContractSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grievance Settings</h1>
        <p className="text-gray-500">Configure workflow steps, text snippets, and contracts</p>
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
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Contracts
          </TabsTrigger>
        </TabsList>

        {/* Workflow Steps Tab */}
        <TabsContent value="steps" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Configure the steps in your grievance workflow</p>
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
            <p className="text-sm text-gray-500">Manage preset text for grievance descriptions and relief requested</p>
            <div className="flex items-center gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="DESCRIPTION">Description</SelectItem>
                  <SelectItem value="RELIEF_REQUESTED">Relief Requested</SelectItem>
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
                            <Badge variant={snippet.category === "DESCRIPTION" ? "default" : "secondary"}>
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

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Manage collective bargaining agreements and their articles</p>
            <Button onClick={() => handleOpenContractDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contract
            </Button>
          </div>

          {isContractsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : contracts.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">
                  No contracts yet. Add your first collective bargaining agreement.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <Card key={contract.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-5 w-5 text-gray-400" />
                      <div>
                        <CardTitle className="text-lg">{contract.name}</CardTitle>
                        <p className="text-sm text-gray-500">
                          {format(new Date(contract.effectiveDate), "MMM d, yyyy")} -{" "}
                          {format(new Date(contract.expirationDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={contract.isActive ? "default" : "secondary"}>
                        {contract.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenContractDialog(contract)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Articles ({contract.articles.length})</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenArticleDialog(contract.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Article
                      </Button>
                    </div>
                    {contract.articles.length === 0 ? (
                      <p className="text-gray-500 text-sm">No articles added yet.</p>
                    ) : (
                      <Accordion type="single" collapsible className="w-full">
                        {contract.articles.map((article) => (
                          <AccordionItem key={article.id} value={article.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2 text-left">
                                <span className="font-medium">
                                  Article {article.articleNumber}:
                                </span>
                                <span>{article.title}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="whitespace-pre-wrap text-sm">
                                  {article.content}
                                </p>
                                <div className="flex justify-end mt-4 gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenArticleDialog(contract.id, article)
                                    }
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                placeholder="e.g., Step 1 - Verbal"
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
                  placeholder="e.g., Standard Overtime Violation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="snippetCategory">Category *</Label>
                <Select
                  value={snippetFormData.category}
                  onValueChange={(value) =>
                    setSnippetFormData({
                      ...snippetFormData,
                      category: value as "DESCRIPTION" | "RELIEF_REQUESTED",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESCRIPTION">Description</SelectItem>
                    <SelectItem value="RELIEF_REQUESTED">Relief Requested</SelectItem>
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

      {/* Contract Dialog */}
      <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContract ? "Edit Contract" : "Add Contract"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContractSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contractName">Name *</Label>
              <Input
                id="contractName"
                value={contractFormData.name}
                onChange={(e) =>
                  setContractFormData({ ...contractFormData, name: e.target.value })
                }
                placeholder="e.g., 2024-2027 CBA"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(contractFormData.effectiveDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={contractFormData.effectiveDate}
                      onSelect={(date) =>
                        date && setContractFormData({ ...contractFormData, effectiveDate: date })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Expiration Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(contractFormData.expirationDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={contractFormData.expirationDate}
                      onSelect={(date) =>
                        date && setContractFormData({ ...contractFormData, expirationDate: date })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="contractIsActive">Active</Label>
              <Switch
                id="contractIsActive"
                checked={contractFormData.isActive}
                onCheckedChange={(checked) =>
                  setContractFormData({ ...contractFormData, isActive: checked })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsContractDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isContractSaving}>
                {isContractSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingContract ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Article Dialog */}
      <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? "Edit Article" : "Add Article"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleArticleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="articleNumber">Article Number *</Label>
                <Input
                  id="articleNumber"
                  value={articleFormData.articleNumber}
                  onChange={(e) =>
                    setArticleFormData({ ...articleFormData, articleNumber: e.target.value })
                  }
                  placeholder="e.g., 5.1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="articleTitle">Title *</Label>
                <Input
                  id="articleTitle"
                  value={articleFormData.title}
                  onChange={(e) =>
                    setArticleFormData({ ...articleFormData, title: e.target.value })
                  }
                  placeholder="e.g., Grievance Procedure"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="articleContent">Content *</Label>
              <Textarea
                id="articleContent"
                value={articleFormData.content}
                onChange={(e) =>
                  setArticleFormData({ ...articleFormData, content: e.target.value })
                }
                placeholder="Full text of the article..."
                rows={10}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsArticleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isContractSaving}>
                {isContractSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingArticle ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
