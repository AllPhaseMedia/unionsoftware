import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  Pencil,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { StepsTimeline } from "@/components/grievances/steps-timeline";
import { GrievanceDiscussion } from "@/components/grievances/grievance-discussion";
import { DocumentsSection } from "@/components/grievances/documents-section";
import { NotesSection } from "@/components/grievances/notes-section";
import { PdfGenerateButton } from "@/components/grievances/pdf-generate-button";
import { GrievanceActions } from "@/components/grievances/grievance-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  PENDING_RESPONSE: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
  WITHDRAWN: "bg-red-100 text-red-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const outcomeColors: Record<string, string> = {
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
  SETTLED: "bg-yellow-100 text-yellow-800",
  WITHDRAWN: "bg-gray-100 text-gray-800",
  PENDING_ARBITRATION: "bg-purple-100 text-purple-800",
};

export default async function GrievanceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const grievance = await prisma.grievance.findFirst({
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

  if (!grievance) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{grievance.grievanceNumber}</h1>
            <Badge className={priorityColors[grievance.priority]}>
              {grievance.priority}
            </Badge>
            <Badge className={statusColors[grievance.status]}>
              {grievance.status.replace("_", " ")}
            </Badge>
            {grievance.outcome && (
              <Badge className={outcomeColors[grievance.outcome]}>
                {grievance.outcome.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="text-gray-500">
            Filed {format(new Date(grievance.filingDate), "MMMM d, yyyy")}
          </p>
        </div>
        <GrievanceActions
          grievanceId={grievance.id}
          memberEmail={grievance.member?.email}
          memberName={grievance.member ? `${grievance.member.firstName} ${grievance.member.lastName}` : null}
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
                {grievance.description}
              </p>
            </CardContent>
          </Card>

          {/* Relief Requested */}
          {grievance.reliefRequested && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Relief Requested</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {grievance.reliefRequested}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Steps Timeline */}
          <StepsTimeline
            steps={grievance.steps}
            grievanceId={grievance.id}
          />

          {/* Discussion */}
          <GrievanceDiscussion
            messages={grievance.messages}
            grievanceId={grievance.id}
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
              {grievance.member && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Member</p>
                    <Link
                      href={`/members/${grievance.member.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {grievance.member.firstName} {grievance.member.lastName}
                    </Link>
                  </div>
                </div>
              )}

              {grievance.representative && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Representative</p>
                    <p>{grievance.representative.name}</p>
                  </div>
                </div>
              )}

              {grievance.department && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p>{grievance.department.name}</p>
                  </div>
                </div>
              )}

              {grievance.memberJobTitle && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Member Job Title</p>
                    <p>{grievance.memberJobTitle}</p>
                  </div>
                </div>
              )}

              {grievance.commissionerName && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Commissioner</p>
                    <p>{grievance.commissionerName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Filing Date</p>
                  <p>{format(new Date(grievance.filingDate), "MMMM d, yyyy")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Priority</p>
                  <Badge className={priorityColors[grievance.priority]}>
                    {grievance.priority}
                  </Badge>
                </div>
              </div>

              {grievance.settlementAmount && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Settlement Amount</p>
                    <p className="font-medium">
                      ${Number(grievance.settlementAmount).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {grievance.outcomeNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Outcome Notes</p>
                    <p className="text-sm">{grievance.outcomeNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contract Violations */}
          {grievance.contractViolations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contract Violations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {grievance.contractViolations.map((violation) => (
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
          <DocumentsSection
            documents={grievance.documents}
            grievanceId={grievance.id}
          />

          {/* PDF Generation */}
          <PdfGenerateButton grievanceId={grievance.id} />

          {/* Notes */}
          <NotesSection
            notes={grievance.notes}
            grievanceId={grievance.id}
          />

          {/* Metadata */}
          <Card>
            <CardContent className="pt-4 text-xs text-gray-500">
              <p>Created by {grievance.createdBy.name}</p>
              <p>
                Created {format(new Date(grievance.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
              <p>
                Updated {format(new Date(grievance.updatedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
