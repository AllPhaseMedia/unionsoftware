import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  Pencil,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  FileText,
  StickyNote,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  MEMBER: "bg-green-100 text-green-800",
  NON_MEMBER: "bg-gray-100 text-gray-800",
  SEVERED: "bg-red-100 text-red-800",
};

const employmentTypeLabels: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  TEMPORARY: "Temporary",
  SEASONAL: "Seasonal",
};

export default async function MemberDetailPage({ params }: PageProps) {
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

  const member = await prisma.member.findFirst({
    where: {
      id,
      organizationId: dbUser.organizationId,
    },
    include: {
      department: true,
      grievances: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      notes: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!member) {
    notFound();
  }

  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {member.firstName} {member.lastName}
              </h1>
              <Badge className={statusColors[member.status]}>
                {member.status.replace("_", " ")}
              </Badge>
            </div>
            {member.department && (
              <p className="text-gray-500">{member.department.name}</p>
            )}
          </div>
        </div>
        <Link href={`/members/${member.id}/edit`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="grievances">
            Grievances ({member.grievances.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({member.documents.length})
          </TabsTrigger>
          <TabsTrigger value="notes">Notes ({member.notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {member.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a
                      href={`mailto:${member.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {member.email}
                    </a>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a
                      href={`tel:${member.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {member.phone}
                    </a>
                  </div>
                )}
                {(member.address || member.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      {member.address && <p>{member.address}</p>}
                      {(member.city || member.state || member.zipCode) && (
                        <p>
                          {[member.city, member.state, member.zipCode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {member.department && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{member.department.name}</span>
                  </div>
                )}
                {member.hireDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      Hired {format(new Date(member.hireDate), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {member.employmentType && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>{employmentTypeLabels[member.employmentType]}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="grievances" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grievance History</CardTitle>
            </CardHeader>
            <CardContent>
              {member.grievances.length === 0 ? (
                <p className="text-gray-500">No grievances on record.</p>
              ) : (
                <div className="space-y-4">
                  {member.grievances.map((grievance) => (
                    <Link
                      key={grievance.id}
                      href={`/grievances/${grievance.id}`}
                      className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {grievance.grievanceNumber}
                        </span>
                        <Badge
                          variant={
                            grievance.status === "RESOLVED" ? "default" : "secondary"
                          }
                        >
                          {grievance.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {grievance.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Filed {format(new Date(grievance.filingDate), "MMM d, yyyy")}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {member.documents.length === 0 ? (
                <p className="text-gray-500">No documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {member.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {member.notes.length === 0 ? (
                <p className="text-gray-500">No notes yet.</p>
              ) : (
                <div className="space-y-4">
                  {member.notes.map((note) => (
                    <div key={note.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <StickyNote className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{note.user.name}</span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
