"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CustomField } from "@/types";

const fieldTypeLabels: Record<string, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  SELECT: "Select",
  CHECKBOX: "Checkbox",
  TEXTAREA: "Text Area",
};

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    entityType: "GRIEVANCE" as "GRIEVANCE" | "MEMBER",
    fieldName: "",
    fieldLabel: "",
    fieldType: "TEXT" as "TEXT" | "NUMBER" | "DATE" | "SELECT" | "CHECKBOX" | "TEXTAREA",
    options: "",
    isRequired: false,
    displayOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await fetch("/api/custom-fields");
      const data = await response.json();
      setFields(data.data || []);
    } catch (error) {
      toast.error("Failed to load custom fields");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (field?: CustomField) => {
    if (field) {
      setEditingField(field);
      setFormData({
        entityType: field.entityType,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        options: Array.isArray(field.options) ? (field.options as string[]).join(", ") : "",
        isRequired: field.isRequired,
        displayOrder: field.displayOrder,
        isActive: field.isActive,
      });
    } else {
      setEditingField(null);
      setFormData({
        entityType: "GRIEVANCE",
        fieldName: "",
        fieldLabel: "",
        fieldType: "TEXT",
        options: "",
        isRequired: false,
        displayOrder: 0,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingField
        ? `/api/custom-fields/${editingField.id}`
        : "/api/custom-fields";
      const method = editingField ? "PUT" : "POST";

      const payload = {
        ...formData,
        options: formData.fieldType === "SELECT" && formData.options
          ? formData.options.split(",").map(o => o.trim())
          : null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingField ? "Field updated" : "Field created");
      setIsDialogOpen(false);
      fetchFields();
    } catch (error) {
      toast.error("Failed to save field");
    } finally {
      setIsSaving(false);
    }
  };

  const grievanceFields = fields.filter(f => f.entityType === "GRIEVANCE");
  const memberFields = fields.filter(f => f.entityType === "MEMBER");

  const renderFieldsTable = (fieldsList: CustomField[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Field Name</TableHead>
          <TableHead>Label</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Required</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fieldsList.map((field) => (
          <TableRow key={field.id}>
            <TableCell className="font-mono text-sm">{field.fieldName}</TableCell>
            <TableCell className="font-medium">{field.fieldLabel}</TableCell>
            <TableCell>
              <Badge variant="outline">{fieldTypeLabels[field.fieldType]}</Badge>
            </TableCell>
            <TableCell>{field.isRequired ? "Yes" : "No"}</TableCell>
            <TableCell>
              <Badge variant={field.isActive ? "default" : "secondary"}>
                {field.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDialog(field)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Fields</h1>
          <p className="text-gray-500">Create custom fields for grievances and members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingField ? "Edit Custom Field" : "Add Custom Field"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Entity Type *</Label>
                <Select
                  value={formData.entityType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, entityType: value as "GRIEVANCE" | "MEMBER" })
                  }
                  disabled={!!editingField}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GRIEVANCE">Grievance</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fieldName">Field Name *</Label>
                  <Input
                    id="fieldName"
                    value={formData.fieldName}
                    onChange={(e) =>
                      setFormData({ ...formData, fieldName: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })
                    }
                    placeholder="e.g., shift_type"
                    disabled={!!editingField}
                    required
                  />
                  <p className="text-xs text-gray-500">Alphanumeric and underscores only</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldLabel">Display Label *</Label>
                  <Input
                    id="fieldLabel"
                    value={formData.fieldLabel}
                    onChange={(e) =>
                      setFormData({ ...formData, fieldLabel: e.target.value })
                    }
                    placeholder="e.g., Shift Type"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Field Type *</Label>
                <Select
                  value={formData.fieldType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, fieldType: value as typeof formData.fieldType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="NUMBER">Number</SelectItem>
                    <SelectItem value="DATE">Date</SelectItem>
                    <SelectItem value="SELECT">Select (Dropdown)</SelectItem>
                    <SelectItem value="CHECKBOX">Checkbox</SelectItem>
                    <SelectItem value="TEXTAREA">Text Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.fieldType === "SELECT" && (
                <div className="space-y-2">
                  <Label htmlFor="options">Options (comma-separated)</Label>
                  <Input
                    id="options"
                    value={formData.options}
                    onChange={(e) =>
                      setFormData({ ...formData, options: e.target.value })
                    }
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="isRequired">Required</Label>
                <Switch
                  id="isRequired"
                  checked={formData.isRequired}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isRequired: checked })
                  }
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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingField ? "Update" : "Create"}
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
          ) : fields.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No custom fields yet. Add your first custom field.
            </p>
          ) : (
            <Tabs defaultValue="grievance">
              <TabsList>
                <TabsTrigger value="grievance">
                  Grievance Fields ({grievanceFields.length})
                </TabsTrigger>
                <TabsTrigger value="member">
                  Member Fields ({memberFields.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="grievance" className="mt-4">
                {grievanceFields.length === 0 ? (
                  <p className="text-gray-500 text-sm">No grievance custom fields.</p>
                ) : (
                  renderFieldsTable(grievanceFields)
                )}
              </TabsContent>
              <TabsContent value="member" className="mt-4">
                {memberFields.length === 0 ? (
                  <p className="text-gray-500 text-sm">No member custom fields.</p>
                ) : (
                  renderFieldsTable(memberFields)
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
