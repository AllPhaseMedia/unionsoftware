"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, Mail } from "lucide-react";
import { EmailComposeDialog } from "@/components/email/email-compose-dialog";

interface GrievanceActionsProps {
  grievanceId: string;
  memberEmail?: string | null;
  memberName?: string | null;
}

export function GrievanceActions({
  grievanceId,
  memberEmail,
  memberName,
}: GrievanceActionsProps) {
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        {memberEmail && (
          <Button variant="outline" onClick={() => setIsEmailDialogOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Email Member
          </Button>
        )}
        <Link href={`/grievances/${grievanceId}/edit`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <EmailComposeDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        recipientEmail={memberEmail || ""}
        recipientName={memberName || ""}
        grievanceId={grievanceId}
      />
    </>
  );
}
