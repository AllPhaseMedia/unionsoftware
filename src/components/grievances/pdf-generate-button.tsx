"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { PdfTemplate } from "@/types";

interface PdfGenerateButtonProps {
  grievanceId: string;
}

export function PdfGenerateButton({ grievanceId }: PdfGenerateButtonProps) {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/pdf-templates");
      const data = await response.json();
      if (data.success) {
        const activeTemplates = data.data.filter((t: PdfTemplate) => t.isActive);
        setTemplates(activeTemplates);
        if (activeTemplates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(activeTemplates[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleGeneratePdf = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    setIsLoading(true);
    try {
      // Get the generated HTML from the server
      const response = await fetch(`/api/grievances/${grievanceId}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || "Failed to generate PDF");
        return;
      }

      // Create a hidden iframe to render the HTML
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "794px"; // A4 width in pixels at 96 DPI
      iframe.style.height = "1123px"; // A4 height
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("Could not access iframe document");
      }

      // Write the HTML content to the iframe
      iframeDoc.open();
      iframeDoc.write(data.data.htmlContent);
      iframeDoc.close();

      // Wait for content to render
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Convert to canvas
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      // Download the PDF
      pdf.save(`${data.data.document.fileName}`);

      // Clean up
      document.body.removeChild(iframe);

      toast.success("PDF generated and downloaded!");
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Generate PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate PDF Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-sm text-gray-500">
                No PDF templates available. Create templates in Settings.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePdf}
              disabled={isLoading || !selectedTemplateId}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate & Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
