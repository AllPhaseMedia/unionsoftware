"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

interface EmailPreviewProps {
  campaignId: string;
}

interface PreviewData {
  subject: string;
  body: string;
  recipient: {
    name: string;
    email: string;
  };
}

export function EmailPreview({ campaignId }: EmailPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const loadPreview = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load preview");
      }

      setPreview(data.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load preview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !preview) {
      loadPreview();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Preview Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {/* Recipient Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">{preview.recipient.name}</div>
                <div className="text-sm text-gray-500">{preview.recipient.email}</div>
              </div>
            </div>

            {/* Email Preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium">{preview.subject}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Body</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {preview.body.split("\n").map((line, i) => (
                    <p key={i} className={line.trim() ? "" : "min-h-[1em]"}>
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-gray-500 text-center">
              This is a preview using sample member data. Actual emails will be personalized for each recipient.
            </p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No preview available. Make sure there are members matching your criteria.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
