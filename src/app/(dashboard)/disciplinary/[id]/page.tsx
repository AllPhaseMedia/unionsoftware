import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  Calendar,
  User,
  Building2,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import { DisciplinaryStepsTimeline } from "@/components/disciplinary/steps-timeline";
import { DisciplinaryDiscussionSection } from "@/components/disciplinary/discussion-section";
import { DisciplinaryDocumentsSection } from "@/components/disciplinary/documents-section";
import { DisciplinaryNotesSection } from "@/components/disciplinary/notes-section";
import { DisciplinaryActions } from "@/components/disciplinary/disciplinary-actions";
import { DisciplinaryActivityLog } from "@/components/disciplinary/activity-log";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  PENDING_REVIEW: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const typeColors: Record<string, string> = {
  ATTENDANCE: "bg-blue-100 text-blue-800",
  PERFORMANCE: "bg-purple-100 text-purple-800",
  CONDUCT: "bg-orange-100 text-orange-800",
  POLICY_VIOLATION: "bg-red-100 text-red-800",
  SAFETY: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

const outcomeColors: Record<string, string> = {
  NO_ACTION: "bg-green-100 text-green-800",
  VERBAL_WARNING: "bg-yellow-100 text-yellow-800",
  WRITTEN_WARNING: "bg-orange-100 text-orange-800",
  SUSPENSION: "bg-red-100 text-red-800",
  TERMINATION: "bg-red-200 text-red-900",
  OTHER: "bg-gray-100 text-gray-800",
};

export default async function DisciplinaryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  const disciplinaryCase = await prisma.disciplinaryCase.findFirst({
    where: {
      id,
      organizationId: dbUser.organizationId,
    },
    include: {
      member: true,
      representative: true,
      createdBy: true,
      department: true,
      steps: {
        include: { completedBy: true },
        orderBy: { stepNumber: "asc" },
      },
      notes: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
      messages: {
        include: {
          user: true,
          replies: {
            include: { user: true },
          },
        },
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
      contractViolations: {
        include: {
          contractArticle: {
            include: { contract: true },
          },
        },
      },
    },
  });

  if (!disciplinaryCase) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{disciplinaryCase.caseNumber}</h1>
            <Badge className={typeColors[disciplinaryCase.type]}>
              {disciplinaryCase.type.replace("_", " ")}
            </Badge>
            <Badge className={priorityColors[disciplinaryCase.priority]}>
              {disciplinaryCase.priority}
            </Badge>
            <Badge className={statusColors[disciplinaryCase.status]}>
              {disciplinaryCase.status.replace("_", " ")}
            </Badge>
            {disciplinaryCase.outcome && (
              <Badge className={outcomeColors[disciplinaryCase.outcome]}>
                {disciplinaryCase.outcome.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="text-gray-500">
            Filed {format(new Date(disciplinaryCase.filingDate), "MMMM d, yyyy")}
          </p>
        </div>
        <DisciplinaryActions
          caseId={disciplinaryCase.id}
          memberEmail={disciplinaryCase.member?.email}
          memberName={disciplinaryCase.member ? `${disciplinaryCase.member.firstName} ${disciplinaryCase.member.lastName}` : null}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {disciplinaryCase.description}
              </p>
            </CardContent>
          </Card>

          {/* Steps Timeline */}
          <DisciplinaryStepsTimeline
            steps={disciplinaryCase.steps}
            caseId={disciplinaryCase.id}
          />

          {/* Discussion */}
          <DisciplinaryDiscussionSection
            messages={disciplinaryCase.messages}
            caseId={disciplinaryCase.id}
            currentUserId={dbUser.id}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {disciplinaryCase.member && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Member</p>
                    <Link
                      href={`/members/${disciplinaryCase.member.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {disciplinaryCase.member.firstName} {disciplinaryCase.member.lastName}
                    </Link>
                  </div>
                </div>
              )}

              {disciplinaryCase.representative && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Representative</p>
                    <p>{disciplinaryCase.representative.name}</p>
                  </div>
                </div>
              )}

              {disciplinaryCase.department && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p>{disciplinaryCase.department.name}</p>
                  </div>
                </div>
              )}

              {disciplinaryCase.memberJobTitle && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Member Job Title</p>
                    <p>{disciplinaryCase.memberJobTitle}</p>
                  </div>
                </div>
              )}

              {disciplinaryCase.supervisorName && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Commissioner</p>
                    <p>{disciplinaryCase.supervisorName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Incident Date</p>
                  <p>{format(new Date(disciplinaryCase.incidentDate), "MMMM d, yyyy")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Filing Date</p>
                  <p>{format(new Date(disciplinaryCase.filingDate), "MMMM d, yyyy")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileWarning className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge className={typeColors[disciplinaryCase.type]}>
                    {disciplinaryCase.type.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Priority</p>
                  <Badge className={priorityColors[disciplinaryCase.priority]}>
                    {disciplinaryCase.priority}
                  </Badge>
                </div>
              </div>

              {disciplinaryCase.outcomeNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Outcome Notes</p>
                    <p className="text-sm">{disciplinaryCase.outcomeNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contract Violations */}
          {disciplinaryCase.contractViolations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contract Violations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {disciplinaryCase.contractViolations.map((violation) => (
                  <div
                    key={violation.id}
                    className="p-3 border rounded-lg text-sm"
                  >
                    <p className="font-medium">
                      Article {violation.contractArticle.articleNumber}:{" "}
                      {violation.contractArticle.title}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {violation.contractArticle.contract.name}
                    </p>
                    {violation.notes && (
                      <p className="mt-1 text-gray-600">{violation.notes}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <DisciplinaryDocumentsSection
            documents={disciplinaryCase.documents}
            caseId={disciplinaryCase.id}
          />

          {/* Notes */}
          <DisciplinaryNotesSection
            notes={disciplinaryCase.notes}
            caseId={disciplinaryCase.id}
          />

          {/* Activity Log */}
          <DisciplinaryActivityLog disciplinaryCase={disciplinaryCase} />

          {/* Metadata */}
          <Card>
            <CardContent className="pt-4 text-xs text-gray-500">
              <p>Created by {disciplinaryCase.createdBy.name}</p>
              <p>
                Created {format(new Date(disciplinaryCase.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
              <p>
                Updated {format(new Date(disciplinaryCase.updatedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
