"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Mail, AlertCircle, Eye, MousePointer } from "lucide-react";
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
  trackingStats?: {
    uniqueOpens: number;
    uniqueClicks: number;
    totalOpens: number;
    totalClicks: number;
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
  trackingStats,
}: CampaignStatusProps) {
  const processedCount = sentCount + failedCount;
  const progress = totalRecipients > 0 ? (processedCount / totalRecipients) * 100 : 0;
  const pendingCount = stats?.pending || (totalRecipients - processedCount);

  // Calculate rates
  const openRate = sentCount > 0 && trackingStats
    ? ((trackingStats.uniqueOpens / sentCount) * 100).toFixed(1)
    : "0.0";
  const clickRate = sentCount > 0 && trackingStats
    ? ((trackingStats.uniqueClicks / sentCount) * 100).toFixed(1)
    : "0.0";

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

        {/* Delivery Stats Grid */}
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

        {/* Tracking Stats - Only show if campaign has been sent */}
        {sentCount > 0 && (
          <>
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Engagement</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Eye className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {trackingStats?.uniqueOpens || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      Opens ({openRate}%)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                  <div className="p-2 bg-indigo-100 rounded-full">
                    <MousePointer className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {trackingStats?.uniqueClicks || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      Clicks ({clickRate}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

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
