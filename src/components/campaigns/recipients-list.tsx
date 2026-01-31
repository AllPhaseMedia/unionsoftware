"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { EmailStatus } from "@/types";

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

interface RecipientsListProps {
  campaignId: string;
  campaignStatus: string;
  initialRecipients: RecipientItem[];
  initialTotal: number;
}

function getStatusBadge(status: EmailStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Pending</Badge>;
    case "SENDING":
      return <Badge variant="outline" className="border-blue-300 text-blue-700">Sending</Badge>;
    case "SENT":
      return <Badge variant="default" className="bg-green-500">Sent</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "SKIPPED":
      return <Badge variant="outline">Skipped</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecipientsList({
  campaignId,
  campaignStatus,
  initialRecipients,
  initialTotal,
}: RecipientsListProps) {
  const [recipients, setRecipients] = useState<RecipientItem[]>(initialRecipients);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchRecipients = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      const response = await fetch(`/api/campaigns/${campaignId}/recipients?${params.toString()}`);
      const data = await response.json();
      setRecipients(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching recipients:", error);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, statusFilter, page]);

  const handleGenerateRecipients = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/recipients`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate recipients");
      }

      toast.success(data.data.message);
      fetchRecipients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate recipients");
    } finally {
      setIsGenerating(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recipients ({total})</CardTitle>
        {campaignStatus === "DRAFT" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateRecipients}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {total > 0 ? "Regenerate" : "Generate"} Recipients
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter */}
        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
              setTimeout(fetchRecipients, 0);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="SKIPPED">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : recipients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    {total === 0
                      ? "No recipients generated yet. Click 'Generate Recipients' to create the list."
                      : "No recipients match the filter."}
                  </TableCell>
                </TableRow>
              ) : (
                recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>
                      <div className="font-medium">{recipient.recipientName}</div>
                      <div className="text-sm text-gray-500">{recipient.recipientEmail}</div>
                    </TableCell>
                    <TableCell>
                      {recipient.member.department?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(recipient.status)}
                        {recipient.errorMessage && (
                          <span className="text-xs text-red-600 max-w-[200px] truncate" title={recipient.errorMessage}>
                            {recipient.errorMessage}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(recipient.sentAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(p => Math.max(1, p - 1));
                  setTimeout(fetchRecipients, 0);
                }}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(p => Math.min(totalPages, p + 1));
                  setTimeout(fetchRecipients, 0);
                }}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
