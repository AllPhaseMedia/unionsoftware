"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TextSnippet {
  id: string;
  name: string;
  content: string;
  category: "DESCRIPTION" | "RELIEF_REQUESTED";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SnippetsSettingsPage() {
  const router = useRouter();
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<TextSnippet | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snippetToDelete, setSnippetToDelete] = useState<TextSnippet | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "DESCRIPTION" as "DESCRIPTION" | "RELIEF_REQUESTED",
    isActive: true,
  });

  useEffect(() => {
    fetchSnippets();
  }, []);

  const fetchSnippets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/snippets");
      if (!res.ok) throw new Error("Failed to fetch snippets");
      const data = await res.json();
      setSnippets(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (snippet?: TextSnippet) => {
    if (snippet) {
      setEditingSnippet(snippet);
      setFormData({
        name: snippet.name,
        content: snippet.content,
        category: snippet.category,
        isActive: snippet.isActive,
      });
    } else {
      setEditingSnippet(null);
      setFormData({
        name: "",
        content: "",
        category: "DESCRIPTION",
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSnippet(null);
    setFormData({
      name: "",
      content: "",
      category: "DESCRIPTION",
      isActive: true,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      setError("Name and content are required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = editingSnippet
        ? `/api/snippets/${editingSnippet.id}`
        : "/api/snippets";
      const method = editingSnippet ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save snippet");
      }

      await fetchSnippets();
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!snippetToDelete) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/snippets/${snippetToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete snippet");

      await fetchSnippets();
      setDeleteDialogOpen(false);
      setSnippetToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Text Snippets</h1>
          <p className="text-gray-500">
            Manage preset text snippets for grievance descriptions and relief requested
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Snippets</CardTitle>
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
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Snippet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                          onClick={() => handleOpenDialog(snippet)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSnippetToDelete(snippet);
                            setDeleteDialogOpen(true);
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSnippet ? "Edit Snippet" : "Add Snippet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Standard Overtime Violation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
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
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
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
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSnippet ? "Save Changes" : "Create Snippet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                setDeleteDialogOpen(false);
                setSnippetToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
