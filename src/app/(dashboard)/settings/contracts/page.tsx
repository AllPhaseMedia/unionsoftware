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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Loader2, CalendarIcon, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Contract, ContractArticle } from "@/types";

interface ContractWithArticles extends Contract {
  articles: ContractArticle[];
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractWithArticles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithArticles | null>(null);
  const [editingArticle, setEditingArticle] = useState<ContractArticle | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch("/api/contracts");
      const data = await response.json();
      setContracts(data.data || []);
    } catch (error) {
      toast.error("Failed to load contracts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (contract?: ContractWithArticles) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        name: contract.name,
        effectiveDate: new Date(contract.effectiveDate),
        expirationDate: new Date(contract.expirationDate),
        isActive: contract.isActive,
      });
    } else {
      setEditingContract(null);
      setFormData({
        name: "",
        effectiveDate: new Date(),
        expirationDate: new Date(),
        isActive: true,
      });
    }
    setIsDialogOpen(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingContract
        ? `/api/contracts/${editingContract.id}`
        : "/api/contracts";
      const method = editingContract ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingContract ? "Contract updated" : "Contract created");
      setIsDialogOpen(false);
      fetchContracts();
    } catch (error) {
      toast.error("Failed to save contract");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) return;
    setIsSaving(true);

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
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-gray-500">Manage collective bargaining agreements</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contract
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingContract ? "Edit Contract" : "Add Contract"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                        {format(formData.effectiveDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.effectiveDate}
                        onSelect={(date) =>
                          date && setFormData({ ...formData, effectiveDate: date })
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
                        {format(formData.expirationDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expirationDate}
                        onSelect={(date) =>
                          date && setFormData({ ...formData, expirationDate: date })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingContract ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
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
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
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
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingArticle ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contracts List */}
      {isLoading ? (
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
                  <FileText className="h-5 w-5 text-gray-400" />
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
                    onClick={() => handleOpenDialog(contract)}
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
    </div>
  );
}
