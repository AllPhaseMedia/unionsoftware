"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  CampaignStatusDisplay,
  CampaignActions,
  EmailPreview,
  RecipientsList,
} from "@/components/campaigns";
import type { CampaignStatus, EmailStatus } from "@/types";

interface CampaignData {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  targetCriteria: Record<string, unknown> | null;
  emailsPerMinute: number;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  template: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  stats: {
    pending: number;
    sending: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  trackingStats: {
    uniqueOpens: number;
    uniqueClicks: number;
    totalOpens: number;
    totalClicks: number;
  };
}

interface RecipientItem {
  id: string;
  recipientEmail: string;
  recipientName: string;
  status: EmailStatus;
  sentAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    department: { name: string } | null;
  };
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCriteria(criteria: Record<string, unknown> | null): string {
  if (!criteria) return "All members with email addresses";

  const parts: string[] = [];

  if (Array.isArray(criteria.statuses) && criteria.statuses.length > 0) {
    parts.push(`Status: ${criteria.statuses.join(", ")}`);
  }
  if (Array.isArray(criteria.employmentTypes) && criteria.employmentTypes.length > 0) {
    parts.push(`Employment: ${criteria.employmentTypes.map((t: string) => t.replace("_", " ")).join(", ")}`);
  }
  if (Array.isArray(criteria.departments) && criteria.departments.length > 0) {
    parts.push(`${criteria.departments.length} department(s)`);
  }

  return parts.length > 0 ? parts.join(", ") : "All members with email addresses";
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Campaign not found");
      }

      setCampaign(data.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load campaign");
      router.push("/campaigns");
    }
  }, [campaignId, router]);

  const fetchRecipients = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/recipients?limit=50`);
      const data = await response.json();

      if (response.ok) {
        setRecipients(data.data || []);
        setRecipientTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching recipients:", error);
    }
  }, [campaignId]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCampaign(), fetchRecipients()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCampaign, fetchRecipients]);

  const handleDelete = async () => {
    if (!campaign) return;
    if (!confirm(`Are you sure you want to delete "${campaign.name}"?`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Campaign deleted");
      router.push("/campaigns");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete campaign");
      setIsDeleting(false);
    }
  };

  const handleStatusChange = () => {
    fetchCampaign();
    fetchRecipients();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-gray-500">
              Created by {campaign.createdBy.name} on {formatDate(campaign.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EmailPreview campaignId={campaignId} />
          {campaign.status === "DRAFT" && (
            <Link href={`/campaigns/${campaignId}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {campaign.status !== "SENDING" && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="recipients">Recipients ({recipientTotal})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Email Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Subject</label>
                    <p className="mt-1 font-medium">{campaign.subject}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Body</label>
                    <div className="mt-1 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap font-mono text-sm">
                      {campaign.body}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Target Criteria</label>
                      <p className="mt-1">{formatCriteria(campaign.targetCriteria)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Emails per Batch</label>
                      <p className="mt-1">{campaign.emailsPerMinute}</p>
                    </div>
                    {campaign.template && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Template</label>
                        <p className="mt-1">{campaign.template.name}</p>
                      </div>
                    )}
                    {campaign.startedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Started</label>
                        <p className="mt-1">{formatDate(campaign.startedAt)}</p>
                      </div>
                    )}
                    {campaign.completedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Completed</label>
                        <p className="mt-1">{formatDate(campaign.completedAt)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recipients" className="mt-4">
              <RecipientsList
                campaignId={campaignId}
                campaignStatus={campaign.status}
                initialRecipients={recipients}
                initialTotal={recipientTotal}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <CampaignStatusDisplay
            status={campaign.status}
            totalRecipients={campaign.totalRecipients}
            sentCount={campaign.sentCount}
            failedCount={campaign.failedCount}
            stats={campaign.stats}
            trackingStats={campaign.trackingStats}
          />

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignActions
                campaignId={campaignId}
                status={campaign.status}
                totalRecipients={campaign.totalRecipients}
                onStatusChange={handleStatusChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
