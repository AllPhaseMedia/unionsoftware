"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { MessageSquare, Reply, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { GrievanceMessageWithUser } from "@/types";

interface MessagesSectionProps {
  messages: GrievanceMessageWithUser[];
  grievanceId: string;
  currentUserId: string;
  onMessageSent?: () => void;
}

export function MessagesSection({
  messages,
  grievanceId,
  currentUserId,
  onMessageSent,
}: MessagesSectionProps) {
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (content: string, parentId?: string | null) => {
    if (!content.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/grievances/${grievanceId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          parentId: parentId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      toast.success("Message sent");
      setNewMessage("");
      setReplyContent("");
      setReplyingTo(null);
      onMessageSent?.();
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const renderMessage = (message: GrievanceMessageWithUser, depth = 0) => {
    const isOwnMessage = message.userId === currentUserId;

    return (
      <div key={message.id} className={`${depth > 0 ? "ml-8 mt-3" : ""}`}>
        <div
          className={`flex gap-3 ${depth > 0 ? "border-l-2 pl-4 border-gray-200" : ""}`}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className={isOwnMessage ? "bg-blue-100" : "bg-gray-100"}>
              {getInitials(message.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{message.user.name}</span>
              <span className="text-xs text-gray-400">
                {format(new Date(message.createdAt), "MMM d 'at' h:mm a")}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {message.content}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 px-2 text-xs text-gray-500"
              onClick={() => setReplyingTo(message.id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>

            {/* Reply input */}
            {replyingTo === message.id && (
              <div className="mt-2 flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="text-sm"
                  rows={2}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    onClick={() => sendMessage(replyContent, message.id)}
                    disabled={isSending || !replyContent.trim()}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {message.replies?.map((reply) => renderMessage(reply, depth + 1))}
      </div>
    );
  };

  // Get top-level messages (no parent)
  const topLevelMessages = messages.filter((m) => !m.parentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Discussion ({messages.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New message input */}
        <div className="flex gap-3">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Write a message..."
            rows={3}
          />
          <Button
            onClick={() => sendMessage(newMessage)}
            disabled={isSending || !newMessage.trim()}
            className="self-end"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>

        {/* Messages list */}
        {topLevelMessages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No messages yet. Start the discussion!
          </p>
        ) : (
          <div className="space-y-4 pt-4 border-t">
            {topLevelMessages.map((message) => renderMessage(message))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
