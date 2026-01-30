"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StickyNote, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickNoteProps {
  entityType: "grievance" | "member";
  entityId: string;
  onNoteAdded?: () => void;
}

export function QuickNote({ entityType, entityId, onNoteAdded }: QuickNoteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when popover opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!note.trim()) return;

    setIsSaving(true);
    try {
      const url =
        entityType === "grievance"
          ? `/api/grievances/${entityId}/notes`
          : `/api/members/${entityId}/notes`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.trim() }),
      });

      if (!response.ok) throw new Error("Failed to save note");

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setNote("");
        setIsOpen(false);
        router.refresh();
        onNoteAdded?.();
      }, 500);
    } catch (error) {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    // Escape to close
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          )}
          title="Add quick note"
          onClick={(e) => e.stopPropagation()}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3"
        align="start"
        side="right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Quick Note</span>
            <span className="text-xs text-gray-400">Ctrl+Enter to save</span>
          </div>
          <Textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your note..."
            className="min-h-[80px] text-sm resize-none"
            disabled={isSaving}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !note.trim()}
              className={cn(
                showSuccess && "bg-green-500 hover:bg-green-500"
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : showSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
