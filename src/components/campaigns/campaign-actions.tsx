"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Play, Pause, StopCircle, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { CampaignStatus } from "@/types";

interface CampaignActionsProps {
  campaignId: string;
  status: CampaignStatus;
  totalRecipients: number;
  onStatusChange: () => void;
}

export function CampaignActions({
  campaignId,
  status,
  totalRecipients,
  onStatusChange,
}: CampaignActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    sent: number;
    failed: number;
    remaining: number;
  } | null>(null);

  const handleAction = async (action: string) => {
    setIsLoading(true);
    setLoadingAction(action);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} campaign`);
      }

      toast.success(data.message || `Campaign ${action}ed`);
      onStatusChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} campaign`);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleSendBatch = async () => {
    setIsLoading(true);
    setLoadingAction("send-batch");
    setBatchResult(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 50 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send batch");
      }

      setBatchResult({
        sent: data.data.sent,
        failed: data.data.failed,
        remaining: data.data.remaining,
      });

      if (data.data.completed) {
        toast.success("Campaign completed - all emails processed");
      } else {
        toast.success(`Batch sent: ${data.data.sent} sent, ${data.data.failed} failed, ${data.data.remaining} remaining`);
      }

      onStatusChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send batch");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleCancel = async () => {
    setShowCancelDialog(false);
    await handleAction("cancel");
  };

  return (
    <div className="space-y-4">
      {/* Draft Actions */}
      {status === "DRAFT" && (
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => handleAction("start")}
            disabled={isLoading || totalRecipients === 0}
            className="w-full"
          >
            {loadingAction === "start" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Campaign
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/campaigns/${campaignId}/edit`)}
            className="w-full"
          >
            Edit Campaign
          </Button>
          {totalRecipients === 0 && (
            <p className="text-xs text-gray-500 text-center">
              Generate recipients before starting the campaign
            </p>
          )}
        </div>
      )}

      {/* Sending Actions */}
      {status === "SENDING" && (
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSendBatch}
            disabled={isLoading}
            className="w-full"
          >
            {loadingAction === "send-batch" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Next Batch
          </Button>

          {batchResult && (
            <div className="text-sm text-center space-y-1 py-2 bg-gray-50 rounded-md">
              <div className="text-green-600">{batchResult.sent} sent</div>
              {batchResult.failed > 0 && (
                <div className="text-red-600">{batchResult.failed} failed</div>
              )}
              <div className="text-gray-500">{batchResult.remaining} remaining</div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => handleAction("pause")}
            disabled={isLoading}
            className="w-full"
          >
            {loadingAction === "pause" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Pause className="h-4 w-4 mr-2" />
            )}
            Pause Campaign
          </Button>

          <Button
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
            disabled={isLoading}
            className="w-full"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            Cancel Campaign
          </Button>
        </div>
      )}

      {/* Paused Actions */}
      {status === "PAUSED" && (
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => handleAction("resume")}
            disabled={isLoading}
            className="w-full"
          >
            {loadingAction === "resume" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Resume Campaign
          </Button>

          <Button
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
            disabled={isLoading}
            className="w-full"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            Cancel Campaign
          </Button>
        </div>
      )}

      {/* Completed/Cancelled - No Actions */}
      {(status === "COMPLETED" || status === "CANCELLED") && (
        <div className="text-center text-sm text-gray-500 py-4">
          This campaign has {status === "COMPLETED" ? "completed" : "been cancelled"}.
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all remaining emails from being sent. Emails that have already been
              sent will not be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Running</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Cancel Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
