"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { FileText, Upload, Loader2, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DisciplinaryDocument {
  id: string;
  caseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  uploadedAt: Date | string;
}

interface DocumentsSectionProps {
  documents: DisciplinaryDocument[];
  caseId: string;
}

export function DisciplinaryDocumentsSection({
  documents,
  caseId,
}: DocumentsSectionProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/disciplinary/${caseId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload");
      }

      toast.success("Document uploaded");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleViewDocument = async (documentId: string) => {
    setViewingDocId(documentId);
    try {
      const response = await fetch(
        `/api/disciplinary/${caseId}/documents?documentId=${documentId}`
      );
      const data = await response.json();

      if (data.success && data.data.url) {
        window.open(data.data.url, "_blank");
      }
    } catch (error) {
      toast.error("Failed to view document");
    } finally {
      setViewingDocId(null);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(
        `/api/disciplinary/${caseId}/documents?documentId=${documentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Document deleted");
        router.refresh();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-gray-500 text-sm">No documents attached.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm truncate block">{doc.fileName}</span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleViewDocument(doc.id)}
                    disabled={viewingDocId === doc.id}
                  >
                    {viewingDocId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <div className="relative mt-4">
          <Input
            type="file"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Button variant="outline" className="w-full" size="sm" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Document
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
