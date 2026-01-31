"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Mail, AlertCircle } from "lucide-react";
import type { CampaignStatus as CampaignStatusType } from "@/types";

interface CampaignStatusProps {
  status: CampaignStatusType;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  stats?: {
    pending: number;
    sending: number;
    sent: number;
    failed: number;
    skipped: number;
  };
}

function getStatusBadge(status: CampaignStatusType) {
  switch (status) {
    case "DRAFT":
      return <Badge variant="secondary">Draft</Badge>;
    case "SCHEDULED":
      return <Badge variant="outline" className="border-blue-300 text-blue-700">Scheduled</Badge>;
    case "SENDING":
      return <Badge variant="default" className="bg-blue-500">Sending</Badge>;
    case "PAUSED":
      return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Paused</Badge>;
    case "COMPLETED":
      return <Badge variant="default" className="bg-green-500">Completed</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function CampaignStatusDisplay({
  status,
  totalRecipients,
  sentCount,
  failedCount,
  stats,
}: CampaignStatusProps) {
  const processedCount = sentCount + failedCount;
  const progress = totalRecipients > 0 ? (processedCount / totalRecipients) * 100 : 0;
  const pendingCount = stats?.pending || (totalRecipients - processedCount);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Campaign Status</CardTitle>
        {getStatusBadge(status)}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{processedCount} of {totalRecipients} processed</span>
            {pendingCount > 0 && <span>{pendingCount} remaining</span>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-full">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalRecipients}</div>
              <div className="text-xs text-gray-500">Total Recipients</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{sentCount}</div>
              <div className="text-xs text-gray-500">Sent</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-red-100 rounded-full">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        {stats && stats.skipped > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500 border-t pt-4">
            <AlertCircle className="h-4 w-4" />
            <span>{stats.skipped} emails were skipped</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
