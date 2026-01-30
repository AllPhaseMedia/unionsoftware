"use client";

import { useRouter } from "next/navigation";
import { MessagesSection } from "./messages-section";
import type { GrievanceMessageWithUser } from "@/types";

interface GrievanceDiscussionProps {
  messages: GrievanceMessageWithUser[];
  grievanceId: string;
  currentUserId: string;
}

export function GrievanceDiscussion({
  messages,
  grievanceId,
  currentUserId,
}: GrievanceDiscussionProps) {
  const router = useRouter();

  const handleMessageSent = () => {
    router.refresh();
  };

  return (
    <MessagesSection
      messages={messages}
      grievanceId={grievanceId}
      currentUserId={currentUserId}
      onMessageSent={handleMessageSent}
    />
  );
}
