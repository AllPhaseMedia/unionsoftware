"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  User,
  Briefcase,
  Upload,
  Loader2,
  Trash2,
  Download,
  Plus,
  Hash,
  Cake,
  Eye,
} from "lucide-react";
import type { Member, MemberNote, MemberDocument, Grievance } from "@/types";
import { EmailComposeDialog } from "@/components/email/email-compose-dialog";

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

interface MemberWithRelations extends Member {
  department?: { id: string; name: string } | null;
  grievances: Grievance[];
  notes: (MemberNote & { user: { name: string } })[];
  documents: MemberDocument[];
}

function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export default function MemberDetailPage() {
  const params = useParams();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Note form state
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Document upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  // Email dialog state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  const fetchMember = useCallback(async () => {
    try {
      const response = await fetch(`/api/members/${memberId}`);
      const data = await response.json();
      if (data.success) {
        setMember(data.data);
      }
    } catch (error) {
      console.error("Error fetching member:", error);
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);
    try {
      const response = await fetch(`/api/members/${memberId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });

      if (response.ok) {
        setNewNote("");
        fetchMember();
      }
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/members/${memberId}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        fetchMember();
      } else {
        setUploadError(data.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      setUploadError("Failed to upload file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(
        `/api/members/${memberId}/documents?documentId=${documentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        fetchMember();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleViewDocument = async (documentId: string) => {
    setViewingDocId(documentId);
    try {
      const response = await fetch(
        `/api/members/${memberId}/documents?documentId=${documentId}`
      );
      const data = await response.json();

      if (data.success && data.data.url) {
        window.open(data.data.url, "_blank");
      }
    } catch (error) {
      console.error("Error viewing document:", error);
    } finally {
      setViewingDocId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Member not found.</p>
        <Link href="/members">
          <Button variant="link">Back to Members</Button>
        </Link>
      </div>
    );
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
            {member.jobTitle && (
              <p className="text-gray-600">{member.jobTitle}</p>
            )}
            {member.department && (
              <p className="text-gray-500">{member.department.name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {member.email && (
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          )}
          <Link href={`/members/${member.id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Email Dialog */}
      <EmailComposeDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        recipientEmail={member.email || ""}
        recipientName={`${member.firstName} ${member.lastName}`}
        memberId={member.id}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="grievances">
            Grievances ({member.grievances.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({member.documents.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes ({member.notes.length})
          </TabsTrigger>
        </TabsList>

        {/* All Tab - Shows Everything */}
        <TabsContent value="all" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.memberId && (
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Member ID:</span>
                    <span className="font-medium">{member.memberId}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${member.email}`} className="text-blue-600 hover:underline">
                      {member.email}
                    </a>
                  </div>
                )}
                {member.cellPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Cell:</span>
                    <a href={`tel:${member.cellPhone}`} className="text-blue-600 hover:underline">
                      {formatPhone(member.cellPhone)}
                    </a>
                  </div>
                )}
                {member.homePhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Home:</span>
                    <a href={`tel:${member.homePhone}`} className="text-blue-600 hover:underline">
                      {formatPhone(member.homePhone)}
                    </a>
                  </div>
                )}
                {member.dateOfBirth && (
                  <div className="flex items-center gap-3">
                    <Cake className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Date of Birth:</span>
                    <span>{format(new Date(member.dateOfBirth), "MMMM d, yyyy")}</span>
                  </div>
                )}
                {(member.address || member.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      {member.address && <p>{member.address}</p>}
                      {(member.city || member.state || member.zipCode) && (
                        <p>{[member.city, member.state, member.zipCode].filter(Boolean).join(", ")}</p>
                      )}
                    </div>
                  </div>
                )}
                {!member.email && !member.cellPhone && !member.homePhone && !member.address && (
                  <p className="text-gray-500 text-sm">No contact information on file.</p>
                )}
              </CardContent>
            </Card>

            {/* Employment Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.department && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{member.department.name}</span>
                  </div>
                )}
                {member.jobTitle && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Job Title:</span>
                    <span>{member.jobTitle}</span>
                  </div>
                )}
                {member.workLocation && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Work Location:</span>
                    <span>{member.workLocation}</span>
                  </div>
                )}
                {member.hireDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Hire Date:</span>
                    <span>{format(new Date(member.hireDate), "MMMM d, yyyy")}</span>
                  </div>
                )}
                {member.employmentType && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Employment Type:</span>
                    <span>{employmentTypeLabels[member.employmentType]}</span>
                  </div>
                )}
                {!member.department && !member.jobTitle && !member.hireDate && (
                  <p className="text-gray-500 text-sm">No employment details on file.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grievances */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Grievances ({member.grievances.length})
                </CardTitle>
                <Link href={`/grievances/new?memberId=${member.id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    New Grievance
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {member.grievances.length === 0 ? (
                <p className="text-gray-500 text-sm">No grievances on record.</p>
              ) : (
                <div className="space-y-3">
                  {member.grievances.map((grievance) => (
                    <Link
                      key={grievance.id}
                      href={`/grievances/${grievance.id}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{grievance.grievanceNumber}</span>
                        <Badge variant={grievance.status === "RESOLVED" ? "default" : "secondary"}>
                          {grievance.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{grievance.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Filed {format(new Date(grievance.filingDate), "MMM d, yyyy")}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Documents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents ({member.documents.length})
                  </CardTitle>
                  <div className="relative">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <Button size="sm" variant="outline" disabled={isUploading}>
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1" />
                      )}
                      Upload
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {uploadError && (
                  <div className="mb-3 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                    {uploadError}
                  </div>
                )}
                {member.documents.length === 0 ? (
                  <p className="text-gray-500 text-sm">No documents uploaded.</p>
                ) : (
                  <div className="space-y-2">
                    {member.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{doc.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(doc.uploadedAt), "MMM d, yyyy")} &middot;{" "}
                              {(doc.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDocument(doc.id)}
                            disabled={viewingDocId === doc.id}
                            title="View"
                          >
                            {viewingDocId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  Notes ({member.notes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Note Form */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isSubmittingNote}
                    >
                      {isSubmittingNote && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Add Note
                    </Button>
                  </div>
                </div>

                {member.notes.length === 0 ? (
                  <p className="text-gray-500 text-sm">No notes yet.</p>
                ) : (
                  <div className="space-y-4 pt-4 border-t">
                    {member.notes.map((note) => (
                      <div key={note.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{note.user.name}</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Grievances Tab */}
        <TabsContent value="grievances" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Grievances ({member.grievances.length})
                </CardTitle>
                <Link href={`/grievances/new?memberId=${member.id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    New Grievance
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {member.grievances.length === 0 ? (
                <p className="text-gray-500 text-sm">No grievances on record.</p>
              ) : (
                <div className="space-y-3">
                  {member.grievances.map((grievance) => (
                    <Link
                      key={grievance.id}
                      href={`/grievances/${grievance.id}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{grievance.grievanceNumber}</span>
                        <Badge variant={grievance.status === "RESOLVED" ? "default" : "secondary"}>
                          {grievance.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{grievance.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Filed {format(new Date(grievance.filingDate), "MMM d, yyyy")}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({member.documents.length})
                </CardTitle>
                <div className="relative">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <Button size="sm" variant="outline" disabled={isUploading}>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {uploadError && (
                <div className="mb-3 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {uploadError}
                </div>
              )}
              {member.documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {member.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(doc.uploadedAt), "MMM d, yyyy")} &middot;{" "}
                            {(doc.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDocument(doc.id)}
                          disabled={viewingDocId === doc.id}
                          title="View"
                        >
                          {viewingDocId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Notes ({member.notes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note Form */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isSubmittingNote}
                  >
                    {isSubmittingNote && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Add Note
                  </Button>
                </div>
              </div>

              {member.notes.length === 0 ? (
                <p className="text-gray-500 text-sm">No notes yet.</p>
              ) : (
                <div className="space-y-4 pt-4 border-t">
                  {member.notes.map((note) => (
                    <div key={note.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{note.user.name}</span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
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
