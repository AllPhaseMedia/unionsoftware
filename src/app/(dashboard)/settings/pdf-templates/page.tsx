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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Loader2, FileType, Eye } from "lucide-react";
import { toast } from "sonner";
import type { PdfTemplate } from "@/types";

export default function PdfTemplatesPage() {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PdfTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/pdf-templates");
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (template?: PdfTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || "",
        content: template.content,
        isActive: template.isActive,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        description: "",
        content: defaultTemplate,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingTemplate
        ? `/api/pdf-templates/${editingTemplate.id}`
        : "/api/pdf-templates";
      const method = editingTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingTemplate ? "Template updated" : "Template created");
      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PDF Templates</h1>
          <p className="text-gray-500">Design PDF export templates for grievances</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Add Template"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Grievance Summary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Template Content (HTML) *</Label>
                  <p className="text-xs text-gray-500">
                    Use variables like {"{{grievance.number}}"}, {"{{member.name}}"}
                  </p>
                </div>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="font-mono text-sm"
                  rows={20}
                  required
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
                  {editingTemplate ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              No PDF templates yet. Create your first template.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <FileType className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-gray-500 mb-4">{template.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(template)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const defaultTemplate = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 30px 40px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 16px;
      margin: 0 0 5px 0;
    }
    .header .phone {
      font-size: 14px;
      margin-bottom: 15px;
    }
    .grievance-title {
      display: inline-block;
      border: 3px solid #000;
      padding: 8px 30px;
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0;
    }
    .case-number {
      text-align: center;
      font-size: 14px;
      margin: 15px 0;
    }
    .notice {
      text-align: center;
      font-weight: bold;
      font-size: 11px;
      margin: 15px 0;
      text-transform: uppercase;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .info-table td {
      border: 1px solid #000;
      padding: 8px 10px;
      vertical-align: top;
    }
    .info-table .label {
      font-weight: bold;
    }
    .section-title {
      font-weight: bold;
      text-decoration: underline;
      margin: 25px 0 10px 0;
      font-size: 13px;
    }
    .content {
      margin: 0 0 15px 15px;
      text-align: justify;
    }
    .signature-section {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-line {
      width: 45%;
      text-align: center;
    }
    .signature-line .line {
      border-top: 1px solid #000;
      margin-bottom: 5px;
    }
    .footer {
      margin-top: 40px;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{organization.name}}</h1>
  </div>

  <div style="text-align: center;">
    <div class="grievance-title">GRIEVANCE</div>
  </div>

  <div class="case-number">
    <strong>Case Number:</strong> #{{grievance.number}}
  </div>

  <div class="notice">
    NOTICE: THE EMPLOYEE IS ENTITLED TO REPRESENTATION BY THE UNION
  </div>

  <table class="info-table">
    <tr>
      <td style="width: 50%;"><span class="label">To:</span> {{department.commissioner}}</td>
      <td><span class="label">Date:</span> {{grievance.filing_date}}</td>
    </tr>
    <tr>
      <td><span class="label">Employee:</span> {{member.name}}</td>
      <td><span class="label">Oral Discussion:</span> {{grievance.filing_date}}</td>
    </tr>
    <tr>
      <td colspan="2"><span class="label">Title:</span> {{grievance.job_title}}</td>
    </tr>
    <tr>
      <td colspan="2"><span class="label">Department:</span> {{department.name}}</td>
    </tr>
  </table>

  <div class="section-title">GRIEVANCE:</div>
  <div class="content">
    {{grievance.description}}
  </div>

  <div class="section-title">RELIEF REQUESTED:</div>
  <div class="content">
    {{grievance.relief_requested}}
  </div>

  <div class="signature-section">
    <div class="signature-line">
      <div class="line"></div>
      <div>Signature of Employee</div>
    </div>
    <div class="signature-line">
      <div class="line"></div>
      <div>Date</div>
    </div>
  </div>

  <div class="footer">
    {{organization.name}}
  </div>
</body>
</html>`;
