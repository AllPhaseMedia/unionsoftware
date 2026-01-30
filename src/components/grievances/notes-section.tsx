"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { StickyNote, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { GrievanceNoteWithUser } from "@/types";

interface NotesSectionProps {
  notes: GrievanceNoteWithUser[];
  grievanceId: string;
}

export function NotesSection({
  notes,
  grievanceId,
}: NotesSectionProps) {
  const router = useRouter();
  const [newNote, setNewNote] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/grievances/${grievanceId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNote.trim(),
          isInternal,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      toast.success("Note added");
      setNewNote("");
      setIsInternal(false);
      setShowForm(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes ({notes.length})
          </CardTitle>
          {!showForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Form */}
        {showForm && (
          <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write a note..."
              rows={3}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="isInternal"
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked === true)}
              />
              <Label htmlFor="isInternal" className="text-sm text-gray-600">
                Internal note (only visible to union representatives)
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setNewNote("");
                  setIsInternal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={isSubmitting || !newNote.trim()}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Add Note
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-2">
            No notes yet.
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="text-sm border-b pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{note.user.name}</span>
                  {note.isInternal && (
                    <Badge variant="outline" className="text-xs">
                      Internal
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(note.createdAt), "MMM d 'at' h:mm a")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
