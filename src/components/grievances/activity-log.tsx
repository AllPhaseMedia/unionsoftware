"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  MessageSquare,
  StickyNote,
  FileText,
  CheckCircle2,
  PlayCircle,
  SkipForward,
  PlusCircle,
  Clock,
} from "lucide-react";

interface ActivityLogProps {
  grievance: {
    createdAt: Date | string;
    createdBy: { name: string };
    status: string;
    steps: Array<{
      id: string;
      stepNumber: number;
      name: string;
      status: string;
      completedAt: Date | string | null;
      completedBy?: { name: string } | null;
      notes: string | null;
      createdAt: Date | string;
      updatedAt: Date | string;
    }>;
    notes: Array<{
      id: string;
      content: string;
      isInternal: boolean;
      createdAt: Date | string;
      user: { name: string };
    }>;
    messages: Array<{
      id: string;
      content: string;
      createdAt: Date | string;
      user: { name: string };
      replies?: Array<{
        id: string;
        content: string;
        createdAt: Date | string;
        user: { name: string };
      }>;
    }>;
    documents: Array<{
      id: string;
      fileName: string;
      uploadedAt: Date | string;
    }>;
  };
}

interface ActivityItem {
  id: string;
  type: "created" | "step_completed" | "step_started" | "step_skipped" | "note" | "message" | "document";
  date: Date;
  title: string;
  description?: string;
  user?: string;
  metadata?: Record<string, string>;
}

export function ActivityLog({ grievance }: ActivityLogProps) {
  // Build activity items from all sources
  const activities: ActivityItem[] = [];

  // Grievance created
  activities.push({
    id: "created",
    type: "created",
    date: new Date(grievance.createdAt),
    title: "Grievance created",
    user: grievance.createdBy.name,
  });

  // Step activities
  grievance.steps.forEach((step) => {
    if (step.completedAt) {
      activities.push({
        id: `step-completed-${step.id}`,
        type: "step_completed",
        date: new Date(step.completedAt),
        title: `Step ${step.stepNumber} completed`,
        description: step.name,
        user: step.completedBy?.name,
        metadata: step.notes ? { notes: step.notes } : undefined,
      });
    } else if (step.status === "IN_PROGRESS") {
      activities.push({
        id: `step-started-${step.id}`,
        type: "step_started",
        date: new Date(step.updatedAt),
        title: `Step ${step.stepNumber} started`,
        description: step.name,
        user: step.completedBy?.name,
      });
    } else if (step.status === "SKIPPED") {
      activities.push({
        id: `step-skipped-${step.id}`,
        type: "step_skipped",
        date: new Date(step.updatedAt),
        title: `Step ${step.stepNumber} skipped`,
        description: step.name,
        user: step.completedBy?.name,
      });
    }
  });

  // Notes
  grievance.notes.forEach((note) => {
    activities.push({
      id: `note-${note.id}`,
      type: "note",
      date: new Date(note.createdAt),
      title: note.isInternal ? "Internal note added" : "Note added",
      description: note.content.length > 100 ? note.content.substring(0, 100) + "..." : note.content,
      user: note.user.name,
    });
  });

  // Messages and replies
  grievance.messages.forEach((message) => {
    activities.push({
      id: `message-${message.id}`,
      type: "message",
      date: new Date(message.createdAt),
      title: "Comment posted",
      description: message.content.length > 100 ? message.content.substring(0, 100) + "..." : message.content,
      user: message.user.name,
    });

    message.replies?.forEach((reply) => {
      activities.push({
        id: `reply-${reply.id}`,
        type: "message",
        date: new Date(reply.createdAt),
        title: "Reply posted",
        description: reply.content.length > 100 ? reply.content.substring(0, 100) + "..." : reply.content,
        user: reply.user.name,
      });
    });
  });

  // Documents
  grievance.documents.forEach((doc) => {
    activities.push({
      id: `doc-${doc.id}`,
      type: "document",
      date: new Date(doc.uploadedAt),
      title: "Document uploaded",
      description: doc.fileName,
    });
  });

  // Sort by date descending (newest first)
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "created":
        return <PlusCircle className="h-4 w-4 text-blue-500" />;
      case "step_completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "step_started":
        return <PlayCircle className="h-4 w-4 text-yellow-500" />;
      case "step_skipped":
        return <SkipForward className="h-4 w-4 text-gray-400" />;
      case "note":
        return <StickyNote className="h-4 w-4 text-amber-500" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "created":
        return "bg-blue-50 border-blue-200";
      case "step_completed":
        return "bg-green-50 border-green-200";
      case "step_started":
        return "bg-yellow-50 border-yellow-200";
      case "step_skipped":
        return "bg-gray-50 border-gray-200";
      case "note":
        return "bg-amber-50 border-amber-200";
      case "message":
        return "bg-blue-50 border-blue-200";
      case "document":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity recorded yet.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`p-3 rounded-lg border ${getTypeColor(activity.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {format(activity.date, "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(activity.date, "h:mm a")}
                      {activity.user && ` • ${activity.user}`}
                    </p>
                    {activity.description && (
                      <p className="text-sm text-gray-700 mt-1 break-words">
                        {activity.description}
                      </p>
                    )}
                    {activity.metadata?.notes && (
                      <div className="mt-2 p-2 bg-white/50 rounded text-xs text-gray-600">
                        <span className="font-medium">Notes: </span>
                        {activity.metadata.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
