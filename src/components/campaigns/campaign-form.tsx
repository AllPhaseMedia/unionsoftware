"use client";

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RecipientSelector } from "./recipient-selector";
import { VariablePicker } from "./variable-picker";
import type { Department, EmailTemplate } from "@/types";

interface CampaignFormProps {
  departments: Department[];
  emailTemplates: EmailTemplate[];
  initialData?: {
    id: string;
    name: string;
    subject: string;
    body: string;
    templateId?: string | null;
    targetCriteria?: {
      departments?: string[];
      statuses?: string[];
      employmentTypes?: string[];
    } | null;
    emailsPerMinute: number;
  };
}

export function CampaignForm({ departments, emailTemplates, initialData }: CampaignFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [templateId, setTemplateId] = useState(initialData?.templateId || "");
  const [emailsPerMinute, setEmailsPerMinute] = useState(initialData?.emailsPerMinute || 50);
  const [targetCriteria, setTargetCriteria] = useState<{
    departments?: string[];
    statuses?: string[];
    employmentTypes?: string[];
  }>(initialData?.targetCriteria || {});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeField, setActiveField] = useState<"subject" | "body" | null>(null);

  const handleTemplateChange = async (templateIdValue: string) => {
    setTemplateId(templateIdValue);

    if (templateIdValue && templateIdValue !== "none") {
      const template = emailTemplates.find(t => t.id === templateIdValue);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
    }
  };

  const insertVariable = (variable: string) => {
    if (activeField === "subject") {
      setSubject(prev => prev + variable);
    } else if (activeField === "body") {
      setBody(prev => prev + variable);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!subject.trim()) {
      toast.error("Email subject is required");
      return;
    }
    if (!body.trim()) {
      toast.error("Email body is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name,
        subject,
        body,
        templateId: templateId || null,
        targetCriteria: Object.keys(targetCriteria).length > 0 ? targetCriteria : null,
        emailsPerMinute,
      };

      const url = isEditing ? `/api/campaigns/${initialData.id}` : "/api/campaigns";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save campaign");
      }

      const data = await response.json();
      toast.success(isEditing ? "Campaign updated" : "Campaign created");
      router.push(`/campaigns/${data.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Campaign" : "New Campaign"}
          </h1>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isEditing ? "Save Changes" : "Create Campaign"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Monthly Newsletter - January 2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Load from Template</Label>
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {emailTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Email Content</CardTitle>
              <VariablePicker onSelect={insertVariable} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setActiveField("subject")}
                  placeholder="e.g., Important Update for {{member.first_name}}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Email Body *</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onFocus={() => setActiveField("body")}
                  placeholder="Write your email content here. Use {{variable}} syntax for personalization."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Use variables like {"{{member.first_name}}"} for personalization.
                  Click &quot;Insert Variable&quot; to see all available options.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
            </CardHeader>
            <CardContent>
              <RecipientSelector
                departments={departments}
                value={targetCriteria}
                onChange={setTargetCriteria}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailsPerMinute">Emails per Batch</Label>
                <Input
                  id="emailsPerMinute"
                  type="number"
                  min={1}
                  max={100}
                  value={emailsPerMinute}
                  onChange={(e) => setEmailsPerMinute(parseInt(e.target.value, 10) || 50)}
                />
                <p className="text-xs text-gray-500">
                  Number of emails to send per batch (max 100)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
